import * as THREE from 'three';

import { deepCopyMeshOrLine } from './utils.js';

const frustumSideLineMaterial = new THREE.LineBasicMaterial({color : 0xa0a0a0});
const nearPlaneLineMaterial = new THREE.LineBasicMaterial({color : 0x4040e0});
const farPlaneLineMaterial = new THREE.LineBasicMaterial({color : 0xe04040});

const nearPlaneSurfaceMaterial = new THREE.MeshBasicMaterial({color : 0x4040e0,
                                                            transparent: true,
                                                            opacity: 0.2,
                                                            side : THREE.DoubleSide});
const farPlaneSurfaceMaterial = new THREE.MeshBasicMaterial({color : 0xe04040,
                                                            transparent: true,
                                                            opacity: 0.2,
                                                            side : THREE.DoubleSide});

const flipX = new THREE.Matrix4();
flipX.set( -1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1 );

            
let testBoolean = true;

export class Frustum {
    #projection;
    
    #perspFOV;
    #orthoSideLength;
    #near;
    #far;

    #perspectiveCamera;
    #orthoCamera;

    #perspectiveTipLines;
    #perspectiveSideLines;
    
    #perspectiveNearPlaneLines;
    #perspectiveNearPlaneSurface;
    #perspectiveNearPlane;

    #perspectiveFarPlaneLines;
    #perspectiveFarPlaneSurface;
    #perspectiveFarPlane;

    #orthoSideLines;
    #orthoNearPlaneLines;
    #orthoNearPlaneSurface;
    #orthoFarPlaneLines;
    #orthoFarPlaneSurface;

    // TODO: Auto-sync these values with the default slider values on the webpage
    constructor() {
        // Set default values
        this.#projection = "perspective";
        this.#perspFOV = 45;
        this.#orthoSideLength = 5;
        this.#near = 1;
        this.#far = 10;

        // Create geometry groups
        this.#perspectiveSideLines = new THREE.Group();
        this.#perspectiveTipLines = new THREE.Group();

        this.#perspectiveNearPlaneLines = new THREE.Group();
        this.#perspectiveFarPlaneLines = new THREE.Group();

        this.#perspectiveNearPlane = new THREE.Group();
        this.#perspectiveFarPlane = new THREE.Group();

        this.#orthoSideLines = new THREE.Group();
        this.#orthoNearPlaneLines = new THREE.Group();
        this.#orthoFarPlaneLines = new THREE.Group();

        // Add clickable property to near/far planes
        this.#perspectiveNearPlane.userData.clickable = true;
        this.#perspectiveFarPlane.userData.clickable = true;

        // Add gumball constraints to near/far planes
        this.#perspectiveNearPlane.userData.onlyTranslateZ = true;
        this.#perspectiveFarPlane.userData.onlyTranslateZ = true;

        // Generate frustum geometry
        this.#updateFrustum("all");
    }

