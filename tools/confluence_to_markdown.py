"""Convert a Confluence export (isl-handbook-export-*.html) into the handbook/ Markdown tree.

Usage: python3 tools/confluence_to_markdown.py EXPORT.html

The export is the single HTML file produced from the Confluence space: one
<section data-kind="root|sec|topic" id="pID"> per page, internal links as
href="#pID" and info boxes as <div data-box="tip|info|note">.
"""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "handbook"

SECTIONS = [
    "01-arriving-in-hannover",
    "02-starting-your-studies",
    "03-university-services",
    "04-everyday-life",
    "05-work-finance-career",
    "06-student-community",
    "07-resources",
]

SLUGS = {
    1: "application-uni-assist", 2: "before-arrival-visa", 3: "arrival-transport", 4: "housing",
    5: "anmeldung", 6: "bank-account", 7: "health-insurance", 8: "sim-internet",
    9: "tax-id-broadcasting-fee", 10: "residence-permit", 11: "family-reunification",
    12: "admission-enrolment", 13: "semester-fee-leibnizcard", 14: "campus-buildings", 15: "faculties",
    16: "study-structure", 17: "online-systems", 18: "exams", 19: "leave-change-withdrawal",
    20: "fachschaft", 21: "servicecenter", 22: "international-office", 23: "studentenwerk", 24: "asta",
    25: "zqs", 26: "language-centre", 27: "chancenvielfalt", 28: "mensa", 29: "counselling",
    30: "public-transport", 31: "shopping", 32: "contracts", 33: "doctor-pharmacy", 34: "sports-culture",
    35: "learning-german", 36: "waste-house-rules", 37: "emergency", 38: "driving-licence",
    39: "travel-schengen", 40: "student-jobs", 41: "job-search-cv", 42: "tax-payslip",
    43: "scholarships", 44: "starting-business", 45: "career-service", 46: "after-graduation",
    47: "leaving-germany", 48: "isl", 49: "international-groups", 50: "volunteering",
    51: "events-networking", 52: "student-representation", 53: "glossary", 54: "checklist",
    55: "contacts", 56: "faq", 57: "contribute-experiences",
}

ALERT = {"tip": "TIP", "info": "NOTE", "note": "WARNING", "warning": "WARNING"}
FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

# Confluence-only wording that does not apply on GitHub.
REPLACEMENTS = [
    ("یا به‌صورت نظر (comment) زیر همین صفحه بنویسید", "یا از طریق یک Issue در GitHub بفرستید"),
    ("زیر همین صفحه نظر (comment) بگذارید", "یک Issue در GitHub باز کنید"),
    ("زیر همین صفحه یا در بخش", "در یک Issue یا Pull Request در GitHub، یا در بخش"),
]


def fa_to_int(s):
    return int("".join(str(FA_DIGITS.index(c)) for c in s))


def page_path(kind, title, section_no):
    if kind == "root":
        return OUT / "README.md"
    if kind == "sec":
        return OUT / SECTIONS[section_no - 1] / "README.md"
    n = fa_to_int(re.match(r"([۰-۹]+)\.", title).group(1))
    return OUT / SECTIONS[section_no - 1] / f"{n:02d}-{SLUGS[n]}.md"


def to_markdown(html):
    html = re.sub(
        r'<div data-box="(\w+)">',
        lambda m: f"<blockquote><p>[!{ALERT.get(m.group(1), 'NOTE')}]</p>",
        html,
    )
    html = re.sub(r"</div>", "</blockquote>", html)
    # Confluence puts the header row inside <tbody>; give pandoc a real <thead>.
    html = re.sub(
        r"<table>\s*<tbody>\s*(<tr>(?:(?!</tr>).)*?<th>.*?</tr>)",
        r"<table><thead>\1</thead><tbody>",
        html,
        flags=re.S,
    )
    md = subprocess.run(
        ["pandoc", "-f", "html", "-t", "gfm+alerts", "--wrap=none"],
        input=html, capture_output=True, text=True, check=True,
    ).stdout
    md = re.sub(r"\\\[!(TIP|NOTE|WARNING)\\\]", r"[!\1]", md)
    md = re.sub(r"> \[!(TIP|NOTE|WARNING)\]\n>\n?", r"> [!\1]\n", md)
    for old, new in REPLACEMENTS:
        md = md.replace(old, new)
    return md.strip() + "\n"


def main(export):
    text = Path(export).read_text(encoding="utf-8")
    sections = re.findall(
        r'<section data-kind="(\w+)" id="p(\d+)"><h1 class="ptitle">(.*?)</h1>\n(.*?)\n</section>',
        text, flags=re.S,
    )
    paths, section_no = {}, 0
    for kind, pid, title, _ in sections:
        if kind == "sec":
            section_no += 1
        paths[pid] = page_path(kind, title, section_no)

    for kind, pid, title, html in sections:
        dest = paths[pid]
        md = f"# {title}\n\n" + to_markdown(html)

        def rel(m):
            target = paths.get(m.group(1))
            return "(" + os.path.relpath(target, dest.parent) + ")" if target else m.group(0)

        md = re.sub(r"\(#p(\d+)\)", rel, md)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(md, encoding="utf-8")
    print(f"wrote {len(sections)} pages to {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main(sys.argv[1])
