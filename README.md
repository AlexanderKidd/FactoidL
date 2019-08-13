# FactoidL
#### Official repo for FactoidL, Automated Fact-Checking for the Web.

## Overview
FactoidL is meant to be an open source, free to use codebase to triangulate third-party content with a select group of
databases (e.g., Wikipedia/DBPedia) in order to test the accuracy of the content.  Essentially, this is an open source
fact-checking algorithm in various formats (browser extension, mobile apps, web apps, etc.).  The mission is to make fact-checking
open and accessible to all so they can quickly and accurately gauge how truthful the content they are reading is compared to public
human knowledge.

## How To Contribute
You can contact us at the official email: factoidlproject@gmail.com

We'd love to have those interested/experienced in Natural Language Processing (NLP) areas, like semantic search.  Currently, we are focused on building a Google Chrome extension, a mobile app (PWA), and an Electron app for desktop.

You can also spread the love on [Twitter](https://twitter.com/FactoidL)!

## How To Use
The easiest way to use FactoidL is to add the [Chrome Extension](https://chrome.google.com/webstore/detail/factoidl-beta/kilmdgadjedfbopcfbffaeodhamgiadp).

Normally, extensions are packed to obfuscate code and so it is condensed into a neat package for downloading from say,
the Chrome Web Store.  However, if you must add this extension "unpacked" instead, instructions are as follows:

1. Download all of the files in this repo to a local directory on your computer.
2. Enable Developer Mode in the latest version of Chrome.  It is found under Settings &rarr; Extensions &rarr; Check Developer Mode.
Do not navigate away from this page.
3. On the same Extensions page, click "Load unpacked extension..." and select the local directory with all of the FactoidL
files from step 1.
4. Now, the FactoidL icon should show next to your omnibox (in the top right, where extensions are usually found).
5. Navigate to a page (**example_fact_content.html** is provided as an example article that is periodically
updated to simulate fact-checking a webpage) and click on the FactoidL extension icon.
6. If an error is shown on the popup, try refreshing the page you are currently on.  Otherwise, statistics about the facts checked
should show up on the extension popup.

## Contributors
Alexander Kidd (Lead Dev)

## Special Thanks To
* [Compromise.js](https://github.com/spencermountain/compromise) (Awesome all-purpose NLP for js)

* [Wikipedia](https://wikimediafoundation.org/about/mission/) (Crowd-sourced information!)

* [JQuery](https://jquery.com/) (Who said you didn't need it?)
