
/**
 * The Shape class provides methods to handle shapes: sets of points representing either detector, or stars, or their
 * observations.
 */
class Shape
{
    /**
     * Shape constructor.
     *
     * @param name - name of the shape.
     * @param color - color in HSL model to draw with.
     * @param scale - scaling factor of the shape. 1.0 means the size of the detector.
     */
    constructor(name, color, scale)
    {
        this.name = name;
        this.color = color;
        this.calib = new Calibration();
        this.svg = null;
        this.lines = null;
        this.pointsCount = 0;
        this.scale = scale;
        this.stroke = "stroke-width: 2";
        this.fill = "none";
        this.visible = true;
        this.decoration = null;
        this.center = new Point(0.5, 0.5, scale);
    }

    /**
     * Linear interpolation.
     *
     * @param a - start value.
     * @param b - end value.
     * @param t - transition value.
     * @return linearly interpolated value.
     */
    lerp(a, b, t)
    {
        return a + t * (b - a);
    }

    /**
     * Create line.
     *
     * @param pt1 - starting point.
     * @param pt2 - ending point.
     * @param n - number of points the line consists of.
     * @param phaseNoise - array with phase noise.
     * @param phaseNoiseStart - start index in the phase noise array.
     * @return line of points.
     */
    createLine(pt1, pt2, n, phaseNoise, phaseNoiseStart)
    {
        let result = [];
        --n;
        for (let i = 0; i <= n; ++i) {
            let t = i / n + (phaseNoise ? phaseNoise[phaseNoiseStart + i] : 0.0);
            if (t < 0.0)
                t = 0.0;
            else if (t > 1.0)
                t = 1.0;
            result.push(new Point(this.lerp(pt1.x, pt2.x, t), this.lerp(pt1.y, pt2.y, t), this.scale))
        }
        return result;
    }

    /**
     * Check if the line is a main one or secondary one.
     *
     * @param i - index of the line.
     * @param n - number of the lines.
     * @return true if the line is a main one, false if not.
     */
    isMainLine(i, n)
    {
        return (i == 0) || (i == n - 1) || (i == Math.floor(n / 2));
    }

    /**
     * Create a lattice pattern.
     *
     * @param n - number of points per line in the pattern.
     * @param rows - number of horizontal lines in the pattern.
     * @param cols - number of vertical lines in the pattern.
     * @param phaseNoise - array with phaseNoise.
     * @return lattice-shaped set of lines.
     */
    createLattice(n, rows, cols, phaseNoise)
    {
        const lumaMain = 1.0;
        const lumaSec = 1.8;
        let result = [];
        let phaseNoiseStart = 0;
        for (let i = 0; i < rows; ++i) {
            let y = i / (rows - 1);
            result.push({
                line: this.createLine({ x: 0.0, y: y }, { x: 1.0, y: y }, n, phaseNoise, phaseNoiseStart),
                luma: this.isMainLine(i, rows) ? lumaMain : lumaSec
            });
            phaseNoiseStart += n;
        }
        for (let i = 0; i < cols; ++i) {
            let x = i / (cols - 1);
            result.push({
                line: this.createLine({ x: x, y: 0.0 }, { x: x, y: 1.0 }, n, phaseNoise, phaseNoiseStart),
                luma: this.isMainLine(i, cols) ? lumaMain : lumaSec
            });
            phaseNoiseStart += n;
        }
        return result;
    }

    /**
     * Create SVG node.
     *
     * @param nodeType - type of the node.
     * @param nodeAttrs - set of node attributes.
     * @return SVG node.
     */
    createSVGNode(nodeType, nodeAttrs)
    {
        let result = document.createElementNS("http://www.w3.org/2000/svg", nodeType);
        for (let p in nodeAttrs)
            result.setAttributeNS(null, p, nodeAttrs[p]);
        return result;
    }

    /**
     * Create HSL color attribute for SVG.
     *
     * @param color - base color.
     * @param luma - luminocity factor.
     * @return string attribute representing a color.
     */
    hsl(color, luma)
    {
        return `hsl(${color[0]}, ${color[1]}%, ${color[2] * luma}%)`;
    }

    /**
     * Prepare shape for rendering by creating the pattern and applying the calibration model
     *
     * @param ptCnt - number of points per linr in the pattern.
     * @param rows - number of horizontal lines in the pattern.
     * @param cols - number of vertical lines in the pattern.
     * @param mission - dictionary containing the mission definition.
     * @param phaseNoise - array with phase noise.
     * @param n - number of the detector.
     */
    prepare(ptCnt, rows, cols, mission, phaseNoise, n)
    {
        this.lines = this.createLattice(ptCnt, rows, cols, phaseNoise);
        for (let i = 0, ln = this.lines.length; i < ln; ++i) {
            for (let j = 0, lm = this.lines[i].line.length; j < lm; ++j)
                this.lines[i].line[j].prepare(this.calib, mission, n);
        }

        if (this.decoration)
            this.center.prepare(this.calib, mission, n);
    }

