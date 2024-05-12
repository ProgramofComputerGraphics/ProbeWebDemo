import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getViews, normalizePointerToView } from './views.js';

// Create a scene for the HUD
export const hudScene = new THREE.Scene();

// Create a camera for the HUD
export const hudCamera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 1000);


// Default Color & Opacity for Fullscreen Button
const fullscreenButtonColor = 0x808080;
const fullscreenButtonOpacity = 0.85;

// Highlighted Color for Fullscreen Button
const fullscreenButtonHighlightColor = 0xc0c0c0;

// Create a list of HUD Fullscreen Buttons for each view in the scene
var viewHUDFullscreenButtons = [];


// Font for Fullscreen Text
var font;


// Create a raycaster for selecting elements of the HUD
const raycaster = new THREE.Raycaster();


export function initHudScene(){
    const button_width = 0.06;
    const button_height = 0.05;
    
    // Create a Fullscreen Button material (e.g., basic material with color)
    const hudFullscreenButtonMaterial = new THREE.MeshBasicMaterial({ color: fullscreenButtonColor, 
                                                                        transparent: true, 
                                                                        opacity: fullscreenButtonOpacity });

    // Create a Fullscreen Button geometry (e.g., plane)
    const hudFullscreenButtonGeometry = new THREE.PlaneGeometry(button_width, button_height);

    // Determine the number of views (one HUD is needed per view)
    var views = getViews();
    const numViews = views.length;

    // Create a Fullscreen Text geometry
    const hudFullscreenTextGeometry = new TextGeometry('Fullscreen', {
        font: font,
        size: 6,
        depth: 2,
        curveSegments: 4,
        bevelEnabled: false
    } );

    // Compute the bounding box of the full-scale text geometry
    hudFullscreenTextGeometry.computeBoundingBox();

    // Compute the size of the bounding box of the text geometry
    const textSize = new THREE.Vector3();
    textSize.subVectors(hudFullscreenTextGeometry.boundingBox.max, hudFullscreenTextGeometry.boundingBox.min);

    // Compute the scaling factor necessary to fit the text within the Fullscreen Button
    const scaleFactor = Math.min(button_width/textSize.x, button_height/textSize.y) * 0.9;

    // Compute the padding that should be added to the left/right and top/bottom of the text geometry
    const textPaddingX = (button_width - textSize.x * scaleFactor) / 2;
    const textPaddingY = (button_height - textSize.y * 2 * scaleFactor) / 2; // TODO: The first '2' here is a quick fix - make this more robust later

    // Create a Fullscreen Text material
    const hudFullscreenTextMaterial = new THREE.MeshBasicMaterial({color: 0x00000});

    for(let i = 0; i < numViews; ++i) {
        // Create a Group for all the HUD elements for this view
        const viewGroup = new THREE.Group();
        viewGroup.name = views[i].name;
        

        // Create a Fullscreen Button mesh
        const hudFullscreenButtonMesh = new THREE.Mesh(hudFullscreenButtonGeometry, 
                                                        hudFullscreenButtonMaterial);

        // Position the Fullscreen Button mesh at the top-right of the screen
        hudFullscreenButtonMesh.position.x = 1 - button_width/2;
        hudFullscreenButtonMesh.position.y = 1 - button_height/2;

        // Position the Fullscreen Button mesh in front of the camera
        hudFullscreenButtonMesh.position.z = -10; 

        // Add the Fullscreen Button to the HUD Group
        viewGroup.add(hudFullscreenButtonMesh);


        // Create a Fullscreen Text mesh
        const hudFullscreenTextMesh = new THREE.Mesh(hudFullscreenTextGeometry, 
                                                        hudFullscreenTextMaterial);

        // Position the Fullscreen Text mesh over top of the button
        hudFullscreenTextMesh.position.x = 1 - button_width + textPaddingX;
        hudFullscreenTextMesh.position.y = 1 - button_height + textPaddingY;

        // Position the Fullscreen Button mesh in front of the camera
        hudFullscreenTextMesh.position.z = -4;

        // Set scale of text so that it can fit in the Fullscreen Button
        hudFullscreenTextMesh.scale.x = scaleFactor;
        hudFullscreenTextMesh.scale.y = 2 * scaleFactor; // TODO: The '2' here is a quick fix - make this more robust later
        hudFullscreenTextMesh.scale.z = scaleFactor;

        // Add the Fullscreen Text mesh to the HUD Group
        viewGroup.add(hudFullscreenTextMesh);

        
        // Add the HUD Group to the scene
        hudScene.add(viewGroup);

        // Add the HUD Group to the list of groups
        viewHUDFullscreenButtons.push(hudFullscreenButtonMesh);
    }
    
}

export function loadFont(postLoad) {
    const loader = new FontLoader();
    loader.load('../font/helvetiker_regular.typeface.json', function(response) {
        font = response;
        postLoad();
    } );
}

// Modified from https://threejs.org/docs/index.html?q=ray#api/en/core/Raycaster
// TODO: Extend flexibility to more than just the fullscreen buttons
export function raycastHUDElement(pointer, viewIndex) {
    // Calculate the pointer position normalized to the current view
    const viewNormalizedPointer = normalizePointerToView(pointer, viewIndex);
    
    // Update the mouse pointer ray with the camera and adjusted pointer position
	raycaster.setFromCamera(viewNormalizedPointer, hudCamera);

	// Check for intersection with the active view's button
	const intersects = raycaster.intersectObject(viewHUDFullscreenButtons[viewIndex]);

    if(intersects.length == 0)
    {
        return null;
    }
    else {
        return intersects;
    }
}

export function renderHUDView(renderer, pointer, viewIndex) {

    const intersects = raycastHUDElement(pointer, viewIndex);

    if(intersects == null)
    {
        viewHUDFullscreenButtons[viewIndex].material.color.set(fullscreenButtonColor)
    }
    else {
        for(let i = 0; i < intersects.length; ++i) {
            intersects[i].object.material.color.set(fullscreenButtonHighlightColor);
        }
    }

    renderer.render(hudScene, hudCamera);
}
