const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function toBusinessDate(value) {
  if (value instanceof Date) return value;
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T00:00:00+07:00`);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text)) return new Date(`${text.replace(' ', 'T')}+07:00`);
  return new Date(value);
}

function toIsoWithOffset(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

function dateOnlyInBusinessZone(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(value);
}

module.exports = { BUSINESS_TIME_ZONE, toBusinessDate, toIsoWithOffset, dateOnlyInBusinessZone };
