import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { AxesObject } from './axesObject.js';
import { setTestBoolean, testBoolean } from './debugging.js'
import { defaults } from './defaults.js';
import { loadLocalFile } from './file.js';
import { Frustum } from './frustum.js';
import { deepCopyMeshOrLine, 
        generateDetriangulatedWireframe } from './utils.js';

const defaultGeo = new THREE.BoxGeometry(1,1,1);

const loader = new OBJLoader();
const exporter = new OBJExporter();

const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 0.1;

const translateEntryX = document.getElementById("translationXEntry");
const translateEntryY = document.getElementById("translationYEntry");
const translateEntryZ = document.getElementById("translationZEntry");

const rotateEntryX = document.getElementById("rotationXEntry");
const rotateEntryY = document.getElementById("rotationYEntry");
const rotateEntryZ = document.getElementById("rotationZEntry");

const scaleEntryX = document.getElementById("scaleXEntry");
const scaleEntryY = document.getElementById("scaleYEntry");
const scaleEntryZ = document.getElementById("scaleZEntry");

export class ProbeScene {

    static get STANDARD_OBJECT_LAYER() {return 1 };
    static get DETRIANGULATED_WIREFRAME_LAYER() {return 2 };

    #object;

    #fitLoadedObjectToFrustum 

    #objectDefaultPosition;
    #objectDefaultRotation;
    #objectDefaultScale;

    #objMaterial;
    #standardMaterial;
    #normalMaterial;
    #objShadingMode;

    #objectGeneratedWireframe;
    #objectGeneratedWireframeMaterial;
    #useObjectGeneratedWireframe;

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
        
        this.#fitLoadedObjectToFrustum = defaults.startFitLoadedObjectToFrustum;

        this.#objectDefaultPosition = new THREE.Vector3(0,0,2.5);
        this.#objectDefaultRotation = new THREE.Vector3(0,0,0);
        this.#objectDefaultScale = new THREE.Vector3(1,1,1);

