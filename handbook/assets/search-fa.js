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
     The spellings are in search-german.json; letters that sound alike are folded
     together (fold) and missing vowels are forgiven (skeleton), so «کرنک» works too.
     A word that is on the site itself (search-words.json, built from the index) is
     never replaced: «بانک» stays «بانک». */
  var FOLD = { "آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ؤ": "و", "ئ": "ی", "ي": "ی", "ك": "ک", "ة": "ه",
               "ث": "س", "ص": "س", "ذ": "ز", "ض": "ز", "ظ": "ز", "ط": "ت", "ق": "غ", "ح": "ه" };
  function fold(word) {
    return word.replace(/[\u064b-\u0652\u0670\u200c\s]/g, "").replace(/./g, function (c) { return FOLD[c] || c; });
  }
  function skeleton(folded) {
    return (folded.charAt(0) + folded.slice(1).replace(/[اوی]/g, "")).replace(/ه$/, "").replace(/(.)\1+/g, "$1");
  }
  var exact = {}, loose = {}, siteWords = null;
  function load(name, done) {
    var root = new URL(window.__md_scope || ".", location.href);
    fetch(new URL("assets/" + name, root).href).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) done(data); }).catch(function () {});
  }
  load("search-german.json", function (data) {
    Object.keys(data).forEach(function (german) {
      if (german.charAt(0) === "_") return;
      data[german].forEach(function (spelling) {
        var f = fold(spelling);
        if (!exact[f]) exact[f] = german;
        var k = skeleton(f);
        if (k.length >= 3 && !loose[k]) loose[k] = german;
      });
    });
  });
  load("search-words.json", function (data) { siteWords = new Set(data); });

  function onSite(word) { return siteWords ? siteWords.has(fold(word)) : false; }
  function lookup(word, allowLoose) {
    var f = fold(word);
    if (f.length < 3 || !/[\u0600-\u06FF]/.test(f)) return null;
    return exact[f] || (allowLoose && loose[skeleton(f)]) || null;
  }
  /* {query, changed}: the search as the site understands it. */
  function germanize(query) {
    var words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return { query: query, changed: false };
    var allOnSite = words.every(onSite);
    var whole = !onSite(words.join("")) && lookup(words.join(""), !allOnSite);
    if (whole) return { query: whole, changed: true };
    var changed = false;
    words = words.map(function (w) {
      var g = !onSite(w) && lookup(w, true);
      if (g) { changed = true; return g; }
      return w;
    });
    return { query: changed ? words.join(" ") : query, changed: changed };
  }
  window.islGermanize = germanize;

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
    var term = function (w) { return /^[\u0600-\u06FF]{1,3}$/.test(w) ? w : w + "*"; };
    if (words.length === 1) return term(words[0]) === words[0] ? "+" + words[0] : words[0];
    if (!words.length) return query;
    return words.map(function (w) { return "+" + term(w); }).join(" ");
  }
  if (window.Worker && Worker.prototype.postMessage) {
    var post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message) {
      /* type 2 = a search query from the theme (mkdocs-material 9.6) */
      if (message && message.type === 2 && typeof message.data === "string") {
        message = { type: 2, data: requireAll(germanize(message.data).query) };
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
