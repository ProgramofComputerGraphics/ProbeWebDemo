varying vec3 vNormal;

void main() {
    gl_FragColor = vec4(0.5f*vec3(1.0f - vNormal.x, 1.0f + vNormal.y, 1.0f + vNormal.z), 1.0);

}