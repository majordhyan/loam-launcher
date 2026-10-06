#!/usr/bin/env bash
# encode.sh <frames dir> <output.mp4>
# H.264 High, 4:2:0, Rec.709 (tagged), 60 fps, faststart, plus a silent 48 kHz stereo AAC track
# so editors and YouTube get a standard file. Music and UI sounds are added in the edit.
set -euo pipefail
FF="$LOCALAPPDATA/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"
"$FF" -hide_banner -loglevel error -y \
  -framerate 60 -i "$1/f_%05d.png" \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 12 -profile:v high -level 5.2 -g 30 -bf 2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 384k -shortest -movflags +faststart -r 60 "$2"
echo "encoded $2"
