import fs from 'fs';
import path from 'path';

function parseWav(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Not a WAV file');
  offset = 12;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let numChannels = 1;
  let dataOffset = 0;
  let dataSize = 0;
  while (offset < buffer.length - 8) {
    const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ') {
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.floor(dataSize / (bytesPerSample * numChannels));
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const sampleOffset = dataOffset + i * bytesPerSample * numChannels;
    if (bitsPerSample === 16) {
      samples[i] = view.getInt16(sampleOffset, true) / 32768;
    } else if (bitsPerSample === 24) {
      const b0 = view.getUint8(sampleOffset);
      const b1 = view.getUint8(sampleOffset + 1);
      const b2 = view.getUint8(sampleOffset + 2);
      let val = (b2 << 16) | (b1 << 8) | b0;
      if (val >= 0x800000) val -= 0x1000000;
      samples[i] = val / 8388608;
    } else if (bitsPerSample === 32) {
      samples[i] = view.getFloat32(sampleOffset, true);
    }
  }
  return { samples, sampleRate, numSamples };
}

function analyzeIR(filePath) {
  const buf = fs.readFileSync(filePath);
  const { samples, sampleRate, numSamples } = parseWav(buf);
  
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0 && peak < 1.0) {
    const scale = 1.0 / peak;
    for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  }

  let fftSize = 8192;
  if (numSamples < 8192) {
    fftSize = Math.pow(2, Math.floor(Math.log2(numSamples)));
    fftSize = Math.max(512, fftSize);
  }
  const N = Math.min(fftSize, numSamples);
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  for (let i = 0; i < N; i++) {
    real[i] = samples[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  }
  
  fftInPlace(real, imag);
  
  const binSize = sampleRate / fftSize;
  const halfBins = fftSize / 2;
  
  let subBassSum = 0, bassSum = 0, lowMidSum = 0, midSum = 0, highMidSum = 0, presenceSum = 0, ultraHighSum = 0;
  let totalEnergy = 0;
  
  for (let i = 0; i < halfBins; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    const energy = mag * mag;
    const freq = i * binSize;
    totalEnergy += energy;
    
    if (freq >= 20 && freq < 120) subBassSum += energy;
    else if (freq >= 120 && freq < 250) bassSum += energy;
    else if (freq >= 250 && freq < 500) lowMidSum += energy;
    else if (freq >= 500 && freq < 2000) midSum += energy;
    else if (freq >= 2000 && freq < 4000) highMidSum += energy;
    else if (freq >= 4000 && freq < 8000) presenceSum += energy;
    else if (freq >= 8000 && freq <= 20000) ultraHighSum += energy;
  }
  
  const sixBandTotal = subBassSum + bassSum + lowMidSum + midSum + highMidSum + presenceSum;
  
  if (sixBandTotal === 0) return null;
  
  const bands = {
    subBass: Math.round((subBassSum / sixBandTotal) * 1000) / 10,
    bass: Math.round((bassSum / sixBandTotal) * 1000) / 10,
    lowMid: Math.round((lowMidSum / sixBandTotal) * 1000) / 10,
    mid: Math.round((midSum / sixBandTotal) * 1000) / 10,
    highMid: Math.round((highMidSum / sixBandTotal) * 1000) / 10,
    presence: Math.round((presenceSum / sixBandTotal) * 1000) / 10,
  };
  
  const ratio = bands.mid > 0 ? Math.round((bands.highMid / bands.mid) * 100) / 100 : 0;
  
  return { bands, ratio };
}

function fftInPlace(real, imag) {
  const n = real.length;
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let j = 0;
    for (let b = 0; b < bits; b++) {
      j = (j << 1) | ((i >> b) & 1);
    }
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = -2 * Math.PI / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const cos = Math.cos(angle * j);
        const sin = Math.sin(angle * j);
        const tr = real[i + j + halfSize] * cos - imag[i + j + halfSize] * sin;
        const ti = real[i + j + halfSize] * sin + imag[i + j + halfSize] * cos;
        real[i + j + halfSize] = real[i + j] - tr;
        imag[i + j + halfSize] = imag[i + j] - ti;
        real[i + j] += tr;
        imag[i + j] += ti;
      }
    }
  }
}

