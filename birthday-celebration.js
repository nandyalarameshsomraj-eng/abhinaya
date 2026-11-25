/**
 * Pastel-Pink Coquette / Y2K Birthday Celebration Module
 * Drop-in Vanilla JS controller — works standalone or integrated into any site.
 */
(function () {
  'use strict';

  const NO_BUTTON_LINES = [
    'Nice try!',
    'Wrong button 😉',
    'Not an option!',
    'Try again, cutie 🎀',
    'Only Yes works 💖'
  ];

  // =========================================================================
  // SWAP YOUR OWN POLAROID PHOTOS HERE (optional JS list if you prefer
  // managing images from JS instead of editing the <img> tags in index.html):
  // e.g. './photos/pic1.jpg', './photos/pic2.jpg', './photos/pic3.jpg', './photos/pic4.jpg'
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    const triggerBtn = document.getElementById('bday-open-btn');
    const overlay = document.getElementById('bday-overlay');
    const closeBtn = document.getElementById('bday-close-btn');
    const ambientLayer = document.getElementById('bday-ambient-layer');

    const stepPrompt = document.getElementById('bday-step-prompt');
    const stepCake = document.getElementById('bday-step-cake');
    const promptCard = document.getElementById('bday-prompt-card');
    const yesBtn = document.getElementById('bday-yes-btn');
    const noBtn = document.getElementById('bday-no-btn');

    const cakeCard = document.getElementById('bday-cake-card');
    const cakeCanvas = document.getElementById('bday-cake-canvas');
    const cakeHint = document.getElementById('bday-cake-hint');
    const blowBtn = document.getElementById('bday-blow-btn');
    const micBtn = document.getElementById('bday-mic-btn');
    const micStatus = document.getElementById('bday-mic-status');
    const cutBtn = document.getElementById('bday-cut-btn');
    const takeRingBtn = document.getElementById('bday-take-ring-btn');
    const certBtn = document.getElementById('bday-cert-btn');
    const relightBtn = document.getElementById('bday-relight-btn');

    const confettiCanvas = document.getElementById('bday-confetti-canvas');
    const flowerSplashCanvas = document.getElementById('bday-flower-splash-canvas');
    const surpriseAudio = document.getElementById('bday-surprise-audio');
    const musicToggleBtn = document.getElementById('bday-music-toggle');
    const lightbox = document.getElementById('bday-lightbox');
    const lightboxImg = document.getElementById('bday-lightbox-img');
    const lightboxCaption = document.getElementById('bday-lightbox-caption');
    const lightboxClose = document.getElementById('bday-lightbox-close');
    const lightboxPrev = document.getElementById('bday-lightbox-prev');
    const lightboxNext = document.getElementById('bday-lightbox-next');
    if (!overlay || !triggerBtn) return;

    let noTapCount = 0;
    let candlesBlown = false;
    let ambientHeartTimer = null;
    let ambientInitialized = false;

    // Web Audio API mic state
    let audioCtx = null;
    let micStream = null;
    let micAnalyser = null;
    let micRafId = null;
    let blowSustainedFrames = 0;

    // Confetti state
    const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
    let confettiPieces = [];
    let confettiRafId = null;

    // Flower Sticker Splash state (uses assets/lily-sticker.png)
    const splashCtx = flowerSplashCanvas ? flowerSplashCanvas.getContext('2d') : null;
    const lilyStickerImg = new Image();
    let lilyStickerSprite = null;
    let lilyStickerReady = false;
    lilyStickerImg.onload = () => {
      // Pre-render into a 128x128 offscreen canvas for fast frame-rate blitting
      const spriteSize = 128;
      const offscreen = document.createElement('canvas');
      offscreen.width = spriteSize;
      offscreen.height = spriteSize;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(lilyStickerImg, 0, 0, spriteSize, spriteSize);
        lilyStickerSprite = offscreen;
      } else {
        lilyStickerSprite = lilyStickerImg;
      }
      lilyStickerReady = true;
    };
    lilyStickerImg.src = 'assets/lily-sticker.png';

    let flowerSplashes = [];
    let splashGlints = [];
    let flowerSplashRafId = null;
    let flowerSplashTimers = [];
    let wasBgAudioPlaying = false;

    function updateMusicToggleUI(isPlaying) {
      if (!musicToggleBtn) return;
      musicToggleBtn.classList.toggle('is-paused', !isPlaying);
      musicToggleBtn.textContent = isPlaying ? '🎵 Song On' : '🔇 Song Off';
    }

    function playSurpriseSong() {
      const bgAudio = document.getElementById('bg-audio');
      if (bgAudio && !bgAudio.paused) {
        wasBgAudioPlaying = true;
        bgAudio.pause();
        const pin = document.querySelector('.album-player-pin');
        if (pin) {
          pin.classList.remove('playing');
          const statusText = pin.querySelector('.audio-status');
          if (statusText) statusText.textContent = 'Tap to spark the magic ✨';
        }
      } else {
        wasBgAudioPlaying = false;
      }

      if (!surpriseAudio) return;
      surpriseAudio.currentTime = 0;
      const playPromise = surpriseAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => updateMusicToggleUI(true))
          .catch(() => updateMusicToggleUI(false));
      } else {
        updateMusicToggleUI(!surpriseAudio.paused);
      }
    }

    function stopSurpriseSong() {
      if (surpriseAudio) {
        surpriseAudio.pause();
        surpriseAudio.currentTime = 0;
      }
      updateMusicToggleUI(false);

      if (wasBgAudioPlaying) {
        wasBgAudioPlaying = false;
        const bgAudio = document.getElementById('bg-audio');
        if (bgAudio && bgAudio.paused) {
          bgAudio.play().catch(() => {});
          const pin = document.querySelector('.album-player-pin');
          if (pin) {
            pin.classList.add('playing');
            const statusText = pin.querySelector('.audio-status');
            if (statusText) statusText.textContent = 'Playing: Her. 💖';
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 1. Open / Close Overlay & Ambient Hearts / Sparkles
    // -----------------------------------------------------------------------
    function openCelebration() {
      resetFlow();
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      resizeConfettiCanvas();
      startAmbientEffects();
      showStep(stepPrompt);
    }

    function closeCelebration() {
      closeLightbox();
      stopSurpriseSong();
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      stopMicListener();
      stopAmbientEffects();
      if (cake3D) cake3D.setRunning(false);
    }

    function showStep(targetStep) {
      [stepPrompt, stepCake].forEach((step) => {
        if (!step) return;
        step.classList.remove('is-visible');
        step.classList.remove('is-active');
      });

      overlay.scrollTop = 0;
      targetStep.classList.add('is-active');
      if (cake3D) {
        cake3D.setRunning(targetStep === stepCake);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          targetStep.classList.add('is-visible');
        });
      });
    }

    function resetFlow() {
      noTapCount = 0;
      if (noBtn) {
        noBtn.textContent = 'No 🙈';
        noBtn.classList.remove('is-dodging');
        noBtn.style.left = '';
        noBtn.style.top = '';
      }
      resetCandles();
    }

    function startAmbientEffects() {
      if (ambientLayer && !ambientInitialized) {
        ambientInitialized = true;
        // Static twinkling Y2K sparkles
        const sparkleSymbols = ['✦', '✧', '⋆', '✨'];
        for (let i = 0; i < 18; i++) {
          const sp = document.createElement('span');
          sp.className = 'bday-ambient-sparkle';
          sp.textContent = sparkleSymbols[i % sparkleSymbols.length];
          sp.style.left = `${Math.random() * 96 + 2}%`;
          sp.style.top = `${Math.random() * 92 + 4}%`;
          sp.style.fontSize = `${Math.random() * 12 + 10}px`;
          sp.style.animationDuration = `${Math.random() * 2.5 + 2.2}s`;
          sp.style.animationDelay = `${Math.random() * 2}s`;
          ambientLayer.appendChild(sp);
        }
      }

      if (!ambientHeartTimer && ambientLayer) {
        spawnAmbientHeart();
        ambientHeartTimer = setInterval(spawnAmbientHeart, 750);
      }
    }

    function spawnAmbientHeart() {
      if (!ambientLayer || !overlay.classList.contains('is-open')) return;
      const heart = document.createElement('span');
      heart.className = 'bday-ambient-heart';
      heart.textContent = ['♡', '💗', '🩷', '🤍', '✿'][Math.floor(Math.random() * 5)];
      heart.style.left = `${Math.random() * 94 + 3}%`;
      heart.style.fontSize = `${Math.random() * 14 + 13}px`;
      heart.style.setProperty('--drift', `${(Math.random() * 60 - 30).toFixed(0)}px`);
      const duration = Math.random() * 4 + 6.5;
      heart.style.animationDuration = `${duration}s`;
      ambientLayer.appendChild(heart);
      setTimeout(() => heart.remove(), duration * 1000 + 200);
    }

    function stopAmbientEffects() {
      if (ambientHeartTimer) {
        clearInterval(ambientHeartTimer);
        ambientHeartTimer = null;
      }
    }

    // -----------------------------------------------------------------------
    // 2. Step 1: Playful Dodging "No" Button
    // -----------------------------------------------------------------------
    function dodgeNoButton(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!promptCard || !noBtn || !yesBtn) return;

      noBtn.textContent = NO_BUTTON_LINES[noTapCount % NO_BUTTON_LINES.length];
      noTapCount++;

      // Switch to absolute positioning inside the card on first dodge
      if (!noBtn.classList.contains('is-dodging')) {
        const cardRect = promptCard.getBoundingClientRect();
        const btnRect = noBtn.getBoundingClientRect();
        noBtn.style.left = `${btnRect.left - cardRect.left}px`;
        noBtn.style.top = `${btnRect.top - cardRect.top}px`;
        noBtn.classList.add('is-dodging');
      }

      const cardRect = promptCard.getBoundingClientRect();
      const btnW = noBtn.offsetWidth;
      const btnH = noBtn.offsetHeight;
      const yesRect = yesBtn.getBoundingClientRect();

      const yesLocal = {
        left: yesRect.left - cardRect.left - 12,
        top: yesRect.top - cardRect.top - 12,
        right: yesRect.right - cardRect.left + 12,
        bottom: yesRect.bottom - cardRect.top + 12
      };

      const padding = 16;
      const maxX = Math.max(padding, cardRect.width - btnW - padding);
      const maxY = Math.max(padding, cardRect.height - btnH - padding);

      let nextX = padding;
      let nextY = padding;

      for (let attempt = 0; attempt < 24; attempt++) {
        const candX = padding + Math.random() * (maxX - padding);
        const candY = padding + Math.random() * (maxY - padding);

        const overlapsYes =
          candX < yesLocal.right &&
          candX + btnW > yesLocal.left &&
          candY < yesLocal.bottom &&
          candY + btnH > yesLocal.top;

        if (!overlapsYes) {
          nextX = candX;
          nextY = candY;
          break;
        }
      }

      noBtn.style.left = `${nextX}px`;
      noBtn.style.top = `${nextY}px`;
    }

    if (noBtn) {
      noBtn.addEventListener('mouseenter', dodgeNoButton);
      noBtn.addEventListener('touchstart', dodgeNoButton, { passive: false });
      noBtn.addEventListener('click', dodgeNoButton);
    }

    if (yesBtn) {
      yesBtn.addEventListener('click', () => {
        stepPrompt.classList.remove('is-visible');
        setTimeout(() => {
          showStep(stepCake);
          launchConfetti(45, true);
        }, 320);
      });
    }

    // -----------------------------------------------------------------------
    // 3. Realistic 3D Cake, Knife Cut, Slice Separation & 3D Diamond Ring Scene
    // -----------------------------------------------------------------------
    let cakeCutStarted = false;
    let ringTaken = false;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
    const smoothstep = (e0, e1, x) => {
      const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    };
    const easeOutBack = (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    function createCake3DScene(canvas, callbacks) {
      if (!canvas) return null;
      const ctx3d = canvas.getContext('2d');
      if (!ctx3d) return null;

      const W = 420;
      const H = 350;
      const CX = W / 2;
      const CY = 188;
      const FOV = 620;
      const CAM_DIST = 540;

      // Wedge cut angles in front-right quadrant
      const THETA_START = 1.02;
      const THETA_END = 1.66;
      const THETA_MID = (THETA_START + THETA_END) / 2; // ~1.34 rad

      const CANDLE_SPECS = [
        { angle: -2.42, radius: 40, height: 34, stripe: '#FFB6C1', body: '#FFF5F8' },
        { angle: -1.82, radius: 42, height: 39, stripe: '#FFF0F5', body: '#FFD1DC' },
        { angle: -1.18, radius: 41, height: 43, stripe: '#FF8FAB', body: '#F7E3DF' },
        { angle: -0.55, radius: 42, height: 38, stripe: '#FFF0F5', body: '#FFD1DC' },
        { angle:  2.42, radius: 40, height: 34, stripe: '#FFB6C1', body: '#FFF5F8' }
      ];

      // Pre-compute organic frosting drips around both tiers
      const makeDrips = (count, seedShift) => {
        const list = [];
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 + seedShift;
          const len = 10 + ((Math.sin(i * 2.7 + seedShift) + 1) * 0.5) * 18;
          const width = 0.14 + ((Math.cos(i * 1.9) + 1) * 0.5) * 0.06;
          list.push({ ang, len, width });
        }
        return list;
      };
      const bottomDrips = makeDrips(20, 0.15);
      const topDrips = makeDrips(16, 0.35);

      let running = false;
      let rafId = null;
      let lastTime = 0;
      let elapsed = 0;

      // Interactive camera tilt
      let camYaw = -0.06;
      let camPitch = 0.41;
      let targetYaw = -0.06;
      let targetPitch = 0.41;

      // Choreography state
      let phase = 'lit'; // 'lit' | 'blown' | 'cutting' | 'sliding' | 'ring_rising' | 'ring_ready' | 'ring_taken'
      let candleBlowT = [0, 0, 0, 0, 0]; // 0 = lit, 0..1 = blowing/shrinking
      let candlesBlowTarget = [0, 0, 0, 0, 0];
      let cutAnim = 0;       // 0..1 knife cut
      let sliceAnim = 0;     // 0..1 slice slides out onto plate
      let ringRiseAnim = 0;  // 0..1 ring emerges out of cake slice
      let ringTakenAnim = 0; // 0..1 close-up highlight after taking ring
      let ringSpin = 0.3;

      let smokeParticles = [];
      let crumbParticles = [];
      let ringSparkles = [];
      let pointerDown = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let swipeTriggered = false;
      let ringScreenBounds = { x: 0, y: 0, r: 0, visible: false };

      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx3d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();

      function project(x, y, z) {
        const cosY = Math.cos(camYaw);
        const sinY = Math.sin(camYaw);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        const cosP = Math.cos(camPitch);
        const sinP = Math.sin(camPitch);
        const y2 = y * cosP + z1 * sinP;
        const z2 = z1 * cosP - y * sinP;

        const s = FOV / (CAM_DIST - z2);
        return {
          x: CX + x1 * s,
          y: CY + y2 * s,
          z: z2,
          s
        };
      }

      const shadeCache = new WeakMap();
      function getShadeLUT(base) {
        let lut = shadeCache.get(base);
        if (lut) return lut;
        lut = [];
        for (let i = 0; i <= 64; i++) {
          const lightFactor = (i / 64) * 2 - 1;
          const f = Math.max(-0.42, Math.min(0.32, lightFactor * 0.34));
          const r = Math.max(0, Math.min(255, Math.round(base[0] + (f > 0 ? (255 - base[0]) * f : base[0] * f))));
          const g = Math.max(0, Math.min(255, Math.round(base[1] + (f > 0 ? (255 - base[1]) * f : base[1] * f))));
          const b = Math.max(0, Math.min(255, Math.round(base[2] + (f > 0 ? (255 - base[2]) * f : base[2] * f))));
          lut.push(`rgb(${r},${g},${b})`);
        }
        shadeCache.set(base, lut);
        return lut;
      }

      function shadeRGB(base, lightFactor) {
        const lut = getShadeLUT(base);
        const idx = Math.max(0, Math.min(64, Math.round(((lightFactor + 1) * 0.5) * 64)));
        return lut[idx];
      }

      function drawPoly(pts, fillStyle, strokeStyle, lineWidth) {
        if (pts.length < 3) return;
        ctx3d.beginPath();
        ctx3d.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx3d.lineTo(pts[i].x, pts[i].y);
        }
        ctx3d.closePath();
        if (fillStyle) {
          ctx3d.fillStyle = fillStyle;
          ctx3d.fill();
        }
        if (strokeStyle) {
          ctx3d.strokeStyle = strokeStyle;
          ctx3d.lineWidth = lineWidth || 0.75;
          ctx3d.stroke();
        }
      }

      // Draw a 3D cylindrical sector (either main cake with cutout or the extracted slice)
      function drawCakeSectorTier(opts) {
        const {
          radius,
          yTop,
          yBot,
          aStart,
          aEnd,
          steps,
          ox,
          oy,
          oz,
          baseRGB,
          topFill,
          drips,
          showCutFaces,
          pearlsAtY,
          hasBow
        } = opts;

        const faces = [];
        const dAng = (aEnd - aStart) / steps;

        // 1. Curved outer buttercream wall strips (0.006rad overlap avoids subpixel seams without per-strip stroke!)
        for (let i = 0; i < steps; i++) {
          const a0 = aStart + i * dAng;
          const a1 = Math.min(aEnd, a0 + dAng + 0.006);
          const am = (a0 + a1) * 0.5;

          const p0t = project(ox + Math.cos(a0) * radius, oy + yTop, oz + Math.sin(a0) * radius);
          const p1t = project(ox + Math.cos(a1) * radius, oy + yTop, oz + Math.sin(a1) * radius);
          const p1b = project(ox + Math.cos(a1) * radius, oy + yBot, oz + Math.sin(a1) * radius);
          const p0b = project(ox + Math.cos(a0) * radius, oy + yBot, oz + Math.sin(a0) * radius);

          // Directional lighting from upper front-left
          const nx = Math.cos(am);
          const nz = Math.sin(am);
          const diff = nx * -0.52 + nz * 0.85;

          // View-space facing check
          const cosY = Math.cos(camYaw);
          const sinY = Math.sin(camYaw);
          const nzView = nx * sinY + nz * cosY;
          if (nzView < -0.25) continue;

          const zMid = (p0t.z + p1t.z + p1b.z + p0b.z) * 0.25;
          faces.push({
            z: zMid,
            draw: () => {
              drawPoly([p0t, p1t, p1b, p0b], shadeRGB(baseRGB, diff));
            }
          });
        }

        // 2. Exposed 3D cut cross-section walls with multi-layer sponge + strawberry jam + cream!
        if (showCutFaces) {
          const cutAngles = [
            { ang: aStart, isStart: true },
            { ang: aEnd, isStart: false }
          ];

          cutAngles.forEach(({ ang, isStart }) => {
            const c0 = project(ox, oy + yTop, oz);
            const c1 = project(ox + Math.cos(ang) * radius, oy + yTop, oz + Math.sin(ang) * radius);
            const c2 = project(ox + Math.cos(ang) * radius, oy + yBot, oz + Math.sin(ang) * radius);
            const c3 = project(ox, oy + yBot, oz);

            // Normal perpendicular to cut plane
            const nx = isStart ? -Math.sin(ang) : Math.sin(ang);
            const nz = isStart ? Math.cos(ang) : -Math.cos(ang);
            const shade = 0.88 + (nx * -0.35 + nz * 0.6) * 0.12;
            const zMid = (c0.z + c1.z + c2.z + c3.z) * 0.25;

            faces.push({
              z: zMid + 0.5,
              draw: () => {
                // Layered interior bands (0 = top, 1 = bottom)
                const bands = [
                  { t0: 0.00, t1: 0.11, color: '#FFF6F8' }, // Thick cream top cap
                  { t0: 0.11, t1: 0.34, color: '#F9C6D3' }, // Upper pink velvet sponge
                  { t0: 0.34, t1: 0.44, color: '#FFF9FB' }, // Whipped cream layer
                  { t0: 0.44, t1: 0.56, color: '#D94A6E' }, // Glossy strawberry berry compote
                  { t0: 0.56, t1: 0.66, color: '#FFF9FB' }, // Whipped cream layer
                  { t0: 0.66, t1: 0.94, color: '#F7BCCB' }, // Lower pink velvet sponge
                  { t0: 0.94, t1: 1.00, color: '#FFE5EC' }  // Base cream
                ];

                const lerpPt = (a, b, t) => ({
                  x: a.x + (b.x - a.x) * t,
                  y: a.y + (b.y - a.y) * t
                });

                bands.forEach((b) => {
                  const pTL = lerpPt(c0, c3, b.t0);
                  const pTR = lerpPt(c1, c2, b.t0);
                  const pBR = lerpPt(c1, c2, b.t1);
                  const pBL = lerpPt(c0, c3, b.t1);
                  drawPoly([pTL, pTR, pBR, pBL], b.color, b.color, 0.4);
                });

                // Subtle outer buttercream edge strip on the cut face
                const edgeA = lerpPt(c0, c1, 0.91);
                const edgeB = lerpPt(c3, c2, 0.91);
                drawPoly([edgeA, c1, c2, edgeB], '#FFD7E2');

                // Subtle depth shadow near the cake core
                const grad = ctx3d.createLinearGradient(c0.x, c0.y, c1.x, c1.y);
                grad.addColorStop(0, `rgba(89, 28, 50, ${0.26 / shade})`);
                grad.addColorStop(0.45, 'rgba(89, 28, 50, 0.04)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
                drawPoly([c0, c1, c2, c3], grad);

                // Porous sponge crumb speckles
                ctx3d.fillStyle = 'rgba(205, 92, 122, 0.25)';
                for (let k = 0; k < 10; k++) {
                  const u = 0.18 + ((k * 0.37) % 0.68);
                  const v = k % 2 === 0 ? 0.22 + (k % 3) * 0.03 : 0.74 + (k % 3) * 0.04;
                  const topP = lerpPt(c0, c1, u);
                  const botP = lerpPt(c3, c2, u);
                  const pt = lerpPt(topP, botP, v);
                  ctx3d.beginPath();
                  ctx3d.arc(pt.x, pt.y, 1.15 * c1.s, 0, Math.PI * 2);
                  ctx3d.fill();
                }
              }
            });
          });
        }

        // Sort walls & cut faces back-to-front
        faces.sort((a, b) => a.z - b.z);
        for (let i = 0; i < faces.length; i++) {
          faces[i].draw();
        }

        // 3. Top elliptical sector surface
        const topPts = [];
        const span = aEnd - aStart;
        if (span < Math.PI * 1.98) {
          topPts.push(project(ox, oy + yTop, oz));
        }
        const topSteps = Math.max(12, steps);
        for (let i = 0; i <= topSteps; i++) {
          const a = aStart + (i / topSteps) * span;
          topPts.push(project(ox + Math.cos(a) * radius, oy + yTop, oz + Math.sin(a) * radius));
        }
        drawPoly(topPts, topFill, 'rgba(244, 175, 195, 0.65)', 1.1);

        // 4. Glossy White-Blush Ganache Drips on the front curve
        if (drips) {
          drips.forEach((d) => {
            // Check if drip angle is inside [aStart, aEnd]
            let ang = d.ang;
            while (ang < aStart) ang += Math.PI * 2;
            if (ang > aEnd) return;

            const cosY = Math.cos(camYaw);
            const sinY = Math.sin(camYaw);
            const nzView = Math.cos(ang) * sinY + Math.sin(ang) * cosY;
            if (nzView < -0.05) return;

            const aL = Math.max(aStart + 0.02, ang - d.width);
            const aR = Math.min(aEnd - 0.02, ang + d.width);
            if (aR <= aL) return;

            const pL = project(ox + Math.cos(aL) * (radius + 0.8), oy + yTop, oz + Math.sin(aL) * (radius + 0.8));
            const pR = project(ox + Math.cos(aR) * (radius + 0.8), oy + yTop, oz + Math.sin(aR) * (radius + 0.8));
            const pTip = project(ox + Math.cos(ang) * (radius + 1.2), oy + yTop + d.len, oz + Math.sin(ang) * (radius + 1.2));

            ctx3d.beginPath();
            ctx3d.moveTo(pL.x, pL.y);
            ctx3d.quadraticCurveTo((pL.x + pTip.x) * 0.5, pTip.y * 0.96, pTip.x, pTip.y);
            ctx3d.quadraticCurveTo((pR.x + pTip.x) * 0.5, pTip.y * 0.96, pR.x, pR.y);
            ctx3d.closePath();
            ctx3d.fillStyle = 'rgba(255, 245, 249, 0.92)';
            ctx3d.fill();
          });
        }

        // 5. Pearl Piping Beads along tier base
        if (pearlsAtY !== undefined) {
          const pearlCount = Math.round((aEnd - aStart) * 5.2);
          for (let i = 0; i <= pearlCount; i++) {
            const ang = aStart + 0.05 + (i / Math.max(1, pearlCount)) * Math.max(0.01, aEnd - aStart - 0.1);
            const cosY = Math.cos(camYaw);
            const sinY = Math.sin(camYaw);
            const nzView = Math.cos(ang) * sinY + Math.sin(ang) * cosY;
            if (nzView < 0.05) continue;

            const p = project(ox + Math.cos(ang) * (radius + 1.5), oy + pearlsAtY, oz + Math.sin(ang) * (radius + 1.5));
            const pr = 4.2 * p.s;
            ctx3d.beginPath();
            ctx3d.arc(p.x, p.y, pr, 0, Math.PI * 2);
            ctx3d.fillStyle = '#FFF9FB';
            ctx3d.fill();
            ctx3d.strokeStyle = 'rgba(224, 191, 184, 0.75)';
            ctx3d.lineWidth = 0.8;
            ctx3d.stroke();

            // Specular highlight dot on each 3D pearl
            ctx3d.beginPath();
            ctx3d.arc(p.x - pr * 0.3, p.y - pr * 0.3, pr * 0.3, 0, Math.PI * 2);
            ctx3d.fillStyle = 'rgba(255,255,255,0.95)';
            ctx3d.fill();
          }
        }

        // 6. Coquette Satin Bow on front-left of bottom tier
        if (hasBow) {
          const bowAng = 2.18; // front-left, cleanly clear of cut wedge
          const bp = project(ox + Math.cos(bowAng) * (radius + 2.5), oy + (yTop + yBot) * 0.52, oz + Math.sin(bowAng) * (radius + 2.5));
          const bs = bp.s;
          ctx3d.save();
          ctx3d.translate(bp.x, bp.y);
          ctx3d.scale(bs, bs);
          ctx3d.rotate(-0.14);

          // Ribbon tails
          ctx3d.strokeStyle = '#FF7AA2';
          ctx3d.lineWidth = 3.6;
          ctx3d.lineCap = 'round';
          ctx3d.beginPath();
          ctx3d.moveTo(-2, 3);
          ctx3d.quadraticCurveTo(-9, 15, -14, 21);
          ctx3d.moveTo(2, 3);
          ctx3d.quadraticCurveTo(9, 15, 14, 21);
          ctx3d.stroke();

          // Left & right loops
          ctx3d.fillStyle = '#FF8FAB';
          ctx3d.strokeStyle = '#FFF0F5';
          ctx3d.lineWidth = 1.2;
          ctx3d.beginPath();
          ctx3d.moveTo(0, 0);
          ctx3d.bezierCurveTo(-15, -13, -27, -5, -21, 6);
          ctx3d.bezierCurveTo(-15, 15, -4, 6, 0, 0);
          ctx3d.fill();
          ctx3d.stroke();

          ctx3d.beginPath();
          ctx3d.moveTo(0, 0);
          ctx3d.bezierCurveTo(15, -13, 27, -5, 21, 6);
          ctx3d.bezierCurveTo(15, 15, 4, 6, 0, 0);
          ctx3d.fill();
          ctx3d.stroke();

          // Center knot
          ctx3d.beginPath();
          ctx3d.arc(0, 0, 4.4, 0, Math.PI * 2);
          ctx3d.fillStyle = '#FFF0F5';
          ctx3d.fill();
          ctx3d.strokeStyle = '#E0BFB8';
          ctx3d.stroke();
          ctx3d.restore();
        }
      }

      function drawCakeStand() {
        // Table contact shadow
        const sh = project(0, 42, 0);
        const shGrad = ctx3d.createRadialGradient(sh.x, sh.y, 10, sh.x, sh.y, 128 * sh.s);
        shGrad.addColorStop(0, 'rgba(89, 28, 50, 0.22)');
        shGrad.addColorStop(0.65, 'rgba(89, 28, 50, 0.08)');
        shGrad.addColorStop(1, 'rgba(89, 28, 50, 0)');
        ctx3d.save();
        ctx3d.translate(sh.x, sh.y);
        ctx3d.scale(1, Math.sin(camPitch) * 0.92);
        ctx3d.beginPath();
        ctx3d.arc(0, 0, 128 * sh.s, 0, Math.PI * 2);
        ctx3d.fillStyle = shGrad;
        ctx3d.fill();
        ctx3d.restore();

        // Pedestal base foot & stem
        const drawLatheRing = (yA, rA, yB, rB) => {
          const pts = [];
          const segs = 28;
          for (let i = 0; i <= segs; i++) {
            const a = (i / segs) * Math.PI; // front half
            pts.push(project(Math.cos(a) * rA, yA, Math.sin(a) * rA));
          }
          for (let i = segs; i >= 0; i--) {
            const a = (i / segs) * Math.PI;
            pts.push(project(Math.cos(a) * rB, yB, Math.sin(a) * rB));
          }
          const leftP = project(-Math.max(rA, rB), yA, 0);
          const rightP = project(Math.max(rA, rB), yA, 0);
          const g = ctx3d.createLinearGradient(leftP.x, leftP.y, rightP.x, rightP.y);
          g.addColorStop(0, '#C99B92');
          g.addColorStop(0.32, '#F7E4DF');
          g.addColorStop(0.55, '#E4BEB6');
          g.addColorStop(0.85, '#C18F85');
          g.addColorStop(1, '#DDAFA7');
          drawPoly(pts, g);
        };
        drawLatheRing(26, 20, 40, 48);
        drawLatheRing(8, 26, 26, 16);

        // Platter beveled rim + porcelain top
        drawLatheRing(0, 114, 8, 110);
        const platterPts = [];
        for (let i = 0; i < 42; i++) {
          const a = (i / 42) * Math.PI * 2;
          platterPts.push(project(Math.cos(a) * 114, 0, Math.sin(a) * 114));
        }
        drawPoly(platterPts, '#F5E0DA', '#DEC0B8', 1.5);

        const innerPlatter = [];
        for (let i = 0; i < 42; i++) {
          const a = (i / 42) * Math.PI * 2;
          innerPlatter.push(project(Math.cos(a) * 105, -0.5, Math.sin(a) * 105));
        }
        drawPoly(innerPlatter, '#FFF9FB');
      }

      function drawMiniSlicePlate(ox, oy, oz, alpha) {
        if (alpha <= 0.01) return;
        ctx3d.save();
        ctx3d.globalAlpha = alpha;

        // Plate shadow
        const sh = project(ox, oy + 4, oz);
        const sg = ctx3d.createRadialGradient(sh.x, sh.y, 4, sh.x, sh.y, 64 * sh.s);
        sg.addColorStop(0, 'rgba(89, 28, 50, 0.2)');
        sg.addColorStop(1, 'rgba(89, 28, 50, 0)');
        ctx3d.save();
        ctx3d.translate(sh.x, sh.y);
        ctx3d.scale(1, Math.sin(camPitch));
        ctx3d.beginPath();
        ctx3d.arc(0, 0, 64 * sh.s, 0, Math.PI * 2);
        ctx3d.fillStyle = sg;
        ctx3d.fill();
        ctx3d.restore();

        // Porcelain dessert plate
        const rim = [];
        const inner = [];
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2;
          rim.push(project(ox + Math.cos(a) * 58, oy + 2, oz + Math.sin(a) * 58));
          inner.push(project(ox + Math.cos(a) * 48, oy + 0.5, oz + Math.sin(a) * 48));
        }
        drawPoly(rim, '#F5E4DF', '#DFC1BA', 1.2);
        drawPoly(inner, '#FFFFFF');
        ctx3d.restore();
      }

      function drawCandles(yTopCake) {
        // Depth-sort candles back-to-front
        const sorted = CANDLE_SPECS.map((spec, idx) => {
          const x = Math.cos(spec.angle) * spec.radius;
          const z = Math.sin(spec.angle) * spec.radius;
          const base = project(x, yTopCake, z);
          return { spec, idx, x, z, zDepth: base.z };
        }).sort((a, b) => a.zDepth - b.zDepth);

        sorted.forEach(({ spec, idx, x, z }) => {
          const blowProg = candleBlowT[idx];
          const shrink = 1 - easeOutCubic(Math.min(1, blowProg)) * 0.42;
          const h = spec.height * shrink;
          const r = 4.2;

          const pBot = project(x, yTopCake, z);
          const pTop = project(x, yTopCake - h, z);
          const w = r * ((pBot.s + pTop.s) * 0.5);

          // Warm candlelight pool on cake frosting when lit
          const flameAlpha = Math.max(0, 1 - blowProg * 2.8);
          if (flameAlpha > 0.02) {
            const glow = ctx3d.createRadialGradient(pBot.x, pBot.y, 1, pBot.x, pBot.y, 26 * pBot.s);
            glow.addColorStop(0, `rgba(255, 224, 140, ${0.42 * flameAlpha})`);
            glow.addColorStop(1, 'rgba(255, 182, 193, 0)');
            ctx3d.fillStyle = glow;
            ctx3d.beginPath();
            ctx3d.arc(pBot.x, pBot.y, 26 * pBot.s, 0, Math.PI * 2);
            ctx3d.fill();
          }

          // Candle cylinder body
          const grad = ctx3d.createLinearGradient(pBot.x - w, pBot.y, pBot.x + w, pBot.y);
          grad.addColorStop(0, '#E8C5CE');
          grad.addColorStop(0.35, spec.body);
          grad.addColorStop(0.75, spec.body);
          grad.addColorStop(1, '#CFA5B0');

          ctx3d.fillStyle = grad;
          ctx3d.beginPath();
          ctx3d.moveTo(pTop.x - w, pTop.y);
          ctx3d.lineTo(pTop.x + w, pTop.y);
          ctx3d.lineTo(pBot.x + w, pBot.y);
          ctx3d.ellipse(pBot.x, pBot.y, w, w * 0.38, 0, 0, Math.PI, false);
          ctx3d.closePath();
          ctx3d.fill();

          // Diagonal stripe accents
          ctx3d.strokeStyle = spec.stripe;
          ctx3d.lineWidth = 2 * pTop.s;
          for (let s = 0.25; s <= 0.78; s += 0.26) {
            const sy = pTop.y + (pBot.y - pTop.y) * s;
            ctx3d.beginPath();
            ctx3d.moveTo(pTop.x - w * 0.85, sy + 2);
            ctx3d.lineTo(pTop.x + w * 0.85, sy - 2);
            ctx3d.stroke();
          }

          // Top wax rim
          ctx3d.beginPath();
          ctx3d.ellipse(pTop.x, pTop.y, w, w * 0.36, 0, 0, Math.PI * 2);
          ctx3d.fillStyle = '#FFF9FB';
          ctx3d.fill();

          // Wick
          const wickLen = 5 * pTop.s;
          ctx3d.strokeStyle = '#4A1E2D';
          ctx3d.lineWidth = 1.4 * pTop.s;
          ctx3d.beginPath();
          ctx3d.moveTo(pTop.x, pTop.y);
          ctx3d.lineTo(pTop.x, pTop.y - wickLen);
          ctx3d.stroke();

          // Flickering 3D flame
          if (flameAlpha > 0.02) {
            const sway = Math.sin(elapsed * 7.5 + idx * 1.7) * 1.8 * pTop.s + blowProg * 14 * pTop.s;
            const fScale = (1 + Math.sin(elapsed * 11 + idx * 2.3) * 0.08) * flameAlpha * pTop.s;
            const fx = pTop.x;
            const fy = pTop.y - wickLen;

            // Outer ambient flame halo
            const halo = ctx3d.createRadialGradient(fx + sway * 0.4, fy - 7 * fScale, 1, fx + sway * 0.4, fy - 7 * fScale, 18 * pTop.s);
            halo.addColorStop(0, `rgba(255, 232, 156, ${0.75 * flameAlpha})`);
            halo.addColorStop(0.55, `rgba(255, 182, 193, ${0.3 * flameAlpha})`);
            halo.addColorStop(1, 'rgba(255, 182, 193, 0)');
            ctx3d.fillStyle = halo;
            ctx3d.beginPath();
            ctx3d.arc(fx + sway * 0.4, fy - 7 * fScale, 18 * pTop.s, 0, Math.PI * 2);
            ctx3d.fill();

            // Flame teardrop
            ctx3d.save();
            ctx3d.globalAlpha = flameAlpha;
            ctx3d.beginPath();
            ctx3d.moveTo(fx, fy);
            ctx3d.bezierCurveTo(fx - 5.2 * fScale, fy - 4 * fScale, fx - 3.5 * fScale + sway * 0.5, fy - 12 * fScale, fx + sway, fy - 16 * fScale);
            ctx3d.bezierCurveTo(fx + 3.5 * fScale + sway * 0.5, fy - 12 * fScale, fx + 5.2 * fScale, fy - 4 * fScale, fx, fy);
            const fg = ctx3d.createLinearGradient(fx, fy - 16 * fScale, fx, fy);
            fg.addColorStop(0, '#FFFDF0');
            fg.addColorStop(0.45, '#FFD166');
            fg.addColorStop(1, '#FF8FAB');
            ctx3d.fillStyle = fg;
            ctx3d.fill();

            // Inner white-hot core
            ctx3d.beginPath();
            ctx3d.ellipse(fx + sway * 0.35, fy - 5 * fScale, 1.8 * fScale, 4.2 * fScale, sway * 0.03, 0, Math.PI * 2);
            ctx3d.fillStyle = '#FFFFFF';
            ctx3d.fill();
            ctx3d.restore();
          }
        });
      }

      function drawKnife(progress) {
        if (progress <= 0 || progress >= 1) return;

        // Cut choreography: 0..0.18 move in, 0.18..0.44 slice cut 1, 0.44..0.58 shift to cut 2, 0.58..0.84 slice cut 2, 0.84..1.0 lift out
        let cutAngle = THETA_START;
        let depthY = -148;
        let radialOffset = 54;
        let alpha = 1;

        if (progress < 0.18) {
          const t = easeOutCubic(progress / 0.18);
          depthY = -175 + t * 55;
          alpha = t;
        } else if (progress < 0.44) {
          const t = easeInOutCubic((progress - 0.18) / 0.26);
          depthY = -120 + t * 116; // slices down from top tier (-94) to platter (0)!
          if (Math.random() < 0.55) spawnCrumb(Math.cos(cutAngle) * 58, depthY + 12, Math.sin(cutAngle) * 58);
        } else if (progress < 0.58) {
          const t = easeInOutCubic((progress - 0.44) / 0.14);
          cutAngle = THETA_START + (THETA_END - THETA_START) * t;
          const liftArch = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
          depthY = -4 - liftArch * 116;
        } else if (progress < 0.84) {
          cutAngle = THETA_END;
          const t = easeInOutCubic((progress - 0.58) / 0.26);
          depthY = -120 + t * 116;
          if (Math.random() < 0.55) spawnCrumb(Math.cos(cutAngle) * 58, depthY + 12, Math.sin(cutAngle) * 58);
        } else {
          cutAngle = THETA_END;
          const t = easeOutCubic((progress - 0.84) / 0.16);
          depthY = -4 - t * 165;
          alpha = 1 - t;
        }

        const dirX = Math.cos(cutAngle);
        const dirZ = Math.sin(cutAngle);

        // Knife blade extends radially outward & upward at an angle
        const tip = project(dirX * 14, depthY + 6, dirZ * 14);
        const heel = project(dirX * (radialOffset + 38), depthY - 38, dirZ * (radialOffset + 38));
        const spineTip = project(dirX * 14, depthY - 6, dirZ * 14);
        const spineHeel = project(dirX * (radialOffset + 38), depthY - 52, dirZ * (radialOffset + 38));
        const handleEnd = project(dirX * (radialOffset + 84), depthY - 66, dirZ * (radialOffset + 84));

        ctx3d.save();
        ctx3d.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Polished steel blade
        const bladeGrad = ctx3d.createLinearGradient(spineHeel.x, spineHeel.y, tip.x, tip.y);
        bladeGrad.addColorStop(0, '#F8FAFC');
        bladeGrad.addColorStop(0.45, '#CBD5E1');
        bladeGrad.addColorStop(0.75, '#FFFFFF');
        bladeGrad.addColorStop(1, '#94A3B8');
        drawPoly([spineTip, spineHeel, heel, tip], bladeGrad, 'rgba(100, 116, 139, 0.55)', 1);

        // Specular edge glint on blade
        ctx3d.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx3d.lineWidth = 1.5;
        ctx3d.beginPath();
        ctx3d.moveTo(spineTip.x, spineTip.y + 1.5);
        ctx3d.lineTo(spineHeel.x, spineHeel.y + 1.5);
        ctx3d.stroke();

        // Rose-gold bolster & handle
        const hx0 = (spineHeel.x + heel.x) * 0.5;
        const hy0 = (spineHeel.y + heel.y) * 0.5;
        const handleGrad = ctx3d.createLinearGradient(hx0, hy0, handleEnd.x, handleEnd.y);
        handleGrad.addColorStop(0, '#E8BFB8');
        handleGrad.addColorStop(0.5, '#FFF0F5');
        handleGrad.addColorStop(1, '#D19991');
        ctx3d.strokeStyle = handleGrad;
        ctx3d.lineWidth = 9.5 * heel.s;
        ctx3d.lineCap = 'round';
        ctx3d.beginPath();
        ctx3d.moveTo(hx0, hy0);
        ctx3d.lineTo(handleEnd.x, handleEnd.y);
        ctx3d.stroke();

        // Metallic collar ring
        ctx3d.fillStyle = '#E0BFB8';
        ctx3d.beginPath();
        ctx3d.arc(hx0, hy0, 5.2 * heel.s, 0, Math.PI * 2);
        ctx3d.fill();

        ctx3d.restore();
      }

      // Draw Realistic 3D Rotating Solitaire Diamond Ring emerging from the slice!
      function drawDiamondRing3D(worldX, worldY, worldZ, revealT, takenT) {
        if (revealT <= 0.01) {
          ringScreenBounds.visible = false;
          return;
        }

        const riseEase = easeOutBack(Math.min(1, revealT));
        const takeEase = easeInOutQuint(takenT);
        const floatBlend = smoothstep(0.65, 1.0, revealT);
        const levitation = Math.sin(elapsed * 2.2) * 3.2 * floatBlend;

        // Ring rises from inside the slice (worldY + 14) up to worldY - 58 with smooth levitation,
        // and when taken, floats into hero center spotlight!
        const emergeY = worldY + 14 - riseEase * 72 + levitation;
        const pAnchor = project(worldX, emergeY, worldZ);

        const heroX = CX;
        const heroY = CY - 24;
        const screenX = pAnchor.x + (heroX - pAnchor.x) * takeEase;
        const screenY = pAnchor.y + (heroY - pAnchor.y) * takeEase;
        const ringScale = pAnchor.s * (0.35 + riseEase * 0.78) * (1 + takeEase * 0.62);

        ringScreenBounds = { x: screenX, y: screenY, r: 34 * ringScale, visible: true };

        // Warm golden-rose glow emerging from inside the cake slice
        const sliceTopScreen = project(worldX, worldY + 2, worldZ);
        const beamAlpha = Math.min(1, revealT * 1.4) * (1 - takeEase * 0.4);
        const holeGlow = ctx3d.createRadialGradient(
          sliceTopScreen.x, sliceTopScreen.y, 2,
          sliceTopScreen.x, sliceTopScreen.y, 34 * sliceTopScreen.s
        );
        holeGlow.addColorStop(0, `rgba(255, 240, 195, ${0.88 * beamAlpha})`);
        holeGlow.addColorStop(0.5, `rgba(255, 190, 210, ${0.42 * beamAlpha})`);
        holeGlow.addColorStop(1, 'rgba(255, 190, 210, 0)');
        ctx3d.fillStyle = holeGlow;
        ctx3d.beginPath();
        ctx3d.arc(sliceTopScreen.x, sliceTopScreen.y, 34 * sliceTopScreen.s, 0, Math.PI * 2);
        ctx3d.fill();

        // Volumetric light aura behind the floating ring
        const haloR = (48 + Math.sin(elapsed * 3) * 4) * ringScale;
        const ringHalo = ctx3d.createRadialGradient(screenX, screenY, 4, screenX, screenY, haloR);
        ringHalo.addColorStop(0, `rgba(255, 248, 225, ${0.72 * Math.min(1, revealT * 1.5)})`);
        ringHalo.addColorStop(0.5, `rgba(255, 200, 220, ${0.32 * Math.min(1, revealT * 1.5)})`);
        ringHalo.addColorStop(1, 'rgba(255, 200, 220, 0)');
        ctx3d.fillStyle = ringHalo;
        ctx3d.beginPath();
        ctx3d.arc(screenX, screenY, haloR, 0, Math.PI * 2);
        ctx3d.fill();

        // 3D local transformation for the ring
        const spin = ringSpin;
        const tiltX = 0.34 + Math.sin(elapsed * 1.8) * 0.06;
        const cosS = Math.cos(spin);
        const sinS = Math.sin(spin);
        const cosT = Math.cos(tiltX);
        const sinT = Math.sin(tiltX);

        const xformRing = (lx, ly, lz) => {
          const rx = lx * cosS - lz * sinS;
          const rz = lx * sinS + lz * cosS;
          const ry = ly * cosT - rz * sinT;
          const rz2 = ly * sinT + rz * cosT;
          const ps = 240 / (240 - rz2);
          return {
            x: screenX + rx * ringScale * ps,
            y: screenY + ry * ringScale * ps,
            z: rz2,
            ps: ringScale * ps
          };
        };

        // 1. 3D Torus Band segments (sorted by depth)
        const R_BAND = 19;
        const bandSegs = 40;
        const bandItems = [];
        for (let i = 0; i < bandSegs; i++) {
          const a0 = (i / bandSegs) * Math.PI * 2;
          const a1 = ((i + 1) / bandSegs) * Math.PI * 2;
          const am = (a0 + a1) * 0.5;
          // Hoop lies in local XY plane (diamond sits at top y = -R_BAND)
          const p0 = xformRing(Math.cos(a0) * R_BAND, Math.sin(a0) * R_BAND, 0);
          const p1 = xformRing(Math.cos(a1) * R_BAND, Math.sin(a1) * R_BAND, 0);

          // Specular highlight glides around metal band as ring spins
          const spec = Math.pow(Math.max(0, Math.cos(am - spin * 1.3 + 0.6)), 3);
          const rCol = Math.round(215 + spec * 40);
          const gCol = Math.round(162 + spec * 82);
          const bCol = Math.round(148 + spec * 96);

          bandItems.push({
            z: (p0.z + p1.z) * 0.5,
            draw: () => {
              ctx3d.strokeStyle = `rgb(${rCol},${gCol},${bCol})`;
              ctx3d.lineWidth = 4.4 * ((p0.ps + p1.ps) * 0.5);
              ctx3d.lineCap = 'round';
              ctx3d.beginPath();
              ctx3d.moveTo(p0.x, p0.y);
              ctx3d.lineTo(p1.x, p1.y);
              ctx3d.stroke();

              // Crisp metallic rim highlight
              if (spec > 0.35) {
                ctx3d.strokeStyle = `rgba(255, 252, 245, ${spec * 0.85})`;
                ctx3d.lineWidth = 1.6 * ((p0.ps + p1.ps) * 0.5);
                ctx3d.beginPath();
                ctx3d.moveTo(p0.x, p0.y - 0.7);
                ctx3d.lineTo(p1.x, p1.y - 0.7);
                ctx3d.stroke();
              }
            }
          });
        }

        // 2. Cathedral Prongs & Brilliant-Cut 3D Faceted Diamond at top of band (0, -R_BAND, 0)
        const dBaseY = -R_BAND - 2.5;
        const dGirdleY = dBaseY - 5.5;
        const dTableY = dBaseY - 9.2;
        const girdleR = 7.4;
        const tableR = 4.3;
        const sides = 8;

        const culet = xformRing(0, dBaseY, 0);
        const tableCenter = xformRing(0, dTableY, 0);
        const girdle = [];
        const table = [];
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          girdle.push(xformRing(Math.cos(a) * girdleR, dGirdleY, Math.sin(a) * girdleR));
          table.push(xformRing(Math.cos(a + Math.PI / sides) * tableR, dTableY, Math.sin(a + Math.PI / sides) * tableR));
        }

        // 4 Prongs holding the diamond
        const prongItems = [];
        for (let k = 0; k < 4; k++) {
          const pa = (k / 4) * Math.PI * 2 + Math.PI / 4;
          const pb = xformRing(Math.cos(pa) * 3.8, -R_BAND + 1, Math.sin(pa) * 3.8);
          const pt = xformRing(Math.cos(pa) * (girdleR + 0.4), dGirdleY - 1.2, Math.sin(pa) * (girdleR + 0.4));
          prongItems.push({
            z: (pb.z + pt.z) * 0.5,
            draw: () => {
              ctx3d.strokeStyle = '#F7DFD8';
              ctx3d.lineWidth = 1.6 * pt.ps;
              ctx3d.lineCap = 'round';
              ctx3d.beginPath();
              ctx3d.moveTo(pb.x, pb.y);
              ctx3d.lineTo(pt.x, pt.y);
              ctx3d.stroke();
            }
          });
        }

        // Diamond facets (pavilion + crown + table)
        const facetItems = [];
        for (let i = 0; i < sides; i++) {
          const j = (i + 1) % sides;
          const aMid = ((i + 0.5) / sides) * Math.PI * 2 + spin;
          const flash = Math.pow(Math.max(0, Math.cos(aMid - 0.7)), 2.5);
          const facetColors = ['#FFFFFF', '#E6F4FF', '#FFEAF2', '#D9EEFF'];
          const baseTint = facetColors[i % facetColors.length];

          // Pavilion triangle (culet -> girdle[i] -> girdle[j])
          facetItems.push({
            z: (culet.z + girdle[i].z + girdle[j].z) / 3,
            draw: () => {
              drawPoly(
                [culet, girdle[i], girdle[j]],
                flash > 0.5 ? '#FFFFFF' : baseTint,
                'rgba(186, 218, 245, 0.75)',
                0.7
              );
            }
          });

          // Crown quad (girdle[i] -> girdle[j] -> table[j] -> table[i])
          facetItems.push({
            z: (girdle[i].z + girdle[j].z + table[i].z + table[j].z) * 0.25,
            draw: () => {
              drawPoly(
                [girdle[i], girdle[j], table[j], table[i]],
                flash > 0.4 ? '#FFFFFF' : (i % 2 === 0 ? '#F2F9FF' : '#FFF4F8'),
                'rgba(198, 224, 248, 0.85)',
                0.75
              );
            }
          });
        }

        // Top octagonal table facet
        facetItems.push({
          z: tableCenter.z + 0.5,
          draw: () => {
            const tg = ctx3d.createLinearGradient(table[0].x, table[0].y, table[4].x, table[4].y);
            tg.addColorStop(0, '#FFFFFF');
            tg.addColorStop(0.5, '#E9F5FF');
            tg.addColorStop(1, '#FFF1F6');
            drawPoly(table, tg, 'rgba(255, 255, 255, 0.95)', 0.9);
          }
        });

        // Depth-sort all ring parts together!
        const allRingParts = [...bandItems, ...prongItems, ...facetItems].sort((a, b) => a.z - b.z);
        for (let i = 0; i < allRingParts.length; i++) {
          allRingParts[i].draw();
        }

        // Flashing 4-point diamond star glint on brightest crown corner
        const glintPulse = Math.max(0, Math.sin(elapsed * 4.2));
        if (glintPulse > 0.2) {
          const bestVertex = table.reduce((best, cur) => (cur.z > best.z ? cur : best), table[0]);
          const gs = (5 + glintPulse * 9) * ringScale;
          ctx3d.save();
          ctx3d.translate(bestVertex.x, bestVertex.y);
          ctx3d.rotate(elapsed * 0.7);
          ctx3d.globalAlpha = glintPulse * 0.95;
          ctx3d.fillStyle = '#FFFFFF';
          ctx3d.beginPath();
          ctx3d.moveTo(0, -gs);
          ctx3d.quadraticCurveTo(0, 0, gs, 0);
          ctx3d.quadraticCurveTo(0, 0, 0, gs);
          ctx3d.quadraticCurveTo(0, 0, -gs, 0);
          ctx3d.quadraticCurveTo(0, 0, 0, -gs);
          ctx3d.fill();
          ctx3d.restore();
        }
      }

      function spawnSmoke(x, y, z) {
        smokeParticles.push({
          x,
          y,
          z,
          vx: (Math.random() - 0.5) * 8,
          vy: -(18 + Math.random() * 14),
          r: 2.5 + Math.random() * 2.5,
          life: 0,
          maxLife: 1.4 + Math.random() * 0.6
        });
      }

      function spawnCrumb(x, y, z) {
        crumbParticles.push({
          x,
          y,
          z,
          vx: (Math.random() - 0.5) * 42,
          vy: -(12 + Math.random() * 24),
          vz: (Math.random() - 0.5) * 42,
          r: 1.4 + Math.random() * 1.8,
          color: ['#FFD1DC', '#FFF5F8', '#E25E80'][Math.floor(Math.random() * 3)],
          life: 0,
          maxLife: 0.7 + Math.random() * 0.45
        });
      }

      function spawnRingSparkle(wx, wy, wz) {
        ringSparkles.push({
          x: wx + (Math.random() - 0.5) * 32,
          y: wy + (Math.random() - 0.5) * 28,
          z: wz + (Math.random() - 0.5) * 32,
          vy: -(10 + Math.random() * 18),
          size: 2.5 + Math.random() * 4,
          color: ['#FFF8DC', '#FFD1DC', '#FFFFFF', '#FFE4B5'][Math.floor(Math.random() * 4)],
          life: 0,
          maxLife: 1.0 + Math.random() * 0.6
        });
      }

      function updateParticles(dt) {
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
          const p = smokeParticles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            smokeParticles.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt + Math.sin(elapsed * 3 + i) * 6 * dt;
          p.y += p.vy * dt;
          p.r += dt * 4.2;
        }

        for (let i = crumbParticles.length - 1; i >= 0; i--) {
          const c = crumbParticles[i];
          c.life += dt;
          if (c.life >= c.maxLife) {
            crumbParticles.splice(i, 1);
            continue;
          }
          c.vy += 110 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.z += c.vz * dt;
        }

        for (let i = ringSparkles.length - 1; i >= 0; i--) {
          const s = ringSparkles[i];
          s.life += dt;
          if (s.life >= s.maxLife) {
            ringSparkles.splice(i, 1);
            continue;
          }
          s.y += s.vy * dt;
        }
      }

      function drawParticles() {
        for (let i = 0; i < smokeParticles.length; i++) {
          const p = smokeParticles[i];
          const t = p.life / p.maxLife;
          const alpha = (1 - t) * 0.42;
          const pr = project(p.x, p.y, p.z);
          ctx3d.fillStyle = `rgba(210, 185, 195, ${alpha})`;
          ctx3d.beginPath();
          ctx3d.arc(pr.x, pr.y, p.r * pr.s, 0, Math.PI * 2);
          ctx3d.fill();
        }

        for (let i = 0; i < crumbParticles.length; i++) {
          const c = crumbParticles[i];
          const alpha = 1 - c.life / c.maxLife;
          const pr = project(c.x, c.y, c.z);
          ctx3d.globalAlpha = Math.max(0, alpha);
          ctx3d.fillStyle = c.color;
          ctx3d.beginPath();
          ctx3d.arc(pr.x, pr.y, c.r * pr.s, 0, Math.PI * 2);
          ctx3d.fill();
        }
        ctx3d.globalAlpha = 1;

        for (let i = 0; i < ringSparkles.length; i++) {
          const s = ringSparkles[i];
          const t = s.life / s.maxLife;
          const alpha = Math.sin(t * Math.PI);
          const pr = project(s.x, s.y, s.z);
          const sz = s.size * pr.s;
          ctx3d.save();
          ctx3d.translate(pr.x, pr.y);
          ctx3d.globalAlpha = Math.max(0, alpha);
          ctx3d.fillStyle = s.color;
          ctx3d.beginPath();
          ctx3d.moveTo(0, -sz);
          ctx3d.quadraticCurveTo(0, 0, sz, 0);
          ctx3d.quadraticCurveTo(0, 0, 0, sz);
          ctx3d.quadraticCurveTo(0, 0, -sz, 0);
          ctx3d.quadraticCurveTo(0, 0, 0, -sz);
          ctx3d.fill();
          ctx3d.restore();
        }
      }

      function tick(now) {
        if (!running) {
          rafId = null;
          return;
        }
        if (!lastTime) lastTime = now;
        const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        elapsed += dt;

        // Frame-rate independent exponential damping for silky parallax
        const camLerp = 1 - Math.exp(-9.5 * dt);
        camYaw += (targetYaw - camYaw) * camLerp;
        camPitch += (targetPitch - camPitch) * camLerp;

        // Update candle blow progress
        for (let i = 0; i < 5; i++) {
          if (candlesBlowTarget[i] > candleBlowT[i]) {
            candleBlowT[i] = Math.min(1, candleBlowT[i] + dt * 1.45);
            if (candleBlowT[i] > 0.25 && candleBlowT[i] < 0.92 && Math.random() < 0.32) {
              const spec = CANDLE_SPECS[i];
              spawnSmoke(
                Math.cos(spec.angle) * spec.radius,
                -92 - spec.height * (1 - candleBlowT[i] * 0.42),
                Math.sin(spec.angle) * spec.radius
              );
            }
          }
        }

        // Advance cut -> slice -> ring choreography (smoothly overlapped for zero stop-and-go)
        if (phase === 'cutting') {
          cutAnim = Math.min(1, cutAnim + dt * 0.64);
          if (cutAnim >= 1) {
            phase = 'sliding';
          }
        } else if (phase === 'sliding') {
          sliceAnim = Math.min(1, sliceAnim + dt * 0.95);
          // Begin blooming the ring seamlessly as the slice cushions into place
          if (sliceAnim >= 0.68) {
            ringRiseAnim = Math.min(1, ringRiseAnim + dt * 0.68);
          }
          if (sliceAnim >= 1) {
            phase = 'ring_rising';
            if (callbacks && callbacks.onSliceReady) callbacks.onSliceReady();
          }
        } else if (phase === 'ring_rising') {
          ringRiseAnim = Math.min(1, ringRiseAnim + dt * 0.72);
          if (Math.random() < 0.35) {
            const slideD = 60;
            spawnRingSparkle(Math.cos(THETA_MID) * (slideD + 38), -110, Math.sin(THETA_MID) * (slideD + 38));
          }
          if (ringRiseAnim >= 1) {
            phase = 'ring_ready';
            if (callbacks && callbacks.onRingReady) callbacks.onRingReady();
          }
        } else if (phase === 'ring_ready' || phase === 'ring_taken') {
          if (phase === 'ring_taken') {
            ringTakenAnim = Math.min(1, ringTakenAnim + dt * 1.25);
          }
          if (Math.random() < (phase === 'ring_taken' ? 0.42 : 0.2)) {
            const slideD = 60;
            spawnRingSparkle(Math.cos(THETA_MID) * (slideD + 38), -135, Math.sin(THETA_MID) * (slideD + 38));
          }
        }

        if (ringRiseAnim > 0) {
          ringSpin += dt * (phase === 'ring_taken' ? 1.55 : 1.05);
        }

        updateParticles(dt);

        // Render 3D scene
        ctx3d.clearRect(0, 0, W, H);
        drawCakeStand();

        const slideEase = easeOutCubic(sliceAnim);
        const isCutOpen = cutAnim > 0.42 || sliceAnim > 0;
        const slideDist = 60 * slideEase;
        const sliceOX = Math.cos(THETA_MID) * slideDist;
        const sliceOY = 8 * slideEase;
        const sliceOZ = Math.sin(THETA_MID) * slideDist;

        // Mini plate appears under the extracted slice
        drawMiniSlicePlate(Math.cos(THETA_MID) * 96, 8, Math.sin(THETA_MID) * 96, Math.min(1, slideEase * 1.3));

        // Main cake (if not cut yet, draw full 360°; once cut, draw main body minus wedge)
        const mainStart = isCutOpen ? THETA_END : 0;
        const mainEnd = isCutOpen ? THETA_START + Math.PI * 2 : Math.PI * 2;
        const mainSteps = isCutOpen ? 36 : 42;

        // Bottom tier of main cake (y: -50 .. 0)
        drawCakeSectorTier({
          radius: 84,
          yTop: -50,
          yBot: 0,
          aStart: mainStart,
          aEnd: mainEnd,
          steps: mainSteps,
          ox: 0,
          oy: 0,
          oz: 0,
          baseRGB: [255, 190, 206],
          topFill: '#FFDCE6',
          drips: bottomDrips,
          showCutFaces: isCutOpen,
          pearlsAtY: -2,
          hasBow: true
        });

        // Top tier of main cake (y: -92 .. -50)
        drawCakeSectorTier({
          radius: 60,
          yTop: -92,
          yBot: -50,
          aStart: mainStart,
          aEnd: mainEnd,
          steps: mainSteps,
          ox: 0,
          oy: 0,
          oz: 0,
          baseRGB: [255, 212, 224],
          topFill: '#FFF3F7',
          drips: topDrips,
          showCutFaces: isCutOpen,
          pearlsAtY: -50,
          hasBow: false
        });

        // Candles on top tier
        drawCandles(-92);

        // Extracted 3D cake wedge slice (bottom + top tiers)
        if (isCutOpen) {
          drawCakeSectorTier({
            radius: 84,
            yTop: -50,
            yBot: 0,
            aStart: THETA_START,
            aEnd: THETA_END,
            steps: 10,
            ox: sliceOX,
            oy: sliceOY,
            oz: sliceOZ,
            baseRGB: [255, 190, 206],
            topFill: '#FFDCE6',
            drips: bottomDrips,
            showCutFaces: true,
            pearlsAtY: -2,
            hasBow: false
          });

          drawCakeSectorTier({
            radius: 60,
            yTop: -92,
            yBot: -50,
            aStart: THETA_START,
            aEnd: THETA_END,
            steps: 10,
            ox: sliceOX,
            oy: sliceOY,
            oz: sliceOZ,
            baseRGB: [255, 212, 224],
            topFill: '#FFF3F7',
            drips: topDrips,
            showCutFaces: true,
            pearlsAtY: -50,
            hasBow: false
          });
        }

        if (phase === 'cutting') {
          drawKnife(cutAnim);
        }

        drawParticles();

        // Emerging 3D Diamond Ring out of the extracted cake slice!
        if (ringRiseAnim > 0) {
          const ringWX = sliceOX + Math.cos(THETA_MID) * 34;
          const ringWY = sliceOY - 92;
          const ringWZ = sliceOZ + Math.sin(THETA_MID) * 34;
          drawDiamondRing3D(ringWX, ringWY, ringWZ, ringRiseAnim, ringTakenAnim);
        } else {
          ringScreenBounds.visible = false;
        }

        rafId = requestAnimationFrame(tick);
      }

      // Pointer parallax + swipe-to-cut + tap-the-ring interactions
      canvas.addEventListener('pointerdown', (e) => {
        pointerDown = true;
        swipeTriggered = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        // Allow tapping directly on the floating 3D ring!
        if (ringScreenBounds.visible && phase === 'ring_ready') {
          const rect = canvas.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const py = ((e.clientY - rect.top) / rect.height) * H;
          const dist = Math.hypot(px - ringScreenBounds.x, py - ringScreenBounds.y);
          if (dist <= Math.max(44, ringScreenBounds.r * 1.4)) {
            if (callbacks && callbacks.onRingTap) callbacks.onRingTap();
          }
        }
      });

      canvas.addEventListener('pointermove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        targetYaw = Math.max(-0.34, Math.min(0.34, nx * 0.24));
        targetPitch = Math.max(0.30, Math.min(0.54, 0.41 - ny * 0.08));

        if (pointerDown && !swipeTriggered && phase === 'blown') {
          const d = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
          if (d > 28) {
            swipeTriggered = true;
            if (callbacks && callbacks.onSwipeCut) callbacks.onSwipeCut();
          }
        }
      });

      const endPointer = () => {
        pointerDown = false;
      };
      canvas.addEventListener('pointerup', endPointer);
      canvas.addEventListener('pointercancel', endPointer);
      canvas.addEventListener('pointerleave', () => {
        pointerDown = false;
        targetYaw = -0.06;
        targetPitch = 0.41;
      });

      return {
        setRunning(val) {
          running = val;
          if (running && !rafId) {
            lastTime = 0;
            rafId = requestAnimationFrame(tick);
          }
        },
        blowCandles() {
          if (phase !== 'lit') return;
          phase = 'blown';
          CANDLE_SPECS.forEach((_, idx) => {
            setTimeout(() => {
              candlesBlowTarget[idx] = 1;
            }, idx * 75);
          });
        },
        cutCake() {
          if (phase !== 'blown') return;
          phase = 'cutting';
          cutAnim = 0;
          sliceAnim = 0;
          ringRiseAnim = 0;
        },
        takeRing() {
          if (phase === 'ring_ready') {
            phase = 'ring_taken';
            ringTakenAnim = 0;
          }
        },
        reset() {
          phase = 'lit';
          candleBlowT = [0, 0, 0, 0, 0];
          candlesBlowTarget = [0, 0, 0, 0, 0];
          cutAnim = 0;
          sliceAnim = 0;
          ringRiseAnim = 0;
          ringTakenAnim = 0;
          smokeParticles = [];
          crumbParticles = [];
          ringSparkles = [];
          ringScreenBounds.visible = false;
        }
      };
    }

    const cake3D = createCake3DScene(cakeCanvas, {
      onSwipeCut: () => cutTheCake(),
      onRingTap: () => takeTheRing(),
      onSliceReady: () => {
        if (cakeHint) cakeHint.textContent = 'Wait... something is sparkling inside your slice! ✨';
      },
      onRingReady: () => {
        if (cakeCard) cakeCard.classList.add('is-ring-out');
        if (cakeHint) cakeHint.textContent = 'Tap the 3D diamond ring or "Take the Ring" below 💍';
        launchConfetti(85, true);
      }
    });

    function blowOutCandles() {
      if (candlesBlown) return;
      candlesBlown = true;
      stopMicListener();

      if (cake3D) cake3D.blowCandles();

      setTimeout(() => {
        if (cakeCard) cakeCard.classList.add('is-celebrated');
        if (cakeHint) cakeHint.textContent = 'Swipe across the cake or tap "Cut the Cake" 🍰✨';
        launchConfetti(150, false);
        launchFlowerSplash(cakeCard || triggerBtn, 36);
        setTimeout(() => launchConfetti(90, false), 450);
      }, 360);
    }

    function cutTheCake() {
      if (!candlesBlown || cakeCutStarted) return;
      cakeCutStarted = true;
      if (cakeCard) cakeCard.classList.add('is-cut');
      if (cakeHint) cakeHint.textContent = 'Slicing your birthday piece... 🍰✨';
      if (cake3D) cake3D.cutCake();
    }

    function takeTheRing() {
      if (ringTaken) return;
      ringTaken = true;
      if (cakeCard) cakeCard.classList.add('is-ring-taken');
      if (cake3D) cake3D.takeRing();

      const ringTitle = document.querySelector('#bday-ring-reveal .bday-ring-title');
      const ringSub = document.querySelector('#bday-ring-reveal .bday-ring-subtitle');
      if (ringTitle) ringTitle.textContent = 'Officially Yours Forever, Mrs Abhinaya Nandyala 💍❤️';
      if (ringSub) ringSub.textContent = 'Move your finger or cursor to admire your 3D ring ✨';
      if (cakeHint) cakeHint.textContent = 'Forever starts with us 💖';

      launchConfetti(160, false);
      launchFlowerSplash(cakeCard || triggerBtn, 38);
      if (typeof window.startFireworks === 'function') {
        window.startFireworks();
        setTimeout(() => window.startFireworks(), 650);
      }
    }

    function resetCandles() {
      candlesBlown = false;
      cakeCutStarted = false;
      ringTaken = false;
      if (cake3D) cake3D.reset();
      if (cakeCard) {
        cakeCard.classList.remove('is-celebrated', 'is-cut', 'is-ring-out', 'is-ring-taken');
      }
      if (micStatus) micStatus.textContent = '';
      if (cakeHint) cakeHint.textContent = 'Move your cursor or finger to tilt in 3D ✨';
      const ringTitle = document.querySelector('#bday-ring-reveal .bday-ring-title');
      const ringSub = document.querySelector('#bday-ring-reveal .bday-ring-subtitle');
      if (ringTitle) ringTitle.textContent = 'A Forever Promise For You, Wifey 💍✨';
      if (ringSub) ringSub.textContent = 'Look at what was sparkling inside the cake piece...';
    }

    async function toggleMicBlowDetection() {
      if (micStream) {
        stopMicListener();
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (micStatus) {
          micStatus.textContent = 'Mic unavailable here — tap "Blow the Candles" above! 💖';
        }
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API unsupported');
        }

        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(micStream);
        micAnalyser = audioCtx.createAnalyser();
        micAnalyser.fftSize = 512;
        source.connect(micAnalyser);

        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        blowSustainedFrames = 0;

        if (micBtn) {
          micBtn.classList.add('is-listening');
          micBtn.textContent = '🎤 Listening... Blow gently!';
        }
        if (micStatus) {
          micStatus.textContent = 'Blow near your mic (or tap the button above anytime)';
        }

        const monitorBreath = () => {
          if (!micAnalyser || candlesBlown) return;
          micAnalyser.getByteFrequencyData(dataArray);

          // Wind/breath energy concentrates in low-to-mid bins
          let lowSum = 0;
          const bins = Math.min(28, dataArray.length);
          for (let i = 0; i < bins; i++) {
            lowSum += dataArray[i];
          }
          const avgEnergy = lowSum / bins;

          if (avgEnergy > 45) {
            blowSustainedFrames++;
            if (blowSustainedFrames >= 4) {
              blowOutCandles();
              return;
            }
          } else {
            blowSustainedFrames = Math.max(0, blowSustainedFrames - 1);
          }

          micRafId = requestAnimationFrame(monitorBreath);
        };

        monitorBreath();
      } catch (_err) {
        stopMicListener();
        if (micStatus) {
          micStatus.textContent = 'Mic permission declined — just tap "Blow the Candles" above! 💖';
        }
      }
    }

    function stopMicListener() {
      if (micRafId) {
        cancelAnimationFrame(micRafId);
        micRafId = null;
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
      micAnalyser = null;
      if (micBtn) {
        micBtn.classList.remove('is-listening');
        micBtn.textContent = '🎤 Or blow into your mic';
      }
    }

    if (blowBtn) blowBtn.addEventListener('click', blowOutCandles);
    if (micBtn) micBtn.addEventListener('click', toggleMicBlowDetection);
    if (cutBtn) cutBtn.addEventListener('click', cutTheCake);
    if (takeRingBtn) takeRingBtn.addEventListener('click', takeTheRing);
    if (certBtn) {
      certBtn.addEventListener('click', () => {
        if (typeof window.showMarriageCertificate === 'function') {
          window.showMarriageCertificate();
        }
      });
    }
    if (relightBtn) relightBtn.addEventListener('click', resetCandles);

    // -----------------------------------------------------------------------
    // 4. Pink & Rose-Gold Confetti Burst
    // -----------------------------------------------------------------------
    function resizeConfettiCanvas() {
      if (!confettiCanvas) return;
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }

    function launchConfetti(count, gentle) {
      if (!ctx || !confettiCanvas) return;
      resizeConfettiCanvas();

      const palette = ['#FFB6C1', '#FF8FAB', '#E0BFB8', '#F5D0A9', '#FFF0F5', '#D49A9A'];
      const originX = confettiCanvas.width / 2;
      const originY = gentle ? confettiCanvas.height * 0.35 : confettiCanvas.height * 0.48;
      const cappedCount = window.innerWidth < 680 ? Math.min(count, 95) : count;

      for (let i = 0; i < cappedCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = gentle ? Math.random() * 5 + 2 : Math.random() * 10 + 3.5;
        confettiPieces.push({
          x: originX + (Math.random() - 0.5) * 90,
          y: originY + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (gentle ? 2 : 5.5),
          w: Math.random() * 8 + 5,
          h: Math.random() * 5 + 3,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 1,
          shape: Math.random() > 0.25 ? 'rect' : 'circle'
        });
      }

      if (!confettiRafId) {
        confettiLastTime = 0;
        confettiRafId = requestAnimationFrame(renderConfetti);
      }
    }

    let confettiLastTime = 0;
    function renderConfetti(now) {
      if (!ctx || !confettiCanvas) return;
      if (!confettiLastTime) confettiLastTime = now || performance.now();
      const dt = Math.min(0.035, Math.max(0.001, ((now || performance.now()) - confettiLastTime) / 1000));
      confettiLastTime = now || performance.now();
      const step = dt * 60;

      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      const dragFactor = Math.pow(0.985, step);
      for (let i = confettiPieces.length - 1; i >= 0; i--) {
        const p = confettiPieces[i];
        p.vx *= dragFactor;
        p.vy += 0.19 * step; // frame-rate independent gravity
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.rot += p.vRot * step;
        p.alpha -= 0.007 * step;

        if (p.alpha <= 0.02 || p.y >= confettiCanvas.height + 30) {
          confettiPieces.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      if (confettiPieces.length > 0) {
        confettiRafId = requestAnimationFrame(renderConfetti);
      } else {
        confettiRafId = null;
        confettiLastTime = 0;
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    // -----------------------------------------------------------------------
    // 4B. Full-Screen Lily Sticker Flower Splash Animation
    // -----------------------------------------------------------------------
    function resizeFlowerSplashCanvas() {
      if (!flowerSplashCanvas || !splashCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      flowerSplashCanvas.width = Math.floor(w * dpr);
      flowerSplashCanvas.height = Math.floor(h * dpr);
      splashCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnSplashWave(originX, originY, count, mode) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxSpan = Math.hypot(vw, vh);

      for (let i = 0; i < count; i++) {
        let sx = originX;
        let sy = originY;
        let angle;
        let speed;

        if (mode === 'radial') {
          // Fan evenly in all 360 degrees with slight organic jitter
          angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
          const reachFactor = 0.45 + Math.random() * 0.85;
          speed = (maxSpan * 0.016) * reachFactor + Math.random() * 6;
        } else if (mode === 'fountain') {
          // Splash upward from along the bottom edge
          sx = Math.random() * vw;
          sy = vh + 24;
          angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.85;
          speed = (vh * 0.022) * (0.65 + Math.random() * 0.65);
        } else {
          // Screen-wide scatter bursts across every corner
          sx = Math.random() * vw;
          sy = Math.random() * vh;
          angle = Math.random() * Math.PI * 2;
          speed = Math.random() * 7 + 2.5;
        }

        const baseSize = vw < 600 ? 44 : 58;
        flowerSplashes.push({
          x: sx,
          y: sy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: mode === 'fountain' ? 0.24 : 0.12,
          drag: 0.968,
          size: baseSize + Math.random() * 44,
          scale: 0.15,
          targetScale: 0.8 + Math.random() * 0.55,
          popProgress: 0,
          rot: (Math.random() - 0.5) * 0.9,
          vRot: (Math.random() - 0.5) * 0.065,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.05 + Math.random() * 0.04,
          alpha: 1,
          life: 0,
          maxLife: 115 + Math.random() * 55
        });
      }

      // Accompanying pink/rose-gold petal glints
      const glintColors = ['#FFB6C1', '#FF8FAB', '#FFD1DC', '#F5D0A9', '#FFF0F5'];
      for (let g = 0; g < Math.round(count * 0.9); g++) {
        const gAngle = Math.random() * Math.PI * 2;
        const gSpeed = Math.random() * 11 + 3;
        splashGlints.push({
          x: mode === 'scatter' ? Math.random() * vw : originX + (Math.random() - 0.5) * 40,
          y: mode === 'scatter' ? Math.random() * vh : originY + (Math.random() - 0.5) * 40,
          vx: Math.cos(gAngle) * gSpeed,
          vy: Math.sin(gAngle) * gSpeed - 2,
          r: Math.random() * 4.5 + 2.5,
          color: glintColors[Math.floor(Math.random() * glintColors.length)],
          alpha: 1,
          life: 0,
          maxLife: 70 + Math.random() * 35
        });
      }
    }

    function launchFlowerSplash(originEl, baseCount) {
      if (!splashCtx || !flowerSplashCanvas) return;
      resizeFlowerSplashCanvas();

      // Clear pending timers from any rapid re-click
      flowerSplashTimers.forEach((id) => clearTimeout(id));
      flowerSplashTimers = [];

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let ox = vw / 2;
      let oy = vh / 2;

      if (originEl && typeof originEl.getBoundingClientRect === 'function') {
        const rect = originEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          ox = rect.left + rect.width / 2;
          oy = rect.top + rect.height / 2;
        }
      }

      const adaptiveDefault = vw < 600 ? 26 : vw < 960 ? 34 : 42;
      const wave1Count = baseCount ? Math.min(baseCount, adaptiveDefault) : adaptiveDefault;
      // Wave 1: Immediate 360-degree splash from the tapped button
      spawnSplashWave(ox, oy, wave1Count, 'radial');

      // Wave 2: Screen-wide scatter splash across all corners
      flowerSplashTimers.push(setTimeout(() => {
        spawnSplashWave(vw / 2, vh / 2, Math.round(wave1Count * 0.65), 'scatter');
        if (!flowerSplashRafId) renderFlowerSplash();
      }, 140));

      // Wave 3: Bottom-up lily fountain + extra corner pops
      flowerSplashTimers.push(setTimeout(() => {
        spawnSplashWave(vw / 2, vh, Math.round(wave1Count * 0.55), 'fountain');
        if (!flowerSplashRafId) renderFlowerSplash();
      }, 300));

      if (!flowerSplashRafId) {
        renderFlowerSplash();
      }
    }

    function drawFallbackLily(targetCtx, size) {
      const r = size * 0.42;
      targetCtx.fillStyle = '#FFB6C1';
      targetCtx.strokeStyle = '#FF6F91';
      targetCtx.lineWidth = 1.5;
      for (let p = 0; p < 5; p++) {
        targetCtx.save();
        targetCtx.rotate((p * Math.PI * 2) / 5);
        targetCtx.beginPath();
        targetCtx.ellipse(0, -r * 0.55, r * 0.28, r * 0.52, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.restore();
      }
      targetCtx.fillStyle = '#FFD166';
      targetCtx.beginPath();
      targetCtx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      targetCtx.fill();
    }

    let flowerSplashLastTime = 0;
    function renderFlowerSplash(now) {
      if (!splashCtx || !flowerSplashCanvas) return;
      if (!flowerSplashLastTime) flowerSplashLastTime = now || performance.now();
      const dt = Math.min(0.035, Math.max(0.001, ((now || performance.now()) - flowerSplashLastTime) / 1000));
      flowerSplashLastTime = now || performance.now();
      const step = dt * 60;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      splashCtx.clearRect(0, 0, vw, vh);

      const glintDrag = Math.pow(0.965, step);
      // Update & draw sparkle glints in-place
      for (let i = splashGlints.length - 1; i >= 0; i--) {
        const g = splashGlints[i];
        g.life += step;
        g.vx *= glintDrag;
        g.vy = g.vy * glintDrag + 0.14 * step;
        g.x += g.vx * step;
        g.y += g.vy * step;
        const progress = g.life / g.maxLife;
        g.alpha = progress > 0.6 ? Math.max(0, 1 - (progress - 0.6) / 0.4) : 1;

        if (g.life >= g.maxLife || g.alpha <= 0.02) {
          splashGlints.splice(i, 1);
          continue;
        }

        splashCtx.globalAlpha = g.alpha;
        splashCtx.fillStyle = g.color;
        splashCtx.beginPath();
        splashCtx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        splashCtx.fill();
      }
      splashCtx.globalAlpha = 1;

      // Update & draw lily sticker splashes in-place
      for (let i = flowerSplashes.length - 1; i >= 0; i--) {
        const f = flowerSplashes[i];
        f.life += step;
        const fDrag = Math.pow(f.drag, step);
        f.vx *= fDrag;
        f.vy = f.vy * fDrag + f.gravity * step;
        f.wobblePhase += f.wobbleSpeed * step;
        f.x += (f.vx + Math.sin(f.wobblePhase) * 0.6) * step;
        f.y += f.vy * step;
        f.rot += f.vRot * step;

        // Bouncy overshoot scale-in during first 16 frames
        if (f.popProgress < 1) {
          f.popProgress = Math.min(1, f.popProgress + 0.075 * step);
          const t = f.popProgress;
          const overshoot = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
          f.scale = Math.max(0.1, f.targetScale * overshoot);
        }

        const lifeRatio = f.life / f.maxLife;
        if (lifeRatio > 0.68) {
          f.alpha = Math.max(0, 1 - (lifeRatio - 0.68) / 0.32);
        }

        if (f.life >= f.maxLife || f.alpha <= 0.02 || f.y >= vh + f.size * 1.5) {
          flowerSplashes.splice(i, 1);
          continue;
        }

        splashCtx.save();
        splashCtx.globalAlpha = f.alpha;
        splashCtx.translate(f.x, f.y);
        splashCtx.rotate(f.rot);
        splashCtx.scale(f.scale, f.scale);

        if (lilyStickerReady && lilyStickerSprite) {
          splashCtx.drawImage(lilyStickerSprite, -f.size / 2, -f.size / 2, f.size, f.size);
        } else {
          drawFallbackLily(splashCtx, f.size);
        }
        splashCtx.restore();
      }

      if (flowerSplashes.length > 0 || splashGlints.length > 0) {
        flowerSplashRafId = requestAnimationFrame(renderFlowerSplash);
      } else {
        flowerSplashRafId = null;
        flowerSplashLastTime = 0;
        splashCtx.clearRect(0, 0, vw, vh);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Polaroid Photo Lightbox (for all 17 Surprise Photos)
    // -----------------------------------------------------------------------
    const polaroidItems = Array.from(document.querySelectorAll('#bday-step-cake .bday-polaroid'));
    let activeLightboxIndex = 0;

    function openLightbox(index) {
      if (!lightbox || !lightboxImg || polaroidItems.length === 0) return;
      activeLightboxIndex = (index + polaroidItems.length) % polaroidItems.length;
      const fig = polaroidItems[activeLightboxIndex];
      const imgEl = fig.querySelector('.bday-photo-img') || fig.querySelector('img');
      const capEl = fig.querySelector('.bday-polaroid-caption');
      if (imgEl) {
        lightboxImg.src = imgEl.currentSrc || imgEl.src;
        lightboxImg.alt = imgEl.alt || 'Our memory';
      }
      if (lightboxCaption) {
        lightboxCaption.textContent = capEl ? capEl.textContent : '';
      }
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
    }

    polaroidItems.forEach((fig, idx) => {
      fig.addEventListener('click', () => openLightbox(idx));
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) {
      lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(activeLightboxIndex - 1);
      });
    }
    if (lightboxNext) {
      lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(activeLightboxIndex + 1);
      });
    }
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });

      // Touch swipe navigation on mobile & tablet
      let touchStartX = 0;
      lightbox.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
        }
      }, { passive: true });
      lightbox.addEventListener('touchend', (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 45) {
          openLightbox(dx < 0 ? activeLightboxIndex + 1 : activeLightboxIndex - 1);
        }
      }, { passive: true });
    }

    // -----------------------------------------------------------------------
    // 6. Bind Trigger, Close & Escape Key
    // -----------------------------------------------------------------------
    triggerBtn.addEventListener('click', () => {
      playSurpriseSong();
      launchFlowerSplash(triggerBtn);
      openCelebration();
    });
    if (musicToggleBtn) {
      musicToggleBtn.addEventListener('click', () => {
        if (!surpriseAudio) return;
        if (surpriseAudio.paused) {
          surpriseAudio.play().then(() => updateMusicToggleUI(true)).catch(() => {});
        } else {
          surpriseAudio.pause();
          updateMusicToggleUI(false);
        }
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeCelebration);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCelebration();
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox && lightbox.classList.contains('is-open')) {
        if (e.key === 'Escape') {
          closeLightbox();
          return;
        }
        if (e.key === 'ArrowLeft') {
          openLightbox(activeLightboxIndex - 1);
          return;
        }
        if (e.key === 'ArrowRight') {
          openLightbox(activeLightboxIndex + 1);
          return;
        }
      }
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeCelebration();
      }
    });

    let lastResizeW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastResizeW) return;
      lastResizeW = window.innerWidth;
      resizeConfettiCanvas();
      resizeFlowerSplashCanvas();
    });

    // Expose clean API for programmatic triggering if needed
    window.BirthdayCelebration = {
      open: openCelebration,
      close: closeCelebration,
      blowCandles: blowOutCandles,
      splashFlowers: launchFlowerSplash
    };
  });
})();