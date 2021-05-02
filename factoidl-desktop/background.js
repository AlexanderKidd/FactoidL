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

var scrapedText; // Scraped text from the page to analyze.
var pageKeyWords; // Used for Google search function on popup.html.
var pageWideResults; // Text of source database query based on <title> keywords.
var factoids; // scrapedText AFTER parsing into statements.
var factRecord; // Keep track of which factoids were verified.
var num = 0; // Numerator, factoids that are "accurate" (truthful).
var den = 0; // Denominator, total factoids checked.
var url = "-1"; // Store the url of the page being processed.
var alreadyChecking = false; // Track whether this url is already checked or it is being checked.

// Spin up workers to help with factoid comparison.
var worker1 = new Worker('verifyWorker.js');
var worker2 = new Worker('verifyWorker.js');
var worker3 = new Worker('verifyWorker.js');

// Regex escaper so a string can be passed into an expression object without fail.
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/*
 * General sentence-to-factoid parser.
 * The ten-character limit was decided upon since most sentences under that are
 * not complete sentences or do not have content worth fact-checking.  The max
 * character limit of 2000 is generous: we are mostly checking modern articles,
 * not Finnegan's Wake.  Also, strip out excessive whitespace.
 *
 * Returns the sanitized text (factoids).
 */
function sentenceParse() {
  // Remove periods at the end of honorifics and in between acronyms (Note: won't catch all or sentences ending in abbreviations).
  var nlpText = nlp(scrapedText.replace(/\.-/g, '. '));
  var abbrList = nlpText.match('(#Acronym|#Abbreviation)').text();

  abbrList.split(' ').forEach(function(token, index, arr) {
    if(token) {
      var re = new RegExp('\\s' + escapeRegExp(token) + '\\s', "g");
      var replace = token.replace(/\./g, '');
      scrapedText = scrapedText.replace(re, ' ' + replace + ' ');
    }
  });

  return scrapedText.replace(/\n|\s{2,}/g, ' ').match(/[A-Z0-9][^.!?]{10,2000}[.!?\n]/g);
}

/*
 * This function sifts through the factoid for keywords.
 * This is used for querying the source database.
 *
 * Returns an array of string keywords, defaulting to just
 * the factoid if both keyword extraction functions return empty.
 */
function getKeywords(factoid) {
  var keyWords = nlp(factoid).topics().data().map(function(a) { return a.text.trim(); });

  if(keyWords.length == 0) {
    keyWords = socratesParser(factoid);

    if(keyWords.length == 0) {
      keyWords = factoid.split(" ");
    }
  }

  return keyWords;
}

/*
 * Iterates through factoids and calls queryForSources(),
 * which kicks off the queries to find the proper source texts
 * and then the factoid to source comparisons.
 */
function verifyFactoids(factoids) {
  if(factoids !== null) {
     // Find a default source text to look through.
    queryForSources(pageKeyWords, -1, function(text) {
      pageWideResults = text;

      for(i = 0; i < factoids.length; i++) {
        queryForSources(factoids[i], i, getSources);
      }
    });
    // TODO: Coreference resolution: Replace ambiguous references with look-behind (e.g., pronouns in previous sentence).
    // Maybe do IFF no terms found in sentence, go to previous sentence and pull.  How to determine that is tough...
  }
  else {
    console.error("Error: verifyFactoids() had undefined or no factoids to check.");
  }
}

/*
 * Based on factoid keywords, finds candidate source text (Wikipedia articles)
 * to use in factoid comparison.
 */
