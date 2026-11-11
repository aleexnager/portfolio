// In-browser version of the idea behind my bachelor's thesis: LSB
// steganography that ranks 8x8 blocks by Shannon entropy and embeds in the
// noisiest regions first. Entropy is computed on the 7 most significant bits,
// so embedding never changes the order and the decoder can rebuild it.

export type Mode = "sequential" | "adaptive";

const SIZE = 256;
const BLOCK = 8;
const HEADER_BITS = 32;
const FLAT_THRESHOLD = 2.6; // bits of entropy below which a block is "flat"

export type Analysis = {
  entropy: Float32Array; // per block
  flat: Uint8Array; // per block, 1 if flat
  order: Record<Mode, Uint32Array>; // channel-slot indices (pixel*3+c) in embedding order
  capacityBytes: number;
};

export type EmbedResult = {
  stego: Uint8ClampedArray;
  changed: Uint32Array; // channel-slot indices actually flipped, in embedding order
  touchedPixels: number;
  bits: number;
  psnr: number;
  flatShare: number; // share of changed pixels that sit in flat blocks
};

const blocksPerRow = SIZE / BLOCK;

function blockOf(pixel: number) {
  const x = pixel % SIZE;
  const y = (pixel / SIZE) | 0;
  return ((y / BLOCK) | 0) * blocksPerRow + ((x / BLOCK) | 0);
}

export function analyse(rgba: Uint8ClampedArray): Analysis {
  const nBlocks = blocksPerRow * blocksPerRow;
  const entropy = new Float32Array(nBlocks);
  const flat = new Uint8Array(nBlocks);
  const hist = new Uint16Array(32);

  for (let b = 0; b < nBlocks; b++) {
    hist.fill(0);
    const bx = (b % blocksPerRow) * BLOCK;
    const by = ((b / blocksPerRow) | 0) * BLOCK;
    for (let y = 0; y < BLOCK; y++) {
      for (let x = 0; x < BLOCK; x++) {
        const i = ((by + y) * SIZE + (bx + x)) * 4;
        // Luma on LSB-stripped channels, quantised to 32 levels.
        const g = 0.299 * (rgba[i] >> 1) + 0.587 * (rgba[i + 1] >> 1) + 0.114 * (rgba[i + 2] >> 1);
        hist[Math.min(31, (g / 4) | 0)]++;
      }
    }
    let H = 0;
    const n = BLOCK * BLOCK;
    for (let k = 0; k < 32; k++) {
      if (!hist[k]) continue;
      const p = hist[k] / n;
      H -= p * Math.log2(p);
    }
    entropy[b] = H;
    flat[b] = H < FLAT_THRESHOLD ? 1 : 0;
  }

  const slots = SIZE * SIZE * 3;
  const sequential = new Uint32Array(slots);
  for (let i = 0; i < slots; i++) sequential[i] = i;

  const blockOrder = Array.from({ length: nBlocks }, (_, i) => i).sort((a, b) => entropy[b] - entropy[a] || a - b);
  const adaptive = new Uint32Array(slots);
  let k = 0;
  for (const b of blockOrder) {
    const bx = (b % blocksPerRow) * BLOCK;
    const by = ((b / blocksPerRow) | 0) * BLOCK;
    for (let y = 0; y < BLOCK; y++) {
      for (let x = 0; x < BLOCK; x++) {
        const p = (by + y) * SIZE + (bx + x);
        adaptive[k++] = p * 3;
        adaptive[k++] = p * 3 + 1;
        adaptive[k++] = p * 3 + 2;
      }
    }
  }

  return {
    entropy,
    flat,
    order: { sequential, adaptive },
    capacityBytes: Math.floor((slots - HEADER_BITS) / 8),
  };
}

function toBits(payload: Uint8Array) {
  const bits = new Uint8Array(HEADER_BITS + payload.length * 8);
  const len = payload.length;
  for (let i = 0; i < HEADER_BITS; i++) bits[i] = (len >>> (31 - i)) & 1;
  for (let i = 0; i < payload.length; i++) {
    for (let j = 0; j < 8; j++) bits[HEADER_BITS + i * 8 + j] = (payload[i] >> (7 - j)) & 1;
  }
  return bits;
}

export function embed(cover: Uint8ClampedArray, a: Analysis, mode: Mode, payload: Uint8Array): EmbedResult {
  const stego = new Uint8ClampedArray(cover);
  const bits = toBits(payload);
  const order = a.order[mode];
  const changed: number[] = [];
  const touched = new Set<number>();

  for (let i = 0; i < bits.length; i++) {
    const slot = order[i];
    const pixel = (slot / 3) | 0;
    const idx = pixel * 4 + (slot % 3);
    if ((stego[idx] & 1) !== bits[i]) {
      stego[idx] = (stego[idx] & 0xfe) | bits[i];
      changed.push(slot);
      touched.add(pixel);
    }
  }

  let flatTouched = 0;
  touched.forEach((p) => {
    if (a.flat[blockOf(p)]) flatTouched++;
  });

  const mse = changed.length / (SIZE * SIZE * 3);
  return {
    stego,
    changed: Uint32Array.from(changed),
    touchedPixels: touched.size,
    bits: bits.length,
    psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse),
    flatShare: touched.size ? flatTouched / touched.size : 0,
  };
}

export function extract(stego: Uint8ClampedArray, mode: Mode): Uint8Array | null {
  // Rebuild the order from the stego image itself, as a real receiver would.
  const order = analyse(stego).order[mode];
  const read = (i: number) => {
    const slot = order[i];
    return stego[((slot / 3) | 0) * 4 + (slot % 3)] & 1;
  };
  let len = 0;
  for (let i = 0; i < HEADER_BITS; i++) len = (len << 1) | read(i);
  len >>>= 0;
  if (len > (order.length - HEADER_BITS) / 8) return null;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | read(HEADER_BITS + i * 8 + j);
    out[i] = byte;
  }
  return out;
}

export const STEGO_SIZE = SIZE;
export const STEGO_BLOCK = BLOCK;
