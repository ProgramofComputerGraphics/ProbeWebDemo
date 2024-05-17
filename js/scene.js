import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { generateRealFrustumSideLines,
         generateImageFrustumSideLines, 
         generateImageFrustumNearLines,
         generateImageFrustumFarLines } from './frustum.js';


const defaultGeo = new THREE.BoxGeometry(1,1,1);
const loader = new OBJLoader();

let globalBoolean = true;

export class ProbeScene {
    #viewManager;
    
    #object;
    #objMaterial;
    #objShadingMode

    #frustumFOV;
    #frustumNear;
    #frustumFar;

    #gumball;
    
    constructor(viewManagerArg) {
        // Set global variables    
        this.#viewManager = viewManagerArg;

        this.#object = null;
        this.#objMaterial = new THREE.MeshStandardMaterial({color : 0xffffff,
                                                            flatShading : true});
        this.#objShadingMode = "flat";

        this.#frustumFOV = 45;
        this.#frustumNear = 1;
        this.#frustumFar = 10;

        this.#gumball = null;

        // The scene is implemented as two separate scenes:
        //  - One is the undistorted "real world" scene, it contains the truncated pyramid frustum
        //  - One is the distorted "imagespace" scene, it contains the half-cube NDC camera extents
        // 
        // When rendering the scene, the user species whether they want the camera distortion to be
        // applied. If not, the "real world" scene is rendered. If not, the "imagespace" scene is
        // rendered.

        // The real-world scene variable
        this.realScene = null;
        // The image-space scene variable
        this.imageSpaceScene = null;

        // Initialize the two scenes
        this.#initRealWorldScene();
        this.#initImagespaceScene();

        this.#makeDefaultCube();

    }

    #initRealWorldScene() {
        this.realScene = new THREE.Scene();
        
        // TODO: Add Pyramid Frustum Objects

        // Create the group representing all the real frustum objects
        this.realFrustumGroup = new THREE.Group();

        // Create the frustum line geometry & add it to the group
        this.realFrustumGroup.add(generateRealFrustumSideLines(this.#frustumFOV, 
                                                               this.#frustumFar));

        // Add the frustum object group to the real scene
        this.realScene.add(this.realFrustumGroup);
    
        initSceneLights(this.realScene);
    }

    #initImagespaceScene() {
        this.imageSpaceScene = new THREE.Scene();

        // TODO: Add Half-Cube Camera Extents Objects 
        
        // Create the group representing all the image frustum objects
        this.imageFrustumGroup = new THREE.Group();

        // Create the frustum line geometry & add it to the group
        this.imageFrustumGroup.add(generateImageFrustumSideLines());
        this.imageFrustumGroup.add(generateImageFrustumNearLines());
        this.imageFrustumGroup.add(generateImageFrustumFarLines());

        // Add the frustum object group to the image space scene
        this.imageSpaceScene.add(this.imageFrustumGroup);

        initSceneLights(this.imageSpaceScene);
    }

    #updateFrustumGeometries() {
        // Clear the frustum groups
        this.realFrustumGroup.clear();

        // Regenerate the real frustum pyramid lines
        this.realFrustumGroup.add(generateRealFrustumSideLines(this.#frustumFOV, 
                                                                this.#frustumFar));
    }

    #changeSceneObject(newObject) {
        if(this.#object != null) {
            this.#object.clear();
            this.realScene.remove(this.#object);
        }
    
        this.#object = newObject;
        this.realScene.add(this.#object);
    }

    #makeDefaultCube() {
        this.#changeSceneObject(new THREE.Mesh(defaultGeo, this.#objMaterial));
    
        this.#object.position.z = 2.5;
    }

    #attachTransformControlsToObject() { 
        // if(this._gumball != null) {
        //     this.realScene.remove(this._gumball)
        //     this._gumball.dispose();
        // }
    
        // const camera = this._viewManager.getViewCamera(this._transformControlsView);
        
        // this._gumball = new TransformControls(camera, 
        //                                 this._renderDomElement);
    
        // this._gumball.addEventListener('dragging-changed', function(event){
        //     this.viewManager.setViewControlsEnabled(this.transformControlsView, 
        //                                             !event.value);
    
        //     console.log("Controls Set To:", !event.value);
        // });
    
        // this._gumball.attach(this._object);

        // this.realScene.add(this._gumball);
    }
    
    #addLoadedObjectToScene(loadedObject) {
        // Swap object to the newly loaded object
        this.#changeSceneObject(loadedObject);
    
        // Change materials on loaded object to the scene material
        this.#object.children.forEach(function(mesh) {
            try {
                mesh.material = this.material;
            }
            catch(error)
            {
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

    getFOV() {
        return this.#frustumFOV;
    }

    setFOV(fov) {
        this.#frustumFOV = fov;
        this.#updateFrustumGeometries();
    }

    getNearPlane() {
        return this.#frustumNear;
    }

    setNearPlane(near) {
        this.#frustumNear = near;
    }

    getFarPlane() {
        return this.#frustumFar;
    }

    setFarPlane(far) {
        this.#frustumFar = far;
    }

    setShadingMode(mode) {    
        switch(mode) {
            case "wire":
                this.#objMaterial.wireframe = true;
                this.#objMaterial.flatShading = false;
                this.#objMaterial.emissive = this.#objMaterial.color;
                break;
            case "flat":
                this.#objMaterial.wireframe = false;
                this.#objMaterial.flatShading = true;
                this.#objMaterial.emissive = new THREE.Color(0x000000);
                break;
            case "smooth":
                this.#objMaterial.wireframe = false;
                this.#objMaterial.flatShading = false;
                this.#objMaterial.emissive = new THREE.Color(0x000000);
                break;
        }

        this.#objShadingMode = mode;
        this.#objMaterial.needsUpdate = true;
    }

    setObjectColor(color) {
        this.#objMaterial.color = new THREE.Color(color);
        if(this.#objShadingMode == "wire") {
            this.#objMaterial.emissive = new THREE.Color(color);
        }
        this.#objMaterial.needsUpdate = true;
    }

    // Modified from Stack Overflow Response: 
    // https://discourse.threejs.org/t/transform-individual-vertices-from-position-frombufferattribute/44898
    #applyFrustumDistortionToObject(obj, camera) {
        const positionAttribute = obj.geometry.getAttribute("position");
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);

            vertex.applyMatrix4(obj.matrixWorld);
            vertex.applyMatrix4(camera.matrixWorldInverse);
            vertex.applyMatrix4(camera.projectionMatrix);

            // Set position to vertex
            positionAttribute.setXYZ(i, vertex.x, vertex.y, (vertex.z + 1)/2); 
        }

        const indices = obj.geometry.index.array;
        for (let i = 0; i < indices.length; i+=3) {
            let x = indices[i];
            indices[i] = indices[i + 2];
            indices[i+2] = x;
        }

        if(globalBoolean)
            globalBoolean = false;

        obj.geometry.attributes.position.needsUpdate = true;
    }

    #getDistortedObject() {
        const frustumCamera = new THREE.PerspectiveCamera(this.#frustumFOV, 
            1,
            this.#frustumNear,
            this.#frustumFar);

        frustumCamera.position.set(0,0,0);
        frustumCamera.lookAt(0,0,1); 
        frustumCamera.updateMatrixWorld();  

        var distortedObj;
        if(this.#object instanceof THREE.Mesh || 
            this.#object instanceof THREE.Line) 
        {
            distortedObj = deepCopyMeshOrLine(this.#object);
            this.#applyFrustumDistortionToObject(distortedObj, 
                                                frustumCamera);
        }
        else { 
            distortedObj = new THREE.Object3D();
            
            for(let i = 0; i < this.#object.children.length; ++i) {
                if(this.#object.children[i] instanceof THREE.Mesh || 
                    this.#object.children[i] instanceof THREE.Line)
                {
                    const childCopy = deepCopyMeshOrLine(this.#object.children[i]);
                    
                    this.#applyFrustumDistortionToObject(childCopy, 
                                                        frustumCamera);

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

        return distortedObj;
    }

    renderScene(renderer, camera, showFrustum, imagespace)
    {
        // If rendering the scene without distortion, simply render and return 
        if(!imagespace) {
            this.realFrustumGroup.visible = showFrustum;
            renderer.render(this.realScene, camera);
            return;
        }

        const distortedObj = this.#getDistortedObject();

        this.imageSpaceScene.add(distortedObj);

        this.imageFrustumGroup.visible = showFrustum;

        renderer.render(this.imageSpaceScene, camera);
        this.imageSpaceScene.remove(distortedObj);
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



function deepCopyMeshOrLine(meshOrLine) {
    const distortedObj = meshOrLine.clone(true);
    distortedObj.geometry = meshOrLine.geometry.clone();
    return distortedObj;
}


