/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/12/19
 * Description: Web worker script.  Will
 * handle the fact-checking tasks and pass it back to the background script.
 *
 * WARNING: WEB WORKERS ARE ISOLATED FROM DOM AND OTHER GLOBAL VARS!
 */

self.importScripts('compromise.min.js');

var pageWideResults = ""; // Pass page-wide info retrieved to worker.

/*
 * The parser used for queries and matching factoids with reference text.
 * Meant to be paired with platoCompareStrategy() as the fact-checking algorithm.
 * Initially, punctuation is removed and the factoid is split into a token (word) array.
 * Then, unimportant words are replaced, keeping key (important nouns, verbs, adjectives) words as search terms.
 *
 * Returns an array of strings that are keywords (mostly content words).
 */
function platoParser(factoid, removeArticles) {
  // Remove punctuation.
  var factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~\]\[()]/g, "").split(" ");

  if(removeArticles) {
    // Replace unimportant words for query/to search results:
    for(k = 0; k < factoidParsed.length; k++) {
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

      // Negations:
      factoidParsed[k] = factoidParsed[k].replace(/\b(no|not|none|no one|noone|nobody|nothing|neither|nowhere|never)\b/gi, "");

      // Misc.:
      factoidParsed[k] = factoidParsed[k].replace(/\b(has|was|is|yes|no|never|nobody|like|as|though|although)\b/gi, "");
    }
  }

  // Remove replaced words.
  factoidParsed = factoidParsed.filter(function (item) {
    return (item !== "");
  });

  return factoidParsed;
}

/*
 * Counts negations in an array to compare base tautology.
 */
function negationCounter(text) {
  var negationCount = 0;
  for(l = 0; l < text.length; l++) {
    if(/no|not|none|no one|noone|nobody|nothing|neither|nowhere|never/.test(text[l].toLowerCase())) {
      negationCount++;
    }
  }

  return negationCount;
}

/*
 * Third major fact-checking algorithm (strategy).
 * Named after Plato, a major Greek philosopher since
 * this is a major update that provides some heuristic comparing
 * by boiling source facts and factoids down to their basic meanings.
 *
 * Returns a 1 if the factoid appears to be true based on finding keywords in text.
 * Returns a 0 if the factoid appears to be false or conflicted.
 */
function platoCompareStrategy(factoid, index, text) {
  var sourceTexts = nlp(text.replace(/\./g, '. ')).sentences().data().map((function(a) { return a.text; }));
  if(pageWideResults) sourceTexts.push.apply(sourceTexts, nlp(pageWideResults.replace(/\./g, '. ')).sentences().data().map((function(a) { return a.text; })));

  // Normalize to singular, to digits, to present tense, and expand contractions, then take content words only to compare.
  var nlpFactoid = nlp(factoid);
  nlpFactoid.nouns().toSingular();
  nlpFactoid.values().toNumber();
  nlpFactoid.sentences().toPresentTense();
  nlpFactoid.contractions().expand();

  var factoidNegations = negationCounter(platoParser(nlpFactoid.out(), false));

  var factoidParsed = platoParser(nlpFactoid.out(), true);

  // Search every source text node recursively and check if all words are present.
  for(i = 0; i < sourceTexts.length; i++) {
    // Normalize source facts.
    var nlpSource = nlp(sourceTexts[i]);
    nlpSource.nouns().toSingular();
    nlpSource.values().toNumber();
    nlpSource.sentences().toPresentTense();
    nlpSource.contractions().expand();

    var sourceFact = platoParser(nlpSource.out().toLowerCase().trim(), false);

    var sourceNegations = negationCounter(sourceFact);

    // See if basic premise of factoid is included in any source text.
    for(j = 0; j < factoidParsed.length; j++) {
      if(sourceFact.includes(factoidParsed[j].toLowerCase().trim())) {
        // If all factoid words are included in source and this is the last word.
        if(j == factoidParsed.length - 1) {
          if(Math.abs(factoidNegations - sourceNegations) % 2 == 0) {
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

/*
 * Receive background script data, call the comparison function, and return the results.
 */
self.addEventListener('message', function(e) {
  pageWideResults = e.data.pageWideResults;
  self.postMessage({ "isVerified" : platoCompareStrategy(e.data.factoid, e.data.index, e.data.text), "index" : e.data.index });
}, false);
