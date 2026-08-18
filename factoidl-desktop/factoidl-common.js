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
    var requestUrl = sourceApiUrl + sourceQueryParams + searchQuery;
    return fetch(requestUrl)
      .then(function(response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(function(json) {
        var sourceTitle = json[1] && json[1][0] ? json[1][0] : '';
        var sourceURL = json[3] && json[3][0] ? json[3][0] : '';
        var sourceTarget = sourceTitle || sourceURL;
        if (!sourceTarget) {
          if (sourceApiUrl && sourceApiUrl.indexOf('w/api.php') !== -1) {
            var fallbackUrl = sourceApiUrl + 'action=query&list=search&format=json&origin=*&srsearch=' + searchQuery;
            return fetch(fallbackUrl)
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
              });
          }
          if (typeof callback === 'function' && callback !== getSources) {
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
        if (typeof callback === 'function') callback.call(this, '');
      });
  }

  function getSources(sourceTerms, factoid, index) {
    var requestUrl;
    if (sourceApiUrl && retrieveSourceTextParams) {
      requestUrl = sourceApiUrl + retrieveSourceTextParams + encodeURIComponent(sourceTerms);
    }
    else {
      requestUrl = sourceTerms;
    }
    return fetch(requestUrl)
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
          if (words[j].length > 2) termCounts[words[j]] = (termCounts[words[j]] || 0) + weight;
        }
      }
    }
    addTerms(title, 2);
    for (var i = 0; i < factoids.length; i++) addTerms(factoids[i], 1);
    return Object.keys(termCounts).sort(function(a, b) {
      return termCounts[b] - termCounts[a] || a.localeCompare(b);
    }).slice(0, 6).join(' ');
  }

  function findSharedSourceTitles(searchTerms, title) {
    var titleTopics = getKeywords(title || '');
    var primaryTopic = titleTopics[0] || '';
    var candidates = [primaryTopic, title, searchTerms.split(' ').slice(0, 2).join(' '), searchTerms].filter(function(candidate, index, allCandidates) {
      return candidate && allCandidates.indexOf(candidate) === index;
    });
    function tryCandidate(index) {
      if (index >= candidates.length) return Promise.reject(new Error('No shared Wikipedia sources found'));
      return fetch(sourceApiUrl + sourceQueryParams + encodeURIComponent(candidates[index]))
        .then(function(response) {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(function(json) {
          var titles = (json[1] || []).filter(function(sourceTitle, titleIndex, allTitles) {
            return sourceTitle && allTitles.indexOf(sourceTitle) === titleIndex;
          }).slice(0, 2);
          return titles.length ? titles : tryCandidate(index + 1);
        });
    }
    return tryCandidate(0);
  }

  function compareFactoidsWithSharedSources(factoids, sourceText, sourceTitles) {
    for (var i = 0; i < factoids.length; i++) {
      var worker = i % 2 == 0 && i % 3 != 0 ? worker1 : i % 2 != 0 && i % 3 == 0 ? worker2 : worker3;
      worker.postMessage({ factoid: factoids[i], index: i, text: sourceText, pageWideResults: '', sourceTitles: sourceTitles || '' });
    }
  }

  function verifyFactoids(factoids) {
    if (!factoids || factoids.length === 0) return;
    sourceSearchTerms = getSharedSearchTerms(pageKeyWords, factoids);
    if (!sourceSearchTerms) {
      compareFactoidsWithSharedSources(factoids, '', '');
      return;
    }
    findSharedSourceTitles(sourceSearchTerms, pageKeyWords)
      .then(function(sourceTitles) {
        return Promise.all(sourceTitles.map(function(sourceTitle) { return getSources(sourceTitle, '', -1); }))
          .then(function(sourceTexts) { return { sourceTexts: sourceTexts, sourceTitles: sourceTitles }; });
      })
      .then(function(result) {
        pageWideResults = result.sourceTexts.filter(Boolean).join(' ');
        compareFactoidsWithSharedSources(factoids, pageWideResults, result.sourceTitles.join(' '));
      })
      .catch(function(err) {
        console.error('Error: shared source lookup failed. Error: ' + err);
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
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
