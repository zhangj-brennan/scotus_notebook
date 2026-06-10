import { CONFIG } from "./config.js";
import { yearDate } from "./utils.js";

export function getSceneConfigs() {
  return [
    {
      id: "scene1",
      stepLabel: "",
      stepTitle: "54 out of 107 Justices, or 50% of all justices have served on the court over 16.5 years",
      stepBody: `
      <p>A scatterplot of all SCOTUS justices</p><br>
        <p>
Since 1789, 116 justices have served on the U.S. Supreme Court. Their tenures have varied, with some justices serving multiple decades (the longest being 36.6 years) while other justices have remained on the bench for just over a year.         </p><br>
        <p>
Overall, median tenure for former Supreme Court justices is 16.5 years. The current justices do not have a large effect on the median time served by a Supreme Court justice because they reflect only nine data points out of a large sample.        </p>
        
        <div class="legend">
          <div class="legend-item"><span class="legend-swatch"></span><span>Former justices</span></div>
          <div class="legend-item"><span class="legend-swatch current"></span><span>Current justices</span></div>
        </div>
      `,
      threshold: CONFIG.sceneThresholds.scene1
    },
    {
      id: "scene2",
      stepLabel: "",
      stepTitle: "68% of justices last more than 10 years on the court ",
      stepBody: `
        <p>Looking at the justices’ durability rate is another helpful data point: how many justices remain after, say, 10 years on the bench? </p><br>
        <p>The horizontal line at the 10-year mark divides the justices into two groups: the group above the line are the justices that remained on the bench for more than a decade and below the line reflects those that did not. This tells us that 68% of former Supreme Court justices spend more than 10 years on the court.  </p>
      `,
      threshold: CONFIG.sceneThresholds.scene2
    },
    {
      id: "scene4",
      stepLabel: "",
      stepTitle: "At 20 years, the durability rate falls to 40%",
      stepBody: `
        <p>If we adjust the threshold to be 20 years on the bench, the durability rate falls to 40%, or in other words, 40% of former Supreme Court justices serve for 20 or more years. </p>
        <br><p>Adjust the threshold by moving the red line up or down. This will tell you the durability rate at different points in tenure. </p>
      `,
      threshold: CONFIG.sceneThresholds.scene4
    },
    {
      id: "scene5",
      stepLabel: "",
      stepTitle: "Justices starting after 1950 are more likely to have long tenures ",
      stepBody: `
        <p>It’s also helpful to look at how the durability rate changes over time. This chart adds that extra dimension by splitting the Court's history into 2 time periods: pre-1966 and post-1966. Before 1966, about half the justices remained on the bench for 15 years, and half did not. But after 1966, every single former justice  served for at least 15 years. </p>
      `,
      threshold: CONFIG.sceneThresholds.scene5,
      splitYear: CONFIG.sceneSplitYears.scene5,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene5)
    },
    {
      id: "scene6",
      stepLabel: "",
      stepTitle: "Customizable Graph",
      stepBody: `
  
  <p>This last graph allows you to adjust both lines: length of tenure and year in the Court's history. This lets you explore how tenure durability changes across different time splits and tenure thresholds. </p>
`,
      threshold: CONFIG.sceneThresholds.scene6,
      splitYear: CONFIG.sceneSplitYears.scene6,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene6)
    },{
  id: "sceneMedianSplitDraggable",
  stepLabel: "",
  stepTitle: "Median tenure after 1966 is more than 10 years longer than before 1966",
  stepBody: `
 <p>Justices who served on the Court prior to 1966 stayed for a median of 15.3 years. But for the justices that served on the Court after 1966, that number jumps dramatically to a median of 25.7 years.  </p>
 <br><p>The red line is adjustable. This lets you explore how median tenure compares across two time periods.  </p>
    `,
  medianOnly: true,
  medianSplitDraggable: true,
  splitYear: CONFIG.sceneSplitYears.sceneMedianSplitDraggable,
  splitDate: yearDate(CONFIG.sceneSplitYears.sceneMedianSplitDraggable)
}
  ];
}