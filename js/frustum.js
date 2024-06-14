import * as THREE from 'three';

import { addMatrices, deepCopyMeshOrLine } from './utils.js';
import { setTestBoolean, testBoolean, testBoolean2 } from './debugging.js';

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

const toDonConvention = new THREE.Matrix4();
toDonConvention.set( 1,0,0,0,
                      0,1,0,0,
                      0,0,-0.5,-0.5,
                      0,0,0,1 );

export class Frustum {
    #projection;
    
    static get PERSPECTIVE_FRUSTUM_LAYER() {return 1 };
    static get ORTHO_FRUSTUM_LAYER() {return 2};

    static get DISTORT_MODE_STANDARD() {return 0; }
    static get DISTORT_MODE_KEEP_NEAR_CONSTANT() { return 1; }
    
    #perspFOV;
    #orthoSideLength;
    #near;
    #far;

    #perspectiveCamera;
    #orthoCamera;

    #isTransitioning;
    #transitioningToImageSpace;
    #t;
    #transitionStart;
    #transitionDuration;
    #distortionMatrix;
    #distortMode;

    #perspectiveFrustum;

    #perspectiveTipLines;
    #perspectiveSideLines;
    
    #perspectiveNearPlaneLines;
    #perspectiveNearPlaneSurface;
    #perspectiveNearPlane;

    #perspectiveFarPlaneLines;
    #perspectiveFarPlaneSurface;
    #perspectiveFarPlane;

    #orthoFrustum;

    #orthoSideLines;

    #orthoNearPlaneLines;
    #orthoNearPlaneSurface;
    #orthoNearPlane;

    #orthoFarPlaneLines;
    #orthoFarPlaneSurface;
    #orthoFarPlane;

    #linesOnly;

