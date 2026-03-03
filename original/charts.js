     function average(data){
            var sum = 0
            for(var i in data){
                sum+=data[i]
            }
            return Math.round(sum/data.length)
        }



        function drawCurrent(data){
           // console.log(data)
            var barH = 10;
            var w = 800
            var p = 150
            var h = 250
            var hp = 50
            var gap = 10

            var tenures = []
            var longest = d3.max(data,function(d){
                tenures.push((new Date(d.end)-new Date(d.start))/365/24/1000/60/60)
                return Math.round((new Date(d.end)-new Date(d.start))/365/24/1000/60/60)
            })
             var shortest = d3.min(data,function(d){
                return Math.round((new Date(d.end)-new Date(d.start))/365/24/1000/60/60)
            })            

            var averageTenure = average(tenures)

            d3.select("#current").append("div").attr("class","section")
            .html("Current Justices<br>Longest: "+longest
                + " Years<br>"+"Shortest: "+shortest+" Years<br>"
                +"Average: "+averageTenure+" Years")

            var svg = d3.select("#current").append("svg")
            .attr("width",w)
            .attr("height",h)
            .append("g")            

            var earliest = d3.min(data, function(d){
                return new Date(d.birth)
            })
            var latest = d3.max(data, function(d){
                return new Date()
            })

            var daysScale = d3.scaleLinear()
                .domain([earliest,latest])
                .range([p,w-p])

            var xAxis = d3.axisBottom().scale(daysScale).ticks(7)
            //.ticks([new Date("1/1/2000"),new Date("1/1/1995")])
            .tickFormat(function(d){return new Date(d).getFullYear()})
            svg.append("g").call(xAxis).attr("transform","translate(0,"+(h-hp)+")")

            svg.selectAll(".currentJustice")
            .data(data)
            .join("rect")
            .attr("width",function(d){
                return daysScale(new Date(d.end))-daysScale(new Date(d.start))
            })
            .attr("height",4)
            .attr("x",function(d){
                return daysScale(new Date(d.start))
            })
            .attr("y",function(d,i){return (i+1.2)*(barH+gap)})
            .attr("fill",blue)

            //  svg.selectAll(".currentJustice")
            // .data(data)
            // .join("circle")
            // .attr("r",4)
            // .attr("cx",function(d){
            //     return daysScale(new Date(d.start))
            // })
            // .attr("cy",function(d,i){return (i+1.25)*(barH+gap)})
            // .attr("fill",blue)


             svg.selectAll(".durationLabel")
            .data(data)
            .join("text")
            .attr("class","durationLabel")
            .text(function(d,i){

                if(i==0){
                    return Math.round(d["years = days/365"]*10)/10+" Years on the court"
                }else{
                    return Math.round(d["years = days/365"]*10)/10
                }
                })
            .attr("x",function(d){
                return daysScale(new Date(d.end))+5
            })
            .attr("y",function(d,i){return (i+1.5)*(barH+gap)})
            .attr("fill",blue)

            svg.selectAll(".nameLabel")
            .data(data)
            .join("text")
            .attr("class","durationLabel")
            .text(function(d){return d["first last"]})
            .attr("x",function(d){
                return daysScale(new Date(d.start))-10
            })
            .attr("y",function(d,i){return (i+1.5)*(barH+gap)})
            .attr("text-anchor","end")
            .attr("fill",blue)
        }


    function drawLongest(data){
      // console.log(data)
            var barH = 10;
            var w = 900
            var p = 150
            var h = 150
            var hp = 50
            var gap = 10
            var r = 12

            var svg = d3.select("#longestTenure").append("svg")
            .attr("width",w)
            .attr("height",h)
            
            var earliest = d3.min(data, function(d){
                return new Date(d.start)
            })
            var latest = d3.max(data, function(d){
                return new Date()
            })

            var daysScale = d3.scaleLinear()
                .domain([earliest,latest])
                .range([p,w-p])

            for(var i in data){
                var years = data[i]["days/term"]/365
                var justice = svg.append("g").attr("transform","translate("+p+",10)")
                for(var j =0; j<years; j++){
                    justice.append("rect")
                    .attr("x",j*(r+2))
                    .attr("y",i*(r+2))
                    .attr("width",r)
                    .attr("height",r)
                    .attr("fill",function(){
                    if(data[i]["first last"]!="Clarence Thomas"){
                        return blue
                    }else{
                        return "black"
                    }
                })
                }
                justice.append("text").text(data[i]["first last"]).attr("x",-2).attr("y",i*(r+2)+r)
                .attr("text-anchor","end")                    
                .attr("fill",function(){
                    if(data[i]["first last"]!="Clarence Thomas"){
                        return blue
                    }else{
                        return "black"
                    }
                })


            }
    }
