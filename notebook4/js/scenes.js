import { CONFIG } from "./config.js";
import { yearDate } from "./utils.js";

export function getSceneConfigs() {
  return {
    scene1: {
      label: "Step 1",
      title: "A scatterplot of all justices"
    },
    scene2: {
      label: "Step 2",
      title: "A horizontal line at 10 years",
      threshold: CONFIG.sceneThresholds.scene2
    },
    scene3: {
      label: "Step 3",
      title: "Move the threshold to 20 years",
      threshold: CONFIG.sceneThresholds.scene3
    },
    scene4: {
      label: "Step 4",
      title: "An interactive survival threshold",
      threshold: CONFIG.sceneThresholds.scene4
    },
    scene5: {
      label: "Step 5",
      title: "Split the chart at 1950",
      threshold: CONFIG.sceneThresholds.scene5,
      splitYear: CONFIG.sceneSplitYears.scene5,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene5)
    },
    scene6: {
      label: "Step 6",
      title: "Interactive split year and threshold",
      threshold: CONFIG.sceneThresholds.scene6,
      splitYear: CONFIG.sceneSplitYears.scene6,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene6)
    }
  };
}
