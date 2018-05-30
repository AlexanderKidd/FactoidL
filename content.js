/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 5/14/18
 * Description: Script to be injected into
 * page for content scraping.
 *
 * WARNING: THIS IS LIVE SCRIPT THAT IS RUN TOP TO BOTTOM!
 */

// Remove the dateline and byline at least, those don't need to be checked.
var bylineSelector = ':not([class*="byline"])';
var datelineSelector = ':not([class*="dateline"])';

// Text scrapes based on HTML tags.
var scrapedText = $('p' + bylineSelector + datelineSelector).text();
scrapedText.concat(' ');
scrapedText.concat($('div' + bylineSelector + datelineSelector).text());
scrapedText.concat(' ');
scrapedText.concat($('li').text());
scrapedText.concat(' ');
scrapedText.concat($('dd').text());
scrapedText.concat(' ');
scrapedText.concat($('td').text());
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
scrapedText.concat($('h1' + bylineSelector + datelineSelector).text());
scrapedText.concat(' ');
scrapedText.concat($('h2' + bylineSelector + datelineSelector).text());
scrapedText.concat(' ');
scrapedText.concat($('h3' + bylineSelector + datelineSelector).text());
scrapedText.concat(' ');
scrapedText.concat($('h4' + bylineSelector + datelineSelector).text());
scrapedText.concat(' ');
scrapedText.concat($('h5' + bylineSelector + datelineSelector).text());
scrapedText.concat(' ');
scrapedText.concat($('h6' + bylineSelector + datelineSelector).text());

// The page title is usually brief enough for a related article search.
var keyWords = $('title').text();

// Get the URL of the page being scraped.
var url = window.location.href;

// Pass scraped text to the background page for processing.
chrome.runtime.sendMessage({data: scrapedText, tags: keyWords, url: url}, function(response) {
  // Issue with listener in background script always causing a "message port closed" error.
  // Disable in production for now.
  // Issue: https://bugs.chromium.org/p/chromium/issues/detail?id=586155
  // if(chrome.runtime.lastError != null) {
  //   console.error(chrome.runtime.lastError);
  // }
});
