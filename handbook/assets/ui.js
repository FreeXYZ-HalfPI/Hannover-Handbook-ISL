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

  /* Results are a short, plain list of titles to click:
     - at most MAX_RESULTS; a page that matches far less well than the best one is
       dropped (but at least MIN_RESULTS stay when there are any);
     - each result is just a title (no page number, excerpt or «more on this page»);
       it links to the part of the page that matches best;
     - a Persian search shows Persian titles only: «ثبت محل سکونت — Anmeldung /
       Bürgeramt» becomes «ثبت محل سکونت». */
  var MAX_RESULTS = 5, MIN_RESULTS = 3;
  var PERSIAN = /[\u0600-\u06FF]/;

  function score(item) {
    if (item.dataset.islScore) return parseFloat(item.dataset.islScore);
    var best = 0;
    item.querySelectorAll(".md-search-result__article").forEach(function (a) {
      best = Math.max(best, parseFloat(a.getAttribute("data-md-score")) || 0);
    });
    return best;
  }

  function cleanTitle(text, persianOnly) {
    text = text.replace(/\s+/g, " ").trim().replace(/^(?:[\d۰-۹]+\.|[آ-ی]{1,3}\))\s*/, "");
    if (!persianOnly) return text;
    var parts = text.replace(/\([^)]*\)/g, "").split(/\s+[—–\/]\s+|\s*:\s+/);
    for (var i = 0; i < parts.length; i++) if (PERSIAN.test(parts[i])) return parts[i].trim();
    return text;
  }

  function highlight(node, text, words) {
    var re = words.length && new RegExp("(" + words.map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")", "gi");
    (re ? text.split(re) : [text]).forEach(function (piece, i) {
      node.appendChild(i % 2 ? el("mark", null, piece) : document.createTextNode(piece));
    });
  }

  function tidyItem(item, query) {
    if (item.dataset.islTidy) return;
    item.dataset.islTidy = "1";
    item.dataset.islScore = String(score(item));
    var page = item.querySelector(".md-search-result__link");
    var h1 = page && page.querySelector("h1");
    if (!h1) return;
    var pageHit = parseFloat(page.querySelector("article").getAttribute("data-md-score")) || 0, best = page, bestHit = pageHit;
    item.querySelectorAll(".md-search-result__link").forEach(function (a) {
      var hit = parseFloat(a.querySelector("article").getAttribute("data-md-score")) || 0;
      if (hit > bestHit) { best = a; bestHit = hit; }
    });
    var link = el("a", "md-search-result__link isl-hit");
    link.href = best.getAttribute("href");
    link.tabIndex = -1;
    var title = el("span", "isl-hit__title");
    highlight(title, cleanTitle(h1.textContent, PERSIAN.test(query)), query.split(/\s+/).filter(Boolean));
    link.appendChild(title);
    link.appendChild(el("span", "isl-hit__go", "←"));
    item.textContent = "";
    item.appendChild(link);
  }

  function tidyResults(list) {
    var items = list.querySelectorAll(":scope > .md-search-result__item");
    if (!items.length) return;
    var query = (input().value || "").trim();
    var top = score(items[0]), floor = top >= 100 ? top * 0.1 : top * 0.5, shown = 0;
    items.forEach(function (item) {
      if (item.dataset.islTidy) { shown++; return; }
      if (shown >= MAX_RESULTS || (shown >= MIN_RESULTS && score(item) < floor)) { item.remove(); return; }
      tidyItem(item, query);
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
