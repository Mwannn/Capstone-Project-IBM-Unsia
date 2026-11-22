/* ============================================================================
   VulnTriage — cvss.js
   Kalkulator CVSS v3.1 Base Score (deterministik) untuk memverifikasi skor LLM.
   Spesifikasi: https://www.first.org/cvss/v3.1/specification-document
   ============================================================================ */
(function (root) {
  'use strict';

  const WEIGHTS = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    UI: { N: 0.85, R: 0.62 },
    CIA: { H: 0.56, L: 0.22, N: 0 },
    PR_U: { N: 0.85, L: 0.62, H: 0.27 },
    PR_C: { N: 0.85, L: 0.68, H: 0.5 },
  };

  const REQUIRED = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];

  // Roundup sesuai CVSS v3.1 (Appendix A) — menghindari galat floating point
  function roundUp(x) {
    const n = Math.round(x * 100000);
    if (n % 10000 === 0) return n / 100000;
    return (Math.floor(n / 10000) + 1) / 10;
  }

  function severityOf(score) {
    if (score === 0) return 'None';
    if (score < 4.0) return 'Low';
    if (score < 7.0) return 'Medium';
    if (score < 9.0) return 'High';
    return 'Critical';
  }

  /** Parse string vektor menjadi objek metrik; return null jika tidak valid. */
  function parseVector(vector) {
    if (typeof vector !== 'string') return null;
    const parts = vector.trim().split('/');
    if (parts[0] !== 'CVSS:3.1' && parts[0] !== 'CVSS:3.0') return null;
    const m = {};
    for (const p of parts.slice(1)) {
      const [k, v] = p.split(':');
      if (k && v) m[k] = v;
    }
    for (const k of REQUIRED) if (!m[k]) return null;
    const has = (table, key) => Object.prototype.hasOwnProperty.call(table, key);
    if (!has(WEIGHTS.AV, m.AV) || !has(WEIGHTS.AC, m.AC) || !has(WEIGHTS.UI, m.UI)) return null;
    if (!has(WEIGHTS.CIA, m.C) || !has(WEIGHTS.CIA, m.I) || !has(WEIGHTS.CIA, m.A)) return null;
    if (m.S !== 'U' && m.S !== 'C') return null;
    if (!has(WEIGHTS.PR_U, m.PR)) return null;
    return m;
  }

  /** Hitung base score dari string vektor. Return { score, severity, vector } atau null. */
  function calculate(vector) {
    const m = parseVector(vector);
    if (!m) return null;

    const changed = m.S === 'C';
    const iss = 1 - (1 - WEIGHTS.CIA[m.C]) * (1 - WEIGHTS.CIA[m.I]) * (1 - WEIGHTS.CIA[m.A]);
    const impact = changed
      ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
      : 6.42 * iss;
    const pr = (changed ? WEIGHTS.PR_C : WEIGHTS.PR_U)[m.PR];
    const exploitability = 8.22 * WEIGHTS.AV[m.AV] * WEIGHTS.AC[m.AC] * pr * WEIGHTS.UI[m.UI];

    let score;
    if (impact <= 0) score = 0;
    else if (changed) score = roundUp(Math.min(1.08 * (impact + exploitability), 10));
    else score = roundUp(Math.min(impact + exploitability, 10));

    return { score, severity: severityOf(score), vector: vector.trim() };
  }

  const api = { calculate, parseVector, severityOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CVSS = api;
})(typeof window !== 'undefined' ? window : globalThis);
