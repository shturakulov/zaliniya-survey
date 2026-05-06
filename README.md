# 🏘️ Zaliniya hududi uy-joy so'rovnomasi

Vogzal temir yo'l orti (Zaliniya) hududida aholini qulay uy-joy bilan ta'minlash maqsadidagi tadqiqot sayti.

## 📋 Ish tartibi (sizning vazifalaringiz)

1. ✅ Google Sheets yaratish
2. ✅ Google Apps Script o'rnatish
3. ✅ Token va parolni o'zgartirish
4. ✅ URL'larni saytga qo'yish
5. ✅ GitHub'ga push qilish
6. ✅ GitHub Pages'ni yoqish

---

## 🔧 1-QADAM: Google Sheets yaratish

### 1.1 Sheets yarating

1. https://sheets.google.com ga kiring
2. **+ Blank** bosing
3. Yuqorida nomini o'zgartiring: **"Zaliniya Survey Responses"**

### 1.2 Header qatorini qo'shing

A1 katakka bosing va quyidagi matnni nusxalab joylashtiring (Tab bilan ajratilgan):

```
timestamp	fullName	phone	age	gender	profession	professionOther	maritalStatus	familySize	region	regionOther	currentLiving	income	boughtZalniya	branch	yes_projectName	yes_projectNameOther	yes_rooms	yes_pricePerSqm	yes_pricePerSqmOther	yes_monthlyPayment	yes_monthlyPaymentOther	yes_reasons	no_planTimeline	no_purpose	no_rooms	no_houseCondition	no_factors	no_downPayment	no_monthlyPayment	no_motivation	no_visitedOffice	no_questions	comments	userAgent	fillTimeSeconds	ipHash
```

> 💡 Qulay tarzda nusxa olish uchun: avval `Ctrl+A` qilib hammasini belgilang, keyin matnni A1 katakka joylashtiring — ustunlarga avtomatik bo'linadi.

### 1.3 Birinchi qatorni qotirish

- **View** menyu → **Freeze** → **1 row** tanlang

---

## 🔐 2-QADAM: Token va parolni o'zgartirish (XAVFSIZLIK)

### 2.1 Tokenni o'zgartiring

3 ta faylda **bir xil token** bo'lishi kerak:

| Fayl | Qator |
|------|-------|
| `js/form.js` | `const SECURITY_TOKEN = '...'` |
| `js/dashboard.js` | `const SECURITY_TOKEN = '...'` |
| `google-apps-script.js` | `const SECURITY_TOKEN = '...'` |

⚠️ **MUHIM:** Tokeningizni hech qachon README, commit message yoki ommaviy joylarda yozmang. Token kodda ham yashirin saqlanishi kerak.

**Token yaratish tavsiya etiladi:** o'zingizning maxsus tokeningizni yarating (kamida 24 belgi, raqamlar va harflar aralash)

> 💡 Token generator: https://www.random.org/strings/?num=1&len=24&digits=on&loweralpha=on&unique=on&format=html

**Tokenni o'zgartirgandan keyin:**
1. 3 ta faylni saqlash
2. Apps Script'da yangi version deploy qilish
3. Eski commitlardan tokenni tozalash (git history clean)

### 2.2 Dashboard parolini sozlash

`js/dashboard.js` faylida `DASHBOARD_PASSWORD_HASH` qatorini topib, parolingizning **SHA-256 hash**'ini qo'ying.

**Parolni hash'ga aylantirish (3 ta usul):**

#### Usul 1: Brauzer konsoli (eng oson)

1. Saytni ochib, F12 bosing → **Console** tabini ochinng
2. Quyidagi kodni yopishtilring (parolingizni o'zingiznikiga o'zgartiring):

```javascript
async function makeHash(p) {
  const buf = new TextEncoder().encode(p);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
makeHash('SIZNING_PAROLINGIZ').then(console.log);
```

3. Konsolda chiqqan hash'ni nusxalang
4. `js/dashboard.js`'da `DASHBOARD_PASSWORD_HASH` qiymatini almashtiring

