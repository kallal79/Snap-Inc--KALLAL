// test/brief.test.js - Comprehensive Automated Test Suite
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const { EventEmitter } = require('node:events');
const briefs = require('../data/briefs');
const { handleRequest, validateBrief, calculateWordCount, calculateReadingSeconds } = require('../server');

// Helper to execute mock HTTP request directly against handleRequest
function executeMockRequest(method, url, payload = null) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        if (payload) {
          this.push(typeof payload === 'string' ? payload : JSON.stringify(payload));
        }
        this.push(null);
      }
    });
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost' };

    let statusCode = 200;
    const headers = {};
    let responseBody = '';

    const res = new Writable({
      write(chunk, encoding, callback) {
        responseBody += chunk.toString();
        callback();
      }
    });

    res.setHeader = (key, val) => { headers[key.toLowerCase()] = val; };
    res.getHeader = (key) => headers[key.toLowerCase()];
    res.writeHead = (code, hdrs) => {
      statusCode = code;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          headers[k.toLowerCase()] = v;
        }
      }
    };

    res.on('finish', () => {
      let parsed = responseBody;
      try {
        if (headers['content-type'] && headers['content-type'].includes('application/json')) {
          parsed = JSON.parse(responseBody);
        }
      } catch (e) {}
      resolve({ statusCode, headers, body: parsed, rawBody: responseBody });
    });

    handleRequest(req, res);
  });
}

