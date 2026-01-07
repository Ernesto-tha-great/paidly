export function encodeDescription(description: string): string {
  if (!description) return "";
  const base64 = btoa(description);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDescription(encoded: string): string {
  if (!encoded) return "";
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return atob(base64);
  } catch {
    return "";
  }
}

export function buildClaimUrl(
  origin: string,
  intentId: string,
  description?: string
): string {
  const base = `${origin}/claim/${intentId}`;
  if (description) {
    return `${base}?m=${encodeDescription(description)}`;
  }
  return base;
}
