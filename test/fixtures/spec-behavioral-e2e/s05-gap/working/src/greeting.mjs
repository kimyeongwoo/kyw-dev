export function greeting(name, style) {
  if (style === "formal") {
    // acceptance-branch: formal
    return `Good day, ${name}.`;
  }
  // acceptance-branch: casual
  return `Hi, ${name}!`;
}
