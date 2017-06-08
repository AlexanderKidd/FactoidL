/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 6/7/17
 * Description: Background page worker script.  Will
 * do most of the fact-checking tasks and pass it to popup.js.
 *
 * "Register your background page in the extension manifest.
 * In the common case, a background page does not require any
 * HTML markup. These kind of background pages can be implemented
 * using JavaScript files alone, like this:" -Google, 2015.
 */

var bigData; // Visual text on the page to analyze.
var keyWords; // Used for Google search function on popup.html.
var factoids; // bigData scrape AFTER parsing.
var num = 0; // Numerator of factoids that are "accurate" (truthful).
var den = 0; // Denominator of total factoids checked.
var url = "";

/*
 * General sentence to factoid (Statements that may or may not be correct) parser.
 * The "11" in Regex was decided on since most sentences under eleven characters
 * are not worth checking or are not complete sentences.  "2000" is a generous
 * max character limit: we are checking sentences/statements here, not Finnegan's Wake.
 * Also, strip out excessive whitespace.  DBPedia seems to take ~4,000 characters max.
 */
function parse() {
  return bigData.replace(/\n|\s{2,}/g, ' ').match(/[A-Z0-9][^.!?]{11,2000}[.!?\n]/g);
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
  factoidCpy = parminedesParser(factoid);
  factoidCpy.splice(2);
  $.ajax({
    type: "GET",
    url: "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=" +
    encodeURIComponent(factoidCpy),
    dataType: "xml",
    async: true,
    success: function (xml) {
      callback.call(this, parminedesStrategy(factoid, xml));
    },
    error: function () {
      console.log("Oops.  Something went wrong with the AJAX request.");
    }
  });
}

/*
 * First major fact-checking algorithm (strategy).
 * Named after one of the earliest ontologists, Parminedes due
 * to the algorithm checking based on ontology classes in DBPedia.
 *
 * Returns a 1 if the factoid appears to be true based on finding keywords in text.
 * Returns a 0 if the factoid appears to be false or conflicted.
 */
function parminedesStrategy(factoid, xml) {
  $xml = $(xml);

  // Pare factoid down to key words.
  factoidParsed = parminedesParser(factoid);

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
 * The first parser used for queries and matching factoids with reference text.
 * Meant to be paired with parminedesStrategy() as the first fact-checking algorithm.
 * Initially, punctuation is removed and the factoid is split into a token (word) array.
 * Then, article words are replaced, keeping key (important) words as search terms.
 *
 * Returns the parsed factoid string.
 */
function parminedesParser(factoid) {
  factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(" ");
  for(k = 0; k < factoidParsed.length; k++) {
    factoidParsed[k] = factoidParsed[k].replace(/\b(a|an|the|this|that|these|those|some|I|we|us|you|she|her|him|it|he|they|them|and|or|nor|was|is|not|)\b/gi, "");
  }
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
