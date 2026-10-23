# Hannover Handbook — ISL

**کتابچه راهنمای زندگی و تحصیل در هانوفر** · *Living in Hannover — A Practical Handbook*

A practical, step-by-step handbook in Persian for (Iranian) students of Leibniz University Hannover (LUH): from applying while still in Iran, to arriving in Hannover, studying, working, and staying after graduation. Maintained by the **Iranian Students Association of Leibniz University Hannover (ISL)** and open to everyone's contributions.

📖 **Start reading:** [handbook/README.md](handbook/README.md) · 📄 **PDF:** [pdf/ISL-Handbook-Living-in-Hannover.pdf](pdf/ISL-Handbook-Living-in-Hannover.pdf)

---

<div dir="rtl">

## این کتابچه چیست؟

راهنمایی عملی و مرحله‌به‌مرحله برای دانشجویان دانشگاه لایبنیتس هانوفر، به‌ویژه دانشجویان ایرانی. هر موضوع یک صفحه دارد و همه صفحه‌ها قالب ثابتی دارند: هدف، مخاطب، مراحل انجام کار، مدارک و هزینه‌ها (الزامی یا احتمالی)، نهاد مسئول، منابع رسمی با **تاریخ دسترسی** و نتیجه بررسی هر پیوند، و تجربه دانشجویان.

| بخش | صفحه‌ها |
|---|---|
| [۱ — ورود به هانوفر و کارهای اولیه](handbook/01-arriving-in-hannover/README.md) | ۱–۱۱ |
| [۲ — شروع تحصیل در دانشگاه لایبنیتس](handbook/02-starting-your-studies/README.md) | ۱۲–۲۰ |
| [۳ — خدمات و نهادهای دانشگاه](handbook/03-university-services/README.md) | ۲۱–۲۹ |
| [۴ — زندگی روزمره در هانوفر](handbook/04-everyday-life/README.md) | ۳۰–۳۹ |
| [۵ — کار، امور مالی و آینده شغلی](handbook/05-work-finance-career/README.md) | ۴۰–۴۷ |
| [۶ — جامعه دانشجویی و مشارکت اجتماعی](handbook/06-student-community/README.md) | ۴۸–۵۲ |
| [۷ — منابع و پیوست‌ها](handbook/07-resources/README.md) | ۵۳–۵۷ |

## مشارکت

همه می‌توانند کمک کنند: اصلاح یک عدد یا مهلت، گزارش پیوند خراب، افزودن تجربه شخصی یا نوشتن صفحه تازه. راهنمای کامل در [CONTRIBUTING.md](CONTRIBUTING.md) آمده است. قاعده اصلی: **هر ادعا باید منبع رسمی داشته باشد و هر منبع تاریخ دسترسی.**

</div>

> [!WARNING]
> این کتابچه راهنمایی عمومی است و جایگزین مشاوره حقوقی، مالیاتی یا پزشکی نیست. ملاک نهایی همیشه اطلاعات نهاد رسمی مسئول است. · This handbook is general guidance, not legal, tax or medical advice.

---

## Repository layout

| Path | Content |
|---|---|
| `handbook/` | The handbook: one Markdown file per topic, one folder per section |
| `pdf/` | The printable PDF, built from `handbook/` |
| `tools/build_pdf.py` | Builds the PDF (needs pandoc ≥ 3.1 and Chrome/Chromium; Vazirmatn font recommended) |
| `tools/check_links.sh` | Checks every external link in `handbook/` and reports its HTTP status |
| `tools/confluence_to_markdown.py` | One-off importer used to move the handbook from Confluence |
| `TEMPLATE.md` | Template for new pages |

```bash
python3 tools/build_pdf.py
bash tools/check_links.sh
```

## License

Copyright © 2026 Iranian Students Association of Leibniz University Hannover (ISL) and contributors.

This handbook is free: you can redistribute it and/or modify it under the terms of the **GNU General Public License, version 3** or (at your option) any later version — see [LICENSE](LICENSE). Every copy or adaptation must stay under the same license (copyleft). Facts and links come from the official sources cited on each page; those sources keep their own terms.
