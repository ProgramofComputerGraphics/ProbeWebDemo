uniform vec3 axisColor;

void main(){
    gl_FragColor = vec4(axisColor.xyz, 1.0f);
}