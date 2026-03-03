// js/charts/endReason.js
(function(){
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  window.SCOTUS_CHARTS.drawEndReason = function drawEndReason(data){
    var bar = 20;
    var h = 140;
    var w = 600;
    var p = 40;
    var labelOffset = 250;
    var causeDict = {};
    for(var i in data){
      var cause = data[i]["end reason"];
      if(Object.keys(causeDict).indexOf(cause)==-1){
        causeDict[cause]=1;
      }else{
        causeDict[cause]+=1;
      }
    }

    var sorted = Object.keys(causeDict).sort(function(a,b){
      return causeDict[b]-causeDict[a];
    });
    var barScale = d3.scaleLinear().domain([0,55]).range([0,w-labelOffset-p*2]);

    var svg = d3.select("#endReason").append("svg").attr("width",w).attr("height",h);
    var chart = svg.append("g");
    chart.append("text").text("Reasons for leaving the Supreme Court").attr("x",0).attr("y",20)
    .style("font-size","16px");

    chart.append("g")
      .attr("transform","translate(0,"+p+")")
      .selectAll(".bar")
      .data(sorted)
      .join("rect")
      .attr("x",labelOffset+2)
      .attr("y",function(d,i){return i*bar;})
      .attr("height",bar/2)
      .attr("width",function(d){ return barScale(causeDict[d]); });

    chart.append("g")
      .attr("transform","translate(0,"+p+")")
      .selectAll(".label")
      .data(sorted)
      .join("text")
      .style("text-anchor","end")
      .attr("x",labelOffset)
      .attr("y",function(d,i){return i*bar+bar/2;})
      .text(function(d){ return d=="" ? "NA" : d; });

    chart.append("g")
      .attr("transform","translate(0,"+p+")")
      .selectAll(".count")
      .data(sorted)
      .join("text")
      .attr("x",function(d){ return labelOffset+barScale(causeDict[d])+4; })
      .attr("y",function(d,i){return i*bar+bar/2-2;})
      .text(function(d,i){
        if(i==0){ return causeDict[d]+" Justices ("+Math.round(causeDict[d]/116*100)+"%)"; }
        return causeDict[d]+" ("+Math.round(causeDict[d]/116*100)+"%)"
      });
  };
})();
