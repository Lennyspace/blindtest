// Strip noise tags from music titles.
// [] brackets are almost always metadata (e.g. [Explicit], [2019], [Remastered])
// () parens are stripped when they contain known version/edition keywords or a lone year.
export function cleanTitle(s) {
  if (!s) return s;
  return s
    // Remove everything in square brackets: [Explicit], [Remastered 2010], [Official Video], etc.
    .replace(/\s*\[[^\]]*\]/g, '')
    // Remove parens with version/edition/video noise keywords
    .replace(/\s*\([^)]*?(remaster(?:ed)?|deluxe|edition|version|radio\s*edit|single|live|acoustic|instrumental|anniversary|bonus|extended|explicit|clean|mono|stereo|feat\.|ft\.|clip|officiel|official|video|audio|hd|hq|4k|vevo|mv|lyric|visualizer)[^)]*\)/gi, '')
    // Remove parens containing only a year: (2019)
    .replace(/\s*\(\d{4}\)/g, '')
    // Remove production credit parens: (prod. ...) or (prod by ...)
    .replace(/\s*\(prod\.?[^)]*\)/gi, '')
    .trim();
}
