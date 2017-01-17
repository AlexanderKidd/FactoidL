/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 1/12/17
 * Description: Script to be injected into
 * page (e.g., data collection).
 * WARNING: THIS IS LIVE SCRIPT THAT IS RUN TOP TO BOTTOM!
 */

var bigData = $('p').text();
bigData.concat($('div').text());
bigData.concat($('caption').text());
bigData.concat($('q').text());
bigData.concat($('blockquote').text());
bigData.concat($('abbr').text());
bigData.concat($('address').text());
bigData.concat($('cite').text());
bigData.concat($('h1').text());
bigData.concat($('h2').text());
bigData.concat($('h3').text());
bigData.concat($('h4').text());
bigData.concat($('h5').text());
bigData.concat($('h6').text());

// Really only the page title will help with relevant links for now.
var keyWords = $('title').text();

// Pass scraped text to the background page for processing.
chrome.runtime.sendMessage({data: bigData, tags: keyWords}, function(response) {
});
