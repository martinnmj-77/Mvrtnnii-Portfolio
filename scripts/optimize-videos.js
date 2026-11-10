const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const backupDir = path.join(repoRoot, 'backup/assets/reels/puretive');
const reelsDir = path.join(repoRoot, 'assets/reels/puretive');

// Locate ffmpeg
function getFfmpegPath() {
  const envPath = 'ffmpeg';
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return envPath;
  } catch (e) {
    // Check known winget location
    const wingetPkg = path.join(
      process.env.LOCALAPPDATA || 'C:\\Users\\jomon123\\AppData\\Local',
      'Microsoft/WinGet/Packages'
    );
    if (fs.existsSync(wingetPkg)) {
      const candidates = fs.readdirSync(wingetPkg).filter(d => d.includes('Gyan.FFmpeg'));
      for (const cand of candidates) {
        const binDir = path.join(wingetPkg, cand);
        const findExe = (dir) => {
          const files = fs.readdirSync(dir, { withFileTypes: true });
          for (const f of files) {
            const full = path.join(dir, f.name);
            if (f.isDirectory()) {
              const res = findExe(full);
              if (res) return res;
            } else if (f.name.toLowerCase() === 'ffmpeg.exe') {
              return full;
            }
          }
          return null;
        };
        const found = findExe(binDir);
        if (found) return found;
      }
    }
    throw new Error('ffmpeg not found. Please install ffmpeg or add to PATH.');
  }
}

const ffmpeg = getFfmpegPath();
console.log('Using ffmpeg binary:', ffmpeg);

// Safe name mapping for special characters / emojis / URL-encoding
const safeNameMap = {
  // ai-influencers
  '1_==+==_1_.mov': '1_ai-intro_1_.mp4',
  '1_%3D%3D%2B%3D%3D_1_.mov': '1_ai-intro_1_.mp4',

  // influencers
  '2_For_the_days_when_your_head_needs_a_little_extra_care_🫶🏼✨[headache_roll_on,_migraine_roll_on,_.mp4':
    '2_For_the_days_when_your_head_needs_a_little_extra_care.mp4',
  '2_For_the_days_when_your_head_needs_a_little_extra_care_%F0%9F%AB%B6%F0%9F%8F%BC%E2%9C%A8%5Bheadache_roll_on%2C_migraine_roll_on%2C_.mp4':
    '2_For_the_days_when_your_head_needs_a_little_extra_care.mp4',

  '3_POV-_Your_head_needs_a_break._💙Roll_on._Breathe._Reset._🌿_#ADShop_Migraine_Ease_Roll-On_—_comm.mp4':
    '3_POV-Your_head_needs_a_break_Roll_on_Breathe_Reset.mp4',
  '3_POV-_Your_head_needs_a_break._%F0%9F%92%99Roll_on._Breathe._Reset._%F0%9F%8C%BF_%23ADShop_Migraine_Ease_Roll-On_%E2%80%94_comm.mp4':
    '3_POV-Your_head_needs_a_break_Roll_on_Breathe_Reset.mp4',
};

// Also map .mov files to .mp4 for the final optimized video
const movFiles = [
  '20_0928.mov',
  '21_1005_1_.mov',
  '22_1005_1_.mov',
  '23_1006_1_1_.mov',
  '24_1006_2_.mov',
  '25_1012.mov'
];
movFiles.forEach(mov => {
  const mp4 = mov.replace(/\.mov$/i, '.mp4');
  safeNameMap[mov] = mp4;
});

function getAllVideoFiles(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllVideoFiles(full, list);
    } else if (/\.(mp4|mov)$/i.test(entry.name) && !entry.name.endsWith('-preview.mp4')) {
      list.push(full);
    }
  }
  return list;
}

// 1. First ensure backup directory exists
fs.mkdirSync(backupDir, { recursive: true });

const originalVideos = getAllVideoFiles(reelsDir);
console.log(`Found ${originalVideos.length} original video files to process.`);

const stats = {
  originalBytes: 0,
  optimizedBytes: 0,
  previewBytes: 0,
  posterBytes: 0,
  processedCount: 0,
};

