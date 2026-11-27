/* Persian search: the text in the search index is normalised at build time
   (tools/mkdocs_hooks.py): Persian and Arabic-Indic digits become 0-9, Arabic ي/ك
   become ی/ک and Arabic diacritics are dropped. This script applies the same
   normalisation to what the reader types (before the search sees it), so "۱۵",
   "15", "بانكی" and "بانکی" all find the same pages. */
(function () {
  var digits = "۰۱۲۳۴۵۶۷۸۹", arabic = "٠١٢٣٤٥٦٧٨٩";
  function normalise(text) {
    return text
      .replace(/[۰-۹]/g, function (d) { return String(digits.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String(arabic.indexOf(d)); })
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[ً-ْ]/g, "");
  }
  /* German words in Persian letters: «کرانک» → «Krank», «آنملدونگ» → «Anmeldung».
     Two lists: search-german.json is written by hand (colloquial forms such as «ملده»);
     search-german-auto.json is made at build time (tools/search_hooks.py) from every
     German word on the site, with how often it appears. Letters that sound alike are
     folded together (fold) and missing vowels are forgiven (skeleton), so «کرنک» works
     too. A word that is on the site itself (search-words.json, built from the index) is
     never replaced: «بانک» stays «بانک». */
  var FOLD = { "آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ؤ": "و", "ئ": "ی", "ي": "ی", "ك": "ک", "ة": "ه",
               "ث": "س", "ص": "س", "ذ": "ز", "ض": "ز", "ظ": "ز", "ط": "ت", "ق": "غ", "ح": "ه" };
  function fold(word) {
    return word.replace(/[ً-ْٰ‌\s]/g, "").replace(/./g, function (c) { return FOLD[c] || c; });
  }
  /* Vowels after the first letter are left out, and so is ه: Persian writes the German e
     as ه at the end of a part of a compound («ملده‌بشاینیگونگ») or not at all. */
  function skeleton(folded) {
    return (folded.charAt(0) + folded.slice(1).replace(/[اویه]/g, "")).replace(/(.)\1+/g, "$1");
  }
  /* Germans drop the final r: «Ausländer» is said, and often written, «اوسلندا». The
     loosest key leaves out r as well, so «اوسلندا بهورده» meets «اوسلندر بهورده». */
  function looser(skel) { return skel.charAt(0) + skel.slice(1).replace(/ر/g, ""); }
  var exact = {}, loose = {}, loosest = {}, entries = [], siteWords = null, siteSorted = [], chosen = {};
  function fetchJSON(name) {
    var root = new URL(window.__md_scope || ".", location.href);
    return fetch(new URL("assets/" + name, root).href).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  /* The first spelling added for a key wins: the hand-written list first, then the
     words found on the site, most frequent first. */
  function add(german, spelling, weight) {
    var f = fold(spelling), k = skeleton(f), kk = looser(k);
    if (!exact[f]) exact[f] = german;
    /* a found word needs a longer key to be matched loosely: «کوندی» is the start of
       Kündigung (hand-written), not a loose spelling of Kind */
    var min = weight >= 1e6 ? 3 : 4;
    if (k.length >= min && !loose[k]) loose[k] = german;
    if (kk.length >= min && !loosest[kk]) loosest[kk] = german;
    entries.push({ german: german, weight: weight, f: f, kk: kk });
  }
  fetchJSON("search-german.json").then(function (data) {
    if (data) Object.keys(data).forEach(function (german) {
      if (german.charAt(0) !== "_") data[german].forEach(function (spelling) {
        add(german, spelling, 1e6);
        chosen[fold(spelling)] = german;
      });
    });
    return fetchJSON("search-german-auto.json");
  }).then(function (data) {
    if (!data) return;
    /* how often the site uses a word also ranks the hand-written ones: «اشپر» → Sperrkonto */
    var times = {};
    data.forEach(function (row) { times[row[0].toLowerCase()] = row[1]; add(row[0], row[2], row[1]); });
    entries.forEach(function (e) { if (e.weight >= 1e6) e.weight += times[e.german.toLowerCase()] || 0; });
  });
  fetchJSON("search-words.json").then(function (data) {
    if (data) { siteWords = new Set(data); siteSorted = data; }
  });

  /* A spelling written into the hand-made list is meant as German even when the same
     letters are on the site: «ملده» is said for Anmeldung (the site has «ملده ندارد»). */
  function onSite(word) { return siteWords && !chosen[fold(word)] ? siteWords.has(fold(word)) : false; }
  /* The reader is still typing: «بیم» is no word on the site, but the start of «بیمه». */
  function startOfSiteWord(word) {
    var f = fold(word);
    if (f.length < 2 || !/^[؀-ۿ]+$/.test(f) || onSite(word)) return false;
    var lo = 0, hi = siteSorted.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (siteSorted[mid] < f) lo = mid + 1; else hi = mid; }
    return lo < siteSorted.length && siteSorted[lo].indexOf(f) === 0;
  }
  function lookup(word, allowLoose) {
    var f = fold(word);
    if (f.length < 3 || !/[؀-ۿ]/.test(f)) return null;
    if (exact[f]) return exact[f];
    if (!allowLoose) return null;
    var k = skeleton(f), kk = looser(k);
    if (loose[k] || loosest[kk]) return loose[k] || loosest[kk];
    /* the start of a longer word: «اوسلندا» → Ausländerbehörde, «ملده» → Meldebescheinigung;
       of several, the one the site uses most (hand-written spellings first) */
    if (kk.length < 3 || f.length < 4) return null;
    /* a spelling that starts with exactly the letters typed comes first: «کوندی» →
       Kündigung («کوندیگونگ»), not Kindergeld («کیندرگلد») */
    var best = null, bestRank = null;
    entries.forEach(function (e) {
      if (e.kk.indexOf(kk) !== 0) return;
      var rank = [e.f.indexOf(f) === 0 ? 1 : 0, e.weight, -e.kk.length];
      if (!best || rank[0] > bestRank[0] || (rank[0] === bestRank[0] && (rank[1] > bestRank[1] || (rank[1] === bestRank[1] && rank[2] > bestRank[2])))) {
        best = e; bestRank = rank;
      }
    });
    return best && best.german;
  }
  /* {query, changed}: the search as the site understands it. The last word may be
     unfinished: if it is the start of a Persian word on the site, it stays Persian and
     is searched as a beginning (requireAll). */
  function germanize(query) {
    var words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return { query: query, changed: false };
    if (words.length > 1) {
      var allOnSite = words.every(onSite);
      var whole = !onSite(words.join("")) && lookup(words.join(""), !allOnSite);
      if (whole) return { query: whole, changed: true };
    }
    var changed = false;
    words = words.map(function (w, i) {
      if (onSite(w)) return w;
      var g = lookup(w, false) || (i === words.length - 1 && startOfSiteWord(w) ? null : lookup(w, true));
      if (g) { changed = true; return g; }
      return w;
    });
    return { query: changed ? words.join(" ") : query, changed: changed };
  }
  window.islGermanize = germanize;
  window.islStartOfSiteWord = startOfSiteWord;

  /* Compound words and phrases. The index splits words on spaces and on the
     zero-width non-joiner, so «سیم‌کارت» is two words, «سیم» and «کارت», and the theme
     shows every page that has just one of them (e.g. «کارت دانشجویی»). When the reader
     types more than one word, every word must be on the page: «سیم کارت» becomes
     «+سیم* +کارت*» on its way to the search worker (ui.js then puts pages with the
     whole phrase first). One word is searched as before, except a short Persian word,
     which must match whole. */
  function requireAll(query) {
    var words = query.replace(/\u200c/g, " ").trim().split(/\s+/).filter(function (w) {
      /* titles before a name («دکتر حیدری») are not needed to find it */
      return /[\w\u0600-\u06FF]/.test(w) && !/^(?:دکتر|آقای|خانم|dr\.?|prof\.?|frau|herr)$/i.test(w);
    });
    if (/["+\-~^:*]/.test(query)) return query;
    /* A short Persian word is searched as a whole word: «کار» should not find «کارت». */
    var term = function (w, last) {
      /* ...unless it is the unfinished end of what the reader is typing: «بیم» → «بیمه» */
      if (last && startOfSiteWord(w)) return w + "*";
      return /^[\u0600-\u06FF]{1,3}$/.test(w) ? w : w + "*";
    };
    if (words.length === 1) return term(words[0], true) === words[0] ? "+" + words[0] : words[0];
    if (!words.length) return query;
    return words.map(function (w, i) { return "+" + term(w, i === words.length - 1); }).join(" ");
  }
  if (window.Worker && Worker.prototype.postMessage) {
    var post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message) {
      /* type 2 = a search query from the theme (mkdocs-material 9.6) */
      if (message && message.type === 2 && typeof message.data === "string") {
        var german = germanize(message.data), query = requireAll(german.query);
        /* German words are often parts of longer ones: «فرزیش» → Versicherung should also
           find Krankenversicherung and Haftpflichtversicherung */
        if (german.changed) query = query.replace(/(^|[\s+])([A-Za-zÄÖÜäöüß]{5,})\*?(?=\s|$)/g, "$1*$2*");
        message = { type: 2, data: query };
      }
      return post.apply(this, [message].concat(Array.prototype.slice.call(arguments, 1)));
    };
  }

  /* Capture phase: runs before the theme's own input handler reads the value. */
  document.addEventListener("input", function (event) {
    var field = event.target;
    if (!field || !field.classList || !field.classList.contains("md-search__input")) return;
    var before = field.value, after = normalise(before);
    if (after !== before) {
      var caret = field.selectionStart;
      field.value = after;
      if (caret !== null && caret !== undefined) {
        var pos = Math.max(0, caret - (before.length - after.length));
        field.setSelectionRange(pos, pos);
      }
    }
    /* The theme only reads the box on keyup. Persian keyboards (IME), pasting and
       autocomplete can change the text without a keyup, so the search would not
       start; tell the theme every time the text changes. */
    field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }, true);
})();
