#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const targets = [
  'README.md',
  'README.zh-CN.md',
  'docs',
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib',
  'apps/web/README.md',
  'apps/agent/README.md',
  'packages/sdk/README.md',
  'move/agent_treasury/README.md',
  'output/PolicyPay-Agent-Pitch.pptx.inspect.ndjson',
  'output/PolicyPay-Agent-Pitch-voiceover.txt',
  'output/PolicyPay-Agent-Pitch.en.srt',
  'submission',
];

const textExtensions = new Set([
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mdx',
  '.mjs',
  '.ndjson',
  '.srt',
  '.ts',
  '.tsx',
  '.txt',
]);

const ignoredDirs = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

const ignoredFiles = new Set(['docs/errorThing.md']);

const banned = [
  {
    label: 'public test-console surface',
    pattern: /Test Console|test-runs|\/tests\b|测试页面|测试控制台|测试输出|测试命令|测试报告/i,
  },
  {
    label: 'unsubmitted-product wording',
    pattern: /\bdemo\b|\bmock\b|\bfallback\b/i,
  },
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(relativePath, files) {
  const absolutePath = path.join(root, relativePath);
  if (!(await exists(absolutePath))) return;

  const info = await stat(absolutePath);
  if (info.isDirectory()) {
    const base = path.basename(relativePath);
    if (ignoredDirs.has(base)) return;
    const entries = await readdir(absolutePath);
    await Promise.all(entries.map((entry) => walk(path.join(relativePath, entry), files)));
    return;
  }

  const normalized = relativePath.split(path.sep).join('/');
  if (ignoredFiles.has(normalized)) return;
  if (normalized.includes('/node_modules/') || normalized.includes('/build/')) return;
  if (normalized.endsWith('.tsbuildinfo')) return;
  if (!textExtensions.has(path.extname(normalized))) return;
  files.push(normalized);
}

const files = [];
for (const target of targets) {
  await walk(target, files);
}

const findings = [];
for (const file of [...new Set(files)].sort()) {
  const text = await readFile(path.join(root, file), 'utf8');
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const rule of banned) {
      if (rule.pattern.test(line)) {
        findings.push({
          file,
          line: index + 1,
          rule: rule.label,
          text: line.trim().slice(0, 180),
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Product copy gate failed:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Product copy gate passed (${files.length} files scanned).`);
}
