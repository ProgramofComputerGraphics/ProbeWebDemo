import * as THREE from "three";

const LMB = 0;
const MMB = 1;
const RMB = 2;

export class InputManager {
    #probeScene;
    #viewManager;

    #mouseDownEvents;
    #mouseDownViews;
    #mouseDownPositions;
    #mouseDownObjects;

    #gumballActive;

    #keyDownEvents;

    constructor(probeScene, viewManager) {
        // Initialize instance variables
        this.#mouseDownEvents = {}; // Stores the mouse buttons that are currently pressed
        this.#mouseDownViews = {}; // Stores the index of the view that was hovered when each active mouse button was pressed
        this.#mouseDownPositions = {}; // Stores the mouse positions within the view that was hovered when each active mouse button was pressed
        this.#mouseDownObjects = {}; // Stores the objects that were beneath the pointer when each active mouse button was pressed

        this.gumballActive = false;

        this.#probeScene = probeScene;
        this.#viewManager = viewManager;

        this.#keyDownEvents = {};

        // Set up window callbacks
        window.addEventListener("mousedown", (event) => { this.mouseDown(event) });
        window.addEventListener("mouseup", (event) => { this.mouseUp(event) });
        window.addEventListener("keydown", (event) => { this.keyDown(event) });
        window.addEventListener("keyup", (event) => { this.keyUp(event) });
    }

    #getFirstHoveredObject(pointer, camera, imagespace){
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

            if(!(closestIntersection.object instanceof THREE.Object3D)) { 
                continue;
            }
            
            if(!closestIntersection.object.userData.clickable) {
                continue;
            }

            return closestIntersection.object;
        }  

    }

    #checkIfObjectIsHovered(pointer, camera, imagespace, object){
        // Raycast into scene
        const intersects = this.#probeScene.raycastScene(pointer, 
                                                        camera, 
                                                        imagespace);

        for(let i = 0; i < intersects.length; ++i) {
            if(intersects[i].object == object)
                return true;
        }

        return false;
    }

    mouseDown(mouseEvent) {
        // Get raw mouse position within client
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
        const object = this.#getFirstHoveredObject(pointer, viewData.camera, viewData.imagespace);

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
        // Get raw mouse position within client
        const mousePos = new THREE.Vector2(mouseEvent.clientX, mouseEvent.clientY);
        const mouseButton = mouseEvent.button;

        // Get hovered view
        const viewIndex = this.#viewManager.getHoveredView(mousePos);
        const viewData = this.#viewManager.getViewData()[viewIndex];

        switch(mouseButton){
            case LMB:
                if(this.#gumballActive) {
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

                // Click the object in the scene, then fall into default case
                const gumball = this.#probeScene.clickObject(this.#mouseDownObjects[mouseButton], 
                                                            viewData, viewIndex);

                gumball.addEventListener("mouseDown", (_) => {
                    this.#gumballActive = true;
                });

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

        // Update state variable
        this.#keyDownEvents[key] = keyEvent;
    }

    keyUp(keyEvent) {
        const key = keyEvent.key;

        switch(key){
            case "q":
                this.#probeScene.resetObjectTransform();
                break;
            case "w":
                this.#probeScene.setGumballMode("translate");
                break;
            case "e":
                this.#probeScene.setGumballMode("rotate");
                break;
            case "r":
                this.#probeScene.setGumballMode("scale");
                break;
        }
        
        // Update state variable
        delete this.#keyDownEvents[key];
    }
}