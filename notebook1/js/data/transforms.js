// js/data/transforms.js
(function(){
  window.SCOTUS_UTILS = window.SCOTUS_UTILS || {};

  window.SCOTUS_UTILS.average = function average(arr){
    var sum = 0;
    for(var i in arr){ sum += arr[i]; }
    return Math.round(sum / arr.length);
  };

  window.SCOTUS_UTILS.getMedian = function getMedian(arr){
    var sorted = arr.sort(function(a,b){ return a-b; });
    var length = sorted.length;
    if(length % 2 === 1){
      return sorted[(length/2) - 0.5];
    }else{
      return (sorted[length/2] + sorted[(length/2)-1]) / 2;
    }
  };

  window.SCOTUS_UTILS.getAges = function getAges(data){
    for(var i in data){
      if(data[i]["start"] !== undefined){
        var justice = data[i];
        var ageStart = justice["start"].split("/")[2] - justice["birth"];
        var ageEnd   = justice["end"].split("/")[2]   - justice["birth"];
        data[i]["ageAtStart"] = ageStart;
        data[i]["ageAtEnd"]   = ageEnd;
      }
    }
    return data;
  };
})();
