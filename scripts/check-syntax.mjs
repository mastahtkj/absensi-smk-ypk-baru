// =============================================================
//  Pemeriksa sintaks cepat untuk file .js (mendukung JSX).
//  Menghitung keseimbangan tanda { } ( ) [ ] dengan mengabaikan
//  string, template literal, komentar, dan regex literal.
// =============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const targets = [];

function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.jsx?$/.test(entry.name)) targets.push(full);
  }
}

collect(path.join(root, 'app'));
targets.push(path.join(root, 'next.config.js'));
targets.push(path.join(root, 'public', 'sw.js'));

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  const stack = [];
  const pairs = { '}': '{', ')': '(', ']': '[' };
  let i = 0;
  let line = 1;
  let lastChar = '';
  const n = src.length;

  const lastMeaningful = () => {
    for (let k = stack.length - 1; k >= 0; k -= 1) {
      if (stack[k].type !== 'template') return stack[k];
    }
    return null;
  };

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '\n') { line += 1; i += 1; continue; }

    // Komentar
    if (ch === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }

    // String
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '\n') line += 1;
        if (src[i] === quote) { i += 1; break; }
        i += 1;
      }
      continue;
    }

    // Template literal (bisa bersarang ${ })
    if (ch === '`') {
      stack.push({ type: 'template', line });
      i += 1;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '\n') line += 1;
        if (src[i] === '`') {
          stack.pop();
          i += 1;
          break;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          stack.push({ type: 'template', line });
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            const c2 = src[i];
            if (c2 === '\n') line += 1;
            if (c2 === '{') depth += 1;
            else if (c2 === '}') depth -= 1;
            else if (c2 === '"' || c2 === "'" || c2 === '`') {
              const q = c2;
              i += 1;
              while (i < n) {
                if (src[i] === '\\') { i += 2; continue; }
                if (src[i] === q) break;
                i += 1;
              }
            }
            i += 1;
          }
          stack.pop(); // template Expression
          continue;
        }
        i += 1;
      }
      continue;
    }

    // Regex literal - hanya boleh setelah operator/pungung kurung pembuka
    if (ch === '/') {
      const canBeRegex =
        lastChar === '' || '(,=:[!&|?{};+-*%~^<>'.includes(lastChar);
      if (canBeRegex) {
        i += 1;
        let inClass = false;
        while (i < n) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          else if (src[i] === '/' && !inClass) { i += 1; break; }
          else if (src[i] === '\n') { line += 1; break; }
          i += 1;
        }
        while (i < n && /[a-z]/.test(src[i])) i += 1;
        lastChar = '/';
        continue;
      }
    }

    if (ch === '{' || ch === '(' || ch === '[') {
      stack.push({ type: 'open', ch, line });
      lastChar = ch;
      i += 1;
      continue;
    }
    if (ch === '}' || ch === ')' || ch === ']') {
      const expected = pairs[ch];
      const top = stack.pop();
      if (!top || top.type !== 'open' || top.ch !== expected) {
        return {
          ok: false,
          line,
          msg: `Tanda '${ch}' tidak cocok (diharapkan '${expected}')`,
        };
      }
      lastChar = ch;
      i += 1;
      continue;
    }

    if (!/\s/.test(ch)) lastChar = ch;
    i += 1;
  }

  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    return { ok: false, line: top.line, msg: `Ada ${stack.length} tanda yang belum tertutup` };
  }
  return { ok: true };
}

let failed = 0;
targets.forEach((file) => {
  const res = check(file);
  if (!res.ok) {
    failed += 1;
    console.log(`X ${path.relative(root, file)} : baris ${res.line} -> ${res.msg}`);
  }
});

console.log(`\n${targets.length - failed}/${targets.length} file lolos pemeriksaan sintaks.`);
process.exit(failed > 0 ? 1 : 0);