import axios from 'axios';
import { cleanTitle } from './cleanTitle.js';

const DEEZER_API = 'https://api.deezer.com';

// Deezer blocks bare server requests without a browser-like User-Agent
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

export function extractDeezerPlaylistId(input) {
  if (!input) return null;
  input = input.trim();
  if (/^\d+$/.test(input)) return input;
  const m = input.match(/deezer\.com(?:\/[a-z]{2})?\/playlist\/(\d+)/i);
  return m ? m[1] : null;
}

export async function fetchDeezerPlaylistInfo(playlistId) {
  const res = await axios.get(`${DEEZER_API}/playlist/${playlistId}`, { headers: HEADERS });
  if (res.data?.error) throw new Error(res.data.error.message || 'Deezer error');
  return res.data?.title || 'Playlist Deezer';
}

export async function fetchDeezerTracks(playlistId, maxTracks = 200) {
  const tracks = [];
  let index = 0;

  while (tracks.length < maxTracks) {
    const res = await axios.get(`${DEEZER_API}/playlist/${playlistId}/tracks`, {
      headers: HEADERS,
      params: { limit: 50, index },
    });

    if (res.data?.error) {
      throw new Error(`Deezer API: ${res.data.error.message || res.data.error.code || 'unknown error'}`);
    }

    const items = res.data?.data || [];
    if (!items.length) break;

    for (const item of items) {
      if (!item.preview) continue;
      tracks.push({
        source: 'deezer',
        previewUrl: item.preview,
        artist: item.artist?.name || '',
        title: cleanTitle(item.title || ''),
        thumbnail: item.album?.cover_medium || null,
      });
    }

    if (!res.data?.next) break;
    index += 50;
  }

  return tracks.slice(0, maxTracks);
}