    /**
     * Render shape.
     *
     * @param surface - SVG surface to draw on.
     */
    render(surface)
    {
        this.wipe();

        this.svg = [];

        if (this.visible) {
            const w = 1000.0;
            for (let i = 0, n = this.lines.length; i < n; ++i) {
                let path = "";
                for (let j = 0, m = this.lines[i].line.length; j < m; ++j) {
                    let uv = this.lines[i].line[j].uv(w);
                    path += `${uv.u}, ${uv.v} `;
                }
                let poly = this.createSVGNode("polyline",
                                              { points: path,
                                                fill: "none",
                                                stroke: this.hsl(this.color, this.lines[i].luma),
                                                style: this.stroke });
                this.svg.push(poly);
                surface.appendChild(poly);
            }
            if (this.decoration) {
                let t = this.center.uv(w);
                t.u -= w / 2.0;
                t.v -= w / 2.0;
                this.decoration.setAttribute("transform", `translate(${t.u} ${t.v})`);
                surface.appendChild(this.decoration);
            }
        }
    }

    /**
     * Wipe shape from teh surface.
     */
    wipe()
    {
        if (this.svg) {
            for (let i = 0, n = this.svg.length; i < n; ++i)
                this.svg[i].remove();
        }
        if (this.decoration)
            this.decoration.remove();
    }

    /**
     * Render shape with lines connected and internal area filled.
     *
     * @param surface - SVG surface to draw on.
     */
    renderFilled(surface)
    {
        if (this.svg) {
            for (let i = 0, n = this.svg.length; i < n; ++i)
                this.svg[i].remove();
        }

        this.svg = [];

        const w = 1000.0;
        let path = "";
        for (let i = 0, n = this.lines.length; i < n; ++i) {
            for (let j = 0, m = this.lines[i].line.length; j < m; ++j) {
                let uv = this.lines[i].line[j].uv(w);
                path += `${uv.u}, ${uv.v} `;
            }
        }

        let poly = this.createSVGNode("polyline",
                                      { points: path,
                                        fill: this.fill,
                                        stroke: this.hsl(this.color, 1.0),
                                        style: this.stroke });
        this.svg.push(poly);
        surface.appendChild(poly);
    }

    /**
     * Process the shape by removing the points, which have the same position, and dump all the shape lines to a single
     * array.
     *
     * @return one-dimensional array of unique points.
     */
    flattenRemovingDoubles()
    {
        let result = [];
        for (let i = 0, n = this.lines.length; i < n; ++i) {
            for (let j = 0, m = this.lines[i].line.length; j < m; ++j) {
                let contains = false;
                for (let k = 0, l = result.length; k < l && !contains; ++k) {
                    contains = Math.abs(result[k].x - this.lines[i].line[j].x) < 1.0e-6 &&
                               Math.abs(result[k].y - this.lines[i].line[j].y) < 1.0e-6;
                }
                if (!contains)
                    result.push(this.lines[i].line[j]);
            }
        }
        return result;
    }

    /**
     * Count points of the shape that are within the detector.
     *
     * @param defaultMission - dictionary containing the default mission definition. This definition is used to apply
     *        calibration to the point.
     * @param defaultN - number of the default detector. This detector is used in conjunction with the defaultMission to
     *        apply calibration to the point.
     * @param currentMission - dictionary containing the current mission definition. This definition is used to project
     *        the distorted star to the detector creating the actual observation.
     * @param currentN - number of the current detector. This detector is used in conjunction with the currentMission to
     *        create projection
     * @return number of points within the detector.
     */
    countVisiblePoints(defaultMission, defaultN, currentMission, currentN)
    {
        let exposure = this.flattenRemovingDoubles();
        let result = 0;
        for (let i = 0, m = exposure.length; i < m; ++i) {
            if (exposure[i].kappaMu(this.calib, defaultMission, defaultN, currentMission, currentN))
                ++result;
        }
        return result;
    }

    /**
     * Serialize the shape.
     *
     * @return dictionary describing the shape.
     */
    serialize()
    {
        return {
            name: this.name,
            color: this.color,
            scale: this.scale,
            visible: this.visible,
            calib: this.calib.serialize()
        };
    }

    /**
     * Deserialize the shape.
     *
     * @param dict - dictionary describing the shape.
     */
    deserialize(dict)
    {
        this.name = dict.name;
        this.color = dict.color;
        this.scale = dict.scale;
        this.visible = dict.visible;
        this.calib.deserialize(dict.calib);
    }
}