    // TODO: Auto-sync these values with the default slider values on the webpage
    constructor() {
        // Set default values
        this.#projection = "perspective";
        this.#perspFOV = 45;
        this.#orthoSideLength = 5;
        this.#near = 1;
        this.#far = 10;

        this.#linesOnly = false;

        this.#isTransitioning = false;
        this.#transitioningToImageSpace = true;
        this.#t = 1;
        this.#transitionStart = null;
        this.#transitionDuration = 1000;
        this.#distortionMatrix = new THREE.Matrix4();
        this.#distortMode = Frustum.DISTORT_MODE_KEEP_NEAR_CONSTANT;

        // Initialize the groups for the frustum scene objects
        this.#initializeGroups();

        // Set the layers of the frustum groups
        this.#updateGroupLayers();

        // Set starting projection (makes the non-active frustum invisible)
        this.setProjection(this.#projection);

        // Add clickable property to near/far planes
        this.#perspectiveNearPlane.userData.clickable = true;
        this.#perspectiveFarPlane.userData.clickable = true;
        this.#orthoNearPlane.userData.clickable = true;
        this.#orthoFarPlane.userData.clickable = true;

        // Add gumball constraints to near/far planes
        this.#perspectiveNearPlane.userData.nearPlane = true;
        this.#perspectiveFarPlane.userData.farPlane = true;
        this.#orthoNearPlane.userData.nearPlane = true;
        this.#orthoFarPlane.userData.farPlane = true;

        // Generate frustum geometry
        this.#updateFrustum("all");
    }

    #initializeGroups() {
        // Create perspective frustum groups
        this.#perspectiveFrustum = new THREE.Group();
        this.#perspectiveSideLines = new THREE.Group();
        this.#perspectiveTipLines = new THREE.Group();
        this.#perspectiveNearPlane = new THREE.Group();
        this.#perspectiveFarPlane = new THREE.Group();
        this.#perspectiveNearPlaneLines = new THREE.Group();
        this.#perspectiveFarPlaneLines = new THREE.Group();

        // Create orthographic frustum groups
        this.#orthoFrustum = new THREE.Group();
        this.#orthoSideLines = new THREE.Group();
        this.#orthoNearPlane = new THREE.Group();
        this.#orthoFarPlane = new THREE.Group();
        this.#orthoNearPlaneLines = new THREE.Group();
        this.#orthoFarPlaneLines = new THREE.Group();

        // Add perspetive frustum subgroups to overall perspective frustum group
        this.#perspectiveFrustum.add(this.#perspectiveSideLines);
        this.#perspectiveFrustum.add(this.#perspectiveTipLines);
        this.#perspectiveFrustum.add(this.#perspectiveNearPlane);
        this.#perspectiveFrustum.add(this.#perspectiveFarPlane);
        this.#perspectiveFrustum.add(this.#perspectiveNearPlaneLines);
        this.#perspectiveFrustum.add(this.#perspectiveFarPlaneLines);

        // Add orthographic frustum subgroups to overall orthographic frustum group
        this.#orthoFrustum.add(this.#orthoSideLines);
        this.#orthoFrustum.add(this.#orthoNearPlane);
        this.#orthoFrustum.add(this.#orthoFarPlane);
        this.#orthoFrustum.add(this.#orthoNearPlaneLines);
        this.#orthoFrustum.add(this.#orthoFarPlaneLines);

        // Set name properties for identification (mainly used for debugging)
        this.#perspectiveFrustum.name = "PerspectiveFrustum";
        this.#perspectiveSideLines.name = "PerspectiveFrustumSideLines";
        this.#perspectiveTipLines.name = "PerspectiveFrustumTipLines";
        this.#perspectiveNearPlane.name = "PerspectiveFrustumNearPlane";
        this.#perspectiveFarPlane.name = "PerspectiveFrustumFarPlane";
        this.#perspectiveNearPlaneLines.name = "PerspectiveFrustumNearPlaneOutline";
        this.#perspectiveFarPlaneLines.name = "PerspectiveFrustumFarPlaneOutline";

        this.#orthoFrustum.name = "OrthographicFrustum";
        this.#orthoSideLines.name = "OrthographicFrustumSideLines";
        this.#orthoNearPlane.name = "OrthographicFrustumNearPlane";
        this.#orthoFarPlane.name = "OrthographicFrustumFarPlane";
        this.#orthoNearPlaneLines.name = "OrthographicFrustumNearPlaneOutline";
        this.#orthoFarPlaneLines.name = "OrthographicFrustumFarPlaneOutline";
    }

    #updateGroupLayers(){
        let setPerspectiveLayer = (obj) => {obj.layers.set(Frustum.PERSPECTIVE_FRUSTUM_LAYER); };
        this.#perspectiveFrustum.traverse(setPerspectiveLayer);

