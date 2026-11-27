/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyleft 🄯 2026 ISL and contributors — the search, easy to find and easy to read:
   (1) every [data-isl-search] button (home page) opens the theme's search,
   (2) a floating «جست‌وجو» button on phones and tablets,
   (3) on wide screens the header box grows in place and the results drop down
       under it (see search.css): Ctrl+K / ⌘K opens it, suggestions show before anything is typed,
       and only the few most relevant results are shown, each kept short. */
(function () {
  var SUGGESTIONS = ["بیمه درمانی", "Anmeldung", "حساب بانکی", "سیم‌کارت", "اجازه اقامت",
                     "خوابگاه", "کار دانشجویی", "Rundfunkbeitrag"];

  function input() { return document.querySelector(".md-search__input"); }

  function openSearch() {
    var toggle = document.querySelector("[data-md-toggle=search]");
    var field = input();
    if (!toggle || !field) return;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
    /* focus inside the click handler: iOS only opens the keyboard for focus that follows a tap */
    field.focus();
  }

  function runQuery(text) {
    var field = input();
    openSearch();
    field.value = text;
    field.dispatchEvent(new Event("input", { bubbles: true })); /* search-fa.js normalises and starts the search */
    field.focus();
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  /* Only the most relevant results, and each one short:
     - at most MAX_RESULTS pages; a page that matches far less well than the best one
       is dropped (but at least MIN_RESULTS stay when there are any);
     - per page: its title (without the page number) and the one part of the page that
       matches best, with a short excerpt — no folded «more on this page» list. */
  var MAX_RESULTS = 5, MIN_RESULTS = 3;

  function score(item) {
    var best = 0;
    item.querySelectorAll(".md-search-result__article").forEach(function (a) {
      best = Math.max(best, parseFloat(a.getAttribute("data-md-score")) || 0);
    });
    return best;
  }

  function stripNumber(heading) {
    if (!heading) return;
    var node = heading.firstChild;
    while (node && node.nodeType !== 3) node = node.firstChild;
    if (node) node.nodeValue = node.nodeValue.replace(/^\s*(?:[\d۰-۹]+\.|[آ-ی]{1,3}\))\s*/, "");
  }

  function tidyItem(item) {
    if (item.dataset.islTidy) return;
    item.dataset.islTidy = "1";
    var links = item.querySelectorAll(":scope > .md-search-result__link");
    var article = links[0] && links[0].querySelector(".md-search-result__article");
    if (!article) return;
    var more = item.querySelector(".md-search-result__more");
    var hasText = article.querySelector(":scope > p:not(.md-search-result__terms), :scope > ul, :scope > ol, :scope > table");
    var part = links[1] || (!hasText && more && more.querySelector(".md-search-result__link"));
    Array.prototype.slice.call(links, 1).forEach(function (a) { if (a !== part) a.remove(); });
    if (part) item.insertBefore(part, more || null);
    if (more) more.remove();
    item.querySelectorAll("h1, h2").forEach(stripNumber);
  }

  function tidyResults(list) {
    var items = list.querySelectorAll(":scope > .md-search-result__item");
    if (!items.length) return;
    var top = score(items[0]), floor = top >= 100 ? top * 0.1 : top * 0.5, shown = 0;
    items.forEach(function (item) {
      if (shown >= MAX_RESULTS || (shown >= MIN_RESULTS && score(item) < floor)) { item.remove(); return; }
      tidyItem(item);
      shown++;
    });
    var meta = document.querySelector(".md-search-result__meta");
    if (meta) meta.textContent = shown === 1 ? "مرتبط‌ترین نتیجه" : shown + " نتیجه مرتبط";
  }

  function buildPanel() {
    var result = document.querySelector(".md-search-result");
    var output = document.querySelector(".md-search__output");
    var form = document.querySelector(".md-search__form");
    if (!result || !output || !form || document.querySelector(".isl-suggest")) return;

    input().setAttribute("placeholder", "جست‌وجو در کتابچه…");

    var kbd = el("kbd", "isl-kbd", /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K");
    kbd.setAttribute("aria-hidden", "true");
    form.appendChild(kbd);

    /* Before anything is typed: a few common searches and the search across both handbooks. */
    var box = el("div", "isl-suggest");
    box.appendChild(el("p", "isl-suggest__title", "جست‌وجوهای پرکاربرد"));
    var chips = el("div", "isl-suggest__chips");
    SUGGESTIONS.forEach(function (text) {
      var b = el("button", "isl-suggest__chip", text);
      b.type = "button";
      b.addEventListener("click", function () { runQuery(text); });
      chips.appendChild(b);
    });
    box.appendChild(chips);
    var more = el("p", "isl-suggest__more");
    var a = el("a", null, "جست‌وجوی هم‌زمان در کتابچه فارسی و انگلیسی ←");
    a.href = new URL("searcher/", new URL(window.__md_scope || ".", location.href)).href;
    more.appendChild(a);
    box.appendChild(more);
    /* Outside .md-search-result: the theme's arrow keys move through every link in there. */
    result.parentNode.insertBefore(box, result);

    /* Keyboard help under the results (wide screens only, see site.css). */
    var keys = el("div", "isl-keys");
    keys.setAttribute("aria-hidden", "true");
    keys.innerHTML = "<span><kbd>↵</kbd> باز کردن</span><span><kbd>↑</kbd><kbd>↓</kbd> جابه‌جایی</span><span><kbd>Esc</kbd> بستن</span>";
    output.appendChild(keys);

    var list = document.querySelector(".md-search-result__list");
    if (list) new MutationObserver(function () { tidyResults(list); }).observe(list, { childList: true });
  }

  function init() {
    if (!input()) return;
    document.querySelectorAll("[data-isl-search]").forEach(function (b) {
      b.addEventListener("click", openSearch);
    });
    buildPanel();
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.code === "KeyK" || e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openSearch();
      }
    });
    if (document.querySelector(".isl-fab")) return;
    var fab = el("button", "isl-fab");
    fab.type = "button";
    fab.setAttribute("aria-label", "جست‌وجو در کتابچه");
    fab.innerHTML = '<span aria-hidden="true">🔍</span><span class="isl-fab__text">جست‌وجو</span>';
    fab.addEventListener("click", openSearch);
    document.body.appendChild(fab);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
