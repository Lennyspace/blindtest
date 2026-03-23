import axios from 'axios';
import { cleanTitle } from './cleanTitle.js';

const DEEZER_API = 'https://api.deezer.com';

export function extractDeezerPlaylistId(input) {
  if (!input) return null;
  input = input.trim();
  // Raw numeric ID
  if (/^\d+$/.test(input)) return input;
  // URL: deezer.com/xx/playlist/123456 or deezer.com/playlist/123456
  const m = input.match(/deezer\.com(?:\/[a-z]{2})?\/playlist\/(\d+)/i);
  return m ? m[1] : null;
}

export async function fetchDeezerPlaylistInfo(playlistId) {
  const res = await axios.get(`${DEEZER_API}/playlist/${playlistId}`);
  return res.data?.title || 'Playlist Deezer';
}

export async function fetchDeezerTracks(playlistId, maxTracks = 200) {
  const tracks = [];
  let index = 0;

  while (tracks.length < maxTracks) {
    const res = await axios.get(`${DEEZER_API}/playlist/${playlistId}/tracks`, {
      params: { limit: 50, index },
    });
    const items = res.data?.data || [];
    if (!items.length) break;

    for (const item of items) {
      if (!item.preview) continue; // no preview = skip
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
