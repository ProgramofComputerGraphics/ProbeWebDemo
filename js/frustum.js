import * as THREE from 'three';

const frustumSideLineMaterial = new THREE.LineBasicMaterial({color : 0xa0a0a0});
const nearPlaneLineMaterial = new THREE.LineBasicMaterial({color : 0x4040e0});
const farPlaneLineMaterial = new THREE.LineBasicMaterial({color : 0xe04040});


// class Frustum {

// }


export function generateRealFrustumSideLines(fov, near, far) {
    // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
    // Note: Because we assume a square frustum, this slope is the same for both
    // X and Y. Also note that the angle is divided by two, which is why there is
    // a division by 360 instead of 180.
    const frustumSlope = Math.tan(fov * Math.PI / 360);

    // Compute the X/Y Distance from the center of the frustum to the inner
    // corners. This value is used to create the near-plane frustum vertices. 
    const frustumNearXandY = frustumSlope * near;

    // Compute the X/Y Distance from the center of the frustum to the outer
    // corners. This value is used to create the far-plane frustum vertices. 
    const frustumFarXandY = frustumSlope * far;

    // Create frustum line vertex pairs
    const frustumPoints = [];

    // These vertices define the truncated pyramid line for the bottom-
    // left corner of the frustum.
    frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                         -frustumNearXandY,
                                         near));
    frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                         -frustumFarXandY,
                                         far));

    // These vertices define the truncated pyramid line for the bottom-
    // right corner of the frustum
    frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                         -frustumNearXandY,
                                         near));
    frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                         -frustumFarXandY,
                                         far));
    
    // These vertices define the truncated pyramid line for the top-
    // left corner of the frustum.
    frustumPoints.push(new THREE.Vector3(-frustumNearXandY,
                                         frustumNearXandY,
                                         near));
    frustumPoints.push(new THREE.Vector3(-frustumFarXandY,
                                         frustumFarXandY,
                                         far));                                             

    // These vertices define the truncated pyramid line for the top-
    // right corner of the frustum.
    frustumPoints.push(new THREE.Vector3(frustumNearXandY,
                                         frustumNearXandY,
                                         near));
    frustumPoints.push(new THREE.Vector3(frustumFarXandY,
                                         frustumFarXandY,
                                         far)); 

    // Create frustum buffer geometry from vertex pairs
    const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);

    // Create frustum line geometry
    return new THREE.LineSegments(frustumGeo, frustumSideLineMaterial); 
}

export function generateRealFrustumTipLines(fov, near) {
    // Compute "slope" of the frustum pyramid (change in X/Y over change in Z)
    // Note: Because we assume a square frustum, this slope is the same for both
    // X and Y. Also note that the angle is divided by two, which is why there is
    // a division by 360 instead of 180.
    const frustumSlope = Math.tan(fov * Math.PI / 360);

    // Compute the X/Y Distance from the center of the frustum to the inner
    // corners. This value is used to create the near-plane frustum vertices. 
    const frustumNearXandY = frustumSlope * near;

    // Create frustum line vertex pairs
    const frustumTipPoints = [];

    // These vertices define the pyramid tip line for the bottom-
    // left corner of the frustum.
    frustumTipPoints.push(new THREE.Vector3(0,0,0));
    frustumTipPoints.push(new THREE.Vector3(-frustumNearXandY,
                                            -frustumNearXandY,
                                            near));

    // These vertices define the pyramid tip line for the bottom-
    // right corner of the frustum
    frustumTipPoints.push(new THREE.Vector3(0,0,0));
    frustumTipPoints.push(new THREE.Vector3(frustumNearXandY,
                                            -frustumNearXandY,
                                            near));
    
    // These vertices define the pyramid tip line for the top-
    // left corner of the frustum.
    frustumTipPoints.push(new THREE.Vector3(0,0,0));
    frustumTipPoints.push(new THREE.Vector3(-frustumNearXandY,
                                            frustumNearXandY,
                                            near));                                             

    // These vertices define the pyramid tip line for the top-
    // right corner of the frustum.
    frustumTipPoints.push(new THREE.Vector3(0,0,0));
    frustumTipPoints.push(new THREE.Vector3(frustumNearXandY,
                                            frustumNearXandY,
                                            near));

    // Create frustum buffer geometry from vertex pairs
    const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumTipPoints);

    // Create frustum line geometry
    return new THREE.LineSegments(frustumGeo, frustumSideLineMaterial); 
}

