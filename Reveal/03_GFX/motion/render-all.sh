#!/usr/bin/env bash
# Renders every reveal clip as 4K 60 fps PNG frames in parallel.
cd "$(dirname "$0")/.."
node render.mjs frames "motion/scene.html?scene=teaser"     motion/frames-teaser-16x9 1920 1080 15 60 2 > motion/log-teaser-16x9.txt 2>&1 &
node render.mjs frames "motion/scene.html?scene=teaser&v=1" motion/frames-teaser-9x16 1080 1920 15 60 2 > motion/log-teaser-9x16.txt 2>&1 &
node render.mjs frames "motion/scene.html?scene=intro"      motion/frames-intro-16x9  1920 1080 13 60 2 > motion/log-intro-16x9.txt 2>&1 &
node render.mjs frames "motion/scene.html?scene=endcard"    motion/frames-endcard-16x9 1920 1080 7 60 2 > motion/log-endcard-16x9.txt 2>&1 &
wait
echo ALL_FRAMES_DONE
