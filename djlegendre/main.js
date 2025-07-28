
const VERSION = "1.1";

const DETECTOR_COLOR = [0, 0, 0];
const CATALOG_COLOR = [360, 0, 50];
const EXPOSURE_COLORS = [
    [330, 74, 50],
    [28, 100, 50],
    [120, 100, 40],
    [202, 100, 50],
    [170, 100, 40]
];

var g_missionCMOS2 = null;
var g_missionCMOS0123 = null;
var g_contents = null;
var g_detectors = null;
var g_colorCycle = 0;
var g_phaseNoise = null;


/**
 * Compose a CSV row.
 *
 * @param qa - attitude quaternion.
 * @param expID - number of exposure.
 * @param detID - number of detector.
 * @param obsID - number of observation.
 * @param srcID - number of source corresponding to this observation.
 * @param upsilon - upsilon coordinate of the source.
 * @param rho - rho coordinate of the source.
 * @param kappa - kappa coordinate of the observation.
 * @param mu - mu coordinate of the observation.
 * @return string representation of the CSV row.
 */
function dumpCSVLine(qa, expID, detID, obsID, srcID, upsilon, rho, kappa, mu)
{
    return `${qa}, ${expID}, ${detID}, ${obsID}, ${srcID}, ${upsilon}, ${rho}, ${kappa}, ${mu}\n`;
}

/**
 * Apply the detectors transformation for the given shape to place the detector in the correct position on the focal
 * plane based on the currently activated mode (CMOS2 only or all).
 *
 * @param shape - shape to apply transformation to.
 * @param n - number of the detector to set the transformation for.
 */
function placeDetector(shape, n)
{
    if (elem("cmos2").checked) {
        shape.visible = n == 2;
        shape.calib.eta["00"] = 0.0;
        shape.calib.zeta["00"] = 0.0;
    } else {
        let shiftScale = 1.0 / (g_missionCMOS0123.F * Math.pow(10.0, shape.calib.orderScale[0][1]));
        shape.visible = true;
        shape.calib.eta["00"] = (g_missionCMOS0123.xC[n] - g_missionCMOS0123.x0) * shiftScale;
        shape.calib.zeta["00"] = (g_missionCMOS0123.yC[n] - g_missionCMOS0123.y0) * shiftScale;
    }
}

/**
 * Create the visual representation of detectors.
 */
function createDetectors()
{
    g_detectors = [];
    for (let n = 0; n < 4; ++n) {
        g_detectors.push({
            "background": new Shape("Detector", DETECTOR_COLOR, 1.0),
            "foreground": new Shape("Detector", DETECTOR_COLOR, 1.0)
        });

        g_detectors[n].background.fill = "#FFF";
        g_detectors[n].background.stroke = "stroke-width: 0";

        g_detectors[n].foreground.stroke = "stroke-width: 1; stroke-dasharray: 10,10;";
        g_detectors[n].foreground.decoration = elem(`cmos${n}Axes`);
    }
}

/**
 * Get the current mission.
 *
 * @return current mission.
 */
function currentMission()
{
    return elem("cmos2").checked ? g_missionCMOS2 : g_missionCMOS0123;
}

/**
 * Render object on the SVG surface.
 *
 * @param obj - object to render.
 */
function render(obj)
{
    let surface = elem("surface");

    obj.prepare(Number(elem("srcNum").value),
                Number(elem("rowNum").value),
                Number(elem("colNum").value),
                g_missionCMOS2, g_phaseNoise, 0);
    obj.render(surface);

    for (let n = 0; n < 4; ++n) {
        placeDetector(g_detectors[n].foreground, n);
        g_detectors[n].foreground.prepare(8, 2, 2, g_missionCMOS2, null, 0);
        g_detectors[n].foreground.render(surface);
    }

    if (obj === g_contents.selectedShape()) {
        let mission = currentMission();
        let visSrcCnt = 0;
        for (let n = 0; n < mission.N; ++n)
            visSrcCnt += obj.countVisiblePoints(g_missionCMOS2, 0, mission, n);
        elem("visSrcCnt").innerText = visSrcCnt;
    }

    bringToFront(surface, "fovrsAxes");
}

/// callbacks

/**
 * Callback of updating any of the calibration model settings.
 */
function update()
{
    let shape = g_contents.selectedShape();
    shape.calib.fromGUI();
    render(shape);
}

/**
 * Callback of "Reset all" button click.
 */
function reset()
{
    let shape = g_contents.selectedShape();
    shape.calib.reset();
    shape.calib.toGUI();
    render(shape);
}

/**
 * Update phase noise array. Phase noise is a noise added to the catalog positions along the constellation grid lines.
 * To have an idea, this is a constellation with phase noise level 0:
 *
 *     *    *    *    *
 *
 *     *    *    *    *
 *
 *     *    *    *    *
 *
 *     *    *    *    *
 *
 * And this is with phase noise level non-0:
 *
 *       * *   *    *
 *          *
 *     *  *       *   *
 *
 *         * * *    *
 *
 *      *    *   *   *
 */
