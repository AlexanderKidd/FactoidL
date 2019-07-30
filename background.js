/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 7/25/19
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

var scrapedText; // Scraped text from the page to analyze.
var pageKeyWords; // Used for Google search function on popup.html.
var factoids; // scrapedText scrape AFTER parsing.
var factRecord; // Keep track of which factoids were verified.
var num = 0; // Numerator, factoids that are "accurate" (truthful).
var den = 0; // Denominator, total factoids checked.
var url = ""; // Store the url of the page being processed.

/*
 * General sentence to factoid parser.
 * The ten-character limit was decided upon since most sentences under that are
 * not complete sentences or do not have content worth fact-checking.  The max
 * character limit of 2000 is generous: we are mostly checking modern articles,
 * not Finnegan's Wake.  Also, strip out excessive whitespace.
 * DBPedia seems to take ~4,000 characters max.
 *
 * Returns the sanitized text (factoids).
 */

function parse() {
  // Remove periods at the end of honorifics and in between acronyms (Note: won't catch all or sentences ending in abbreviations).
  nlpText = nlp(scrapedText.replace(/\.-/g, '. '));
  abbrList = nlpText.match('(#Acronym|#Abbreviation)').text();

  abbrList.split(' ').forEach(function(token, index, arr) {
    if(token) {
      var re = new RegExp('\\s' + token + '\\s', "g");
      var replace = token.replace(/\./g, '');
      scrapedText = scrapedText.replace(re, ' ' + replace + ' ');
    }
  });

  return scrapedText.replace(/\n|\s{2,}/g, ' ').match(/[A-Z0-9][^.!?]{10,2000}[.!?\n]/g);
}

/*
 * This function sifts through the factoid for keywords
 * using the DBPedia Spotlight endpoint.
 * This is used in the DBPedia Lookup article query.
 *
 * Returns either the factoid split-up by default, or
 * the words deemed important by the query.
 */
function getSpotlightKeywords(factoid) {
  var keyWords = nlp(factoid).topics().data();

  return keyWords.map(function(a) { return a.text; });
}

/*
 * Iterates through factoids and calls checkResultNodes(),
 * which will use the callback pctCalc() to perform the fact counting.
 */
function countRelevanceOfDataComparedToOther(factoids) {
  if(factoids !== null) {
    for(i = 0; i < factoids.length; i++) {
      checkResultNodes(factoids[i], i, pctCalc);
    }
  }
}

/*
 * A function that returns an array of Wikipedia articles as XML nodes.
 * Currently uses the DBPedia Lookup endpoint to check if factoids exist in Wiki data:
 * http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=exampleText
 */
function checkResultNodes(factoid, index, callback) {
  factoidKeywords = getSpotlightKeywords(factoid);
  factoidKeywords.splice(2); // Take first two keywords for now.

  $.ajax({
    type: "GET",
    url: "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=" +
    encodeURIComponent(factoidKeywords),
    dataType: "xml",
    async: true,
    success: function (xml) {
      callback.call(this, anaxagorasStrategy(factoid, index, xml));
    },
    error: function (xhr, status, error) {
      factRecord[index] = "404";
      den++; // Still increment that a factoid was processed even with failure.

      console.error("Error: checkResultNodes() AJAX request errored for factoid {" + factoid + "}. Message: " + error +
      "." + "\n" + "Site: " + url);
    }
  });
}

/*
 * Second major fact-checking algorithm (strategy).
 * Named after one of the Greek ontologists, Anaxagoras due
 * to the ontology-based algorithm checks on DBPedia.
 *
 * Returns a 1 if the factoid appears to be true based on finding keywords in text.
 * Returns a 0 if the factoid appears to be false or conflicted.
 */
function anaxagorasStrategy(factoid, index, xml) {
  $xml = $(xml);

  // Pare factoid down to key words.
  factoidParsed = anaxagorasParser(factoid);

  // Search every node recursively and check if all words are in text.
  for(i = 0; i < $xml.find("*").children("Description").length; i++) {
    for(j = 0; j < factoidParsed.length; j++) {
      if($xml.find("*").children("Description").text().includes(factoidParsed[j])) {
        if(j == factoidParsed.length - 1) {
          factRecord[index] = '1';
          return 1;
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
 * The parser used for queries and matching factoids with reference text.
 * Meant to be paired with anaxagorasStrategy() as the fact-checking algorithm.
 * Initially, punctuation is removed and the factoid is split into a token (word) array.
 * Then, unimportant words are replaced, keeping key (important nouns, verbs, adjectives) words as search terms.
 *
 * Returns the parsed factoid string.
 */
function anaxagorasParser(factoid) {
  // Remove punctuation.
  factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(" ");

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
 * Callback to calculate ratio of factoids verified to
 * total factoids, from checkResultNodes().
 */
var pctCalc = function(returned_data) {
  if(returned_data == 1) {
    num++;
  }
  den++;
};

/*
 * Listens for the content.js scrape of textual data.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.url != url) {
      url = request.url;
      num = 0;
      den = 0;
      scrapedText = request.data;
      pageKeyWords = request.tags;
      factoids = parse();
      factRecord = factoids ? ['0'.repeat(factoids.length)] : [];
      countRelevanceOfDataComparedToOther(factoids);
    }

    // Mainly so Chrome doesn't complain the sender didn't receive a response.
    sendResponse({result: true});

});
