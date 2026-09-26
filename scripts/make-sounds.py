#!/usr/bin/env python3
"""Tạo 5 âm thanh mở nồi (WAV mono 22,05kHz 16-bit, mỗi file < 50KB) — chỉ dùng thư viện chuẩn.

Chạy: python3 scripts/make-sounds.py  → web/public/sounds/{bup,ting,ting-ting-tinh,soi,bum}.wav
"""
import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'sounds')


def write(name, samples, level=0.8):
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = level / peak
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


def lowpass(samples, a, passes=1, circular=False):
    """Lọc thông thấp một cực; `circular` chạy vòng 2 lượt để đầu-cuối nối liền (âm lặp)."""
    out = list(samples)
    for _ in range(passes):
        y = 0.0
        if circular:
            for s in out:
                y += a * (s - y)
        res = []
        for s in out:
            y += a * (s - y)
            res.append(y)
        out = res
    return out


def soi():
    """Nồi sôi rung: ùng ục trầm + bong bóng + nắp đất lục cục. Lặp liền mạch (mọi thứ tuần hoàn theo 1 giây)."""
    dur = 1.0
    n = int(RATE * dur)
    rnd = random.Random(7)
    # nền trầm: nhiễu lọc thấp (vòng) + các tần số nguyên (tuần hoàn đúng 1s), nhấp nhô 6 nhịp/giây
    noise = lowpass([rnd.random() * 2 - 1 for _ in range(n)], 0.02, passes=2, circular=True)
    out = []
    for i in range(n):
        t = i / RATE
        wobble = 0.65 + 0.35 * math.sin(2 * math.pi * 6 * t)
        hum = 0.25 * math.sin(2 * math.pi * 55 * t) + 0.15 * math.sin(2 * math.pi * 82 * t)
        out.append((noise[i] * 9 + hum) * wobble)

    def add(start, samples):
        o = int(RATE * start)
        for k, v in enumerate(samples):
            out[(o + k) % n] += v

    # bong bóng "ục": sine ngắn trượt lên
    for _ in range(9):
        start = rnd.random()
        f0 = rnd.uniform(110, 180)
        m = int(RATE * 0.07)
        phase = 0.0
        blip = []
        for k in range(m):
            t = k / RATE
            phase += 2 * math.pi * (f0 + 1800 * t) / RATE
            blip.append(math.sin(phase) * math.sin(math.pi * k / m) * 0.55)
        add(start, blip)
    # nắp đất "lục cục": cụm tiếng gõ khô (nhiễu + cộng hưởng ~700Hz), tắt rất nhanh
    for c in range(4):
        base = c / 4 + rnd.uniform(0, 0.08)
        for j in range(rnd.randint(2, 3)):
            m = int(RATE * 0.03)
            f = rnd.uniform(600, 850)
            tick = [((rnd.random() * 2 - 1) * 0.5 + math.sin(2 * math.pi * f * k / RATE)) * math.exp(-k / RATE * 160) * 0.5 for k in range(m)]
            add(base + j * rnd.uniform(0.035, 0.06), tick)
    return out


def bum():
    """Nổ "bùm": cú đấm trầm trượt xuống + nhiễu nổ lọc thấp + tiếng nắp văng lanh canh."""
    n = int(RATE * 0.7)
    rnd = random.Random(3)
    burst = lowpass([rnd.random() * 2 - 1 for _ in range(n)], 0.08)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / RATE
        freq = 120 * math.exp(-t * 7) + 38
        phase += 2 * math.pi * freq / RATE
        attack = min(1.0, t / 0.003)
        body = math.sin(phase) * math.exp(-t * 6)
        crack = burst[i] * 5 * math.exp(-t * 14)
        out.append((body + crack) * attack)
    clang = bell(1150, 0.35, 16)
    for k, v in enumerate(clang):
        o = int(RATE * 0.03) + k
        if o < n:
            out[o] += v * 0.18
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    write('bup.wav', bup())
    write('ting.wav', bell(1760, 0.55, 7))
    # tiếng sôi là nền kéo dài: nhỏ hơn để "bùm" nổi bật
    write('soi.wav', soi(), level=0.45)
    write('bum.wav', bum())
    # ⭐⭐⭐ "ting-ting-tinh": ba nốt đi lên, nốt cuối ngân dài
    write('ting-ting-tinh.wav', mix([(0, bell(1568, 0.3, 10)), (0.14, bell(1976, 0.3, 10)), (0.28, bell(2637, 0.8, 4.5))], 1.05))


if __name__ == '__main__':
    main()