function updatePhaseNoise()
{
    let noiseAmp = Number(elem("phaseNoise").value);
    g_phaseNoise = [];
    for (let i = 0, n = Number(elem("srcNum").value) * Number(elem("rowNum").value) * Number(elem("colNum").value);
         i < n; ++i) {
        g_phaseNoise.push((Math.random() * 2.0 - 1.0) * noiseAmp);
    }
}

/**
 * Callback of updating any of the global settings.
 */
function updateAll()
{
    updatePhaseNoise();

    for (let n = 0; n < 4; ++n) {
        placeDetector(g_detectors[n].background, n);
        g_detectors[n].background.prepare(8, 2, 2, g_missionCMOS2, null, 0);
        g_detectors[n].background.renderFilled(surface);
    }

    for (let i = 0, n = g_contents.shapesCount(); i < n; ++i) {
        if (g_contents.shape(i) != g_contents.selectedShape())
            render(g_contents.shape(i));
    }

    render(g_contents.selectedShape());

    elem("srcCnt").innerText = g_contents.shape(0).flattenRemovingDoubles().length;
}

/**
 * Callback of "Add exposure" button click.
 */
function addExposure()
{
    let expID = g_contents.shapesCount();
    let shape = new Shape(`Exposure ${expID}`, EXPOSURE_COLORS[(g_colorCycle++) % EXPOSURE_COLORS.length], 3.0);
    g_contents.addShape(shape);
    shape.calib.toGUI();
    elem("removeExposure").disabled = shape === g_contents.shape(0);
    render(shape);
}

/**
 * Callback of "Copy exposure" button click.
 */
function copyExposure()
{
    let expID = g_contents.shapesCount();
    let shape = new Shape(`Exposure ${expID}`, EXPOSURE_COLORS[(g_colorCycle++) % EXPOSURE_COLORS.length], 3.0);
    shape.calib.deserialize(structuredClone(g_contents.selectedShape().calib.serialize()));
    g_contents.addShape(shape);
    shape.calib.toGUI();
    elem("removeExposure").disabled = shape === g_contents.shape(0);
    render(shape);
}

/**
 * Callback of "Remove exposure" button click.
 */
function removeExposure()
{
    let index = g_contents.selectedShapeIndex();
    g_contents.removeShape(index);
    for (let i = 1, n = g_contents.shapesCount(); i < n; ++i)
        g_contents.renameShape(i, `Exposure ${i}`);
    g_contents.selectShape(index - 1);
}

/**
 * Callback of switching the shape.
 */
function switchShape()
{
    let shape = g_contents.selectedShape()
    shape.calib.toGUI();
    elem("removeExposure").disabled = shape === g_contents.shape(0);
    render(shape);
}

/**
 * Callback of "Export data" button click.
 */
function exportData()
{
    let fileName = prompt("Enter name of file to export", "djlegendre-observations.csv");
    if (!fileName)
        return;

    let data = "\nAttitude, ExposureID, DetectorID, ObservationID, SourceID, Upsilon, Rho, Kappa, Mu\n";

    const qa = new Quaternion(0.0, 0.0, 0.0, 1.0);

    let catalog = [];
    let sources = g_contents.shape(0).flattenRemovingDoubles();
    for (let i = 0, n = sources.length; i < n; ++i)
        catalog.push(sources[i].fovrs2icrs(sources[i].calibrate(g_contents.shape(0).calib, g_missionCMOS2, 0), qa));

    let mission = currentMission();

    let calibData = [];

    let srcID = 0;
    let obsID = 0;
    let shift = Number(elem("pixelShift").value);
    let noise = Number(elem("pixelNoise").value);
    for (let i = 1, shCnt = g_contents.shapesCount(); i < shCnt; ++i) {
        let exposure = g_contents.shape(i).flattenRemovingDoubles();
        let angle = (i - 1) / (shCnt - 1) * 2.0 * Math.PI;
        let shX = shift * Math.cos(angle);
        let shY = shift * Math.sin(angle);
        calibData.push(g_contents.shape(i).calib.data());
        for (let n = 0; n < mission.N; ++n) {
            for (let j = 0, obsCnt = exposure.length; j < obsCnt; ++j) {
                let kappaMu = exposure[j].kappaMu(g_contents.shape(i).calib, g_missionCMOS2, 0, mission, n);
                if (kappaMu) {
                    if (catalog[j].srcID === undefined)
                        catalog[j].srcID = ++srcID;
                    data += dumpCSVLine(qa, i, n + 1, ++obsID, catalog[j].srcID,
                                        catalog[j].alpha, catalog[j].delta,
                                        kappaMu.kappa + shX + noise * gaussianRandom(),
                                        kappaMu.mu + shY + noise * gaussianRandom());
                }
            }
        }
    }

    mission.L = obsID;
    mission.Lambda = srcID;

    data = JSON.stringify({ Mission: mission, Calibration: calibData }) + data;

    saveFile(data, fileName);
}

