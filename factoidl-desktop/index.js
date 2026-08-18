/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/14/19
 * Description: Main UI and helper functions
 * for fact-checking program pop-up.
 *
 * Verified Factoid: A statement that has been
 * verified by the fact-checking algorithm/source used
 * as true for all intents and purposes.
 */

var url = "";
var parsedData = [];
var factRecord;
var totalFactoids;
var keyWords;
var relatedSearchTerms;
var factPct = -1;

var pollInterval;
var buildUIInterval;

var isFactListVisible = false;
var isFactCheckInProgress = false;

var loadArcSize = degreesToRadians(45);
var loadStartAngle = 0;
var loadInc = 0;

var bgWorker = new Worker('background.js');

function updateFactoidSummary() {
  if (!parsedData || !factRecord) return;
  var correct = 0, unverified = 0, incorrect = 0;
  for (var i = 0; i < factRecord.length; i++) {
    if (factRecord[i] == '1') correct++;
    else if (factRecord[i] == '-1') incorrect++;
    else unverified++;
  }
  document.getElementById('factoid_correct_count').textContent = correct;
  document.getElementById('factoid_unverified_count').textContent = unverified;
  document.getElementById('factoid_incorrect_count').textContent = incorrect;
  document.getElementById('factoid_correct_segment').style.flexGrow = correct;
  document.getElementById('factoid_unverified_segment').style.flexGrow = unverified;
  document.getElementById('factoid_incorrect_segment').style.flexGrow = incorrect;
  $('#factoid_summary').toggle(correct + unverified + incorrect > 0);
}

/*
 * Pulls in the results once per popup window load from background.js script.
 * Currently, calculates the percentage of "correct" (verified) factoids to total factoids.
 */
function pollFactData() {
  bgWorker.postMessage({"pollRequest" : true});
}

bgWorker.onmessage = function(event) {
  var bg = event.data.bg;

  if(bg) {
    url = bg.url;
    parsedData = bg.factoids;
    factRecord = bg.factRecord;
    keyWords = bg.pageKeyWords;
    relatedSearchTerms = bg.sourceSearchTerms || keyWords;
    updateFactoidSummary();

    // Default error if data could not be scraped or no data.
    if(!parsedData && bg.completed) {
      clearInterval(buildUIInterval);
      clearInterval(pollInterval);

      $('#factoidl_icon').hide();
      $('#myCanvas').hide();
      $('#fact_num').hide();
      $('#links').hide();
      $('#facts').hide();
      $('#fact_box').prop('disabled', false);
      $('#check_button').prop('disabled', false);
      isFactCheckInProgress = false;
      document.getElementById("fact_text").style.color="#AD0000";
      document.getElementById("fact_text").innerHTML = "No content found.<br><br>Try refreshing the page.";
    }
    else {
      if(bg.factoids) {
        if(bg.completed && bg.factoids.length == bg.den) {
          totalFactoids = bg.den;
          factPct = getFactoidCorrectCount() / bg.den;
          $('#links, #facts').show();
          isFactCheckInProgress = false;
          document.getElementById('fact_box').disabled = false;
        }
      }
    }
  }
};

/*
 * Converts degrees to radians.
 */
function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/*
 * Responsible for composing main statistic as a pie chart:
 * a percentage of verified factoids to total factoids checked.
 */
function drawPieChart() {
  var canvas = document.getElementById("myCanvas");
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var centerX = Math.floor(canvas.width / 2);
  var centerY = Math.floor(canvas.height / 2);
  var radius = Math.floor(canvas.width / 3);

  // Filling verified percentage of pie chart starting at 12 o'clock.
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

    loadInc = (loadInc + 1) % (134);
  }
  else {
    ctx.fillText(Math.round(percentage * 100) + "%", centerX, centerY + 15);
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Verified", centerX, centerY + 40);
  }
}

function getFactoidCorrectCount() {
  return (factRecord || []).filter(function(result) { return result == '1'; }).length;
}

/*
 * This builds the main components of the popup UI, assuming valid data has been received
 * from the background script (e.g., not null, not a different url than currently showing).
 */
