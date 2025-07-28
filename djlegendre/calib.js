
/**
 * The Calibration class provides everything related to the calibration model.
 */
class Calibration
{
    /**
     * Calibration model constructor.
     */
    constructor()
    {
        this.HIGHEST_ORDER = 5;
        // Orders are scaled like orderScale[order][0] * 10^orderScale[order][1].
        this.orderScale = [ [1, -2], [2, -3], [6, -4], [1.5, -4], [3, -5], [6, -6] ];
        this.psi = {};
        this.eta = {};
        this.zeta = {};
        this.reset();
    }

    /**
     * Create order scale changer.
     *
     * @param o - order.
     * @return string representing the DOM element of order scale changer/
     */
    createOrderScaleChanger(o)
    {
        let result =
        `
        <input id="order${o}scale" class="shortnuminput"
               type="number"
               min="1" max="12" value="${-this.orderScale[o][1]}" step="1"
               oninput="update();"
        />
        `;
        return result;
    }

    /**
     * Create a skeleton for the UI of calibration parameters.
     *
     * @param panel - div where to append the control elements.
     */
    createaControlSkeleton(panel)
    {
        panel.innerHTML =
        `
        <h3>Order 0 <span class="scale">scaled by 10<sup>–${this.createOrderScaleChanger(0)}<span></sup></span></h3>
        <div class="panel-l" id="order0-1"></div>

        <h3>Order 1 <span class="scale">scaled by 10<sup>–${this.createOrderScaleChanger(1)}<span></sup></span></h3>
        <div class="panel-l large-gap">
            <div class="panel-l" id="order1-1"></div>
            <div class="panel-l" id="order1-2"></div>
        </div>

        <h3>Order 2 <span class="scale">scaled by 10<sup>–${this.createOrderScaleChanger(2)}<span></sup></span></h3>
        <div class="panel-l large-gap">
            <div class="panel-l" id="order2-1"></div>
            <div class="panel-l" id="order2-2"></div>
            <div class="panel-l" id="order2-3"></div>
        </div>

        <h3>Order 3 <span class="scale">scaled by 10<sup>–${this.createOrderScaleChanger(3)}<span></sup></span></h3>
        <div class="panel-l large-gap">
            <div class="panel-l" id="order3-1"></div>
            <div class="panel-l" id="order3-2"></div>
            <div class="panel-l" id="order3-3"></div>
            <div class="panel-l" id="order3-4"></div>
        </div>

        <h3>Order 4 <span class="scale">scaled by 10<sup>–${this.createOrderScaleChanger(4)}<span></sup></span></h3>
        <div class="panel-l large-gap">
            <div class="panel-l" id="order4-1"></div>
            <div class="panel-l" id="order4-2"></div>
            <div class="panel-l" id="order4-3"></div>
            <div class="panel-l" id="order4-4"></div>
            <div class="panel-l" id="order4-5"></div>
        </div>

        <h3>Order 5 <span class="scale">scaled by 10<sup>–${this.createOrderScaleChanger(5)}<span></sup></span></h3>
        <div class="panel-l large-gap">
            <div class="panel-l" id="order5-1"></div>
            <div class="panel-l" id="order5-2"></div>
            <div class="panel-l" id="order5-3"></div>
            <div class="panel-l" id="order5-4"></div>
            <div class="panel-l" id="order5-5"></div>
            <div class="panel-l" id="order5-6"></div>
        </div>
        `;
    }

