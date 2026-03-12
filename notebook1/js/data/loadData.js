// js/data/loadData.js
// Loads the SCOTUS CSV once and returns rows (strings as in d3.csv), no chart logic here.
(function(){
  window.SCOTUS_DATA = window.SCOTUS_DATA || {};

  window.SCOTUS_DATA.load = function load(csvUrl){
    return d3.csv(csvUrl);
  };
})();
