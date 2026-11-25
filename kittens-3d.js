/**
 * Neo (Ginger Baby Kitten) & Husky (Fat White & Caramel Persian Kitten)
 * Pure 2D Illustrated & Animated Canvas + Tactile Petting + Real Kitten Meows + Play/Fight Behaviors
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('kittens-3d-canvas');
    const card = document.getElementById('kittens-corner');
    const soundBtn = document.getElementById('kittens-sound-btn');
    const neoBadge = document.getElementById('kitten-badge-neo');
    const huskyBadge = document.getElementById('kitten-badge-husky');
    const neoMoodEl = document.getElementById('kitten-mood-neo');
    const huskyMoodEl = document.getElementById('kitten-mood-husky');

    if (!canvas || !card) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 680;
    const H = 310;

    // ---------------------------------------------------------------------
    // 1. Real Uploaded Kitten Meow Audio Slicer + Soft Purr Controller
    // ---------------------------------------------------------------------
    let audioCtx = null;
    let soundMuted = false;
    let purrNodes = null;
    let purrActive = false;

    const FALLBACK_MEOW_SLICES = [
      { start: 0.05, dur: 0.85 }, { start: 2.00, dur: 0.90 }, { start: 5.00, dur: 0.90 },
      { start: 6.08, dur: 0.90 }, { start: 8.05, dur: 0.90 }, { start: 10.10, dur: 0.95 },
      { start: 13.20, dur: 0.95 }, { start: 16.15, dur: 0.95 }, { start: 18.00, dur: 0.90 },
      { start: 22.10, dur: 0.95 }, { start: 24.20, dur: 0.95 }, { start: 27.10, dur: 0.95 },
      { start: 30.20, dur: 0.95 }, { start: 33.20, dur: 1.00 }, { start: 36.85, dur: 0.95 },
      { start: 42.20, dur: 0.95 }, { start: 48.00, dur: 1.00 }, { start: 53.00, dur: 1.00 }
    ];

    let rawMeowBytes = null;
    let decodedMeowBuffer = null;
    let meowSlices = FALLBACK_MEOW_SLICES;
    let decodingStarted = false;
    let lastSliceIdx = -1;

    const fallbackAudio = new Audio('assets/kitten-meows.mp3');
    fallbackAudio.preload = 'auto';
    let fallbackStopTimer = null;

    if (window.location.protocol !== 'file:' && typeof fetch === 'function') {
      fetch('assets/kitten-meows.mp3')
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((buf) => {
          if (buf) {
            rawMeowBytes = buf;
            if (audioCtx && !decodingStarted) decodeMeowAudio();
          }
        })
        .catch(() => {});
    }

    function extractMeowSlices(audioBuf) {
      const data = audioBuf.getChannelData(0);
      const sr = audioBuf.sampleRate;
      const winSize = Math.floor(sr * 0.015);
      const rmsValues = [];
      let maxRms = 0;

      for (let i = 0; i < data.length; i += winSize) {
        let sum = 0;
        const end = Math.min(data.length, i + winSize);
        for (let j = i; j < end; j++) sum += data[j] * data[j];
        const rms = Math.sqrt(sum / Math.max(1, end - i));
        rmsValues.push(rms);
        if (rms > maxRms) maxRms = rms;
      }

      const threshold = Math.max(0.015, maxRms * 0.14);
      const rawRegions = [];
      let inMeow = false;
      let startWin = 0;
      const minGapWins = Math.ceil(0.16 / 0.015);
      let silentWins = 0;

      for (let w = 0; w < rmsValues.length; w++) {
        if (rmsValues[w] > threshold) {
          if (!inMeow) { inMeow = true; startWin = w; }
          silentWins = 0;
        } else if (inMeow) {
          silentWins++;
          if (silentWins >= minGapWins) {
            rawRegions.push([startWin, w - silentWins]);
            inMeow = false;
          }
        }
      }
      if (inMeow) rawRegions.push([startWin, rmsValues.length - 1]);

      const detected = [];
      for (let i = 0; i < rawRegions.length; i++) {
        const sTime = Math.max(0, rawRegions[i][0] * 0.015 - 0.04);
        const eTime = Math.min(audioBuf.duration, rawRegions[i][1] * 0.015 + 0.10);
        const dur = eTime - sTime;
        if (dur >= 0.22 && dur <= 1.75) detected.push({ start: sTime, dur });
      }
      if (detected.length >= 4) meowSlices = detected;
    }

    function decodeMeowAudio() {
      if (!audioCtx || !rawMeowBytes || decodingStarted) return;
      decodingStarted = true;
      audioCtx.decodeAudioData(rawMeowBytes.slice(0))
        .then((buf) => {
          decodedMeowBuffer = buf;
          extractMeowSlices(buf);
        })
        .catch(() => { decodingStarted = false; });
    }

    function ensureAudio() {
      if (soundMuted) return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      if (rawMeowBytes && !decodedMeowBuffer && !decodingStarted) decodeMeowAudio();
      return audioCtx;
    }

    function pickMeowSlice() {
      const len = meowSlices.length;
      let idx = Math.floor(Math.random() * len);
      if (len > 1 && idx === lastSliceIdx) {
        idx = (idx + 1 + Math.floor(Math.random() * (len - 1))) % len;
      }
      lastSliceIdx = idx;
      return meowSlices[idx];
    }

    function playKittenMeow(kittenKey) {
      if (soundMuted) return 0.4;
      const ac = ensureAudio();
      const rate = kittenKey === 'neo' ? 1.06 : 0.95;
      const slice = pickMeowSlice();
      const playDur = slice.dur / rate;

      if (ac && decodedMeowBuffer) {
        const now = ac.currentTime;
        const src = ac.createBufferSource();
        src.buffer = decodedMeowBuffer;
        src.playbackRate.value = rate;

        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.95, now + 0.018);
        gain.gain.setValueAtTime(0.95, now + Math.max(0.02, playDur - 0.07));
        gain.gain.linearRampToValueAtTime(0.0001, now + playDur);

        src.connect(gain);
        gain.connect(ac.destination);
        src.start(now, slice.start, slice.dur);
        return playDur;
      }

      try {
        if (fallbackStopTimer) { clearTimeout(fallbackStopTimer); fallbackStopTimer = null; }
        fallbackAudio.pause();
        fallbackAudio.currentTime = Math.min(slice.start, Math.max(0, (fallbackAudio.duration || 55) - 1));
        fallbackAudio.playbackRate = rate;
        fallbackAudio.volume = 0.9;
        const p = fallbackAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        fallbackStopTimer = setTimeout(() => fallbackAudio.pause(), playDur * 1000);
      } catch (_e) {}
      return playDur;
    }

    function setPurrIntensity(intensity) {
      if (soundMuted || intensity <= 0.05) {
        if (purrNodes && purrActive) {
          purrActive = false;
          const now = audioCtx.currentTime;
          purrNodes.master.gain.cancelScheduledValues(now);
          purrNodes.master.gain.setTargetAtTime(0.0001, now, 0.08);
        }
        return;
      }
      const ac = ensureAudio();
      if (!ac) return;
      if (!purrNodes) {
        const oscA = ac.createOscillator();
        const oscB = ac.createOscillator();
        oscA.type = 'triangle';
        oscB.type = 'sine';
        oscA.frequency.value = 78;
        oscB.frequency.value = 156;

        const lfo = ac.createOscillator();
        const lfoGain = ac.createGain();
        lfo.frequency.value = 26;
        lfoGain.gain.value = 0.45;
        const modGain = ac.createGain();
        modGain.gain.value = 0.55;
        lfo.connect(lfoGain);
        lfoGain.connect(modGain.gain);

        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 260;

        const master = ac.createGain();
        master.gain.value = 0.0001;
        oscA.connect(modGain);
        oscB.connect(modGain);
        modGain.connect(lp);
        lp.connect(master);
        master.connect(ac.destination);

        oscA.start();
        oscB.start();
        lfo.start();
        purrNodes = { master };
      }
      purrActive = true;
      const now = ac.currentTime;
      purrNodes.master.gain.cancelScheduledValues(now);
      purrNodes.master.gain.setTargetAtTime(0.045 * Math.min(1, intensity), now, 0.09);
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        soundBtn.classList.toggle('is-muted', soundMuted);
        soundBtn.textContent = soundMuted ? '🔇 Sound Off' : '🔊 Sound On';
        if (soundMuted) {
          setPurrIntensity(0);
          fallbackAudio.pause();
        } else {
          ensureAudio();
        }
      });
    }

    // ---------------------------------------------------------------------
    // 2. Kitten State, Petting & Autonomous Real-Kitten Behaviors
    // ---------------------------------------------------------------------
    function createKittenState(cfg) {
      return {
        ...cfg,
        lookX: 0,
        lookY: 0,
        leanX: 0,
        leanY: 0,
        petLevel: 0,
        happySquint: 0,
        mouthOpen: 0,
        meowTimer: 0,
        lastMeowAt: 0,
        rubEnergy: 0,
        blinkTimer: 1.4 + Math.random() * 2.4,
        blinkAmt: 0,
        earTwitchTimer: 2 + Math.random() * 3,
        earTwitch: 0,
        kneadPhase: Math.random() * Math.PI * 2,
        tailPhase: Math.random() * Math.PI * 2,
        // Autonomous play/fight motion
        animX: 0,
        animY: 0,
        targetX: 0,
        targetY: 0,
        hopY: 0,
        crouchAmt: 0,
        targetCrouch: 0,
        earFlatten: 0,
        targetEarFlatten: 0,
        pawSwipeL: 0,
        pawSwipeR: 0,
        buttWiggle: 0,
        socialSquint: 0,
        faceDir: cfg.defaultFaceDir,
        targetFaceDir: cfg.defaultFaceDir,
        socialMood: '',
        speechText: '',
        speechAlpha: 0,
        speechY: 0,
        hitCenter: { x: cfg.baseX, y: cfg.baseY - 30, rx: 95, ry: 95 }
      };
    }

    const neo = createKittenState({
      key: 'neo',
      name: 'Neo',
      baseX: 210,
      baseY: 226,
      defaultFaceDir: 0.12,
      badgeEl: neoBadge,
      moodEl: neoMoodEl,
      idleMood: 'Ginger Kitty · Rub to pet',
      petMoods: ['Mew! So soft 💕', 'Purring happily~ 🧡', 'Loves chin rubs! ✨']
    });

    const husky = createKittenState({
      key: 'husky',
      name: 'Husky',
      baseX: 465,
      baseY: 228,
      defaultFaceDir: -0.12,
      badgeEl: huskyBadge,
      moodEl: huskyMoodEl,
      idleMood: 'Chubby Persian · Rub to pet',
      petMoods: ['Mee-oww~ 💖', 'Making biscuits! 🐾', 'Fluffy purrs~ 🤎']
    });

    const kittens = [neo, husky];
    const floatingParticles = [];

    const social = {
      state: 'idle',
      timer: 1.8,
      duration: 0,
      phaseTime: 0,
      actorIdx: 0,
      bapStep: 0,
      pounced: false
    };

    function resetSocialTargets() {
      kittens.forEach((k) => {
        k.targetX = 0;
        k.targetY = 0;
        k.targetCrouch = 0;
        k.targetEarFlatten = 0;
        k.socialSquint = 0;
        k.targetFaceDir = k.defaultFaceDir;
        k.socialMood = '';
      });
    }

    function showKittenBubble(k, text, withMeow) {
      k.speechText = text;
      k.speechAlpha = 1.0;
      k.speechY = 0;
      if (withMeow && audioCtx && audioCtx.state === 'running' && !soundMuted) {
        const d = playKittenMeow(k.key);
        k.meowTimer = Math.min(0.65, d || 0.36);
      }
    }

    function startNextSocialBehavior() {
      const r = Math.random();
      social.actorIdx = Math.random() < 0.5 ? 0 : 1;
      social.phaseTime = 0;
      social.bapStep = 0;
      social.pounced = false;

      if (r < 0.35) {
        social.state = 'play_fight';
        social.duration = 3.4;
        neo.targetX = 72;
        husky.targetX = -72;
        neo.targetFaceDir = 0.65;
        husky.targetFaceDir = -0.65;
        neo.targetEarFlatten = 0.75;
        husky.targetEarFlatten = 0.75;
        neo.socialMood = 'Play-fighting Husky! 🐾';
        husky.socialMood = 'Bap-bap-bapping Neo! 🐾';
        showKittenBubble(kittens[social.actorIdx], 'rawr! 🐾', true);
      } else if (r < 0.62) {
        social.state = 'play_pounce';
        social.duration = 3.2;
        const attacker = kittens[social.actorIdx];
        const defender = kittens[1 - social.actorIdx];
        const dir = social.actorIdx === 0 ? 1 : -1;
        attacker.targetX = dir * 28;
        attacker.targetFaceDir = dir * 0.55;
        attacker.targetCrouch = 1.0;
        defender.targetFaceDir = -dir * 0.45;
        attacker.socialMood = `Stalking ${defender.name}... 👀`;
        defender.socialMood = 'Watching closely! ✨';
      } else if (r < 0.82) {
        social.state = 'cuddle_nuzzle';
        social.duration = 3.6;
        neo.targetX = 82;
        husky.targetX = -82;
        neo.targetFaceDir = 0.45;
        husky.targetFaceDir = -0.45;
        neo.socialSquint = 1.0;
        husky.socialSquint = 1.0;
        neo.socialMood = 'Cuddling Husky 💕';
        husky.socialMood = 'Nuzzling Neo 🤎';
        showKittenBubble(neo, 'mrr~ 💕', true);
      } else if (r < 0.92) {
        social.state = 'tail_bat';
        social.duration = 3.0;
        const batter = kittens[social.actorIdx];
        const waver = kittens[1 - social.actorIdx];
        const dir = social.actorIdx === 0 ? 1 : -1;
        batter.targetX = dir * 68;
        batter.targetFaceDir = dir * 0.55;
        waver.targetX = -dir * 32;
        waver.targetFaceDir = dir * 0.65; // faces away slightly so tail waves toward batter
        batter.socialMood = `Batting ${waver.name}'s tail! 🐾`;
        waver.socialMood = 'Teasing with tail~ ✨';
      } else {
        social.state = 'stretch_play';
        social.duration = 2.6;
        const k = kittens[social.actorIdx];
        k.targetCrouch = 0.85;
        k.socialSquint = 0.65;
        k.socialMood = 'Big cozy stretch~ ✨';
      }
    }

    function triggerKittenMeow(k, style, px, py) {
      if (social.state !== 'idle') {
        social.state = 'idle';
        social.timer = 4.5 + Math.random() * 3.0;
        resetSocialTargets();
      }
      const nowMs = performance.now();
      if (nowMs - k.lastMeowAt < 650) return;
      k.lastMeowAt = nowMs;

      k.petLevel = Math.min(1, k.petLevel + 0.48);
      k.speechText = style === 'chirp' ? 'mew! 💕' : style === 'trill' ? 'mrr-ow~ ✨' : 'mee-ow~ 💖';
      k.speechAlpha = 1.0;
      k.speechY = 0;

      if (k.badgeEl) {
        k.badgeEl.classList.add('is-meowing');
        setTimeout(() => k.badgeEl && k.badgeEl.classList.remove('is-meowing'), 550);
      }
      if (k.moodEl) {
        k.moodEl.textContent = k.petMoods[Math.floor(Math.random() * k.petMoods.length)];
      }

      const meowDur = playKittenMeow(k.key);
      k.meowTimer = Math.min(0.65, meowDur || 0.44);

      const sx = px !== undefined ? px : k.hitCenter.x;
      const sy = py !== undefined ? py : k.hitCenter.y - 45;
      for (let i = 0; i < 4; i++) {
        floatingParticles.push({
          x: sx + (Math.random() - 0.5) * 40,
          y: sy + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 24,
          vy: -(32 + Math.random() * 26),
          symbol: ['💗', '🐾', '✨', '💕'][Math.floor(Math.random() * 4)],
          size: 14 + Math.random() * 6,
          life: 0,
          maxLife: 1.05 + Math.random() * 0.35
        });
      }
    }

    function applyPetRub(k, moveDist, px, py, dxNorm, dyNorm) {
      if (social.state !== 'idle') {
        social.state = 'idle';
        social.timer = 4.5 + Math.random() * 3.0;
        resetSocialTargets();
      }
      k.petLevel = Math.min(1, k.petLevel + 0.16 + moveDist * 0.008);
      k.leanX = Math.max(-1, Math.min(1, dxNorm));
      k.leanY = Math.max(-1, Math.min(1, dyNorm));
      k.rubEnergy += moveDist;

      if (k.moodEl && k.petLevel > 0.35 && k.speechAlpha < 0.2) {
        k.moodEl.textContent = 'Purrrr~ 💕';
      }

      if (Math.random() < Math.min(0.45, moveDist * 0.025)) {
        floatingParticles.push({
          x: px + (Math.random() - 0.5) * 24,
          y: py - 8,
          vx: (Math.random() - 0.5) * 18,
          vy: -(24 + Math.random() * 22),
          symbol: Math.random() > 0.35 ? '💗' : '✨',
          size: 12 + Math.random() * 5,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.3
        });
      }

      if (k.rubEnergy > 42) {
        k.rubEnergy = 0;
        triggerKittenMeow(k, 'trill', px, py);
      }
    }

    // ---------------------------------------------------------------------
    // 3. Cute 2D Photo-Matched Illustrated Kitten Drawing
    // ---------------------------------------------------------------------
    function drawCozyCushion() {
      // Soft floor shadow
      const shG = ctx.createRadialGradient(340, 260, 40, 340, 260, 290);
      shG.addColorStop(0, 'rgba(130, 62, 84, 0.16)');
      shG.addColorStop(0.7, 'rgba(130, 62, 84, 0.05)');
      shG.addColorStop(1, 'rgba(130, 62, 84, 0)');
      ctx.save();
      ctx.translate(340, 262);
      ctx.scale(1, 0.24);
      ctx.beginPath();
      ctx.arc(0, 0, 290, 0, Math.PI * 2);
      ctx.fillStyle = shG;
      ctx.fill();
      ctx.restore();

      // Plush pastel cushion
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(340, 248, 258, 36, 0, 0, Math.PI * 2);
      const sideG = ctx.createLinearGradient(0, 224, 0, 282);
      sideG.addColorStop(0, '#F9D6E0');
      sideG.addColorStop(1, '#E4AFC0');
      ctx.fillStyle = sideG;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(340, 236, 254, 34, 0, 0, Math.PI * 2);
      const topG = ctx.createRadialGradient(310, 224, 20, 340, 236, 255);
      topG.addColorStop(0, '#FFFDFD');
      topG.addColorStop(0.65, '#FFF0F5');
      topG.addColorStop(1, '#F7CFD9');
      ctx.fillStyle = topG;
      ctx.fill();
      ctx.strokeStyle = 'rgba(224, 175, 190, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tufted cushion dimples
      [185, 340, 495].forEach((tx) => {
        ctx.beginPath();
        ctx.arc(tx, 244, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(218, 155, 174, 0.5)';
        ctx.fill();
      });
      ctx.restore();
    }

    // Draw Cute 2D Boba Eye (huge glossy dark brown puppy-kitten eyes matching both photos!)
    function drawBobaEye(ex, ey, r, k, isHusky) {
      if (k.happySquint > 0.45) {
        ctx.strokeStyle = '#3B1E12';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, ey + 3, r * 0.78, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        return;
      }

      const openY = Math.max(0.1, 1 - k.blinkAmt);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1, openY);

      // Slight white eye corner on Husky (matching Photo 1!)
      ctx.fillStyle = '#FFF7F3';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.08, r * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark warm chestnut / espresso iris
      const irisG = ctx.createRadialGradient(-r * 0.1, -r * 0.1, r * 0.2, 0, 0, r);
      irisG.addColorStop(0, isHusky ? '#5E3016' : '#42200F');
      irisG.addColorStop(0.75, '#2A1208');
      irisG.addColorStop(1, '#140804');
      ctx.fillStyle = irisG;
      ctx.beginPath();
      ctx.arc(k.lookX * 1.6, k.lookY * 1.2, r * 0.96, 0, Math.PI * 2);
      ctx.fill();

      // Big round dark pupil
      const pupR = r * (isHusky ? 0.58 : 0.72) * (1 + k.petLevel * 0.08);
      ctx.fillStyle = '#090403';
      ctx.beginPath();
      ctx.arc(k.lookX * 2.2, k.lookY * 1.6, pupR, 0, Math.PI * 2);
      ctx.fill();

      // Glossy dual catchlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-r * 0.32 + k.lookX, -r * 0.34 + k.lookY, r * 0.30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.28 + k.lookX, r * 0.28 + k.lookY, r * 0.13, 0, Math.PI * 2);
      ctx.fill();

      // Soft upper lash rim
      ctx.strokeStyle = '#241008';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.0, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();

      ctx.restore();
    }

    // Draw Photo-Matched 2D Neo (Tiny Golden-Ginger Baby Kitten — Photo 2)
    function drawNeo2D(k, elapsed) {
      const cx = k.baseX + k.animX;
      const cy = k.baseY + k.animY - k.hopY + k.crouchAmt * 8;
      const breath = Math.sin(elapsed * 2.6);
      const purrVib = k.petLevel > 0.15 ? Math.sin(elapsed * 46) * 1.1 * k.petLevel : 0;

      // Ground contact shadow
      const shS = Math.max(0.6, 1 - k.hopY * 0.008);
      ctx.fillStyle = `rgba(140, 70, 90, ${0.2 * shS})`;
      ctx.beginPath();
      ctx.ellipse(cx, k.baseY + 12, 48 * shS, 11 * shS, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx + purrVib, cy + breath * 1.3);

      // 1. Fluffy striped ginger tail
      const tailWag = Math.sin(elapsed * (2.6 + k.petLevel * 2) + k.tailPhase) * 14;
      const tailLift = k.petLevel * 26;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#E58A3C';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-24, -8);
      ctx.quadraticCurveTo(-56 + tailWag * 0.5, -18 - tailLift * 0.5, -60 + tailWag, -46 - tailLift);
      ctx.stroke();
      // Cream tail tip & tabby bands
      ctx.strokeStyle = '#B8591A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-45 + tailWag * 0.35, -22 - tailLift * 0.35);
      ctx.lineTo(-39 + tailWag * 0.35, -15 - tailLift * 0.35);
      ctx.stroke();
      ctx.fillStyle = '#FFF4E6';
      ctx.beginPath();
      ctx.arc(-60 + tailWag, -46 - tailLift, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Tiny standing/sitting baby-kitten body (golden ginger with big snowy-white chest/tummy bib!)
      const wig = k.buttWiggle;
      // Back feet peeking at bottom
      [-18, 18].forEach((fx) => {
        ctx.fillStyle = '#F7EFE7';
        ctx.strokeStyle = '#D9B694';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(fx + wig * 0.3, 6, 12, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Plump golden-ginger torso
      const bodyG = ctx.createRadialGradient(-8, -32, 8, 0, -24, 52);
      bodyG.addColorStop(0, '#F5A65B');
      bodyG.addColorStop(0.65, '#E48636');
      bodyG.addColorStop(1, '#BD5E1C');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(wig * 0.4, -26 - k.crouchAmt * 4, 34 + breath * 1.2, 36 - k.crouchAmt * 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle ginger tabby flank stripes
      ctx.strokeStyle = 'rgba(170, 74, 18, 0.45)';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      [-1, 1].forEach((side) => {
        [-32, -21, -11].forEach((sy) => {
          ctx.beginPath();
          ctx.moveTo(side * 22, sy);
          ctx.quadraticCurveTo(side * 29, sy + 2, side * 32, sy + 6);
          ctx.stroke();
        });
      });

      // Big fluffy snowy-white tummy/chest bib (just like Photo 2!)
      const bibG = ctx.createRadialGradient(0, -28, 4, 0, -24, 28);
      bibG.addColorStop(0, '#FFFFFF');
      bibG.addColorStop(0.8, '#FFF4EA');
      bibG.addColorStop(1, '#F3DEC8');
      ctx.fillStyle = bibG;
      ctx.beginPath();
      ctx.ellipse(k.faceDir * 6, -24, 19, 27, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Cute short baby front paws (kneading or play-bapping!)
      const kneadAmt = k.petLevel * 6;
      const liftL = Math.max(0, Math.sin(k.kneadPhase)) * kneadAmt + k.pawSwipeL * 28;
      const liftR = Math.max(0, Math.sin(k.kneadPhase + Math.PI)) * kneadAmt + k.pawSwipeR * 28;
      [
        { px: -22, lift: liftL, tilt: 0.16 },
        { px: 22, lift: liftR, tilt: -0.16 }
      ].forEach(({ px, lift, tilt }) => {
        ctx.save();
        ctx.translate(px + k.faceDir * 4, -22 - lift * 0.85);
        ctx.rotate(tilt);
        // Ginger arm
        ctx.fillStyle = '#E88F42';
        ctx.beginPath();
        ctx.ellipse(0, 4, 9.5, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tabby arm bands
        ctx.strokeStyle = 'rgba(168, 72, 16, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -2); ctx.lineTo(6, -2);
        ctx.moveTo(-7, 5); ctx.lineTo(7, 5);
        ctx.stroke();
        // Snowy white mitten paw tip
        ctx.fillStyle = '#FFF9F4';
        ctx.beginPath();
        ctx.ellipse(0, 17, 8.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        if (lift > 6) {
          ctx.fillStyle = '#FF9EB5';
          ctx.beginPath();
          ctx.arc(0, 18, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Big Cute Round Baby-Kitten Head (tilts/leans into rubs!)
      ctx.save();
      const hx = k.leanX * 7 + k.faceDir * 5;
      const hy = -76 + k.leanY * 4 + k.crouchAmt * 8 - k.petLevel * 2;
      const hRot = k.leanX * 0.16 + Math.sin(elapsed * 1.8) * 0.03 + k.earFlatten * 0.08;
      ctx.translate(hx, hy);
      ctx.rotate(hRot);

      // Upright triangular baby-kitten ears with rosy-pink insides!
      [-1, 1].forEach((side) => {
        const droop = k.petLevel * 0.12 + k.earFlatten * 0.35 + (side === 1 ? k.earTwitch * 0.14 : 0);
        ctx.save();
        ctx.translate(side * 24, -26);
        ctx.rotate(side * (0.28 + droop));
        // Outer ginger ear
        ctx.fillStyle = '#E5883A';
        ctx.strokeStyle = '#C46820';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-16, 8);
        ctx.quadraticCurveTo(-4, -28, 2, -28);
        ctx.quadraticCurveTo(10, -26, 16, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Soft rosy-pink inner ear
        ctx.fillStyle = '#F7A9B8';
        ctx.beginPath();
        ctx.moveTo(-9, 6);
        ctx.quadraticCurveTo(-1, -18, 2, -18);
        ctx.quadraticCurveTo(7, -16, 10, 6);
        ctx.closePath();
        ctx.fill();
        // Tiny white ear fluff
        ctx.strokeStyle = 'rgba(255, 248, 242, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-6, 3); ctx.quadraticCurveTo(-2, -3, 2, 1);
        ctx.stroke();
        ctx.restore();
      });

      // Round plump baby-kitten head
      const headG = ctx.createRadialGradient(-10, -12, 8, 0, 0, 48);
      headG.addColorStop(0, '#F7AE64');
      headG.addColorStop(0.65, '#E78B3D');
      headG.addColorStop(1, '#C4641E');
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.ellipse(0, 2, 43, 37, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tabby forehead 'M' markings & cheek stripes (Photo 2!)
      ctx.strokeStyle = 'rgba(164, 70, 16, 0.58)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      [-10, -4, 4, 10].forEach((tx, idx) => {
        ctx.beginPath();
        ctx.moveTo(tx + k.lookX * 1.2, -26);
        ctx.quadraticCurveTo(tx * 0.8 + k.lookX * 1.2, -18, tx * 0.7 + k.lookX * 1.2, idx === 1 || idx === 2 ? -11 : -14);
        ctx.stroke();
      });
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(side * 28, 0); ctx.lineTo(side * 38, -3);
        ctx.moveTo(side * 29, 7); ctx.lineTo(side * 39, 7);
        ctx.stroke();
      });

      // Soft snowy-white muzzle & chin puffs (Photo 2!)
      const fx = k.lookX * 2.5 + k.faceDir * 3;
      const fy = k.lookY * 1.8;
      ctx.fillStyle = '#FFF9F4';
      ctx.beginPath();
      ctx.ellipse(fx - 8, 15 + fy * 0.4, 13, 10, -0.1, 0, Math.PI * 2);
      ctx.ellipse(fx + 8, 15 + fy * 0.4, 13, 10, 0.1, 0, Math.PI * 2);
      ctx.ellipse(fx, 21 + fy * 0.4, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rosy blush glow when petted
      const blushA = 0.18 + k.petLevel * 0.45;
      [-23, 23].forEach((bx) => {
        const bg = ctx.createRadialGradient(bx + fx * 0.5, 11, 1, bx + fx * 0.5, 11, 10);
        bg.addColorStop(0, `rgba(255, 125, 158, ${blushA})`);
        bg.addColorStop(1, 'rgba(255, 125, 158, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx + fx * 0.5, 11, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      // Huge glossy dark puppy-kitten boba eyes!
      drawBobaEye(-16 + fx, -1 + fy, 10.6, k, false);
      drawBobaEye(16 + fx, -1 + fy, 10.6, k, false);

      // Cute rosy-pink triangle nose
      ctx.fillStyle = '#EE889B';
      ctx.beginPath();
      ctx.moveTo(fx - 5, 9 + fy * 0.5);
      ctx.lineTo(fx + 5, 9 + fy * 0.5);
      ctx.quadraticCurveTo(fx, 15 + fy * 0.5, fx - 5, 9 + fy * 0.5);
      ctx.fill();

      // Cute mouth / open meow mouth
      if (k.mouthOpen > 0.08) {
        const mo = k.mouthOpen;
        ctx.fillStyle = '#9E2B4E';
        ctx.beginPath();
        ctx.ellipse(fx, 18 + fy * 0.5, 4.8, 2.4 + mo * 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF90AB';
        ctx.beginPath();
        ctx.ellipse(fx, 19.5 + mo * 2.2 + fy * 0.5, 3.0, 1.8 + mo * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#6E3840';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fx, 13.5 + fy * 0.5);
        ctx.lineTo(fx, 16 + fy * 0.5);
        ctx.quadraticCurveTo(fx - 4, 19.5 + fy * 0.5, fx - 7.5, 16.5 + fy * 0.5);
        ctx.moveTo(fx, 16 + fy * 0.5);
        ctx.quadraticCurveTo(fx + 4, 19.5 + fy * 0.5, fx + 7.5, 16.5 + fy * 0.5);
        ctx.stroke();
      }

      // Delicate white whiskers
      ctx.strokeStyle = 'rgba(255, 250, 245, 0.88)';
      ctx.lineWidth = 1.2;
      [-1, 1].forEach((side) => {
        [-3, 1, 5].forEach((wy) => {
          ctx.beginPath();
          ctx.moveTo(fx + side * 14, 14 + wy * 0.5);
          ctx.quadraticCurveTo(fx + side * 30, 13 + wy * 1.1, fx + side * 44, 14 + wy * 1.7);
          ctx.stroke();
        });
      });

      ctx.restore(); // end head
      ctx.restore(); // end Neo

      k.hitCenter = { x: cx, y: cy - 42, rx: 85, ry: 85 };
    }

    // Draw Photo-Matched 2D Husky (Fat Fluffy White & Caramel Persian Kitten — Photo 1)
    function drawHusky2D(k, elapsed) {
      const cx = k.baseX + k.animX;
      const cy = k.baseY + k.animY - k.hopY + k.crouchAmt * 7;
      const breath = Math.sin(elapsed * 2.4 + 1.0);
      const purrVib = k.petLevel > 0.15 ? Math.sin(elapsed * 46) * 1.1 * k.petLevel : 0;

      // Ground contact shadow
      const shS = Math.max(0.6, 1 - k.hopY * 0.008);
      ctx.fillStyle = `rgba(140, 70, 90, ${0.22 * shS})`;
      ctx.beginPath();
      ctx.ellipse(cx, k.baseY + 13, 66 * shS, 13 * shS, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx + purrVib, cy + breath * 1.2);

      // 1. Extra-fluffy Persian bottle-brush tail (snowy white + soft golden-caramel patch)
      const tailWag = Math.sin(elapsed * (2.2 + k.petLevel * 1.8) + k.tailPhase) * 15;
      const tailLift = k.petLevel * 24;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#FFF9F5';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(34, -8);
      ctx.quadraticCurveTo(70 + tailWag * 0.5, -16 - tailLift * 0.5, 72 + tailWag, -46 - tailLift);
      ctx.stroke();
      // Soft golden-caramel Persian tail patch
      ctx.fillStyle = '#D99E67';
      ctx.beginPath();
      ctx.ellipse(70 + tailWag * 0.9, -42 - tailLift * 0.9, 11, 13, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Fat Plush Snowy-White Persian Body + Soft Caramel Back Patch
      const wig = k.buttWiggle;
      const bodyG = ctx.createRadialGradient(-10, -34, 12, 0, -26, 68);
      bodyG.addColorStop(0, '#FFFFFF');
      bodyG.addColorStop(0.68, '#FAF3EE');
      bodyG.addColorStop(1, '#E5D5CA');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(wig * 0.4, -27 - k.crouchAmt * 4, 54 + breath * 1.5, 39 - k.crouchAmt * 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft warm golden-caramel saddle patch on shoulder/side (Photo 1!)
      ctx.fillStyle = 'rgba(214, 152, 96, 0.68)';
      ctx.beginPath();
      ctx.ellipse(26 + wig * 0.3, -36, 22, 16, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Huge Fluffy White Persian Chest Ruff (scruffy cloud tufts!)
      ctx.fillStyle = '#FFFFFF';
      [
        [-24, -38, 16], [0, -40, 20], [24, -38, 16],
        [-16, -24, 18], [16, -24, 18], [0, -20, 21]
      ].forEach(([rx, ry, rr]) => {
        ctx.beginPath();
        ctx.arc(rx + k.faceDir * 6, ry + breath * 0.6, rr, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Thick Chubby Snowy-White Persian Paws (Photo 1!)
      const kneadAmt = k.petLevel * 6.5;
      const liftL = Math.max(0, Math.sin(k.kneadPhase)) * kneadAmt + k.pawSwipeL * 28;
      const liftR = Math.max(0, Math.sin(k.kneadPhase + Math.PI)) * kneadAmt + k.pawSwipeR * 28;
      [
        { px: -28, lift: liftL },
        { px: 24, lift: liftR }
      ].forEach(({ px, lift }) => {
        ctx.save();
        ctx.translate(px + k.faceDir * 5, -14 - lift * 0.85);
        const pawG = ctx.createRadialGradient(-3, -2, 3, 0, 4, 22);
        pawG.addColorStop(0, '#FFFFFF');
        pawG.addColorStop(0.7, '#FAF3EE');
        pawG.addColorStop(1, '#E2D2C7');
        ctx.fillStyle = pawG;
        ctx.beginPath();
        ctx.ellipse(0, 2, 17, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Big fluffy Persian paw pad
        ctx.beginPath();
        ctx.ellipse(0, 12, 16, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        // Soft toe lines
        ctx.strokeStyle = 'rgba(180, 155, 145, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-5, 9); ctx.lineTo(-5, 19);
        ctx.moveTo(5, 9); ctx.lineTo(5, 19);
        ctx.stroke();
        if (lift > 6) {
          ctx.fillStyle = '#FF9EB5';
          ctx.beginPath();
          ctx.arc(0, 14, 3.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Big Fluffy Round Persian Head (caramel ears/cheek caps + wide snowy-white blaze & cheeks!)
      ctx.save();
      const hx = k.leanX * 7 + k.faceDir * 5;
      const hy = -74 + k.leanY * 4 + k.crouchAmt * 7 - k.petLevel * 2;
      const hRot = k.leanX * 0.14 + Math.sin(elapsed * 1.5 + 1.2) * 0.03 + k.earFlatten * 0.08;
      ctx.translate(hx, hy);
      ctx.rotate(hRot);

      // Fluffy Persian Ears with long white ear tufts!
      [-1, 1].forEach((side) => {
        const droop = k.petLevel * 0.12 + k.earFlatten * 0.35 + (side === 1 ? k.earTwitch * 0.14 : 0);
        ctx.save();
        ctx.translate(side * 29, -25);
        ctx.rotate(side * (0.36 + droop));
        // Outer golden-caramel ear
        ctx.fillStyle = '#D89A63';
        ctx.beginPath();
        ctx.moveTo(-17, 8);
        ctx.quadraticCurveTo(-4, -27, 2, -26);
        ctx.quadraticCurveTo(11, -24, 17, 8);
        ctx.closePath();
        ctx.fill();
        // Soft pink/cream inner ear + long feathery white ear-furnishings (Photo 1!)
        ctx.fillStyle = '#F7C9C6';
        ctx.beginPath();
        ctx.moveTo(-9, 6);
        ctx.quadraticCurveTo(-1, -16, 2, -16);
        ctx.quadraticCurveTo(7, -14, 10, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-8, 2); ctx.quadraticCurveTo(4, -5, 14, -8);
        ctx.moveTo(-7, 6); ctx.quadraticCurveTo(6, 2, 16, 1);
        ctx.stroke();
        ctx.restore();
      });

      // Round chubby Persian head base (snowy white)
      const headG = ctx.createRadialGradient(-10, -10, 10, 0, 0, 54);
      headG.addColorStop(0, '#FFFFFF');
      headG.addColorStop(0.72, '#FBF5F0');
      headG.addColorStop(1, '#E3D3C8');
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.ellipse(0, 2, 50, 41, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy cheek tufts on sides
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-42, 10, 14, 0, Math.PI * 2);
      ctx.arc(42, 10, 14, 0, Math.PI * 2);
      ctx.fill();

      // Golden-caramel Persian patches around both eyes/temples, separated by crisp snowy-white forehead blaze!
      const fx = k.lookX * 2.5 + k.faceDir * 3;
      const fy = k.lookY * 1.8;
      [-1, 1].forEach((side) => {
        const patchG = ctx.createRadialGradient(side * 25 + fx * 0.4, -10, 4, side * 24 + fx * 0.4, -8, 25);
        patchG.addColorStop(0, 'rgba(218, 156, 98, 0.88)');
        patchG.addColorStop(0.7, 'rgba(226, 174, 122, 0.55)');
        patchG.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = patchG;
        ctx.beginPath();
        ctx.ellipse(side * 25 + fx * 0.4, -9, 23, 22, side * -0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Snowy-white center nose bridge & fluffy Persian cheeks
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(fx - 9, -28);
      ctx.lineTo(fx + 9, -28);
      ctx.lineTo(fx + 14, 8);
      ctx.lineTo(fx - 14, 8);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(fx - 10, 15 + fy * 0.4, 15, 11, -0.08, 0, Math.PI * 2);
      ctx.ellipse(fx + 10, 15 + fy * 0.4, 15, 11, 0.08, 0, Math.PI * 2);
      ctx.ellipse(fx, 22 + fy * 0.4, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rosy blush glow when petted
      const blushA = 0.20 + k.petLevel * 0.45;
      [-26, 26].forEach((bx) => {
        const bg = ctx.createRadialGradient(bx + fx * 0.5, 12, 1, bx + fx * 0.5, 12, 11);
        bg.addColorStop(0, `rgba(255, 125, 158, ${blushA})`);
        bg.addColorStop(1, 'rgba(255, 125, 158, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx + fx * 0.5, 12, 11, 0, Math.PI * 2);
        ctx.fill();
      });

      // Big round warm dark-chestnut Persian boba eyes (Photo 1!)
      drawBobaEye(-17 + fx, -2 + fy, 9.6, k, true);
      drawBobaEye(17 + fx, -2 + fy, 9.6, k, true);

      // Tiny rosy-pink Persian nose (slightly higher / flat-faced look!)
      ctx.fillStyle = '#EB869B';
      ctx.beginPath();
      ctx.moveTo(fx - 5, 7 + fy * 0.5);
      ctx.lineTo(fx + 5, 7 + fy * 0.5);
      ctx.quadraticCurveTo(fx, 13 + fy * 0.5, fx - 5, 7 + fy * 0.5);
      ctx.fill();

      // Cute mouth / open meow mouth
      if (k.mouthOpen > 0.08) {
        const mo = k.mouthOpen;
        ctx.fillStyle = '#9E2B4E';
        ctx.beginPath();
        ctx.ellipse(fx, 16.5 + fy * 0.5, 4.8, 2.4 + mo * 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF90AB';
        ctx.beginPath();
        ctx.ellipse(fx, 18 + mo * 2.2 + fy * 0.5, 3.0, 1.8 + mo * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#6E3840';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fx, 12 + fy * 0.5);
        ctx.lineTo(fx, 15 + fy * 0.5);
        ctx.quadraticCurveTo(fx - 4.5, 18.5 + fy * 0.5, fx - 8.5, 15.5 + fy * 0.5);
        ctx.moveTo(fx, 15 + fy * 0.5);
        ctx.quadraticCurveTo(fx + 4.5, 18.5 + fy * 0.5, fx + 8.5, 15.5 + fy * 0.5);
        ctx.stroke();
      }

      // Long fluffy white Persian whiskers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 1.3;
      [-1, 1].forEach((side) => {
        [-3, 1, 5].forEach((wy) => {
          ctx.beginPath();
          ctx.moveTo(fx + side * 15, 13 + wy * 0.5);
          ctx.quadraticCurveTo(fx + side * 34, 12 + wy * 1.2, fx + side * 52, 13 + wy * 1.8);
          ctx.stroke();
        });
      });

      ctx.restore(); // end head
      ctx.restore(); // end Husky

      k.hitCenter = { x: cx, y: cy - 42, rx: 95, ry: 95 };
    }

    function drawSpeechBubble(k) {
      if (k.speechAlpha <= 0.02) return;
      const spX = k.hitCenter.x;
      const spY = Math.max(22, k.hitCenter.y - 84 - k.speechY);
      ctx.save();
      ctx.globalAlpha = Math.min(1, k.speechAlpha);
      ctx.font = '700 14px "Gloria Hallelujah", cursive';
      const tw = ctx.measureText(k.speechText).width;
      const bw = tw + 20, bh = 26;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = '#FFB6C1';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(spX - bw / 2, spY - bh / 2, bw, bh, 13);
      } else {
        ctx.rect(spX - bw / 2, spY - bh / 2, bw, bh);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E60023';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.speechText, spX, spY + 1);
      ctx.restore();
    }

    // ---------------------------------------------------------------------
    // 4. Pointer / Touch Rubbing & Hover Handlers
    // ---------------------------------------------------------------------
    let isPointerDown = false;
    let lastPX = 0;
    let lastPY = 0;
    let pointerNormX = 0;
    let pointerNormY = 0;

    function getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H
      };
    }

    function hitTestKitten(cx, cy) {
      for (let i = 0; i < kittens.length; i++) {
        const k = kittens[i];
        const dx = (cx - k.hitCenter.x) / k.hitCenter.rx;
        const dy = (cy - k.hitCenter.y) / k.hitCenter.ry;
        if (dx * dx + dy * dy <= 1.0) return { kitten: k, dx, dy };
      }
      return null;
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      isPointerDown = true;
      const pt = getCanvasCoords(e);
      lastPX = pt.x;
      lastPY = pt.y;
      ensureAudio();

      const hit = hitTestKitten(pt.x, pt.y);
      if (hit) {
        triggerKittenMeow(hit.kitten, 'chirp', pt.x, pt.y);
        applyPetRub(hit.kitten, 20, pt.x, pt.y, hit.dx, hit.dy);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const pt = getCanvasCoords(e);
      pointerNormX = (pt.x / W - 0.5) * 2;
      pointerNormY = (pt.y / H - 0.5) * 2;

      const moveDist = Math.hypot(pt.x - lastPX, pt.y - lastPY);
      lastPX = pt.x;
      lastPY = pt.y;

      const hit = hitTestKitten(pt.x, pt.y);
      if (hit) {
        canvas.style.cursor = 'pointer';
        if (isPointerDown || (e.pointerType === 'mouse' && moveDist > 1.5)) {
          applyPetRub(hit.kitten, moveDist, pt.x, pt.y, hit.dx, hit.dy);
        }
      } else {
        canvas.style.cursor = isPointerDown ? 'grabbing' : 'grab';
      }
    });

    const endRub = () => { isPointerDown = false; };
    canvas.addEventListener('pointerup', endRub);
    canvas.addEventListener('pointercancel', endRub);
    canvas.addEventListener('pointerleave', () => {
      isPointerDown = false;
      pointerNormX = 0;
      pointerNormY = 0;
    });

    if (neoBadge) neoBadge.addEventListener('click', () => { ensureAudio(); triggerKittenMeow(neo, 'sweet'); });
    if (huskyBadge) huskyBadge.addEventListener('click', () => { ensureAudio(); triggerKittenMeow(husky, 'sweet'); });

    // ---------------------------------------------------------------------
    // 5. Smooth 120Hz Animation Loop
    // ---------------------------------------------------------------------
    let isInView = true;
    let rafId = null;
    let lastTime = 0;
    let elapsed = 0;
    const mainEl = document.getElementById('main');

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    function shouldAnimate() {
      if (document.hidden || !isInView) return false;
      const bday = document.getElementById('bday-overlay');
      if (bday && bday.classList.contains('is-open')) return false;
      if (mainEl && mainEl.style.display === 'none') return false;
      return true;
    }

    function tick(now) {
      if (!shouldAnimate()) {
        rafId = null;
        lastTime = 0;
        setPurrIntensity(0);
        return;
      }

      if (!lastTime) lastTime = now;
      const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      // Autonomous social behavior update
      const isBeingPetted = kittens.some((k) => k.petLevel > 0.18);
      if (!isBeingPetted) {
        if (social.state === 'idle') {
          social.timer -= dt;
          if (social.timer <= 0) startNextSocialBehavior();
        } else {
          social.phaseTime += dt;
          const pt = social.phaseTime;

          if (social.state === 'play_fight') {
            const bapPhase = Math.max(0, pt - 0.45);
            const sw = Math.sin(bapPhase * 15);
            neo.pawSwipeL = Math.max(0, sw) * 0.95;
            neo.pawSwipeR = Math.max(0, -sw) * 0.95;
            husky.pawSwipeR = Math.max(0, Math.sin(bapPhase * 15 + 1.4)) * 0.95;
            husky.pawSwipeL = Math.max(0, -Math.sin(bapPhase * 15 + 1.4)) * 0.95;
            neo.hopY = Math.abs(Math.sin(bapPhase * 6.5)) * 10;
            husky.hopY = Math.abs(Math.sin(bapPhase * 6.5 + 1.1)) * 10;

            if (pt > 0.6 && social.bapStep === 0) {
              social.bapStep = 1;
              showKittenBubble(husky, 'bap bap! 🐾', true);
              floatingParticles.push({ x: W * 0.5, y: H * 0.46, vx: 0, vy: -26, symbol: '🐾', size: 17, life: 0, maxLife: 0.9 });
            } else if (pt > 1.7 && social.bapStep === 1) {
              social.bapStep = 2;
              showKittenBubble(neo, 'mew! 💥', true);
              floatingParticles.push({ x: W * 0.52, y: H * 0.40, vx: 8, vy: -30, symbol: '✨', size: 16, life: 0, maxLife: 0.9 });
            }
          } else if (social.state === 'play_pounce') {
            const attacker = kittens[social.actorIdx];
            const defender = kittens[1 - social.actorIdx];
            const dir = social.actorIdx === 0 ? 1 : -1;
            if (pt < 1.25) {
              attacker.buttWiggle = Math.sin(pt * 22) * 5 * Math.min(1, pt * 2);
            } else if (pt < 2.05) {
              const pProg = (pt - 1.25) / 0.8;
              attacker.buttWiggle = 0;
              attacker.targetCrouch = 0;
              attacker.targetX = dir * 92;
              attacker.hopY = Math.sin(pProg * Math.PI) * 34;
              attacker.pawSwipeL = Math.sin(pProg * Math.PI) * 0.85;
              attacker.pawSwipeR = Math.sin(pProg * Math.PI) * 0.85;

              if (!social.pounced && pProg > 0.45) {
                social.pounced = true;
                defender.targetX = dir * 18;
                defender.hopY = 16;
                showKittenBubble(attacker, 'gotcha! ✨', true);
                showKittenBubble(defender, 'eep! 🐾', true);
              }
              if (pProg > 0.55) {
                defender.hopY = Math.sin(((pProg - 0.55) / 0.45) * Math.PI) * 18;
              }
            } else {
              attacker.hopY = 0;
              defender.hopY = 0;
            }
          } else if (social.state === 'cuddle_nuzzle') {
            if (Math.random() < 0.08) {
              floatingParticles.push({
                x: W * 0.5 + (Math.random() - 0.5) * 28,
                y: H * 0.42,
                vx: (Math.random() - 0.5) * 14,
                vy: -28,
                symbol: Math.random() > 0.4 ? '💕' : '💖',
                size: 15,
                life: 0,
                maxLife: 1.1
              });
            }
          } else if (social.state === 'tail_bat') {
            const batter = kittens[social.actorIdx];
            batter.pawSwipeR = Math.max(0, Math.sin(pt * 9.5)) * 0.9;
            if (pt > 0.9 && social.bapStep === 0) {
              social.bapStep = 1;
              showKittenBubble(batter, 'bap! 🐾', true);
            }
          }

          if (pt >= social.duration) {
            social.state = 'idle';
            social.timer = 3.8 + Math.random() * 4.2;
            resetSocialTargets();
            kittens.forEach((k) => { k.hopY = 0; k.pawSwipeL = 0; k.pawSwipeR = 0; k.buttWiggle = 0; });
          }
        }
      }

      let maxPetLevel = 0;
      kittens.forEach((k) => {
        const posDamp = 1 - Math.exp(-5.8 * dt);
        k.animX += (k.targetX - k.animX) * posDamp;
        k.animY += (k.targetY - k.animY) * posDamp;
        k.faceDir += (k.targetFaceDir - k.faceDir) * posDamp;
        k.crouchAmt += (k.targetCrouch - k.crouchAmt) * (1 - Math.exp(-7.5 * dt));
        k.earFlatten += (k.targetEarFlatten - k.earFlatten) * (1 - Math.exp(-8 * dt));
        if (social.state === 'idle' || isBeingPetted) {
          k.hopY *= Math.exp(-10 * dt);
          k.pawSwipeL *= Math.exp(-10 * dt);
          k.pawSwipeR *= Math.exp(-10 * dt);
          k.buttWiggle *= Math.exp(-10 * dt);
        }

        const lookScale = social.state === 'play_fight' || social.state === 'cuddle_nuzzle' ? 0.2 : 1;
        const targetLookX = Math.max(-1, Math.min(1, (pointerNormX * 340 - (k.baseX + k.animX - 340)) / 240)) * lookScale;
        const targetLookY = Math.max(-1, Math.min(1, pointerNormY)) * lookScale;
        const lookDamp = 1 - Math.exp(-7 * dt);
        k.lookX += (targetLookX - k.lookX) * lookDamp;
        k.lookY += (targetLookY - k.lookY) * lookDamp;

        k.petLevel *= Math.exp(-1.2 * dt);
        k.leanX *= Math.exp(-5 * dt);
        k.leanY *= Math.exp(-5 * dt);
        if (k.moodEl && k.petLevel < 0.08 && k.speechAlpha < 0.05) {
          const desiredMood = k.socialMood || k.idleMood;
          if (k.moodEl.textContent !== desiredMood) k.moodEl.textContent = desiredMood;
        }
        maxPetLevel = Math.max(maxPetLevel, k.petLevel);

        const squintTarget = Math.max(k.socialSquint, k.petLevel > 0.25 ? Math.min(1, k.petLevel * 1.2) : 0);
        k.happySquint += (squintTarget - k.happySquint) * (1 - Math.exp(-8 * dt));
        k.kneadPhase += dt * (2.2 + k.petLevel * 6.5);

        if (k.meowTimer > 0) {
          k.meowTimer = Math.max(0, k.meowTimer - dt);
          const mTarget = Math.sin((k.meowTimer / 0.45) * Math.PI);
          k.mouthOpen += (mTarget - k.mouthOpen) * (1 - Math.exp(-18 * dt));
        } else {
          k.mouthOpen *= Math.exp(-14 * dt);
        }

        if (k.speechAlpha > 0) {
          k.speechY += dt * 16;
          k.speechAlpha = Math.max(0, k.speechAlpha - dt * 0.72);
        }

        k.blinkTimer -= dt;
        if (k.blinkTimer <= 0) {
          if (k.blinkTimer > -0.16) {
            k.blinkAmt = Math.sin(((-k.blinkTimer) / 0.16) * Math.PI);
          } else {
            k.blinkAmt = 0;
            k.blinkTimer = 2.6 + Math.random() * 3.2;
          }
        }

        k.earTwitchTimer -= dt;
        if (k.earTwitchTimer <= 0) {
          if (k.earTwitchTimer > -0.18) {
            k.earTwitch = Math.sin(((-k.earTwitchTimer) / 0.18) * Math.PI * 2);
          } else {
            k.earTwitch = 0;
            k.earTwitchTimer = 3 + Math.random() * 4;
          }
        }
      });

      setPurrIntensity(maxPetLevel);

      ctx.clearRect(0, 0, W, H);
      drawCozyCushion();
      drawNeo2D(neo, elapsed);
      drawHusky2D(husky, elapsed);
      drawSpeechBubble(neo);
      drawSpeechBubble(husky);

      for (let i = floatingParticles.length - 1; i >= 0; i--) {
        const p = floatingParticles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          floatingParticles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const alpha = Math.sin((1 - p.life / p.maxLife) * Math.PI * 0.5);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.symbol, p.x, p.y);
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    }

    function ensureLoop() {
      if (!rafId && shouldAnimate()) {
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
      }
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        const mainVisible = !mainEl || mainEl.style.display !== 'none';
        if (!mainVisible) return;
        isInView = Boolean(entries[0] && entries[0].isIntersecting);
        if (isInView) ensureLoop();
      }, { threshold: 0.05 });
      io.observe(card);
    }

    if (mainEl && 'MutationObserver' in window) {
      const mo = new MutationObserver(() => {
        if (mainEl.style.display !== 'none') {
          isInView = true;
          ensureLoop();
        }
      });
      mo.observe(mainEl, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    const bdayEl = document.getElementById('bday-overlay');
    if (bdayEl && 'MutationObserver' in window) {
      const bo = new MutationObserver(() => ensureLoop());
      bo.observe(bdayEl, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', ensureLoop);

    ensureLoop();
  });
})();
