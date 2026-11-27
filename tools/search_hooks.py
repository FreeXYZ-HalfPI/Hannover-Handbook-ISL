# SPDX-License-Identifier: GPL-3.0-or-later
# Copyleft 🄯 2026 ISL and contributors
"""MkDocs hook (runs after tools/mkdocs_hooks.py): drop text that every page repeats
(disclaimer, footer, comment box) from the site search index, so a search for
«تجربه» or «GitHub» finds real content and the result snippets show the page itself
instead of the disclaimer."""
import json
import re
from pathlib import Path

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


def on_post_build(config, **kwargs):
    index = Path(config["site_dir"]) / "search" / "search_index.json"
    if not index.exists():
        return
    data = json.loads(index.read_text(encoding="utf-8"))
    strip_boilerplate(data["docs"])
    # ASCII-escaped like the search plugin writes it: servers that omit the charset still decode it.
    index.write_text(json.dumps(data, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