for (const videoPath of originalVideos) {
  const rel = path.relative(reelsDir, videoPath);
  const subfolder = path.dirname(rel);
  const origName = path.basename(videoPath);
  const origStat = fs.statSync(videoPath);
  stats.originalBytes += origStat.size;

  // Destination folder in backup
  const targetBackupDir = path.join(backupDir, subfolder);
  fs.mkdirSync(targetBackupDir, { recursive: true });
  const backupFilePath = path.join(targetBackupDir, origName);

  // Backup original if not already backed up
  if (!fs.existsSync(backupFilePath)) {
    console.log(`[BACKUP] Backing up ${rel} -> backup/assets/reels/puretive/${rel}`);
    fs.copyFileSync(videoPath, backupFilePath);
  }

  // Determine canonical safe base name and final MP4 name
  const safeFullName = safeNameMap[origName] || (origName.endsWith('.mov') ? origName.replace(/\.mov$/i, '.mp4') : origName);
  const baseName = safeFullName.replace(/\.(mp4|mov)$/i, '');

  const folderDir = path.dirname(videoPath);
  const finalFullMp4Path = path.join(folderDir, `${baseName}.mp4`);
  const previewPath = path.join(folderDir, `${baseName}-preview.mp4`);
  const posterPath = path.join(folderDir, `${baseName}.webp`);

  console.log(`\n--- Processing: ${rel} ---> Base: ${baseName} ---`);

  // Source for processing: use original backup so we always have clean source
  const sourceFile = backupFilePath;

  // A. Generate Poster: single frame at 1s, 480px wide, saved as .webp with the same name
  if (fs.existsSync(posterPath)) {
    console.log(`  [POSTER] Skipped (already exists): ${path.basename(posterPath)}`);
  } else {
    console.log(`  [POSTER] Generating ${path.basename(posterPath)}...`);
    const cmd = `"${ffmpeg}" -y -ss 1 -i "${sourceFile}" -vframes 1 -vf "scale=480:-1" -c:v libwebp -quality 80 "${posterPath}"`;
    execSync(cmd, { stdio: 'inherit' });
  }
  if (fs.existsSync(posterPath)) {
    stats.posterBytes += fs.statSync(posterPath).size;
  }

  // B. Generate Preview: first 4 seconds starting at 1s, 480px tall, no audio, H.264, crf 30, with -movflags +faststart
  if (fs.existsSync(previewPath)) {
    console.log(`  [PREVIEW] Skipped (already exists): ${path.basename(previewPath)}`);
  } else {
    console.log(`  [PREVIEW] Generating ${path.basename(previewPath)}...`);
    // scale=-2:480 ensures height=480 and width is even number
    const cmd = `"${ffmpeg}" -y -ss 1 -t 4 -i "${sourceFile}" -vf "scale=-2:480" -an -c:v libx264 -pix_fmt yuv420p -crf 30 -movflags +faststart "${previewPath}"`;
    execSync(cmd, { stdio: 'inherit' });
  }
  if (fs.existsSync(previewPath)) {
    stats.previewBytes += fs.statSync(previewPath).size;
  }

  // C. Optimized Full Version: convert .mov and heavy .mp4 files to H.264 MP4, max 1080p, crf 26, aac 96k, +faststart
  // If destination is different from source (e.g. was .mov or renamed) OR file size in backup is heavy / hevc,
  // we encode to a temp file and replace finalFullMp4Path.
  const tempOptimizedPath = path.join(folderDir, `${baseName}-opt-temp.mp4`);

  // Check if finalFullMp4Path is already optimized
  let needsOptimization = true;
  if (fs.existsSync(finalFullMp4Path) && finalFullMp4Path !== sourceFile) {
    // File was already converted from .mov or renamed
    needsOptimization = false;
    console.log(`  [FULL MP4] Skipped (already optimized): ${path.basename(finalFullMp4Path)}`);
  }

  if (needsOptimization) {
    console.log(`  [FULL MP4] Encoding optimized full video: ${path.basename(finalFullMp4Path)}...`);
    // scale='min(1080,iw)':-2 maintains aspect ratio, caps width at 1080 if wider, ensures even height
    const cmd = `"${ffmpeg}" -y -i "${sourceFile}" -vf "scale='min(1080,iw)':-2" -c:v libx264 -pix_fmt yuv420p -crf 26 -c:a aac -b:a 96k -movflags +faststart "${tempOptimizedPath}"`;
    execSync(cmd, { stdio: 'inherit' });

    // If source file was renamed or original was .mov, we can safely remove the old file in reelsDir
    // since the original is safely preserved in backupDir!
    if (videoPath !== finalFullMp4Path && fs.existsSync(videoPath)) {
      console.log(`  [CLEANUP] Removing unoptimized/old-named file from active directory: ${path.basename(videoPath)}`);
      fs.unlinkSync(videoPath);
    }

    // Move temp to final
    if (fs.existsSync(finalFullMp4Path)) {
      fs.unlinkSync(finalFullMp4Path);
    }
    fs.renameSync(tempOptimizedPath, finalFullMp4Path);
  }

  if (fs.existsSync(finalFullMp4Path)) {
    stats.optimizedBytes += fs.statSync(finalFullMp4Path).size;
  }
  stats.processedCount++;
}

console.log('\n========================================');
console.log('VIDEO OPTIMIZATION COMPLETE!');
console.log(`Processed videos: ${stats.processedCount}`);
console.log(`Original total size:   ${(stats.originalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Optimized full videos: ${(stats.optimizedBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Previews total:        ${(stats.previewBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Posters total:         ${(stats.posterBytes / 1024 / 1024).toFixed(2)} MB`);
const totalNew = stats.optimizedBytes + stats.previewBytes + stats.posterBytes;
console.log(`Total new video assets: ${(totalNew / 1024 / 1024).toFixed(2)} MB`);
console.log(`Savings on full video:  ${((stats.originalBytes - stats.optimizedBytes) / 1024 / 1024).toFixed(2)} MB (${((1 - stats.optimizedBytes / stats.originalBytes) * 100).toFixed(1)}% reduction)`);
console.log('========================================');
