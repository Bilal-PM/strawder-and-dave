// Run with:  node claim-check/tests/engine.test.mjs   (no dependencies)
import assert from 'node:assert/strict';
import { ClaimCheck, exampleFromHtml } from './load-engine.mjs';

const NOW = '2026-11-09';
const run = (answer, extra = {}) => ClaimCheck.analyze({ answer, now: NOW, ...extra });
const titles = (r, sev) => r.findings.filter(f => !sev || f.sev === sev).map(f => f.title);
const has = (r, sev, re) => titles(r, sev).some(t => re.test(t));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

test('CFO example: catches every planted error', () => {
  const r = run(exampleFromHtml('EX_ANSWER'), { source: exampleFromHtml('EX_SOURCE'), others: [exampleFromHtml('EX_B'), exampleFromHtml('EX_C')] });
  assert.ok(has(r, 'error', /Wrong % change: says 18\.2%, actually 15\.3%/));
  assert.ok(has(r, 'error', /EBITDA margin doesn't reconcile/));
  assert.ok(has(r, 'error', /Cash/));
  assert.ok(has(r, 'error', /Headcount/));
  assert.ok(has(r, 'error', /Split adds up to 105%/));
  assert.ok(has(r, 'error', /Wrong weekday/));
  assert.ok(has(r, 'warn', /IAS 17 is withdrawn/));
  assert.ok(has(r, 'warn', /unnamed authority/));
  assert.ok(has(r, 'verify', /Deloitte|attributed source/));
  assert.ok(has(r, 'ok', /Gross margin of 34\.1% checks out/));
  assert.ok(!has(r, 'error', /Net debt \/ EBITDA/), 'covenant limit must not count as a contradiction');
  assert.ok(!has(r, null, /CFOs/));
});

test('clean financial text has no issues', () => {
  const r = run(`Revenue for the quarter was $4.2 million, up 10.5% from $3.8 million in Q2. Gross profit of $1.68 million gives a gross margin of 40%.

Costs: salaries $1.1m, rent $0.2m and software $0.3m, totalling $1.6m.

Our sales mix is 60% subscription, 30% services and 10% hardware.`);
  assert.equal(r.counts.error + r.counts.warn + r.counts.verify, 0, titles(r).join('; '));
  assert.ok(r.counts.ok >= 4);
});

test('plain email has no findings', () => {
  const r = run('Hello Sarah, thanks for the meeting on Monday. I have attached the plan for the Manchester office move. John will speak to the landlord by Friday.');
  assert.equal(r.findings.length, 0);
});

test('rounding is tolerated (£12.4m vs £12,437,000)', () => {
  const r = run('Revenue was £12.4m.', { source: 'Revenue: £12,437,000' });
  assert.equal(r.counts.error + r.counts.warn, 0);
  assert.equal(r.stats.grounded, 1);
});

test('direction contradiction', () => {
  assert.ok(has(run('Profit fell from £3m to £3.5m.'), 'error', /figures go the other way/));
});

test('CAGR right and wrong', () => {
  assert.ok(has(run('From 2019 to 2023 revenue grew from £20m to £34.8m, a CAGR of 14.9%.'), 'ok', /CAGR/));
  assert.ok(has(run('From 2019 to 2023 revenue grew from £20m to £34.8m, a CAGR of 18%.'), 'error', /Wrong CAGR/));
});

test('share "A of B (P%)"', () => {
  assert.ok(has(run('We won 45 of 120 tenders (37.5%).'), 'ok', /share checks out/));
  assert.ok(has(run('We won 45 of 120 tenders (42%).'), 'error', /Wrong share/));
});

test('totals from bullet list', () => {
  const r = run('Costs:\n- Salaries £1.1m\n- Rent £0.2m\n- Software £0.3m\nTotal: £1.9m');
  assert.ok(has(r, 'error', /Total doesn't add up/));
});

test('dates: impossible date, wrong weekday, future in past tense', () => {
  assert.ok(has(run('The meeting is on 31 April 2025.'), 'error', /not a real date/));
  assert.ok(has(run('Signed on Monday, 14 March 2024.'), 'error', /Wrong weekday/));
  assert.ok(!has(run('Signed on Thursday, 14 March 2024.'), 'error', /Wrong weekday/));
  assert.ok(has(run('In 2028 the company reported record profits.'), 'warn', /already happened/));
  assert.ok(!has(run('In 2028 the company expects record profits.'), 'warn', /already happened/));
});

test('accounting standards knowledge', () => {
  assert.ok(has(run('Revenue is recognised under IAS 18.'), 'warn', /IAS 18 is withdrawn/));
  assert.ok(has(run('Apply IFRS 27 to the lease.'), 'error', /IFRS 27 does not exist/));
  assert.ok(has(run('Apply IFRS 16 to the lease.'), 'verify', /IFRS 16/));
  assert.ok(has(run('Under section 1450 of the Companies Act 2006 directors must…'), 'error', /does not exist/));
});

test('ungrounded number and derived number', () => {
  const src = 'Revenue: £10,000,000\nGross profit: £4,000,000';
  const r = run('Gross margin was 40%. Headcount is 312 people.', { source: src });
  assert.ok(has(r, 'ok', /40% can be calculated/));
  assert.ok(has(r, 'warn', /312 isn't in your source/));
});

test('cross-answer disagreement', () => {
  const r = run('Cash at year end was £2.1m.', { others: ['Cash at year end was £1.85m.', 'Year-end cash: £1.85m.'] });
  assert.ok(has(r, 'warn', /Other answers give a different Cash/));
});


test('thresholds ("below 3x") are not treated as stated values', () => {
  const r = run('Net debt / EBITDA is 2.4x. Businesses with leverage below 3x tend to refinance more cheaply.');
  assert.ok(!has(r, 'warn', /given as/));
});

test('written-out calculations (factool-style)', () => {
  assert.ok(has(run('Annual cost: £1.2m × 12 = £14.4m.'), 'ok', /Written-out calculation is right/));
  { const r = run('Combined: £2.1m + £3.4m = £6.5m.'); assert.ok(has(r, 'error', /comes to £5.5m, not £6.5m/)); assert.equal(r.counts.error, 1); }
  assert.ok(has(run('15% of £10m is £3m.'), 'error', /15% of £10m is £1.5m/));
  assert.ok(has(run('15% of £10m is £1.5m.'), 'ok', /checks out/));
});

test('doubled / halved', () => {
  assert.ok(has(run('Orders doubled from 400 to 1,000.'), 'error', /doubled/));
  assert.ok(has(run('Orders doubled from 400 to 810.'), 'ok', /doubled/));
});

test('right number, wrong subject (number exists in source under another metric)', () => {
  const r = run('Cash at year end was £3.1m.', { source: 'Cash at year end: £1,850,000\nNet debt: £3,100,000' });
  const f = r.findings.find(x => /Contradicts your source: Cash/.test(x.title));
  assert.ok(f && /wrong item/.test(f.detail), JSON.stringify(titles(r)));
});

test('unsupported figure shows the closest source line', () => {
  const r = run('Operating expenses were £3.4m.', { source: 'Revenue: £12m\nOperating expenses: £2.95m' });
  assert.ok(r.findings.some(f => /Closest line in your source/.test(f.detail || '') || /Contradicts/.test(f.title)));
});

test('label numbers are not statistics', () => {
  const r = run('See Article 37 and Step 4 of the plan.', { source: 'Nothing numeric here.' });
  assert.equal(r.stats.figures, 0);
});

test('filler and headings are not claims', () => {
  const r = run('Sure! Here is the summary.\nQuarterly overview\nRevenue was £4m in Q3.\nI hope this helps.');
  assert.equal(r.claims.length, 1, JSON.stringify(r.claims.map(c => c.text)));
});

test('initials and U.S. do not split sentences', () => {
  const ss = ClaimCheck.splitSentences('Revenue in the U.S. rose 4% in 2025. J. K. Smith chaired.');
  assert.equal(ss.length, 2, JSON.stringify(ss.map(x => x.text)));
});

test('sentence agreement across regenerations (SelfCheckGPT-style)', () => {
  const r = run('Revenue was £4m. The firm also won the Queen\'s Award for Enterprise in 2023 for exports to Brazil.',
    { others: ['Revenue was £4m and margins held steady.', 'Revenue came in at £4m for the year.'] });
  assert.ok(has(r, null, /Point not made in the other answers|Only this answer mentions/));
  assert.ok(r.claims.some(c => c.status === 'verified'));
});

test('claim ledger buckets', () => {
  const r = run(exampleFromHtml('EX_ANSWER'), { source: exampleFromHtml('EX_SOURCE'), others: [exampleFromHtml('EX_B'), exampleFromHtml('EX_C')] });
  assert.ok(r.ledger.wrong >= 6 && r.ledger.verified >= 2);
});

test('evergreen: dated rules switch on by themselves', () => {
  const t = 'Prepare the accounts under IAS 1.';
  assert.ok(has(ClaimCheck.analyze({ answer: t, now: '2026-11-09' }), 'info', /IAS 1 is being replaced by IFRS 18/));
  assert.ok(has(ClaimCheck.analyze({ answer: t, now: '2027-03-01' }), 'warn', /IAS 1 has been replaced/));
  assert.ok(!has(ClaimCheck.analyze({ answer: 'Leases fall under IAS 16 and IFRS 16.', now: '2027-03-01' }), 'warn', /IAS 1 has/), 'IAS 16 must not match IAS 1');
  assert.ok(has(run('The loan is priced at LIBOR plus 2%.'), 'warn', /LIBOR has been replaced/));
});

test('evergreen: your rules (fact, flag, withdrawn, valid)', () => {
  const rules = `# team rules
fact: Corporation tax main rate is 25%
flag: guaranteed returns | error | Never promise guaranteed returns
withdrawn: RPI -> CPIH | from 2030-01-01
valid: IFRS 20`;
  const r = run('The corporation tax main rate is 19%. This fund offers guaranteed returns. Apply IFRS 20.', { rules });
  assert.ok(has(r, 'error', /Contradicts your known fact/));
  assert.ok(has(r, 'error', /Never promise guaranteed returns/));
  assert.ok(has(r, 'verify', /IFRS 20/) && !has(r, 'error', /IFRS 20 does not exist/));
  assert.ok(has(run('The corporation tax main rate is 25%.', { rules }), 'ok', /Matches your known fact/));
  assert.ok(has(ClaimCheck.analyze({ answer: 'Uplift by RPI.', rules, now: '2031-01-01' }), 'warn', /RPI has been replaced by CPIH/));
});

test('rules with mistakes are reported, not crashed on', () => {
  const r = ClaimCheck.parseRules('flag: /([/ | warn\nnonsense line\nfoo: bar');
  assert.equal(r.errors.length, 3);
});

console.log(`\n${passed} tests passed`);
