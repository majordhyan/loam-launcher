#!/usr/bin/env bash
# normalize.sh <in.wav> <out.wav> [true-peak dBTP, default -1.5]: two-pass EBU R128 loudness to -14 LUFS.
# The AAC encode adds up to ~0.5 dB of peak; transient-heavy mixes (intro) use -2.2.
set -euo pipefail
TP="${3:--1.5}"
D="$LOCALAPPDATA/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"
J=$("$D/ffmpeg.exe" -hide_banner -nostats -i "$1" -af loudnorm=I=-14:TP=$TP:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get(){ echo "$J" | python -c "import sys,json; print(json.load(sys.stdin)['$1'])"; }
"$D/ffmpeg.exe" -hide_banner -loglevel error -y -i "$1" \
  -af "loudnorm=I=-14:TP=$TP:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" \
  -c:a pcm_s24le "$2"
echo "normalized $2"
