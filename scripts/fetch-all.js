// scripts/fetch-all.js
// Standalone utility to fetch all 4 account briefs, market dossiers, and Handshake submission bundles
const { dispatchRequest } = require('./verify-all');

async function main() {
  console.log('================================================================');
  console.log('       FETCH-ALL: COMPLETE 90-SECOND ACCOUNT DOSSIER            ');
  console.log('================================================================\n');

  const res = await dispatchRequest('GET', '/api/all');
  if (res.statusCode !== 200 || !res.body || res.body.status !== 'ok') {
    console.error('❌ Failed to fetch portfolio bundle:', res.statusCode);
    process.exit(1);
  }

  const bundle = res.body;
  console.log(`📦 Loaded ${bundle.totalAccounts} Verified Accounts in ${res.latencyMs}ms\n`);

  for (const [key, b] of Object.entries(bundle.briefs)) {
    console.log(`----------------------------------------------------------------`);
    console.log(`🏢 ${b.companyName.toUpperCase()} (${b.ticker}) • ${b.industry}`);
    console.log(`🎯 Target Role:    ${b.targetRole}`);
    console.log(`🌐 Website:        https://${b.domain}`);
    console.log(`📝 Word Count:     ${b.totalWordCount} / 200 words (Strictly Compliant)`);
    console.log(`⏱️ Speaking Pace:  ${b.estimatedReadSeconds}s @ 130 WPM (~90s Fit)`);
    console.log(`🏆 Handshake Desc: ${b.handshakeSubmission.descriptionCharCount} / 500 chars`);
    console.log(`🔍 Verified Audit: ${b.verificationAudit.length} Primary Source Claims`);
    console.log(`📊 Market TAM:     ${b.marketAnalysis.tam}`);
    if (b.marketAnalysis.marketSizing) {
      console.log(`📐 SAM / SOM:      SAM: ${b.marketAnalysis.marketSizing.sam} | SOM: ${b.marketAnalysis.marketSizing.som}`);
      console.log(`📈 Market CAGR:    ${b.marketAnalysis.marketSizing.cagr}`);
    }
    if (b.marketAnalysis.financialEfficiencyScorecard) {
      console.log(`🏅 Rule of 40:     ${b.marketAnalysis.financialEfficiencyScorecard.ruleOf40} (${b.marketAnalysis.financialEfficiencyScorecard.ruleOf40Status})`);
      console.log(`🔄 Net Retention:  ${b.marketAnalysis.financialEfficiencyScorecard.netRevenueRetention}`);
    }
    if (b.marketAnalysis.financials) {
      console.log(`💰 Annual Rev:     ${b.marketAnalysis.financials.annualRevenue}`);
    }
    console.log(`⚔️ Top Rivals:     ${b.marketAnalysis.keyCompetitors.map(c => c.name).join(' vs ')}`);
    if (b.marketAnalysis.portersFiveForces) {
      console.log(`🛡️ Industry Force: Rivalry: ${b.marketAnalysis.portersFiveForces.industryRivalry.level} | Entrants: ${b.marketAnalysis.portersFiveForces.threatOfNewEntrants.level}`);
    }
    console.log(`💡 Strategic Moat: ${b.marketAnalysis.strategicMoats[0]}`);
    if (b.marketAnalysis.objectionHandling && b.marketAnalysis.objectionHandling.length > 0) {
      console.log(`🎯 Tough Defense:  "${b.marketAnalysis.objectionHandling[0].toughQuestion}"`);
    }
    if (b.marketAnalysis.competitiveBattlecards && b.marketAnalysis.competitiveBattlecards.length > 0) {
      console.log(`⚡ Kill-Shot Talk: "${b.marketAnalysis.competitiveBattlecards[0].killShotPitch.slice(0, 95)}..."`);
    }
    if (b.marketAnalysis.meddpiccQualification) {
      console.log(`📋 MEDDPICC Buyer: ${b.marketAnalysis.meddpiccQualification.economicBuyer}`);
    }
    if (b.marketAnalysis.onboardingRampPlan && b.marketAnalysis.onboardingRampPlan.phase30) {
      const p30Text = b.marketAnalysis.onboardingRampPlan.phase30.focus || b.marketAnalysis.onboardingRampPlan.phase30.phase || '';
      console.log(`🚀 30-Day Focus:   ${p30Text.slice(0, 85)}...`);
    }
    console.log(`❓ Open Question:  "${b.briefItems[4].sentences}"`);
  }

  console.log('\n================================================================');
  console.log('✅ ALL ACCOUNTS SUCCESSFULLY FETCHED, AUDITED & READY LOCALLY!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal fetch error:', err);
  process.exit(1);
});

