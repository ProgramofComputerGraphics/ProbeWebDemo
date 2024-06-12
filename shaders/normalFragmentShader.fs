#include <clipping_planes_pars_fragment>

uniform bool imagespace;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
    #include <clipping_planes_fragment>
    
    gl_FragColor = vec4(0.5f*vec3(1.0f + vWorldNormal.x, 
                                      1.0f + vWorldNormal.y, 
                                      1.0f - vWorldNormal.z), 1.0f);
}