const NOISE = new Set([
  'the','les','la','le','l','un','une','des','de','du','en','of','a','an',
  'feat','ft','featuring','and','et','vs','versus','sur','avec',
]);

const ALIASES = {
  'maitre gims':'gims','gims':'maitre gims',
  'iam':'i am','i am':'iam',
  'mc solaar':'solaar','solaar':'mc solaar',
  'michael jackson':'mj','mj':'michael jackson',
  'notorious big':'biggie','biggie':'notorious big',
  'jay z':'jay-z','jay-z':'jay z',
  'snoop dogg':'snoop','snoop':'snoop dogg',
  'kanye west':'kanye','kanye':'kanye west',
  'eminem':'slim shady','slim shady':'eminem',
  'booba':'b2o','b2o':'booba',
  'nekfeu':'nef','nef':'nekfeu',
  'orelsan':'orel','orel':'orelsan',
  'angele':'angel','angel':'angele',
};

function removeAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(s) {
  return removeAccents(s)
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter(w => w.length > 0 && !NOISE.has(w))
    .join(' ')
    .trim();
}

function tokens(s) {
  return normalize(s).split(' ').filter(w => w.length > 1);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i ? (j ? 0 : i) : j));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyTokenMatch(a, b) {
  // Each token of 'a' must loosely match some token of 'b'
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  return ta.every(at =>
    tb.some(bt => {
      if (at === bt) return true;
      if (at.length > 3 && bt.includes(at)) return true;
      if (bt.length > 3 && at.includes(bt)) return true;
      const maxDist = Math.min(at.length, bt.length) > 5 ? 2 : 1;
      return at.length > 2 && bt.length > 2 && levenshtein(at, bt) <= maxDist;
    })
  );
}

export function isCorrect(answer, target) {
  if (!answer || !target) return false;

  const na = normalize(answer);
  const nt = normalize(target);
  if (!na || !nt) return false;

  // 1. Exact normalized match
  if (na === nt) return true;

  // 2. Alias match
  if (ALIASES[na] && normalize(ALIASES[na]) === nt) return true;
  if (ALIASES[nt] && normalize(ALIASES[nt]) === na) return true;

  // 3. Whole-string Levenshtein (for short strings)
  const maxWhole = Math.max(na.length, nt.length) > 8 ? 2 : 1;
  if (levenshtein(na, nt) <= maxWhole) return true;

  // 4. Token-based fuzzy match (main workhorse for multi-word titles)
  if (fuzzyTokenMatch(na, nt)) return true;

  // 5. One fully contains the other (minimum 4 chars)
  if (na.length >= 4 && nt.includes(na)) return true;
  if (nt.length >= 4 && na.includes(nt)) return true;

  return false;
}
