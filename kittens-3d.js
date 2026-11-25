/**
 * Our Kitty Lounge — Neo, Husky & 8 Uniquely Colored Lifelike Animated Cats
 * Features:
 * - Action-matched real cat audio: sweet meows (petting), real purring (rub/cuddle), playful meows (play/fight), hungry/excited meows (food/jumping)
 * - Food Bowl & Treat Feeding sequence -> Excited Zoomies & Jumping with Squash-and-Stretch physics
 * - Interactive Yarn Ball Toy + Autonomous Play-Fighting, Stalking Pounce, Cuddling, Tail Batting & Stretching
 * - Smooth 120Hz delta-time animation across Mobile, Tablet, Laptop & Desktop
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('kittens-3d-canvas');
    const card = document.getElementById('kittens-corner');
    const feedBtn = document.getElementById('kittens-feed-btn');
    const playBtn = document.getElementById('kittens-play-btn');
    const modeBtn = document.getElementById('kittens-mode-btn');
    const soundBtn = document.getElementById('kittens-sound-btn');
    const badgesWrap = document.getElementById('kittens-badges');

    if (!canvas || !card) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ---------------------------------------------------------------------
    // 1. Multi-Action Real Cat Audio Engine (Meow / Play / Food / Real Purr)
    // ---------------------------------------------------------------------
    let audioCtx = null;
    let soundMuted = false;

    const SOUND_BANKS = {
      meow: {
        url: 'assets/kitten-meows.mp3',
        rawBytes: null,
        buffer: null,
        decoding: false,
        lastIdx: -1,
        slices: [
          { start: 0.05, dur: 0.85 }, { start: 2.00, dur: 0.90 }, { start: 5.00, dur: 0.90 },
          { start: 6.08, dur: 0.90 }, { start: 8.05, dur: 0.90 }, { start: 10.10, dur: 0.95 },
          { start: 13.20, dur: 0.95 }, { start: 16.15, dur: 0.95 }, { start: 22.10, dur: 0.95 },
          { start: 27.10, dur: 0.95 }, { start: 33.20, dur: 1.00 }, { start: 48.00, dur: 1.00 }
        ],
        fallback: new Audio('assets/kitten-meows.mp3'),
        stopTimer: null
      },
      play: {
        url: 'assets/kitten-play.mp3',
        rawBytes: null,
        buffer: null,
        decoding: false,
        lastIdx: -1,
        slices: [
          { start: 0.05, dur: 0.85 }, { start: 1.15, dur: 0.85 }, { start: 2.20, dur: 0.90 },
          { start: 4.10, dur: 0.95 }, { start: 6.20, dur: 0.95 }
        ],
        fallback: new Audio('assets/kitten-play.mp3'),
        stopTimer: null
      },
      food: {
        url: 'assets/kitten-food.mp3',
        rawBytes: null,
        buffer: null,
        decoding: false,
        lastIdx: -1,
        slices: [
          { start: 0.05, dur: 0.90 }, { start: 1.25, dur: 0.85 }, { start: 2.80, dur: 0.90 },
          { start: 4.50, dur: 0.95 }, { start: 6.20, dur: 0.95 }, { start: 8.20, dur: 0.95 }
        ],
        fallback: new Audio('assets/kitten-food.mp3'),
        stopTimer: null
      }
    };

    Object.values(SOUND_BANKS).forEach((bank) => {
      bank.fallback.preload = 'auto';
    });

    // Real Purr Loop Bank
    const purrBank = {
      url: 'assets/kitten-purr.mp3',
      rawBytes: null,
      buffer: null,
      decoding: false,
      srcNode: null,
      gainNode: null,
      active: false,
      fallback: new Audio('assets/kitten-purr.mp3')
    };
    purrBank.fallback.preload = 'auto';
    purrBank.fallback.loop = true;

    function extractSlicesFromBuffer(audioBuf) {
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

      const threshold = Math.max(0.014, maxRms * 0.14);
      const rawRegions = [];
      let inVoice = false;
      let startWin = 0;
      const minGapWins = Math.ceil(0.15 / 0.015);
      let silentWins = 0;

      for (let w = 0; w < rmsValues.length; w++) {
        if (rmsValues[w] > threshold) {
          if (!inVoice) { inVoice = true; startWin = w; }
          silentWins = 0;
        } else if (inVoice) {
          silentWins++;
          if (silentWins >= minGapWins) {
            rawRegions.push([startWin, w - silentWins]);
            inVoice = false;
          }
        }
      }
      if (inVoice) rawRegions.push([startWin, rmsValues.length - 1]);

      const detected = [];
      for (let i = 0; i < rawRegions.length; i++) {
        const sTime = Math.max(0, rawRegions[i][0] * 0.015 - 0.04);
        const eTime = Math.min(audioBuf.duration, rawRegions[i][1] * 0.015 + 0.10);
        const dur = eTime - sTime;
        if (dur >= 0.22 && dur <= 1.85) detected.push({ start: sTime, dur });
      }
      return detected;
    }

    function decodeBank(bank, isPurr) {
      if (!audioCtx || !bank.rawBytes || bank.decoding) return;
      bank.decoding = true;
      audioCtx.decodeAudioData(bank.rawBytes.slice(0))
        .then((buf) => {
          bank.buffer = buf;
          if (!isPurr) {
            const slices = extractSlicesFromBuffer(buf);
            if (slices.length >= 2) bank.slices = slices;
          }
        })
        .catch(() => { bank.decoding = false; });
    }

    if (window.location.protocol !== 'file:' && typeof fetch === 'function') {
      Object.values(SOUND_BANKS).forEach((bank) => {
        fetch(bank.url)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((buf) => {
            if (buf) {
              bank.rawBytes = buf;
              if (audioCtx && !bank.decoding) decodeBank(bank, false);
            }
          })
          .catch(() => {});
      });
      fetch(purrBank.url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          if (buf) {
            purrBank.rawBytes = buf;
            if (audioCtx && !purrBank.decoding) decodeBank(purrBank, true);
          }
        })
        .catch(() => {});
    }

    function ensureAudio() {
      if (soundMuted) return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      Object.values(SOUND_BANKS).forEach((b) => {
        if (b.rawBytes && !b.buffer && !b.decoding) decodeBank(b, false);
      });
      if (purrBank.rawBytes && !purrBank.buffer && !purrBank.decoding) decodeBank(purrBank, true);
      return audioCtx;
    }

    function playActionSound(cat, actionType) {
      if (soundMuted) return 0.4;
      const ac = ensureAudio();
      const bank = SOUND_BANKS[actionType] || SOUND_BANKS.meow;
      const rate = cat.voiceRate || 1.0;

      const len = bank.slices.length;
      let idx = Math.floor(Math.random() * len);
      if (len > 1 && idx === bank.lastIdx) {
        idx = (idx + 1 + Math.floor(Math.random() * (len - 1))) % len;
      }
      bank.lastIdx = idx;
      const slice = bank.slices[idx];
      const playDur = slice.dur / rate;

      if (ac && bank.buffer) {
        const now = ac.currentTime;
        const src = ac.createBufferSource();
        src.buffer = bank.buffer;
        src.playbackRate.value = rate;

        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.92, now + 0.018);
        gain.gain.setValueAtTime(0.92, now + Math.max(0.02, playDur - 0.07));
        gain.gain.linearRampToValueAtTime(0.0001, now + playDur);

        src.connect(gain);
        gain.connect(ac.destination);
        src.start(now, slice.start, slice.dur);
        return playDur;
      }

      // HTMLAudioElement fallback (for file:// or while decoding)
      try {
        if (bank.stopTimer) { clearTimeout(bank.stopTimer); bank.stopTimer = null; }
        bank.fallback.pause();
        bank.fallback.currentTime = Math.min(slice.start, Math.max(0, (bank.fallback.duration || 8) - 0.8));
        bank.fallback.playbackRate = rate;
        bank.fallback.volume = 0.88;
        const p = bank.fallback.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        bank.stopTimer = setTimeout(() => bank.fallback.pause(), playDur * 1000);
      } catch (_e) {}
      return playDur;
    }

    function setPurrIntensity(intensity) {
      if (soundMuted || intensity <= 0.06) {
        if (purrBank.active) {
          purrBank.active = false;
          if (purrBank.gainNode && audioCtx) {
            const now = audioCtx.currentTime;
            purrBank.gainNode.gain.cancelScheduledValues(now);
            purrBank.gainNode.gain.setTargetAtTime(0.0001, now, 0.12);
          }
          if (!purrBank.fallback.paused) purrBank.fallback.pause();
        }
        return;
      }

      const ac = ensureAudio();
      const targetVol = Math.min(0.65, intensity * 0.65);

      if (ac && purrBank.buffer) {
        if (!purrBank.srcNode) {
          const src = ac.createBufferSource();
          src.buffer = purrBank.buffer;
          src.loop = true;
          const gain = ac.createGain();
          gain.gain.value = 0.0001;
          src.connect(gain);
          gain.connect(ac.destination);
          src.start();
          purrBank.srcNode = src;
          purrBank.gainNode = gain;
        }
        purrBank.active = true;
        const now = ac.currentTime;
        purrBank.gainNode.gain.cancelScheduledValues(now);
        purrBank.gainNode.gain.setTargetAtTime(targetVol, now, 0.10);
      } else if (audioCtx && audioCtx.state === 'running') {
        purrBank.active = true;
        purrBank.fallback.volume = targetVol;
        if (purrBank.fallback.paused) {
          const p = purrBank.fallback.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
      }
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        soundBtn.classList.toggle('is-muted', soundMuted);
        soundBtn.textContent = soundMuted ? '🔇 Sound Off' : '🔊 Sound On';
        if (soundMuted) {
          setPurrIntensity(0);
          Object.values(SOUND_BANKS).forEach((b) => b.fallback.pause());
          purrBank.fallback.pause();
        } else {
          ensureAudio();
        }
      });
    }

    // ---------------------------------------------------------------------
    // 2. 10 Uniquely Colored Cats (Neo, Husky + 8 Friends)
    // ---------------------------------------------------------------------
    const CAT_SPECS = [
      {
        key: 'neo', name: 'Neo', colorLabel: 'Golden Ginger', voiceRate: 1.07,
        emoji: '🧡', swatch: 'linear-gradient(135deg, #f7ae64 0%, #e48436 60%, #fff4ea 100%)',
        coat: ['#F7AE64', '#E5883A', '#BD5E1C'], belly: '#FFF8F2', paws: '#FFF9F4',
        stripe: 'rgba(164, 70, 16, 0.55)', earIn: '#F7A9B8', nose: '#EE889B',
        eyeCols: ['#42200F', '#2A1208', '#140804'], pattern: 'ginger_tabby',
        scale: 0.90, persian: false, baby: true
      },
      {
        key: 'husky', name: 'Husky', colorLabel: 'White & Caramel', voiceRate: 0.95,
        emoji: '🤎', swatch: 'linear-gradient(135deg, #ffffff 0%, #f7eee7 50%, #d89a63 100%)',
        coat: ['#FFFFFF', '#FAF3EE', '#E3D3C8'], belly: '#FFFFFF', paws: '#FFFFFF',
        patch: '#D89A63', earIn: '#F7C9C6', nose: '#EB869B',
        eyeCols: ['#5E3016', '#2A1208', '#140804'], pattern: 'persian_bicolor',
        scale: 1.05, persian: true, baby: false
      },
      {
        key: 'mochi', name: 'Mochi', colorLabel: 'Tuxedo Black', voiceRate: 1.02,
        emoji: '🖤', swatch: 'linear-gradient(135deg, #3c3a47 0%, #1f1e26 62%, #ffffff 100%)',
        coat: ['#4A4856', '#2A2933', '#16151C'], belly: '#FFFFFF', paws: '#FFFFFF',
        earIn: '#F4A6B8', nose: '#F293A8',
        eyeCols: ['#F2C94C', '#D49B1A', '#6E4C08'], pattern: 'tuxedo',
        scale: 0.95, persian: false, baby: false
      },
      {
        key: 'luna', name: 'Luna', colorLabel: 'Silver Blue', voiceRate: 0.98,
        emoji: '🩶', swatch: 'linear-gradient(135deg, #b8c5d9 0%, #7d8fa8 100%)',
        coat: ['#B8C5D8', '#899BB5', '#5A6B82'], belly: '#D8E1EE', paws: '#CDD8E8',
        earIn: '#E7B0C0', nose: '#7A6878',
        eyeCols: ['#84E1A7', '#3EA869', '#1D5E38'], pattern: 'solid_plush',
        scale: 0.96, persian: false, baby: false
      },
      {
        key: 'boba', name: 'Boba', colorLabel: 'Siamese Cream', voiceRate: 1.04,
        emoji: '🧋', swatch: 'linear-gradient(135deg, #fff5e6 0%, #f0dfc8 55%, #5c3c2e 100%)',
        coat: ['#FFF6EA', '#F2E2CC', '#D6BE9E'], belly: '#FFF9F0', paws: '#593A2C',
        point: '#5C3C2E', earIn: '#D9A7A0', nose: '#4E3125',
        eyeCols: ['#79C7FF', '#3588D6', '#184A85'], pattern: 'siamese',
        scale: 0.94, persian: false, baby: false
      },
      {
        key: 'peach', name: 'Peach', colorLabel: 'Tri-Color Calico', voiceRate: 1.09,
        emoji: '🍑', swatch: 'linear-gradient(135deg, #ffffff 0%, #ffa96b 52%, #59382a 100%)',
        coat: ['#FFFFFF', '#FAF2EB', '#E4D4C8'], belly: '#FFFFFF', paws: '#FFFFFF',
        patch: '#F59B56', patch2: '#4A3129', earIn: '#F9B4C2', nose: '#F28CA0',
        eyeCols: ['#B67B34', '#754916', '#3B2208'], pattern: 'calico',
        scale: 0.93, persian: false, baby: true
      },
      {
        key: 'coco', name: 'Coco', colorLabel: 'Cocoa Brown', voiceRate: 0.92,
        emoji: '🍫', swatch: 'linear-gradient(135deg, #9c6644 0%, #6b4228 100%)',
        coat: ['#A46D4B', '#7A4B2E', '#4F2D19'], belly: '#C48E6A', paws: '#8F5B3C',
        earIn: '#DF9B9E', nose: '#6B3D3B',
        eyeCols: ['#FFE07D', '#D99F26', '#7A520B'], pattern: 'solid_plush',
        scale: 0.98, persian: true, baby: false
      },
      {
        key: 'cloud', name: 'Cloud', colorLabel: 'Snow White', voiceRate: 1.12,
        emoji: '🤍', swatch: 'linear-gradient(135deg, #ffffff 0%, #eef5fc 100%)',
        coat: ['#FFFFFF', '#F7F9FC', '#DFE7F0'], belly: '#FFFFFF', paws: '#FFFFFF',
        earIn: '#FFB5C8', nose: '#F79FB3',
        eyeCols: ['#78C8FF', '#3B95DB', '#1B558E'],
        eyeColsR: ['#F5C451', '#C98A18', '#6B4608'],
        pattern: 'solid_plush',
        scale: 0.92, persian: true, baby: false
      },
      {
        key: 'milo', name: 'Milo', colorLabel: 'Ash Grey Tabby', voiceRate: 0.99,
        emoji: '🌿', swatch: 'linear-gradient(135deg, #cfd6dc 0%, #8f9aa3 65%, #565f68 100%)',
        coat: ['#D5DCE2', '#A1ACB6', '#6F7A84'], belly: '#F4F7FA', paws: '#F4F7FA',
        stripe: 'rgba(66, 75, 84, 0.58)', earIn: '#EBB0BE', nose: '#CF8A98',
        eyeCols: ['#7AE5B8', '#2EAD7B', '#145C40'], pattern: 'grey_tabby',
        scale: 0.94, persian: false, baby: false
      },
      {
        key: 'maple', name: 'Maple', colorLabel: 'Rose-Cinnamon Tortie', voiceRate: 1.05,
        emoji: '🍁', swatch: 'linear-gradient(135deg, #e08d6d 0%, #a85440 55%, #f5cfa0 100%)',
        coat: ['#E69878', '#B8624B', '#7D3B2B'], belly: '#FCEAD8', paws: '#FCEAD8',
        patch: '#F5C47E', patch2: '#5E3028', earIn: '#F5A5B4', nose: '#E57F92',
        eyeCols: ['#F0A24E', '#B56218', '#5C2C07'], pattern: 'tortie',
        scale: 0.91, persian: false, baby: true
      }
    ];

    function createKittenState(spec, idx) {
      return {
        ...spec,
        idx,
        baseX: 0,
        baseY: 0,
        drawScale: spec.scale,
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
        blinkTimer: 0.8 + Math.random() * 2.5,
        blinkAmt: 0,
        earTwitchTimer: 1.5 + Math.random() * 3.5,
        earTwitch: 0,
        noseTwitchPhase: Math.random() * Math.PI * 2,
        kneadPhase: Math.random() * Math.PI * 2,
        tailPhase: Math.random() * Math.PI * 2,
        // Lifelike physics (position, squash & stretch, eating, excited jumping)
        animX: 0,
        animY: 0,
        targetX: 0,
        targetY: 0,
        hopY: 0,
        prevHopY: 0,
        squashX: 1,
        squashY: 1,
        eatDip: 0,
        targetEatDip: 0,
        jumpPhase: idx * 0.48,
        jumpSpeed: 7.4 + (idx % 3) * 0.65,
        crouchAmt: 0,
        targetCrouch: 0,
        earFlatten: 0,
        targetEarFlatten: 0,
        pawSwipeL: 0,
        pawSwipeR: 0,
        buttWiggle: 0,
        socialSquint: 0,
        faceDir: idx % 2 === 0 ? 0.1 : -0.1,
        targetFaceDir: idx % 2 === 0 ? 0.1 : -0.1,
        socialMood: '',
        speechText: '',
        speechAlpha: 0,
        speechY: 0,
        hitCenter: { x: 0, y: 0, rx: 60, ry: 60 },
        badgeEl: null,
        moodEl: null
      };
    }

    const cats = CAT_SPECS.map((s, idx) => createKittenState(s, idx));
    const floatingParticles = [];

    function buildBadges() {
      if (!badgesWrap) return;
      badgesWrap.innerHTML = '';
      cats.forEach((cat) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kitten-badge';
        btn.dataset.catKey = cat.key;
        btn.innerHTML = `
          <span class="kitten-avatar-dot" style="background:${cat.swatch}" aria-hidden="true">${cat.emoji}</span>
          <span class="kitten-badge-text">
            <span class="kitten-name">${cat.name}</span>
            <span class="kitten-mood">${cat.colorLabel}</span>
          </span>
        `;
        btn.addEventListener('click', () => {
          ensureAudio();
          triggerKittenMeow(cat, 'meow', undefined, undefined);
          cat.hopY = 16;
          cat.squashX = 0.90;
          cat.squashY = 1.12;
        });
        cat.badgeEl = btn;
        cat.moodEl = btn.querySelector('.kitten-mood');
        badgesWrap.appendChild(btn);
      });
    }
    buildBadges();

    // ---------------------------------------------------------------------
    // 3. Responsive Multi-Device Layout + Food Bowls + Yarn Ball Toy
    // ---------------------------------------------------------------------
    let viewMode = 'all';
    let W = 780;
    let H = 430;
    let cushionRows = [];

    // Food & Yarn Toy State
    const foodState = {
      phase: 'none', // 'none' | 'calling' | 'eating' | 'excited_jump'
      timer: 0,
      bowls: [],     // { x, y, fill: 1..0, alpha: 0..1 }
      soundTick: 0,
      jumpChirpIdx: 0
    };

    const yarnBall = {
      active: false,
      timer: 0,
      x: 340,
      y: 200,
      vx: 0,
      vy: 0,
      rot: 0,
      r: 14,
      targetCatIdx: 0,
      batCooldown: 0
    };

    function updateLayout() {
      const vw = window.innerWidth;
      const isMobile = vw < 620;
      const visibleCats = viewMode === 'pair' ? [cats[0], cats[1]] : cats;

      if (viewMode === 'pair') {
        W = isMobile ? 420 : 680;
        H = isMobile ? 270 : 320;
        const scaleMul = isMobile ? 0.82 : 1.0;
        cats[0].baseX = W * 0.31;
        cats[0].baseY = H * 0.74;
        cats[0].drawScale = cats[0].scale * scaleMul;
        cats[1].baseX = W * 0.69;
        cats[1].baseY = H * 0.74;
        cats[1].drawScale = cats[1].scale * scaleMul;
        cushionRows = [{ x: W * 0.5, y: H * 0.77, rx: W * 0.39, ry: isMobile ? 28 : 34 }];
      } else if (isMobile) {
        W = 420;
        H = 480;
        const rowDefs = [
          { count: 3, y: 126, span: 280 },
          { count: 4, y: 280, span: 320 },
          { count: 3, y: 432, span: 280 }
        ];
        let ci = 0;
        cushionRows = [];
        rowDefs.forEach((rd) => {
          cushionRows.push({ x: W * 0.5, y: rd.y + 8, rx: rd.span * 0.58, ry: 22 });
          for (let j = 0; j < rd.count; j++) {
            const cat = visibleCats[ci++];
            const frac = rd.count === 1 ? 0.5 : j / (rd.count - 1);
            cat.baseX = W * 0.5 - rd.span * 0.5 + frac * rd.span;
            cat.baseY = rd.y;
            cat.drawScale = cat.scale * 0.62;
          }
        });
      } else {
        W = 780;
        H = 435;
        const rowDefs = [
          { count: 5, y: 180, span: 610 },
          { count: 5, y: 372, span: 620 }
        ];
        let ci = 0;
        cushionRows = [];
        rowDefs.forEach((rd) => {
          cushionRows.push({ x: W * 0.5, y: rd.y + 10, rx: rd.span * 0.57, ry: 28 });
          for (let j = 0; j < rd.count; j++) {
            const cat = visibleCats[ci++];
            const frac = j / (rd.count - 1);
            cat.baseX = W * 0.5 - rd.span * 0.5 + frac * rd.span;
            cat.baseY = rd.y;
            cat.drawScale = cat.scale * 0.78;
          }
        });
      }

      if (badgesWrap) {
        badgesWrap.classList.toggle('is-pair', viewMode === 'pair');
        cats.forEach((cat, idx) => {
          if (cat.badgeEl) {
            cat.badgeEl.style.display = (viewMode === 'pair' && idx > 1) ? 'none' : '';
          }
        });
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.aspectRatio = `${W} / ${H}`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        viewMode = viewMode === 'all' ? 'pair' : 'all';
        modeBtn.textContent = viewMode === 'all' ? 'All 10 Cats 🐾' : 'Neo & Husky 💕';
        social.state = 'idle';
        social.timer = 1.6;
        foodState.phase = 'none';
        foodState.bowls = [];
        yarnBall.active = false;
        resetSocialTargets();
        updateLayout();
      });
    }

    // ---------------------------------------------------------------------
    // 4. Feeding (Food Button -> Eat -> Excited Jumping!) & Yarn Play
    // ---------------------------------------------------------------------
    function getActiveCats() {
      return viewMode === 'pair' ? [cats[0], cats[1]] : cats;
    }

    function resetSocialTargets() {
      cats.forEach((k) => {
        k.targetX = 0;
        k.targetY = 0;
        k.targetCrouch = 0;
        k.targetEatDip = 0;
        k.targetEarFlatten = 0;
        k.socialSquint = 0;
        k.targetFaceDir = k.idx % 2 === 0 ? 0.1 : -0.1;
        k.socialMood = '';
      });
    }

    function startFeedingRoutine() {
      ensureAudio();
      social.state = 'idle';
      yarnBall.active = false;
      if (playBtn) playBtn.classList.remove('is-active');
      if (feedBtn) feedBtn.classList.add('is-active');

      const pool = getActiveCats();
      foodState.phase = 'calling';
      foodState.timer = 0;
      foodState.soundTick = 0;
      foodState.jumpChirpIdx = 0;
      foodState.bowls = cushionRows.map((c) => ({
        x: c.x,
        y: c.y + 8,
        fill: 1.0,
        alpha: 0
      }));

      // Cats look eagerly toward the food bowls and meow hungrily!
      pool.forEach((k, i) => {
        k.targetCrouch = 0.25;
        k.targetEatDip = 0;
        k.socialSquint = 0;
        k.socialMood = 'Ooh, yummy treats! 🍖';
        if (i === 0 || i === 1 || i === 5) {
          setTimeout(() => {
            if (foodState.phase === 'calling') {
              showKittenBubble(k, i % 2 === 0 ? 'mew! 🍖' : 'treats! 🐟', 'food');
            }
          }, i * 180);
        }
      });
    }

    function startYarnPlay() {
      ensureAudio();
      if (foodState.phase !== 'none') return;
      if (playBtn) playBtn.classList.add('is-active');

      const row = cushionRows[cushionRows.length - 1] || { x: W * 0.5, y: H * 0.72 };
      yarnBall.active = true;
      yarnBall.timer = 9.0;
      yarnBall.x = row.x - 90;
      yarnBall.y = row.y - 50;
      yarnBall.vx = 180;
      yarnBall.vy = -120;
      yarnBall.r = W < 500 ? 11 : 14;
      yarnBall.batCooldown = 0;

      const pool = getActiveCats();
      const first = pool[Math.floor(Math.random() * pool.length)];
      showKittenBubble(first, 'yarn!! 🧶', 'play');
      social.state = 'play_fight';
      social.duration = 3.2;
      social.phaseTime = 0;
      social.actorIdx = 0;
      social.partnerIdx = Math.min(1, pool.length - 1);
      social.bapStep = 0;
      if (pool[0] && pool[1]) {
        const dx = pool[1].baseX - pool[0].baseX;
        const dir = dx >= 0 ? 1 : -1;
        const scoot = Math.min(44, Math.abs(dx) * 0.26);
        pool[0].targetX = dir * scoot;
        pool[1].targetX = -dir * scoot;
        pool[0].targetFaceDir = dir * 0.65;
        pool[1].targetFaceDir = -dir * 0.65;
        pool[0].socialMood = 'Chasing yarn ball! 🧶';
        pool[1].socialMood = 'Playing together! 🐾';
      }
    }

    if (feedBtn) feedBtn.addEventListener('click', startFeedingRoutine);
    if (playBtn) playBtn.addEventListener('click', startYarnPlay);

    // ---------------------------------------------------------------------
    // 5. Autonomous Play, Fight, Cuddle & Action-Matched Sounds
    // ---------------------------------------------------------------------
    const social = {
      state: 'idle',
      timer: 1.5,
      duration: 0,
      phaseTime: 0,
      actorIdx: 0,
      partnerIdx: 1,
      bapStep: 0,
      pounced: false
    };

    function showKittenBubble(k, text, soundAction) {
      k.speechText = text;
      k.speechAlpha = 1.0;
      k.speechY = 0;
      if (soundAction && audioCtx && audioCtx.state === 'running' && !soundMuted) {
        const d = playActionSound(k, soundAction);
        k.meowTimer = Math.min(0.65, d || 0.36);
      }
    }

    function startNextSocialBehavior() {
      if (foodState.phase !== 'none') return;
      const pool = getActiveCats();
      if (pool.length < 2) return;

      const idxA = Math.floor(Math.random() * pool.length);
      let bestPartner = (idxA + 1) % pool.length;
      let bestDist = Infinity;
      for (let i = 0; i < pool.length; i++) {
        if (i === idxA) continue;
        const d = Math.hypot(pool[i].baseX - pool[idxA].baseX, (pool[i].baseY - pool[idxA].baseY) * 2.2);
        if (d < bestDist) { bestDist = d; bestPartner = i; }
      }

      social.actorIdx = idxA;
      social.partnerIdx = bestPartner;
      social.phaseTime = 0;
      social.bapStep = 0;
      social.pounced = false;

      const a = pool[idxA];
      const b = pool[bestPartner];
      const dx = b.baseX - a.baseX;
      const dir = dx >= 0 ? 1 : -1;
      const scoot = Math.min(48, Math.abs(dx) * 0.28);

      const r = Math.random();
      if (r < 0.36) {
        social.state = 'play_fight';
        social.duration = 3.2;
        a.targetX = dir * scoot;
        b.targetX = -dir * scoot;
        a.targetFaceDir = dir * 0.65;
        b.targetFaceDir = -dir * 0.65;
        a.targetEarFlatten = 0.78;
        b.targetEarFlatten = 0.78;
        a.socialMood = `Bapping ${b.name}! 🐾`;
        b.socialMood = `Play-fighting ${a.name}! 🐾`;
        showKittenBubble(a, 'rawr! 🐾', 'play');
      } else if (r < 0.64) {
        social.state = 'play_pounce';
        social.duration = 3.0;
        a.targetX = dir * (scoot * 0.4);
        a.targetFaceDir = dir * 0.55;
        a.targetCrouch = 1.0;
        b.targetFaceDir = -dir * 0.45;
        a.socialMood = `Stalking ${b.name}... 👀`;
        b.socialMood = 'Watching! ✨';
      } else if (r < 0.84) {
        social.state = 'cuddle_nuzzle';
        social.duration = 3.4;
        a.targetX = dir * (scoot * 1.15);
        b.targetX = -dir * (scoot * 1.15);
        a.targetFaceDir = dir * 0.45;
        b.targetFaceDir = -dir * 0.45;
        a.socialSquint = 1.0;
        b.socialSquint = 1.0;
        a.socialMood = `Cuddling ${b.name} 💕`;
        b.socialMood = `Nuzzling ${a.name} 💕`;
        showKittenBubble(a, 'prrr~ 💕', 'meow');
      } else {
        social.state = 'stretch_play';
        social.duration = 2.5;
        a.targetCrouch = 0.85;
        a.socialSquint = 0.65;
        a.socialMood = 'Big cozy stretch~ ✨';
      }
    }

    function triggerKittenMeow(k, soundAction, px, py) {
      if (social.state !== 'idle' && foodState.phase === 'none') {
        social.state = 'idle';
        social.timer = 3.2 + Math.random() * 2.5;
        resetSocialTargets();
      }
      const nowMs = performance.now();
      if (nowMs - k.lastMeowAt < 580) return;
      k.lastMeowAt = nowMs;

      k.petLevel = Math.min(1, k.petLevel + 0.52);
      k.speechText = soundAction === 'food' ? 'yum! 🍖' : soundAction === 'play' ? 'mew! 🐾' : 'mee-ow~ 💖';
      k.speechAlpha = 1.0;
      k.speechY = 0;

      if (k.badgeEl) {
        k.badgeEl.classList.add('is-meowing');
        setTimeout(() => k.badgeEl && k.badgeEl.classList.remove('is-meowing'), 550);
      }
      if (k.moodEl && foodState.phase === 'none') {
        k.moodEl.textContent = 'Purring & meowing! 💕';
      }

      const meowDur = playActionSound(k, soundAction || 'meow');
      k.meowTimer = Math.min(0.65, meowDur || 0.44);

      const sx = px !== undefined ? px : k.hitCenter.x;
      const sy = py !== undefined ? py : k.hitCenter.y - 28;
      for (let i = 0; i < 4; i++) {
        floatingParticles.push({
          x: sx + (Math.random() - 0.5) * 32,
          y: sy + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 24,
          vy: -(30 + Math.random() * 24),
          symbol: ['💗', '🐾', '✨', '💕'][Math.floor(Math.random() * 4)],
          size: 13 + Math.random() * 5,
          life: 0,
          maxLife: 1.0 + Math.random() * 0.35
        });
      }
    }

    function applyPetRub(k, moveDist, px, py, dxNorm, dyNorm) {
      if (social.state !== 'idle' && foodState.phase === 'none') {
        social.state = 'idle';
        social.timer = 3.2 + Math.random() * 2.5;
        resetSocialTargets();
      }
      k.petLevel = Math.min(1, k.petLevel + 0.17 + moveDist * 0.008);
      k.leanX = Math.max(-1, Math.min(1, dxNorm));
      k.leanY = Math.max(-1, Math.min(1, dyNorm));
      k.rubEnergy += moveDist;

      if (k.moodEl && k.petLevel > 0.35 && k.speechAlpha < 0.2 && foodState.phase === 'none') {
        k.moodEl.textContent = 'Purrrr~ 💕';
      }

      if (Math.random() < Math.min(0.42, moveDist * 0.025)) {
        floatingParticles.push({
          x: px + (Math.random() - 0.5) * 18,
          y: py - 8,
          vx: (Math.random() - 0.5) * 16,
          vy: -(22 + Math.random() * 20),
          symbol: Math.random() > 0.35 ? '💗' : '✨',
          size: 11 + Math.random() * 4,
          life: 0,
          maxLife: 0.85 + Math.random() * 0.3
        });
      }

      if (k.rubEnergy > 44) {
        k.rubEnergy = 0;
        triggerKittenMeow(k, 'meow', px, py);
      }
    }

    // ---------------------------------------------------------------------
    // 6. Lifelike 2D Cushions, Bowls, Yarn Ball & Cat Drawing
    // ---------------------------------------------------------------------
    function drawCushions() {
      cushionRows.forEach((c) => {
        const shG = ctx.createRadialGradient(c.x, c.y + 12, 20, c.x, c.y + 12, c.rx * 1.08);
        shG.addColorStop(0, 'rgba(130, 62, 84, 0.14)');
        shG.addColorStop(0.7, 'rgba(130, 62, 84, 0.04)');
        shG.addColorStop(1, 'rgba(130, 62, 84, 0)');
        ctx.save();
        ctx.translate(c.x, c.y + 12);
        ctx.scale(1, 0.25);
        ctx.beginPath();
        ctx.arc(0, 0, c.rx * 1.08, 0, Math.PI * 2);
        ctx.fillStyle = shG;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 7, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#EBBAC9';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx - 2, c.ry - 2, 0, 0, Math.PI * 2);
        const topG = ctx.createRadialGradient(c.x - 20, c.y - 8, 12, c.x, c.y, c.rx);
        topG.addColorStop(0, '#FFFDFD');
        topG.addColorStop(0.68, '#FFF0F5');
        topG.addColorStop(1, '#F7CFD9');
        ctx.fillStyle = topG;
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 175, 190, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
    }

    function drawFoodBowls() {
      if (foodState.bowls.length === 0) return;
      const bowlScale = W < 500 ? 0.78 : 1.0;
      foodState.bowls.forEach((b) => {
        if (b.alpha <= 0.02) return;
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.translate(b.x, b.y);
        ctx.scale(bowlScale, bowlScale);

        // Bowl shadow
        ctx.fillStyle = 'rgba(110, 45, 70, 0.18)';
        ctx.beginPath();
        ctx.ellipse(0, 12, 34, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ceramic bowl body
        const bg = ctx.createLinearGradient(-28, -4, 28, 12);
        bg.addColorStop(0, '#FFB6C8');
        bg.addColorStop(0.5, '#FFE0E9');
        bg.addColorStop(1, '#E88DA6');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.quadraticCurveTo(-28, 14, 0, 14);
        ctx.quadraticCurveTo(28, 14, 30, 0);
        ctx.closePath();
        ctx.fill();

        // Bowl top rim
        ctx.fillStyle = '#FFF5F8';
        ctx.strokeStyle = '#E89EB2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner bowl depth
        ctx.fillStyle = '#D9B8C2';
        ctx.beginPath();
        ctx.ellipse(0, 0.5, 25, 7.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crunchy kibbles & salmon treats (shrink as eaten!)
        if (b.fill > 0.04) {
          const count = Math.ceil(b.fill * 11);
          const spots = [
            [-12, 0], [0, -2], [11, 0], [-6, 2], [6, 2], [-15, 2],
            [15, 1], [-2, 1], [3, -1], [-8, -1], [8, -1]
          ];
          for (let i = 0; i < count; i++) {
            const [kx, ky] = spots[i];
            ctx.fillStyle = i % 3 === 0 ? '#E88858' : i % 2 === 0 ? '#B56B3E' : '#8F4E29';
            ctx.beginPath();
            ctx.ellipse(kx, ky - b.fill * 2.5, 4.5, 3.0, i * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      });
    }

    function drawYarnBall() {
      if (!yarnBall.active) return;
      const { x, y, r, rot } = yarnBall;
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(130, 50, 80, 0.2)';
      ctx.beginPath();
      ctx.ellipse(x, Math.min(H - 18, y + r + 4), r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(x, y);
      ctx.rotate(rot);
      const yg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      yg.addColorStop(0, '#FFBED3');
      yg.addColorStop(0.65, '#FF759F');
      yg.addColorStop(1, '#CC4570');
      ctx.fillStyle = yg;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Yarn wraps
      ctx.strokeStyle = 'rgba(255, 240, 246, 0.72)';
      ctx.lineWidth = 1.6;
      [-0.5, 0.2, 0.9].forEach((ang) => {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.92, r * 0.42, ang, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    function drawCatEye(ex, ey, r, k, cols) {
      if (k.happySquint > 0.45) {
        ctx.strokeStyle = '#3B1E12';
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, ey + 2.5, r * 0.78, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        return;
      }

      const openY = Math.max(0.1, 1 - k.blinkAmt);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1, openY);

      ctx.fillStyle = '#FFF7F3';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.07, r * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();

      const ig = ctx.createRadialGradient(-r * 0.1, -r * 0.1, r * 0.15, 0, 0, r);
      ig.addColorStop(0, cols[0]);
      ig.addColorStop(0.7, cols[1]);
      ig.addColorStop(1, cols[2]);
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(k.lookX * 1.4, k.lookY * 1.1, r * 0.96, 0, Math.PI * 2);
      ctx.fill();

      const excitedDilate = foodState.phase !== 'none' ? 0.12 : 0;
      const pupR = r * (k.baby ? 0.70 : 0.56) * (1 + k.petLevel * 0.08 + excitedDilate);
      ctx.fillStyle = '#0B0605';
      ctx.beginPath();
      ctx.arc(k.lookX * 1.9, k.lookY * 1.4, pupR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-r * 0.32 + k.lookX, -r * 0.32 + k.lookY, r * 0.29, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.27 + k.lookX, r * 0.27 + k.lookY, r * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#24120C';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.98, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();

      ctx.restore();
    }

    function drawCat2D(k, elapsed) {
      const sc = k.drawScale;
      const cx = k.baseX + k.animX;
      const cy = k.baseY + k.animY - k.hopY + k.crouchAmt * 6 * sc;
      const breath = Math.sin(elapsed * 2.5 + k.idx * 0.9);
      const purrVib = k.petLevel > 0.15 ? Math.sin(elapsed * 46) * 0.9 * k.petLevel : 0;

      // Ground shadow shrinks smoothly during jumps!
      const shS = Math.max(0.45, 1 - k.hopY * 0.01);
      ctx.fillStyle = `rgba(140, 70, 90, ${0.20 * shS})`;
      ctx.beginPath();
      ctx.ellipse(cx, k.baseY + 10 * sc, (k.persian ? 58 : 44) * sc * shS, 10 * sc * shS, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx + purrVib, cy + breath * 1.1);
      // Apply realistic Disney-style squash & stretch!
      ctx.scale(sc * k.squashX, sc * k.squashY);

      const tailSide = k.idx % 2 === 0 ? -1 : 1;
      const tailWag = Math.sin(elapsed * (2.5 + k.petLevel * 2.1 + (foodState.phase === 'excited_jump' ? 3 : 0)) + k.tailPhase) * 14;
      const tailLift = k.petLevel * 24 + (foodState.phase === 'excited_jump' ? 18 : 0);

      // 1. Fluffy Tail
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = k.point || k.coat[1];
      ctx.lineWidth = k.persian ? 20 : 14;
      ctx.beginPath();
      ctx.moveTo(tailSide * 26, -8);
      ctx.quadraticCurveTo(tailSide * 56 + tailWag * 0.5, -18 - tailLift * 0.5, tailSide * 58 + tailWag, -44 - tailLift);
      ctx.stroke();
      if (k.patch || k.paws !== k.coat[1]) {
        ctx.fillStyle = k.patch || k.paws;
        ctx.beginPath();
        ctx.arc(tailSide * 58 + tailWag, -44 - tailLift, k.persian ? 10 : 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Torso
      const wig = k.buttWiggle;
      const bodyW = k.persian ? 50 : 35;
      const bodyH = k.persian ? 38 : 35;
      const bodyG = ctx.createRadialGradient(-8, -32, 8, 0, -24, 58);
      bodyG.addColorStop(0, k.coat[0]);
      bodyG.addColorStop(0.68, k.coat[1]);
      bodyG.addColorStop(1, k.coat[2]);
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(wig * 0.4, -26 - k.crouchAmt * 4, bodyW + breath * 1.2, bodyH - k.crouchAmt * 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (k.stripe) {
        ctx.strokeStyle = k.stripe;
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        [-1, 1].forEach((side) => {
          [-32, -22, -12].forEach((sy) => {
            ctx.beginPath();
            ctx.moveTo(side * 20, sy);
            ctx.quadraticCurveTo(side * 28, sy + 2, side * 31, sy + 6);
            ctx.stroke();
          });
        });
      }
      if (k.patch) {
        ctx.fillStyle = k.patch;
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.ellipse(24 + wig * 0.3, -34, 19, 14, -0.35, 0, Math.PI * 2);
        ctx.fill();
        if (k.patch2) {
          ctx.fillStyle = k.patch2;
          ctx.beginPath();
          ctx.ellipse(-22 + wig * 0.3, -24, 14, 12, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Chest / Belly Bib
      ctx.fillStyle = k.belly;
      if (k.persian) {
        [[-21, -35, 15], [0, -37, 19], [21, -35, 15], [-14, -22, 16], [14, -22, 16], [0, -18, 19]].forEach(([rx, ry, rr]) => {
          ctx.beginPath();
          ctx.arc(rx + k.faceDir * 5, ry + breath * 0.5, rr, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        ctx.beginPath();
        ctx.ellipse(k.faceDir * 5, -24, 18, 25, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Front Paws (kneading, bapping, or waving excitedly while jumping!)
      const jumpWave = foodState.phase === 'excited_jump' ? Math.max(0, k.hopY * 0.42) : 0;
      const kneadAmt = k.petLevel * 6;
      const liftL = Math.max(0, Math.sin(k.kneadPhase)) * kneadAmt + k.pawSwipeL * 26 + jumpWave;
      const liftR = Math.max(0, Math.sin(k.kneadPhase + Math.PI)) * kneadAmt + k.pawSwipeR * 26 + jumpWave;
      [
        { px: k.persian ? -26 : -21, lift: liftL, tilt: 0.14 },
        { px: k.persian ? 24 : 21, lift: liftR, tilt: -0.14 }
      ].forEach(({ px, lift, tilt }) => {
        ctx.save();
        ctx.translate(px + k.faceDir * 4, (k.persian ? -14 : -20) - lift * 0.85);
        if (!k.persian) ctx.rotate(tilt);

        if (k.persian) {
          ctx.fillStyle = k.paws;
          ctx.beginPath();
          ctx.ellipse(0, 2, 15, 13, 0, 0, Math.PI * 2);
          ctx.ellipse(0, 11, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(175, 150, 140, 0.42)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-4, 8); ctx.lineTo(-4, 17);
          ctx.moveTo(4, 8); ctx.lineTo(4, 17);
          ctx.stroke();
        } else {
          ctx.fillStyle = k.point || k.coat[1];
          ctx.beginPath();
          ctx.ellipse(0, 4, 9.5, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = k.paws;
          ctx.beginPath();
          ctx.ellipse(0, 16, 8.5, 6.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        if (lift > 6) {
          ctx.fillStyle = '#FF9EB5';
          ctx.beginPath();
          ctx.arc(0, k.persian ? 13 : 17, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Head (dips down smoothly when eating from bowl!)
      ctx.save();
      const munchBob = k.eatDip > 0.4 ? Math.sin(elapsed * 22 + k.idx) * 3.5 : 0;
      const hx = k.leanX * 7 + k.faceDir * 5;
      const hy = (k.persian ? -72 : -74) + k.leanY * 4 + k.crouchAmt * 7 - k.petLevel * 2 + k.eatDip * 30 + munchBob;
      const hRot = k.leanX * 0.15 + Math.sin(elapsed * 1.7 + k.idx) * 0.03 + k.earFlatten * 0.08 + k.eatDip * 0.16 * (k.idx % 2 === 0 ? 1 : -1);
      ctx.translate(hx, hy);
      ctx.rotate(hRot);

      // Ears
      [-1, 1].forEach((side) => {
        const droop = k.petLevel * 0.12 + k.earFlatten * 0.35 + (side === 1 ? k.earTwitch * 0.14 : 0);
        ctx.save();
        ctx.translate(side * (k.persian ? 28 : 24), -25);
        ctx.rotate(side * ((k.persian ? 0.35 : 0.28) + droop));
        ctx.fillStyle = k.point || k.patch || k.coat[1];
        if (k.pattern === 'calico' && side === 1 && k.patch2) ctx.fillStyle = k.patch2;
        ctx.beginPath();
        ctx.moveTo(-16, 8);
        ctx.quadraticCurveTo(-4, -27, 2, -26);
        ctx.quadraticCurveTo(10, -24, 16, 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = k.earIn;
        ctx.beginPath();
        ctx.moveTo(-9, 6);
        ctx.quadraticCurveTo(-1, -17, 2, -17);
        ctx.quadraticCurveTo(7, -15, 10, 6);
        ctx.closePath();
        ctx.fill();

        if (k.persian) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-7, 3); ctx.quadraticCurveTo(4, -4, 13, -7);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Head Base
      const headW = k.persian ? 48 : 42;
      const headH = k.persian ? 40 : 36;
      const headG = ctx.createRadialGradient(-9, -11, 8, 0, 0, 52);
      headG.addColorStop(0, k.coat[0]);
      headG.addColorStop(0.68, k.coat[1]);
      headG.addColorStop(1, k.coat[2]);
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.ellipse(0, 2, headW, headH, 0, 0, Math.PI * 2);
      ctx.fill();

      if (k.persian) {
        ctx.fillStyle = k.coat[0];
        ctx.beginPath();
        ctx.arc(-40, 10, 13, 0, Math.PI * 2);
        ctx.arc(40, 10, 13, 0, Math.PI * 2);
        ctx.fill();
      }

      const fx = k.lookX * 2.2 + k.faceDir * 3;
      const fy = k.lookY * 1.6;

      if (k.stripe) {
        ctx.strokeStyle = k.stripe;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        [-9, -3, 3, 9].forEach((tx, idx) => {
          ctx.beginPath();
          ctx.moveTo(tx + fx * 0.4, -25);
          ctx.quadraticCurveTo(tx * 0.8 + fx * 0.4, -17, tx * 0.7 + fx * 0.4, idx === 1 || idx === 2 ? -10 : -13);
          ctx.stroke();
        });
      }

      if (k.pattern === 'persian_bicolor' || k.pattern === 'calico' || k.pattern === 'tortie') {
        [-1, 1].forEach((side) => {
          const pCol = side === 1 && k.patch2 ? k.patch2 : k.patch;
          ctx.save();
          ctx.globalAlpha = k.pattern === 'persian_bicolor' ? 0.78 : 0.85;
          ctx.fillStyle = pCol;
          ctx.beginPath();
          ctx.ellipse(side * 24 + fx * 0.35, -9, 21, 19, side * -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        ctx.fillStyle = k.belly;
        ctx.beginPath();
        ctx.moveTo(fx - 8, -26);
        ctx.lineTo(fx + 8, -26);
        ctx.lineTo(fx + 13, 8);
        ctx.lineTo(fx - 13, 8);
        ctx.closePath();
        ctx.fill();
      } else if (k.pattern === 'siamese') {
        ctx.fillStyle = k.point;
        ctx.beginPath();
        ctx.ellipse(fx, 4, 24, 19, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (k.pattern !== 'siamese') {
        ctx.fillStyle = k.pattern === 'solid_plush' ? k.coat[0] : k.belly;
        ctx.beginPath();
        ctx.ellipse(fx - 8, 14 + fy * 0.4, 13, 10, -0.1, 0, Math.PI * 2);
        ctx.ellipse(fx + 8, 14 + fy * 0.4, 13, 10, 0.1, 0, Math.PI * 2);
        ctx.ellipse(fx, 20 + fy * 0.4, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const blushA = 0.18 + k.petLevel * 0.45 + (foodState.phase === 'excited_jump' ? 0.32 : 0);
      [-23, 23].forEach((bx) => {
        const bg = ctx.createRadialGradient(bx + fx * 0.5, 11, 1, bx + fx * 0.5, 11, 10);
        bg.addColorStop(0, `rgba(255, 120, 155, ${blushA})`);
        bg.addColorStop(1, 'rgba(255, 120, 155, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx + fx * 0.5, 11, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      const eyeR = k.baby ? 10.2 : 9.2;
      drawCatEye(-15.5 + fx, -1.5 + fy, eyeR, k, k.eyeCols);
      drawCatEye(15.5 + fx, -1.5 + fy, eyeR, k, k.eyeColsR || k.eyeCols);

      // Subtle lifelike nose twitch when sniffing!
      const nTw = Math.sin(k.noseTwitchPhase) * 0.7;
      ctx.fillStyle = k.nose;
      ctx.beginPath();
      ctx.moveTo(fx - 4.8, 8 + fy * 0.5 + nTw);
      ctx.lineTo(fx + 4.8, 8 + fy * 0.5 + nTw);
      ctx.quadraticCurveTo(fx, 14 + fy * 0.5 + nTw, fx - 4.8, 8 + fy * 0.5 + nTw);
      ctx.fill();

      // Animated Mouth (eating munching OR meow opening!)
      const eatChomp = k.eatDip > 0.45 ? (Math.sin(elapsed * 24 + k.idx) * 0.5 + 0.5) * 0.65 : 0;
      const mouthAmt = Math.max(k.mouthOpen, eatChomp);
      if (mouthAmt > 0.08) {
        ctx.fillStyle = '#9E2B4E';
        ctx.beginPath();
        ctx.ellipse(fx, 17 + fy * 0.5, 4.5, 2.2 + mouthAmt * 4.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF90AB';
        ctx.beginPath();
        ctx.ellipse(fx, 18.5 + mouthAmt * 2 + fy * 0.5, 2.8, 1.6 + mouthAmt * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = k.pattern === 'siamese' || k.pattern === 'tuxedo' ? '#2A181A' : '#6E3840';
        ctx.lineWidth = 1.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fx, 12.5 + fy * 0.5);
        ctx.lineTo(fx, 15.2 + fy * 0.5);
        ctx.quadraticCurveTo(fx - 4, 18.5 + fy * 0.5, fx - 7.5, 15.5 + fy * 0.5);
        ctx.moveTo(fx, 15.2 + fy * 0.5);
        ctx.quadraticCurveTo(fx + 4, 18.5 + fy * 0.5, fx + 7.5, 15.5 + fy * 0.5);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 1.15;
      [-1, 1].forEach((side) => {
        [-3, 1, 5].forEach((wy) => {
          ctx.beginPath();
          ctx.moveTo(fx + side * 14, 13 + wy * 0.5);
          ctx.quadraticCurveTo(fx + side * 30, 12 + wy * 1.1, fx + side * 44, 13 + wy * 1.7);
          ctx.stroke();
        });
      });

      ctx.restore(); // head
      ctx.restore(); // cat

      k.hitCenter = { x: cx, y: cy - 42 * sc, rx: 64 * sc + 14, ry: 68 * sc + 14 };
    }

    function drawSpeechBubble(k) {
      if (k.speechAlpha <= 0.02) return;
      const spX = Math.max(54, Math.min(W - 54, k.hitCenter.x));
      const spY = Math.max(20, k.hitCenter.y - 60 * k.drawScale - k.speechY);
      ctx.save();
      ctx.globalAlpha = Math.min(1, k.speechAlpha);
      ctx.font = '700 13px "Gloria Hallelujah", cursive';
      const tw = ctx.measureText(k.speechText).width;
      const bw = tw + 18, bh = 24;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = '#FFB6C1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(spX - bw / 2, spY - bh / 2, bw, bh, 12);
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
    // 7. Pointer / Touch Rubbing & Yarn Ball Interaction
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
      const pool = getActiveCats();
      let best = null;
      let bestScore = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const k = pool[i];
        const dx = (cx - k.hitCenter.x) / k.hitCenter.rx;
        const dy = (cy - k.hitCenter.y) / k.hitCenter.ry;
        const score = dx * dx + dy * dy;
        if (score <= 1.0 && score < bestScore) {
          bestScore = score;
          best = { kitten: k, dx, dy };
        }
      }
      return best;
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      isPointerDown = true;
      canvas.classList.add('is-petting');
      const pt = getCanvasCoords(e);
      lastPX = pt.x;
      lastPY = pt.y;
      ensureAudio();

      // Allow batting the yarn ball directly with cursor/finger!
      if (yarnBall.active && Math.hypot(pt.x - yarnBall.x, pt.y - yarnBall.y) <= yarnBall.r + 22) {
        yarnBall.vx = (yarnBall.x - pt.x) * 8 + (Math.random() - 0.5) * 180;
        yarnBall.vy = -160;
        return;
      }

      const hit = hitTestKitten(pt.x, pt.y);
      if (hit) {
        triggerKittenMeow(hit.kitten, foodState.phase === 'excited_jump' ? 'food' : 'meow', pt.x, pt.y);
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
      const overYarn = yarnBall.active && Math.hypot(pt.x - yarnBall.x, pt.y - yarnBall.y) <= yarnBall.r + 22;
      canvas.classList.toggle('is-hovering-cat', !!(hit || overYarn));
      canvas.classList.toggle('is-petting', isPointerDown);

      if (hit && (isPointerDown || (e.pointerType === 'mouse' && moveDist > 1.5))) {
        applyPetRub(hit.kitten, moveDist, pt.x, pt.y, hit.dx, hit.dy);
      }
    });

    const endRub = () => {
      isPointerDown = false;
      canvas.classList.remove('is-petting');
    };
    canvas.addEventListener('pointerup', endRub);
    canvas.addEventListener('pointercancel', endRub);
    canvas.addEventListener('pointerleave', () => {
      isPointerDown = false;
      canvas.classList.remove('is-petting', 'is-hovering-cat');
      pointerNormX = 0;
      pointerNormY = 0;
    });

    // ---------------------------------------------------------------------
    // 8. Smooth 120Hz Animation Loop
    // ---------------------------------------------------------------------
    let isInView = true;
    let rafId = null;
    let lastTime = 0;
    let elapsed = 0;
    const mainEl = document.getElementById('main');

    updateLayout();

    let lastResizeW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastResizeW) return;
      lastResizeW = window.innerWidth;
      updateLayout();
    });

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

      const pool = getActiveCats();

      // Update Food Choreography ('calling' -> 'eating' -> 'excited_jump' -> 'none')
      if (foodState.phase !== 'none') {
        foodState.timer += dt;
        const ft = foodState.timer;

        if (foodState.phase === 'calling') {
          foodState.bowls.forEach((b) => { b.alpha = Math.min(1, ft * 2.5); });
          if (ft >= 1.1) {
            foodState.phase = 'eating';
            foodState.timer = 0;
            pool.forEach((k) => {
              k.targetCrouch = 0.55;
              k.targetEatDip = 1.0;
              k.socialMood = 'Nom nom nom~ 🐟';
            });
          }
        } else if (foodState.phase === 'eating') {
          const eatProg = Math.min(1, ft / 2.6);
          foodState.bowls.forEach((b) => { b.fill = Math.max(0, 1 - eatProg); });
          if (Math.random() < 0.14) {
            const rk = pool[Math.floor(Math.random() * pool.length)];
            floatingParticles.push({
              x: rk.hitCenter.x + (Math.random() - 0.5) * 20,
              y: rk.hitCenter.y + 10,
              vx: (Math.random() - 0.5) * 18,
              vy: -24,
              symbol: Math.random() > 0.5 ? '✨' : '💕',
              size: 12,
              life: 0,
              maxLife: 0.75
            });
          }
          if (ft >= 2.65) {
            foodState.phase = 'excited_jump';
            foodState.timer = 0;
            foodState.bowls.forEach((b) => { b.fill = 0; });
            pool.forEach((k, idx) => {
              k.targetEatDip = 0;
              k.targetCrouch = 0;
              k.socialSquint = 1.0;
              k.socialMood = 'So excited!! Zoomies! 🎉';
              if (idx % 3 === 0) {
                showKittenBubble(k, idx === 0 ? 'YAY!! 🎉' : 'SO GOOD! 💖', 'food');
              }
            });
          }
        } else if (foodState.phase === 'excited_jump') {
          foodState.bowls.forEach((b) => { b.alpha = Math.max(0, 1 - ft * 1.4); });
          foodState.soundTick += dt;

          // Excited bouncing jumps across ALL active cats with squash & stretch!
          pool.forEach((k, idx) => {
            const jVal = Math.sin(ft * k.jumpSpeed + k.jumpPhase);
            k.hopY = Math.max(0, jVal) * (24 + (idx % 3) * 8);
            k.pawSwipeL = Math.max(0, jVal) * 0.45;
            k.pawSwipeR = Math.max(0, jVal) * 0.45;
          });

          if (foodState.soundTick >= 1.15 && foodState.jumpChirpIdx < 3) {
            foodState.soundTick = 0;
            foodState.jumpChirpIdx++;
            const jumper = pool[(foodState.jumpChirpIdx * 3) % pool.length];
            showKittenBubble(jumper, ['WHEEE! 🐾', 'YUMMY!! 💕', 'ZOOMIES! ✨'][foodState.jumpChirpIdx % 3], 'play');
          }

          if (Math.random() < 0.25) {
            const rk = pool[Math.floor(Math.random() * pool.length)];
            floatingParticles.push({
              x: rk.hitCenter.x + (Math.random() - 0.5) * 32,
              y: rk.hitCenter.y - 16,
              vx: (Math.random() - 0.5) * 28,
              vy: -(32 + Math.random() * 24),
              symbol: ['✨', '💖', '🎉', '🐾'][Math.floor(Math.random() * 4)],
              size: 13,
              life: 0,
              maxLife: 0.9
            });
          }

          if (ft >= 4.4) {
            foodState.phase = 'none';
            foodState.bowls = [];
            if (feedBtn) feedBtn.classList.remove('is-active');
            resetSocialTargets();
            pool.forEach((k) => { k.hopY = 0; k.pawSwipeL = 0; k.pawSwipeR = 0; });
            social.timer = 2.0;
          }
        }
      }

      // Update Yarn Ball Toy Physics
      if (yarnBall.active) {
        yarnBall.timer -= dt;
        yarnBall.batCooldown = Math.max(0, yarnBall.batCooldown - dt);
        yarnBall.vy += 380 * dt;
        yarnBall.x += yarnBall.vx * dt;
        yarnBall.y += yarnBall.vy * dt;
        yarnBall.rot += yarnBall.vx * dt * 0.05;

        const floorY = (cushionRows[cushionRows.length - 1] ? cushionRows[cushionRows.length - 1].y : H * 0.78) - 6;
        if (yarnBall.y > floorY) {
          yarnBall.y = floorY;
          yarnBall.vy = -Math.abs(yarnBall.vy) * 0.68;
          yarnBall.vx *= 0.88;
        }
        if (yarnBall.x < 40) { yarnBall.x = 40; yarnBall.vx = Math.abs(yarnBall.vx) * 0.85; }
        if (yarnBall.x > W - 40) { yarnBall.x = W - 40; yarnBall.vx = -Math.abs(yarnBall.vx) * 0.85; }

        // Nearest cat bats yarn ball playfully!
        if (yarnBall.batCooldown <= 0 && Math.abs(yarnBall.vx) < 95 && yarnBall.y > floorY - 26) {
          let nearest = pool[0];
          let minD = Infinity;
          pool.forEach((k) => {
            const d = Math.hypot(k.hitCenter.x - yarnBall.x, k.hitCenter.y - yarnBall.y);
            if (d < minD) { minD = d; nearest = k; }
          });
          if (nearest) {
            nearest.pawSwipeR = 0.95;
            yarnBall.vx = (nearest.hitCenter.x < W * 0.5 ? 1 : -1) * (150 + Math.random() * 140);
            yarnBall.vy = -(130 + Math.random() * 90);
            yarnBall.batCooldown = 1.1;
            showKittenBubble(nearest, 'bap! 🧶', 'play');
          }
        }

        if (yarnBall.timer <= 0) {
          yarnBall.active = false;
          if (playBtn) playBtn.classList.remove('is-active');
        }
      }

      // Autonomous social behavior (when not eating or being petted)
      const isBeingPetted = pool.some((k) => k.petLevel > 0.18);
      let isCuddling = false;
      if (foodState.phase === 'none' && !isBeingPetted) {
        if (social.state === 'idle') {
          social.timer -= dt;
          if (social.timer <= 0) startNextSocialBehavior();
        } else {
          social.phaseTime += dt;
          const pt = social.phaseTime;
          const a = pool[social.actorIdx];
          const b = pool[social.partnerIdx];
          isCuddling = social.state === 'cuddle_nuzzle';

          if (a && b) {
            if (social.state === 'play_fight') {
              const bapPhase = Math.max(0, pt - 0.4);
              const sw = Math.sin(bapPhase * 15);
              a.pawSwipeL = Math.max(0, sw) * 0.9;
              a.pawSwipeR = Math.max(0, -sw) * 0.9;
              b.pawSwipeR = Math.max(0, Math.sin(bapPhase * 15 + 1.4)) * 0.9;
              b.pawSwipeL = Math.max(0, -Math.sin(bapPhase * 15 + 1.4)) * 0.9;
              a.hopY = Math.abs(Math.sin(bapPhase * 6.5)) * 8;
              b.hopY = Math.abs(Math.sin(bapPhase * 6.5 + 1.1)) * 8;

              if (pt > 0.55 && social.bapStep === 0) {
                social.bapStep = 1;
                showKittenBubble(b, 'bap bap! 🐾', 'play');
                floatingParticles.push({
                  x: (a.hitCenter.x + b.hitCenter.x) * 0.5,
                  y: Math.min(a.hitCenter.y, b.hitCenter.y) - 18,
                  vx: 0, vy: -26, symbol: '🐾', size: 15, life: 0, maxLife: 0.85
                });
              } else if (pt > 1.65 && social.bapStep === 1) {
                social.bapStep = 2;
                showKittenBubble(a, 'mew! 💥', 'play');
              }
            } else if (social.state === 'play_pounce') {
              const dir = b.baseX >= a.baseX ? 1 : -1;
              if (pt < 1.15) {
                a.buttWiggle = Math.sin(pt * 22) * 4.5 * Math.min(1, pt * 2);
              } else if (pt < 1.95) {
                const pProg = (pt - 1.15) / 0.8;
                a.buttWiggle = 0;
                a.targetCrouch = 0;
                a.targetX = dir * Math.min(60, Math.abs(b.baseX - a.baseX) * 0.48);
                a.hopY = Math.sin(pProg * Math.PI) * 28;
                a.pawSwipeL = Math.sin(pProg * Math.PI) * 0.8;
                a.pawSwipeR = Math.sin(pProg * Math.PI) * 0.8;
                if (!social.pounced && pProg > 0.45) {
                  social.pounced = true;
                  b.targetX = dir * 14;
                  b.hopY = 14;
                  showKittenBubble(a, 'gotcha! ✨', 'play');
                  showKittenBubble(b, 'eep! 🐾', 'play');
                }
                if (pProg > 0.55) b.hopY = Math.sin(((pProg - 0.55) / 0.45) * Math.PI) * 15;
              } else {
                a.hopY = 0; b.hopY = 0;
              }
            } else if (social.state === 'cuddle_nuzzle') {
              if (Math.random() < 0.08) {
                floatingParticles.push({
                  x: (a.hitCenter.x + b.hitCenter.x) * 0.5 + (Math.random() - 0.5) * 18,
                  y: Math.min(a.hitCenter.y, b.hitCenter.y) - 22,
                  vx: (Math.random() - 0.5) * 12, vy: -26,
                  symbol: Math.random() > 0.4 ? '💕' : '💖',
                  size: 13, life: 0, maxLife: 1.0
                });
              }
            }
          }

          if (pt >= social.duration) {
            social.state = 'idle';
            social.timer = 2.4 + Math.random() * 2.6;
            resetSocialTargets();
            pool.forEach((k) => { k.hopY = 0; k.pawSwipeL = 0; k.pawSwipeR = 0; k.buttWiggle = 0; });
            if (playBtn && !yarnBall.active) playBtn.classList.remove('is-active');
          }
        }
      }

      let maxPetLevel = isCuddling ? 0.45 : 0;
      pool.forEach((k) => {
        const posDamp = 1 - Math.exp(-5.8 * dt);
        k.animX += (k.targetX - k.animX) * posDamp;
        k.animY += (k.targetY - k.animY) * posDamp;
        k.faceDir += (k.targetFaceDir - k.faceDir) * posDamp;
        k.crouchAmt += (k.targetCrouch - k.crouchAmt) * (1 - Math.exp(-7.5 * dt));
        k.eatDip += (k.targetEatDip - k.eatDip) * (1 - Math.exp(-8.5 * dt));
        k.earFlatten += (k.targetEarFlatten - k.earFlatten) * (1 - Math.exp(-8 * dt));
        if ((social.state === 'idle' && foodState.phase !== 'excited_jump') || isBeingPetted) {
          k.hopY *= Math.exp(-10 * dt);
          if (!yarnBall.active) {
            k.pawSwipeL *= Math.exp(-10 * dt);
            k.pawSwipeR *= Math.exp(-10 * dt);
          } else {
            k.pawSwipeL *= Math.exp(-6 * dt);
            k.pawSwipeR *= Math.exp(-6 * dt);
          }
          k.buttWiggle *= Math.exp(-10 * dt);
        }

        // Squash & stretch physics derived from vertical hop velocity!
        const hopVel = (k.hopY - k.prevHopY) / dt;
        k.prevHopY = k.hopY;
        const targetSquashY = Math.max(0.86, Math.min(1.16, 1.0 + hopVel * 0.0011 - (k.hopY < 1.5 && k.crouchAmt > 0.2 ? 0.06 : 0)));
        const targetSquashX = 1.0 / Math.sqrt(targetSquashY);
        const sqDamp = 1 - Math.exp(-14 * dt);
        k.squashX += (targetSquashX - k.squashX) * sqDamp;
        k.squashY += (targetSquashY - k.squashY) * sqDamp;

        // Eye tracking: watches yarn ball if active, or food bowls, or cursor!
        let targetLookX = (pointerNormX * (W * 0.5) - (k.baseX + k.animX - W * 0.5)) / 240;
        let targetLookY = pointerNormY;
        if (yarnBall.active) {
          targetLookX = (yarnBall.x - k.hitCenter.x) / 140;
          targetLookY = (yarnBall.y - k.hitCenter.y) / 120;
        } else if (foodState.phase === 'calling' || foodState.phase === 'eating') {
          targetLookX = 0;
          targetLookY = 0.85;
        }
        const lookDamp = 1 - Math.exp(-7.5 * dt);
        k.lookX += (Math.max(-1, Math.min(1, targetLookX)) - k.lookX) * lookDamp;
        k.lookY += (Math.max(-1, Math.min(1, targetLookY)) - k.lookY) * lookDamp;

        k.petLevel *= Math.exp(-1.15 * dt);
        k.leanX *= Math.exp(-5 * dt);
        k.leanY *= Math.exp(-5 * dt);
        if (k.moodEl && k.petLevel < 0.08 && k.speechAlpha < 0.05) {
          const desiredMood = k.socialMood || k.colorLabel;
          if (k.moodEl.textContent !== desiredMood) k.moodEl.textContent = desiredMood;
        }
        maxPetLevel = Math.max(maxPetLevel, k.petLevel);

        const squintTarget = Math.max(k.socialSquint, k.petLevel > 0.25 ? Math.min(1, k.petLevel * 1.2) : 0);
        k.happySquint += (squintTarget - k.happySquint) * (1 - Math.exp(-8 * dt));
        k.kneadPhase += dt * (2.2 + k.petLevel * 6.5);
        k.noseTwitchPhase += dt * (foodState.phase === 'calling' ? 16 : 3.2);

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
            k.blinkTimer = 2.4 + Math.random() * 3.2;
          }
        }

        k.earTwitchTimer -= dt;
        if (k.earTwitchTimer <= 0) {
          if (k.earTwitchTimer > -0.18) {
            k.earTwitch = Math.sin(((-k.earTwitchTimer) / 0.18) * Math.PI * 2);
          } else {
            k.earTwitch = 0;
            k.earTwitchTimer = 2.8 + Math.random() * 4;
          }
        }
      });

      setPurrIntensity(maxPetLevel);

      ctx.clearRect(0, 0, W, H);
      drawCushions();
      drawFoodBowls();

      const ordered = pool.slice().sort((a, b) => (a.baseY + a.animY) - (b.baseY + b.animY));
      for (let i = 0; i < ordered.length; i++) drawCat2D(ordered[i], elapsed);
      drawYarnBall();
      for (let i = 0; i < ordered.length; i++) drawSpeechBubble(ordered[i]);

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