#### Usul 2: Online generator
https://emn178.github.io/online-tools/sha256.html sahifasida parolingizni yozing va hash'ni nusxalang.

---

## 🔧 3-QADAM: Google Apps Script o'rnatish

### 3.1 Apps Script ochish

1. Sheets ichida: **Extensions → Apps Script** menyusini bosing
2. Yangi tab ochiladi (script.google.com)
3. **Code.gs** fayli ichidagi hamma matnni o'chiring

### 3.2 Kodni joylashtirish

1. `google-apps-script.js` faylini oching
2. To'liq kodni nusxalang (Ctrl+A → Ctrl+C)
3. Apps Script editoriga yopishtirilng (Ctrl+V)
4. **Token**ni 2-qadamda yaratganingiz bilan almashtiring (16-qator atrofida)
5. **Save** (Ctrl+S) - loyiha nomini "Zaliniya API" deb qo'ying

### 3.3 Test qilish

1. Yuqoridagi funksiya tanlash dropdown'idan **`testSetup`**'ni tanlang
2. **Run** (▶️) tugmasini bosing
3. Birinchi marta **Authorization required** chiqadi:
   - **Review permissions** bosing
   - O'z hisobingizni tanlang
   - "Google hasn't verified..." → **Advanced** → **Go to Zaliniya API (unsafe)**
   - **Allow**
4. Pastda **Execution log** ochiladi va `✅ Hammasi tayyor!` xabari chiqadi

### 3.4 Web App sifatida deploy qilish

1. Yuqori o'ngda **Deploy** → **New deployment**
2. ⚙️ ikonkasi (gear) → **Web app**
3. Sozlamalar:
   - **Description:** `Zaliniya Survey API v1`
   - **Execute as:** `Me (sizning email)`
   - **Who has access:** `Anyone` ⚠️ (bu majburiy, lekin token bilan himoyalangan)
4. **Deploy** tugmasi
5. **URL** ni nusxalang — bu sizga kerak (masalan: `https://script.google.com/macros/s/AKfyc.../exec`)

---

## 🔌 4-QADAM: URL'larni saytga ulash

`js/form.js` va `js/dashboard.js` fayllarida `PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` qatorini Web App URL'ingiz bilan almashtiring.

**Ikkala faylda ham bir xil URL bo'lishi kerak!**

```javascript
// AVVAL:
const GOOGLE_SCRIPT_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

// KEYIN:
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfyc.../exec';
```

---

## 🚀 5-QADAM: GitHub'ga deploy qilish

### 5.1 Lokal terminal'dan push qilish

```bash
cd /path/to/zalniya-survey

git init
git add .
git commit -m "Initial commit: Zaliniya survey"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO-NAME.git
git push -u origin main
```

### 5.2 GitHub Pages yoqish

1. GitHub repository sahifasida **Settings** tabini oching
2. Yon panelda **Pages** ni bosing
3. **Source:** `Deploy from a branch` tanlang
4. **Branch:** `main` / **Folder:** `/ (root)` → **Save**
5. 1-2 daqiqa kuting, sayt manzili paydo bo'ladi:
   ```
   https://USERNAME.github.io/REPO-NAME/
   ```

---

## ✅ 6-QADAM: Test qilish

### Forma test:
1. `https://USERNAME.github.io/REPO-NAME/` ga kiring
2. So'rovnomani to'liq to'ldiring
3. Yuborish tugmasini bosing
4. Google Sheets'da yangi qator paydo bo'lishini tekshiring

### Dashboard test:
1. `https://USERNAME.github.io/REPO-NAME/dashboard.html` ga kiring
2. Parolni kiriting
3. Statistikalar va chartlar ko'rinishi kerak

---

## 🛡️ XAVFSIZLIK QATLAMLARI