const dir = 'attached_assets';
const wavFiles = fs.readdirSync(dir).filter(f => f.endsWith('.wav')).sort();

const results = [];
for (const file of wavFiles) {
  const filePath = path.join(dir, file);
  const name = file.replace(/_\d{13}\.wav$/, '');
  try {
    const analysis = analyzeIR(filePath);
    if (analysis) {
      results.push({ name, ...analysis });
    }
  } catch (e) {
    console.error(`Failed: ${file}: ${e.message}`);
  }
}

console.log('\n=== 6-BAND TONAL ANALYSIS ===\n');
console.log('IR Name'.padEnd(45) + 'SubB  Bass  LwMd  Mid   HiMd  Pres  HM/M');
console.log('-'.repeat(105));

for (const r of results) {
  const b = r.bands;
  const line = r.name.padEnd(45) +
    `${b.subBass.toFixed(1).padStart(4)}  ${b.bass.toFixed(1).padStart(4)}  ${b.lowMid.toFixed(1).padStart(4)}  ${b.mid.toFixed(1).padStart(4)}  ${b.highMid.toFixed(1).padStart(4)}  ${b.presence.toFixed(1).padStart(4)}  ${r.ratio.toFixed(2)}`;
  console.log(line);
}

const creamOnly = results.filter(r => r.name.startsWith('Cream_'));
const sm57Only = results.filter(r => r.name.includes('SM57'));

if (creamOnly.length > 0) {
  console.log('\n=== CREAM SPEAKER SUMMARY ===');
  const avgMid = creamOnly.reduce((s, r) => s + r.bands.mid, 0) / creamOnly.length;
  const avgHiMid = creamOnly.reduce((s, r) => s + r.bands.highMid, 0) / creamOnly.length;
  const avgPres = creamOnly.reduce((s, r) => s + r.bands.presence, 0) / creamOnly.length;
  const avgRatio = creamOnly.reduce((s, r) => s + r.ratio, 0) / creamOnly.length;
  console.log(`  Avg Mid: ${avgMid.toFixed(1)}%  Avg HiMid: ${avgHiMid.toFixed(1)}%  Avg Presence: ${avgPres.toFixed(1)}%  Avg Ratio: ${avgRatio.toFixed(2)}`);
  console.log(`  Mid range: ${Math.min(...creamOnly.map(r=>r.bands.mid)).toFixed(1)}-${Math.max(...creamOnly.map(r=>r.bands.mid)).toFixed(1)}%`);
  console.log(`  HiMid range: ${Math.min(...creamOnly.map(r=>r.bands.highMid)).toFixed(1)}-${Math.max(...creamOnly.map(r=>r.bands.highMid)).toFixed(1)}%`);
  console.log(`  Presence range: ${Math.min(...creamOnly.map(r=>r.bands.presence)).toFixed(1)}-${Math.max(...creamOnly.map(r=>r.bands.presence)).toFixed(1)}%`);
  console.log(`  Ratio range: ${Math.min(...creamOnly.map(r=>r.ratio)).toFixed(2)}-${Math.max(...creamOnly.map(r=>r.ratio)).toFixed(2)}`);
}

if (sm57Only.length > 0) {
  console.log('\n=== SM57 ACROSS SPEAKERS ===');
  for (const r of sm57Only) {
    console.log(`  ${r.name.padEnd(40)} Mid: ${r.bands.mid.toFixed(1)}%  HiMid: ${r.bands.highMid.toFixed(1)}%  Pres: ${r.bands.presence.toFixed(1)}%  Ratio: ${r.ratio.toFixed(2)}`);
  }
}
