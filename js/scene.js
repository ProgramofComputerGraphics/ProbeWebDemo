import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { generateRealFrustumSideLines,
         generateRealFrustumTipLines,
         generateImageFrustumSideLines, 
         generateImageFrustumNearLines,
         generateImageFrustumFarLines } from './frustum.js';


const defaultGeo = new THREE.BoxGeometry(1,1,1);
const loader = new OBJLoader();

const raycaster = new THREE.Raycaster();

const flipX = new THREE.Matrix4();
flipX.set( -1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1 );

export class ProbeScene {
    #object;
    #objMaterial;
    #objShadingMode

    #frustumFOV;
    #frustumNear;
    #frustumFar;

    #gumball;
    #gumballView;
    
    constructor() {
        // Set global variables    
        this.#object = null;
        this.#objMaterial = new THREE.MeshStandardMaterial({color : 0xffffff,
                                                            metalness : 0,
                                                            roughness : 1,
                                                            envMapIntensity : 0,
                                                            lightMapIntensity: 0,
                                                            flatShading : true});
        this.#objShadingMode = "flat";

        this.#frustumFOV = 45;
        this.#frustumNear = 1;
        this.#frustumFar = 10;

        this.#gumball = null;
        this.#gumballView = -1;

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

        // Create the group representing the real frustum objects (excluding the tip)
        this.realFrustumGroup = new THREE.Group();

        // Create the frustum side line geometry & add it to the group
        this.realFrustumGroup.add(generateRealFrustumSideLines(this.#frustumFOV,
                                                               this.#frustumNear, 
                                                               this.#frustumFar));

        // Create the frustum tip group
        // NOTE: This is kept separate from main frustum group as it cannot be
        // transformed into image space, and it is not used for parallel projection
        // mode.
        this.realFrustumTipGroup = new THREE.Group();

        // Create the frustum tip line geometry and add it to the frustum tip group
        this.realFrustumTipGroup.add(generateRealFrustumTipLines(this.#frustumFOV,
                                                                 this.#frustumNear));

        // Add the frustum object groups to the real scene
        this.realScene.add(this.realFrustumGroup);
        this.realScene.add(this.realFrustumTipGroup);
    
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
        this.realFrustumTipGroup.clear();

        // Regenerate the real frustum pyramid lines
        this.realFrustumGroup.add(generateRealFrustumSideLines(this.#frustumFOV,
                                                                this.#frustumNear, 
                                                                this.#frustumFar));

        this.realFrustumTipGroup.add(generateRealFrustumTipLines(this.#frustumFOV,
                                                                 this.#frustumNear));
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
            vertex.applyMatrix4(flipX);

            // Set position to vertex
            positionAttribute.setXYZ(i, vertex.x, vertex.y, (vertex.z + 1)/2); 
        }

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

    raycastScene(screenCoords, camera, imagespace) {
        raycaster.setFromCamera(screenCoords, camera);

        if(!imagespace) {
            return raycaster.intersectObjects(this.realScene.children);
        }
        else {
            return raycaster.intersectObjects(this.imageSpaceScene.children);
        }
    }

    #createGumball(view, viewIndex) { 
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
        this.#gumball.attach(this.#object);

        // Add gumball to scene
        this.realScene.add(this.#gumball);

        // Set gumball to invisible - it is made visible for the specific
        // view during rendering
        this.#gumball.visible = false;

        // Set gumball view variable
        this.#gumballView = viewIndex;
    }

    #destroyGumball() {
        // Remove gumball from scene
        this.realScene.remove(this.#gumball);

        // Call dispose on gumball
        this.#gumball.dispose();

        // Reset gumball instance variable
        this.#gumball = null;

        // Reset gumball view variable
        this.#gumballView = -1;
    }

    clickScene(screenCoords, view, viewIndex) {
        // Destroy existing gumball if the clicked view is different 
        // than the gumball's view
        if(this.#gumball != null &&
            viewIndex != this.#gumballView) {
            this.#destroyGumball();
        }

        // Check if view is allowed to have a gumball. Return early if not.
        if(!view.gumball)
            return;

        const intersects = this.raycastScene(screenCoords, 
                                            view.camera, 
                                            view.imagespace);

        // Case 1: Gumball is currently null
        if(this.#gumball == null)
        {
            // If no intersections, return early
            if(intersects.length == 0) {
                return;
            }

            // Discard invalid intersections (TODO: Improve)
            while(intersects[0].object != this.#object) {
                intersects.shift();

                if(intersects.length == 0) {
                    return;
                }
            }  

            this.#createGumball(view, viewIndex);
        }
        // Case 2: Gumball is currently active
        else {
            // If no intersections, return early
            if(intersects.length == 0) {
                this.#destroyGumball();
                return;
            }

            // Iterate through intersections (TODO: Improve)
            while(intersects[0].object != this.#object) {
                
                const result = intersects.shift();
                  
                if(result.object instanceof THREE.Mesh &&
                    result.object.type != "TransformControlsPlane") {
                        return;
                }

                if(intersects.length == 0) {
                    this.#destroyGumball();
                    return;
                }
            }
        }
    }

    renderScene(viewIndex, renderer, camera, showFrustum, imagespace)
    {
        if(this.#gumballView == viewIndex)
            this.#gumball.visible = true;

        // If rendering the scene without distortion, simply render and return 
        if(!imagespace) {
            this.realFrustumGroup.visible = showFrustum;
            renderer.render(this.realScene, camera);
        }
        else {
            const distortedObj = this.#getDistortedObject();
            this.imageSpaceScene.add(distortedObj);
    
            this.imageFrustumGroup.visible = showFrustum;
    
            renderer.render(this.imageSpaceScene, camera);
    
            this.imageSpaceScene.remove(distortedObj);
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



function deepCopyMeshOrLine(meshOrLine) {
    const distortedObj = meshOrLine.clone(true);
    distortedObj.geometry = meshOrLine.geometry.clone();
    return distortedObj;
}


