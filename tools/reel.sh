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
tmp=$(mktemp -d)
list=$tmp/list.txt
# Every frame is 1080x1920. Card 1 is replaced by reel-cover.jpg (the 9:16 cover render.js makes)
# when it exists, so the opening frame matches the Reel thumbnail; other cards are padded.
i=0
for c in $cards; do
  i=$((i + 1))
  f=$tmp/f$i.jpg
  if [ "$i" = 1 ] && [ -f "$dir/reel-cover.jpg" ]; then cp "$dir/reel-cover.jpg" "$f"
  else ffmpeg -y -loglevel error -i "$c" -vf "scale=1080:1350,pad=1080:1920:0:285:color=0x111111" -q:v 2 "$f"; fi
  printf "file '%s'\nduration %s\n" "$f" "$sec" >> "$list"
done
# The concat demuxer needs the last file repeated so its duration is honoured.
printf "file '%s'\n" "$f" >> "$list"
total=$((n * sec))
ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -vf "scale=1080:1920,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v high -preset medium -crf 20 -movflags +faststart \
  -c:a aac -b:a 128k -t "$total" -shortest "$dir/reel.mp4"
rm -rf "$tmp"
echo "$dir/reel.mp4 (${total}s, $n cards)"
