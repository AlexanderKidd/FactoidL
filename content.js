/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 7/11/19
 * Description: Script to be injected into
 * page for content scraping.
 *
 * WARNING: THIS IS LIVE SCRIPT THAT IS RUN TOP TO BOTTOM!
 */

// Whitelist scrape content that needs to be checked.
var whitelist = ['div', 'header', 'p', 'a', 'li', 'dd', 'td', 'caption', 'q', 'blockquote', 'abbr', 'address', 'cite'];

// Blacklist (remove) content that doesn't need to be checked, like dateline and byline classes.
var blacklist = ['.byline', '.dateline'];

// Text scrapes based on HTML tags.
var scrapedText = '';

$(':not(:not(' + whitelist.join(',') + '))' + ':not(' + blacklist.join(',') + ')').each(function() {
	scrapedText += $(this).contents().filter(function() {
    return this.nodeType === 3;
  }).text().trim();

  scrapedText += ' ';
});

// The page title is usually brief enough for a related article search, otherwise try a factoid.
var keyWords = $('title').text();

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
