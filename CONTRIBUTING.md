# Contributing · راهنمای مشارکت

Thank you for helping new students in Hannover! Short version in English, full rules in Persian below.

- **Small fix** (a number, a deadline, a broken link): open the page on GitHub, click ✏️ *Edit*, and propose the change as a pull request. Add the official source and today's access date.
- **Not sure / no time to edit?** Open an [issue](../../issues/new/choose) and describe the problem.
- **New page:** copy [TEMPLATE.md](TEMPLATE.md) into the right section folder and add it to that section's `README.md` and to [handbook/README.md](handbook/README.md).

---

<div dir="rtl">

## قواعد نگارش

1. **قالب ثابت:** هر صفحه موضوعی همین بخش‌ها را دارد: ۱. هدف · ۲. چه کسی به آن نیاز دارد؟ · ۳. مراحل انجام کار · ۴. مدارک و هزینه‌ها (با ستون الزامی یا احتمالی) · ۵. نهاد مسئول (نام رسمی، نشانی، راه تماس) · ۶. منابع و پیوندهای رسمی · ۷. تجربه دانشجویان (غیررسمی). نمونه: [TEMPLATE.md](TEMPLATE.md).
2. **منبع برای هر ادعا:** هر عدد، مهلت، هزینه یا قاعده باید کنار خودش پیوند منبع داشته باشد. اولویت منابع:
   - دانشگاه لایبنیتس هانوفر — [uni-hannover.de](https://www.uni-hannover.de/)
   - شهر و منطقه هانوفر — [hannover.de](https://www.hannover.de/) و hannover.gov.de
   - متن قانون — [gesetze-im-internet.de](https://www.gesetze-im-internet.de/aktuell.html)
   - پورتال رسمی دولت آلمان — [make-it-in-germany.com](https://www.make-it-in-germany.com/en/)
   - نهاد مسئول (Studentenwerk، AStA، BZSt، سفارت آلمان و …)
   - منابع دیگر فقط با برچسب «منبع غیررسمی».
3. **تاریخ دسترسی:** هر منبع در جدول بخش ۶ صفحه با «تاریخ دسترسی» (به شکل `YYYY-MM-DD`) و «نتیجه بررسی» ثبت می‌شود: `✅ باز شد` یا `❌ ...` با توضیح. اگر پیوندی را بررسی کردید، تاریخ آن را به‌روز کنید.
4. **نشانه‌ها:** ⚠️ یعنی اطلاعات نیازمند تأیید یا تکمیل است؛ ℹ️ یعنی نکته عمومی. هشدارهای مهم (مثلاً «مشاوره حقوقی نیست») در کادر `> [!WARNING]` و تاریخ بررسی در کادر `> [!TIP]` بالای صفحه می‌آیند.
5. **تجربه شخصی** را از اطلاعات رسمی جدا نگه دارید و فقط در بخش ۷ با تاریخ بنویسید. اطلاعات شخصی (شماره پاسپورت، نشانی دقیق و …) ننویسید.
6. **زبان:** فارسی معیار با نیم‌فاصله درست؛ اصطلاح آلمانی در اولین کاربرد داخل پرانتز؛ نام انجمن همه‌جا: Iranian Students Association of Leibniz University Hannover (ISL).
7. **پیوند به صفحه‌های دیگر** با مسیر نسبی، مثلاً `[۱۰. اجازه اقامت](../01-arriving-in-hannover/10-residence-permit.md)`.

## بررسی و ساخت PDF

```bash
bash tools/check_links.sh          # وضعیت همه پیوندهای بیرونی
python3 tools/build_pdf.py         # ساخت pdf/ISL-Handbook-Living-in-Hannover.pdf
```

برخی سایت‌ها (مثلاً make-it-in-germany.com و LinkedIn) درخواست خودکار را مسدود می‌کنند؛ این پیوندها را در مرورگر باز کنید.

## بازبینی

مقررات اقامت، بیمه، مالیات و کار زود تغییر می‌کنند. هر صفحه را دست‌کم هر ترم یک بار بازبینی کنید و «تاریخ آخرین بررسی» را در کادر بالای صفحه به‌روز کنید.

</div>
