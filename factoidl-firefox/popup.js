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

var url;
var parsedData;
var factRecord;
var totalFactoids;
var keyWords;
var factPct = -1;
var isFactCheckInProgress = false;

var pollInterval;
var buildUIInterval;

var isFactListVisible = false;

var loadArcSize = degreesToRadians(45);
var loadStartAngle = 0;
var loadInc = 0;

function getFactoidResultCounts() {
  var counts = { correct: 0, unverified: 0, incorrect: 0 };
  for (var i = 0; i < (factRecord || []).length; i++) {
    if (factRecord[i] == '1') counts.correct++;
    else if (factRecord[i] == '-1') counts.incorrect++;
    else counts.unverified++;
  }
  return counts;
}

function updateFactoidSummary() {
  var counts = getFactoidResultCounts();
  var total = counts.correct + counts.unverified + counts.incorrect;
  document.getElementById('factoid_correct_count').textContent = counts.correct;
  document.getElementById('factoid_unverified_count').textContent = counts.unverified;
  document.getElementById('factoid_incorrect_count').textContent = counts.incorrect;
  document.getElementById('factoid_correct_segment').style.flexGrow = counts.correct;
  document.getElementById('factoid_unverified_segment').style.flexGrow = counts.unverified;
  document.getElementById('factoid_incorrect_segment').style.flexGrow = counts.incorrect;
  document.getElementById('factoid_summary').style.display = total > 0 ? 'block' : 'none';
}

function setFactCheckControlsDisabled(disabled) {
  isFactCheckInProgress = disabled;
  document.getElementById('check_button').disabled = true;
  document.getElementById('sourceSettings').classList.toggle('is-disabled', disabled);
  document.getElementById('source_settings_label').classList.toggle('is-disabled', disabled);
  document.getElementById('facts').classList.toggle('is-disabled', disabled);
  ['source_api_box', 'query_for_sources_param_box', 'retrieve_sources_param_box'].forEach(function(id) {
    document.getElementById(id).disabled = disabled;
  });
}

/*
 * Pulls in the results once per popup window load from background.js script.
 * Currently, calculates the percentage of "correct" (verified) factoids to total factoids.
 */
