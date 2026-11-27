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
  /* Compound words and phrases. The index splits words on spaces and on the
     zero-width non-joiner, so «سیم‌کارت» is two words, «سیم» and «کارت», and the theme
     shows every page that has just one of them (e.g. «کارت دانشجویی»). When the reader
     types more than one word, every word must be on the page: «سیم کارت» becomes
     «+سیم* +کارت*» on its way to the search worker (ui.js then puts pages with the
     whole phrase first). One word is searched as before. */
  function requireAll(query) {
    var words = query.replace(/\u200c/g, " ").trim().split(/\s+/).filter(function (w) {
      /* titles before a name («دکتر حیدری») are not needed to find it */
      return /[\w\u0600-\u06FF]/.test(w) && !/^(?:دکتر|آقای|خانم|dr\.?|prof\.?|frau|herr)$/i.test(w);
    });
    if (words.length === 1) return words[0];
    if (words.length < 2 || /["+\-~^:*]/.test(query)) return query;
    return words.map(function (w) { return "+" + w + "*"; }).join(" ");
  }
  if (window.Worker && Worker.prototype.postMessage) {
    var post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message) {
      /* type 2 = a search query from the theme (mkdocs-material 9.6) */
      if (message && message.type === 2 && typeof message.data === "string") {
        message = { type: 2, data: requireAll(message.data) };
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
