/* ============================================
   ZALINIYA SURVEY - FORMA LOGIKASI
   Multi-step + Branching + Validation + Security
   ============================================ */

// ============= GOOGLE APPS SCRIPT URL =============
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyne6ukDw2KH2I37jDN_WM06KZjNnFDD7W4sNE01ADaO22yMUM-Z5jauQB9ZBt7xAke/exec';

// ============= XAVFSIZLIK SOZLAMALARI =============
// Token yo'q — Apps Script Origin tekshiruvi orqali himoyalanadi
const SECURITY = {
  MIN_FILL_TIME_MS: 15000, // Forma kamida 15 soniyada to'ldirilishi kerak
  MAX_SUBMITS_PER_HOUR: 3, // Bir soatda max 3 marta yuborish
  RATE_LIMIT_KEY: 'zln_submits',
};

// ============= GLOBAL HOLAT =============
const state = {
  currentIndex: 0,
  questions: [],
  answers: {},
  branch: null, // 'yes' | 'no'
  startTime: Date.now(), // forma ochilgan vaqt
};

// ============= ELEMENTLAR =============
const form = document.getElementById('surveyForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const loader = document.getElementById('loader');
const successScreen = document.getElementById('successScreen');

// ============= INITIALIZATSIYA =============
function init() {
  buildQuestionFlow();
  showQuestion(0);
  bindEvents();
}

// ============= SAVOLLAR OQIMINI QURISH =============
function buildQuestionFlow() {
  const allQuestions = Array.from(document.querySelectorAll('.question'));

  // YANGI TARTIB: birinchi savol — TARMOQ AJRATUVCHI (boughtZalniya)
  // Tarmoq tanlanmaguncha boshqa savollar ko'rsatilmaydi
  state.questions = allQuestions.filter(q =>
    q.dataset.question === 'branch'
  );
}

// ============= SAVOLLAR OQIMINI YANGILASH (HA/YO'Q tanlangan keyin) =============
// YANGI TARTIB:
//   1. Tarmoq savol (boughtZalniya) — eng birinchi
//   2. Tarmoq savollari (yes yoki no)
//   3. Demografik savollar (ism+telefondan tashqari)
//   4. Yakuniy savollar (izoh)
//   5. Ism + Telefon — ENG OXIRIDA
function rebuildFlowAfterBranching(branchType) {
  state.branch = branchType;
  const allQuestions = Array.from(document.querySelectorAll('.question'));

  // 1. Tarmoq ajratuvchi savol (birinchi)
  const branchQuestion = allQuestions.filter(q => q.dataset.question === 'branch');

  // 2. Tarmoq savollari (yes yoki no)
  const branchQuestions = allQuestions.filter(q => q.dataset.section === branchType);

  // 3. Demografik savollar (ism+telefondan tashqari)
  const demographicQuestions = allQuestions.filter(q =>
    q.dataset.section === 'demographic' && q.dataset.question !== 'contact'
  );

  // 4. Yakuniy savollar (general + final-*)
  const finalQuestions = allQuestions.filter(q =>
    q.dataset.section === 'general' && q.dataset.question.startsWith('final')
  );

  // 5. Ism + Telefon savolini ENG OXIRIDA
  const contactQuestion = allQuestions.filter(q => q.dataset.question === 'contact');

  state.questions = [
    ...branchQuestion,
    ...branchQuestions,
    ...demographicQuestions,
    ...finalQuestions,
    ...contactQuestion
  ];

  // Progress va tugmalarni yangilash (yangi total bilan)
  updateProgress();
  updateButtons();
}

// ============= SAVOLNI KO'RSATISH =============
function showQuestion(index) {
  // Hammasini yashirish
  document.querySelectorAll('.question').forEach(q => q.classList.remove('active'));

  const question = state.questions[index];
  if (!question) return;

  question.classList.add('active');

  // Birinchi inputga focus
  setTimeout(() => {
    const firstInput = question.querySelector('input, textarea');
    if (firstInput && firstInput.type !== 'radio' && firstInput.type !== 'checkbox') {
      firstInput.focus();
    }
  }, 300);

  updateProgress();
  updateButtons();
}

// ============= PROGRESS YANGILASH =============
function updateProgress() {
  const total = state.questions.length;
  const current = state.currentIndex + 1;
  const percent = Math.round((current / total) * 100);

  progressFill.style.width = percent + '%';
  progressText.textContent = `${current} / ${total}`;
  progressPercent.textContent = percent + '%';
}

// ============= TUGMALARNI YANGILASH =============
function updateButtons() {
  const isFirst = state.currentIndex === 0;
  const isLast = state.currentIndex === state.questions.length - 1;

  prevBtn.disabled = isFirst;

  // Joriy savol "branching" bo'lsa — submitBtn ko'rsatmaymiz
  const currentQuestion = state.questions[state.currentIndex];
  const isBranching = currentQuestion && currentQuestion.classList.contains('branching');

  if (isLast && !isBranching) {
    nextBtn.classList.add('hidden');
    submitBtn.classList.remove('hidden');
  } else if (isBranching) {
    // Branching savolda hech qaysi tugma ko'rinmaydi — auto-advance kutamiz
    nextBtn.classList.add('hidden');
    submitBtn.classList.add('hidden');
  } else {
    nextBtn.classList.remove('hidden');
    submitBtn.classList.add('hidden');
  }
}

// ============= JORIY SAVOLNI VALIDATSIYA QILISH =============
function validateCurrentQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) return false;

  // Error xabarlarini tozalash
  question.querySelectorAll('.error-message').forEach(el => {
    el.classList.remove('show');
    el.textContent = '';
  });
  question.querySelectorAll('.text-input, .textarea-input').forEach(el => {
    el.classList.remove('error');
  });

  const requiredInputs = question.querySelectorAll('[required]');
  let valid = true;

  for (const input of requiredInputs) {
    // Radio uchun
    if (input.type === 'radio') {
      const name = input.name;
      const checked = question.querySelector(`input[name="${name}"]:checked`);
      if (!checked) {
        showError(question, 'Илтимос, биттасини танланг');
        valid = false;
        break;
      }
    }
    // Checkbox uchun
    else if (input.type === 'checkbox') {
      // Agar checkbox guruh bo'lsa (shu nomdagi checkbox'lar bir nechta) - kamida 1 ta belgilanishi kerak
      const sameNameCheckboxes = question.querySelectorAll(`input[type="checkbox"][name="${input.name}"]`);
      if (sameNameCheckboxes.length > 1) {
        const anyChecked = Array.from(sameNameCheckboxes).some(cb => cb.checked);
        if (!anyChecked) {
          showError(question, 'Илтимос, камида биттасини танланг');
          valid = false;
        }
        break; // guruhni 1 marta tekshirib, chiqib ketamiz
      } else {
        // Yagona checkbox (privacy va h.k.)
        if (!input.checked) {
          showError(question, 'Илтимос, белгиланг');
          valid = false;
        }
      }
    }
    // Matn uchun
    else if (input.type === 'text' || input.type === 'tel' || input.tagName === 'TEXTAREA') {
      const value = input.value.trim();
      if (!value) {
        input.classList.add('error');
        showError(question, 'Илтимос, жавоб беринг', input.name);
        valid = false;
      }
      // Telefon validatsiyasi
      else if (input.type === 'tel') {
        const phoneRegex = /^[\+\d\s\-\(\)]{9,}$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 9) {
          input.classList.add('error');
          showError(question, 'Телефон рақамни тўғри киритинг', input.name);
          valid = false;
        }
      }
      // Ism validatsiyasi
      else if (input.name === 'fullName' && value.length < 2) {
        input.classList.add('error');
        showError(question, 'Илтимос, исмингизни киритинг', input.name);
        valid = false;
      }
    }
  }

  // "Boshqa" tanlangan bo'lsa - matn kerak
  const otherRadio = question.querySelector('input[type="radio"][data-other]:checked');
  if (otherRadio) {
    const otherInput = question.querySelector('.other-input');
    if (otherInput && !otherInput.value.trim()) {
      otherInput.classList.add('error');
      showError(question, 'Илтимос, тўлдиринг');
      valid = false;
    }
  }

  // CONTACT savoli (ism + telefon, ixtiyoriy) - agar telefon yozilgan bo'lsa formatni tekshirish
  if (question.dataset.question === 'contact') {
    const phoneInput = question.querySelector('input[name="phone"]');
    if (phoneInput && phoneInput.value.trim()) {
      const value = phoneInput.value.trim();
      const phoneRegex = /^[\+\d\s\-\(\)]{9,}$/;
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 9) {
        phoneInput.classList.add('error');
        showError(question, 'Телефон рақамни тўғри киритинг ёки бўш қолдиринг', 'phone');
        valid = false;
      }
    }
  }

  return valid;
}

