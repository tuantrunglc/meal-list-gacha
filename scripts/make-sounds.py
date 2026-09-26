#!/usr/bin/env python3
"""Tạo 3 âm thanh mở nồi (WAV mono 22,05kHz 16-bit, mỗi file < 50KB) — chỉ dùng thư viện chuẩn.

Chạy: python3 scripts/make-sounds.py  → web/public/sounds/{bup,ting,ting-ting-tinh}.wav
"""
import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'sounds')


def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.8 / peak
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * gain)) * 32767)) for s in samples))
    size = os.path.getsize(path)
    assert size < 50 * 1024, f'{name} {size} bytes: vượt 50KB'
    print(f'{path}: {size} bytes')


def bup():
    """⭐ "bụp": nắp nồi bật nhẹ — sine trầm trượt xuống + tiếng lách tách ngắn."""
    n = int(RATE * 0.22)
    rnd = random.Random(1)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / RATE
        freq = 190 * math.exp(-t * 9) + 70
        phase += 2 * math.pi * freq / RATE
        body = math.sin(phase) * math.exp(-t * 22)
        click = (rnd.random() * 2 - 1) * math.exp(-t * 180) * 0.4
        out.append(body + click)
    return out


def bell(freq, dur, decay):
    """Tiếng chuông nhỏ: cơ bản + bồi âm lệch (kim loại), tấn công nhanh."""
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / 0.004) * math.exp(-t * decay)
        s = math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(2 * math.pi * freq * 2.76 * t) * math.exp(-t * 8)
        out.append(s * env)
    return out


def mix(parts, dur):
    out = [0.0] * int(RATE * dur)
    for start, samples in parts:
        o = int(RATE * start)
        for i, s in enumerate(samples):
            if o + i < len(out):
                out[o + i] += s
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    write('bup.wav', bup())
    write('ting.wav', bell(1760, 0.55, 7))
    # ⭐⭐⭐ "ting-ting-tinh": ba nốt đi lên, nốt cuối ngân dài
    write('ting-ting-tinh.wav', mix([(0, bell(1568, 0.3, 10)), (0.14, bell(1976, 0.3, 10)), (0.28, bell(2637, 0.8, 4.5))], 1.05))


if __name__ == '__main__':
    main()
