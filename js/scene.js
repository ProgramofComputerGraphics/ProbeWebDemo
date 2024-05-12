import * as THREE from 'three';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// The scene is implemented as two separate scenes:
//  - One is the undistorted "real world" scene, it contains the truncated pyramid frustum
//  - One is the distorted "imagespace" scene, it contains the half-cube NDC camera extents
// 
// When rendering the scene, the user species whether they want the camera distortion to be
// applied. If not, the "real world" scene is rendered. If not, the "imagespace" scene is
// rendered.

// The real-world scene variable
var realScene;
var imageSpaceScene;

var object;
var material;

var renderDomElement;

const defaultGeo = new THREE.BoxGeometry(1,1,1);
const loader = new OBJLoader();

export function initScene(domElement) {
    // Initialize scene
    initRealWorldScene();
    initImagespaceScene();

    makeDefaultCube();

    material = new THREE.MeshBasicMaterial({color : 0xe00000});

    renderDomElement = domElement;
}

function initRealWorldScene() {
    realScene = new THREE.Scene();
    
    // TODO: Add Pyramid Frustum Objects

    initSceneLights(realScene);
}

function initImagespaceScene() {
    imageSpaceScene = new THREE.Scene();

    // TODO: Add Half-Cube Camera Extents Objects 

    initSceneLights(imageSpaceScene);
}

function initSceneLights(scene) {

    // Create First Downwards-Facing Directional Light
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight1.position.x = -1;
    dirLight1.position.y = 1;
    dirLight1.position.z = 1;

    // Create Second Downwards-Facing Directional Light
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.x = 1;
    dirLight2.position.y = 1;
    dirLight2.position.z = -1;

    // Create Upwards-Facing Directional Light
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.1);
    dirLight3.position.x = 0;
    dirLight3.position.y = -1;
    dirLight3.position.z = 0;

    // Add Directional Lights to scene
    scene.add(dirLight1);
    scene.add(dirLight2);
    scene.add(dirLight3);
}

function changeSceneObject(newObject) {
    realScene.remove(object);
    imageSpaceScene.remove(object);

    object = newObject;
    
    imageSpaceScene.add(object);
    realScene.add(object);
}

function makeDefaultCube() {
    changeSceneObject(new THREE.Mesh(defaultGeo, material));

    object.position.z = 5;
}

function addLoadedObjectToScene(loadedObject) {
    // Swap object to the newly loaded object
    changeSceneObject(loadedObject);

    // Change materials on loaded object to the scene material
    object.children.forEach(function(mesh) {
        try {
            mesh.material = material;
        }
        catch(error)
        {
            console.log("Non-mesh element loaded from OBJ; scene material cannot be applied!");
        }
    });
}

export function loadObjectAtPath(objectPath)
{
    // Immediately fail for malformed paths
    if(objectPath != null && objectPath != "")
    {  
        console.log("Object Loading Failed: Null or Empty Path Provided!");
        return;
    }

    loader.load(
        objectPath,
        addLoadedObjectToScene,
        // called when loading is in progresses
        function(xhr) {

            console.log((xhr.loaded / xhr.total * 100) + "% loaded");

        },
        // called when loading has errors
        function(error) {

            console.log("Object Loading Failed:", error);

            makeDefaultCube();
        }
    );
    
}

export function renderScene(renderer, camera, applyPerspectiveDistortion, disortionCamera)
{
    // If rendering the scene without distortion, simply render and return 
    if(!applyPerspectiveDistortion) {
        renderer.render(realScene, camera);
        // console.log(realScene, camera);
        return;
    }

    // If rendering the scene with distortion, need to distort the geometry, render, and then undistort the geometry
    const projMatrix = disortionCamera.projectionMatrix;
    const inverseProjMatrix = disortionCamera.projectionMatrixInverse;

    // object.applyMatrix4(projMatrix);

    renderer.render(imageSpaceScene, camera);

    // object.applyMatrix4(inverseProjMatrix);
}