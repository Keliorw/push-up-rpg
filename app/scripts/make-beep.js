// Генерирует короткий beep (WAV PCM16 mono 44.1kHz) без внешних зависимостей.
const fs = require('fs');

const sr = 44100;
const dur = 0.12;
const freq = 880;
const n = Math.floor(sr * dur);
const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  const attack = Math.min(1, i / 200);
  const release = Math.min(1, ((n - i) / n) * 10);
  const s = Math.sin((2 * Math.PI * freq * i) / sr) * attack * release * 0.8;
  data.writeInt16LE(Math.round(s * 32767), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(sr, 24);
header.writeUInt32LE(sr * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
fs.writeFileSync(process.argv[2], Buffer.concat([header, data]));
console.log('written', process.argv[2], 44 + data.length, 'bytes');
