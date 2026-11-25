/**
 * Neo (Ginger Kitten) & Husky (Fat White & Brown Persian Kitten)
 * WebGL Skinned glTF 2.0 Renderer (Cat.glb) + Tactile Petting + Real Kitten Meows + Autonomous Play & Fight
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const glCanvas = document.getElementById('kittens-3d-canvas');
    const fxCanvas = document.getElementById('kittens-fx-canvas');
    const card = document.getElementById('kittens-corner');
    const soundBtn = document.getElementById('kittens-sound-btn');
    const neoBadge = document.getElementById('kitten-badge-neo');
    const huskyBadge = document.getElementById('kitten-badge-husky');
    const neoMoodEl = document.getElementById('kitten-mood-neo');
    const huskyMoodEl = document.getElementById('kitten-mood-husky');

    if (!glCanvas || !fxCanvas || !card) return;
    const fxCtx = fxCanvas.getContext('2d');
    const gl = glCanvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' })
      || glCanvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'high-performance' });
    const catData = window.CAT_GLB_DATA;
    if (!gl || !fxCtx || !catData) return;

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
      const rate = kittenKey === 'neo' ? 1.06 : 0.94;
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
    // 2. Column-Major 4x4 Matrix & Quaternion Math
    // ---------------------------------------------------------------------
    const Mat4 = {
      create() {
        return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      },
      mul(out, a, b) {
        const a00=a[0],a01=a[1],a02=a[2],a03=a[3],
              a10=a[4],a11=a[5],a12=a[6],a13=a[7],
              a20=a[8],a21=a[9],a22=a[10],a23=a[11],
              a30=a[12],a31=a[13],a32=a[14],a33=a[15];
        for (let c = 0; c < 4; c++) {
          const b0 = b[c*4], b1 = b[c*4+1], b2 = b[c*4+2], b3 = b[c*4+3];
          out[c*4]   = a00*b0 + a10*b1 + a20*b2 + a30*b3;
          out[c*4+1] = a01*b0 + a11*b1 + a21*b2 + a31*b3;
          out[c*4+2] = a02*b0 + a12*b1 + a22*b2 + a32*b3;
          out[c*4+3] = a03*b0 + a13*b1 + a23*b2 + a33*b3;
        }
        return out;
      },
      fromTRS(out, t, q, s) {
        const x=q[0], y=q[1], z=q[2], w=q[3];
        const x2=x+x, y2=y+y, z2=z+z;
        const xx=x*x2, xy=x*y2, xz=x*z2;
        const yy=y*y2, yz=y*z2, zz=z*z2;
        const wx=w*x2, wy=w*y2, wz=w*z2;
        const sx=s[0], sy=s[1], sz=s[2];
        out[0]=(1-(yy+zz))*sx; out[1]=(xy+wz)*sx; out[2]=(xz-wy)*sx; out[3]=0;
        out[4]=(xy-wz)*sy; out[5]=(1-(xx+zz))*sy; out[6]=(yz+wx)*sy; out[7]=0;
        out[8]=(xz+wy)*sz; out[9]=(yz-wx)*sz; out[10]=(1-(xx+yy))*sz; out[11]=0;
        out[12]=t[0]; out[13]=t[1]; out[14]=t[2]; out[15]=1;
        return out;
      },
      perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy * 0.5);
        const nf = 1.0 / (near - far);
        out.fill(0);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = 2 * far * near * nf;
        return out;
      },
      lookAt(out, eye, center, up) {
        let zx = eye[0]-center[0], zy = eye[1]-center[1], zz = eye[2]-center[2];
        let len = Math.hypot(zx, zy, zz) || 1;
        zx/=len; zy/=len; zz/=len;
        let xx = up[1]*zz - up[2]*zy, xy = up[2]*zx - up[0]*zz, xz = up[0]*zy - up[1]*zx;
        len = Math.hypot(xx, xy, xz) || 1;
        xx/=len; xy/=len; xz/=len;
        const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
        out[0]=xx; out[1]=yx; out[2]=zx; out[3]=0;
        out[4]=xy; out[5]=yy; out[6]=zy; out[7]=0;
        out[8]=xz; out[9]=yz; out[10]=zz; out[11]=0;
        out[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);
        out[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);
        out[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);
        out[15]=1;
        return out;
      },
      projectPoint(vp, x, y, z) {
        const cx = vp[0]*x + vp[4]*y + vp[8]*z + vp[12];
        const cy = vp[1]*x + vp[5]*y + vp[9]*z + vp[13];
        const cw = vp[3]*x + vp[7]*y + vp[11]*z + vp[15];
        if (Math.abs(cw) < 1e-5) return { x: W * 0.5, y: H * 0.5 };
        return {
          x: (cx / cw * 0.5 + 0.5) * W,
          y: (0.5 - cy / cw * 0.5) * H
        };
      }
    };

    function quatMul(out, a, b) {
      const ax=a[0],ay=a[1],az=a[2],aw=a[3];
      const bx=b[0],by=b[1],bz=b[2],bw=b[3];
      out[0] = aw*bx + ax*bw + ay*bz - az*by;
      out[1] = aw*by - ax*bz + ay*bw + az*bx;
      out[2] = aw*bz + ax*by - ay*bx + az*bw;
      out[3] = aw*bw - ax*bx - ay*by - az*bz;
      return out;
    }

    function quatFromEuler(out, rx, ry, rz) {
      // Apply Z, then Y, then X
      const cx=Math.cos(rx*0.5), sx=Math.sin(rx*0.5);
      const cy=Math.cos(ry*0.5), sy=Math.sin(ry*0.5);
      const cz=Math.cos(rz*0.5), sz=Math.sin(rz*0.5);
      out[0] = sx*cy*cz - cx*sy*sz;
      out[1] = cx*sy*cz + sx*cy*sz;
      out[2] = cx*cy*sz - sx*sz*sy;
      out[3] = cx*cy*cz + sx*sy*sz;
      return out;
    }

    // ---------------------------------------------------------------------
    // 3. WebGL Shaders & Mesh Compilation (Skinned Cat.glb + 3D Cushion)
    // ---------------------------------------------------------------------
    function compileShader(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(sh));
      }
      return sh;
    }

    function createProgram(vsSrc, fsSrc) {
      const prog = gl.createProgram();
      gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSrc));
      gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(prog);
      return prog;
    }

    const VS_CAT = `
      attribute vec3 aPos;
      attribute vec3 aNorm;
      attribute vec2 aUV;
      attribute vec4 aJoints;
      attribute vec4 aWeights;

      uniform mat4 uProj;
      uniform mat4 uView;
      uniform mat4 uModel;
      uniform mat4 uJoints[20];
      uniform float uChubby;
      uniform float uBaby;
      uniform float uFluffPush;

      varying vec2 vUV;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      mat4 getJoint(int idx) {
        for (int i = 0; i < 20; i++) {
          if (i == idx) return uJoints[i];
        }
        return mat4(1.0);
      }

      void main() {
        vec3 p = aPos;

        // Tiny adorable baby-kitten proportions (uBaby = 1.0 for Neo, matching photo 2!)
        if (uBaby > 0.001) {
          float kHeadMask = smoothstep(0.16, 0.25, p.z) * smoothstep(0.21, 0.29, p.y);
          vec3 headPivot = vec3(0.0, 0.31, 0.24);
          // Bigger cute round baby-kitten head + slightly shorter chubby legs
          p = mix(p, headPivot + (p - headPivot) * vec3(1.16, 1.14, 1.06), kHeadMask * uBaby);
          p.y *= 1.0 - 0.06 * uBaby * (1.0 - kHeadMask);
        }

        // Fat fluffy Persian kitten proportions (uChubby = 1.0 for Husky, matching photo 1!)
        if (uChubby > 0.001) {
          float torsoMask = smoothstep(-0.22, -0.05, p.z) * (1.0 - smoothstep(0.09, 0.22, p.z)) * smoothstep(0.05, 0.14, p.y);
          float headMask  = smoothstep(0.16, 0.24, p.z) * smoothstep(0.21, 0.29, p.y);
          float snoutMask = smoothstep(0.27, 0.34, p.z) * smoothstep(0.23, 0.33, p.y);
          float ruffMask  = smoothstep(0.06, 0.20, p.z) * (1.0 - smoothstep(0.20, 0.29, p.y)) * smoothstep(0.06, 0.14, p.y);

          // Plump fat Persian belly, wide flanks & fluffy white chest ruff
          p.x *= 1.0 + uChubby * (0.20 + 0.30 * torsoMask + 0.16 * headMask + 0.14 * ruffMask);
          p.y -= uChubby * 0.022 * torsoMask * (1.0 - smoothstep(0.09, 0.23, p.y));
          p.y += uChubby * 0.015 * torsoMask * smoothstep(0.18, 0.28, p.y);
          p.z += uChubby * 0.018 * ruffMask;
          // Rounder flat-faced Persian cheeks & shorter nose
          p.z -= uChubby * 0.024 * snoutMask;
          // Extra fluffy Persian fur push
          p += aNorm * (uFluffPush * uChubby);
        }

        mat4 skinMat =
          aWeights.x * getJoint(int(aJoints.x + 0.5)) +
          aWeights.y * getJoint(int(aJoints.y + 0.5)) +
          aWeights.z * getJoint(int(aJoints.z + 0.5)) +
          aWeights.w * getJoint(int(aJoints.w + 0.5));

        vec4 worldPos = uModel * skinMat * vec4(p, 1.0);
        vec3 worldNorm = normalize(mat3(uModel) * mat3(skinMat) * aNorm);

        vUV = aUV;
        vNormal = worldNorm;
        vWorldPos = worldPos.xyz;
        gl_Position = uProj * uView * worldPos;
      }
    `;

    const FS_CAT = `
      precision mediump float;
      uniform sampler2D uTex;
      uniform vec3 uCamPos;
      uniform float uAlphaTest;
      uniform float uPetGlow;

      varying vec2 vUV;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        vec4 texCol = texture2D(uTex, vUV);
        if (texCol.a < uAlphaTest) discard;

        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCamPos - vWorldPos);
        vec3 L1 = normalize(vec3(-0.42, 0.85, 0.65));
        vec3 L2 = normalize(vec3(0.65, 0.45, -0.35));

        float diff1 = max(dot(N, L1), 0.0);
        float diff2 = max(dot(N, L2), 0.0);
        float hemi = N.y * 0.5 + 0.5;

        // Soft plush fur ambient + warm key light + subtle pink rim fresnel
        vec3 ambient = mix(vec3(0.42, 0.35, 0.38), vec3(0.95, 0.90, 0.90), hemi) * 0.68;
        vec3 light = ambient + vec3(0.95, 0.91, 0.86) * diff1 * 0.58 + vec3(0.75, 0.82, 0.95) * diff2 * 0.18;

        float rim = pow(1.0 - max(dot(N, V), 0.0), 2.7);
        vec3 rimCol = vec3(1.0, 0.86, 0.90) * rim * (0.28 + uPetGlow * 0.25);

        vec3 finalRGB = texCol.rgb * light + rimCol;
        gl_FragColor = vec4(finalRGB, texCol.a);
      }
    `;

    const VS_SOLID = `
      attribute vec3 aPos;
      attribute vec3 aNorm;
      uniform mat4 uProj;
      uniform mat4 uView;
      uniform mat4 uModel;
      varying vec3 vNorm;
      varying vec3 vLocal;
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = uModel * vec4(aPos, 1.0);
        vNorm = normalize(mat3(uModel) * aNorm);
        vLocal = aPos;
        vWorldPos = wp.xyz;
        gl_Position = uProj * uView * wp;
      }
    `;

    const FS_SOLID = `
      precision mediump float;
      uniform vec3 uColorTop;
      uniform vec3 uColorRim;
      uniform vec3 uCamPos;
      uniform float uIsShadow;
      varying vec3 vNorm;
      varying vec3 vLocal;
      varying vec3 vWorldPos;
      void main() {
        if (uIsShadow > 0.5) {
          float r = length(vLocal.xz);
          float a = smoothstep(1.0, 0.1, r) * 0.26;
          gl_FragColor = vec4(0.35, 0.14, 0.22, a);
          return;
        }
        vec3 N = normalize(vNorm);
        vec3 V = normalize(uCamPos - vWorldPos);
        vec3 L = normalize(vec3(-0.35, 0.9, 0.5));
        float diff = max(dot(N, L), 0.0);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 2.2);
        vec3 base = mix(uColorRim, uColorTop, smoothstep(-0.3, 0.7, N.y));
        vec3 col = base * (0.68 + 0.38 * diff) + vec3(1.0, 0.94, 0.96) * rim * 0.16;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const catProg = createProgram(VS_CAT, FS_CAT);
    const solidProg = createProgram(VS_SOLID, FS_SOLID);

    // Decode stripped GLB binary buffer
    const binStr = atob(catData.binBase64);
    const binBytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) binBytes[i] = binStr.charCodeAt(i);

    function getAccessorView(accIdx) {
      const acc = catData.gltf.accessors[accIdx];
      const bv = catData.gltf.bufferViews[acc.bufferView];
      const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const compCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
      const count = acc.count * compCounts[acc.type];
      if (acc.componentType === 5126) return new Float32Array(binBytes.buffer, offset, count);
      if (acc.componentType === 5123) return new Uint16Array(binBytes.buffer, offset, count);
      if (acc.componentType === 5121) return new Uint8Array(binBytes.buffer, offset, count);
      return new Uint32Array(binBytes.buffer, offset, count);
    }

    function createVBO(data, target) {
      const buf = gl.createBuffer();
      gl.bindBuffer(target, buf);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return buf;
    }

    // Build GPU buffers for the 3 Cat.glb primitives
    const primitives = catData.gltf.meshes[0].primitives.map((p) => {
      const pos = getAccessorView(p.attributes.POSITION);
      const norm = getAccessorView(p.attributes.NORMAL);
      const uv = getAccessorView(p.attributes.TEXCOORD_0);
      const jntRaw = getAccessorView(p.attributes.JOINTS_0);
      const jnt = new Float32Array(jntRaw.length);
      for (let i = 0; i < jntRaw.length; i++) jnt[i] = jntRaw[i];
      const wgt = getAccessorView(p.attributes.WEIGHTS_0);
      const idx = getAccessorView(p.indices);

      return {
        material: p.material,
        count: idx.length,
        posVBO: createVBO(pos, gl.ARRAY_BUFFER),
        normVBO: createVBO(norm, gl.ARRAY_BUFFER),
        uvVBO: createVBO(uv, gl.ARRAY_BUFFER),
        jntVBO: createVBO(jnt, gl.ARRAY_BUFFER),
        wgtVBO: createVBO(wgt, gl.ARRAY_BUFFER),
        ibo: createVBO(idx, gl.ELEMENT_ARRAY_BUFFER)
      };
    });

    // Extract InverseBindMatrices (20 x mat4)
    const ibmFlat = getAccessorView(catData.gltf.skins[0].inverseBindMatrices);
    const ibmList = [];
    for (let i = 0; i < 20; i++) {
      ibmList.push(new Float32Array(ibmFlat.buffer, ibmFlat.byteOffset + i * 64, 16));
    }
    const jointNodes = catData.gltf.skins[0].joints; // array of 20 node indices

    // Load custom Neo & Husky textures into WebGL
    function loadGLTextures(dataUrls) {
      return dataUrls.map((url) => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 230, 220, 255]));
        const img = new Image();
        img.onload = () => {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.generateMipmap(gl.TEXTURE_2D);
        };
        img.src = url;
        return tex;
      });
    }

    const neoTextures = loadGLTextures(catData.textures.neo);
    const huskyTextures = loadGLTextures(catData.textures.husky);

    // Build 3D Tufted Cushion Mesh + Shadow Disc Mesh
    function buildCushionMesh() {
      const stacks = 18, slices = 44;
      const verts = [], norms = [], indices = [];
      for (let i = 0; i <= stacks; i++) {
        const phi = (i / stacks) * Math.PI;
        for (let j = 0; j <= slices; j++) {
          const theta = (j / slices) * Math.PI * 2;
          const x = Math.sin(phi) * Math.cos(theta);
          let y = Math.cos(phi);
          const z = Math.sin(phi) * Math.sin(theta);
          // Slight plush pillow squashing & subtle tufted dimple
          const tuft = 1.0 - 0.08 * Math.exp(-((x*x*4 + z*z*4)));
          y *= 0.18 * tuft;
          const rx = x * 0.50;
          const rz = z * 0.27;
          verts.push(rx, y - 0.032, rz);
          const nx = x / 0.50, ny = y / 0.09, nz = z / 0.27;
          const nl = Math.hypot(nx, ny, nz) || 1;
          norms.push(nx/nl, ny/nl, nz/nl);
        }
      }
      for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
          const a = i * (slices + 1) + j;
          const b = a + slices + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      return {
        posVBO: createVBO(new Float32Array(verts), gl.ARRAY_BUFFER),
        normVBO: createVBO(new Float32Array(norms), gl.ARRAY_BUFFER),
        ibo: createVBO(new Uint16Array(indices), gl.ELEMENT_ARRAY_BUFFER),
        count: indices.length
      };
    }

    function buildShadowDiscMesh() {
      const segs = 28;
      const verts = [0, 0, 0], norms = [0, 1, 0], indices = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        verts.push(Math.cos(a), 0, Math.sin(a));
        norms.push(0, 1, 0);
        if (i < segs) indices.push(0, i + 1, i + 2);
      }
      return {
        posVBO: createVBO(new Float32Array(verts), gl.ARRAY_BUFFER),
        normVBO: createVBO(new Float32Array(norms), gl.ARRAY_BUFFER),
        ibo: createVBO(new Uint16Array(indices), gl.ELEMENT_ARRAY_BUFFER),
        count: indices.length
      };
    }

    const cushionMesh = buildCushionMesh();
    const shadowDiscMesh = buildShadowDiscMesh();

    // ---------------------------------------------------------------------
    // 4. Kitten Rig State, Petting, & Autonomous Real-Kitten Behaviors
    // ---------------------------------------------------------------------
    // Node index lookup by name in Cat.glb
    const nodeIndex = {};
    catData.gltf.nodes.forEach((n, i) => { nodeIndex[n.name] = i; });

    function createKittenState(cfg) {
      return {
        ...cfg,
        lookYaw: 0,
        lookPitch: 0,
        leanX: 0,
        leanY: 0,
        petLevel: 0,
        happySquint: 0,
        mouthOpen: 0,
        meowTimer: 0,
        lastMeowAt: 0,
        rubEnergy: 0,
        blinkTimer: 1.5 + Math.random() * 2.5,
        blinkAmt: 0,
        earTwitchTimer: 2 + Math.random() * 3,
        earTwitch: 0,
        kneadPhase: Math.random() * Math.PI * 2,
        tailPhase: Math.random() * Math.PI * 2,
        // Autonomous social motion
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
        hitCenter: { x: W * 0.5, y: H * 0.5, rx: 95, ry: 95 },
        headScreen: { x: W * 0.5, y: H * 0.35 }
      };
    }

    const neo = createKittenState({
      key: 'neo',
      name: 'Neo',
      wx: -0.22,
      wy: 0.0,
      wz: 0.03,
      baseYaw: 0.42,
      scale: 0.87,
      chubby: 0.0,
      baby: 1.0, // Tiny round-headed ginger baby kitten matching photo 2!
      textures: neoTextures,
      badgeEl: neoBadge,
      moodEl: neoMoodEl,
      idleMood: 'Ginger Kitty · Rub to pet',
      petMoods: ['Mew! So soft 💕', 'Purring happily~ 🧡', 'Loves chin rubs! ✨']
    });

    const husky = createKittenState({
      key: 'husky',
      name: 'Husky',
      wx: 0.22,
      wy: 0.0,
      wz: 0.03,
      baseYaw: -0.42,
      scale: 1.04,
      chubby: 1.0, // Fat white & caramel Persian kitten matching photo 1!
      baby: 0.0,
      textures: huskyTextures,
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
        k.targetX = 0; k.targetY = 0; k.targetZ = 0; k.targetYaw = 0;
        k.targetCrouch = 0; k.targetEarFlatten = 0; k.socialSquint = 0; k.socialMood = '';
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
        neo.targetX = 0.09;
        husky.targetX = -0.09;
        neo.targetYaw = 0.95;
        husky.targetYaw = -0.95;
        neo.targetEarFlatten = 0.8;
        husky.targetEarFlatten = 0.8;
        neo.socialMood = 'Play-fighting Husky! 🐾';
        husky.socialMood = 'Bap-bap-bapping Neo! 🐾';
        showKittenBubble(kittens[social.actorIdx], 'rawr! 🐾', true);
      } else if (r < 0.62) {
        social.state = 'play_pounce';
        social.duration = 3.2;
        const attacker = kittens[social.actorIdx];
        const defender = kittens[1 - social.actorIdx];
        const dir = social.actorIdx === 0 ? 1 : -1;
        attacker.targetX = dir * 0.04;
        attacker.targetYaw = dir * 0.85;
        attacker.targetCrouch = 1.0;
        defender.targetYaw = -dir * 0.7;
        attacker.socialMood = `Stalking ${defender.name}... 👀`;
        defender.socialMood = 'Watching closely! ✨';
      } else if (r < 0.82) {
        social.state = 'cuddle_nuzzle';
        social.duration = 3.6;
        neo.targetX = 0.11;
        husky.targetX = -0.11;
        neo.targetYaw = 0.62;
        husky.targetYaw = -0.62;
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
        batter.targetX = dir * 0.08;
        batter.targetYaw = dir * 0.85;
        waver.targetX = -dir * 0.04;
        waver.targetYaw = -dir * 1.35;
        batter.socialMood = `Batting ${waver.name}'s tail! 🐾`;
        waver.socialMood = 'Teasing with tail~ ✨';
      } else {
        social.state = 'stretch_play';
        social.duration = 2.6;
        const k = kittens[social.actorIdx];
        k.targetCrouch = 0.82;
        k.socialSquint = 0.6;
        k.socialMood = 'Big Persian/kitty stretch~ ✨';
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

      const sx = px !== undefined ? px : k.headScreen.x;
      const sy = py !== undefined ? py : k.headScreen.y;
      for (let i = 0; i < 4; i++) {
        floatingParticles.push({
          x: sx + (Math.random() - 0.5) * 38,
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
          x: px + (Math.random() - 0.5) * 22,
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
    // 5. Skeletal Pose Evaluation (20 Cat.glb Bones)
    // ---------------------------------------------------------------------
    const nodes = catData.gltf.nodes;
    const nodeLocalMats = nodes.map(() => Mat4.create());
    const nodeWorldMats = nodes.map(() => Mat4.create());
    const jointUniformBuf = new Float32Array(20 * 16);
    const tmpQuat = new Float32Array(4);
    const tmpDeltaQ = new Float32Array(4);
    const tmpTrans = new Float32Array(3);
    const identityMat = Mat4.create();

    function evaluateSkeleton(k, elapsed) {
      const breath = Math.sin(elapsed * 2.6 + (k.key === 'neo' ? 0 : 1.2));
      const purrVib = k.petLevel > 0.15 ? Math.sin(elapsed * 46) * 0.0025 * k.petLevel : 0;

      // Per-node bone offsets (Euler rx, ry, rz in local bone space)
      const rotOffsets = {};
      const addRot = (name, rx, ry, rz) => {
        const idx = nodeIndex[name];
        if (idx !== undefined) rotOffsets[idx] = [rx, ry, rz];
      };

      // Head tracks cursor & leans into rubs (+ subtle playful ear flatten tilt)
      const headYaw = k.lookYaw * 0.55 + k.leanX * 0.25;
      const headPitch = -k.lookPitch * 0.35 - k.petLevel * 0.18 + k.leanY * 0.14 + k.crouchAmt * 0.22;
      const headRoll = k.leanX * 0.20 + Math.sin(elapsed * 1.6 + (k.key === 'neo' ? 0 : 2)) * 0.05 + k.earFlatten * 0.12;
      addRot('Head', headRoll, headYaw, headPitch);

      // Neck follows gently
      addRot('Neck', 0, k.lookYaw * 0.22, -breath * 0.025 + k.crouchAmt * 0.28 - k.petLevel * 0.08);

      // Jaw opens smoothly when meowing!
      addRot('Mouth', 0, 0, k.mouthOpen * 0.42);

      // Spine breathing & crouch
      addRot('Back', 0, k.buttWiggle * 0.04, breath * 0.022 + k.crouchAmt * 0.22);

      // Tail swish + happy upward curl when petted!
      const tailFreq = 2.4 + k.petLevel * 2.2;
      const tailSwish = Math.sin(elapsed * tailFreq + k.tailPhase) * (0.28 + k.petLevel * 0.18);
      const tailCurlUp = -0.35 - k.petLevel * 0.65 - k.crouchAmt * 0.2;
      addRot('Tail',  0, tailSwish * 0.7, tailCurlUp * 0.6);
      addRot('Tail1', 0, tailSwish * 0.85, tailCurlUp * 0.55);
      addRot('Tail2', 0, tailSwish, tailCurlUp * 0.5);

      // Front paws: kneading ("making biscuits") when petted OR bapping during play-fight!
      const kneadL = Math.max(0, Math.sin(k.kneadPhase)) * k.petLevel * 0.35;
      const kneadR = Math.max(0, Math.sin(k.kneadPhase + Math.PI)) * k.petLevel * 0.35;
      const swatL = k.pawSwipeL * 1.05 + kneadL;
      const swatR = k.pawSwipeR * 1.05 + kneadR;

      addRot('L_Shoulder', 0, 0, -swatL + k.crouchAmt * 0.32);
      addRot('L_Arm',      0, 0, swatL * 0.55 - k.crouchAmt * 0.45);
      addRot('L__FrontPaw',0, 0, swatL * 0.35);

      addRot('R_Shoulder', 0, 0, -swatR + k.crouchAmt * 0.32);
      addRot('R_Arm',      0, 0, swatR * 0.55 - k.crouchAmt * 0.45);
      addRot('R_FrontPaw', 0, 0, swatR * 0.35);

      // Hind legs bend smoothly during crouch/pounce
      addRot('L_Thigh', 0, 0, -k.crouchAmt * 0.28);
      addRot('R_Thigh', 0, 0, -k.crouchAmt * 0.28);

      // Compute local matrices from bind pose + offsets
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const bt = n.translation || [0, 0, 0];
        const br = n.rotation || [0, 0, 0, 1];
        const bs = n.scale || [1, 1, 1];

        tmpTrans[0] = bt[0];
        tmpTrans[1] = bt[1];
        tmpTrans[2] = bt[2];
        if (i === nodeIndex.Butt) {
          tmpTrans[1] -= k.crouchAmt * 0.045;
          tmpTrans[2] += k.buttWiggle * 0.003 + purrVib;
        }

        if (rotOffsets[i]) {
          const [rx, ry, rz] = rotOffsets[i];
          quatFromEuler(tmpDeltaQ, rx, ry, rz);
          quatMul(tmpQuat, br, tmpDeltaQ);
        } else {
          tmpQuat[0] = br[0]; tmpQuat[1] = br[1]; tmpQuat[2] = br[2]; tmpQuat[3] = br[3];
        }
        Mat4.fromTRS(nodeLocalMats[i], tmpTrans, tmpQuat, bs);
      }

      // Traverse hierarchy starting at root node 21 (feline_ARM)
      function visit(idx, parentMat) {
        Mat4.mul(nodeWorldMats[idx], parentMat, nodeLocalMats[idx]);
        const ch = nodes[idx].children;
        if (ch) {
          for (let i = 0; i < ch.length; i++) visit(ch[i], nodeWorldMats[idx]);
        }
      }
      visit(21, identityMat);

      // Fill uJoints[20] = nodeWorldMats[joint] * IBM[joint]
      const tmpJ = Mat4.create();
      for (let j = 0; j < 20; j++) {
        Mat4.mul(tmpJ, nodeWorldMats[jointNodes[j]], ibmList[j]);
        jointUniformBuf.set(tmpJ, j * 16);
      }
    }

    // ---------------------------------------------------------------------
    // 6. WebGL Drawing Functions
    // ---------------------------------------------------------------------
    const projMat = Mat4.create();
    const viewMat = Mat4.create();
    const vpMat = Mat4.create();
    const modelMat = Mat4.create();
    const tmpQModel = new Float32Array(4);

    let camYaw = 0;
    let camPitch = 0.34;
    let targetCamYaw = 0;
    let targetCamPitch = 0.34;
    let pointerNormX = 0;
    let pointerNormY = 0;

    function bindAttr(loc, vbo, size) {
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }

    function drawSolidMesh(mesh, mMat, camPos, colorTop, colorRim, isShadow) {
      gl.useProgram(solidProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(solidProg, 'uProj'), false, projMat);
      gl.uniformMatrix4fv(gl.getUniformLocation(solidProg, 'uView'), false, viewMat);
      gl.uniformMatrix4fv(gl.getUniformLocation(solidProg, 'uModel'), false, mMat);
      gl.uniform3fv(gl.getUniformLocation(solidProg, 'uCamPos'), camPos);
      gl.uniform3fv(gl.getUniformLocation(solidProg, 'uColorTop'), colorTop);
      gl.uniform3fv(gl.getUniformLocation(solidProg, 'uColorRim'), colorRim);
      gl.uniform1f(gl.getUniformLocation(solidProg, 'uIsShadow'), isShadow ? 1.0 : 0.0);

      bindAttr(gl.getAttribLocation(solidProg, 'aPos'), mesh.posVBO, 3);
      bindAttr(gl.getAttribLocation(solidProg, 'aNorm'), mesh.normVBO, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    function drawCatGL(k, elapsed, camPos) {
      evaluateSkeleton(k, elapsed);

      const curX = k.wx + k.animX;
      const curY = k.wy + k.animY + k.hopY;
      const curZ = k.wz + k.animZ;
      const curYaw = k.baseYaw + k.animYaw;

      // Ground contact shadow right under kitten
      gl.depthMask(false);
      const shScale = Math.max(0.55, 1.0 - k.hopY * 3.5);
      Mat4.fromTRS(
        modelMat,
        [curX, 0.002, curZ],
        [0, 0, 0, 1],
        [0.18 * k.scale * shScale * (1 + k.chubby * 0.25), 1, 0.26 * k.scale * shScale]
      );
      drawSolidMesh(shadowDiscMesh, modelMat, camPos, [0,0,0], [0,0,0], true);
      gl.depthMask(true);

      // Cat model transform
      quatFromEuler(tmpQModel, 0, curYaw, 0);
      Mat4.fromTRS(modelMat, [curX, curY, curZ], tmpQModel, [k.scale, k.scale, k.scale]);

      // Project screen anchors for hit testing & speech bubbles!
      const headProj = Mat4.projectPoint(vpMat, curX, curY + 0.34 * k.scale, curZ + 0.14 * k.scale);
      const bodyProj = Mat4.projectPoint(vpMat, curX, curY + 0.18 * k.scale, curZ);
      k.headScreen = { x: headProj.x, y: headProj.y - 16 };
      k.hitCenter = { x: bodyProj.x, y: bodyProj.y - 10, rx: 105, ry: 105 };

      gl.useProgram(catProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(catProg, 'uProj'), false, projMat);
      gl.uniformMatrix4fv(gl.getUniformLocation(catProg, 'uView'), false, viewMat);
      gl.uniformMatrix4fv(gl.getUniformLocation(catProg, 'uModel'), false, modelMat);
      gl.uniformMatrix4fv(gl.getUniformLocation(catProg, 'uJoints'), false, jointUniformBuf);
      gl.uniform3fv(gl.getUniformLocation(catProg, 'uCamPos'), camPos);
      gl.uniform1f(gl.getUniformLocation(catProg, 'uChubby'), k.chubby);
      gl.uniform1f(gl.getUniformLocation(catProg, 'uBaby'), k.baby || 0.0);
      gl.uniform1f(gl.getUniformLocation(catProg, 'uPetGlow'), k.petLevel);

      const aPos = gl.getAttribLocation(catProg, 'aPos');
      const aNorm = gl.getAttribLocation(catProg, 'aNorm');
      const aUV = gl.getAttribLocation(catProg, 'aUV');
      const aJoints = gl.getAttribLocation(catProg, 'aJoints');
      const aWeights = gl.getAttribLocation(catProg, 'aWeights');
      const uTex = gl.getUniformLocation(catProg, 'uTex');
      const uAlphaTest = gl.getUniformLocation(catProg, 'uAlphaTest');
      const uFluffPush = gl.getUniformLocation(catProg, 'uFluffPush');

      // Draw opaque body & head first (prim 0, prim 1), then alpha-blended fur tufts (prim 2)
      [0, 1, 2].forEach((pi) => {
        const p = primitives[pi];
        const isFur = pi === 2;
        if (isFur) gl.depthMask(false);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, k.textures[p.material]);
        gl.uniform1i(uTex, 0);
        gl.uniform1f(uAlphaTest, isFur ? 0.12 : 0.5);
        gl.uniform1f(uFluffPush, isFur ? 0.015 : 0.0);

        bindAttr(aPos, p.posVBO, 3);
        bindAttr(aNorm, p.normVBO, 3);
        bindAttr(aUV, p.uvVBO, 2);
        bindAttr(aJoints, p.jntVBO, 4);
        bindAttr(aWeights, p.wgtVBO, 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.ibo);
        gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);

        if (isFur) gl.depthMask(true);
      });
    }

    // ---------------------------------------------------------------------
    // 7. Pointer / Touch Rubbing & Hover Handlers
    // ---------------------------------------------------------------------
    let isPointerDown = false;
    let lastPX = 0;
    let lastPY = 0;

    function getCanvasCoords(e) {
      const rect = glCanvas.getBoundingClientRect();
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

    glCanvas.addEventListener('pointerdown', (e) => {
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

    glCanvas.addEventListener('pointermove', (e) => {
      const pt = getCanvasCoords(e);
      pointerNormX = (pt.x / W - 0.5) * 2;
      pointerNormY = (pt.y / H - 0.5) * 2;
      targetCamYaw = pointerNormX * 0.24;
      targetCamPitch = Math.max(0.16, Math.min(0.55, 0.34 - pointerNormY * 0.10));

      const moveDist = Math.hypot(pt.x - lastPX, pt.y - lastPY);
      lastPX = pt.x;
      lastPY = pt.y;

      const hit = hitTestKitten(pt.x, pt.y);
      if (hit) {
        glCanvas.style.cursor = 'pointer';
        if (isPointerDown || (e.pointerType === 'mouse' && moveDist > 1.5)) {
          applyPetRub(hit.kitten, moveDist, pt.x, pt.y, hit.dx, hit.dy);
        }
      } else {
        glCanvas.style.cursor = isPointerDown ? 'grabbing' : 'grab';
      }
    });

    const endRub = () => { isPointerDown = false; };
    glCanvas.addEventListener('pointerup', endRub);
    glCanvas.addEventListener('pointercancel', endRub);
    glCanvas.addEventListener('pointerleave', () => {
      isPointerDown = false;
      targetCamYaw = 0;
      targetCamPitch = 0.34;
      pointerNormX = 0;
      pointerNormY = 0;
    });

    if (neoBadge) neoBadge.addEventListener('click', () => { ensureAudio(); triggerKittenMeow(neo, 'sweet'); });
    if (huskyBadge) huskyBadge.addEventListener('click', () => { ensureAudio(); triggerKittenMeow(husky, 'sweet'); });

    // ---------------------------------------------------------------------
    // 8. Smooth 120Hz Render Loop (WebGL 3D + 2D FX Overlay)
    // ---------------------------------------------------------------------
    let isInView = true;
    let rafId = null;
    let lastTime = 0;
    let elapsed = 0;
    const mainEl = document.getElementById('main');

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      glCanvas.width = W * dpr;
      glCanvas.height = H * dpr;
      fxCanvas.width = W * dpr;
      fxCanvas.height = H * dpr;
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      const camDamp = 1 - Math.exp(-8.5 * dt);
      camYaw += (targetCamYaw - camYaw) * camDamp;
      camPitch += (targetCamPitch - camPitch) * camDamp;

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
            neo.hopY = Math.abs(Math.sin(bapPhase * 6.5)) * 0.024;
            husky.hopY = Math.abs(Math.sin(bapPhase * 6.5 + 1.1)) * 0.024;

            if (pt > 0.6 && social.bapStep === 0) {
              social.bapStep = 1;
              showKittenBubble(husky, 'bap bap! 🐾', true);
              floatingParticles.push({ x: W * 0.5, y: H * 0.36, vx: 0, vy: -26, symbol: '🐾', size: 17, life: 0, maxLife: 0.9 });
            } else if (pt > 1.7 && social.bapStep === 1) {
              social.bapStep = 2;
              showKittenBubble(neo, 'mew! 💥', true);
              floatingParticles.push({ x: W * 0.52, y: H * 0.32, vx: 8, vy: -30, symbol: '✨', size: 16, life: 0, maxLife: 0.9 });
            }
          } else if (social.state === 'play_pounce') {
            const attacker = kittens[social.actorIdx];
            const defender = kittens[1 - social.actorIdx];
            const dir = social.actorIdx === 0 ? 1 : -1;
            if (pt < 1.25) {
              attacker.buttWiggle = Math.sin(pt * 22) * 3.8 * Math.min(1, pt * 2);
            } else if (pt < 2.05) {
              const pProg = (pt - 1.25) / 0.8;
              attacker.buttWiggle = 0;
              attacker.targetCrouch = 0;
              attacker.targetX = dir * 0.13;
              attacker.hopY = Math.sin(pProg * Math.PI) * 0.085;
              attacker.pawSwipeL = Math.sin(pProg * Math.PI) * 0.8;
              attacker.pawSwipeR = Math.sin(pProg * Math.PI) * 0.8;

              if (!social.pounced && pProg > 0.45) {
                social.pounced = true;
                defender.targetX = dir * 0.03;
                defender.hopY = 0.04;
                showKittenBubble(attacker, 'gotcha! ✨', true);
                showKittenBubble(defender, 'eep! 🐾', true);
              }
              if (pProg > 0.55) {
                defender.hopY = Math.sin(((pProg - 0.55) / 0.45) * Math.PI) * 0.045;
              }
            } else {
              attacker.hopY = 0;
              defender.hopY = 0;
            }
          } else if (social.state === 'cuddle_nuzzle') {
            if (Math.random() < 0.08) {
              floatingParticles.push({
                x: W * 0.5 + (Math.random() - 0.5) * 28,
                y: H * 0.34,
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

        const lookScale = social.state === 'play_fight' || social.state === 'cuddle_nuzzle' ? 0.2 : 1;
        const targetLookY = Math.max(-0.55, Math.min(0.55, pointerNormX * 0.65)) * lookScale;
        const targetLookP = Math.max(-0.35, Math.min(0.35, pointerNormY * 0.45)) * lookScale;
        const lookDamp = 1 - Math.exp(-7 * dt);
        k.lookYaw += (targetLookY - k.lookYaw) * lookDamp;
        k.lookPitch += (targetLookP - k.lookPitch) * lookDamp;

        k.petLevel *= Math.exp(-1.2 * dt);
        k.leanX *= Math.exp(-5 * dt);
        k.leanY *= Math.exp(-5 * dt);
        if (k.moodEl && k.petLevel < 0.08 && k.speechAlpha < 0.05) {
          const desiredMood = k.socialMood || k.idleMood;
          if (k.moodEl.textContent !== desiredMood) k.moodEl.textContent = desiredMood;
        }
        maxPetLevel = Math.max(maxPetLevel, k.petLevel);

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
      });

      setPurrIntensity(maxPetLevel);

      // WebGL 3D Render Pass
      const camR = 1.06;
      const eye = [
        Math.sin(camYaw) * Math.cos(camPitch) * camR,
        0.16 + Math.sin(camPitch) * camR,
        Math.cos(camYaw) * Math.cos(camPitch) * camR
      ];
      Mat4.perspective(projMat, 0.62, W / H, 0.05, 10.0);
      Mat4.lookAt(viewMat, eye, [0, 0.16, 0.02], [0, 1, 0]);
      Mat4.mul(vpMat, projMat, viewMat);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Draw 3D Velvet Cushion
      Mat4.fromTRS(modelMat, [0, 0, 0.02], [0, 0, 0, 1], [1, 1, 1]);
      drawSolidMesh(cushionMesh, modelMat, eye, [1.0, 0.93, 0.96], [0.92, 0.72, 0.80], false);

      // Draw both rigged 3D GLB kittens!
      drawCatGL(neo, elapsed, eye);
      drawCatGL(husky, elapsed, eye);

      // 2D Overlay FX Pass (speech bubbles + floating hearts/paws)
      fxCtx.clearRect(0, 0, W, H);
      kittens.forEach((k) => {
        if (k.speechAlpha > 0.02) {
          const spX = k.headScreen.x;
          const spY = Math.max(20, k.headScreen.y - k.speechY);
          fxCtx.save();
          fxCtx.globalAlpha = Math.min(1, k.speechAlpha);
          fxCtx.font = '700 14px "Gloria Hallelujah", cursive';
          const tw = fxCtx.measureText(k.speechText).width;
          const bw = tw + 20, bh = 26;
          fxCtx.fillStyle = 'rgba(255, 255, 255, 0.96)';
          fxCtx.strokeStyle = '#FFB6C1';
          fxCtx.lineWidth = 1.6;
          fxCtx.beginPath();
          if (typeof fxCtx.roundRect === 'function') {
            fxCtx.roundRect(spX - bw / 2, spY - bh / 2, bw, bh, 13);
          } else {
            fxCtx.rect(spX - bw / 2, spY - bh / 2, bw, bh);
          }
          fxCtx.fill();
          fxCtx.stroke();
          fxCtx.fillStyle = '#E60023';
          fxCtx.textAlign = 'center';
          fxCtx.textBaseline = 'middle';
          fxCtx.fillText(k.speechText, spX, spY + 1);
          fxCtx.restore();
        }
      });

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
        fxCtx.save();
        fxCtx.globalAlpha = Math.max(0, alpha);
        fxCtx.font = `${p.size}px sans-serif`;
        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        fxCtx.fillText(p.symbol, p.x, p.y);
        fxCtx.restore();
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
