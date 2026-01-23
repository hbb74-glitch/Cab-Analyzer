const fs = require('fs');
const path = require('path');
const WavDecoder = require('wav-decoder');

function computeSpectralCentroid(audioBuffer, sampleRate) {
  const fftSize = 4096;
  const samples = audioBuffer.slice(0, fftSize);
  
  // Apply Hann window
  const windowed = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    const hannValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    windowed[i] = (samples[i] || 0) * hannValue;
  }
  
  // Simple DFT for magnitude spectrum (just first half - positive frequencies)
  const numBins = fftSize / 2;
  const magnitudes = new Float32Array(numBins);
  
  for (let k = 0; k < numBins; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      real += windowed[n] * Math.cos(angle);
      imag -= windowed[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(real * real + imag * imag);
  }
  
  // Calculate spectral centroid
  let weightedSum = 0;
  let magnitudeSum = 0;
  
  for (let k = 0; k < numBins; k++) {
    const frequency = (k * sampleRate) / fftSize;
    weightedSum += frequency * magnitudes[k];
    magnitudeSum += magnitudes[k];
  }
  
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
}

async function analyzeFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const audioData = await WavDecoder.decode(buffer);
  
  const samples = audioData.channelData[0];
  const sampleRate = audioData.sampleRate;
  
  const centroid = computeSpectralCentroid(samples, sampleRate);
  
  return {
    file: path.basename(filePath),
    sampleRate,
    samples: samples.length,
    spectralCentroid: Math.round(centroid)
  };
}

async function main() {
  const attachedDir = './attached_assets';
  const files = fs.readdirSync(attachedDir)
    .filter(f => f.includes('PR30') && f.endsWith('.wav'))
    .map(f => path.join(attachedDir, f));
  
  console.log(`\nAnalyzing ${files.length} PR30 IR files...\n`);
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const file of files) {
    try {
      const result = await analyzeFile(file);
      results.push(result);
      console.log(`${result.file}`);
      console.log(`  Spectral Centroid: ${result.spectralCentroid} Hz`);
      console.log('');
    } catch (err) {
      console.error(`Error processing ${file}: ${err.message}`);
    }
  }
  
  console.log('='.repeat(80));
  console.log('\nSUMMARY:');
  
  const centroids = results.map(r => r.spectralCentroid);
  const avg = Math.round(centroids.reduce((a, b) => a + b, 0) / centroids.length);
  const min = Math.min(...centroids);
  const max = Math.max(...centroids);
  
  console.log(`  Files analyzed: ${results.length}`);
  console.log(`  Min centroid: ${min} Hz`);
  console.log(`  Max centroid: ${max} Hz`);
  console.log(`  Average centroid: ${avg} Hz`);
  console.log(`\n  Current PR30 range in app: 2200-3100 Hz`);
  console.log(`  Measured range: ${min}-${max} Hz`);
  
  // Group by speaker
  console.log('\n\nBY SPEAKER:');
  const bySpeaker = {};
  for (const r of results) {
    const parts = r.file.split('_');
    const speaker = parts[0];
    if (!bySpeaker[speaker]) bySpeaker[speaker] = [];
    bySpeaker[speaker].push(r.spectralCentroid);
  }
  
  for (const [speaker, vals] of Object.entries(bySpeaker)) {
    const spkAvg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    console.log(`  ${speaker}: avg ${spkAvg} Hz (${vals.join(', ')} Hz)`);
  }
  
  // Group by position
  console.log('\n\nBY POSITION:');
  const byPosition = {};
  for (const r of results) {
    const parts = r.file.split('_');
    // Position is typically index 2-3
    let pos = parts[2];
    if (parts[3] && (parts[3].includes('Favor') || parts[3].includes('OffCenter'))) {
      pos = parts[2] + '_' + parts[3];
    }
    if (!byPosition[pos]) byPosition[pos] = [];
    byPosition[pos].push(r.spectralCentroid);
  }
  
  for (const [pos, vals] of Object.entries(byPosition)) {
    const posAvg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    console.log(`  ${pos}: avg ${posAvg} Hz (${vals.join(', ')} Hz)`);
  }
}

main().catch(console.error);
