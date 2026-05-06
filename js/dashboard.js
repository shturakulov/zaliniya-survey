/* ============================================
   DASHBOARD - CHARTLAR VA STATISTIKA
   ============================================ */

// ============= GOOGLE APPS SCRIPT URL =============
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyne6ukDw2KH2I37jDN_WM06KZjNnFDD7W4sNE01ADaO22yMUM-Z5jauQB9ZBt7xAke/exec';

// ============= XAVFSIZLIK =============
// Dashboard uchun parol orqali himoyalangan, qo'shimcha token kerak emas

// ============= DASHBOARD PAROL (HASH KO'RINISHIDA) =============
// SHA-256 hash: kodda asl parol ko'rinmaydi
// Parolni o'zgartirish uchun README.md ga qarang
const DASHBOARD_PASSWORD_HASH = '4e6f15dd773b65754289333312b4ea43748473c29c53b6d0b80ac393a73c19a3';

// ============= SESSION SOZLAMALARI =============
const SESSION_KEY = 'zln_dash_session';
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 soat

// Rang palitrasi (qulay/issiq dizayn uchun)
const COLORS = {
  primary: '#2D5F4F',
  primaryLight: '#3D7A66',
  accent: '#C8956D',
  accentDark: '#A67B5B',
  accentLight: '#E5C9A8',
  beige: '#F4ECDD',
  brown: '#8B6F47',
  green: '#5C8A6E',
  rust: '#C44536',
  amber: '#D9A441',
  sage: '#9CAF88',
  rose: '#C7846E',
};

const PALETTE = [
  COLORS.primary,
  COLORS.accent,
  COLORS.primaryLight,
  COLORS.accentDark,
  COLORS.brown,
  COLORS.green,
  COLORS.amber,
  COLORS.sage,
  COLORS.rose,
  COLORS.rust,
  COLORS.accentLight,
];

// Chart.js global default
Chart.defaults.font.family = "'Manrope', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#5C5048';
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.boxHeight = 12;
Chart.defaults.plugins.legend.labels.usePointStyle = true;

// Holat
let chartsRegistry = {};
let allResponses = [];

