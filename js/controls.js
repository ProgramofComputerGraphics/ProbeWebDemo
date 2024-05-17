import { ProbeScene } from "./scene.js";

export function initControls(probeScene) {

    // FOV Number/Slider
    const fovNumber = document.getElementById("fovEntry");
    const fovSlider = document.getElementById("fovSlider");
    
    fovNumber.addEventListener("change", () => { 
        probeScene.setFOV(fovNumber.value); 
        fovSlider.value = fovNumber.value;
    });

    fovSlider.addEventListener("input", () => { 
        probeScene.setFOV(fovSlider.value); 
        fovNumber.value = fovSlider.value;
    });

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