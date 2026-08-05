#!/usr/bin/env python3
"""Generate the replaceable v0 loop kit for PANDA DUB.

All four loops share the exact sample count so browser playback can keep them
phase-locked without time stretching.  The material is deliberately synthetic
and dependency-free; replace the WAV files with final masters using the same
BPM, bar count, sample rate, and leading silence.
"""

from array import array
from pathlib import Path
import math
import random
import wave


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "panda-dub"
SAMPLE_RATE = 44_100
BPM = 74
BARS = 4
BEATS_PER_BAR = 4
BEAT_SECONDS = 60 / BPM
LOOP_SECONDS = BARS * BEATS_PER_BAR * BEAT_SECONDS
LOOP_FRAMES = round(LOOP_SECONDS * SAMPLE_RATE)


def empty(frames=LOOP_FRAMES):
    return array("f", [0.0]) * frames


def add(buffer, start_seconds, duration, generator, gain=1.0):
    start = round(start_seconds * SAMPLE_RATE)
    frames = min(round(duration * SAMPLE_RATE), len(buffer) - start)
    for index in range(max(0, frames)):
        value = generator(index / SAMPLE_RATE, index, frames)
        buffer[start + index] += value * gain


def fade_edges(buffer, seconds=0.008):
    frames = min(round(seconds * SAMPLE_RATE), len(buffer) // 2)
    for index in range(frames):
        fade = index / frames
        buffer[index] *= fade
        buffer[-1 - index] *= fade


def write_wav(name, buffer):
    peak = max(0.001, max(abs(value) for value in buffer))
    # Keep at least about 4 dBFS of peak headroom before the four stems mix.
    scale = min(0.62 / peak, 1.0)
    pcm = array("h", (round(max(-1, min(1, value * scale)) * 32767) for value in buffer))
    path = OUTPUT / name
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())
    return path


def kick(buffer, at, gain=0.72):
    def signal(t, _index, frames):
        position = t * SAMPLE_RATE / frames
        frequency = 118 * math.exp(-8 * position) + 42
        phase = 2 * math.pi * frequency * t
        body = math.sin(phase) * math.exp(-9 * position)
        click = (1 if math.sin(2 * math.pi * 1800 * t) >= 0 else -1) * math.exp(-55 * position)
        return body + click * 0.12
    add(buffer, at, 0.48, signal, gain)


def snare(buffer, at, rng, gain=0.42):
    noise = [rng.uniform(-1, 1) for _ in range(round(0.30 * SAMPLE_RATE))]
    def signal(t, index, frames):
        position = index / frames
        tone = math.sin(2 * math.pi * 178 * t) * 0.34
        return (noise[index] * 0.82 + tone) * math.exp(-10 * position)
    add(buffer, at, 0.30, signal, gain)


def hat(buffer, at, rng, gain=0.12, long=False):
    duration = 0.20 if long else 0.065
    noise = [rng.uniform(-1, 1) for _ in range(round(duration * SAMPLE_RATE))]
    def signal(_t, index, frames):
        previous = noise[index - 1] if index else 0
        bright = noise[index] - previous * 0.86
        return bright * math.exp((-8 if long else -15) * index / frames)
    add(buffer, at, duration, signal, gain)


def make_drums():
    rng = random.Random(731)
    track = empty()
    for bar in range(BARS):
        base = bar * 4 * BEAT_SECONDS
        for beat in range(4):
            beat_at = base + beat * BEAT_SECONDS
            if beat in (0, 2) or (bar == 3 and beat == 3):
                kick(track, beat_at, 0.68 if beat == 0 else 0.55)
            if beat in (1, 3):
                snare(track, beat_at, rng)
            hat(track, beat_at, rng, 0.09)
            hat(track, beat_at + BEAT_SECONDS / 2, rng, 0.11, long=(beat == 3))
        if bar in (1, 3):
            kick(track, base + 2.5 * BEAT_SECONDS, 0.38)
    fade_edges(track)
    return track


def bass_note(buffer, at, frequency, length=0.68, gain=0.34):
    def signal(t, index, frames):
        position = index / frames
        attack = min(1, position * 35)
        release = (1 - position) ** 1.6
        fundamental = math.sin(2 * math.pi * frequency * t)
        harmonic = math.sin(2 * math.pi * frequency * 2 * t) * 0.20
        soft_clip = math.tanh((fundamental + harmonic) * 1.55)
        return soft_clip * attack * release
    add(buffer, at, length, signal, gain)


