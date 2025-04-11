# Elliptic Curve Visualizer

A web-based tool to visualize elliptic curves, point addition, and scalar multiplication over real numbers. This project is intended as an educational tool to understand the geometric basis of elliptic curve cryptography operations.

**Live Demo:** [Link to your GitHub Pages deployment, if you set one up]

## Features

* **Curve Plotting:** Visualize elliptic curves of the form y² = x³ + ax + b by specifying parameters 'a' and 'b'.
* **Point Selection:**
    * Input coordinates manually for points P and Q.
    * Click on the graph to select points (approximates to the nearest point on the curve).
* **Point Validation:** Checks if selected points lie on the current curve before performing operations.
* **Point Addition (P + Q):** Calculates the sum of two points P and Q using the geometric chord-and-tangent rules. Visualizes the secant line used.
* **Point Doubling (2P):** Calculates the doubling of a point P. Visualizes the tangent line used.
* **Scalar Multiplication (k * P):** Calculates the result of adding point P to itself k times using the efficient double-and-add algorithm.
* **Interactive Canvas:** Pan and zoom the visualization for better inspection.
* **Discriminant Display:** Shows the curve's discriminant (Δ) to indicate if the curve is non-singular (required for group operations).

## Technologies Used

* HTML5
* CSS3
* JavaScript (ES6+)
* HTML Canvas API (for 2D drawing)

## Setup and Usage

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/elliptic-curve-visualizer.git](https://www.google.com/search?q=https://github.com/your-username/elliptic-curve-visualizer.git)
    cd elliptic-curve-visualizer
    ```
2.  **Open `index.html`:**
    Simply open the `index.html` file in your web browser. No build process or local server is strictly required for basic functionality. (For development, using a simple local server like Python's `http.server` or Node's `http-server` can be helpful).

**How to Use:**

1.  **Define the Curve:** Enter values for 'a' and 'b' and click "Plot Curve". The discriminant (Δ) will be displayed. Ensure Δ ≠ 0 for valid group operations.
2.  **Define Points:**
    * Enter x and y coordinates for P and/or Q and click their respective "Plot" buttons. The tool will indicate if the point lies on the curve.
    * Alternatively, click directly on the plotted curve in the visualization area. The tool will find the nearest point on the curve and populate the input fields for P (if empty) or Q.
3.  **Perform Operations:**
    * Click "Calculate P + Q" (requires valid P and Q).
    * Click "Calculate 2P" (requires valid P).
    * Enter an integer scalar 'k' and click "Calculate k * P" (requires valid P).
4.  **View Results:** The resulting point's coordinates are displayed, and the point (R) is plotted on the canvas (if not the point at infinity). Status messages provide feedback.
5.  **Navigate:** Use the sliders or drag the canvas to pan and zoom.
6.  **Reset:** Click "Reset All" to clear the state and inputs.

## Concepts Visualized

* **Elliptic Curve:** The set of points (x, y) satisfying the equation y² = x³ + ax + b, plus a "point at infinity" (O).
* **Point Addition (P + Q ≠ P):** Draw a line through P and Q. It intersects the curve at a third point, R'. The sum P + Q is the reflection of R' across the x-axis. If the line is vertical (P = -Q), the sum is O.
* **Point Doubling (P + P):** Draw the tangent line to the curve at P. It intersects the curve at a second point, R'. The sum 2P is the reflection of R' across the x-axis. If the tangent is vertical (y=0), the sum is O.
* **Point at Infinity (O):** The identity element of the group. P + O = P. It lies "infinitely far" along every vertical line.
* **Scalar Multiplication (k * P):** Repeated addition (P + P + ... + P, k times). Visualized as the final resulting point.

## Potential Future Enhancements

* [ ] Visualization of intermediate steps in scalar multiplication.
* [ ] Support for elliptic curves over finite fields (GF(p)). This would require significant changes to math and visualization.
* [ ] Zooming towards the mouse cursor.
* [ ] Better handling of edge cases and numerical precision.
* [ ] **Three.js Integration:** Replace the 2D Canvas with a 3D visualization (e.g., curve as a tube, points as spheres). This is a major undertaking.
* [ ] Add predefined curves (e.g., secp256k1 parameters, though visualization over reals would be different from finite field).
* [ ] Improved UI/UX.

## License

[MIT License](LICENSE)