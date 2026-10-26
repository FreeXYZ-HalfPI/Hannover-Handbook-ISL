# Hannover Handbook — ISL

**کتابچه راهنمای زندگی و تحصیل در هانوفر** · *Living in Hannover — A Practical Handbook*

A practical, step-by-step handbook in Persian for (Iranian) students of Leibniz University Hannover (LUH): from applying while still in Iran, to arriving in Hannover, studying, working, and staying after graduation. Prepared and maintained by the **Iranian Student Association of Leibniz University Hannover (ISL)** — *Iranische Studierendenvereinigung der Leibniz Universität Hannover (ISL)* — and open to everyone's contributions.

📖 **Start reading:** [handbook/README.md](handbook/README.md) · 📥 **Download the whole handbook as one PDF:** [ISL-Handbook-Living-in-Hannover.pdf](https://github.com/FreeXYZ-HalfPI/Hannover-Handbook-ISL/raw/main/pdf/ISL-Handbook-Living-in-Hannover.pdf) · 🤝 **How to contribute (step by step):** [GitHub guide](handbook/07-resources/64-github-guide.md) · 🔎 **Search both handbooks (Persian + English):** [search/index.html](search/index.html) (download the repository and open it in your browser) or `python3 tools/search.py your words`

---

<div dir="rtl">

## این کتابچه چیست؟

> تهیه و تنظیم: **انجمن دانشجویان ایرانی دانشگاه لایبنیتس هانوفر (ISL)** · *Iranische Studierendenvereinigung der Leibniz Universität Hannover (ISL)*

راهنمایی عملی و قدم‌به‌قدم که دانشجوهای دانشگاه لایبنیتس هانوفر برای دانشجوهای تازه‌وارد، به‌ویژه دانشجویان ایرانی، نوشته‌اند. هر موضوع یک صفحه دارد و همه صفحه‌ها قالب ثابتی دارند: هدف، مخاطب، مراحل انجام کار، مدارک و هزینه‌ها (الزامی یا احتمالی)، نهاد مسئول، منابع رسمی با **تاریخ دسترسی** و نتیجه بررسی هر پیوند، و تجربه دانشجویان.

| بخش | صفحه‌ها |
|---|---|
| [۱ — ورود به هانوفر و کارهای اولیه](handbook/01-arriving-in-hannover/README.md) | ۱–۱۱ |
| [۲ — شروع تحصیل در دانشگاه لایبنیتس](handbook/02-starting-your-studies/README.md) | ۱۲–۲۰ |
| [۳ — خدمات و نهادهای دانشگاه](handbook/03-university-services/README.md) | ۲۱–۲۹ |
| [۴ — زندگی روزمره در هانوفر](handbook/04-everyday-life/README.md) | ۳۰–۳۹ |
| [۵ — کار، امور مالی و آینده شغلی](handbook/05-work-finance-career/README.md) | ۴۰–۴۷ |
| [۶ — جامعه دانشجویی و مشارکت اجتماعی](handbook/06-student-community/README.md) | ۴۸–۵۲ |
| [۷ — منابع و پیوست‌ها](handbook/07-resources/README.md) | ۵۳–۶۴ |
| [۸ — انجمن و اساسنامه](handbook/08-association/README.md) | ۶۵ |
| [۹ — دریافت کتابچه (PDF)](handbook/09-download/README.md) | ۶۶ |

## مشارکت

همه می‌توانند کمک کنند: اصلاح یک عدد یا مهلت، گزارش پیوند خراب، افزودن تجربه شخصی یا نوشتن صفحه تازه. اگر تا حالا با GitHub کار نکرده‌اید، [راهنمای قدم‌به‌قدم با شکل](handbook/07-resources/64-github-guide.md) را ببینید؛ قواعد نگارش در [CONTRIBUTING.md](CONTRIBUTING.md) آمده است. قاعده اصلی: **هر ادعا باید منبع رسمی داشته باشد و هر منبع تاریخ دسترسی.**

</div>

> [!WARNING]
> این کتابچه راهنمایی عمومی است و جایگزین مشاوره حقوقی، مالیاتی یا پزشکی نیست. ملاک نهایی همیشه اطلاعات نهاد رسمی مسئول است. · This handbook is general guidance, not legal, tax or medical advice.

---

## Repository layout

| Path | Content |
|---|---|
| `handbook/` | The handbook: one Markdown file per topic, one folder per section |
| `pdf/` | The printable PDF, built from `handbook/` |
| `handbook/images/` | Diagrams used in the handbook (SVG) |
| `tools/build_pdf.py` | Builds the PDF (needs pandoc ≥ 3.1 and Chrome/Chromium; Vazirmatn font recommended) |
| `tools/check_links.sh` | Checks every external link in `handbook/` and reports its HTTP status |
| `tools/confluence_to_markdown.py` | One-off importer used to move the handbook from Confluence |
| `search/index.html` | **Handbook Searcher** — searches both handbooks (English and Persian) in your browser, offline; open the file or serve the folder |
| `tools/build_search.py` | Rebuilds `search/search-index.js` from both handbooks (the sibling repository is included when it is checked out next to this one) |
| `tools/search.py` | The same search in the terminal: `python3 tools/search.py residence permit` |
| `TEMPLATE.md` | Template for new pages |

```bash
python3 tools/build_pdf.py
bash tools/check_links.sh
python3 tools/build_search.py
```

## License

Copyright © 2026 Iranian Student Association of Leibniz University Hannover (ISL) — Iranische Studierendenvereinigung der Leibniz Universität Hannover (ISL) — and contributors.

This handbook is free: you can redistribute it and/or modify it under the terms of the **GNU General Public License, version 3** or (at your option) any later version — see [LICENSE](LICENSE). Every copy or adaptation must stay under the same license (copyleft). Facts and links come from the official sources cited on each page; those sources keep their own terms.
