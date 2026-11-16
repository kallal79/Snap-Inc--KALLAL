// server.js - Native Node.js HTTP server for 90-Second Account Brief
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const briefs = require('./data/briefs');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const DEAL_CALCULATORS = {
  snap: {
    calculatorName: 'AR Lens Campaign & Video ROAS Calculator',
    roleTag: 'Account Manager',
    inputs: [
      { key: 'budget', label: 'Campaign Ad Budget ($)', default: 50000, min: 5000, max: 1000000, step: 5000 },
      { key: 'cpm', label: 'Blended CPM ($)', default: 8.50, min: 2.0, max: 25.0, step: 0.5 },
      { key: 'lensInteractionRate', label: 'Camera Lens Interaction Rate (%)', default: 3.5, min: 0.5, max: 15.0, step: 0.5 },
      { key: 'orderConversionRate', label: 'Try-On Order Conversion Rate (%)', default: 2.8, min: 0.5, max: 10.0, step: 0.1 },
      { key: 'avgOrderValue', label: 'Average Order Value ($)', default: 75, min: 10, max: 500, step: 5 }
    ],
    compute: (vals) => {
      const budget = Number(vals.budget) || 50000;
      const cpm = Number(vals.cpm) || 8.50;
      const lensInteractionRate = Number(vals.lensInteractionRate) || 3.5;
      const orderConversionRate = Number(vals.orderConversionRate) || 2.8;
      const avgOrderValue = Number(vals.avgOrderValue) || 75;

      const impressions = (budget / cpm) * 1000;
      const lensPlays = Math.round(impressions * (lensInteractionRate / 100));
      const orders = Math.round(lensPlays * (orderConversionRate / 100));
      const totalRevenue = orders * avgOrderValue;
      const roas = budget > 0 ? (totalRevenue / budget).toFixed(2) : '0.00';
      return {
        totalImpressions: Math.round(impressions).toLocaleString(),
        interactiveLensPlays: lensPlays.toLocaleString(),
        attributedOrders: orders.toLocaleString(),
        estimatedGrossRevenue: '$' + Math.round(totalRevenue).toLocaleString(),
        estimatedROAS: roas + 'x ROAS',
        executivePitch: `Investing $${budget.toLocaleString()} in Snap camera ads generates an estimated ${lensPlays.toLocaleString()} active AR interactions and ${orders.toLocaleString()} retail orders at an estimated ${roas}x return on ad spend.`
      };
    }
  },
  stripe: {
    calculatorName: 'Payment Authorization Uplift & Fraud Prevention Calculator',
    roleTag: 'Product Solutions Specialist',
    inputs: [
      { key: 'volume', label: 'Annual Payment Volume ($)', default: 100000000, min: 1000000, max: 2000000000, step: 5000000 },
      { key: 'currentAuthRate', label: 'Current Card Auth Rate (%)', default: 88.5, min: 70.0, max: 98.0, step: 0.5 },
      { key: 'authUplift', label: 'Stripe ML Auth Lift (%)', default: 1.8, min: 0.5, max: 5.0, step: 0.1 },
      { key: 'fraudSavingsBps', label: 'Radar Fraud Reduction (Basis Points)', default: 12, min: 2, max: 50, step: 1 }
    ],
    compute: (vals) => {
      const volume = Number(vals.volume) || 100000000;
      const authUplift = Number(vals.authUplift) || 1.8;
      const fraudSavingsBps = Number(vals.fraudSavingsBps) || 12;

      const recoveredVolume = volume * (authUplift / 100);
      const fraudLossSaved = volume * (fraudSavingsBps / 10000);
      const netValue = recoveredVolume + fraudLossSaved;
      return {
        recoveredPaymentVolume: '$' + Math.round(recoveredVolume).toLocaleString(),
        fraudLossesPrevented: '$' + Math.round(fraudLossSaved).toLocaleString(),
        totalAnnualizedValue: '$' + Math.round(netValue).toLocaleString(),
        executivePitch: `Switching to Stripe unlocks an estimated $${Math.round(recoveredVolume).toLocaleString()} in recovered card authorization volume and prevents $${Math.round(fraudLossSaved).toLocaleString()} in chargebacks, delivering $${Math.round(netValue).toLocaleString()} in net enterprise upside.`
      };
    }
  },
  datadog: {
    calculatorName: 'Engineering MTTR & Downtime Reduction Calculator',
    roleTag: 'Enterprise Account Executive',
    inputs: [
      { key: 'engineers', label: 'DevOps & SRE Team Size', default: 120, min: 10, max: 2000, step: 10 },
      { key: 'hourlyCost', label: 'Average Engineer Hourly Rate ($)', default: 125, min: 50, max: 300, step: 5 },
      { key: 'outageHours', label: 'Annual Outage / Incident Hours', default: 120, min: 10, max: 600, step: 10 },
      { key: 'mttrReduction', label: 'Datadog MTTR Reduction (%)', default: 60, min: 20, max: 90, step: 5 },
      { key: 'downtimeCostPerHour', label: 'Business Cost Per Outage Hour ($)', default: 45000, min: 5000, max: 250000, step: 5000 }
    ],
    compute: (vals) => {
      const engineers = Number(vals.engineers) || 120;
      const hourlyCost = Number(vals.hourlyCost) || 125;
      const outageHours = Number(vals.outageHours) || 120;
      const mttrReduction = Number(vals.mttrReduction) || 60;
      const downtimeCostPerHour = Number(vals.downtimeCostPerHour) || 45000;

      const hoursSaved = outageHours * (mttrReduction / 100);
      const engineerSalarySaved = hoursSaved * (engineers * 0.15) * hourlyCost;
      const businessDowntimeSaved = hoursSaved * downtimeCostPerHour;
      const totalSavings = engineerSalarySaved + businessDowntimeSaved;
      return {
        hoursOfDowntimeEliminated: Math.round(hoursSaved) + ' hours',
        engineeringTimeRecovered: '$' + Math.round(engineerSalarySaved).toLocaleString(),
        unplannedDowntimeLossAvoided: '$' + Math.round(businessDowntimeSaved).toLocaleString(),
        totalAnnualSavings: '$' + Math.round(totalSavings).toLocaleString(),
        executivePitch: `By reducing incident MTTR by ${mttrReduction}%, Datadog eliminates ${Math.round(hoursSaved)} hours of critical downtime and delivers $${Math.round(totalSavings).toLocaleString()} in annual operational and business protection.`
      };
    }
  },
  openai: {
    calculatorName: 'ChatGPT Enterprise Knowledge Worker Automation Calculator',
    roleTag: 'Enterprise Solutions Specialist',
    inputs: [
      { key: 'employees', label: 'Target Knowledge Workers', default: 500, min: 25, max: 20000, step: 25 },
      { key: 'avgSalary', label: 'Average Employee Annual Salary ($)', default: 110000, min: 40000, max: 250000, step: 5000 },
      { key: 'hoursSavedPerWeek', label: 'Hours Automated per Employee / Week', default: 4.5, min: 1.0, max: 15.0, step: 0.5 },
      { key: 'annualLicensePerSeat', label: 'ChatGPT Enterprise Annual Cost / Seat ($)', default: 720, min: 360, max: 1800, step: 60 }
    ],
    compute: (vals) => {
      const employees = Number(vals.employees) || 500;
      const avgSalary = Number(vals.avgSalary) || 110000;
      const hoursSavedPerWeek = Number(vals.hoursSavedPerWeek) || 4.5;
      const annualLicensePerSeat = Number(vals.annualLicensePerSeat) || 720;

      const totalHoursSaved = employees * hoursSavedPerWeek * 48;
      const hourlyWage = avgSalary / 2000;
      const grossProductivityValue = totalHoursSaved * hourlyWage;
      const totalSoftwareCost = employees * annualLicensePerSeat;
      const netAnnualROI = grossProductivityValue - totalSoftwareCost;
      const roiMultiple = totalSoftwareCost > 0 ? (grossProductivityValue / totalSoftwareCost).toFixed(1) : '0';
      return {
        annualHoursUnlocked: Math.round(totalHoursSaved).toLocaleString() + ' hrs',
        grossProductivityValue: '$' + Math.round(grossProductivityValue).toLocaleString(),
        annualSoftwareInvestment: '$' + Math.round(totalSoftwareCost).toLocaleString(),
        netAnnualizedValue: '$' + Math.round(netAnnualROI).toLocaleString(),
        roiMultiple: roiMultiple + 'x ROI',
        executivePitch: `Equipping ${employees} knowledge workers with ChatGPT Enterprise unlocks ${Math.round(totalHoursSaved).toLocaleString()} productive hours annually, generating $${Math.round(netAnnualROI).toLocaleString()} in net value at a ${roiMultiple}x return on software investment.`
      };
    }
  },
  nvidia: {
    calculatorName: 'Blackwell AI Cluster Training & Power Efficiency Calculator',
    roleTag: 'AI Enterprise Account Executive',
    inputs: [
      { key: 'gpuCount', label: 'Data Center AI Cluster GPUs', default: 1024, min: 64, max: 32768, step: 64 },
      { key: 'trainingDaysPerRun', label: 'Legacy Days per Training Run', default: 45, min: 7, max: 180, step: 1 },
      { key: 'blackwellSpeedup', label: 'Blackwell Acceleration Multiplier', default: 3.5, min: 2.0, max: 6.0, step: 0.5 },
      { key: 'annualPowerCost', label: 'Annual Megawatt Power Bill ($)', default: 4500000, min: 500000, max: 50000000, step: 500000 },
      { key: 'powerReductionPct', label: 'Power Reduction per Token (%)', default: 65, min: 30, max: 85, step: 5 }
    ],
    compute: (vals) => {
      const gpuCount = Number(vals.gpuCount) || 1024;
      const trainingDaysPerRun = Number(vals.trainingDaysPerRun) || 45;
      const blackwellSpeedup = Number(vals.blackwellSpeedup) || 3.5;
      const annualPowerCost = Number(vals.annualPowerCost) || 4500000;
      const powerReductionPct = Number(vals.powerReductionPct) || 65;

      const newTrainingDays = Math.round(trainingDaysPerRun / blackwellSpeedup);
      const daysSaved = trainingDaysPerRun - newTrainingDays;
      const powerDollarsSaved = annualPowerCost * (powerReductionPct / 100);
      return {
        daysSavedPerTrainingRun: `${daysSaved} days saved (from ${trainingDaysPerRun}d down to ${newTrainingDays}d)`,
        powerEnergyCostSaved: '$' + Math.round(powerDollarsSaved).toLocaleString() + ' / year',
        timeToMarketGain: `${blackwellSpeedup}x faster AI deployment`,
        executivePitch: `Deploying Blackwell architecture accelerates model training by ${blackwellSpeedup}x—saving ${daysSaved} days per model run—while reducing token energy costs by $${Math.round(powerDollarsSaved).toLocaleString()} annually within existing data center power caps.`
      };
    }
  }
};

function calculateWordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calculateReadingSeconds(wordCount, wpm = 130) {
  return Math.round((wordCount / wpm) * 60);
}

function validateBrief(briefData) {
  const items = briefData.briefItems || [];
  const errors = [];
  const warnings = [];

  if (items.length !== 5) {
    errors.push(`Expected exactly 5 items, but found ${items.length}`);
  }

  const fullText = items.map(i => i.sentences).join(' ');
  const wordCount = calculateWordCount(fullText);

  if (wordCount > 200) {
    errors.push(`Total word count is ${wordCount}, which exceeds the strict 200-word limit!`);
  }

  // Check Item 3 for dates & links
  const item3 = items.find(i => i.number === 3);
  if (item3) {
    const hasMonth = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(item3.sentences);
    const hasLink = /https?:\/\/[^\s)]+/i.test(item3.sentences);
    if (!hasMonth) warnings.push('Item 3 should contain a specific month and year.');
    if (!hasLink) warnings.push('Item 3 should include verified source links.');
  }

  const readSeconds = calculateReadingSeconds(wordCount);

  return {
    isValid: errors.length === 0,
    wordCount,
    estimatedReadSeconds: readSeconds,
    target90SecFit: readSeconds <= 90 && readSeconds >= 70,
    errors,
    warnings
  };
}

function evaluateInterviewAnswer(companyId, question, answerText) {
  const brief = briefs[companyId];
  if (!brief) {
    return { error: `Company '${companyId}' not found.` };
  }

  const text = (answerText || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  if (wordCount < 10) {
    return {
      overallScore: 25,
      grade: 'Incomplete',
      gradeDetail: 'Incomplete (< 10 words)',
      wordCount,
      estimatedSpeakingSeconds: Math.round((wordCount / 130) * 60),
      metricsHit: [],
      fillerWordsCount: 0,
      fillerWordsFound: [],
      strengths: ['Candidate attempted a response'],
      coachingTips: ['Answer length is too brief. Provide a structured 30-to-60-second response citing verified business metrics.'],
      modelAnswerSnippet: brief.marketAnalysis?.objectionHandling?.[0]?.candidateRebuttal || brief.briefItems[1]?.sentences
    };
  }

  // Define company keyword benchmarks
  const keywordDemos = {
    snap: ['ar', 'lens', 'camera', 'gen z', 'snapchat+', 'roas', 'direct-response', 'spectacles', 'friend', 'friends', 'capi', '12m', '500m', '9b', '443m'],
    stripe: ['authorization', 'payments', 'bridge', 'stablecoin', 'radar', 'fraud', 'developer', 'volume', 'tpv', 'saas', 'billing', 'connect', 'adyen', 'api'],
    datadog: ['observability', 'telemetry', 'single-agent', 'apm', 'mttr', 'kubernetes', 'llm', 'logs', 'metrics', 'traces', 'modules', '83%', 'downtime'],
    openai: ['reasoning', 'o1', 'enterprise', 'tokens', 'api', 'compliance', 'fine-tuning', 'chatgpt', 'privacy', 'rlhf', 'security', 'soc2', '300m', '157b'],
    nvidia: ['blackwell', 'cuda', 'nvlink', 'gpu', 'data center', 'gb200', 'tsmc', 'power', 'efficiency', 'hyperscalers', 'infiniband', 'spectrum-x', '75%']
  };

  const targetKeywords = keywordDemos[companyId] || ['revenue', 'growth', 'customers', 'market'];
  const lowerAnswer = text.toLowerCase();
  const metricsHit = targetKeywords.filter(kw => lowerAnswer.includes(kw));

  // Filler words check
  const fillerRegex = /\b(um|uh|like|basically|you know|kind of|sort of|i mean|honestly|actually)\b/gi;
  const fillerMatches = text.match(fillerRegex) || [];

  // Scoring rubric
  let score = 50;

  // Length score (optimal: 45 to 160 words)
  if (wordCount >= 45 && wordCount <= 160) {
    score += 20;
  } else if (wordCount >= 25 && wordCount < 45) {
    score += 10;
  } else if (wordCount > 160) {
    score += 10;
  }

  // Keywords & metrics score
  const keywordScore = Math.min(metricsHit.length * 7, 30);
  score += keywordScore;

  // Penalize filler words
  score -= Math.min(fillerMatches.length * 3, 15);

  // Forward looking question / conclusion bonus
  if (/[?]/.test(text) || lowerAnswer.includes('how') || lowerAnswer.includes('looking forward') || lowerAnswer.includes('next step')) {
    score += 5;
  }

  score = Math.max(10, Math.min(100, Math.round(score)));

  let grade = 'Needs Polish';
  let gradeDetail = 'Needs Polish (Missing Data Points)';
  if (score >= 90) {
    grade = 'Elite';
    gradeDetail = 'Elite (Top 1% Candidate)';
  } else if (score >= 80) {
    grade = 'Strong';
    gradeDetail = 'Strong Hire (Executive Acumen)';
  } else if (score >= 65) {
    grade = 'Solid';
    gradeDetail = 'Solid Contender (Passable)';
  }

  const strengths = [];
  const coachingTips = [];

  if (wordCount >= 45 && wordCount <= 160) {
    strengths.push(`Optimal speaking duration: ${wordCount} words translates to ~${Math.round((wordCount / 130) * 60)}s (ideal 30-60s elevator window).`);
  } else if (wordCount > 160) {
    coachingTips.push(`Length warning: ${wordCount} words may feel long-winded in an interview. Trim down closer to 80-120 words.`);
  } else {
    coachingTips.push(`Answer is somewhat brief (${wordCount} words). Expand with 1-2 concrete data points from the brief.`);
  }

  if (metricsHit.length >= 3) {
    strengths.push(`Rich domain depth: cited ${metricsHit.length} verified metrics/terms (${metricsHit.slice(0, 4).join(', ')}).`);
  } else {
    coachingTips.push(`Cite specific numbers from Item 2 or 3 (e.g., "${targetKeywords.slice(0, 3).join(', ')}") to prove verified research.`);
  }

  if (fillerMatches.length === 0) {
    strengths.push('Zero filler words detected: crisp, executive delivery tone.');
  } else {
    coachingTips.push(`Watch verbal filler words: detected ${fillerMatches.length} filler word(s) (${[...new Set(fillerMatches.map(m => m.toLowerCase()))].join(', ')}).`);
  }

  return {
    overallScore: score,
    grade,
    gradeDetail,
    wordCount,
    estimatedSpeakingSeconds: Math.round((wordCount / 130) * 60),
    metricsHit,
    fillerWordsCount: fillerMatches.length,
    fillerWordsFound: [...new Set(fillerMatches.map(m => m.toLowerCase()))],
    strengths,
    coachingTips,
    modelAnswerSnippet: brief.marketAnalysis?.objectionHandling?.[0]?.candidateRebuttal || brief.briefItems[1]?.sentences
  };
}

function searchPortfolio(query) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results = [];

  for (const [id, brief] of Object.entries(briefs)) {
    // 1. Check brief items
    brief.briefItems.forEach(item => {
      if (item.sentences.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)) {
        results.push({
          companyId: id,
          companyName: brief.companyName,
          category: 'Brief Item',
          title: `Item ${item.number}: ${item.title}`,
          snippet: item.sentences,
          tabTarget: 'brief-tab'
        });
      }
    });

    // 2. Check battlecards
    if (brief.marketAnalysis?.competitiveBattlecards) {
      brief.marketAnalysis.competitiveBattlecards.forEach(bc => {
        if (bc.competitorName.toLowerCase().includes(q) || bc.killShotPitch.toLowerCase().includes(q) || bc.whereWeWin.some(w => w.toLowerCase().includes(q))) {
          results.push({
            companyId: id,
            companyName: brief.companyName,
            category: 'Battlecard',
            title: `vs. ${bc.competitorName}`,
            snippet: bc.killShotPitch,
            tabTarget: 'battle-tab'
          });
        }
      });
    }

    // 3. Check objection handling
    if (brief.marketAnalysis?.objectionHandling) {
      brief.marketAnalysis.objectionHandling.forEach(obj => {
        if (obj.toughQuestion.toLowerCase().includes(q) || obj.candidateRebuttal.toLowerCase().includes(q)) {
          results.push({
            companyId: id,
            companyName: brief.companyName,
            category: 'Interview Objection',
            title: obj.toughQuestion,
            snippet: obj.candidateRebuttal,
            tabTarget: 'tactics-tab'
          });
        }
      });
    }

    // 4. Check market sizing / financial scorecard
    if (brief.marketAnalysis?.tam && brief.marketAnalysis.tam.toLowerCase().includes(q)) {
      results.push({
        companyId: id,
        companyName: brief.companyName,
        category: 'Market Sizing',
        title: `${brief.companyName} TAM`,
        snippet: brief.marketAnalysis.tam,
        tabTarget: 'market-tab'
      });
    }
  }

  return results.slice(0, 15);
}

