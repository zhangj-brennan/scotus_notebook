export const CONFIG = {
  csvPath: "data.csv",
  fields: {
    name: "name",
    days: "days",
    start: "start date",
    isCurrent: "isCurrent"
  },
  chart: {
    width: 1040,
    height: 560,
    margin: { top: 22, right: 26, bottom: 58, left: 74 }
  },
  pointRadius: 4.5,
  yAxisMaxPaddingYears: 2,
  sceneThresholds: {
    scene2: 10,
    scene3: 20,
    scene4: 15,
    scene5: 20,
    scene6: 20
  },
  sceneSplitYears: {
    scene5: 1950,
    scene6: 1950
  }
};
