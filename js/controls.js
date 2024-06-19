import * as THREE from "three";

import { defaults } from "./defaults.js";
import { readFile } from "./file.js";

// Object Import/Export Functions

let lastFile = null;

function initResetToCubeButton(probeScene){
    const translateButton = document.getElementById("resetToCube");
    const loadObjectFileEntry = document.getElementById("loadObjectFileEntry");
    const deTriButton = document.getElementById("detriangulateWireframeButton");
    const deTriCheckboxMenu = document.getElementById("useDetriangulatedWireframeMenu");

    translateButton.addEventListener("click", () => {
        probeScene.setObjectToDefaultCube();
        
        // Clear file entry element & last file variable
        loadObjectFileEntry.value = null;
        lastFile = null;

        deTriButton.disabled = false;
        deTriCheckboxMenu.className = "hidden";
    });
}

function initLoadObjectFileEntry(probeScene) {
    const loadObjectFileEntry = document.getElementById("loadObjectFileEntry");
    const deTriButton = document.getElementById("detriangulateWireframeButton");
    const deTriCheckboxMenu = document.getElementById("useDetriangulatedWireframeMenu");

    loadObjectFileEntry.addEventListener('change', async () => {
        let fileText;

        // Get the file from the input element
        const file = loadObjectFileEntry.files[0];
        if (file && file != lastFile) {
            lastFile = file;

            // Set up a Promise to handle the file read process
            fileText = await readFile(file);

            // Call the probeScene's loadObjectFromText method with the file content
            probeScene.loadObjectFromText(fileText);

            deTriButton.disabled = false;
            deTriCheckboxMenu.className = "hidden";
        }
    });
}

function initFitLoadedObjectToFrustum(probeScene) {
    const fitToFrustumCheckbox = document.getElementById("loadObjectFitToFrustumCheckbox");

    fitToFrustumCheckbox.addEventListener("change", () => {
        probeScene.setFitLoadedObjectToFrustum(fitToFrustumCheckbox.checked);
    });

    fitToFrustumCheckbox.checked = defaults.startFitLoadedObjectToFrustum;
}

function initExportObjectButton(probeScene) {
    const exportObjectbutton = document.getElementById("exportObjectButton");
    
    exportObjectbutton.addEventListener('click', () =>{
        const objText = probeScene.saveDistortedObjectToText();

        // Create a blob from the text
        const blob = new Blob([objText], { type: 'text/plain' });

        // Create a link element
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);

        // Set the file name for the download
        a.download = 'distorted.obj';

        // Programmatically click the link to trigger the download
        a.click();

        // Release the object URL to free up memory
        URL.revokeObjectURL(a.href);
    });
}

// Frustum Control Functions

function initProjectionDropdown(probeScene, viewManager, cameraViewIndex) {
    const projectionDropdown = document.getElementById("projectionDropdown");
    const perspectiveFrustumControls = document.getElementById("perspectiveFrustumControls");
    const orthoFrustumControls = document.getElementById("orthoFrustumControls");

    const cameraViewRect = viewManager.getViewArea(cameraViewIndex);

    const aspect = cameraViewRect.width / cameraViewRect.height;
    const near = probeScene.getNearPlane();
    const far = probeScene.getFarPlane();

    let updateProjectionDropdown = (event) => {
        probeScene.setProjectionMode(projectionDropdown.value);

        let camera;

        if(projectionDropdown.value == "perspective") {
            // Swap camera for "Camera View"
            const fov = probeScene.getFOV();
            camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

            // Adjust HTML element visibility
            perspectiveFrustumControls.className = "";
            orthoFrustumControls.className = "hidden";
        }
        else if(projectionDropdown.value == "ortho") {
            // Swap camera for "Camera View"
            const halfVerticalSideLength = probeScene.getOrthoSideLength() / 2;
            const halfHorizontalSideLength = halfVerticalSideLength * aspect;
            camera = new THREE.OrthographicCamera(-halfHorizontalSideLength, 
                                                    halfHorizontalSideLength,
                                                    halfVerticalSideLength, 
                                                    -halfVerticalSideLength,
                                                    near, far);

            // Adjust HTML element visibility
            perspectiveFrustumControls.className = "hidden";
            orthoFrustumControls.className = "";
        }

        camera.lookAt(new THREE.Vector3(0,0,-1));
        viewManager.setViewCamera(cameraViewIndex, camera);
    }

    projectionDropdown.addEventListener("change", updateProjectionDropdown);
    projectionDropdown.value = defaults.startProjection;
}

