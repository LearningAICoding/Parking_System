const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function partsOf(date) {
  return Object.fromEntries(dateParts.formatToParts(date).map((part) => [part.type, part.value]));
}

// Ngày nghiệp vụ YYYY-MM-DD theo giờ Việt Nam
function toBusinessDate(date = new Date()) {
  const { year, month, day } = partsOf(date);
  return `${year}-${month}-${day}`;
}

// Thời điểm ISO 8601 kèm offset +07:00 (AGENTS.md mục 3)
function toBusinessIso(date) {
  if (!date) return null;
  const { year, month, day, hour, minute, second } = partsOf(new Date(date));
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;
}

module.exports = { BUSINESS_TIME_ZONE, toBusinessDate, toBusinessIso };
