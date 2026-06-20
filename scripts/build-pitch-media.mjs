#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'output');
const partsDir = path.join(outputDir, 'pitch-audio-parts');
const voiceoverPath = path.join(outputDir, 'PolicyPay-Agent-Pitch-voiceover.txt');
const mp3Path = path.join(outputDir, 'PolicyPay-Agent-Pitch-voiceover.mp3');
const srtPath = path.join(outputDir, 'PolicyPay-Agent-Pitch.en.srt');
const assPath = path.join(partsDir, 'PolicyPay-Agent-Pitch.ass');
const renderSpecPath = path.join(partsDir, 'render-spec.json');
const renderScriptPath = path.join(partsDir, 'render-caption-frames.py');
const framesDir = path.join(partsDir, 'frames');
const slideDir = path.join(outputDir, 'pitch-slides');
const slidecutPath = path.join(outputDir, 'PolicyPay-Agent-Pitch-slidecut.mp4');
const fishRawPath = path.join(partsDir, 'fish-audio-stream.mp3');
const fishTimelinePath = path.join(partsDir, 'fish-alignment.json');

const fishReferenceId =
  process.env.FISH_AUDIO_REFERENCE_ID || '536d3a5e000945adb7038665781a4aca';
const requestedMode = process.env.PITCH_TTS || (process.argv.includes('--fish') ? 'fish' : '');
const ttsMode = requestedMode || (process.env.FISH_AUDIO_API_KEY ? 'fish' : 'say');

const slideParagraphRanges = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 8],
  [9, 10],
  [11, 12],
  [13, 14],
  [15, 15],
  [16, 16],
  [17, 17],
];

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

