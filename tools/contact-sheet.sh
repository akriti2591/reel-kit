#!/bin/sh
# Contact sheet: one frame every N seconds of a video, tiled into a single image you can read at a glance.
#   sh tools/contact-sheet.sh <video> [every_seconds=0.5] [columns=6] [out=<video>-sheet.jpg]
# Each tile is 270 px wide (a quarter of 1080). Frame-number labels are drawn when your ffmpeg has drawtext.
# Also handy: sh tools/contact-sheet.sh out/demo.mp4 0.1 10   (every 3rd frame, to check motion and settles)
set -e
in="$1"; every="${2:-0.5}"; cols="${3:-6}"
[ -z "$in" ] && { echo "usage: contact-sheet.sh <video> [every_seconds] [columns] [out.jpg]"; exit 1; }
out="${4:-${in%.*}-sheet.jpg}"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
n=$(awk -v d="$dur" -v e="$every" 'BEGIN { n = int(d / e + 0.999); if (n < 1) n = 1; print n }')
rows=$(( (n + cols - 1) / cols ))
label=""
if ffmpeg -hide_banner -filters 2>/dev/null | grep -q drawtext; then
  label=",drawtext=text='%{eif\:n*${every}*30\:d}f':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55"
fi
ffmpeg -v error -y -i "$in" -vf "fps=1/${every},scale=270:-1${label},tile=${cols}x${rows}:padding=4:margin=4:color=0x222222" -frames:v 1 -q:v 3 "$out"
echo "$out  ($n frames, every ${every}s, ${cols}x${rows})"
