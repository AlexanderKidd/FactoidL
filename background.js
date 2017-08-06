/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/5/17
 * Description: Background page worker script.  Will
 * handle the fact-checking tasks and pass it to popup.js.
 *
 * Register your background page in the extension manifest.
 * HTML markup should not be required, it is meant for background
 * JavaScript functions in most cases.
 */

var bigData; // Visual text on the page to analyze.
var keyWords; // Used for Google search function on popup.html.
var factoids; // bigData scrape AFTER parsing.
var num = 0; // Numerator of factoids that are "accurate" (truthful).
var den = 0; // Denominator of total factoids checked.
var url = "";

/*
 * General sentence to factoid (Statements that may or may not be correct) parser.
 * The "10" in Regex was decided on since most sentences under eleven characters
 * are not worth checking or are not complete sentences.  "2000" is a generous
 * max character limit: we are checking sentences/statements here, not Finnegan's Wake.
 * Also, strip out excessive whitespace.  DBPedia seems to take ~4,000 characters max.
 */
function parse() {
  return bigData.replace(/\n|\s{2,}/g, ' ').match(/[A-Z0-9][^.!?]{10,2000}[.!?\n]/g);
}

/*
 * Main quantitative analysis of the factoids by comparing it against an API call's results.
 * Currently, figuring out if "fact exists in database" with:
 * http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=stringsHere
 */
function countRelevanceOfDataComparedToOther(factoids) {
  if(factoids !== null) {
    for(i = 0; i < factoids.length; i++) {
      checkResultNodes(factoids[i], pctCalc);
    }
  }
}

/*
 * A helper function.  DBPedia lookup returns an array of result nodes.
 */
function checkResultNodes(factoid, callback) {
  factoidCpy = anaxagorasParser(factoid);
  factoidCpy.splice(2);
  $.ajax({
    type: "GET",
    url: "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=" +
    encodeURIComponent(factoidCpy),
    dataType: "xml",
    async: true,
    success: function (xml) {
      callback.call(this, anaxagorasStrategy(factoid, xml));
    },
    error: function () {
      console.log("Oops.  Something went wrong with the AJAX request.");
    }
  });
}

/*
 * Second major fact-checking algorithm (strategy).
 * Named after one of the Greek ontologists, Anaxagoras due
 * to the algorithm checking based on ontology classes in DBPedia.
 *
 * Returns a 1 if the factoid appears to be true based on finding keywords in text.
 * Returns a 0 if the factoid appears to be false or conflicted.
 */
function anaxagorasStrategy(factoid, xml) {
  $xml = $(xml);

  // Pare factoid down to key words.
  factoidParsed = anaxagorasParser(factoid);

  // Search every node recursively and check if all words are in text.
  for(i = 0; i < $xml.find("*").children("Description").length; i++) {
    for(j = 0; j < factoidParsed.length; j++) {
      if($xml.find("*").children("Description").text().includes(factoidParsed[j])) {
        if(j == factoidParsed.length - 1) return 1;
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
 * Callback to calculate percentage when analysis from DB returns in checkResultNodes().
 */
var pctCalc = function(returned_data) {
  if(returned_data == 1) {
    num++;
  }
  den++;
};

/*
 * This listens for a message, specifically pulling from the content.js scrape.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.url != url) {
      url = request.url;
      num = 0;
      den = 0;
      bigData = request.data;
      keyWords = request.tags;
      factoids = parse();
      countRelevanceOfDataComparedToOther(factoids);
    }
});
