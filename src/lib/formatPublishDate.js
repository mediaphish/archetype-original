/**
 * Format a publish date string for display (e.g. "June 12, 2026").
 * Parses YYYY-MM-DD as local date to avoid timezone shifts.
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  let dateStr = String(dateString);

  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  if (dateStr.includes(' ')) {
    dateStr = dateStr.split(' ')[0];
  }

  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
