
/**
 * Class Point provides methods to express point in different coordinate systems.
 * 
 * Point may have different meanings. Mathematically, this is an object that possesses 2D coordinates. 
 * But semantically objects of this class may be:
 * 1. Points of SVG path for rendering.
 * 2. Stars.
 * 3. Entries of the star catalog (difference from the start are that the entry in the catalog may be distorted and will
 *    not have the same coordinates as real star).
 * 4. Observations of stars.
 * 5. Corners of the detector.
 *
 * To suite this, the following coordinate systems are supported:
 * 1. (xTilde, yTilde): normalized logical coordinates. Range is [0; 1] x [0; 1]. They are used for point construction
 *    only because it's easy to create patterns like latices in these coordinates.
 * 2. (x; y): logical coordinates. Range is [0.5 * (1 - a); 0.5 * (1 + a)] x [0.5 * (1 - a); 0.5 * (1 + a)].
 *    They are used to internally express shapes. These coordinates are actually stored permanently in the point object.
 * 3. (u; v): SVG space coordinates. Range is virtually unlimited. They are used to create SVG path from the shape and
 *    render this path on the SVG surface.
 * 4. (kappa; mu): detector space coordinates. Units are pixels. For the area within the detector, the range is
 *    [kappa0 - 0.5; kappa0 + nCol - 0.5] x [mu0 - 0.5; mu0 - nRow - 0.5], but technically points are not limited by
 *    this range because some of them may and will be outside of the detector. kappa0, mu0, nCol, nRow are taken from
 *    the mission definition.
 * 5. (eta; zeta): FoVRS coordinates. Units are radians. Range is virtually unlimited. They are used as intermediate
 *    coordinate system for transformations.
 * 6. (etaTilde; zetaTilde): normalized FoVRS coordinates. For the area within the detector, the range is
 *    [0; 1] x [0; 1], but technically points are not limited by this range because some of them may and will be outside
 *    of the detector.
 * 7. (etaD; zetaD): distorted FoVRS coordinates. Units are radians. Range is virtually unlimited. These coordinates
 *    express the shape distorted by the given calibration terms.
 * 8. (etaDTilde; zetaDTilde): normalized (etaD; zetaD).
 * 9. (kappaD; muD): projection of (etaD; zetaD) to the detector space.
 * 
 * It must be noted, that we assume identity attitude in the entire DJ Legendre, so FoVRS == ICRS and ICRS is not
 * presented here explicitly. To create a catalog (as a part of data generated for the solver), FoVRS coordinates are
 * used.
 *
 * The above coordinate systems are interconnected via transformations implemented in this class.
 *
 * The transformation chain is as follows (main transformations have dedicated methods in this class):
 * 
 *        (xTilde; yTilde)
 *               ||
 *               ||---scale and shift
 *               \/
 *             (x; y)
 *               ||
 *               ||---denormalize
 *               \/
 *          (kappa; mu)
 *               ||
 *               ||---unproject
 *               \/
 *          (eta; zeta)==========\\
 *               ||               \\
 *               ||---normalize   ||
 *               \/               ||
 *      (etaTilde; zetaTilde)     ||
 *               ||               ||
 *               ||---calibrate---||
 *               ||               //
 *               ||==============//
 *               \/
 *         (etaD; zetaD)=======> catalog
 *             //  \\
 *            //    \\
 *  project---||    ||---normalize
 *            \/    \/
 *  (kappaD; muD)  (etaDTilde; zetaDTilde)
 *        ||                 ||
 * clip---||                 ||---scale and shift
 *        \/                 \/
 *   observation           (u; v)=======> SVG
 */
class Point
{
    /**
     * Point constructor.
     *
     * @param xTilde - normalized logical coordinate xTilde.
     * @param yTilde - normalized logical coordinate yTilde.
     * @param a - range scaling factor.
     */
    constructor(xTilde, yTilde, a)
    {
        // Calculate logical coordinates out of normalized logical coordinates by scale and shift.
        this.x = a * (xTilde - 0.5) + 0.5;
        this.y = a * (yTilde - 0.5) + 0.5;

        // Coordinates cached for the rendering.
        this.etaDTilde = 0.0;
        this.zetaDTilde = 0.0;
    }

