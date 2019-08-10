self.importScripts('compromise.min.js');

var pageWideResults = "";

/*
 * The parser used for queries and matching factoids with reference text.
 * Meant to be paired with anaxagorasStrategy() as the fact-checking algorithm.
 * Initially, punctuation is removed and the factoid is split into a token (word) array.
 * Then, unimportant words are replaced, keeping key (important nouns, verbs, adjectives) words as search terms.
 *
 * Returns the parsed factoid string.
 */
function anaxagorasParser(factoid) {
  // Remove punctuation.
  var factoidParsed = factoid.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(" ");

  // Replace unimportant words for query/to search results:
  for(k = 0; k < factoidParsed.length; k++) {
    // Article words:
    factoidParsed[k] = factoidParsed[k].replace(/\b(a|an|the|this|that|these|those)\b/gi, "");

    // Prepositions:
    factoidParsed[k] = factoidParsed[k].replace(/\b(with|within|despite|beneath|through|throughout|until|upon|to|from|at|by|for|from|in|out|into|near|of|off|on|onto|up|down|with|over|under|past|since|between|above|below|across|after|before|during|except|front|back)\b/gi, "");

    // Quantifiers:
    factoidParsed[k] = factoidParsed[k].replace(/\b(some|many|few|much|all|enough|several|too|quite|rather)\b/gi, "");

    // Pronouns:
    factoidParsed[k] = factoidParsed[k].replace(/\b(I|we|us|you|she|her|him|it|he|they|them|my|mine|his|hers|your|yours|its|our|ours|their|theirs)\b/gi, "");

    // Conjunctions:
    factoidParsed[k] = factoidParsed[k].replace(/\b(and|or|nor|but|so|yet)\b/gi, "");

    // Interrogatives:
    factoidParsed[k] = factoidParsed[k].replace(/\b(who|whom|whose|which|what|how|why|when|where)\b/gi, "");

    // Misc.:
    factoidParsed[k] = factoidParsed[k].replace(/\b(has|was|is|yes|no|never|nobody|like|as|though|although)\b/gi, "");
  }

  // Remove replaced words.
  factoidParsed = factoidParsed.filter(function (item) {
    return (item !== "");
  });

  return factoidParsed;
}

/*
 * Second major fact-checking algorithm (strategy).
 * Named after one of the Greek ontologists, Anaxagoras due
 * to the ontology-based algorithm checks on DBPedia.
 *
 * Returns a 1 if the factoid appears to be true based on finding keywords in text.
 * Returns a 0 if the factoid appears to be false or conflicted.
 */
function anaxagorasStrategy(factoid, index, text) {
  var sourceTexts = nlp(text).sentences().data().map((function(a) { return a.text; }));
  sourceTexts.push.apply(sourceTexts, nlp(pageWideResults).sentences().data().map((function(a) { return a.text; })));

  // Normalize to singular, to digits, to present tense, and expand contractions, then take content words only to compare.
  var nlpFactoid = nlp(factoid);
  nlpFactoid.nouns().toSingular();
  nlpFactoid.values().toNumber();
  nlpFactoid.sentences().toPresentTense();
  nlpFactoid.contractions().expand();

  var factoidParsed = anaxagorasParser(nlpFactoid.out());

  // TODO: Kick off another (blocking) async to get synonyms, then check antonyms/negations.

  // Search every source text node recursively and check if all words are present.
  for(i = 0; i < sourceTexts.length; i++) {
    // Normalize source facts.
    var nlpSource = nlp(sourceTexts[i]);
    nlpSource.nouns().toSingular();
    nlpSource.values().toNumber();
    nlpSource.sentences().toPresentTense();
    nlpSource.contractions().expand();

    var sourceFact = anaxagorasParser(nlpSource.out());

    for(j = 0; j < factoidParsed.length; j++) {
      if(sourceFact.includes(factoidParsed[j])) {
        if(j == factoidParsed.length - 1) {
          return 1;
        }
      }
      else {
        break;
      }
    }
  }

  return 0;
}

self.addEventListener('message', function(e) {
  pageWideResults = e.data.pageWideResults;
  self.postMessage({ "isVerified" : anaxagorasStrategy(e.data.factoid, e.data.index, e.data.text), "index" : e.data.index });
}, false);
