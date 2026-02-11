import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repo = process.cwd();
const srcRoot = path.join(repo, 'src');
const CHANNEL_SEGMENTS = ['/discord/', '/telegram/', '/whatsapp/', '/imessage/', '/signal/', '/line/'];
const KEEP_SEGMENTS = ['/slack/'];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
      walk(full, out);
      continue;
    }
    if (ent.isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

function shouldStubResolved(absPath) {
  const normalized = absPath.replace(/\\/g, '/');
  if (!normalized.includes('/src/')) return false;
  if (KEEP_SEGMENTS.some((seg) => normalized.includes(seg))) return false;
  return CHANNEL_SEGMENTS.some((seg) => normalized.includes(seg));
}

function resolveTarget(importerAbs, spec) {
  const resolvedJs = path.resolve(path.dirname(importerAbs), spec);
  return resolvedJs.replace(/\.js$/, '.ts');
}

const byTarget = new Map();
const files = walk(srcRoot);
for (const abs of files) {
  const sourceText = fs.readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(abs, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const addRec = (targetAbs) => {
    const rel = path.relative(repo, targetAbs);
    if (!byTarget.has(rel)) {
      byTarget.set(rel, {
        rel,
        constNames: new Set(),
        typeNames: new Set(),
        needsDefault: false,
      });
    }
    return byTarget.get(rel);
  };

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith('.')) continue;
      const targetAbs = resolveTarget(abs, spec);
      if (!shouldStubResolved(targetAbs)) continue;
      const rec = addRec(targetAbs);
      const clause = st.importClause;
      if (!clause) continue;
      if (clause.name) rec.needsDefault = true;
      const nb = clause.namedBindings;
      if (!nb) continue;
      if (ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          const importedName = (el.propertyName ?? el.name).text;
          const isTypeOnly = el.isTypeOnly || clause.isTypeOnly;
          if (isTypeOnly) rec.typeNames.add(importedName);
          else rec.constNames.add(importedName);
        }
      }
    }

    if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith('.')) continue;
      const targetAbs = resolveTarget(abs, spec);
      if (!shouldStubResolved(targetAbs)) continue;
      const rec = addRec(targetAbs);
      if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) {
          const importedName = (el.propertyName ?? el.name).text;
          const isTypeOnly = el.isTypeOnly;
          if (isTypeOnly) rec.typeNames.add(importedName);
          else rec.constNames.add(importedName);
        }
      }
    }
  }
}

let written = 0;
for (const rec of byTarget.values()) {
  const abs = path.join(repo, rec.rel);
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  const isAuto = existing.includes('Auto-generated shim for pruned channel modules.');
  if (fs.existsSync(abs) && !isAuto) {
    continue;
  }

  const lines = [];
  lines.push('// Auto-generated shim for pruned channel modules.');
  lines.push('// This keeps Slack-only builds type-checking after channel pruning.');
  if (rec.needsDefault) {
    lines.push('const __defaultExport: any = {};');
    lines.push('export default __defaultExport;');
  }
  for (const name of [...rec.typeNames].sort()) {
    lines.push(`export type ${name} = any;`);
  }
  for (const name of [...rec.constNames].sort()) {
    lines.push(`export const ${name}: any = undefined as any;`);
  }
  if (!rec.needsDefault && rec.typeNames.size === 0 && rec.constNames.size === 0) {
    lines.push('export {};');
  }
  lines.push('');

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, lines.join('\n'));
  written += 1;
}

console.log(`Wrote ${written} shim files.`);
