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
    const blowBtn = document.getElementById('bday-blow-btn');
    const micBtn = document.getElementById('bday-mic-btn');
    const micStatus = document.getElementById('bday-mic-status');
    const relightBtn = document.getElementById('bday-relight-btn');
    const candles = Array.from(document.querySelectorAll('#bday-cake-svg .bday-candle'));

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
    let lilyStickerReady = false;
    lilyStickerImg.onload = () => {
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
    }

    function showStep(targetStep) {
      [stepPrompt, stepCake].forEach((step) => {
        if (!step) return;
        step.classList.remove('is-visible');
        step.classList.remove('is-active');
      });

      overlay.scrollTop = 0;
      targetStep.classList.add('is-active');
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
    // 3. Step 2: Candle Blow-Out Sequence & Optional Microphone Blow Detection
    // -----------------------------------------------------------------------
    function blowOutCandles() {
      if (candlesBlown) return;
      candlesBlown = true;
      stopMicListener();

      candles.forEach((candle, idx) => {
        setTimeout(() => {
          candle.classList.add('is-blown');
        }, idx * 75);
      });

      setTimeout(() => {
        if (cakeCard) cakeCard.classList.add('is-celebrated');
        launchConfetti(150, false);
        launchFlowerSplash(cakeCard || triggerBtn, 36);
        setTimeout(() => launchConfetti(90, false), 450);
      }, 320);
    }

    function resetCandles() {
      candlesBlown = false;
      candles.forEach((candle) => candle.classList.remove('is-blown'));
      if (cakeCard) cakeCard.classList.remove('is-celebrated');
      if (micStatus) micStatus.textContent = '';
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

      for (let i = 0; i < count; i++) {
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
        renderConfetti();
      }
    }

    function renderConfetti() {
      if (!ctx || !confettiCanvas) return;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      confettiPieces = confettiPieces.filter((p) => p.alpha > 0.02 && p.y < confettiCanvas.height + 30);

      for (const p of confettiPieces) {
        p.vx *= 0.985;
        p.vy += 0.19; // soft gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        p.alpha -= 0.007;

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

    function renderFlowerSplash() {
      if (!splashCtx || !flowerSplashCanvas) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      splashCtx.clearRect(0, 0, vw, vh);

      // Update & draw sparkle glints
      splashGlints = splashGlints.filter((g) => g.life < g.maxLife && g.alpha > 0.02);
      for (const g of splashGlints) {
        g.life++;
        g.vx *= 0.965;
        g.vy = g.vy * 0.965 + 0.14;
        g.x += g.vx;
        g.y += g.vy;
        const progress = g.life / g.maxLife;
        g.alpha = progress > 0.6 ? Math.max(0, 1 - (progress - 0.6) / 0.4) : 1;

        splashCtx.save();
        splashCtx.globalAlpha = g.alpha;
        splashCtx.fillStyle = g.color;
        splashCtx.beginPath();
        splashCtx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        splashCtx.fill();
        splashCtx.restore();
      }

      // Update & draw lily sticker splashes
      flowerSplashes = flowerSplashes.filter(
        (f) => f.life < f.maxLife && f.alpha > 0.02 && f.y < vh + f.size * 1.5
      );

      for (const f of flowerSplashes) {
        f.life++;
        f.vx *= f.drag;
        f.vy = f.vy * f.drag + f.gravity;
        f.wobblePhase += f.wobbleSpeed;
        f.x += f.vx + Math.sin(f.wobblePhase) * 0.6;
        f.y += f.vy;
        f.rot += f.vRot;

        // Bouncy overshoot scale-in during first 16 frames
        if (f.popProgress < 1) {
          f.popProgress = Math.min(1, f.popProgress + 0.075);
          const t = f.popProgress;
          const overshoot = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
          f.scale = Math.max(0.1, f.targetScale * overshoot);
        }

        const lifeRatio = f.life / f.maxLife;
        if (lifeRatio > 0.68) {
          f.alpha = Math.max(0, 1 - (lifeRatio - 0.68) / 0.32);
        }

        splashCtx.save();
        splashCtx.globalAlpha = f.alpha;
        splashCtx.translate(f.x, f.y);
        splashCtx.rotate(f.rot);
        splashCtx.scale(f.scale, f.scale);

        if (lilyStickerReady && lilyStickerImg.complete && lilyStickerImg.naturalWidth > 0) {
          splashCtx.drawImage(lilyStickerImg, -f.size / 2, -f.size / 2, f.size, f.size);
        } else {
          drawFallbackLily(splashCtx, f.size);
        }
        splashCtx.restore();
      }

      if (flowerSplashes.length > 0 || splashGlints.length > 0) {
        flowerSplashRafId = requestAnimationFrame(renderFlowerSplash);
      } else {
        flowerSplashRafId = null;
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