    /**
     * Denormalize coordinates bringing them to pixel space of the detector.
     *
     * @param k - kappa coordinate to denormalize.
     * @param m - mu coordinate to denormalize.
     * @param mission - dictionary containing the mission definition.
     * @return denormalized pixel space coordinates.
     */
    denormalize(k, m, mission)
    {
        // This transformation is derived from the formulas 96 and 97 of MB-001.
        return { kappa: k * mission.nCol + mission.kappa0 - 0.5, mu: m * mission.nRow + mission.mu0 - 0.5 };
    }

    /**
     * Extract eta-kappa element from the detector's rotation matrix.
     *
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return eta-kappa element of the given detector's rotation matrix.
     */
    REtaKappa(mission, n)
    {
        return mission.R[n][0];
    }

    /**
     * Extract eta-mu element from the detector's rotation matrix.
     *
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return eta-mu element of the given detector's rotation matrix.
     */
    REtaMu(mission, n)
    {
        return mission.R[n][1];
    }

    /**
     * Extract zeta-kappa element from the detector's rotation matrix.
     *
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return zeta-kappa element of the given detector's rotation matrix.
     */
    RZetaKappa(mission, n)
    {
        return mission.R[n][2];
    }

    /**
     * Extract zeta-mu element from the detector's rotation matrix.
     *
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return zeta-mu element of the given detector's rotation matrix.
     */
    RZetaMu(mission, n)
    {
        return mission.R[n][3];
    }

    /**
     * Unproject pixel coordinates to FoVRS.
     *
     * @param pt - point in pixel space coordinates;
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return FoVRS coordinates.
     */
    unproject(pt, mission, n)
    {
        // This transformation is based on formulas 98 and 99 of MB-001
        // (corresponding to formulas 142 and 143 of WL-007).
        // Here always the zero calibration is used.
        let kappaC = mission.kappa0 + (mission.nCol - 1) / 2.0;
        let muC = mission.mu0 + (mission.nRow - 1) / 2.0;
        let etaN0 = (mission.xC[n] - mission.x0) / mission.F;
        let zetaN0 = (mission.yC[n] - mission.y0) / mission.F;
        let etaN1 = (this.REtaKappa(mission, n) * mission.sY * (pt.kappa - kappaC) +
                     this.REtaMu(mission, n) * mission.sX * (pt.mu - muC)) / mission.F;
        let zetaN1 = (this.RZetaKappa(mission, n) * mission.sY * (pt.kappa - kappaC) +
                      this.RZetaMu(mission, n) * mission.sX * (pt.mu - muC)) / mission.F;
        return { eta: etaN0 + etaN1, zeta: zetaN0 + zetaN1 };
    }

    /**
     * Normalize FoVRS coordinates.
     *
     * @param pt - point in FoVRS coordinates.
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return normalized FoVRS coordinates.
     */
    normalize(pt, mission, n)
    {
        let ptMin = this.unproject(this.denormalize(0.0, 0.0, mission), mission, n);
        let ptMax = this.unproject(this.denormalize(1.0, 1.0, mission), mission, n);
        return {
            etaTilde: (pt.eta - ptMin.eta) / (ptMax.eta - ptMin.eta),
            zetaTilde: (pt.zeta - ptMin.zeta) / (ptMax.zeta - ptMin.zeta)
        };
    }

    /**
     * Apply calibration model to the point.
     *
     * @param calib - calibration model to apply.
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return distorted FoVRS coordinates.
     */
    calibrate(calib, mission, n)
    {
        // This transformation is based on formulas 8 and 9 from MB-001.
        // The calibration model is evaluated on the normalized FoVRS coordinates.
        let kappaMu = this.denormalize(this.x, this.y, mission);
        let etaZeta = this.unproject(kappaMu, mission, n);
        let etaZetaTilde = this.normalize(etaZeta, mission, n);
        let deltaEtaZeta = calib.terms(etaZetaTilde);
        return { eta: etaZeta.eta + deltaEtaZeta.deltaEta, zeta: etaZeta.zeta + deltaEtaZeta.deltaZeta };
    }