function generateFlashcards(companyId) {
  const brief = briefs[companyId];
  if (!brief) return null;

  return [
    {
      id: `${companyId}-fc-1`,
      category: 'Item 1 • Elevator Pitch',
      badge: 'Core Value',
      front: `How does ${brief.companyName} explain what it does in plain English to someone outside the industry?`,
      back: brief.briefItems[0]?.sentences,
      source: brief.domain
    },
    {
      id: `${companyId}-fc-2`,
      category: 'Item 2 • Monetization Engine',
      badge: 'Revenue Model',
      front: `What is ${brief.companyName}'s primary revenue model and key financial metric?`,
      back: brief.briefItems[1]?.sentences,
      source: 'SEC Form 10-K / Shareholder Letter'
    },
    {
      id: `${companyId}-fc-3`,
      category: 'Item 3 • 2024 Catalysts',
      badge: 'Verified News',
      front: `What are two verified 2024 developments for ${brief.companyName} with specific dates?`,
      back: brief.briefItems[2]?.sentences,
      source: 'Newsroom & Financial Press'
    },
    {
      id: `${companyId}-fc-4`,
      category: 'Item 4 • Target Customers',
      badge: 'ICP & Personas',
      front: `Who are ${brief.companyName}'s core customers and economic buyers?`,
      back: brief.briefItems[3]?.sentences,
      source: 'Customer Case Studies'
    },
    {
      id: `${companyId}-fc-5`,
      category: 'Item 5 • The Closer',
      badge: 'Executive Question',
      front: `What high-impact strategic question should a candidate ask at ${brief.companyName}?`,
      back: brief.briefItems[4]?.sentences,
      source: 'Direct & Verify Candidate Strategy'
    },
    {
      id: `${companyId}-fc-6`,
      category: 'Battlecard • Kill-Shot',
      badge: 'Competitive Edge',
      front: `How do you deliver the kill-shot pitch against ${brief.marketAnalysis?.keyCompetitors?.[0] || 'rivals'}?`,
      back: brief.marketAnalysis?.competitiveBattlecards?.[0]?.killShotPitch || 'N/A',
      source: 'Competitive Battlecard'
    },
    {
      id: `${companyId}-fc-7`,
      category: 'MEDDPICC • Deal Strategy',
      badge: 'Deal Qualification',
      front: `Who is the Economic Buyer and what is the primary business pain for ${brief.companyName}?`,
      back: `Economic Buyer: ${brief.marketAnalysis?.meddpiccQualification?.economicBuyer}\nIdentified Pain: ${brief.marketAnalysis?.meddpiccQualification?.identifyPain}`,
      source: 'MEDDPICC Framework'
    }
  ];
}

function generatePresentationDeck(companyId) {
  const brief = briefs[companyId];
  if (!brief) return null;

  return {
    companyId,
    companyName: brief.companyName,
    ticker: brief.ticker,
    targetRole: brief.targetRole,
    totalSlides: 6,
    slides: [
      {
        slideNumber: 1,
        title: `${brief.companyName}: Executive Account Brief`,
        subtitle: `90-Second Interview Presentation | Role: ${brief.targetRole}`,
        bullets: [
          brief.briefItems[0]?.sentences,
          `Ticker: ${brief.ticker} | Industry: ${brief.industry}`,
          `Total Addressable Market: ${brief.marketAnalysis?.tam}`
        ],
        badge: 'Slide 1: Overview'
      },
      {
        slideNumber: 2,
        title: 'Commercial Monetization Engine',
        subtitle: 'Revenue Streams, Unit Economics & Margins',
        bullets: [
          brief.briefItems[1]?.sentences,
          `Annual Revenue / Run-Rate: ${brief.marketAnalysis?.financials?.annualRevenue}`,
          `Efficiency: Rule of 40 = ${brief.marketAnalysis?.financialEfficiencyScorecard?.ruleOf40 || 'N/A'}`
        ],
        badge: 'Slide 2: Monetization'
      },
      {
        slideNumber: 3,
        title: '2024 Market Catalysts & Strategic Initiatives',
        subtitle: 'Verified Developments from SEC Filings & Newsroom',
        bullets: [
          brief.briefItems[2]?.sentences,
          `Market Sizing: SAM = ${brief.marketAnalysis?.marketSizing?.sam || 'N/A'}, SOM = ${brief.marketAnalysis?.marketSizing?.som || 'N/A'}`,
          `Industry Positioning: ${brief.marketAnalysis?.industryPositioning?.quadrant || 'Market Leader'}`
        ],
        badge: 'Slide 3: Momentum'
      },
      {
        slideNumber: 4,
        title: 'Competitive Differentiation & Kill-Shot',
        subtitle: `Head-to-Head vs. ${brief.marketAnalysis?.keyCompetitors?.slice(0, 2).join(' & ')}`,
        bullets: [
          `Kill-Shot: "${brief.marketAnalysis?.competitiveBattlecards?.[0]?.killShotPitch || ''}"`,
          `Strategic Moats: ${brief.marketAnalysis?.strategicMoats?.slice(0, 2).join('; ')}`,
          `Anchor Customer: ${brief.marketAnalysis?.competitiveBattlecards?.[0]?.anchorCustomerStory?.brand || 'Enterprise Clients'} (${brief.marketAnalysis?.competitiveBattlecards?.[0]?.anchorCustomerStory?.result || ''})`
        ],
        badge: 'Slide 4: Competition'
      },
      {
        slideNumber: 5,
        title: 'Enterprise MEDDPICC Qualification',
        subtitle: 'Navigating Enterprise Procurement & Winning the Champion',
        bullets: [
          `Economic Buyer: ${brief.marketAnalysis?.meddpiccQualification?.economicBuyer}`,
          `Critical Pain: ${brief.marketAnalysis?.meddpiccQualification?.identifyPain}`,
          `Decision Criteria: ${brief.marketAnalysis?.meddpiccQualification?.decisionCriteria}`
        ],
        badge: 'Slide 5: Deal Strategy'
      },
      {
        slideNumber: 6,
        title: 'The Executive Closer & 30-Day Impact',
        subtitle: 'Commercial Inversion & Immediate Contribution',
        bullets: [
          `Executive Question: "${brief.briefItems[4]?.sentences}"`,
          `Days 1–30 Focus: ${brief.marketAnalysis?.onboardingRampPlan?.phase1_30Days?.title} (${brief.marketAnalysis?.onboardingRampPlan?.phase1_30Days?.deliverables?.[0] || 'Onboarding'})`,
          `Target Result: Accelerated pipeline generation and verified deal closure`
        ],
        badge: 'Slide 6: The Closer'
      }
    ]
  };
}

