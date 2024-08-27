/*
 * @author Alexander Kidd
 * Created: 8/1/15
 * Revised: 8/29/19
 * Description: Script to be injected into
 * page for content scraping.  For a single-page app,
 *
 */

function contentScrape(html, urlScraped) {
  // Text scrapes based on HTML tags, but we're just reading all text in the box as plaintext.
  var scrapedText = html;
  
  // No page title to pull, return all scrapedText and have getKeywords() handle it.
  var keyWords = scrapedText;

  // Get the URL of the page being scraped (irrelevant to web version).
  var url = urlScraped;

  // Pass scraped text to the background page for processing.
  return {data: scrapedText, tags: keyWords, url: url};
}
