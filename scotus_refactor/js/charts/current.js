// js/charts/current.js
(function(){
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  window.SCOTUS_CHARTS.drawCurrent = function drawCurrent(data, colors){
    var barH = 10;
    var w = 800;
    var p = 150;
    var h = 250;
    var hp = 50;
    var gap = 10;

    var tenures = [];
    var longest = d3.max(data, function(d){
      tenures.push((new Date(d.end)-new Date(d.start))/365/24/1000/60/60);
      return Math.round((new Date(d.end)-new Date(d.start))/365/24/1000/60/60);
    });
    var shortest = d3.min(data, function(d){
      return Math.round((new Date(d.end)-new Date(d.start))/365/24/1000/60/60);
    });

    var averageTenure = window.SCOTUS_UTILS.average(tenures);

    d3.select("#current").append("div").attr("class","section")
      .html("Current Justices<br>Longest: "+longest
        + " Years<br>"+"Shortest: "+shortest+" Years<br>"
        +"Average: "+averageTenure+" Years");

    var svg = d3.select("#current").append("svg")
      .attr("width", w)
      .attr("height", h)
      .append("g");

    var earliest = d3.min(data, function(d){ return new Date(d.birth); });
    var latest = d3.max(data, function(d){ return new Date(); });

    var daysScale = d3.scaleLinear()
      .domain([earliest, latest])
      .range([p, w-p]);

    var xAxis = d3.axisBottom().scale(daysScale).ticks(7)
      .tickFormat(function(d){ return new Date(d).getFullYear(); });

    svg.append("g").call(xAxis).attr("transform","translate(0,"+(h-hp)+")");

    svg.selectAll(".currentJustice")
      .data(data)
      .join("rect")
      .attr("width", function(d){ return daysScale(new Date(d.end)) - daysScale(new Date(d.start)); })
      .attr("height", 4)
      .attr("x", function(d){ return daysScale(new Date(d.start)); })
      .attr("y", function(d,i){ return (i+1.2)*(barH+gap); })
      .attr("fill", colors.blue);

    svg.selectAll(".durationLabel")
      .data(data)
      .join("text")
      .attr("class","durationLabel")
      .text(function(d,i){
        if(i==0){
          return Math.round(d["years = days/365"]*10)/10+" Years on the court";
        }else{
          return Math.round(d["years = days/365"]*10)/10;
        }
      })
      .attr("x", function(d){ return daysScale(new Date(d.end))+5; })
      .attr("y", function(d,i){ return (i+1.5)*(barH+gap); })
      .attr("fill", colors.blue);

    svg.selectAll(".nameLabel")
      .data(data)
      .join("text")
      .attr("class","durationLabel")
      .text(function(d){ return d["first last"]; })
      .attr("x", function(d){ return daysScale(new Date(d.start))-10; })
      .attr("y", function(d,i){ return (i+1.5)*(barH+gap); })
      .attr("text-anchor","end")
      .attr("fill", colors.blue);
  };
})();
