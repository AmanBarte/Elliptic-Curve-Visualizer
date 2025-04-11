// Represents a point on an elliptic curve or the point at infinity (O)
class Point {
    constructor(x, y) {
        // Point at Infinity (represented by null coordinates)
        if (x === null || y === null || x === undefined || y === undefined) {
            this.x = null;
            this.y = null;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    // Check if this point is the point at infinity
    isInfinity() {
        return this.x === null || this.y === null;
    }

    // Check if two points are equal
    equals(otherPoint) {
        if (this.isInfinity() && otherPoint.isInfinity()) {
            return true;
        }
        if (this.isInfinity() || otherPoint.isInfinity()) {
            return false;
        }
        // Use a small tolerance for floating point comparison
        const tolerance = 1e-9;
        return Math.abs(this.x - otherPoint.x) < tolerance &&
               Math.abs(this.y - otherPoint.y) < tolerance;
    }

    // Get the negation of the point (reflection across the x-axis)
    negate() {
        if (this.isInfinity()) {
            return this; // O negated is O
        }
        return new Point(this.x, -this.y);
    }

    // Basic string representation
    toString() {
        if (this.isInfinity()) {
            return "O (Point at Infinity)";
        }
        // Format numbers to a few decimal places for cleaner output
        const format = (n) => (Math.abs(n) < 1e-9) ? "0" : n.toFixed(4);
        return `(${format(this.x)}, ${format(this.y)})`;
    }
}

// Define the Point at Infinity constant
const POINT_INFINITY = new Point(null, null);