/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 3/28/17
 * Description: Main and helper functions
 * for fact-checking program pop-up (UI logic).
 */

var parsedData;
var keyWords;
var factPct = -1;
var listVisible = false;

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
      ctx.fillStyle = "#FF0000";
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
    document.getElementById("fact_text").style.color="#FF0000";
    document.getElementById("fact_text").innerHTML = "No Content Found.<br>Try Refreshing.";

    pollFactData();

    var facts = document.getElementById('facts');
    if(parsedData) {
      document.getElementById("fact_text").style.color="#000000";
      chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabArray) {
        document.getElementById("fact_text").innerHTML = "Factoids checked at:" +
          "<a alt=\"Link Checked\" style=\"display:block;width:200px;overflow:hidden;text-overflow:ellipsis;font-size:75%;\">" +
          tabArray[0].url + "</a>";
      });
      document.getElementById("fact_num").innerHTML = parsedData.length.toLocaleString();
      drawPieChart();

      facts.onclick = function() {
        var list = document.createElement('ul');
        list.id = "genList";

        if(!listVisible) {
          for(var i = 0; i < parsedData.length; i++) {
            var factItem = document.createElement('li');
            factItem.appendChild(document.createTextNode(parsedData[i]));
            list.appendChild(factItem);
          }

          document.getElementById('factList').appendChild(list);
          listVisible = true;
        }
        else {
          document.getElementById('factList').innerHTML = "";
          listVisible = false;
        }

        return false;
      };
    }
    else {
      facts.parentNode.removeChild(facts);
    }

    // Add or hide a search link to Google.
    var linkSearch = document.getElementById('links');
    if(keyWords) {
      keyWords = keyWords.replace(/\s/g, "%20");
      linkSearch.href = "https://www.google.com/webhp?sourceid=chrome-instant&ion=1&espv=2&es_th=1&ie=UTF-8#q=" + keyWords;
    }
    else {
      linkSearch.parentNode.removeChild(a);
    }
};
