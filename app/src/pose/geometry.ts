interface Point {
  x: number;
  y: number;
}

/** Угол в точке b между лучами b→a и b→c, в градусах (0–180). */
export function angleDeg(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const norm = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (norm === 0) {
    return 180;
  }
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / norm));
  return (Math.acos(cos) * 180) / Math.PI;
}
