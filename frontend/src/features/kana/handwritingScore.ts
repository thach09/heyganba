export type CanvasPoint = { x: number; y: number };
export interface HandwritingScore { accuracy: number; coverage: number; precision: number; accepted: boolean }
export const HANDWRITING_THRESHOLD = 0.8;
export const SCORE_SIZE = 256;

/** Zhang-Suen thinning makes coverage measure the path rather than the font's varying stroke thickness. */
export function skeletonize(mask: Uint8Array, size: number): Uint8Array {
  const result = mask.slice();
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const remove: number[] = [];
      for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
        const i = y * size + x;
        if (!result[i]) continue;
        const p = [result[i-size], result[i-size+1], result[i+1], result[i+size+1], result[i+size], result[i+size-1], result[i-1], result[i-size-1]];
        const n = p.reduce((a,b) => a+b, 0);
        const transitions = p.reduce((a,b,j) => a + (!b && p[(j+1)%8] ? 1 : 0), 0);
        if (n < 2 || n > 6 || transitions !== 1) continue;
        if (pass === 0 ? (p[0]*p[2]*p[4] || p[2]*p[4]*p[6]) : (p[0]*p[2]*p[6] || p[0]*p[4]*p[6])) continue;
        remove.push(i);
      }
      if (remove.length) changed = true;
      remove.forEach(i => { result[i] = 0; });
    }
  }
  return result;
}

/** Compare only ink masks. Guides, hint visibility, pen width and screen DPI never affect grading. */
export function compareInk(reference: Uint8Array, written: Uint8Array, size: number, tolerance = 6): HandwritingScore {
  if (reference.length !== size * size || written.length !== reference.length) throw new Error('Invalid ink mask');
  const expand = (mask: Uint8Array) => {
    const expanded = new Uint8Array(mask.length);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!mask[y * size + x]) continue;
      for (let dy = -tolerance; dy <= tolerance; dy++) for (let dx = -tolerance; dx <= tolerance; dx++) {
        if (dx * dx + dy * dy > tolerance * tolerance) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) expanded[yy * size + xx] = 1;
      }
    }
    return expanded;
  };
  const referenceArea = expand(reference), writtenArea = expand(written);
  let expected = 0, covered = 0, ink = 0, matched = 0;
  for (let i = 0; i < reference.length; i++) {
    if (reference[i]) { expected++; if (writtenArea[i]) covered++; }
    if (written[i]) { ink++; if (referenceArea[i]) matched++; }
  }
  const coverage = expected ? covered / expected : 0;
  const precision = ink ? matched / ink : 0;
  // Both conditions must pass: tracing one piece or scribbling over everything cannot pass.
  const accuracy = Math.min(coverage, precision);
  return { coverage, precision, accuracy, accepted: expected > 0 && ink > 0 && accuracy >= HANDWRITING_THRESHOLD };
}

export function gradeHandwriting(referenceChar: string, strokes: CanvasPoint[][]): HandwritingScore {
  const mask = (paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SCORE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Không thể kiểm tra nét viết trên trình duyệt này.');
    paint(ctx);
    const pixels = ctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
    return Uint8Array.from({ length: SCORE_SIZE * SCORE_SIZE }, (_, i) => pixels[i * 4 + 3] >= 100 ? 1 : 0);
  };
  const reference = mask(ctx => {
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const scale = referenceChar.length === 1 ? 0.74 : referenceChar.length === 2 ? 0.52 : 0.36;
    ctx.font = `400 ${Math.round(SCORE_SIZE * scale)}px 'Noto Serif JP', serif`;
    ctx.fillText(referenceChar, SCORE_SIZE / 2, SCORE_SIZE * 0.52);
  });
  const written = mask(ctx => {
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000';
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(stroke => {
      if (stroke.length === 1) {
        ctx.beginPath(); ctx.arc(stroke[0].x * SCORE_SIZE, stroke[0].y * SCORE_SIZE, 1.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath();
        stroke.forEach((p, i) => i ? ctx.lineTo(p.x * SCORE_SIZE, p.y * SCORE_SIZE) : ctx.moveTo(p.x * SCORE_SIZE, p.y * SCORE_SIZE));
        ctx.stroke();
      }
    });
  });
  return compareInk(skeletonize(reference, SCORE_SIZE), written, SCORE_SIZE);
}
