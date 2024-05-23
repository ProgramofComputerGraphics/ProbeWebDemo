import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { generateImageFrustumClippingPlanes } from './frustum.js';

const orthoPadding = 0.25;

export class ViewManager {  
    #activeView;
    #probeScene;

    constructor(probeSceneArg) {
        
        // Initializes the four views:
        //  - Real World
        //  - Orthographic
        //  - Perspective
        //  - Imagespace
        // Modified from https://threejs.org/examples/webgl_multiple_views
        this.views = [
            {
                name: "realView",
                containerID: "realViewContainer",
                // background: new THREE.Color().setRGB( 0.5, 0.5, 0.7, THREE.SRGBColorSpace ),
                eye: [ -12, 10, 0 ],
                up: [ 0, 1, 0 ],
                fov: 30,
                controllable: true,
                rotatable: true,
                imagespace: false,
                gumball: true,
            },
            {
                name: "orthoView",
                containerID: "orthoViewContainer",
                // background: new THREE.Color().setRGB( 0.6, 0.7, 0.7, THREE.SRGBColorSpace ),
                eye: [ -10, 0, 5 ],
                up: [ 0, 1, 0 ],
                fov: "ortho",
                vDist: 10,
                controllable: true,
                rotatable: false,
                imagespace: false,
                gumball: true,
            },
            {
                name: "perspView",
                containerID: "perspViewContainer",
                // background: new THREE.Color().setRGB( 0.5, 0.7, 0.7, THREE.SRGBColorSpace ),
                eye: [ 0, 0, 0 ],
                up: [ 0, 1, 0 ],
                fov: 45,
                controllable: false,
                imagespace: false,
                gumball: false,
            },
            {
                name: "imageView",
                containerID: "imageViewContainer",
                // background: new THREE.Color().setRGB( 0.7, 0.5, 0.5, THREE.SRGBColorSpace ),
                eye: [-12 , 3, -2 ],
                up: [ 0, 1, 0 ],
                fov: "ortho",
                vDist: 2.5,
                controllable: true,
                rotatable: true,
                imagespace: true,
                gumball: false,
            }
        ];

        // Create variable for representing the currently active view
        this.#activeView = -1;
        this.#probeScene = probeSceneArg;
        
        for (let ii = 0; ii < this.views.length; ++ii) {
            const view = this.views[ii];

            // Initialize the camera for each view
            this.#initViewCamera(view);

            // Set up the renderer for each view
            this.#initRenderer(view);

            // Set up mouse listener for each view
            this.#initMousePressListener(view, ii);

            // Initialize camera controls if view is controllable
            this.#initCameraControls(view);
        }
    }

    #initViewCamera(view) {
        var camera;

