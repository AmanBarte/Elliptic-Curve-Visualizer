// Contains functions for elliptic curve point operations

/**
 * Adds two points P and Q on a given elliptic curve.
 * Returns an object { result: Point, intermediate: Point | null }
 * where 'result' is P + Q and 'intermediate' is the third intersection point before reflection (R').
 * @param {Point} P - The first point.
 * @param {Point} Q - The second point.
 * @param {EllipticCurve} curve - The curve P and Q lie on.
 * @returns {{result: Point, intermediate: Point | null}}
 */
function addPoints(P, Q, curve) {
    // Rule 1: O + P = P
    if (P.isInfinity()) return { result: Q, intermediate: null };
    if (Q.isInfinity()) return { result: P, intermediate: null };

    // Rule 2: P + (-P) = O
    // Check if Q is the negation of P (reflection across x-axis)
    // Need tolerance here due to potential floating point inaccuracies
    const tolerance = 1e-9;
    if (Math.abs(P.x - Q.x) < tolerance && Math.abs(P.y + Q.y) < tolerance) {
        // Vertical line connecting P and its negation sums to O
        return { result: POINT_INFINITY, intermediate: null };
    }

    // Rule 3: P + P = 2P (Point Doubling) - Delegate to doublePoint
    if (P.equals(Q)) {
        // Delegate the calculation and return its result object
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
        return { result: POINT_INFINITY, intermediate: null }; // Return O as an error indicator/convention
    }

    const m = numerator / denominator;

    // Calculate R' = (x3, y_intermediate) - the third intersection point
    // x3 = m^2 - x1 - x2
    const x3 = m * m - P.x - Q.x;
    // y_intermediate is the y-coordinate of the third intersection point R'
    // It lies on the line: y - y1 = m(x - x1) => y = m(x3 - x1) + y1
    const y_intermediate = m * (x3 - P.x) + P.y; // This is -y3 (the y of the result R)

    // The final result R has coordinates (x3, -y_intermediate)
    const R = new Point(x3, -y_intermediate);
    // The intermediate point R' has coordinates (x3, y_intermediate)
    const R_prime = new Point(x3, y_intermediate);

    // Verify R' lies on the line between P and Q (optional check)
    // const check_y_prime = m * (x3 - Q.x) + Q.y;
    // if (Math.abs(y_intermediate - check_y_prime) > 1e-6) {
    //    console.warn("Intermediate point calculation might be slightly off line", y_intermediate, check_y_prime);
    // }

    return { result: R, intermediate: R_prime };
}

/**
 * Doubles a point P on a given elliptic curve.
 * Returns an object { result: Point, intermediate: Point | null }
 * where 'result' is 2P and 'intermediate' is the second intersection point of the tangent before reflection (R').
 * @param {Point} P - The point to double.
 * @param {EllipticCurve} curve - The curve P lies on.
 * @returns {{result: Point, intermediate: Point | null}}
 */
function doublePoint(P, curve) {
    // Rule 1: 2 * O = O
    if (P.isInfinity()) return { result: POINT_INFINITY, intermediate: null };

    // Rule 2: If y = 0, the tangent is vertical, result is O
    const tolerance = 1e-9;
    if (Math.abs(P.y) < tolerance) {
        // Tangent at y=0 (point of order 2) sums to O
        return { result: POINT_INFINITY, intermediate: null };
    }

    // Calculate slope m of the tangent line at P
    // m = (3 * x1^2 + a) / (2 * y1)
    const numerator = 3 * Math.pow(P.x, 2) + curve.a;
    const denominator = 2 * P.y;

     // Denominator should not be zero here because we checked y != 0
     if (Math.abs(denominator) < tolerance) {
         console.error("Error during doubling: Denominator is zero unexpectedly.", P);
         return { result: POINT_INFINITY, intermediate: null }; // Should not happen if y != 0
     }

    const m = numerator / denominator;

    // Calculate R' = (x3, y_intermediate) - the second intersection of the tangent
    // x3 = m^2 - 2 * x1
    const x3 = m * m - 2 * P.x;
    // y_intermediate lies on the tangent line: y - y1 = m(x - x1) => y = m(x3 - x1) + y1
    const y_intermediate = m * (x3 - P.x) + P.y; // This is -y3 (the y of the result R)

    // The final result R = 2P has coordinates (x3, -y_intermediate)
    const R = new Point(x3, -y_intermediate);
    // The intermediate point R' has coordinates (x3, y_intermediate)
    const R_prime = new Point(x3, y_intermediate);

    return { result: R, intermediate: R_prime };
}

/**
 * Performs scalar multiplication k * P using the double-and-add algorithm.
 * NOTE: This function does *not* return intermediate points for the whole process,
 * only the final result. Visualizing intermediate steps of scalar multiplication
 * would require rewriting this function significantly.
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
            // Pass result point and current multiple point to addPoints
            // Use .result as we only need the final sum for the next step here
            result = addPoints(result, currentMultiple, curve).result;
        }
        // Double the current multiple for the next iteration
        // Use .result as we only need the final doubled point for the next step here
        currentMultiple = doublePoint(currentMultiple, curve).result;
        k = Math.floor(k / 2); // Move to the next bit of k
    }

    return result;
}