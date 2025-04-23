// Handles drawing on the HTML canvas

const canvas = document.getElementById('ec-canvas');
const ctx = canvas.getContext('2d');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// --- State for Pan and Zoom ---
let scale = 30; // Pixels per unit
let originX = canvasWidth / 2;
let originY = canvasHeight / 2;
let isDragging = false;
let dragStartX, dragStartY;
let initialOriginX, initialOriginY;

// --- State for Plotted Elements ---
let currentCurve = null;
let currentP = null;
let currentQ = null;
let currentResult = null; // Point R
let currentRPrime = null; // Intermediate Point R'
let currentLineP1 = null; // Point for drawing secant/tangent
let currentLineP2 = null; // Point for drawing secant/tangent
let isTangentLine = false;

// --- Transformation Functions ---
function toCanvasX(x) {
    return originX + x * scale;
}

function toCanvasY(y) {
    return originY - y * scale; // Y is inverted in canvas
}

function fromCanvasX(canvasX) {
    return (canvasX - originX) / scale;
}

function fromCanvasY(canvasY) {
    // Check for scale being zero to prevent division by zero
    if (Math.abs(scale) < 1e-9) {
        return 0; // Or handle appropriately, maybe return NaN or throw error
    }
    return (canvasY - originY) / -scale; // Y is inverted
}


// --- Drawing Functions ---

// Clears the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

// Draws the coordinate axes and grid lines
function drawAxes() {
    ctx.strokeStyle = '#ccc'; // Light grey for grid
    ctx.lineWidth = 0.5;

    // --- Grid Lines ---
    const step = 1; // Grid lines every 1 unit
    // Check if scale is valid before proceeding
    if (Math.abs(scale) < 1e-9) {
        console.error("Scale is too small or zero, cannot draw axes.");
        return; // Prevent further drawing if scale is invalid
    }
    const minX = fromCanvasX(0);
    const maxX = fromCanvasX(canvasWidth);
    const minY = fromCanvasY(canvasHeight);
    const maxY = fromCanvasY(0);

    // Vertical grid lines
    for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), 0);
        ctx.lineTo(toCanvasX(x), canvasHeight);
        ctx.stroke();
    }
    // Horizontal grid lines
     for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, toCanvasY(y));
        ctx.lineTo(canvasWidth, toCanvasY(y));
        ctx.stroke();
    }

    // --- Axes ---
    ctx.strokeStyle = '#000'; // Black for axes
    ctx.lineWidth = 1;
    // X-Axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(canvasWidth, originY);
    ctx.stroke();
    // Y-Axis
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvasHeight);
    ctx.stroke();

    // --- Axis Labels (Optional) ---
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    // Add labels near the ends of visible axes
    ctx.fillText('X', canvasWidth - 15, originY - 5);
    ctx.fillText('Y', originX + 5, 15);
    // Origin Label
    if (originX > 5 && originX < canvasWidth - 10 && originY > 15 && originY < canvasHeight - 5) {
         ctx.fillText('0', originX + 2, originY - 2);
    }

     // Draw unit markers on axes
    ctx.fillStyle = '#000';
    for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
        if(Math.abs(x) > 1e-6) { // Don't mark origin twice
            ctx.beginPath();
            ctx.moveTo(toCanvasX(x), originY - 3);
            ctx.lineTo(toCanvasX(x), originY + 3);
            ctx.stroke();
        }
    }
     for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
         if(Math.abs(y) > 1e-6) { // Don't mark origin twice
            ctx.beginPath();
            ctx.moveTo(originX - 3, toCanvasY(y));
            ctx.lineTo(originX + 3, toCanvasY(y));
            ctx.stroke();
         }
    }
}


