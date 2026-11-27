# SPDX-License-Identifier: GPL-3.0-or-later
# Copyleft 🄯 2026 ISL and contributors
"""MkDocs hook (runs after tools/mkdocs_hooks.py) for the site search:
- drops text that every page repeats (disclaimer, footer, comment box) from the search
  index, so a search for «تجربه» or «GitHub» finds real content;
- makes people findable by name in Persian too: names on the site are written in Latin
  letters (Dr. Pegah Heidari), so the Persian spelling from tools/people-fa.json is added
  next to each one in the index, and assets/search-people.json lists every person with
  role, phone and link, for the results list (assets/ui.js);
- writes assets/search-words.json (every Persian word on the site) and
  assets/search-german-auto.json (every German word on the site, how often it appears,
  and its spelling in Persian letters), and assets/search-guess.json (the words a reader
  may be on the way to while typing), for assets/search-fa.js."""
import html as htmllib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CHUNK = re.compile(r"<(p|ol|ul)>.*?</\1>", re.S)
PAGE_NOISE = [
    re.compile(r"^\s*⚠️ این کتابچه فقط راهنما.*?(?=<p>|$)", re.S),   # disclaimer summary line
    re.compile(r"<p>تاریخ آخرین بررسی:.*?</p>", re.S),               # per-page dates
    re.compile(r"در این صفحه\s*<ol>.*?</ol>", re.S),                  # the page's own table of contents
]
COMMON = 8       # a paragraph or list found on this many pages or more is boilerplate
COMMON_NOTE = 5  # a paragraph repeated this often is a standard note (e.g. the medical disclaimer)


def strip_boilerplate(docs):
    pages = {}
    for doc in docs:
        for chunk in {m.group(0) for m in CHUNK.finditer(doc["text"])}:
            pages.setdefault(chunk, set()).add(doc["location"].split("#")[0])
    common = {chunk for chunk, where in pages.items()
              if len(where) >= COMMON or (len(where) >= COMMON_NOTE and chunk.startswith("<p>"))}
    for doc in docs:
        text = doc["text"]
        for pattern in PAGE_NOISE:
            text = pattern.sub(" ", text)
        text = CHUNK.sub(lambda m: " " if m.group(0) in common else m.group(0), text)
        doc["text"] = re.sub(r"\s{2,}", " ", text).strip()


PEOPLE_FA = {k: v for k, v in json.loads((ROOT / "tools" / "people-fa.json").read_text(encoding="utf-8")).items()
             if not k.startswith("_")}
_people = {}
HEADING = re.compile(r'<h[23] id="([^"]+)"')
TAGS = re.compile(r"<[^>]+>")


def _text(fragment):
    return re.sub(r"\s+", " ", htmllib.unescape(TAGS.sub(" ", fragment))).strip()


ADDRESS = re.compile(r"[A-ZÄÖÜ][^،·,;()\d]*?\s\d+[a-zA-Z]?(?:[–/-]\d+[a-z]?)?,\s*\d{5}\s+[A-ZÄÖÜ][\wäöüß]+(?:\s(?:am\s|an der\s|im\s)?[A-ZÄÖÜ][\wäöüß]+)*")


