#include <clipping_planes_pars_vertex>

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vCameraPos;

void main() {
    #include <begin_vertex>
	#include <project_vertex>
    #include <clipping_planes_vertex>

    vWorldPosition = (modelMatrix * vec4(position, 1.0f)).xyz;

    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0f)).xyz);
    
    vCameraPos = cameraPosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
}