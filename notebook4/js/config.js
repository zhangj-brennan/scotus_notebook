export const CONFIG = {
  csvPath: "data.csv",
  fields: {
    name: "name",
    days: "days",
    start: "start date",
    isCurrent: "isCurrent"
  },

  chartDesktop: {
    width: 1040,
    height: 560,
    margin: { top: 22, right: 26, bottom: 58, left: 74 },
    xTicks: 8,
    yTicks: 6,
    pointRadius: 4.5
  },

  chartMobile: {
    width: 760,
    height: 820,
    margin: { top: 28, right: 22, bottom: 66, left: 72 },
    xTicks: 5,
    yTicks: 6,
    pointRadius: 6
  },

  mobileBreakpoint: 980,
  yAxisMaxPaddingYears: 2,

  sceneThresholds: {
    scene1: 16.3,
    scene2: 10,
    scene3: 20,
    scene4: 15,
    scene5: 15,
    scene6: 15
  },

  sceneSplitYears: {
    scene5: 1966,
    scene6: 1966,
  }
};

export function getChartDimensions(viewportWidth = window.innerWidth) {
  return viewportWidth <= CONFIG.mobileBreakpoint
    ? CONFIG.chartMobile
    : CONFIG.chartDesktop;
}