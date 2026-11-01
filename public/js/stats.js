const statsForm = document.getElementById('stats-filter');
const statsError = document.getElementById('stats-error');
const statsSummary = document.getElementById('stats-summary');
const statsSeries = document.getElementById('stats-series');
const today = new Date();
const summaryLabels = {
  entries: 'Lượt xe vào',
  exits: 'Lượt xe ra',
  ticketRevenue: 'Doanh thu vé',
  casualParkingRevenue: 'Doanh thu gửi xe lượt',
  availableSlots: 'Vị trí còn trống',
  occupiedSlots: 'Vị trí đang có xe'
};
const isoDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
statsForm.elements.from.value = isoDate(today);
statsForm.elements.to.value = isoDate(today);
statsForm.elements.to.min = statsForm.elements.from.value;
statsForm.elements.from.addEventListener('change', () => {
  statsForm.elements.to.min = statsForm.elements.from.value;
});

function addCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = String(value);
  row.append(cell);
}

statsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statsError.classList.add('hidden');
  if (statsForm.elements.from.value > statsForm.elements.to.value) {
    statsError.textContent = 'Ngày bắt đầu không được sau ngày kết thúc.';
    statsError.classList.remove('hidden');
    return;
  }
  const query = new URLSearchParams(new FormData(statsForm));
  try {
    const response = await fetch(`/stats/report?${query}`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) {
      statsError.textContent = result.message || 'Không thể tải báo cáo.';
      statsError.classList.remove('hidden');
      return;
    }
    statsSummary.replaceChildren();
    Object.entries(result.data.summary).forEach(([name, value]) => {
      const card = document.createElement('div');
      card.className = 'col-span-12 md:col-span-4 lg:col-span-2';
      const body = document.createElement('div');
      body.className = 'ui-card h-full';
      const content = document.createElement('div');
      content.className = 'ui-card-body';
      const label = document.createElement('div');
      label.className = 'text-sm text-slate-600';
      label.textContent = summaryLabels[name] || name;
      const number = document.createElement('div');
      number.className = 'font-bold';
      number.textContent = name.endsWith('Revenue') ? `${value} VND` : String(value);
      content.append(label, number);
      body.append(content);
      card.append(body);
      statsSummary.append(card);
    });
    statsSeries.replaceChildren();
    result.data.series.forEach((item) => {
      const row = document.createElement('tr');
      ['period', 'entries', 'exits', 'ticketRevenue', 'casualParkingRevenue'].forEach((key) => addCell(row, item[key]));
      statsSeries.append(row);
    });
  } catch (error) {
    statsError.textContent = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
    statsError.classList.remove('hidden');
  }
});
