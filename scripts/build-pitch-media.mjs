#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'output');
const partsDir = path.join(outputDir, 'pitch-audio-parts');
const voiceoverPath = path.join(outputDir, 'PolicyPay-Agent-Pitch-voiceover.txt');
const aiffPath = path.join(outputDir, 'PolicyPay-Agent-Pitch-voiceover.aiff');
const mp3Path = path.join(outputDir, 'PolicyPay-Agent-Pitch-voiceover.mp3');
const slideDir = path.join(outputDir, 'pitch-slides');
const slidecutPath = path.join(outputDir, 'PolicyPay-Agent-Pitch-slidecut.mp4');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function ffprobeDuration(filePath) {
  const out = run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return Number(out);
}

mkdirSync(outputDir, { recursive: true });
rmSync(partsDir, { recursive: true, force: true });
mkdirSync(partsDir, { recursive: true });

const voiceover = readFileSync(voiceoverPath, 'utf8');
const segments = voiceover
  .split(/\n\s*\n/g)
  .map((segment) => segment.replace(/\s+/g, ' ').trim())
  .filter(Boolean);

if (segments.length === 0) {
  throw new Error('No voiceover segments found.');
}

const concatList = [];
segments.forEach((segment, index) => {
  const partPath = path.join(partsDir, `part-${String(index + 1).padStart(2, '0')}.aiff`);
  run('say', ['-r', '178', '-o', partPath, segment]);
  concatList.push(`file '${partPath.replaceAll("'", "'\\''")}'`);
});

const audioConcatPath = path.join(partsDir, 'concat.txt');
writeFileSync(audioConcatPath, `${concatList.join('\n')}\n`);
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', audioConcatPath, '-c:a', 'pcm_s16be', aiffPath]);
run('ffmpeg', ['-y', '-i', aiffPath, '-codec:a', 'libmp3lame', '-b:a', '192k', mp3Path]);

const audioDuration = ffprobeDuration(mp3Path);
console.log(`Voiceover MP3: ${path.relative(root, mp3Path)} (${audioDuration.toFixed(1)}s)`);

if (readdirSync(outputDir).includes('pitch-slides')) {
  const slides = readdirSync(slideDir)
    .filter((name) => /^slide-\d+\.png$/.test(name))
    .sort()
    .map((name) => path.join(slideDir, name));

  if (slides.length > 0) {
    const durationPerSlide = audioDuration / slides.length;
    const slideConcatPath = path.join(partsDir, 'slides.txt');
    const lines = [];
    for (const slide of slides) {
      lines.push(`file '${slide.replaceAll("'", "'\\''")}'`);
      lines.push(`duration ${durationPerSlide.toFixed(3)}`);
    }
    lines.push(`file '${slides.at(-1).replaceAll("'", "'\\''")}'`);
    writeFileSync(slideConcatPath, `${lines.join('\n')}\n`);
    run('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      slideConcatPath,
      '-i',
      mp3Path,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-c:a',
      'aac',
      '-shortest',
      slidecutPath,
    ]);
    console.log(`Slide-cut video: ${path.relative(root, slidecutPath)} (${slides.length} slides)`);
  }
}
