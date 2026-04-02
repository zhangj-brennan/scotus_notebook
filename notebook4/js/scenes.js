import { CONFIG } from "./config.js";
import { yearDate } from "./utils.js";

export function getSceneConfigs() {
  return [
    {
      id: "scene1",
      stepLabel: "",
      stepTitle: "A scatterplot of all SCOTUS justices",
      stepBody: `
        <p>Since 1789, 116 supreme court justices have been on the court. Their tenures have varied between 36 years (Douglas) and just over a year (Byrnes).</p>
        <br>
        <div class="legend">
          <div class="legend-item"><span class="legend-swatch"></span><span>Former justices</span></div>
          <div class="legend-item"><span class="legend-swatch current"></span><span>Current justices</span></div>
        </div>
        <br>
        <p>Current justices do not have a large effect on the median time served as a whole. And median age is noisy over time.</p>
      `
    },
    {
      id: "scene2",
      stepLabel: "",
      stepTitle: "67% of justices last more than 10 years on the court",
      stepBody: `
        <p>A <u>survival rate</u> is the proportion of individuals in a group who remain above a defined threshold over a given period.</p>
        <br>
        <p>The horizontal line at the 10-year mark divides the justices into 2 groups. The circles above the line represent the justices that remain on the bench after 10 years. In other words, at 10 years, 67% is the survival rate of the supreme court.</p>
      `,
      threshold: CONFIG.sceneThresholds.scene2
    },
    {
      id: "scene4",
      stepLabel: "",
      stepTitle: "At 20 years, that rate falls to 39.7%",
      stepBody: `
        <p>Raising the threshold lowers the survival rate. You can move it to any tenure length and see the rate update in real time.</p>
        <br><br>
        <p>Survival rates change over time ...</p>
      `,
      threshold: CONFIG.sceneThresholds.scene4
    },
    {
      id: "scene5",
      stepLabel: "Scene 4",
      stepTitle: "Justices starting after 1950 are more likely to have long careers",
      stepBody: `
        <p>In the past 60 years (since 1966), no justice has left the bench before 15 years. Whereas before 1966, almost half (48%) did.</p>
      `,
      threshold: CONFIG.sceneThresholds.scene5,
      splitYear: CONFIG.sceneSplitYears.scene5,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene5)
    },
    {
      id: "scene6",
      stepLabel: "Scene 6",
      stepTitle: "",
      stepBody: `
        <p>In the final scene, both lines are draggable. This lets you explore how tenure survival changes across different time splits and thresholds.</p>
      `,
      threshold: CONFIG.sceneThresholds.scene6,
      splitYear: CONFIG.sceneSplitYears.scene6,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene6)
    }
  ];
}