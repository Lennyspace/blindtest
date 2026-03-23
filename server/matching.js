// Fuzzy answer matching for blind test responses

const NOISE_WORDS = new Set([
  'the', 'les', 'la', 'le', 'l', 'un', 'une', 'des',
  'feat', 'ft', 'featuring', 'and', 'et', 'vs', 'versus',
  'of', 'de', 'du', 'en',
]);

// Bidirectional alias map (all lowercase, no accents)
const ALIASES = {
  'maitre gims': 'gims',
  'gims': 'maitre gims',
  'iam': 'i am',
  'i am': 'iam',
  'mc solaar': 'solaar',
  'solaar': 'mc solaar',
  'michael jackson': 'mj',
  'mj': 'michael jackson',
  'the notorious big': 'biggie',
  'biggie': 'the notorious big',
  'notorious big': 'biggie',
  'jay z': 'jay-z',
  'jay-z': 'jay z',
  'snoop dogg': 'snoop',
  'snoop': 'snoop dogg',
  'lil wayne': 'weezy',
  'kanye west': 'kanye',
  'kanye': 'kanye west',
  'drake': 'drizzy',
  'drizzy': 'drake',
  'eminem': 'slim shady',
  'slim shady': 'eminem',
  'booba': 'b2o',
  'b2o': 'booba',
  'nekfeu': 'nef',
  'nef': 'nekfeu',
};

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(str) {
  return removeAccents(str)
    .toLowerCase()
    .replace(/[''`]/g, '') // remove apostrophes
    .replace(/[^a-z0-9 ]/g, ' ') // keep only alphanumeric
    .split(' ')
    .filter(w => w.length > 0 && !NOISE_WORDS.has(w))
    .join(' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function isCorrect(answer, target) {
  if (!answer || !target) return false;

  const normAnswer = normalize(answer);
  const normTarget = normalize(target);

  if (!normAnswer || !normTarget) return false;

  // Exact match after normalization
  if (normAnswer === normTarget) return true;

  // Alias match (both directions)
  const aliasAnswer = ALIASES[normAnswer];
  const aliasTarget = ALIASES[normTarget];
  if (aliasAnswer === normTarget || aliasTarget === normAnswer) return true;
  if (aliasAnswer && aliasTarget && aliasAnswer === aliasTarget) return true;

  // Levenshtein for strings longer than 5 chars (tolerance: up to 2 errors)
  if (normTarget.length > 5 && normAnswer.length > 2) {
    const dist = levenshtein(normAnswer, normTarget);
    const maxDist = normTarget.length > 10 ? 2 : 1;
    if (dist <= maxDist) return true;
  }

  // Partial containment: answer fully contained in target or vice versa
  // Only if answer is meaningful (> 3 chars)
  if (normAnswer.length > 3) {
    if (normTarget.includes(normAnswer)) return true;
    if (normAnswer.includes(normTarget) && normTarget.length > 3) return true;
  }

  return false;
}
