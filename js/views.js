import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { pointInRectangle } from './utils.js';

const orthoPadding = 0.25;

export class ViewManager {  
    #views;
    #activeView;
    #cameraOutlineScene;
    #cameraOutlineCamera;
    #cameraOutlineMaterial;

    constructor() {
        
        // Initializes the four views:
        //  - Real World
        //  - Orthographic
        //  - Perspective
        //  - Imagespace
        // Modified from https://threejs.org/examples/webgl_multiple_views
        this.#views = [
            {
                name: "realView",
                containerID: "realViewContainer",
                // background: new THREE.Color().setRGB( 0.5, 0.5, 0.7, THREE.SRGBColorSpace ),
                eye: [ 12, 10, 0 ],
                up: [ 0, 1, 0 ],
                fov: 30,
                controllable: true,
                rotatable: true,
                imagespace: false,
                gumball: true,
                clickLines: false,
                showFrustum: true,
            },
            {
                name: "orthoView",
                containerID: "orthoViewContainer",
                // background: new THREE.Color().setRGB( 0.6, 0.7, 0.7, THREE.SRGBColorSpace ),
                eye: [ 10, 0, -5 ],
                up: [ 0, 1, 0 ],
                fov: "ortho",
                vDist: 10,
                orthoMode: "elevation",
                controllable: true,
                rotatable: false,
                imagespace: false,
                gumball: true,
                clickLines: true,
                showFrustum: true,
            },
            {
                name: "cameraView",
                containerID: "cameraViewContainer",
                // background: new THREE.Color().setRGB( 0.5, 0.7, 0.7, THREE.SRGBColorSpace ),
                eye: [ 0, 0, 0 ],
                up: [ 0, 1, 0 ],
                fov: 45,
                controllable: false,
                imagespace: false,
                frustumLinesOnly: true,
                gumball: false,
                showFrustum: false,
                renderCameraOutline: true,
                renderCameraOutlineColor: new THREE.Color("#4040ff"),
            },
            {
                name: "imageView",
                containerID: "imageViewContainer",
                // background: new THREE.Color().setRGB( 0.7, 0.5, 0.5, THREE.SRGBColorSpace ),
                eye: [12 , 3, 2 ],
                up: [ 0, 1, 0 ],
                fov: "ortho",
                vDist: 2.5,
                controllable: true,
                rotatable: true,
                imagespace: true,
                gumball: false,
                showFrustum: true,
            }
        ];

        // Create variable for representing the currently active view
        this.#activeView = -1;
        
        for (let ii = 0; ii < this.#views.length; ++ii) {
            const view = this.#views[ii];

            // Add linesOnly property if undefined
            if(view.frustumLinesOnly == null) {
                view.frustumLinesOnly = false;
            }

            // Initialize the camera for each view
            this.#initViewCamera(view);

            // Set up the renderer for each view
            this.#initRenderer(view);

            // Initialize camera controls if view is controllable
            this.#initCameraControls(view);
        }

        // Initialize the scene for camera outlines
        this.#cameraOutlineScene = new THREE.Scene();

        // Initialize the camera for camera outline (this is a separate camera)
        this.#cameraOutlineCamera = new THREE.OrthographicCamera(-1,1,1,-1,-1,4);
        this.#cameraOutlineCamera.position.set(0,0,2);
        this.#cameraOutlineCamera.lookAt(0,0,0);

