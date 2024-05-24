

export function deepCopyMeshOrLine(meshOrLine) {
    const distortedObj = meshOrLine.clone(true);
    distortedObj.geometry = meshOrLine.geometry.clone();
    return distortedObj;
}