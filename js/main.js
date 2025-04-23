document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const paramAInput = document.getElementById('param-a');
    const paramBInput = document.getElementById('param-b');
    const plotCurveBtn = document.getElementById('plot-curve-btn');
    const discriminantSpan = document.getElementById('discriminant');

    const pointPxInput = document.getElementById('point-p-x');
    const pointPyInput = document.getElementById('point-p-y');
    const plotPBtn = document.getElementById('plot-p-btn');
    const pointQxInput = document.getElementById('point-q-x');
    const pointQyInput = document.getElementById('point-q-y');
    const plotQBtn = document.getElementById('plot-q-btn');

    const addPointsBtn = document.getElementById('add-points-btn');
    const doublePointBtn = document.getElementById('double-point-btn');
    const scalarKInput = document.getElementById('scalar-k');
    const scalarMultiplyBtn = document.getElementById('scalar-multiply-btn');

    const resultText = document.getElementById('result-text');
    const infoText = document.getElementById('info-text');
    const resetBtn = document.getElementById('reset-btn');
    const canvasElement = document.getElementById('ec-canvas'); // For event listener

    // --- Application State ---
    let curve = null;
    let P = null;
    let Q = null;
    let R = null; // Result point
    let R_prime = null; // Intermediate point (R')
    let lineP1 = null; // For visualizing addition/doubling lines
    let lineP2 = null;
    let isTangentLine = false;

    // --- Utility Functions ---
    function displayInfo(message, type = 'info') { // type can be 'info', 'warning', 'error'
        infoText.textContent = message;
        infoText.className = type; // Set class for styling
    }

    function displayResult(point) {
        R = point; // Store result
        resultText.textContent = `Result: ${point.toString()}`;
    }

    function updateButtonStates() {
        const pExists = P && !P.isInfinity();
        const qExists = Q && !Q.isInfinity();

        addPointsBtn.disabled = !(curve && pExists && qExists && curve.isPointOnCurve(P) && curve.isPointOnCurve(Q));
        doublePointBtn.disabled = !(curve && pExists && curve.isPointOnCurve(P));
        // Enable scalar multiply if P is valid and on the curve
        scalarMultiplyBtn.disabled = !(curve && pExists && curve.isPointOnCurve(P));
    }

    function resetState(clearInputs = false) {
        curve = null;
        P = null;
        Q = null;
        R = null;
        R_prime = null; // Reset intermediate point
        lineP1 = null;
        lineP2 = null;
        isTangentLine = false;

        if(clearInputs) {
            paramAInput.value = '-1';
            paramBInput.value = '1';
            pointPxInput.value = '';
            pointPyInput.value = '';
            pointQxInput.value = '';
            pointQyInput.value = '';
            scalarKInput.value = '3';
            discriminantSpan.textContent = 'Δ = ?';
        }

        displayInfo("State reset.");
        displayResult(POINT_INFINITY); // Reset result display
        updateButtonStates();
        // Update visualization call with null for R_prime
        updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine, R_prime);
    }


    function plotCurrentCurve() {
        const a = parseFloat(paramAInput.value);
        const b = parseFloat(paramBInput.value);

        if (isNaN(a) || isNaN(b)) {
            displayInfo("Invalid curve parameters (a or b).", 'error');
            return false; // Indicate failure
        }

        curve = new EllipticCurve(a, b);
        discriminantSpan.textContent = `Δ = ${curve.discriminant.toFixed(4)}`;

        let infoMsg = `Curve y² = x³ + ${a}x + ${b} plotted.`;
        let infoType = 'info';
        if (Math.abs(curve.discriminant) < 1e-9) {
             infoMsg = `Warning: Curve is singular (Δ = 0). Operations may fail. ${infoMsg}`;
             infoType = 'warning';
        }
        displayInfo(infoMsg, infoType);


        // Reset points if curve changes, as they might not be on the new curve
        P = null;
        Q = null;
        R = null;
        R_prime = null; // Reset intermediate point
        lineP1 = null;
        lineP2 = null;
        pointPxInput.value = '';
        pointPyInput.value = '';
        pointQxInput.value = '';
        pointQyInput.value = '';
        displayResult(POINT_INFINITY);
        updateButtonStates();

        // Update visualization call with null for R_prime
        updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine, R_prime);
        return true; // Indicate success
    }

    function plotPoint(xInput, yInput, pointVarSetter, pointLabel) {
        if (!curve) {
            displayInfo("Please plot a curve first.", 'error');
            return false;
        }
        const x = parseFloat(xInput.value);
        const y = parseFloat(yInput.value);

        if (isNaN(x) || isNaN(y)) {
            displayInfo(`Invalid coordinates for point ${pointLabel}.`, 'error');
            pointVarSetter(null); // Clear the point if input is invalid
            R = null; R_prime = null; lineP1 = null; lineP2 = null; // Clear results/lines
            updateButtonStates();
            // Update visualization call with null for R_prime
            updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine, R_prime);
            return false;
        }

        const point = new Point(x, y);
        let infoMsg = `Point ${pointLabel}${point.toString()} plotted.`;
        let infoType = 'info';
        if (!curve.isPointOnCurve(point)) {
            infoMsg = `Point ${pointLabel}${point.toString()} is NOT on the current curve. Operations disabled for this point. ${infoMsg}`;
            infoType = 'warning';
             // Keep point plotted for visual reference, but operations will be disabled by updateButtonStates
        }
        displayInfo(infoMsg, infoType);


        pointVarSetter(point); // Use the setter function (setP or setQ)
        R = null; // Clear previous result
        R_prime = null; // Clear previous intermediate point
        lineP1 = null; // Clear previous operation line
        lineP2 = null;
        displayResult(POINT_INFINITY);
        updateButtonStates();
        // Update visualization call with null for R_prime
        updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine, R_prime);
        return true;
    }

    // --- Event Listeners ---
    plotCurveBtn.addEventListener('click', plotCurrentCurve);

    plotPBtn.addEventListener('click', () => plotPoint(pointPxInput, pointPyInput, (p) => { P = p; }, 'P'));
    plotQBtn.addEventListener('click', () => plotPoint(pointQxInput, pointQyInput, (q) => { Q = q; }, 'Q'));

    addPointsBtn.addEventListener('click', () => {
        // Button state should prevent this if P or Q invalid/not on curve, but double check
        if (!curve || !P || !Q || P.isInfinity() || Q.isInfinity() || !curve.isPointOnCurve(P) || !curve.isPointOnCurve(Q)) {
            displayInfo("Need valid points P and Q located ON the curve.", 'error');
            return;
        }

        // Call the updated addPoints function
        const operationResult = addPoints(P, Q, curve);
        const resultPoint = operationResult.result;
        const intermediatePoint = operationResult.intermediate; // Get R'

        displayResult(resultPoint);
        displayInfo(`Calculated P + Q. P=${P.toString()}, Q=${Q.toString()}`);

        // Visualize the line used for addition (secant line)
        lineP1 = P;
        lineP2 = Q;
        isTangentLine = false;
        R_prime = intermediatePoint; // Store R' for visualization

        // Update visualization call WITH the intermediate point
        updateVisualization(curve, P, Q, resultPoint, lineP1, lineP2, isTangentLine, R_prime);
    });

    doublePointBtn.addEventListener('click', () => {
        // Button state should prevent this if P invalid/not on curve, but double check
        if (!curve || !P || P.isInfinity() || !curve.isPointOnCurve(P)) {
            displayInfo("Need a valid point P (not O) located ON the curve.", 'error');
            return;
        }

        // Call the updated doublePoint function
        const operationResult = doublePoint(P, curve);
        const resultPoint = operationResult.result;
        const intermediatePoint = operationResult.intermediate; // Get R'

        displayResult(resultPoint);
        displayInfo(`Calculated 2P. P=${P.toString()}`);

        // Visualize the line used for doubling (tangent line)
        lineP1 = P;
        lineP2 = P; // Indicate tangent at P
        isTangentLine = true;
        R_prime = intermediatePoint; // Store R' for visualization

        // Update visualization call WITH the intermediate point
        updateVisualization(curve, P, Q, resultPoint, lineP1, lineP2, isTangentLine, R_prime);
    });

    scalarMultiplyBtn.addEventListener('click', () => {
         // Button state should prevent this if P invalid/not on curve, but double check
        if (!curve || !P || P.isInfinity() || !curve.isPointOnCurve(P)) {
            displayInfo("Need a valid point P (not O) located ON the curve.", 'error');
            return;
        }

        const k = parseInt(scalarKInput.value);
        if (isNaN(k)) {
            displayInfo("Invalid scalar value k.", 'error');
            return;
        }
        // scalarMultiply now handles k=0 internally
        const resultPoint = scalarMultiply(k, P, curve);

        displayResult(resultPoint);
        displayInfo(`Calculated ${k} * P. P=${P.toString()}`);

        // Don't draw intermediate point or line for scalar multiplication result
        lineP1 = null;
        lineP2 = null;
        isTangentLine = false;
        R_prime = null; // No single R' for scalar multiplication

        // Update visualization call with null for R_prime
        updateVisualization(curve, P, Q, resultPoint, lineP1, lineP2, isTangentLine, R_prime);

         // TODO: Could add visualization of intermediate steps for scalar multiplication (advanced)
    });

    resetBtn.addEventListener('click', () => resetState(true)); // Reset with input clearing

    // Canvas click listener (from visualization.js)
    canvasElement.addEventListener('canvasClick', (e) => {
        if (!curve) {
            displayInfo("Plot a curve before selecting points.", 'warning');
            return;
        }

        const { x, y } = e.detail; // World coordinates from click

        // Find the closest y-value on the curve for the clicked x
        const yValues = curve.getY(x);
        let targetPoint = null;

        if (yValues.length > 0) {
            let closestY;
            if (yValues.length === 1) {
                closestY = yValues[0]; // Usually y=0 case
            } else {
                // Find which branch (positive or negative y) is closer to the click
                closestY = (Math.abs(y - yValues[0]) < Math.abs(y - yValues[1])) ? yValues[0] : yValues[1];
            }
            // Snap x to the input value that yields the y's to avoid minor discrepancy
            const snappedX = x; // Or recalculate x based on y if needed, but this is simpler
            targetPoint = new Point(snappedX, closestY);

             // Decide whether to set P or Q
             // Simple logic: if P is not set OR not on curve, set P. Otherwise, set Q.
             const pIsSetAndOnCurve = P && !P.isInfinity() && curve.isPointOnCurve(P);

             if (!pIsSetAndOnCurve) {
                 pointPxInput.value = targetPoint.x.toFixed(4);
                 pointPyInput.value = targetPoint.y.toFixed(4);
                 plotPoint(pointPxInput, pointPyInput, (p) => { P = p; }, 'P');
             } else {
                 pointQxInput.value = targetPoint.x.toFixed(4);
                 pointQyInput.value = targetPoint.y.toFixed(4);
                 plotPoint(pointQxInput, pointQyInput, (q) => { Q = q; }, 'Q');
             }

        } else {
            displayInfo(`Clicked at x=${x.toFixed(2)}, but no corresponding point on the curve.`);
        }
    });


    // --- Initial Setup ---
    resetState(false); // Initialize state without clearing default inputs
    plotCurrentCurve(); // Plot the default curve on load

});
