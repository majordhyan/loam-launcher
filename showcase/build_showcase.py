import os
import sys
import time
import shutil
import subprocess
import numpy as np
import imageio_ffmpeg

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from showcase.config import (
    TOTAL_FRAMES,
    FPS,
    DURATION_SEC,
    WIDTH_1080P,
    HEIGHT_1080P,
    WIDTH_4K,
    HEIGHT_4K,
    SAMPLE_RATE,
    FILE_AUDIO_WAV,
    FILE_VIDEO_1080P,
    FILE_VIDEO_4K,
    FILE_COVER_PNG,
    DIST_DIR
)
from showcase.audio_generator import synthesize_showcase_audio
from showcase.frame_renderer import render_frame

ARTIFACTS_DIR = r"C:\Users\Dhyan\.gemini\antigravity\brain\e2a2d452-0001-448e-82f9-5f43a1967f24"

def build_showcase(force_rerender=False):
    print("=" * 70)
    print("LOAM LAUNCHER -- PRODUCT SHOWCASE FILM BUILDER")
    print(f"Target: 36.00s @ 60 fps = {TOTAL_FRAMES} frames | 48 kHz stereo audio")
    print("=" * 70)
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # -------------------------------------------------------------
    # 1. AUDIO SYNTHESIS & LOUDNESS VERIFICATION
    # -------------------------------------------------------------
    if force_rerender or not os.path.exists(FILE_AUDIO_WAV):
        print("\n[Step 1/5] Synthesizing bespoke 36.0-second soundtrack...")
        synthesize_showcase_audio(FILE_AUDIO_WAV)
    else:
        print(f"\n[Step 1/5] Using existing audio track: {FILE_AUDIO_WAV}")
    
    # Verify loudness via EBU R128
    res = subprocess.run(
        [ffmpeg_exe, "-i", FILE_AUDIO_WAV, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True
    )
    for line in res.stderr.splitlines():
        if "Integrated loudness" in line or "I:" in line or "Peak:" in line:
            print(f"  {line.strip()}")
            
    # -------------------------------------------------------------
    # 2. RENDER 1080P MASTER VIA RAWVIDEO PIPE (1920x1080 @ 60fps)
    # -------------------------------------------------------------
    if force_rerender or not os.path.exists(FILE_VIDEO_1080P) or os.path.getsize(FILE_VIDEO_1080P) < 100000:
        print(f"\n[Step 2/5] Rendering 1080p Master ({WIDTH_1080P}x{HEIGHT_1080P} @ {FPS}fps)...")
        cmd_1080p = [
            ffmpeg_exe, "-y",
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-s", f"{WIDTH_1080P}x{HEIGHT_1080P}",
            "-pix_fmt", "bgr24",
            "-r", str(FPS),
            "-i", "-",
            "-i", FILE_AUDIO_WAV,
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "17",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "320k",
            "-ar", str(SAMPLE_RATE),
            "-movflags", "+faststart",
            FILE_VIDEO_1080P
        ]
        
        proc_1080p = subprocess.Popen(cmd_1080p, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        t_start = time.time()
        for f in range(TOTAL_FRAMES):
            im = render_frame(f)
            im_bgr = np.array(im)[:, :, ::-1]
            proc_1080p.stdin.write(im_bgr.tobytes())
            
            if (f + 1) % 360 == 0 or (f + 1) == TOTAL_FRAMES:
                elapsed = time.time() - t_start
                cur_fps = (f + 1) / elapsed
                print(f"  Processed {f + 1:4d} / {TOTAL_FRAMES} frames ({(f + 1)/TOTAL_FRAMES*100:5.1f}%) -- {cur_fps:5.1f} fps")
                
        proc_1080p.stdin.close()
        stdout, stderr = proc_1080p.communicate()
        
        if proc_1080p.returncode != 0:
            print(f"Error rendering 1080p: {stderr.decode(errors='ignore')}")
            sys.exit(1)
            
        print(f"[OK] 1080p Master successfully rendered: {FILE_VIDEO_1080P}")
    else:
        print(f"\n[Step 2/5] Verified existing 1080p Master: {FILE_VIDEO_1080P} ({os.path.getsize(FILE_VIDEO_1080P)/1024/1024:.2f} MB)")

    # -------------------------------------------------------------
    # 3. RENDER 4K MASTER (3840x2160 @ 60fps)
    # -------------------------------------------------------------
    print(f"\n[Step 3/5] Encoding 4K Ultra HD Master ({WIDTH_4K}x{HEIGHT_4K} @ {FPS}fps)...")
    cmd_4k = [
        ffmpeg_exe, "-y",
        "-i", FILE_VIDEO_1080P,
        "-vf", f"scale={WIDTH_4K}:{HEIGHT_4K}:flags=lanczos",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "16",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        FILE_VIDEO_4K
    ]
    
    res_4k = subprocess.run(cmd_4k, capture_output=True, text=True)
    if res_4k.returncode != 0:
        print(f"Error rendering 4K: {res_4k.stderr}")
        sys.exit(1)
        
    print(f"[OK] 4K Master successfully rendered: {FILE_VIDEO_4K}")

    # -------------------------------------------------------------
    # 4. EXPORT COVER POSTER FRAME (Shot 8 Brand Hold, frame 1980)
    # -------------------------------------------------------------
    print("\n[Step 4/5] Exporting high-res showcase cover image...")
    cover_frame = render_frame(1980)
    cover_frame.save(FILE_COVER_PNG)
    print(f"[OK] Showcase cover exported: {FILE_COVER_PNG}")

    # -------------------------------------------------------------
    # 5. DISTRIBUTION & VERIFICATION INSPECTION
    # -------------------------------------------------------------
    print("\n[Step 5/5] Deploying to dist/ and artifacts directory & running verification...")
    
    # Copy to project dist/
    shutil.copy2(FILE_VIDEO_1080P, os.path.join(DIST_DIR, "LOAM_Showcase_36s_1080p.mp4"))
    shutil.copy2(FILE_VIDEO_4K, os.path.join(DIST_DIR, "LOAM_Showcase_36s_4K.mp4"))
    shutil.copy2(FILE_COVER_PNG, os.path.join(DIST_DIR, "LOAM_Showcase_Cover.png"))
    shutil.copy2(FILE_AUDIO_WAV, os.path.join(DIST_DIR, "LOAM_Showcase_36s_Audio.wav"))
    
    # Copy to conversation artifacts
    if os.path.exists(ARTIFACTS_DIR):
        shutil.copy2(FILE_VIDEO_1080P, os.path.join(ARTIFACTS_DIR, "LOAM_Showcase_36s_1080p.mp4"))
        shutil.copy2(FILE_VIDEO_4K, os.path.join(ARTIFACTS_DIR, "LOAM_Showcase_36s_4K.mp4"))
        shutil.copy2(FILE_COVER_PNG, os.path.join(ARTIFACTS_DIR, "LOAM_Showcase_Cover.png"))
        shutil.copy2(FILE_AUDIO_WAV, os.path.join(ARTIFACTS_DIR, "LOAM_Showcase_36s_Audio.wav"))
        print(f"[OK] Copied deliverables to conversation artifacts: {ARTIFACTS_DIR}")

    # Verification inspection via FFmpeg
    def inspect_file(filepath):
        res = subprocess.run(
            [ffmpeg_exe, "-i", filepath],
            capture_output=True, text=True
        )
        info = []
        for line in res.stderr.splitlines():
            line_str = line.strip()
            if "Duration:" in line_str or "Stream #" in line_str:
                info.append(line_str)
        return info

    print("\n" + "=" * 70)
    print("VERIFICATION INSPECTION REPORT:")
    print("=" * 70)
    print(f"1080p Master ({os.path.basename(FILE_VIDEO_1080P)}): {os.path.getsize(FILE_VIDEO_1080P) / 1024 / 1024:.2f} MB")
    for l in inspect_file(FILE_VIDEO_1080P):
        print(f"   {l}")
        
    print(f"\n4K Master ({os.path.basename(FILE_VIDEO_4K)}): {os.path.getsize(FILE_VIDEO_4K) / 1024 / 1024:.2f} MB")
    for l in inspect_file(FILE_VIDEO_4K):
        print(f"   {l}")
        
    print(f"\nCover Image ({os.path.basename(FILE_COVER_PNG)}): {os.path.getsize(FILE_COVER_PNG) / 1024:.1f} KB, dimensions: {cover_frame.size}")
    print("=" * 70)
    print("BUILD COMPLETE! ALL DELIVERABLES PRODUCED DETERMINISTICALLY.")

if __name__ == "__main__":
    force = "--force" in sys.argv
    build_showcase(force_rerender=force)
