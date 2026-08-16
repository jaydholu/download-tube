export const API_BASE = import.meta.env.PROD ? '' : '';

async function errorDetailOrNull(res, fallback) {
  if (res.ok)
    return null;

  try {
    const err = await res.json();
    return err.detail || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchVideoInfo(url) {
  const res = await fetch(`${API_BASE}/api/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const err = await errorDetailOrNull(res, 'Failed to fetch info');

  if (err)
    throw new Error(err);

  return res.json();
}

export async function startDownload(url, format, quality) {
  const res = await fetch(`${API_BASE}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format, quality: quality === 'auto' ? null : quality }),
  });
  const err = await errorDetailOrNull(res, 'Failed to start download');

  if (err)
    throw new Error(err);
  
  return res.json();
}

export async function fetchDownloadStatus(taskId) {
  const res = await fetch(`${API_BASE}/api/status/${taskId}`);
  return res.json();
}

export async function fetchTranscript(url) {
  const res = await fetch(`${API_BASE}/api/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const err = await errorDetailOrNull(res, 'No transcript available');

  if (err) 
    throw new Error(err);

  return res.json();
}

export function fileUrl(taskId) {
  return `${API_BASE}/api/file/${taskId}`;
}

export function triggerFileSave(taskId) {
  const link = document.createElement('a');

  link.href = fileUrl(taskId);
  link.download = '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