function pollFactData() {
  var bg = chrome.extension.getBackgroundPage();

  if(bg) {
    url = bg.url;
    parsedData = bg.factoids;
    factRecord = bg.factRecord;
    keyWords = bg.sourceSearchTerms || bg.pageKeyWords;
    var completed = !!bg.checkComplete;
    var sourceError = document.getElementById('source_error');
    if (sourceError) {
      sourceError.textContent = bg.sourceError || '';
      sourceError.style.display = bg.sourceError ? 'block' : 'none';
    }

    if (parsedData && url !== '-1') {
      setAnalysisUI();
      setFactCheckControlsDisabled(!completed);
      $('#links, #facts').toggle(completed);
      updateFactoidSummary();
    }

    // Default error if data could not be scraped or no data.
    if(bg.scrapedText == "") {
      clearInterval(buildUIInterval);
      clearInterval(pollInterval);

      $('#factoidl_icon').hide();
      $('#check_button').hide();
      $('#myCanvas').hide();
      $('#factoid_summary').hide();
      $('#links').hide();
      $('#facts').hide();
      document.getElementById("fact_text").style.color="#AD0000";
      document.getElementById("fact_text").innerHTML = "No content found.<br><br>Try refreshing the page.";
    }
    else {
      if(bg.factoids) {
        if(completed && bg.factoids.length == bg.den) {
          totalFactoids = bg.den;
          factPct = getFactoidResultCounts().correct / bg.den;
        }
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
 * Responsible for composing main statistic as a pie chart:
 * a percentage of verified factoids to total factoids checked.
 */
function drawPieChart() {
  if (!parsedData) return;
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

/*
 * This builds the main components of the popup UI, assuming valid data has been received
 * from the background script (e.g., not null, not a different url than currently showing).
 */
function buildUI() {
  var facts = document.getElementById('facts');

  if(parsedData) setAnalysisUI(); // Transition from initial screen to factoid analysis UI.

  drawPieChart();

  // Generate a list of facts so the user knows what was checked and what to disregard.
  facts.onclick = function() {
    if (isFactCheckInProgress) return false;
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

  if (keyWords) {
    linkSearch.href = "https://www.google.com/search?q=" + encodeURIComponent(keyWords);
  }
}

/*
 * Called to kick off scraping the page, polling the scraped text processing,
 * and refreshing the UI.
 */
function startFactCheck() {
  var sourceApiUrl = document.getElementById('source_api_box').value;
  var sourceQueryParams = document.getElementById('query_for_sources_param_box').value;
  var retrieveSourceTextParams = document.getElementById('retrieve_sources_param_box').value;
  setFactCheckControlsDisabled(true);
  $('#links, #facts').hide();

  chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabArray) {
    if(tabArray && tabArray.length > 0) {
      url = tabArray[0].url;
      setAnalysisUI();
      chrome.runtime.sendMessage({newCheck: true, url: tabArray[0].url,
        sourceApiUrl: sourceApiUrl, sourceQueryParams: sourceQueryParams, retrieveSourceTextParams: retrieveSourceTextParams},
        function (response) {
           if (chrome.runtime.lastError) {
             console.error("Firefox newCheck message error:", chrome.runtime.lastError);
             return;
           }
           chrome.tabs.executeScript({file: "jquery-3.4.1.min.js"}, function() {
             if (chrome.runtime.lastError) {
               console.error("Firefox jQuery injection error:", chrome.runtime.lastError);
               return;
             }
             chrome.tabs.executeScript({file: "content.js"}, function() {
               if (chrome.runtime.lastError) {
                 console.error("Firefox content injection error:", chrome.runtime.lastError);
               }
             });
           });
        });
    }
  });


  // Query the background script for factoid data.  This should probably be a listener of sorts.
  pollFactData();
  clearInterval(pollInterval);
  pollInterval = setInterval(pollFactData, 500);

  // Continuously build/update the UI as factoid data is processed.
  buildUI();
  clearInterval(buildUIInterval);
  buildUIInterval = setInterval(buildUI, 250);
}

function setAnalysisUI() {
  $('#factoidl_icon').hide();
  $('#myCanvas').show();

  document.getElementById("fact_text").style.color="#000000";
  document.getElementById("fact_text").textContent = "Factoids checked at:";
  document.getElementById("checked_url").style.display = 'block';
  document.getElementById("checked_url").value = url || '';

  document.getElementById("links").innerHTML = "<img border=\"0\" alt=\"Google Search\" src=\"search_icon_16x16.png\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;\"> Related";
  document.getElementById("facts").innerHTML = "Factoids <img border=\"0\" alt=\"Google Search\" src=\"fact_icon_16x16.png\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;\">";
}

document.addEventListener('DOMContentLoaded', function() {
    var checkButton = document.getElementById('check_button');
    // onClick logic:
    checkButton.addEventListener('click', function() {
        startFactCheck();
    });
});

/*
 * Called when the popup window is loaded.
 * Kicks off processing the current tab's page and building the UI.
 */
window.onload = function displayUI() {
  pollFactData();

  // Skip initial screen if already processing a page.
  if(parsedData) {
    if(parsedData.length > 0) {
      setAnalysisUI();

      // Query the background script for factoid data.  This should probably be a listener of sorts.
      pollFactData();
      clearInterval(pollInterval);
      pollInterval = setInterval(pollFactData, 500);

      // Continuously build/update the UI as factoid data is processed.
      buildUI();
      clearInterval(buildUIInterval);
      buildUIInterval = setInterval(buildUI, 250);
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('checked_url').addEventListener('click', function() {
    this.classList.toggle('expanded');
    this.rows = this.classList.contains('expanded') ? 4 : 1;
  });
});

document.addEventListener('DOMContentLoaded', function() {
  var sourceSettings = document.getElementById('sourceSettings');
  sourceSettings.addEventListener('click', function() {
    if (isFactCheckInProgress) return;
    $(this).toggleClass('expanded');
    $('#source_api_group').toggleClass('expanded');
    $('#query_for_sources_param_group').toggleClass('expanded');
    $('#retrieve_sources_param_group').toggleClass('expanded');
  });
});
