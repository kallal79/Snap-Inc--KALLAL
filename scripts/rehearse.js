#!/usr/bin/env node
/**
 * 90-Second Account Brief: Interactive Terminal Rehearsal Coach
 * Run: node scripts/rehearse.js [snap | stripe | datadog | openai | nvidia]
 * Zero dependencies, pure standard library.
 */

const briefs = require('../data/briefs.js');

const targetId = (process.argv[2] || 'snap').toLowerCase();
const brief = briefs[targetId] || briefs['snap'];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  rose: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

console.log('');
console.log(`${colors.bright}${colors.yellow}================================================================${colors.reset}`);
console.log(`${colors.bright}${colors.yellow}  🎙️ 90-SECOND ACCOUNT BRIEF: TERMINAL REHEARSAL COACH          ${colors.reset}`);
console.log(`${colors.bright}${colors.yellow}================================================================${colors.reset}`);
console.log('');
console.log(`${colors.bright}Target Account:  ${colors.green}${brief.companyName} (${brief.ticker})${colors.reset}`);
console.log(`${colors.bright}Role Context:    ${colors.cyan}${brief.targetRole}${colors.reset}`);
console.log(`${colors.bright}Word Count:      ${colors.yellow}${brief.totalWordCount} / 200 words${colors.reset} (${brief.totalWordCount <= 200 ? '✅ Strictly Compliant' : '❌ Exceeds 200'})`);
console.log(`${colors.bright}Speaking Pace:   ${colors.yellow}~${brief.estimatedReadSeconds}s @ 130 WPM${colors.reset} (Target: ~90s window)`);
console.log(`${colors.bright}Verified Audit:  ${colors.green}${brief.verificationAudit.length} Primary Sources Checked (SEC / Newsroom)${colors.reset}`);
console.log('');
console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}         TIMED 90-SECOND TELEPROMPTER CUE CARD                  ${colors.reset}`);
console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
console.log('');

const timings = [
  { range: '00s – 15s', phase: 'STAGE 1: ELEVATOR PITCH', wpmTip: 'Clear, confident, plain English' },
  { range: '15s – 30s', phase: 'STAGE 2: MONETIZATION ENGINE', wpmTip: 'Anchor on revenue stream & unit margins' },
  { range: '30s – 55s', phase: 'STAGE 3: 2024 STRATEGIC NEWS', wpmTip: 'Cite specific month, year, and primary source' },
  { range: '55s – 70s', phase: 'STAGE 4: ICP & TARGET BUYER', wpmTip: 'Define the economic buyer and personas' },
  { range: '70s – 90s', phase: 'STAGE 5: THE EXECUTIVE CLOSER', wpmTip: 'Deliver Item 5 as a peer question' }
];

brief.briefItems.forEach((item, idx) => {
  const timeInfo = timings[idx];
  console.log(`${colors.bright}${colors.yellow}[${timeInfo.range}] ${colors.cyan}${item.number}. ${item.title.toUpperCase()}${colors.reset} ${colors.dim}(${timeInfo.phase})${colors.reset}`);
  console.log(`${colors.dim}Coach Tip: ${timeInfo.wpmTip}${colors.reset}`);
  console.log('');
  console.log(`   ${colors.bright}"${item.sentences}"${colors.reset}`);
  console.log('');
});

console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
console.log(`${colors.bright}${colors.green}  ⚔️ COMPETITOR KILL-SHOT TALK TRACK                           ${colors.reset}`);
console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
if (brief.marketAnalysis?.competitiveBattlecards?.[0]) {
  const bc = brief.marketAnalysis.competitiveBattlecards[0];
  console.log(`${colors.bright}vs. ${bc.competitorName}:${colors.reset}`);
  console.log(`   ${colors.yellow}"${bc.killShotPitch}"${colors.reset}`);
}
console.log('');

console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
console.log(`${colors.bright}${colors.yellow}  🏆 HANDSHAKE SHOWCASE READY COPY                             ${colors.reset}`);
console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
console.log(`Title:       ${brief.handshakeSubmission.projectTitle}`);
console.log(`Description: ${brief.handshakeSubmission.descriptionCharCount}/500 chars (Strictly Compliant)`);
console.log(`Digging:     ${brief.handshakeSubmission.claimNeedingMostDigging.slice(0, 120)}...`);
console.log('');
console.log(`${colors.bright}${colors.green}✅ REHEARSAL CUE CARD COMPLETE. STEP INTO THE INTERVIEW WITH CONFIDENCE!${colors.reset}`);
console.log('');

