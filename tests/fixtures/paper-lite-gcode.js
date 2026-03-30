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
  // Keep mutable point state internal to this path instance.
  let points = pointArray.map(function(point) {
    return { x: point.x, y: point.y };
  });

  function buildSegmentsFromPoints() {
    var nextSegments = [];
    var cumulative = 0;

    for (var i = 0; i < points.length; i++) {
      if (i > 0) {
        var prev = points[i - 1];
        var curr = points[i];
        var dx = curr.x - prev.x;
        var dy = curr.y - prev.y;
        cumulative += Math.sqrt(dx * dx + dy * dy);
      }

      nextSegments.push({
        point: { x: points[i].x, y: points[i].y },
        location: { offset: cumulative }
      });
    }

    return nextSegments;
  }

  function calculateLength() {
    if (points.length < 2) return 0;
    var total = 0;

    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var curr = points[i];
      var dx = curr.x - prev.x;
      var dy = curr.y - prev.y;
      total += Math.sqrt(dx * dx + dy * dy);
    }

    return total;
  }

  var path = {
    segments: [],
    length: 0,
    firstSegment: { point: { x: 0, y: 0 } },
    lastSegment: { point: { x: 0, y: 0 } },
    closed: false,
    data: {
      fill: false,
      color: 0,
      ...dataOverrides
    },
    removed: false,
    // Mock methods
    clone: function() {
      var clonedPoints = points.map(function(p) {
        return { x: p.x, y: p.y };
      });
      var clonedData = { ...this.data };
      return createMockPath(clonedPoints, clonedData);
    },
    flatten: function() {
      return this;
    },
    reverse: function() {
      points.reverse();
      syncPathState();
      return this;
    },
    add: function(point) {
      points.push({ x: point.x, y: point.y });
      syncPathState();
      return this;
    },
    remove: function() {
      this.removed = true;
      return this;
    },
    getPointAt: function(offset) {
      if (this.length === 0 || points.length === 0) {
        return this.firstSegment.point;
      }

      if (offset <= 0) return points[0];
      if (offset >= this.length) return points[points.length - 1];

      for (var i = 1; i < this.segments.length; i++) {
        if (this.segments[i].location.offset >= offset) {
          return points[i];
        }
      }

      return points[points.length - 1];
    },
    join: function(otherPath) {
      if (otherPath && otherPath.segments) {
        otherPath.segments.forEach(function(seg) {
          this.add(seg.point);
        }, this);
      }
      return this;
    }
  };

  function syncPathState() {
    path.segments = buildSegmentsFromPoints();
    path.length = calculateLength();
    path.firstSegment = path.segments[0] || { point: { x: 0, y: 0 } };
    path.lastSegment = path.segments[path.segments.length - 1] || { point: { x: 0, y: 0 } };
  }

  syncPathState();

  return path;
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
      // In real Paper.js, sets this as the active layer on the project.
      if (typeof global !== 'undefined' && global.paper && global.paper.project) {
        global.paper.project.activeLayer = this;
      }
      return this;
    },
    insertChild(index, child) {
      var existingIndex = this.children.indexOf(child);
      var targetIndex = index;

      if (existingIndex !== -1) {
        if (existingIndex < targetIndex) {
          targetIndex -= 1;
        }
        this.children.splice(existingIndex, 1);
      }

      this.children.splice(targetIndex, 0, child);
      return child;
    },
    remove() {
      this.removed = true;
      return this;
    },
    insertChildren(index, children) {
      var targetIndex = index;

      children.forEach(function(child) {
        var existingIndex = this.children.indexOf(child);
        if (existingIndex !== -1) {
          if (existingIndex < targetIndex) {
            targetIndex -= 1;
          }
          this.children.splice(existingIndex, 1);
        }
      }, this);

      this.children.splice(targetIndex, 0, ...children);
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
