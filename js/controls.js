import * as THREE from "three";


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

        camera.lookAt(new THREE.Vector3(0,0,1));
        viewManager.setViewCamera(cameraViewIndex, camera);
    }

    projectionDropdown.addEventListener("change", updateProjectionDropdown);
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
}

function initNearPlaneEntry(probeScene) {
    const nearNumber = document.getElementById("nearEntry");

    let updateNearPlane = (event) => {
        probeScene.setNearPlane(nearNumber.value);
    }

    nearNumber.addEventListener("change", updateNearPlane)
}

function initFarPlaneEntry(probeScene) {
    const farNumber = document.getElementById("farEntry");

    let updateFarPlane = (event) => {
        probeScene.setFarPlane(farNumber.value);
    }

    farNumber.addEventListener("change", updateFarPlane)
}


// Shading Functions

function initShadingModeDropdown(probeScene) {
    const shadingDropdown = document.getElementById("shadingDropdown");
    
    shadingDropdown.addEventListener("change", () => { 
        probeScene.setShadingMode(shadingDropdown.value); 
    });
}

function initShadingColorSelect(probeScene) {
    const shadingColor = document.getElementById("colorpickObjColor");
    
    shadingColor.addEventListener("input", (event) => { 
        probeScene.setObjectColor(event.target.value); 
    });
}


// Overall Controls Initialization

export function initControls(probeScene, viewManager, cameraViewIndex) {
    
    // Frustum Controls
    initProjectionDropdown(probeScene, viewManager, cameraViewIndex);
    initFOVSlider(probeScene, viewManager, cameraViewIndex);
    initOrthoSideLength(probeScene, viewManager, cameraViewIndex);
    initNearPlaneEntry(probeScene, viewManager, cameraViewIndex);
    initFarPlaneEntry(probeScene, viewManager, cameraViewIndex);

    // Shading Controls
    initShadingModeDropdown(probeScene);
    initShadingColorSelect(probeScene);
    
}