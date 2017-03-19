/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 3/19/17
 * Description: Main and helper functions
 * for fact-checking program pop-up (UI logic).
 */

var parsedData;
var keyWords;
var factPct = -1;

function pollFactData() {
  var bg = chrome.extension.getBackgroundPage();
  if(bg) {
    parsedData = bg.factoids;
    keyWords = bg.keyWords;
    if(bg.factoids) {
      if(bg.factoids.length == bg.den) {
        factPct = bg.num / bg.den;
      }
    }
  }
}

function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function drawPieChart() {
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var centerX = Math.floor(canvas.width / 2);
    var centerY = Math.floor(canvas.height / 2);
    var radius = Math.floor(canvas.width / 3);

    // Filling "accuracy" percentage of pie chart starting at 12 o'clock.
    var percentage = factPct;
    var startingAngle = Math.PI * 1.5;
    var arcSize = degreesToRadians(percentage * 360); // Multiply % by 360 degrees for proportion of circle.
    if(arcSize <= 0) arcSize = 0.000001;
    var endingAngle = startingAngle + arcSize;

    ctx.lineWidth = 20;
    ctx.strokeStyle = "#4ED25E";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startingAngle, endingAngle, false);
    ctx.stroke();

    // Complementing it, for the full doughnut chart effect.
    ctx.lineWidth = 20;
    ctx.strokeStyle = "#ECF0F1";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, endingAngle, startingAngle, false);
    ctx.stroke();

    // Add percentage readout.
    if(percentage == 1.0) {
      ctx.fillStyle = "#267F00";
      ctx.font = "45px Arial";
    }
    if(percentage >= 0.8 && percentage < 1.0) {
      ctx.fillStyle = "#267F00";
      ctx.font = "50px Arial";
    }
    if(percentage < 0.8 && percentage > 0.6) {
      ctx.fillStyle = "#FFFF00";
      ctx.font = "50px Arial";
    }
    if(percentage <= 0.6 && percentage >= 0.1) {
      ctx.fillStyle = "#E67E22";
      ctx.font = "50px Arial";
    }
    if(percentage < 0.1) {
      ctx.fillStyle = "#E74C3C";
      ctx.font = "50px Arial";
    }

    ctx.textAlign="center";

    if(percentage == -1 || isNaN(percentage)) {
      ctx.font = "bold 30px Arial";
      ctx.fillStyle = "#000000";
      ctx.fillText("Loading...", centerX, centerY + 15);
    }
    else {
      ctx.fillText(Math.round(percentage * 100) + "%", centerX, centerY + 15);
      ctx.font = "bold 15px Arial";
      ctx.fillStyle = "#000000";
      ctx.fillText("Accuracy", centerX, centerY + 40);
    }
}

/*
 * Call to scrape page content.  No validation for the page to be fully loaded.
 */
chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabArray) {
  chrome.tabs.executeScript(tabArray[0].id, {file: "content.js"});
});

// Return results in a descriptive UI.
window.onload = function displayChart() {
    document.getElementById("fact_text").style.color="#E74C3C";
    document.getElementById("fact_text").innerHTML = "No Content Found.<br>Try Refreshing.";

    pollFactData();

    if(parsedData) {
      document.getElementById("fact_text").style.color="#000000";
      document.getElementById("fact_text").innerHTML = "Factoids Checked:";
      document.getElementById("fact_num").innerHTML = parsedData.length.toLocaleString();
      drawPieChart();
    }

    var a = document.getElementById('links'); // Add/remove related links.
    if(keyWords) {
      keyWords = keyWords.replace(/\s/g, "%20");
      a.href = "https://www.google.com/webhp?sourceid=chrome-instant&ion=1&espv=2&es_th=1&ie=UTF-8#q=" + keyWords;
    }
    else {
      a.parentNode.removeChild(a);
    }
};
