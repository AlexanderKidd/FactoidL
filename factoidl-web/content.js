/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/29/19
 * Description: Script to be injected into
 * page for content scraping.  For a single-page app,
 *
 */

function contentScrape(html, urlScraped) {
  var page = $(html);
  
  // Blacklist (remove) content that probably doesn't need to be checked, like dateline and byline classes (i.e., visible plaintext).
  // Decided against a whitelist since some sites have custom tags that are completely valid (e.g., <article>).
  var blacklist = ['div[class*="nav"]', '.byline', '.dateline', '.date', '.toc', 'applet', 'area', 'audio', 'base', 'basefont', 'canvas', 'embed', 'frame',
    'frameset', 'head', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'iframe', 'link', 'meta', 'noscript', 'object', 'param', 'progress', 'script', 'source', 'style', 'svg', 'track', 'video'];
  
  // Text scrapes based on HTML tags.
  var scrapedText = '';
  
  // A micro plugin for ignoring certain child elements, thanks to: https://stackoverflow.com/questions/11347779/jquery-exclude-children-from-text
  $.fn.ignore = function(page, sel) {
    return page.clone().find(sel || ">*").remove().end();
  };
  
  // Start with main header text, since this usually isn't followed by punctuation.
  var headerText = $('h1', page).text();
  if(headerText) {
    scrapedText += headerText + ".";
  }
  
  // Essentially, take the first level of whitelisted elements and ignore blacklisted, then do the same for the contents of each.
  $('body > :not(' + blacklist.join(',') + ')', page).each(function() {
  	scrapedText += page.contents().ignore(page, blacklist.join(',')).text().trim();
  
    scrapedText += ' ';
  });
  
  // The page title is usually brief enough for a related article search, otherwise try the first factoid.
  var keyWords = $('title', page).text();
  
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
  var url = urlScraped;

  // Pass scraped text to the background page for processing.
  return {data: scrapedText, tags: keyWords, url: url};
}