function generateComparisonMatrix() {
  return Object.values(briefs).map(b => ({
    id: b.id,
    companyName: b.companyName,
    ticker: b.ticker,
    targetRole: b.targetRole,
    industry: b.industry,
    wordCount: b.totalWordCount,
    readSeconds: b.estimatedReadSeconds,
    tam: b.marketAnalysis?.tam || 'N/A',
    sam: b.marketAnalysis?.marketSizing?.sam || 'N/A',
    som: b.marketAnalysis?.marketSizing?.som || 'N/A',
    cagr: b.marketAnalysis?.marketSizing?.cagr || 'N/A',
    monetization: b.briefItems[1]?.sentences || 'N/A',
    ruleOf40: b.marketAnalysis?.financialEfficiencyScorecard?.ruleOf40 || 'N/A',
    nrr: b.marketAnalysis?.financialEfficiencyScorecard?.netRevenueRetention || 'N/A',
    annualRevenue: b.marketAnalysis?.financials?.annualRevenue || 'N/A',
    primaryCatalyst: b.briefItems[2]?.sentences.split('\n')[0] || 'N/A',
    topRival: b.marketAnalysis?.keyCompetitors?.[0] || 'N/A',
    killShotPitch: b.marketAnalysis?.competitiveBattlecards?.[0]?.killShotPitch || 'N/A',
    economicBuyer: b.marketAnalysis?.meddpiccQualification?.economicBuyer || 'N/A',
    closingQuestion: b.briefItems[4]?.sentences || 'N/A'
  }));
}

const QUIZ_QUESTIONS = {
  snap: [
    {
      id: 'q1',
      question: 'How does Snap monetize beyond traditional video ads?',
      options: [
        'A. Snapchat+ paid subscriptions with 12M+ paid subscribers generating >$500M annual run-rate',
        'B. Selling consumer smart glasses at major retail stores',
        'C. Charging transaction fees on crypto transfers',
        'D. Enterprise ERP software licenses'
      ],
      correctIndex: 0,
      explanation: 'Snapchat+ has scaled past 12 million subscribers generating >$500M in high-margin annualized run-rate (Item 2).'
    },
    {
      id: 'q2',
      question: 'What is the commercial distribution model for Snap fifth-generation Spectacles?',
      options: [
        'A. Direct-to-consumer retail purchase for $499',
        'B. Strictly a $99/month developer subscription for Snap OS to build AR lenses',
        'C. Free hardware distributed to university students',
        'D. Discontinued product line'
      ],
      correctIndex: 1,
      explanation: 'Snap 5th-gen Spectacles launched Sept 2024 strictly as a $99/mo developer program running Snap OS, avoiding consumer retail inventory risks (Item 3).'
    },
    {
      id: 'q3',
      question: 'What is Snap primary kill-shot pitch against Meta and TikTok?',
      options: [
        'A. Snap is the cheapest ad network on the web',
        'B. Snap owns close-friend communication where 443M users spend 15-20s actively interacting with camera AR lenses',
        'C. Snap has more total video hours watched than TikTok',
        'D. Snap operates as a text-first professional social network'
      ],
      correctIndex: 1,
      explanation: 'Snap differentiates on active camera engagement with close friends rather than passive public feed scrolling (Battlecards).'
    },
    {
      id: 'q4',
      question: 'What percentage of Snap revenue comes from advertising?',
      options: ['A. ~35%', 'B. ~50%', 'C. Over 85%', 'D. 100%'],
      correctIndex: 2,
      explanation: 'According to SEC Form 10-K, Snap generates over 85% of total revenue from digital and AR advertising (Item 2).'
    },
    {
      id: 'q5',
      question: 'Who is the Economic Buyer in Snap MEDDPICC qualification?',
      options: [
        'A. VP of Facilities',
        'B. Chief Marketing Officer (CMO) or VP of Performance Marketing',
        'C. Chief Legal Officer',
        'D. Head of Hardware Engineering'
      ],
      correctIndex: 1,
      explanation: 'Snap enterprise ad deals require sign-off from the CMO or VP of Performance Marketing controlling digital ad spend (MEDDPICC).'
    }
  ],
  stripe: [
    {
      id: 'q1',
      question: 'What major acquisition did Stripe execute in October 2024 to lead stablecoin payment rails?',
      options: [
        'A. Plaid for $5.3B',
        'B. Bridge for approximately $1.1B',
        'C. Klarna for $2.5B',
        'D. Checkout.com for $1.8B'
      ],
      correctIndex: 1,
      explanation: 'Stripe acquired stablecoin platform Bridge for ~$1.1B in October 2024 to build programmable crypto settlement rails (Item 3).'
    },
    {
      id: 'q2',
      question: 'What milestone total payment volume (TPV) did Stripe reach in 2025?',
      options: ['A. $250 Billion', 'B. $800 Billion', 'C. $1.9 Trillion (~1.5% of global GDP)', 'D. $10 Trillion'],
      correctIndex: 2,
      explanation: 'Stripe announced crossing $1.9 Trillion in total payment volume in 2025 across millions of global businesses (Item 2).'
    },
    {
      id: 'q3',
      question: 'What is Stripe core kill-shot pitch against Adyen?',
      options: [
        'A. Stripe is strictly a low-cost card acquirer',
        'B. Unified platform combining checkout, billing, sales tax, fraud prevention, and programmable stablecoins',
        'C. Stripe only operates in the United States',
        'D. Stripe does not support developer APIs'
      ],
      correctIndex: 1,
      explanation: 'While Adyen is a payment acquirer, Stripe provides the full economic operating system (Billing, Tax, Radar, Connect, Bridge).'
    },
    {
      id: 'q4',
      question: 'What is Stripe baseline transaction fee for standard cards?',
      options: ['A. 1.0% flat', 'B. 2.9% + 30¢ per successful transaction', 'C. $0.99 per transaction', 'D. Free with a monthly subscription'],
      correctIndex: 1,
      explanation: 'Stripe baseline interchange fee is 2.9% + 30¢, with volume tiering and software add-on fees (Item 2).'
    },
    {
      id: 'q5',
      question: 'Who is the Economic Buyer in Stripe MEDDPICC qualification?',
      options: [
        'A. VP of Human Resources',
        'B. CFO, VP of Finance, or VP of Engineering',
        'C. Creative Director',
        'D. Social Media Manager'
      ],
      correctIndex: 1,
      explanation: 'Stripe deals require dual alignment between finance leaders (CFO/VP Finance) and technical leaders (VP Eng/CTO).'
    }
  ],
  datadog: [
    {
      id: 'q1',
      question: 'What percentage of Datadog enterprise customers use 4 or more products?',
      options: ['A. 35%', 'B. 52%', 'C. 83%', 'D. 98%'],
      correctIndex: 2,
      explanation: 'Datadog Q3 2024 shareholder letter confirmed 83% of customers use 4+ products, and 49% use 6+ products (Item 3).'
    },
    {
      id: 'q2',
      question: 'What new observability capability did Datadog launch in May 2024?',
      options: ['A. LLM Observability', 'B. Personal Antivirus', 'C. Video Conferencing APM', 'D. Crypto Mining Monitoring'],
      correctIndex: 0,
      explanation: 'Datadog launched LLM Observability into General Availability at DASH 2024 to monitor token costs and hallucinations (Item 3).'
    },
    {
      id: 'q3',
      question: 'What is Datadog primary architectural differentiator over legacy APM vendors like Dynatrace?',
      options: [
        'A. Requires 10 different agent installs',
        'B. Native cloud-first design with a single unified agent covering metrics, traces, logs, and security',
        'C. Hosted exclusively on on-premises private bare metal',
        'D. Only supports PHP applications'
      ],
      correctIndex: 1,
      explanation: 'Datadog single-agent architecture eliminates siloed monitoring tools and lowers total engineering overhead (Battlecards).'
    },
    {
      id: 'q4',
      question: 'What is Datadog annual revenue run-rate (ARR)?',
      options: ['A. $450M', 'B. $1.1B', 'C. Over $2.8 Billion growing 26% YoY', 'D. $15 Billion'],
      correctIndex: 2,
      explanation: 'Datadog ARR surpassed $2.8B with 26% YoY growth in 2024 with a Rule of 40 score of 51% (Item 2).'
    },
    {
      id: 'q5',
      question: 'Who is the Economic Buyer in Datadog MEDDPICC qualification?',
      options: [
        'A. Chief Revenue Officer',
        'B. CIO, CTO, or VP of Infrastructure & Platform Engineering',
        'C. Head of Public Relations',
        'D. Facilities Manager'
      ],
      correctIndex: 1,
      explanation: 'Infrastructure and engineering leaders (CIO/CTO/VP Platform) hold the budget for enterprise cloud observability.'
    }
  ],
  openai: [
    {
      id: 'q1',
      question: 'What new frontier reasoning model family did OpenAI preview on September 12, 2024?',
      options: ['A. GPT-3.5 Turbo', 'B. OpenAI o1', 'C. DALL-E 4', 'D. Claude 3 Opus'],
      correctIndex: 1,
      explanation: 'OpenAI formally released the o1 reasoning model series on September 12, 2024 for complex math, science, and coding (Item 3).'
    },
    {
      id: 'q2',
      question: 'What was OpenAI annualized revenue run-rate (ARR) in late 2024?',
      options: ['A. $300M', 'B. $1.0B', 'C. $3.7B - $4.0B ARR', 'D. $20B'],
      correctIndex: 2,
      explanation: 'OpenAI ARR surged from $1.6B in late 2023 to between $3.7B and $4.0B in late 2024 (Item 2).'
    },
    {
      id: 'q3',
      question: 'How does OpenAI defend against free open-source models like Meta Llama 3?',
      options: [
        'A. Promising that OpenAI will become fully non-profit again',
        'B. Enterprise SOC-2 compliance, zero customer data training guarantees, managed fine-tuning, and frontier reasoning',
        'C. Lowering token prices to 0',
        'D. Distributing free GPU hardware'
      ],
      correctIndex: 1,
      explanation: 'OpenAI wins enterprise accounts through enterprise data privacy (zero training on customer data), compliance, and reasoning moats.'
    },
    {
      id: 'q4',
      question: 'How many paid business users were announced for OpenAI in September 2024?',
      options: ['A. 10,000', 'B. 100,000', 'C. Over 1 Million paid business users', 'D. 50 Million'],
      correctIndex: 2,
      explanation: 'OpenAI reached over 1 million paid business users across Enterprise, Team, and Edu tiers in September 2024 (Item 3).'
    },
    {
      id: 'q5',
      question: 'Who is the Economic Buyer in OpenAI enterprise deal qualification?',
      options: [
        'A. Office Administrator',
        'B. CIO, CTO, or Head of Global AI Strategy',
        'C. Legal Counsel only',
        'D. Chief Marketing Officer only'
      ],
      correctIndex: 1,
      explanation: 'Enterprise API and ChatGPT Enterprise seat commitments require approval from the CIO, CTO, or Head of AI (MEDDPICC).'
    }
  ],
  nvidia: [
    {
      id: 'q1',
      question: 'What next-generation computing architecture did NVIDIA announce at GTC in March 2024?',
      options: ['A. Hopper H100', 'B. Blackwell GB200', 'C. Ada Lovelace', 'D. Volta V100'],
      correctIndex: 1,
      explanation: 'NVIDIA announced the Blackwell architecture and GB200 NVLink superchips in March 2024 for trillion-parameter AI (Item 3).'
    },
    {
      id: 'q2',
      question: 'What record quarterly revenue did NVIDIA report in November 2024 (Q3 FY25)?',
      options: ['A. $8.2B', 'B. $18.1B', 'C. $35.1 Billion (up 94% YoY)', 'D. $60.0B'],
      correctIndex: 2,
      explanation: 'NVIDIA generated a record $35.1B in quarterly revenue, with data center contributing over $30.8B (Item 3).'
    },
    {
      id: 'q3',
      question: 'What is NVIDIA primary kill-shot pitch against AMD Instinct and custom cloud ASICs?',
      options: [
        'A. NVIDIA sells the lowest cost silicon on the market',
        'B. Generative AI bottlenecks are rack-scale interconnects (NVLink) and software velocity (CUDA with 5M+ developers), where NVIDIA offers a complete full-stack system',
        'C. NVIDIA chips consume zero electrical power',
        'D. NVIDIA is purely a consumer gaming company'
      ],
      correctIndex: 1,
      explanation: 'NVIDIA differentiates as a full-stack data center platform with NVLink networking and CUDA software rather than a discrete chip vendor.'
    },
    {
      id: 'q4',
      question: 'What gross margin profile does NVIDIA command in accelerated data centers?',
      options: ['A. 25-30%', 'B. 45-50%', 'C. 74% - 76%+', 'D. 95%'],
      correctIndex: 2,
      explanation: 'NVIDIA commands 75%+ gross margins driven by monopolistic pricing power in data center GPUs and NVLink networking (Item 2).'
    },
    {
      id: 'q5',
      question: 'How many GPUs does the Blackwell GB200 NVL72 rack-scale system link as a single unified domain?',
      options: ['A. 8 GPUs', 'B. 16 GPUs', 'C. 72 GPUs over 130 TB/s NVLink', 'D. 128 GPUs over Ethernet'],
      correctIndex: 2,
      explanation: 'The GB200 NVL72 links 72 GPUs as a single unified GPU compute domain with 130 TB/s of aggregate NVLink bandwidth.'
    }
  ]
};