// ============= XATO XABARI KO'RSATISH =============
function showError(question, message, fieldName) {
  let errorEl;
  if (fieldName) {
    errorEl = question.querySelector(`[data-error="${fieldName}"]`);
  }
  if (!errorEl) {
    errorEl = question.querySelector('.error-message');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      question.appendChild(errorEl);
    }
  }
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

// ============= JAVOBLARNI SAQLASH =============
function saveCurrentAnswer() {
  const question = state.questions[state.currentIndex];
  if (!question) return;

  const inputs = question.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    if (input.type === 'radio' && input.checked) {
      state.answers[input.name] = input.value;
    } else if (input.type === 'checkbox') {
      if (input.name === 'privacyAgreed') {
        state.answers[input.name] = input.checked ? 'Ha' : 'Yo\'q';
      } else {
        // Multi-select checkbox uchun
        if (!state.answers[input.name]) state.answers[input.name] = [];
        if (input.checked) {
          if (Array.isArray(state.answers[input.name]) &&
              !state.answers[input.name].includes(input.value)) {
            state.answers[input.name].push(input.value);
          }
        } else {
          if (Array.isArray(state.answers[input.name])) {
            state.answers[input.name] = state.answers[input.name].filter(v => v !== input.value);
          }
        }
      }
    } else if (input.type === 'text' || input.type === 'tel' || input.tagName === 'TEXTAREA') {
      if (input.value.trim()) {
        state.answers[input.name] = input.value.trim();
      }
    }
  });
}

