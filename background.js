/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 4/1/17
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
 * Parse data into "factoids" (Statements that may or may not be correct).
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
  $.ajax({
    type: "GET",
    url: "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=" +
    encodeURIComponent(factoid),
    dataType: "xml",
    async: false,
    success: function (xml) {
      // Just turn it into an object...no need to try to parse again...
      $xml = $(xml);

      if($xml.find("*").children().length > 0) {
        callback.call(this, 1);
      }
      else {
        callback.call(this, 0);
      }
    }
  });
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