### Frontend himoya:
| # | Himoya | Qanday ishlaydi |
|---|--------|-----------------|
| 1 | **Honeypot** | Botlar uchun yashirin maydon |
| 2 | **Vaqt validatsiyasi** | Forma 15 sekunddan tez to'ldirilsa - bot |
| 3 | **Rate limit (frontend)** | 1 brauzerdan 1 soatda max 3 yuborish |
| 4 | **Validatsiya** | Telefon, ism, majburiy maydonlar |

### Backend himoya (Apps Script):
| # | Himoya | Qanday ishlaydi |
|---|--------|-----------------|
| 1 | **Token tekshiruvi** | URL'ni topgan bo'lsa ham, token kerak |
| 2 | **Honeypot tekshiruvi** | Server tomonida ham qaytadan tekshiriladi |
| 3 | **Vaqt tekshiruvi** | Server tomonida ham tekshiriladi |
| 4 | **Rate limit (backend)** | 1 foydalanuvchidan max 5/soat |
| 5 | **HTML sanitization** | XSS himoyasi - `<script>` teglar olib tashlanadi |
| 6 | **Maydon uzunligi** | Max 2000 belgi har maydon uchun |
| 7 | **Telefon format** | Server tomonida format tekshiriladi |
| 8 | **Security log** | Hamma shubhali harakatlar SecurityLog sheet'ga yoziladi |

### Dashboard himoya:
| # | Himoya | Qanday ishlaydi |
|---|--------|-----------------|
| 1 | **Parol** | SHA-256 hash, asl parol kodda yo'q |
| 2 | **Brute-force himoya** | 3 marta xato → 30 sekund kutish |
| 3 | **Session** | 4 soat amal qiladi |
| 4 | **Token tekshiruvi** | Apps Script URL'iga bo'lsa ham, token kerak |

---

## 📊 SecurityLog sheet'ni kuzatish

Sheets faylingizda **SecurityLog** nomli yangi tab paydo bo'ladi. Bu yerda barcha shubhali harakatlar yoziladi:
- Honeypot ishga tushgan vaqtlar
- Rate limit oshgan IP'lar
- Noto'g'ri token urinishlari
- Server xatolari

Vaqti-vaqti bilan tekshirib turing!

---

## 🔄 Tokenni o'zgartirish kerak bo'lsa

Agar token sizib chiqsa yoki xavfsizlik xavotirlari bo'lsa:

1. Yangi token yarating
2. 3 ta faylda almashtirilng (form.js, dashboard.js, google-apps-script.js)
3. Apps Script'da yangi deploy qiling: **Deploy → Manage deployments → Edit (qalam ikonkasi) → New version → Deploy**
4. Yangi URL'ni saytga qo'ying
5. GitHub'ga push qiling

---

## 📁 Loyiha tuzilmasi

```
zaliniya-survey/
├── index.html              # So'rovnoma sahifasi
├── dashboard.html          # Statistika dashboard
├── google-apps-script.js   # Backend kodi (Apps Script'ga ko'chiriladi)
├── css/
│   ├── style.css           # Asosiy dizayn
│   └── dashboard.css       # Dashboard dizayni
├── js/
│   ├── form.js             # Forma logikasi
│   └── dashboard.js        # Dashboard chartlari
└── README.md               # Bu fayl
```

---

## 🆘 Muammo yuzaga kelsa

### Forma yuborilmaayapti?
- Brauzer DevTools (F12) → Console tabini oching
- Xato xabarlarini ko'ring
- Token har 3 faylda bir xil ekanini tekshiring
- Apps Script URL to'g'ri ekanini tekshiring

### Dashboard ma'lumot ko'rsatmayapti?
- Sheets'da kamida 1 ta qator borligini tekshiring
- Apps Script'ni qayta deploy qiling (Manage deployments → New version)
- Brauzer cache'ni tozalang (Ctrl+Shift+R)

### Parol ishlamayapti?
- SHA-256 hash to'g'riligini tekshiring (online toolda yana hisoblang)
- Hash hammasi kichik harflar bilan ekanligiga ishonch hosil qiling

---

© 2026 · Zaliniya hududi uy-joy tadqiqoti
