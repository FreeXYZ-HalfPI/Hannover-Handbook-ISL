# SPDX-License-Identifier: GPL-3.0-or-later
# Copyleft 🄯 2026 ISL and contributors
"""Build the handbook PDF from the Markdown files in handbook/.

Usage: python3 tools/build_pdf.py [OUTPUT.pdf]

Needs pandoc (>= 3.1, for GitHub alerts) and Google Chrome or Chromium.
The Vazirmatn font (https://github.com/rastikerdar/vazirmatn) should be
installed for proper Persian typesetting; otherwise the system font is used.
"""
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HANDBOOK = ROOT / "handbook"
DEFAULT_OUT = ROOT / "pdf" / "ISL-Handbook-Living-in-Hannover.pdf"

CSS = """
@page {
  size: A4; margin: 18mm 16mm 20mm 16mm;
  @bottom-center { content: counter(page, persian); font-family: 'Vazirmatn', sans-serif; font-size: 9pt; color: #6b7280; }
  @top-right { content: 'کتابچه راهنمای زندگی و تحصیل در هانوفر — انجمن دانشجویان ایرانی دانشگاه لایبنیتس هانوفر (ISL)'; font-family: 'Vazirmatn', sans-serif; font-size: 8pt; color: #9ca3af; }
}
@page cover { margin: 0; @bottom-center { content: none; } @top-right { content: none; } }
html { direction: rtl; }
body { font-family: 'Vazirmatn', 'Noto Naskh Arabic', sans-serif; font-size: 10.5pt; line-height: 1.75; color: #1f2937; margin: 0; }
section { break-before: page; }
section.sec > h1 { font-size: 24pt; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 6pt; margin-top: 40mm; }
section.root > h1 { font-size: 20pt; color: #1e3a8a; }
h1 { font-size: 17pt; font-weight: 700; color: #111827; margin: 0 0 8pt; line-height: 1.5; }
h2 { font-size: 13pt; color: #1e3a8a; margin: 14pt 0 4pt; break-after: avoid; }
h3 { font-size: 11.5pt; color: #374151; margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 3pt 0; }
ul, ol { margin: 3pt 0; padding-right: 20pt; padding-left: 0; }
ol { list-style-type: persian; }
li { margin: 2pt 0; }
li p { margin: 0; }
a { color: #1d4ed8; text-decoration: none; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 9.5pt; }
th, td { border: 1px solid #d1d5db; padding: 4pt 6pt; vertical-align: top; text-align: right; }
th { background: #eef2ff; font-weight: 700; }
tr { break-inside: avoid; }
td.nw { white-space: nowrap; direction: ltr; }
.box { border-radius: 4pt; padding: 6pt 10pt; margin: 6pt 0; border-right: 4pt solid; break-inside: avoid; }
.box.tip { background: #ecfdf5; border-color: #10b981; }
.box.note { background: #eff6ff; border-color: #3b82f6; }
.box.warning, .box.important { background: #fffbeb; border-color: #f59e0b; }
.box.caution { background: #fef2f2; border-color: #dc2626; }
.box h3 { margin: 2pt 0 3pt; font-size: 12.5pt; color: #991b1b; }
.box.warning h3 { color: #92400e; }
.box p { margin: 1pt 0; }
img { max-width: 100%; height: auto; display: block; margin: 6pt auto; }
.en-sub { display: block; font-size: 13pt; font-weight: 400; color: #4b5563; text-align: right; }
.cover { page: cover; height: 297mm; box-sizing: border-box; padding: 60mm 22mm 0; background: linear-gradient(160deg, #1e3a8a 0%, #2563eb 100%); color: #fff; }
.cover h1 { color: #fff; font-size: 30pt; line-height: 1.4; margin: 0 0 10pt; }
.cover .en { direction: ltr; text-align: right; font-size: 15pt; opacity: .9; margin-bottom: 30mm; }
.cover .org { font-size: 12pt; line-height: 1.8; }
.cover .meta { margin-top: 40mm; font-size: 10pt; opacity: .85; }
"""

