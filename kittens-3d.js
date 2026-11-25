/**
 * Neo (Ginger Tabby) & Husky (White & Brown) — Realistic 3D Interactive Kittens
 * Smooth 120Hz delta-time 3D rendering, tactile petting/rubbing, and formant-synthesized kitten meows + purrs.
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
    const CX = W / 2;
    const CY = 186;
    const FOV = 680;
    const CAM_DIST = 580;

    // ---------------------------------------------------------------------
    // 1. Realistic Cute Baby Kitten Meow & Purr Web Audio Synthesizer
    // ---------------------------------------------------------------------
    let audioCtx = null;
    let soundMuted = false;
    let purrNodes = null;
    let purrActive = false;

    function ensureAudio() {
      if (soundMuted) return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtx) {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    // Formant-filtered baby kitten meow ("mew!", "mee-ow~", "mrr-ew~")
    function playKittenMeow(kittenKey, variant) {
      const ac = ensureAudio();
      if (!ac) return;

      const now = ac.currentTime;
      const isNeo = kittenKey === 'neo';
      const pitchMul = isNeo ? 1.05 : 0.96;

      // Choose cute contour
      const style = variant || (['sweet', 'chirp', 'trill'][Math.floor(Math.random() * 3)]);
      const dur = style === 'chirp' ? 0.25 : style === 'trill' ? 0.38 : 0.44;

      // Master vocal envelope
      const master = ac.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.22, now + 0.045);
      master.gain.setValueAtTime(0.21, now + dur * 0.48);
      master.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      master.connect(ac.destination);

      // Glottal oscillators (warm triangle + soft sawtooth for natural harmonics)
      const osc1 = ac.createOscillator();
      const osc2 = ac.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sawtooth';

      const g1 = ac.createGain();
      const g2 = ac.createGain();
      g1.gain.value = 0.72;
      g2.gain.value = 0.26;
      osc1.connect(g1);
      osc2.connect(g2);

      // Pitch contour (Hz)
      const setPitch = (osc) => {
        if (style === 'chirp') {
          osc.frequency.setValueAtTime(640 * pitchMul, now);
          osc.frequency.exponentialRampToValueAtTime(950 * pitchMul, now + 0.10);
          osc.frequency.exponentialRampToValueAtTime(780 * pitchMul, now + dur);
        } else if (style === 'trill') {
          osc.frequency.setValueAtTime(540 * pitchMul, now);
          osc.frequency.exponentialRampToValueAtTime(880 * pitchMul, now + 0.16);
          osc.frequency.exponentialRampToValueAtTime(690 * pitchMul, now + dur);
        } else {
          osc.frequency.setValueAtTime(600 * pitchMul, now);
          osc.frequency.exponentialRampToValueAtTime(910 * pitchMul, now + 0.14);
          osc.frequency.exponentialRampToValueAtTime(620 * pitchMul, now + dur);
        }
      };
      setPitch(osc1);
      setPitch(osc2);

      // Subtle natural vibrato
      const vib = ac.createOscillator();
      const vibGain = ac.createGain();
      vib.frequency.value = style === 'trill' ? 23 : 6.5;
      vibGain.gain.value = style === 'trill' ? 24 : 11;
      vib.connect(vibGain);
      vibGain.connect(osc1.frequency);
      vibGain.connect(osc2.frequency);

      // Parallel Vocal Formants (F1: "m -> e -> a -> o -> w", F2: bright kitten resonance)
      const f1 = ac.createBiquadFilter();
      f1.type = 'bandpass';
      f1.Q.value = 4.2;
      f1.frequency.setValueAtTime(520, now); // closed 'm'
      f1.frequency.exponentialRampToValueAtTime(1320, now + dur * 0.36); // open 'e/a'
      f1.frequency.exponentialRampToValueAtTime(780, now + dur); // closing 'w'

      const f2 = ac.createBiquadFilter();
      f2.type = 'bandpass';
      f2.Q.value = 5.4;
      f2.frequency.setValueAtTime(1850, now);
      f2.frequency.exponentialRampToValueAtTime(2650, now + dur * 0.38);
      f2.frequency.exponentialRampToValueAtTime(1750, now + dur);

      const f1Gain = ac.createGain();
      const f2Gain = ac.createGain();
      f1Gain.gain.value = 1.15;
      f2Gain.gain.value = 0.65;

      // Soft air-warmth lowpass
      const warmth = ac.createBiquadFilter();
      warmth.type = 'lowpass';
      warmth.frequency.value = 3600;

      g1.connect(f1);
      g2.connect(f1);
      g1.connect(f2);
      g2.connect(f2);
      f1.connect(f1Gain);
      f2.connect(f2Gain);
      f1Gain.connect(warmth);
      f2Gain.connect(warmth);
      warmth.connect(master);

      // Subtle soft breath puff
      const noiseLen = Math.floor(ac.sampleRate * dur);
      const noiseBuf = ac.createBuffer(1, noiseLen, ac.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noiseSrc = ac.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const noiseFilter = ac.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1900;
      noiseFilter.Q.value = 2.0;
      const noiseGain = ac.createGain();
      noiseGain.gain.value = 0.035;
      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);

      osc1.start(now);
      osc2.start(now);
      vib.start(now);
      noiseSrc.start(now);

      const stopAt = now + dur + 0.03;
      osc1.stop(stopAt);
      osc2.stop(stopAt);
      vib.stop(stopAt);
      noiseSrc.stop(stopAt);
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
        } else {
          ensureAudio();
        }
      });
    }

    // ---------------------------------------------------------------------
    // 2. 3D Kitten State & Interactive Petting Controller
    // ---------------------------------------------------------------------
    function createKittenState(cfg) {
      return {
        ...cfg,
        lookYaw: 0,
        lookPitch: 0,
        leanX: 0,
        leanY: 0,
        petLevel: 0,      // 0..1 rises while rubbing
        happySquint: 0,   // 0..1 crescent eyes
        mouthOpen: 0,     // 0..1 meow mouth
        meowTimer: 0,
        lastMeowAt: 0,
        rubEnergy: 0,
        blinkTimer: 1.5 + Math.random() * 2.5,
        blinkAmt: 0,
        earTwitchTimer: 2 + Math.random() * 3,
        earTwitch: 0,
        kneadPhase: Math.random() * Math.PI * 2,
        tailPhase: Math.random() * Math.PI * 2,
        // Autonomous real-kitten behavior state
        animX: 0,
        animY: 0,
        animZ: 0,
        animYaw: 0,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        targetYaw: 0,
        hopY: 0,
        crouchAmt: 0,
        targetCrouch: 0,
        earFlatten: 0,
        targetEarFlatten: 0,
        pawSwipeL: 0,
        pawSwipeR: 0,
        buttWiggle: 0,
        socialSquint: 0,
        socialMood: '',
        speechText: '',
        speechAlpha: 0,
        speechY: 0,
        hitCenter: { x: 0, y: 0, rx: 95, ry: 95 }
      };
    }

    const neo = createKittenState({
      key: 'neo',
      name: 'Neo',
      wx: -136,
      wy: 22,
      wz: 10,
      baseYaw: 0.16,
      coat: 'ginger',
      eyeCols: ['#FFF2A6', '#85B86E', '#3A6B41'],
      collarCol: '#8ECAE6',
      tagCol: '#FFD166',
      badgeEl: neoBadge,
      moodEl: neoMoodEl,
      idleMood: 'Ginger Kitty · Rub to pet',
      petMoods: ['Mew! So soft 💕', 'Purring happily~ 🧡', 'Loves chin rubs! ✨']
    });

    const husky = createKittenState({
      key: 'husky',
      name: 'Husky',
      wx: 136,
      wy: 22,
      wz: 10,
      baseYaw: -0.16,
      coat: 'bicolor',
      eyeCols: ['#D2ECFF', '#5FA8DF', '#254E75'],
      collarCol: '#FF9EBB',
      tagCol: '#FFD166',
      badgeEl: huskyBadge,
      moodEl: huskyMoodEl,
      idleMood: 'White & Brown · Rub to pet',
      petMoods: ['Mee-oww~ 💖', 'Making biscuits! 🐾', 'Purrs so loud~ 🤎']
    });

    const kittens = [neo, husky];
    const floatingParticles = [];

    // Autonomous Real-Kitten Social Behavior Controller
    const social = {
      state: 'idle', // 'idle' | 'play_fight' | 'play_pounce' | 'cuddle_nuzzle' | 'tail_bat' | 'stretch_play'
      timer: 1.8,    // First playful interaction starts shortly after unlocking
      duration: 0,
      phaseTime: 0,
      actorIdx: 0,   // 0 = Neo, 1 = Husky
      bapStep: 0,
      pounced: false
    };

    function resetSocialTargets() {
      kittens.forEach((k) => {
        k.targetX = 0;
        k.targetY = 0;
        k.targetZ = 0;
        k.targetYaw = 0;
        k.targetCrouch = 0;
        k.targetEarFlatten = 0;
        k.socialSquint = 0;
        k.socialMood = '';
      });
    }

    function showKittenBubble(k, text, withMeowStyle) {
      k.speechText = text;
      k.speechAlpha = 1.0;
      k.speechY = 0;
      if (withMeowStyle && audioCtx && audioCtx.state === 'running' && !soundMuted) {
        k.meowTimer = 0.24;
        playKittenMeow(k.key, withMeowStyle);
      }
    }

    function startNextSocialBehavior() {
      const r = Math.random();
      social.actorIdx = Math.random() < 0.5 ? 0 : 1;
      social.phaseTime = 0;
      social.bapStep = 0;
      social.pounced = false;

      if (r < 0.34) {
        // Play-fighting / cute bap-bap wrestling!
        social.state = 'play_fight';
        social.duration = 3.4;
        neo.targetX = 82;   // Moves toward center (-136 + 82 = -54)
        husky.targetX = -82; // Moves toward center (+136 - 82 = +54)
        neo.targetYaw = 0.85;
        husky.targetYaw = -0.85;
        neo.targetEarFlatten = 0.85;
        husky.targetEarFlatten = 0.85;
        neo.socialMood = 'Play-fighting Husky! 🐾';
        husky.socialMood = 'Bap-bap-bapping Neo! 🐾';
        showKittenBubble(kittens[social.actorIdx], 'rawr! 🐾', 'chirp');
      } else if (r < 0.60) {
        // Stalk, butt-wiggle & playful pounce!
        social.state = 'play_pounce';
        social.duration = 3.2;
        const attacker = kittens[social.actorIdx];
        const defender = kittens[1 - social.actorIdx];
        const dir = social.actorIdx === 0 ? 1 : -1;
        attacker.targetX = dir * 32;
        attacker.targetYaw = dir * 0.75;
        attacker.targetCrouch = 1.0;
        defender.targetYaw = -dir * 0.65;
        attacker.socialMood = `Stalking ${defender.name}... 👀`;
        defender.socialMood = 'Watching closely! ✨';
      } else if (r < 0.80) {
        // Cozy cuddle & nuzzle together
        social.state = 'cuddle_nuzzle';
        social.duration = 3.6;
        neo.targetX = 92;
        husky.targetX = -92;
        neo.targetYaw = 0.52;
        husky.targetYaw = -0.52;
        neo.socialSquint = 1.0;
        husky.socialSquint = 1.0;
        neo.socialMood = 'Cuddling Husky 💕';
        husky.socialMood = 'Nuzzling Neo 🤎';
        showKittenBubble(neo, 'mrr~ 💕', 'trill');
      } else if (r < 0.92) {
        // Tail batting game
        social.state = 'tail_bat';
        social.duration = 3.0;
        const batter = kittens[social.actorIdx];
        const waver = kittens[1 - social.actorIdx];
        const dir = social.actorIdx === 0 ? 1 : -1;
        batter.targetX = dir * 74;
        batter.targetYaw = dir * 0.8;
        waver.targetX = -dir * 40;
        waver.targetYaw = -dir * 1.15; // Turns slightly so tail waves toward batter
        batter.socialMood = `Batting ${waver.name}'s tail! 🐾`;
        waver.socialMood = 'Teasing with tail~ ✨';
      } else {
        // Cozy stretch & play pose
        social.state = 'stretch_play';
        social.duration = 2.6;
        const k = kittens[social.actorIdx];
        k.targetCrouch = 0.78;
        k.socialSquint = 0.6;
        k.socialMood = 'Big kitten stretch~ ✨';
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

      k.meowTimer = style === 'chirp' ? 0.28 : 0.44;
      k.petLevel = Math.min(1, k.petLevel + 0.45);
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

      playKittenMeow(k.key, style);

      const sx = px !== undefined ? px : k.hitCenter.x;
      const sy = py !== undefined ? py : k.hitCenter.y - 36;
      for (let i = 0; i < 4; i++) {
        floatingParticles.push({
          x: sx + (Math.random() - 0.5) * 34,
          y: sy + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 24,
          vy: -(32 + Math.random() * 26),
          symbol: ['💗', '🐾', '✨', '💕'][Math.floor(Math.random() * 4)],
          size: 13 + Math.random() * 6,
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
          x: px + (Math.random() - 0.5) * 20,
          y: py - 8,
          vx: (Math.random() - 0.5) * 18,
          vy: -(24 + Math.random() * 22),
          symbol: Math.random() > 0.35 ? '💗' : '✨',
          size: 11 + Math.random() * 5,
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
    // 3. 3D Math, Shading & Kitten Rig Renderer
    // ---------------------------------------------------------------------
    let camYaw = 0;
    let camPitch = 0.24;
    let targetCamYaw = 0;
    let targetCamPitch = 0.24;
    let pointerNormX = 0;
    let pointerNormY = 0;

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
      return { x: CX + x1 * s, y: CY + y2 * s, z: z2, s };
    }

    function drawCushionStage() {
      // Soft floor shadow
      const fl = project(0, 66, 0);
      const flg = ctx.createRadialGradient(fl.x, fl.y, 40, fl.x, fl.y, 265 * fl.s);
      flg.addColorStop(0, 'rgba(89, 28, 50, 0.16)');
      flg.addColorStop(0.7, 'rgba(89, 28, 50, 0.05)');
      flg.addColorStop(1, 'rgba(89, 28, 50, 0)');
      ctx.save();
      ctx.translate(fl.x, fl.y);
      ctx.scale(1, 0.26);
      ctx.beginPath();
      ctx.arc(0, 0, 265 * fl.s, 0, Math.PI * 2);
      ctx.fillStyle = flg;
      ctx.fill();
      ctx.restore();

      // 3D Velvet Cushion Base Rim
      const rimPts = [];
      const topPts = [];
      const segs = 48;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const rx = Math.cos(a) * 248;
        const rz = Math.sin(a) * 108;
        topPts.push(project(rx, 46, rz));
        if (Math.sin(a) >= -0.05) {
          rimPts.push(project(rx, 64, rz));
        }
      }

      // Cushion side thickness
      const frontTop = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        if (Math.sin(a) >= -0.05) {
          frontTop.push(project(Math.cos(a) * 248, 46, Math.sin(a) * 108));
        }
      }
      if (frontTop.length > 2 && rimPts.length === frontTop.length) {
        ctx.beginPath();
        ctx.moveTo(frontTop[0].x, frontTop[0].y);
        for (let i = 1; i < frontTop.length; i++) ctx.lineTo(frontTop[i].x, frontTop[i].y);
        for (let i = rimPts.length - 1; i >= 0; i--) ctx.lineTo(rimPts[i].x, rimPts[i].y);
        ctx.closePath();
        const sideG = ctx.createLinearGradient(0, fl.y - 24, 0, fl.y + 10);
        sideG.addColorStop(0, '#F7CFD9');
        sideG.addColorStop(1, '#DDA3B4');
        ctx.fillStyle = sideG;
        ctx.fill();
      }

      // Cushion top plush surface
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
      ctx.closePath();
      const topP = project(0, 46, 0);
      const topG = ctx.createRadialGradient(topP.x - 40, topP.y - 18, 20, topP.x, topP.y, 260 * topP.s);
      topG.addColorStop(0, '#FFF9FB');
      topG.addColorStop(0.6, '#FFE8F0');
      topG.addColorStop(1, '#F5C4D4');
      ctx.fillStyle = topG;
      ctx.fill();
      ctx.strokeStyle = 'rgba(224, 175, 190, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Quilted tufted cushion buttons
      [[-170, 52, 26], [0, 52, 34], [170, 52, 26]].forEach(([bx, by, bz]) => {
        const bp = project(bx, by, bz);
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, 3.6 * bp.s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(218, 155, 174, 0.55)';
        ctx.fill();
      });
    }

    function draw3DSphere(wx, wy, wz, rx, ry, cLight, cMid, cDark, strokeCol) {
      const p = project(wx, wy, wz);
      const prx = rx * p.s;
      const pry = (ry || rx) * p.s;
      const g = ctx.createRadialGradient(
        p.x - prx * 0.34,
        p.y - pry * 0.36,
        Math.max(1, prx * 0.1),
        p.x,
        p.y,
        Math.max(prx, pry) * 1.05
      );
      g.addColorStop(0, cLight);
      g.addColorStop(0.55, cMid);
      g.addColorStop(1, cDark);

      ctx.beginPath();
      ctx.ellipse(p.x, p.y, prx, pry, 0, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      if (strokeCol) {
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      return p;
    }

    function drawKitten(k, elapsed) {
      const isGinger = k.coat === 'ginger';
      const purrVib = k.petLevel > 0.15 ? Math.sin(elapsed * 46) * 0.65 * k.petLevel : 0;
      const breath = Math.sin(elapsed * 2.5 + (isGinger ? 0 : 1.1));
      const bodyBounce = breath * 1.4;

      const curX = k.wx + k.animX;
      const curY = k.wy + k.animY + k.hopY + k.crouchAmt * 7;
      const curZ = k.wz + k.animZ;
      const yaw = k.baseYaw + k.animYaw + k.lookYaw * 0.32 + k.leanX * 0.16;
      const cosK = Math.cos(yaw);
      const sinK = Math.sin(yaw);

      // Local-to-world helper around kitten anchor
      const toWorld = (lx, ly, lz) => ({
        x: curX + (lx * cosK - lz * sinK) + purrVib,
        y: curY + ly + bodyBounce,
        z: curZ + (lx * sinK + lz * cosK)
      });

      // Contact shadow on cushion (shrinks slightly when hopping in the air!)
      const shadowScale = Math.max(0.6, 1 + k.hopY * 0.012);
      const sh = project(curX, 45, curZ + 4);
      const shG = ctx.createRadialGradient(sh.x, sh.y, 8, sh.x, sh.y, 76 * sh.s * shadowScale);
      shG.addColorStop(0, `rgba(130, 62, 84, ${0.25 * shadowScale})`);
      shG.addColorStop(1, 'rgba(130, 62, 84, 0)');
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.scale(1.15 * shadowScale, 0.36 * shadowScale);
      ctx.beginPath();
      ctx.arc(0, 0, 72 * sh.s, 0, Math.PI * 2);
      ctx.fillStyle = shG;
      ctx.fill();
      ctx.restore();

      // Palette definitions
      const furLight = isGinger ? '#FFBE7B' : '#FFFFFF';
      const furMid   = isGinger ? '#E8833A' : '#F4EBE5';
      const furDark  = isGinger ? '#B35318' : '#D5C6BD';
      const patchLight = '#9E6647';
      const patchMid   = '#704128';
      const patchDark  = '#472413';

      const parts = [];

      // 1. Articulated 3D Tail (10 segments curving out & upward when happy)
      const tailHappyLift = k.petLevel * 22;
      const tailSway = Math.sin(elapsed * (2.3 + k.petLevel * 1.8) + k.tailPhase);
      const tailSide = isGinger ? -1 : 1;
      for (let t = 0; t < 10; t++) {
        const u = t / 9;
        const lx = tailSide * (28 + u * 36 + tailSway * (10 + u * 16));
        const ly = 20 - Math.pow(u, 1.35) * (24 + tailHappyLift) + Math.cos(elapsed * 2.5 + u * 2) * 3;
        const lz = -34 + u * 18;
        const w = toWorld(lx, ly, lz);
        const rad = 11.5 - u * 4.2;
        const pProj = project(w.x, w.y, w.z);
        const useBrownTip = !isGinger && u > 0.52;
        const useStripe = isGinger && t % 2 === 1;
        parts.push({
          z: pProj.z,
          draw: () => {
            draw3DSphere(
              w.x, w.y, w.z, rad, rad,
              useBrownTip ? patchLight : useStripe ? '#E57A30' : furLight,
              useBrownTip ? patchMid : useStripe ? '#BC5617' : furMid,
              useBrownTip ? patchDark : useStripe ? '#8A3808' : furDark
            );
          }
        });
      }

      // 2. Plump Haunches & Torso (depth-sorted 3D spheres with pounce butt-wiggle!)
      const wig = k.buttWiggle;
      const haunchL = toWorld(-26 + wig, 14 - k.crouchAmt * 5, -14);
      const haunchR = toWorld(26 + wig, 14 - k.crouchAmt * 5, -14);
      const torsoBack = toWorld(wig * 0.7, 6 - k.crouchAmt * 3, -18);
      const torsoChest = toWorld(0, 4 + breath * 0.6 + k.crouchAmt * 5, 8);

      [
        { w: haunchL, rx: 28, ry: 26, brown: !isGinger },
        { w: haunchR, rx: 28, ry: 26, brown: false },
        { w: torsoBack, rx: 38, ry: 34 + breath * 0.8, brown: !isGinger && false },
        { w: torsoChest, rx: 34 + breath * 0.8, ry: 31, cream: true }
      ].forEach((vol, idx) => {
        const pp = project(vol.w.x, vol.w.y, vol.w.z);
        parts.push({
          z: pp.z,
          draw: () => {
            if (vol.cream) {
              draw3DSphere(
                vol.w.x, vol.w.y, vol.w.z, vol.rx, vol.ry,
                isGinger ? '#FFF6EC' : '#FFFFFF',
                isGinger ? '#FFE5CC' : '#F6EFEA',
                isGinger ? '#E8B78C' : '#D9CBC2'
              );
            } else if (vol.brown) {
              draw3DSphere(vol.w.x, vol.w.y, vol.w.z, vol.rx, vol.ry, patchLight, patchMid, patchDark);
            } else {
              draw3DSphere(vol.w.x, vol.w.y, vol.w.z, vol.rx, vol.ry, furLight, furMid, furDark);
            }

            // Tabby stripes on Neo's back
            if (isGinger && idx === 2) {
              ctx.save();
              ctx.strokeStyle = 'rgba(162, 70, 18, 0.48)';
              ctx.lineWidth = 4.2 * pp.s;
              ctx.lineCap = 'round';
              [-1, 1].forEach((side) => {
                ctx.beginPath();
                ctx.moveTo(pp.x + side * 14 * pp.s, pp.y - 18 * pp.s);
                ctx.quadraticCurveTo(pp.x + side * 26 * pp.s, pp.y - 4 * pp.s, pp.x + side * 22 * pp.s, pp.y + 12 * pp.s);
                ctx.stroke();
              });
              ctx.restore();
            }

            // Cute cocoa saddle patch on Husky's back
            if (!isGinger && idx === 2) {
              draw3DSphere(vol.w.x + 8, vol.w.y - 10, vol.w.z - 4, 21, 16, patchLight, patchMid, patchDark);
            }
          }
        });
      });

      // 3. Front Legs & Kneading / Play-Fighting Bapping Paws
      const kneadAmt = k.petLevel * 4.5;
      const pawL_lift = Math.max(0, Math.sin(k.kneadPhase)) * kneadAmt + k.pawSwipeL * 24;
      const pawR_lift = Math.max(0, Math.sin(k.kneadPhase + Math.PI)) * kneadAmt + k.pawSwipeR * 24;

      [
        { lx: -17, lift: pawL_lift, swipe: k.pawSwipeL },
        { lx: 17, lift: pawR_lift, swipe: k.pawSwipeR }
      ].forEach(({ lx, lift, swipe }) => {
        const reachZ = swipe * 26 + k.crouchAmt * 8;
        const legW = toWorld(lx, 18 - lift * 0.6, 26 + reachZ * 0.45);
        const pawW = toWorld(lx, 30 - lift, 34 + reachZ);
        const legP = project(legW.x, legW.y, legW.z);
        const pawP = project(pawW.x, pawW.y, pawW.z);

        parts.push({
          z: legP.z,
          draw: () => {
            draw3DSphere(legW.x, legW.y, legW.z, 11.5, 16, furLight, furMid, furDark);
          }
        });
        parts.push({
          z: pawP.z + 1,
          draw: () => {
            const p = draw3DSphere(
              pawW.x, pawW.y, pawW.z, 13, 9.5,
              '#FFFFFF',
              isGinger ? '#FFF0E0' : '#F5ECE6',
              isGinger ? '#DFBFA0' : '#D5C5BC'
            );
            // Tiny toe creases
            ctx.strokeStyle = 'rgba(140, 95, 85, 0.35)';
            ctx.lineWidth = 1.1 * p.s;
            [-4, 4].forEach((tx) => {
              ctx.beginPath();
              ctx.moveTo(p.x + tx * p.s, p.y + 1 * p.s);
              ctx.lineTo(p.x + tx * p.s, p.y + 7 * p.s);
              ctx.stroke();
            });
            // Tiny pink toe bean peek when kneading
            if (lift > 1.2) {
              ctx.fillStyle = '#FF9EB5';
              ctx.beginPath();
              ctx.ellipse(p.x, p.y + 5.5 * p.s, 4 * p.s, 2.2 * p.s, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      });

      // 4. Collar & Golden Heart Tag
      const collarW = toWorld(0, -14, 24);
      const collarP = project(collarW.x, collarW.y, collarW.z);
      parts.push({
        z: collarP.z + 2,
        draw: () => {
          ctx.save();
          ctx.strokeStyle = k.collarCol;
          ctx.lineWidth = 5.5 * collarP.s;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.ellipse(collarP.x, collarP.y, 24 * collarP.s, 9 * collarP.s, 0, 0.15, Math.PI - 0.15);
          ctx.stroke();

          // Tiny golden heart charm
          const ty = collarP.y + 10.5 * collarP.s;
          ctx.fillStyle = k.tagCol;
          ctx.strokeStyle = '#C99738';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(collarP.x, ty, 4.6 * collarP.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(collarP.x - 1.4 * collarP.s, ty - 1.4 * collarP.s, 1.4 * collarP.s, 0, Math.PI * 2);
          ctx.fillStyle = '#FFF9E2';
          ctx.fill();
          ctx.restore();
        }
      });

      // 5. Articulated 3D Head (rotates toward pointer + leans into rubs!)
      const hYaw = yaw + k.lookYaw * 0.55 + k.leanX * 0.24;
      const hPitch = k.lookPitch * 0.35 - k.petLevel * 0.14 + k.leanY * 0.12;
      const hRoll = k.leanX * 0.16 + Math.sin(elapsed * 1.7 + (isGinger ? 0 : 2)) * 0.04;

      const cosHY = Math.cos(hYaw);
      const sinHY = Math.sin(hYaw);
      const cosHP = Math.cos(hPitch);
      const sinHP = Math.sin(hPitch);
      const cosHR = Math.cos(hRoll);
      const sinHR = Math.sin(hRoll);

      const headPivot = toWorld(k.leanX * 4, -36 - k.petLevel * 2, 14);
      const headTransform = (lx, ly, lz) => {
        // Roll -> Pitch -> Yaw
        const x1 = lx * cosHR - ly * sinHR;
        const y1 = lx * sinHR + ly * cosHR;
        const y2 = y1 * cosHP - lz * sinHP;
        const z2 = y1 * sinHP + lz * cosHP;
        const x3 = x1 * cosHY - z2 * sinHY;
        const z3 = x1 * sinHY + z2 * cosHY;
        return {
          x: headPivot.x + x3,
          y: headPivot.y + y2,
          z: headPivot.z + z3
        };
      };

      const headCenterProj = project(headPivot.x, headPivot.y, headPivot.z);
      k.hitCenter = { x: headCenterProj.x, y: headCenterProj.y + 18, rx: 95, ry: 95 };

      // 5a. Plush 3D Ears (outer fur + pink inner ear; flatten slightly during play-fight!)
      [-1, 1].forEach((side) => {
        const earDroop = k.petLevel * 5 + k.earFlatten * 11 + (side === 1 ? k.earTwitch * 4 : 0);
        const earBaseA = headTransform(side * 12, -26, 2);
        const earBaseB = headTransform(side * 34, -12 + earDroop * 0.3, -4);
        const earTip = headTransform(side * 33, -52 + earDroop, -2);
        const innerA = headTransform(side * 15, -24, 5);
        const innerB = headTransform(side * 30, -14 + earDroop * 0.3, 1);
        const innerTip = headTransform(side * 30, -45 + earDroop, 2);

        const pA = project(earBaseA.x, earBaseA.y, earBaseA.z);
        const pB = project(earBaseB.x, earBaseB.y, earBaseB.z);
        const pT = project(earTip.x, earTip.y, earTip.z);
        const piA = project(innerA.x, innerA.y, innerA.z);
        const piB = project(innerB.x, innerB.y, innerB.z);
        const piT = project(innerTip.x, innerTip.y, innerTip.z);

        const earUseBrown = !isGinger;
        parts.push({
          z: (pA.z + pB.z + pT.z) / 3,
          draw: () => {
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.quadraticCurveTo((pA.x + pT.x) * 0.5, pT.y + 6, pT.x, pT.y);
            ctx.quadraticCurveTo((pB.x + pT.x) * 0.5 + side * 4, (pB.y + pT.y) * 0.5, pB.x, pB.y);
            ctx.closePath();
            ctx.fillStyle = earUseBrown ? patchMid : furMid;
            ctx.fill();
            ctx.strokeStyle = earUseBrown ? patchDark : furDark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Inner soft pink ear
            ctx.beginPath();
            ctx.moveTo(piA.x, piA.y);
            ctx.lineTo(piT.x, piT.y);
            ctx.lineTo(piB.x, piB.y);
            ctx.closePath();
            ctx.fillStyle = '#FFADC2';
            ctx.fill();
          }
        });
      });

      // 5b. Main 3D Skull + Cheek Fluffs + Facial Features
      parts.push({
        z: headCenterProj.z,
        draw: () => {
          // Cheek fluff spheres behind/sides
          const cL = headTransform(-22, 8, 6);
          const cR = headTransform(22, 8, 6);
          draw3DSphere(cL.x, cL.y, cL.z, 19, 16, furLight, furMid, furDark);
          draw3DSphere(cR.x, cR.y, cR.z, 19, 16, furLight, furMid, furDark);

          // Main plump 3D head
          const hp = draw3DSphere(headPivot.x, headPivot.y, headPivot.z, 36, 32, furLight, furMid, furDark);

          // Coat-specific forehead/mask markings projected on 3D skull
          if (isGinger) {
            // Cute ginger tabby forehead 'M' stripes
            ctx.save();
            ctx.strokeStyle = 'rgba(165, 72, 18, 0.58)';
            ctx.lineWidth = 2.6 * hp.s;
            ctx.lineCap = 'round';
            [-9, 0, 9].forEach((sx, idx) => {
              const s0 = headTransform(sx, -24, 29);
              const s1 = headTransform(sx * 0.7, -13 - (idx === 1 ? 2 : 0), 33);
              const ps0 = project(s0.x, s0.y, s0.z);
              const ps1 = project(s1.x, s1.y, s1.z);
              ctx.beginPath();
              ctx.moveTo(ps0.x, ps0.y);
              ctx.lineTo(ps1.x, ps1.y);
              ctx.stroke();
            });
            ctx.restore();
          } else {
            // Husky's adorable white & chocolate-brown bicolor face mask!
            [-1, 1].forEach((side) => {
              const capW = headTransform(side * 16, -13, 18);
              draw3DSphere(capW.x, capW.y, capW.z, 19, 16, patchLight, patchMid, patchDark);
            });
            // Clean snowy white blaze down the center nose bridge & fluffy white cheeks
            const blazeTop = headTransform(0, -18, 32);
            const blazeMid = headTransform(0, -4, 34);
            const pb0 = project(blazeTop.x, blazeTop.y, blazeTop.z);
            const pb1 = project(blazeMid.x, blazeMid.y, blazeMid.z);
            ctx.beginPath();
            ctx.moveTo(pb0.x, pb0.y);
            ctx.lineTo(pb1.x - 12 * pb1.s, pb1.y + 8 * pb1.s);
            ctx.lineTo(pb1.x + 12 * pb1.s, pb1.y + 8 * pb1.s);
            ctx.closePath();
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
          }

          // Plush cream/white muzzle puffs
          const muzL = headTransform(-7.5, 10, 31);
          const muzR = headTransform(7.5, 10, 31);
          draw3DSphere(muzL.x, muzL.y, muzL.z, 10.5, 8.8, '#FFFFFF', isGinger ? '#FFF3E4' : '#FAF5F2', isGinger ? '#E5BE9A' : '#DFD2CA');
          draw3DSphere(muzR.x, muzR.y, muzR.z, 10.5, 8.8, '#FFFFFF', isGinger ? '#FFF3E4' : '#FAF5F2', isGinger ? '#E5BE9A' : '#DFD2CA');

          // Rosy blush cheeks (glow warmly when petted!)
          const blushAlpha = 0.25 + k.petLevel * 0.5;
          [-20, 20].forEach((bx) => {
            const bw = headTransform(bx, 11, 28);
            const bp = project(bw.x, bw.y, bw.z);
            const bg = ctx.createRadialGradient(bp.x, bp.y, 1, bp.x, bp.y, 10 * bp.s);
            bg.addColorStop(0, `rgba(255, 120, 155, ${blushAlpha})`);
            bg.addColorStop(1, 'rgba(255, 120, 155, 0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, 10 * bp.s, 0, Math.PI * 2);
            ctx.fill();
          });

          // Expressive 3D Glossy Eyes (or happy ^ ^ squint when rubbed!)
          [-14, 14].forEach((ex) => {
            const ew = headTransform(ex, -2, 31);
            const ep = project(ew.x, ew.y, ew.z);
            const er = 7.4 * ep.s;

            if (k.happySquint > 0.45) {
              // Happy crescent purr eyes ^ ^
              ctx.strokeStyle = '#3B1D26';
              ctx.lineWidth = 2.6 * ep.s;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(ep.x, ep.y + 2 * ep.s, er * 0.78, Math.PI * 1.15, Math.PI * 1.85);
              ctx.stroke();
            } else {
              const eyeOpenY = Math.max(0.12, 1 - k.blinkAmt);
              ctx.save();
              ctx.translate(ep.x, ep.y);
              ctx.scale(1, eyeOpenY);

              // Outer eye socket shadow + glossy iris
              const ig = ctx.createRadialGradient(0, -er * 0.2, 1, 0, 0, er);
              ig.addColorStop(0, k.eyeCols[0]);
              ig.addColorStop(0.55, k.eyeCols[1]);
              ig.addColorStop(1, k.eyeCols[2]);
              ctx.beginPath();
              ctx.arc(0, 0, er, 0, Math.PI * 2);
              ctx.fillStyle = ig;
              ctx.fill();

              // Cute big kitten pupil (dilates gently with affection!)
              const pupW = er * (0.58 + k.petLevel * 0.14);
              const pupH = er * 0.76;
              ctx.beginPath();
              ctx.ellipse(k.lookYaw * 1.8 * ep.s, k.lookPitch * 1.5 * ep.s, pupW, pupH, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#181014';
              ctx.fill();

              // Dual crisp specular corneal catchlights
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(-er * 0.34, -er * 0.34, er * 0.28, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(er * 0.28, er * 0.26, er * 0.13, 0, Math.PI * 2);
              ctx.fill();

              // Soft upper lash rim
              ctx.strokeStyle = '#2B151D';
              ctx.lineWidth = 1.6 * ep.s;
              ctx.beginPath();
              ctx.arc(0, 0, er, Math.PI * 1.08, Math.PI * 1.92);
              ctx.stroke();
              ctx.restore();
            }
          });

          // Tiny 3D Rosy Pink Nose
          const nw = headTransform(0, 6.5, 36);
          const np = project(nw.x, nw.y, nw.z);
          ctx.fillStyle = '#FF87A2';
          ctx.beginPath();
          ctx.moveTo(np.x - 4.2 * np.s, np.y - 2.2 * np.s);
          ctx.lineTo(np.x + 4.2 * np.s, np.y - 2.2 * np.s);
          ctx.quadraticCurveTo(np.x, np.y + 4.2 * np.s, np.x - 4.2 * np.s, np.y - 2.2 * np.s);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          ctx.arc(np.x - 1.2 * np.s, np.y - 1.2 * np.s, 1.1 * np.s, 0, Math.PI * 2);
          ctx.fill();

          // Cute 'ω' mouth OR open meowing pink mouth!
          const mw = headTransform(0, 12.5, 34);
          const mp = project(mw.x, mw.y, mw.z);
          if (k.mouthOpen > 0.08) {
            const mo = k.mouthOpen;
            ctx.fillStyle = '#992B4C';
            ctx.beginPath();
            ctx.ellipse(mp.x, mp.y + 1.5 * mp.s, 4.2 * mp.s, (2.2 + mo * 4.8) * mp.s, 0, 0, Math.PI * 2);
            ctx.fill();
            // Cute tiny pink tongue
            ctx.fillStyle = '#FF8FAB';
            ctx.beginPath();
            ctx.ellipse(mp.x, mp.y + (2.5 + mo * 2.5) * mp.s, 2.8 * mp.s, (1.6 + mo * 1.8) * mp.s, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = '#6A3844';
            ctx.lineWidth = 1.6 * mp.s;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(mp.x, mp.y - 3 * mp.s);
            ctx.lineTo(mp.x, mp.y - 0.5 * mp.s);
            ctx.quadraticCurveTo(mp.x - 3.5 * mp.s, mp.y + 3 * mp.s, mp.x - 6.5 * mp.s, mp.y + 0.5 * mp.s);
            ctx.moveTo(mp.x, mp.y - 0.5 * mp.s);
            ctx.quadraticCurveTo(mp.x + 3.5 * mp.s, mp.y + 3 * mp.s, mp.x + 6.5 * mp.s, mp.y + 0.5 * mp.s);
            ctx.stroke();
          }

          // Delicate 3D Curved Whiskers
          ctx.strokeStyle = isGinger ? 'rgba(255, 248, 240, 0.85)' : 'rgba(195, 175, 170, 0.8)';
          ctx.lineWidth = 1.15 * hp.s;
          [-1, 1].forEach((side) => {
            [-2, 2, 6].forEach((wyOffset, wi) => {
              const ws0 = headTransform(side * 12, 9 + wyOffset * 0.6, 32);
              const ws1 = headTransform(side * 38, 7 + wyOffset * 1.8, 26);
              const p0 = project(ws0.x, ws0.y, ws0.z);
              const p1 = project(ws1.x, ws1.y, ws1.z);
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.quadraticCurveTo((p0.x + p1.x) * 0.5, p0.y - (1 - wi) * 2, p1.x, p1.y);
              ctx.stroke();
            });
          });
        }
      });

      // Depth-sort all 3D parts of this kitten back-to-front!
      parts.sort((a, b) => a.z - b.z);
      for (let i = 0; i < parts.length; i++) {
        parts[i].draw();
      }

      // Floating cute meow speech bubble right above kitten
      if (k.speechAlpha > 0.02) {
        const spX = headCenterProj.x;
        const spY = headCenterProj.y - 58 * headCenterProj.s - k.speechY;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k.speechAlpha);
        ctx.font = '700 14px "Gloria Hallelujah", cursive';
        const tw = ctx.measureText(k.speechText).width;
        const bw = tw + 20;
        const bh = 26;
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
    }

    // ---------------------------------------------------------------------
    // 4. Pointer / Touch Rubbing & Hover Handlers
    // ---------------------------------------------------------------------
    let isPointerDown = false;
    let lastPX = 0;
    let lastPY = 0;

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
        if (dx * dx + dy * dy <= 1.0) {
          return { kitten: k, dx, dy };
        }
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
      targetCamYaw = pointerNormX * 0.12;
      targetCamPitch = 0.24 - pointerNormY * 0.05;

      const moveDist = Math.hypot(pt.x - lastPX, pt.y - lastPY);
      lastPX = pt.x;
      lastPY = pt.y;

      const hit = hitTestKitten(pt.x, pt.y);
      if (hit) {
        canvas.style.cursor = 'pointer';
        // Both touch-drag rubbing AND mouse-hover rubbing over the kitten pet it smoothly!
        if (isPointerDown || (e.pointerType === 'mouse' && moveDist > 1.5)) {
          applyPetRub(hit.kitten, moveDist, pt.x, pt.y, hit.dx, hit.dy);
        }
      } else {
        canvas.style.cursor = isPointerDown ? 'grabbing' : 'grab';
      }
    });

    const endRub = () => {
      isPointerDown = false;
    };
    canvas.addEventListener('pointerup', endRub);
    canvas.addEventListener('pointercancel', endRub);
    canvas.addEventListener('pointerleave', () => {
      isPointerDown = false;
      targetCamYaw = 0;
      targetCamPitch = 0.24;
      pointerNormX = 0;
      pointerNormY = 0;
    });

    if (neoBadge) {
      neoBadge.addEventListener('click', () => {
        ensureAudio();
        triggerKittenMeow(neo, 'sweet');
      });
    }
    if (huskyBadge) {
      huskyBadge.addEventListener('click', () => {
        ensureAudio();
        triggerKittenMeow(husky, 'sweet');
      });
    }

    // ---------------------------------------------------------------------
    // 5. Smooth 120Hz Animation Loop (Auto-pauses offscreen or when hidden)
    // ---------------------------------------------------------------------
    let isInView = true;
    let rafId = null;
    let lastTime = 0;
    let elapsed = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const mainEl = document.getElementById('main');
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

      const camDamp = 1 - Math.exp(-8.5 * dt);
      camYaw += (targetCamYaw - camYaw) * camDamp;
      camPitch += (targetCamPitch - camPitch) * camDamp;

      // Update autonomous real-kitten social behavior (paused while petting)
      const isBeingPetted = kittens.some((k) => k.petLevel > 0.18);
      if (!isBeingPetted) {
        if (social.state === 'idle') {
          social.timer -= dt;
          if (social.timer <= 0) {
            startNextSocialBehavior();
          }
        } else {
          social.phaseTime += dt;
          const pt = social.phaseTime;

          if (social.state === 'play_fight') {
            // Alternating rapid soft-paw baps between Neo & Husky!
            const bapPhase = Math.max(0, pt - 0.45);
            const sw = Math.sin(bapPhase * 15);
            neo.pawSwipeL = Math.max(0, sw) * 0.9;
            neo.pawSwipeR = Math.max(0, -sw) * 0.9;
            husky.pawSwipeR = Math.max(0, Math.sin(bapPhase * 15 + 1.4)) * 0.9;
            husky.pawSwipeL = Math.max(0, -Math.sin(bapPhase * 15 + 1.4)) * 0.9;
            neo.hopY = -Math.abs(Math.sin(bapPhase * 6.5)) * 7;
            husky.hopY = -Math.abs(Math.sin(bapPhase * 6.5 + 1.1)) * 7;

            if (pt > 0.6 && social.bapStep === 0) {
              social.bapStep = 1;
              showKittenBubble(husky, 'bap bap! 🐾', 'chirp');
              floatingParticles.push({ x: CX, y: CY - 38, vx: 0, vy: -26, symbol: '🐾', size: 16, life: 0, maxLife: 0.9 });
            } else if (pt > 1.7 && social.bapStep === 1) {
              social.bapStep = 2;
              showKittenBubble(neo, 'mew! 💥', 'trill');
              floatingParticles.push({ x: CX + 10, y: CY - 44, vx: 8, vy: -30, symbol: '✨', size: 15, life: 0, maxLife: 0.9 });
            }
          } else if (social.state === 'play_pounce') {
            const attacker = kittens[social.actorIdx];
            const defender = kittens[1 - social.actorIdx];
            const dir = social.actorIdx === 0 ? 1 : -1;

            if (pt < 1.25) {
              // Cute pre-pounce butt wiggle!
              attacker.buttWiggle = Math.sin(pt * 22) * 3.8 * Math.min(1, pt * 2);
            } else if (pt < 2.05) {
              const pProg = (pt - 1.25) / 0.8;
              attacker.buttWiggle = 0;
              attacker.targetCrouch = 0;
              attacker.targetX = dir * 92;
              attacker.hopY = -Math.sin(pProg * Math.PI) * 34;
              attacker.pawSwipeL = Math.sin(pProg * Math.PI) * 0.8;
              attacker.pawSwipeR = Math.sin(pProg * Math.PI) * 0.8;

              if (!social.pounced && pProg > 0.45) {
                social.pounced = true;
                defender.targetX = dir * 18; // Playful startle hop back
                defender.hopY = -18;
                showKittenBubble(attacker, 'gotcha! ✨', 'chirp');
                showKittenBubble(defender, 'eep! 🐾', 'chirp');
              }
              if (pProg > 0.55) {
                defender.hopY = -Math.sin(((pProg - 0.55) / 0.45) * Math.PI) * 16;
              }
            } else {
              attacker.hopY = 0;
              defender.hopY = 0;
            }
          } else if (social.state === 'cuddle_nuzzle') {
            if (Math.random() < 0.08) {
              floatingParticles.push({
                x: CX + (Math.random() - 0.5) * 26,
                y: CY - 46,
                vx: (Math.random() - 0.5) * 14,
                vy: -28,
                symbol: Math.random() > 0.4 ? '💕' : '💖',
                size: 14,
                life: 0,
                maxLife: 1.1
              });
            }
          } else if (social.state === 'tail_bat') {
            const batter = kittens[social.actorIdx];
            const sw = Math.max(0, Math.sin(pt * 9.5));
            batter.pawSwipeR = sw * 0.85;
            if (pt > 0.9 && social.bapStep === 0) {
              social.bapStep = 1;
              showKittenBubble(batter, 'bap! 🐾', 'chirp');
            }
          }

          if (pt >= social.duration) {
            social.state = 'idle';
            social.timer = 3.8 + Math.random() * 4.2;
            resetSocialTargets();
            kittens.forEach((k) => {
              k.hopY = 0;
              k.pawSwipeL = 0;
              k.pawSwipeR = 0;
              k.buttWiggle = 0;
            });
          }
        }
      }

      let maxPetLevel = 0;
      kittens.forEach((k) => {
        // Smoothly damp autonomous motion targets
        const posDamp = 1 - Math.exp(-5.8 * dt);
        k.animX += (k.targetX - k.animX) * posDamp;
        k.animY += (k.targetY - k.animY) * posDamp;
        k.animZ += (k.targetZ - k.animZ) * posDamp;
        k.animYaw += (k.targetYaw - k.animYaw) * posDamp;
        k.crouchAmt += (k.targetCrouch - k.crouchAmt) * (1 - Math.exp(-7.5 * dt));
        k.earFlatten += (k.targetEarFlatten - k.earFlatten) * (1 - Math.exp(-8 * dt));
        if (social.state === 'idle' || isBeingPetted) {
          k.hopY *= Math.exp(-10 * dt);
          k.pawSwipeL *= Math.exp(-10 * dt);
          k.pawSwipeR *= Math.exp(-10 * dt);
          k.buttWiggle *= Math.exp(-10 * dt);
        }

        // Head follows cursor smoothly (blended down during play-fight so they look at each other!)
        const lookScale = social.state === 'play_fight' || social.state === 'cuddle_nuzzle' ? 0.2 : 1;
        const targetLookY = Math.max(-0.5, Math.min(0.5, (pointerNormX * 340 - (k.wx + k.animX)) / 260)) * lookScale;
        const targetLookP = Math.max(-0.3, Math.min(0.3, pointerNormY * 0.3)) * lookScale;
        const lookDamp = 1 - Math.exp(-7 * dt);
        k.lookYaw += (targetLookY - k.lookYaw) * lookDamp;
        k.lookPitch += (targetLookP - k.lookPitch) * lookDamp;

        // Smooth decay of petting & lean
        const petDecay = Math.exp(-1.2 * dt);
        k.petLevel *= petDecay;
        k.leanX *= Math.exp(-5 * dt);
        k.leanY *= Math.exp(-5 * dt);
        if (k.moodEl && k.petLevel < 0.08 && k.speechAlpha < 0.05) {
          const desiredMood = k.socialMood || k.idleMood;
          if (k.moodEl.textContent !== desiredMood) {
            k.moodEl.textContent = desiredMood;
          }
        }
        maxPetLevel = Math.max(maxPetLevel, k.petLevel);

        // Happy squint & paw kneading
        const squintTarget = Math.max(k.socialSquint, k.petLevel > 0.25 ? Math.min(1, k.petLevel * 1.2) : 0);
        k.happySquint += (squintTarget - k.happySquint) * (1 - Math.exp(-8 * dt));
        k.kneadPhase += dt * (2.2 + k.petLevel * 6.5);

        // Meow mouth envelope
        if (k.meowTimer > 0) {
          k.meowTimer = Math.max(0, k.meowTimer - dt);
          const mTarget = Math.sin((k.meowTimer / 0.44) * Math.PI);
          k.mouthOpen += (mTarget - k.mouthOpen) * (1 - Math.exp(-18 * dt));
        } else {
          k.mouthOpen *= Math.exp(-14 * dt);
        }

        // Speech bubble float & fade
        if (k.speechAlpha > 0) {
          k.speechY += dt * 16;
          k.speechAlpha = Math.max(0, k.speechAlpha - dt * 0.72);
        }

        // Natural blinking
        k.blinkTimer -= dt;
        if (k.blinkTimer <= 0) {
          if (k.blinkTimer > -0.16) {
            k.blinkAmt = Math.sin(((-k.blinkTimer) / 0.16) * Math.PI);
          } else {
            k.blinkAmt = 0;
            k.blinkTimer = 2.6 + Math.random() * 3.2;
          }
        }

        // Occasional cute ear twitch
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

      // Render 3D scene
      ctx.clearRect(0, 0, W, H);
      drawCushionStage();

      // Depth-sort kittens based on animated 3D world position
      const ordered = kittens
        .map((k) => ({ k, z: project(k.wx + k.animX, k.wy + k.animY, k.wz + k.animZ).z }))
        .sort((a, b) => a.z - b.z);
      for (let i = 0; i < ordered.length; i++) {
        drawKitten(ordered[i].k, elapsed);
      }

      // Update & draw floating heart/paw particles
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

    // Watch #main visibility (unlocks after password!) and #bday-overlay
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
