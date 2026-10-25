function partsInBusinessTimeZone(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function formatMysqlDateTime(date = new Date()) {
  const parts = partsInBusinessTimeZone(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function formatBusinessDate(date = new Date()) {
  const parts = partsInBusinessTimeZone(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatIsoWithOffset(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${formatMysqlDateTime(date).replace(' ', 'T')}+07:00`;
}

module.exports = { formatMysqlDateTime, formatBusinessDate, formatIsoWithOffset };
