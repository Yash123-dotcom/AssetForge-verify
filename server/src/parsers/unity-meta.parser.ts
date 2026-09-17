export function inspectUnityMetadata(text: string): string[] {
  return Array.from(new Set(text.match(/\b(?:20(?:2[1-9]|3\d)|6000)\.\d+(?:\.\d+)?[a-z]?\d*\b/g) ?? []));
}
