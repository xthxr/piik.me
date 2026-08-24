'use strict';

/**
 * splitTest.service.js
 *
 * Centralises all A/B split-test business logic so that route handlers stay
 * thin and every piece of reasoning about variants is testable in isolation.
 */

const { validateUrl } = require('../utils/url.utils');

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a variants array submitted by the client.
 *
 * @param {any} variants - The raw value from the request body.
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateVariants(variants) {
  if (!Array.isArray(variants)) {
    return { valid: false, message: '`variants` must be an array.' };
  }

  if (variants.length < 2) {
    return { valid: false, message: 'A split test requires at least 2 variants.' };
  }

  if (variants.length > 10) {
    return { valid: false, message: 'A split test supports at most 10 variants.' };
  }

  const labels = new Set();

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];

    // label ----------------------------------------------------------------
    
    if (typeof v.label !== 'string' || v.label.trim() === '') {
      return { valid: false, message: `Variant at index ${i}: \`label\` must be a non-empty string.` };
    }
    const label = v.label.trim();
    if (labels.has(label.toLowerCase())) {
      return { valid: false, message: `Duplicate label "${label}" found. Each variant must have a unique label.` };
    }
    labels.add(label.toLowerCase());

    // url ------------------------------------------------------------------

    if (typeof v.url !== 'string' || v.url.trim() === '') {
      return { valid: false, message: `Variant "${label}": \`url\` must be a non-empty string.` };
    }
    const urlValidation = validateUrl(v.url.trim());
    if (!urlValidation.valid) {
      return { valid: false, message: `Variant "${label}": ${urlValidation.error}` };
    }

    // weight ---------------------------------------------------------------

    if (typeof v.weight !== 'number' || !Number.isInteger(v.weight)) {
      return { valid: false, message: `Variant "${label}": \`weight\` must be an integer.` };
    }
    if (v.weight < 0 || v.weight > 100) {
      return { valid: false, message: `Variant "${label}": \`weight\` must be between 0 and 100.` };
    }
  }

  // Weights must sum to exactly 100

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    return {
      valid: false,
      message: `All variant weights must sum to 100. Current total: ${totalWeight}.`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Traffic selection
// ---------------------------------------------------------------------------

/**
 * Picks a variant using a cumulative-threshold algorithm.
 *
 * The algorithm is O(n) and requires no external libraries.  Given the small
 * number of variants (max 10) this is perfectly adequate.
 *
 * @param {Array<{ label: string, url: string, weight: number }>} variants
 * @returns {{ label: string, url: string, weight: number }}
 */
function selectVariantByWeight(variants) {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.weight;
    if (random < cumulative) {
      return variant;
    }
  }

  // Floating-point safety net — should only trigger when weights === 100.00...001

  return variants[variants.length - 1];
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Firestore FieldValue increments needed to record a click for a
 * specific variant.  These fields are merged into the aggregate analytics
 * document so that both total click counters AND per-variant counters are
 * updated atomically in a single batch.
 *
 * @param {string} variantLabel - The label of the selected variant.
 * @returns {Object} Partial Firestore update object.
 */
function buildVariantClickFields(variantLabel) {

  // Sanitise the label so it is safe as a Firestore field key

  const safeLabel = String(variantLabel).replace(/[.[\]]/g, '_');
  return {
    [`variantClicks.${safeLabel}`]: { __increment: 1 }, // placeholder — caller must use FieldValue.increment
  };
}

/**
 * Normalises a variants array so it is safe to persist in Firestore:
 *  - trims strings
 *  - converts weight to a plain integer
 *
 * @param {Array} variants
 * @returns {Array<{ label: string, url: string, weight: number }>}
 */
function normaliseVariants(variants) {
  return variants.map((v) => ({
    label: v.label.trim(),
    url: v.url.trim(),
    weight: Math.round(v.weight),
  }));
}

module.exports = {
  validateVariants,
  selectVariantByWeight,
  buildVariantClickFields,
  normaliseVariants,
};
