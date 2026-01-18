export function shannonEntropy(value: string): number {
  if (!value) return 0;
  const counts = new Map<string, number>();
  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  const len = value.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function isHex(value: string): boolean {
  return /^[A-Fa-f0-9]+$/.test(value);
}

export function isNumeric(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

export function hexEntropy(value: string): number {
  const entropy = shannonEntropy(value);
  if (value.length <= 1) return entropy;
  if (!isNumeric(value)) return entropy;
  const adjustment = 1.2 / Math.log2(value.length);
  return entropy - adjustment;
}