    /**
     * Create control panel for individual pair of model parameters.
     *
     * @param panel - div where to append the control elements.
     * @param rs - string identifying the order of the parameters.
     * @param q - value defining the slider range to be in [-q; q] with a step q/100.
     */
    createControlItem(panel, rs, q)
    {
        panel.innerHTML =
        `
        <div>
            <input id="psi${rs}" type="checkbox" checked onchange="update();"/>
            Ψ<sub>${rs}</sub>
        </div>
        <div class="panel-s">
            <div class="panel-l">
                <button onclick="elem('eta${rs}').value = elem('eta${rs}num').value = 0.0; update();">Reset</button>
                <input id="eta${rs}" type="range" min="${-q}" max="${q}" value="0" step="${q * 0.01}" class="slider" oninput="elem('eta${rs}num').value = elem('eta${rs}').value; update();"/>
                <div class="panel-e slider-label">
                    <div>Δη<sub>${rs}</sub> = </div>
                    <div><input id="eta${rs}num" type="number" min="${-q}" max="${q}" value="0" step="${q * 0.01}" class="numinput" oninput="elem('eta${rs}').value = elem('eta${rs}num').value; update();"/></div>
                </div>
            </div>
            <div class="panel-l">
                <button onclick="elem('zeta${rs}').value = elem('zeta${rs}num').value = 0.0; update();">Reset</button>
                <input id="zeta${rs}" type="range" min="${-q}" max="${q}" value="0" step="${q * 0.01}" class="slider" oninput="elem('zeta${rs}num').value = elem('zeta${rs}').value; update();"/>
                <div class="panel-e slider-label">
                    <div>Δζ<sub>${rs}</sub> = </div>
                    <div><input id="zeta${rs}num" type="number" min="${-q}" max="${q}" value="0" step="${q * 0.01}" class="numinput" oninput="elem('zeta${rs}').value = elem('zeta${rs}num').value; update();"/></div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Create GUI for the calibration model. The GUI is not directly linked to the model instance, you have to manually
     * sync them via `toGUI` and `fromGUI` methods. This allows you to have the same GUI for different model instances.
     * The main program must provide a globally available method `update`, in which the sync of the program internal
     * state with the GUI should happen.
     */
    composeGUI()
    {
        this.createaControlSkeleton(elem("skeleton"));
        for (let o = 0; o <= this.HIGHEST_ORDER; ++o) {
            for (let s = 0; s <= o; ++s) {
                let r = o - s;
                let rs = `${r}${s}`;
                this.createControlItem(elem(`order${o}-${s + 1}`), rs, this.orderScale[o][0]);
            }
        }
    }

    /**
     * Update the GUI so that it reflects the state of this calibration model instance. This method should be used only
     * after GUI was been created with `composeGUI`.
     */
    toGUI()
    {
        for (let o = 0; o <= this.HIGHEST_ORDER; ++o) {
            for (let s = 0; s <= o; ++s) {
                let r = o - s;
                let rs = `${r}${s}`;
                elem(`order${o}scale`).value = -this.orderScale[o][1];
                elem(`psi${rs}`).checked = this.psi[rs];
                elem(`eta${rs}`).value = elem(`eta${rs}num`).value = this.eta[rs];
                elem(`zeta${rs}`).value = elem(`zeta${rs}num`).value = this.zeta[rs];
            }
        }
    }

    /**
     * Update the calibration model instance so that it gets the state of the GUI. This method should be used only after
     * GUI was been created with `composeGUI`.
     */
    fromGUI()
    {
        for (let o = 0; o <= this.HIGHEST_ORDER; ++o) {
            for (let s = 0; s <= o; ++s) {
                let r = o - s;
                let rs = `${r}${s}`;
                this.orderScale[o][1] = -elem(`order${o}scale`).value;
                this.psi[rs] = elem(`psi${rs}`).checked;
                this.eta[rs] = elem(`eta${rs}num`).value;
                this.zeta[rs] = elem(`zeta${rs}num`).value;
            }
        }
    }

    /**
     * Reset the calibration model parameters to defaults.
     */
    reset()
    {
        for (let o = 0; o <= this.HIGHEST_ORDER; ++o) {
            for (let s = 0; s <= o; ++s) {
                let r = o - s;
                let rs = `${r}${s}`;
                this.psi[rs] = true;
                this.eta[rs] = 0.0;
                this.zeta[rs] = 0.0;
            }
        }
    }

    /**
     * Calculate Legendre polynomial.
     *
     * @param o - order of the polynomial.
     * @param x - value to calculate the polynomial for.
     * @return value of Legendre polynomial.
     */
    L(o, x)
    {
        x -= 0.5;
        switch (o) {
            case 0:
                return 1.0;

            case 1:
                return 2.0 * x;

            case 2:
                return 6.0 * x * x - 0.5;

            case 3:
                return 20.0 * x * x * x - 3.0 * x;

            case 4:
                return 70.0 * x * x * x * x - 15.0 * x * x + 3.0 / 8.0;

            case 5:
                return 252.0 * x * x * x * x * x - 70.0 * x * x * x + 15.0 / 4.0 * x;

            default:
                return 0.0;
        }
    }

    /**
     * Calculate (deltaEta; deltaZeta) calibration terms for (eta; zeta) FoVRS coordinates.
     *
     * @param pt - (etaTilde; zetaTilde) normalized FoVRS coordinates to evaluate calibration terms for.
     * @return calibration terms for FoVRS coordinates.
     */
    terms(pt)
    {
        let result = { deltaEta: 0.0, deltaZeta: 0.0 };
        for (let o = 0; o <= this.HIGHEST_ORDER; ++o) {
            let os = Math.pow(10.0, this.orderScale[o][1]);
            for (let s = 0; s <= o; ++s) {
                let r = o - s;
                let rs = `${r}${s}`;
                if (this.psi[rs]) {
                    // Normally, the calibration is evaluated on kappaTilde, muTilde.
                    // Here, for simplicity of calculations, we evaluate it on etaTilde, zetaTilde.
                    // Since we model the view of CMOS-2, and its rotation matrix is
                    //  0 1
                    // -1 0
                    // its kappa axis corresponds to -zeta axis, and mu corresponds to eta.
                    // So, the Psi function gets evaluated on (zetaTilde, etaTilde) to keep the axes koherence.
                    let Psi = this.L(r, pt.zetaTilde) * this.L(s, pt.etaTilde);
                    result.deltaEta += this.eta[rs] * Psi * os;
                    result.deltaZeta += this.zeta[rs] * Psi * os;
                }
            }
        }
        return result;
    }

    /**
     * Get calibration model data as a dictionary.
     *
     * @return dictionary representing coefficients of all the calibration orders.
     */
    data()
    {
        let result = [];
        for (let o = 0; o <= this.HIGHEST_ORDER; ++o) {
            let os = Math.pow(10.0, this.orderScale[o][1]);
            let order = {};
            for (let s = 0; s <= o; ++s) {
                let r = o - s;
                let rs = `${r}${s}`;
                if (this.psi[rs]) {
                    order[`eta${rs}`] = this.eta[rs] * os;
                    order[`zeta${rs}`] = this.zeta[rs] * os;
                } else {
                    order[`eta${rs}`] = 0.0;
                    order[`zeta${rs}`] = 0.0;
                }
            }
            result.push(order);
        }
        return result;
    }

    /**
     * Serialize the calibration model.
     *
     * @return dictionary representing the calibration model.
     */
    serialize()
    {
        return {
            orderScale: this.orderScale,
            psi: this.psi,
            eta: this.eta,
            zeta: this.zeta
        };
    }

    /**
     * Deserialize the calibration model.
     *
     * @param dict - dictionary with the calibration model.
     */
    deserialize(dict)
    {
        this.orderScale = dict.orderScale;
        this.psi = dict.psi;
        this.eta = dict.eta;
        this.zeta = dict.zeta;
    }
}
