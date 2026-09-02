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

var nlp = require('compromise');
require('./factoidl-common.js');

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
var retriedFactoidIndices = {}; // Indices that already had one per-factoid fallback lookup.

// Spin up workers to help with factoid comparison.
var worker1 = new Worker('verifyWorker.js');
var worker2 = new Worker('verifyWorker.js');
var worker3 = new Worker('verifyWorker.js');

// Utility functions are loaded from factoidl-common.js

function recordWorkerResult(returnedData, index) {
  if (returnedData == 0 && !retriedFactoidIndices[index] && factoids && factoids[index] !== undefined && hasClearSearchTerm(factoids[index])) {
    retriedFactoidIndices[index] = true;
    retryFactoidWithOwnSource(factoids[index], index);
    return;
  }

  recordResults(returnedData, index);
  if (factoids && den >= factoids.length) {
    checkComplete = true;
    alreadyChecking = false;
  }
}

/*
 * Receive compared fact results from workers.
 */
worker1.addEventListener('message', function(e) {
  recordWorkerResult(e.data.isVerified, e.data.index);
}, false);

worker2.addEventListener('message', function(e) {
  recordWorkerResult(e.data.isVerified, e.data.index);
}, false);

worker3.addEventListener('message', function(e) {
  recordWorkerResult(e.data.isVerified, e.data.index);
}, false);

/*
 * Listens for the content.js scrape of textual data.
 */
self.addEventListener('message',
  function(message) {
   // Case not used in FactoidL Desktop.
   // if(message.data.newCheck == true) {
   //   url = message.data.url;
   //   alreadyChecking = false;
   // }
   if(message.data.pollRequest == true) {
    self.postMessage({bg : { "url" : url, "factoids" : factoids, "factRecord" : factRecord, "pageKeyWords" : pageKeyWords, "sourceSearchTerms" : sourceSearchTerms, "num" : num, "den" : den, "completed" : checkComplete } });
   }
   else {
     if(/*message.url == url &&*/ !alreadyChecking) {
       num = 0;
       den = 0;
       checkComplete = false;
       retriedFactoidIndices = {};
       resetFactoidRetryQueue();
       scrapedText = message.data.contentParse;
       pageKeyWords = message.data.tags;
      sourceSearchTerms = '';
       sourceApiUrl = message.data.sourceApiUrl;
       sourceQueryParams = message.data.sourceQueryParams;
       retrieveSourceTextParams = message.data.retrieveSourceTextParams;
       factoids = sentenceParse();
      factRecord = factoids ? new Array(factoids.length).fill('0') : [];
       alreadyChecking = true;

      if(factoids && factoids.length > 0) verifyFactoids(factoids);
      else {
        checkComplete = true;
        alreadyChecking = false;
      }
     }
   }
}, false);
