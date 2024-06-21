import * as THREE from "three"

import { defaults } from "./defaults.js";
import { loadLocalFile } from "./file.js";

const unitY = new THREE.Vector3(0,1,0);

console.log("Root Path:", window.location.pathname);

var fs = require('fs');
var files = fs.readdirSync(window.location.pathname);

console.log("Files:", files);

const fragmentShader = loadLocalFile("./shaders/axisFragmentShader.fs");

export class AxesObject {
    #axesObjectGroup;
    
    constructor(length, colors, flipAxes) {
        if(colors == null){
            colors = [];
            colors.push(new THREE.Vector3(1,0.1,0.1));
            colors.push(new THREE.Vector3(0.1,1,0.1));
            colors.push(new THREE.Vector3(0.1,0.1,1));
        }
        while(colors.length < 3) {
            colors.push(new THREE.Vector3(0.5,0.5,5));
        }

        if(flipAxes == null){
            flipAxes = [];
            flipAxes.push(false);
            flipAxes.push(false); 
            flipAxes.push(true); // Default to negative Z for Don Convention
        }
        while(flipAxes.length < 3){
            flipAxes.push(false);
        }

        // Create overall group
        this.#axesObjectGroup = new THREE.Group();

        // Create X-axis
        let signDir = flipAxes[0] ? -1 : 1;
        const xAxis = this.#createAxisArrow(new THREE.Vector3(signDir,0,0),
                                            length, colors[0]);

        // Create Y-axis
        signDir = flipAxes[1] ? -1 : 1;
        const yAxis = this.#createAxisArrow(new THREE.Vector3(0,signDir,0),
                                            length, colors[1]);

        // Create Z-axis
        signDir = flipAxes[2] ? -1 : 1;
        const zAxis = this.#createAxisArrow(new THREE.Vector3(0,0,signDir),
                                            length, colors[2]);

        // Add axes to overall group
        this.#axesObjectGroup.add(xAxis);
        this.#axesObjectGroup.add(yAxis);
        this.#axesObjectGroup.add(zAxis);

        // Start with default visibility
        this.#axesObjectGroup.visible = defaults.startShowAxes;
    }

    #createAxisArrow(direction, length, color) {
        const lineRadiusToLength = 0.01;
        const headRadiusToLineRadius = 5;
        const headHeightToRadius = 2;

        const lineRad = lineRadiusToLength * length;
        const headRad = headRadiusToLineRadius * lineRad;
        const headHeight = headHeightToRadius * headRad;
        const lineHeight = length - headHeight;

        const axisGroup = new THREE.Group();
        const axisMat = new THREE.ShaderMaterial({fragmentShader: fragmentShader});
        axisMat.uniforms["axisColor"] = {value: color};

        const axisLineGeo = new THREE.CylinderGeometry(lineRad, lineRad,
                                                        lineHeight, 16, 1);
        const axisLineMesh = new THREE.Mesh(axisLineGeo, axisMat);
        axisLineMesh.position.set(0, lineHeight/2, 0);

        const axisLinePoints = [new THREE.Vector3(0,0,0), 
                                new THREE.Vector3(0,lineHeight,0)];
        const axisLinePtGeo = new THREE.BufferGeometry().setFromPoints(axisLinePoints);
        const axisLineLine = new THREE.Line(axisLinePtGeo, axisMat);

        const axisHeadGeo = new THREE.CylinderGeometry(0, headRad, 
                                                        headHeight, 16, 1);
        const axisHeadMesh = new THREE.Mesh(axisHeadGeo, axisMat);
        axisHeadMesh.position.set(0, length - headHeight/2, 0);

        axisGroup.add(axisLineMesh);
        axisGroup.add(axisHeadMesh);
        axisGroup.add(axisLineLine);

        const rotQuat = new THREE.Quaternion().setFromUnitVectors(unitY, 
                                                                direction.normalize());

        axisGroup.applyQuaternion(rotQuat);

        return axisGroup;
    }

    addToScene(scene) {
        scene.add(this.#axesObjectGroup)
    }

    removeFromScene(scene) {
        scene.remove(this.#axesObjectGroup)
    }

    getPosition() {
        return this.#axesObjectGroup.position;
    }

    setPosition(newPos) {
        this.#axesObjectGroup.position.copy(newPos);
    }

    getVisible() {
        return this.#axesObjectGroup.visible;
    }

    setVisible(visible) {
        this.#axesObjectGroup.visible = !!visible;
    }
}
