"""
DocuFlow AI — Audio Service
All audio processing using pydub and FFmpeg.
"""
import io
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, List, Tuple


class AudioService:
    """Handles all audio processing operations using pydub + FFmpeg."""

    @staticmethod
    def _run_ffmpeg(args: List[str], input_bytes: bytes, input_ext: str = ".mp3") -> bytes:
        """Run an FFmpeg command on input bytes, return output bytes."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input{input_ext}")
            out_path = os.path.join(tmpdir, "output" + args[-1].rsplit(".", 1)[-1] if "." in args[-1] else ".mp3")

            with open(in_path, "wb") as f:
                f.write(input_bytes)

            cmd = ["ffmpeg", "-y", "-i", in_path] + args[:-1] + [out_path]
            result = subprocess.run(cmd, capture_output=True, timeout=300)
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg error: {result.stderr.decode()[:500]}")

            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def cut_audio(audio_bytes: bytes, start_seconds: float, end_seconds: float,
                  input_format: str = "mp3", output_format: str = "mp3") -> bytes:
        """Cut audio from start to end time."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        start_ms = int(start_seconds * 1000)
        end_ms = int(end_seconds * 1000)
        segment = audio[start_ms:end_ms]
        buf = io.BytesIO()
        segment.export(buf, format=output_format)
        return buf.getvalue()

    @staticmethod
    def merge_audio(audio_bytes_list: List[bytes], formats: Optional[List[str]] = None,
                    output_format: str = "mp3") -> bytes:
        """Merge multiple audio files into one."""
        from pydub import AudioSegment
        if not audio_bytes_list:
            raise ValueError("No audio files provided")
        formats = formats or ["mp3"] * len(audio_bytes_list)
        merged = AudioSegment.from_file(io.BytesIO(audio_bytes_list[0]), format=formats[0])
        for audio_bytes, fmt in zip(audio_bytes_list[1:], formats[1:]):
            segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
            merged += segment
        buf = io.BytesIO()
        merged.export(buf, format=output_format)
        return buf.getvalue()

    @staticmethod
    def split_audio(audio_bytes: bytes, input_format: str = "mp3",
                    segment_seconds: float = 60, output_format: str = "mp3") -> List[bytes]:
        """Split audio into segments of given duration."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        segment_ms = int(segment_seconds * 1000)
        segments = []
        for start in range(0, len(audio), segment_ms):
            seg = audio[start:start + segment_ms]
            buf = io.BytesIO()
            seg.export(buf, format=output_format)
            segments.append(buf.getvalue())
        return segments

    @staticmethod
    def compress_audio(audio_bytes: bytes, input_format: str = "mp3",
                       bitrate: str = "128k") -> bytes:
        """Compress audio by reducing bitrate."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        buf = io.BytesIO()
        audio.export(buf, format="mp3", bitrate=bitrate)
        return buf.getvalue()

    @staticmethod
    def convert_format(audio_bytes: bytes, input_format: str, output_format: str,
                       bitrate: str = "192k") -> bytes:
        """Convert audio from one format to another."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        buf = io.BytesIO()
        audio.export(buf, format=output_format, bitrate=bitrate)
        return buf.getvalue()

    @staticmethod
    def change_speed(audio_bytes: bytes, speed: float = 1.5,
                     input_format: str = "mp3") -> bytes:
        """Change audio playback speed without changing pitch."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        # FFmpeg atempo filter
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{input_format}")
            out_path = os.path.join(tmpdir, "output.mp3")
            with open(in_path, "wb") as f:
                f.write(audio_bytes)
            cmd = ["ffmpeg", "-y", "-i", in_path, "-filter:a", f"atempo={speed}", out_path]
            result = subprocess.run(cmd, capture_output=True, timeout=300)
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg error: {result.stderr.decode()[:500]}")
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def change_volume(audio_bytes: bytes, db_change: float = 6.0,
                      input_format: str = "mp3") -> bytes:
        """Change audio volume by decibels."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        modified = audio + db_change  # pydub uses + for dB increase
        buf = io.BytesIO()
        modified.export(buf, format=input_format)
        return buf.getvalue()

    @staticmethod
    def fade_in(audio_bytes: bytes, duration_ms: int = 3000,
                input_format: str = "mp3") -> bytes:
        """Apply fade in effect."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        faded = audio.fade_in(duration_ms)
        buf = io.BytesIO()
        faded.export(buf, format=input_format)
        return buf.getvalue()

    @staticmethod
    def fade_out(audio_bytes: bytes, duration_ms: int = 3000,
                 input_format: str = "mp3") -> bytes:
        """Apply fade out effect."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        faded = audio.fade_out(duration_ms)
        buf = io.BytesIO()
        faded.export(buf, format=input_format)
        return buf.getvalue()

    @staticmethod
    def extract_from_video(video_bytes: bytes, video_format: str = "mp4",
                           output_format: str = "mp3") -> bytes:
        """Extract audio track from a video file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, f"output.{output_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-acodec",
                   "libmp3lame" if output_format == "mp3" else "copy", out_path]
            result = subprocess.run(cmd, capture_output=True, timeout=600)
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg error: {result.stderr.decode()[:500]}")
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def get_audio_info(audio_bytes: bytes, input_format: str = "mp3") -> dict:
        """Get audio metadata: duration, channels, sample rate."""
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
        return {
            "duration_seconds": len(audio) / 1000.0,
            "channels": audio.channels,
            "sample_rate": audio.frame_rate,
            "sample_width": audio.sample_width,
            "bitrate_estimate": len(audio_bytes) * 8 / max(len(audio) / 1000.0, 1),
        }
