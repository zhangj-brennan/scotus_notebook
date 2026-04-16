import { CONFIG } from "./config.js";
import { yearDate } from "./utils.js";

export function getSceneConfigs() {
  return [
    {
      id: "scene1",
      stepLabel: "",
      stepTitle: "SCOTUS tenures over time",
      stepBody: `
        <p>
        Since 1789, 116 justices have served on the U.S. Supreme Court. Their tenures have varied, with some justices serving multiple decades (the longest being 36.6 years) while other justices have remained on the bench for just over a year.  
        </p><br>
        <p>
        Overall, median tenure for all Supreme Court justices (excluding the current justices) is 16.5 years, 
        but the large variation makes median tenure noisy. 
        The current justices do not have a large effect on this median because they include largely newly appointed justice with short tenures.  </p>
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
      stepTitle: "68% of justices last more than 10 years on the court",
      stepBody: `
        <p>Looking at the justices’ survival rate is another helpful data point: how many justices remain after, say, 10 years on the bench?  </p>
        <br>
        <p>The horizontal line at the 10-year mark divides the justices into two groups: the group above the line are the justices that remained on the bench for more than a decade and below the line reflects those that did not. This tells us that 68% of Supreme Court justices (excluding the current justices) spend more than 10 years on the court.</p>
      `,
      threshold: CONFIG.sceneThresholds.scene2
    },
    {
      id: "scene4",
      stepLabel: "",
      stepTitle: "At 20 years, that rate falls to 40%",
      stepBody: `
        <p>If we adjust the threshold to be 20 years on the bench, the survival rate falls to 40%, or in 	other words, 40% of Supreme Court justices (excluding the current justices) serve for 20 	or more years.  </p>
        <br><br>
        <p>You can adjust the threshold by moving the red line up or down. This will tell you the 	survival rate at different points in tenure.  </p>
      `,
      threshold: CONFIG.sceneThresholds.scene4
    },
    {
      id: "scene5",
      stepLabel: "Scene 4",
      stepTitle: "Justices starting after 1950 are more likely to have long careers",
      stepBody: `
        <p>It’s also helpful to look at how the survival rate changes over time. This chart adds that 	extra dimension by splitting the Court's history into 2 time periods: pre-1966 and post-	1966. Before 1966, about half the justices remained 	on the bench for 15 years, and half 	did not. But after 1966, every single justice (excluding the current justices) served for at 	least 15 years.  </p>
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
        <p>This last graph allows you to adjust both lines: length of tenure and year in the Court’s 	history. This lets you explore how tenure survival changes across different time splits and 	 tenure thresholds. </p>
      `,
      threshold: CONFIG.sceneThresholds.scene6,
      splitYear: CONFIG.sceneSplitYears.scene6,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene6)
    }
    
  ];
}