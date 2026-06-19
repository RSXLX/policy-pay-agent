#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'output', 'submission-readiness-latest.json');
const checks = [];

function addCheck(name, status, detail, extra = {}) {
  checks.push({ name, status, detail, ...extra });
}

function rel(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function fileExists(relativePath) {
  return existsSync(path.join(root, relativePath));
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const copyGate = run(process.execPath, ['scripts/product-copy-gate.mjs']);
addCheck(
  'productCopy',
  copyGate.status === 0 ? 'pass' : 'fail',
  copyGate.status === 0 ? copyGate.stdout.trim() : copyGate.stderr.trim(),
);

const envPath = path.join(root, 'apps/web/.env.local');
if (existsSync(envPath)) {
  const envText = readFileSync(envPath, 'utf8');
  const match = envText.match(/^NEXT_PUBLIC_PACKAGE_ID=(0x[0-9a-fA-F]+)$/m);
  const packageId = match?.[1] ?? '';
  addCheck(
    'packageId',
    /^0x[0-9a-fA-F]{64}$/.test(packageId) ? 'pass' : 'fail',
    packageId ? `Configured package id ${packageId}` : 'NEXT_PUBLIC_PACKAGE_ID is missing',
    packageId ? { packageId } : {},
  );
} else {
  addCheck('packageId', 'fail', 'apps/web/.env.local is missing');
}

const publishedText = fileExists('move/agent_treasury/Published.toml')
  ? readFileSync(path.join(root, 'move/agent_treasury/Published.toml'), 'utf8')
  : '';
addCheck(
  'publishedMetadata',
  publishedText.includes('published.testnet') && publishedText.includes('published-at') ? 'pass' : 'fail',
  fileExists('move/agent_treasury/Published.toml')
    ? 'Move Published.toml includes testnet package metadata'
    : 'move/agent_treasury/Published.toml is missing',
);

const requiredFiles = [
  'docs/pitch-video-script.md',
  'output/PolicyPay-Agent-Pitch.pptx',
  'output/PolicyPay-Agent-Pitch.pptx.inspect.ndjson',
  'output/PolicyPay-Agent-Pitch-voiceover.txt',
  'output/PolicyPay-Agent-Pitch-voiceover.mp3',
  'output/PolicyPay-Agent-Pitch.en.srt',
  'output/PolicyPay-Agent-Pitch-recording-shotlist.csv',
  'output/PolicyPay-Agent-Pitch-slidecut.mp4',
  'submission/sui-overflow-submission.md',
];

for (const required of requiredFiles) {
  addCheck(
    `artifact:${required}`,
    fileExists(required) ? 'pass' : 'fail',
    fileExists(required) ? 'Required submission artifact exists' : 'Required submission artifact is missing',
    { file: required },
  );
}

const removedSurfaces = [
  'apps/web/app/tests/page.tsx',
  'apps/web/app/api/test-runs/route.ts',
  'apps/web/components/TestConsole.tsx',
];

for (const removed of removedSurfaces) {
  addCheck(
    `removed:${removed}`,
    fileExists(removed) ? 'fail' : 'pass',
    fileExists(removed) ? 'Public test surface still exists' : 'Public test surface is absent',
    { file: removed },
  );
}

if (fileExists('.git')) {
  addCheck('gitRepository', 'pass', 'Local git repository exists');
  const remote = run('git', ['remote', 'get-url', 'origin']);
  addCheck(
    'gitRemote',
    remote.status === 0 ? 'pass' : 'fail',
    remote.status === 0 ? remote.stdout.trim() : 'Git remote origin is not configured',
  );
  const status = run('git', ['status', '--porcelain']);
  const dirtyEntries = status.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.endsWith('output/submission-readiness-latest.json'));
  addCheck(
    'gitClean',
    status.status === 0 && dirtyEntries.length === 0 ? 'pass' : 'warn',
    dirtyEntries.length === 0 ? 'Working tree is clean' : 'Working tree has uncommitted changes',
  );
} else {
  addCheck('gitRepository', 'fail', 'Local git repository is not initialized');
  addCheck('gitRemote', 'fail', 'Git remote origin is not configured');
}

const summary = {
  generatedAt: new Date().toISOString(),
  ready: checks.every((check) => check.status === 'pass'),
  counts: {
    pass: checks.filter((check) => check.status === 'pass').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
  },
  checks,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Submission readiness written to ${rel(outputPath)}`);
console.log(`ready=${summary.ready} pass=${summary.counts.pass} warn=${summary.counts.warn} fail=${summary.counts.fail}`);

if (!summary.ready) {
  process.exitCode = 1;
}
