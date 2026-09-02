(function(root) {
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripHtmlTags(text) {
    return text.replace(/<[^>]+>/g, '');
  }

  function extractParagraphTextFromHtml(html) {
    var cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/ig, '');
    cleaned = cleaned.replace(/<img\b[^>]*>/ig, '');
    var matches = cleaned.match(/<(?:p|i)[^>]*>([\s\S]*?)<\/(?:p|i)>/ig) || [];
    var result = [];
    matches.forEach(function(tag) {
      var text = stripHtmlTags(tag).trim();
      if (text) {
        result.push(text);
      }
    });
    return result.join(' ');
  }

  function aristotleParser(factoid) {
    var factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\]\[]/g, '').split(' ');

    for (var k = 0; k < factoidParsed.length; k++) {
      factoidParsed[k] = factoidParsed[k].trim();
      factoidParsed[k] = factoidParsed[k].replace(/\b(a|an|the|this|that|these|those)\b/gi, '');
      factoidParsed[k] = factoidParsed[k].replace(/\b(with|within|despite|beneath|through|throughout|until|upon|to|from|at|by|for|from|in|out|into|near|of|off|on|onto|up|down|with|over|under|past|since|between|above|below|across|after|before|during|except|front|back)\b/gi, '');
      factoidParsed[k] = factoidParsed[k].replace(/\b(some|many|few|much|all|enough|several|too|quite|rather)\b/gi, '');
      factoidParsed[k] = factoidParsed[k].replace(/\b(I|we|us|you|she|her|him|it|he|they|them|my|mine|his|hers|your|yours|its|our|ours|their|theirs)\b/gi, '');
      factoidParsed[k] = factoidParsed[k].replace(/\b(and|or|nor|but|so|yet)\b/gi, '');
      factoidParsed[k] = factoidParsed[k].replace(/\b(who|whom|whose|which|what|how|why|when|where)\b/gi, '');
      factoidParsed[k] = factoidParsed[k].replace(/\b(has|was|is|yes|no|never|nobody|like|as|though|although)\b/gi, '');
    }

    factoidParsed = factoidParsed.filter(function(item) {
      return item !== '';
    });

    return factoidParsed;
  }

  function getKeywords(factoid) {
    var keyWords = [];
    if (typeof nlp === 'function') {
      try {
        keyWords = nlp(factoid).topics().data().map(function(a) { return a.text.trim(); });
      }
      catch (err) {
        keyWords = [];
      }
    }

    if (!keyWords || keyWords.length === 0) {
      keyWords = aristotleParser(factoid);
      if (!keyWords || keyWords.length === 0) {
        keyWords = factoid.split(' ');
      }
    }

    return keyWords;
  }

  function sentenceParse() {
    var nlpText = typeof nlp === 'function' ? nlp(scrapedText.replace(/\.-/g, '. ')) : null;
    var abbrList = [];

    if (nlpText) {
      try {
        abbrList = nlpText.match('(#Acronym|#Abbreviation)').text().split(' ');
      }
      catch (err) {
        abbrList = [];
      }
    }

    abbrList.forEach(function(token) {
      if (token) {
        var re = new RegExp('\\s' + escapeRegExp(token) + '\\s', 'g');
        var replace = token.replace(/\./g, '');
        scrapedText = scrapedText.replace(re, ' ' + replace + ' ');
      }
    });

    return scrapedText.replace(/\n|\s{2,}/g, ' ').match(/[A-Z0-9][^.?!]{10,2000}[.?!\n]/g);
  }

  // Full common logic: search, fetch sources, record and verify factoids.

  function normalizeParam(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeApiUrl(baseUrl, params) {
    baseUrl = normalizeParam(baseUrl);
    params = normalizeParam(params);
    if (!baseUrl) return params;
    if (params.indexOf('?') === 0 || params.indexOf('&') === 0) {
      params = params.slice(1);
    }
    if (baseUrl.slice(-1) !== '?' && baseUrl.slice(-1) !== '&') {
      baseUrl += baseUrl.indexOf('?') === -1 ? '?' : '&';
    }
    return baseUrl + params;
  }

  function extractWikiTitleFromUrl(url) {
    if (!url || typeof url !== 'string') return '';

    var match = url.match(/\/wiki\/([^#?]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1].replace(/\//g, ' '));
    }

    try {
      var parsed = new URL(url);
      if (parsed.searchParams.has('title')) {
        return parsed.searchParams.get('title').replace(/\//g, ' ');
      }
      if (parsed.searchParams.has('curid')) {
        return 'curid:' + parsed.searchParams.get('curid');
      }
    }
    catch (err) {
      return '';
    }

    return '';
  }

  function fetchWithTimeout(requestUrl, options, timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    return new Promise(function(resolve, reject) {
      var timedOut = false;
      var timer = setTimeout(function() {
        timedOut = true;
        reject(new Error('Fetch timeout: ' + requestUrl));
      }, timeoutMs);

      fetch(requestUrl, options)
        .then(function(response) {
          if (timedOut) return;
          clearTimeout(timer);
          resolve(response);
        })
        .catch(function(err) {
          if (timedOut) return;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function buildWikiApiRequest(sourceTerms) {
    var title = extractWikiTitleFromUrl(sourceTerms);
    if (title) {
      return normalizeApiUrl(sourceApiUrl, retrieveSourceTextParams) + encodeURIComponent(title);
    }
    return sourceTerms;
  }

  function queryForSources(factoid, index, callback) {
    var factoidKeywords = getKeywords(factoid);
    if (!factoidKeywords || factoidKeywords.length === 0) factoidKeywords = getKeywords(pageKeyWords);

    if (factoidKeywords[0] && factoidKeywords[0].indexOf(' ') === -1 && factoidKeywords.length > 1 && factoidKeywords[1] && factoidKeywords[1] !== factoidKeywords[0]) {
      factoidKeywords = (factoidKeywords[0] + ' ' + factoidKeywords[1]).split(' ');
    }
    else {
      factoidKeywords = (factoidKeywords[0] || '').split(' ').slice(0, 2);
    }

    var searchQuery = encodeURIComponent(factoidKeywords.join(' '));
    var normalizedSourceApiUrl = normalizeApiUrl(sourceApiUrl, sourceQueryParams);
    var requestUrl = normalizedSourceApiUrl + searchQuery;
    return fetchWithTimeout(requestUrl, null, 15000)
      .then(function(response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(function(json) {
        var sourceTitle = json[1] && json[1][0] ? json[1][0] : '';
        var sourceURL = json[3] && json[3][0] ? json[3][0] : '';
        var sourceTarget = sourceTitle || sourceURL;
        if (!sourceTarget) {
          console.warn('queryForSources skipped: no opensearch result', { factoid: factoid, index: index, requestUrl: requestUrl });
          if (sourceApiUrl && sourceApiUrl.indexOf('w/api.php') !== -1) {
            var fallbackUrl = normalizeApiUrl(sourceApiUrl, 'action=query&list=search&format=json&origin=*&srsearch=') + searchQuery;
            return fetchWithTimeout(fallbackUrl, null, 15000)
              .then(function(response2) {
                if (!response2.ok) throw new Error('Network response was not ok');
                return response2.json();
              })
              .then(function(json2) {
                var fallbackTitle = json2.query && json2.query.search && json2.query.search[0] && json2.query.search[0].title ? json2.query.search[0].title : '';
                if (!fallbackTitle) {
                  throw new Error('No fallback title returned from search');
                }
                return getSources(fallbackTitle, factoid, index);
              })
              .catch(function(err) {
                console.error('queryForSources fallback error', { err: err, factoid: factoid, index: index, fallbackUrl: fallbackUrl });
                if (callback === getSources) {
                  return getSources('', factoid, index);
                }
                if (typeof callback === 'function') {
                  callback.call(this, '');
                }
                return '';
              });
          }
          if (callback === getSources) {
            return getSources('', factoid, index);
          }
          if (typeof callback === 'function') {
            callback.call(this, '');
          }
          return '';
        }
        if (callback === getSources) {
          return getSources(sourceTarget, factoid, index);
        }
        return getSources(sourceTarget, factoid, index).then(function(result) {
          if (typeof callback === 'function') callback.call(this, result);
          return result;
        });
      })
      .catch(function(err) {
        factRecord[index] = '404';
        den++;
        console.error('Error: queryForSources() article search request errored for factoid {' + factoid + '}. Source: ' + requestUrl + '. Error: ' + err);
        if (typeof callback === 'function') {
          callback.call(this, '');
        }
      });
  }

  function reportSourceFetchFailure(factoid, index) {
    if (index >= 0) {
      if (index % 2 == 0 && index % 3 != 0) {
        worker1.postMessage({ factoid: factoid, index: index, text: '', pageWideResults: pageWideResults });
      }
      else if (index % 2 != 0 && index % 3 == 0) {
        worker2.postMessage({ factoid: factoid, index: index, text: '', pageWideResults: pageWideResults });
      }
      else {
        worker3.postMessage({ factoid: factoid, index: index, text: '', pageWideResults: pageWideResults });
      }
    }
  }

  function getSources(sourceTerms, factoid, index) {
    var requestUrl;
    if (!sourceTerms) {
      reportSourceFetchFailure(factoid, index);
      return Promise.resolve('');
    }
    if (sourceApiUrl && retrieveSourceTextParams && !/^https?:\/\//i.test(sourceTerms)) {
      requestUrl = normalizeApiUrl(sourceApiUrl, retrieveSourceTextParams) + encodeURIComponent(sourceTerms);
    }
    else {
      requestUrl = buildWikiApiRequest(sourceTerms);
    }

    return fetchWithTimeout(requestUrl, null, 15000)
      .then(function(response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(function(text) {
        var extractText;

        if (sourceApiUrl && retrieveSourceTextParams) {
          var match = text.match(/<extract\b[^>]*>[^]*<\/extract\b[^>]*>/ig);
          extractText = match ? match[0].replace(/<extract\b[^>]*>/ig, '').replace(/<\/extract\b[^>]*>/ig, '') : '';
        }
        else {
          extractText = extractParagraphTextFromHtml(text);
        }

        if (index >= 0) {
          if (index % 2 == 0 && index % 3 != 0) {
            worker1.postMessage({ factoid: factoid, index: index, text: extractText, pageWideResults: pageWideResults });
          }
          else if (index % 2 != 0 && index % 3 == 0) {
            worker2.postMessage({ factoid: factoid, index: index, text: extractText, pageWideResults: pageWideResults });
          }
          else {
            worker3.postMessage({ factoid: factoid, index: index, text: extractText, pageWideResults: pageWideResults });
          }
        }
        else if (index == -1) {
          pageWideResults = extractText;
        }

        return extractText;
      })
      .catch(function(err) {
        console.error('Error: getSources() source request errored for factoid {' + factoid + '}. Site: ' + requestUrl + '. Error: ' + err);
        reportSourceFetchFailure(factoid, index);
        return '';
      });
  }

  function recordResults(returned_data, index) {
    if (returned_data == 1) {
      factRecord[index] = '1';
      num++;
    }
    else if (returned_data == -1) {
      factRecord[index] = '-1';
      num++;
    }
    den++;
  }

  function getSharedSearchTerms(title, factoids) {
    var termCounts = {};

    function addTerms(text, weight) {
      var terms = getKeywords(text || '');
      for (var i = 0; i < terms.length; i++) {
        var words = terms[i].toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || [];
        for (var j = 0; j < words.length; j++) {
          if (words[j].length > 2) {
            termCounts[words[j]] = (termCounts[words[j]] || 0) + weight;
          }
        }
      }
    }

    addTerms(title, 2);
    for (var i = 0; i < factoids.length; i++) {
      addTerms(factoids[i], 1);
    }

    return Object.keys(termCounts)
      .sort(function(a, b) {
        return termCounts[b] - termCounts[a] || a.localeCompare(b);
      })
      .slice(0, 6)
      .join(' ');
  }

  function findSharedSourceTitles(searchTerms, title, content) {
    var requestUrl = normalizeApiUrl(sourceApiUrl, sourceQueryParams) + encodeURIComponent(searchTerms);
    function searchOpenSearch(query) {
      var queryUrl = normalizeApiUrl(sourceApiUrl, sourceQueryParams) + encodeURIComponent(query);
      return fetchWithTimeout(queryUrl, null, 15000)
      .then(function(response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(function(json) {
        var titles = json[1] || [];
        return titles.filter(function(title, index, allTitles) {
          return title && allTitles.indexOf(title) === index;
        }).slice(0, 2);
      });
    }

    var contentTopics = getKeywords(content || '');
    var primaryContentTopic = contentTopics[0] || '';
    var titleTopics = getKeywords(title || '');
    var primaryTopic = titleTopics[0] || '';
    var fallbackTerms = searchTerms.split(' ').slice(0, 2).join(' ');
    // The factoids' own subject should outrank the page title, which can be generic or unrelated (e.g. site branding).
    var candidates = [primaryContentTopic, primaryTopic, title, fallbackTerms, searchTerms].filter(function(candidate, index, allCandidates) {
      return candidate && allCandidates.indexOf(candidate) === index;
    });

    function tryCandidate(index) {
      if (index >= candidates.length) {
        throw new Error('No shared Wikipedia sources found');
      }
      return searchOpenSearch(candidates[index]).then(function(titles) {
        if (titles.length > 0) {
          return titles;
        }
        return tryCandidate(index + 1);
      });
    }

    return tryCandidate(0);
  }

  // Words that are commonly capitalized but aren't useful, distinctive Wikipedia search terms.
  var COMMON_CAPITALIZED_WORDS = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|I)$/;

  // Only retry factoids that contain a distinctive proper noun (e.g. "North Korea"), not just any unverified factoid.
  function hasClearSearchTerm(factoid) {
    if (typeof nlp === 'function') {
      try {
        if (nlp(factoid).topics().data().length > 0) return true;
      }
      catch (err) { /* fall through to capitalization check */ }
    }

    var words = factoid.trim().split(/\s+/);
    for (var i = 1; i < words.length; i++) {
      var word = words[i].replace(/[^A-Za-z]/g, '');
      if (word.length > 1 && /^[A-Z][a-z]+$/.test(word) && !COMMON_CAPITALIZED_WORDS.test(word)) {
        return true;
      }
    }
    return false;
  }

  function dispatchFactoidToWorker(factoid, index, sourceText, sourceTitles) {
    var worker = index % 2 == 0 && index % 3 != 0 ? worker1 : index % 2 != 0 && index % 3 == 0 ? worker2 : worker3;
    worker.postMessage({ factoid: factoid, index: index, text: sourceText, pageWideResults: '', sourceTitles: sourceTitles || '' });
  }

  function compareFactoidsWithSharedSources(factoids, sourceText, sourceTitles) {
    for (var i = 0; i < factoids.length; i++) {
      dispatchFactoidToWorker(factoids[i], i, sourceText, sourceTitles);
    }
  }

  // Cap simultaneous AND total fallback lookups so large pages can't flood Wikipedia's API or balloon runtime.
  var MAX_CONCURRENT_FACTOID_RETRIES = 3;
  var MAX_TOTAL_FACTOID_RETRIES = 20;
  var activeFactoidRetries = 0;
  var startedFactoidRetries = 0;
  var pendingFactoidRetries = [];

  function runNextFactoidRetry() {
    if (activeFactoidRetries >= MAX_CONCURRENT_FACTOID_RETRIES || pendingFactoidRetries.length === 0) return;
    var job = pendingFactoidRetries.shift();
    activeFactoidRetries++;
    performFactoidRetry(job.factoid, job.index).then(function() {
      activeFactoidRetries--;
      runNextFactoidRetry();
    });
  }

  // Only unverified factoids get a second, targeted lookup, queued and capped so this stays fast on long articles.
  function retryFactoidWithOwnSource(factoid, index) {
    if (startedFactoidRetries >= MAX_TOTAL_FACTOID_RETRIES) {
      dispatchFactoidToWorker(factoid, index, '', '');
      return;
    }
    startedFactoidRetries++;
    pendingFactoidRetries.push({ factoid: factoid, index: index });
    runNextFactoidRetry();
  }

  function resetFactoidRetryQueue() {
    pendingFactoidRetries = [];
    activeFactoidRetries = 0;
    startedFactoidRetries = 0;
  }

  // Wikipedia's full-text search matches an isolated sentence far more reliably than title-prefix opensearch.
  function findFallbackSourceForFactoid(factoid) {
    var query = getKeywords(factoid)[0] || factoid.split(' ').slice(0, 6).join(' ');
    var isWikipediaApi = sourceApiUrl && sourceApiUrl.indexOf('w/api.php') !== -1;

    var titleLookup = isWikipediaApi
      ? fetchWithTimeout(normalizeApiUrl(sourceApiUrl, 'action=query&list=search&format=json&origin=*&srlimit=1&srsearch=') + encodeURIComponent(query), null, 8000)
          .then(function(response) {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
          })
          .then(function(json) {
            var title = json.query && json.query.search && json.query.search[0] && json.query.search[0].title;
            if (!title) throw new Error('No fallback Wikipedia sources found');
            return [title];
          })
      : findSharedSourceTitles(query, factoid, factoid);

    return titleLookup.then(function(sourceTitles) {
      return getSources(sourceTitles[0], '', -1).then(function(sourceText) {
        return { sourceText: sourceText || '', sourceTitle: sourceTitles[0] };
      });
    });
  }

  function performFactoidRetry(factoid, index) {
    return findFallbackSourceForFactoid(factoid)
      .then(function(result) {
        dispatchFactoidToWorker(factoid, index, result.sourceText, result.sourceTitle);
      })
      .catch(function(err) {
        console.error('Error: retryFactoidWithOwnSource() failed for factoid {' + factoid + '}. Error: ' + err);
        dispatchFactoidToWorker(factoid, index, '', '');
      });
  }

  function verifyFactoids(factoids) {
    if (!factoids || factoids.length === 0) {
      console.error('Error: verifyFactoids() had undefined or no factoids to check.');
      return;
    }

    var sharedSearchTerms = getSharedSearchTerms(pageKeyWords, factoids);
    sourceSearchTerms = sharedSearchTerms;
    if (!sharedSearchTerms) {
      console.warn('verifyFactoids() could not derive shared source terms.');
      compareFactoidsWithSharedSources(factoids, '', '');
      return;
    }

    findSharedSourceTitles(sharedSearchTerms, pageKeyWords, factoids.join(' '))
      .then(function(sourceTitles) {
        if (sourceTitles.length === 0) {
          throw new Error('No shared Wikipedia sources found');
        }
        return Promise.all(sourceTitles.map(function(sourceTitle) {
          return getSources(sourceTitle, '', -1);
        })).then(function(sourceTexts) { return { sourceTexts: sourceTexts, sourceTitles: sourceTitles }; });
      })
      .then(function(result) {
        pageWideResults = result.sourceTexts.filter(Boolean).join(' ');
        sourceTextLength = pageWideResults.length;
        sourceError = pageWideResults ? '' : 'Wikipedia returned no readable source text.';
        compareFactoidsWithSharedSources(factoids, pageWideResults, result.sourceTitles.join(' '));
      })
      .catch(function(err) {
        console.error('Error: verifyFactoids() shared source lookup failed. Error: ' + err);
        pageWideResults = '';
        sourceTextLength = 0;
        sourceError = 'Could not find Wikipedia source pages for this check.';
        compareFactoidsWithSharedSources(factoids, '', '');
      });
  }

  root.escapeRegExp = escapeRegExp;
  root.stripHtmlTags = stripHtmlTags;
  root.extractParagraphTextFromHtml = extractParagraphTextFromHtml;
  root.aristotleParser = aristotleParser;
  root.getKeywords = getKeywords;
  root.sentenceParse = sentenceParse;
  root.queryForSources = queryForSources;
  root.getSources = getSources;
  root.recordResults = recordResults;
  root.getSharedSearchTerms = getSharedSearchTerms;
  root.findSharedSourceTitles = findSharedSourceTitles;
  root.retryFactoidWithOwnSource = retryFactoidWithOwnSource;
  root.resetFactoidRetryQueue = resetFactoidRetryQueue;
  root.hasClearSearchTerm = hasClearSearchTerm;
  root.verifyFactoids = verifyFactoids;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      escapeRegExp: escapeRegExp,
      stripHtmlTags: stripHtmlTags,
      extractParagraphTextFromHtml: extractParagraphTextFromHtml,
      aristotleParser: aristotleParser,
      getKeywords: getKeywords,
      sentenceParse: sentenceParse,
      queryForSources: queryForSources,
      getSources: getSources,
      recordResults: recordResults,
      getSharedSearchTerms: getSharedSearchTerms,
      findSharedSourceTitles: findSharedSourceTitles,
      verifyFactoids: verifyFactoids
    };
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this);
