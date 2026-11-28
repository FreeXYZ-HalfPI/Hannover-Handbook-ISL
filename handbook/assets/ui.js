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

  /* Persian digits, except inside a Latin name or code («S5», «B1», «AufenthG §16b»: the
     number belongs to the name) */
  function faDigits(text) {
    return String(text).replace(/[A-Za-zÄÖÜäöüß]*\d+[A-Za-zÄÖÜäöüß]*/g, function (run) {
      return /[A-Za-zÄÖÜäöüß]/.test(run) ? run : run.replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; });
    });
  }

  function siteRoot() { return new URL(window.__md_scope || ".", location.href); }

  var intents = [];    /* what people usually look for with a word, and the pages that answer it (search-intents.json) */
  var pageTitles = {}; /* page → title (built by tools/search_hooks.py) */
  var people = [];     /* everyone named on the site, with Persian name, role and phone (built by tools/search_hooks.py) */

  function loadSummaries() {
    fetch(new URL("assets/search-summaries.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { summaries = data; })
      .catch(function () {});
    fetch(new URL("assets/search-intents.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { intents = data.intents || []; })
      .catch(function () {});
    fetch(new URL("assets/search-pages.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { pageTitles = data; })
      .catch(function () {});
    loadTables();
    fetch(new URL("assets/search-specialties.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { specialties = data.specialties || []; })
      .catch(function () {});
    fetch(new URL("assets/search-people.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) { people = data; })
      .catch(function () {});
  }

  /* People whose name (Persian or Latin) contains every searched word; titles such as
     «دکتر» or «Dr.» in the search are ignored. */
  var TITLES = /^(?:دکتر|دکتر|آقای|خانم|dr\.?|prof\.?|frau|herr)$/i;

  /* The search matches a name when it is the start of the name or of one of its parts,
     with or without spaces: «حیدری», «پگاه حیدری», «برمکی پور» and «برمکیپور» do;
     «ترمین» does not match «دکتر مینا». */
  /* A name is matched from the start of one of its words, never from inside one: «دوست» is
     not «پورایران‌دوست». One word that is also an ordinary word of the site («دوست», «Iran»)
     is that word, not a person: with a title («دکتر دوست») or more of the name it matches. */
  function matchPeople(query) {
    var typed = queryWords(query), names = typed.filter(function (w) { return !TITLES.test(w); });
    var wanted = squash(names.join("")), alone = names.length === 1 && typed.length === 1;
    if (wanted.length < 3) return [];
    return people.filter(function (p) {
      var common = p.common || [];
      return [p.fa, p.latin].some(function (name) {
        /* inside a word («دوست» of «پورایران‌دوست») only with a title or more of the name */
        var parts = name.split(alone ? /[\s\-]+/ : /[\s\-\u200c]+/).filter(function (w) { return w && !TITLES.test(w); }).map(squash);
        return parts.some(function (part, i) {
          if (alone && common.some(function (c) { return squash(c).indexOf(wanted) === 0 && part.indexOf(squash(c)) === 0; })) return false;
          return parts.slice(i).join("").indexOf(wanted) === 0;
        });
      });
    });
  }

  /* Doctors for an illness or a part of the body (search-specialties.json): «کمردرد» →
     orthopaedists, «بارداری» → gynaecologists. Up to three, in the order the handbook lists them. */
  var specialties = [];
  /* Table rows as lines (search-tables.json). */
  var tables = null, tablesAsked = false;
  function loadTables() {
    if (tablesAsked) return;
    tablesAsked = true;
    fetch(new URL("assets/search-tables.json", siteRoot()).href)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { tables = data; })
      .catch(function () {});
  }
  function matchDoctors(typed, query) {
    /* «پا» on the way to «پاسپورت» is no foot: a short word counts only when nothing longer was guessed */
    var wanted = [squash(query)], roles = [];
    if (squash(typed).length >= 3 || squash(typed) === squash(query)) wanted.push(squash(typed));
    specialties.forEach(function (sp) {
      if (sp.words.some(function (w) { return wanted.indexOf(squash(w)) >= 0; })) roles.push(squash(sp.role));
    });
    if (!roles.length) return [];
    return people.filter(function (p) {
      var role = squash(p.role || "");
      return roles.some(function (r) { return role.indexOf(r) === 0; });
    }).slice(0, 3);
  }

  var ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1z"/></svg>';
  var ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5"/></svg>';

  /* A person: name and role link to their entry in the handbook; the phone number calls
     them, and «نقشه» opens their address in Google Maps. */
  function personItem(person, persian) {
    var item = el("li", "md-search-result__item");
    item.dataset.islTidy = "1";
    item.dataset.islPerson = "1";
    item.dataset.islScore = "1e9";
    var box = el("div", "isl-hit isl-person");
    var link = el("a", "md-search-result__link isl-person__main");
    link.href = new URL(person.url, siteRoot()).href;
    link.tabIndex = -1;
    var text = el("span", "isl-hit__text");
    text.appendChild(el("span", "isl-hit__title", persian ? person.fa : person.latin));
    if (person.role) text.appendChild(el("span", "isl-hit__summary", faDigits(person.role)));
    link.appendChild(text);
    box.appendChild(link);
    var actions = el("span", "isl-person__actions");
    if (person.phone) {
      var call = el("a", "isl-action");
      call.href = "tel:" + person.phone.replace(/[^\d+]/g, "").replace(/^0/, "+49");
      call.tabIndex = -1;
      call.setAttribute("aria-label", "تماس با " + person.fa);
      call.innerHTML = ICON_PHONE;
      call.appendChild(el("bdi", null, faDigits(person.phone)));
      actions.appendChild(call);
    }
    if (person.address) {
      var map = el("a", "isl-action");
      map.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(person.address);
      map.target = "_blank";
      map.rel = "noopener";
      map.tabIndex = -1;
      map.setAttribute("aria-label", "نشانی " + person.fa + " روی نقشه");
      map.innerHTML = ICON_PIN;
      map.appendChild(el("span", null, "نشانی روی نقشه"));
      actions.appendChild(map);
    }
    if (actions.childNodes.length) box.appendChild(actions);
    item.appendChild(box);
    return item;
  }

  /* Matching people go first in the list, once per search: people by name, else the
     doctors for the illness searched. */
  function addPeople(list, query, searched) {
    if (list.dataset.islPeople === query && list.querySelector("[data-isl-person]")) return [];
    list.dataset.islPeople = query;
    var found = matchPeople(query).slice(0, 3), persian = PERSIAN.test(query);
    var doctors = !found.length;
    if (doctors) found = matchDoctors(query, searched || query);
    found.slice().reverse().forEach(function (person) {
      var item = personItem(person, persian);
      if (doctors) item.dataset.islDoctor = "1";
      list.insertBefore(item, list.firstChild);
    });
    return found;
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

  function queryWords(query) {
    return query.replace(/\u200c/g, " ").trim().split(/\s+/).filter(Boolean);
  }

  function containsQuery(text, query) {
    var t = squash(text);
    return queryWords(query).every(function (w) { return t.indexOf(squash(w)) >= 0; });
  }

  /* The searched word as a whole word of the text, not the start of a longer one: «سلام»
     is not in «سلامت». (A suffix after a zero-width non-joiner, «سلام‌ها», still counts.) */
  function hasWhole(text, word) {
    var esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    /* plural endings keep the word («همکاران», «سلام‌ها»); «ی» or «ت» make another one («همکاری», «سلامت») */
    return new RegExp("(?:^|[^A-Za-zÄÖÜäöüß\\u0600-\\u06FF])" + esc + "(?:ان|ها|های|هایی)?(?![A-Za-zÄÖÜäöüß\\u0600-\\u06FF])", "i").test(text);
  }
  /* The reader typed one complete word: results must have that word itself. */
  var wholeWord = null;

  /* Every searched word at the start of a word of the text: «ir» is not found inside
     «Universität», «کارت» is found in «سیم‌کارت». */
  function startsWords(text, query) {
    return queryWords(query).every(function (w) {
      var esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("(?:^|[^A-Za-zÄÖÜäöüß\\u0600-\\u06FF])" + esc, "i").test(text);
    });
  }

  /* For Persian searches: «شماره مالیاتی — Steuer-ID و عوارض (Rundfunkbeitrag)» →
     «شماره مالیاتی و عوارض». Latin words inside a sentence (M10) stay: without them
     the sentence would not read. */
  function withoutLatin(text) {
    return text
      .replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, "")
      .replace(/\s*[—–:]\s*[A-Za-z][\w\-.'’&\/]*(?:[\s,–—-]+[A-Za-z0-9][\w\-.'’&\/]*)*(?=\s*(?:[—–:،؛.]|$| و ))/g, "")
      .replace(/\s+([،؛:.!؟])/g, "$1").replace(/^[\s—–:،]+|[\s—–:،]+$/g, "").replace(/\s{2,}/g, " ");
  }

  /* About 140 characters around position `at`, cut at word boundaries. */
  function around(text, at) {
    var start = Math.max(0, at - 60), end = Math.min(text.length, start + 140);
    if (start > 0) start = text.indexOf(" ", start) + 1;
    if (end < text.length) end = text.lastIndexOf(" ", end);
    return (start > 0 ? "… " : "") + text.slice(start, end).trim() + (end < text.length ? " …" : "");
  }

  /* The shortest piece of the page (a paragraph, list item or table cell) that contains
     the searched words, cut down to the sentence around them. */
  /* Links and e-mail addresses are no text to read: «Termin» inside
     «Terminvergabe@hannover-stadt.de» says nothing about Termin. */
  function withoutAddresses(text) {
    return text.replace(/\S+@\S+|https?:\/\/\S+|www\.\S+|\b[\w.-]+\.(?:de|com|org|net|eu|info)\b\S*/gi, " ")
      .replace(/\(\s*\)|\s+(?=[،؛.:)])/g, "").replace(/\s{2,}/g, " ").trim();
  }
  /* Mostly Persian: at least 60 % of the letters (for a reader who typed in Persian). */
  function mostlyPersian(text) {
    var fa = (text.match(/[\u0600-\u06FF]/g) || []).length, latin = (text.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
    return fa > 0 && fa >= 0.6 * (fa + latin);
  }

  /* A line to read: no emoji or check marks (✅, ⚠️ are the page's own markers), and a
     sentence cut at «؛» or «:» ends with a full stop, not with a sign that says more follows. */
  var PICTURES = /[\u2139\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3030\u303D\u3297\u3299\uFE0F\u200D\u20E3]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g;
  try { PICTURES = new RegExp("\\p{Extended_Pictographic}|[\\uFE0F\\u200D\\u20E3]", "gu"); } catch (e) { /* older browsers: the ranges above */ }
  function readable(text) {
    return text.replace(PICTURES, "")
      .replace(/\(\s*\)|\[\s*\]|«\s*»/g, "")   /* «مهلت‌های قرمز (🔴)» leaves «()» */
      .replace(/\s{2,}/g, " ").replace(/\s+([.،؛:!؟])/g, "$1").trim().replace(/\s*[؛;:،,]$/, ".");
  }

  /* Most of the line's own words are already in the title: «معرفی Iranian Student Association
     …، انجمن دانشجویان ایرانی دانشگاه لایبنیتس هانوفر، و این‌که چطور با آن …» under the title
     «انجمن دانشجویان ایرانی دانشگاه لایبنیتس هانوفر» says nothing new. */
  var SMALL = /^(?:و|با|از|به|در|که|را|این|آن|اینکه|چطور|چه|برای|یا|تا|هم|می|است|هست|شما|ها|های|یک)$/;
  function repeatsTitle(line, title, query) {
    var own = function (text) {
      return text.replace(/[A-Za-zÄÖÜäöüß0-9]+/g, " ").replace(/\u200c/g, "").split(/[^\u0600-\u06FF]+/)
        .filter(function (w) { return w && !SMALL.test(w); });
    };
    var titleWords = own(title), searched = own(query);
    var words = own(line).filter(function (w) { return searched.indexOf(w) < 0; });
    if (words.length < 3) return false;
    var same = words.filter(function (w) { return titleWords.indexOf(w) >= 0; }).length;
    return same >= 0.6 * words.length;
  }

  function sentenceWith(item, best, query, persian, reader, title) {
    var words = queryWords(query).map(function (w) { return w.toLowerCase(); });
    var phrase = query.replace(/\s+/g, " ").trim().toLowerCase();
    var articles = [best.querySelector("article")];
    item.querySelectorAll("article").forEach(function (a) { if (articles.indexOf(a) < 0) articles.push(a); });
    /* first a sentence with the whole word, then one with a longer word that starts with it */
    for (var pass = 0; pass < (wholeWord ? 2 : 1); pass++)
    for (var i = 0; i < articles.length; i++) {
      var pieces = articles[i].querySelectorAll("p, li, td");
      for (var j = 0; j < pieces.length; j++) {
        if (pieces[j].classList.contains("md-search-result__terms") || pieces[j].querySelector("li, p")) continue;
        var raw = withoutAddresses(pieces[j].textContent.replace(/\s+/g, " ").trim());
        if (!containsQuery(raw, query)) continue;
        if (persian) raw = withoutLatin(raw);
        var sentences = raw.split(/(?<=[.!?؟؛])\s+/);
        var hit = sentences.filter(function (x) { return containsQuery(x, query); })[0] || raw;
        hit = hit.replace(/^\s*(?:\[\s?\]|[\d۰-۹]+[.)]|[آ-ی]{1,3}\))\s*/, "").replace(/\s*←.*$/, "").trim();
        hit = readable(hit);
        if (squash(hit).length < squash(query).length + 8) continue;  /* just the word itself says nothing */
        if (hit.length > 150) hit = around(hit, hit.toLowerCase().indexOf(words[0]));
        /* Checked on what is shown (the cut piece, not the whole sentence): a line that is
           mostly German or English does not help, whatever the reader typed in (the handbook
           is read in Persian), nor one that gives the page's name or repeats its title. */
        if (!mostlyPersian(hit) || /^(?:…\s*)?نام رسمی/.test(hit) || !startsWords(hit, query) || repeatsTitle(hit, title || "", query)) continue;
        if (wholeWord && pass === 0 && !hasWhole(hit, wholeWord)) continue;
        return el("span", "isl-hit__summary isl-hit__context", hit);
      }
    }
    /* A row of a table on the page: «کارگاه دوچرخه — مبلغ (یورو): ۱٫۱۱» */
    var page = new URL(best.getAttribute("href"), location.href).pathname.slice(siteRoot().pathname.length);
    var rows = (tables && tables[page]) || [];
    for (var t = 0; t < rows.length; t++) {
      var row = readable(withoutAddresses(rows[t]));
      if (!containsQuery(row, query) || !startsWords(row, query)) continue;
      if (row.length > 150) row = around(row, row.toLowerCase().indexOf(words[0]));
      if (!mostlyPersian(row) || repeatsTitle(row, title || "", query)) continue;
      return el("span", "isl-hit__summary isl-hit__context", row);
    }
    /* Nothing to quote: the page's own description. */
    for (var k = 0; k < articles.length; k++) {
      if (containsQuery(articles[k].textContent, query)) return "covers";
    }
    return null;
  }

  function tidyItem(item, query, typed, changed) {
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
    var persian = PERSIAN.test(typed), title = cleanTitle(h1.textContent, persian);
    var text = el("span", "isl-hit__text");
    text.appendChild(el("span", "isl-hit__title", faDigits(title)));
    /* The line under the title: the hand-written description when the title itself shows
       what was searched; otherwise the sentence from the page that contains the word, so
       every result visibly answers the search. */
    var key = new URL(page.getAttribute("href"), location.href).pathname.slice(siteRoot().pathname.length);
    /* A German word typed in Persian letters stays visible in Latin letters in the sentence. */
    var context = containsQuery(title, query) ? null : sentenceWith(item, best, query, persian && !changed, persian, h1.textContent);
    if (context === "covers" && summaries[key]) {
      /* No note about the search itself («… هم در این صفحه آمده است»): the reader wants to
         know what the page says, not how it was found. */
      text.appendChild(el("span", "isl-hit__summary", faDigits(summaries[key])));
    } else if (context && context !== "covers") { context.textContent = faDigits(context.textContent); text.appendChild(context); }
    else if (summaries[key]) text.appendChild(el("span", "isl-hit__summary", summaries[key]));
    link.appendChild(text);
    item.textContent = "";
    item.appendChild(link);
  }

  /* For a query of several words, pages that contain the words together as one phrase
     («سیم‌کارت», «سیم کارت» or «سیمکارت») come before pages that only contain them apart. */
  function squash(text) { return text.replace(/[\s\u200c]+/g, "").toLowerCase(); }

  /* «سلام» typed: pages with the word itself come first, pages with only longer words that
     start with it («سلامت», or «هواپیما» for «هوا») after them. Nothing is dropped: the reader
     may still be typing the longer word. */
  function wholeFirst(items, word) {
    if (!word || items.length < 2) return items;
    var whole = [], longer = [];
    items.forEach(function (item) {
      if (item.dataset.islTidy) { whole.push(item); return; }
      var key = new URL(item.querySelector("a").getAttribute("href"), location.href).pathname.slice(siteRoot().pathname.length);
      var text = Array.prototype.map.call(item.querySelectorAll("article"), function (a) { return a.textContent; }).join(" ") +
        " " + ((tables && tables[key]) || []).join(" ");
      (hasWhole(text, word) ? whole : longer).push(item);
    });
    if (!whole.length || !longer.length) return items;
    var order = whole.concat(longer), list = items[0].parentNode;
    order.forEach(function (item, i) {
      if (list.children[i] !== item) list.insertBefore(item, list.children[i] || null);
    });
    return order;
  }

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

  /* The need behind a search: «کرانک» (Krank) or «مریض» → the pages a sick person needs,
     in the order they need them, each with a line written for that need. */
  function matchIntent(typed, query) {
    var a = squash(typed), b = squash(query);
    if (!a) return null;
    /* what was typed first («پارتنر» is a need of its own), then what is searched for it («همسر») */
    for (var i = 0; i < intents.length; i++) {
      if (intents[i].words.some(function (w) { return squash(w) === a; })) return intents[i];
    }
    for (var n = 0; n < intents.length; n++) {
      if (intents[n].words.some(function (w) { return squash(w) === b; })) return intents[n];
    }
    /* still typing: «مری» is on its way to «مریض» */
    if (a.length < 3 || !window.islStartOfSiteWord || !window.islStartOfSiteWord(typed.trim())) return null;
    for (var j = 0; j < intents.length; j++) {
      if (intents[j].words.some(function (w) { return squash(w).indexOf(a) === 0; })) return intents[j];
    }
    return null;
  }

  function intentItem(result, persian, rank) {
    var item = el("li", "md-search-result__item");
    item.dataset.islTidy = "1";
    item.dataset.islIntent = "1";
    item.dataset.islScore = String(1e9 - rank);
    var link = el("a", "md-search-result__link isl-hit");
    link.href = new URL(result[0], siteRoot()).href;
    link.tabIndex = -1;
    var text = el("span", "isl-hit__text");
    text.appendChild(el("span", "isl-hit__title", faDigits(cleanTitle(pageTitles[result[0]] || "", persian))));
    text.appendChild(el("span", "isl-hit__summary", faDigits(result[1])));
    link.appendChild(text);
    item.appendChild(link);
    return item;
  }

  function addIntent(list, typed, query) {
    if (list.dataset.islIntentFor === typed && list.querySelector(":scope > [data-isl-intent]")) return null;
    list.dataset.islIntentFor = typed;
    var intent = matchIntent(typed, query);
    if (!intent) return null;
    var after = list.querySelectorAll(":scope > [data-isl-person]");
    var anchor = after.length ? after[after.length - 1].nextSibling : list.firstChild;
    intent.results.forEach(function (result, i) {
      list.insertBefore(intentItem(result, PERSIAN.test(typed), i), anchor);
    });
    return intent;
  }

  /* The word is on the page only in a link to another page («← ۳۰. حمل‌ونقل عمومی،
     Deutschlandticket و دوچرخه» on the AStA page): the page itself says nothing about it. */
  function onlyInLinks(item, query) {
    var all = "", own = "";
    item.querySelectorAll("article").forEach(function (a) {
      all += " " + a.textContent;
      var copy = a.cloneNode(true);
      copy.querySelectorAll("p, li, td").forEach(function (e) {
        if (!e.querySelector("p, li") && e.textContent.indexOf("←") >= 0) e.textContent = e.textContent.split("←")[0];
      });
      own += " " + copy.textContent.replace(/←[^←]*$/, "");
    });
    return containsQuery(all, query) && !containsQuery(own, query);
  }

  function tidyResults(list) {
    var typed = (input().value || "").trim();
    var german = window.islGermanize ? window.islGermanize(typed) : { query: typed, changed: false };
    var query = german.query;
    var found = addPeople(list, typed, query);
    addIntent(list, typed, query);
    /* doctors for an illness come after the best answer for the need (e.g. the free
       counselling of the university for «سلامت روان») */
    var firstNeed = list.querySelector(":scope > [data-isl-intent]");
    if (firstNeed && firstNeed.previousElementSibling && firstNeed.previousElementSibling.dataset.islDoctor) {
      var after = firstNeed.nextSibling;
      list.querySelectorAll(":scope > [data-isl-doctor]").forEach(function (d) { list.insertBefore(d, after); });
    }
    /* doctors and the rows for the need together stay within the five results */
    var chosenRows = list.querySelectorAll(":scope > [data-isl-person], :scope > [data-isl-intent]");
    var needRows = list.querySelectorAll(":scope > [data-isl-intent]");
    for (var extra = chosenRows.length - MAX_RESULTS, r = needRows.length - 1; extra > 0 && r >= 2; extra--, r--) needRows[r].remove();
    var items = list.querySelectorAll(":scope > .md-search-result__item");
    if (!items.length) return;
    /* Pages already shown for a person or for the need behind the search are not repeated. */
    var taken = found.map(function (p) { return new URL(p.url, siteRoot()).pathname; });
    list.querySelectorAll(":scope > [data-isl-intent] .md-search-result__link").forEach(function (a) {
      taken.push(new URL(a.getAttribute("href"), location.href).pathname);
    });
    if (taken.length) items.forEach(function (item) {
      var link = item.querySelector(".md-search-result__link");
      if (item.dataset.islPerson || item.dataset.islIntent || !link) return;
      var path = new URL(link.getAttribute("href"), location.href).pathname;
      if (taken.indexOf(path) >= 0) item.remove();
    });
    /* The home page is only a table of contents: it is no answer when there are others. */
    items = list.querySelectorAll(":scope > .md-search-result__item");
    if (items.length > 1) items.forEach(function (item) {
      var link = item.querySelector(".md-search-result__link");
      if (link && !item.dataset.islPerson && !item.dataset.islIntent &&
          new URL(link.getAttribute("href"), location.href).pathname === new URL(".", siteRoot()).pathname) item.remove();
    });
    /* «سلام» typed in full: a page that only has «سلامت» is no answer */
    wholeWord = (!german.changed && queryWords(typed).length === 1 && PERSIAN.test(typed) && squash(typed).length >= 3 &&
      window.islIsWord && window.islIsWord(typed)) ? typed.trim() : null;
    items = list.querySelectorAll(":scope > .md-search-result__item");
    if (items.length > 1) items.forEach(function (item) {
      if (!item.dataset.islTidy && onlyInLinks(item, query)) item.remove();
    });
    loadTables();
    items = list.querySelectorAll(":scope > .md-search-result__item");
    items = phraseFirst(Array.prototype.slice.call(items), query);
    items = wholeFirst(items, wholeWord);
    var first = items.filter(function (item) { return !item.dataset.islPerson && !item.dataset.islIntent; })[0];
    var top = first ? score(first) : 0, floor = top >= 100 ? top * 0.1 : top * 0.5, shown = 0;
    items.forEach(function (item) {
      if (item.dataset.islTidy) { shown++; return; }
      var chosen = item.dataset.islPerson || item.dataset.islIntent;
      if (shown >= MAX_RESULTS || (!chosen && shown >= MIN_RESULTS && score(item) < floor)) { item.remove(); return; }
      tidyItem(item, query, typed, german.changed);
      shown++;
    });
    var meta = document.querySelector(".md-search-result__meta");
    if (!shown) return;
    var label = shown === 1 ? "مرتبط‌ترین نتیجه" : faDigits(shown) + " نتیجه مرتبط";
    /* the word the search took the letters for: «کر» → «۵ نتیجه مرتبط برای «کرانک»» */
    /* (not a Latin word for a reader who typed in Persian: «کالج» needs no «Studienkolleg») */
    if (german.shown && squash(german.shown) !== squash(typed) && (PERSIAN.test(german.shown) || !PERSIAN.test(typed)))
      label += " برای «" + german.shown + "»";
    if (meta && meta.textContent !== label) meta.textContent = label;
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

    /* A sense of the search at work: while the reader types, a thin moving bar and three
       shimmering placeholder rows with «در حال جست‌وجو…»; shortly after the last key the
       results come in one after another (search.css). */
    var loading = el("div", "isl-loading");
    loading.setAttribute("role", "status");
    loading.appendChild(el("p", "isl-loading__label", "در حال جست‌وجو"));
    for (var r = 0; r < 3; r++) {
      var row = el("div", "isl-loading__row");
      row.appendChild(el("span", "isl-loading__line"));
      row.appendChild(el("span", "isl-loading__line isl-loading__line--short"));
      loading.appendChild(row);
    }
    result.parentNode.insertBefore(loading, result);
    var wrap = result.closest(".md-search__inner") || document.body, timer = null;
    /* Typing: the results follow every letter at once, so the reader sees where the word is
       going before it is finished (no wait, nothing that flickers). A whole phrase put in at
       once (a suggestion clicked, text pasted, a word filled in by the keyboard) gets the
       short wait and the results come in one by one. */
    input().addEventListener("input", function (event) {
      clearTimeout(timer); timer = null;
      wrap.classList.remove("isl-searching", "isl-reveal");
      var whole = !event.inputType || /FromPaste|FromDrop|Replacement|FromYank/.test(event.inputType);
      if (!input().value.trim() || !whole) return;
      wrap.classList.add("isl-searching");
      timer = setTimeout(function () {
        timer = null;
        wrap.classList.remove("isl-searching");
        void wrap.offsetWidth;  /* restart the reveal animation */
        wrap.classList.add("isl-reveal");
      }, 1100);
    });

    var list = document.querySelector(".md-search-result__list");
    if (list) new MutationObserver(function () { tidyResults(list); }).observe(list, { childList: true });
    /* When the search itself finds nothing, the list does not change, but the line above it does. */
    var meta = document.querySelector(".md-search-result__meta");
    if (list && meta) new MutationObserver(function () { tidyResults(list); }).observe(meta, { childList: true, characterData: true, subtree: true });
  }

  /* Closing: mark the moment for half a second, so search.css can fold the results up and
     turn the box back softly (the closed state alone can not tell "just closed" from "closed
     when the page loaded"). */
  function softClose() {
    var toggle = document.querySelector("[data-md-toggle=search]");
    if (!toggle) return;
    var timer = null;
    toggle.addEventListener("change", function () {
      clearTimeout(timer);
      if (toggle.checked) { document.body.classList.remove("isl-closing"); return; }
      document.body.classList.add("isl-closing");
      timer = setTimeout(function () { document.body.classList.remove("isl-closing"); }, 520);
    });
  }

  function init() {
    if (!input()) return;
    softClose();
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
