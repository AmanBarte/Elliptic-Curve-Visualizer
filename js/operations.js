// Contains functions for elliptic curve point operations

/**
 * Adds two points P and Q on a given elliptic curve.
 * @param {Point} P - The first point.
 * @param {Point} Q - The second point.
 * @param {EllipticCurve} curve - The curve P and Q lie on.
 * @returns {Point} The resulting point P + Q.
 */
function addPoints(P, Q, curve) {
    // Rule 1: O + P = P
    if (P.isInfinity()) return Q;
    if (Q.isInfinity()) return P;

    // Rule 2: P + (-P) = O
    // Check if Q is the negation of P (reflection across x-axis)
    // Need tolerance here due to potential floating point inaccuracies
    const tolerance = 1e-9;
    if (Math.abs(P.x - Q.x) < tolerance && Math.abs(P.y + Q.y) < tolerance) {
        return POINT_INFINITY;
    }

    let m; // Slope of the line

    // Rule 3: P + P = 2P (Point Doubling)
    if (P.equals(Q)) {
        return doublePoint(P, curve);
    }

    // Rule 4: Point Addition P + Q where P != Q and P != -Q
    // Calculate slope m = (y2 - y1) / (x2 - x1)
    const numerator = Q.y - P.y;
    const denominator = Q.x - P.x;

    // Avoid division by zero (should be caught by P == Q or P == -Q checks, but good practice)
    if (Math.abs(denominator) < tolerance) {
        // This case implies a vertical line, should have been P = -Q if points are on curve.
        // If P=Q, handled by doublePoint. If P!=-Q but x1=x2, they aren't on curve or something is wrong.
        console.error("Error during addition: Vertical line detected for distinct non-negating points.", P, Q);
        return POINT_INFINITY; // Return O as an error indicator/convention
    }

    m = numerator / denominator;

    // Calculate result R = (x3, y3)
    // x3 = m^2 - x1 - x2
    const x3 = m * m - P.x - Q.x;
    // y3 = m * (x1 - x3) - y1
    const y3 = m * (P.x - x3) - P.y;

    return new Point(x3, y3);
}

/**
 * Doubles a point P on a given elliptic curve.
 * @param {Point} P - The point to double.
 * @param {EllipticCurve} curve - The curve P lies on.
 * @returns {Point} The resulting point 2P.
 */
function doublePoint(P, curve) {
    // Rule 1: 2 * O = O
    if (P.isInfinity()) return POINT_INFINITY;

    // Rule 2: If y = 0, the tangent is vertical, result is O
    const tolerance = 1e-9;
    if (Math.abs(P.y) < tolerance) {
        return POINT_INFINITY;
    }

    // Calculate slope m of the tangent line at P
    // m = (3 * x1^2 + a) / (2 * y1)
    const numerator = 3 * Math.pow(P.x, 2) + curve.a;
    const denominator = 2 * P.y;

     // Denominator should not be zero here because we checked y != 0
     if (Math.abs(denominator) < tolerance) {
         console.error("Error during doubling: Denominator is zero unexpectedly.", P);
         return POINT_INFINITY; // Should not happen if y != 0
     }

    const m = numerator / denominator;

    // Calculate result R = (x3, y3)
    // x3 = m^2 - 2 * x1
    const x3 = m * m - 2 * P.x;
    // y3 = m * (x1 - x3) - y1
    const y3 = m * (P.x - x3) - P.y;

    return new Point(x3, y3);
}

/**
 * Performs scalar multiplication k * P using the double-and-add algorithm.
 * @param {number} k - The scalar (integer).
 * @param {Point} P - The point to multiply.
 * @param {EllipticCurve} curve - The curve P lies on.
 * @returns {Point} The resulting point k * P.
 */
function scalarMultiply(k, P, curve) {
    if (k < 0) {
        // k * P = (-k) * (-P)
        return scalarMultiply(-k, P.negate(), curve);
    }
    if (k === 0 || P.isInfinity()) {
        return POINT_INFINITY; // 0 * P = O, k * O = O
    }

    k = Math.floor(k); // Ensure k is an integer

    let result = POINT_INFINITY; // Initialize result to O
    let currentMultiple = P;    // Start with 1 * P

    while (k > 0) {
        if ((k % 2) === 1) { // If the current bit of k is 1
            result = addPoints(result, currentMultiple, curve); // Add current multiple to result
        }
        currentMultiple = doublePoint(currentMultiple, curve); // Double the current multiple (for next bit)
        k = Math.floor(k / 2); // Move to the next bit of k
    }

    return result;
}