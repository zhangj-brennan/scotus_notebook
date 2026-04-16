import { CONFIG } from "./config.js";
import { yearDate } from "./utils.js";

export function getSceneConfigs() {
  return [
    {
      id: "scene1",
      stepLabel: "",
      stepTitle: "SCOTUS tenures vary",
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
      stepTitle: "67% of justices last more than 10 years on the court",
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
      stepTitle: "At 15 years, that rate falls by 10%",
      stepBody: `
        <p>57% of Supreme Court justices serve for 15 or more years.  </p>
        <br><p>Adjust the threshold by moving the red line up or down. 
        This will tell you the survival rate at different points in tenure.  </p>
      `,
      threshold: CONFIG.sceneThresholds.scene4
    },
    {
      id: "scene5",
      stepLabel: "",
      stepTitle: "Justices who started in the last 40 years are more likely to have long careers",
      stepBody: `
        <p>If we draw a line at 40 years ago in 1966,
        we see that the length of tenure has changed in the last 40 years.
        Before 1966, just over half (52%) of justices were on the bench more than 15 years, whereas in more recent years, 81% work at least that long.</p>
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