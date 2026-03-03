// js/charts/longestTenure.js
(function(){
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  window.SCOTUS_CHARTS.drawLongestTenure = function drawLongestTenure(data, colors){
    var w = 900;
    var p = 150;
    var h = 150;
    var r = 12;

    var svg = d3.select("#longestTenure").append("svg")
      .attr("width", w)
      .attr("height", h);

    for(var i in data){
      var years = data[i]["days/term"]/365;
      var justice = svg.append("g").attr("transform","translate("+p+",10)");
      for(var j=0; j<years; j++){
        justice.append("rect")
          .attr("x", j*(r+2))
          .attr("y", i*(r+2))
          .attr("width", r)
          .attr("height", r)
          .attr("fill", function(){
            if(data[i]["first last"]!="Clarence Thomas"){
              return colors.blue;
            }else{
              return "black";
            }
          });
      }
      justice.append("text").text(data[i]["first last"])
        .attr("x", -2)
        .attr("y", i*(r+2)+r)
        .attr("text-anchor","end")
        .attr("fill", function(){
          if(data[i]["first last"]!="Clarence Thomas"){
            return colors.blue;
          }else{
            return "black";
          }
        });
    }
  };
})();