    /**
     * Project FoVRS coordinates to the detector pixel space.
     *
     * @param pt - point in FoVRS coordinates.
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     * @return detector pixel space coordinates.
     */
    project(pt, mission, n)
    {
        // This transformation is based on formulas 140 and 141 from WL-007.
        return {
            kappa: mission.kappa0 + (mission.nCol - 1) / 2.0 +
                   (this.REtaKappa(mission, n) * (pt.eta * mission.F - mission.xC[n] + mission.x0) +
                    this.RZetaKappa(mission, n) * (pt.zeta * mission.F - mission.yC[n] + mission.y0)) / mission.sY,
            mu: mission.mu0 + (mission.nRow - 1) / 2.0 +
                (this.REtaMu(mission, n) * (pt.eta * mission.F - mission.xC[n] + mission.x0) +
                 this.RZetaMu(mission, n) * (pt.zeta * mission.F - mission.yC[n] + mission.y0)) / mission.sX
        };
    }

    /**
     * Clip detector pixel space coordinates by the size of the detector.
     *
     * @param pt - point in detector pixel space coordinates.
     * @param mission - dictionary containing the mission definition.
     * @return given point if it is within the detector area or null if it is outside.
     */
    clip(pt, mission)
    {
        let minK = mission.kappa0 - 0.5;
        let minM = mission.mu0 - 0.5;
        return pt.kappa >= minK && pt.kappa <= minK + mission.nCol && pt.mu >= minM && pt.mu <= minM + mission.nRow ?
               pt : null;
    }

    /**
     * Prepare the point for rendering by calculating and caching the normalized FoVRS coordinates.
     *
     * @param calib - calibration model to apply.
     * @param mission - dictionary containing the mission definition.
     * @param n - number of the detector.
     */
    prepare(calib, mission, n)
    {
        let etaZetaD = this.calibrate(calib, mission, n);
        let etaZetaDTilde = this.normalize(etaZetaD, mission, n);
        this.etaDTilde = etaZetaDTilde.etaTilde;
        this.zetaDTilde = etaZetaDTilde.zetaTilde;
    }

    /**
     * Calculate the SVG space coordinates.
     *
     * @param w - width of the SVG surface.
     * @return (u; v) coordinates.
     */
    uv(w)
    {
        let s = w * 0.3;
        let shift = (w - s) / 2.0;
        return { 
            u: this.zetaDTilde * s + shift,
            v: (1.0 - this.etaDTilde) * s + shift
        };
    }

    /**
     * Calculate detector pixel space coordinates of the observation.
     *
     * The logic of this method may look weird. But this is because DJ Legendre implements the model of looking through
     * the particular detector. So it is in principle a single-detector model. This approach is justified by its
     * simplicity and efficiency, so we can use interactive tuning of calibration model with immediate visualization of
     * the results even with the decent number of stars. As indicated in the description of this class, the model starts
     * with (kappa; mu) coordinates, so it is essentially detector-bound. But. At some point we also want to test 4
     * detectors with this tool, when the distortion is shared by all of them. Strictly speaking, we cannot do it in the
     * model implemented here. So it's time for a crutch: we use two missions. The first one is the "default" one that
     * is used all over to create figures of the distortion as seen through one particular detector. The second one is
     * the "current" one that defines a detectors we want to make observations with.
     *
     * @param calib - calibration model to apply.
     * @param defaultMission - dictionary containing the default mission definition. This definition is used to apply
     *        calibration to the point.
     * @param defaultN - number of the default detector. This detector is used in conjunction with the defaultMission to
     *        apply calibration to the point.
     * @param currentMission - dictionary containing the current mission definition. This definition is used to project
     *        the distorted star to the detector creating the actual observation.
     * @param currentN - number of the current detector. This detector is used in conjunction with the currentMission to
     *        create projection
     * @return (kappa; mu) coordinates if the point is within the detector, null if it is outside.
     */
    kappaMu(calib, defaultMission, defaultN, currentMission, currentN)
    {
        let etaZeta = this.calibrate(calib, defaultMission, defaultN);
        let kappaMu = this.project(etaZeta, currentMission, currentN);
        return this.clip(kappaMu, currentMission);
    }

    /**
     * Convert FoVRS coordinates to ICRS.
     *
     * @param fovrs - FoVRS coordinates.
     * @param qa - attitude quaternion.
     * @return ICRS coordinates.
     */
    fovrs2icrs(fovrs, qa)
    {
        let result = [ fovrs.eta, fovrs.zeta ];
        qa.inverse().rotateAngular(result);
        return { alpha: result[0], delta: result[1] };
    }
}