function queryForSources(factoid, index, callback) {
  var factoidKeywords = getKeywords(factoid);
  if(factoidKeywords == null || factoidKeywords.length == 0) factoidKeywords = getKeywords(pageKeyWords);

  // Query seems to prefer one or two search terms.  Put two array elements together if there aren't two in the first element.
  if(factoidKeywords[0].indexOf(" ") == -1 && factoidKeywords.length > 1 && factoidKeywords[1] && factoidKeywords[1] != factoidKeywords[0]) {
    factoidKeywords = (factoidKeywords[0] + " " + factoidKeywords[1]).split(" ");
  }
  else {
    factoidKeywords = factoidKeywords[0].split(" ").slice(0, 2);
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', "https://en.wikipedia.org/w/api.php?action=opensearch&pslimit=2&namespace=0&format=json&search=" +
  encodeURIComponent(factoidKeywords) + "&origin=*");
  xhr.onload = function() {
      if (xhr.status === 200) {
          var json = JSON.parse(xhr.responseText);
          var sourceURL = json[3] ? json[3][0] : "";
          var sourceSplit = sourceURL.split("/");
          callback.call(this, getSources(sourceSplit[sourceSplit.length - 1], factoid, index));
      }
  };
  xhr.onerror = function() {
  // There was a connection error of some sort
  factRecord[index] = "404";
  den++; // Still increment that a factoid was processed even with failure.

  console.error("Error: queryForSources() article search request errored for factoid {" + factoid + "}. Message: " + error +
  "." + "\n" + "Site: " + url);
  };

  // $.ajax({
  //   type: "GET",
  //   url: "https://en.wikipedia.org/w/api.php?action=opensearch&pslimit=2&namespace=0&format=json&search=" +
  //   encodeURIComponent(factoidKeywords),
  //   dataType: "json",
  //   async: true,
  //   success: function (json) {
  //     var sourceURL = json[3] ? json[3][0] : "";
  //     callback.call(this, getSources(sourceURL, factoid, index));
  //   },
  //   error: function (xhr, status, error) {
  //     factRecord[index] = "404";
  //     den++; // Still increment that a factoid was processed even with failure.
  //
  //     console.error("Error: queryForSources() article search request errored for factoid {" + factoid + "}. Message: " + error +
  //     "." + "\n" + "Site: " + url);
  //   }
  // });

  xhr.send();
}

/*
 * Loads the corresponding source text from the source URL for the factoid.
 * Then kicks off a comparison job for one of the web workers.
 */
var getSources = function(sourceTerms, factoid, index) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', "https://en.wikipedia.org/w/api.php?format=xml&action=query&prop=extracts&titles=" + sourceTerms + "&redirects=true&origin=*");
  xhr.onload = function() {
      if (xhr.status === 200) {
          var text = xhr.responseText;

          var extractText = text.match(/<extract\b[^>]*>[^]*<\/extract\b[^>]*>/ig)[0].replace(/<extract\b[^>]*>/ig, '').replace(/<\/extract\b[^>]*>/ig, '');

          if(index >= 0) {
            if(index % 2 == 0 && index % 3 != 0) {
              worker1.postMessage({ "factoid" : factoid, "index" : index, "text" : extractText, "pageWideResults" : pageWideResults });
            }
            else if(index % 2 != 0 && index % 3 == 0) {
              worker2.postMessage({ "factoid" : factoid, "index" : index, "text" : extractText, "pageWideResults" : pageWideResults });
            }
            else {
              worker3.postMessage({ "factoid" : factoid, "index" : index, "text" : extractText, "pageWideResults" : pageWideResults });
            }
          }
          else {
            if(index == -1) {
              pageWideResults = extractText;
            }
          }

      }
  };
  xhr.onerror = function() {
    console.error("Error: getSources() Wiki article request errored for factoid {" + factoid + "}. Message: " + error +
    "." + "\n" + "Site: " + url);
  };

  xhr.send();

  // $.ajax({
  //   type: "GET",
  //   url: sourceURL,
  //   dataType: "text",
  //   async: true,
  //   success: function (text) {
  //     if(index >= 0) {
  //       if(index % 2 == 0 && index % 3 != 0) {
  //         worker1.postMessage({ "factoid" : factoid, "index" : index, "text" : $('p, i', $.parseHTML(text.replace(/<img\b[^>]*>/ig, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/igm, ''))).text(), "pageWideResults" : pageWideResults });
  //       }
  //       else if(index % 2 != 0 && index % 3 == 0) {
  //         worker2.postMessage({ "factoid" : factoid, "index" : index, "text" : $('p, i', $.parseHTML(text.replace(/<img\b[^>]*>/ig, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/igm, ''))).text(), "pageWideResults" : pageWideResults });
  //       }
  //       else {
  //         worker3.postMessage({ "factoid" : factoid, "index" : index, "text" : $('p, i', $.parseHTML(text.replace(/<img\b[^>]*>/ig, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/igm, ''))).text(), "pageWideResults" : pageWideResults });
  //       }
  //     }
  //     else {
  //       if(index == -1) {
  //         pageWideResults = $('p, i', $.parseHTML(text.replace(/<img\b[^>]*>/ig, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/igm, ''))).text();
  //       }
  //     }
  //   },
  //   error: function (xhr, status, error) {
  //     console.error("Error: getSources() Wiki article request errored for factoid {" + factoid + "}. Message: " + error +
  //     "." + "\n" + "Site: " + url);
  //   }
  // });
};

