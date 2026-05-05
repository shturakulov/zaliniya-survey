// ============= AQLLI TAVSIYA TIZIMI =============
// Foydalanuvchining YO'Q tarmog'idagi javoblariga qarab unga mos xonadon tavsiya qiladi

// ============= KONSTANTALAR =============

// Xona soniga qarab kvadrat metr (o'rtacha Toshkent yangi qurilish)
const ROOM_TO_SQM = {
  '1': 38,
  '2': 55,
  '3': 75,
  '4+': 95,
};

// Uy holatiga qarab 1 m² narxi (mln so'mda - taxminiy)
const PRICE_PER_SQM = {
  'Karobka': 7,
  'White Box': 9,
  "Tayyor ta'mirlangan": 11,
};

// Boshlang'ich to'lov diapazonlari (mln so'm) - o'rtachasi
const DOWN_PAYMENT_AVG = {
  '50 mln gacha': 40,
  '50-100 mln': 75,
  '100-150 mln': 125,
  '150-200 mln': 175,
  '200 mln+': 250,
};

// Maksimal oylik (mln so'm) - o'rtachasi
const MONTHLY_AVG = {
  '6-8 mln': 7,
  '9-11 mln': 10,
  '12 mln+': 14,
};

// ============= TAVSIYA YARATISH =============
function generateRecommendation(answers) {
  if (answers.branch === 'yes') return null;

  const rec = {
    rooms: null, sqm: null, condition: null, priceRange: null,
    downPayment: null, downPaymentPercent: null,
    monthlyPayment: null, months: null, advice: [],
  };

  // 1. XONA SONI
  rec.rooms = answers.no_rooms || guessRoomsByFamily(answers.familySize);
  rec.sqm = ROOM_TO_SQM[rec.rooms] || 60;

  // 2. UY HOLATI
  rec.condition = answers.no_houseCondition || 'White Box';

  // 3. NARX
  const pricePerSqm = PRICE_PER_SQM[rec.condition] || 9;
  const totalPrice = Math.round(pricePerSqm * rec.sqm);
  rec.priceRange = {
    min: Math.round(totalPrice * 0.9),
    max: Math.round(totalPrice * 1.1),
    avg: totalPrice,
  };

  // 4. BOSHLANG'ICH TO'LOV
  rec.downPayment = DOWN_PAYMENT_AVG[answers.no_downPayment] || 100;
  rec.downPaymentPercent = Math.round((rec.downPayment / totalPrice) * 100);

  // 5. OYLIK TO'LOV va MUDDAT
  const userMonthly = MONTHLY_AVG[answers.no_monthlyPayment] || 8;
  const remaining = totalPrice - rec.downPayment;
  rec.months = Math.max(1, Math.ceil(remaining / userMonthly));
  rec.monthlyPayment = userMonthly;

  // 6. MASLAHATLAR
  generateAdvice(rec, answers, totalPrice, remaining);

  return rec;
}

function guessRoomsByFamily(familySize) {
  if (familySize === '1') return '1';
  if (familySize === '2-3') return '2';
  if (familySize === '4-5') return '3';
  if (familySize === '6+') return '4+';
  return '2';
}

