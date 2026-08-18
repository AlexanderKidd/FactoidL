/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/11/19
 * Description: Script to be injected into
 * page for content scraping.
 *
 * WARNING: THIS IS LIVE SCRIPT THAT IS RUN TOP TO BOTTOM!
 */

// Blacklist (remove) content that probably doesn't need to be checked, like dateline and byline classes (i.e., visible plaintext).
// Decided against a whitelist since some sites have custom tags that are completely valid (e.g., <article>).
var blacklist = ['div[class*="nav"]', '.byline', '.dateline', '.date', '.toc', 'applet', 'area', 'audio', 'base', 'basefont', 'canvas', 'embed', 'frame',
  'frameset', 'head', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'iframe', 'link', 'meta', 'noscript', 'object', 'param', 'progress', 'script', 'source', 'style', 'svg', 'track', 'video'];

// Text scrapes based on HTML tags.
var scrapedText = '';

var blacklistSelector = blacklist.join(',');

// Cloning nodes makes the browser re-resolve external SVG/media references, which trips cross-origin checks on some sites.
function scrapeVisibleText(element) {
  var text = '';
  var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  while(walker.nextNode()) {
    var parent = walker.currentNode.parentElement;

    if(parent && !parent.closest(blacklistSelector)) {
      text += walker.currentNode.nodeValue.trim() + ' ';
    }
  }

  return text;
}

// Start with main header text, since this usually isn't followed by punctuation.
var headerText = $('h1').text();
if(headerText) {
  scrapedText += headerText + ".";
}

// Essentially, take the first level of whitelisted elements and ignore blacklisted, then do the same for the contents of each.
$('body > :not(' + blacklistSelector + ')').each(function() {
  scrapedText += scrapeVisibleText(this).trim() + ' ';
});

// The page title is usually brief enough for a related article search, otherwise try the first factoid.
var keyWords = $('title').text();

if(keyWords.includes(" - ")) {
  var tempTitle = keyWords.split(" - ");
  if(tempTitle[0].length > tempTitle[1].length) {
    keyWords = tempTitle[0];
  }
  else {
    keyWords = tempTitle[1];
  }
}
else if(keyWords.includes(" | ")) {
  var tempTitle = keyWords.split(" | ");
  if(tempTitle[0].length > tempTitle[1].length) {
    keyWords = tempTitle[0];
  }
  else {
    keyWords = tempTitle[1];
  }
}

if(!keyWords) {
	if(scrapedText.indexOf('.') != -1) {
		keyWords = scrapedText.substring(0, scrapedText.indexOf('.'));
	}
	else {
		keyWords = "No keywords found. Need page title or page text.";
	}
}

// Get the URL of the page being scraped.
var url = window.location.href;

// Pass scraped text to the background page for processing.
chrome.runtime.sendMessage({data: scrapedText, tags: keyWords, url: url}, function(response) {
  // No-op.
});
