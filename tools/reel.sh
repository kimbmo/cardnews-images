#!/usr/bin/env bash
# Turn a post's rendered cards into a 9:16 Reels video.
# usage: tools/reel.sh posts/<dir>   -> writes posts/<dir>/reel.mp4
# Each card shows for SEC seconds (default 3) on a 1080x1920 frame, H.264/AAC, 30 fps: the format
# the Instagram Reels API accepts.
# Background music: set BGM to an mp3, or BGM_DIR to a folder of mp3s (one is picked from the post
# folder's name, so it rotates between posts and a rerun picks the same one). The track fades in
# and out under the video. Without either, the audio track is silent.
# The music files are kept out of this public repo (their license forbids sharing the files on
# their own); the routine passes BGM_DIR=/mnt/project-files/bgm.
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
bgm=${BGM:-}
if [ -z "$bgm" ] && [ -n "${BGM_DIR:-}" ] && ls "$BGM_DIR"/*.mp3 >/dev/null 2>&1; then
  tracks=$(ls "$BGM_DIR"/*.mp3 | sort)
  k=$(( $(basename "$dir" | cksum | cut -d' ' -f1) % $(echo "$tracks" | wc -l) + 1 ))
  bgm=$(echo "$tracks" | sed -n "${k}p")
fi
if [ -n "$bgm" ]; then
  audio=(-i "$bgm" -af "afade=t=in:d=1,afade=t=out:st=$((total - 2)):d=2,volume=0.8")
  echo "music: $(basename "$bgm")"
else
  audio=(-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100)
fi
ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" "${audio[@]}" \
  -vf "scale=1080:1920,fps=30,format=yuv420p" -map 0:v -map 1:a \
  -c:v libx264 -profile:v high -preset medium -crf 20 -movflags +faststart \
  -c:a aac -b:a 128k -t "$total" -shortest "$dir/reel.mp4"
rm -rf "$tmp"
echo "$dir/reel.mp4 (${total}s, $n cards)"