        let setOrthoLayer = (obj) => {obj.layers.set(Frustum.ORTHO_FRUSTUM_LAYER); };
        this.#orthoFrustum.traverse(setOrthoLayer);
    }

    #createPlaneHelper(lineGroup, xyExtents,
                        lineMaterial, planeMaterial) {
        // Create the list of points for the plane lines
        const planePoints = [];

        // Add the vertices that define the plane lines
        planePoints.push(new THREE.Vector3(-xyExtents,
                                            -xyExtents,
                                            0));
        planePoints.push(new THREE.Vector3(xyExtents,
                                            -xyExtents,
                                            0));
        planePoints.push(new THREE.Vector3(xyExtents,
                                            xyExtents,
                                            0));
        planePoints.push(new THREE.Vector3(-xyExtents,
                                            xyExtents,
                                            0));

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

        return planeObject;
    }

    #updatePerspectiveFrustumSideLines() {       
        const frustumSlope = this.getPerspectiveFrustumSlope();
    
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
                                             -this.#near));
        frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                             -frustumFarXandY,
                                             -this.#far));
    
        // These vertices define the truncated pyramid line for the bottom-
        // right corner of the frustum
        frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                             -frustumNearXandY,
                                             -this.#near));
        frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                             -frustumFarXandY,
                                             -this.#far));
        
        // These vertices define the truncated pyramid line for the top-
        // left corner of the frustum.
        frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                             frustumNearXandY,
                                             -this.#near));
        frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                             frustumFarXandY,
                                             -this.#far));                                             
    
        // These vertices define the truncated pyramid line for the top-
        // right corner of the frustum.
        frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                             frustumNearXandY,
                                             -this.#near));
        frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                             frustumFarXandY,
                                             -this.#far)); 
    
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
        const frustumSlope = this.getPerspectiveFrustumSlope();
    
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
                                                -this.#near));
    
        // These vertices define the pyramid tip line for the bottom-
        // right corner of the frustum
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(frustumNearXandY,
                                                -frustumNearXandY,
                                                -this.#near));
        
        // These vertices define the pyramid tip line for the top-
        // left corner of the frustum.
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(-frustumNearXandY,
                                                frustumNearXandY,
                                                -this.#near));                                             
    
        // These vertices define the pyramid tip line for the top-
        // right corner of the frustum.
        frustumTipPoints.push(new THREE.Vector3(0,0,0));
        frustumTipPoints.push(new THREE.Vector3(frustumNearXandY,
                                                frustumNearXandY,
                                                -this.#near));
    
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
        const frustumSlope = this.getPerspectiveFrustumSlope();
    
        // Compute the X/Y Distance from the center of the frustum to the inner
        // corners. This value is used to create the near-plane frustum vertices. 
        const frustumNearXandY = frustumSlope * this.#near;

        let plane = this.#createPlaneHelper(this.#perspectiveNearPlaneLines, 
                                frustumNearXandY,
                                nearPlaneLineMaterial, 
                                nearPlaneSurfaceMaterial);

        this.#perspectiveNearPlaneSurface = plane;
        this.#perspectiveNearPlaneSurface.visible = !this.#linesOnly;

        // Update overall near plane group
        this.#perspectiveNearPlane.clear();
        this.#perspectiveNearPlane.add(this.#perspectiveNearPlaneLines);
        this.#perspectiveNearPlane.add(this.#perspectiveNearPlaneSurface);
        this.#perspectiveNearPlane.position.set(0,0,-this.#near);
        this.#perspectiveNearPlane.updateMatrixWorld();
    }

    #updatePerspectiveFarPlane() {
        // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
        // Note: Because we assume a square frustum, this slope is the same for both
        // X and Y. Also note that the angle is divided by two, which is why there is
        // a division by 360 instead of 180.
        const frustumSlope = this.getPerspectiveFrustumSlope();
    
        // Compute the X/Y Distance from the center of the frustum to the outer
        // corners. This value is used to create the far-plane frustum vertices. 
        const frustumFarXandY = frustumSlope * this.#far;
    
        let plane = this.#createPlaneHelper(this.#perspectiveFarPlaneLines, 
                                            frustumFarXandY, 
                                            farPlaneLineMaterial, 
                                            farPlaneSurfaceMaterial);

        this.#perspectiveFarPlaneSurface = plane;
        this.#perspectiveFarPlaneSurface.visible = !this.#linesOnly;

        // Update overall far plane group
        this.#perspectiveFarPlane.clear();
        this.#perspectiveFarPlane.add(this.#perspectiveFarPlaneLines);
        this.#perspectiveFarPlane.add(this.#perspectiveFarPlaneSurface);
        this.#perspectiveFarPlane.position.set(0,0,-this.#far);
        this.#perspectiveFarPlane.updateMatrixWorld();
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
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            -orthoHalfDist,
                                            -this.#far));

        // These vertices define the bottom-right corner of the frustum.
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            -orthoHalfDist,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            -orthoHalfDist,
                                            -this.#far));

        // These vertices define the top-left corner of the frustum.
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            orthoHalfDist,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(-orthoHalfDist,
                                            orthoHalfDist,
                                            -this.#far));
        // These vertices define the top-right corner of the frustum.
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            orthoHalfDist,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(orthoHalfDist,
                                            orthoHalfDist,
                                            -this.#far));

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
                                orthoHalfDist,
                                nearPlaneLineMaterial, 
                                nearPlaneSurfaceMaterial);

        
        this.#orthoNearPlaneSurface = plane;
        this.#orthoNearPlaneSurface.visible = !this.#linesOnly;

        // Update overall near plane group
        this.#orthoNearPlane.clear();
        this.#orthoNearPlane.add(this.#orthoNearPlaneLines);
        this.#orthoNearPlane.add(this.#orthoNearPlaneSurface);
        this.#orthoNearPlane.position.set(0,0,-this.#near);
        this.#orthoNearPlane.updateMatrixWorld();
    }

    #updateOrthoFarPlane() {
        // Compute the "half side-length" for the sides of the orthographic frustum.
        // This value is used for the X/Y positions of the far plane vertices. 
        const orthoHalfDist = this.#orthoSideLength / 2;
    
        let plane = this.#createPlaneHelper(this.#orthoFarPlaneLines, 
                                            orthoHalfDist,
                                            farPlaneLineMaterial, 
                                            farPlaneSurfaceMaterial);

        this.#orthoFarPlaneSurface = plane;
        this.#orthoFarPlaneSurface.visible = !this.#linesOnly;

        // Update overall near plane group
        this.#orthoFarPlane.clear();
        this.#orthoFarPlane.add(this.#orthoFarPlaneLines);
        this.#orthoFarPlane.add(this.#orthoFarPlaneSurface);
        this.#orthoFarPlane.position.set(0,0,-this.#far);
        this.#orthoFarPlane.updateMatrixWorld();
    }

    #updatePerspectiveCamera() {
        this.#perspectiveCamera = new THREE.PerspectiveCamera(this.#perspFOV, 1,
                                                                this.#near,
                                                                this.#far);

        this.#perspectiveCamera.position.set(0,0,0);
        this.#perspectiveCamera.lookAt(0,0,-1); 
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
        this.#orthoCamera.lookAt(0,0,-1); 
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

        this.#updateGroupLayers();
    }

    getProjection() {
        return this.#projection;
    }

    setProjection(projection) {
        // Otherwise, if the projection is a valid projection type, swap the projection
        if(projection == "ortho" || projection == "perspective") {
            this.#projection = projection;
            return true;
        }

        // If the specified projection is not valid, return false to indicate failure
        return false;
    }

    swapProjection() {
        if(this.#projection == "ortho")
            this.setProjection("perspective");
        else 
            this.setProjection("ortho");
    }

    getFOV() {
        return this.#perspFOV;
    }

    setFOV(newFOV) {
        this.#perspFOV = parseFloat(newFOV);
        this.#updateFrustum("perspective");
    }

    getPerspectiveFrustumSlope() {
        // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
        // Note: Because we assume a square frustum, this slope is the same for both
        // X and Y. Also note that the angle is divided by two, which is why there is
        // a division by 360 instead of 180.
        return Math.tan(this.#perspFOV * Math.PI / 360);
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

    setVisible(visible) {
        this.#orthoFrustum.visible = !!visible;
        this.#perspectiveFrustum.visible = !!visible;
    }

    getLinesOnly() {
        return this.#linesOnly;
    }

    setLinesOnly(linesOnly) {
        // Set state variable
        this.#linesOnly = linesOnly;
        
        // Update plane mesh visibilities
        this.#perspectiveNearPlaneSurface.visible = !linesOnly;
        this.#perspectiveFarPlaneSurface.visible = !linesOnly;
        this.#orthoNearPlaneSurface.visible = !linesOnly;
        this.#orthoFarPlaneSurface.visible = !linesOnly;
    }

    setNearFarOpacity(opacity) {
        nearPlaneSurfaceMaterial.opacity = opacity;
        farPlaneSurfaceMaterial.opacity = opacity;
    }

    activateTransition() {
        const now = Date.now();

        this.#transitioningToImageSpace = !this.#transitioningToImageSpace;

        // If already transitioning, adjust the start time to flip the transition 
        if(this.#isTransitioning) {

            // This line is based on the following derivation:
            // oldTimeLeft = duration - (now - oldStart)
            // newPassedTime = oldTimeLeft 
            //               = duration - (now - oldStart)
            // newStart = now - newPassedTime 
            //          = now - (duration - (now - oldStart))
            //          = now - duration + now - oldStart
            // newStart = 2 * now - duration - oldStart
            this.#transitionStart = 2 * now - this.#transitionDuration - this.#transitionStart;
            return;
        }

        // Otherwise, start to transition to the other space
        this.#transitionStart = now;
        this.#isTransitioning = true;
    }

    isTransitioning() {
        return this.#isTransitioning;
    }

    getDistortMode() {
        return this.#distortMode;
    }

    setDistortMode(newDistortMode) {
        this.#distortMode = newDistortMode;
    }

    #getFullDistortMatrix(projectionMode) {
        if(projectionMode != "perspective" || projectionMode != "ortho"){
            projectionMode = this.#projection;
        }

        const cam = projectionMode == "perspective" ? 
                                        this.#perspectiveCamera : 
                                        this.#orthoCamera;

        const fullDistortMatrix = new THREE.Matrix4();
        fullDistortMatrix.multiplyMatrices(cam.projectionMatrix, 
                                            cam.matrixWorldInverse);
        fullDistortMatrix.premultiply(toDonConvention);
        return fullDistortMatrix;
    }

    #getNoDistortMatrix(projectionMode) {
        if(this.#distortMode == Frustum.DISTORT_MODE_STANDARD)
            return new THREE.Matrix4();
        
        if(projectionMode != "perspective" || projectionMode != "ortho"){
            projectionMode = this.#projection;
        }

        let scaleAmt;
        if(projectionMode == "perspective"){
            scaleAmt = 1/(this.getPerspectiveFrustumSlope() * this.#near);
        }
        else {
            scaleAmt = 2/(this.#orthoSideLength);
        }

        const noDistortMatrix = new THREE.Matrix4();
        noDistortMatrix.scale(new THREE.Vector3(scaleAmt, scaleAmt, scaleAmt));
        noDistortMatrix.setPosition(new THREE.Vector3(0,0,this.#near * scaleAmt));

        return noDistortMatrix;
    }

    tickFrustumDistortionMatrix(projectionMode) {
        const fullDistortMatrix = this.#getFullDistortMatrix(projectionMode);
        const noDistortMatrix = this.#getNoDistortMatrix(projectionMode);
        
        if(!this.#isTransitioning) {
            if(this.#transitioningToImageSpace) {
                this.#distortionMatrix.copy(fullDistortMatrix);
            }
            else {
                this.#distortionMatrix.copy(noDistortMatrix);
            }
            return;
        }

        const now = Date.now();

        this.#t = (now - this.#transitionStart) / (this.#transitionDuration);
        
        if(this.#t < 0) { this.#t = 0; this.#isTransitioning = false; }
        if(this.#t > 1) { this.#t = 1; this.#isTransitioning = false; }

        const t = this.#t;

        if(this.#transitioningToImageSpace) {
            noDistortMatrix.multiplyScalar(1-t);
            fullDistortMatrix.multiplyScalar(t);
        }
        else {
            noDistortMatrix.multiplyScalar(t);
            fullDistortMatrix.multiplyScalar(1-t);
        }

        this.#distortionMatrix = addMatrices(noDistortMatrix, fullDistortMatrix);
    }

    getImageAxesPosition() {
        if(this.#distortMode == Frustum.DISTORT_MODE_STANDARD)
            return new THREE.Vector3();

        const noDistortMatrix = this.#getNoDistortMatrix();

        // if(!this.#isTransitioning) {
        
            if(this.#transitioningToImageSpace) {
                return new THREE.Vector3();
            }
            else {
                const noDistortPos = new THREE.Vector3(0,0,0);
                return noDistortPos.applyMatrix4(noDistortMatrix);
            }
        // }
        
        const fullDistortMatrix = this.#getFullDistortMatrix();
        const trueNoDisortMatrix = new THREE.Matrix4();

        const t = this.#t;

        if(this.#transitioningToImageSpace) {
            trueNoDisortMatrix.multiplyScalar(1-t);
            fullDistortMatrix.multiplyScalar(t);
        }
        else {
            trueNoDisortMatrix.multiplyScalar(t);
            fullDistortMatrix.multiplyScalar(1-t);
        }

        const realDistortMatrix = addMatrices(trueNoDisortMatrix, fullDistortMatrix);
        const realDistortMatrixInv = realDistortMatrix.invert();

        const trueOrigin = new THREE.Vector3().applyMatrix4(realDistortMatrixInv);

        return trueOrigin.applyMatrix4(this.#distortionMatrix);
    }

    applyFrustumDistortionToVector(vec){
        return vec.applyMatrix4(this.#distortionMatrix);
    }

    // Modified from Stack Overflow Response: 
    // https://discourse.threejs.org/t/transform-individual-vertices-from-position-frombufferattribute/44898
    applyFrustumDistortionToObject(obj) {
        const positionAttribute = obj.geometry.getAttribute("position");
        const vertCount = positionAttribute.count;
        const vertex = new THREE.Vector3();

        const normalAttribute = obj.geometry.getAttribute("normal");
        const normal = new THREE.Vector3();

        for (let i = 0; i < vertCount; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);

            vertex.applyMatrix4(obj.matrixWorld);
            vertex.applyMatrix4(this.#distortionMatrix);

            // Set position to vertex
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z); 
        }

        const indices = obj.geometry.index;

        if(normalAttribute){
            const vert1 = new THREE.Vector3();
            const vert2 = new THREE.Vector3();
            const vert3 = new THREE.Vector3();

            let idx1, idx2, idx3;
            const loopIters = indices == null ? vertCount : indices.count;
            for(let i = 0; i < loopIters; i+=3){
                if(indices == null){
                    idx1 = i;
                    idx2 = i+1;
                    idx3 = i+2;
                }
                else {
                    idx1 = indices.array[i];
                    idx2 = indices.array[i+1];
                    idx3 = indices.array[i+2];
                }

                vert1.fromBufferAttribute(positionAttribute, idx1);
                vert2.fromBufferAttribute(positionAttribute, idx2);
                vert3.fromBufferAttribute(positionAttribute, idx3);

                normal.crossVectors(vert2.sub(vert1), vert3.sub(vert1));
                normal.normalize();

                if(Math.abs(normal.lengthSq() - 1) > 0.0001) {
                    console.log("Unnormalized Normal: ", normal, 
                        "\nSq Length:", normal.lengthSq());
                }

                normalAttribute.setXYZ(idx1, normal.x, normal.y, normal.z);
                normalAttribute.setXYZ(idx2, normal.x, normal.y, normal.z);
                normalAttribute.setXYZ(idx3, normal.x, normal.y, normal.z);
            }
        }

        obj.position.set(0,0,0);
        obj.rotation.set(0,0,0,"XYZ");
        obj.scale.set(1,1,1);

        obj.geometry.attributes.position.needsUpdate = true;

        if(obj.geometry.attributes.normal)
            obj.geometry.attributes.normal.needsUpdate = true;

        try {
            obj.geometry.computeBoundingSphere();   
        }
        catch(error) {
            console.error(error);
            console.log(obj);
        }
    }

    addFrustumToScene(scene) {
        scene.add(this.#perspectiveFrustum);
        scene.add(this.#orthoFrustum);
    }

    removeFrustumFromScene(scene) {
        scene.remove(this.#perspectiveFrustum);
        scene.remove(this.#orthoFrustum);
    }

    #addDistortedLineGroup(distortedFrustum, lineGroup) {
        for(let i = 0; i < lineGroup.children.length; ++i) {
            const line = lineGroup.children[i];
            const distortedLine = deepCopyMeshOrLine(line);
            this.applyFrustumDistortionToObject(distortedLine);

            distortedFrustum.add(distortedLine);
        }
    }

    // TODO - Refactor this based on new frustum-scene paradigm
    addDistortedFrustumToScene(scene, projectionMode) {
        if(projectionMode == null || projectionMode == "")
            projectionMode = this.#projection;

        var distortedFrustum = new THREE.Group();
        distortedFrustum.name = "DistortedFrustum"; // TODO: Remove magic name

        if(projectionMode == "perspective") {
            // Add Distorted Truncated Pyramid Side Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#perspectiveSideLines);

            // Add Distorted Near Plane Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#perspectiveNearPlaneLines);

            // Add Distorted Far Plane Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#perspectiveFarPlaneLines);

            const distortedNearPlane = deepCopyMeshOrLine(this.#perspectiveNearPlaneSurface);
            this.applyFrustumDistortionToObject(distortedNearPlane, true);

            distortedNearPlane.position.set(0,0,0);

            distortedFrustum.add(distortedNearPlane);

            const distortedFarPlane = deepCopyMeshOrLine(this.#perspectiveFarPlaneSurface);
            this.applyFrustumDistortionToObject(distortedFarPlane);

            distortedFarPlane.position.set(0,0,0);

            distortedFrustum.add(distortedFarPlane);
        }
        else if(projectionMode == "ortho") {
            // Distort Ortho Frustum Side Lines
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#orthoSideLines);

            // Distort Near Plane 
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#orthoNearPlaneLines);

            const distortedNearPlane = deepCopyMeshOrLine(this.#orthoNearPlaneSurface);
            this.applyFrustumDistortionToObject(distortedNearPlane);

            distortedNearPlane.position.set(0,0,0);

            distortedFrustum.add(distortedNearPlane);

            // Distort Far Plane 
            this.#addDistortedLineGroup(distortedFrustum, 
                                        this.#orthoFarPlaneLines);


            const distortedFarPlane = deepCopyMeshOrLine(this.#orthoFarPlaneSurface);
            this.applyFrustumDistortionToObject(distortedFarPlane);

            distortedFarPlane.position.set(0,0,0);

            distortedFrustum.add(distortedFarPlane);
        }

        scene.add(distortedFrustum);
    }

    removeDistortedFrustumFromScene(scene) {
        for(let i = 0; i < scene.children.length; ++i) {
            const child = scene.children[i];
            if(child.name == "DistortedFrustum") { // TODO: Remove magic name
                child.traverse(object => {
                    if(object.geometry)
                        object.geometry.dispose();
                });
                if(child.geometry)
                    child.geometry.dispose();

                scene.remove(child);
                break;
            }
        }
    }

    #generatePerspectiveFrustumPoints() {
        const frustumSlope = this.getPerspectiveFrustumSlope();

        // Compute the X/Y Distance from the center of the frustum to the inner
        // corners. This value is used to create the near-plane frustum vertices. 
        const frustumNearXandY = frustumSlope * this.#near;
    
        // Compute the X/Y Distance from the center of the frustum to the outer
        // corners. This value is used to create the far-plane frustum vertices. 
        const frustumFarXandY = frustumSlope * this.#far;

        const frustumPoints = [];

        frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                            -frustumNearXandY,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                            -frustumNearXandY,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                            frustumNearXandY,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                            frustumNearXandY,
                                            -this.#near));

        frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                            -frustumFarXandY,
                                            -this.#far));
        frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                            -frustumFarXandY,
                                            -this.#far));
        frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                            frustumFarXandY,
                                            -this.#far));
        frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                            frustumFarXandY,
                                            -this.#far));

        for(let i = 0; i < frustumPoints.length; ++i) {
            this.applyFrustumDistortionToVector(frustumPoints[i]);
        }

        return frustumPoints;
    }

    #generateOrthoFrustumPoints(){
        const frustumHalfLength = this.#orthoSideLength / 2;

        const frustumPoints = [];

        frustumPoints.push(new THREE.Vector3(-frustumHalfLength,
                                            -frustumHalfLength,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(frustumHalfLength,
                                            -frustumHalfLength,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(frustumHalfLength,
                                            frustumHalfLength,
                                            -this.#near));
        frustumPoints.push(new THREE.Vector3(-frustumHalfLength,
                                            frustumHalfLength,
                                            -this.#near));

        frustumPoints.push(new THREE.Vector3(-frustumHalfLength,
                                            -frustumHalfLength,
                                            -this.#far));
        frustumPoints.push(new THREE.Vector3(frustumHalfLength,
                                            -frustumHalfLength,
                                            -this.#far));
        frustumPoints.push(new THREE.Vector3(frustumHalfLength,
                                            frustumHalfLength,
                                            -this.#far));
        frustumPoints.push(new THREE.Vector3(-frustumHalfLength,
                                            frustumHalfLength,
                                            -this.#far));

        for(let i = 0; i < frustumPoints.length; ++i) {
            this.applyFrustumDistortionToVector(frustumPoints[i]);
        }

        return frustumPoints;
    }

    generateFrustumClippingPlanes(projectionMode) {
        const epsilon = 0.001;
        
        if(projectionMode != "perspective" || projectionMode != "ortho") {
            projectionMode = this.#projection;
        }

        let frustumPoints;

        if(projectionMode == "perspective") 
            frustumPoints = this.#generatePerspectiveFrustumPoints();
        else 
            frustumPoints = this.#generateOrthoFrustumPoints();

        const clippingPlanes = [];
    
       
        // Right-side plane (backwards from expected due to OpenGL convention)
        const leftPlane = new THREE.Plane();
        leftPlane.setFromCoplanarPoints(frustumPoints[3],
                                        frustumPoints[0],
                                        frustumPoints[4]);
        leftPlane.constant += epsilon;
        clippingPlanes.push(leftPlane);

        // Left-side plane (backwards from expected due to OpenGL convention)
        const rightPlane = new THREE.Plane();
        rightPlane.setFromCoplanarPoints(frustumPoints[1],
                                        frustumPoints[2],
                                        frustumPoints[5]);
        rightPlane.constant += epsilon;
        clippingPlanes.push(rightPlane);

        // Bottom-side plane
        const bottomPlane = new THREE.Plane();
        bottomPlane.setFromCoplanarPoints(frustumPoints[0],
                                        frustumPoints[1],
                                        frustumPoints[4]);
        bottomPlane.constant += epsilon;
        clippingPlanes.push(bottomPlane);

        // Top-side plane
        const topPlane = new THREE.Plane();
        topPlane.setFromCoplanarPoints(frustumPoints[2],
                                        frustumPoints[3],
                                        frustumPoints[6]);
        topPlane.constant += epsilon;
        clippingPlanes.push(topPlane);

        // Near plane
        const nearPlane = new THREE.Plane();
        nearPlane.setFromCoplanarPoints(frustumPoints[1],
                                        frustumPoints[0],
                                        frustumPoints[2]);
        nearPlane.constant += epsilon;
        clippingPlanes.push(nearPlane);

        // Far plane
        const farPlane = new THREE.Plane();
        farPlane.setFromCoplanarPoints(frustumPoints[4],
                                        frustumPoints[5],
                                        frustumPoints[6]);
        farPlane.constant += epsilon;
        clippingPlanes.push(farPlane);

        return clippingPlanes;
    }
}