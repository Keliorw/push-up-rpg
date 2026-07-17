// app/src/pose/squat-config.ts
var DEFAULT_SQUAT_CONFIG = {
  minKeypointScore: 0.4,
  positionHoldMs: 400,
  gateLostGraceMs: 700,
  minRepDurationMs: 700,
  torsoUprightMinFrac: 0.5,
  gapGateMinFrac: -0.5,
  // Калибровка по видео 2026-07-17: настоящие приседания в нижней точке дают
  // зазор −0.18…0.32, шаги/переминания — ≥0.48. Порог 0.4 разделяет с запасом.
  gapDownFrac: 0.4,
  gapUpFrac: 0.65,
  gapSmoothing: 0.5,
  maxPlausibleGap: 3,
  maxKneeSplitFrac: 0.65,
  kneeAngleSmoothing: 0.4,
  descentSmoothing: 0.5,
  baselineRelaxAlpha: 0.01,
  maxPlausibleDescent: 2
};

// app/src/pose/geometry.ts
function angleDeg(a, b, c) {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const norm = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (norm === 0) {
    return 180;
  }
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / norm));
  return Math.acos(cos) * 180 / Math.PI;
}

// app/src/pose/types.ts
var KP = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
  leftKnee: 13,
  rightKnee: 14,
  leftAnkle: 15,
  rightAnkle: 16
};

