export function isDocumentationPath(path: string): boolean {
  return /(^|\/)(?:readme|install|setup|documentation)(?:\.|$)/i.test(path) || /(^|\/)docs?(\/|$)/i.test(path) || /\.(?:md|txt)$/i.test(path);
}
