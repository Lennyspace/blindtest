import axios from 'axios';

const DEEZER_API = 'https://api.deezer.com';

export function extractDeezerPlaylistId(input) {
  if (!input) return null;
  input = input.trim();
  if (/^\d+$/.test(input)) return input;
  const m = input.match(/deezer\.com(?:\/[a-z]{2})?\/playlist\/(\d+)/i);
  return m ? m[1] : null;
}

// Resolve short links like link.deezer.com/s/xxx → real playlist URL
export async function resolveDeezerShortLink(url) {
  if (!url.includes('link.deezer.com')) return url;
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      validateStatus: s => s < 400,
    });
    // axios follows redirects and gives us the final URL
    return res.request?.res?.responseUrl || res.config?.url || url;
  } catch (err) {
    // Some redirects return 3xx without following — check Location header
    if (err.response?.headers?.location) return err.response.headers.location;
    throw err;
  }
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
        title: item.title || '',
        thumbnail: item.album?.cover_medium || null,
      });
    }

    if (!res.data?.next) break;
    index += 50;
  }

  return tracks.slice(0, maxTracks);
}
