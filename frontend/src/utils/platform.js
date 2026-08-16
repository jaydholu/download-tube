// Mirrors backend's utils.detect_platform() so the UI can react to a pasted link before ever calling the API.
export function detectPlatform(url) {
  if (!url)
    return null;

  if (/(youtube\.com|youtu\.be)/i.test(url))
    return 'youtube';

  if (/instagram\.com\/(reel|reels|p|tv)\//i.test(url))
    return 'instagram';

  return null;
}

// Finds every recognizable YouTube/Instagram link inside a blob of pasted text,
// regardless of surrounding text or how links are separated (newlines, spaces, commas...).
// This is a dependency-free equivalent of a general-purpose URL-extraction library,
// deliberately scoped to just the two domains this app supports rather than pulling in a
// package that needs its own runtime-fetched TLD list for a job this narrow.
const LINK_PATTERN = /https?:\/\/[^\s"'<>]*(?:youtube\.com|youtu\.be|instagram\.com)[^\s"'<>]*/gi;

export function extractUrls(text) {
  if (!text)
    return [];

  const matches = text.match(LINK_PATTERN) || [];
  const seen = new Set();
  const result = [];

  for (const raw of matches) {
    // Trim common trailing punctuation that isn't part of the URL itself
    // (e.g. a link followed by a period or closing parenthesis in prose).
    const cleaned = raw.replace(/[),.;!?]+$/, '');
    const platform = detectPlatform(cleaned);

    if (!platform || seen.has(cleaned))
      continue;

    seen.add(cleaned);
    result.push({ url: cleaned, platform });
  }
  
  return result;
}
