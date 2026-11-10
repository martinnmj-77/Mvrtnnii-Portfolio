const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const campaignsDir = path.join(repoRoot, 'assets/images/puretive-campaigns');
const backupDir = path.join(repoRoot, 'backup/assets/images/puretive-campaigns');

// Locate ffmpeg and ffprobe
function getBinPath(binName) {
  try {
    execSync(`${binName} -version`, { stdio: 'ignore' });
    return binName;
  } catch (e) {
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
            } else if (f.name.toLowerCase() === `${binName.toLowerCase()}.exe`) {
              return full;
            }
          }
          return null;
        };
        const found = findExe(binDir);
        if (found) return found;
      }
    }
    throw new Error(`${binName} not found.`);
  }
}

const ffmpeg = getBinPath('ffmpeg');
const ffprobe = getBinPath('ffprobe');

function getAllFiles(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, list);
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      list.push(full);
    }
  }
  return list;
}

fs.mkdirSync(backupDir, { recursive: true });

const images = getAllFiles(campaignsDir);
console.log(`Found ${images.length} images in puretive-campaigns to process.`);

const mapping = {};
let origTotalBytes = 0;
let newTotalBytes = 0;
let processedCount = 0;

for (const imgPath of images) {
  const rel = path.relative(campaignsDir, imgPath).replace(/\\/g, '/');
  const subfolder = path.dirname(imgPath);
  const baseName = path.basename(imgPath, path.extname(imgPath));
  const origExt = path.extname(imgPath).toLowerCase();
  const origStat = fs.statSync(imgPath);
  origTotalBytes += origStat.size;

  const backupSub = path.join(backupDir, path.dirname(rel));
  fs.mkdirSync(backupSub, { recursive: true });
  const backupFilePath = path.join(backupSub, path.basename(imgPath));

  if (!fs.existsSync(backupFilePath)) {
    fs.copyFileSync(imgPath, backupFilePath);
  }

  const webpPath = path.join(subfolder, `${baseName}.webp`);
  const webpRel = path.relative(campaignsDir, webpPath).replace(/\\/g, '/');

  // Convert to WebP: quality ~80, max 1400px wide: scale='min(1400,iw)':-1
  if (!fs.existsSync(webpPath)) {
    console.log(`[CONVERT] ${rel} -> ${webpRel}`);
    const cmd = `"${ffmpeg}" -y -i "${backupFilePath}" -vf "scale='min(1400,iw)':-1" -c:v libwebp -quality 80 "${webpPath}"`;
    execSync(cmd, { stdio: 'ignore' });
  } else {
    console.log(`[SKIP] Already converted: ${webpRel}`);
  }

  // Measure dimensions of the generated WebP
  let width = 0;
  let height = 0;
  try {
    const probeCmd = `"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${webpPath}"`;
    const dim = execSync(probeCmd, { encoding: 'utf8' }).trim();
    const parts = dim.split('x');
    width = parseInt(parts[0], 10) || 0;
    height = parseInt(parts[1], 10) || 0;
  } catch (e) {
    console.error(`Failed to probe ${webpPath}:`, e.message);
  }

  const webpStat = fs.statSync(webpPath);
  newTotalBytes += webpStat.size;

  mapping[rel] = {
    originalRel: rel,
    webpRel: webpRel,
    originalBytes: origStat.size,
    webpBytes: webpStat.size,
    width,
    height
  };

  // Safe removal of original from active images folder (it is safely kept in backup folder)
  if (imgPath !== webpPath && fs.existsSync(imgPath)) {
    fs.unlinkSync(imgPath);
  }

  processedCount++;
}

// Write mapping to JSON for HTML updater
const mappingPath = path.join(repoRoot, 'scripts/image-map.json');
fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');

console.log('\n========================================');
console.log('IMAGE OPTIMIZATION COMPLETE!');
console.log(`Images processed: ${processedCount}`);
console.log(`Original size: ${(origTotalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`WebP size:     ${(newTotalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Savings:       ${((origTotalBytes - newTotalBytes) / 1024 / 1024).toFixed(2)} MB (${((1 - newTotalBytes / origTotalBytes) * 100).toFixed(1)}% reduction)`);
console.log(`Saved mapping to ${mappingPath}`);
console.log('========================================');
