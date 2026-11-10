const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const imageMapPath = path.join(repoRoot, 'scripts/image-map.json');
let imageMap = {};
if (fs.existsSync(imageMapPath)) {
  imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'));
}

// Canonical video mapping from old URL / disk name to clean optimized names
const videoMap = {
  // AI Influencers
  '1_%3D%3D%2B%3D%3D_1_.mov': '1_ai-intro_1_.mp4',
  '1_==+==_1_.mov': '1_ai-intro_1_.mp4',
  '20_0928.mov': '20_0928.mp4',
  '21_1005_1_.mov': '21_1005_1_.mp4',
  '22_1005_1_.mov': '22_1005_1_.mp4',
  '23_1006_1_1_.mov': '23_1006_1_1_.mp4',
  '24_1006_2_.mov': '24_1006_2_.mp4',
  '25_1012.mov': '25_1012.mp4',

  // Influencers
  '2_For_the_days_when_your_head_needs_a_little_extra_care_%F0%9F%AB%B6%F0%9F%8F%BC%E2%9C%A8%5Bheadache_roll_on%2C_migraine_roll_on%2C_.mp4':
    '2_For_the_days_when_your_head_needs_a_little_extra_care.mp4',
  '2_For_the_days_when_your_head_needs_a_little_extra_care_🫶🏼✨[headache_roll_on,_migraine_roll_on,_.mp4':
    '2_For_the_days_when_your_head_needs_a_little_extra_care.mp4',

  '3_POV-_Your_head_needs_a_break._%F0%9F%92%99Roll_on._Breathe._Reset._%F0%9F%8C%BF_%23ADShop_Migraine_Ease_Roll-On_%E2%80%94_comm.mp4':
    '3_POV-Your_head_needs_a_break_Roll_on_Breathe_Reset.mp4',
  '3_POV-_Your_head_needs_a_break._💙Roll_on._Breathe._Reset._🌿_#ADShop_Migraine_Ease_Roll-On_—_comm.mp4':
    '3_POV-Your_head_needs_a_break_Roll_on_Breathe_Reset.mp4'
};

