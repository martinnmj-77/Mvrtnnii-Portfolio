const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const backupDir = path.join(repoRoot, 'backup/assets/reels/puretive');
const reelsDir = path.join(repoRoot, 'assets/reels/puretive');
const ffmpeg = 'C:\\Users\\jomon123\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const ffprobe = 'C:\\Users\\jomon123\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe';

function getAllVideos(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllVideos(full, list);
    } else if (entry.name.endsWith('.mp4') && !entry.name.endsWith('-preview.mp4')) {
      list.push(full);
    }
  }
  return list;
}

const videos = getAllVideos(reelsDir);
console.log(`Checking ${videos.length} videos for HEVC / heavy MP4 optimization...`);

let convertedCount = 0;
for (const vid of videos) {
  const rel = path.relative(reelsDir, vid);
  const sizeMB = fs.statSync(vid).size / (1024 * 1024);

  // Probe codec
  let vcodec = '';
  try {
    const probe = execSync(`"${ffprobe}" -v quiet -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${vid}"`, { encoding: 'utf8' }).trim();
    vcodec = probe.toLowerCase();
  } catch (e) {
    console.error(`Probe error on ${rel}:`, e.message);
  }

  // If codec is HEVC (or size > 10MB and not optimized), optimize it!
  if (vcodec === 'hevc' || vcodec === 'h265' || (sizeMB > 12 && vcodec !== 'h264')) {
    console.log(`[OPTIMIZE FULL] ${rel} (${sizeMB.toFixed(1)} MB, ${vcodec}) -> H.264 CRF 26...`);
    const tempOut = vid.replace(/\.mp4$/, '-opt-temp.mp4');

    // Ensure backed up first
    const backupFile = path.join(backupDir, rel);
    if (!fs.existsSync(backupFile)) {
      fs.mkdirSync(path.dirname(backupFile), { recursive: true });
      fs.copyFileSync(vid, backupFile);
    }

    const cmd = `"${ffmpeg}" -y -i "${backupFile}" -vf "scale='min(1080,iw)':-2" -c:v libx264 -preset fast -pix_fmt yuv420p -crf 26 -c:a aac -b:a 96k -movflags +faststart "${tempOut}"`;
    execSync(cmd, { stdio: 'ignore' });

    const newSizeMB = fs.statSync(tempOut).size / (1024 * 1024);
    fs.unlinkSync(vid);
    fs.renameSync(tempOut, vid);
    console.log(`  -> Finished ${rel}: ${sizeMB.toFixed(1)} MB -> ${newSizeMB.toFixed(1)} MB (${((1 - newSizeMB / sizeMB) * 100).toFixed(1)}% saved)`);
    convertedCount++;
  } else {
    console.log(`[SKIP] Already H.264: ${rel} (${sizeMB.toFixed(1)} MB, ${vcodec})`);
  }
}

console.log(`\nCompleted optimizing ${convertedCount} full videos to H.264 MP4!`);
