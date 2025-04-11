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

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let firstPoint = true;
    const step = 1 / scale; // Adjust step based on zoom for smoothness

    // Draw upper branch (y > 0)
    for (let cx = 0; cx < canvasWidth; cx++) {
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
     for (let cx = 0; cx < canvasWidth; cx++) {
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


// Draws a point P on the canvas
function drawPoint(point, color = 'red', label = '', radius = 5) {
    if (!point || point.isInfinity()) return;

    const cx = toCanvasX(point.x);
    const cy = toCanvasY(point.y);

    // Draw filled circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw label
    if (label) {
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy - radius - 3); // Position label above the point
    }
     ctx.textAlign = 'start'; // Reset alignment
}


// Draws a line between two points P and Q (or a tangent line at P)
function drawLine(p1, p2, color = 'green', isTangent = false) {
     if (!p1 || !p2 || p1.isInfinity() || p2.isInfinity()) return;

    const x1 = p1.x; const y1 = p1.y;
    const x2 = p2.x; const y2 = p2.y;
    const tolerance = 1e-9;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(isTangent ? [5, 5] : []); // Dashed line for tangent

    // Calculate line equation: Ax + By + C = 0 or x = constant
    let m, b;
    let isVertical = false;

    if (Math.abs(x1 - x2) < tolerance) { // Vertical line
        isVertical = true;
    } else {
        m = (y2 - y1) / (x1 - x2); // Slope
        b = y1 - m * x1; // Y-intercept
    }

    // Find intersection points with canvas boundaries
    let startX, startY, endX, endY;

    if (isVertical) {
        startX = toCanvasX(x1);
        startY = 0;
        endX = toCanvasX(x1);
        endY = canvasHeight;
    } else {
        // Intersect with y=canvasTop (y_world = fromCanvasY(0)) and y=canvasBottom (y_world = fromCanvasY(height))
        const worldYTop = fromCanvasY(0);
        const worldYBottom = fromCanvasY(canvasHeight);
        const canvasX_at_Top = toCanvasX((worldYTop - b) / m);
        const canvasX_at_Bottom = toCanvasX((worldYBottom - b) / m);

        // Intersect with x=canvasLeft (x_world = fromCanvasX(0)) and x=canvasRight (x_world = fromCanvasX(width))
        const worldXLeft = fromCanvasX(0);
        const worldXRight = fromCanvasX(canvasWidth);
        const canvasY_at_Left = toCanvasY(m * worldXLeft + b);
        const canvasY_at_Right = toCanvasY(m * worldXRight + b);

        // Collect valid intersection points (within canvas bounds)
        const points = [];
        if (canvasX_at_Top >= 0 && canvasX_at_Top <= canvasWidth) points.push({ x: canvasX_at_Top, y: 0 });
        if (canvasX_at_Bottom >= 0 && canvasX_at_Bottom <= canvasWidth) points.push({ x: canvasX_at_Bottom, y: canvasHeight });
        if (canvasY_at_Left >= 0 && canvasY_at_Left <= canvasHeight) points.push({ x: 0, y: canvasY_at_Left });
        if (canvasY_at_Right >= 0 && canvasY_at_Right <= canvasHeight) points.push({ x: canvasWidth, y: canvasY_at_Right });

        // Need exactly two points to draw the line segment across the canvas
        if (points.length >= 2) {
             // Simple approach: Use the first two valid points found.
             // A more robust approach would find the two 'outermost' valid intersection points.
            startX = points[0].x;
            startY = points[0].y;
            endX = points[1].x;
            endY = points[1].y;
        } else {
             // Fallback or error: draw line between the points if they are on canvas
            console.warn("Could not determine line intersections with canvas boundary.");
            startX = toCanvasX(x1);
            startY = toCanvasY(y1);
            endX = toCanvasX(x2);
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


// --- Canvas Event Listeners for Pan/Zoom/Click ---

// Zoom
document.getElementById('zoom-slider').addEventListener('input', (e) => {
    scale = parseInt(e.target.value);
    // TODO: Zoom towards mouse cursor instead of center? (More complex)
    // For simplicity, zoom centered on current origin
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

canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
         canvas.style.cursor = 'crosshair';
    }
});

canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
         canvas.style.cursor = 'crosshair';
    }
});

// Click to Select Point
canvas.addEventListener('click', (e) => {
     // Only register click if not dragging (mouseup clears isDragging)
     if (Math.abs(e.clientX - canvas.offsetLeft - dragStartX) > 3 ||
         Math.abs(e.clientY - canvas.offsetTop - dragStartY) > 3) {
         // If moved significantly between mousedown and mouseup, likely a drag, not a click
         return;
     }

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = fromCanvasX(clickX);
    const worldY = fromCanvasY(clickY);

    // Inform main script about the click coordinates
    // The main script will decide how to use this (e.g., find nearest point on curve)
    const event = new CustomEvent('canvasClick', { detail: { x: worldX, y: worldY } });
    canvas.dispatchEvent(event);
});

// --- Redraw Function ---
// This function needs to be called from main.js whenever the state changes
// It will redraw based on the current curve, points, etc. (managed in main.js)
let currentCurve = null;
let currentP = null;
let currentQ = null;
let currentResult = null;
let currentLineP1 = null;
let currentLineP2 = null;
let isTangentLine = false;

function redrawCanvas() {
    clearCanvas();
    drawAxes();
    if (currentCurve) {
        drawCurve(currentCurve);
    }
    if (currentLineP1 && currentLineP2) {
        drawLine(currentLineP1, currentLineP2, isTangentLine ? '#ff8c00' : '#2ca02c', isTangentLine); // Orange for tangent, Green for secant
    }
    if (currentP) {
        drawPoint(currentP, '#d62728', 'P'); // Red P
    }
    if (currentQ) {
        drawPoint(currentQ, '#1f77b4', 'Q'); // Blue Q
    }
    if (currentResult && !currentResult.isInfinity()) {
        drawPoint(currentResult, '#9467bd', 'R', 7); // Purple Result, slightly larger
    }

}

// Function called by main.js to update the visual elements
function updateVisualization(curve, P, Q, result, lineP1, lineP2, isTangent) {
    currentCurve = curve;
    currentP = P;
    currentQ = Q;
    currentResult = result;
    currentLineP1 = lineP1;
    currentLineP2 = lineP2;
    isTangentLine = isTangent;
    requestAnimationFrame(redrawCanvas); // Schedule a redraw
}