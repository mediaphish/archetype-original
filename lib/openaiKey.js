export function getOpenAiKey() {
  const key = process.env.OPEN_API_KEY;
  if (key && String(key).trim()) return String(key).trim();
  return '';
}

