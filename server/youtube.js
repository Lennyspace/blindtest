import axios from 'axios';

const YT_API = 'https://www.googleapis.com/youtube/v3';

// Extract playlist ID from URL or raw ID
export function extractPlaylistId(input) {
  if (!input) return null;
  input = input.trim();
  // Already a raw ID (no spaces, no protocol)
  if (/^[A-Za-z0-9_-]{10,}$/.test(input)) return input;
  // URL with list= param
  try {
    const url = new URL(input);
    return url.searchParams.get('list');
  } catch {
    return null;
  }
}

// Parse "Artist - Song Title (Official Video)" → { artist, title }
function parseVideoTitle(raw) {
  // Remove common suffixes
  const cleaned = raw
    .replace(/\s*[\[(](official\s*(music\s*)?video|lyrics?|audio|clip\s*officiel|hd|hq|4k|visualizer|lyric\s*video|vevo)[)\]]/gi, '')
    .replace(/\s*[\[|(](prod\.?.*?)[)\]]/gi, '')
    .trim();

  // Try splitting on " - " (take first occurrence)
  const dashIdx = cleaned.indexOf(' - ');
  if (dashIdx !== -1) {
    return {
      artist: cleaned.slice(0, dashIdx).trim(),
      title: cleaned.slice(dashIdx + 3).trim(),
    };
  }

  // Fallback: whole title
  return { artist: '', title: cleaned };
}

export async function fetchPlaylistTracks(playlistId, apiKey, maxTracks = 50) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

  const tracks = [];
  let pageToken = undefined;

  do {
    const params = {
      part: 'snippet',
      playlistId,
      maxResults: 50,
      key: apiKey,
    };
    if (pageToken) params.pageToken = pageToken;

    const res = await axios.get(`${YT_API}/playlistItems`, { params });
    const items = res.data.items || [];

    for (const item of items) {
      const snippet = item.snippet;
      if (!snippet) continue;
      const videoId = snippet.resourceId?.videoId;
      if (!videoId) continue;
      // Skip deleted/private videos
      if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue;

      const { artist, title } = parseVideoTitle(snippet.title);
      if (!title) continue;

      tracks.push({ videoId, artist, title, thumbnail: snippet.thumbnails?.medium?.url });
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken && tracks.length < maxTracks);

  return tracks.slice(0, maxTracks);
}
