/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/12/19
 * Description: Background page worker script.  Will
 * handle the fact-checking tasks and pass it to the UI script (popup.js).
 *
 * This script should be registered in the extension manifest.
 * HTML markup should not be required, it is meant for background
 * JavaScript functions in most cases.
 *
 * Factoid: A statement (usually a full sentence) that may or may not be
 * factual based on a common information source.
 */

// These are from user input.
var sourceApiUrl;
var sourceQueryParams;
var retrieveSourceTextParams;

var scrapedText; // Scraped text from the page to analyze.
var pageKeyWords; // Used for Google search function on popup.html.
var pageWideResults; // Text of source database query based on <title> keywords.
var factoids; // scrapedText AFTER parsing into statements.
var factRecord; // Keep track of which factoids were verified.
var num = 0; // Numerator, factoids that are "accurate" (truthful).
var den = 0; // Denominator, total factoids checked.
var url = "-1"; // Store the url of the page being processed.
var alreadyChecking = false; // Track whether this url is already checked or it is being checked.
var sourceSearchTerms = ''; // Cumulative terms used to select shared source pages.
var checkComplete = false;
var sourceTextLength = 0;
var sourceError = '';
var retriedFactoidIndices = {}; // Indices that already had one per-factoid fallback lookup.

// Spin up workers to help with factoid comparison.
var worker1 = new Worker('verifyWorker.js');
var worker2 = new Worker('verifyWorker.js');
var worker3 = new Worker('verifyWorker.js');

// Utility functions are loaded from factoidl-common.js by manifest order.

/*
 * Records and increments verified factoids and total factoids.
 */
var recordResults = function(returned_data, index) {
  if (returned_data == 0 && !retriedFactoidIndices[index] && factoids && factoids[index] !== undefined && hasClearSearchTerm(factoids[index])) {
    retriedFactoidIndices[index] = true;
    retryFactoidWithOwnSource(factoids[index], index);
    return;
  }

  if(returned_data == 1) {
    factRecord[index] = '1';
    num++;
  }
  else if(returned_data == -1) {
    factRecord[index] = '-1';
    num++;
  }

  den++;
  if (factoids && factoids.length > 0 && den >= factoids.length) {
    checkComplete = true;
    alreadyChecking = false;
  }
};

/*
 * Receive compared fact results from workers.
 */
worker1.addEventListener('message', function(e) {
  recordResults(e.data.isVerified, e.data.index);
}, false);

worker2.addEventListener('message', function(e) {
  recordResults(e.data.isVerified, e.data.index);
}, false);

worker3.addEventListener('message', function(e) {
  recordResults(e.data.isVerified, e.data.index);
}, false);

[worker1, worker2, worker3].forEach(function(worker) {
  worker.addEventListener('error', function(error) {
    console.error('FactoidL verification worker failed:', error);
  });
});

/*
 * Listens for the content.js scrape of textual data.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.newCheck == true) {
      url = request.url;
      alreadyChecking = false;
      checkComplete = false;
      sourceApiUrl = request.sourceApiUrl;
      sourceQueryParams = request.sourceQueryParams;
      retrieveSourceTextParams = request.retrieveSourceTextParams;
      sourceSearchTerms = '';
      sourceTextLength = 0;
      sourceError = '';
      retriedFactoidIndices = {};
      resetFactoidRetryQueue();
    }
    else {
      if(request.url == url && !alreadyChecking) {
        num = 0;
        den = 0;
        checkComplete = false;
        retriedFactoidIndices = {};
        resetFactoidRetryQueue();
        scrapedText = request.data;
        pageKeyWords = request.tags;
        factoids = sentenceParse();
        factRecord = factoids ? new Array(factoids.length).fill('0') : [];
        alreadyChecking = true;

        if(factoids && factoids.length > 0) verifyFactoids(factoids);
      }
    }

    // Mainly so Chrome doesn't complain the sender didn't receive a response.
    sendResponse({result: true});
});
