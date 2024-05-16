import * as THREE from 'three';

import { ProbeScene } from './scene.js'

import { ViewManager } from './views.js';


const renderer = new THREE.WebGLRenderer();

// Create a pointer for representing the current mouse cursor position
const pointer = new THREE.Vector2();

// Create variables for representing the renderer window width/height
let windowWidth, windowHeight;

// Create variable for the view manager
let viewManager;

// Create variable for currently hovered view
let hoveredViewIndex = -1;

// Create variable for the scene
let probeScene;


function init() {
	viewManager = new ViewManager(renderer.domElement);

	probeScene = new ProbeScene(viewManager.getViewByName("realView"),
								viewManager, 
								renderer.domElement);

	renderer.setSize(200, 150, false);

	window.addEventListener('resize', onWindowResize);
	window.addEventListener('mousedown', onMouseDown);
	window.addEventListener('pointermove', onPointerMove);
}

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

function calculateNDCMousePosition(event) {
	// Get the bounding rectangle of the renderer canvas
	const rect = renderer.domElement.getBoundingClientRect();

	// calculate pointer position in normalized device coordinates
	// (-1 to +1) for both components

	var mouseX = (event.clientX - rect.left) / rect.width * 2 - 1;
	var mouseY = -(event.clientY - rect.top) / rect.height * 2 + 1;

	return new THREE.Vector2(mouseX, mouseY);
}

function onWindowResize() {
	viewManager.updateViewSizes();
}

// Modified from https://threejs.org/docs/index.html?q=ray#api/en/core/Raycaster
function onPointerMove(event) {
	// Get the NDC mouse coordinates
	const mouseCoords = calculateNDCMousePosition(event);

	// Update current mouse pointer coordinates
	pointer.x = mouseCoords.x;
	pointer.y = mouseCoords.y;

	// Get new hovered view
	const newHoveredViewIndex = viewManager.getHoveredView(pointer);

	// Update camera controls if hovered view has changed
	if(hoveredViewIndex != newHoveredViewIndex) {
		// Disable camera controls on the old view
		viewManager.setViewControlsEnabled(hoveredViewIndex, false);
		
		// Enable camera controls on the new view
		viewManager.setViewControlsEnabled(newHoveredViewIndex, true);

		// Update the currently hovered view to the new hovered view
		hoveredViewIndex = newHoveredViewIndex;
	}
}

function onMouseDown(event) {
	// Get the NDC mouse coordinates
	const mouseCoords = calculateNDCMousePosition(event);

	// Get the currently hovered view
	const hoveredView = viewManager.getHoveredView(mouseCoords);

	if(hoveredView != -1) {
		const intersects = raycastHUDElement(mouseCoords, hoveredView);

		if(intersects != null) {
			const activeView = viewManager.getActiveView();
			viewManager.setActiveView(activeView == hoveredView ? -1 : hoveredView);
		}
	}
}

// Modified from https://threejs.org/examples/webgl_multiple_views
function render() {
	var views = viewManager.getViews();
	var activeView = viewManager.getActiveView();

	viewManager.updateViewSizes();

	// If active view is not set, render all four views.
	if(activeView == -1) {
		for (let ii = 0; ii < views.length; ++ii) {
			const view = views[ii];
			probeScene.renderScene(view.renderer, view.camera, true, view.imagespace);
		}
	}
	// Otherwise, render the active view.
	else {
		const view = views[activeView];
		probeScene.renderScene(view.renderer, view.camera, true, view.imagespace);
	}

}

function animate() {

	render();

	requestAnimationFrame( animate );

}

init();
animate();