// ============= EVENTLAR =============
function bindEvents() {
  // Keyingi tugma
  nextBtn.addEventListener('click', handleNext);

  // Orqaga tugma
  prevBtn.addEventListener('click', handlePrev);

  // Yuborish tugma
  submitBtn.addEventListener('click', handleSubmit);

  // Tarmoqlanish savol
  document.querySelectorAll('input[name="boughtZalniya"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) {
        const branchType = input.value === 'Ha' ? 'yes' : 'no';
        rebuildFlowAfterBranching(branchType);
        // Rebuild bo'lgach, biroz kutib avtomatik keyingi savolga o'tamiz
        setTimeout(() => {
          handleNext();
        }, 400);
      }
    });
  });

  // "Boshqa" radio tanlash
  document.querySelectorAll('input[type="radio"][data-other]').forEach(input => {
    input.addEventListener('change', () => {
      const question = input.closest('.question');
      const otherInput = question.querySelector('.other-input');
      if (input.checked) {
        otherInput.classList.remove('hidden');
      }
    });
  });

  document.querySelectorAll('input[type="radio"]:not([data-other])').forEach(input => {
    input.addEventListener('change', () => {
      const question = input.closest('.question');
      const otherInput = question.querySelector('.other-input');
      if (otherInput) otherInput.classList.add('hidden');
    });
  });

  // Checkbox max-limit (max=3) + auto-advance
  document.querySelectorAll('.checkbox-group[data-max]').forEach(group => {
    const max = parseInt(group.dataset.max);
    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = group.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length >= max) {
          // Boshqalarni o'chirish
          checkboxes.forEach(other => {
            if (!other.checked) {
              other.disabled = true;
              other.closest('.checkbox-card').classList.add('disabled');
            }
          });
          // Max ga yetdi - avtomatik keyingi savolga
          setTimeout(() => {
            if (!nextBtn.classList.contains('hidden')) {
              handleNext();
            }
          }, 600);
        } else {
          checkboxes.forEach(other => {
            other.disabled = false;
            other.closest('.checkbox-card').classList.remove('disabled');
          });
        }
      });
    });
  });
  document.querySelectorAll('.checkbox-group[data-max]').forEach(group => {
    const max = parseInt(group.dataset.max);
    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = group.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length >= max) {
          checkboxes.forEach(other => {
            if (!other.checked) {
              other.disabled = true;
              other.closest('.checkbox-card').classList.add('disabled');
            }
          });
        } else {
          checkboxes.forEach(other => {
            other.disabled = false;
            other.closest('.checkbox-card').classList.remove('disabled');
          });
        }
      });
    });
  });

  // Enter bilan keyingi savol
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!nextBtn.classList.contains('hidden')) {
        handleNext();
      }
    }
  });

  // Radio tanlanganda avtomatik keyingiga
  document.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      // "Boshqa" bo'lsa avtomatik o'tmaydi (matn kiritish kerak)
      if (input.dataset.other) return;

      // Tarmoqlanish savol uchun alohida handler bor (yuqorida)
      if (input.name === 'boughtZalniya') return;

      // Boshqa radiolar tanlanganda 350ms keyin avtomatik o'tadi
      setTimeout(() => {
        if (input.checked && !nextBtn.classList.contains('hidden')) {
          handleNext();
        }
      }, 350);
    });
  });
}

