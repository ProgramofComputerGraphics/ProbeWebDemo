import * as THREE from 'three';

import { hudScene, hudCamera, 
		initHudScene, loadFont,
		raycastHUDElement, renderHUDView} from './hud.js';

import { initScene, renderScene } from './scene.js'

import { initViews, getViews, 
		getActiveView, getHoveredView, 
		setActiveView, updateViewCameras } from './views.js';


const renderer = new THREE.WebGLRenderer();

// Create a pointer for representing the current mouse cursor position
const pointer = new THREE.Vector2();

// Create variables for representing the renderer window width/height
let windowWidth, windowHeight;

const renderContainerElement = document.getElementById("renderCanvasContainer");
renderer.domElement.id = "renderCanvas";
renderContainerElement.appendChild(renderer.domElement);

function postLoad() {
	init();
	animate();
}

function init() {
	initScene(renderer.domElement);
	initViews(renderer.domElement);
    initHudScene();

	renderer.setSize(200, 150, false);

	renderContainerElement.addEventListener('resize', onWindowResize);
	renderer.domElement.addEventListener('mousedown', onMouseDown);
	renderer.domElement.addEventListener('pointermove', onPointerMove);
}

// Modified from https://threejs.org/examples/webgl_multiple_views
function updateSize() {
	windowWidth = renderContainerElement.clientWidth;
	windowHeight = renderContainerElement.clientHeight;

	console.log("CW:", windowWidth);
	console.log("CH:", windowHeight);

	renderer.setSize(windowWidth, windowHeight);
}

function onWindowResize() {
	updateSize();
	updateViewCameras(windowWidth, windowHeight);
}

function calculateNDCMousePosition(event) {
	// Get the bounding rectangle of the renderer canvas
	const rect = renderer.domElement.getBoundingClientRect();

	// calculate pointer position in normalized device coordinates
	// (-1 to +1) for both components

	var mouseX = (event.clientX - rect.left) / rect.width * 2 - 1;
	var mouseY = -(event.clientY - rect.top) / rect.height * 2 + 1;

	return new THREE.Vector2(mouseX, mouseY);
}



// Modified from https://threejs.org/docs/index.html?q=ray#api/en/core/Raycaster
function onPointerMove(event) {
	// Get the NDC mouse coordinates
	const mouseCoords = calculateNDCMousePosition(event);

	// Update current mouse pointer coordinates
	pointer.x = mouseCoords.x;
	pointer.y = mouseCoords.y;
}

function onMouseDown(event) {
	// Get the NDC mouse coordinates
	const mouseCoords = calculateNDCMousePosition(event);

	// Get the currently hovered view
	const hoveredView = getHoveredView(mouseCoords);

	if(hoveredView != -1) {
		const intersects = raycastHUDElement(mouseCoords, hoveredView);

		if(intersects != null) {
			setActiveView(getActiveView() == hoveredView ? -1 : hoveredView);
		}
	}
}

function renderView(view, viewIndex, fullscreen) {
    const camera = view.camera;
    
	var left, bottom, width, height;

    if(!fullscreen) {
		left = Math.floor(windowWidth * view.left);
        bottom = Math.floor(windowHeight * view.bottom);
        width = Math.floor(windowWidth * view.width);
        height = Math.floor(windowHeight * view.height);
		
		renderer.setScissorTest(true);
        renderer.setScissor(left, bottom, width, height);
    }
    else {
		left = 0;
		bottom = 0;
		width = windowWidth;
		height = windowHeight;

		renderer.setScissorTest(false);
    }
    
	renderer.setViewport(left, bottom, width, height);
	renderer.setClearColor(view.background);

	camera.aspect = windowWidth / windowHeight;
    camera.updateProjectionMatrix();
    
	// Turn on autoclear
	renderer.autoClear = true;

	// Render the main scene
    renderScene(renderer, camera);

	// Turn off autoclear (otherwise the scene render would be overwritten)
	renderer.autoClear = false;

	// Raycast to highlight full screen buttons if hovered
	raycastHUDElement(pointer, viewIndex);

	// Render the HUD elements
	renderHUDView(renderer, pointer, viewIndex);
}

// Modified from https://threejs.org/examples/webgl_multiple_views
function render() {
	updateSize();
	updateViewCameras(windowWidth, windowHeight);

	var views = getViews();

	// If active view is not set, render all four views.
	if(getActiveView() == -1) {
		for (let ii = 0; ii < views.length; ++ii) {
			renderView(views[ii], ii, false);
		}
	}
	// Otherwise, render the active view.
	else {
		renderView(views[getActiveView()], getActiveView(), true);
	}

}

function animate() {

	render();

	requestAnimationFrame( animate );

}

loadFont(postLoad);