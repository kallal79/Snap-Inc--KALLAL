// scripts/verify-all.js
// Automated End-to-End Diagnostics & Route Verification Runner
const briefs = require('../data/briefs');
const { handleRequest, validateBrief, calculateWordCount, calculateReadingSeconds } = require('../server');
const { Readable, Writable } = require('node:stream');

// In-process mock HTTP dispatcher with full Writable stream support
function dispatchRequest(method, url, payload = null) {
  return new Promise((resolve) => {
    const start = performance.now();
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
      const latencyMs = (performance.now() - start).toFixed(2);
      let parsed = responseBody;
      const cType = headers['content-type'] || '';
      try {
        if (cType.includes('application/json')) {
          parsed = JSON.parse(responseBody);
        }
      } catch (e) {}
      resolve({ statusCode, headers, body: parsed, rawBody: responseBody, latencyMs });
    });

    handleRequest(req, res);
  });
}

async function runAllDiagnostics(exitOnComplete = false) {
  console.log('================================================================');
  console.log('   90-SECOND ACCOUNT BRIEF: AUTOMATED END-TO-END DIAGNOSTICS   ');
  console.log('================================================================\n');

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  function assertCheck(description, condition, extraInfo = '') {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  [PASS] ${description} ${extraInfo}`);
    } else {
      failedChecks++;
      console.error(`  [FAIL] ${description} ${extraInfo}`);
    }
  }

  // 1. Static Asset Routes
  console.log('--- 1. Probing Static Assets & Web Frontend ---');
  const staticRoutes = [
    { url: '/', type: 'text/html', desc: 'SPA Index HTML' },
    { url: '/style.css', type: 'text/css', desc: 'Design System CSS' },
    { url: '/app.js', type: 'application/javascript', desc: 'Client Application JS' },
    { url: '/cover-card.svg', type: 'image/svg+xml', desc: '3:2 Ratio Cover Card SVG' },
    { url: '/test-results-card.svg', type: 'image/svg+xml', desc: 'Local Test Results Dashboard SVG' }
  ];

  for (const route of staticRoutes) {
    const res = await dispatchRequest('GET', route.url);
    const contentType = res.headers['content-type'] || '';
    assertCheck(
      `Route ${route.url} (${route.desc})`,
      res.statusCode === 200 && contentType.includes(route.type),
      `(${res.latencyMs}ms, ${res.rawBody.length} bytes)`
    );
  }

  // 2. Health & Core API Routes
  console.log('\n--- 2. Probing Core REST API Endpoints ---');
  const healthRes = await dispatchRequest('GET', '/api/health');
  assertCheck(
    'GET /api/health returns status: ok',
    healthRes.statusCode === 200 && healthRes.body.status === 'ok',
    `(${healthRes.latencyMs}ms)`
  );

  const briefsListRes = await dispatchRequest('GET', '/api/briefs');
  assertCheck(
    'GET /api/briefs returns 5 featured companies',
    briefsListRes.statusCode === 200 && Array.isArray(briefsListRes.body.briefs) && briefsListRes.body.briefs.length === 5,
    `(${briefsListRes.latencyMs}ms)`
  );

  const marketListRes = await dispatchRequest('GET', '/api/market');
  assertCheck(
    'GET /api/market returns market overview for all 5 companies',
    marketListRes.statusCode === 200 && Array.isArray(marketListRes.body.marketOverview) && marketListRes.body.marketOverview.length === 5,
    `(${marketListRes.latencyMs}ms)`
  );

  const diagRes = await dispatchRequest('GET', '/api/diagnostics');
  assertCheck(
    'GET /api/diagnostics passes self-healing checks on all accounts',
    diagRes.statusCode === 200 && diagRes.body.status === 'healthy' && diagRes.body.checksPassed === 5,
    `(${diagRes.latencyMs}ms, ${diagRes.body.checksPassed}/${diagRes.body.checksTotal} passed)`
  );

  const allRes = await dispatchRequest('GET', '/api/all');
  assertCheck(
    'GET /api/all fetches complete portfolio bundle (Snap, Stripe, Datadog, OpenAI, NVIDIA)',
    allRes.statusCode === 200 && allRes.body.status === 'ok' && allRes.body.totalAccounts === 5,
    `(${allRes.latencyMs}ms, ${JSON.stringify(allRes.body.accounts)})`
  );

  const finListRes = await dispatchRequest('GET', '/api/financials');
  assertCheck(
    'GET /api/financials returns financial unit economics overview across all 5 companies',
    finListRes.statusCode === 200 && Array.isArray(finListRes.body.financialsOverview) && finListRes.body.financialsOverview.length === 5,
    `(${finListRes.latencyMs}ms)`
  );

  const sizingOverviewRes = await dispatchRequest('GET', '/api/market/sizing');
  assertCheck(
    'GET /api/market/sizing returns TAM/SAM/SOM sizing overview across all 5 companies',
    sizingOverviewRes.statusCode === 200 && Array.isArray(sizingOverviewRes.body.marketSizingOverview) && sizingOverviewRes.body.marketSizingOverview.length === 5,
    `(${sizingOverviewRes.latencyMs}ms)`
  );

  // 3. Multi-Company Brief Verification
  console.log('\n--- 3. Verifying Multi-Company Brief Constraints ---');
  const companyIds = ['snap', 'stripe', 'datadog', 'openai', 'nvidia'];

  for (const id of companyIds) {
    const res = await dispatchRequest('GET', `/api/briefs/${id}`);
    const b = res.body;

    assertCheck(
      `GET /api/briefs/${id} returns HTTP 200`,
      res.statusCode === 200 && b.companyName,
      `(${res.latencyMs}ms)`
    );

    // Calculate actual words from sentences
    const fullText = b.briefItems.map(i => i.sentences).join(' ');
    const calculatedWords = calculateWordCount(fullText);
    const readSecs = calculateReadingSeconds(calculatedWords, 130);

    assertCheck(
      `  • ${b.companyName}: Word count strictly under 200 words`,
      calculatedWords < 200 && calculatedWords === b.totalWordCount,
      `(${calculatedWords} words)`
    );

    assertCheck(
      `  • ${b.companyName}: Reading time fits 90s window (70-90s)`,
      readSecs <= 90 && readSecs >= 70,
      `(${readSecs}s @ 130 WPM)`
    );

    assertCheck(
      `  • ${b.companyName}: Handshake description <= 500 characters`,
      b.handshakeSubmission.description.length <= 500 && b.handshakeSubmission.description.length === b.handshakeSubmission.descriptionCharCount,
      `(${b.handshakeSubmission.description.length}/500 chars)`
    );

    // Check Market endpoint for this company
    const marketRes = await dispatchRequest('GET', `/api/market/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/market/${id} returns TAM & Competitors`,
      marketRes.statusCode === 200 && marketRes.body.marketAnalysis.keyCompetitors.length >= 2,
      `(${marketRes.latencyMs}ms)`
    );

    // Check Financials endpoint
    const finRes = await dispatchRequest('GET', `/api/financials/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/financials/${id} returns unit economics & stat pills`,
      finRes.statusCode === 200 && finRes.body.financials && finRes.body.financials.statPills.length >= 4,
      `(${finRes.latencyMs}ms)`
    );

    // Check Deep Analysis endpoint (Porter's 5 Forces, SWOT, Objections)
    const analysisRes = await dispatchRequest('GET', `/api/analysis/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/analysis/${id} returns SWOT, Porters & Objections`,
      analysisRes.statusCode === 200 && analysisRes.body.portersFiveForces && analysisRes.body.swotAnalysis && analysisRes.body.objectionHandling.length >= 2,
      `(${analysisRes.latencyMs}ms)`
    );

    // Check Battlecards endpoint
    const bcRes = await dispatchRequest('GET', `/api/battlecards/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/battlecards/${id} returns rival battlecards & kill-shots`,
      bcRes.statusCode === 200 && Array.isArray(bcRes.body.battlecards) && bcRes.body.battlecards.length >= 2,
      `(${bcRes.latencyMs}ms)`
    );

    // Check MEDDPICC endpoint
    const medRes = await dispatchRequest('GET', `/api/meddpicc/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/meddpicc/${id} returns 8-dimension deal qualification`,
      medRes.statusCode === 200 && medRes.body.meddpicc && medRes.body.meddpicc.metrics,
      `(${medRes.latencyMs}ms)`
    );

    // Check 30-60-90 Day Onboarding endpoint
    const onbRes = await dispatchRequest('GET', `/api/onboarding/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/onboarding/${id} returns 3-phase onboarding roadmap`,
      onbRes.statusCode === 200 && onbRes.body.onboardingPlan.phase30.deliverables.length >= 3,
      `(${onbRes.latencyMs}ms)`
    );

    // Check ICP & Personas endpoint
    const icpRes = await dispatchRequest('GET', `/api/icp/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/icp/${id} returns firmographics & buyer personas`,
      icpRes.statusCode === 200 && icpRes.body.icpBuyerPersonas.personas.length >= 2,
      `(${icpRes.latencyMs}ms)`
    );

    // Check Export endpoint (Markdown & JSON)
    const expMdRes = await dispatchRequest('GET', `/api/export/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/export/${id} exports valid markdown dossier`,
      expMdRes.statusCode === 200 && (expMdRes.headers['content-type'] || '').includes('text/markdown') && expMdRes.rawBody.length > 500,
      `(${expMdRes.latencyMs}ms, ${expMdRes.rawBody.length} bytes)`
    );

    const expJsonRes = await dispatchRequest('GET', `/api/export/${id}?format=json`);
    assertCheck(
      `  • ${b.companyName}: GET /api/export/${id}?format=json exports valid JSON bundle`,
      expJsonRes.statusCode === 200 && (expJsonRes.headers['content-type'] || '').includes('application/json') && expJsonRes.body.companyName,
      `(${expJsonRes.latencyMs}ms)`
    );

    // Check Market Sizing per-company
    const sizeRes = await dispatchRequest('GET', `/api/market/sizing/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/market/sizing/${id} returns TAM/SAM/SOM breakdown`,
      sizeRes.statusCode === 200 && sizeRes.body.marketSizing && sizeRes.body.marketSizing.tam,
      `(${sizeRes.latencyMs}ms)`
    );

    // Check Industry Positioning per-company
    const posRes = await dispatchRequest('GET', `/api/market/positioning/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/market/positioning/${id} returns quadrant & analyst consensus`,
      posRes.statusCode === 200 && posRes.body.industryPositioning && posRes.body.industryPositioning.quadrant,
      `(${posRes.latencyMs}ms)`
    );

    // Check Financial Efficiency Scorecard per-company
    const effRes = await dispatchRequest('GET', `/api/market/metrics/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/market/metrics/${id} returns Rule of 40 & NRR`,
      effRes.statusCode === 200 && effRes.body.financialEfficiencyScorecard && effRes.body.financialEfficiencyScorecard.ruleOf40,
      `(${effRes.latencyMs}ms)`
    );

    // Check Market Sensitivity Scenarios per-company
    const scenRes = await dispatchRequest('GET', `/api/market/scenarios/${id}`);
    assertCheck(
      `  • ${b.companyName}: GET /api/market/scenarios/${id} returns Bull, Base & Bear scenarios`,
      scenRes.statusCode === 200 && scenRes.body.marketSensitivityAnalysis && scenRes.body.marketSensitivityAnalysis.bullCaseScenario,
      `(${scenRes.latencyMs}ms)`
    );
  }

  // 4. Real-time POST /api/verify validation endpoint
  console.log('\n--- 4. Testing POST /api/verify Engine ---');
  const validPostRes = await dispatchRequest('POST', '/api/verify', briefs.snap);
  assertCheck(
    'POST /api/verify passes valid Snap brief',
    validPostRes.statusCode === 200 && validPostRes.body.isValid === true && validPostRes.body.wordCount === 182,
    `(${validPostRes.latencyMs}ms)`
  );

  const invalidPostRes = await dispatchRequest('POST', '/api/verify', {
    briefItems: [
      { number: 1, sentences: new Array(220).fill('excessive').join(' ') },
      { number: 2, sentences: 'sample' },
      { number: 3, sentences: 'sample' },
      { number: 4, sentences: 'sample' },
      { number: 5, sentences: 'sample' }
    ]
  });
  assertCheck(
    'POST /api/verify rejects oversized brief (>200 words)',
    invalidPostRes.statusCode === 200 && invalidPostRes.body.isValid === false && invalidPostRes.body.errors.length > 0,
    `(${invalidPostRes.latencyMs}ms, properly caught error)`
  );

  const warnPostRes = await dispatchRequest('POST', '/api/verify', {
    briefItems: [
      { number: 1, sentences: 'Valid plain text.' },
      { number: 2, sentences: 'Valid revenue model.' },
      { number: 3, sentences: 'News without any month or url link here.' },
      { number: 4, sentences: 'Valid customer definition.' },
      { number: 5, sentences: 'Valid strategic question?' }
    ]
  });
  assertCheck(
    'POST /api/verify flags warnings for missing month/url in Item 3',
    warnPostRes.statusCode === 200 && warnPostRes.body.warnings.length >= 2,
    `(${warnPostRes.latencyMs}ms, ${warnPostRes.body.warnings.length} warnings)`
  );

  // 5. Deal Value Calculators & CRM Exports
  console.log('\n--- 5. Probing Deal Value Calculators & CRM Exports ---');
  const csvExportRes = await dispatchRequest('GET', '/api/export/snap?format=csv');
  assertCheck(
    'GET /api/export/snap?format=csv returns CSV file with headers',
    csvExportRes.statusCode === 200 && csvExportRes.headers['content-type'].includes('text/csv') && csvExportRes.rawBody.includes('Item1_WhatItDoes'),
    `(${csvExportRes.latencyMs}ms)`
  );

  const allCsvRes = await dispatchRequest('GET', '/api/export?format=csv');
  assertCheck(
    'GET /api/export?format=csv returns complete portfolio CSV',
    allCsvRes.statusCode === 200 && allCsvRes.rawBody.includes('NVIDIA Corporation'),
    `(${allCsvRes.latencyMs}ms)`
  );

  const calcListRes = await dispatchRequest('GET', '/api/calculator');
  assertCheck(
    'GET /api/calculator returns all 5 deal calculators',
    calcListRes.statusCode === 200 && calcListRes.body.calculators.length === 5,
    `(${calcListRes.latencyMs}ms)`
  );

  const calcSnapRes = await dispatchRequest('GET', '/api/calculator/snap');
  assertCheck(
    'GET /api/calculator/snap returns schema and default results',
    calcSnapRes.statusCode === 200 && calcSnapRes.body.result.estimatedROAS,
    `(${calcSnapRes.latencyMs}ms)`
  );

  const calcNvRes = await dispatchRequest('POST', '/api/calculator/nvidia', {
    gpuCount: 2048,
    trainingDaysPerRun: 60,
    blackwellSpeedup: 4.0,
    annualPowerCost: 8000000,
    powerReductionPct: 70
  });
  assertCheck(
    'POST /api/calculator/nvidia computes real-time Blackwell cluster ROI',
    calcNvRes.statusCode === 200 && calcNvRes.body.result.executivePitch.includes('Blackwell'),
    `(${calcNvRes.latencyMs}ms)`
  );

  // 6. Universal Search & Mock Interview Evaluator
  console.log('\n--- 6. Universal Search, Flashcards & Presentation Deck Probes ---');
  const searchRes = await dispatchRequest('GET', '/api/search?q=blackwell');
  assertCheck(
    'GET /api/search?q=blackwell returns verified NVIDIA results',
    searchRes.statusCode === 200 && searchRes.body.totalMatches >= 1 && searchRes.body.results.some(r => r.companyId === 'nvidia'),
    `(${searchRes.latencyMs}ms, ${searchRes.body.totalMatches} matches)`
  );

  const flashOverviewRes = await dispatchRequest('GET', '/api/flashcards');
  assertCheck(
    'GET /api/flashcards returns study decks across all 5 accounts',
    flashOverviewRes.statusCode === 200 && flashOverviewRes.body.flashcardDecks.length === 5,
    `(${flashOverviewRes.latencyMs}ms)`
  );

  const flashSnapRes = await dispatchRequest('GET', '/api/flashcards/snap');
  assertCheck(
    'GET /api/flashcards/snap returns 7 interactive study flashcards',
    flashSnapRes.statusCode === 200 && flashSnapRes.body.totalCards === 7 && flashSnapRes.body.cards.length === 7,
    `(${flashSnapRes.latencyMs}ms)`
  );

  const presSnapRes = await dispatchRequest('GET', '/api/presentation/snap');
  assertCheck(
    'GET /api/presentation/snap returns 6-slide executive pitch deck',
    presSnapRes.statusCode === 200 && presSnapRes.body.totalSlides === 6 && presSnapRes.body.slides.length === 6,
    `(${presSnapRes.latencyMs}ms)`
  );

  const compareRes = await dispatchRequest('GET', '/api/compare');
  assertCheck(
    'GET /api/compare returns 5-account institutional comparison matrix',
    compareRes.statusCode === 200 && compareRes.body.totalAccounts === 5 && compareRes.body.matrix.length === 5,
    `(${compareRes.latencyMs}ms)`
  );

  const quizOverviewRes = await dispatchRequest('GET', '/api/quiz');
  assertCheck(
    'GET /api/quiz returns quiz suites across all 5 accounts',
    quizOverviewRes.statusCode === 200 && quizOverviewRes.body.quizzes.length === 5,
    `(${quizOverviewRes.latencyMs}ms)`
  );

  const quizSnapRes = await dispatchRequest('GET', '/api/quiz/snap');
  assertCheck(
    'GET /api/quiz/snap returns 5 questions without leaking answers',
    quizSnapRes.statusCode === 200 && quizSnapRes.body.totalQuestions === 5 && quizSnapRes.body.questions.length === 5,
    `(${quizSnapRes.latencyMs}ms)`
  );

  const quizEvalRes = await dispatchRequest('POST', '/api/quiz/evaluate', {
    companyId: 'snap',
    answers: { q1: 0, q2: 1, q3: 1, q4: 2, q5: 1 }
  });
  assertCheck(
    'POST /api/quiz/evaluate scores candidate quiz with 100% readiness',
    quizEvalRes.statusCode === 200 && quizEvalRes.body.percentage === 100 && quizEvalRes.body.correctAnswers === 5,
    `(${quizEvalRes.latencyMs}ms, ${quizEvalRes.body.status})`
  );

  const printSnapRes = await dispatchRequest('GET', '/print/snap');
  assertCheck(
    'GET /print/snap returns publication-ready printable executive cheat sheet',
    printSnapRes.statusCode === 200 && printSnapRes.rawBody.includes('Snap Inc.') && printSnapRes.rawBody.includes('window.print()'),
    `(${printSnapRes.latencyMs}ms, ${printSnapRes.rawBody.length} bytes)`
  );

  const evalRes = await dispatchRequest('POST', '/api/interview/evaluate', {
    companyId: 'snap',
    question: 'How do you address AR ad measurement concerns?',
    candidateAnswer: 'Snap addresses conversion measurement through Conversions API (CAPI) and Advanced Conversions with 7-0 attribution, proving a 2.8x ROAS across direct-response brand campaigns.'
  });
  assertCheck(
    'POST /api/interview/evaluate grades answer with scoring rubric and feedback',
    evalRes.statusCode === 200 && evalRes.body.overallScore >= 60 && ['Solid', 'Strong', 'Elite'].includes(evalRes.body.grade) && evalRes.body.metricsHit.length >= 1,
    `(${evalRes.latencyMs}ms, score: ${evalRes.body.overallScore}/100 [${evalRes.body.grade}])`
  );

  // 7. Error & Preflight Edge Cases
  console.log('\n--- 7. Testing Error Handling & Preflight Edge Cases ---');
  const notFoundRes = await dispatchRequest('GET', '/api/briefs/nonexistent-company');
  assertCheck(
    'GET /api/briefs/nonexistent returns HTTP 404',
    notFoundRes.statusCode === 404 && notFoundRes.body.error,
    `(${notFoundRes.latencyMs}ms)`
  );

  const notFoundAnalysisRes = await dispatchRequest('GET', '/api/analysis/nonexistent-company');
  assertCheck(
    'GET /api/analysis/nonexistent returns HTTP 404',
    notFoundAnalysisRes.statusCode === 404 && notFoundAnalysisRes.body.error,
    `(${notFoundAnalysisRes.latencyMs}ms)`
  );

  const optionsRes = await dispatchRequest('OPTIONS', '/api/briefs');
  assertCheck(
    'OPTIONS preflight returns HTTP 204',
    optionsRes.statusCode === 204,
    `(${optionsRes.latencyMs}ms)`
  );

  console.log('\n================================================================');
  console.log(`   DIAGNOSTICS SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failedChecks > 0) {
    console.error(`\n❌ Failed checks detected: ${failedChecks}. Please review errors above.`);
    if (exitOnComplete) process.exit(1);
    throw new Error(`${failedChecks} diagnostic checks failed!`);
  } else {
    console.log('\n✅ ALL DIAGNOSTICS & SYSTEM CONSTRAINTS PASSED PERFECTLY!');
    if (exitOnComplete) process.exit(0);
    return { totalChecks, passedChecks, failedChecks };
  }
}

if (require.main === module) {
  runAllDiagnostics(true).catch(err => {
    console.error('Fatal diagnostics error:', err);
    process.exit(1);
  });
}

module.exports = { runAllDiagnostics, dispatchRequest };