function initFOVSlider(probeScene, viewManager, cameraViewIndex) {
    const fovNumber = document.getElementById("fovEntry");
    const fovSlider = document.getElementById("fovSlider");

    let updateFOV = (event) => {
        // Sync HTML elements
        if(event.srcElement.className == "standard-slider")
            fovNumber.value = fovSlider.value;
        else 
            fovSlider.value = fovNumber.value;
        
        // Update scene camera
        probeScene.setFOV(fovNumber.value); 
        
        // Update "Camera View" camera
        viewManager.getViewCamera(cameraViewIndex).fov = fovNumber.value;
    }

    fovNumber.addEventListener("change", updateFOV);
    fovSlider.addEventListener("input", updateFOV);

    fovNumber.value = defaults.startFOV;
    fovSlider.value = defaults.startFOV;
}

function initOrthoSideLength(probeScene, viewManager, cameraViewIndex) {
    const orthoSideNumber = document.getElementById("orthoSideEntry");
    const orthoSideSlider = document.getElementById("orthoSideSlider");

    let updateOrthoSideLength = (event) => {
        // Sync HTML elements
        if(event.srcElement.className == "standard-slider")
            orthoSideNumber.value = orthoSideSlider.value;
        else 
            orthoSideSlider.value = orthoSideNumber.value;
        
        // Update scene camera
        probeScene.setOrthoSideLength(orthoSideNumber.value); 

        // Update "Camera View" camera
        const camera = viewManager.getViewCamera(cameraViewIndex);
        const halfLength = orthoSideNumber.value / 2;
        const aspect = viewManager.getViewAspect(cameraViewIndex);

        camera.top = halfLength;
        camera.bottom = -halfLength;
        camera.left = -halfLength * aspect;
        camera.right = halfLength * aspect;  
    }

    orthoSideNumber.addEventListener("change", updateOrthoSideLength);
    orthoSideSlider.addEventListener("input", updateOrthoSideLength);

    orthoSideNumber.value = defaults.startOrthoSideLength;
    orthoSideSlider.value = defaults.startOrthoSideLength;
}

function initNearPlaneEntry(probeScene, viewManager, cameraViewIndex) {
    const nearEntry = document.getElementById("nearEntry");

    let updateNearPlane = (event) => {
        const near = parseFloat(nearEntry.value);

        probeScene.setNearPlane(near);
        
        const cameraViewCamera = viewManager.getViewCamera(cameraViewIndex);
        cameraViewCamera.near = near;
        cameraViewCamera.updateProjectionMatrix();
    }

    nearEntry.addEventListener("change", updateNearPlane);

    nearEntry.value = defaults.startNear;
}

function initFarPlaneEntry(probeScene, viewManager, cameraViewIndex) {
    const farEntry = document.getElementById("farEntry");

    let updateFarPlane = (event) => {
        const far = parseFloat(farEntry.value);
        
        probeScene.setFarPlane(far);
        
        const cameraViewCamera = viewManager.getViewCamera(cameraViewIndex);
        cameraViewCamera.far = far;
        cameraViewCamera.updateProjectionMatrix();
    }

    farEntry.addEventListener("change", updateFarPlane);

    farEntry.value = defaults.startFar;
}


// Transformation Functions

function initTransformResetButton(probeScene) {
    const transformResetButton = document.getElementById("transformResetButton");
    
    transformResetButton.addEventListener("click", () => {
        probeScene.resetObjectTransform();
    });
}

