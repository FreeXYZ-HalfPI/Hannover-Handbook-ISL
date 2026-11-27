# SPDX-License-Identifier: GPL-3.0-or-later
# Copyleft 🄯 2026 ISL and contributors
"""MkDocs hook (runs after tools/mkdocs_hooks.py) for the site search:
- drops text that every page repeats (disclaimer, footer, comment box) from the search
  index, so a search for «تجربه» or «GitHub» finds real content;
- makes people findable by name in Persian too: names on the site are written in Latin
  letters (Dr. Pegah Heidari), so the Persian spelling from tools/people-fa.json is added
  next to each one in the index, and assets/search-people.json lists every person with
  role, phone and link, for the results list (assets/ui.js)."""
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
    # ASCII-escaped like the search plugin writes it: servers that omit the charset still decode it.
    index.write_text(json.dumps(data, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
