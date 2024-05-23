import { ProbeScene } from "./scene.js";
import { ViewManager } from "./views.js";



export function initControls(probeScene, viewManager, perspViewIndex) {
    // FOV Number/Slider
    const fovNumber = document.getElementById("fovEntry");
    const fovSlider = document.getElementById("fovSlider");

    let updateFOV = (event) => {
        probeScene.setFOV(fovNumber.value); 
        
        viewManager.getViewCamera(perspViewIndex).fov = fovNumber.value;
        
        if(event.srcElement.className == "standard-slider")
            fovNumber.value = fovSlider.value;
        else 
            fovSlider.value = fovNumber.value;
    }

    fovNumber.addEventListener("change", updateFOV);
    fovSlider.addEventListener("input", updateFOV);

    // Shading Behavior
    const shadingDropdown = document.getElementById("shadingDropdown");
    
    shadingDropdown.addEventListener("change", () => { 
        probeScene.setShadingMode(shadingDropdown.value); 
    });

    // Shading Behavior
    const shadingColor = document.getElementById("colorpickObjColor");
    
    shadingColor.addEventListener("input", (event) => { 
        probeScene.setObjectColor(event.target.value); 
    });
}