function generateAdvice(rec, answers, totalPrice, remaining) {
  // Boshlang'ich to'lov foizi
  if (rec.downPaymentPercent < 20) {
    rec.advice.push({
      type: 'info', icon: '💡',
      title: "Бошланғич тўлов фоизи паст",
      text: `Бошланғич тўловингиз уй нархининг тахминан ${rec.downPaymentPercent}% га тенг. Кўп қурувчилар 20-30% бошланғич тўловни афзал кўришади.`,
    });
  } else if (rec.downPaymentPercent >= 50) {
    rec.advice.push({
      type: 'success', icon: '✅',
      title: "Жуда яхши бошланғич тўлов",
      text: `Бошланғич тўловингиз уй нархининг ${rec.downPaymentPercent}% га тенг — аъло натижа. Расрочка муддатини анча қисқартириш мумкин.`,
    });
  }

  // Tezda olish
  if (answers.no_planTimeline === 'Shoshilinch') {
    rec.advice.push({
      type: 'warning', icon: '🚀',
      title: "Тез ҳаракат қилиш керак",
      text: `Сиз 3-6 ой ичида уй олишни режалаштирган экансиз. <strong>Тайёр ёки деярли тайёр уйларга</strong> эътибор беринг. Каробка уй учун таъмир 3-4 ой қўшимча кетади.`,
    });
  }

  // Oila kattaligi
  if ((answers.familySize === '4-5' || answers.familySize === '6+') &&
      (rec.rooms === '1' || rec.rooms === '2')) {
    rec.advice.push({
      type: 'warning', icon: '👨‍👩‍👧‍👦',
      title: "Оилангиз учун кичикроқ",
      text: `${answers.familySize} кишилик оила учун ${rec.rooms} хонали уй тор бўлиши мумкин. <strong>3-4 хонали хонадонларни</strong> кўриб чиқишингизни тавсия қиламиз.`,
    });
  }

  // Investitsiya
  if (answers.no_purpose === 'Investitsiya' || answers.no_motivation === 'Investitsiya') {
    rec.advice.push({
      type: 'info', icon: '📈',
      title: "Инвестиция учун маслаҳат",
      text: `Инвестиция учун <strong>жойлашув</strong> энг муҳим. Тайёр уйлар тез ижарага берилади ва дарҳол даромад келтиради. Каробка уй 25-35% арзонроқ — фойда фоизи юқори, лекин 6-12 ой кутиш керак.`,
    });
  }

  // Ijaradan qutulish
  if (answers.no_motivation === 'Ijara' || answers.currentLiving === 'Ijarada') {
    rec.advice.push({
      type: 'info', icon: '🏠',
      title: "Ижарадан хонадонга",
      text: `Сиз ижарада яшаяпсиз — одатда 4-7 млн/ой. Расрочкада ${rec.monthlyPayment} млн/ой тўлаб, <strong>ўз уйингизга эга бўласиз</strong>. 3 йилдан кейин харажатлар тенглашади.`,
    });
  }

  // Tanlov omillari
  if (answers.no_factors) {
    const factors = String(answers.no_factors).split(',').map(s => s.trim());

    if (factors.includes('Narx') && rec.condition === "Tayyor ta'mirlangan") {
      rec.advice.push({
        type: 'info', icon: '💰',
        title: "Нарх энг муҳим омил эди",
        text: `Сиз нархни асосий омил қилиб танладингиз. Тайёр уй ўрнига <strong>каробка ёки White Box</strong> танласангиз, тайёрлаш билан ҳам 15-25% тежашингиз мумкин.`,
      });
    }

    if (factors.includes('Quruvchi ishonchliligi')) {
      rec.advice.push({
        type: 'info', icon: '🏗️',
        title: "Қурувчи ишончлилиги",
        text: `Қурилиш бошланган ёки тугаган лойиҳаларга эътибор беринг. Лойиҳанинг <strong>лицензия ва ҳужжатларини текшириш</strong>, олдинги уйлар сифатини кўриб чиқиш муҳим.`,
      });
    }
  }

  // Daromad va to'lov
  if (answers.income === '5 mln gacha' && rec.monthlyPayment >= 9) {
    rec.advice.push({
      type: 'warning', icon: '⚠️',
      title: "Тўлов даромадингиздан юқори",
      text: `Даромадингиз 5 млн/ой гача, ойлик тўловингиз эса ${rec.monthlyPayment} млн. Бу <strong>катта юк</strong>. Кичикроқ хонадонни ёки узоқ муддатли тўловни кўриб чиқинг.`,
    });
  }

  // Yosh
  if (answers.age === '18-25' && answers.no_purpose === 'Yashash') {
    rec.advice.push({
      type: 'info', icon: '🌱',
      title: "Ёш — катта имконият",
      text: `Сиз 18-25 ёшдасиз. Узоқ муддатли расрочка (5-7 йил) сизга мос — ҳар ой кам тўлайсиз, оила кенгайганда ҳам ёрдамлайди.`,
    });
  }
}

// ============= HTML GA O'GIRISH =============
function renderRecommendation(rec) {
  if (!rec) return '';

  const conditionLabel = {
    'Karobka': 'Каробка (ўзи таъмирлайди)',
    'White Box': 'White Box (деворлар тайёр)',
    "Tayyor ta'mirlangan": 'Тайёр таъмирланган',
  }[rec.condition] || rec.condition;

  let adviceHtml = '';
  if (rec.advice && rec.advice.length > 0) {
    adviceHtml = `
      <div class="rec-advice-section">
        <h3 class="rec-advice-heading">💡 Сиз учун маслаҳатлар</h3>
        <div class="rec-advice-list">
          ${rec.advice.map(a => `
            <div class="rec-advice-item rec-advice-${a.type}">
              <div class="rec-advice-icon">${a.icon}</div>
              <div class="rec-advice-content">
                <div class="rec-advice-title">${a.title}</div>
                <div class="rec-advice-text">${a.text}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="rec-card">
      <div class="rec-header">
        <h2 class="rec-title">🎯 Сизга мос хонадон</h2>
        <p class="rec-subtitle">Жавобларингизга асосан тайёрланган тавсия</p>
      </div>

      <div class="rec-summary-grid">
        <div class="rec-stat">
          <div class="rec-stat-label">Хоналар</div>
          <div class="rec-stat-value">${rec.rooms} хонали</div>
        </div>
        <div class="rec-stat">
          <div class="rec-stat-label">Майдон</div>
          <div class="rec-stat-value">~${rec.sqm} м²</div>
        </div>
        <div class="rec-stat">
          <div class="rec-stat-label">Ҳолати</div>
          <div class="rec-stat-value">${conditionLabel}</div>
        </div>
        <div class="rec-stat rec-stat-highlight">
          <div class="rec-stat-label">Тахминий нарх</div>
          <div class="rec-stat-value">${rec.priceRange.min}–${rec.priceRange.max} млн</div>
        </div>
      </div>

      <div class="rec-payment-card">
        <h3 class="rec-payment-title">💳 Тўлов режаси</h3>
        <div class="rec-payment-rows">
          <div class="rec-payment-row">
            <span>Бошланғич тўлов</span>
            <strong>${rec.downPayment} млн (${rec.downPaymentPercent}%)</strong>
          </div>
          <div class="rec-payment-row">
            <span>Қолган сумма</span>
            <strong>${rec.priceRange.avg - rec.downPayment} млн</strong>
          </div>
          <div class="rec-payment-row">
            <span>Ойлик тўлов</span>
            <strong>${rec.monthlyPayment} млн × ${rec.months} ой</strong>
          </div>
          <div class="rec-payment-row rec-payment-total">
            <span>Тўлов муддати</span>
            <strong>~${Math.round(rec.months / 12 * 10) / 10} йил</strong>
          </div>
        </div>
      </div>

      ${adviceHtml}

      <div class="rec-disclaimer">
        ℹ️ Бу тахминий тавсия. Аниқ нархлар лойиҳа ва қурувчига боғлиқ.
      </div>
    </div>
  `;
}