/**
 * Callback of "Export image" button click.
 */
function exportImage()
{
    let fileName = prompt("Enter name of image to save", "djlegendre-image.svg");
    if (!fileName)
        return;

    saveFile(elem("surfaceHolder").innerHTML, fileName);
}

/**
 * Save project callback.
 */
function save()
{
    let fileName = prompt("Enter name of file to save", "djlegendre-project.json");
    if (!fileName)
        return;

    let project = {
        version: VERSION,
        rowNum: Number(elem("rowNum").value),
        colNum: Number(elem("colNum").value),
        srcNum: Number(elem("srcNum").value),
        pixelShift: Number(elem("pixelShift").value),
        pixelNoise: Number(elem("pixelNoise").value),
        phaseNoise: Number(elem("phaseNoise").value),
        cmos2: elem("cmos2").checked,
        colorCycle: g_colorCycle,
        contents: g_contents.serialize()
    };

    saveFile(JSON.stringify(project), fileName);
}

/**
 * Load project callback.
 */
function load()
{
    let element = document.createElement("input");
    element.setAttribute("type", "file");
    element.addEventListener("change", () => {
        var reader = new FileReader();
        reader.onload = (e) => {
            let project = JSON.parse(e.target.result);
            if (project.version !== VERSION)
                alert(`Loading failed: version mismatch. The project being loaded was created in DJ Legendre version ${project.version}, while current version is ${VERSION}.`);
            else {
                elem("rowNum").value = project.rowNum;
                elem("colNum").value = project.colNum;
                elem("srcNum").value = project.srcNum;
                elem("pixelShift").value = project.pixelShift;
                elem("pixelNoise").value = project.pixelNoise;
                elem("phaseNoise").value = project.phaseNoise;
                elem("cmos2").checked = project.cmos2;
                elem("cmos0123").checked = !project.cmos2;
                g_colorCycle = project.colorCycle;
                g_contents.deserialize(project.contents);
                g_contents.selectedShape().calib.toGUI();
                elem("removeExposure").disabled = g_contents.selectedShapeIndex() === 0;
                updateAll();
            }
        };
        reader.readAsText(element.files[0]);
    }, false);
    element.click();
}

/**
 * Main script function.
 */
function main()
{
    g_missionCMOS2 = {
        N: 1,
        nCol: 1952,
        nRow: 1952,
        sX: 1.0E-5,
        sY: 1.0E-5,
        F: 4.3704,
        kappa0: 8,
        mu0: 8,
        xC: [ 0.0 ],
        yC: [ 0.0 ],
        x0: 0.0,
        y0: 0.0,
        R: [ [ 0.0, 1.0, -1.0, 0.0 ] ],
        A: 2,
        L: 0, // Will be determined by generation.
        Tc: 1837209600000,
        Lambda: 0, // Will be determined by generation.
        q_j: [ 0.0, 0.0, 0.0, 1.0 ]
    };

    g_missionCMOS0123 = {
        N: 4,
        nCol: 1952,
        nRow: 1952,
        sX: 1.0E-5,
        sY: 1.0E-5,
        F: 4.3704,
        kappa0: 8,
        mu0: 8,
        xC: [ +11.40 * 1.E-3, +11.40 * 1.E-3, -11.40 * 1.E-3, -11.40 * 1.E-3 ],
        yC: [ +11.40 * 1.E-3, -11.40 * 1.E-3, +11.40 * 1.E-3, -11.40 * 1.E-3 ],
        x0: 0.0,
        y0: 0.0,
        R: [ [-1.0, 0.0, 0.0, -1.0], [0.0, -1.0, 1.0, 0.0], [ 0.0, 1.0, -1.0, 0.0 ], [1.0, 0.0, 0.0, 1.0] ],
        A: 2,
        L: 0, // Will be determined by generation.
        Tc: 1837209600000,
        Lambda: 0, // Will be determined by generation.
        q_j: [ 0.0, 0.0, 0.0, 1.0 ]
    };

    let h = (260.0 / window.innerHeight) * 100.0;

    Split(["#splitLeftPane", "#splitRightPane"], { minSize: [ 580, 600 ], sizes: [ 5, 95 ], expandToMin: true });
    Split(["#splitTopPane", "#splitBottomPane"], { direction: "vertical", minSize: [ 300, 0 ], sizes: [ 100.0 - h, h ] });

    createDetectors();

    g_contents = new ShapeList(elem("contents"), switchShape, updateAll);

    let catalog = new Shape("Catalog", CATALOG_COLOR, 3.0);
    g_contents.addShape(catalog)
    catalog.calib.composeGUI();

    updateAll();
}
