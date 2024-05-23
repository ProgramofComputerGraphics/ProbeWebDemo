import * as THREE from 'three';

import { ProbeScene } from './scene.js'

import { ViewManager } from './views.js';
import { initControls } from './controls.js';


// Create variable for the view manager
let viewManager;

// Create variable for the scene
let probeScene;


function init() {
	probeScene = new ProbeScene();
	
	viewManager = new ViewManager(probeScene);

	// Get the perspective view
	const perspView = viewManager.getViewByName("perspView");

	initControls(probeScene, viewManager, perspView);

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

window.onOrthoSwapButtonPressed = function(viewName, buttonID) {
	const view = viewManager.getViewByName(viewName);

	viewManager.swapViewIfOrtho(view, probeScene.getFarPlane());

	const mode = viewManager.getViewOrthoMode(view);
	const button = document.getElementById(buttonID);

	if(mode == "elevation") {
		button.textContent = "Elevation (Click to Swap to Plan)";
	}
	else if(mode == "plan") {
		button.textContent = "Plan (Click to Swap to Elevation)";
	}
	else {
		console.error("Error: Non-Ortho View Accessed by Ortho Swap Button");
	}
}

function onWindowResize() {
	viewManager.updateViewSizes();
}

// Modified from https://threejs.org/docs/index.html?q=ray#api/en/core/Raycaster
function onPointerMove(event) {
	
}

function onMouseDown(event) {
	
}

// Modified from https://threejs.org/examples/webgl_multiple_views
function render() {
	const views = viewManager.getViewData();
	const activeView = viewManager.getActiveView();

	viewManager.updateViewSizes();

	// If active view is not set, render all four views.
	if(activeView == -1) {
		for (let ii = 0; ii < views.length; ++ii) {
			const view = views[ii];
			probeScene.renderScene(ii, view.renderer, view.camera, 
									true, view.imagespace);
		}
	}
	// Otherwise, render the active view.
	else {
		const view = views[activeView];
		probeScene.renderScene(activeView, view.renderer, view.camera, 
								true, view.imagespace);
	}

}

function animate() {

	render();

	requestAnimationFrame( animate );

}

init();
animate();