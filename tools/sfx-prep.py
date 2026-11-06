#!/usr/bin/env python3
"""Trim generated sound effects to the sound itself and print the cue numbers for src/kit/sfx.tsx.

Generators (e.g. Adobe Firefly's sound effects) return at least ~1 s, usually with silence before and after the
sound. A cue needs the file to start just before the sound and end when it dies, plus two numbers:
  len   frames the file lasts
  lead  frames from the file's start to its audible hit, so the cue starts `lead` frames early and the hit lands
        on the visual. For a click or pop use the onset; for a swell (whoosh) the peak.

  .venv/bin/python tools/sfx-prep.py <in.wav | folder> <out-folder> [--fps 30] [--pre 0.01] [--peak -3]

Per file it measures the envelope (10 ms RMS), finds onset (first window above -30 dB of the peak), peak, and end
(last window above -45 dB), trims [onset - pre, end + 0.03 s], adds a 3 ms fade-in and an eased fade over the last
25%, peak-normalises to --peak dBFS (short sounds are too short for LUFS meters; set the final balance with each
cue's volume) and writes 48 kHz 16-bit mono WAV. Then run `node tools/sfx-have.ts <out-folder>`.
Needs ffmpeg on PATH and the venv's numpy.
"""
import argparse, os, subprocess, sys, wave
import numpy as np

SR = 48000


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def env_db(x, win):
    n = len(x) // win
    if n == 0: return np.array([-120.0])
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms)


def prep(path, out_dir, fps, pre, peak_db):
    x = decode(path)
    if not len(x): print(f"{path}: empty"); return
    win = SR // 100  # 10 ms
    db = env_db(x, win)
    top = db.max()
    on_i = int(np.argmax(db > top - 30)); pk_i = int(np.argmax(db))
    above = np.where(db > top - 45)[0]; end_i = int(above[-1]) if len(above) else len(db) - 1
    s = max(0, on_i * win - int(pre * SR)); e = min(len(x), (end_i + 1) * win + int(0.03 * SR))
    y = x[s:e].copy()
    fi = int(0.003 * SR); y[:fi] *= np.linspace(0, 1, fi)
    fo = max(1, len(y) // 4); y[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    y *= (10 ** (peak_db / 20)) / (np.abs(y).max() + 1e-9)
    name = os.path.splitext(os.path.basename(path))[0] + ".wav"
    dst = os.path.join(out_dir, name)
    with wave.open(dst, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
    t_on = (on_i * win - s) / SR; t_pk = (pk_i * win + win / 2 - s) / SR; dur = len(y) / SR
    f = lambda t: round(t * fps)
    print(f"{name:24s} {dur:5.2f}s (was {len(x) / SR:4.2f}s)  onset {t_on:4.3f}s  peak {t_pk:4.3f}s")
    print(f'  "{name}": {{ len: {f(dur)}, lead: {f(t_on)} }},   // transient (click, pop, ting, slam)')
    print(f'  "{name}": {{ len: {f(dur)}, lead: {f(t_pk)} }},   // swell (whoosh, peel, rip): the hit is the peak')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--fps", type=float, default=30); ap.add_argument("--pre", type=float, default=0.01); ap.add_argument("--peak", type=float, default=-3)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    files = [a.src] if os.path.isfile(a.src) else sorted(os.path.join(a.src, f) for f in os.listdir(a.src) if f.lower().endswith((".wav", ".mp3", ".m4a", ".aif", ".aiff", ".flac")))
    if not files: sys.exit(f"no audio in {a.src}")
    for p in files: prep(p, a.out, a.fps, a.pre, a.peak)


if __name__ == "__main__":
    main()
