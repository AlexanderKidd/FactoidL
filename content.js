/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 5/13/18
 * Description: Script to be injected into
 * page for content scraping.
 *
 * WARNING: THIS IS LIVE SCRIPT THAT IS RUN TOP TO BOTTOM!
 */

// Text scrapes based on HTML tags.
var scrapedText = $('p').text();
scrapedText.concat(' ');
scrapedText.concat($('div').text());
scrapedText.concat(' ');
scrapedText.concat($('caption').text());
scrapedText.concat(' ');
scrapedText.concat($('q').text());
scrapedText.concat(' ');
scrapedText.concat($('blockquote').text());
scrapedText.concat(' ');
scrapedText.concat($('abbr').text());
scrapedText.concat(' ');
scrapedText.concat($('address').text());
scrapedText.concat(' ');
scrapedText.concat($('cite').text());
scrapedText.concat(' ');
scrapedText.concat($('h1').text());
scrapedText.concat(' ');
scrapedText.concat($('h2').text());
scrapedText.concat(' ');
scrapedText.concat($('h3').text());
scrapedText.concat(' ');
scrapedText.concat($('h4').text());
scrapedText.concat(' ');
scrapedText.concat($('h5').text());
scrapedText.concat(' ');
scrapedText.concat($('h6').text());

// The page title is usually brief enough for a related article search.
var keyWords = $('title').text();

// Get the URL of the page being scraped.
var url = window.location.href;

// Pass scraped text to the background page for processing.
chrome.runtime.sendMessage({data: scrapedText, tags: keyWords, url: url}, function(response) {
  // NO-OP
});