// Draws the elliptic curve
function drawCurve(curve, color = '#4a90e2') {
    if (!curve) return;
     // Check scale before proceeding
    if (Math.abs(scale) < 1e-9) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let firstPoint = true;
    const step = 1 / scale; // Adjust step based on zoom for smoothness - BECOMES LARGE if scale is small!
    const canvasStep = 1; // Draw pixel by pixel on canvas for consistent rendering

    // Draw upper branch (y > 0)
    for (let cx = 0; cx < canvasWidth; cx += canvasStep) {
        const x = fromCanvasX(cx);
        const yValues = curve.getY(x);
        if (yValues.length > 0) {
            const y = yValues[0]; // Positive root
            const cy = toCanvasY(y);
            if (firstPoint) {
                ctx.moveTo(cx, cy);
                firstPoint = false;
            } else {
                ctx.lineTo(cx, cy);
            }
        } else {
            firstPoint = true; // Discontinuity, start new line segment
        }
    }
    ctx.stroke(); // Stroke the upper branch path

    // Draw lower branch (y < 0)
    ctx.beginPath();
    firstPoint = true;
     for (let cx = 0; cx < canvasWidth; cx += canvasStep) {
        const x = fromCanvasX(cx);
        const yValues = curve.getY(x);
         if (yValues.length > 1) { // Needs two y values
            const y = yValues[1]; // Negative root
            const cy = toCanvasY(y);
             if (firstPoint) {
                ctx.moveTo(cx, cy);
                firstPoint = false;
            } else {
                ctx.lineTo(cx, cy);
            }
        } else if (yValues.length === 1 && Math.abs(yValues[0]) < 1e-9) {
            // Handle points where y=0 (single point, part of both branches visually)
             const cy = toCanvasY(0);
             if (firstPoint) {
                 ctx.moveTo(cx, cy);
                 firstPoint = false;
             } else {
                 ctx.lineTo(cx, cy);
             }
        }
         else {
            firstPoint = true; // Discontinuity
        }
    }
    ctx.stroke(); // Stroke the lower branch path
}


// Draws a point on the canvas
// Added optional 'style' parameter ('fill', 'stroke')
function drawPoint(point, color = 'red', label = '', radius = 5, style = 'fill') {
    if (!point || point.isInfinity()) return;

    const cx = toCanvasX(point.x);
    const cy = toCanvasY(point.y);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

    if (style === 'fill') {
        ctx.fillStyle = color;
        ctx.fill();
    } else if (style === 'stroke') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Draw label
    if (label) {
        ctx.fillStyle = '#000'; // Always black label?
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        // Adjust label position based on style
        const labelOffset = style === 'stroke' ? radius + 5 : radius + 3;
        ctx.fillText(label, cx, cy - labelOffset);
    }
     ctx.textAlign = 'start'; // Reset alignment
}


