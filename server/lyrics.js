import axios from 'axios';

export async function fetchLyrics(artist, title) {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const { data } = await axios.get(url, { timeout: 6000 });
  return data.lyrics || null;
}

export function pickLyricsGap(lyricsText) {
  if (!lyricsText) return null;

  // Clean: remove section markers [Verse], [Chorus]... and blank lines
  const lines = lyricsText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5 && !/^\[.*\]/.test(l));

  if (lines.length < 5) return null;

  // Pick gap from 20%–75% of song to avoid intro/outro
  const start = Math.max(2, Math.floor(lines.length * 0.2));
  const end   = Math.min(lines.length - 2, Math.floor(lines.length * 0.75));
  if (start >= end) return null;

  const gapIdx = start + Math.floor(Math.random() * (end - start));
  const answer = lines[gapIdx];

  // 3 context lines before the gap
  const context = lines.slice(Math.max(0, gapIdx - 3), gapIdx).join('\n');
  const after   = lines[gapIdx + 1] || '';

  return { context, answer, after };
}