// ============= PAROL TEKSHIRISH (SHA-256) =============
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============= SESSION TEKSHIRUVI =============
function checkSession() {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return false;
    const data = JSON.parse(session);
    if (Date.now() > data.expires) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function createSession() {
  const sessionData = {
    expires: Date.now() + SESSION_DURATION_MS,
    created: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

// ============= LOGIN FORMA =============
async function handleLogin(e) {
  e.preventDefault();
  const passwordInput = document.getElementById('dashPassword');
  const errorEl = document.getElementById('loginError');
  const password = passwordInput.value;

  errorEl.textContent = '';
  errorEl.classList.remove('show');

  if (!password) {
    errorEl.textContent = 'Илтимос, паролни киритинг';
    errorEl.classList.add('show');
    return;
  }

  const hash = await hashPassword(password);

  if (hash === DASHBOARD_PASSWORD_HASH) {
    createSession();
    showDashboard();
  } else {
    errorEl.textContent = 'Парол нотўғри';
    errorEl.classList.add('show');
    passwordInput.value = '';

    // Brute-force himoya: 3 marta xato bo'lsa, 30 sekund kutish
    const failKey = 'zln_login_fails';
    const fails = parseInt(localStorage.getItem(failKey) || '0') + 1;
    localStorage.setItem(failKey, fails.toString());

    if (fails >= 3) {
      passwordInput.disabled = true;
      errorEl.textContent = 'Жуда кўп уриниш. 30 сония кутинг...';
      setTimeout(() => {
        passwordInput.disabled = false;
        passwordInput.focus();
        localStorage.setItem(failKey, '0');
      }, 30000);
    }
  }
}

function showDashboard() {
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('dashboardMain').classList.remove('hidden');
  initDashboard();
}

// ============= INIT =============
async function initDashboard() {
  await loadData();
}

// ============= MA'LUMOTLARNI YUKLASH =============
async function loadData() {
  const loaderEl = document.getElementById('dashLoader');
  const emptyEl = document.getElementById('emptyState');
  const contentEl = document.getElementById('dashContent');
  const refreshBtn = document.getElementById('refreshBtn');

  loaderEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  contentEl.classList.add('hidden');
  refreshBtn.classList.add('loading');

  try {
    // Test rejimi - localStorage'dan yoki demo data
    if (GOOGLE_SCRIPT_URL.includes('PASTE_YOUR')) {
      console.log('🔧 Test rejimi: demo ma\'lumotlar');
      allResponses = generateDemoData();
    } else {
      // Origin header avtomatik qo'shiladi (sayt domeni orqali himoya)
      const url = `${GOOGLE_SCRIPT_URL}?action=getData&origin=${encodeURIComponent(window.location.origin)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'Server xatosi');
      }

      allResponses = data.responses || [];
    }

    loaderEl.classList.add('hidden');
    refreshBtn.classList.remove('loading');

    if (allResponses.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    contentEl.classList.remove('hidden');
    renderDashboard();
  } catch (err) {
    console.error('Xatolik:', err);
    loaderEl.classList.add('hidden');
    refreshBtn.classList.remove('loading');
    emptyEl.classList.remove('hidden');
  }
}

// ============= DEMO MA'LUMOTLAR (test uchun) =============
function generateDemoData() {
  const ages = ['18-25', '26-35', '36-45', '46-55', '55+'];
  const incomes = ['5 mln gacha', '5-10 mln', '10-20 mln', '20-50 mln', '50 mln+'];
  const branches = ['yes', 'no'];
  const houseConditions = ['Karobka', 'White Box', 'Tayyor ta\'mirlangan'];
  const rooms = ['1', '2', '3', '4+'];
  const downPayments = ['50 mln gacha', '50-100 mln', '100-150 mln', '150-200 mln', '200 mln+'];
  const monthlies = ['6-7 mln', '8 mln', '9 mln', '10-11 mln', '12-14 mln', '15 mln+'];
  const factors = ['Narx', 'Joylashuv', 'Quruvchi ishonchliligi', 'Infratuzilma', 'To\'lov shartlari'];
  const motivations = ['Ijara', 'Investitsiya', 'Katta oilamiz'];
  const timelines = ['Shoshilinch', '1-2 yil', 'Yo\'q'];
  const professions = ['Tadbirkor', 'Davlat xizmatchisi', 'IT', 'Qurilish', 'Savdo', 'Tibbiyot', 'Ta\'lim'];
  const purposes = ['Yashash', 'Investitsiya', 'Bola-chaqaga', 'Ijaraga berish'];
  const reasons = ['Narxi', 'Joylashuvi', 'Quruvchi ishonchliligi', 'To\'lov shartlari', 'Aksiya va chegirmalar', 'Qurilish sifati'];
  const projects = ['Zuhal', 'Dargoh', 'Rail City', 'Nova House', 'Jahon House', 'Muborak TJM', 'Izmir (Global Avenue)', 'Orifon (Elite Building)', 'Tiffany', 'Shahriston', 'Afrosiyob TJM'];
  const pricesPerSqm = ['7-8 mln', '8-9 mln', '10-11 mln', '12 mln+'];
  const yesMonthlies = ['6-7 mln', '8-9 mln', '10-12 mln', '13 mln+'];
  const regions = ['Samarqand shahri', 'Kattaqo\'rg\'on shahri', 'Bulung\'ur tumani', 'Jomboy tumani', 'Ishtixon tumani', 'Pastdarg\'om tumani', 'Samarqand tumani', 'Toyloq tumani', 'Urgut tumani', 'Payariq tumani'];
  const visitedOptions = ['Ha', 'Yo\'q'];
  const sampleQuestions = [
    'Qurilish kechikadimi?',
    'Hujjatlar qaysi tartibda beriladi?',
    'To\'lov muddatini uzaytirish mumkinmi?',
    'Loyihaning lisenziyasi bormi?',
    'Sifat kafolati bormi?',
    'Aksiyalar qachon bo\'ladi?',
  ];

  const sampleComments = [
    'Yaxshi loyiha bo\'lsa, narxi qulay bo\'lsa qiziqaman',
    'Ko\'proq ma\'lumot bering joylashuv haqida',
    'Bog\'lansangiz xursand bo\'laman',
    'Iltimos, Telegram orqali ham aloqa imkoni bo\'lsin',
  ];

  const data = [];
  const total = 47;

  for (let i = 0; i < total; i++) {
    const branch = branches[Math.random() > 0.7 ? 0 : 1];
    const daysAgo = Math.floor(Math.random() * 14);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const entry = {
      timestamp: date.toISOString(),
      fullName: `Mijoz ${i + 1}`,
      phone: `+998 ${90 + Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
      age: ages[Math.floor(Math.random() * ages.length)],
      gender: Math.random() > 0.4 ? 'Erkak' : 'Ayol',
      profession: professions[Math.floor(Math.random() * professions.length)],
      income: incomes[Math.floor(Math.random() * incomes.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      branch: branch,
    };

    if (branch === 'yes') {
      entry.yes_projectName = projects[Math.floor(Math.random() * projects.length)];
      entry.yes_rooms = rooms[Math.floor(Math.random() * rooms.length)];
      entry.yes_pricePerSqm = pricesPerSqm[Math.floor(Math.random() * pricesPerSqm.length)];
      entry.yes_monthlyPayment = yesMonthlies[Math.floor(Math.random() * yesMonthlies.length)];
      // 2-3 ta sabab
      const reasonCount = 2 + Math.floor(Math.random() * 2);
      const selectedReasons = [...reasons].sort(() => 0.5 - Math.random()).slice(0, reasonCount);
      entry.yes_reasons = selectedReasons.join(', ');
    } else {
      entry.no_houseCondition = houseConditions[Math.floor(Math.random() * houseConditions.length)];
      entry.no_rooms = rooms[Math.floor(Math.random() * rooms.length)];
      entry.no_downPayment = downPayments[Math.floor(Math.random() * downPayments.length)];
      entry.no_monthlyPayment = monthlies[Math.floor(Math.random() * monthlies.length)];
      entry.no_motivation = motivations[Math.floor(Math.random() * motivations.length)];
      entry.no_planTimeline = timelines[Math.floor(Math.random() * timelines.length)];
      entry.no_purpose = purposes[Math.floor(Math.random() * purposes.length)];
      entry.no_visitedOffice = visitedOptions[Math.floor(Math.random() * visitedOptions.length)];
      if (Math.random() > 0.6) {
        entry.no_questions = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
      }

      // Multi-select
      const factorsCount = 1 + Math.floor(Math.random() * 3);
      entry.no_factors = [...factors].sort(() => 0.5 - Math.random()).slice(0, factorsCount).join(', ');
    }

    if (Math.random() > 0.7) {
      entry.comments = sampleComments[Math.floor(Math.random() * sampleComments.length)];
    }

    data.push(entry);
  }

  return data;
}

// ============= DASHBOARD CHIZISH =============
function renderDashboard() {
  renderStats();
  renderCharts();
  renderOpenAnswers();
  renderLeadsTable();
}

// ============= STAT KARTOCHKALAR =============
function renderStats() {
  const total = allResponses.length;
  document.getElementById('statTotal').textContent = total;

  // Bugungi
  const today = new Date().toDateString();
  const todayCount = allResponses.filter(r => new Date(r.timestamp).toDateString() === today).length;
  document.getElementById('statToday').textContent = todayCount;

  // Zaliniyadan uy olganlar
  const boughtCount = allResponses.filter(r => r.branch === 'yes').length;
  const boughtPct = total > 0 ? Math.round((boughtCount / total) * 100) : 0;
  document.getElementById('statBought').textContent = boughtPct + '%';
  document.getElementById('statBoughtCount').textContent = boughtCount + ' ta odam';

  // Telefon qoldirganlar (lidlar)
  const contactCount = allResponses.filter(r => r.phone && String(r.phone).trim().length > 0).length;
  const contactPct = total > 0 ? Math.round((contactCount / total) * 100) : 0;
  document.getElementById('statContact').textContent = contactPct + '%';
  document.getElementById('statContactCount').textContent = contactCount + ' ta lid';
}

// ============= CHARTLARNI CHIZISH =============
function renderCharts() {
  // Avval mavjud chartlarni o'chiramiz
  Object.values(chartsRegistry).forEach(c => c.destroy && c.destroy());
  chartsRegistry = {};

  // 1. Yosh
  drawChart('chartAge', 'doughnut', countBy('age'), {
    legendPosition: 'right'
  });

  // 1b. Hudud (region)
  drawChart('chartRegion', 'bar', countBy('region'), {
    horizontal: true,
    multiColor: true,
  });

  // 2. Daromad
  drawChart('chartIncome', 'bar', countBy('income'), {
    horizontal: false,
    color: COLORS.primary,
  });

  // 3. Uy holati (faqat NO tarmoq)
  drawChart('chartHouseCondition', 'pie', countBy('no_houseCondition'), {
    legendPosition: 'right'
  });

  // 4. Necha xonali (NO tarmoq)
  drawChart('chartRooms', 'bar', countBy('no_rooms'), {
    color: COLORS.accent,
  });

  // 5. Boshlang'ich to'lov
  drawChart('chartDownPayment', 'bar', countBy('no_downPayment'), { color: COLORS.brown });

  // 6. Oylik to'lov
  drawChart('chartMonthly', 'bar', countBy('no_monthlyPayment'), { color: COLORS.amber });

  // 7. Tanlov omillari (multi-select)
  drawChart('chartFactors', 'bar', countByMulti('no_factors'), {
    horizontal: true,
    color: COLORS.primary,
  });

  // 12. Motivatsiya
  drawChart('chartMotivation', 'doughnut', countBy('no_motivation'), { legendPosition: 'right' });

  // 13. Reja
  drawChart('chartTimeline', 'bar', countBy('no_planTimeline'), { color: COLORS.primaryLight });

  // 14. Kasb
  drawChart('chartProfession', 'doughnut', countBy('profession'), { legendPosition: 'right' });

  // 15. Maqsad
  drawChart('chartPurpose', 'pie', countBy('no_purpose'), { legendPosition: 'right' });

  // HA TARMOG'I
  // 16. Loyihalar (qaysi loyihadan uy olingan)
  drawChart('chartYesProject', 'bar', countBy('yes_projectName'), {
    horizontal: true,
    multiColor: true,
  });

  // 17. Olingan xonalar
  drawChart('chartYesRooms', 'doughnut', countBy('yes_rooms'), { legendPosition: 'right' });

  // 18. Kvadrat metr narxi
  drawChart('chartYesPricePerSqm', 'bar', countBy('yes_pricePerSqm'), { color: COLORS.green });

  // 19. Oylik to'lov (HA tarmog'i)
  drawChart('chartYesMonthlyPayment', 'bar', countBy('yes_monthlyPayment'), { color: COLORS.amber });

  // 20. Tanlash sabablari (multi)
  drawChart('chartYesReasons', 'bar', countByMulti('yes_reasons'), {
    horizontal: true,
    multiColor: true,
  });
}

// ============= HISOBLASH FUNKSIYALARI =============
function countBy(field) {
  const counts = {};
  allResponses.forEach(r => {
    const val = r[field];
    if (val) {
      counts[val] = (counts[val] || 0) + 1;
    }
  });
  // Saralangan tarzda qaytaramiz
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(x => x[0]),
    values: sorted.map(x => x[1]),
  };
}

function countByMulti(field) {
  const counts = {};
  allResponses.forEach(r => {
    const val = r[field];
    if (val) {
      const items = String(val).split(',').map(x => x.trim()).filter(Boolean);
      items.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
      });
    }
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(x => x[0]),
    values: sorted.map(x => x[1]),
  };
}

// ============= UNIVERSAL CHART CHIZISH =============
function drawChart(canvasId, type, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (data.labels.length === 0) {
    // Bo'sh
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = COLORS.brown;
    ctx.font = '14px Manrope';
    ctx.textAlign = 'center';
    ctx.fillText('Ҳозирча маълумот йўқ', canvas.width / 2, canvas.height / 2);
    return;
  }

  let datasets;
  let chartType = type;

  if (type === 'bar') {
    const isHorizontal = options.horizontal;
    datasets = [{
      label: 'Javoblar',
      data: data.values,
      backgroundColor: options.multiColor
        ? data.labels.map((_, i) => PALETTE[i % PALETTE.length])
        : (options.color || COLORS.primary),
      borderRadius: 6,
      borderSkipped: false,
    }];
  } else {
    // pie / doughnut
    datasets = [{
      data: data.values,
      backgroundColor: data.labels.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: '#FFFCF5',
      borderWidth: 2,
    }];
  }

  const config = {
    type: chartType,
    data: {
      labels: data.labels,
      datasets: datasets,
    },
    options: {
      indexAxis: options.horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type !== 'bar',
          position: options.legendPosition || 'bottom',
        },
        tooltip: {
          backgroundColor: COLORS.primary,
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
        },
      },
      scales: type === 'bar' ? {
        x: {
          grid: { display: !options.horizontal, color: '#E8DFD0' },
          ticks: { color: '#5C5048' },
        },
        y: {
          grid: { display: options.horizontal ? false : true, color: '#E8DFD0' },
          ticks: { color: '#5C5048' },
          beginAtZero: true,
        },
      } : {},
    },
  };

  // Eski chartni o'chiramiz
  if (chartsRegistry[canvasId]) {
    chartsRegistry[canvasId].destroy();
  }
  chartsRegistry[canvasId] = new Chart(canvas, config);
}

// ============= OCHIQ JAVOBLAR =============
function renderOpenAnswers() {
  // Izohlar
  const comments = allResponses
    .filter(r => r.comments && r.comments.trim())
    .map(r => ({
      name: r.fullName || 'Аноним',
      date: r.timestamp,
      text: r.comments,
    }));

  const commentsList = document.getElementById('commentsList');
  if (commentsList) {
    commentsList.innerHTML = comments.length > 0
      ? comments.map(c => `
          <div class="answer-item">
            <div class="answer-meta">
              <span><strong>${escapeHtml(c.name)}</strong></span>
              <span>${formatDate(c.date)}</span>
            </div>
            <div class="answer-text">${escapeHtml(c.text)}</div>
          </div>
        `).join('')
      : '<p class="answers-empty">Ҳозирча изоҳлар йўқ</p>';
    commentsList.classList.remove('hidden');
  }
}

// ============= LIDLAR JADVALI =============
function renderLeadsTable() {
  const leads = allResponses
    .filter(r => r.phone && String(r.phone).trim().length > 0)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  const tbody = document.getElementById('leadsBody');
  if (leads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Лидлар йўқ</td></tr>';
    return;
  }

  tbody.innerHTML = leads.map(l => `
    <tr>
      <td>${formatDate(l.timestamp)}</td>
      <td><strong>${escapeHtml(l.fullName || '—')}</strong></td>
      <td><span class="lead-phone">${escapeHtml(l.phone || '—')}</span></td>
      <td>${escapeHtml(l.age || '—')}</td>
      <td>${escapeHtml(l.income || '—')}</td>
      <td>
        <span class="lead-tag ${l.branch === 'yes' ? 'lead-tag-yes' : 'lead-tag-no'}">
          ${l.branch === 'yes' ? 'Уй олган' : 'Олмаган'}
        </span>
      </td>
    </tr>
  `).join('');
}

// ============= UTILITY =============
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============= EVENTLAR =============
document.getElementById('refreshBtn').addEventListener('click', loadData);
document.getElementById('loginForm').addEventListener('submit', handleLogin);

// ============= START =============
document.addEventListener('DOMContentLoaded', () => {
  // Avval session tekshiramiz
  if (checkSession()) {
    // Allaqachon kirgan
    showDashboard();
  } else {
    // Login formasini ko'rsatamiz
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('dashboardMain').classList.add('hidden');
    setTimeout(() => {
      document.getElementById('dashPassword').focus();
    }, 300);
  }
});
