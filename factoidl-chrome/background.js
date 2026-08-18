/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/12/19
 * Description: Background service worker script.  Will
 * handle the fact-checking tasks and pass it to the UI script (popup.js).
 *
 * This script should be registered in the extension manifest.
 * HTML markup should not be required, it is meant for background
 * JavaScript functions in most cases.
 *
 * Factoid: A statement (usually a full sentence) that may or may not be
 * factual based on a common information source.
 */

importScripts('compromise.min.js', 'factoidl-common.js');

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
var checkComplete = false; // Track whether the current fact-check has finished.
var sourceError = ''; // User-visible error from shared source discovery.
var checkedTabId = null; // Tab that owns the current or saved result.
var sourceSearchTerms = ''; // Cumulative terms used to select shared source pages.

function getStatusData() {
  return {
    result: true,
    phase: 'status',
    url: url,
    tabId: checkedTabId,
    factoids: factoids,
    factRecord: factRecord,
    pageKeyWords: pageKeyWords,
    sourceSearchTerms: sourceSearchTerms,
    num: num,
    den: den,
    scrapedText: scrapedText,
    completed: checkComplete,
    sourceError: sourceError
  };
}

function persistCompletedCheck() {
  if (!chrome.storage || !chrome.storage.session) return;

  chrome.storage.session.set({ factoidlCompletedCheck: getStatusData() });
}

function clearCompletedCheckForTab(tabId) {
  if (checkedTabId === tabId) {
    url = '-1';
    checkedTabId = null;
    factoids = [];
    factRecord = [];
    pageKeyWords = undefined;
    sourceSearchTerms = '';
    scrapedText = undefined;
    num = 0;
    den = 0;
    checkComplete = false;
    alreadyChecking = false;
    sourceError = '';
  }

  if (!chrome.storage || !chrome.storage.session) return;

  chrome.storage.session.get('factoidlCompletedCheck', function(stored) {
    if (stored.factoidlCompletedCheck && stored.factoidlCompletedCheck.tabId === tabId) {
      chrome.storage.session.remove('factoidlCompletedCheck');
    }
  });
}

chrome.tabs.onRemoved.addListener(function(tabId) {
  clearCompletedCheckForTab(tabId);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'loading') {
    clearCompletedCheckForTab(tabId);
  }
});

// Spin up workers to help with factoid comparison.
var worker1;
var worker2;
var worker3;

if (typeof Worker !== 'undefined') {
  worker1 = new Worker('verifyWorker.js');
  worker2 = new Worker('verifyWorker.js');
  worker3 = new Worker('verifyWorker.js');
}
else {
  function workerAristotleParser(factoid, removeArticles) {
    var factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~\]\[()]/g, '').split(' ');

    if (removeArticles) {
      for (var k = 0; k < factoidParsed.length; k++) {
        factoidParsed[k] = factoidParsed[k].replace(/\b(a|an|the|this|that|these|those)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(with|within|despite|beneath|through|throughout|until|upon|to|from|at|by|for|from|in|out|into|near|of|off|on|onto|up|down|with|over|under|past|since|between|above|below|across|after|before|during|except|front|back)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(some|many|few|much|all|enough|several|too|quite|rather)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(I|we|us|you|she|her|him|it|he|they|them|my|mine|his|hers|your|yours|its|our|ours|their|theirs)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(and|or|nor|but|so|yet)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(who|whom|whose|which|what|how|why|when|where)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(no|not|none|no one|noone|nobody|nothing|neither|nowhere|never)\b/gi, '');
        factoidParsed[k] = factoidParsed[k].replace(/\b(has|was|is|yes|no|never|nobody|like|as|though|although)\b/gi, '');
      }
    }

    factoidParsed = factoidParsed.filter(function(item) {
      return item !== '';
    });

    return factoidParsed;
  }

  function negationCounter(text) {
    var negationCount = 0;
    for (var l = 0; l < text.length; l++) {
      if (/^(?:no|not|none|noone|nobody|nothing|neither|nowhere|never)$/.test(text[l].toLowerCase())) {
        negationCount++;
      }
    }
    return negationCount;
  }

  function termsMatch(factTerm, sourceTerms) {
    var normalizedFactTerm = factTerm.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '');
    return sourceTerms.some(function(sourceTerm) {
      var normalizedSourceTerm = sourceTerm.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '');
      return normalizedFactTerm === normalizedSourceTerm;
    });
  }

  function aristotleCompareStrategy(factoid, index, text, sourceTitles) {
    var sourceTexts = nlp(text.replace(/\./g, '. ')).sentences().data().map(function(a) { return a.text; });
    if (pageWideResults) {
      sourceTexts.push.apply(sourceTexts, nlp(pageWideResults.replace(/\./g, '. ')).sentences().data().map(function(a) { return a.text; }));
    }

    var nlpFactoid = nlp(factoid);
    nlpFactoid.nouns().toSingular();
    nlpFactoid.values().toNumber();
    nlpFactoid.sentences().toPresentTense();
    nlpFactoid.contractions().expand();

    var factoidNegations = negationCounter(workerAristotleParser(nlpFactoid.out(), false));
    var factoidParsed = workerAristotleParser(nlpFactoid.out(), true);

    for (var i = 0; i < sourceTexts.length; i++) {
      var nlpSource = nlp(sourceTexts[i]);
      nlpSource.nouns().toSingular();
      nlpSource.values().toNumber();
      nlpSource.sentences().toPresentTense();
      nlpSource.contractions().expand();

      var sourceFact = workerAristotleParser(((sourceTitles || '') + ' ' + nlpSource.out()).toLowerCase().trim(), false);
      var sourceNegations = negationCounter(sourceFact);

      for (var j = 0; j < factoidParsed.length; j++) {
        if (termsMatch(factoidParsed[j].trim(), sourceFact)) {
          if (j == factoidParsed.length - 1) {
            if (Math.abs(factoidNegations - sourceNegations) % 2 == 0) {
              return 1;
            }
            else {
              return -1;
            }
          }
        }
        else {
          break;
        }
      }
    }

    return 0;
  }

  function verifyWorkerFallback(message) {
    if (!message || message.factoid === undefined) return null;
    return aristotleCompareStrategy(message.factoid, message.index, message.text, message.sourceTitles);
  }

  function createFallbackWorker() {
    var listeners = [];
    return {
      addEventListener: function(type, callback) {
        if (type === 'message' && typeof callback === 'function') {
          listeners.push(callback);
        }
      },
      postMessage: function(message) {
        var result = verifyWorkerFallback(message);
        listeners.forEach(function(callback) {
          callback({ data: { isVerified: result, index: message.index } });
        });
      }
    };
  }

  worker1 = createFallbackWorker();
  worker2 = createFallbackWorker();
  worker3 = createFallbackWorker();
}

