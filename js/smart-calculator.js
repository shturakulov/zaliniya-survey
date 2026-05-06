// ============= AQLLI TAVSIYA TIZIMI =============
// Foydalanuvchining YO'Q tarmog'idagi javoblariga qarab unga mos xonadon tavsiya qiladi
//
// MUHIM: Hozirda quruvchilar uyni faqat 36-60 oyga foizsiz bo'lib to'lashga berishadi.
// Shu cheklovni hisoblashda ishlatamiz.

// ============= KONSTANTALAR =============

// Quruvchilar standarti: foizsiz rasrochka muddati
const RASROCHKA_MIN_MONTHS = 36;
const RASROCHKA_MAX_MONTHS = 60;
const RASROCHKA_DEFAULT_MONTHS = 48; // Eng ko'p uchraydigan variant

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
  '6-7 mln': 6.5,
  '8 mln': 8,
  '9 mln': 9,
  '10-11 mln': 10.5,
  '12-14 mln': 13,
  '15 mln+': 16,
};

// ============= TAVSIYA YARATISH =============
function generateRecommendation(answers) {
  if (answers.branch === 'yes') return null;

  const rec = {
    rooms: null, sqm: null, condition: null, priceRange: null,
    downPayment: null, downPaymentPercent: null,
    monthlyPayment: null, months: null,
    feasibility: null, // 'good' | 'tight' | 'unfeasible'
    advice: [],
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

  // 5. RASROCHKA HISOBI (36-60 oy foizsiz)
  const userMonthly = MONTHLY_AVG[answers.no_monthlyPayment] || 8;
  const remaining = totalPrice - rec.downPayment;

  // Foydalanuvchining oyliki bilan qancha oyga to'laydi?
  const naturalMonths = Math.ceil(remaining / userMonthly);

  // 60 oylik (eng uzun) muddat bilan oylik to'lov:
  const monthlyAt60 = Math.ceil((remaining / RASROCHKA_MAX_MONTHS) * 10) / 10;
  // 36 oylik (eng qisqa) muddat bilan oylik to'lov:
  const monthlyAt36 = Math.ceil((remaining / RASROCHKA_MIN_MONTHS) * 10) / 10;

  // Mosligi tekshiruvi
  if (naturalMonths <= RASROCHKA_MIN_MONTHS) {
    // Foydalanuvchi 36 oydan kam vaqtda to'laydi - ajoyib!
    rec.feasibility = 'excellent';
    rec.months = Math.max(naturalMonths, RASROCHKA_MIN_MONTHS); // minimum 36 oy
    rec.monthlyPayment = Math.ceil((remaining / rec.months) * 10) / 10;
  } else if (naturalMonths <= RASROCHKA_MAX_MONTHS) {
    // 36-60 oy oralig'ida - mukammal
    rec.feasibility = 'good';
    rec.months = naturalMonths;
    rec.monthlyPayment = userMonthly;
  } else {
    // 60 oydan ko'p - imkonsiz, eng uzun muddatga olib boramiz
    rec.feasibility = 'unfeasible';
    rec.months = RASROCHKA_MAX_MONTHS;
    rec.monthlyPayment = monthlyAt60;
  }

  rec._monthlyAt60 = monthlyAt60;
  rec._monthlyAt36 = monthlyAt36;
  rec._userMonthly = userMonthly;

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
  // 1. RASROCHKA MOSLIGI - eng muhim maslahat (birinchi joyda)
  if (rec.feasibility === 'unfeasible') {
    const shortfall = Math.ceil((rec._monthlyAt60 - rec._userMonthly) * 10) / 10;
    rec.advice.push({
      type: 'warning', icon: '⚠️',
      title: "Танлаган уйингиз учун ойлик тўлов етарли эмас",
      text: `Қурувчилар ҳозир уйни <strong>фақат 36-60 ойга фоизсиз</strong> бўлиб тўлашга беришади. Сизнинг хоҳлаган ойлик тўловингиз (${rec._userMonthly} млн) билан тўлов муддати <strong>${Math.ceil(remaining / rec._userMonthly)} ой</strong> бўлади — бу 60 ойдан кўп. <br><br>📊 Энг узун муддат (60 ой) учун ойлик: <strong>${rec._monthlyAt60} млн</strong> (фарқи +${shortfall} млн). <br><br>Қуйидагилардан бирини танлашингиз керак: бошланғич тўловни кўпайтириш, кичикроқ ёки арзонроқ ҳолатдаги уйни танлаш, ёки ойлик тўловни ${rec._monthlyAt60} млн га оширишни режалаштириш.`,
    });
  } else if (rec.feasibility === 'excellent') {
    rec.advice.push({
      type: 'success', icon: '✅',
      title: "Сизнинг шартларингиз жуда яхши",
      text: `Сизнинг бошланғич тўлов ва ойлик тўловингиз билан расрочкани <strong>${rec.months} ойда</strong> якунлайсиз. Бу қурувчиларнинг 36 ойлик минимум муддатига тенг. Имконият борлиги учун ${rec.monthlyPayment} млн/ой тўлайсиз.`,
    });
  } else if (rec.feasibility === 'good' && rec.months >= 48) {
    rec.advice.push({
      type: 'info', icon: '💡',
      title: "Расрочка муддати оптимал",
      text: `Тўлов муддатингиз <strong>${rec.months} ой (~${Math.round(rec.months/12*10)/10} йил)</strong>. Қурувчилар стандарти 36-60 ой ичида. Истасангиз, бошланғич тўловни оширсангиз муддат қисқаради ва ойлик енгилроқ бўлади.`,
    });
  }

  // 2. Boshlang'ich to'lov foizi
  if (rec.downPaymentPercent < 20) {
    rec.advice.push({
      type: 'info', icon: '💰',
      title: "Бошланғич тўлов фоизи паст",
      text: `Бошланғич тўловингиз уй нархининг тахминан <strong>${rec.downPaymentPercent}%</strong> га тенг. Кўп қурувчилар <strong>20-30%</strong> бошланғич тўловни сўрашади. Лойиҳалар турли — баъзилари 15% дан бошлайди.`,
    });
  } else if (rec.downPaymentPercent >= 50) {
    rec.advice.push({
      type: 'success', icon: '🎯',
      title: "Юқори бошланғич тўлов",
      text: `Бошланғич тўловингиз уй нархининг <strong>${rec.downPaymentPercent}%</strong> га тенг. Бу аъло натижа — баъзи қурувчилар 50%+ БТ учун қўшимча чегирма ҳам беришади. Расрочка муддатини ҳам анча қисқартиришингиз мумкин.`,
    });
  }

  // 3. Tezda olish (yangi: "Tayyor" yoki "Yaqin oylar" bo'lsa shoshilinch hisoblanadi)
  if (answers.no_planTimeline === 'Tayyor, tanlayapman' || answers.no_planTimeline === 'Yaqin oylar') {
    rec.advice.push({
      type: 'warning', icon: '🚀',
      title: "Тез ҳаракат қилиш керак",
      text: `Сиз яқин ойларда уй олишни режалаштирган экансиз. <strong>Тайёр ёки деярли тайёр уйларга</strong> эътибор беринг. Каробка уй учун таъмир 3-4 ой қўшимча кетади — бу сизнинг муддатингизга мос келмайди.`,
    });
  }

  // 4. Oila kattaligi
  if ((answers.familySize === '4-5' || answers.familySize === '6+') &&
      (rec.rooms === '1' || rec.rooms === '2')) {
    rec.advice.push({
      type: 'warning', icon: '👨‍👩‍👧‍👦',
      title: "Оилангиз учун кичикроқ",
      text: `${answers.familySize} кишилик оила учун ${rec.rooms} хонали уй тор бўлиши мумкин. <strong>3-4 хонали хонадонларни</strong> кўриб чиқишингизни тавсия қиламиз.`,
    });
  }

  // 5. Investitsiya
  if (answers.no_purpose === 'Investitsiya' || answers.no_motivation === 'Investitsiya') {
    rec.advice.push({
      type: 'info', icon: '📈',
      title: "Инвестиция учун маслаҳат",
      text: `Инвестиция учун <strong>жойлашув</strong> энг муҳим. Тайёр уйлар тез ижарага берилади ва дарҳол даромад келтиради. Каробка уй 25-35% арзонроқ — фойда фоизи юқори, лекин 6-12 ой кутиш керак.`,
    });
  }

  // 6. Ijaradan qutulish
  if (answers.no_motivation === 'Ijara' || answers.currentLiving === 'Ijarada') {
    rec.advice.push({
      type: 'info', icon: '🏠',
      title: "Ижарадан хонадонга",
      text: `Сиз ижарада яшаяпсиз — одатда 4-7 млн/ой. Расрочкада <strong>${rec.monthlyPayment} млн/ой</strong> тўлаб, ўз уйингизга эга бўласиз. ${rec.months} ойдан кейин (${Math.round(rec.months/12*10)/10} йил) уй сизники.`,
    });
  }

  // 7. Tanlov omillari
  if (answers.no_factors) {
    const factors = String(answers.no_factors).split(',').map(s => s.trim());

    if (factors.includes('Narx') && rec.condition === "Tayyor ta'mirlangan") {
      rec.advice.push({
        type: 'info', icon: '💸',
        title: "Нарх энг муҳим омил эди",
        text: `Сиз нархни асосий омил қилиб танладингиз. Тайёр уй ўрнига <strong>White Box ёки каробка</strong> танласангиз, тайёрлаш билан ҳам 15-25% тежашингиз мумкин. Шу пулни оила учун ё бошланғич тўловга қўшса бўлади.`,
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

  // 8. Daromad va to'lov
  if (answers.income === '5 mln gacha' && rec.monthlyPayment >= 9) {
    rec.advice.push({
      type: 'warning', icon: '⚠️',
      title: "Тўлов даромадингиздан юқори",
      text: `Даромадингиз 5 млн/ой гача, ойлик тўловингиз эса <strong>${rec.monthlyPayment} млн</strong>. Бу катта юк. Кичикроқ хонадон ёки бошланғич тўловни ошириб муддатни узайтириш керак.`,
    });
  }

  // 9. Yosh
  if (answers.age === '18-25' && answers.no_purpose === 'Yashash') {
    rec.advice.push({
      type: 'info', icon: '🌱',
      title: "Ёш — катта имконият",
      text: `Сиз 18-25 ёшдасиз. 60 ойлик расрочка (5 йил) сизга мос — ҳар ой кам тўлайсиз, оила кенгайганда ҳам ёрдамлайди.`,
    });
  }
}

// ============= HTML GA O'GIRISH =============
function renderRecommendation(rec) {
  if (!rec) return '';

  const conditionLabel = {
    'Karobka': 'Каробка (ўзи таъмирлайди)',
    'White Box': 'White Box (маляр учун тайёр)',
    "Tayyor ta'mirlangan": 'Тайёр таъмирланган',
  }[rec.condition] || rec.condition;

  // Feasibility'ga qarab badge
  let feasibilityBadge = '';
  if (rec.feasibility === 'unfeasible') {
    feasibilityBadge = '<div class="rec-badge rec-badge-warning">⚠️ Шартлар тўғриланиши керак</div>';
  } else if (rec.feasibility === 'excellent') {
    feasibilityBadge = '<div class="rec-badge rec-badge-success">✓ Аъло мослик</div>';
  } else {
    feasibilityBadge = '<div class="rec-badge rec-badge-info">✓ Стандарт расрочка</div>';
  }

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
        ${feasibilityBadge}
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
        <h3 class="rec-payment-title">💳 Тўлов режаси (фоизсиз расрочка)</h3>
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
            <strong>~${Math.round(rec.months / 12 * 10) / 10} йил (${rec.months} ой)</strong>
          </div>
        </div>
        <div class="rec-payment-note">
          ℹ️ Қурувчилар ҳозир уйни 36-60 ойга фоизсиз бўлиб тўлашга беришади
        </div>
      </div>

      ${adviceHtml}

      <div class="rec-disclaimer">
        ℹ️ Бу тахминий тавсия. Аниқ нархлар лойиҳа ва қурувчига боғлиқ.
      </div>
    </div>
  `;
}
