/* ============================================================================
   VulnTriage — structured.js
   Parser output JSON terstruktur dari LLM -> objek 'parsed' yang dipakai UI.
   Return null jika bukan JSON valid (UI lalu memakai parser teks lama).
   ============================================================================ */
(function (root) {
  'use strict';

  const STATUS_MAP = {
    valid: 'Valid - Siap Diperbaiki',
    needs_info: 'Butuh Informasi Lebih',
    invalid: 'Kemungkinan Invalid / Informasional',
  };
  const PRIORITY_LABEL = {
    fix_first: 'Perbaiki Pertama',
    fix_soon: 'Perbaiki Segera',
    backlog: 'Backlog',
  };
  const METRIC_LABELS = {
    AV: 'Attack Vector', AC: 'Attack Complexity', PR: 'Privileges Required',
    UI: 'User Interaction', S: 'Scope', C: 'Confidentiality',
    I: 'Integrity', A: 'Availability',
  };

  const str = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  const list = (v) => Array.isArray(v) ? v.map(str).filter(Boolean) : (str(v) ? [str(v)] : []);
  const bullets = (arr) => arr.map((x) => '- ' + x).join('\n');
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  /** Ambil objek JSON dari teks (boleh dibungkus code fence atau ada teks di sekitarnya). */
  function extractJson(raw) {
    if (typeof raw !== 'string') return null;
    const a = raw.indexOf('{');
    const b = raw.lastIndexOf('}');
    if (a === -1 || b <= a) return null;
    try {
      const obj = JSON.parse(raw.slice(a, b + 1));
      return isObj(obj) ? obj : null;
    } catch (_) {
      return null;
    }
  }

  function buildSeverity(sev) {
    if (!isObj(sev)) return str(sev);
    if (!str(sev.label) && !str(sev.cvss_vector)) return '';
    let out = 'Label: ' + (str(sev.label) || 'Info');
    if (str(sev.cvss_vector)) out += '\nCVSS v3.1: ' + str(sev.cvss_vector);
    if (str(sev.score) !== '') out += '\nScore: ' + str(sev.score);
    const rat = isObj(sev.rationale) ? sev.rationale : {};
    const rows = Object.keys(METRIC_LABELS)
      .filter((k) => str(rat[k]))
      .map((k) => '- ' + k + ' (' + METRIC_LABELS[k] + '): ' + str(rat[k]));
    if (rows.length) out += '\nRasional:\n' + rows.join('\n');
    return out;
  }

  function buildRemediation(rem) {
    if (!isObj(rem)) return str(rem);
    const parts = [];
    const shortTerm = list(rem.short_term);
    const longTerm = list(rem.long_term);
    if (shortTerm.length) parts.push('Jangka Pendek:\n' + bullets(shortTerm));
    if (longTerm.length) parts.push('Jangka Panjang:\n' + bullets(longTerm));
    const sc = rem.secure_code;
    if (isObj(sc) && str(sc.code)) {
      const lang = str(sc.language).replace(/[^\w]/g, '').toLowerCase();
      const code = String(sc.code).replace(/```/g, '').replace(/\s+$/, '');
      parts.push('Contoh Kode Aman:\n```' + lang + '\n' + code + '\n```');
    }
    return parts.join('\n');
  }

  function buildCompliance(c) {
    if (!Array.isArray(c)) return str(c);
    const rows = c.filter(isObj).map((r) => '| ' + [r.framework, r.control, r.relevance].map(str).join(' | ') + ' |');
    if (!rows.length) return '';
    return ['| Framework | Kontrol | Relevansi |'].concat(rows).join('\n');
  }

  function buildFalsePositive(fp) {
    if (!isObj(fp)) return str(fp);
    const n = Math.round(Number(fp.score));
    if (!Number.isFinite(n)) return '';
    const score = Math.max(0, Math.min(100, n));
    let out = 'Skor: ' + score;
    if (str(fp.reason)) out += '\nAlasan: ' + str(fp.reason);
    if (str(fp.status)) out += '\nStatus: ' + str(fp.status);
    return out;
  }

  function buildDedup(groups) {
    if (!Array.isArray(groups)) return str(groups);
    return groups.filter(isObj).map((g, i) => {
      const ids = list(g.ids);
      const count = Number(g.count) || ids.length;
      let head = 'Grup ' + (i + 1) + ': ' + (str(g.name) || 'Tanpa nama') + ' \u2014 ' + count + ' temuan digabung';
      if (ids.length) head += ' (' + ids.join(', ') + ')';
      const lines = [head];
      if (str(g.root_cause)) lines.push('Root cause: ' + str(g.root_cause));
      if (str(g.recommendation)) lines.push('Rekomendasi: ' + str(g.recommendation));
      return lines.join('\n');
    }).join('\n\n');
  }

  function buildPriority(queue) {
    if (!Array.isArray(queue)) return str(queue);
    return queue.filter(isObj).map((q) => {
      const label = PRIORITY_LABEL[str(q.priority).toLowerCase()] || 'Perbaiki Segera';
      const detail = [str(q.cvss_score) !== '' ? 'Score ' + str(q.cvss_score) : '', str(q.reason)].filter(Boolean).join(', ');
      return label + ': ' + (str(q.id) || '-') + (detail ? ' (' + detail + ')' : '');
    }).join('\n');
  }

  function toParsed(o, raw) {
    const cat = isObj(o.category)
      ? [str(o.category.owasp) && 'OWASP: ' + str(o.category.owasp), str(o.category.cwe) && 'CWE: ' + str(o.category.cwe)].filter(Boolean).join('\n')
      : str(o.category);
    const statusKey = str(o.triage_status).toLowerCase();

    return {
      status: STATUS_MAP[statusKey] || str(o.triage_status),
      summary: str(o.summary),
      category: cat,
      severity: buildSeverity(o.severity),
      impact: str(o.business_impact),
      steps: Array.isArray(o.reproduction_steps)
        ? list(o.reproduction_steps).map((s, i) => (i + 1) + '. ' + s.replace(/^\d+[.)]\s*/, '')).join('\n')
        : str(o.reproduction_steps),
      remediation: buildRemediation(o.remediation),
      compliance: buildCompliance(o.compliance_mapping),
      fpScore: buildFalsePositive(o.false_positive),
      missing: bullets(list(o.missing_information)),
      clarifying: list(o.clarifying_questions).map((q, i) => (i + 1) + '. ' + q.replace(/^\d+[.)]\s*/, '')).join('\n'),
      assumptions: bullets(list(o.assumptions)),
      scope: str(o.scope_and_limitations),
      dedup: buildDedup(o.dedup_groups),
      priority: buildPriority(o.priority_queue),
      raw: raw,
      structured: o,
    };
  }

  /** Return objek parsed, atau null jika raw bukan JSON triage yang valid. */
  function parse(raw) {
    const o = extractJson(raw);
    if (!o) return null;
    if (!o.triage_status && !o.summary && !o.severity) return null;
    return toParsed(o, raw);
  }

  const api = { parse, extractJson };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.StructuredTriage = api;
})(typeof window !== 'undefined' ? window : globalThis);
