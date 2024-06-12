import * as THREE from "three";

import { readFile} from "./file.js";
import { pointInRectangle } from "./utils.js";
import { setTestBoolean } from "./frustum.js";

const LMB = 0;
const MMB = 1;
const RMB = 2;

const DRAG_DELTA_THRESHOLD_SQ = 20;

export class InputManager {
    #probeScene;
    #viewManager;
    #cameraViewIndex;

    #mouseDownEvents;
    #mouseDownViews;
    #mouseDownPositions;
    #mouseDownObjects;

    #currentMousePosition;

    #gumballActive;

    #keyDownEvents;

    constructor(probeScene, viewManager, cameraViewIndex) {
        // Initialize instance variables
        this.#mouseDownEvents = {}; // Stores the mouse buttons that are currently pressed
        this.#mouseDownViews = {}; // Stores the index of the view that was hovered when each active mouse button was pressed
        this.#mouseDownPositions = {}; // Stores the mouse positions within the view that was hovered when each active mouse button was pressed
        this.#mouseDownObjects = {}; // Stores the objects that were beneath the pointer when each active mouse button was pressed

        this.#currentMousePosition = new THREE.Vector2(0,0);

        this.gumballActive = false;

        this.#probeScene = probeScene;
        this.#viewManager = viewManager;
        this.#cameraViewIndex = cameraViewIndex;

        this.#keyDownEvents = {};

        // Set up window callbacks
        window.addEventListener("mousedown", (event) => { this.mouseDown(event) });
        window.addEventListener("mouseup", (event) => { this.mouseUp(event) });
        window.addEventListener("keydown", (event) => { this.keyDown(event) });
        window.addEventListener("keyup", (event) => { this.keyUp(event) });

        window.addEventListener("mousemove", (event) => {
            this.#currentMousePosition.x = event.clientX;
            this.#currentMousePosition.y = event.clientY;
        });

        // Drag and drop support for the entire webpage
        window.addEventListener('dragover', (event) => {
            event.preventDefault();
        });

        window.addEventListener("drop", async (event) => {
            event.preventDefault();
            
            const file = event.dataTransfer.files[0];
            if (file) {
                const fileText = await readFile(file);
                probeScene.loadObjectFromText(fileText);
            }
        });
    }

    #checkIfAncestor(potentialAncestor, object) {
        // If the object is not an Object3D, return null immediately 
        // as it is an invalid input
        if(!(object instanceof THREE.Object3D)) {
            return null;
        }

        let currentObj = object;

        // Traverse up the scene hierarchy looking for a clickable object
        while(!(currentObj == potentialAncestor)) {
            // If we reach the scene root, return null
            if(currentObj.parent == null) {
                return null;
            }

            // Traverse up one level of the hierarchy
            currentObj = currentObj.parent;
        }

