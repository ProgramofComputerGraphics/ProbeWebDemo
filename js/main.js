import { initControls } from './controls.js';
import { setTestBoolean, testBoolean } from './debugging.js';
import { InputManager } from './input.js';
import { ProbeScene } from './scene.js'
import { ViewManager } from './views.js';


// Create variable for the scene
let probeScene;

// Create variable for the view manager
let viewManager;

// Create variable for the input manager
let inputManager;

function init() {
	probeScene = new ProbeScene();
	
	viewManager = new ViewManager();

	// Get the perspective view
	const cameraView = viewManager.getViewByName("cameraView");

	inputManager = new InputManager(probeScene, viewManager, cameraView);

	initControls(probeScene, viewManager, cameraView);

	window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
	viewManager.updateViewSizes();
}

// Modified from https://threejs.org/examples/webgl_multiple_views
function render() {
	const views = viewManager.getViewData();
	const activeView = viewManager.getActiveView();

	viewManager.updateViewSizes();

	probeScene.tickFrustumDistortionMatrix();

	// If active view is not set, render all four views.
	if(activeView == -1) {
		for (let ii = 0; ii < views.length; ++ii) {
			const view = views[ii];
			probeScene.renderScene(ii, view.renderer, view.camera, 
									view.imagespace, view.showFrustum, 
									view.frustumLinesOnly, true);

			if(view.renderCameraOutline) {
				viewManager.renderCameraOutline(ii);
			}
		}
	}
	// Otherwise, render the active view.
	else {
		const view = views[activeView];
		probeScene.renderScene(activeView, view.renderer, view.camera, 
								view.imagespace, view.showFrustum, 
								view.frustumLinesOnly, true);

		if(view.renderCameraOutline) {
			viewManager.renderCameraOutline(activeView);
		}
	}
}

function animate() {
	render();

	requestAnimationFrame( animate );
}

init();
animate();