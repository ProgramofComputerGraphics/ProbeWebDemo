varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vCameraPos;

void main() {
    vPosition = position;
    // vNormal = (modelMatrix * vec4(normal, 1.0)).xyz;
    vNormal = normal;
    vCameraPos = cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}