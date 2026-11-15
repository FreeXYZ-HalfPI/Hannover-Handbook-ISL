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
  /* Capture phase: runs before the theme's own input handler reads the value. */
  document.addEventListener("input", function (event) {
    var field = event.target;
    if (!field || !field.classList || !field.classList.contains("md-search__input")) return;
    var before = field.value, after = normalise(before);
    if (after === before) return;
    var caret = field.selectionStart;
    field.value = after;
    if (caret !== null && caret !== undefined) {
      var pos = Math.max(0, caret - (before.length - after.length));
      field.setSelectionRange(pos, pos);
    }
    /* The theme reads the box on keyup; tell it the text changed. */
    field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }, true);
})();
