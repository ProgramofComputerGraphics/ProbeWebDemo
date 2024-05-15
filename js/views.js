import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


export class ViewManager {
    constructor(renderDomElement) {
        
        // Initializes the four views:
        //  - Real World
        //  - Orthographic
        //  - Perspective
        //  - Imagespace
        // Modified from https://threejs.org/examples/webgl_multiple_views
        this.views = [
            {
                name: "Real World View",
                left: 0,
                bottom: 0.5,
                width: 0.5,
                height: 0.5,
                background: new THREE.Color().setRGB( 0.5, 0.5, 0.7, THREE.SRGBColorSpace ),
                eye: [ -10, 10, 10 ],
                up: [ 0, 1, 0 ],
                fov: 30,
                controllable: true,
                imagespace: false,
            },
            {
                name: "Orthographic View",
                left: 0,
                bottom: 0,
                width: 0.5,
                height: 0.5,
                background: new THREE.Color().setRGB( 0.6, 0.7, 0.7, THREE.SRGBColorSpace ),
                eye: [ -10, 0, 5 ],
                up: [ 0, 1, 0 ],
                fov: "ortho",
                controllable: true,
                imagespace: false,
            },
            {
                name: "Perspective View",
                left: 0.5,
                bottom: 0.5,
                width: 0.5,
                height: 0.5,
                background: new THREE.Color().setRGB( 0.5, 0.7, 0.7, THREE.SRGBColorSpace ),
                eye: [ 0, 0, 0 ],
                up: [ 0, 1, 0 ],
                fov: 45,
                controllable: false,
                imagespace: false,
            },
            {
                name: "Imagespace View",
                left: 0.5,
                bottom: 0,
                width: 0.5,
                height: 0.5,
                background: new THREE.Color().setRGB( 0.7, 0.5, 0.5, THREE.SRGBColorSpace ),
                eye: [ -1, 1, 1 ],
                up: [ 0, 1, 0 ],
                fov: 60,
                controllable: true,
                imagespace: true,
            }
        ];

        // Create variable for representing the currently active view
        this.activeView = -1;
        
        for (let ii = 0; ii < this.views.length; ++ii) {
            const view = this.views[ii];
    
            // Create the camera for each view
            var camera;
            if(view.fov == "ortho"){
                camera = new THREE.OrthographicCamera(-1, 11, 6, -6);
                camera.up.fromArray(view.up);
            }
            else{
                camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 1000);
                camera.up.fromArray(view.up);
            }
            camera.position.fromArray(view.eye);
    
            // Define the target for each view
            if(view.imagespace) {
                camera.lookAt(new THREE.Vector3(0,0,0.5));
            }
            else {
                camera.lookAt(new THREE.Vector3(0,0,5))
            };
    
            view.camera = camera;
    
            // Add camera controls to controllable views
            if(view.controllable) {
                const cam_controls = new OrbitControls(camera, renderDomElement);
                cam_controls.target = new THREE.Vector3(0,0,5);
                if(view.fov == "ortho") {
                    cam_controls.enableRotate = false;
                }
                cam_controls.update();
                view.camera_controls = cam_controls;
            }
        }
    }

    getViews() {
        return this.views;
    }

    getActiveView() {
        return this.activeView;
    }

    setActiveView(viewIndex) {
        if (this.views == null) {
            throw new Error("Error: Views not initialized!");
        }
        if(viewIndex >= -1 && viewIndex < this.views.length) {
            this.activeView = viewIndex;
            return true;
        }
        
        return false;
    }

    getHoveredView(pointer) {
        // Convert pointer from [-1,1] range to [0,1] range
        const zeroOnePointerX = (pointer.x + 1) / 2;
        const zeroOnePointerY = (pointer.y + 1) / 2;
    
        if (this.activeView != -1) {
            if(zeroOnePointerX < 0 || zeroOnePointerX >= 1)
                return -1;
            
            if(zeroOnePointerY < 0 || zeroOnePointerY >= 1)
                return -1;
    
            return this.activeView;
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

    normalizePointerToView(pointer, viewIndex) {
        // Throw an exception if the specified view index is not within the bounds of 
        // the view array
        if(viewIndex < 0 || viewIndex >= this.views.length)
        {
            throw new Error('Specified \'viewIndex\' is out of bounds: ' + viewIndex);
        }
    
        // If the active view is the specified view, return the same coordinates
        if(this.activeView == viewIndex)
        {
            return pointer;
        }
    
        // If an active view is set, and it is not specified view, return null
        if(this.activeView != -1)
        {
            return null;
        }
    
        // Otherwise, the position within the specified view's sub-window must be
        // computed.
        
        // Convert pointer from [-1,1] range to [0,1] range
        const zeroOnePointerX = (pointer.x + 1) / 2;
        const zeroOnePointerY = (pointer.y + 1) / 2;
        
        // Get view window properties from the specified view
        const left = this.views[viewIndex].left;
        const bottom = this.views[viewIndex].bottom;
        const width = this.views[viewIndex].width;
        const height = this.views[viewIndex].height;
    
        // Normalize pointer within the specified view's sub-window (and convert back
        // to [-1,1] range)
        const newX = (zeroOnePointerX - left) / width * 2 - 1;
        const newY = (zeroOnePointerY - bottom) / height * 2 - 1;
        return new THREE.Vector2(newX, newY);
    }

    setViewControlsEnabled(viewIndex, enabled) {
        if(viewIndex == -1) {
            return;
        }
        
        const view = this.views[viewIndex];
    
        if(view.controllable)
            view.camera_controls.enabled = enabled;
    }
    
    updateViewCameras(windowWidth, windowHeight) {
        for (let ii = 0; ii < this.views.length; ++ii) {
            const view = this.views[ii];
            const camera = view.camera;

            const aspect = (windowWidth * view.width) / (windowHeight * view.height);

            if(view.fov == "ortho"){
                const centerH = (camera.right + camera.left) / 2;
                
                const hDist = (camera.top - camera.bottom) * aspect;

                camera.left = centerH - hDist / 2;
                camera.right = centerH + hDist / 2;
            }
            else{
                camera.aspect = aspect;
            }
            camera.updateProjectionMatrix();
        }
    }
}