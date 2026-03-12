// js/charts/currentAge.js
(function(){
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  window.SCOTUS_CHARTS.drawCurrentAge = function drawCurrentAge(data, colors){
    var barH = 10;
    var w = 800;
    var p = 150;
    var h = 250;
    var hp = 50;
    var gap = 10;

    var ages = [];

    var longest = d3.max(data, function(d){
      ages.push((new Date(d.end)-new Date(d.birth))/365/24/1000/60/60);
      return Math.round((new Date(d.end)-new Date(d.birth))/365/24/1000/60/60);
    });
    var shortest = d3.min(data, function(d){
      return Math.round((new Date(d.end)-new Date(d.birth))/365/24/1000/60/60);
    });

    var averageAge = window.SCOTUS_UTILS.average(ages);

    d3.select("#currentAge").append("div").attr("class","section")
      .html("Current Justices<br>Oldest: "+longest+ " Years<br>"+"Youngest: "+shortest+" Years<br>Average: "+averageAge+" Years");

    var svg = d3.select("#currentAge").append("svg")
      .attr("width", w)
      .attr("height", h);

    var earliest = d3.min(data, function(d){ return new Date(d.birth); });
    var latest = d3.max(data, function(d){ return new Date(); });

    var daysScale = d3.scaleLinear()
      .domain([earliest, latest])
      .range([p, w-p]);

    var xAxis = d3.axisBottom().scale(daysScale).ticks(10)
      .tickFormat(function(d){ return new Date(d).getFullYear(); });

    svg.append("g").call(xAxis).attr("transform","translate(0,"+(h-hp)+")");

    // tenure portion (blue)
    svg.selectAll(".currentJusticeTenure")
      .data(data)
      .join("rect")
      .attr("width", function(d){ return daysScale(new Date(d.end))-daysScale(new Date(d.start)); })
      .attr("height", 4)
      .attr("x", function(d){ return daysScale(new Date(d.start)); })
      .attr("y", function(d,i){ return (i+1.2)*(barH+gap); })
      .attr("fill", colors.blue);

    // pre-court life (grey)
    svg.selectAll(".currentJusticeLife")
      .data(data)
      .join("rect")
      .attr("width", function(d){ return daysScale(new Date(d.start))-daysScale(new Date(d.birth)); })
      .attr("height", 4)
      .attr("x", function(d){ return daysScale(new Date(d.birth))-1; })
      .attr("y", function(d,i){ return (i+1.2)*(barH+gap); })
      .attr("fill", colors.grey);

    svg.selectAll(".ageLabel")
      .data(data)
      .join("text")
      .attr("class","durationLabel")
      .text(function(d,i){
        var age = Math.round((new Date(d.end)-new Date(d.birth))/365/1000/60/24/60);
        if(i==0){
          return age+" Years old*";
        }else{
          return age;
        }
      })
      .attr("x", function(d){ return daysScale(new Date(d.end))+5; })
      .attr("y", function(d,i){ return (i+1.5)*(barH+gap); })
      .attr("fill", "#000");

    svg.selectAll(".nameLabel")
      .data(data)
      .join("text")
      .attr("class","durationLabel")
      .text(function(d){ return d["first last"]; })
      .attr("x", function(d){ return daysScale(new Date(d.birth))-10; })
      .attr("y", function(d,i){ return (i+1.5)*(barH+gap); })
      .attr("text-anchor","end")
      .attr("fill", "#000");
  };
})();
