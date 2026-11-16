// scripts/auto-runner.js
// Master Local Auto-Runner: Performs complete end-to-end verification, data fetch, and system self-test
const { runAllDiagnostics } = require('./verify-all');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

console.log('================================================================');
console.log('  🚀 90-SECOND ACCOUNT BRIEF: MASTER LOCAL AUTO-RUNNER SUITE     ');
console.log('================================================================\n');

// 1. Run Node.js Native Unit Tests
console.log('>>> STEP 1: Running Automated Unit & Constraint Tests (node:test)...');
const testRun = spawnSync(process.execPath, ['--test', path.join(__dirname, '..', 'test', 'brief.test.js')], {
  stdio: 'inherit',
  env: process.env
});

if (testRun.status !== 0) {
  console.error('\n❌ Unit tests failed! Auto-runner aborted.');
  process.exit(1);
}

// 2. Run Comprehensive Route Diagnostics & Constraint Probes
console.log('\n>>> STEP 2: Running End-to-End Route Probes & Constraint Checks...');
runAllDiagnostics()
  .then(() => {
    // 3. Run Fetch-All Probe
    console.log('\n>>> STEP 3: Executing Unified Portfolio Fetch-All Probe...');
    const fetchRun = spawnSync(process.execPath, [path.join(__dirname, 'fetch-all.js')], {
      stdio: 'inherit',
      env: process.env
    });

    if (fetchRun.status !== 0) {
      console.error('\n❌ Fetch-all probe failed!');
      process.exit(1);
    }

    console.log('\n🎉 ALL LOCAL PROCESSES & AUTO-RUN TESTS COMPLETED WITH 100% SUCCESS!');
  })
  .catch(err => {
    console.error('\n❌ Auto-runner encountered unexpected error:', err);
    process.exit(1);
  });