// ============= KEYINGI =============
function handleNext() {
  if (!validateCurrentQuestion()) return;

  saveCurrentAnswer();

  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    showQuestion(state.currentIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ============= ORQAGA =============
function handlePrev() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    showQuestion(state.currentIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ============= YUBORISH =============
async function handleSubmit() {
  if (!validateCurrentQuestion()) return;

  saveCurrentAnswer();

  // ============= XAVFSIZLIK TEKSHIRUVLARI =============

  // 1. HONEYPOT TEKSHIRUVI - bot tuzog'i
  const honeypot = document.getElementById('website');
  if (honeypot && honeypot.value.trim() !== '') {
    console.warn('🚫 Honeypot ishga tushdi - bot urinishi');
    // Bot'ga muvaffaqiyatli ko'rsatamiz, lekin yubormamiz
    showSuccess();
    return;
  }

  // 2. VAQT TEKSHIRUVI - juda tez to'ldirilgan bo'lsa, bot
  const fillTime = Date.now() - state.startTime;
  if (fillTime < SECURITY.MIN_FILL_TIME_MS) {
    console.warn('🚫 Juda tez to\'ldirildi - bot shubhali');
    showSuccess(); // bot uchun fake success
    return;
  }

  // 3. RATE LIMIT - bir soatda ko'p yuborish
  if (!checkRateLimit()) {
    alert('Сиз жуда кўп марта уринмоқдасиз. Илтимос, 1 соат кутинг.');
    return;
  }

  // ============= MA'LUMOTLARNI TAYYORLASH =============
  state.answers.branch = state.branch;
  state.answers.timestamp = new Date().toISOString();
  state.answers.userAgent = navigator.userAgent;
  state.answers.fillTimeSeconds = Math.round(fillTime / 1000);

  // Multi-select bo'lgan checkbox'larni stringga aylantirish
  Object.keys(state.answers).forEach(key => {
    if (Array.isArray(state.answers[key])) {
      state.answers[key] = state.answers[key].join(', ');
    }
  });

  // Loader
  form.classList.add('hidden');
  document.querySelector('.form-actions').classList.add('hidden');
  document.querySelector('.progress-wrapper').classList.add('hidden');
  loader.classList.remove('hidden');

  try {
    await sendToGoogleSheets(state.answers);
    recordSubmit(); // rate limit uchun yozish
    showSuccess();
  } catch (err) {
    console.error('Yuborishda xatolik:', err);
    alert('Юборишда хатолик юз берди. Илтимос, қайта уринг.');
    loader.classList.add('hidden');
    form.classList.remove('hidden');
    document.querySelector('.form-actions').classList.remove('hidden');
    document.querySelector('.progress-wrapper').classList.remove('hidden');
  }
}

// ============= RATE LIMIT TEKSHIRUVI =============
function checkRateLimit() {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const stored = localStorage.getItem(SECURITY.RATE_LIMIT_KEY);
    let submits = stored ? JSON.parse(stored) : [];

    // Bir soatdan oldingi yozuvlarni o'chiramiz
    submits = submits.filter(t => t > oneHourAgo);

    if (submits.length >= SECURITY.MAX_SUBMITS_PER_HOUR) {
      return false;
    }
    return true;
  } catch (e) {
    return true; // localStorage ishlamasa, ruxsat beramiz
  }
}

function recordSubmit() {
  try {
    const stored = localStorage.getItem(SECURITY.RATE_LIMIT_KEY);
    const submits = stored ? JSON.parse(stored) : [];
    submits.push(Date.now());
    localStorage.setItem(SECURITY.RATE_LIMIT_KEY, JSON.stringify(submits));
  } catch (e) {
    // ignore
  }
}

// ============= GOOGLE SHEETS'GA YUBORISH =============
async function sendToGoogleSheets(data) {
  // Test rejimi
  if (GOOGLE_SCRIPT_URL.includes('PASTE_YOUR')) {
    console.log('🔧 Test rejimi');
    console.log('📊 Ma\'lumotlar:', data);
    await new Promise(r => setTimeout(r, 1500));
    return { ok: true };
  }

  // Origin'ni data ichida yuboramiz (no-cors header cheklovi sabab)
  const payload = {
    ...data,
    origin: window.location.origin,
  };

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return { ok: true };
  } catch (err) {
    console.error('Yuborishda xato:', err);
    throw err;
  }
}

// ============= MUVAFFAQIYATNI KO'RSATISH =============
function showSuccess() {
  loader.classList.add('hidden');
  successScreen.classList.remove('hidden');
  document.querySelector('.header').style.display = 'none';

  // YO'Q tarmog'i uchun aqlli tavsiya ko'rsatish
  if (state.branch === 'no' && typeof generateRecommendation === 'function') {
    try {
      // Foydalanuvchi javoblarini yig'amiz
      const formData = new FormData(form);
      const answers = { branch: state.branch };
      for (const [key, value] of formData.entries()) {
        if (answers[key]) {
          // Multi-select: vergul bilan birlashtiramiz
          answers[key] = answers[key] + ', ' + value;
        } else {
          answers[key] = value;
        }
      }

      const recommendation = generateRecommendation(answers);
      if (recommendation) {
        const recHtml = renderRecommendation(recommendation);
        const recContainer = document.getElementById('recommendationContainer');
        if (recContainer) {
          recContainer.innerHTML = recHtml;
          recContainer.classList.remove('hidden');
        }
      }
    } catch (e) {
      console.error('Tavsiya yaratishda xato:', e);
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============= INITIALIZATSIYA =============
document.addEventListener('DOMContentLoaded', init);
