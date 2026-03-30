/**
 * @file Paper-Lite fixtures for GCODE module testing (Level 1 boundary strategy)
 *
 * Provides minimal Paper.js-compatible object shapes for testing `src/gcode.js`
 * business logic without requiring a real canvas or Paper.js runtime.
 *
 * Reference: docs/13_paperjs_mock_boundary_strategy.md
 *
 * These fixtures are used in conjunction with `beforeEach(() => { global.paper = {}; })`
 * to create a testable boundary for:
 * - Header/footer/pump command generation (Slice A)
 * - Color grouping and travel-sort behavior (Slice B)
 * - Explicit deferred: geometry semantics (Slice C)
 */
'use strict';

/**
 * Create a minimal path-like object with segment and length properties.
 * Used to simulate Paper.js Path behavior without canvas geometry.
 *
 * @param {Array} pointArray - Array of {x, y} point objects for segments
 * @param {Object} dataOverrides - Optional data properties (fill, color, etc.)
 * @returns {Object} Mock path object with segments, length, data, and shape methods
 */
function createMockPath(pointArray = [], dataOverrides = {}) {
  // Calculate path length as sum of distances between consecutive points
  let pathLength = 0;
  for (let i = 1; i < pointArray.length; i++) {
    const prev = pointArray[i - 1];
    const curr = pointArray[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  const segments = pointArray.map((point, index) => ({
    point: { x: point.x, y: point.y },
    location: { offset: index }
  }));

  return {
    segments,
    length: pathLength,
    firstSegment: segments[0] || { point: { x: 0, y: 0 } },
    lastSegment: segments[segments.length - 1] || { point: { x: 0, y: 0 } },
    closed: false,
    data: {
      fill: false,
      color: 0,
      ...dataOverrides
    },
    // Mock methods
    clone() {
      return createMockPath(pointArray, dataOverrides);
    },
    flatten(resolution) {
      // In real Paper.js, this adds intermediate points for curves.
      // For test fixtures, treat as no-op or add gentle interpolation if needed.
      return this;
    },
    reverse() {
      pointArray.reverse();
      return this;
    },
    add(point) {
      pointArray.push(point);
      segments.push({ point: { x: point.x, y: point.y }, location: { offset: segments.length } });
      return this;
    },
    remove() {
      // Mark as removed
      this.removed = true;
      return this;
    },
    getPointAt(offset) {
      // Return interpolated point at offset distance along path
      if (this.length === 0) return this.firstSegment.point;
      return pointArray[Math.floor((offset / this.length) * pointArray.length)] || this.lastSegment.point;
    },
    join(otherPath) {
      // Simple join: append other path's points
      if (otherPath && otherPath.segments) {
        otherPath.segments.forEach(seg => {
          this.add(seg.point);
        });
      }
      return this;
    }
  };
}

/**
 * Create a minimal layer-like object with children and manipulation methods.
 *
 * @param {Array} paths - Array of mock path objects to add as children
 * @returns {Object} Mock layer object with children management
 */
function createMockLayer(paths = []) {
  return {
    children: Array.from(paths),
    firstChild: paths[0] || null,
    index: 0,
    data: {},
    // Mock methods
    clone() {
      return createMockLayer(this.children.map(p => p.clone ? p.clone() : p));
    },
    activate() {
      // In real Paper.js, sets this as the active layer
      return this;
    },
    insertChild(index, child) {
      this.children.splice(index, 0, child);
      return child;
    },
    remove() {
      this.removed = true;
      return this;
    },
    insertChildren(index, children) {
      this.children.splice(index, 0, ...children);
      return children;
    }
  };
}

/**
 * Create a minimal Point-like object.
 *
 * @param {number} x
 * @param {number} y
 * @returns {Object} Mock point with getDistance method
 */
function createMockPoint(x = 0, y = 0) {
  return {
    x,
    y,
    getDistance(otherPoint) {
      const dx = otherPoint.x - this.x;
      const dy = otherPoint.y - this.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  };
}

module.exports = {
  createMockPath,
  createMockLayer,
  createMockPoint
};
