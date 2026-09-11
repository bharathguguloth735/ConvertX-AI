"""
DocuFlow AI — Video Service
All video processing using FFmpeg.
"""
import io
import os
import subprocess
import tempfile
from typing import List, Optional


class VideoService:
    """Handles all video processing operations using FFmpeg."""

    @staticmethod
    def _ffmpeg(args: List[str], timeout: int = 600) -> None:
        """Run an FFmpeg command, raise on failure."""
        result = subprocess.run(["ffmpeg", "-y"] + args, capture_output=True, timeout=timeout)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr.decode()[:500]}")

    @staticmethod
    def cut_video(video_bytes: bytes, start_seconds: float, end_seconds: float,
                  video_format: str = "mp4") -> bytes:
        """Cut video between start and end time."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, f"output.{video_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            duration = end_seconds - start_seconds
            VideoService._ffmpeg([
                "-ss", str(start_seconds),
                "-i", in_path,
                "-t", str(duration),
                "-c", "copy",
                out_path
            ])
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def merge_videos(video_bytes_list: List[bytes], video_format: str = "mp4") -> bytes:
        """Merge multiple videos into one."""
        with tempfile.TemporaryDirectory() as tmpdir:
            concat_list = os.path.join(tmpdir, "concat.txt")
            out_path = os.path.join(tmpdir, f"output.{video_format}")
            lines = []
            for i, vb in enumerate(video_bytes_list):
                path = os.path.join(tmpdir, f"input_{i}.{video_format}")
                with open(path, "wb") as f:
                    f.write(vb)
                lines.append(f"file '{path}'")
            with open(concat_list, "w") as f:
                f.write("\n".join(lines))
            VideoService._ffmpeg([
                "-f", "concat", "-safe", "0",
                "-i", concat_list,
                "-c", "copy",
                out_path
            ])
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def compress_video(video_bytes: bytes, crf: int = 28,
                       video_format: str = "mp4", resolution: Optional[str] = None) -> bytes:
        """Compress video using H.264 with given CRF (lower = better quality)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, f"output.{video_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            args = ["-i", in_path, "-vcodec", "libx264", "-crf", str(crf)]
            if resolution:
                args += ["-vf", f"scale={resolution}"]
            args += ["-preset", "fast", "-movflags", "+faststart", out_path]
            VideoService._ffmpeg(args)
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def extract_audio(video_bytes: bytes, video_format: str = "mp4",
                      audio_format: str = "mp3") -> bytes:
        """Extract audio from video."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, f"output.{audio_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            VideoService._ffmpeg(["-i", in_path, "-vn", "-acodec", "libmp3lame", out_path])
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def video_to_gif(video_bytes: bytes, video_format: str = "mp4",
                     fps: int = 10, width: int = 480) -> bytes:
        """Convert video to GIF."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, "output.gif")
            palette_path = os.path.join(tmpdir, "palette.png")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            # Generate palette for better quality
            VideoService._ffmpeg([
                "-i", in_path,
                "-vf", f"fps={fps},scale={width}:-1:flags=lanczos,palettegen",
                palette_path
            ])
            VideoService._ffmpeg([
                "-i", in_path, "-i", palette_path,
                "-filter_complex", f"fps={fps},scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse",
                out_path
            ])
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def extract_frames(video_bytes: bytes, video_format: str = "mp4",
                       fps: float = 1.0) -> List[bytes]:
        """Extract frames from video at given FPS."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            frame_pattern = os.path.join(tmpdir, "frame_%04d.jpg")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            VideoService._ffmpeg(["-i", in_path, "-vf", f"fps={fps}", frame_pattern])
            frames = []
            for fname in sorted(os.listdir(tmpdir)):
                if fname.startswith("frame_") and fname.endswith(".jpg"):
                    with open(os.path.join(tmpdir, fname), "rb") as f:
                        frames.append(f.read())
            return frames

    @staticmethod
    def remove_audio(video_bytes: bytes, video_format: str = "mp4") -> bytes:
        """Remove audio track from video."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, f"output.{video_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            VideoService._ffmpeg(["-i", in_path, "-an", "-c:v", "copy", out_path])
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def change_speed(video_bytes: bytes, speed: float = 2.0,
                     video_format: str = "mp4") -> bytes:
        """Change video playback speed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            out_path = os.path.join(tmpdir, f"output.{video_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            audio_tempo = speed
            video_pts = 1 / speed
            VideoService._ffmpeg([
                "-i", in_path,
                "-filter_complex",
                f"[0:v]setpts={video_pts:.2f}*PTS[v];[0:a]atempo={audio_tempo:.2f}[a]",
                "-map", "[v]", "-map", "[a]",
                out_path
            ])
            with open(out_path, "rb") as f:
                return f.read()

    @staticmethod
    def get_video_info(video_bytes: bytes, video_format: str = "mp4") -> dict:
        """Get video metadata using ffprobe."""
        import json
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{video_format}")
            with open(in_path, "wb") as f:
                f.write(video_bytes)
            result = subprocess.run([
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_streams", "-show_format", in_path
            ], capture_output=True, timeout=30)
            if result.returncode != 0:
                return {}
            data = json.loads(result.stdout)
            fmt = data.get("format", {})
            streams = data.get("streams", [])
            video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
            audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})
            return {
                "duration": float(fmt.get("duration", 0)),
                "size": int(fmt.get("size", 0)),
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "fps": eval(video_stream.get("r_frame_rate", "0/1")),
                "video_codec": video_stream.get("codec_name"),
                "audio_codec": audio_stream.get("codec_name"),
                "bitrate": int(fmt.get("bit_rate", 0)),
            }
