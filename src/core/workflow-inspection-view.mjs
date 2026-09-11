// Inspection only: keep the original workflow for Git, artifact and signature
// identities. This recognizes the repository's block mappings/sequence mappings,
// single-line scalar values and empty {} permissions, not general YAML.
// Any unsupported boundary returns the WHOLE input, never a partly stripped view.
export function workflowInspectionView(source) {
  // Standalone CR is a YAML line break outside this LF/CRLF inspection subset.
  if (/\r(?!\n)/u.test(source)) return source;
  const output = [];
  let block = null;
  let scalarIndent = null;
  for (const physicalLine of source.match(/[^\n]*\n|[^\n]+$/gu) ?? []) {
    const ending = physicalLine.endsWith("\r\n") ? "\r\n" :
      physicalLine.endsWith("\n") ? "\n" : "";
    const line = physicalLine.slice(0, physicalLine.length - ending.length);
    const indent = /^ */u.exec(line)[0].length;
    if (block) {
      if (/^[ \t]*$/u.test(line)) {
        output.push(physicalLine);
        continue;
      }
      if (indent > block.parentIndent) {
        block.bodyIndent ??= indent;
        if (indent < block.bodyIndent) return source;
        output.push(physicalLine);
        continue;
      }
      scalarIndent = block.parentIndent;
      block = null;
    }
    if (/^[ \t]*$/u.test(line)) {
      output.push(physicalLine);
      continue;
    }
    if (/^ *#/u.test(line)) continue;
    const property = /^( *)(- )?([A-Za-z_][A-Za-z0-9_-]*):(?:([ \t]+)(.*))?$/u.exec(line);
    if (!property || (scalarIndent !== null && indent > scalarIndent)) return source;
    const keyIndent = indent + (property[2] ? 2 : 0);
    const value = property[5] ?? "";
    const prefix = line.slice(0, line.length - value.length);
    let inspectedValue = value;
    if (value.startsWith("'") || value.startsWith('"')) {
      const quote = value[0];
      let close = -1;
      for (let index = 1; index < value.length; index += 1) {
        if (quote === '"' && value[index] === "\\") {
          index += 1;
          if (index >= value.length) return source;
        } else if (value[index] === quote) {
          if (quote === "'" && value[index + 1] === "'") index += 1;
          else {
            close = index;
            break;
          }
        }
      }
      if (close < 0 || !/^[ \t]*(?:#.*)?$/u.test(value.slice(close + 1))) return source;
      // A YAML comment needs separation after the closing quote.
      if (value[close + 1] === "#") return source;
      if (value.slice(close + 1).includes("#")) inspectedValue = value.slice(0, close + 1);
    } else {
      const comment = /(?:^|[ \t]+)#/u.exec(value);
      if (comment) {
        // Quotes inside a plain scalar are not YAML quote delimiters. Avoid
        // guessing at shell-like text such as run: echo "a # b".
        if (/["'\\]/u.test(value.slice(0, comment.index))) return source;
        inspectedValue = value.slice(0, comment.index);
      }
      const content = inspectedValue.trimEnd();
      if (/^[|>]/u.test(content)) {
        const header = /^[|>](?:([1-9])[+-]?|[+-]([1-9])?)?$/u.exec(content);
        if (!header) return source;
        const explicitIndent = header[1] ?? header[2];
        block = { parentIndent: keyIndent,
          bodyIndent: explicitIndent ? keyIndent + Number(explicitIndent) : null };
      } else if (
        (content !== "{}" && /^[\[\]{},&*!%?`@]/u.test(content)) ||
        /^[-:](?:[ \t]|$)/u.test(content) || /:[ \t]/u.test(content)
      ) return source;
    }
    scalarIndent = inspectedValue.trim() && !block ? keyIndent : null;
    output.push(inspectedValue === value ? physicalLine : `${(prefix + inspectedValue).trimEnd()}${ending}`);
  }
  return output.join("");
}
