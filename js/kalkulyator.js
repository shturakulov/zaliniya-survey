/* ============================================
   IPOTEKA/RASROCHKA KALKULYATORI
   Real-time hisoblash + chart
   ============================================ */

// ============= DOM ELEMENTS =============
const housePriceSlider = document.getElementById('housePrice');
const housePriceInput = document.getElementById('housePriceInput');
const housePriceDisplay = document.getElementById('housePriceDisplay');

const downPaymentSlider = document.getElementById('downPayment');
const downPaymentInput = document.getElementById('downPaymentInput');
const downPaymentDisplay = document.getElementById('downPaymentDisplay');
const downPaymentPercent = document.getElementById('downPaymentPercent');
const downPaymentMax = document.getElementById('downPaymentMax');

const termSlider = document.getElementById('termMonths');
const termDisplay = document.getElementById('termDisplay');
const termYears = document.getElementById('termYears');

const monthlyPayment = document.getElementById('monthlyPayment');
const monthlyHint = document.getElementById('monthlyHint');
const loanAmount = document.getElementById('loanAmount');
const totalPaid = document.getElementById('totalPaid');
const totalInterest = document.getElementById('totalInterest');
const comparisonList = document.getElementById('comparisonList');

let paymentChartInstance = null;

// ============= UTIL =============
function formatMln(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.?0+$/, '') + ' млрд';
  }
  return num.toLocaleString('uz-UZ').replace(',', ' ') + ' млн';
}

function formatNumber(num) {
  return Number(num).toLocaleString('uz-UZ').replace(',', ' ');
}

function getYearLabel(months) {
  if (months < 12) return `${months} ой`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (remainMonths === 0) return `${years} йил`;
  return `${years} й. ${remainMonths} ой`;
}

// ============= ASOSIY HISOBLASH =============
function calculatePayment(principal, annualRate, months) {
  if (annualRate === 0) {
    // Foizsiz rasrochka
    return {
      monthly: principal / months,
      total: principal,
      interest: 0,
    };
  }

  const monthlyRate = annualRate / 100 / 12;
  const monthlyPay = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                     (Math.pow(1 + monthlyRate, months) - 1);
  const total = monthlyPay * months;
  const interest = total - principal;

  return {
    monthly: monthlyPay,
    total: total,
    interest: interest,
  };
}

// ============= ASOSIY YANGILASH =============
function updateCalculation() {
  const housePrice = parseFloat(housePriceSlider.value);
  let downPayment = parseFloat(downPaymentSlider.value);
  const termMonths = parseInt(termSlider.value);
  const rate = parseFloat(document.querySelector('input[name="rateType"]:checked').value);

  // Down payment cheklash (uy narxidan ko'p bo'lmasin)
  if (downPayment > housePrice) {
    downPayment = housePrice;
    downPaymentSlider.value = housePrice;
    downPaymentInput.value = housePrice;
  }

  // Down payment max'ni dinamik qilamiz
  downPaymentSlider.max = housePrice;
  downPaymentMax.textContent = formatNumber(housePrice) + ' млн';

  // Display yangilash
  housePriceDisplay.textContent = formatNumber(housePrice);
  housePriceInput.value = housePrice;

  downPaymentDisplay.textContent = formatNumber(downPayment);
  downPaymentInput.value = downPayment;
  const dpPercent = housePrice > 0 ? Math.round((downPayment / housePrice) * 100) : 0;
  downPaymentPercent.textContent = dpPercent;

  termDisplay.textContent = termMonths;
  termYears.textContent = getYearLabel(termMonths);

  // Hisoblash
  const principal = housePrice - downPayment;
  const result = calculatePayment(principal, rate, termMonths);

  // Natijani ko'rsatish
  monthlyPayment.textContent = result.monthly.toFixed(2);
  monthlyHint.textContent = `${termMonths} ойга ${rate === 0 ? 'расрочка' : rate + '% фоизли ипотека'}`;
  loanAmount.textContent = formatNumber(Math.round(principal)) + ' млн';
  totalPaid.textContent = formatNumber(Math.round(downPayment + result.total)) + ' млн';
  totalInterest.textContent = formatNumber(Math.round(result.interest)) + ' млн';

  // Chart yangilash
  updateChart(downPayment, principal, result.interest);

  // Comparison yangilash
  updateComparison(principal, termMonths, rate);
}

// ============= CHART =============
function updateChart(downPayment, principal, interest) {
  const canvas = document.getElementById('paymentChart');
  if (!canvas) return;

  if (paymentChartInstance) {
    paymentChartInstance.destroy();
  }

  const data = {
    labels: interest > 0
      ? ['Бошланғич тўлов', 'Кредит асосий', 'Фоизлар']
      : ['Бошланғич тўлов', 'Кредит асосий'],
    datasets: [{
      data: interest > 0
        ? [downPayment, principal, interest]
        : [downPayment, principal],
      backgroundColor: interest > 0
        ? ['#2D5F4F', '#C8956D', '#D9A441']
        : ['#2D5F4F', '#C8956D'],
      borderColor: '#FFFCF5',
      borderWidth: 3,
    }],
  };

  paymentChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 12,
            usePointStyle: true,
            font: { size: 12, family: 'Manrope' },
            color: '#5C5048',
          },
        },
        tooltip: {
          backgroundColor: '#2D5F4F',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatNumber(Math.round(ctx.parsed))} млн сўм`,
          },
        },
      },
    },
  });
}

// ============= COMPARISON =============
function updateComparison(principal, months, currentRate) {
  if (!comparisonList) return;

  const rates = [
    { rate: 0, name: 'Расрочка', meta: 'Фоизсиз' },
    { rate: 8, name: 'Имтиёзли ипотека', meta: '8% / йил' },
    { rate: 18, name: 'Банк ипотекаси', meta: '18% / йил' },
  ];

  comparisonList.innerHTML = rates.map(r => {
    const result = calculatePayment(principal, r.rate, months);
    const isCurrent = r.rate === currentRate;
    return `
      <div class="comparison-item ${isCurrent ? 'is-current' : ''}">
        <div class="comparison-name">
          ${r.name}
          <small>${r.meta}</small>
        </div>
        <div class="comparison-value">${result.monthly.toFixed(2)} млн/ой</div>
      </div>
    `;
  }).join('');
}

// ============= EVENT LISTENERS =============
function bindEvents() {
  // House price
  housePriceSlider.addEventListener('input', updateCalculation);
  housePriceInput.addEventListener('input', () => {
    let val = parseFloat(housePriceInput.value) || 0;
    if (val < parseFloat(housePriceSlider.min)) val = parseFloat(housePriceSlider.min);
    if (val > parseFloat(housePriceSlider.max)) val = parseFloat(housePriceSlider.max);
    housePriceSlider.value = val;
    updateCalculation();
  });

  // Down payment
  downPaymentSlider.addEventListener('input', updateCalculation);
  downPaymentInput.addEventListener('input', () => {
    let val = parseFloat(downPaymentInput.value) || 0;
    if (val < 0) val = 0;
    const maxDP = parseFloat(housePriceSlider.value);
    if (val > maxDP) val = maxDP;
    downPaymentSlider.value = val;
    updateCalculation();
  });

  // Term
  termSlider.addEventListener('input', updateCalculation);

  // Rate options
  document.querySelectorAll('input[name="rateType"]').forEach(input => {
    input.addEventListener('change', () => {
      // Visual feedback
      document.querySelectorAll('.rate-card').forEach(card => {
        card.classList.remove('active');
      });
      input.closest('.rate-card').classList.add('active');
      updateCalculation();
    });
  });
}

// ============= START =============
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  updateCalculation();
});
