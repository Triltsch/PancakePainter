/**
 * @file Shared main-process constants and default settings values.
 */
'use strict';

function getAppConstants() {
  return {
    pancakeShades: [
      '#ffea7e',
      '#e2bc15',
      '#a6720e',
      '#714a00'
    ],
    botSpeedMax: 6600,
    griddleSize: {
      width: 507.5,
      height: 267.7
    },
      // Intrinsic dimensions from the griddle SVG viewBox.
      // Using fixed constants avoids the Chromium-version-dependent
      // naturalWidth value for SVGs without explicit size attributes.
      griddleSvgNaturalSize: {
        width: 1437.2,
        height: 758.8
      },
      printableArea: {
      offset: {
        left: 36.22,
        top: 34.77,
        right: 42
      },
      width: 443,
      height: 210
    }
  };
}

function getDefaultSettings() {
  return {
    window: {
      width: 980,
      height: 600,
      y: 'center',
      x: 'center'
    },
    lastFile: '',
    flatten: 2,
    shutoff: 25,
    startwait: 350,
    endwait: 250,
    changewait: 15,
    botspeed: 70,
    usecolorspeed: false,
    useshortest: true,
    botspeedcolor1: 100,
    botspeedcolor2: 80,
    botspeedcolor3: 80,
    botspeedcolor4: 50,
    uselinefill: false,
    fillspacing: 10,
    fillangle: 23,
    fillthresh: 27,
    shapefillwidth: 3
  };
}

module.exports = {
  getAppConstants: getAppConstants,
  getDefaultSettings: getDefaultSettings
};
