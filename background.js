/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 1/17/17
 * Description: Background page worker script.  Will
 * do most of the fact-checking tasks and pass it to popup.js.
 *
 * "Register your background page in the extension manifest.
 * In the common case, a background page does not require any
 * HTML markup. These kind of background pages can be implemented
 * using JavaScript files alone, like this:" -Google, 2015.
 */

// Visual text to analyze, as well as keywords for search query.
var bigData;
var keyWords;
var factoidsPct;
var num = 0;
var den = 0;

// Parse data into "factoids" (substrings based on keywords/frequency of phrases).
function parse() {
    return bigData.split(/[\r\t\n\.\?!]+/);
}

/*
 * Main quantitative analysis of the factoids by comparing it against an API call's results.
 * Currently, figuring out if "fact exists in database" with:
 * http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=stringsHere
 */
function countRelevanceOfDataComparedToOther(factoids) {
    for(i = 0; i < factoids.length; i++) {
      checkResultNodes(factoids[i], pctCalc);
    }
    return num / den;
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
 * A helper function.  DBPedia lookup returns an array of result nodes.
 */
function checkResultNodes(factoid, callback) {
  $.ajax({
    type: "GET",
    url: "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=thing&QueryString=" +
    encodeURIComponent(factoid),
    dataType: "xml",
    aync: false,
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
 * This listens for a message, specifically pulling from the content.js scrape.
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      bigData = request.data;
      keyWords = request.tags;
      var factoids = parse();
      countRelevanceOfDataComparedToOther(factoids);
});