function getSafeVideoNames(rawSrc) {
  // Extract folder and file
  const match = rawSrc.match(/assets\/reels\/puretive\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const subfolder = match[1];
  const oldFilename = match[2];
  const decodedFilename = decodeURIComponent(oldFilename);

  let cleanFilename = videoMap[oldFilename] || videoMap[decodedFilename] || oldFilename;
  if (cleanFilename.endsWith('.mov')) {
    cleanFilename = cleanFilename.replace(/\.mov$/i, '.mp4');
  }

  const stem = cleanFilename.replace(/\.(mp4|mov)$/i, '');
  const prefix = `../../assets/reels/puretive/${subfolder}/`;

  return {
    fullSrc: prefix + cleanFilename,
    previewSrc: prefix + stem + '-preview.mp4',
    posterSrc: prefix + stem + '.webp',
    stem
  };
}

// Function to update an HTML file
function updateHtmlFile(filePath) {
  console.log(`\n================ Processing ${filePath} ================`);
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Update <style id="puretive-reels-styles">
  const newStyles = `
  /* REELS SECTION STYLING */
  .reels-block {
    margin-top: 52px;
    padding-top: 40px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .reels-block-first {
    margin-top: 20px;
    padding-top: 0;
    border-top: none;
  }
  .reels-desc {
    color: rgba(255, 255, 255, 0.65);
    font-size: 15px;
    line-height: 1.6;
    max-width: 860px;
    margin: 12px 0 26px 0;
  }
  /* GRID */
  .reels-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
  }
  @media (max-width: 1200px) {
    .reels-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }
  @media (max-width: 768px) {
    .reels-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }
  @media (max-width: 480px) {
    .reels-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
  /* REEL CARD - MINIMALIST CLEAN PLAYER */
  .reel-card {
    background: #181818;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
  }
  .reel-card:hover {
    transform: translateY(-4px);
    border-color: rgba(130, 255, 31, 0.5);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
  }
  .reel-video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 9 / 16;
    background: #0d0d0d;
    overflow: hidden;
    cursor: pointer;
  }
  .reel-poster {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    z-index: 1;
    transition: opacity 0.35s ease;
    background: #121212;
  }
  .reel-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    background: #000;
    z-index: 2;
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;
  }
  .reel-video.is-playing {
    opacity: 1;
  }
  .reel-overlay-scrim {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.6) 100%);
    transition: opacity 0.2s ease;
  }
  /* CONTROLS: ONLY PAUSE/PLAY & MUTE/UNMUTE BUTTONS */
  .reel-card-controls {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    gap: 8px;
    z-index: 3;
  }
  .reel-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }
  .reel-btn:hover {
    background: #82ff1f;
    color: #000000;
    border-color: #82ff1f;
    transform: scale(1.1);
  }
  .reel-btn svg {
    display: block;
  }
  /* SHOW MORE & PROGRESSIVE REVEAL */
  .reel-card.reel-card-hidden {
    display: none !important;
  }
  .reels-show-more-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 36px;
    margin-bottom: 8px;
    width: 100%;
  }
  .reels-show-more-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #ffffff;
    border-radius: 100px;
    padding: 13px 30px;
    font-family: "Figtree", sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reels-show-more-btn:hover {
    background: #82ff1f;
    color: #111111;
    border-color: #82ff1f;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(130, 255, 31, 0.3);
  }
  .reels-show-more-btn svg {
    transition: transform 0.25s ease;
  }
  .reels-show-more-btn:hover svg {
    transform: translateY(2px);
  }`;

  html = html.replace(/<style id="puretive-reels-styles">[\s\S]*?<\/style>/i,
    `<style id="puretive-reels-styles">${newStyles}\n  </style>`);

  // 2. Parse and update each reels section
  const sectionRegex = /(<section[^>]*class=["'][^"']*reels-block[^"']*["'][^>]*>)([\s\S]*?)(<\/section>)/gi;

  html = html.replace(sectionRegex, (match, openTag, content, closeTag) => {
    // Find all reel-cards in this section
    const cardRegex = /<div class="reel-card"[^>]*data-video-src="([^"]+)"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
    const cards = [];
    let cMatch;
    while ((cMatch = cardRegex.exec(content)) !== null) {
      cards.push({ full: cMatch[0], rawSrc: cMatch[1] });
    }

    console.log(`Found section with ${cards.length} cards`);
    if (cards.length === 0) return match;

    let updatedContent = content;

    // Update each card
    cards.forEach((cardObj, idx) => {
      const safe = getSafeVideoNames(cardObj.rawSrc);
      if (!safe) return;

      const isHidden = idx >= 6;
      const hiddenClass = isHidden ? ' reel-card-hidden' : '';
      const hiddenStyle = isHidden ? ' style="display: none;"' : '';

      const newCardHtml = `
            <div class="reel-card${hiddenClass}"${hiddenStyle} data-video-src="${safe.fullSrc}" data-preview-src="${safe.previewSrc}" data-poster-src="${safe.posterSrc}">
              <div class="reel-video-wrapper">
                <img class="reel-poster" src="${safe.posterSrc}" alt="Puretive Reel" loading="lazy" decoding="async">
                <video class="reel-video" preload="none" loop playsinline muted></video>
                <div class="reel-overlay-scrim"></div>
                
                <!-- Bottom controls: Mute and Pause/Play buttons -->
                <div class="reel-card-controls">
                  <button type="button" class="reel-btn reel-audio-btn" aria-label="Toggle Audio" title="Mute/Unmute">
                    <svg class="icon-mute" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                    <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </button>
                  <button type="button" class="reel-btn reel-play-btn" aria-label="Play/Pause" title="Play/Pause">
                    <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="icon-pause" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>`.trim();

      updatedContent = updatedContent.replace(cardObj.full, newCardHtml);
    });

    // Remove any previous show-more button
    updatedContent = updatedContent.replace(/<div class="reels-show-more-wrap">[\s\S]*?<\/div>/gi, '');

    // If more than 6 cards, append Show More button right after the reels-grid closing div
    if (cards.length > 6) {
      const remaining = cards.length - 6;
      const showMoreHtml = `
          <div class="reels-show-more-wrap">
            <button type="button" class="reels-show-more-btn" aria-expanded="false">
              <span>Show more (${remaining} more)</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>`;
      // Find the closing </div> of reels-grid
      const gridCloseIdx = updatedContent.lastIndexOf('</div>');
      if (gridCloseIdx !== -1) {
        updatedContent = updatedContent.slice(0, gridCloseIdx + 6) + showMoreHtml + updatedContent.slice(gridCloseIdx + 6);
      }
    }

    return openTag + updatedContent + closeTag;
  });

  // 3. Update <script id="puretive-reels-script">
  const newReelsScript = `
  document.addEventListener('DOMContentLoaded', function () {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const maxActiveMobile = 3;
    const activeMobileSet = new Set();
    const visibleCards = new Set();

    function updatePlayIcon(card, isPlaying) {
      const playIcon = card.querySelector('.icon-play');
      const pauseIcon = card.querySelector('.icon-pause');
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
    }

    function updateMuteIcon(card, isMuted) {
      const muteIcon = card.querySelector('.icon-mute');
      const unmuteIcon = card.querySelector('.icon-unmute');
      if (muteIcon && unmuteIcon) {
        muteIcon.style.display = isMuted ? 'block' : 'none';
        unmuteIcon.style.display = isMuted ? 'none' : 'block';
      }
    }

    function playCardPreview(card) {
      const video = card.querySelector('.reel-video');
      if (!video) return;
      if (!video.src && card.dataset.previewSrc) {
        video.src = card.dataset.previewSrc;
        video.load();
      }
      video.muted = true;
      video.play().then(function() {
        video.classList.add('is-playing');
        updatePlayIcon(card, true);
      }).catch(function() {});
    }

    function pauseCardPreview(card) {
      const video = card.querySelector('.reel-video');
      if (!video) return;
      video.pause();
      video.classList.remove('is-playing');
      updatePlayIcon(card, false);
    }

    function refreshMobileActive() {
      if (!isTouch) return;
      // Start previews for visible cards up to limit
      for (const card of visibleCards) {
        if (activeMobileSet.size >= maxActiveMobile) break;
        if (!activeMobileSet.has(card)) {
          activeMobileSet.add(card);
          playCardPreview(card);
        }
      }
    }

    // IntersectionObserver for Mobile / Touch
    const mobileObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const card = entry.target;
        if (entry.isIntersecting) {
          visibleCards.add(card);
          if (activeMobileSet.size < maxActiveMobile) {
            activeMobileSet.add(card);
            playCardPreview(card);
          }
        } else {
          visibleCards.delete(card);
          if (activeMobileSet.has(card)) {
            activeMobileSet.delete(card);
            pauseCardPreview(card);
            refreshMobileActive();
          }
        }
      });
    }, { threshold: 0.35 });

    function initCard(card) {
      if (card._initialized) return;
      card._initialized = true;

      const video = card.querySelector('.reel-video');
      const audioBtn = card.querySelector('.reel-audio-btn');
      const playBtn = card.querySelector('.reel-play-btn');

      if (!isTouch) {
        // Desktop: Hover triggers preview
        card.addEventListener('mouseenter', function () {
          playCardPreview(card);
        });
        card.addEventListener('mouseleave', function () {
          pauseCardPreview(card);
        });
      } else {
        // Mobile / Touch: Observe for viewport entry
        if (!card.classList.contains('reel-card-hidden')) {
          mobileObserver.observe(card);
        }
      }

      // Audio Toggle Button
      if (audioBtn && video) {
        audioBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          video.muted = !video.muted;
          updateMuteIcon(card, video.muted);
        });
      }

      // Play/Pause Button
      if (playBtn && video) {
        playBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (video.paused) {
            playCardPreview(card);
          } else {
            pauseCardPreview(card);
          }
        });
      }

      // Clicking card opens full lightbox
      card.addEventListener('click', function (e) {
        if (e.target.closest('.reel-btn')) return;
        if (window.openCreativeLightboxForCard) {
          window.openCreativeLightboxForCard(card);
        }
      });
    }

    document.querySelectorAll('.reel-card').forEach(initCard);

    // Show More Buttons
    document.querySelectorAll('.reels-show-more-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const section = btn.closest('.reels-block');
        if (!section) return;
        const hiddenCards = section.querySelectorAll('.reel-card.reel-card-hidden');
        hiddenCards.forEach(function (c) {
          c.classList.remove('reel-card-hidden');
          c.style.display = '';
          initCard(c);
          if (isTouch) mobileObserver.observe(c);
        });
        btn.parentElement.remove();
        if (window.refreshCreativeLightbox) {
          window.refreshCreativeLightbox();
        }
      });
    });
  });`;

  html = html.replace(/<script id="puretive-reels-script">[\s\S]*?<\/script>/i,
    `<script id="puretive-reels-script">${newReelsScript}\n  </script>`);

  // 4. Update <script id="lightbox-script"> so it handles data-video-src and exposes helper
  const newLightboxScript = `
(function() {
  if (window.__lbInitialized) return;
  window.__lbInitialized = true;

  var lb        = document.getElementById('creative-lightbox');
  var lbVideo   = document.getElementById('lb-video');
  var lbImage   = document.getElementById('lb-image');
  var lbClose   = document.getElementById('lb-close');
  var lbPrev    = document.getElementById('lb-prev');
  var lbNext    = document.getElementById('lb-next');
  var lbCounter = document.getElementById('lb-counter');
  var backdrop  = document.getElementById('lb-backdrop');

  var items = [];
  var currentIdx = -1;

  function collectItems() {
    items = [];
    // Reel cards (video) - only visible/unhidden
    document.querySelectorAll('.reel-card:not(.reel-card-hidden)').forEach(function(card) {
      var src = card.dataset.videoSrc || '';
      if (!src) {
        var source = card.querySelector('source');
        var video  = card.querySelector('video');
        src = (source && (source.src || source.getAttribute('src'))) || (video && (video.src || video.getAttribute('src'))) || '';
      }
      if (src) items.push({ type: 'video', src: src, card: card });
    });
    // Image cards (totale)
    document.querySelectorAll('.totale-media-card').forEach(function(card) {
      var img = card.querySelector('img');
      var src = img ? (img.currentSrc || img.src || img.getAttribute('src')) : '';
      if (src) items.push({ type: 'image', src: src, card: card });
    });
    // Puretive post cards (image)
    document.querySelectorAll('.puretive-post-card img').forEach(function(img) {
      var src = img.currentSrc || img.src || img.getAttribute('src');
      var card = img.closest('.puretive-post-card');
      if (src && card) items.push({ type: 'image', src: src, card: card });
    });
  }

  function openLightbox(idx) {
    if (idx < 0 || idx >= items.length) return;
    currentIdx = idx;
    var item = items[idx];

    lbVideo.classList.remove('lb-active');
    lbImage.classList.remove('lb-active');
    lbVideo.pause();
    lbVideo.src = '';
    lbImage.src = '';

    if (item.type === 'video') {
      lbVideo.src = item.src;
      lbVideo.controls = true;
      lbVideo.muted = false;
      lbVideo.classList.add('lb-active');
      lbVideo.load();
      lbVideo.play().catch(function() {});
    } else {
      lbImage.src = item.src;
      lbImage.classList.add('lb-active');
    }

    // Pause the inline card preview video
    if (item.card) {
      var inlineVid = item.card.querySelector('video');
      if (inlineVid && !inlineVid.paused) {
        inlineVid.pause();
        inlineVid.classList.remove('is-playing');
      }
    }

    lbCounter.textContent = (idx + 1) + ' / ' + items.length;
    lb.classList.add('lb-open');
    lb.style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lbVideo.pause();
    lbVideo.src = '';
    lbImage.src = '';
    lbVideo.classList.remove('lb-active');
    lbImage.classList.remove('lb-active');
    lb.classList.remove('lb-open');
    document.body.style.overflow = '';
    currentIdx = -1;
  }

  function showNext() {
    if (items.length === 0) return;
    openLightbox((currentIdx + 1) % items.length);
  }

  function showPrev() {
    if (items.length === 0) return;
    openLightbox((currentIdx - 1 + items.length) % items.length);
  }

  window.openCreativeLightboxForCard = function(card) {
    collectItems();
    var idx = items.findIndex(function(it) { return it.card === card; });
    if (idx >= 0) openLightbox(idx);
  };

  window.refreshCreativeLightbox = collectItems;

  // Totale card click listeners
  document.querySelectorAll('.totale-media-card').forEach(function(card) {
    card.addEventListener('click', function() {
      collectItems();
      var idx = items.findIndex(function(it) { return it.card === card; });
      if (idx >= 0) openLightbox(idx);
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  backdrop.addEventListener('click', closeLightbox);
  lbNext.addEventListener('click', function(e) { e.stopPropagation(); showNext(); });
  lbPrev.addEventListener('click', function(e) { e.stopPropagation(); showPrev(); });

  document.addEventListener('keydown', function(e) {
    if (!lb.classList.contains('lb-open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowRight')  showNext();
    if (e.key === 'ArrowLeft')   showPrev();
  });

  collectItems();
})();`;

  html = html.replace(/<script id="lightbox-script">[\s\S]*?<\/script>/i,
    `<script id="lightbox-script">${newLightboxScript}\n  </script>`);

  // 5. Update Campaign Images (convert .png/.jpeg/.jpg references to .webp, add loading, decoding, width, height)
  // Match <img src="../../assets/images/puretive-campaigns/..." ...>
  const imgRegex = /<img\s+([^>]*?)src=["'](\.\.\/\.\.\/assets\/images\/puretive-campaigns\/([^"']+))["']([^>]*?)>/gi;
  html = html.replace(imgRegex, (match, before, fullSrc, relPath, after) => {
    const info = imageMap[relPath] || imageMap[relPath.replace(/\.(png|jpe?g)$/i, '.webp')];
    let newSrc = fullSrc.replace(/\.(png|jpe?g)$/i, '.webp');
    let widthAttr = '';
    let heightAttr = '';
    if (info && info.width && info.height) {
      widthAttr = ` width="${info.width}"`;
      heightAttr = ` height="${info.height}"`;
    }

    // Combine attributes, ensuring loading="lazy" decoding="async"
    let attrs = `${before} src="${newSrc}"${after}`.replace(/\s+/g, ' ');
    if (!attrs.includes('loading=')) attrs += ' loading="lazy"';
    if (!attrs.includes('decoding=')) attrs += ' decoding="async"';
    if (!attrs.includes('width=') && widthAttr) attrs += widthAttr;
    if (!attrs.includes('height=') && heightAttr) attrs += heightAttr;

    return `<img ${attrs.trim()}>`;
  });

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

// Update both mirrored files
['work/puretive/index.html', 'projects/puretive/index.html'].forEach(f => {
  const p = path.join(repoRoot, f);
  if (fs.existsSync(p)) {
    updateHtmlFile(p);
  }
});
