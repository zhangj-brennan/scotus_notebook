Promise.all([d3.csv("SCOTUS - combined_data.csv")])
.then(function(data){
            drawEndReason(data[0])
        })
function drawEndReason(data){
    var bar = 30
    var h = 260
    var w = 500
    var p = 40
    var causeDict = {}
    for(var i in data){
        var cause = data[i]["end reason"]
        if(Object.keys(causeDict).indexOf(cause)==-1){
            causeDict[cause]=1
        }else{
            causeDict[cause]+=1
        }
    }

    var sorted = Object.keys(causeDict).sort(function(a,b){
        return causeDict[b]-causeDict[a]
    })
    var barScale=d3.scaleLinear().domain([0,55]).range([0,w-p*2])


    var svg = d3.select("#endReason").append("svg").attr("width",w).attr("height",h)
    var chart = svg.append("g")
    chart.append("text").text("Reasons for end of tenure").attr("x",0).attr("y",20)
    chart
    .append("g")
    .attr("transform","translate(0,"+p+")")
    .selectAll(".bar")
    .data(sorted)
    .join("rect")
    .attr("x",0)
    .attr("y",function(d,i){return i*bar})
    .attr("height",bar/2)
    .attr("width",function(d){
        return barScale(causeDict[d])
    })
    chart
    .append("g")
    .attr("transform","translate(0,"+p+")")
    .selectAll(".bar")
    .data(sorted)
    .join("text")
    .attr("x",0)
    .attr("y",function(d,i){return i*bar-2})
    .text(function(d){
        if (d==""){
            return "NA"
        }
       return d
    })

    chart
    .append("g")
    .attr("transform","translate(0,"+p+")")
    .selectAll(".bar")
    .data(sorted)
    .join("text")
   .attr("x",function(d){
        return barScale(causeDict[d])+4
    })    
    .attr("y",function(d,i){return i*bar+p/3})
    .text(function(d,i){
        if(i==0){
            return causeDict[d]+" Justices"
        }
        return causeDict[d]
    })



}