// app/src/pose/SquatDetector.ts
var LEGS = [
  { hip: KP.leftHip, knee: KP.leftKnee, ankle: KP.leftAnkle },
  { hip: KP.rightHip, knee: KP.rightKnee, ankle: KP.rightAnkle }
];
var SquatDetector = class {
  constructor(cfg = DEFAULT_SQUAT_CONFIG) {
    this.cfg = cfg;
  }
  cfg;
  state = "noPosition";
  holdStartMs = 0;
  lastRepMs = Number.NEGATIVE_INFINITY;
  lastGoodMs = Number.NEGATIVE_INFINITY;
  smoothedGap = null;
  smoothedKnee = null;
  smoothedSplit = null;
  // Счётчики валидных кадров фазы «вниз»: разброс колен выше/не выше порога.
  // По большинству на выходе из «вниз» повтор либо присед, либо выпад.
  downSplitHigh = 0;
  downSplitLow = 0;
  smoothedDescent = 0;
  baselineTopY = null;
  debug = {
    inPosition: false,
    gap: null,
    torsoUprightFrac: null,
    kneeAngle: null,
    kneeSplit: null,
    hipDescent: null,
    phase: "up",
    visibleKeypoints: 0,
    bodyAspect: null
  };
  process(pose, tMs) {
    this.debug.visibleKeypoints = this.countVisible(pose);
    this.debug.bodyAspect = this.bodyAspect(pose);
    const shoulder = this.mid(pose, KP.leftShoulder, KP.rightShoulder);
    const hip = this.mid(pose, KP.leftHip, KP.rightHip);
    const knee = this.mid(pose, KP.leftKnee, KP.rightKnee);
    const torsoLen = shoulder && hip ? Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) : 0;
    const upright = shoulder && hip && torsoLen > 1e-6 ? (hip.y - shoulder.y) / torsoLen : null;
    this.debug.torsoUprightFrac = upright;
    const rawGap = hip && knee && torsoLen > 1e-6 ? (knee.y - hip.y) / torsoLen : null;
    const inGate = upright !== null && rawGap !== null && Math.abs(rawGap) <= this.cfg.maxPlausibleGap && upright >= this.cfg.torsoUprightMinFrac && rawGap >= this.cfg.gapGateMinFrac;
    if (!inGate) {
      if (this.state !== "noPosition" && tMs - this.lastGoodMs <= this.cfg.gateLostGraceMs) {
        return [];
      }
      return this.dropPosition();
    }
    this.lastGoodMs = tMs;
    const gap = this.updateGap(rawGap);
    this.debug.gap = gap;
    this.debug.kneeAngle = this.updateKnee(pose);
    const split = this.updateSplit(pose, torsoLen);
    this.debug.kneeSplit = split;
    this.debug.hipDescent = this.updateDescent(hip, torsoLen);
    switch (this.state) {
      case "noPosition":
        this.state = "holding";
        this.holdStartMs = tMs;
        this.debug.inPosition = false;
        return [];
      case "holding":
        if (tMs - this.holdStartMs >= this.cfg.positionHoldMs) {
          this.state = "up";
          this.debug.inPosition = true;
          this.debug.phase = "up";
          return ["positionAcquired"];
        }
        return [];
      case "up":
        if (gap <= this.cfg.gapDownFrac) {
          this.state = "down";
          this.debug.phase = "down";
          this.downSplitHigh = 0;
          this.downSplitLow = 0;
        }
        return [];
      case "down":
        if (split !== null) {
          if (split > this.cfg.maxKneeSplitFrac) {
            this.downSplitHigh++;
          } else {
            this.downSplitLow++;
          }
        }
        if (gap >= this.cfg.gapUpFrac) {
          this.state = "up";
          this.debug.phase = "up";
          const isLunge = this.downSplitHigh > this.downSplitLow;
          if (!isLunge && tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ["repCounted"];
          }
        }
        return [];
    }
  }
  updateGap(raw) {
    this.smoothedGap = this.smoothedGap === null ? raw : this.cfg.gapSmoothing * raw + (1 - this.cfg.gapSmoothing) * this.smoothedGap;
    return this.smoothedGap;
  }
  /** Сглаженный разброс колен по высоте; null если видно меньше двух колен. */
  updateSplit(pose, torsoLen) {
    const l = this.vis(pose, KP.leftKnee);
    const r = this.vis(pose, KP.rightKnee);
    if (!l || !r || torsoLen < 1e-6) {
      this.smoothedSplit = null;
      return null;
    }
    const raw = Math.abs(l.y - r.y) / torsoLen;
    this.smoothedSplit = this.smoothedSplit === null ? raw : this.cfg.gapSmoothing * raw + (1 - this.cfg.gapSmoothing) * this.smoothedSplit;
    return this.smoothedSplit;
  }
  /** Сглаженный средний угол колена по ногам с видимой лодыжкой. */
  updateKnee(pose) {
    const angles = [];
    for (const leg of LEGS) {
      const h = this.vis(pose, leg.hip);
      const k = this.vis(pose, leg.knee);
      const a = this.vis(pose, leg.ankle);
      if (h && k && a) {
        angles.push(angleDeg(h, k, a));
      }
    }
    if (angles.length === 0) {
      this.smoothedKnee = null;
      return null;
    }
    const raw = angles.reduce((sum, v) => sum + v, 0) / angles.length;
    this.smoothedKnee = this.smoothedKnee === null ? raw : this.cfg.kneeAngleSmoothing * raw + (1 - this.cfg.kneeAngleSmoothing) * this.smoothedKnee;
    return this.smoothedKnee;
  }
  /** Просадка таза от «верхней» базовой линии, в долях торса (вторичный). */
  updateDescent(hip, torsoLen) {
    if (torsoLen < 1e-6) {
      return null;
    }
    const y = hip.y;
    if (this.baselineTopY === null || y < this.baselineTopY) {
      this.baselineTopY = y;
    } else {
      this.baselineTopY += (y - this.baselineTopY) * this.cfg.baselineRelaxAlpha;
    }
    const raw = Math.max(0, (y - this.baselineTopY) / torsoLen);
    if (raw > this.cfg.maxPlausibleDescent) {
      return null;
    }
    this.smoothedDescent = this.cfg.descentSmoothing * raw + (1 - this.cfg.descentSmoothing) * this.smoothedDescent;
    return this.smoothedDescent;
  }
  bodyAspect(pose) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let n = 0;
    for (let i = 0; i < pose.length; i++) {
      const p = pose[i];
      if (!p || p.score < this.cfg.minKeypointScore) {
        continue;
      }
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      n++;
    }
    if (n < 4) {
      return null;
    }
    const w = maxX - minX;
    if (w < 1e-6) {
      return null;
    }
    return (maxY - minY) / w;
  }
  countVisible(pose) {
    let n = 0;
    for (let i = 0; i < pose.length; i++) {
      if (pose[i] && pose[i].score >= this.cfg.minKeypointScore) {
        n++;
      }
    }
    return n;
  }
  dropPosition() {
    const wasAcquired = this.state === "up" || this.state === "down";
    this.state = "noPosition";
    this.smoothedGap = null;
    this.smoothedKnee = null;
    this.smoothedSplit = null;
    this.smoothedDescent = 0;
    this.baselineTopY = null;
    this.debug.inPosition = false;
    this.debug.phase = "up";
    this.debug.gap = null;
    this.debug.kneeAngle = null;
    this.debug.kneeSplit = null;
    this.debug.hipDescent = null;
    return wasAcquired ? ["positionLost"] : [];
  }
  vis(pose, idx) {
    const p = pose[idx];
    if (!p || p.score < this.cfg.minKeypointScore) {
      return null;
    }
    return p;
  }
  /** Среднее видимых точек из списка; null если ни одной. */
  mid(pose, ...idxs) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const i of idxs) {
      const p = this.vis(pose, i);
      if (p) {
        sx += p.x;
        sy += p.y;
        n++;
      }
    }
    return n === 0 ? null : { x: sx / n, y: sy / n };
  }
};

