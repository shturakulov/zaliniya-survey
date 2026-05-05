# 📋 CHANGELOG — Zalniya Survey loyihasi

> Bu fayl Claude bilan suhbat kontekstini saqlash uchun yaratilgan.
> Keyingi suhbatlarda bu faylni Claude'ga yuklab, oldingi o'zgarishlarni tushunishi mumkin.

---

## 🗓️ 2026-05-05 — Yakuniy yaxshilashlar (v4-final)

### A. ISM + TELEFON SAVOLI ENG OXIRIGA KO'CHIRILDI

**Yangi tartib:**
1. Tarmoq ajratuvchi (Залиниядан уй олганмисиз?)
2. Tarmoq savollari (HA yoki YO'Q)
3. Demografiya (yosh, jins, kasb va h.k.) — **ism+telefondan tashqari**
4. Yakuniy izoh
5. **Ism + Telefon — eng oxirgi savol** (ixtiyoriy)

**Sabab:** Foydalanuvchi avval butun so'rovnomani to'ldiradi, oxirida o'zining xohishi bilan kontaktini qoldiradi (yoki qoldirmaydi). Bu konversiyani oshiradi — chunki foydalanuvchi vaqt sarflagandan keyin tashlab ketmaydi.

### B. YO'Q TARMOG'I UCHUN SMART TAVSIYA QAYTARILDI

Rahmat sahifasida **YO'Q** tarmog'idagi foydalanuvchilarga ularning javoblariga qarab moslashtirilgan **xonadon tavsiyasi** chiqadi:

**Tavsiya tarkibi:**
- 🏠 Mos xona soni va kvadratura (oilaga moslab)
- 💰 Tahminiy narx diapazoni (uy holati × m² narxiga qarab)
- 💳 To'liq to'lov rejasi (BT, qolgan summa, oylik, muddat)
- 💡 5-7 ta shaxslashtirilgan maslahat:
  - BT foizi past/yuqori bo'lsa eslatma
  - Shoshilinch reja → tayyor uy tavsiyasi
  - Katta oila + kichik xonali → 3-4 xonali tavsiya
  - Investitsiya → joylashuv va daromad fokusi
  - Ijaradan qutulish → tejov hisobi
  - Narx omili + tayyor uy → arzonroq variantlar
  - Daromad mosligi tekshiruvi

**Texnik:**
- `js/smart-calculator.js` — `generateRecommendation(answers)` va `renderRecommendation(rec)`
- `css/style.css` — yangi `.rec-card`, `.rec-summary-grid`, `.rec-payment-card`, `.rec-advice-*` stillari
- HA tarmog'i uchun tavsiya **chiqmaydi** (chunki ular allaqachon uy olishgan)

### C. SUCCESS SCREEN MATNI YANGILANDI

Eski: "Агар сиз боғланиш учун розилик берган бўлсангиз..."
Yangi: "Агар сиз телефон рақамингизни қолдирган бўлсангиз..."

(F1 savol olib tashlanganligi sabab — endi telefon o'zi rozilik belgisi)

---

## 🗓️ 2026-05-05 — Soddalashtirish (v4)

### A. SAVOLLAR OLIB TASHLANDI

**Yakuniy savollardan:**
- ❌ **F1 (Bog'lanishga rozilik)** — "Биздан кейин боғланишимизни хоҳлайсизми?" — **butunlay olib tashlandi**
  - Endi telefon raqami qoldirgan = bog'lanishni xohlaydi (avtomatik)

**YO'Q tarmog'idan 3 ta savol olib tashlandi:**
- ❌ **16-savol** (no_paymentStrategy) — "Сизга қайси тўлов стратегияси мос келади?"
- ❌ **19-savol** (no_paymentTerm) — "Тўлов муддати қанча бўлишини хоҳлайсиз?"
- ❌ **20-savol** (no_fears) — "Уй олишдан энг катта қўрқувингиз нима?"

**YO'Q tarmog'i endi 8 ta savoldan iborat:**
1. Reja muddati (no_planTimeline)
2. Maqsad (no_purpose)
3. Xonalar soni (no_rooms)
4. Uy holati (no_houseCondition)
5. Tanlov omillari (no_factors) — 5 ta variant
6. Boshlang'ich to'lov (no_downPayment)
7. Maksimal oylik (no_monthlyPayment) — 3 ta variant
8. Motivatsiya (no_motivation) — 3 ta variant

### B. MOBILE TUGMA JOYLASHUVI

- ✅ Pastdagi "Орқага" va "Кейинги савол" tugmalari endi **`position: sticky`** — pastga yopishib turadi
- ✅ Mobile'da foydalanuvchi savolni tanlasa, tugmalar darhol qo'l ostida bo'ladi
- ✅ "Орқага" tugmasi kichikroq, "Кейинги савол" katta (mobil interfeys uchun yaxshi)
- ✅ Soya effekti bilan ajralib turadi (foydalanuvchi sezadi)

### C. DASHBOARD MOSLASHTIRILDI

- ✅ "Тўлов стратегиялари" charti olib tashlandi
- ✅ "Тўлов муддати" charti olib tashlandi
- ✅ "Энг катта қўрқувлар" charti olib tashlandi
- ✅ "Боғланишга розилиги" → "**Телефон қолдирганлар**"
- ✅ Lidlar jadvali endi telefon qoldirganlarni filtrlaydi (contactPermission o'rniga)

### D. GOOGLE SHEETS USTUNLARI (yangilangan ro'yxat)

```
timestamp	fullName	phone	age	gender	profession	professionOther
maritalStatus	familySize	currentLiving	income	boughtZalniya	branch
yes_projectName	yes_projectNameOther	yes_rooms	yes_pricePerSqm
yes_pricePerSqmOther	yes_monthlyPayment	yes_monthlyPaymentOther
yes_reasons	yes_problems	no_planTimeline	no_purpose	no_rooms
no_houseCondition	no_factors	no_downPayment	no_monthlyPayment
no_motivation	comments	userAgent	fillTimeSeconds	ipHash
```

**Olib tashlangan ustunlar (eski Sheets'da qolaversa muammo emas):**
- contactPermission, no_paymentStrategy, no_paymentTerm, no_fears, privacyAgreed, no_budget, no_discountImportance

---

## 🗓️ 2026-05-05 — Katta qayta tuzilish (v3)

### A. SAVOLLAR TARTIBI O'ZGARDI

**Yangi tartib:**

1. **1-savol:** Zalniyadan uy olganmisiz? (Ha/Yo'q tarmoq ajratuvchi)
2. **Tarmoq savollari:**
   - Agar HA → loyiha, xonalar, narx, oylik to'lov, sabablar, muammolar
   - Agar YO'Q → reja, maqsad, xonalar, uy holati, omillar va h.k.
3. **Demografik savollar (oxirida):**
   - Ism + Telefon (bitta oynada, **ixtiyoriy**)
   - Yosh, jins, kasb, oilaviy holat, oila a'zolari, yashash joyi, daromad (majburiy)
4. **Yakuniy:**
   - Bog'lanishga ruxsat
   - Qo'shimcha izohlar

### B. DEMOGRAFIK SAVOLLAR HAQIDA

- **Ism va Telefon BITTA oynada** chiqadi (avval alohida edi)
- **Ixtiyoriy** — "Биз сиз билан боғланишимизни хоҳласангиз қолдиринг" matni bilan
- Qolgan demografik savollar majburiy bo'lib qoladi

### C. YO'Q TARMOG'IDAGI O'ZGARISHLAR

| Savol | O'zgarish |
|-------|-----------|
| **11-savol** (Reja) | "Ўйлаб юрибман" varianti **olib tashlandi** |
| **14-savol** (Uy holati) | "White house" → **"White Box"**, "Фарқи йўқ" varianti **olib tashlandi** |
| **15-savol** (Tanlov omillari) | Faqat **5 ta omil**: Narx, Joylashuv, Quruvchi ishonchliligi, Infratuzilma, To'lov shartlari |
| **18-savol** (Oylik to'lov) | Faqat **3 ta variant**: 6-8 mln, 9-11 mln, 12 mln+ |
| **21-savol** (Motivatsiya) | Faqat **3 ta variant**: Ижара, Инвестиция, Катта оиламиз |

### D. RAHMAT SAHIFASIDAN OLIB TASHLANDI

- 🏘️ "Сизга мос лойиҳалар" bloki — **olib tashlandi**
- 🧮 "Ипотека/Расрочка калкуляторини очиш" tugmasi — **olib tashlandi**
- (Ham HA, ham YO'Q tarmog'i uchun)

### E. YAKUNIY SAVOLLARDAN OLIB TASHLANDI

- "Махфийлик шартлари" sahifasi (privacyAgreed checkbox) — **olib tashlandi**

---

## 🗓️ 2026-05-05 — Birinchi o'zgarishlar (v2)

### HA tarmog'i — 13-savol (Sabablar)
- `value="Quruvchi obro'si"` → `value="Quruvchi ishonchliligi"`

### HA tarmog'i — 11-savol (Loyiha tanlash)
- Matn maydonidan **12 ta variantli radio guruh**ga aylantirildi
- Variantlar: Zuhal, Dargoh, Rail City, Nova House, Jahon House, Muborak TJM,
  Izmir (Global Avenue), Orifon (Elite Building), Tiffany, Shahriston, Afrosiyob TJM, Boshqa

### HA tarmog'iga 2 ta yangi savol qo'shildi
- **13-HA:** Kvadrat metr narxi — 7-8 / 8-9 / 10-11 / 12+ / Boshqa
- **14-HA:** Oylik to'lov — 6-7 / 8-9 / 10-12 / 13+ / Boshqa

### Ipoteka kalkulyatori (kalkulyator.html) — saqlangan

---

## ⚠️ MUHIM: GOOGLE SHEETS USTUN NOMLARI

`google-apps-script.js` Google Sheets'ga ma'lumotlarni dinamik yozadi (header'larga qarab).
Yangi ma'lumotlar yozilishi uchun **Google Sheets'ning birinchi qatoriga** quyidagi
ustunlar bo'lishi kerak:

```
timestamp	fullName	phone	age	gender	profession	professionOther
maritalStatus	familySize	currentLiving	income	boughtZalniya	branch
yes_projectName	yes_projectNameOther	yes_rooms	yes_pricePerSqm
yes_pricePerSqmOther	yes_monthlyPayment	yes_monthlyPaymentOther
yes_reasons	yes_problems	no_planTimeline	no_purpose	no_rooms
no_houseCondition	no_factors	no_paymentStrategy	no_downPayment
no_monthlyPayment	no_paymentTerm	no_fears	no_motivation
contactPermission	comments	userAgent	fillTimeSeconds	ipHash
```

**Eslatma:** "privacyAgreed", "yes_priceRange" kabi eski ustunlar endi ishlatilmaydi
(lekin Sheets'da qolaversa muammo emas).

---

## 🔧 TEXNIK ESLATMALAR (Claude uchun)

- Savollar tartibi `js/form.js` dagi `state.questions` massivi bilan boshqariladi
- Savollar `data-section="general|yes|no"` va `data-question="N"` orqali tasniflanadi
- "general" dan boshlanadigan, lekin "final" dan boshlamaydigan savollar — boshlangich
- "final" dan boshlanadigan — yakuniy (oxirgi)
- Tarmoq savollari: section="yes" yoki section="no"

**Yangi tartib mantig'i (2026-05-05 v3):**
- Boshlangich: faqat 1 ta savol — `boughtZalniya` (data-section="branching" yoki "general")
- Tarmoq: yes/no savollari
- Demografiya: data-section="demographic" (yangi tip)
- Yakuniy: data-section="general" + data-question="final-*"
