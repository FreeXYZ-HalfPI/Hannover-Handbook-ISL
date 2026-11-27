/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyleft 🄯 2026 ISL and contributors — the search, easy to find and easy to read:
   (1) every [data-isl-search] button (home page) opens the theme's search,
   (2) a floating «جست‌وجو» button on phones and tablets,
   (3) on wide screens the header box grows in place and the results drop down
       under it (see search.css): Ctrl+K / ⌘K opens it (no visible hint), five suggestions show before anything is typed,
       and only the few most relevant results are shown, each kept short. */
(function () {
  var SUGGESTIONS = ["بیمه درمانی", "Anmeldung", "حساب بانکی", "سیم‌کارت", "اجازه اقامت"];

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
     - each result is a title and a one-line description of the page (written by hand
       in search-summaries.json, not the page's first sentence); it links to the part
       of the page that matches best;
     - a Persian search shows Persian titles only: «ثبت محل سکونت — Anmeldung /
       Bürgeramt» becomes «ثبت محل سکونت». */
  var MAX_RESULTS = 5, MIN_RESULTS = 3;
  var summaries = {};  /* page → one-line description, written by hand in search-summaries.json */

  function siteRoot() { return new URL(window.__md_scope || ".", location.href); }

  function loadSummaries() {
    fetch(new URL("assets/search-summaries.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { summaries = data; })
      .catch(function () {});
  }
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
    text = text.replace(/\s+/g, " ").trim()
      .replace(/^(?:[\d۰-۹]+\.|[آ-ی]{1,3}\)|بخش\s*[\d۰-۹]+\s*[—–-])\s*/, "");
    if (!persianOnly) return text;
    var parts = text.replace(/\([^)]*\)/g, "").split(/\s+[—–\/]\s+|\s*:\s+/);
    for (var i = 0; i < parts.length; i++) if (PERSIAN.test(parts[i])) return parts[i].trim();
    return text;
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
    var text = el("span", "isl-hit__text");
    text.appendChild(el("span", "isl-hit__title", cleanTitle(h1.textContent, PERSIAN.test(query))));
    var key = new URL(page.getAttribute("href"), location.href).pathname.slice(siteRoot().pathname.length);
    if (summaries[key]) text.appendChild(el("span", "isl-hit__summary", summaries[key]));
    link.appendChild(text);
    item.textContent = "";
    item.appendChild(link);
  }

  /* For a query of several words, pages that contain the words together as one phrase
     («سیم‌کارت», «سیم کارت» or «سیمکارت») come before pages that only contain them apart. */
  function squash(text) { return text.replace(/[\s\u200c]+/g, "").toLowerCase(); }

  function phraseFirst(items, query) {
    var words = query.replace(/\u200c/g, " ").trim().split(/\s+/);
    if (words.length < 2) return items;
    var phrase = squash(query), together = [], apart = [];
    items.forEach(function (item) {
      if (item.dataset.islTidy) together.push(item);
      else (squash(item.textContent).indexOf(phrase) >= 0 ? together : apart).push(item);
    });
    /* Change the list only when needed: every change runs this observer again. */
    if (together.length && apart.length) apart.forEach(function (item) { item.remove(); });
    var keep = together.length ? together : apart, list = items[0].parentNode;
    keep.forEach(function (item, i) {
      if (list.children[i] !== item) list.insertBefore(item, list.children[i] || null);
    });
    return keep;
  }

  function tidyResults(list) {
    var items = list.querySelectorAll(":scope > .md-search-result__item");
    if (!items.length) return;
    var query = (input().value || "").trim();
    items = phraseFirst(Array.prototype.slice.call(items), query);
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
    a.href = new URL("searcher/", siteRoot()).href;
    more.appendChild(a);
    box.appendChild(more);
    /* Outside .md-search-result: the theme's arrow keys move through every link in there. */
    result.parentNode.insertBefore(box, result);

    var list = document.querySelector(".md-search-result__list");
    if (list) new MutationObserver(function () { tidyResults(list); }).observe(list, { childList: true });
  }

  function init() {
    if (!input()) return;
    document.querySelectorAll("[data-isl-search]").forEach(function (b) {
      b.addEventListener("click", openSearch);
    });
    buildPanel();
    loadSummaries();
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
