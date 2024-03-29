# FactoidL
#### Official repo for FactoidL, Automated Fact-Checking for the Web.

## Overview
FactoidL is meant to be an open source, free-to-use codebase to triangulate third-party content with a select group of
source databases (e.g., Wikipedia, DBPedia, Encyclopedia Britannica) in order to test the accuracy of the content.  Essentially, this is an open source
fact-checking algorithm on various platforms (browser extension, mobile apps, web apps).  The mission is to make fact-checking
open and accessible to all so they can quickly and accurately gauge how truthful the content they are reading is compared to public
human knowledge.

⚠️ **DISCLAIMER**: This is not (yet) meant to be a full replacement for human-guided fact-checking! ⚠️



## What's New In 2.5 (Plato)
* Options for changing the source API url (Note: still uses <extract> tags for xml source text results.)

* Each factoid is marked as verified as accurate (✔️) or inaccurate (❌), or unverified (❓).

* Slight boost in algorithm performance, although offset with new verified/unverified checks.
  
* Various minor code fixes like upgrading dependencies and script security.

## How To Use
LIVE DEMO HERE!!! https://alexanderkidd.github.io/

Otherwise, the easiest way to use FactoidL is to add the extension:
* [Chrome Extension](https://chrome.google.com/webstore/detail/factoidl-beta/kilmdgadjedfbopcfbffaeodhamgiadp)

* [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/factoidl-beta/?src=search)

While not all browsers are supported yet, most major browsers have similar extension APIs.
Usually you can install unpacked extensions by following a guide like this: https://support.google.com/chrome/a/answer/2714278?hl=en

A FactoidL desktop app using Electron has also been created under `factoidl-desktop`, download the appropriate zip for your platform here and then run the `factoidl-desktop` file: https://github.com/AlexanderKidd/FactoidL/releases

(**Note:** The application files have not been signed yet.)

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

By using FactoidL, you agree that any content that is fact checked with the FactoidL application(s) in unadulteratred form, is allowed to be transmitted
in said manner, in order to fulfill the fact-checking process.
