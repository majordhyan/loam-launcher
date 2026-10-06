#!/usr/bin/env bash
# encode.sh <frames dir> <output.mp4> [audio.wav]
# H.264 High, 4:2:0, Rec.709 (tagged), 60 fps, faststart, AAC-LC 384 kbps 48 kHz stereo.
# With no audio file, a silent stereo track is added so every file has the same layout.
set -euo pipefail
FF="$LOCALAPPDATA/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"
if [ -n "${3:-}" ]; then AUDIO=(-i "$3"); else AUDIO=(-f lavfi -i anullsrc=r=48000:cl=stereo); fi
"$FF" -hide_banner -loglevel error -y \
  -framerate 60 -i "$1/f_%05d.png" \
  "${AUDIO[@]}" \
  -map 0:v -map 1:a \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 12 -profile:v high -level 5.2 -g 30 -bf 2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 384k -ar 48000 -ac 2 -shortest -movflags +faststart -r 60 "$2"
echo "encoded $2"
