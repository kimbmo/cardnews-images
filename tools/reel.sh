#!/usr/bin/env bash
# Turn a post's rendered cards into a 9:16 Reels video.
# usage: tools/reel.sh posts/<dir>   -> writes posts/<dir>/reel.mp4
# Each card shows for SEC seconds (default 3) on a dark 1080x1920 frame, with a silent
# audio track, H.264/AAC, 30 fps: the format the Instagram Reels API accepts.
set -euo pipefail
dir=${1:?usage: tools/reel.sh posts/<dir>}
sec=${SEC:-3}
cards=$(ls "$dir"/card-*.jpg | sort -V)
n=$(echo "$cards" | wc -l)
[ "$n" -ge 2 ] || { echo "need at least 2 cards in $dir" >&2; exit 1; }
list=$(mktemp)
for c in $cards; do printf "file '%s'\nduration %s\n" "$(realpath "$c")" "$sec" >> "$list"; done
# The concat demuxer needs the last file repeated so its duration is honoured.
printf "file '%s'\n" "$(realpath "$(echo "$cards" | tail -1)")" >> "$list"
total=$((n * sec))
ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -vf "scale=1080:1350,pad=1080:1920:0:285:color=0x111111,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v high -preset medium -crf 20 -movflags +faststart \
  -c:a aac -b:a 128k -t "$total" -shortest "$dir/reel.mp4"
rm -f "$list"
echo "$dir/reel.mp4 (${total}s, $n cards)"
