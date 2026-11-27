/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyleft 🄯 2026 ISL and contributors — the search, easy to find and easy to read:
   (1) every [data-isl-search] button (home page) opens the theme's search,
   (2) a floating «جست‌وجو» button on phones and tablets,
   (3) on wide screens the search opens as a panel in the middle of the page (see
       site.css): Ctrl+K / ⌘K opens it, suggestions show before anything is typed,
       and every result says which part of the handbook it comes from. */
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

  /* Folder of a page («01-arriving-in-hannover») → the part's title in the side navigation. */
  function sectionNames() {
    var names = {}, root = new URL(window.__md_scope || ".", location.href);
    document.querySelectorAll(".md-nav--primary a.md-nav__link[href]").forEach(function (a) {
      var path = new URL(a.getAttribute("href"), location.href).pathname;
      if (path.indexOf(root.pathname) !== 0) return;
      var m = /^(\d\d-[^/]+)\/$/.exec(path.slice(root.pathname.length));
      var label = a.textContent.replace(/\s+/g, " ").trim();
      if (m && label && !names[m[1]]) names[m[1]] = label.replace(/^بخش\s*\S+\s*[—–-]\s*/, "");
    });
    return { root: root, names: names };
  }

  function labelResults(list, sections) {
    list.querySelectorAll(".md-search-result__item").forEach(function (item) {
      if (item.querySelector(".isl-crumb")) return;
      var link = item.querySelector(".md-search-result__link");
      var article = item.querySelector(".md-search-result__article");
      if (!link || !article) return;
      var path = new URL(link.getAttribute("href"), location.href).pathname.slice(sections.root.pathname.length);
      var name = sections.names[path.split("/")[0]];
      if (!name) return;
      var crumb = el("span", "isl-crumb", name);
      article.insertBefore(crumb, article.querySelector("h1") || article.firstChild);
    });
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
    var sections = sectionNames();
    if (list) new MutationObserver(function () { labelResults(list, sections); }).observe(list, { childList: true });
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
