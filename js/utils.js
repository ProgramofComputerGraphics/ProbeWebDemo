import * as THREE from "three";

export function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

export function pointInRectangle(point, rectangle) {
    const containsX = point.x >= rectangle.x && point.x < rectangle.x + rectangle.width;
    const containsY = point.y >= rectangle.y && point.y < rectangle.y + rectangle.height;

    return containsX && containsY;
}

export function deepCopyMeshOrLine(meshOrLine, discardChildren) {
    const distortedObj = meshOrLine.clone(true);
    if(discardChildren) {
        distortedObj.clear();
    }
    distortedObj.geometry = meshOrLine.geometry.clone(true);

    distortedObj.position.set(meshOrLine.position.x,
                            meshOrLine.position.y,
                            meshOrLine.position.z);
    distortedObj.rotation.set(meshOrLine.rotation.x,
                            meshOrLine.rotation.y,
                            meshOrLine.rotation.z,
                            meshOrLine.rotation.order);
    distortedObj.scale.set(meshOrLine.scale.x,
                            meshOrLine.scale.y,
                            meshOrLine.scale.z);
    
    return distortedObj;
}

function checkAndHandleEdgeMatch(edgeList, edgeFaceMap, faceIdx, edgeIdxA, edgeIdxB) {
    // Flag for tracking whether a match has been found
    let matchingEdge = false;
    
    // Iterate through all current edges
    for(let j = 0; j < edgeList.length; ++j){

        // If a matching edge is found
        if(edgeList[j][0] == edgeIdxA && edgeList[j][1] == edgeIdxB ||
            edgeList[j][0] == edgeIdxB && edgeList[j][1] == edgeIdxA)
        {
            // Add the current face to the edge's entry in the edge-face map
            edgeFaceMap[j].push(faceIdx);

            // Set the matching flag to true and break from the loop
            matchingEdge = true;
            break;
        }
    }
    // If no matching edge was found
    if(!matchingEdge){
        // Add a new edge to the edge list
        edgeList.push([edgeIdxA, edgeIdxB]);

        // Add a new entry to the edge-face map for the new edge, with the current face as the sole entry
        edgeFaceMap[edgeList.length - 1] = [faceIdx];
    }
}

