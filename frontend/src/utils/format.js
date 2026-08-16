export function formatDuration(seconds) {
  if (!seconds)
    return '0:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatViews(n) {
  if (!n)
    return '0';

  if (n >= 1e9)
    return (n / 1e9).toFixed(1) + 'B';
  
  if (n >= 1e6)
    return (n / 1e6).toFixed(1) + 'M';
  
  if (n >= 1e3)
    return (n / 1e3).toFixed(1) + 'K';
  
  return n.toString();
}