describe('90-Second Account Brief - Core Constraints Across All Accounts', () => {
  const companyKeys = Object.keys(briefs);

  test('All 5 Target Companies Must Be Loaded and Complete', () => {
    assert.deepStrictEqual(
      companyKeys.sort(),
      ['datadog', 'nvidia', 'openai', 'snap', 'stripe'].sort(),
      'Should contain Snap, Stripe, Datadog, OpenAI, and NVIDIA'
    );
  });

  for (const key of companyKeys) {
    const brief = briefs[key];

    describe(`Account Brief Integrity: ${brief.companyName}`, () => {
      test('Word count must be strictly under 200 words', () => {
        const fullText = brief.briefItems.map(item => item.sentences).join(' ');
        const calculatedWords = calculateWordCount(fullText);

        assert.ok(
          calculatedWords < 200,
          `${brief.companyName} must be < 200 words, got ${calculatedWords}`
        );
        assert.strictEqual(
          calculatedWords,
          brief.totalWordCount,
          `${brief.companyName} totalWordCount metadata mismatch`
        );
        console.log(`  ✓ ${brief.companyName}: ${calculatedWords}/200 words`);
      });

      test('Estimated reading time must fit ~90 seconds (70s - 90s)', () => {
        const readTime = calculateReadingSeconds(brief.totalWordCount, 130);
        assert.ok(
          readTime <= 90 && readTime >= 70,
          `${brief.companyName} reading time should be 70s-90s, got ${readTime}s`
        );
        console.log(`  ✓ ${brief.companyName} read time: ${readTime}s`);
      });

      test('Must contain all 5 required structured items in correct order', () => {
        assert.strictEqual(brief.briefItems.length, 5, 'Must contain exactly 5 items');
        const numbers = brief.briefItems.map(i => i.number);
        assert.deepStrictEqual(numbers, [1, 2, 3, 4, 5]);

        // Item 1: Plain explanation (at least 20 words)
        assert.ok(brief.briefItems[0].sentences.length > 30);
        // Item 2: Monetization
        assert.ok(brief.briefItems[1].sentences.length > 25);
        // Item 3: Developments
        assert.ok(brief.briefItems[2].developments && brief.briefItems[2].developments.length === 2);
        // Item 4: Customers
        assert.ok(brief.briefItems[3].sentences.length > 15);
        // Item 5: Question with question mark
        assert.ok(brief.briefItems[4].sentences.includes('?'), 'Item 5 must end with a question mark');
      });

      test('Developments must have specific month, year, source name, and verified HTTPS link', () => {
        const item3 = brief.briefItems[2];
        for (const dev of item3.developments) {
          assert.ok(dev.date && /\d{4}/.test(dev.date), `Must include year in date: ${dev.date}`);
          assert.ok(dev.sourceName, `Must name reputable source: ${dev.sourceName}`);
          assert.ok(dev.url.startsWith('https://'), `URL must be HTTPS: ${dev.url}`);
          assert.ok(dev.verifiedDate, `Must include exact verified date: ${dev.verifiedDate}`);
        }
      });

      test('Handshake Showcase: Description must be strictly <= 500 characters', () => {
        const desc = brief.handshakeSubmission.description;
        assert.ok(desc, 'Description must exist');
        assert.ok(
          desc.length <= 500,
          `${brief.companyName} description must be <= 500 chars, got ${desc.length}`
        );
        assert.strictEqual(desc.length, brief.handshakeSubmission.descriptionCharCount);
        console.log(`  ✓ ${brief.companyName} Handshake description: ${desc.length}/500 chars`);
      });

      test('Handshake Showcase: Digging reflection must be thorough and detailed', () => {
        const story = brief.handshakeSubmission.claimNeedingMostDigging;
        assert.ok(story && story.length > 80, 'Must include detailed explanation of digging');
      });

      test('Interview tactics coaching must be provided', () => {
        assert.ok(brief.interviewTactics, 'Must include interview tactics');
        assert.ok(brief.interviewTactics.openingPivot);
        assert.ok(brief.interviewTactics.closingPivot);
      });

      test('Market & Competitive analysis must be complete and rigorous', () => {
        const market = brief.marketAnalysis;
        assert.ok(market, `${brief.companyName} must have marketAnalysis object`);
        assert.ok(market.tam && market.tam.length > 10, 'TAM headline must be detailed');
        assert.ok(market.tamDetails && market.tamDetails.length > 20, 'TAM details must be thorough');
        assert.ok(market.marketShare, 'Market share positioning must be specified');
        assert.ok(Array.isArray(market.keyCompetitors) && market.keyCompetitors.length >= 2, 'Must list at least 2 key competitors');
        
        for (const comp of market.keyCompetitors) {
          assert.ok(comp.name, 'Competitor must have a name');
          assert.ok(comp.threat, 'Competitor threat must be analyzed');
          assert.ok(comp.advantage, 'Competitive moat / advantage must be analyzed');
        }

        assert.ok(Array.isArray(market.strategicMoats) && market.strategicMoats.length >= 2, 'Must define at least 2 defensible moats');
        assert.ok(Array.isArray(market.marketCatalysts) && market.marketCatalysts.length >= 2, 'Must define at least 2 market growth catalysts');
      });

      test('Financial unit economics must be complete and rigorous', () => {
        const fin = brief.marketAnalysis.financials;
        assert.ok(fin, `${brief.companyName} must have financials object`);
        assert.ok(fin.annualRevenue, 'Annual revenue must exist');
        assert.ok(Array.isArray(fin.statPills) && fin.statPills.length >= 4, 'Must have at least 4 stat pills');
      });

      test('Porter\'s Five Forces analysis must cover all 5 market forces', () => {
        const forces = brief.marketAnalysis.portersFiveForces;
        assert.ok(forces, `${brief.companyName} must have portersFiveForces`);
        assert.ok(forces.industryRivalry && forces.industryRivalry.level);
        assert.ok(forces.threatOfNewEntrants && forces.threatOfNewEntrants.level);
        assert.ok(forces.buyerPower && forces.buyerPower.level);
        assert.ok(forces.supplierPower && forces.supplierPower.level);
        assert.ok(forces.threatOfSubstitutes && forces.threatOfSubstitutes.level);
      });

      test('SWOT analysis must have all 4 quadrants populated', () => {
        const swot = brief.marketAnalysis.swotAnalysis;
        assert.ok(swot, `${brief.companyName} must have swotAnalysis`);
        assert.ok(Array.isArray(swot.strengths) && swot.strengths.length >= 2);
        assert.ok(Array.isArray(swot.weaknesses) && swot.weaknesses.length >= 2);
        assert.ok(Array.isArray(swot.opportunities) && swot.opportunities.length >= 2);
        assert.ok(Array.isArray(swot.threats) && swot.threats.length >= 2);
      });

      test('Objection handling playbook must provide tough interview question defenses', () => {
        const obj = brief.marketAnalysis.objectionHandling;
        assert.ok(Array.isArray(obj) && obj.length >= 2, 'Must have at least 2 objection scenarios');
        for (const o of obj) {
          assert.ok(o.toughQuestion, 'Must define tough question');
          assert.ok(o.candidateRebuttal, 'Must define candidate rebuttal');
          assert.ok(o.strategicRationale, 'Must define strategic rationale');
        }
      });

      test('Competitive Battlecards must have win criteria, friction, landmines, and kill-shot pitch', () => {
        const bc = brief.marketAnalysis.competitiveBattlecards;
        assert.ok(Array.isArray(bc) && bc.length >= 2, `${brief.companyName} must have at least 2 battlecards`);
        for (const card of bc) {
          assert.ok(card.competitorName, 'Must name competitor');
          assert.ok(Array.isArray(card.whereWeWin) && card.whereWeWin.length >= 2, 'Must have >= 2 whereWeWin points');
          assert.ok(Array.isArray(card.whereWeFaceFriction) && card.whereWeFaceFriction.length >= 2, 'Must have >= 2 friction points');
          assert.ok(Array.isArray(card.landmineQuestions) && card.landmineQuestions.length >= 2, 'Must have >= 2 landmines');
          assert.ok(card.killShotPitch && card.killShotPitch.length > 30, 'Must have punchy kill-shot pitch');
          assert.ok(card.anchorCustomerStory && card.anchorCustomerStory.brand, 'Must provide anchor customer story');
        }
      });

      test('MEDDPICC qualification matrix must cover all 8 enterprise dimensions', () => {
        const med = brief.marketAnalysis.meddpiccQualification;
        assert.ok(med, `${brief.companyName} must have meddpiccQualification`);
        assert.ok(med.metrics && med.metrics.length > 20, 'Metrics must be detailed');
        assert.ok(med.economicBuyer && med.economicBuyer.length > 10, 'Economic buyer must be specified');
        assert.ok(med.decisionCriteria && med.decisionCriteria.length > 20, 'Decision criteria must be defined');
        assert.ok(med.decisionProcess && med.decisionProcess.length > 20, 'Decision process must be defined');
        assert.ok(med.paperProcess && med.paperProcess.length > 20, 'Paper process must be defined');
        assert.ok(med.identifyPain && med.identifyPain.length > 20, 'Pain must be identified');
        assert.ok(med.champion && med.champion.length > 10, 'Champion must be specified');
        assert.ok(med.competition && med.competition.length > 15, 'Competition must be specified');
      });

      test('30-60-90 Day onboarding ramp plan must have 3 structured phases with actionable deliverables', () => {
        const onb = brief.marketAnalysis.onboardingRampPlan;
        assert.ok(onb, `${brief.companyName} must have onboardingRampPlan`);
        assert.ok(onb.role, 'Role must be specified');
        assert.ok(onb.phase30 && onb.phase30.deliverables.length >= 3, 'Phase 30 must have >= 3 deliverables');
        assert.ok(onb.phase60 && onb.phase60.deliverables.length >= 3, 'Phase 60 must have >= 3 deliverables');
        assert.ok(onb.phase90 && onb.phase90.deliverables.length >= 3, 'Phase 90 must have >= 3 deliverables');
      });

      test('Ideal Customer Profile (ICP) & Buyer Personas must have firmographics, triggers, and personas', () => {
        const icp = brief.marketAnalysis.icpBuyerPersonas;
        assert.ok(icp, `${brief.companyName} must have icpBuyerPersonas`);
        assert.ok(icp.firmographics && icp.firmographics.length > 20, 'Firmographics must be specified');
        assert.ok(Array.isArray(icp.triggerEvents) && icp.triggerEvents.length >= 2, 'Must have >= 2 trigger events');
        assert.ok(Array.isArray(icp.personas) && icp.personas.length >= 2, 'Must have >= 2 personas');
        for (const p of icp.personas) {
          assert.ok(p.title, 'Persona must have title');
          assert.ok(p.kpi, 'Persona must have KPI');
          assert.ok(p.painPoint, 'Persona must have pain point');
          assert.ok(p.valueHook, 'Persona must have value hook');
        }
      });

      test('Market Sizing (TAM/SAM/SOM) must have quantitative definitions, CAGR, and >= 3 growth drivers', () => {
        const sizing = brief.marketAnalysis.marketSizing;
        assert.ok(sizing, `${brief.companyName} must have marketSizing`);
        assert.ok(sizing.tam && sizing.tamDefinition, 'TAM and definition must exist');
        assert.ok(sizing.sam && sizing.samDefinition, 'SAM and definition must exist');
        assert.ok(sizing.som && sizing.somDefinition, 'SOM and definition must exist');
        assert.ok(sizing.cagr, 'CAGR must be specified');
        assert.ok(Array.isArray(sizing.growthDrivers) && sizing.growthDrivers.length >= 3, 'Must have >= 3 growth drivers');
      });

      test('Industry Positioning must define market quadrant, analyst consensus, and risk vector', () => {
        const pos = brief.marketAnalysis.industryPositioning;
        assert.ok(pos, `${brief.companyName} must have industryPositioning`);
        assert.ok(pos.quadrant, 'Quadrant must be defined');
        assert.ok(pos.analystConsensus, 'Analyst consensus must be defined');
        assert.ok(pos.differentiationScore >= 80, 'Differentiation score must be >= 80');
        assert.ok(pos.threatVector, 'Risk/threat vector must be defined');
      });

      test('Financial Efficiency Scorecard must cover Rule of 40, CAC payback, and NRR', () => {
        const eff = brief.marketAnalysis.financialEfficiencyScorecard;
        assert.ok(eff, `${brief.companyName} must have financialEfficiencyScorecard`);
        assert.ok(eff.ruleOf40 && eff.ruleOf40Status, 'Rule of 40 must be evaluated');
        assert.ok(eff.cacPaybackMonths, 'CAC payback must be estimated');
        assert.ok(eff.netRevenueRetention, 'NRR must be specified');
        assert.ok(eff.salesEfficiency, 'Sales efficiency must be specified');
      });

      test('Market Sensitivity Analysis must define Bull, Base, and Bear scenarios', () => {
        const scen = brief.marketAnalysis.marketSensitivityAnalysis;
        assert.ok(scen, `${brief.companyName} must have marketSensitivityAnalysis`);
        assert.ok(scen.bullCaseScenario && scen.bullCaseScenario.length > 30, 'Bull case must be detailed');
        assert.ok(scen.baseCaseScenario && scen.baseCaseScenario.length > 30, 'Base case must be detailed');
        assert.ok(scen.bearCaseScenario && scen.bearCaseScenario.length > 30, 'Bear case must be detailed');
      });
    });
  }

  test('validateBrief() correctly passes valid briefs and fails invalid ones', () => {
    const validSnap = validateBrief(briefs.snap);
    assert.strictEqual(validSnap.isValid, true);
    assert.strictEqual(validSnap.errors.length, 0);

    const oversized = {
      briefItems: [
        { number: 1, sentences: new Array(220).fill('word').join(' ') },
        { number: 2, sentences: 'test' },
        { number: 3, sentences: 'test' },
        { number: 4, sentences: 'test' },
        { number: 5, sentences: 'test' }
      ]
    };
    const invalidResult = validateBrief(oversized);
    assert.strictEqual(invalidResult.isValid, false);
    assert.ok(invalidResult.errors.some(e => e.includes('exceeds the strict 200-word limit')));
  });
});

