import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { AxesObject } from './axesObject.js';
import { loadFile } from './file.js';
import { Frustum } from './frustum.js';
import { deepCopyMeshOrLine } from './utils.js';

const defaultGeo = new THREE.BoxGeometry(1,1,1);
const loader = new OBJLoader();

const raycaster = new THREE.Raycaster();

export class ProbeScene {
    #object;

    #objectDefaultPosition;
    #objectDefaultRotation;
    #objectDefaultScale;

    #objMaterial;
    #standardMaterial;
    #normalMaterial;
    #objShadingMode;

    #frustum;
    #realSceneAxes;
    #imageSpaceSceneAxes;

    #gumball;
    #gumballView;
    #gumballMode;

    #realScene;
    #imageSpaceScene;
    
    constructor() {
        // Set global variables    
        this.#object = null;
        
        this.#objectDefaultPosition = new THREE.Vector3(0,0,2.5);
        this.#objectDefaultRotation = new THREE.Vector3(0,0,0);
        this.#objectDefaultScale = new THREE.Vector3(1,1,1);

        this.#standardMaterial = new THREE.MeshStandardMaterial({
            color : 0xffffff,
            metalness : 0,
            roughness : 1,
            envMapIntensity : 0,
            lightMapIntensity: 0,
            flatShading : true,
            side : THREE.DoubleSide,
        });

        this.#normalMaterial = new THREE.ShaderMaterial({
            clipping : true,
            side : THREE.DoubleSide,
            vertexShader : loadFile("shaders/normalVertexShader.vs"),
            fragmentShader : loadFile("/shaders/normalFragmentShader.fs")
        });
        
        this.#normalMaterial.extensions.clipCullDistance = true;

        this.#objMaterial = this.#standardMaterial;

        this.#objShadingMode = "flat";

        this.#frustum = new Frustum();

        // Enables the appropriate layers depending on the frustum's starting projection
        this.setProjectionMode(this.#frustum.getProjection());

        this.#gumball = null;
        this.#gumballView = -1;
        this.#gumballMode = "translate";

        // The scene is implemented as two separate scenes:
        //  - One is the undistorted "real world" scene, it contains the truncated pyramid frustum
        //  - One is the distorted "imagespace" scene, it contains the half-cube NDC camera extents
        // 
        // When rendering the scene, the user species whether they want the camera distortion to be
        // applied. If not, the "real world" scene is rendered. If not, the "imagespace" scene is
        // rendered.

        // The real-world scene variable
        this.#realScene = null;
        // The image-space scene variable
        this.#imageSpaceScene = null;

        // Initialize the two scenes
        this.#initRealWorldScene();
        this.#initImagespaceScene();

        this.#makeDefaultCube();

    }

    #initRealWorldScene() {
        this.#realScene = new THREE.Scene();

        this.#frustum.addFrustumToScene(this.#realScene);

        this.#realSceneAxes = new AxesObject(0.5);
        this.#realSceneAxes.addToScene(this.#realScene);

        initSceneLights(this.#realScene);
    }

    #initImagespaceScene() {
        // Initialize scene
        this.#imageSpaceScene = new THREE.Scene();

        this.#imageSpaceSceneAxes = new AxesObject(0.25);
        this.#imageSpaceSceneAxes.addToScene(this.#imageSpaceScene);

        initSceneLights(this.#imageSpaceScene);
    }

    #changeSceneObject(newObject) {
        if(this.#object != null) {
            this.#object.clear();
            this.#realScene.remove(this.#object);
        }
    
        this.#object = newObject;
        this.#realScene.add(this.#object);
        this.#object.userData.clickable = true;
    }

    #makeDefaultCube() {
        this.#changeSceneObject(new THREE.Mesh(defaultGeo, this.#objMaterial));
    
        // Set default object tranformation for default cube
        this.#objectDefaultPosition.set(0,0,2.5);
        this.#objectDefaultRotation.set(0,0,0,"XYZ");
        this.#objectDefaultScale.set(1,1,1);

        this.resetObjectTransform();
    }
    
    #addLoadedObjectToScene(loadedObject) {
        // Swap object to the newly loaded object
        this.#changeSceneObject(loadedObject);
    
        // Change materials on loaded object to the scene material
        this.#object.children.forEach(function(mesh) {
            try {
                mesh.material = this.material;
            }
            catch(error) {
                console.log("Non-mesh element loaded from OBJ; scene material cannot be applied!");
            }
        });
    }

    getCurrentObject() {
        return object;
    }

    loadObjectAtPath(objectPath)
    {
        // Immediately fail for malformed paths
        if(objectPath != null && objectPath != "")
        {  
            console.log("Object Loading Failed: Null or Empty Path Provided!");
            return;
        }

        loader.load(
            objectPath,
            this.#addLoadedObjectToScene,
            // called when loading is in progresses
            function(xhr) {

                console.log((xhr.loaded / xhr.total * 100) + "% loaded");

            },
            // called when loading has errors
            function(error) {

                console.log("Object Loading Failed:", error);

                this.#makeDefaultCube();
            }
        );  
    }

    getProjectionMode() {
        return this.#frustum.getProjection();
    }

    setProjectionMode(newMode) {
        const validMode = this.#frustum.setProjection(newMode);
        if(!validMode)
            return validMode;

        if(newMode == "ortho"){
            raycaster.layers.disable(Frustum.PERSPECTIVE_FRUSTUM_LAYER);
            raycaster.layers.enable(Frustum.ORTHO_FRUSTUM_LAYER);
        }
        else if(newMode == "perspective"){
            raycaster.layers.enable(Frustum.PERSPECTIVE_FRUSTUM_LAYER);
            raycaster.layers.disable(Frustum.ORTHO_FRUSTUM_LAYER);
        }
    }

    getFOV() {
        return this.#frustum.getFOV();
    }

    setFOV(fov) {
        this.#frustum.setFOV(fov);
    }

    getOrthoSideLength() {
        return this.#frustum.getOrthoSideLength();
    }

    setOrthoSideLength(newLength) {
        this.#frustum.setOrthoSideLength(newLength);
    }

    getNearPlane() {
        return this.#frustum.getNear();
    }

    setNearPlane(near) {
        this.#frustum.setNear(near);
    }

    getFarPlane() {
        return this.#frustum.getFar();
    }

    setFarPlane(far) {
        this.#frustum.setFar(far);
    }

    activateFrustumTransition() {
        this.#frustum.activateTransition();
    }

    tickFrustumDistortionMatrix() {
        this.#frustum.tickFrustumDistortionMatrix();
    }

    setShowFrustum(showFrustum){
        this.#frustum.setVisible(showFrustum);
    }

    setShowAxes(showAxes) {
        this.#realSceneAxes.setVisible(showAxes);
        this.#imageSpaceSceneAxes.setVisible(showAxes);
    }

    #updateObjectMaterial() {
        if(this.#object instanceof THREE.Mesh) {
            this.#object.material = this.#objMaterial;
        }

        this.#object.children.forEach(function(mesh) {
            try {
                mesh.material = this.material;
            }
            catch(error) {
                console.log("Non-mesh element encountered during material update; " +
                            "scene material cannot be applied!");
            }
        });
    }

    setShadingMode(mode) { 
        // Handle changes to standard material   
        switch(mode) {
            case "wire":
                this.#standardMaterial.wireframe = true;
                this.#standardMaterial.flatShading = false;
                this.#standardMaterial.emissive = this.#standardMaterial.color;
                break;
            case "flat":
                this.#standardMaterial.wireframe = false;
                this.#standardMaterial.flatShading = true;
                this.#standardMaterial.emissive = new THREE.Color(0x000000);
                break;
            case "smooth":
                this.#standardMaterial.wireframe = false;
                this.#standardMaterial.flatShading = false;
                this.#standardMaterial.emissive = new THREE.Color(0x000000);
                break;
        }

        const newModeIsNormal = mode == "normal";
        const oldModeIsNormal = this.#objShadingMode == "normal";

        this.#objShadingMode = mode;

        if(newModeIsNormal == oldModeIsNormal) {
            this.#objMaterial.needsUpdate = true;
            return;
        }
        
        this.#objMaterial = mode == "normal" ? this.#normalMaterial : this.#standardMaterial;

        this.#updateObjectMaterial();
        this.#objMaterial.needsUpdate = true;
    }

    setShadingDoubleSided(doubleSided) {
        this.#standardMaterial.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
        this.#normalMaterial.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
        
        this.#standardMaterial.needsUpdate = true;
        this.#normalMaterial.needsUpdate = true;
    }

    setObjectColor(color) {
        this.#objMaterial.color = new THREE.Color(color);
        if(this.#objShadingMode == "wire") {
            this.#objMaterial.emissive = new THREE.Color(color);
        }
        this.#objMaterial.needsUpdate = true;
    }

    setNearFarOpacity(opacity) {
        this.#frustum.setNearFarOpacity(opacity);
    }

    raycastScene(screenCoords, camera, imagespace) {
        raycaster.setFromCamera(screenCoords, camera);

        if(!imagespace) {
            return raycaster.intersectObjects(this.#realScene.children);
        }
        else {
            return raycaster.intersectObjects(this.#imageSpaceScene.children);
        }
    }

    #createGumball(object, view, viewIndex, cameraViewCamera) { 
        // Create a new transform control widget
        this.#gumball = new TransformControls(view.camera, view.renderer.domElement);

        // Add mousedown/up event handling
        this.#gumball.addEventListener("mouseDown", (event) => {
            if(view.cameraControls != null)
                view.cameraControls.enabled = false;
        });
        this.#gumball.addEventListener("mouseUp", (event) => {
            if(view.cameraControls != null)
                view.cameraControls.enabled = true;
        });

        // Attach it to the clicked object 
        this.#gumball.attach(object);

        // Set gumball mode/apply contraints
        if(object.userData.nearPlane) {
            this.#gumball.mode = "translate";
            this.#gumball.showX = false;
            this.#gumball.showY = false;
            this.#gumball.userData.onlyTranslate = true;

            this.#gumball.addEventListener("change", (event) => {
                const z = object.position.z;
                if(z > 0 && z < this.#frustum.getFar()){
                    this.#frustum.setNear(z);
                    const nearElement = document.getElementById("nearEntry");
                    nearElement.value = z;
                    cameraViewCamera.near = z;
                }
                else {
                    object.position.setZ(this.#frustum.getNear());
                }
            });
        }
        else if(object.userData.farPlane){
            this.#gumball.mode = "translate";
            this.#gumball.showX = false;
            this.#gumball.showY = false;
            this.#gumball.userData.onlyTranslate = true;

            this.#gumball.addEventListener("change", (event) => {
                const z = object.position.z;
                if(z > this.#frustum.getNear()) {
                    this.#frustum.setFar(z);
                    const farElement = document.getElementById("farEntry");
                    farElement.value = z;
                    cameraViewCamera.far = z;
                }
                else {
                    object.position.setZ(this.#frustum.getFar());
                }
            });
        }
        else {
            this.#gumball.mode = this.#gumballMode;
            this.#gumball._gizmo.gizmo.translate.children[0].scale.set(-1,-1,-1);
            console.log(this.#gumball._gizmo.gizmo.translate.children[0]);
        }

        // Add gumball to scene
        this.#realScene.add(this.#gumball);

        // Set gumball to invisible - it is made visible for the specific
        // view during rendering
        this.#gumball.visible = false;

        // Set gumball view variable
        this.#gumballView = viewIndex;
    }

    clearGumball() {
        // Return early if gumball is already cleared
        if(this.#gumball == null)
            return;

        // Remove gumball from scene
        this.#realScene.remove(this.#gumball);

        // Call dispose on gumball
        this.#gumball.dispose();

        // Reset gumball instance variable
        this.#gumball = null;

        // Reset gumball view variable
        this.#gumballView = -1;
    }

    getGumball() {
        return this.#gumball;
    }

    getGumballMode() {
        return this.#gumball.mode;
    }

    setGumballMode(mode) {
        if(mode != "translate" && mode != "rotate" && mode != "scale") {
            console.error("Error: Invalid Gumball Mode -> ", mode);
            return;
        }

        this.#gumballMode = mode;

        if(this.#gumball != null && !this.#gumball.userData.onlyTranslate){
            this.#gumball.mode = mode;
        }
    }

    clickObject(object, view, viewIndex, cameraViewCamera) {
        // Destroy the gumball and return if the object cannot be clicked,
        // or if the view does not have the gumball enabled.
        if(!object.userData || !object.userData.clickable || !view.gumball) {
            this.clearGumball();
            return null;
        }
        
        if(this.#gumball != null ) {
            // Return if the gumball is already attached to this object, otherwise
            // destroy the existing gumball
            if(object == this.#gumball.object) {
                return this.#gumball;
            }
            else {
                this.clearGumball();
            }
        }

        // Create a new gumball for the object
        this.#createGumball(object, view, viewIndex, cameraViewCamera);

        return this.#gumball;
    }

    resetObjectTransform() {
        this.#object.position.copy(this.#objectDefaultPosition);
        this.#object.rotation.set(this.#objectDefaultRotation.x,
                                    this.#objectDefaultRotation.y,
                                    this.#objectDefaultRotation.z,
                                    "XYZ");
        this.#object.scale.copy(this.#objectDefaultScale);
        this.#object.updateMatrixWorld();
    }

    #setCameraLayers(camera) {
        const mode = this.getProjectionMode();

        if(mode == "ortho"){
            camera.layers.disable(Frustum.PERSPECTIVE_FRUSTUM_LAYER);
            camera.layers.enable(Frustum.ORTHO_FRUSTUM_LAYER);
        }
        else if(mode == "perspective"){
            camera.layers.enable(Frustum.PERSPECTIVE_FRUSTUM_LAYER);
            camera.layers.disable(Frustum.ORTHO_FRUSTUM_LAYER);
        }
    }

    #getDistortedObject() {
        var distortedObj;
        
        if(this.#object instanceof THREE.Mesh || 
            this.#object instanceof THREE.Line) 
        {
            distortedObj = deepCopyMeshOrLine(this.#object);
            this.#frustum.applyFrustumDistortionToObject(distortedObj);
        }
        else { 
            distortedObj = new THREE.Object3D();
            
            for(let i = 0; i < this.#object.children.length; ++i) {
                if(this.#object.children[i] instanceof THREE.Mesh || 
                    this.#object.children[i] instanceof THREE.Line)
                {
                    const childCopy = deepCopyMeshOrLine(this.#object.children[i]);
                    
                    this.#frustum.applyFrustumDistortionToObject(childCopy);

                    childCopy.position.set(0,0,0);
                    distortedObj.add(childCopy);                                    
                }
                else {
                    console.log("Non-mesh/line element detected in scene object;" + 
                                "cannot apply distortion!");
                }
            }
        }

        distortedObj.position.set(0,0,0);
        distortedObj.rotation.set(0,0,0,"XYZ");
        distortedObj.scale.set(1,1,1);

        return distortedObj;
    }

    renderScene(viewIndex, renderer, camera, imagespace, showFrustum, linesOnly, showAxes)
    {
        if(this.#gumballView == viewIndex)
            this.#gumball.visible = true;
     
        
        this.#frustum.setLinesOnly(linesOnly);

        // Set camera layers
        this.#setCameraLayers(camera);

        // Set show frustum
        this.setShowFrustum(showFrustum);

        // If rendering the real scene, just render the scene
        if(!imagespace) {
            renderer.render(this.#realScene, camera);
        }
        // If rendering the image space scene, create the perspective distorted
        // geometry and then render the scene
        else {
            const distortedObj = this.#getDistortedObject();
            this.#imageSpaceScene.add(distortedObj);
    
            if(showFrustum) {
                this.#frustum.addDistortedFrustumToScene(this.#imageSpaceScene, 
                                                            null);
            }

            renderer.clippingPlanes = this.#frustum.generateFrustumClippingPlanes();
    
            renderer.render(this.#imageSpaceScene, camera);
    
            this.#imageSpaceScene.remove(distortedObj);

            if(showFrustum) {
                this.#frustum.removeDistortedFrustumFromScene(this.#imageSpaceScene);
            }
        }

        if(this.#gumballView == viewIndex)
            this.#gumball.visible = false;
    }
}

function initSceneLights(scene) {

    // Create First Front-Side Directional Light
    const dirLightFront1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLightFront1.position.set(1,1,-3);

     // Create Second Front-Side Directional Light
     const dirLightFront2 = new THREE.DirectionalLight(0xffffff, 1.2);
     dirLightFront2.position.set(-1,1,-3);

    // Create First Back-Side Directional Light
    const dirLightBack1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLightBack1.position.set(2,1,1);

    // Create Second Back-Side Directional Light
    const dirLightBack2 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLightBack2.position.set(-2,1,1);

    // Create Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Soft white light

    // Add Directional Lights to scene
    scene.add(dirLightFront1);
    scene.add(dirLightFront2);

    scene.add(dirLightBack1);
    scene.add(dirLightBack2);

    scene.add(ambientLight);
}


