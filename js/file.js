export function loadFile(filePath){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", filePath, false); // The third parameter is 'async', set to false for synchronous request
    xhr.send(null);
    if (xhr.status === 200) {
        return xhr.responseText;
    } 
    else {
        throw new Error("Failed to load file: " + filePath);
    }
}