// Draws a line between two points P and Q (or a tangent line at P)
function drawLine(p1, p2, color = 'green', isTangent = false) {
     if (!p1 || !p2 || p1.isInfinity() || (p2.isInfinity() && !isTangent) ) return; // Allow tangent if p2 is infinity conceptually

    const x1 = p1.x; const y1 = p1.y;
    let x2, y2;

     // For tangent, p2 might be the same as p1 conceptually, we need the slope
     if (isTangent) {
        // Calculate tangent slope (ensure curve object is available or passed)
        // This logic might be better placed where drawLine is called,
        // passing slope directly might be cleaner.
        // For now, assume tangent means line goes through p1 with correct slope.
        // We'll determine the slope when calculating intersections below.
        // Just use P1's coords for now.
        x2 = p1.x;
        y2 = p1.y;

     } else {
         // Normal line between two distinct points
         if (p2.isInfinity()) return; // Cannot draw line to infinity
         x2 = p2.x;
         y2 = p2.y;
     }

    const tolerance = 1e-9;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(isTangent ? [5, 5] : []); // Dashed line for tangent

    // Calculate line equation parameters
    let m, b; // slope, y-intercept
    let isVertical = false;

    if (isTangent) {
        // Calculate tangent slope m = (3x₁² + a) / (2y₁)
        if (Math.abs(y1) < tolerance) { // Vertical tangent at y=0
            isVertical = true;
        } else if (currentCurve) { // Need curve parameters
            const numerator = 3 * Math.pow(x1, 2) + currentCurve.a;
            const denominator = 2 * y1;
            if (Math.abs(denominator) < tolerance) { // Should not happen if y1 != 0
                 console.error("Tangent calculation error: denominator zero unexpectedly.");
                 isVertical = true; // Treat as vertical if error
            } else {
                m = numerator / denominator;
                b = y1 - m * x1;
            }
        } else {
            console.error("Cannot calculate tangent slope: currentCurve is not defined.");
            ctx.setLineDash([]); // Reset dash
            return; // Cannot draw tangent without curve info
        }
    } else {
        // Secant line between P and Q
        if (Math.abs(x1 - x2) < tolerance) { // Vertical line
            isVertical = true;
        } else {
            m = (y2 - y1) / (x1 - x2); // Slope
            b = y1 - m * x1; // Y-intercept
        }
    }


    // Find intersection points with canvas boundaries
    let startX, startY, endX, endY;
    // Check scale before proceeding with coordinate transformations
    if (Math.abs(scale) < 1e-9) {
        console.error("Scale is too small or zero, cannot draw line.");
         ctx.setLineDash([]); // Reset dash
        return;
    }

    if (isVertical) {
        startX = toCanvasX(x1);
        startY = 0;
        endX = toCanvasX(x1);
        endY = canvasHeight;
    } else {
        // Intersect with y=canvasTop (y_world = fromCanvasY(0)) and y=canvasBottom (y_world = fromCanvasY(height))
        const worldYTop = fromCanvasY(0);
        const worldYBottom = fromCanvasY(canvasHeight);
        const canvasX_at_Top = (Math.abs(m) > tolerance) ? toCanvasX((worldYTop - b) / m) : (b > worldYBottom && b < worldYTop ? 0 : -1); // Handle horizontal lines
        const canvasX_at_Bottom = (Math.abs(m) > tolerance) ? toCanvasX((worldYBottom - b) / m) : (b > worldYBottom && b < worldYTop ? 0 : -1);

        // Intersect with x=canvasLeft (x_world = fromCanvasX(0)) and x=canvasRight (x_world = fromCanvasX(width))
        const worldXLeft = fromCanvasX(0);
        const worldXRight = fromCanvasX(canvasWidth);
        const canvasY_at_Left = toCanvasY(m * worldXLeft + b);
        const canvasY_at_Right = toCanvasY(m * worldXRight + b);

        // Collect valid intersection points (within canvas bounds + small buffer)
        const buffer = 1;
        const points = [];
        if (canvasX_at_Top >= -buffer && canvasX_at_Top <= canvasWidth + buffer) points.push({ x: canvasX_at_Top, y: 0 });
        if (canvasX_at_Bottom >= -buffer && canvasX_at_Bottom <= canvasWidth + buffer) points.push({ x: canvasX_at_Bottom, y: canvasHeight });
        if (canvasY_at_Left >= -buffer && canvasY_at_Left <= canvasHeight + buffer) points.push({ x: 0, y: canvasY_at_Left });
        if (canvasY_at_Right >= -buffer && canvasY_at_Right <= canvasHeight + buffer) points.push({ x: canvasWidth, y: canvasY_at_Right });

        // Find the two points furthest apart among the valid intersections
        let maxDist = -1;
        let bestPair = null;

        if (points.length >= 2) {
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    const distSq = Math.pow(points[i].x - points[j].x, 2) + Math.pow(points[i].y - points[j].y, 2);
                    if (distSq > maxDist) {
                        maxDist = distSq;
                        bestPair = [points[i], points[j]];
                    }
                }
            }
        }

        if (bestPair) {
             startX = bestPair[0].x;
             startY = bestPair[0].y;
             endX = bestPair[1].x;
             endY = bestPair[1].y;
        } else {
            // Fallback or error: draw line between the original points if they are on canvas
            console.warn("Could not determine line intersections with canvas boundary.");
            startX = toCanvasX(x1);
            startY = toCanvasY(y1);
            endX = toCanvasX(x2); // Use x1,y1 for tangent fallback too
            endY = toCanvasY(y2);
        }
    }

    // Draw the line segment
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
}

// Draw the reflection line between R' and R
function drawReflectionLine(r_prime, r) {
    if (!r_prime || r_prime.isInfinity() || !r || r.isInfinity()) return;
    // Check scale before proceeding
    if (Math.abs(scale) < 1e-9) return;

    // Ensure they have the same x-coordinate (within tolerance)
    const tolerance = 1e-6;
    if (Math.abs(r_prime.x - r.x) > tolerance) {
        console.warn("R' and R do not have the same x-coordinate for reflection line.", r_prime, r);
        return;
    }
    // Don't draw if points are identical (e.g., y=0 case)
    if (r_prime.equals(r)) {
        return;
    }

    const cx = toCanvasX(r.x);
    const cy_prime = toCanvasY(r_prime.y);
    const cy_r = toCanvasY(r.y);

    ctx.strokeStyle = '#aaa'; // Light grey for reflection line
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]); // Dashed line
    ctx.beginPath();
    ctx.moveTo(cx, cy_prime);
    ctx.lineTo(cx, cy_r);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
}


// --- Canvas Event Listeners for Pan/Zoom/Click ---

// Zoom
document.getElementById('zoom-slider').addEventListener('input', (e) => {
    const newScale = parseInt(e.target.value);
    // Prevent scale from becoming zero or too small
    if (newScale < 1) {
        scale = 1; // Set a minimum scale value
        e.target.value = scale; // Update slider position
    } else {
        scale = newScale;
    }
    // TODO: Zoom towards mouse cursor instead of center? (More complex)
    requestAnimationFrame(redrawCanvas); // Redraw after zoom change
});

