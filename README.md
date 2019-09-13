# FactoidL
#### Official repo for FactoidL, Automated Fact-Checking for the Web.

## Overview
FactoidL is meant to be an open source, free to use codebase to triangulate third-party content with a select group of
databases (e.g., Wikipedia/DBPedia) in order to test the accuracy of the content.  Essentially, this is an open source
fact-checking algorithm in various formats (browser extension, mobile apps, web apps, etc.).  The mission is to make fact-checking
open and accessible to all so they can quickly and accurately gauge how truthful the content they are reading is compared to public
human knowledge.

## How To Use
The easiest way to use FactoidL is to add the extension:
* [Chrome Extension](https://chrome.google.com/webstore/detail/factoidl-beta/kilmdgadjedfbopcfbffaeodhamgiadp)

* [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/factoidl-beta/?src=search)

While not all browsers are supported yet, most major browsers have similar extension APIs.
Usually you can install unpacked extensions by following a guide like this: https://support.google.com/chrome/a/answer/2714278?hl=en

A new GitHub Pages site has been launched here for the time being: https://alexanderkidd.github.io/

A FactoidL desktop app using Electron has also been created under `factoidl-desktop`, just
download the executable.

## How To Contribute
You can contact us at the official email: factoidlproject@gmail.com

We'd love to have those interested/experienced in Natural Language Processing (NLP) areas, like semantic search.  Currently, we are focused on building a Google Chrome extension, a mobile app (PWA), and an Electron app for desktop.

You can also spread the love on [Twitter](https://twitter.com/FactoidL)!

## Contributors
Alexander Kidd (Lead Dev)

## Special Thanks To
* [Compromise.js](https://github.com/spencermountain/compromise) (Awesome all-purpose NLP for js)

* [Wikipedia](https://wikimediafoundation.org/about/mission/) (Crowd-sourced information!)

* [JQuery](https://jquery.com/) (Who said you didn't need it?)

## Privacy Policy
The FactoidL applications (on any platform), is meant to use only the source code included in the corresponding repository.
However, it does interact with other websites such as Wikipedia through requests for that content.

FactoidL in its original, unadulterated form, does not currently collect user data; however, if a website that has sensitive data on it is
checked, the fact checking algorithm may send part of that data as the query to requested sites such as the Wikipedia lookup.

By using FactoidL, you agree that any content that is fact checked with the FactoidL application(s) is allowed to be transmitted
in said manner, in order to fulfill the fact-checking process.
