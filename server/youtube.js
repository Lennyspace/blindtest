import axios from 'axios';
import { cleanTitle } from './cleanTitle.js';

const YT_API = 'https://www.googleapis.com/youtube/v3';

export function extractPlaylistId(input) {
  if (!input) return null;
  input = input.trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(input)) return input;
  try {
    const url = new URL(input);
    return url.searchParams.get('list');
  } catch {
    return null;
  }
}

function parseVideoTitle(raw, channelTitle) {
  const cleaned = cleanTitle(raw);

  const dashIdx = cleaned.indexOf(' - ');
  if (dashIdx !== -1) {
    const rawArtist = cleaned.slice(0, dashIdx).trim();
    const artist = rawArtist.replace(/\s*-\s*topic$/i, '').replace(/\s*(vevo|official|officiel)$/i, '').trim();
    return { artist, title: cleaned.slice(dashIdx + 3).trim() };
  }

  // No " - " found → use channel name as artist
  const artist = channelTitle
    ? channelTitle
        .replace(/\s*-\s*topic$/i, '')           // "Ed Sheeran - Topic" → "Ed Sheeran"
        .replace(/\s*(officiel|official|vevo|music|records?|tv|channel)$/i, '')
        .trim()
    : '';

  return { artist, title: cleaned };
}

export async function fetchPlaylistInfo(playlistId, apiKey) {
  const res = await axios.get(`${YT_API}/playlists`, {
    params: { part: 'snippet', id: playlistId, key: apiKey },
  });
  const item = res.data.items?.[0];
  return item?.snippet?.title || 'Playlist';
}

export async function fetchPlaylistTracks(playlistId, apiKey, maxTracks = 50) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

  const tracks = [];
  let pageToken = undefined;

  do {
    const params = { part: 'snippet', playlistId, maxResults: 50, key: apiKey };
    if (pageToken) params.pageToken = pageToken;

    const res = await axios.get(`${YT_API}/playlistItems`, { params });
    const items = res.data.items || [];

    for (const item of items) {
      const snippet = item.snippet;
      if (!snippet) continue;
      const videoId = snippet.resourceId?.videoId;
      if (!videoId) continue;
      if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue;

      const channelTitle = snippet.videoOwnerChannelTitle;
      const { artist, title } = parseVideoTitle(snippet.title, channelTitle);
      if (!title) continue;

      tracks.push({
        videoId,
        artist,
        title,
        thumbnail: snippet.thumbnails?.medium?.url,
      });
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken && tracks.length < maxTracks);

  return tracks.slice(0, maxTracks);
}