        this.#standardMaterial = new THREE.MeshStandardMaterial({
            color : defaults.startShadingColor,
            metalness : 0,
            roughness : 1,
            envMapIntensity : 0,
            lightMapIntensity: 0,
            flatShading : true,
            side : defaults.startMaterialDoubleSided ? 
                        THREE.DoubleSide : THREE.FrontSide,
        });

        this.#normalMaterial = new THREE.ShaderMaterial({
            clipping : true,
            side : defaults.startMaterialDoubleSided ? 
                        THREE.DoubleSide : THREE.FrontSide,
            vertexShader : loadLocalFile("./shaders/normalVertexShader.vs"),
            fragmentShader : loadLocalFile("./shaders/normalFragmentShader.fs")
        });

        this.#objectGeneratedWireframeMaterial = new THREE.LineBasicMaterial({
            color: defaults.startShadingColor
        });
        
        this.#normalMaterial.extensions.clipCullDistance = true;

        this.#objShadingMode = defaults.startShadingMode;
        if(this.#objShadingMode == "normal") {
            this.#objMaterial = this.#normalMaterial;
        }
        else {
            this.#objMaterial = this.#standardMaterial;
        }

        this.#objectGeneratedWireframe = null;
        this.#useObjectGeneratedWireframe = false;

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

        this.setObjectToDefaultCube();

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
            for(let i = 0; i < this.#object.children.length; ++i){
                if(this.#object.children[i].geometry)
                    this.#object.children[i].geometry.dispose();
            }
            this.#object.clear();
            this.#realScene.remove(this.#object);
            if(this.#object.geometry)
                this.#object.geometry.dispose();
        }
    
        this.#object = newObject;
        this.#realScene.add(this.#object);
        this.#object.userData.clickable = true;

        this.#objectGeneratedWireframe = null;

        if(this.#gumball){
            this.clearGumball();
        }
    }

    setObjectToDefaultCube() {
        this.#changeSceneObject(new THREE.Mesh(defaultGeo, this.#objMaterial));
        this.#object.name = "DefaultCube";
        this.#object.layers.set(ProbeScene.STANDARD_OBJECT_LAYER);
    
        // Set default object tranformation for default cube
        const near = this.#frustum.getNear();
        const far = this.#frustum.getFar();

        const cubeZ = -Math.max(Math.min(near + 1.5, (near + far) / 2), 2);
        this.#objectDefaultPosition.set(0,0,cubeZ);
        this.#objectDefaultRotation.set(0,0,0,"XYZ");
        this.#objectDefaultScale.set(1,1,1);

        this.resetObjectTransform();
    }
    
    #addLoadedObjectToScene(loadedObject) {
        // Swap object to the newly loaded object
        this.#changeSceneObject(loadedObject);
        this.#object.name = "LoadedObject";
        this.#object.layers.set(ProbeScene.STANDARD_OBJECT_LAYER);

    
        // Change materials on loaded object to the scene material
        const mat = this.#objMaterial;
        this.#object.children.forEach(function(mesh) {
            try {
                mesh.layers.set(ProbeScene.STANDARD_OBJECT_LAYER);
                mesh.material = mat;
            }
            catch(error) {
                console.log("Non-mesh element loaded from OBJ; " +
                            "scene material cannot be applied!");
            }
        });

        // If the 'fit to frustum' option is turned off, set the default 
        // transformation to identity
        if(!this.#fitLoadedObjectToFrustum) {
            this.#objectDefaultPosition = new THREE.Vector3(0,0,0);
            this.#objectDefaultRotation.set(0,0,0,"XYZ");
            this.#objectDefaultScale.set(1,1,1);

            this.resetObjectTransform();

            return;
        }

        // Otherwise, determine the appropriate translation/scale for the 
        // loaded object based on its bounding box
        // 
        // Here we take advantage of the fact that the object is imported
        // such that the object origin is at 0,0,0. The logic does not work
        // if the object has already been translated.
        
        // Get the object's bounding box for scaling purposes
        const boundingBox = new THREE.Box3().setFromObject(this.#object, true);

        // Get the default near/far plane
        const near = defaults.startNear;
        const far = defaults.startFar;

        // Get the object's translation for centering purposes
        const translation = new THREE.Vector3();
        boundingBox.getCenter(translation);

        this.#object.position.z = -2.5;

        const scaleFactorZ = (far - near) / 2 /
                                (boundingBox.max.z - boundingBox.min.z);

        
        // Determine how small to shrink the object to fit inside the perspective
        // frustum (to avoid strange behavior when the frustum is grown/shrunk, the 
        // starting frustum angle is used).
        const assumedFrustumSlope = Math.tan(defaults.startFOV * Math.PI / 360);
        const frustumZAt25 = 0.75 * near + 0.25 * far;
        const frustumSizeAt25 = assumedFrustumSlope * frustumZAt25 * 2;

        const scaleFactorX = frustumSizeAt25 / (boundingBox.max.x - boundingBox.min.x);
        const scaleFactorY = frustumSizeAt25 / (boundingBox.max.y - boundingBox.min.y);

        const scaleFactor = Math.min(scaleFactorZ, 
                                    Math.min(scaleFactorX, scaleFactorY));

        translation.multiplyScalar(scaleFactor);

        const translateZ = -(near + far) / 2 - translation.z;

        this.#objectDefaultPosition = new THREE.Vector3(-translation.x,
                                                        -translation.y,
                                                        translateZ);
        this.#objectDefaultRotation.set(0,0,0,"XYZ");
        this.#objectDefaultScale.set(scaleFactor,scaleFactor,scaleFactor);

        this.resetObjectTransform();
    }

    getCurrentObject() {
        return object;
    }

    loadObjectFromText(objectText) {
        // Immediately fail for malformed paths
        if(objectText == null || objectText == "")
        {  
            console.log("Object Loading Failed: Null or Empty Text Provided!");
            return;
        }

        const object = loader.parse(objectText);
        this.#addLoadedObjectToScene(object);
    }

    setFitLoadedObjectToFrustum(fitToFrustum) {
        this.#fitLoadedObjectToFrustum = fitToFrustum;
    }

    saveDistortedObjectToText() {
        const distortedObj = this.#getDistortedObject();

        const distortedObjText = exporter.parse(distortedObj);

        this.#removeDistortedObject(distortedObj);

        return distortedObjText;
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

    getFrustumDistortionMode() {
        return this.#frustum.getDistortMode();
    }

    setFrustumDistortionMode(mode) {
        this.#frustum.setDistortMode(mode);
    }

    setShowFrustum(showFrustum) {
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

        const mat = this.#objMaterial;
        this.#object.children.forEach(function(mesh) {
            try {
                if(!(mesh instanceof THREE.Line))
                    mesh.material = mat;
            }
            catch(error) {
                console.log("Non-mesh element encountered during material update; " +
                            "scene material cannot be applied!");
            }
        });
    }

    isDetriangulatedWireframeGenerated() {
        return this.#objectGeneratedWireframe != null;
    }

    generateObjectDetriangulatedWireframe() {        
        return new Promise((resolve, reject) => {
            try {
                if (this.#objectGeneratedWireframe != null) {
                    this.#objectGeneratedWireframe.geometry.dispose();
                    this.#object.remove(this.#objectGeneratedWireframe);
                }
    
                // TODO - Handle more cases (this is a quick fix since the OBJ loader
                // always loads in as a group with one mesh, and the default cube is
                // just a mesh)
                const mesh = (this.#object instanceof THREE.Mesh ? this.#object : this.#object.children[0]);
                this.#objectGeneratedWireframe = generateDetriangulatedWireframe(mesh, 
                                                            this.#objectGeneratedWireframeMaterial,
                                                            true);
    
                this.#objectGeneratedWireframe.layers.set(ProbeScene.DETRIANGULATED_WIREFRAME_LAYER);
                this.#objectGeneratedWireframe.name = "DetriangulatedWireframe";
                this.#object.add(this.#objectGeneratedWireframe);
    
                document.getElementById("detriangulateWireframeButton").disabled = true;
                this.setUseDetriangulatedWireframe(true);
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    setShadingMode(mode) { 
        // Handle changes to standard material   
        switch(mode) {
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
            case "wire":
                this.#standardMaterial.wireframe = true;
                this.#standardMaterial.flatShading = false;
                this.#standardMaterial.emissive = this.#standardMaterial.color;
                break;
        }

        
        const newModeIsNormal = mode == "normal";
        const oldModeIsNormal = this.#objShadingMode == "normal";

        this.#objShadingMode = mode;

        // If material has switched from normal to another mode, update active material on 
        // scene object/children
        if(newModeIsNormal == oldModeIsNormal) {
            this.#objMaterial.needsUpdate = true;
        }
        else {
            this.#objMaterial = mode == "normal" ? 
                                    this.#normalMaterial : this.#standardMaterial;

            this.#updateObjectMaterial();
            this.#objMaterial.needsUpdate = true;
        }
    }

    getUseDetriangulatedWireframe() {
        return this.#useObjectGeneratedWireframe;
    }

    setUseDetriangulatedWireframe(useWireframe) {
        this.#useObjectGeneratedWireframe = useWireframe;

        const useDeTriCheckbox = document.getElementById("useDetriangulatedWireframeCheckbox");
        useDeTriCheckbox.checked = !!useWireframe;
    }

    setShadingDoubleSided(doubleSided) {
        this.#standardMaterial.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
        this.#normalMaterial.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
        
        this.#standardMaterial.needsUpdate = true;
        this.#normalMaterial.needsUpdate = true;
    }

    setObjectColor(color) {
        const threeColor = new THREE.Color(color);
        this.#standardMaterial.color = threeColor;
        this.#objectGeneratedWireframeMaterial.color = threeColor; 
        if(this.#objShadingMode == "wire") {
            this.#standardMaterial.emissive = new THREE.Color(color);
        }
        this.#standardMaterial.needsUpdate = true;
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
                if(z < 0 && z > -this.#frustum.getFar()){
                    this.#frustum.setNear(-z);
                    const nearElement = document.getElementById("nearEntry");
                    nearElement.value = -z;
                    cameraViewCamera.near = -z;
                }
                else {
                    object.position.setZ(-this.#frustum.getNear());
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
                if(z < this.#frustum.getNear()) {
                    this.#frustum.setFar(-z);
                    const farElement = document.getElementById("farEntry");
                    farElement.value = -z;
                    cameraViewCamera.far = -z;
                }
                else {
                    object.position.setZ(-this.#frustum.getFar());
                }
            });
        }
        else {
            this.#gumball.mode = this.#gumballMode;

            this.#gumball.addEventListener("change", () => {
                this.#updateTransformDOMElements();
            });
        }

        this.#gumball.setSpace("world");

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

    getGumballView() {
        return this.#gumballView;
    }

    getGumballMode() {
        return this.#gumball.mode;
    }

    setGumballMode(mode) {
        if(mode != "translate" && mode != "rotate" && mode != "scale") {
            console.error("Error: Invalid Gumball Mode -> ", mode);
            return;
        }

        if(this.#gumball != null && !this.#gumball.userData.onlyTranslate){
            this.#gumball.mode = mode;

            if(mode == this.#gumballMode) {
                if(this.#gumball.space == "world")
                    this.#gumball.setSpace("local");
                else
                    this.#gumball.setSpace("world");
            }
            else {
                this.#gumball.setSpace("world");
            }
        }

        this.#gumballMode = mode;
    }

    setGumballSnap(snap) {
        if(this.#gumball == null)
            return;

        if(snap) {
            this.#gumball.setRotationSnap(Math.PI/12);
        }
        else {
            this.#gumball.setRotationSnap(null);
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

        this.#updateTransformDOMElements();
    }

    setObjectDefaultTransform() {
        this.#objectDefaultPosition.copy(this.#object.position);
        this.#objectDefaultRotation.set(this.#object.rotation.x,
                                        this.#object.rotation.y,
                                        this.#object.rotation.z,
                                        "XYZ");
        this.#objectDefaultScale.copy(this.#object.scale);
    }

    setObjectPositionX(newX) {
        this.#object.position.x = parseFloat(newX);
        this.#updateTransformDOMElements();
    }

    setObjectPositionY(newY) {
        this.#object.position.y = parseFloat(newY);
        this.#updateTransformDOMElements();
    }

    setObjectPositionZ(newZ) {
        this.#object.position.z = parseFloat(newZ);
        this.#updateTransformDOMElements();
    }

    setObjectPosition(newPos) {
        if(newPos instanceof new THREE.Vector3)
            this.#object.position.copy(newPos);
        this.#updateTransformDOMElements();
    }

    setObjectRotationX(newX) {
        this.#object.rotation.x = parseFloat(newX) * Math.PI / 180;
        this.#updateTransformDOMElements();
    }

    setObjectRotationY(newY) {
        this.#object.rotation.y = parseFloat(newY) * Math.PI / 180;
        this.#updateTransformDOMElements();
    }

    setObjectRotationZ(newZ) {
        this.#object.rotation.z = parseFloat(newZ) * Math.PI / 180;
        this.#updateTransformDOMElements();
    }

    setObjectRotation(newRot) {
        if(newRot instanceof THREE.Vector3) {
            this.#object.rotation.set(newRot.x * Math.PI / 180, 
                                        newRot.y * Math.PI / 180, 
                                        newRot.z * Math.PI / 180);
        }
        else if(newRot instanceof THREE.Euler) {
            this.#object.rotation.set(newRot.x, newRot.y, newRot.z);
        }
        this.#updateTransformDOMElements();
    }

    setObjectScaleX(newX) {
        this.#object.scale.x = parseFloat(newX);
        this.#updateTransformDOMElements();
    }

    setObjectScaleY(newY) {
        this.#object.scale.y = parseFloat(newY);
        this.#updateTransformDOMElements();
    }

    setObjectScaleZ(newZ) {
        this.#object.scale.z = parseFloat(newZ);
        this.#updateTransformDOMElements();
    }

    setObjectScale(newScale) {
        if(newScale instanceof new THREE.Vector3)
            this.#object.scale.copy(newScale);
        this.#updateTransformDOMElements();
    }

    #updateTransformDOMElements() {
        translateEntryX.value = this.#object.position.x;
        translateEntryY.value = this.#object.position.y;
        translateEntryZ.value = -this.#object.position.z;

        rotateEntryX.value = (this.#object.rotation.x * 180 / Math.PI).toFixed(4);
        rotateEntryY.value = (this.#object.rotation.y * 180 / Math.PI).toFixed(4);
        rotateEntryZ.value = (this.#object.rotation.z * 180 / Math.PI).toFixed(4);

        scaleEntryX.value = this.#object.scale.x;
        scaleEntryY.value = this.#object.scale.y;
        scaleEntryZ.value = this.#object.scale.z;
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

        if(this.#objShadingMode == "wire" && 
            this.#objectGeneratedWireframe != null && 
            this.#useObjectGeneratedWireframe)
        {
            camera.layers.disable(ProbeScene.STANDARD_OBJECT_LAYER);
            camera.layers.enable(ProbeScene.DETRIANGULATED_WIREFRAME_LAYER);
        }
        else {
            camera.layers.enable(ProbeScene.STANDARD_OBJECT_LAYER);
            camera.layers.disable(ProbeScene.DETRIANGULATED_WIREFRAME_LAYER);
        }
    }

    #getDistortedObject() {
        const distortedObj = new THREE.Object3D();

        this.#object.traverse((descendant) => {
            if(descendant instanceof THREE.Mesh || 
                descendant instanceof THREE.Line)
            {
                const childCopy = deepCopyMeshOrLine(descendant, true);
                
                this.#frustum.applyFrustumDistortionToObject(childCopy);

                childCopy.position.set(0,0,0);
                childCopy.name += "_Distorted";
                distortedObj.add(childCopy); 
            }
        });

        distortedObj.name = "DistortedObject"
        distortedObj.position.set(0,0,0);
        distortedObj.rotation.set(0,0,0,"XYZ");
        distortedObj.scale.set(1,1,1);

        return distortedObj;
    }

    #removeDistortedObject(obj) {
        obj.traverse((descendant) => {
            if(descendant.geometry)
            {
                descendant.geometry.dispose();
            }
        });

        obj.clear();
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

            // Update axes position in distorted space
            let imageAxesVisible = this.#imageSpaceSceneAxes.getVisible();
            if(imageAxesVisible) {
                if(this.#frustum.isTransitioning() && 
                    this.#frustum.getDistortMode() == Frustum.DISTORT_MODE_KEEP_NEAR_CONSTANT){
                    this.#imageSpaceSceneAxes.setVisible(false);
                }
                else{
                    const newPos = this.#frustum.getImageAxesPosition();
                    this.#imageSpaceSceneAxes.setPosition(newPos); 
                }   
            }

            // if(this.#imageSpaceSceneAxes.getVisible()) {
            //     const newPos = this.#frustum.getImageAxesPosition();
            //     this.#imageSpaceSceneAxes.setPosition(newPos);
            // }

            renderer.clippingPlanes = this.#frustum.generateFrustumClippingPlanes();

            renderer.render(this.#imageSpaceScene, camera);
    
            // Reset visibility in case it was hidden for transition
            this.#imageSpaceSceneAxes.setVisible(imageAxesVisible);

            this.#imageSpaceScene.remove(distortedObj);

            if(showFrustum) {
                this.#frustum.removeDistortedFrustumFromScene(this.#imageSpaceScene);
            }

            renderer.clippingPlanes = [];

            this.#removeDistortedObject(distortedObj);
        }

        if(this.#gumballView == viewIndex)
            this.#gumball.visible = false;
    }
}

function initSceneLights(scene) {

    // Create First Front-Side Directional Light
    const dirLightFront1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLightFront1.position.set(1,1,3);

     // Create Second Front-Side Directional Light
     const dirLightFront2 = new THREE.DirectionalLight(0xffffff, 1.2);
     dirLightFront2.position.set(-1,1,3);

    // Create First Back-Side Directional Light
    const dirLightBack1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLightBack1.position.set(2,1,-1);

    // Create Second Back-Side Directional Light
    const dirLightBack2 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLightBack2.position.set(-2,1,-1);

    // Create Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Soft white light

    // Add Directional Lights to scene
    scene.add(dirLightFront1);
    scene.add(dirLightFront2);

    scene.add(dirLightBack1);
    scene.add(dirLightBack2);

    scene.add(ambientLight);
}

raycaster.layers.enable(ProbeScene.STANDARD_OBJECT_LAYER);


