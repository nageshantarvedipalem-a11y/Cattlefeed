import i18n from '../i18n';
import { latinToTelugu } from './latinToTelugu';

/** Normalize catalog labels for lookup keys. */
export const catalogKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Translate product / category / brand / supplier / customer labels for Telugu UI.
 * Exact catalog map → word map → phonetic Latin→Telugu fallback.
 */
export const catalogLabel = (value, type = 'names') => {
  if (value == null || value === '') return '—';
  const text = String(value).trim();
  if (!i18n.language?.startsWith('te')) return text;

  const cleaned = text.replace(/[{}()]/g, ' ').replace(/\s+/g, ' ').trim();
  const key = catalogKey(cleaned);

  for (const bucket of [type, 'suppliers', 'customers', 'villages', 'names', 'categories', 'brands']) {
    const exact = i18n.t(`catalog.${bucket}.${key}`, { defaultValue: '' });
    if (exact) return exact;
  }

  const parts = cleaned.split(/(\s+|[-_/])/);
  let mapped = false;
  const byWords = parts
    .map((part) => {
      if (!part || /^[\s\-_\/]+$/.test(part) || /^\d+$/.test(part)) return part;
      const word = i18n.t(`catalog.words.${catalogKey(part)}`, { defaultValue: '' });
      if (word) {
        mapped = true;
        return word;
      }
      return part;
    })
    .join('');

  if (mapped) return byWords;

  // Automatic phonetic Telugu for remaining Latin names/places
  const phonetic = latinToTelugu(cleaned);
  return phonetic || text;
};
