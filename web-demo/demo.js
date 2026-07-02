// app/src/pose/config.ts
var DEFAULT_CONFIG = {
  minKeypointScore: 0.3,
  positionHoldMs: 1e3,
  elbowExtendedDeg: 155,
  elbowFlexedDeg: 95,
  minRepDurationMs: 700,
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
  rightWrist: 10
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
  smoothedAngle = null;
  process(pose, tMs) {
    const angle = this.meanElbowAngle(pose);
    if (angle === null) {
      return this.dropPosition();
    }
    this.smoothedAngle = this.smoothedAngle === null ? angle : this.cfg.angleSmoothing * angle + (1 - this.cfg.angleSmoothing) * this.smoothedAngle;
    const a = this.smoothedAngle;
    switch (this.state) {
      case "noPosition":
        this.state = "holding";
        this.holdStartMs = tMs;
        return [];
      case "holding":
        if (tMs - this.holdStartMs >= this.cfg.positionHoldMs) {
          this.state = "up";
          return ["positionAcquired"];
        }
        return [];
      case "up":
        if (a <= this.cfg.elbowFlexedDeg) {
          this.state = "down";
        }
        return [];
      case "down":
        if (a >= this.cfg.elbowExtendedDeg) {
          this.state = "up";
          if (tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ["repCounted"];
          }
        }
        return [];
    }
  }
  dropPosition() {
    const wasAcquired = this.state === "up" || this.state === "down";
    this.state = "noPosition";
    this.smoothedAngle = null;
    return wasAcquired ? ["positionLost"] : [];
  }
  /**
   * Средний угол в локтях по рукам, у которых плечо, локоть и запястье
   * видны (score выше порога) и запястье ниже плеча в кадре.
   * null — пользователь не в положении для отжиманий.
   */
  meanElbowAngle(pose) {
    const min = this.cfg.minKeypointScore;
    const angles = [];
    for (const arm of ARMS) {
      const s = pose[arm.shoulder];
      const e = pose[arm.elbow];
      const w = pose[arm.wrist];
      if (!s || !e || !w) {
        continue;
      }
      if (s.score < min || e.score < min || w.score < min) {
        continue;
      }
      if (w.y <= s.y) {
        continue;
      }
      angles.push(angleDeg(s, e, w));
    }
    if (angles.length === 0) {
      return null;
    }
    return angles.reduce((sum, v) => sum + v, 0) / angles.length;
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
var UPPER_BODY_POINTS = 11;
var MIN_SCORE = 0.3;
var EDGES = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder]
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
function meanElbowAngleForDebug(pose) {
  const arms = [
    { s: KP.leftShoulder, e: KP.leftElbow, w: KP.leftWrist },
    { s: KP.rightShoulder, e: KP.rightElbow, w: KP.rightWrist }
  ];
  const angles = [];
  for (const a of arms) {
    const s = pose[a.s];
    const e = pose[a.e];
    const w = pose[a.w];
    if (s.score < MIN_SCORE || e.score < MIN_SCORE || w.score < MIN_SCORE) continue;
    if (w.y <= s.y) continue;
    angles.push(angleDeg(s, e, w));
  }
  if (angles.length === 0) return null;
  return angles.reduce((sum, v) => sum + v, 0) / angles.length;
}
function draw(pose) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;
  ctx.lineWidth = Math.max(2, canvas.width * 8e-3);
  ctx.strokeStyle = "#FFFFFF";
  for (const [a, b] of EDGES) {
    if (pose[a].score < MIN_SCORE || pose[b].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.moveTo(pose[a].x, pose[a].y);
    ctx.lineTo(pose[b].x, pose[b].y);
    ctx.stroke();
  }
  ctx.fillStyle = "#F5A623";
  const r = Math.max(3, canvas.width * 0.012);
  for (let i = 0; i < UPPER_BODY_POINTS; i++) {
    if (pose[i].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.arc(pose[i].x, pose[i].y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
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
      for (let i = 0; i < UPPER_BODY_POINTS; i++) {
        pose.push({ x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0 });
      }
      const events = detectorLogic.process(pose, performance.now());
      applyEvents(events);
    }
    draw(pose);
    counterEl.textContent = String(reps);
    hintEl.style.display = inPosition ? "none" : "block";
    const angle = pose ? meanElbowAngleForDebug(pose) : null;
    debugEl.textContent = "\u0443\u0433\u043E\u043B \u043B\u043E\u043A\u0442\u044F: " + (angle == null ? "\u2014" : angle.toFixed(0) + "\xB0") + "   |   \u0432 \u043F\u043E\u0437\u0438\u0446\u0438\u0438: " + (inPosition ? "\u0434\u0430" : "\u043D\u0435\u0442") + "   |   \u043F\u043E\u0440\u043E\u0433\u0438: \u0441\u0433\u0438\u0431<" + DEFAULT_CONFIG.elbowFlexedDeg + "\xB0 \u0440\u0430\u0437\u0433\u0438\u0431>" + DEFAULT_CONFIG.elbowExtendedDeg + "\xB0";
    requestAnimationFrame(loop);
  }
  loop();
}
main().catch((err) => {
  setStatus("\u041E\u0448\u0438\u0431\u043A\u0430: " + (err?.message ?? String(err)));
  console.error(err);
});