def make_bass():
    track = empty()
    roots = [36.71, 36.71, 43.65, 32.70]  # D1, D1, F1, C1
    for bar, root in enumerate(roots):
        base = bar * 4 * BEAT_SECONDS
        bass_note(track, base, root, BEAT_SECONDS * 1.55, 0.38)
        bass_note(track, base + 2 * BEAT_SECONDS, root * 2, BEAT_SECONDS * 0.55, 0.26)
        bass_note(track, base + 3 * BEAT_SECONDS, root * (1.5 if bar % 2 else 1.3348), BEAT_SECONDS * 0.76, 0.28)
    fade_edges(track)
    return track


def chord_stab(buffer, at, root, gain=0.17):
    frequencies = [root, root * 1.1892, root * 1.4983, root * 2]
    phases = [0.0, 0.37, 0.81, 1.22]
    def signal(t, index, frames):
        position = index / frames
        envelope = min(1, position * 24) * math.exp(-5.8 * position)
        value = 0
        for frequency, phase in zip(frequencies, phases):
            value += math.sin(2 * math.pi * frequency * t + phase)
            value += math.sin(2 * math.pi * frequency * 2.01 * t + phase) * 0.16
        return value / len(frequencies) * envelope
    add(buffer, at, BEAT_SECONDS * 0.62, signal, gain)


def make_chord():
    track = empty()
    roots = [146.83, 146.83, 174.61, 130.81]
    for bar, root in enumerate(roots):
        base = bar * 4 * BEAT_SECONDS
        for beat in range(4):
            chord_stab(track, base + (beat + 0.5) * BEAT_SECONDS, root, 0.26 if beat != 3 else 0.21)
    fade_edges(track)
    return track


def radio_burst(buffer, at, frequency, rng, duration=0.42, gain=0.16):
    noise = [rng.uniform(-1, 1) for _ in range(round(duration * SAMPLE_RATE))]
    def signal(t, index, frames):
        position = index / frames
        envelope = math.sin(math.pi * position) ** 1.5
        carrier = math.sin(2 * math.pi * (frequency + 80 * position) * t)
        mod = math.sin(2 * math.pi * 7.4 * t)
        return (carrier * (0.55 + mod * 0.25) + noise[index] * 0.22) * envelope
    add(buffer, at, duration, signal, gain)


def make_voice():
    rng = random.Random(980)
    track = empty()
    events = [(1.5, 520), (5.5, 390), (9.0, 650), (14.5, 440)]
    for beat, frequency in events:
        radio_burst(track, beat * BEAT_SECONDS, frequency, rng, 0.44, 0.28)
    fade_edges(track)
    return track


def make_shot(kind):
    rng = random.Random(4000 + kind)
    duration = [1.0, 1.35, 0.75][kind]
    frames = round(duration * SAMPLE_RATE)
    shot = empty(frames)
    noise = [rng.uniform(-1, 1) for _ in range(frames)]
    for index in range(frames):
        t = index / SAMPLE_RATE
        position = index / frames
        envelope = (1 - position) ** (1.2 + kind * 0.7)
        if kind == 0:
            frequency = 210 - 115 * position
            value = math.sin(2 * math.pi * frequency * t) * 0.68 + noise[index] * 0.14
        elif kind == 1:
            frequency = 720 + 2100 * position * position
            value = math.sin(2 * math.pi * frequency * t + 8 * math.sin(2 * math.pi * 9 * t)) * 0.54 + noise[index] * 0.12
        else:
            previous = noise[index - 1] if index else 0
            value = (noise[index] - previous * 0.78) * 0.68 + math.sin(2 * math.pi * 92 * t) * 0.28
        shot[index] = value * envelope * 0.55
    fade_edges(shot, 0.004)
    return shot


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    loops = {
        "drums.wav": make_drums(),
        "bass.wav": make_bass(),
        "chord.wav": make_chord(),
        "voice.wav": make_voice(),
    }
    paths = [write_wav(name, buffer) for name, buffer in loops.items()]
    for index in range(3):
        paths.append(write_wav(f"shot-{index + 1:02}.wav", make_shot(index)))
    print(f"Generated {len(paths)} WAV files at {BPM} BPM / {BARS} bars / {SAMPLE_RATE} Hz")
    print(f"Loop frames: {LOOP_FRAMES}; duration: {LOOP_FRAMES / SAMPLE_RATE:.6f} seconds")


if __name__ == "__main__":
    main()
