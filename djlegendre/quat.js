
/**
 * Class Quaternion provides the quaternion math.
 * The quaternion is represented as q = x * i + y * j + z * k + w.
 */
class Quaternion
{
    /**
     * Quaternion constructor.
     *
     * @param x - first imaginery component.
     * @param y - second imaginary component.
     * @param z - third imagimary component.
     * @param w - real component.
     */
    constructor(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    /**
     * Dump quaternion to string.
     *
     * @return string representation of the quaternion.
     */
    toString()
    {
        return `[${this.x}, ${this.y}, ${this.z}, ${this.w}]`;
    }

    /**
     * Multiply with other quaternion.
     *
     * @param quat - other quaternion.
     * @return Grassman multiplication result.
     */
    mul(quat)
    {
        return new Quaternion(this.x * quat.w + this.y * quat.z - this.z * quat.y + this.w * quat.x,
                              -this.x * quat.z + this.y * quat.w + this.z * quat.x + this.w * quat.y,
                              this.x * quat.y - this.y * quat.x + this.z * quat.w + this.w * quat.z,
                              -this.x * quat.x - this.y * quat.y - this.z * quat.z + this.w * quat.w);
    }

    /**
     * Invert the quaternion.
     *
     * @return inverted quaternion.
     */
    inverse()
    {
        return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }

    /**
     * Rotate a vector in angular coordinates.
     *
     * @param vec - vector in angular coordinates as an array of two numbers. It is changed by this method.
     */
    rotateAngular(vec)
    {
        const cosAlpha = Math.cos(vec[0]);
        const cosDelta = Math.cos(vec[1]);
        const sinAlpha = Math.sin(vec[0]);
        const sinDelta = Math.sin(vec[1]);
        const v = new Quaternion(cosAlpha * cosDelta, sinAlpha * cosDelta, sinDelta, 0.0);
        const r = this.mul(v).mul(this.inverse());
        vec[0] = Math.atan2(r.y, r.x);
        vec[1] = Math.asin(r.z);
    }
}