function canRunPythonWithPillow(command) {
  const result = spawnSync(command, ['-c', 'from PIL import Image, ImageDraw, ImageFont'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0;
}

function findPythonWithPillow() {
  const candidates = [
    process.env.PITCH_MEDIA_PYTHON,
    process.env.HOME
      ? path.join(
          process.env.HOME,
          '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
        )
      : '',
    'python3',
  ].filter(Boolean);
  const match = candidates.find(canRunPythonWithPillow);
  if (!match) {
    throw new Error('No Python runtime with Pillow found. Set PITCH_MEDIA_PYTHON to a Python with Pillow.');
  }
  return match;
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

function concatFileLine(filePath) {
  return `file '${filePath.replaceAll("'", "'\\''")}'`;
}

function getParagraphs(text) {
  return text
    .split(/\n\s*\n/g)
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeToken(token) {
  return token
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function tokenizeParagraphs(paragraphs) {
  return paragraphs.flatMap((paragraph, paragraphIndex) =>
    paragraph
      .split(/\s+/g)
      .map((text) => ({ text, norm: normalizeToken(text), paragraphIndex }))
      .filter((token) => token.norm.length > 0),
  );
}

function mergeOriginalTokensWithTiming(originalTokens, alignedSegments) {
  const aligned = alignedSegments
    .map((segment) => ({
      text: String(segment.text || '').trim(),
      norm: normalizeToken(String(segment.text || '')),
      start: Number(segment.start),
      end: Number(segment.end),
    }))
    .filter((segment) => segment.norm && Number.isFinite(segment.start) && Number.isFinite(segment.end));

  const timedWords = [];
  let alignedIndex = 0;

  for (const token of originalTokens) {
    let matchEnd = -1;
    let accumulated = '';
    for (let i = alignedIndex; i < Math.min(aligned.length, alignedIndex + 5); i += 1) {
      accumulated += aligned[i].norm;
      if (accumulated === token.norm) {
        matchEnd = i;
        break;
      }
    }

    if (matchEnd === -1) {
      for (let i = alignedIndex + 1; i < Math.min(aligned.length, alignedIndex + 6); i += 1) {
        if (aligned[i].norm === token.norm) {
          matchEnd = i;
          alignedIndex = i;
          break;
        }
      }
    }

    const startSegment = aligned[alignedIndex];
    const endSegment = matchEnd >= alignedIndex ? aligned[matchEnd] : aligned[alignedIndex];
    if (!startSegment || !endSegment) {
      break;
    }

    timedWords.push({
      text: token.text,
      paragraphIndex: token.paragraphIndex,
      start: startSegment.start,
      end: endSegment.end,
    });
    alignedIndex = Math.max(alignedIndex + 1, matchEnd + 1);
  }

  return timedWords;
}

function timedWordsFromFishAlignment(alignedSegments, paragraphs) {
  const paragraphWordCounts = paragraphs.map(
    (paragraph) => tokenizeParagraphs([paragraph]).filter((token) => token.norm).length,
  );
  const totalOriginalWords = paragraphWordCounts.reduce((sum, count) => sum + count, 0);
  const cumulativeCounts = [];
  paragraphWordCounts.reduce((sum, count) => {
    const next = sum + count;
    cumulativeCounts.push(next);
    return next;
  }, 0);

  return alignedSegments
    .map((segment, index) => {
      const originalOrdinal = Math.floor(((index + 0.5) * totalOriginalWords) / alignedSegments.length);
      const paragraphIndex = cumulativeCounts.findIndex((end) => originalOrdinal < end);
      return {
        text: String(segment.text || '').trim(),
        paragraphIndex: paragraphIndex === -1 ? paragraphs.length - 1 : paragraphIndex,
        start: Number(segment.start),
        end: Number(segment.end),
      };
    })
    .filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end));
}

function timedWordsFromScriptOnFishTimeline(originalTokens, alignedSegments) {
  return originalTokens
    .map((token, index) => {
      const startIndex = Math.min(
        alignedSegments.length - 1,
        Math.floor((index * alignedSegments.length) / originalTokens.length),
      );
      const endIndex = Math.min(
        alignedSegments.length - 1,
        Math.max(startIndex, Math.ceil(((index + 1) * alignedSegments.length) / originalTokens.length) - 1),
      );
      const startSegment = alignedSegments[startIndex];
      const endSegment = alignedSegments[endIndex];
      return {
        text: token.text,
        paragraphIndex: token.paragraphIndex,
        start: Number(startSegment.start),
        end: Number(endSegment.end),
      };
    })
    .filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end));
}

function wrapSubtitle(text, maxChars = 48) {
  const words = text.split(/\s+/g);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.join('\n');
}

function formatSrtTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatAssTime(seconds) {
  const totalCs = Math.max(0, Math.round(seconds * 100));
  const cs = totalCs % 100;
  const totalSeconds = Math.floor(totalCs / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildCaptions(timedWords, audioDuration) {
  const groups = [];
  let current = [];

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const text = current.map((word) => word.text).join(' ');
    groups.push({
      start: current[0].start,
      end: current.at(-1).end,
      text,
    });
    current = [];
  };

  for (const word of timedWords) {
    current.push(word);
    const text = current.map((item) => item.text).join(' ');
    const endsSentence = /[.!?]$/.test(word.text);
    const endsClause = /[,;:]$/.test(word.text);
    if (endsSentence || current.length >= 8 || (current.length >= 5 && (text.length > 50 || endsClause))) {
      flush();
    }
  }
  flush();

  return groups.map((group, index) => {
    const nextStart = groups[index + 1]?.start ?? audioDuration;
    const end = Math.min(group.end + 0.12, nextStart - 0.03, audioDuration);
    return {
      ...group,
      end: end > group.start ? end : Math.min(group.start + 0.5, audioDuration),
    };
  });
}

function writeSrt(captions) {
  const srt = captions
    .map((caption, index) =>
      [
        String(index + 1),
        `${formatSrtTime(caption.start)} --> ${formatSrtTime(caption.end)}`,
        wrapSubtitle(caption.text),
      ].join('\n'),
    )
    .join('\n\n');
  writeFileSync(srtPath, `${srt}\n`, 'utf8');
}

function escapeAssText(text) {
  return wrapSubtitle(text, 42)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\N');
}

function writeAss(captions) {
  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1920',
    'PlayResY: 1080',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default, Helvetica, 42, &H00FFFFFF, &H000000FF, &H99000000, &H66000000, 1, 0, 0, 0, 100, 100, 0, 0, 1, 2, 0, 2, 140, 140, 48, 1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...captions.map(
      (caption) =>
        `Dialogue: 0,${formatAssTime(caption.start)},${formatAssTime(caption.end)},Default,,0,0,0,,${escapeAssText(caption.text)}`,
    ),
    '',
  ];
  writeFileSync(assPath, lines.join('\n'), 'utf8');
}

function writeFrameRenderer() {
  writeFileSync(
    renderScriptPath,
    String.raw`import json
import math
import os
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

spec = json.loads(Path(sys.argv[1]).read_text())
width, height = 1920, 1080
frames_dir = Path(spec["frames_dir"])
if frames_dir.exists():
    shutil.rmtree(frames_dir)
frames_dir.mkdir(parents=True, exist_ok=True)

font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
font = ImageFont.truetype(font_path, 42)
small_font = ImageFont.truetype(font_path, 36)

def wrap_text(draw, text, max_width):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=font) > max_width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines[:3]

def render_slide(slide_path):
    slide = Image.open(slide_path).convert("RGBA")
    scale = min(width / slide.width, height / slide.height)
    size = (round(slide.width * scale), round(slide.height * scale))
    slide = slide.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (width, height), (8, 10, 18, 255))
    frame.alpha_composite(slide, ((width - size[0]) // 2, (height - size[1]) // 2))
    return frame

def draw_caption(frame, text):
    if not text:
        return frame
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    lines = wrap_text(draw, text, 1480)
    if not lines:
        return frame

    line_heights = []
    max_line_width = 0
    for line in lines:
        box = draw.textbbox((0, 0), line, font=font, stroke_width=2)
        line_heights.append(box[3] - box[1])
        max_line_width = max(max_line_width, box[2] - box[0])
    line_gap = 10
    text_height = sum(line_heights) + line_gap * (len(lines) - 1)
    pad_x, pad_y = 34, 24
    box_w = max_line_width + pad_x * 2
    box_h = text_height + pad_y * 2
    box_x = (width - box_w) // 2
    box_y = height - box_h - 58
    draw.rounded_rectangle(
        (box_x, box_y, box_x + box_w, box_y + box_h),
        radius=18,
        fill=(4, 10, 24, 208),
        outline=(95, 132, 220, 135),
        width=2,
    )

    y = box_y + pad_y
    for index, line in enumerate(lines):
        line_w = draw.textlength(line, font=font)
        x = (width - line_w) / 2
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 180))
        y += line_heights[index] + line_gap
    return Image.alpha_composite(frame, overlay)

slides = spec["slides"]
captions = spec["captions"]
slide_ends = []
total = 0.0
for duration in spec["slide_durations"]:
    total += float(duration)
    slide_ends.append(total)

def slide_at(t):
    for index, end in enumerate(slide_ends):
        if t < end:
            return slides[index]
    return slides[-1]

def caption_at(t):
    for caption in captions:
        if caption["start"] <= t < caption["end"]:
            return caption["text"]
    return ""

breaks = {0.0, float(spec["audio_duration"])}
for end in slide_ends:
    breaks.add(min(end, float(spec["audio_duration"])))
for caption in captions:
    breaks.add(max(0.0, min(float(caption["start"]), float(spec["audio_duration"]))))
    breaks.add(max(0.0, min(float(caption["end"]), float(spec["audio_duration"]))))
breaks = sorted(breaks)
intervals = []
for start, end in zip(breaks, breaks[1:]):
    if end - start >= 0.04:
        intervals.append((start, end))

for index, (start, end) in enumerate(intervals, start=1):
    t = (start + end) / 2
    frame = draw_caption(render_slide(slide_at(t)), caption_at(t))
    frame.convert("RGB").save(frames_dir / f"frame-{index:04d}.png", optimize=True)

Path(spec["frame_concat"]).write_text(
    "".join(
        f"file '{(frames_dir / f'frame-{index:04d}.png').as_posix()}'\n"
        f"duration {end - start:.3f}\n"
        for index, (start, end) in enumerate(intervals, start=1)
    )
    + f"file '{(frames_dir / f'frame-{len(intervals):04d}.png').as_posix()}'\n"
)
`,
    'utf8',
  );
}

function buildFishTimedMedia(paragraphs, alignedSegments, audioDuration) {
  const originalTokens = tokenizeParagraphs(paragraphs);
  const timedWords = mergeOriginalTokensWithTiming(originalTokens, alignedSegments);
  const matchRatio = timedWords.length / originalTokens.length;
  if (matchRatio < 0.75) {
    throw new Error(
      `Fish Audio alignment matched ${timedWords.length}/${originalTokens.length} script tokens.`,
    );
  }

  const fishTimedWords = timedWordsFromFishAlignment(alignedSegments, paragraphs);
  const scriptTimedWords = timedWordsFromScriptOnFishTimeline(originalTokens, alignedSegments);
  const wordsForCaptions = matchRatio >= 0.95 ? timedWords : scriptTimedWords;
  const wordsForSlides = matchRatio >= 0.95 ? timedWords : scriptTimedWords;
  const captions = buildCaptions(wordsForCaptions, audioDuration);
  writeSrt(captions);
  writeAss(captions);
  writeFileSync(
    fishTimelinePath,
    JSON.stringify(
      {
        audioDuration,
        matchRatio,
        alignedSegments,
        words: timedWords,
        fishWords: fishTimedWords,
        scriptWords: scriptTimedWords,
        captions,
      },
      null,
      2,
    ),
    'utf8',
  );

  return { captions, timedWords: wordsForSlides };
}

function paragraphTimes(timedWords, paragraphCount, audioDuration) {
  return Array.from({ length: paragraphCount }, (_, paragraphIndex) => {
    const words = timedWords.filter((word) => word.paragraphIndex === paragraphIndex);
    if (words.length === 0) {
      return null;
    }
    return {
      start: words[0].start,
      end: Math.min(words.at(-1).end + 0.12, audioDuration),
    };
  });
}

function slideDurationsFromParagraphs(timedWords, paragraphCount, slideCount, audioDuration) {
  const times = paragraphTimes(timedWords, paragraphCount, audioDuration);
  if (slideCount !== slideParagraphRanges.length || times.some((time) => !time)) {
    return Array.from({ length: slideCount }, () => audioDuration / slideCount);
  }

  let previousEnd = 0;
  return slideParagraphRanges.map(([startParagraph, endParagraph], index) => {
    const targetEnd = times[endParagraph]?.end ?? ((index + 1) * audioDuration) / slideCount;
    const duration = Math.max(0.5, targetEnd - previousEnd);
    previousEnd = targetEnd;
    return duration;
  });
}

async function synthesizeWithFish(voiceover, paragraphs) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('FISH_AUDIO_API_KEY is required when PITCH_TTS=fish or --fish is used.');
  }

  const response = await fetch('https://api.fish.audio/v1/tts/stream/with-timestamp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      model: 's2-pro',
    },
    body: JSON.stringify({
      text: voiceover.replace(/\s+/g, ' ').trim(),
      reference_id: fishReferenceId,
      temperature: 0.7,
      top_p: 0.7,
      prosody: {
        speed: 1,
        volume: 0,
        normalize_loudness: true,
      },
      chunk_length: 200,
      normalize: true,
      format: 'mp3',
      sample_rate: 44100,
      mp3_bitrate: 192,
      latency: 'balanced',
      max_new_tokens: 2048,
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new Error(`Fish Audio TTS failed with HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  const decoder = new TextDecoder();
  const audioChunks = [];
  const alignmentByChunk = new Map();
  let buffer = '';

  const handleEvent = (rawEvent) => {
    const trimmed = rawEvent.trim();
    if (!trimmed) {
      return;
    }
    const dataLines = trimmed
      .split(/\r?\n/g)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());
    const data = dataLines.length > 0 ? dataLines.join('\n') : trimmed;
    if (!data || data === '[DONE]') {
      return;
    }
    const payload = JSON.parse(data);
    if (payload.audio_base64) {
      audioChunks.push(Buffer.from(payload.audio_base64, 'base64'));
    }
    if (payload.alignment && Array.isArray(payload.alignment.segments)) {
      alignmentByChunk.set(String(payload.chunk_seq ?? 0), {
        offset: Number(payload.chunk_audio_offset_sec ?? 0),
        alignment: payload.alignment,
      });
    }
  };

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let separator = buffer.match(/\r?\n\r?\n/);
    while (separator) {
      const eventEnd = separator.index ?? -1;
      handleEvent(buffer.slice(0, eventEnd));
      buffer = buffer.slice(eventEnd + separator[0].length);
      separator = buffer.match(/\r?\n\r?\n/);
    }
  }
  buffer += decoder.decode();
  handleEvent(buffer);

  if (audioChunks.length === 0) {
    throw new Error('Fish Audio TTS returned no audio chunks.');
  }

  const alignedSegments = Array.from(alignmentByChunk.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([, snapshot]) =>
      snapshot.alignment.segments.map((segment) => ({
        text: segment.text,
        start: snapshot.offset + Number(segment.start),
        end: snapshot.offset + Number(segment.end),
      })),
    )
    .sort((a, b) => a.start - b.start);

  if (alignedSegments.length === 0) {
    throw new Error('Fish Audio TTS returned audio but no alignment segments.');
  }

  writeFileSync(fishRawPath, Buffer.concat(audioChunks));
  run('ffmpeg', ['-y', '-i', fishRawPath, '-codec:a', 'libmp3lame', '-b:a', '192k', mp3Path]);

  const audioDuration = ffprobeDuration(mp3Path);
  const media = buildFishTimedMedia(paragraphs, alignedSegments, audioDuration);

  return { audioDuration, timedWords: media.timedWords, captions: media.captions };
}

function reuseFishArtifacts(paragraphs) {
  const timeline = JSON.parse(readFileSync(fishTimelinePath, 'utf8'));
  if (!Array.isArray(timeline.alignedSegments)) {
    throw new Error('No Fish alignment artifacts found for PITCH_TTS=reuse.');
  }
  const audioDuration = ffprobeDuration(mp3Path);
  const media = buildFishTimedMedia(paragraphs, timeline.alignedSegments, audioDuration);
  return { audioDuration, timedWords: media.timedWords, captions: media.captions };
}

function synthesizeWithMacSay(paragraphs) {
  const concatList = [];
  paragraphs.forEach((segment, index) => {
    const partPath = path.join(partsDir, `part-${String(index + 1).padStart(2, '0')}.aiff`);
    run('say', ['-r', '178', '-o', partPath, segment]);
    concatList.push(concatFileLine(partPath));
  });

  const aiffPath = path.join(outputDir, 'PolicyPay-Agent-Pitch-voiceover.aiff');
  const audioConcatPath = path.join(partsDir, 'concat.txt');
  writeFileSync(audioConcatPath, `${concatList.join('\n')}\n`);
  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', audioConcatPath, '-c:a', 'pcm_s16be', aiffPath]);
  run('ffmpeg', ['-y', '-i', aiffPath, '-codec:a', 'libmp3lame', '-b:a', '192k', mp3Path]);

  const audioDuration = ffprobeDuration(mp3Path);
  const captions = paragraphs.map((paragraph, index) => ({
    start: (index * audioDuration) / paragraphs.length,
    end: ((index + 1) * audioDuration) / paragraphs.length,
    text: paragraph,
  }));
  writeSrt(captions);
  writeAss(captions);
  return { audioDuration, timedWords: [], captions };
}

function renderSlideVideo(audioDuration, timedWords, paragraphCount, captions) {
  if (!readdirSync(outputDir).includes('pitch-slides')) {
    return;
  }

  const slides = readdirSync(slideDir)
    .filter((name) => /^slide-\d+\.png$/.test(name))
    .sort()
    .map((name) => path.join(slideDir, name));

  if (slides.length === 0) {
    return;
  }

  const durations =
    timedWords.length > 0
      ? slideDurationsFromParagraphs(timedWords, paragraphCount, slides.length, audioDuration)
      : Array.from({ length: slides.length }, () => audioDuration / slides.length);
  const frameConcatPath = path.join(partsDir, 'frames.txt');
  writeFrameRenderer();
  writeFileSync(
    renderSpecPath,
    JSON.stringify(
      {
        slides,
        slide_durations: durations,
        audio_duration: audioDuration,
        captions,
        frames_dir: framesDir,
        frame_concat: frameConcatPath,
      },
      null,
      2,
    ),
    'utf8',
  );
  run(findPythonWithPillow(), [renderScriptPath, renderSpecPath]);

  run('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    frameConcatPath,
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
    '-b:a',
    '192k',
    '-shortest',
    '-movflags',
    '+faststart',
    slidecutPath,
  ]);

  console.log(`Slide-cut video: ${path.relative(root, slidecutPath)} (${slides.length} slides)`);
}

mkdirSync(outputDir, { recursive: true });
if (ttsMode !== 'reuse') {
  rmSync(partsDir, { recursive: true, force: true });
}
mkdirSync(partsDir, { recursive: true });

const voiceover = readFileSync(voiceoverPath, 'utf8');
const paragraphs = getParagraphs(voiceover);
if (paragraphs.length === 0) {
  throw new Error('No voiceover segments found.');
}

const synthesis =
  ttsMode === 'fish'
    ? await synthesizeWithFish(voiceover, paragraphs)
    : ttsMode === 'reuse'
      ? reuseFishArtifacts(paragraphs)
      : synthesizeWithMacSay(paragraphs);

console.log(`TTS mode: ${ttsMode}`);
console.log(`Voiceover MP3: ${path.relative(root, mp3Path)} (${synthesis.audioDuration.toFixed(1)}s)`);
console.log(`Subtitle file: ${path.relative(root, srtPath)}`);

renderSlideVideo(synthesis.audioDuration, synthesis.timedWords, paragraphs.length, synthesis.captions);