// web-demo/src/squat-demo.ts
var video = document.getElementById("video");
var stage = document.getElementById("stage");
var canvas = document.getElementById("overlay");
var ctx = canvas.getContext("2d");
var counterEl = document.getElementById("counter");
var hintEl = document.getElementById("hint");
var debugEl = document.getElementById("debug");
var statusEl = document.getElementById("status");
var btnCamera = document.getElementById("btn-camera");
var btnFile = document.getElementById("btn-file");
var fileInput = document.getElementById("file-input");
var btnReset = document.getElementById("btn-reset");
var btnLog = document.getElementById("btn-log");
var KEYPOINT_COUNT = 17;
var MIN_SCORE = 0.3;
var EDGES = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder],
  [KP.leftShoulder, KP.leftHip],
  [KP.rightShoulder, KP.rightHip],
  [KP.leftHip, KP.rightHip],
  [KP.leftHip, KP.leftKnee],
  [KP.leftKnee, KP.leftAnkle],
  [KP.rightHip, KP.rightKnee],
  [KP.rightKnee, KP.rightAnkle]
];
var detectorLogic = new SquatDetector(DEFAULT_SQUAT_CONFIG);
var reps = 0;
var inPosition = false;
var mode = null;
var stream = null;
function setStatus(text) {
  statusEl.textContent = text;
}
var audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
  }
}
function applyEvents(events) {
  for (const e of events) {
    if (e === "repCounted") {
      reps += 1;
      beep();
    } else if (e === "positionAcquired") {
      inPosition = true;
    } else if (e === "positionLost") {
      inPosition = false;
    }
  }
}
function draw(pose) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;
  ctx.lineWidth = Math.max(2, canvas.width * 8e-3);
  ctx.strokeStyle = "#FFFFFF";
  for (const [a, b] of EDGES) {
    if (!pose[a] || !pose[b]) continue;
    if (pose[a].score < MIN_SCORE || pose[b].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.moveTo(pose[a].x, pose[a].y);
    ctx.lineTo(pose[b].x, pose[b].y);
    ctx.stroke();
  }
  ctx.fillStyle = "#F5A623";
  const r = Math.max(3, canvas.width * 0.012);
  for (let i = 0; i < KEYPOINT_COUNT; i++) {
    if (!pose[i] || pose[i].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.arc(pose[i].x, pose[i].y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
function fmt(n, digits = 0, suffix = "") {
  return n == null ? "\u2014" : n.toFixed(digits) + suffix;
}
var ranges = {
  gap: { min: Infinity, max: -Infinity },
  knee: { min: Infinity, max: -Infinity },
  split: { min: Infinity, max: -Infinity },
  descent: { min: Infinity, max: -Infinity },
  upright: { min: Infinity, max: -Infinity }
};
function track(key, v) {
  if (v == null) return;
  ranges[key].min = Math.min(ranges[key].min, v);
  ranges[key].max = Math.max(ranges[key].max, v);
}
function rangeStr(r, digits) {
  if (r.min === Infinity) return "\u2014";
  return r.min.toFixed(digits) + "\u2026" + r.max.toFixed(digits);
}
var MAX_LOG = 5e4;
var signalLog = [];
function resetAll() {
  detectorLogic = new SquatDetector(DEFAULT_SQUAT_CONFIG);
  reps = 0;
  inPosition = false;
  signalLog = [];
  for (const k of Object.keys(ranges)) {
    ranges[k].min = Infinity;
    ranges[k].max = -Infinity;
  }
}
btnReset.onclick = resetAll;
window.__squat = {
  get log() {
    return signalLog;
  },
  get ranges() {
    return ranges;
  },
  get reps() {
    return reps;
  },
  resetAll
};
btnLog.onclick = () => {
  const blob = new Blob(
    [JSON.stringify({ config: DEFAULT_SQUAT_CONFIG, samples: signalLog })],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "squat-signals.json";
  a.click();
  URL.revokeObjectURL(a.href);
};
function stopStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}
btnCamera.onclick = async () => {
  try {
    setStatus("\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u043A\u0430\u043C\u0435\u0440\u0443\u2026");
    stopStream();
    video.removeAttribute("src");
    video.controls = false;
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false
    });
    video.srcObject = stream;
    stage.classList.add("mirrored");
    await video.play();
    mode = "camera";
    resetAll();
    setStatus("\u041A\u0430\u043C\u0435\u0440\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u0430 \u2014 \u0432\u0441\u0442\u0430\u043D\u044C \u0432 \u043F\u043E\u043B\u043D\u044B\u0439 \u0440\u043E\u0441\u0442");
  } catch (err) {
    setStatus("\u041E\u0448\u0438\u0431\u043A\u0430 \u043A\u0430\u043C\u0435\u0440\u044B: " + (err?.message ?? String(err)));
  }
};
btnFile.onclick = () => fileInput.click();
fileInput.onchange = () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  stopStream();
  video.srcObject = null;
  video.src = URL.createObjectURL(file);
  video.controls = true;
  stage.classList.remove("mirrored");
  mode = "file";
  resetAll();
  video.play().catch(() => {
  });
  setStatus(`\u0412\u0438\u0434\u0435\u043E: ${file.name} (\u043F\u0435\u0440\u0435\u043C\u043E\u0442\u043A\u0430 \u0438 \u043F\u0430\u0443\u0437\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442)`);
};
video.addEventListener("play", () => {
  if (mode === "file" && video.currentTime < 0.05) resetAll();
});
async function main() {
  setStatus("\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u044E \u043C\u043E\u0434\u0435\u043B\u044C MoveNet\u2026");
  await tf.setBackend("webgl");
  await tf.ready();
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );
  setStatus("\u041C\u043E\u0434\u0435\u043B\u044C \u0433\u043E\u0442\u043E\u0432\u0430. \u0412\u044B\u0431\u0435\u0440\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A: \u043A\u0430\u043C\u0435\u0440\u0430 \u0438\u043B\u0438 \u0432\u0438\u0434\u0435\u043E\u0444\u0430\u0439\u043B.");
  let lastLoggedT = -1;
  async function loop() {
    if (mode === null || video.readyState < 2 || video.videoWidth === 0) {
      requestAnimationFrame(loop);
      return;
    }
    const tMs = mode === "file" ? video.currentTime * 1e3 : performance.now();
    const poses = await detector.estimatePoses(video, { flipHorizontal: false });
    let pose = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({ x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0 });
      }
      applyEvents(detectorLogic.process(pose, tMs));
    }
    draw(pose);
    counterEl.textContent = String(reps);
    hintEl.style.display = inPosition ? "none" : "block";
    const dbg = detectorLogic.debug;
    track("gap", dbg.gap);
    track("knee", dbg.kneeAngle);
    track("split", dbg.kneeSplit);
    track("descent", dbg.hipDescent);
    track("upright", dbg.torsoUprightFrac);
    if (pose && tMs !== lastLoggedT && signalLog.length < MAX_LOG) {
      lastLoggedT = tMs;
      signalLog.push({
        t: Math.round(tMs),
        gap: dbg.gap,
        upright: dbg.torsoUprightFrac,
        knee: dbg.kneeAngle,
        split: dbg.kneeSplit,
        descent: dbg.hipDescent,
        phase: dbg.phase,
        inPosition: dbg.inPosition,
        reps
      });
    }
    const cfg = DEFAULT_SQUAT_CONFIG;
    const posColor = dbg.inPosition ? "#5ad469" : "#ff6b6b";
    debugEl.innerHTML = '<div>\u0432 \u043F\u043E\u0437\u0438\u0446\u0438\u0438: <b style="color:' + posColor + '">' + (dbg.inPosition ? "\u0414\u0410" : "\u041D\u0415\u0422") + "</b> &nbsp; \u0444\u0430\u0437\u0430: <b>" + dbg.phase + "</b> &nbsp; \u0442\u043E\u0447\u0435\u043A: <b>" + dbg.visibleKeypoints + "/17</b> &nbsp; \u0444\u043E\u0440\u043C\u0430\u0442 \u0442\u0435\u043B\u0430: <b>" + fmt(dbg.bodyAspect, 1) + "</b></div><div>\u0437\u0430\u0437\u043E\u0440 \u0442\u0430\u0437\u2194\u043A\u043E\u043B\u0435\u043D\u0438: <b>" + fmt(dbg.gap, 2) + "</b> &nbsp; \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: <b>" + rangeStr(ranges.gap, 2) + "</b> &nbsp; (\u0432\u043D\u0438\u0437&le;" + cfg.gapDownFrac + " \u0432\u0432\u0435\u0440\u0445&ge;" + cfg.gapUpFrac + ")</div><div>\u0432\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0442\u043E\u0440\u0441\u0430: <b>" + fmt(dbg.torsoUprightFrac, 2) + "</b> &nbsp; \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: <b>" + rangeStr(ranges.upright, 2) + "</b> &nbsp; (\u0433\u0435\u0439\u0442&ge;" + cfg.torsoUprightMinFrac + ")</div><div>\u0440\u0430\u0437\u0431\u0440\u043E\u0441 \u043A\u043E\u043B\u0435\u043D: <b>" + fmt(dbg.kneeSplit, 2) + "</b> &nbsp; \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: <b>" + rangeStr(ranges.split, 2) + "</b> &nbsp; (\u0432\u044B\u043F\u0430\u0434&gt;" + cfg.maxKneeSplitFrac + " \u2014 \u043D\u0435 \u043F\u0440\u0438\u0441\u0435\u0434)</div><div>\u0443\u0433\u043E\u043B \u043A\u043E\u043B\u0435\u043D\u0430: <b>" + fmt(dbg.kneeAngle, 0, "\xB0") + "</b> &nbsp; \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: <b>" + rangeStr(ranges.knee, 0) + "\xB0</b> &nbsp; \u043F\u0440\u043E\u0441\u0430\u0434\u043A\u0430 \u0442\u0430\u0437\u0430: <b>" + fmt(dbg.hipDescent, 2) + "</b> &nbsp; \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: <b>" + rangeStr(ranges.descent, 2) + '</b></div><div style="opacity:.6;font-size:.7em">\u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432: ' + reps + " \xB7 \u043B\u043E\u0433: " + signalLog.length + " \u043A\u0430\u0434\u0440\u043E\u0432</div>";
    requestAnimationFrame(loop);
  }
  loop();
}
main().catch((err) => {
  setStatus("\u041E\u0448\u0438\u0431\u043A\u0430: " + (err?.message ?? String(err)));
  console.error(err);
});