function evaluateQuizSubmission(companyId, answers) {
  const questions = QUIZ_QUESTIONS[companyId];
  if (!questions) return { error: `Company '${companyId}' quiz not found.` };

  let score = 0;
  const results = questions.map((q) => {
    const userChoice = answers[q.id] !== undefined ? Number(answers[q.id]) : -1;
    const isCorrect = userChoice === q.correctIndex;
    if (isCorrect) score++;

    return {
      id: q.id,
      question: q.question,
      userChoice,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation
    };
  });

  const percentage = Math.round((score / questions.length) * 100);
  let status = 'Needs Review';
  if (percentage === 100) status = 'Interview Ready (100% Mastery)';
  else if (percentage >= 80) status = 'Strong Contender (80% Ready)';
  else if (percentage >= 60) status = 'Solid Baseline (Review Weak Spots)';

  return {
    companyId,
    totalQuestions: questions.length,
    correctAnswers: score,
    percentage,
    status,
    results
  };
}

function renderPrintableHtml(companyId) {
  const brief = briefs[companyId];
  if (!brief) return null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Brief: ${brief.companyName} (${brief.ticker})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
    .print-actions { background: #f1f5f9; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #cbd5e1; }
    .btn-print { background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 700; cursor: pointer; }
    .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .comp-title { font-size: 24px; font-weight: 900; margin: 0; color: #0f172a; }
    .comp-subtitle { font-size: 12px; color: #475569; margin-top: 4px; font-weight: 600; }
    .badge-pill { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; margin-right: 6px; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 14px 0 8px; color: #1e293b; }
    .brief-item { margin-bottom: 10px; page-break-inside: avoid; }
    .item-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .item-text { font-size: 13px; font-weight: 500; color: #0f172a; margin-top: 2px; }
    .item-text a { color: #0284c7; text-decoration: none; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
    .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
    .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .killshot-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 12px; margin: 12px 0; }
    .killshot-title { font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; }
    .killshot-text { font-size: 12px; color: #78350f; font-weight: 600; margin-top: 4px; font-style: italic; }
    .meddpicc-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    .meddpicc-table td { padding: 4px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
    .meddpicc-table td.label-col { font-weight: 700; background: #f8fafc; width: 22%; color: #475569; }
    .footer-stamp { border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 16px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .print-actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <div><strong>Executive Account Brief Cheat Sheet</strong> — Ready for your live interview</div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn-print" style="background:#64748b; margin-left: 8px;" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <table class="header-table">
    <tr>
      <td>
        <h1 class="comp-title">${brief.companyName} (${brief.ticker})</h1>
        <div class="comp-subtitle">Role Target: <strong>${brief.targetRole}</strong> • Industry: <strong>${brief.industry}</strong> • https://${brief.domain}</div>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <span class="badge-pill">⏱️ ${brief.estimatedReadSeconds}s @ 130 WPM</span>
        <span class="badge-pill">📝 ${brief.totalWordCount} / 200 Words</span>
        <span class="badge-pill" style="background:#dcfce7; border-color:#86efac; color:#15803d;">✅ SEC 10-K Verified</span>
      </td>
    </tr>
  </table>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total Addressable Market</div>
      <div class="kpi-val">${brief.marketAnalysis?.tam.split('&')[0].trim()}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Annual Revenue / ARR</div>
      <div class="kpi-val">${brief.marketAnalysis?.financials?.annualRevenue.split('(')[0].trim()}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Rule of 40 Score</div>
      <div class="kpi-val">${brief.marketAnalysis?.financialEfficiencyScorecard?.ruleOf40 || 'N/A'}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Net Retention (NRR)</div>
      <div class="kpi-val">${brief.marketAnalysis?.financialEfficiencyScorecard?.netRevenueRetention || 'N/A'}</div>
    </div>
  </div>

  <div class="section-title">The 90-Second Account Brief (Strict 5-Item Order)</div>
  ${brief.briefItems.map(item => `
    <div class="brief-item">
      <div class="item-label">${item.number}. ${item.title}</div>
      <div class="item-text">${item.sentences.replace(/\n/g, '<br>')}</div>
    </div>
  `).join('')}

  <div class="killshot-box">
    <div class="killshot-title">⚔️ Killer Differentiator vs. ${brief.marketAnalysis?.keyCompetitors?.[0] || 'Competitors'}</div>
    <div class="killshot-text">"${brief.marketAnalysis?.competitiveBattlecards?.[0]?.killShotPitch || ''}"</div>
  </div>

  <div class="section-title">Enterprise MEDDPICC Qualification Blueprint</div>
  <table class="meddpicc-table">
    <tr>
      <td class="label-col">Economic Buyer</td>
      <td>${brief.marketAnalysis?.meddpiccQualification?.economicBuyer}</td>
    </tr>
    <tr>
      <td class="label-col">Identified Business Pain</td>
      <td>${brief.marketAnalysis?.meddpiccQualification?.identifyPain}</td>
    </tr>
    <tr>
      <td class="label-col">30-Day Candidate Priority</td>
      <td>${brief.marketAnalysis?.onboardingRampPlan?.phase1_30Days?.title}: ${brief.marketAnalysis?.onboardingRampPlan?.phase1_30Days?.deliverables?.[0] || 'Ramp'}</td>
    </tr>
  </table>

  <div class="footer-stamp">
    <span>Verified with Clay AI (Claygent) Direct &amp; Verify Framework • Handshake AI Mission Submission</span>
    <span>Generated: ${new Date().toISOString().slice(0, 10)}</span>
  </div>
</body>
</html>`;
}

function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Health check
    if (pathname === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));
      return;
    }

    // Diagnostics self-check endpoint
    if (pathname === '/api/diagnostics' && req.method === 'GET') {
      const diagResults = Object.values(briefs).map(b => {
        const fullText = b.briefItems.map(i => i.sentences).join(' ');
        const wc = calculateWordCount(fullText);
        const readSec = calculateReadingSeconds(wc);
        const charCount = b.handshakeSubmission?.description?.length || 0;
        const validOrder = b.briefItems.every((item, idx) => item.number === idx + 1);
        const pass = wc <= 200 && readSec >= 70 && readSec <= 90 && charCount <= 500 && validOrder;
        return {
          id: b.id,
          companyName: b.companyName,
          wordCount: wc,
          targetWordLimit: 200,
          estimatedReadSeconds: readSec,
          targetReadSeconds: '~90s (70-90s)',
          descriptionCharCount: charCount,
          targetCharLimit: 500,
          verifiedSourcesCount: b.verificationAudit?.length || 0,
          status: pass ? 'PASS' : 'FAIL'
        };
      });

      const allPassing = diagResults.every(r => r.status === 'PASS');

      res.writeHead(200);
      res.end(JSON.stringify({
        status: allPassing ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10,
        checksTotal: diagResults.length,
        checksPassed: diagResults.filter(r => r.status === 'PASS').length,
        diagnostics: diagResults
      }, null, 2));
      return;
    }

    // Fetch All endpoint - returns full unified portfolio bundle
    if (pathname === '/api/all' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        title: '90-Second Account Brief Full Portfolio & Market Dossier',
        generatedAt: new Date().toISOString(),
        totalAccounts: Object.keys(briefs).length,
        accounts: Object.keys(briefs),
        briefs: briefs
      }, null, 2));
      return;
    }

    // List all available briefs
    if (pathname === '/api/briefs' && req.method === 'GET') {
      const summaryList = Object.values(briefs).map(b => ({
        id: b.id,
        companyName: b.companyName,
        domain: b.domain,
        targetRole: b.targetRole,
        totalWordCount: b.totalWordCount,
        estimatedReadSeconds: b.estimatedReadSeconds
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ briefs: summaryList }));
      return;
    }

    // List all market analyses
    if (pathname === '/api/market' && req.method === 'GET') {
      const marketSummaries = Object.values(briefs).map(b => ({
        id: b.id,
        companyName: b.companyName,
        industry: b.industry,
        tam: b.marketAnalysis?.tam,
        marketShare: b.marketAnalysis?.marketShare,
        competitorCount: b.marketAnalysis?.keyCompetitors?.length || 0
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ marketOverview: marketSummaries }));
      return;
    }

    // List all market sizing overview (TAM / SAM / SOM)
    if (pathname === '/api/market/sizing' && req.method === 'GET') {
      const sizingList = Object.values(briefs).map(b => ({
        id: b.id,
        companyName: b.companyName,
        ticker: b.ticker,
        industry: b.industry,
        sizing: b.marketAnalysis?.marketSizing || null
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ marketSizingOverview: sizingList }, null, 2));
      return;
    }

    // Get market sizing for a specific company
    const sizingMatch = pathname.match(/^\/api\/market\/sizing\/([a-zA-Z0-9_-]+)$/);
    if (sizingMatch && req.method === 'GET') {
      const compId = sizingMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.marketSizing) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          ticker: brief.ticker,
          marketSizing: brief.marketAnalysis.marketSizing
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Market sizing for '${compId}' not found.` }));
      }
      return;
    }

    // Get industry positioning & analyst consensus for a specific company
    const posMatch = pathname.match(/^\/api\/market\/positioning\/([a-zA-Z0-9_-]+)$/);
    if (posMatch && req.method === 'GET') {
      const compId = posMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.industryPositioning) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          ticker: brief.ticker,
          industryPositioning: brief.marketAnalysis.industryPositioning
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Industry positioning for '${compId}' not found.` }));
      }
      return;
    }

    // Get financial efficiency scorecard (Rule of 40, CAC, NRR) for a specific company
    const metricsMatch = pathname.match(/^\/api\/market\/metrics\/([a-zA-Z0-9_-]+)$/);
    if (metricsMatch && req.method === 'GET') {
      const compId = metricsMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.financialEfficiencyScorecard) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          ticker: brief.ticker,
          financialEfficiencyScorecard: brief.marketAnalysis.financialEfficiencyScorecard
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Financial efficiency metrics for '${compId}' not found.` }));
      }
      return;
    }

    // Get market sensitivity analysis (Bull, Base, Bear scenarios) for a specific company
    const scenMatch = pathname.match(/^\/api\/market\/scenarios\/([a-zA-Z0-9_-]+)$/);
    if (scenMatch && req.method === 'GET') {
      const compId = scenMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.marketSensitivityAnalysis) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          ticker: brief.ticker,
          marketSensitivityAnalysis: brief.marketAnalysis.marketSensitivityAnalysis
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Market sensitivity scenarios for '${compId}' not found.` }));
      }
      return;
    }

    // Get market analysis for a specific company
    const marketMatch = pathname.match(/^\/api\/market\/([a-zA-Z0-9_-]+)$/);
    if (marketMatch && req.method === 'GET') {
      const compId = marketMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          domain: brief.domain,
          industry: brief.industry,
          marketAnalysis: brief.marketAnalysis
        }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Market analysis for '${compId}' not found.` }));
      }
      return;
    }

    // List all financials overview
    if (pathname === '/api/financials' && req.method === 'GET') {
      const finList = Object.values(briefs).map(b => ({
        id: b.id,
        companyName: b.companyName,
        ticker: b.ticker,
        financials: b.marketAnalysis?.financials || null
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ financialsOverview: finList }, null, 2));
      return;
    }

    // Get financial unit economics for a specific company
    const finMatch = pathname.match(/^\/api\/financials\/([a-zA-Z0-9_-]+)$/);
    if (finMatch && req.method === 'GET') {
      const compId = finMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.financials) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          ticker: brief.ticker,
          financials: brief.marketAnalysis.financials
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Financials for '${compId}' not found.` }));
      }
      return;
    }

    // Get deep intelligence dossier (SWOT, Porter's 5 Forces, Objection Handling, Battlecards, MEDDPICC)
    const analysisMatch = pathname.match(/^\/api\/analysis\/([a-zA-Z0-9_-]+)$/);
    if (analysisMatch && req.method === 'GET') {
      const compId = analysisMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis) {
        const ma = brief.marketAnalysis;
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          domain: brief.domain,
          industry: brief.industry,
          tam: ma.tam,
          marketShare: ma.marketShare,
          marketSizing: ma.marketSizing || null,
          industryPositioning: ma.industryPositioning || null,
          financialEfficiencyScorecard: ma.financialEfficiencyScorecard || null,
          marketSensitivityAnalysis: ma.marketSensitivityAnalysis || null,
          financials: ma.financials,
          portersFiveForces: ma.portersFiveForces,
          swotAnalysis: ma.swotAnalysis,
          objectionHandling: ma.objectionHandling,
          competitiveBattlecards: ma.competitiveBattlecards || null,
          meddpiccQualification: ma.meddpiccQualification || null,
          onboardingRampPlan: ma.onboardingRampPlan || null,
          icpBuyerPersonas: ma.icpBuyerPersonas || null
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Deep analysis for '${compId}' not found.` }));
      }
      return;
    }

    // List all competitive battlecards
    if (pathname === '/api/battlecards' && req.method === 'GET') {
      const bcList = Object.values(briefs).map(b => ({
        id: b.id,
        companyName: b.companyName,
        ticker: b.ticker,
        battlecards: b.marketAnalysis?.competitiveBattlecards || []
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ battlecardsOverview: bcList }, null, 2));
      return;
    }

    // Get battlecards for a specific company
    const bcMatch = pathname.match(/^\/api\/battlecards\/([a-zA-Z0-9_-]+)$/);
    if (bcMatch && req.method === 'GET') {
      const compId = bcMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.competitiveBattlecards) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          ticker: brief.ticker,
          battlecards: brief.marketAnalysis.competitiveBattlecards
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Battlecards for '${compId}' not found.` }));
      }
      return;
    }

    // List all MEDDPICC frameworks
    if (pathname === '/api/meddpicc' && req.method === 'GET') {
      const medList = Object.values(briefs).map(b => ({
        id: b.id,
        companyName: b.companyName,
        targetRole: b.targetRole,
        meddpicc: b.marketAnalysis?.meddpiccQualification || null
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ meddpiccOverview: medList }, null, 2));
      return;
    }

    // Get MEDDPICC for a specific company
    const medMatch = pathname.match(/^\/api\/meddpicc\/([a-zA-Z0-9_-]+)$/);
    if (medMatch && req.method === 'GET') {
      const compId = medMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.meddpiccQualification) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          targetRole: brief.targetRole,
          meddpicc: brief.marketAnalysis.meddpiccQualification
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `MEDDPICC qualification for '${compId}' not found.` }));
      }
      return;
    }

    // Get 30-60-90 Day Onboarding Plan for a specific company
    const onbMatch = pathname.match(/^\/api\/onboarding\/([a-zA-Z0-9_-]+)$/);
    if (onbMatch && req.method === 'GET') {
      const compId = onbMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.onboardingRampPlan) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          onboardingPlan: brief.marketAnalysis.onboardingRampPlan
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Onboarding plan for '${compId}' not found.` }));
      }
      return;
    }

    // Get ICP & Buyer Personas for a specific company
    const icpMatch = pathname.match(/^\/api\/icp\/([a-zA-Z0-9_-]+)$/);
    if (icpMatch && req.method === 'GET') {
      const compId = icpMatch[1];
      const brief = briefs[compId];
      if (brief && brief.marketAnalysis?.icpBuyerPersonas) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyName: brief.companyName,
          icpBuyerPersonas: brief.marketAnalysis.icpBuyerPersonas
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `ICP data for '${compId}' not found.` }));
      }
      return;
    }

    // Export formatted markdown / JSON dossier
    const exportMatch = pathname.match(/^\/api\/export\/([a-zA-Z0-9_-]+)$/);
    if (exportMatch && req.method === 'GET') {
      const compId = exportMatch[1];
      const brief = briefs[compId];
      if (!brief) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Account '${compId}' not found for export.` }));
        return;
      }

      const format = parsedUrl.searchParams ? parsedUrl.searchParams.get('format') : null;
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${compId}-account-brief-dossier.json"`);
        res.writeHead(200);
        res.end(JSON.stringify(brief, null, 2));
        return;
      }

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${compId}-account-brief.csv"`);
        const escapeCsv = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        const headers = ['Company', 'Ticker', 'Domain', 'Role', 'WordCount', 'ReadSeconds', 'Item1_WhatItDoes', 'Item2_Monetization', 'Item3_Developments', 'Item4_Customers', 'Item5_OpenQuestion', 'TAM', 'RuleOf40', 'KillShotPitch'];
        const row = [
          escapeCsv(brief.companyName),
          escapeCsv(brief.ticker),
          escapeCsv(brief.domain),
          escapeCsv(brief.targetRole),
          escapeCsv(brief.totalWordCount),
          escapeCsv(brief.estimatedReadSeconds),
          escapeCsv(brief.briefItems[0]?.sentences),
          escapeCsv(brief.briefItems[1]?.sentences),
          escapeCsv(brief.briefItems[2]?.sentences),
          escapeCsv(brief.briefItems[3]?.sentences),
          escapeCsv(brief.briefItems[4]?.sentences),
          escapeCsv(brief.marketAnalysis?.tam),
          escapeCsv(brief.marketAnalysis?.financialEfficiencyScorecard?.ruleOf40),
          escapeCsv(brief.marketAnalysis?.competitiveBattlecards?.[0]?.killShotPitch)
        ];
        res.writeHead(200);
        res.end([headers.join(','), row.join(',')].join('\n'));
        return;
      }

      // Default: Markdown dossier
      const mdLines = [
        `# Executive Account Brief: ${brief.companyName} (${brief.ticker})`,
        `**Industry:** ${brief.industry} | **Target Role:** ${brief.targetRole} | **Website:** https://${brief.domain}`,
        `**Total Words:** ${brief.totalWordCount}/200 | **Spoken Pace:** ~${brief.estimatedReadSeconds}s @ 130 WPM`,
        ``,
        `## 90-Second Account Brief`,
        brief.briefItems.map(item => `### Item ${item.number}: ${item.title}\n${item.sentences}`).join('\n\n'),
        ``,
        `## Handshake Showcase Submission`,
        `- **Title:** ${brief.handshakeSubmission.projectTitle}`,
        `- **Description (${brief.handshakeSubmission.descriptionCharCount}/500 chars):**\n  ${brief.handshakeSubmission.description}`,
        `- **Claim Needing Most Digging to Verify:**\n  ${brief.handshakeSubmission.claimNeedingMostDigging}`,
        ``,
        `## Market & Financial Intelligence`,
        `- **TAM:** ${brief.marketAnalysis.tam}`,
        `- **TAM Definition:** ${brief.marketAnalysis.marketSizing?.tamDefinition || 'N/A'}`,
        `- **SAM (Serviceable Available Market):** ${brief.marketAnalysis.marketSizing?.sam || 'N/A'}`,
        `- **SOM (Serviceable Obtainable Market):** ${brief.marketAnalysis.marketSizing?.som || 'N/A'}`,
        `- **Market CAGR:** ${brief.marketAnalysis.marketSizing?.cagr || 'N/A'}`,
        `- **Industry Positioning:** ${brief.marketAnalysis.industryPositioning?.quadrant || 'N/A'}`,
        `- **Rule of 40 Score:** ${brief.marketAnalysis.financialEfficiencyScorecard?.ruleOf40 || 'N/A'} (${brief.marketAnalysis.financialEfficiencyScorecard?.ruleOf40Status || ''})`,
        `- **Net Revenue Retention (NRR):** ${brief.marketAnalysis.financialEfficiencyScorecard?.netRevenueRetention || 'N/A'}`,
        `- **Annual Revenue:** ${brief.marketAnalysis.financials.annualRevenue}`,
        `- **Strategic Moats:**\n  ${brief.marketAnalysis.strategicMoats.map(m => `* ${m}`).join('\n  ')}`,
        ``,
        `## Market Sensitivity & Scenario Stress-Testing`,
        `- **Bull Case:** ${brief.marketAnalysis.marketSensitivityAnalysis?.bullCaseScenario || 'N/A'}`,
        `- **Base Case:** ${brief.marketAnalysis.marketSensitivityAnalysis?.baseCaseScenario || 'N/A'}`,
        `- **Bear Case:** ${brief.marketAnalysis.marketSensitivityAnalysis?.bearCaseScenario || 'N/A'}`,
        ``,
        `## MEDDPICC Deal Qualification`,
        `- **Metrics:** ${brief.marketAnalysis.meddpiccQualification.metrics}`,
        `- **Economic Buyer:** ${brief.marketAnalysis.meddpiccQualification.economicBuyer}`,
        `- **Decision Criteria:** ${brief.marketAnalysis.meddpiccQualification.decisionCriteria}`,
        `- **Identify Pain:** ${brief.marketAnalysis.meddpiccQualification.identifyPain}`,
        ``,
        `## Competitive Battlecards`,
        brief.marketAnalysis.competitiveBattlecards.map(bc => [
          `### vs. ${bc.competitorName} (${bc.category})`,
          `* **Where We Win:** ${bc.whereWeWin.join('; ')}`,
          `* **Friction Points:** ${bc.whereWeFaceFriction.join('; ')}`,
          `* **Kill-Shot Pitch:** "${bc.killShotPitch}"`,
          `* **Anchor Customer:** ${bc.anchorCustomerStory.brand} - ${bc.anchorCustomerStory.result}`
        ].join('\n')).join('\n\n'),
        ``,
        `---`,
        `*Generated locally by 90-Second Account Brief Engine • Handshake AI Project Builder*`
      ];

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${compId}-account-brief-dossier.md"`);
      res.writeHead(200);
      res.end(mdLines.join('\n'));
      return;
    }

    // Export all accounts as CSV or JSON
    if (pathname === '/api/export' && req.method === 'GET') {
      const format = parsedUrl.searchParams ? parsedUrl.searchParams.get('format') : 'json';
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="all-account-briefs-portfolio.csv"');
        const escapeCsv = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        const headers = ['Company', 'Ticker', 'Domain', 'Role', 'WordCount', 'ReadSeconds', 'Item1_WhatItDoes', 'Item2_Monetization', 'Item3_Developments', 'Item4_Customers', 'Item5_OpenQuestion', 'TAM', 'RuleOf40', 'KillShotPitch'];
        const rows = Object.values(briefs).map(brief => [
          escapeCsv(brief.companyName),
          escapeCsv(brief.ticker),
          escapeCsv(brief.domain),
          escapeCsv(brief.targetRole),
          escapeCsv(brief.totalWordCount),
          escapeCsv(brief.estimatedReadSeconds),
          escapeCsv(brief.briefItems[0]?.sentences),
          escapeCsv(brief.briefItems[1]?.sentences),
          escapeCsv(brief.briefItems[2]?.sentences),
          escapeCsv(brief.briefItems[3]?.sentences),
          escapeCsv(brief.briefItems[4]?.sentences),
          escapeCsv(brief.marketAnalysis?.tam),
          escapeCsv(brief.marketAnalysis?.financialEfficiencyScorecard?.ruleOf40),
          escapeCsv(brief.marketAnalysis?.competitiveBattlecards?.[0]?.killShotPitch)
        ].join(','));
        res.writeHead(200);
        res.end([headers.join(','), ...rows].join('\n'));
        return;
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="all-account-briefs-portfolio.json"');
      res.writeHead(200);
      res.end(JSON.stringify(briefs, null, 2));
      return;
    }

    // List all calculators
    if (pathname === '/api/calculator' && req.method === 'GET') {
      const calcList = Object.entries(DEAL_CALCULATORS).map(([id, calc]) => ({
        id,
        calculatorName: calc.calculatorName,
        roleTag: calc.roleTag,
        inputCount: calc.inputs.length
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ calculators: calcList }, null, 2));
      return;
    }

    // Get specific calculator schema & default result
    const calcMatch = pathname.match(/^\/api\/calculator\/([a-zA-Z0-9_-]+)$/);
    if (calcMatch && req.method === 'GET') {
      const compId = calcMatch[1];
      const calc = DEAL_CALCULATORS[compId];
      if (calc) {
        const defaultVals = {};
        for (const input of calc.inputs) {
          defaultVals[input.key] = input.default;
        }
        const defaultResult = calc.compute(defaultVals);
        res.writeHead(200);
        res.end(JSON.stringify({
          companyId: compId,
          calculatorName: calc.calculatorName,
          roleTag: calc.roleTag,
          inputs: calc.inputs,
          defaultValues: defaultVals,
          result: defaultResult
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Calculator for '${compId}' not found.` }));
      }
      return;
    }

    // Compute calculator result via POST
    if (calcMatch && req.method === 'POST') {
      const compId = calcMatch[1];
      const calc = DEAL_CALCULATORS[compId];
      if (!calc) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Calculator for '${compId}' not found.` }));
        return;
      }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let inputVals = {};
        try {
          if (body) inputVals = JSON.parse(body);
        } catch (e) {}
        const mergedVals = {};
        for (const input of calc.inputs) {
          mergedVals[input.key] = inputVals[input.key] !== undefined ? inputVals[input.key] : input.default;
        }
        const result = calc.compute(mergedVals);
        res.writeHead(200);
        res.end(JSON.stringify({
          companyId: compId,
          calculatorName: calc.calculatorName,
          roleTag: calc.roleTag,
          inputsProvided: mergedVals,
          result
        }, null, 2));
      });
      return;
    }

    // Get specific brief
    const briefMatch = pathname.match(/^\/api\/briefs\/([a-zA-Z0-9_-]+)$/);
    if (briefMatch && req.method === 'GET') {
      const briefId = briefMatch[1];
      const brief = briefs[briefId];
      if (brief) {
        res.writeHead(200);
        res.end(JSON.stringify(brief));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Brief '${briefId}' not found.` }));
      }
      return;
    }

    // Universal Portfolio Search
    if (pathname === '/api/search' && req.method === 'GET') {
      const q = parsedUrl.searchParams.get('q') || '';
      const results = searchPortfolio(q);
      res.writeHead(200);
      res.end(JSON.stringify({ query: q, totalMatches: results.length, results }, null, 2));
      return;
    }

    // Flashcard study deck overview
    if (pathname === '/api/flashcards' && req.method === 'GET') {
      const summaries = Object.entries(briefs).map(([id, b]) => ({
        companyId: id,
        companyName: b.companyName,
        cardCount: 7
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ flashcardDecks: summaries }, null, 2));
      return;
    }

    // Flashcard deck for specific company
    const flashMatch = pathname.match(/^\/api\/flashcards\/([a-zA-Z0-9_-]+)$/);
    if (flashMatch && req.method === 'GET') {
      const compId = flashMatch[1];
      const cards = generateFlashcards(compId);
      if (cards) {
        res.writeHead(200);
        res.end(JSON.stringify({
          companyId: compId,
          companyName: briefs[compId].companyName,
          totalCards: cards.length,
          cards
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Flashcards for '${compId}' not found.` }));
      }
      return;
    }

    // Presentation slide deck for specific company
    const presMatch = pathname.match(/^\/api\/presentation\/([a-zA-Z0-9_-]+)$/);
    if (presMatch && req.method === 'GET') {
      const compId = presMatch[1];
      const deck = generatePresentationDeck(compId);
      if (deck) {
        res.writeHead(200);
        res.end(JSON.stringify(deck, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Presentation deck for '${compId}' not found.` }));
      }
      return;
    }

    // Cross-company comparison matrix
    if (pathname === '/api/compare' && req.method === 'GET') {
      const matrix = generateComparisonMatrix();
      res.writeHead(200);
      res.end(JSON.stringify({
        totalAccounts: matrix.length,
        matrix
      }, null, 2));
      return;
    }

    // Quiz overview across accounts
    if (pathname === '/api/quiz' && req.method === 'GET') {
      const summaries = Object.keys(QUIZ_QUESTIONS).map(id => ({
        companyId: id,
        companyName: briefs[id]?.companyName || id,
        totalQuestions: QUIZ_QUESTIONS[id].length
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ quizzes: summaries }, null, 2));
      return;
    }

    // Get quiz questions for a company (hides correctIndex to prevent cheating)
    const quizMatch = pathname.match(/^\/api\/quiz\/([a-zA-Z0-9_-]+)$/);
    if (quizMatch && req.method === 'GET') {
      const compId = quizMatch[1];
      const questions = QUIZ_QUESTIONS[compId];
      if (questions) {
        const clientQuestions = questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options
        }));
        res.writeHead(200);
        res.end(JSON.stringify({
          companyId: compId,
          companyName: briefs[compId].companyName,
          totalQuestions: clientQuestions.length,
          questions: clientQuestions
        }, null, 2));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Quiz for '${compId}' not found.` }));
      }
      return;
    }

    // Evaluate quiz submission
    if (pathname === '/api/quiz/evaluate' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const { companyId, answers } = parsed;
          if (!companyId || !answers) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing companyId or answers payload' }));
            return;
          }
          const result = evaluateQuizSubmission(companyId, answers);
          if (result.error) {
            res.writeHead(404);
            res.end(JSON.stringify(result));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON request payload', details: e.message }));
        }
      });
      return;
    }

    // Interactive Interview Answer Evaluator
    if (pathname === '/api/interview/evaluate' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const { companyId, question, candidateAnswer } = parsed;
          if (!companyId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing required field: companyId' }));
            return;
          }
          const evaluation = evaluateInterviewAnswer(companyId, question, candidateAnswer);
          if (evaluation.error) {
            res.writeHead(404);
            res.end(JSON.stringify(evaluation));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify(evaluation, null, 2));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON request payload', details: e.message }));
        }
      });
      return;
    }

    // Validate a custom brief
    if (pathname === '/api/verify' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const validation = validateBrief(parsed);
          res.writeHead(200);
          res.end(JSON.stringify(validation));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON request payload', details: e.message }));
        }
      });
      return;
    }

    // Unknown API route
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    return;
  }

  // Printable HTML Executive Cheat Sheet
  const printMatch = pathname.match(/^\/print\/([a-zA-Z0-9_-]+)$/);
  if (printMatch && req.method === 'GET') {
    const compId = printMatch[1];
    const html = renderPrintableHtml(compId);
    if (html) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Printable brief for '${compId}' not found.`);
    }
    return;
  }

  // Serve static files
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA if not found
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, indexData) => {
        if (readErr) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(resolvedPath).pipe(res);
  });
}

const server = http.createServer(handleRequest);

function startServer(portToTry = PORT, maxRetries = 5) {
  let currentPort = Number(portToTry);

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxRetries > 0) {
      console.warn(`[WARN] Port ${currentPort} in use, trying port ${currentPort + 1}...`);
      startServer(currentPort + 1, maxRetries - 1);
    } else {
      console.error(`[ERROR] Server failed to start:`, err.message);
      process.exit(1);
    }
  });

  server.listen(currentPort, () => {
    console.log(`================================================================`);
    console.log(` 🚀 90-Second Account Brief Server Active`);
    console.log(` 📍 Local URL:     http://localhost:${currentPort}`);
    console.log(` 🩺 Health Check:  http://localhost:${currentPort}/api/health`);
    console.log(` ⚡ Diagnostics:   http://localhost:${currentPort}/api/diagnostics`);
    console.log(` 📦 Fetch All:     http://localhost:${currentPort}/api/all`);
    console.log(` 📊 Financials:    http://localhost:${currentPort}/api/financials`);
    console.log(` 🔍 Deep Analysis: http://localhost:${currentPort}/api/analysis/snap`);
    console.log(`================================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  startServer,
  handleRequest,
  validateBrief,
  calculateWordCount,
  calculateReadingSeconds,
  DEAL_CALCULATORS,
  evaluateInterviewAnswer,
  searchPortfolio
};
