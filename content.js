/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 6/11/18
 * Description: Script to be injected into
 * page for content scraping.
 *
 * WARNING: THIS IS LIVE SCRIPT THAT IS RUN TOP TO BOTTOM!
 */

// Remove the dateline and byline classes content, those don't need to be checked.
var bylineSelector = ':not([class*="byline"])';
var datelineSelector = ':not([class*="dateline"])';

// Text scrapes based on HTML tags.
var scrapedText = $('p' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('div' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('li').text();
scrapedText += ' ';
scrapedText += $('dd').text();
scrapedText += ' ';
scrapedText += $('td').text();
scrapedText += ' ';
scrapedText += $('caption').text();
scrapedText += ' ';
scrapedText += $('q').text();
scrapedText += ' ';
scrapedText += $('blockquote').text();
scrapedText += ' ';
scrapedText += $('abbr').text();
scrapedText += ' ';
scrapedText += $('address').text();
scrapedText += ' ';
scrapedText += $('cite').text();
scrapedText += ' ';
scrapedText += $('h1' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('h2' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('h3' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('h4' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('h5' + bylineSelector + datelineSelector).text();
scrapedText += ' ';
scrapedText += $('h6' + bylineSelector + datelineSelector).text();

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
