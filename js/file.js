export function loadLocalFile(filePath){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", filePath, false); // The third parameter is 'async', set to false for synchronous request
    xhr.send(null);
    if (xhr.status === 200) {
        return xhr.responseText;
    } 
    else {
        console.log("Request Status:", xhr.statusText);
        throw new Error("Failed to load file: " + filePath);
    }
}

export function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}