/**
 * Phonetic Latin → Telugu display helper for Indian names/places.
 * Used only for UI when language is Telugu; does not change stored DB values.
 */

const INDEPENDENT = {
  aa: '\u0c06',
  ee: '\u0c08',
  ii: '\u0c08',
  oo: '\u0c0a',
  uu: '\u0c0a',
  ai: '\u0c10',
  au: '\u0c14',
  ae: '\u0c0f',
  ea: '\u0c08',
  a: '\u0c05',
  i: '\u0c07',
  u: '\u0c09',
  e: '\u0c0e',
  o: '\u0c12',
};

const SIGNS = {
  aa: '\u0c3e',
  ee: '\u0c40',
  ii: '\u0c40',
  oo: '\u0c42',
  uu: '\u0c42',
  ai: '\u0c48',
  au: '\u0c4c',
  ae: '\u0c47',
  ea: '\u0c40',
  a: '', // inherent
  i: '\u0c3f',
  u: '\u0c41',
  e: '\u0c47',
  o: '\u0c4b',
};

const VOWELS = ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ae', 'ea', 'a', 'i', 'u', 'e', 'o'];

const CONSONANTS = [
  ['ksh', '\u0c15\u0c4d\u0c37'],
  ['ndh', '\u0c28\u0c4d\u0c27'],
  ['nth', '\u0c28\u0c4d\u0c25'],
  ['kh', '\u0c16'],
  ['gh', '\u0c18'],
  ['chh', '\u0c1b'],
  ['ch', '\u0c1a'],
  ['jh', '\u0c1d'],
  ['th', '\u0c25'],
  ['dh', '\u0c27'],
  ['ph', '\u0c2b'],
  ['bh', '\u0c2d'],
  ['shh', '\u0c37'],
  ['sh', '\u0c36'],
  ['ng', '\u0c19'],
  ['ny', '\u0c1e'],
  ['rr', '\u0c31'],
  ['ll', '\u0c33'],
  ['t', '\u0c24'],
  ['d', '\u0c26'],
  ['n', '\u0c28'],
  ['p', '\u0c2a'],
  ['b', '\u0c2c'],
  ['m', '\u0c2e'],
  ['y', '\u0c2f'],
  ['r', '\u0c30'],
  ['l', '\u0c32'],
  ['v', '\u0c35'],
  ['w', '\u0c35'],
  ['s', '\u0c38'],
  ['h', '\u0c39'],
  ['j', '\u0c1c'],
  ['g', '\u0c17'],
  ['k', '\u0c15'],
  ['c', '\u0c15'],
  ['f', '\u0c2b'],
  ['z', '\u0c1c'],
  ['x', '\u0c15\u0c4d\u0c38'],
  ['q', '\u0c15'],
];

const hasTelugu = (s) => /[\u0c00-\u0c7f]/.test(s);

const take = (input, keys) => {
  for (const key of keys) {
    if (input.startsWith(key)) return key;
  }
  return null;
};

const takeConsonant = (input) => {
  for (const [key, value] of CONSONANTS) {
    if (input.startsWith(key)) return { key, value };
  }
  return null;
};

const transliterateWord = (raw) => {
  if (!raw || hasTelugu(raw)) return raw;

  let s = raw.toLowerCase();
  // Surname / place pronunciation helpers
  s = s
    .replace(/administrator/g, 'administrator')
    .replace(/reddy/g, 'redi')
    .replace(/\brao\b/g, 'ravu')
    .replace(/guda$/g, 'guuda')
    .replace(/padu$/g, 'paadu');

  let out = '';
  let i = 0;
  let openConsonant = false;

  while (i < s.length) {
    const rest = s.slice(i);

    if (openConsonant) {
      const v = take(rest, VOWELS);
      if (v) {
        out += SIGNS[v];
        openConsonant = false;
        i += v.length;
        continue;
      }
      // Consonant cluster: add virama before next consonant
      const c = takeConsonant(rest);
      if (c) {
        out += '\u0c4d';
        out += c.value;
        openConsonant = true;
        i += c.key.length;
        continue;
      }
      openConsonant = false;
    }

    const atStart = out.length === 0;
    const v = take(rest, VOWELS);
    if (v && (atStart || !openConsonant)) {
      // Prefer independent vowel only at word start or after virama end
      if (atStart) {
        out += INDEPENDENT[v];
        i += v.length;
        continue;
      }
    }

    const c = takeConsonant(rest);
    if (c) {
      out += c.value;
      openConsonant = true;
      i += c.key.length;
      continue;
    }

    if (v) {
      out += INDEPENDENT[v];
      i += v.length;
      continue;
    }

    out += s[i];
    i += 1;
  }

  return out || raw;
};

export const latinToTelugu = (value) => {
  if (value == null || value === '') return value;
  const text = String(value).trim();
  if (!text || hasTelugu(text)) return text;

  // Keep codes / contacts unchanged
  if (/^[\d\s+\-()]+$/.test(text)) return text;
  if (/^[A-Z]{2,}-\d+/i.test(text)) return text;
  if (text.includes('@')) return text;

  return text
    .split(/(\s+|[-_/])/)
    .map((part) => {
      if (!part || /^[\s\-_\/]+$/.test(part)) return part;
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      if (!/^[a-zA-Z.]+$/.test(part)) return part;
      // Dot-separated initials: Z.V.G
      if (part.includes('.')) {
        return part
          .split('.')
          .filter((p) => p.length)
          .map((p) => transliterateWord(p))
          .join('.');
      }
      return transliterateWord(part);
    })
    .join('');
};

export default latinToTelugu;