function initTransformWidgetButtons(probeScene, viewManager) {
    const translateButton = document.getElementById("translateButton");
    const rotateButton = document.getElementById("rotateButton");
    const scaleButton = document.getElementById("scaleButton");

    let setGumballModeToTranslate = (event) => {
        translateButton.className = "transform-button-clicked";
        rotateButton.className = "transform-button";
        scaleButton.className = "transform-button";

        probeScene.setGumballMode("translate");
    }

    let setGumballModeToRotate = (event) => {
        translateButton.className = "transform-button";
        rotateButton.className = "transform-button-clicked";
        scaleButton.className = "transform-button";

        probeScene.setGumballMode("rotate");
    }

    let setGumballModeToScale = (event) => {
        translateButton.className = "transform-button";
        rotateButton.className = "transform-button";
        scaleButton.className = "transform-button-clicked";

        probeScene.setGumballMode("scale");
    }

    translateButton.addEventListener("click", setGumballModeToTranslate);
    rotateButton.addEventListener("click", setGumballModeToRotate);
    scaleButton.addEventListener("click", setGumballModeToScale);
}


// Shading Functions

function initShadingModeDropdown(probeScene) {
    const shadingDropdown = document.getElementById("shadingDropdown");
    const shadingColorMenu = document.getElementById("colorPickObjMenu");
    const wireframeControlsMenu = document.getElementById("wireframeControlsMenu");
    const useDetriangulatedWireframeMenu = document.getElementById("useDetriangulatedWireframeMenu");

    shadingDropdown.addEventListener("change", () => { 
        probeScene.setShadingMode(shadingDropdown.value); 
        
        // Shading Color Menu
        if(shadingDropdown.value == "normal") {
            shadingColorMenu.className = "hidden";
        }
        else {
            shadingColorMenu.className = "subsubmenu-item";
        }

        // Wireframe Controls Menu
        if(shadingDropdown.value == "wire") {
            wireframeControlsMenu.className = "subsubmenu-item";
            if(probeScene.isDetriangulatedWireframeGenerated()) {
                useDetriangulatedWireframeMenu.className = "";
            }
            else {
                useDetriangulatedWireframeMenu.className = "hidden";
            }
        }
        else {
            wireframeControlsMenu.className = "hidden";
        }
    });

    shadingDropdown.value = defaults.startShadingMode;
}

function initDetriangulateWireframeButton(probeScene) {
    const deTriButton = document.getElementById("detriangulateWireframeButton");
    const deTriCheckboxMenu = document.getElementById("useDetriangulatedWireframeMenu");

    console.log("Button Pressed!");

    deTriButton.addEventListener("click", () => {
        document.getElementById('loadingPopup').className = "loading-popup";

        // Delay the execution of the long function
        setTimeout(() => {
            probeScene.generateObjectDetriangulatedWireframe().then(() => {
                document.getElementById('loadingPopup').className = "hidden";
            }).catch(error => {
                console.error('Error:', error);
                document.getElementById('loadingPopup').className = "hidden";
            });

            deTriButton.disabled = true;
            deTriCheckboxMenu.className = "";
        }, 250);
    });
}

function initDetriangulateWireframeCheckbox(probeScene) {
    const deTriCheckbox = document.getElementById("useDetriangulatedWireframeCheckbox");
    
    deTriCheckbox.addEventListener("click", () => {
        probeScene.setUseDetriangulatedWireframe(deTriCheckbox.checked);
    });
}

function initShadingColorSelect(probeScene) {
    const shadingColor = document.getElementById("colorpickObjColor");
    
    shadingColor.addEventListener("input", (event) => { 
        probeScene.setObjectColor(event.target.value); 
    });

    shadingColor.value = "#" + defaults.startShadingColor.toString(16);
}

function initMaterialDoubleSidedCheckbox(probeScene) {
    const doubleSidedCheckbox = document.getElementById("shadingDoubleSidedCheckbox");

    doubleSidedCheckbox.addEventListener("change", () => {
        probeScene.setShadingDoubleSided(doubleSidedCheckbox.checked);
    });

    doubleSidedCheckbox.checked = defaults.startMaterialDoubleSided;
}


// UI Settings Functions

function initShowAxesCheckbox(probeScene) {
    const showAxesCheckbox = document.getElementById("showAxesCheckbox");

    showAxesCheckbox.addEventListener("change", () => {
        probeScene.setShowAxes(showAxesCheckbox.checked);
    });

    showAxesCheckbox.checked = defaults.startShowAxes;
}

