// A QR code for the sync link, drawn as SVG, so another phone can scan it from this screen.
// Byte mode at error-correction level M, versions 1–40. This follows the QR Code standard
// (ISO/IEC 18004) as it is set out in Project Nayuki's reference implementation:
// https://www.nayuki.io/page/qr-code-generator-library
// check_guitar.mjs does not test it; the sync tests decode what it draws.

// Level M: error-correction codewords per block, and the number of blocks, for versions 1–40.
const eccPerBlock = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const blockCount = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

function rawModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}
const dataCodewords = version => Math.floor(rawModules(version) / 8) - eccPerBlock[version] * blockCount[version];

// ---------------------------------------------------------------- Reed–Solomon over GF(256)

function multiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function divisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = multiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = multiply(root, 0x02);
  }
  return result;
}

function remainder(data, by) {
  const result = by.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    by.forEach((coefficient, i) => { result[i] ^= multiply(coefficient, factor); });
  }
  return result;
}

// ---------------------------------------------------------------- the symbol

function alignmentPositions(version, size) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

const bit = (value, index) => ((value >>> index) & 1) !== 0;

function build(version, codewords, mask) {
  const size = version * 4 + 17;
  const dark = Array.from({ length: size }, () => new Array(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, on) => { dark[y][x] = on; fixed[y][x] = true; };

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, ring = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, ring !== 2 && ring !== 4);
    }
  }
  const aligned = alignmentPositions(version, size);
  aligned.forEach((ax, i) => aligned.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === aligned.length - 1) || (i === aligned.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const format = () => {
    const data = (0 << 3) | mask;   // level M has format bits 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(bits, i));
    set(8, 7, bit(bits, 6));
    set(8, 8, bit(bits, 7));
    set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(bits, i));
    set(8, size - 8, true);
  };
  format();
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, bit(bits, i));
      set(b, a, bit(bits, i));
    }
  }

  // Data in two-column strips, zigzagging up and down from the bottom right.
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!fixed[y][x] && index < codewords.length * 8) {
          dark[y][x] = bit(codewords[index >>> 3], 7 - (index & 7));
          index++;
        }
      }
    }
  }
  const flip = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
  ][mask];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && flip(x, y)) dark[y][x] = !dark[y][x];
  return dark;
}

// The standard's four penalty rules; the mask with the lowest score is used.
function penalty(dark) {
  const size = dark.length;
  let score = 0;
  const lines = [...dark, ...dark.map((_, x) => dark.map(row => row[x]))];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) { run++; continue; }
      if (run >= 5) score += run - 2;
      run = 1;
    }
    const text = line.map(on => on ? "1" : "0").join("");
    for (const pattern of ["10111010000", "00001011101"]) {
      for (let at = text.indexOf(pattern); at >= 0; at = text.indexOf(pattern, at + 1)) score += 40;
    }
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = dark[y][x];
    if (c === dark[y][x + 1] && c === dark[y + 1][x] && c === dark[y + 1][x + 1]) score += 3;
  }
  const on = dark.flat().filter(Boolean).length, all = size * size;
  score += (Math.ceil(Math.abs(on * 20 - all * 10) / all) - 1) * 10;
  return score;
}

// The modules of a QR code for text: rows of booleans, dark = true.
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 1;
  const needed = v => 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
  while (version <= 40 && needed(version) > dataCodewords(version) * 8) version++;
  if (version > 40) throw new Error("Too much text for a QR code");
  const capacity = dataCodewords(version) * 8;
  const bits = [];
  const push = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

  // Split into blocks, add each block's error correction, then interleave.
  const blocks = blockCount[version], ecc = eccPerBlock[version];
  const raw = Math.floor(rawModules(version) / 8);
  const short = blocks - raw % blocks, shortLength = Math.floor(raw / blocks);
  const by = divisor(ecc);
  const pieces = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const part = data.slice(k, k + shortLength - ecc + (i < short ? 0 : 1));
    k += part.length;
    const check = remainder(part, by);
    if (i < short) part.push(0);
    pieces.push(part.concat(check));
  }
  const codewords = [];
  for (let i = 0; i < pieces[0].length; i++) {
    pieces.forEach((piece, j) => { if (i !== shortLength - ecc || j >= short) codewords.push(piece[i]); });
  }

  let best = null, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = build(version, codewords, mask);
    const score = penalty(candidate);
    if (score < bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

// An SVG of the code with a four-module quiet zone. It takes the text colour (currentColor),
// so put it on a light background.
export function qrSvg(text, { label = "QR code" } = {}) {
  const matrix = qrMatrix(text);
  const size = matrix.length + 8;
  let path = "";
  matrix.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let run = 1;
      while (x + run < row.length && row[x + run]) run++;
      path += `M${x + 4} ${y + 4}h${run}v1h-${run}z`;
      x += run - 1;
    }
  });
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label.replace(/"/g, "&quot;")}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