export function generateDetriangulatedWireframe(obj, lineMat, verbose) {
    const vertexList = [];
    const indexMap = [];

    const positionAttribute = obj.geometry.getAttribute("position");
    const vertCount = positionAttribute.count;

    if(verbose)
        console.log("Wireframe generation started!\nCompiling unique vertices...");

    // Find unique vertices
    for (let i = 0; i < vertCount; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);

        let matchingVertex = false;
        for(let j = 0; j < vertexList.length; ++j) {
            if(vertexList[j].x == vertex.x && 
                vertexList[j].y == vertex.y &&
                vertexList[j].z == vertex.z) 
            {
                indexMap.push(j);
                matchingVertex = true;
                break;
            }
        }

        if(!matchingVertex){
            vertexList.push(vertex);
            indexMap.push(vertexList.length-1)
        }
    }

    if(verbose)
        console.log(vertexList.length + " Unique Vertices Compiled!\nCompiling Unique Edges...");

    let edgeList = []; // All elements should be two-element arrays
    const faceList = []; // All elements should be three-element arrays if all faces are tris
    const edgeFaceMap = [];

    const indices = obj.geometry.index;

    // Find unique edges
    let loopIters = indices ? indices.count : vertCount;
    for(let i = 0; i < loopIters; i+=3) {
        const faceIdx = Math.trunc(i/3); // Should always be an integer

        let idx1, idx2, idx3;
        if(indices){
            idx1 = indexMap[indices.array[i]];
            idx2 = indexMap[indices.array[i+1]];
            idx3 = indexMap[indices.array[i+2]];
        }
        else {
            idx1 = indexMap[i];
            idx2 = indexMap[i+1];
            idx3 = indexMap[i+2];
        }

        faceList.push([idx1, idx2, idx3]);
        
        // Update edge/face arrays for 1-2 edge
        checkAndHandleEdgeMatch(edgeList, edgeFaceMap, faceIdx, idx1, idx2);

        // Update edge/face arrays for 2-3 edge
        checkAndHandleEdgeMatch(edgeList, edgeFaceMap, faceIdx, idx2, idx3);

        // Update edge/face arrays for 3-1 edge
        checkAndHandleEdgeMatch(edgeList, edgeFaceMap, faceIdx, idx3, idx1);
    }

    const totalEdges = edgeList.length;
    if(verbose)
        console.log(totalEdges + " Unique Edges Found!\nRemoving \'Interior Edges\'...");

    // console.log(obj);
    // console.log("Vertices:", vertexList);
    // console.log("Indices:", indices);
    // console.log("Index Map:", indexMap);
    // console.log("Loop Iterations:", loopIters);
    // console.log("Faces:", faceList);
    // console.log("Edges:");
    // for(let i = 0; i < edgeList.length; ++i){
    //     console.log("\t", edgeList[i]);
    // }
    // console.log("Edge Face Map:", edgeFaceMap);
    // for(let i = 0; i < edgeFaceMap.length; ++i){
    //     console.log("\t", edgeFaceMap[i]);
    // }

    // Eliminate all edges with faces that have "nearly equal" normals
    let j = 0;
    while(j < edgeFaceMap.length) {
        // Get the list of all faces which share this edge
        const edgeFaceList = edgeFaceMap[j];

        // If only one face is attached to the edge, keep the edge
        if(edgeFaceList.length == 1) {
            ++j;
            continue;
        }

        // Compute first face normal
        const firstFaceIdx = edgeFaceList[0];

        const firstFaceV1 = vertexList[faceList[firstFaceIdx][0]];

        const firstFaceV1V2 = vertexList[faceList[firstFaceIdx][1]].clone();
        firstFaceV1V2.sub(firstFaceV1);

        const firstFaceV1V3 = vertexList[faceList[firstFaceIdx][2]].clone();
        firstFaceV1V3.sub(firstFaceV1);

        const firstFaceNormal = new THREE.Vector3().crossVectors(firstFaceV1V2, firstFaceV1V3);
        firstFaceNormal.normalize();

        // Set threshold for "nearly equal" normals
        const epsilon = 0.0001;
        const normalDotThreshold = 1 - epsilon;

        // Iterate through the remaining faces checking for nearly equal normals
        // (for typical, manifold objects, there should only be one other face)
        let keepEdge = false;
        for(let i = 1; i < edgeFaceList.length; ++i){     
            // Compute current face normal
            const currentFaceIdx = edgeFaceList[i];

            const currentFaceV1 = vertexList[faceList[currentFaceIdx][0]];

            const currentFaceV1V2 = vertexList[faceList[currentFaceIdx][1]].clone();
            currentFaceV1V2.sub(currentFaceV1);

            const currentFaceV1V3 = vertexList[faceList[currentFaceIdx][2]].clone();
            currentFaceV1V3.sub(currentFaceV1);

            const currentFaceNormal = new THREE.Vector3().crossVectors(currentFaceV1V2, currentFaceV1V3);
            currentFaceNormal.normalize();

            // console.log("First Normal:", firstFaceNormal);
            // console.log("Second Normal:", currentFaceNormal);

            if(currentFaceNormal.dot(firstFaceNormal) < -0.99 && verbose) {
                console.log("Flipped Normal Found!");
            }

            // If current face normal is not "nearly equal" to first face normal, 
            // keep the edge (set keepEdge flag to true and break out of the loop)
            if(currentFaceNormal.dot(firstFaceNormal) < normalDotThreshold) {
                keepEdge = true;
                break;
            }
        }

        if(keepEdge){
            //console.log("Edge Kept!");
            ++j;
        }
        else {
            //console.log("Edge Removed!");
            edgeList.splice(j,1);
            edgeFaceMap.splice(j,1);
        }
    }

    if(verbose)
        console.log((totalEdges - edgeList.length) + " Edges Removed; " 
                    + edgeList.length + " Edges Retained!\n"
                    + "Generating Line Segment Geometry...");
    // console.log("BackupCounter:", backupCounter);

    // Generate LineSegments object
    const linePoints = [];

    for(let j = 0; j < edgeList.length; ++j) {
        const edge = edgeList[j];

        linePoints.push(vertexList[edge[0]]);
        linePoints.push(vertexList[edge[1]]);
    }
    
    //console.log("Line Points:", linePoints)

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);

    const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
    
    if(verbose)
        console.log("Line Segment Geometry Generated!\nLoading Complete!");

    return lineSegments;
}

export function addMatrices(a, b){
    const aArr = a.toArray();
    const bArr = b.toArray();

    const sumArray = [];
    for(let i = 0; i < aArr.length; ++i){
        sumArray.push(aArr[i] + bArr[i]);
    }

    return new THREE.Matrix4().fromArray(sumArray);
}