// Pan X
document.getElementById('pan-x-slider').addEventListener('input', (e) => {
    originX = canvasWidth / 2 + parseInt(e.target.value);
     requestAnimationFrame(redrawCanvas);
});

// Pan Y
document.getElementById('pan-y-slider').addEventListener('input', (e) => {
    originY = canvasHeight / 2 + parseInt(e.target.value);
     requestAnimationFrame(redrawCanvas);
});


// Mouse Drag for Panning
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - canvas.offsetLeft;
    dragStartY = e.clientY - canvas.offsetTop;
    initialOriginX = originX;
    initialOriginY = originY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const currentX = e.clientX - canvas.offsetLeft;
    const currentY = e.clientY - canvas.offsetTop;
    const dx = currentX - dragStartX;
    const dy = currentY - dragStartY;
    originX = initialOriginX + dx;
    originY = initialOriginY + dy;

    // Update sliders to reflect drag panning
     document.getElementById('pan-x-slider').value = originX - canvasWidth / 2;
     document.getElementById('pan-y-slider').value = originY - canvasHeight / 2;

    requestAnimationFrame(redrawCanvas); // Redraw while dragging
});

canvas.addEventListener('mouseup', (e) => {
    const potentialClick = isDragging; // Store dragging state before resetting
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    }

    // --- Click Logic ---
    // Only register click if not dragging significantly
    const clickThreshold = 3; // Pixels moved threshold
    const movedX = Math.abs(e.clientX - canvas.offsetLeft - dragStartX);
    const movedY = Math.abs(e.clientY - canvas.offsetTop - dragStartY);

    if (potentialClick && movedX <= clickThreshold && movedY <= clickThreshold) {
         // If mouseup happened after mousedown without significant move, treat as click
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check scale before transforming coordinates
        if (Math.abs(scale) < 1e-9) return;

        const worldX = fromCanvasX(clickX);
        const worldY = fromCanvasY(clickY);

        // Inform main script about the click coordinates
        const event = new CustomEvent('canvasClick', { detail: { x: worldX, y: worldY } });
        canvas.dispatchEvent(event);
    }
});

canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
         canvas.style.cursor = 'crosshair';
    }
});

// --- Redraw Function ---
// This function needs to be called from main.js whenever the state changes
function redrawCanvas() {
    requestAnimationFrame(() => {
        clearCanvas();
        drawAxes();
        if (currentCurve) {
            drawCurve(currentCurve);
        }
        // Draw line first so points are on top
        if (currentLineP1) {
            // Pass P1 and P2 (or just P1 if tangent)
            drawLine(currentLineP1, isTangentLine ? currentLineP1 : currentLineP2, isTangentLine ? '#ff8c00' : '#2ca02c', isTangentLine); // Orange for tangent, Green for secant
        }

        // Draw points P and Q
        if (currentP) {
            drawPoint(currentP, '#d62728', 'P'); // Red P
        }
        if (currentQ) {
            drawPoint(currentQ, '#1f77b4', 'Q'); // Blue Q
        }

        // Draw intermediate point R' (if it exists) - Draw before R
        if (currentRPrime && !currentRPrime.isInfinity()) {
            // Use a distinct style for R' - e.g., smaller, stroke only, grey
            drawPoint(currentRPrime, '#888', "R'", 4, 'stroke'); // Grey outline, radius 4
        }

        // Draw Result R
        if (currentResult && !currentResult.isInfinity()) {
            drawPoint(currentResult, '#9467bd', 'R', 7); // Purple Result, radius 7
        }

        // Draw reflection line between R' and R
        drawReflectionLine(currentRPrime, currentResult);

    });
}

// Function called by main.js to update the visual elements
// Added r_prime as the last argument
function updateVisualization(curve, P, Q, result, lineP1, lineP2, isTangent, r_prime) {
    currentCurve = curve;
    currentP = P;
    currentQ = Q;
    currentResult = result; // R
    currentRPrime = r_prime; // R'
    currentLineP1 = lineP1;
    currentLineP2 = lineP2;
    isTangentLine = isTangent;
    // Check scale before redrawing
    if (Math.abs(scale) < 1e-9) {
        console.error("Scale is too small, cannot redraw canvas.");
        // Optionally display an error message to the user on the page
        return;
    }
    redrawCanvas(); // Schedule a redraw
}