#!/usr/bin/env bash
# scripts/optimize-videos.sh
# Reusable video optimization script for Puretive reels
# Generates:
#   1. Poster: single frame at 1s, 480px wide (.webp)
#   2. Preview: first 4s from 1s, 480px tall, no audio, H.264, crf 30, +faststart (-preview.mp4)
#   3. Optimized full version: H.264 MP4, max 1080p, crf 26, aac 96k, +faststart (.mp4)
# Backs up originals into backup/assets/reels/puretive/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# If node is available, use the cross-platform node runner which handles all OS/path details
if command -v node >/dev/null 2>&1; then
  echo "Running video optimization via Node.js runner..."
  node "$SCRIPT_DIR/optimize-videos.js"
  exit 0
fi

REELS_DIR="$REPO_ROOT/assets/reels/puretive"
BACKUP_DIR="$REPO_ROOT/backup/assets/reels/puretive"

mkdir -p "$BACKUP_DIR"

command -v ffmpeg >/dev/null 2>&1 || { echo >&2 "ffmpeg is required but not installed. Aborting."; exit 1; }

find "$REELS_DIR" -type f \( -name "*.mp4" -o -name "*.mov" \) ! -name "*-preview.mp4" | while read -r video; do
  rel="${video#$REELS_DIR/}"
  dir="$(dirname "$video")"
  rel_dir="$(dirname "$rel")"
  base="$(basename "$video")"
  stem="${base%.*}"

  # Backup
  mkdir -p "$BACKUP_DIR/$rel_dir"
  if [ ! -f "$BACKUP_DIR/$rel" ]; then
    echo "[BACKUP] Backing up $rel"
    cp "$video" "$BACKUP_DIR/$rel"
  fi

  poster="$dir/$stem.webp"
  preview="$dir/$stem-preview.mp4"
  opt_mp4="$dir/$stem.mp4"

  # 1. Poster
  if [ ! -f "$poster" ]; then
    echo "[POSTER] Creating $poster"
    ffmpeg -y -ss 1 -i "$video" -vframes 1 -vf "scale=480:-1" -c:v libwebp -quality 80 "$poster"
  fi

  # 2. Preview
  if [ ! -f "$preview" ]; then
    echo "[PREVIEW] Creating $preview"
    ffmpeg -y -ss 1 -t 4 -i "$video" -vf "scale=-2:480" -an -c:v libx264 -pix_fmt yuv420p -crf 30 -movflags +faststart "$preview"
  fi

  # 3. Optimized Full Video
  if [ "${base##*.}" = "mov" ] || [ ! -f "$opt_mp4" ]; then
    echo "[FULL OPT] Encoding $opt_mp4"
    temp="$dir/$stem-temp.mp4"
    ffmpeg -y -i "$video" -vf "scale='min(1080,iw)':-2" -c:v libx264 -pix_fmt yuv420p -crf 26 -c:a aac -b:a 96k -movflags +faststart "$temp"
    if [ "$video" != "$opt_mp4" ] && [ -f "$video" ]; then
      rm -f "$video"
    fi
    mv "$temp" "$opt_mp4"
  fi
done

echo "Video optimization finished successfully."