describe('Web Server API Endpoints (Local Testing)', () => {
  test('GET /api/health returns 200 and ok status', async () => {
    const res = await executeMockRequest('GET', '/api/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  test('GET /api/briefs returns summary list of all 5 companies', async () => {
    const res = await executeMockRequest('GET', '/api/briefs');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.briefs));
    assert.strictEqual(res.body.briefs.length, 5);
    assert.ok(res.body.briefs.some(b => b.id === 'snap'));
    assert.ok(res.body.briefs.some(b => b.id === 'openai'));
    assert.ok(res.body.briefs.some(b => b.id === 'nvidia'));
  });

  test('GET /api/briefs/snap returns complete Snap Inc. brief', async () => {
    const res = await executeMockRequest('GET', '/api/briefs/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.strictEqual(res.body.briefItems.length, 5);
  });

  test('GET /api/briefs/openai returns complete OpenAI brief', async () => {
    const res = await executeMockRequest('GET', '/api/briefs/openai');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'OpenAI');
    assert.strictEqual(res.body.totalWordCount, 161);
  });

  test('POST /api/verify performs real-time validation on submitted payload', async () => {
    const res = await executeMockRequest('POST', '/api/verify', briefs.snap);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isValid, true);
    assert.strictEqual(res.body.wordCount, 182);
  });

  test('GET /api/market returns market overview across all companies', async () => {
    const res = await executeMockRequest('GET', '/api/market');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.marketOverview));
    assert.strictEqual(res.body.marketOverview.length, 5);
    assert.ok(res.body.marketOverview.every(m => m.tam && m.competitorCount >= 2));
  });

  test('GET /api/market/snap returns detailed market intelligence for Snap Inc.', async () => {
    const res = await executeMockRequest('GET', '/api/market/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.marketAnalysis.tam);
    assert.ok(res.body.marketAnalysis.keyCompetitors.length >= 2);
    assert.ok(res.body.marketAnalysis.strategicMoats.length >= 2);
  });

  test('GET /api/diagnostics returns self-healing health check and passes all 5 accounts', async () => {
    const res = await executeMockRequest('GET', '/api/diagnostics');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.checksTotal, 5);
    assert.strictEqual(res.body.checksPassed, 5);
    assert.ok(res.body.diagnostics.every(d => d.status === 'PASS'));
  });

  test('GET /api/all returns complete portfolio bundle for one-shot fetch', async () => {
    const res = await executeMockRequest('GET', '/api/all');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.totalAccounts, 5);
    assert.ok(res.body.briefs.snap);
    assert.ok(res.body.briefs.stripe);
    assert.ok(res.body.briefs.datadog);
    assert.ok(res.body.briefs.openai);
    assert.ok(res.body.briefs.nvidia);
  });

  test('GET /api/briefs/nvidia returns complete NVIDIA Corporation brief', async () => {
    const res = await executeMockRequest('GET', '/api/briefs/nvidia');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'NVIDIA Corporation');
    assert.strictEqual(res.body.totalWordCount, 172);
  });

  test('GET /api/briefs/stripe returns complete Stripe, Inc. brief', async () => {
    const res = await executeMockRequest('GET', '/api/briefs/stripe');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Stripe, Inc.');
    assert.strictEqual(res.body.totalWordCount, 160);
  });

  test('GET /api/briefs/datadog returns complete Datadog, Inc. brief', async () => {
    const res = await executeMockRequest('GET', '/api/briefs/datadog');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Datadog, Inc.');
    assert.strictEqual(res.body.totalWordCount, 170);
  });

  test('GET /api/briefs/nonexistent returns HTTP 404 with error message', async () => {
    const res = await executeMockRequest('GET', '/api/briefs/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/market/nonexistent returns HTTP 404 with error message', async () => {
    const res = await executeMockRequest('GET', '/api/market/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('OPTIONS preflight returns HTTP 204 with CORS headers', async () => {
    const res = await executeMockRequest('OPTIONS', '/api/briefs');
    assert.strictEqual(res.statusCode, 204);
  });

  test('POST /api/verify correctly flags warnings when Item 3 lacks dates or links', async () => {
    const sample = {
      briefItems: [
        { number: 1, sentences: 'Plain sentence.' },
        { number: 2, sentences: 'Money sentence.' },
        { number: 3, sentences: 'Some news happened without any month or link.' },
        { number: 4, sentences: 'Customer sentence.' },
        { number: 5, sentences: 'Question sentence?' }
      ]
    };
    const res = await executeMockRequest('POST', '/api/verify', sample);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.warnings.some(w => w.includes('specific month and year')));
    assert.ok(res.body.warnings.some(w => w.includes('verified source links')));
  });

  test('GET /api/financials returns overview across all 5 companies', async () => {
    const res = await executeMockRequest('GET', '/api/financials');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.financialsOverview));
    assert.strictEqual(res.body.financialsOverview.length, 5);
    assert.ok(res.body.financialsOverview.every(f => f.financials && f.financials.statPills));
  });

  test('GET /api/financials/snap returns Snap Inc. financial unit economics', async () => {
    const res = await executeMockRequest('GET', '/api/financials/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.financials.annualRevenue);
    assert.ok(res.body.financials.globalDAUs);
    assert.ok(res.body.financials.arpu);
  });

  test('GET /api/analysis/snap returns complete research dossier (TAM, SWOT, Porters, Objections)', async () => {
    const res = await executeMockRequest('GET', '/api/analysis/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.portersFiveForces.industryRivalry);
    assert.ok(res.body.swotAnalysis.strengths.length >= 3);
    assert.ok(res.body.objectionHandling.length >= 2);
  });

  test('GET /api/analysis/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/analysis/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/battlecards returns battlecards overview across all 5 companies', async () => {
    const res = await executeMockRequest('GET', '/api/battlecards');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.battlecardsOverview));
    assert.strictEqual(res.body.battlecardsOverview.length, 5);
    assert.ok(res.body.battlecardsOverview.every(b => b.battlecards.length >= 2));
  });

  test('GET /api/battlecards/snap returns Snap Inc. battlecards with kill-shot pitch', async () => {
    const res = await executeMockRequest('GET', '/api/battlecards/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(Array.isArray(res.body.battlecards) && res.body.battlecards.length >= 2);
    assert.ok(res.body.battlecards[0].killShotPitch);
    assert.ok(res.body.battlecards[0].landmineQuestions.length >= 2);
  });

  test('GET /api/meddpicc returns MEDDPICC overview across all 5 companies', async () => {
    const res = await executeMockRequest('GET', '/api/meddpicc');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.meddpiccOverview));
    assert.strictEqual(res.body.meddpiccOverview.length, 5);
    assert.ok(res.body.meddpiccOverview.every(m => m.meddpicc && m.meddpicc.metrics));
  });

  test('GET /api/meddpicc/snap returns Snap Inc. MEDDPICC framework', async () => {
    const res = await executeMockRequest('GET', '/api/meddpicc/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.meddpicc.economicBuyer);
    assert.ok(res.body.meddpicc.identifyPain);
  });

  test('GET /api/onboarding/snap returns Snap 30-60-90 day onboarding plan', async () => {
    const res = await executeMockRequest('GET', '/api/onboarding/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.onboardingPlan.phase30.deliverables.length >= 3);
  });

  test('GET /api/icp/snap returns Snap ICP criteria and buyer personas', async () => {
    const res = await executeMockRequest('GET', '/api/icp/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.icpBuyerPersonas.personas.length >= 2);
  });

  test('GET /api/export/snap returns formatted markdown file download', async () => {
    const res = await executeMockRequest('GET', '/api/export/snap');
    assert.strictEqual(res.statusCode, 200);
    const contentType = res.headers['content-type'] || res.headers['Content-Type'] || '';
    assert.ok(contentType.includes('text/markdown'));
    assert.ok(res.body.includes('# Executive Account Brief: Snap Inc.'));
    assert.ok(res.body.includes('## Competitive Battlecards'));
  });

  test('GET /api/export/snap?format=json returns full JSON dossier download', async () => {
    const res = await executeMockRequest('GET', '/api/export/snap?format=json');
    assert.strictEqual(res.statusCode, 200);
    const contentType = res.headers['content-type'] || res.headers['Content-Type'] || '';
    assert.ok(contentType.includes('application/json'));
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.marketAnalysis.meddpiccQualification);
  });

  test('GET /api/battlecards/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/battlecards/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/meddpicc/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/meddpicc/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/onboarding/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/onboarding/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/icp/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/icp/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/export/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/export/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/market/sizing returns TAM/SAM/SOM overview across all 5 companies', async () => {
    const res = await executeMockRequest('GET', '/api/market/sizing');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.marketSizingOverview));
    assert.strictEqual(res.body.marketSizingOverview.length, 5);
    assert.ok(res.body.marketSizingOverview.every(s => s.sizing && s.sizing.tam && s.sizing.sam && s.sizing.som));
  });

  test('GET /api/market/sizing/snap returns Snap Inc. market sizing', async () => {
    const res = await executeMockRequest('GET', '/api/market/sizing/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.marketSizing.tam);
    assert.ok(res.body.marketSizing.growthDrivers.length >= 3);
  });

  test('GET /api/market/positioning/snap returns Snap Inc. positioning', async () => {
    const res = await executeMockRequest('GET', '/api/market/positioning/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.industryPositioning.quadrant);
    assert.ok(res.body.industryPositioning.differentiationScore >= 80);
  });

  test('GET /api/market/metrics/snap returns Snap Inc. financial efficiency metrics', async () => {
    const res = await executeMockRequest('GET', '/api/market/metrics/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.financialEfficiencyScorecard.ruleOf40);
    assert.ok(res.body.financialEfficiencyScorecard.netRevenueRetention);
  });

  test('GET /api/market/scenarios/snap returns Snap Inc. sensitivity scenarios', async () => {
    const res = await executeMockRequest('GET', '/api/market/scenarios/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyName, 'Snap Inc.');
    assert.ok(res.body.marketSensitivityAnalysis.bullCaseScenario);
    assert.ok(res.body.marketSensitivityAnalysis.baseCaseScenario);
    assert.ok(res.body.marketSensitivityAnalysis.bearCaseScenario);
  });

  test('GET /api/market/sizing/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/market/sizing/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/market/positioning/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/market/positioning/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/market/metrics/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/market/metrics/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/market/scenarios/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/market/scenarios/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/export/snap?format=csv returns CSV formatted brief', async () => {
    const res = await executeMockRequest('GET', '/api/export/snap?format=csv');
    assert.strictEqual(res.statusCode, 200);
    const contentType = res.headers['content-type'] || res.headers['Content-Type'] || '';
    assert.ok(contentType.includes('text/csv'));
    assert.ok(res.body.includes('Snap Inc.'));
    assert.ok(res.body.includes('Item1_WhatItDoes'));
  });

  test('GET /api/export?format=csv exports portfolio table in CSV format', async () => {
    const res = await executeMockRequest('GET', '/api/export?format=csv');
    assert.strictEqual(res.statusCode, 200);
    const contentType = res.headers['content-type'] || res.headers['Content-Type'] || '';
    assert.ok(contentType.includes('text/csv'));
    assert.ok(res.body.includes('Snap Inc.'));
    assert.ok(res.body.includes('NVIDIA Corporation'));
    assert.ok(res.body.includes('OpenAI'));
  });

  test('GET /api/calculator returns overview of all 5 deal value calculators', async () => {
    const res = await executeMockRequest('GET', '/api/calculator');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.calculators));
    assert.strictEqual(res.body.calculators.length, 5);
    assert.ok(res.body.calculators.some(c => c.id === 'snap'));
    assert.ok(res.body.calculators.some(c => c.id === 'nvidia'));
  });

  test('GET /api/calculator/snap returns calculator schema and default results', async () => {
    const res = await executeMockRequest('GET', '/api/calculator/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyId, 'snap');
    assert.ok(res.body.inputs.length >= 4);
    assert.ok(res.body.result.estimatedROAS);
    assert.ok(res.body.result.executivePitch);
  });

  test('POST /api/calculator/nvidia computes real-time Blackwell cluster ROI', async () => {
    const customPayload = {
      gpuCount: 2048,
      trainingDaysPerRun: 60,
      blackwellSpeedup: 4.0,
      annualPowerCost: 8000000,
      powerReductionPct: 70
    };
    const res = await executeMockRequest('POST', '/api/calculator/nvidia', customPayload);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyId, 'nvidia');
    assert.ok(res.body.result.daysSavedPerTrainingRun.includes('45 days saved'));
    assert.ok(res.body.result.executivePitch.includes('Blackwell'));
  });

  test('GET /api/calculator/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/calculator/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/search returns relevant results across portfolio for keyword "blackwell"', async () => {
    const res = await executeMockRequest('GET', '/api/search?q=blackwell');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.query, 'blackwell');
    assert.ok(res.body.totalMatches >= 1);
    assert.ok(res.body.results.some(r => r.companyId === 'nvidia'));
  });

  test('GET /api/search returns empty list for blank query', async () => {
    const res = await executeMockRequest('GET', '/api/search?q=');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.totalMatches, 0);
    assert.deepStrictEqual(res.body.results, []);
  });

  test('POST /api/interview/evaluate scores candidate answer with quantitative metrics', async () => {
    const payload = {
      companyId: 'snap',
      question: 'How does Snap plan to counter TikTok and Meta in advertising?',
      candidateAnswer: 'Snap differentiates through high-intent augmented reality and close friend communications rather than passive public feed scrolling. Over 300 million daily users engage with AR lenses, generating an estimated 2.8x ROAS for retail advertisers through direct try-on features and 7-0 conversion attribution models.'
    };
    const res = await executeMockRequest('POST', '/api/interview/evaluate', payload);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.overallScore >= 60);
    assert.ok(['Strong', 'Elite'].includes(res.body.grade));
    assert.ok(res.body.wordCount >= 30);
    assert.ok(Array.isArray(res.body.metricsHit));
    assert.ok(res.body.metricsHit.length >= 1);
    assert.ok(Array.isArray(res.body.strengths) && res.body.strengths.length >= 1);
    assert.ok(res.body.modelAnswerSnippet);
  });

  test('POST /api/interview/evaluate penalizes very short answers', async () => {
    const payload = {
      companyId: 'snap',
      question: 'Why Snap?',
      candidateAnswer: 'I like social media.'
    };
    const res = await executeMockRequest('POST', '/api/interview/evaluate', payload);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.grade, 'Incomplete');
    assert.ok(res.body.overallScore < 50);
    assert.ok(res.body.coachingTips.some(tip => tip.includes('length')));
  });

  test('POST /api/interview/evaluate returns 404 for nonexistent company', async () => {
    const payload = {
      companyId: 'nonexistent',
      question: 'Question?',
      candidateAnswer: 'Some answer about nonexistent company.'
    };
    const res = await executeMockRequest('POST', '/api/interview/evaluate', payload);
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('POST /api/interview/evaluate returns 400 when companyId is missing', async () => {
    const payload = {
      question: 'Question?',
      candidateAnswer: 'Some answer with no companyId.'
    };
    const res = await executeMockRequest('POST', '/api/interview/evaluate', payload);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  test('GET /cover-card.svg returns 200 with image/svg+xml content type', async () => {
    const res = await executeMockRequest('GET', '/cover-card.svg');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('image/svg+xml'));
    assert.ok(res.rawBody.includes('<svg'));
  });

  test('GET /test-results-card.svg returns 200 with image/svg+xml content type', async () => {
    const res = await executeMockRequest('GET', '/test-results-card.svg');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('image/svg+xml'));
    assert.ok(res.rawBody.includes('<svg'));
    assert.ok(res.rawBody.includes('156 / 156') || res.rawBody.includes('LOCAL TEST EXECUTION SUITE'));
  });

  test('GET /api/flashcards returns overview across all 5 accounts', async () => {
    const res = await executeMockRequest('GET', '/api/flashcards');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.flashcardDecks));
    assert.strictEqual(res.body.flashcardDecks.length, 5);
    assert.ok(res.body.flashcardDecks.every(d => d.cardCount === 7));
  });

  test('GET /api/flashcards/snap returns 7 tailored study cards', async () => {
    const res = await executeMockRequest('GET', '/api/flashcards/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyId, 'snap');
    assert.strictEqual(res.body.totalCards, 7);
    assert.ok(res.body.cards.length === 7);
    assert.ok(res.body.cards[0].front && res.body.cards[0].back);
  });

  test('GET /api/flashcards/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/flashcards/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/presentation/snap returns 6-slide executive pitch deck', async () => {
    const res = await executeMockRequest('GET', '/api/presentation/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyId, 'snap');
    assert.strictEqual(res.body.totalSlides, 6);
    assert.ok(Array.isArray(res.body.slides));
    assert.strictEqual(res.body.slides.length, 6);
    assert.ok(res.body.slides[0].title.includes('Snap Inc.'));
  });

  test('GET /api/presentation/nonexistent returns HTTP 404', async () => {
    const res = await executeMockRequest('GET', '/api/presentation/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  test('GET /api/compare returns complete 5-account institutional comparison matrix', async () => {
    const res = await executeMockRequest('GET', '/api/compare');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.totalAccounts, 5);
    assert.ok(Array.isArray(res.body.matrix));
    assert.strictEqual(res.body.matrix.length, 5);
    assert.ok(res.body.matrix.every(m => m.companyName && m.tam && m.monetization && m.killShotPitch));
  });

  test('GET /api/quiz returns quiz overview across all accounts', async () => {
    const res = await executeMockRequest('GET', '/api/quiz');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.quizzes));
    assert.strictEqual(res.body.quizzes.length, 5);
  });

  test('GET /api/quiz/snap returns 5 multiple-choice questions without leaking correctIndex', async () => {
    const res = await executeMockRequest('GET', '/api/quiz/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.companyId, 'snap');
    assert.strictEqual(res.body.totalQuestions, 5);
    assert.strictEqual(res.body.questions.length, 5);
    assert.strictEqual(res.body.questions[0].correctIndex, undefined);
    assert.strictEqual(res.body.questions[0].options.length, 4);
  });

  test('POST /api/quiz/evaluate grades quiz submission with verified feedback', async () => {
    const payload = {
      companyId: 'snap',
      answers: { q1: 0, q2: 1, q3: 1, q4: 2, q5: 1 }
    };
    const res = await executeMockRequest('POST', '/api/quiz/evaluate', payload);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.totalQuestions, 5);
    assert.strictEqual(res.body.correctAnswers, 5);
    assert.strictEqual(res.body.percentage, 100);
    assert.ok(res.body.status.includes('Interview Ready'));
  });

  test('GET /print/snap returns styled printable HTML cheat sheet', async () => {
    const res = await executeMockRequest('GET', '/print/snap');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.rawBody.includes('Snap Inc.'));
    assert.ok(res.rawBody.includes('window.print()'));
  });
});
