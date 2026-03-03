// js/charts/ages.js
(function(){
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  window.SCOTUS_CHARTS.drawAgeHistogram = function drawAgeHistogram(data, column, color, title){
    var w = 800;
    var h = 200;
    var p = 50;
    var b = 8;

    var svg = d3.select("#ages")
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .append("g")
      .attr("transform","translate("+p+","+(p)+")");

    svg.append("text").text(title).attr("x", w-p*2).attr("y", 0).style("text-anchor","end");
    svg.append("text").text("Age").attr("x", w/2).attr("y", h-p*1.2).style("text-anchor","middle");
    svg.append("text").text("# of Justices").attr("x", -25).attr("y", -10).style("text-anchor","start");

    var minAge = d3.min(data, function(d){ return d.ageAtStart; });
    var maxAge = d3.max(data, function(d){ return d.ageAtEnd; });

    var aScale = d3.scaleLinear()
      .domain([minAge, maxAge])
      .range([0, w-p*2]);

    var agesOnlyArray = [];
    for(var i in data){
      agesOnlyArray.push(parseInt(data[i][column]));
    }
    var median = window.SCOTUS_UTILS.getMedian(agesOnlyArray);
    svg.append("text").text("Median: "+median).attr("x", w-p*2).attr("y", 20).style("text-anchor","end");

    var yScale = d3.scaleLinear().domain([0,10]).range([0,h-p*2]);
    var yScaleInverse = d3.scaleLinear().domain([0,10]).range([h-p*2,0]);
    var yAxis = d3.axisLeft().scale(yScaleInverse).ticks(3);
    svg.append("g").call(yAxis);

    var xAxis = d3.axisBottom().scale(aScale);
    svg.append("g").call(xAxis)
      .attr("transform","translate(0,"+(h-p*2)+")");

    const histogramStart = d3.histogram()
      .value(function(d){ return d[column]; })
      .domain(aScale.domain())
      .thresholds(aScale.ticks(maxAge-minAge));

    const binsStart = histogramStart(data);

    svg.selectAll(".ageStart")
      .data(binsStart)
      .join("rect")
      .attr("width", b)
      .attr("height", function(d){ return yScale(d.length); })
      .attr("y", function(d){ return h - yScale(d.length) - p*2; })
      .attr("x", function(d){ return aScale(d.x0); })
      .attr("opacity", .3)
      .attr("fill", color);
  };
})();