export function generateImageFrustumSideLines() {
    // Create frustum line vertex pairs
    const frustumPoints = [];

    // These vertices define the bottom-left half-cube line
    frustumPoints.push(new THREE.Vector3(-1,-1,0));
    frustumPoints.push(new THREE.Vector3(-1,-1,1));

    // These vertices define the bottom-right half-cube line
    frustumPoints.push(new THREE.Vector3(1,-1,0));
    frustumPoints.push(new THREE.Vector3(1,-1,1));
    
    /// These vertices define the top-left half-cube line
    frustumPoints.push(new THREE.Vector3(-1,1,0));
    frustumPoints.push(new THREE.Vector3(-1,1,1));                                           

    // These vertices define the top-right half-cube line
    frustumPoints.push(new THREE.Vector3(1,1,0));
    frustumPoints.push(new THREE.Vector3(1,1,1)); 

    // Create frustum buffer geometry from vertex pairs
    const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);

    // Create frustum line geometry
    return new THREE.LineSegments(frustumGeo, frustumSideLineMaterial); 
}

export function generateImageFrustumNearLines() {
    // Create frustum line vertex pairs
    const frustumPoints = [];

    // These vertices define the bottom near-plane line
    frustumPoints.push(new THREE.Vector3(-1,-1,0));
    frustumPoints.push(new THREE.Vector3(1,-1,0));

    // These vertices define the right near-plane line
    frustumPoints.push(new THREE.Vector3(1,-1,0));
    frustumPoints.push(new THREE.Vector3(1,1,0));
    
    /// These vertices define the top near-plane line
    frustumPoints.push(new THREE.Vector3(1,1,0));
    frustumPoints.push(new THREE.Vector3(-1,1,0));                                           

    // These vertices define the left near-plane line
    frustumPoints.push(new THREE.Vector3(-1,1,0));
    frustumPoints.push(new THREE.Vector3(-1,-1,0)); 

    // Create frustum buffer geometry from vertex pairs
    const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);

    // Create frustum line geometry
    return new THREE.LineSegments(frustumGeo, nearPlaneLineMaterial); 
}

export function generateImageFrustumFarLines() {
    // Create frustum line vertex pairs
    const frustumPoints = [];

    // These vertices define the bottom far-plane line
    frustumPoints.push(new THREE.Vector3(-1,-1,1));
    frustumPoints.push(new THREE.Vector3(1,-1,1));

    // These vertices define the right far-plane line
    frustumPoints.push(new THREE.Vector3(1,-1,1));
    frustumPoints.push(new THREE.Vector3(1,1,1));
    
    /// These vertices define the top far-plane line
    frustumPoints.push(new THREE.Vector3(1,1,1));
    frustumPoints.push(new THREE.Vector3(-1,1,1));                                           

    // These vertices define the left far-plane line
    frustumPoints.push(new THREE.Vector3(-1,1,1));
    frustumPoints.push(new THREE.Vector3(-1,-1,1)); 

    // Create frustum buffer geometry from vertex pairs
    const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);

    // Create frustum line geometry
    return new THREE.LineSegments(frustumGeo, farPlaneLineMaterial); 
}

export function generateImageFrustumClippingPlanes() {
    const epsilon = 0.001;
    const onePlusEpsilon = 1 + epsilon;
    
    const clippingPlanes = [];

    // Left-side plane
    clippingPlanes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), onePlusEpsilon));
    
    // Right-side plane
    clippingPlanes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), onePlusEpsilon));

    // Bottom-side plane
    clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), onePlusEpsilon));

    // Top-side plane
    clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), onePlusEpsilon));

    // Near plane
    clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), epsilon));

    // Far plane
    clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), onePlusEpsilon));

    return clippingPlanes;
}