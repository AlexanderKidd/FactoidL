/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 7/25/19
 * Description: Main UI and helper functions
 * for fact-checking program pop-up.
 *
 * Confirmed Factoid: A statement that has been
 * verified by the fact-checking algorithm as true
 * for all intents and purposes.
 */

var parsedData;
var factRecord;
var totalFactoids;
var keyWords;
var factPct = -1;

var isFactListVisible = false;

var loadArcSize = degreesToRadians(45);
var loadStartAngle = 0;
var loadInc = 0;

/*
 * Pulls results once per popup window load from background.js script.
 * Currently, calculates the percentage of "correct" factoids to total factoids.
 */
function pollFactData() {
  var bg = chrome.extension.getBackgroundPage();

  if(bg) {
    parsedData = bg.factoids;
    factRecord = bg.factRecord;
    keyWords = bg.pageKeyWords;

    if(bg.factoids) {
      if(bg.factoids.length == bg.den) {
        totalFactoids = bg.den;
        factPct = bg.num / bg.den;
      }
    }
  }
}

/*
 * Converts degrees to radians.
 */
function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/*
 * Responsible for some calculation and all of the logic of drawing the
 * main statistic as a pie chart: a percentage of confirmed factoids to total factoids checked.
 */
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

  if(percentage == -1 || isNaN(percentage) || parsedData.length != totalFactoids) {
    // Make pie chart a loading animation.
    ctx.strokeStyle = "#4ED25E";
    loadStartAngle = (1.5 * Math.PI * loadInc) / 100;
    var loadEndAngle = loadStartAngle + loadArcSize;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, loadStartAngle, loadEndAngle, false);
    ctx.stroke();

    // Complementing it, for the full doughnut chart effect.
    ctx.strokeStyle = "#ECF0F1";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, loadEndAngle, loadStartAngle, false);
    ctx.stroke();

    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Loading...", centerX, centerY + 15);

    loadInc = (loadInc + 1) % 100;
  }
  else {
    ctx.fillText(Math.round(percentage * 100) + "%", centerX, centerY + 15);
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Accuracy", centerX, centerY + 40);
  }
}

/*
 * This builds the main components of the popup UI, assuming valid data has been received
 * from the background script (e.g., not null, not a different url than currently showing).
 */
function buildUI() {
  var facts = document.getElementById('facts');
  document.getElementById("fact_num").innerHTML = parsedData.length.toLocaleString();
  document.getElementById("links").innerHTML = "<img border=\"0\" alt=\"Google Search\" src=\"search_icon_16x16.png\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;\"> Related";
  document.getElementById("facts").innerHTML = "Factoids <img border=\"0\" alt=\"Google Search\" src=\"fact_icon_16x16.png\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;\">";

  drawPieChart();

  // Generate a list of facts so the user knows what was checked and what to disregard.
  facts.onclick = function() {
    var list = document.createElement('ul');
    $(list).css("list-style", "none");
    $(list).css("padding", "0");
    $(list).css("margin", "0");
    list.id = "genList";

    if(!isFactListVisible) {
      for(var i = 0; i < parsedData.length; i++) {
        var factItem = document.createElement('li');
        var factError = document.createElement('span');
        var factBefore = "";
        if(factRecord[i] == '1') {
          factBefore = "✅";
        }
        else {
          factBefore = "❌";
        }

        if(factRecord[i] == "404") {
          factError.append(document.createTextNode("[404 Error - Could Not Check]"));
          $(factError).css("color", "#AD0000");
        }
        
        factItem.append(document.createTextNode(factBefore + " "));
        factItem.append(factError);
        factItem.append(document.createTextNode(parsedData[i]));
        $(factItem).css("padding", "5px 0px");
        list.appendChild(factItem);
      }

      document.getElementById('factList').appendChild(list);
      isFactListVisible = true;
    }
    else {
      document.getElementById('factList').innerHTML = "";
      isFactListVisible = false;
    }

    return false;
  };

  var linkSearch = document.getElementById('links');

  if(keyWords) {
    keyWords = keyWords.replace(/\s/g, "%20");
    linkSearch.href = "https://www.google.com/search?q=" + keyWords;
    $('#links').show();
  }
  else {
    $('#links').hide();
  }
}

/*
 * Called to scrape page content when this script is active.
 * Currently, no validation for the page to be fully loaded:
 * page content is processed on a rolling basis.
 */
 chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabArray) {
   chrome.tabs.executeScript(tabArray[0].id, {file: "content.js"});
 });

/*
 * Called when the popup window is loaded.
 * Kicks off processing the current tab's page and building the UI.
 */
window.onload = function displayUI() {
  // Default error if data could not be collected for building the UI.
  document.getElementById("fact_text").style.color="#AD0000";
  document.getElementById("fact_text").innerHTML = "No content found.<br><br>Try refreshing the page.";

  // Query the background script for factoid data.  This should probably be a listener of sorts.
  pollFactData();
  setInterval(pollFactData, 500);

  if(parsedData) {
    // Check the link of the page being analyzed.  If it matches the active tab, display results.
    // Otherwise, you can assume the results are old (i.e., from another page, which may be confusing to the user).
    chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabArray) {
      if(chrome.extension.getBackgroundPage().url == tabArray[0].url) {
        document.getElementById("fact_text").style.color="#000000";
        document.getElementById("fact_text").innerHTML = "Factoids checked at:" +
        "<span id=\"current-link\" title=\"" + tabArray[0].url + "\" style=\"display:block;width:200px;overflow:hidden;text-overflow:ellipsis;font-size:75%;\">" +
        tabArray[0].url + "</span>";

        // Continuously build/update the UI as facotid data is processed.
        buildUI();
        setInterval(buildUI, 1000);
      }
      else {
        document.getElementById("fact_text").style.color="#AD0000";
        document.getElementById("fact_text").innerHTML = "Tab switched.<br><br>Refresh the page for a new fact check.";
      }
    });
  }
};