function buildUI() {
  var facts = document.getElementById('facts');

  drawPieChart();
  updateFactoidSummary();

  // Generate a list of facts so the user knows what was checked and what to disregard.
  facts.onclick = function() {
    var list = document.createElement('ul');
    $(list).css("list-style", "none");
    $(list).css("padding", "0");
    $(list).css("margin", "0");
    list.id = "genList";

    if(!isFactListVisible && parsedData && parsedData.length > 0) {
      for(var i = 0; i < parsedData.length; i++) {
        var factItem = document.createElement('li');
        var factError = document.createElement('span');
        var factBefore = "";
        if(factRecord[i] == '1') {
          factBefore = "✅";
        }
        else if(factRecord[i] == '-1') {
          factBefore = "❌";
        }
        else {
          factBefore = "?";
        }

        if(factRecord[i] == "404") {
          factError.append(document.createTextNode("[404 Error - Could Not Check]"));
          $(factError).css("color", "#AD0000");
        }

        if (factBefore === "?") {
          var unverifiedMarker = document.createElement('span');
          unverifiedMarker.className = 'factoid_unverified_marker';
          unverifiedMarker.appendChild(document.createTextNode(factBefore + " "));
          factItem.appendChild(unverifiedMarker);
        }
        else factItem.append(document.createTextNode(factBefore + " "));
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

  if(relatedSearchTerms) linkSearch.href = "https://www.google.com/search?q=" + encodeURIComponent(relatedSearchTerms);
}

/*
 * Called to kick off scraping the page, polling the scraped text processing,
 * and refreshing the UI.
 */
function startFactCheck() {
  var factsToCheck = document.getElementById('fact_box').value;
  var sourceApiUrl = document.getElementById('source_api_box').value;
  var sourceQueryParams = document.getElementById('query_for_sources_param_box').value;
  var retrieveSourceTextParams = document.getElementById('retrieve_sources_param_box').value;

  var contentParse = contentScrape(factsToCheck, this.url);
  parsedData = [];
  factRecord = [];
  factPct = -1;
  totalFactoids = undefined;
  isFactListVisible = false;
  $('#factList').empty();
  $('#factoid_summary').hide();
  document.getElementById("fact_text").style.color="#000000";
  document.getElementById("fact_text").textContent = "FactoidL";
  $('#links, #facts').hide();
  $('#check_button').prop('disabled', true);
  $('#fact_box').prop('disabled', true);
  isFactCheckInProgress = true;

  // Immediately post relevant data to background.js
  bgWorker.postMessage({"contentParse" : contentParse.data, "tags" : contentParse.tags, "url" : contentParse.url, "sourceApiUrl": sourceApiUrl, "sourceQueryParams": sourceQueryParams, "retrieveSourceTextParams": retrieveSourceTextParams});

  // Query the background script for factoid data.  This should probably be a listener of sorts.
  pollFactData();
  clearInterval(pollInterval);
  pollInterval = setInterval(pollFactData, 500);

  // Continuously build/update the UI as factoid data is processed.
  buildUI();
  clearInterval(buildUIInterval);
  buildUIInterval = setInterval(buildUI, 250);

  setAnalysisUI(); // Transition from initial screen to factoid analysis UI.

  // if(urlToCheck != url) {
  //   $.ajax({
  //     type: "GET",
  //     url: urlToCheck,
  //     dataType: "html",
  //     async: true,
  //     success: function (html) {
  //
  //     },
  //     error: function (xhr, status, error) {
  //       console.error("Error: startFactCheck() could not get requested page to check. Message: " + error +
  //       "." + "\n" + "Site: " + url);
  //
  //       document.getElementById("fact_text").style.color="#FF0000";
  //       document.getElementById("fact_text").innerHTML = "404 Page Not Found.<br><br>URL Invalid or Site Is Offline.";
  //     }
  //   });
  // }
}

function setAnalysisUI() {
  $('#factoidl_icon').hide();
  $('#myCanvas').show();

  document.getElementById("fact_text").style.color="#000000";
  document.getElementById("fact_text").textContent = "FactoidL";

  document.getElementById("links").innerHTML = "<span style=\"border-style: solid;\"><img border=\"0\" alt=\"Google Search\" src=\"search_icon_16x16.png\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;\"> Related</span>";
  document.getElementById("facts").innerHTML = "<span style=\"border-style: solid;\">Factoids <img border=\"0\" alt=\"Google Search\" src=\"fact_icon_16x16.png\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;\"></span>";
}

document.addEventListener('DOMContentLoaded', function() {
    var checkButton = document.getElementById('check_button');
    // onClick logic:
    checkButton.addEventListener('click', function() {
        startFactCheck();
    });
});

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('fact_box').addEventListener('input', function() {
    if (!isFactCheckInProgress && this.value.trim()) {
      document.getElementById('check_button').disabled = false;
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  var sourceSettings = document.getElementById('sourceSettings');
  sourceSettings.addEventListener('click', function() {
    $(this).toggleClass('expanded');
    $('#source_api_group').toggleClass('expanded');
    $('#query_for_sources_param_group').toggleClass('expanded');
    $('#retrieve_sources_param_group').toggleClass('expanded');
  });
});