COVER = """
<div class="cover">
  <h1>کتابچه راهنمای زندگی و تحصیل در هانوفر</h1>
  <div class="en">Living in Hannover — A Practical Handbook</div>
  <div class="org">برای دانشجویان دانشگاه لایبنیتس هانوفر<br>
  تهیه و تنظیم: <b>انجمن دانشجویان ایرانی دانشگاه لایبنیتس هانوفر (ISL)</b><br>
  <span dir="ltr">Iranische Studierendenvereinigung der Leibniz Universität Hannover (ISL)</span><br>
  <span dir="ltr">Iranian Student Association of Leibniz University Hannover (ISL)</span></div>
  <div class="meta">نسخه PDF — ساخته‌شده در {built}<br>
  نسخه زنده و به‌روز: github.com/FreeXYZ-HalfPI/Hannover-Handbook-ISL<br>
  این متن راهنمای عمومی است و جایگزین مشاوره حقوقی، مالیاتی یا پزشکی نیست. کپی‌لفت 🄯 ۲۰۲۶ ISL و مشارکت‌کنندگان — آزاد برای استفاده، پخش و تغییر، با همین مجوز (GNU GPL نسخه ۳ یا بالاتر).</div>
</div>
"""


def pages():
    """Root index, then each section's README followed by its numbered pages."""
    yield "root", HANDBOOK / "README.md"
    for section in sorted(p for p in HANDBOOK.iterdir() if p.is_dir() and (p / "README.md").exists()):
        yield "sec", section / "README.md"
        for page in sorted(section.glob("[0-9][0-9]-*.md")):
            yield "topic", page


def anchor(path):
    return "p-" + re.sub(r"[^a-z0-9]+", "-", str(path.relative_to(HANDBOOK)).lower()).strip("-")


def render(kind, path):
    html = subprocess.run(
        ["pandoc", "-f", "gfm+alerts", "-t", "html", "--wrap=none", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    # GitHub alerts -> coloured boxes; drop pandoc's "Tip"/"Note" title line.
    html = re.sub(r'<div class="(tip|note|warning|important|caution)">\s*<div class="title">.*?</div>',
                  r'<div class="box \1">', html, flags=re.S)
    # Links to other handbook pages become in-document anchors.
    def link(m):
        target = (path.parent / m.group(1)).resolve()
        return f'href="#{anchor(target)}"' if target.is_relative_to(HANDBOOK) and target.exists() else m.group(0)
    html = re.sub(r'href="([^":#]+\.md)"', link, html)
    # Images are referenced relative to the page; the book is assembled elsewhere.
    def img(m):
        target = (path.parent / m.group(1)).resolve()
        return f'src="{target.as_uri()}"' if target.exists() else m.group(0)
    html = re.sub(r'src="([^":#]+)"', img, html)
    html = re.sub(r"<td>(\d{4}-\d{2}-\d{2})</td>", r'<td class="nw">\1</td>', html)
    if kind == "sec":
        html = re.sub(r"<h1([^>]*)>([^<(]+)\(([^)<]+)\)", r'<h1\1>\2<br><span class="en-sub" dir="ltr">\3</span>', html, count=1)
    return f'<section class="{kind}" id="{anchor(path)}">{html}</section>'


def find_chrome():
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        if shutil.which(name):
            return name
    sys.exit("Google Chrome or Chromium is required to print the PDF.")


def main():
    out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    body = "".join(render(kind, path) for kind, path in pages())
    book = (f'<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
            f"<title>کتابچه راهنمای زندگی و تحصیل در هانوفر — ISL</title><style>{CSS}</style></head>"
            f"<body>{COVER.format(built=date.today().isoformat())}{body}</body></html>")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "book.html"
        src.write_text(book, encoding="utf-8")
        subprocess.run([find_chrome(), "--headless=new", "--disable-gpu", "--no-sandbox",
                        "--no-pdf-header-footer", "--virtual-time-budget=20000",
                        f"--print-to-pdf={out}", src.as_uri()], check=True, capture_output=True)
    print(f"wrote {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")


if __name__ == "__main__":
    main()