/*
 * The parser used for queries and matching factoids with reference text.
 * Meant to be paired with socratesCompareStrategy() as the fact-checking algorithm.
 * Initially, punctuation is removed and the factoid is split into a token (word) array.
 * Then, unimportant words are replaced, keeping key (important nouns, verbs, adjectives) words as search terms.
 *
 * Returns an array of strings that are keywords (mostly content words).
 */
function socratesParser(factoid) {
  // Remove punctuation.
  var factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\]\[]/g, "").split(" ");

  // Replace unimportant words for query/to search results:
  for(k = 0; k < factoidParsed.length; k++) {
    // Remove whitespace.
    factoidParsed[k].trim();

    // Article words:
    factoidParsed[k] = factoidParsed[k].replace(/\b(a|an|the|this|that|these|those)\b/gi, "");

    // Prepositions:
    factoidParsed[k] = factoidParsed[k].replace(/\b(with|within|despite|beneath|through|throughout|until|upon|to|from|at|by|for|from|in|out|into|near|of|off|on|onto|up|down|with|over|under|past|since|between|above|below|across|after|before|during|except|front|back)\b/gi, "");

    // Quantifiers:
    factoidParsed[k] = factoidParsed[k].replace(/\b(some|many|few|much|all|enough|several|too|quite|rather)\b/gi, "");

    // Pronouns:
    factoidParsed[k] = factoidParsed[k].replace(/\b(I|we|us|you|she|her|him|it|he|they|them|my|mine|his|hers|your|yours|its|our|ours|their|theirs)\b/gi, "");

    // Conjunctions:
    factoidParsed[k] = factoidParsed[k].replace(/\b(and|or|nor|but|so|yet)\b/gi, "");

    // Interrogatives:
    factoidParsed[k] = factoidParsed[k].replace(/\b(who|whom|whose|which|what|how|why|when|where)\b/gi, "");

    // Misc.:
    factoidParsed[k] = factoidParsed[k].replace(/\b(has|was|is|yes|no|never|nobody|like|as|though|although)\b/gi, "");
  }

  // Remove replaced words.
  factoidParsed = factoidParsed.filter(function (item) {
    return (item !== "");
  });

  return factoidParsed;
}

/*
 * Records and increments verified factoids and total factoids.
 */
var recordResults = function(returned_data, index) {
  if(returned_data == 1) {
    factRecord[index] = '1';
    num++;
  }

  den++;
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
self.addEventListener('message',
  function(message) {
   if(message.data.newCheck == true) {
     url = message.data.url;
     alreadyChecking = false;
   }
   else if(message.data.pollRequest == true) {
     self.postMessage({bg : { "url" : url, "factoids" : factoids, "factRecord" : factRecord, "pageKeyWords" : pageKeyWords, "num" : num, "den" : den } });
   }
   else {
     if(/*message.url == url &&*/ !alreadyChecking) {
       num = 0;
       den = 0;
       scrapedText = message.data.contentParse;
       pageKeyWords = message.data.tags;
       factoids = sentenceParse();
       factRecord = factoids ? ['0'.repeat(factoids.length)] : [];
       alreadyChecking = true;

       if(factoids && factoids.length > 0) verifyFactoids(factoids);
     }
   }
}, false);