        // Found a clickable object, so return it
        return currentObj;
    }

    #findClickableAncestor(object) {
        // If the object is not an Object3D, return null immediately 
        // as it is an invalid input
        if(!(object instanceof THREE.Object3D)) {
            return null;
        }

        let currentObj = object;

        // Traverse up the scene hierarchy looking for a clickable object
        while(!currentObj.userData.clickable) {           
            // If we reach the scene root, return null
            if(currentObj.parent == null) {
                return null;
            }

            // Traverse up one level of the hierarchy
            currentObj = currentObj.parent;
        }

        // Found a clickable object, so return it
        return currentObj;
    }

    #getFirstHoveredObject(pointer, camera, imagespace, clickLines){
        // Raycast into scene
        const intersects = this.#probeScene.raycastScene(pointer, 
                                                        camera, 
                                                        imagespace);

        if(intersects.length == 0) {
            return;
        }

        // Discard invalid intersections using "clickable" property
        while(intersects.length > 0) {
            // Get closest intersection
            const closestIntersection = intersects.shift();

            // Skip any non-objects
            if(!(closestIntersection.object instanceof THREE.Object3D)) {  
                continue;
            }

            // Skip any line objects if clickLines argument is false
            if(closestIntersection.object instanceof THREE.Line && !clickLines) {
                continue;
            }
            
            const clickableObj = this.#findClickableAncestor(closestIntersection.object);
            
            if(clickableObj == null) {
                continue;
            }

            return clickableObj;
        }  

    }

    #checkIfObjectIsHovered(pointer, camera, imagespace, object){
        // Raycast into scene
        const intersects = this.#probeScene.raycastScene(pointer, 
                                                        camera, 
                                                        imagespace);

        // Check if intersected objects are children of the target object
        for(let i = 0; i < intersects.length; ++i) {
            if(this.#checkIfAncestor(object, intersects[i].object))
                return true;
        }

        // If none of the intersected objects are children of the taget, return false
        return false;
    }

    #checkIfMouseIsInControls(mousePos) {
        const controlsElement = document.getElementById("controlsSection");
        const controlsRect = controlsElement.getBoundingClientRect();
        
        return pointInRectangle(mousePos, controlsRect);
    }

    mouseDown(mouseEvent) {
        // Get relevant mouse event details
        const mousePos = new THREE.Vector2(mouseEvent.clientX, mouseEvent.clientY);
        const mouseButton = mouseEvent.button;

        // Get hovered view
        const viewIndex = this.#viewManager.getHoveredView(mousePos);
        const viewData = this.#viewManager.getViewData()[viewIndex];

        if(viewIndex == -1) {
            // Update state variables
            this.#mouseDownEvents[mouseButton] = mouseEvent;
            this.#mouseDownViews[mouseButton] = viewIndex;
            return;
        }

        // Get normalized mouse position within view
        const pointer = this.#viewManager.normalizePointerToView(mousePos, viewIndex);

        // Get hovered object
        const object = this.#getFirstHoveredObject(pointer, viewData.camera, 
                                                    viewData.imagespace,
                                                    viewData.clickLines);

        // Update state variables
        this.#mouseDownEvents[mouseButton] = mouseEvent;
        this.#mouseDownViews[mouseButton] = viewIndex;
        this.#mouseDownPositions[mouseButton] = pointer;
        this.#mouseDownObjects[mouseButton] = object;
    }

    #clearMouseEvent(mouseButton) {
        delete this.#mouseDownEvents[mouseButton];
        delete this.#mouseDownViews[mouseButton];
        delete this.#mouseDownPositions[mouseButton];
        delete this.#mouseDownObjects[mouseButton];
    }

    mouseUp(mouseEvent) {
        // Get relevant mouse event details
        const mousePos = new THREE.Vector2(mouseEvent.clientX, mouseEvent.clientY);
        const mouseButton = mouseEvent.button;

        if(this.#checkIfMouseIsInControls(mousePos)) {
            this.#clearMouseEvent(mouseButton);
            return;
        }

        // Get hovered view
        const viewIndex = this.#viewManager.getHoveredView(mousePos);
        const viewData = this.#viewManager.getViewData()[viewIndex];

        // Get the mouse down event corresponding to this mouse-up event
        const mouseDownEvent = this.#mouseDownEvents[mouseButton];

        // If the mouse down event cannot be found, end mouse up early
        if(mouseDownEvent == null) {
            this.#gumballActive = false;
            this.#clearMouseEvent(mouseButton);
            return;
        }

        // Compute mouse displacement
        const mouseDelta = new THREE.Vector2(mousePos.x - mouseDownEvent.clientX,
                                            mousePos.y - mouseDownEvent.clientY);

        switch(mouseButton){
            case LMB:
                // If the gumball was actively used during this mouse press, or if the mouse was 
                // dragged a large enough distance, keep the gumball active and return early
                if(this.#gumballActive || mouseDelta.lengthSq() >= DRAG_DELTA_THRESHOLD_SQ) {
                    this.#gumballActive = false;
                    this.#clearMouseEvent(mouseButton);
                    return;
                }

                // If the current view isn't the same as the mouse down view, 
                // no object should be clicked
                if(viewIndex != this.#mouseDownViews[mouseButton] || viewIndex == -1) {
                    this.#probeScene.clearGumball();
                    this.#clearMouseEvent(mouseButton);
                    return;
                }

                // Get normalized mouse position within view
                const pointer = this.#viewManager.normalizePointerToView(mousePos, viewIndex);

                // If the object clicked on mouse down is no longer hovered,
                // no object should be clicked
                if(!this.#checkIfObjectIsHovered(pointer, viewData.camera, viewData.imagespace, 
                                                this.#mouseDownObjects[mouseButton])) {
                    this.#probeScene.clearGumball();
                    this.#clearMouseEvent(mouseButton);
                    return;
                }

                // If the gumball is active but not in the view that was clicked,
                // clear the gumball 
                if(viewIndex != -1 && viewIndex != this.#probeScene.getGumballView()) {
                    this.#probeScene.clearGumball();
                }

                // Click the object in the scene, then fall into default case
                const cameraViewCamera = this.#viewManager.getViewCamera(this.#cameraViewIndex);
                const gumball = this.#probeScene.clickObject(this.#mouseDownObjects[mouseButton], 
                                                            viewData, viewIndex,cameraViewCamera);

                if(gumball != null) {
                    gumball.addEventListener("mouseDown", (_) => {
                        this.#gumballActive = true;
                    });
                }
                
                this.#gumballActive = false;
            
            default:
                this.#clearMouseEvent(mouseButton);
                break;
        }

        // Update state variables
        this.#clearMouseEvent(mouseButton);
    }

    keyDown(keyEvent) {
        const key = keyEvent.key;

        switch(key){
            case "Shift":
                this.#probeScene.setGumballSnap(true);
                break;
        }

        // Update state variable
        this.#keyDownEvents[key] = keyEvent;
    }

    keyUp(keyEvent) {
        const key = keyEvent.key;

        const translateButton = document.getElementById("translateButton");
        const rotateButton = document.getElementById("rotateButton");
        const scaleButton = document.getElementById("scaleButton");

        switch(key){
            case "q":
                this.#probeScene.resetObjectTransform();
                break;
            case "w":
                this.#probeScene.setGumballMode("translate");
                translateButton.className = "transform-button-clicked";
                rotateButton.className = "transform-button";
                scaleButton.className = "transform-button";
                break;
            case "e":
                this.#probeScene.setGumballMode("rotate");
                translateButton.className = "transform-button";
                rotateButton.className = "transform-button-clicked";
                scaleButton.className = "transform-button";
                break;
            case "r":
                this.#probeScene.setGumballMode("scale");
                translateButton.className = "transform-button";
                rotateButton.className = "transform-button";
                scaleButton.className = "transform-button-clicked";
                break;
            case "Shift":
                this.#probeScene.setGumballSnap(false);
                break;
            case "c":
                // The effect of this function is to pan the camera such that the
                // frustum is now centered in the view

                // Store necessary data/objects in local variables
                const viewIndex = this.#viewManager.getHoveredView(this.#currentMousePosition);
                const viewData = this.#viewManager.getViewData()[viewIndex];
                const cam = viewData.camera;
                const camControls = viewData.cameraControls;

                // Break early if camera controls are not defined for the given view
                if(!camControls)
                    break;

                // Compute reset z position based on current frustum/whether the view
                // shows the real scene or the imagespace scene
                let targetZ;
                if(viewData.imagespace)
                    targetZ = -0.5;
                else
                    targetZ = -this.#probeScene.getFarPlane()/2;

                // Create the vector for the new camera target
                const target = new THREE.Vector3(0,0,targetZ);

                // Compute the camera's current displacement from the target
                const disp = new THREE.Vector3().subVectors(cam.position, target);

                // Get the camera's forward vector
                const lookAtVector = new THREE.Vector3(0,0,-1);
                lookAtVector.applyQuaternion(cam.quaternion).normalize();

                // Compute the length of the camera displacement's projection
                // onto the camera's forward vector
                const projDisp = disp.dot(lookAtVector);
                
                // Set the new position to the projected displacement vector
                // added to the target
                const newPos = new THREE.Vector3().addVectors(
                    lookAtVector.multiplyScalar(projDisp),
                    target
                );

                // Set the camera/camera control position/target variables 
                cam.position.copy(newPos);
                cam.lookAt(target);
                camControls.target = target;
                camControls.update();
                break;
            case " ":
                setTestBoolean(true);
                break;
            default:
                console.log("\'" + key + "\' Pressed!");
                break;
        }
        
        // Update state variable
        delete this.#keyDownEvents[key];
    }
}