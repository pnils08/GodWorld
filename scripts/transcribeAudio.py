#!/root/GodWorld/.venv/whisper/bin/python
"""transcribeAudio.py — turn a show's audio into a timestamped transcript.

Builder 2026-11-10: "Get the transcript off the audio" / "Save the transcript
script this time". Until this file nothing on the server could say what the
NotebookLM hosts actually said; every read of a show was a read of its sources.

Local and free: ffmpeg decodes to 16 kHz mono, faster-whisper (small.en, CPU,
int8) transcribes. A 20-minute show takes a few minutes on this server. No
network after the model's first download, no API key.

Usage:
  .venv/whisper/bin/python scripts/transcribeAudio.py <audio> [<out.txt>] [--model small.en]

Writes one line per spoken segment, `[MM:SS] text`. Default output is the audio
path with `.transcript.txt`. Exit 0 and the output path on stdout on success.

Install (once): python3 -m venv .venv/whisper && .venv/whisper/bin/pip install faster-whisper numpy
"""
import os
import subprocess
import sys


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    model_name = "small.en"
    if "--model" in argv:
        model_name = argv[argv.index("--model") + 1]
        args = [a for a in args if a != model_name]
    if not args:
        print(__doc__)
        return 2
    audio = args[0]
    out = args[1] if len(args) > 1 else os.path.splitext(audio)[0] + ".transcript.txt"
    if not os.path.isfile(audio) or os.path.getsize(audio) == 0:
        print("transcribeAudio failed: no audio at " + audio, file=sys.stderr)
        return 1

    import numpy as np
    from faster_whisper import WhisperModel

    # ffmpeg does the decode: the PyAV build faster-whisper pulls in fails on
    # NotebookLM's .m4a ("open() got an unexpected keyword argument
    # 'metadata_errors'", 2026-11-10), so the model is handed raw samples.
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if pcm.returncode != 0 or not pcm.stdout:
        print("transcribeAudio failed: ffmpeg could not decode " + audio + ": " +
              pcm.stderr.decode("utf-8", "replace")[-300:], file=sys.stderr)
        return 1
    samples = np.frombuffer(pcm.stdout, dtype=np.int16).astype(np.float32) / 32768.0

    model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 2)
    segments, _info = model.transcribe(samples, beam_size=1, vad_filter=True)
    tmp = out + ".part"
    with open(tmp, "w") as handle:
        for segment in segments:
            handle.write("[%02d:%02d] %s\n" % (int(segment.start) // 60, int(segment.start) % 60, segment.text.strip()))
            handle.flush()
    os.replace(tmp, out)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