function initNearFarPlaneOpacitySlider(probeScene) {
    const opacityNumber = document.getElementById("nearFarPlaneOpacityEntry");
    const opacitySlider = document.getElementById("nearFarPlaneOpacitySlider");

    let updateOpacity = (event) => {
        // Sync HTML elements
        if(event.srcElement.className == "standard-slider")
            opacityNumber.value = opacitySlider.value;
        else 
            opacitySlider.value = opacityNumber.value;
        
        // Update scene camera
        probeScene.setNearFarOpacity(opacityNumber.value); 
    }

    opacityNumber.addEventListener("change", updateOpacity);
    opacitySlider.addEventListener("input", updateOpacity);

    opacityNumber.value = defaults.startClippingPlaneOpacity;
    opacitySlider.value = defaults.startClippingPlaneOpacity;
}


// Overall Controls Initialization

export function initControls(probeScene, viewManager, cameraViewIndex) {
    
    // Object Import/Export Controls
    initResetToCubeButton(probeScene);
    initLoadObjectFileEntry(probeScene);
    initFitLoadedObjectToFrustum(probeScene);
    initExportObjectButton(probeScene);

    // Frustum Controls
    initProjectionDropdown(probeScene, viewManager, cameraViewIndex);
    initFOVSlider(probeScene, viewManager, cameraViewIndex);
    initOrthoSideLength(probeScene, viewManager, cameraViewIndex);
    initNearPlaneEntry(probeScene, viewManager, cameraViewIndex);
    initFarPlaneEntry(probeScene, viewManager, cameraViewIndex);

    // Transform Controls
    initTransformResetButton(probeScene);
    initTransformWidgetButtons(probeScene, viewManager);

    // Shading Controls
    initShadingModeDropdown(probeScene);
    initDetriangulateWireframeButton(probeScene);
    initDetriangulateWireframeCheckbox(probeScene);
    initMaterialDoubleSidedCheckbox(probeScene);
    initShadingColorSelect(probeScene);

    // UI Settings
    initShowAxesCheckbox(probeScene);
    initNearFarPlaneOpacitySlider(probeScene);

    // View Buttons
    window.onFullscreenButtonPressed = function(viewName) {
        const activeView = viewManager.getActiveView();
        const button = document.getElementById(viewName + "Button");
        if(activeView != -1) {
            button.textContent = "Fullscreen";
            viewManager.setActiveView(-1);
        }
        else {
            if(!viewManager.setActiveView(viewManager.getViewByName(viewName))) {
                console.error("Failed to set active view with name", viewName);
            }
            else {
                button.textContent = "Back to Four Views";
            }
        }
    }

    // Currently Unused
    // window.onOrthoSwapRealImageButtonPressed = function(viewName, buttonID) {
    //     const view = viewManager.getViewByName(viewName);
    
    //     const viewData = viewManager.getViewData()[view];
    
    //     viewData.imagespace = !viewData.imagespace;
    //     const button = document.getElementById(buttonID);

    //     if(viewData.imagespace) {
    //         button.textContent = "Imagespace View";
    //         button.title = "Click to Sync with Real View"
    //     }
    //     else {
    //         button.textContent = "Real View";
    //         button.title = "Click to Sync with Imagespace View";
    //     }
    // }
    
    window.onOrthoSwapElevationPlanButtonPressed = function(viewName, buttonID) {
        const view = viewManager.getViewByName(viewName);
    
        viewManager.swapViewIfOrtho(view, probeScene.getFarPlane());
    
        const mode = viewManager.getViewOrthoMode(view);
        const button = document.getElementById(buttonID);
    
        if(mode == "elevation") {
            button.textContent = "Elevation";
            button.title = "Click to Swap to Plan"
        }
        else if(mode == "plan") {
            button.textContent = "Plan";
            button.title = "Click to Swap to Elevation";
        }
        else {
            console.error("Error: Non-Ortho View Accessed by Ortho Swap Button");
        }
    }

    window.onImageSwapButtonPressed = function() {   
        probeScene.activateFrustumTransition();
        const button = document.getElementById("imageSwapButton");

        if(button.textContent == "Click to Undistort (D)") {
            button.textContent = "Click to Distort (D)";
        }
        else if(button.textContent == "Click to Distort (D)") {
            button.textContent = "Click to Undistort (D)";
        }
    }
}