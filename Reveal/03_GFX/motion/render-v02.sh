#!/usr/bin/env bash
# Renders the v02 montage cuts (teaser2, promo30) at 4K 60 fps in both formats.
cd "$(dirname "$0")/.."
rm -rf motion/frames-teaser2-* motion/frames-promo30-*
node render.mjs frames "motion/scene.html?scene=teaser2"     motion/frames-teaser2-16x9 1920 1080 15 60 2 > motion/log-teaser2-16x9.txt 2>&1 &
node render.mjs frames "motion/scene.html?scene=teaser2&v=1" motion/frames-teaser2-9x16 1080 1920 15 60 2 > motion/log-teaser2-9x16.txt 2>&1 &
node render.mjs frames "motion/scene.html?scene=promo30"     motion/frames-promo30-16x9 1920 1080 30 60 2 > motion/log-promo30-16x9.txt 2>&1 &
node render.mjs frames "motion/scene.html?scene=promo30&v=1" motion/frames-promo30-9x16 1080 1920 30 60 2 > motion/log-promo30-9x16.txt 2>&1 &
wait
echo V02_FRAMES_DONE
