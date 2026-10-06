#!/usr/bin/env bash
# Synthesizes every scene's sound (raw/), masters to -14 LUFS (mix/), and muxes onto the rendered frames.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p 02_Audio/raw 02_Audio/mix
for s in teaser teaser2 promo30 intro endcard; do python 02_Audio/sfx.py "$s" "02_Audio/raw/$s.wav"; done
for s in teaser teaser2 promo30 endcard; do bash 02_Audio/normalize.sh "02_Audio/raw/$s.wav" "02_Audio/mix/$s.wav"; done
bash 02_Audio/normalize.sh 02_Audio/raw/intro.wav 02_Audio/mix/intro.wav -2.2
E=05_Exports M=03_GFX/motion
bash $M/encode.sh $M/frames-teaser2-16x9        $E/LOAM_Teaser_15s_16x9_v02_2160p60.mp4         02_Audio/mix/teaser2.wav
bash $M/encode.sh $M/frames-teaser2-9x16        $E/LOAM_Teaser_15s_9x16_v02_2160x3840p60.mp4    02_Audio/mix/teaser2.wav
bash $M/encode.sh $M/frames-promo30-16x9 $E/LOAM_Promo_30s_16x9_v02_2160p60.mp4          02_Audio/mix/promo30.wav
bash $M/encode.sh $M/frames-promo30-9x16 $E/LOAM_Promo_30s_9x16_v02_2160x3840p60.mp4     02_Audio/mix/promo30.wav
bash $M/encode.sh $M/frames-intro-16x9   $E/LOAM_TrailerIntro_13s_16x9_v02_2160p60.mp4   02_Audio/mix/intro.wav
bash $M/encode.sh $M/frames-endcard-16x9 $E/LOAM_EndCard_7s_16x9_v02_2160p60.mp4         02_Audio/mix/endcard.wav
