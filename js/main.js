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
    let lineP1 = null; // For visualizing addition/doubling lines
    let lineP2 = null;
    let isTangentLine = false;

    // --- Utility Functions ---
    function displayInfo(message, isError = false) {
        infoText.textContent = message;
        infoText.style.color = isError ? '#e76f51' : '#666'; // Use error color if specified
    }

    function displayResult(point) {
        R = point; // Store result
        resultText.textContent = `Result: ${point.toString()}`;
    }

    function updateButtonStates() {
        const pExists = P && !P.isInfinity();
        const qExists = Q && !Q.isInfinity();

        addPointsBtn.disabled = !(pExists && qExists);
        doublePointBtn.disabled = !pExists;
        scalarMultiplyBtn.disabled = !pExists;
    }

    function resetState(clearInputs = false) {
        curve = null;
        P = null;
        Q = null;
        R = null;
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
        updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine); // Update canvas
    }


    function plotCurrentCurve() {
        const a = parseFloat(paramAInput.value);
        const b = parseFloat(paramBInput.value);

        if (isNaN(a) || isNaN(b)) {
            displayInfo("Invalid curve parameters (a or b).", true);
            return false; // Indicate failure
        }

        curve = new EllipticCurve(a, b);
        discriminantSpan.textContent = `Δ = ${curve.discriminant.toFixed(4)}`;
        if (Math.abs(curve.discriminant) < 1e-9) {
             displayInfo("Warning: Curve is singular (Δ = 0). Operations may fail.", true);
        } else {
            displayInfo(`Curve y² = x³ + ${a}x + ${b} plotted.`);
        }

        // Reset points if curve changes, as they might not be on the new curve
        P = null;
        Q = null;
        R = null;
        lineP1 = null;
        lineP2 = null;
        pointPxInput.value = '';
        pointPyInput.value = '';
        pointQxInput.value = '';
        pointQyInput.value = '';
        updateButtonStates();
        displayResult(POINT_INFINITY);

        updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine);
        return true; // Indicate success
    }

    function plotPoint(xInput, yInput, pointVarSetter, pointLabel) {
        if (!curve) {
            displayInfo("Please plot a curve first.", true);
            return false;
        }
        const x = parseFloat(xInput.value);
        const y = parseFloat(yInput.value);

        if (isNaN(x) || isNaN(y)) {
            displayInfo(`Invalid coordinates for point ${pointLabel}.`, true);
            pointVarSetter(null); // Clear the point if input is invalid
            updateButtonStates();
            updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine);
            return false;
        }

        const point = new Point(x, y);
        if (!curve.isPointOnCurve(point)) {
            displayInfo(`Point ${pointLabel}${point.toString()} is not on the current curve. Plotting anyway.`, true);
            // Allow plotting even if not on curve for visualization/input purposes
        } else {
             displayInfo(`Point ${pointLabel}${point.toString()} plotted.`);
        }

        pointVarSetter(point); // Use the setter function (setP or setQ)
        R = null; // Clear previous result
        lineP1 = null; // Clear previous operation line
        lineP2 = null;
        displayResult(POINT_INFINITY);
        updateButtonStates();
        updateVisualization(curve, P, Q, R, lineP1, lineP2, isTangentLine);
        return true;
    }

    // --- Event Listeners ---
    plotCurveBtn.addEventListener('click', plotCurrentCurve);

    plotPBtn.addEventListener('click', () => plotPoint(pointPxInput, pointPyInput, (p) => { P = p; }, 'P'));
    plotQBtn.addEventListener('click', () => plotPoint(pointQxInput, pointQyInput, (q) => { Q = q; }, 'Q'));

    addPointsBtn.addEventListener('click', () => {
        if (!curve || !P || !Q || P.isInfinity() || Q.isInfinity()) {
            displayInfo("Need valid points P and Q on the curve.", true);
            return;
        }
         if (!curve.isPointOnCurve(P) || !curve.isPointOnCurve(Q)) {
             displayInfo("One or both points (P, Q) are not on the current curve. Cannot add.", true);
             return;
         }

        const resultPoint = addPoints(P, Q, curve);
        displayResult(resultPoint);
        displayInfo(`Calculated P + Q. P=${P.toString()}, Q=${Q.toString()}`);

        // Visualize the line used for addition (secant line)
        lineP1 = P;
        lineP2 = Q;
        isTangentLine = false;
        updateVisualization(curve, P, Q, resultPoint, lineP1, lineP2, isTangentLine);
    });

    doublePointBtn.addEventListener('click', () => {
        if (!curve || !P || P.isInfinity()) {
            displayInfo("Need a valid point P (not O) on the curve.", true);
            return;
        }
         if (!curve.isPointOnCurve(P)) {
             displayInfo("Point P is not on the current curve. Cannot double.", true);
             return;
         }

        const resultPoint = doublePoint(P, curve);
        displayResult(resultPoint);
         displayInfo(`Calculated 2P. P=${P.toString()}`);

        // Visualize the line used for doubling (tangent line)
        lineP1 = P;
        lineP2 = P; // Indicate tangent at P
        isTangentLine = true;
         updateVisualization(curve, P, Q, resultPoint, lineP1, lineP2, isTangentLine);
    });

    scalarMultiplyBtn.addEventListener('click', () => {
        if (!curve || !P || P.isInfinity()) {
            displayInfo("Need a valid point P (not O) on the curve.", true);
            return;
        }
        if (!curve.isPointOnCurve(P)) {
             displayInfo("Point P is not on the current curve. Cannot multiply.", true);
             return;
         }

        const k = parseInt(scalarKInput.value);
        if (isNaN(k)) {
            displayInfo("Invalid scalar value k.", true);
            return;
        }
         if (k === 0) {
             displayResult(POINT_INFINITY);
             displayInfo(`Calculated 0 * P = O.`);
             lineP1 = null; lineP2 = null; // No line for k=0
             updateVisualization(curve, P, Q, POINT_INFINITY, lineP1, lineP2, false);
             return;
         }
         if (k === 1) {
             displayResult(P);
             displayInfo(`Calculated 1 * P = P.`);
             lineP1 = null; lineP2 = null; // No line for k=1
             updateVisualization(curve, P, Q, P, lineP1, lineP2, false);
             return;
         }


        const resultPoint = scalarMultiply(k, P, curve);
        displayResult(resultPoint);
         displayInfo(`Calculated ${k} * P. P=${P.toString()}`);

        // Don't draw a line for scalar multiplication, as it's many steps
        lineP1 = null;
        lineP2 = null;
        isTangentLine = false;
        updateVisualization(curve, P, Q, resultPoint, lineP1, lineP2, isTangentLine);

         // TODO: Could add visualization of intermediate steps for scalar multiplication (advanced)
    });

    resetBtn.addEventListener('click', () => resetState(true)); // Reset with input clearing

    // Canvas click listener (from visualization.js)
    canvasElement.addEventListener('canvasClick', (e) => {
        if (!curve) {
            displayInfo("Plot a curve before selecting points.", true);
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
            targetPoint = new Point(x, closestY);

             // Decide whether to set P or Q
             // Simple logic: if P is not set, set P. Otherwise, set Q.
             if (!P || P.isInfinity()) {
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