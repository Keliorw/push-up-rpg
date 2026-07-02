// app/src/pose/config.ts
var DEFAULT_CONFIG = {
  minKeypointScore: 0.4,
  positionHoldMs: 400,
  gateLostGraceMs: 700,
  minRepDurationMs: 700,
  plankBodyMinAngleDeg: 140,
  maxBodyAspect: 2,
  descentDownFrac: 0.14,
  descentUpFrac: 0.05,
  descentSmoothing: 0.5,
  baselineRelaxAlpha: 0.01,
  maxPlausibleDescent: 1.5,
  elbowExtendedDeg: 155,
  elbowFlexedDeg: 95,
  angleSmoothing: 0.4
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

// app/src/pose/RepDetector.ts
var ARMS = [
  { shoulder: KP.leftShoulder, elbow: KP.leftElbow, wrist: KP.leftWrist },
  { shoulder: KP.rightShoulder, elbow: KP.rightElbow, wrist: KP.rightWrist }
];
var RepDetector = class {
  constructor(cfg = DEFAULT_CONFIG) {
    this.cfg = cfg;
  }
  cfg;
  state = "noPosition";
  holdStartMs = 0;
  lastRepMs = Number.NEGATIVE_INFINITY;
  lastGoodMs = Number.NEGATIVE_INFINITY;
  smoothedElbow = null;
  smoothedDescent = 0;
  baselineTopY = null;
  debug = {
    inPosition: false,
    gateMode: "none",
    torsoAngle: null,
    elbowAngle: null,
    descent: null,
    phase: "up",
    visibleKeypoints: 0,
    bodyAspect: null
  };
  process(pose, tMs) {
    this.debug.visibleKeypoints = this.countVisible(pose);
    this.debug.bodyAspect = this.bodyAspect(pose);
    const gate = this.evaluateGate(pose);
    this.debug.gateMode = gate.mode;
    this.debug.torsoAngle = gate.torsoAngle;
    if (!gate.inPosition) {
      if (this.state !== "noPosition" && tMs - this.lastGoodMs <= this.cfg.gateLostGraceMs) {
        return [];
      }
      return this.dropPosition();
    }
    this.lastGoodMs = tMs;
    const elbow = this.updateElbow(pose);
    const descent = this.updateDescent(pose);
    this.debug.elbowAngle = elbow;
    this.debug.descent = descent;
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
        if (this.isDown(gate.mode, elbow, descent)) {
          this.state = "down";
          this.debug.phase = "down";
        }
        return [];
      case "down":
        if (this.isUp(gate.mode, elbow, descent)) {
          this.state = "up";
          this.debug.phase = "up";
          if (tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ["repCounted"];
          }
        }
        return [];
    }
  }
  // В планке (видно тело+ноги) счёт ведётся ТОЛЬКО по проседанию корпуса —
  // это отсекает «на коленях просто сгибаю руки» (торс не опускается → нет
  // проседания → не считается). Угол локтя используется лишь в запасном
  // режиме, когда ног в кадре нет и проседание вычислить нельзя.
  isDown(mode, elbow, descent) {
    if (mode === "plank") {
      return descent !== null && descent >= this.cfg.descentDownFrac;
    }
    return elbow !== null && elbow <= this.cfg.elbowFlexedDeg;
  }
  isUp(mode, elbow, descent) {
    if (mode === "plank") {
      return descent !== null && descent <= this.cfg.descentUpFrac;
    }
    return elbow !== null && elbow >= this.cfg.elbowExtendedDeg;
  }
  /**
   * Отношение высота/ширина рамки уверенных точек. Стоящий человек вытянут
   * вертикально (большое отношение); планка сплюснута. null — точек мало или
   * рамка вырождена по ширине.
   */
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
    const h = maxY - minY;
    if (w < 1e-6) {
      return null;
    }
    return h / w;
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
    this.smoothedElbow = null;
    this.smoothedDescent = 0;
    this.baselineTopY = null;
    this.debug.inPosition = false;
    this.debug.phase = "up";
    this.debug.elbowAngle = null;
    this.debug.descent = null;
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
  evaluateGate(pose) {
    const shoulder = this.mid(pose, KP.leftShoulder, KP.rightShoulder);
    const hip = this.mid(pose, KP.leftHip, KP.rightHip);
    const knee = this.mid(pose, KP.leftKnee, KP.rightKnee);
    if (shoulder && hip && knee) {
      const torsoAngle = angleDeg(shoulder, hip, knee);
      const aspect = this.bodyAspect(pose);
      const straight = torsoAngle >= this.cfg.plankBodyMinAngleDeg;
      const horizontal = aspect !== null && aspect <= this.cfg.maxBodyAspect;
      return { inPosition: straight && horizontal, mode: "plank", torsoAngle };
    }
    if (shoulder) {
      for (const arm of ARMS) {
        const s = this.vis(pose, arm.shoulder);
        const e = this.vis(pose, arm.elbow);
        const w = this.vis(pose, arm.wrist);
        if (s && e && w && w.y > s.y) {
          return { inPosition: true, mode: "fallback", torsoAngle: null };
        }
      }
    }
    return { inPosition: false, mode: "none", torsoAngle: null };
  }
  /** Сглаженный средний угол локтя по видимым рукам; null если рук нет. */
  updateElbow(pose) {
    const angles = [];
    for (const arm of ARMS) {
      const s = this.vis(pose, arm.shoulder);
      const e = this.vis(pose, arm.elbow);
      const w = this.vis(pose, arm.wrist);
      if (s && e && w) {
        angles.push(angleDeg(s, e, w));
      }
    }
    if (angles.length === 0) {
      this.smoothedElbow = null;
      return null;
    }
    const raw = angles.reduce((sum, v) => sum + v, 0) / angles.length;
    this.smoothedElbow = this.smoothedElbow === null ? raw : this.cfg.angleSmoothing * raw + (1 - this.cfg.angleSmoothing) * this.smoothedElbow;
    return this.smoothedElbow;
  }
  /**
   * Проседание корпуса: насколько плечи опустились относительно «верхней»
   * (наивысшей) позиции, нормировано на длину торса (плечо–бедро). Возвращает
   * null, если не видно плеч+бёдер. Базовая линия следует за наивысшей точкой
   * и медленно сползает, чтобы адаптироваться к сдвигам позы.
   */
  updateDescent(pose) {
    const shoulder = this.mid(pose, KP.leftShoulder, KP.rightShoulder);
    const hip = this.mid(pose, KP.leftHip, KP.rightHip);
    if (!shoulder || !hip) {
      return null;
    }
    const torsoLen = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
    if (torsoLen < 1e-6) {
      return null;
    }
    const y = shoulder.y;
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
};

// web-demo/src/demo.ts
var video = document.getElementById("video");
var canvas = document.getElementById("overlay");
var ctx = canvas.getContext("2d");
var counterEl = document.getElementById("counter");
var hintEl = document.getElementById("hint");
var debugEl = document.getElementById("debug");
var statusEl = document.getElementById("status");
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
var detectorLogic = new RepDetector(DEFAULT_CONFIG);
var reps = 0;
var inPosition = false;
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
var descentMin = Infinity;
var descentMax = -Infinity;
var elbowMin = Infinity;
var elbowMax = -Infinity;
function trackRanges(descent, elbow) {
  if (descent != null) {
    descentMin = Math.min(descentMin, descent);
    descentMax = Math.max(descentMax, descent);
  }
  if (elbow != null) {
    elbowMin = Math.min(elbowMin, elbow);
    elbowMax = Math.max(elbowMax, elbow);
  }
}
function rangeStr(min, max, digits) {
  if (min === Infinity) return "\u2014";
  return min.toFixed(digits) + "\u2026" + max.toFixed(digits);
}
document.body.addEventListener("click", () => {
  descentMin = Infinity;
  descentMax = -Infinity;
  elbowMin = Infinity;
  elbowMax = -Infinity;
  reps = 0;
});
async function main() {
  setStatus("\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u043A\u0430\u043C\u0435\u0440\u0443\u2026");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
  setStatus("\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u044E \u043C\u043E\u0434\u0435\u043B\u044C MoveNet\u2026");
  await tf.setBackend("webgl");
  await tf.ready();
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );
  setStatus("\u0413\u043E\u0442\u043E\u0432\u043E \u2014 \u0434\u0432\u0438\u0433\u0430\u0439\u0442\u0435\u0441\u044C \u043F\u0435\u0440\u0435\u0434 \u043A\u0430\u043C\u0435\u0440\u043E\u0439");
  async function loop() {
    const poses = await detector.estimatePoses(video, { flipHorizontal: false });
    let pose = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({ x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0 });
      }
      applyEvents(detectorLogic.process(pose, performance.now()));
    }
    draw(pose);
    counterEl.textContent = String(reps);
    hintEl.style.display = inPosition ? "none" : "block";
    const dbg = detectorLogic.debug;
    trackRanges(dbg.descent, dbg.elbowAngle);
    const posColor = dbg.inPosition ? "#5ad469" : "#ff6b6b";
    debugEl.innerHTML = "<div>\u0433\u0435\u0439\u0442: <b>" + dbg.gateMode + '</b> &nbsp; \u0432 \u043F\u043E\u0437\u0438\u0446\u0438\u0438: <b style="color:' + posColor + '">' + (dbg.inPosition ? "\u0414\u0410" : "\u041D\u0415\u0422") + "</b> &nbsp; \u0444\u0430\u0437\u0430: <b>" + dbg.phase + "</b> &nbsp; \u043A\u043E\u0440\u043F\u0443\u0441: <b>" + fmt(dbg.torsoAngle, 0, "\xB0") + "</b> &nbsp; \u0444\u043E\u0440\u043C\u0430\u0442 \u0442\u0435\u043B\u0430: <b>" + fmt(dbg.bodyAspect, 1) + "</b> (\u043F\u043B\u0430\u043D\u043A\u0430&lt;" + DEFAULT_CONFIG.maxBodyAspect + ") &nbsp; \u0442\u043E\u0447\u0435\u043A: <b>" + dbg.visibleKeypoints + "/17</b></div><div>\u043F\u0440\u043E\u0441\u0435\u0434\u0430\u043D\u0438\u0435: <b>" + fmt(dbg.descent, 2) + "</b> &nbsp; \u043C\u0430\u043A\u0441 \u0437\u0430 \u043F\u043E\u0434\u0445\u043E\u0434: <b>" + rangeStr(descentMin, descentMax, 2) + "</b> &nbsp; (\u043F\u043E\u0440\u043E\u0433 " + DEFAULT_CONFIG.descentDownFrac + ")</div><div>\u043B\u043E\u043A\u043E\u0442\u044C: <b>" + fmt(dbg.elbowAngle, 0, "\xB0") + "</b> &nbsp; \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: <b>" + rangeStr(elbowMin, elbowMax, 0) + "\xB0</b> &nbsp; (\u0441\u0433\u0438\u0431&lt;" + DEFAULT_CONFIG.elbowFlexedDeg + " \u0440\u0430\u0437\u0433\u0438\u0431&gt;" + DEFAULT_CONFIG.elbowExtendedDeg + ')</div><div style="opacity:.6;font-size:.7em">\u043A\u043B\u0438\u043A \u2014 \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u044B \u0438 \u0441\u0447\u0451\u0442\u0447\u0438\u043A</div>';
    requestAnimationFrame(loop);
  }
  loop();
}
main().catch((err) => {
  setStatus("\u041E\u0448\u0438\u0431\u043A\u0430: " + (err?.message ?? String(err)));
  console.error(err);
});