    #createPlaneHelper(lineGroup, xyExtents, z, 
                        lineMaterial, planeMaterial) {
        // Create the list of points for the plane lines
        const planePoints = [];

        // Add the vertices that define the plane lines
        planePoints.push(new THREE.Vector3(-xyExtents,
                                            -xyExtents,
                                            z));
        planePoints.push(new THREE.Vector3(xyExtents,
                                            -xyExtents,
                                            z));
        planePoints.push(new THREE.Vector3(xyExtents,
                                            xyExtents,
                                            z));
        planePoints.push(new THREE.Vector3(-xyExtents,
                                            xyExtents,
                                            z));

        // Create the buffer geometry for the plane lines
        const planeLineGeo = new THREE.BufferGeometry();
        planeLineGeo.setFromPoints(planePoints);

        // Create the plane lines object
        const planeLines = new THREE.LineLoop(planeLineGeo, 
                                                lineMaterial);

        // Update line group object 
        lineGroup.clear();
        lineGroup.add(planeLines);

        // Create the plane surface geometry
        const planeSurfaceGeo = new THREE.PlaneGeometry(xyExtents * 2, 
                                                        xyExtents * 2,
                                                        1, 1);

        // Create the plane surface mesh
        var planeObject = new THREE.Mesh(planeSurfaceGeo,
                                        planeMaterial);

        // Set the position/rotation of the plane surface mesh
        planeObject.position.set(0,0,z);
        planeObject.rotateZ(-Math.PI/2);

        return planeObject;
    }

    #updatePerspectiveFrustumSideLines() {       
        // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
        // Note: Because we assume a square frustum, this slope is the same for both
        // X and Y. Also note that the angle is divided by two, which is why there is
        // a division by 360 instead of 180.
        const frustumSlope = Math.tan(this.#perspFOV * Math.PI / 360);
    
        // Compute the X/Y Distance from the center of the frustum to the inner
        // corners. This value is used to create the near-plane frustum vertices. 
        const frustumNearXandY = frustumSlope * this.#near;
    
        // Compute the X/Y Distance from the center of the frustum to the outer
        // corners. This value is used to create the far-plane frustum vertices. 
        const frustumFarXandY = frustumSlope * this.#far;
    
        // Create frustum line vertex pairs
        const frustumPoints = [];
    
        // These vertices define the truncated pyramid line for the bottom-
        // left corner of the frustum.
        frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                             -frustumNearXandY,
                                             this.#near));
        frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                             -frustumFarXandY,
                                             this.#far));
    
        // These vertices define the truncated pyramid line for the bottom-
        // right corner of the frustum
        frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                             -frustumNearXandY,
                                             this.#near));
        frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                             -frustumFarXandY,
                                             this.#far));
        
        // These vertices define the truncated pyramid line for the top-
        // left corner of the frustum.
        frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                             frustumNearXandY,
                                             this.#near));
        frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                             frustumFarXandY,
                                             this.#far));                                             
    
        // These vertices define the truncated pyramid line for the top-
        // right corner of the frustum.
        frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                             frustumNearXandY,
                                             this.#near));
        frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                             frustumFarXandY,
                                             this.#far)); 
    
        // Create frustum buffer geometry from vertex pairs
        const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);
    
        // Create frustum line geometry
        const lines = new THREE.LineSegments(frustumGeo, frustumSideLineMaterial); 

        // Update perspective frustum side lines group
        this.#perspectiveSideLines.clear();
        this.#perspectiveSideLines.add(lines);
    }

    #updatePerspectiveFrustumTipLines() {
        // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
        // Note: Because we assume a square frustum, this slope is the same for both
        // X and Y. Also note that the angle is divided by two, which is why there is
        // a division by 360 instead of 180.
        const frustumSlope = Math.tan(this.#perspFOV * Math.PI / 360);
    
        // Compute the X/Y Distance from the center of the frustum to the inner
        // corners. This value is used to create the near-plane frustum vertices. 
        const frustumNearXandY = frustumSlope * this.#near;
    
        // Create frustum line vertex pairs
        const frustumTipPoints = [];
    
        // These vertices define the pyramid tip line for the bottom-
        // left corner of the frustum.
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(-frustumNearXandY,
                                                -frustumNearXandY,
                                                this.#near));
    
        // These vertices define the pyramid tip line for the bottom-
        // right corner of the frustum
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(frustumNearXandY,
                                                -frustumNearXandY,
                                                this.#near));
        
        // These vertices define the pyramid tip line for the top-
        // left corner of the frustum.
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(-frustumNearXandY,
                                                frustumNearXandY,
                                                this.#near));                                             
    
        // These vertices define the pyramid tip line for the top-
        // right corner of the frustum.
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(frustumNearXandY,
                                                frustumNearXandY,
                                                this.#near));
    
        // Create frustum buffer geometry from vertex pairs
        const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumTipPoints);
    
        // Create frustum line geometry
        const lines = new THREE.LineSegments(frustumGeo, frustumSideLineMaterial); 
        
        // Update perspective frustum tip group
        this.#perspectiveTipLines.clear();
        this.#perspectiveTipLines.add(lines);
    }

    #updatePerspectiveNearPlane() {
        // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
        // Note: Because we assume a square frustum, this slope is the same for both
        // X and Y. Also note that the angle is divided by two, which is why there is
        // a division by 360 instead of 180.
        const frustumSlope = Math.tan(this.#perspFOV * Math.PI / 360);
    
        // Compute the X/Y Distance from the center of the frustum to the inner
        // corners. This value is used to create the near-plane frustum vertices. 
        const frustumNearXandY = frustumSlope * this.#near;

        let plane = this.#createPlaneHelper(this.#perspectiveNearPlaneLines, 
                                frustumNearXandY, this.#near, 
                                nearPlaneLineMaterial, 
                                nearPlaneSurfaceMaterial);

        this.#perspectiveNearPlaneSurface = plane;

        // Update overall near plane group
        this.#perspectiveNearPlane.clear();
        this.#perspectiveNearPlane.add(this.#perspectiveNearPlaneLines);
        this.#perspectiveNearPlane.add(this.#perspectiveNearPlaneSurface);
    }

    #updatePerspectiveFarPlane() {
        // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
        // Note: Because we assume a square frustum, this slope is the same for both
        // X and Y. Also note that the angle is divided by two, which is why there is
        // a division by 360 instead of 180.
        const frustumSlope = Math.tan(this.#perspFOV * Math.PI / 360);
    
        // Compute the X/Y Distance from the center of the frustum to the outer
        // corners. This value is used to create the far-plane frustum vertices. 
        const frustumFarXandY = frustumSlope * this.#far;
    
        let plane = this.#createPlaneHelper(this.#perspectiveFarPlaneLines, 
                                            frustumFarXandY, this.#far, 
                                            farPlaneLineMaterial, 
                                            farPlaneSurfaceMaterial);

        this.#perspectiveFarPlaneSurface = plane;

        // Update overall far plane group
        this.#perspectiveFarPlane.clear();
        this.#perspectiveFarPlane.add(this.#perspectiveFarPlaneLines);
        this.#perspectiveFarPlane.add(this.#perspectiveFarPlaneSurface);
    }

    #updateOrthoFrustumSideLines() {
        // Compute the "half side-length" for the sides of the orthographic frustum.
        // This value is used for the X/Y positions of the frustum vertices. 
        const orthoHalfDist = this.#orthoSideLength / 2;
    
        // Create frustum line vertex pairs
        const frustumPoints = [];

        // These vertices define the bottom-left corner of the frustum.
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            -orthoHalfDist,
                                            this.#near));
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            -orthoHalfDist,
                                            this.#far));

        // These vertices define the bottom-right corner of the frustum.
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            -orthoHalfDist,
                                            this.#near));
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            -orthoHalfDist,
                                            this.#far));

        // These vertices define the top-left corner of the frustum.
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            orthoHalfDist,
                                            this.#near));
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            orthoHalfDist,
                                            this.#far));
        // These vertices define the top-right corner of the frustum.
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            orthoHalfDist,
                                            this.#near));
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            orthoHalfDist,
                                            this.#far));

        // Create frustum buffer geometry from vertex pairs
        const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);
    
        // Create frustum line geometry
        const lines = new THREE.LineSegments(frustumGeo, frustumSideLineMaterial); 
        
        // Update perspective frustum tip group
        this.#orthoSideLines.clear();
        this.#orthoSideLines.add(lines);
    }

    #updateOrthoNearPlane() {
        // Compute the "half side-length" for the sides of the orthographic frustum.
        // This value is used for the X/Y positions of the near plane vertices. 
        const orthoHalfDist = this.#orthoSideLength / 2;
    
        let plane = this.#createPlaneHelper(this.#orthoNearPlaneLines,  
                                orthoHalfDist, this.#near, 
                                nearPlaneLineMaterial, 
                                nearPlaneSurfaceMaterial);

        
        this.#orthoNearPlaneSurface = plane;
    }

    #updateOrthoFarPlane() {
        // Compute the "half side-length" for the sides of the orthographic frustum.
        // This value is used for the X/Y positions of the far plane vertices. 
        const orthoHalfDist = this.#orthoSideLength / 2;
    
        let plane = this.#createPlaneHelper(this.#orthoFarPlaneLines, 
                                            orthoHalfDist, this.#far, 
                                            farPlaneLineMaterial, 
                                            farPlaneSurfaceMaterial);

        this.#orthoFarPlaneSurface = plane;
    }

    #updatePerspectiveCamera() {
        this.#perspectiveCamera = new THREE.PerspectiveCamera(this.#perspFOV, 1,
                                                                this.#near,
                                                                this.#far);

        this.#perspectiveCamera.position.set(0,0,0);
        this.#perspectiveCamera.lookAt(0,0,1); 
        this.#perspectiveCamera.updateMatrixWorld(); 
        this.#perspectiveCamera.updateProjectionMatrix();
    }

    #updateOrthoCamera() {
        // Compute the "half side-length" for the sides of the orthographic frustum.
        // This value is used for the X/Y positions of the frustum vertices. 
        const orthoHalfDist = this.#orthoSideLength / 2;

        this.#orthoCamera = new THREE.OrthographicCamera(-orthoHalfDist, orthoHalfDist,
                                                        orthoHalfDist, -orthoHalfDist,
                                                        this.#near, this.#far);

        this.#orthoCamera.position.set(0,0,0);
        this.#orthoCamera.lookAt(0,0,1); 
        this.#orthoCamera.updateMatrixWorld(); 
        this.#orthoCamera.updateProjectionMatrix();
    }

    #updateFrustum(mode) {        
        // TODO: Possibly handle non-null cases that don't match the intended options
        if(mode == null || mode == "both")
            mode = "all";

        if(mode == "all" || mode == "perspective"){
            this.#updatePerspectiveFrustumSideLines();
            this.#updatePerspectiveFrustumTipLines();
            this.#updatePerspectiveNearPlane();
            this.#updatePerspectiveFarPlane();
            this.#updatePerspectiveCamera();
        }
        if(mode == "all" || mode == "ortho"){
            this.#updateOrthoFrustumSideLines();
            this.#updateOrthoNearPlane();
            this.#updateOrthoFarPlane();
            this.#updateOrthoCamera();
        }
    }

    getProjection() {
        return this.#projection;
    }

    setProjection(projection) {
        if(projection == "ortho" || projection == "perspective") {
            this.#projection = projection;
            return true;
        }

        return false;
    }

    swapProjection() {
        if(projection == "ortho") 
            this.#projection = "perspective";
        else 
            this.#projection = "ortho";
    }

    getFOV() {
        return this.#perspFOV;
    }

    setFOV(newFOV) {
        this.#perspFOV = parseFloat(newFOV);
        this.#updateFrustum("perspective");
    }

    getOrthoSideLength() {
        return this.#orthoSideLength;
    }

    setOrthoSideLength(newOrthoSideLength) {
        this.#orthoSideLength = newOrthoSideLength;
        this.#updateFrustum("ortho");
    }

    getNear() {
        return this.#near;
    }

    setNear(newNear) {
        this.#near = parseFloat(newNear);
        this.#updateFrustum("all");
    }

    getFar() {
        return this.#far;
    }

    setFar(newFar) {
        this.#far = parseFloat(newFar);
        this.#updateFrustum("all");
    }

    // Modified from Stack Overflow Response: 
    // https://discourse.threejs.org/t/transform-individual-vertices-from-position-frombufferattribute/44898
    applyFrustumDistortionToObject(obj) {
        const camera = this.#projection == "perspective" ? 
                                    this.#perspectiveCamera : 
                                    this.#orthoCamera;

        const positionAttribute = obj.geometry.getAttribute("position");
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);

            vertex.applyMatrix4(obj.matrixWorld);
            vertex.applyMatrix4(camera.matrixWorldInverse);
            vertex.applyMatrix4(camera.projectionMatrix);
            vertex.applyMatrix4(flipX);

            // Set position to vertex
            positionAttribute.setXYZ(i, vertex.x, vertex.y, (vertex.z + 1)/2); 
        }

        obj.position.set(0,0,0);
        obj.rotation.set(0,0,0,"XYZ");
        obj.scale.set(1,1,1);
        
        obj.geometry.attributes.position.needsUpdate = true;
        try {
            obj.geometry.computeBoundingSphere();   
        }
        catch(error) {
            console.error(error);
            console.log(obj);
        }
    }

    addFrustumToScene(scene, mode, linesOnly) {
        if(mode == null)
            mode = this.#projection;
        if(linesOnly == null)
            linesOnly = false;

        if(mode == "perspective") {
            scene.add(this.#perspectiveSideLines);
            scene.add(this.#perspectiveTipLines);
            scene.add(this.#perspectiveNearPlaneLines);
            scene.add(this.#perspectiveFarPlaneLines);
            if(!linesOnly) {
                scene.add(this.#perspectiveNearPlaneSurface);
                scene.add(this.#perspectiveFarPlaneSurface);
            }
        }
        else if(mode == "ortho") {
            scene.add(this.#orthoSideLines);
            scene.add(this.#orthoNearPlaneLines);
            scene.add(this.#orthoFarPlaneLines);
            if(!linesOnly) {
                scene.add(this.#orthoNearPlaneSurface);
                scene.add(this.#orthoFarPlaneSurface);
            }
        }
    }

    removeFrustumFromScene(scene) {
        scene.remove(this.#perspectiveSideLines);
        scene.remove(this.#perspectiveTipLines);
        scene.remove(this.#perspectiveNearPlaneLines);
        scene.remove(this.#perspectiveNearPlaneSurface);
        scene.remove(this.#perspectiveFarPlaneLines);
        scene.remove(this.#perspectiveFarPlaneSurface);
        scene.remove(this.#orthoSideLines);
        scene.remove(this.#orthoNearPlaneLines);
        scene.remove(this.#orthoNearPlaneSurface);
        scene.remove(this.#orthoFarPlaneLines);
        scene.remove(this.#orthoFarPlaneSurface);
    }

    #addDistortedLineGroup(distortedFrustum, lineGroup) {
        for(let i = 0; i < lineGroup.children.length; ++i) {
            const line = lineGroup.children[i];
            const distortedLine = deepCopyMeshOrLine(line);
            this.applyFrustumDistortionToObject(distortedLine);

            distortedFrustum.add(distortedLine);
        }
    }

    addDistortedFrustumToScene(scene, mode, linesOnly) {
        if(mode == null || mode == "")
            mode = this.#projection;

        var distortedFrustum = new THREE.Group();
        distortedFrustum.name = "DistortedFrustum"; // TODO: Remove magic name

        if(mode == "perspective") {
            // Add Distorted Truncated Pyramid Side Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#perspectiveSideLines);

            // Add Distorted Near Plane Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#perspectiveNearPlaneLines);

            // Add Distorted Far Plane Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#perspectiveFarPlaneLines);

            if(!linesOnly){
                const distortedNearPlane = deepCopyMeshOrLine(this.#perspectiveNearPlaneSurface);
                this.applyFrustumDistortionToObject(distortedNearPlane);

                distortedNearPlane.position.set(0,0,0);

                distortedFrustum.add(distortedNearPlane);

                const distortedFarPlane = deepCopyMeshOrLine(this.#perspectiveFarPlaneSurface);
                this.applyFrustumDistortionToObject(distortedFarPlane);

                distortedFarPlane.position.set(0,0,0);

                distortedFrustum.add(distortedFarPlane);
            }
        }
        else if(mode == "ortho") {
            // Distort Ortho Frustum Side Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#orthoSideLines);

            // Distort Near Plane
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#orthoNearPlaneLines);

            // Distort Far Plane
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#orthoFarPlaneLines);

            if(!linesOnly){
                const distortedNearPlane = deepCopyMeshOrLine(this.#orthoNearPlaneSurface);
                this.applyFrustumDistortionToObject(distortedNearPlane);

                distortedNearPlane.position.set(0,0,0);

                distortedFrustum.add(distortedNearPlane);

                const distortedFarPlane = deepCopyMeshOrLine(this.#orthoFarPlaneSurface);
                this.applyFrustumDistortionToObject(distortedFarPlane);

                distortedFarPlane.position.set(0,0,0);

                distortedFrustum.add(distortedFarPlane);
            }
        }

        scene.add(distortedFrustum);
    }

    removeDistortedFrustumFromScene(scene) {
        for(let i = 0; i < scene.children.length; ++i) {
            if(scene.children[i].name == "DistortedFrustum") { // TODO: Remove magic name
                scene.remove(scene.children[i]);
                break;
            }
        }
    }

    // TODO: Remove static
    static generateImageFrustumClippingPlanes() {
        const epsilon = 0.001;
        const onePlusEpsilon = 1 + epsilon;
        
        const clippingPlanes = [];
    
        // Left-side plane
        clippingPlanes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), onePlusEpsilon));
        
        // Right-side plane
        clippingPlanes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), onePlusEpsilon));
    
        // Bottom-side plane
        clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), onePlusEpsilon));
    
        // Top-side plane
        clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), onePlusEpsilon));
    
        // Near plane
        clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), epsilon));
    
        // Far plane
        clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), onePlusEpsilon));
    
        return clippingPlanes;
    }
}