// Utility functions are loaded from factoidl-common.js

/*
 * Records and increments verified factoids and total factoids.
 */
var recordResults = function(returned_data, index) {
  if(returned_data == 1) {
    factRecord[index] = '1';
    num++;
  }
  else if(returned_data == -1) {
    factRecord[index] = '-1';
    num++;
  }
  else {
    factRecord[index] = factRecord[index] || '0';
  }

  den++;
  if (factoids && factoids.length > 0 && den >= factoids.length) {
    checkComplete = true;
    alreadyChecking = false;
    persistCompletedCheck();
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

/*
 * Listens for the content.js scrape of textual data.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.statusRequest === true) {
      if (url !== '-1' && request.tabId === checkedTabId) {
        sendResponse(getStatusData());
        return true;
      }

      if (chrome.storage && chrome.storage.session) {
        chrome.storage.session.get('factoidlCompletedCheck', function(stored) {
          var completedCheck = stored.factoidlCompletedCheck;
          sendResponse(completedCheck && completedCheck.tabId === request.tabId ? completedCheck : getStatusData());
        });
        return true;
      }

      sendResponse(getStatusData());
      return true;
    }

    if (request.newCheck == true) {
      if (request.tabId === checkedTabId && request.url === url) {
        sendResponse({result: false, phase: checkComplete ? 'completed' : 'inProgress'});
        return true;
      }
      url = request.url;
      checkedTabId = request.tabId;
      alreadyChecking = false;
      checkComplete = false;
      sourceError = '';
      scrapedText = undefined;
      pageKeyWords = undefined;
      sourceSearchTerms = '';
      factoids = [];
      factRecord = [];
      num = 0;
      den = 0;
      if (chrome.storage && chrome.storage.session) {
        chrome.storage.session.remove('factoidlCompletedCheck');
      }
      sourceApiUrl = request.sourceApiUrl;
      sourceQueryParams = request.sourceQueryParams;
      retrieveSourceTextParams = request.retrieveSourceTextParams;
      sendResponse({result: true, phase: 'newCheck'});
      return true;
    }

    if (request.url == url && !alreadyChecking) {
      num = 0;
      den = 0;
      checkComplete = false;
      sourceError = '';
      scrapedText = request.data;
      pageKeyWords = request.tags;
      factoids = sentenceParse();
      factRecord = factoids ? new Array(factoids.length).fill('0') : [];
      alreadyChecking = true;

      if (factoids && factoids.length > 0) {
        verifyFactoids(factoids);
      }
      else {
        checkComplete = true;
        alreadyChecking = false;
        persistCompletedCheck();
      }

      sendResponse({
        result: true,
        phase: 'contentData',
        factoids: factoids ? factoids.length : 0,
        factRecord: factRecord,
        num: num,
        den: den,
        scrapedText: scrapedText,
        completed: checkComplete
      });
      return true;
    }

    if (request.url !== url) {
      console.warn('background ignored content due to URL mismatch', {
        requestUrl: request.url,
        currentUrl: url,
        alreadyChecking: alreadyChecking
      });
    }
    else if (alreadyChecking) {
      console.warn('background ignored content because alreadyChecking is true', {
        requestUrl: request.url,
        currentUrl: url
      });
    }
    sendResponse({result: false, phase: 'ignored'});
    return true;
});
