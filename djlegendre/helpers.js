
/**
 * Get DOM element by ID.
 *
 * @param id - ID of the element.
 */
function elem(id)
{
    return document.getElementById(id);
}

/**
 * Trigger a file saving of a text file with given data.
 *
 * @param data - data to save.
 * @param fileName - name of file (including the extension).
 */
function saveFile(data, fileName)
{
    let file = new Blob([ data ], { type: "text/plain" });
    let a = document.createElement("a");
    let url = URL.createObjectURL(file);
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

/**
 * Generate Gaussian random using the Box-Muller transform.
 *
 * @return the random value with the normal distribution.
 */
function gaussianRandom(mean = 0.0, stdev = 1.0)
{
    let u = 1 - Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

/**
 * Bring SVG element to the front on the given SVG surface.
 *
 * @param surface - SVG surface to draw on.
 * @param id - ID of the element.
 */
function bringToFront(surface, id)
{
    let el = elem(id);
    el.remove();
    surface.appendChild(el);
}
