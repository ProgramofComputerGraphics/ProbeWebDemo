import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { flipZ } from './math_utils.js';
import { ViewManager } from './views.js';


const defaultGeo = new THREE.BoxGeometry(1,1,1);
const loader = new OBJLoader();

export class ProbeScene {
    constructor(transformCntrlsView, viewManagerArg, domElement) {
        // Set global variables    
        this.material = new THREE.MeshStandardMaterial({color : 0xffffff});

        this.transformControlsView = transformCntrlsView;
        this.viewManager = viewManagerArg;
        this.renderDomElement = domElement;

        this.object = null;
        this.gumball = null;

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
    
        initSceneLights(this.realScene);
    }

    #initImagespaceScene() {
        this.imageSpaceScene = new THREE.Scene();
    
        // TODO: Add Half-Cube Camera Extents Objects 
    
       initSceneLights(this.imageSpaceScene);
    }

    #changeSceneObject(newObject) {
        if(this.object != null) {
            this.object.clear();
            this.realScene.remove(this.object);
        }
    
        this.object = newObject;
        this.realScene.add(this.object);
    }

    #makeDefaultCube() {
        this.#changeSceneObject(new THREE.Mesh(defaultGeo, this.material));
        this.#attachTransformControlsToObject();
    
        this.object.position.z = 5;
    }

    #attachTransformControlsToObject() { 
        if(this.gumball != null) {
            this.realScene.remove(this.gumball)
            this.gumball.dispose();
        }
    
        const camera = this.viewManager.getViewCamera(this.transformControlsView);
        
        this.gumball = new TransformControls(camera, 
                                        this.renderDomElement);
    
        this.gumball.addEventListener('dragging-changed', function(event){
            this.viewManager.setViewControlsEnabled(this.transformControlsView, 
                                                    !event.value);
    
            console.log("Controls Set To:", !event.value);
        });
    
        this.gumball.attach(this.object);

        this.realScene.add(this.gumball);
    }
    
    #addLoadedObjectToScene(loadedObject) {
        // Swap object to the newly loaded object
        this.changeSceneObject(loadedObject);
        this.attachTransformControlsToObject();
    
        // Change materials on loaded object to the scene material
        this.object.children.forEach(function(mesh) {
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

    renderScene(renderer, camera, showFrustum, disortionCamera)
    {
        // If rendering the scene without distortion, simply render and return 
        if(!disortionCamera) {
            renderer.render(this.realScene, camera);
            return;
        }

        // If rendering the scene with distortion, need to distort the geometry
        // using the scene's camera matrix
        const projMatrix = disortionCamera.projectionMatrix;

        const distortedObj = new THREE.Object3D();
        distortedObj.copy(this.object, true);
        distortedObj.applyMatrix4(projMatrix);
        distortedObj.applyMatrix4(flipZ);

        this.imageSpaceScene.add(distortedObj);
        renderer.render(this.imageSpaceScene, camera);
        this.imageSpaceScene.remove(distortedObj);
    }
}

function initSceneLights(scene) {

    // Create First Front-Side Directional Light
    const dirLightFront1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLightFront1.position.x = 1;
    dirLightFront1.position.y = 1;
    dirLightFront1.position.z = -3;

     // Create Second Front-Side Directional Light
     const dirLightFront2 = new THREE.DirectionalLight(0xffffff, 1.2);
     dirLightFront2.position.x = -1;
     dirLightFront2.position.y = 1;
     dirLightFront2.position.z = -3;

    // Create First Back-Side Directional Light
    const dirLightBack1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLightBack1.position.x = 2;
    dirLightBack1.position.y = 1;
    dirLightBack1.position.z = 1;

    // Create Second Back-Side Directional Light
    const dirLightBack2 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLightBack2.position.x = -2;
    dirLightBack2.position.y = 1;
    dirLightBack2.position.z = 1;

    // Create Underneath Directional Light
    const dirLightUnder = new THREE.DirectionalLight(0xffffff, 0.2);
    dirLightUnder.position.x = 0;
    dirLightUnder.position.y = -1;
    dirLightUnder.position.z = 0;

    // Add Directional Lights to scene
    scene.add(dirLightFront1);
    scene.add(dirLightFront2);

    scene.add(dirLightBack1);
    scene.add(dirLightBack2);
    
    scene.add(dirLightUnder);
}