        // Initialize the camera outline material
        this.#cameraOutlineMaterial = new THREE.LineBasicMaterial();
    }

    #initViewCamera(view) {
        var camera;

        // Define the camera based on the specified parameters (fov is set to "ortho"
        // for orthographic cameras). 
        if(view.fov == "ortho"){
            const estimatedAspect = window.innerWidth * 0.85 / window.innerHeight;
            const vDistAdjusted = view.vDist + orthoPadding*2;
            const hDist = vDistAdjusted * estimatedAspect;
            
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
            
            // TODO - Automatically pull default values instead of hard-coding them
            if(view.name=="cameraView"){
                camera.near = 1;
                camera.far = 10;
            }
            
            camera.up.fromArray(view.up);
        }
        camera.position.fromArray(view.eye);

        // Define the target for the camera
        if(view.imagespace) {
            camera.name = view.name;
            camera.lookAt(new THREE.Vector3(0,0,-0.5));
        }
        else {
            camera.lookAt(new THREE.Vector3(0,0,-5))
        };

        camera.updateProjectionMatrix();
        view.camera = camera;
    }

    #initRenderer(view) {
        // Initialize the view's renderer
        view.renderer = new THREE.WebGLRenderer();

        if(view.imagespace)
            view.renderer = new THREE.WebGLRenderer({ precision: 'highp' });

        // Set the renderer's DOM element's ID and class
        view.renderer.domElement.id = view.name + "Canvas";
        view.renderer.domElement.className = "render-canvas";

        // Find the view's container div
        const viewContainer = document.getElementById(view.name);

        // Add the DOM element of the view's renderer to the container div as a child
        viewContainer.appendChild(view.renderer.domElement);
    }

    #initCameraControls(view) {
        if(!view.controllable)
            return;

        const cameraControls = new OrbitControls(view.camera, view.renderer.domElement);
        
        // Define the target for the camera
        if(view.imagespace) {
            cameraControls.target = new THREE.Vector3(0,0,-0.5);
        }
        else {
            cameraControls.target = new THREE.Vector3(0,0,-5);
        };
        
        if(!view.rotatable) {
            cameraControls.enableRotate = false;
        }
        
        cameraControls.update();
        view.cameraControls = cameraControls;
    }

    getViewData() {
        return this.#views;
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
            for(let i = 0; i < this.#views.length; ++i) {
                // Set all views to a small, equal size - this ensures they all
                // grow to fill the screen correctly on the next call to
                // updateViewSizes()
                this.#views[i].renderer.setSize(1,1);

                // Set all views to display their contents
                const container = document.getElementById(this.#views[i].containerID);
                container.style.display = 'flex';
            }

            this.#activeView = -1;
            return true;
        }

        // NOTE: This code will need to be adjusted if the program is changed to
        // allow one to switch which view is fullscreen. This logic assumes that the
        // current active view must be -1 if you are setting it to a non-negative 1
        // value. 
        if(viewIndex >= 0 && viewIndex < this.#views.length) {
            // Set the overall container grid to 1x1
            const overallContainer = document.getElementById("viewsContainer");
            overallContainer.style.gridTemplateColumns = '1fr';
            overallContainer.style.gridTemplateRows = '1fr';

            for(let i = 0; i < this.#views.length; ++i) {
                // Skip view that will become the active view
                if(i == viewIndex) continue;
                
                const container = document.getElementById(this.#views[i].containerID);
                container.style.display = 'none';
            }

            this.#activeView = viewIndex;
            return true;
        }
        
        return false;
    }

    
    getViewArea(viewIndex) {
        const view = this.#views[viewIndex];

        return document.getElementById(view.name).getBoundingClientRect();
    }

    getHoveredView(mouseCoords) {   
        // If a view is set to fullscreen, only check the active view 
        if (this.#activeView != -1) {
            const viewRect = this.getViewArea(this.#activeView);
            
            // TODO - Check for boundary edge cases (reversed y-direction could mess things up)
            return pointInRectangle(mouseCoords, viewRect) ? this.#activeView : -1;
        }
    
        // Otherwise, check each view to see if the pointer position is within the view's window
        for(let i = 0; i < this.#views.length; ++i) {
            const viewRect = this.getViewArea(i);
            
            // TODO - Check for boundary edge cases (reversed y-direction could mess things up)
            if(pointInRectangle(mouseCoords, viewRect)) {
                return i;
            }
        }
    
        // If mouse is not within any view, return -1
        return -1;
    }

    getViewByName(name) {
        for(let i = 0; i < this.#views.length; ++i) {
            if(this.#views[i].name == name) {
                return i;
            }
        }
    
        return -1;
    }

    getViewAspect(viewIndex) {
        const rect = this.getViewArea(viewIndex);

        return rect.width / rect.height;
    }

    getViewCamera(viewIndex) {
        if (viewIndex >= 0 && viewIndex < this.#views.length)
            return this.#views[viewIndex].camera;

        return null;
    }

    setViewCamera(viewIndex, camera) {
        if(viewIndex >= 0 && viewIndex < this.#views.length){
            this.#views[viewIndex].camera = camera;

            if(camera instanceof THREE.PerspectiveCamera) {
                this.#views[viewIndex].fov = camera.fov;
            }
            else if(camera instanceof THREE.OrthographicCamera) {
                this.#views[viewIndex].fov = "ortho";
                this.#views[viewIndex].vDist = camera.top - camera.bottom;
            }

            return true;
        }

        return false;
    }

    getViewCameraControls(viewIndex) {
        if (viewIndex >= 0 && viewIndex < this.#views.length)
            return this.#views[viewIndex].cameraControls;

        return null;
    }

    getViewOrthoMode(viewIndex) {
        return this.#views[viewIndex].orthoMode;
    }

    swapViewIfOrtho(viewIndex, frustumFarPlane) {
        const view = this.#views[viewIndex];
        if(view.fov != "ortho") {
            return false;
        }

        if(view.orthoMode == "elevation") {
            view.camera.position.set(0, frustumFarPlane, -frustumFarPlane/2);
            view.camera.up.set(0,0,1);
            view.orthoMode = "plan";
        }
        else {
            view.camera.position.set(frustumFarPlane, 0, -frustumFarPlane/2);
            view.camera.up.set(0,1,0);
            view.orthoMode = "elevation";
        }
            
        view.camera.lookAt(0,0,-frustumFarPlane/2);
        view.cameraControls.target.set(0,0,-frustumFarPlane/2);
        
        view.camera.updateProjectionMatrix();
    }

    normalizePointerToView(mousePos, viewIndex) {
        // Throw an exception if the specified view index is not within the bounds of 
        // the view array
        if(viewIndex < 0 || viewIndex >= this.#views.length)
        {
            throw new Error('Specified \'viewIndex\' is out of bounds: ' + viewIndex);
        }
    
        // Otherwise, the position within the specified view's sub-window must be
        // computed.

        const view = this.#views[viewIndex];
        const rect = view.renderer.domElement.getBoundingClientRect();

        const mouseViewX = (mousePos.x - rect.left) / rect.width * 2 - 1;
        const mouseViewY = -(mousePos.y - rect.top) / rect.height * 2 + 1;
        
        return new THREE.Vector2(mouseViewX, mouseViewY);
    }

    setViewControlsEnabled(viewIndex, enabled) {
        if(viewIndex == -1) {
            return;
        }
        
        const view = this.#views[viewIndex];
    
        if(view.controllable)
            view.cameraControls.enabled = enabled;
    }
    
    #getViewRenderArea(viewIndex) {
        return document.getElementById(this.#views[viewIndex].name);
    }
    
    #updateViewCamera(viewIndex, viewWidth, viewHeight) {
        // Do not update camera if width/height are nonsensical
        if(viewWidth <= 0 || viewHeight <= 0)
            return;
        
        const view = this.#views[viewIndex];
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
        const view = this.#views[viewIndex];
        const viewContainer = this.#getViewRenderArea(viewIndex);
        const renderer = view.renderer;

        const canvasWidth = viewContainer.clientWidth;
        const canvasHeight = viewContainer.clientHeight;

        renderer.setSize(viewContainer.clientWidth, viewContainer.clientHeight);

        let viewWidth, viewHeight;

        if(view.name == "cameraView") {
            viewWidth = viewHeight = Math.min(canvasWidth, canvasHeight);
            
            const viewportLeft = (canvasWidth - viewWidth) / 2;
            const viewportTop = (canvasHeight - viewHeight) / 2;

            renderer.setViewport(viewportLeft, viewportTop,
                                viewWidth, viewHeight);
        }
        else {
            viewWidth = viewContainer.clientWidth;
            viewHeight = viewContainer.clientHeight;

            renderer.setViewport(0, 0, viewWidth, viewHeight);
        }
        
        renderer.setClearColor(view.background);

        this.#updateViewCamera(viewIndex, viewWidth, viewHeight);
    }

    updateViewSizes() {
        if(this.#activeView != -1)
        {
            this.#updateViewSize(this.#activeView);
            return;
        }

        for(let i = 0; i < this.#views.length; ++i) {
            this.#updateViewSize(i);
        }
    }

    renderCameraOutline(viewIndex) {
        // Return early if view index is invalid
        if(viewIndex < 0 || viewIndex >= this.#views.length)
            return;

        // Return early if view does not allow for camera outline
        if(!this.#views[viewIndex].renderCameraOutline)
            return;

        // Get the camera's aspect ratio (or the equivalent property for an orthographic camera)
        const camera = this.getViewCamera(viewIndex);

        let camAspect;
        if(camera instanceof THREE.PerspectiveCamera) {
            camAspect = camera.aspect;
        }
        else if(camera instanceof THREE.OrthographicCamera) {
            camAspect = (camera.right - camera.left) / (camera.top - camera.bottom);
        }
        else {
            return;
        }  

        // If camera aspect is invalid, return early
        if(camAspect <= 0 || !Number.isFinite(camAspect)) {
            return;
        }

        // Get the view area's aspect ratio
        const viewContainer = this.#getViewRenderArea(viewIndex);
        const viewAreaAspect = viewContainer.clientWidth / viewContainer.clientHeight;

        // If view area aspect is invalid, return early
        if(viewAreaAspect <= 0 || !Number.isFinite(viewAreaAspect)) {
            return;
        }

        // More accurately an "aspect ratio ratio", this value is the ratio between
        // the camera's aspect ratio and the view area's aspect ratio
        const aspectRatioRatio = camAspect / viewAreaAspect;

        const renderer = this.#views[viewIndex].renderer

        // Save existing render parameters
        let tempAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        let tempRenderViewport = new THREE.Vector4();
        renderer.getViewport(tempRenderViewport);

        // Dispose of existing camera outline geometry
        this.#cameraOutlineScene.traverse(object => {
            if(object.geometry)
                object.geometry.dispose();
        });
        this.#cameraOutlineScene.clear();

        // Near one constant
        const nearOne = 1;

        // Compute camera outline points
        const cameraOutlinePoints = [];

        // View area is proportionally wider than camera
        if(viewAreaAspect >= camAspect) {
            cameraOutlinePoints.push(new THREE.Vector3(-aspectRatioRatio, -nearOne, 1));
            cameraOutlinePoints.push(new THREE.Vector3(aspectRatioRatio, -nearOne, 1));
            cameraOutlinePoints.push(new THREE.Vector3(aspectRatioRatio, nearOne, 1));
            cameraOutlinePoints.push(new THREE.Vector3(-aspectRatioRatio, nearOne, 1));
        }
        // View area is proportionally taller than camera
        else {
            cameraOutlinePoints.push(new THREE.Vector3(-nearOne, -1/aspectRatioRatio, 1));
            cameraOutlinePoints.push(new THREE.Vector3(nearOne, -1/aspectRatioRatio, 1));
            cameraOutlinePoints.push(new THREE.Vector3(nearOne, 1/aspectRatioRatio, 1));
            cameraOutlinePoints.push(new THREE.Vector3(-nearOne, 1/aspectRatioRatio, 1));
        }

        // Create frustum buffer geometry from vertex pairs
        const cameraOutlineGeo = new THREE.BufferGeometry().setFromPoints(cameraOutlinePoints);

        const cameraLineLoop = new THREE.LineLoop(cameraOutlineGeo, this.#cameraOutlineMaterial);

        this.#cameraOutlineMaterial.color = this.#views[viewIndex].renderCameraOutlineColor;
        this.#cameraOutlineScene.add(cameraLineLoop);

        renderer.setViewport(0,0,viewContainer.clientWidth,viewContainer.clientHeight);
        renderer.render(this.#cameraOutlineScene, this.#cameraOutlineCamera);

        // Restore old render parameters
        renderer.autoClear = tempAutoClear;
        renderer.setViewport(tempRenderViewport);
    }
}