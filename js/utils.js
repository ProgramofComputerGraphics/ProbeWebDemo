import * as THREE from "three";

export function pointInRectangle(point, rectangle) {
    const containsX = point.x >= rectangle.x && point.x < rectangle.x + rectangle.width;
    const containsY = point.y >= rectangle.y && point.y < rectangle.y + rectangle.height;

    return containsX && containsY;
}

export function deepCopyMeshOrLine(meshOrLine, debug) {
    const distortedObj = meshOrLine.clone(true);
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

export function addMatrices(a, b){
    const aArr = a.toArray();
    const bArr = b.toArray();

    const sumArray = [];
    for(let i = 0; i < aArr.length; ++i){
        sumArray.push(aArr[i] + bArr[i]);
    }

    return new THREE.Matrix4().fromArray(sumArray);
}