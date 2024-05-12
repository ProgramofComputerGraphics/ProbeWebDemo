import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

var views;

// Create variable for representing the currently active view
var activeView = -1;

// Modified from https://threejs.org/examples/webgl_multiple_views
export function initViews(renderDomElement) {
    views = [
        {
            name: "Real World View",
            left: 0,
            bottom: 0.5,
            width: 0.5,
            height: 0.5,
            background: new THREE.Color().setRGB( 0.5, 0.5, 0.7, THREE.SRGBColorSpace ),
            eye: [ 10, 10, 10 ],
            up: [ 0, 1, 0 ],
            fov: 30,
            controllable: true,
            updateCamera: function ( camera, scene, mouseX ) {
                camera.position.x += mouseX * 0.05;
                camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), - 2000 );
                camera.lookAt( scene.position );
            }
        },
        {
            name: "Orthographic View",
            left: 0,
            bottom: 0,
            width: 0.5,
            height: 0.5,
            background: new THREE.Color().setRGB( 0.6, 0.7, 0.7, THREE.SRGBColorSpace ),
            eye: [ -10, 0, 10 ],
            up: [ 0, 1, 0 ],
            fov: "ortho",
            controllable: false,
            updateCamera: function ( camera, scene, mouseX ) {
                camera.position.y -= mouseX * 0.05;
                camera.position.y = Math.max( Math.min( camera.position.y, 1600 ), - 1600 );
                camera.lookAt( scene.position );
            }
        },
        {
            name: "Perspective View",
            left: 0.5,
            bottom: 0.5,
            width: 0.5,
            height: 0.5,
            background: new THREE.Color().setRGB( 0.5, 0.7, 0.7, THREE.SRGBColorSpace ),
            eye: [ 0, 1800, 0 ],
            up: [ 0, 0, 1 ],
            fov: 45,
            controllable: false,
            updateCamera: function ( camera, scene, mouseX ) {
                camera.position.x -= mouseX * 0.05;
                camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), - 2000 );
                camera.lookAt( camera.position.clone().setY( 0 ) );
            }
        },
        {
            name: "Imagespace View",
            left: 0.5,
            bottom: 0,
            width: 0.5,
            height: 0.5,
            background: new THREE.Color().setRGB( 0.7, 0.5, 0.5, THREE.SRGBColorSpace ),
            eye: [ 1400, 800, 1400 ],
            up: [ 0, 1, 0 ],
            fov: 60,
            controllable: true,
            updateCamera: function ( camera, scene, mouseX ) {
                camera.position.y -= mouseX * 0.05;
                camera.position.y = Math.max( Math.min( camera.position.y, 1600 ), - 1600 );
                camera.lookAt( scene.position );
            }
        }
    ];
    
    for (let ii = 0; ii < views.length; ++ ii) {
        const view = views[ii];
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
        camera.lookAt(new THREE.Vector3(0,0,5));
        view.camera = camera;

        if(view.controllable) {
            const controls = new OrbitControls(camera, renderDomElement);
            controls.target = new THREE.Vector3(0,0,5);
            controls.update();
        }
    }
}

export function getViews() {
    return views;
}

export function getActiveView() {
    return activeView;
}

export function setActiveView(viewIndex) {
    if (views == null) {
        throw new Error("Error: Views not initialized!");
    }
    if(viewIndex >= -1 && viewIndex < views.length) {
        activeView = viewIndex;
        return true;
    }
    
    return false;
}

export function getHoveredView(pointer) {
    // TODO: Find a better design pattern than this
    if (views == null) {
        throw new Error("Error: Views not initialized!");
    }

    // Convert pointer from [-1,1] range to [0,1] range
    const zeroOnePointerX = (pointer.x + 1) / 2;
    const zeroOnePointerY = (pointer.y + 1) / 2;

    if (activeView != -1) {
        if(zeroOnePointerX < 0 || zeroOnePointerX >= 1)
            return -1;
        
        if(zeroOnePointerY < 0 || zeroOnePointerY >= 1)
            return -1;

        return activeView;
    }

    // Check each view to see if the pointer position is within the view's window
    for(let i = 0; i < views.length; ++i) {
        const view = views[i];

        if(view.left <= zeroOnePointerX && zeroOnePointerX < view.left + view.width) {
            if(view.bottom <= zeroOnePointerY && zeroOnePointerY < view.bottom + view.height) {
                return i;
            }
        }
    }

    return -1;
}

export function normalizePointerToView(pointer, viewIndex) {
    // TODO: Find a better design pattern than this
    if (views == null) {
        throw new Error("Error: Views not initialized!");
    }
    
    // Throw an exception if the specified view index is not within the bounds of 
    // the view array
    if(viewIndex < 0 || viewIndex >= views.length)
    {
        throw new Error('Specified \'viewIndex\' is out of bounds: ' + viewIndex);
    }

    // If the active view is the specified view, return the same coordinates
    if(activeView == viewIndex)
    {
        return pointer;
    }

    // If an active view is set, and it is not specified view, return null
    if(activeView == viewIndex)
    {
        return null;
    }

    // Otherwise, the position within the specified view's sub-window must be
    // computed.
    
    // Convert pointer from [-1,1] range to [0,1] range
    const zeroOnePointerX = (pointer.x + 1) / 2;
    const zeroOnePointerY = (pointer.y + 1) / 2;
    
    // Get view window properties from the specified view
    const left = views[viewIndex].left;
    const bottom = views[viewIndex].bottom;
    const width = views[viewIndex].width;
    const height = views[viewIndex].height;

    // Normalize pointer within the specified view's sub-window (and convert back
    // to [-1,1] range)
    const newX = (zeroOnePointerX - left) / width * 2 - 1;
    const newY = (zeroOnePointerY - bottom) / height * 2 - 1;
    return new THREE.Vector2(newX, newY);
}

export function updateViewCameras(windowWidth, windowHeight) {
    for (let ii = 0; ii < views.length; ++ ii) {
        const view = views[ii];
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