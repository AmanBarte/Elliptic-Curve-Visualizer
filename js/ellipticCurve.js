// Represents an elliptic curve defined by y^2 = x^3 + ax + b
class EllipticCurve {
    constructor(a, b) {
        this.a = a;
        this.b = b;

        // Calculate the discriminant: Δ = -16 * (4a^3 + 27b^2)
        // The curve is non-singular (smooth) if Δ != 0
        this.discriminant = -16 * (4 * Math.pow(this.a, 3) + 27 * Math.pow(this.b, 2));

        if (Math.abs(this.discriminant) < 1e-9) {
             console.warn(`Warning: Curve might be singular (Discriminant Δ ≈ ${this.discriminant.toFixed(4)})`);
        }
    }

    // Check if a given point lies on the curve
    isPointOnCurve(point) {
        if (point.isInfinity()) {
            return true; // Point at infinity is always on the curve
        }

        const ySquared = Math.pow(point.y, 2);
        const xCubedAxB = Math.pow(point.x, 3) + this.a * point.x + this.b;

        // Use tolerance for floating point comparison
        const tolerance = 1e-6; // Slightly larger tolerance for calculation results
        return Math.abs(ySquared - xCubedAxB) < tolerance;
    }

    // Calculate the possible y-coordinates for a given x-coordinate
    // Returns an array [y1, y2] or [] if x is invalid
    getY(x) {
        const ySquared = Math.pow(x, 3) + this.a * x + this.b;
        if (ySquared < 0) {
            return []; // No real solutions for y
        }
        if (Math.abs(ySquared) < 1e-9) {
            return [0]; // Tangent at y=0
        }
        const y = Math.sqrt(ySquared);
        return [y, -y];
    }

     // Get the negation of a point ON THIS CURVE
     negatePoint(point) {
        if (point.isInfinity()) {
            return POINT_INFINITY;
        }
        // Although the Point class has negate, this ensures context
        return new Point(point.x, -point.y);
    }
}