        // Define the camera based on the specified parameters (fov is set to "ortho"
        // for orthographic cameras). 
        if(view.fov == "ortho"){
            const estimatedAspect = window.innerWidth * 0.85 / window.innerHeight;
            const vDistAdjusted = view.vDist + orthoPadding*2;
            const hDist = vDistAdjusted * estimatedAspect;
            view.orthoMode = "elevation";
            camera = new THREE.OrthographicCamera(-hDist, hDist, 
                                                    vDistAdjusted/2, 
                                                    -vDistAdjusted/2);
            camera.up.fromArray(view.up);
        }
        else{
            // Note: The aspect ratio given here is overwritten by a call to 
            // "updateViewCameras()" on every render frame, so it need not be
            // accurate here.
            camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 1000);
            camera.up.fromArray(view.up);
        }
        camera.position.fromArray(view.eye);

        // Define the target for the camera
        if(view.imagespace) {
            camera.name = view.name;
            camera.lookAt(new THREE.Vector3(0,0,0.5));
        }
        else {
            camera.lookAt(new THREE.Vector3(0,0,5))
        };

        camera.updateProjectionMatrix();
        view.camera = camera;
    }

    #initRenderer(view) {
        // Initialize the view's renderer
        view.renderer = new THREE.WebGLRenderer();

        // Set the renderer's DOM element's ID and class
        view.renderer.domElement.id = view.name + "Canvas";
        view.renderer.domElement.class = "render-canvas";

        // Find the view's container div
        const viewContainer = document.getElementById(view.name);

        // Add the DOM element of the view's renderer to the container div as a child
        viewContainer.appendChild(view.renderer.domElement);

        // Add Clipping Planes for Imagespace Renderer
        if(view.imagespace) {
            view.renderer.clippingPlanes = generateImageFrustumClippingPlanes();
        }
    }

    #initCameraControls(view) {
        if(!view.controllable)
            return;

        const cameraControls = new OrbitControls(view.camera, view.renderer.domElement);
        
        // Define the target for the camera
        if(view.imagespace) {
            cameraControls.target = new THREE.Vector3(0,0,0.5);
        }
        else {
            cameraControls.target = new THREE.Vector3(0,0,5);
        };
        
        if(!view.rotatable) {
            cameraControls.enableRotate = false;
        }
        
        cameraControls.update();
        view.cameraControls = cameraControls;
    }

    #initMousePressListener(view, viewIndex) {
        const viewRenderCanvas = document.getElementById(view.name + "Canvas");

        // If the canvas isn't found, print an error and end the method.
        if(viewRenderCanvas == null) {
            console.error("Error: Render canvas could not be found for " + view.name);
            return;
        }

        viewRenderCanvas.addEventListener("click", (event) => {
            this.#onMouseClicked(view, viewIndex, event);
        });

    }

    #onMouseClicked(view, viewIndex, mouseEvent) {
        const mousePos = new THREE.Vector2(mouseEvent.clientX, mouseEvent.clientY);
        const pointer = this.normalizePointerToView(mousePos, viewIndex);

        this.#probeScene.clickScene(pointer, view, viewIndex);
    }

    getViewData() {
        return this.views;
    }

    getActiveView() {
        return this.#activeView;
    }

    setActiveView(viewIndex) {
        if(viewIndex == -1) {
            // Set the overall container grid to 2x2
            const overallContainer = document.getElementById("viewsContainer");
            overallContainer.style.gridTemplateColumns = '1fr 1fr';
            overallContainer.style.gridTemplateRows = '1fr 1fr';

            // Re-enable all currently invisible views
            for(let i = 0; i < this.views.length; ++i) {
                // Set all views to a small, equal size - this ensures they all
                // grow to fill the screen correctly on the next call to
                // updateViewSizes()
                this.views[i].renderer.setSize(1,1);

                // Set all views to display their contents
                const container = document.getElementById(this.views[i].containerID);
                container.style.display = 'flex';
            }

            this.#activeView = -1;
            return true;
        }

        // NOTE: This code will need to be adjusted if the program is changed to
        // allow one to switch which view is fullscreen. This logic assumes that the
        // current active view must be -1 if you are setting it to a non-negative 1
        // value. 
        if(viewIndex >= 0 && viewIndex < this.views.length) {
            // Set the overall container grid to 1x1
            const overallContainer = document.getElementById("viewsContainer");
            overallContainer.style.gridTemplateColumns = '1fr';
            overallContainer.style.gridTemplateRows = '1fr';

            for(let i = 0; i < this.views.length; ++i) {
                // Skip view that will become the active view
                if(i == viewIndex) continue;
                
                const container = document.getElementById(this.views[i].containerID);
                container.style.display = 'none';
            }

            this.#activeView = viewIndex;
            return true;
        }
        
        return false;
    }

    getHoveredView(pointer) {
        // Convert pointer from [-1,1] range to [0,1] range
        const zeroOnePointerX = (pointer.x + 1) / 2;
        const zeroOnePointerY = (pointer.y + 1) / 2;
    
        if (this.#activeView != -1) {
            if(zeroOnePointerX < 0 || zeroOnePointerX >= 1)
                return -1;
            
            if(zeroOnePointerY < 0 || zeroOnePointerY >= 1)
                return -1;
    
            return this.#activeView;
        }
    
        // Check each view to see if the pointer position is within the view's window
        for(let i = 0; i < this.views.length; ++i) {
            const view = this.views[i];
    
            if(view.left <= zeroOnePointerX && 
                zeroOnePointerX < view.left + view.width) {
                
                if(view.bottom <= zeroOnePointerY && 
                    zeroOnePointerY < view.bottom + view.height) {
                    return i;
                }
            }
        }
    
        return -1;
    }

    getViewByName(name) {
        for(let i = 0; i < this.views.length; ++i) {
            if(this.views[i].name == name) {
                return i;
            }
        }
    
        return -1;
    }

    getViewCamera(viewIndex) {
        return this.views[viewIndex].camera;
    }

    getViewOrthoMode(viewIndex) {
        return this.views[viewIndex].orthoMode;
    }

    swapViewIfOrtho(viewIndex, frustumFarPlane) {
        const view = this.views[viewIndex];
        if(view.fov != "ortho") {
            return false;
        }

        if(view.orthoMode == "elevation") {
            view.camera.position.set(0, frustumFarPlane, frustumFarPlane/2);
            view.camera.up.set(0,0,-1);
            view.orthoMode = "plan";
        }
        else {
            view.camera.position.set(-frustumFarPlane, 0, frustumFarPlane/2);
            view.camera.up.set(0,1,0);
            view.orthoMode = "elevation";
        }
            
        view.camera.lookAt(0,0,frustumFarPlane/2);
        view.cameraControls.target.set(0,0,frustumFarPlane/2);
        
        view.camera.updateProjectionMatrix();
    }

    normalizePointerToView(mousePos, viewIndex) {
        // Throw an exception if the specified view index is not within the bounds of 
        // the view array
        if(viewIndex < 0 || viewIndex >= this.views.length)
        {
            throw new Error('Specified \'viewIndex\' is out of bounds: ' + viewIndex);
        }
    
        // Otherwise, the position within the specified view's sub-window must be
        // computed.

        const view = this.views[viewIndex];
        const rect = view.renderer.domElement.getBoundingClientRect();

        const mouseViewX = (mousePos.x - rect.left) / rect.width * 2 - 1;
        const mouseViewY = -(mousePos.y - rect.top) / rect.height * 2 + 1;
        
        return new THREE.Vector2(mouseViewX, mouseViewY);
    }

    setViewControlsEnabled(viewIndex, enabled) {
        if(viewIndex == -1) {
            return;
        }
        
        const view = this.views[viewIndex];
    
        if(view.controllable)
            view.cameraControls.enabled = enabled;
    }
    
    #getViewRenderArea(viewIndex) {
        return document.getElementById(this.views[viewIndex].name);
    }
    
    #updateViewCamera(viewIndex, viewWidth, viewHeight) {
        // Do not update camera if width/height are nonsensical
        if(viewWidth <= 0 || viewHeight <= 0)
            return;
        
        const view = this.views[viewIndex];
        const camera = view.camera;

        const aspect = (viewWidth) / (viewHeight);

        if(view.fov == "ortho"){
            const hDist = (camera.top - camera.bottom) * aspect;

            camera.left = -hDist / 2;
            camera.right = hDist / 2;
        }
        else{
            camera.aspect = aspect;
        }
        camera.updateProjectionMatrix();
    }

    #updateViewSize(viewIndex) {
        const view = this.views[viewIndex];
        const viewContainer = this.#getViewRenderArea(viewIndex);
        const renderer = view.renderer;

        const viewWidth = viewContainer.clientWidth;
        const viewHeight = viewContainer.clientHeight;

        renderer.setSize(viewWidth, viewHeight);
        renderer.setViewport(0, 0, viewWidth, viewHeight);
        renderer.setClearColor(view.background);

        this.#updateViewCamera(viewIndex, viewWidth, viewHeight);
    }

    updateViewSizes() {
        if(this.#activeView != -1)
        {
            this.#updateViewSize(this.#activeView);
            return;
        }

        for(let i = 0; i < this.views.length; ++i) {
            this.#updateViewSize(i);
        }
    }
}