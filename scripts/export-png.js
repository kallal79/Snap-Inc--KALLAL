// scripts/export-png.js
// Exports pixel-perfect 1200x800 PNG images from SVG cards for Handshake upload
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

function convertSvgToPng(svgPath, pngPath, width = 1200, height = 800) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width
    }
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`✅ Generated: ${pngPath} (${pngBuffer.length} bytes, ${width}x${height}px)`);
}

const publicDir = path.join(__dirname, '..', 'public');
const artifactDir = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\5ba09aec-a553-41f8-a894-dec8bed831f6';

const coverSvg = path.join(publicDir, 'cover-card.svg');
const coverPng = path.join(publicDir, 'cover-card.png');
const testSvg = path.join(publicDir, 'test-results-card.svg');
const testPng = path.join(publicDir, 'test-results-card.png');

console.log('Rendering 1200x800 PNG assets from SVGs...');
convertSvgToPng(coverSvg, coverPng, 1200, 800);
convertSvgToPng(testSvg, testPng, 1200, 800);

// Also copy to artifact dir
if (fs.existsSync(artifactDir)) {
  fs.copyFileSync(coverPng, path.join(artifactDir, 'cover-card.png'));
  fs.copyFileSync(testPng, path.join(artifactDir, 'test-results-card.png'));
  console.log('✅ Copied PNGs to artifact directory.');
}

console.log('🎉 All PNG cards successfully exported!');