def _person(html, pos, latin):
    """Role, phone and street address of the person named at `pos`: from their table row,
    or from the list item or paragraph that names them."""
    role = phone = address = ""
    row_start = html.rfind("<tr>", 0, pos)
    if row_start > html.rfind("</tr>", 0, pos):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", html[row_start:html.find("</tr>", pos)], re.S)
        table = html.rfind("<table>", 0, pos)
        heads = [_text(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", html[table:row_start], re.S)]
        col = dict(zip(heads, [_text(c) for c in cells]))
        names = [n.strip() for n in col.get("نام", "").split("·")]
        nth = next((i for i, n in enumerate(names) if latin in n), 0)
        phones = [p.strip() for p in col.get("تلفن", "").split("·")]
        phone = phones[min(nth, len(phones) - 1)] if phones else ""
        role = col.get("تخصص", "")
        addresses = ADDRESS.findall(col.get("نشانی", ""))
        address = addresses[min(nth, len(addresses) - 1)] if addresses else ""
        if not role:
            before = html[max(html.rfind("</h", 0, table), 0):table]
            bold = re.findall(r"<strong>(.*?)</strong>", before, re.S)
            role = re.sub(r"\s*\(.*?\)", "", _text(bold[-1])) if bold else ""
    else:
        start = max(html.rfind("<li", 0, pos), html.rfind("<p", 0, pos))
        end = html.find("</li>" if html.startswith("<li", start) else "</p>", pos)
        piece = html[start:end]
        bold = re.findall(r"<strong>(.*?)</strong>", piece, re.S)
        role = _text(bold[0]).rstrip(":：") if bold else ""
        found = re.search(r"\+?\d[\d ]{6,}\d", _text(piece[piece.find(latin):]) if latin in piece else "")
        phone = found.group(0) if found else ""
        place = ADDRESS.search(_text(piece))
        address = place.group(0) if place else ""
    return role, phone, address


def on_page_content(html, page, **kwargs):
    for latin, fa in PEOPLE_FA.items():
        pos = html.find(latin)
        if pos < 0 or latin in _people:
            continue
        doctor = html[max(0, pos - 4):pos] == "Dr. "
        role, phone, address = _person(html, pos, latin)
        anchors = HEADING.findall(html, 0, pos)
        _people[latin] = {
            "latin": ("Dr. " if doctor else "") + latin,
            "fa": ("دکتر " if doctor else "") + fa,
            "role": role, "phone": phone, "address": address,
            "url": page.url + ("#" + anchors[-1] if anchors else ""),
        }
    return html


def add_persian_names(docs):
    for doc in docs:
        for latin, person in _people.items():
            if latin in doc["text"]:
                doc["text"] = doc["text"].replace(latin, latin + " (" + person["fa"] + ")")


FOLD = str.maketrans({"آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ؤ": "و", "ئ": "ی", "ي": "ی", "ك": "ک", "ة": "ه",
                      "ث": "س", "ص": "س", "ذ": "ز", "ض": "ز", "ظ": "ز", "ط": "ت", "ق": "غ", "ح": "ه"})


def fold(word):
    """Same as fold() in assets/search-fa.js: letters that sound alike become one."""
    return re.sub(r"[\u064b-\u0652\u0670\u200c\s]", "", word).translate(FOLD)


def site_words(docs):
    """Every Persian word on the site (folded): a word the reader types that is on the
    site is searched as it is, never read as a German word in Persian letters."""
    words = set()
    for doc in docs:
        for token in re.split(r"[\s\-\u200c]+", TAGS.sub(" ", doc["title"] + " " + doc["text"])):
            token = re.sub(r"[^\u0600-\u06FF]", "", token)
            if len(token) >= 2:
                words.add(fold(token))
    return sorted(words)



# -- German words in Persian letters, found on the site by themselves ------------------
# assets/search-german.json is the hand-written list (colloquial forms such as «ملده»).
# Every other German word in the handbook gets a Persian spelling here, so a reader who
# types «کوندیگونگ» or «اشپرکونتو» finds Kündigung or Sperrkonto without anyone listing it.
# German letters → Persian, longest first. Vowels inside a word are mostly left out in
# Persian writing; the search folds vowels away anyway (skeleton() in search-fa.js).
RULES = [
    ("tsch", "چ"), ("sch", "ش"), ("chs", "کس"), ("ch", "ش"), ("ck", "ک"), ("ph", "ف"), ("th", "ت"),
    ("qu", "کو"), ("tz", "تس"), ("ng", "نگ"), ("nk", "نک"),
    ("ei", "ای"), ("ai", "ای"), ("ey", "ای"), ("eu", "وی"), ("äu", "وی"), ("ie", "ی"), ("au", "او"),
    ("ä", ""), ("ö", "و"), ("ü", "و"), ("ß", "س"),
    ("a", "ا"), ("e", ""), ("i", "ی"), ("o", "و"), ("u", "و"), ("y", "ی"),
    ("b", "ب"), ("c", "ک"), ("d", "د"), ("f", "ف"), ("g", "گ"), ("h", "ه"), ("j", "ی"), ("k", "ک"),
    ("l", "ل"), ("m", "م"), ("n", "ن"), ("p", "پ"), ("r", "ر"), ("s", "س"), ("t", "ت"), ("v", "ف"),
    ("w", "و"), ("x", "کس"), ("z", "تس"),
]
VOWELS = "aeiouäöüy"
START = {"a": "آ", "e": "ا", "i": "ای", "o": "او", "u": "او", "ä": "ا", "ö": "او", "ü": "او",
         "ei": "ای", "ai": "آی", "eu": "اوی", "au": "آو", "ie": "ای"}


def to_persian(word):
    """«Meldebescheinigung» → «ملدبشاینیگونگ», «Krankenkasse» → «کرانکنکاسه»: how a
    German word is usually written in Persian letters (one likely spelling)."""
    w = word.lower()
    w = re.sub(r"(.)\1+", r"\1", w)                    # doubled letters are said once
    out, i = "", 0
    if w.startswith(("st", "sp")):                    # «Steuer» → «اشتویر»
        out, i = "اش", 1
    elif w[0] in VOWELS:
        for v in sorted(START, key=len, reverse=True):
            if w.startswith(v):
                out, i = START[v], len(v)
                break
    while i < len(w):
        rest = w[i:]
        if rest[0] == "h" and i and w[i - 1] in VOWELS:   # «Bahn»: the h only lengthens the vowel
            i += 1
            continue
        if rest.startswith("ch") and i and w[i - 1] in "aou":
            out += "خ"; i += 2; continue                   # «Verbraucher», «Buch»: ch after a, o, u
        if rest[0] == "s" and len(rest) > 1 and rest[1] in VOWELS and (i == 0 or w[i - 1] in VOWELS + "lnr"):
            out += "ز"; i += 1; continue                   # «Sonne», «Versicherung»: s before a vowel sounds like z
        if rest == "e":
            out += "ه"; break                               # final e
        for g, p in RULES:
            if rest.startswith(g):
                out += p; i += len(g)
                break
        else:
            i += 1                                          # anything else (digits, -) is dropped
    return out



LATIN_WORD = re.compile(r"[A-Za-zÄÖÜäöüß]{4,}")


def german_words(docs):
    """[[word, times on the site, Persian spelling], ...], most frequent first."""
    counts, forms = {}, {}
    for doc in docs:
        text = re.sub(r"https?://\S+|\S+@\S+", " ", TAGS.sub(" ", doc["title"] + " " + doc["text"]))
        for word in LATIN_WORD.findall(text):
            key = word.lower()
            counts[key] = counts.get(key, 0) + 1
            forms.setdefault(key, {}).setdefault(word, 0)
            forms[key][word] += 1
    out = []
    for key, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        spelling = to_persian(key)
        if len(spelling) >= 3:
            out.append([max(forms[key], key=forms[key].get), n, spelling])
    return out



# -- Guesses for an unfinished word ------------------------------------------------------
# «کر» → «کرانک» (Krank), «بی» → «بیمه», «پارت» → «پارتنر» (searched as «همسر»): every word a
# reader may be on the way to, with what to search for it and how much the site has on it.
# Sources: the needs in assets/search-intents.json (with their English and colloquial
# words), the hand-written German list, the words of page titles and the German words of
# the site. Written to assets/search-guess.json as [key, shown, search, weight, kind]:
# kind w = search the word itself, g = a German word, c = the need's own search.
STOP = set("""و در از به با برای که این آن یا تا را های ها هم بر پس قبل بعد اول دوم سوم کردن شدن کنید کند شود
بخش صفحه نکات نکته چطور چه کجا کی آیا همه هر یک دو سه چند بین روی زیر درباره""".split())
PERSIAN = re.compile(r"[\u0600-\u06FF]")


def guesses(docs, config):
    pages = {}
    for doc in docs:
        pages.setdefault(doc["location"].split("#")[0], []).append(TAGS.sub(" ", doc["title"] + " " + doc["text"]))
    texts = [" ".join(t) for t in pages.values()]
    lower = [t.lower() for t in texts]
    folded = [fold(t) for t in texts]
    tokens = [set(fold(w) for w in re.split(r"[^\u0600-\u06FF]+", t) if w) for t in texts]
    latin = [set(re.findall(r"[a-zäöüß]+", t)) for t in lower]

    def pages_with(term, whole=False):
        if PERSIAN.search(term):
            f = fold(term)
            return sum(1 for i in range(len(texts)) if (f in tokens[i] if whole else f in folded[i]))
        t = term.lower()
        return sum(1 for i in range(len(texts)) if (t in latin[i] if whole else t in lower[i]))

    def key(word):
        return fold(word) if PERSIAN.search(word) else word.lower()

    out = []
    docs_dir = Path(config["docs_dir"]) / "assets"
    intents = json.loads((docs_dir / "search-intents.json").read_text(encoding="utf-8"))["intents"]
    for need in intents:
        search = need.get("search")
        weight = 1000 + pages_with(search) if search else 1000
        for word in need["words"]:
            on_site = pages_with(word, whole=" " not in word) > 0
            if on_site and not PERSIAN.search(word):
                continue                      # German on the site: the search finds it as it is
            if on_site or not search:
                out.append([key(word), word, word, weight, "w"])
            else:
                out.append([key(word), search, search, weight, "c"])
    german = json.loads((docs_dir / "search-german.json").read_text(encoding="utf-8"))
    for word, spellings in german.items():
        if word.startswith("_"):
            continue
        weight = 1000 + pages_with(word)      # «Krank» counts Krankenkasse, Krankschreibung...
        for spelling in spellings:
            out.append([key(spelling), spelling, word, weight, "g"])
    seen = set()
    for page in docs:
        if "#" in page["location"]:
            continue
        for word in re.split(r"[^\u0600-\u06FF]+", htmllib.unescape(page["title"])):
            if len(word) >= 3 and word not in STOP and word not in seen:
                seen.add(word)
                out.append([key(word), word, word, pages_with(word, whole=True), "w"])
    for word, times, spelling in german_words(docs):
        out.append([key(spelling), word, word, pages_with(word), "g"])
    out.sort(key=lambda row: -row[3])
    keep, keys = [], set()
    for row in out:
        if row[0] and row[0] not in keys:
            keys.add(row[0])
            keep.append(row)
    return keep


def on_post_build(config, **kwargs):
    missing = [latin for latin in PEOPLE_FA if latin not in _people]
    if missing:
        print("INFO    -  search: names in tools/people-fa.json not found on the site: " + ", ".join(missing))
    people = Path(config["site_dir"]) / "assets" / "search-people.json"
    people.write_text(json.dumps(list(_people.values()), ensure_ascii=False, indent=1), encoding="utf-8")
    index = Path(config["site_dir"]) / "search" / "search_index.json"
    if not index.exists():
        return
    data = json.loads(index.read_text(encoding="utf-8"))
    strip_boilerplate(data["docs"])
    add_persian_names(data["docs"])
    titles = {doc["location"]: doc["title"] for doc in data["docs"] if "#" not in doc["location"]}
    (Path(config["site_dir"]) / "assets" / "search-pages.json").write_text(
        json.dumps(titles, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    vocab = Path(config["site_dir"]) / "assets" / "search-words.json"
    vocab.write_text(json.dumps(site_words(data["docs"]), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (Path(config["site_dir"]) / "assets" / "search-guess.json").write_text(
        json.dumps(guesses(data["docs"], config), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (Path(config["site_dir"]) / "assets" / "search-german-auto.json").write_text(
        json.dumps(german_words(data["docs"]), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # ASCII-escaped like the search plugin writes it: servers that omit the charset still decode it.
    index.write_text(json.dumps(data, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
