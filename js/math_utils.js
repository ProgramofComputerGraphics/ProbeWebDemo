import * as THREE from 'three';

export const flipZ = new THREE.Matrix4(); 
flipZ.set( 1, 0, 0, 0, 
	   0, 1, 0, 0,
	   0, 0, -1, 0, 
	   0, 0, 0, 1 );