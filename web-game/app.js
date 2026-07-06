// app/src/game/monsters.ts
function minion(id, name, cardImage, repsPerSet) {
  return { id, name, kind: "minion", cardImage, sets: 1, repsPerSet, restBetweenSetsSec: 0 };
}
function boss(id, name, cardImage, repsPerSet, restBetweenSetsSec = 0) {
  return { id, name, kind: "boss", cardImage, sets: 3, repsPerSet, restBetweenSetsSec };
}
var LOCATIONS = [
  {
    index: 1,
    name: "Plague Sewers & Slums",
    locked: false,
    monsters: [
      minion("loc1-m1", "\u0427\u0443\u043C\u043D\u043E\u0439 \u043A\u0430\u0431\u0430\u043D", "1/kaban.png", 6),
      minion("loc1-m2", "\u0427\u0443\u043C\u043D\u043E\u0439 \u043B\u0435\u0442\u0443\u043D", "1/mish.png", 7),
      minion("loc1-m3", "\u0413\u0440\u043E\u0431\u043E\u0432\u043E\u0439 \u0447\u0435\u0440\u0432\u044C", "1/chervy.png", 8),
      boss("loc1-boss", "\u041A\u043E\u0440\u043E\u043B\u0435\u0432\u0441\u043A\u0430\u044F \u041A\u0440\u044B\u0441\u0430-\u041F\u0435\u0440\u0435\u0440\u043E\u0441\u0442\u043E\u043A", "1/boss.png", 8)
    ]
  },
  {
    index: 2,
    name: "Wild Goblin War-Camp",
    locked: false,
    monsters: [
      minion("loc2-m1", "\u0413\u043E\u0431\u043B\u0438\u043D \u0441 \u0449\u0438\u0442\u043E\u043C", "2/goblin-shit.png", 8),
      minion("loc2-m2", "\u0413\u043E\u0431\u043B\u0438\u043D-\u043F\u043E\u0434\u0436\u0438\u0433\u0430\u0442\u0435\u043B\u044C", "2/goblin-fire.png", 9),
      minion("loc2-m3", "\u0413\u043E\u0431\u043B\u0438\u043D-\u0448\u0430\u043C\u0430\u043D", "2/goblin-shaman.png", 10),
      boss("loc2-boss", "\u0412\u043E\u0436\u0434\u044C \u0414\u0438\u043A\u0438\u0445 \u0413\u043E\u0431\u043B\u0438\u043D\u043E\u0432", "2/boss.png", 9)
    ]
  },
  {
    index: 3,
    name: "Cursed Undead Crypt",
    locked: false,
    monsters: [
      minion("loc3-m1", "\u041F\u0440\u043E\u043A\u043B\u044F\u0442\u044B\u0439 \u0421\u043A\u0435\u043B\u0435\u0442-\u0420\u044B\u0446\u0430\u0440\u044C", "3/proklyt-skelet-rizar.png", 9),
      minion("loc3-m2", "\u0421\u043A\u0435\u043B\u0435\u0442-\u043B\u0443\u0447\u043D\u0438\u043A", "3/skelet-luchnik.png", 10),
      minion("loc3-m3", "\u041D\u0435\u043A\u0440\u043E\u043C\u0430\u043D\u0442-\u0443\u0447\u0435\u043D\u0438\u043A", "3/nekromant-ychenik.png", 11),
      boss("loc3-boss", "\u041A\u043E\u0441\u0442\u044F\u043D\u043E\u0439 \u0441\u0442\u0440\u0430\u0436", "3/boss.png", 10)
    ]
  },
  {
    index: 4,
    name: "Fetid Fog-Choked Swamp",
    locked: false,
    monsters: [
      minion("loc4-m1", "\u041E\u0434\u0435\u0440\u0436\u0438\u043C\u044B\u0439 \u0442\u0440\u0443\u043F", "4/oderdjimiy-tryp.png", 10),
      minion("loc4-m2", "\u0418\u043B\u043B\u044E\u0437\u043E\u0440\u043D\u044B\u0439 \u043F\u0440\u0438\u0437\u0440\u0430\u043A", "4/ilyzonrniy-prizrak.png", 11),
      minion("loc4-m3", "\u0413\u043D\u0438\u043B\u043E\u0441\u0442\u043D\u0430\u044F \u043F\u0438\u044F\u0432\u043A\u0430", "4/gnilostnay-piyvka.png", 12),
      boss("loc4-boss", "\u0411\u043E\u043B\u043E\u0442\u043D\u044B\u0439 \u0423\u0436\u0430\u0441", "4/boss.png", 12)
    ]
  },
  {
    index: 5,
    name: "Windswept Harpy Cliffs",
    locked: false,
    monsters: [
      minion("loc5-m1", "\u041E\u0434\u043E\u043C\u0430\u0448\u043D\u0435\u043D\u043D\u044B\u0439 \u0433\u0440\u0438\u0444\u043E\u043D", "5/odomashneniy-grifon.png", 11),
      minion("loc5-m2", "\u041F\u0438\u043A\u0438\u0440\u0443\u044E\u0449\u0430\u044F \u0433\u0430\u0440\u043F\u0438\u044F", "5/pikirushay-garpiy.png", 12),
      minion("loc5-m3", "\u0413\u0430\u0440\u043F\u0438\u044F-\u0441\u0438\u0440\u0435\u043D\u0430", "5/garpiy-sirena.png", 13),
      boss("loc5-boss", "\u041A\u043E\u0440\u043E\u043B\u0435\u0432\u0430 \u0413\u0430\u0440\u043F\u0438\u0439", "5/boss.png", 13)
    ]
  },
  {
    index: 6,
    name: "Colossal Stone Minotaur Labyrinth",
    locked: false,
    monsters: [
      minion("loc6-m1", "\u0411\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043A\u0430\u043C\u0435\u043D\u043E\u0442\u0435\u0441", "6/bronirovaniy-kamenotas.png", 12),
      minion("loc6-m2", "\u0414\u0438\u043A\u0438\u0439 \u043B\u0430\u0431\u0438\u0440\u0438\u043D\u0442\u043D\u044B\u0439 \u0432\u043E\u043B\u043A", "6/diki-labirintny-volk.png", 13),
      minion("loc6-m3", "\u041F\u043E\u0433\u043E\u043D\u0449\u0438\u043A \u0433\u043E\u0431\u043B\u0438\u043D\u043E\u0432", "6/pogonshik-goblinov.png", 14),
      boss("loc6-boss", "\u0420\u0430\u0437\u044A\u044F\u0440\u0435\u043D\u043D\u044B\u0439 \u041C\u0438\u043D\u043E\u0442\u0430\u0432\u0440-\u041B\u043E\u0440\u0434", "6/boss.png", 14)
    ]
  },
  {
    index: 7,
    name: "Iron Mechanical Fortress",
    locked: false,
    monsters: [
      minion("loc7-m1", "\u041A\u0430\u043C\u0435\u043D\u043D\u0430\u044F \u0433\u043E\u0440\u0433\u0443\u043B\u044C\u044F", "7/kamennay-gorguliy.png", 13),
      minion("loc7-m2", "\u0417\u0430\u0432\u043E\u0434\u043D\u043E\u0439 \u043F\u0430\u0443\u043A", "7/zavodnoy-pauk.png", 14),
      minion("loc7-m3", "\u041C\u0430\u0433\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0441\u0444\u0435\u0440\u0430", "7/magicheskay-sfera.png", 15),
      boss("loc7-boss", "\u0416\u0435\u043B\u0435\u0437\u043D\u044B\u0439 \u0413\u043E\u043B\u0435\u043C-\u0420\u0430\u0437\u0440\u0443\u0448\u0438\u0442\u0435\u043B\u044C", "7/boss.png", 15)
    ]
  },
  {
    index: 8,
    name: "Blazing Volcanic Lava Fields",
    locked: false,
    monsters: [
      minion("loc8-m1", "\u041C\u0430\u0433\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0441\u043B\u0430\u0439\u043C", "8/magmaticheskiy-slaym.png", 14),
      minion("loc8-m2", "\u041E\u0433\u043D\u0435\u043D\u043D\u0430\u044F \u0441\u0430\u043B\u0430\u043C\u0430\u043D\u0434\u0440\u0430", "8/ognenay-salamandra.png", 15),
      minion("loc8-m3", "\u0418\u0441\u043A\u0440\u0430 \u0436\u0438\u0437\u043D\u0438", "8/iskra-zhizni.png", 16),
      // Босс 8: отдых между подходами строго 3 минуты (180с) — по ТЗ.
      boss("loc8-boss", "\u041F\u043E\u0432\u0435\u043B\u0438\u0442\u0435\u043B\u044C \u041F\u043B\u0430\u043C\u0435\u043D\u0438", "8/boss.png", 16, 180)
    ]
  },
  {
    index: 9,
    name: "Hellish Infernal Chasm",
    locked: false,
    monsters: [
      minion("loc9-m1", "\u0410\u0434\u0441\u043A\u0430\u044F \u0433\u043E\u043D\u0447\u0430\u044F", "9/adskay-gonchay.png", 15),
      minion("loc9-m2", "\u0411\u0435\u0441-\u043C\u0443\u0447\u0438\u0442\u0435\u043B\u044C", "9/bas-muchitel.png", 16),
      minion("loc9-m3", "\u0421\u0443\u043A\u043A\u0443\u0431", "9/sukub.png", 17),
      boss("loc9-boss", "\u0426\u0435\u0440\u0431\u0435\u0440, \u0421\u0442\u0440\u0430\u0436 \u041F\u0440\u0435\u0438\u0441\u043F\u043E\u0434\u043D\u0435\u0439", "9/boss.png", 18)
    ]
  },
  {
    index: 10,
    name: "Finale: Blackened Death Mountain",
    locked: false,
    monsters: [
      minion("loc10-m1", "\u0414\u0440\u0430\u043A\u043E\u043D\u0438\u0434-\u0433\u0432\u0430\u0440\u0434\u0435\u0435\u0446", "10/drakonid-gvardeic.png", 16),
      minion("loc10-m2", "\u0412\u044B\u043B\u0443\u043F\u0438\u0432\u0448\u0438\u0439\u0441\u044F \u0434\u0440\u0430\u043A\u043E\u043D\u0447\u0438\u043A", "10/vylupvshijsya-drakonchik.png", 17),
      minion("loc10-m3", "\u041A\u0443\u043B\u044C\u0442\u0438\u0441\u0442 \u0414\u0440\u0430\u043A\u043E\u043D\u0430", "10/kul'tist-drakon.png", 18),
      boss("loc10-boss", "\u0414\u0440\u0435\u0432\u043D\u0438\u0439 \u0414\u0440\u0430\u043A\u043E\u043D \u0421\u043C\u0435\u0440\u0442\u0438", "10/drevniy-drakon-smerty.png", 20)
    ]
  }
];
var MONSTER_SEQUENCE = LOCATIONS.flatMap((l) => l.monsters);
var NODE_POSITIONS = [
  { x: 0.5, y: 0.915 },
  // 1  Plague Sewers (низ, центр)
  { x: 0.58, y: 0.805 },
  // 2  Goblin War-Camp
  { x: 0.42, y: 0.725 },
  // 3  Undead Crypt
  { x: 0.57, y: 0.645 },
  // 4  Fetid Swamp
  { x: 0.41, y: 0.56 },
  // 5  Harpy Cliffs
  { x: 0.57, y: 0.485 },
  // 6  Minotaur Labyrinth
  { x: 0.46, y: 0.405 },
  // 7  Iron Fortress
  { x: 0.57, y: 0.325 },
  // 8  Volcanic Lava
  { x: 0.4, y: 0.25 },
  // 9  Hellish Chasm
  { x: 0.53, y: 0.185 }
  // 10 Finale
];

// app/src/game/progression.ts
var INITIAL_PROGRESSION = {
  defeatedCount: 0,
  lastWorkoutDate: null
};
function currentMonster(p) {
  return MONSTER_SEQUENCE[p.defeatedCount] ?? null;
}
function defeatMonster(p, today) {
  return { defeatedCount: p.defeatedCount + 1, lastWorkoutDate: today };
}

// web-game/src/dates.ts
function todayISO() {
  const d = /* @__PURE__ */ new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// web-game/src/storage.ts
var KEY = "pushuprpg.progression";
function loadProgression() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL_PROGRESSION;
    const p = JSON.parse(raw);
    const defeatedCount = Number.isFinite(p.defeatedCount) ? Math.max(0, Math.min(MONSTER_SEQUENCE.length, Math.floor(p.defeatedCount))) : INITIAL_PROGRESSION.defeatedCount;
    const lastWorkoutDate = p.lastWorkoutDate === null || typeof p.lastWorkoutDate === "string" ? p.lastWorkoutDate : null;
    return { defeatedCount, lastWorkoutDate };
  } catch {
  }
  return INITIAL_PROGRESSION;
}
function saveProgression(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}
var XP_KEY = "pushuprpg.totalReps";
function loadTotalReps() {
  const raw = localStorage.getItem(XP_KEY);
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
function saveTotalReps(n) {
  localStorage.setItem(XP_KEY, String(Math.max(0, Math.floor(n))));
}
var BEST_ARENA_KEY = "pushuprpg.bestArena";
function loadBestArena() {
  const raw = localStorage.getItem(BEST_ARENA_KEY);
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
function saveBestArena(n) {
  localStorage.setItem(BEST_ARENA_KEY, String(Math.max(0, Math.floor(n))));
}

// web-game/src/map.ts
function currentLocationIndex(app3) {
  const m = currentMonster(app3.progression);
  if (!m) return null;
  const match = /^loc(\d+)-/.exec(m.id);
  return match ? Number(match[1]) : null;
}
function renderMap(app3) {
  const wrap = document.getElementById("map-wrap");
  wrap.querySelectorAll(".node").forEach((n) => n.remove());
  const curLoc = currentLocationIndex(app3);
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const locIndex = i + 1;
    const pos = NODE_POSITIONS[i];
    const el2 = document.createElement("div");
    el2.className = "node";
    el2.style.left = `${pos.x * 100}%`;
    el2.style.top = `${pos.y * 100}%`;
    el2.textContent = String(locIndex);
    const hasContent = locIndex <= LOCATIONS.length;
    if (curLoc === null) {
      el2.classList.add(hasContent ? "done" : "locked");
    } else if (locIndex < curLoc) {
      el2.classList.add("done");
    } else if (locIndex === curLoc && hasContent) {
      el2.classList.add("current");
      el2.addEventListener("click", () => app3.goCard());
    } else {
      el2.classList.add("locked");
    }
    wrap.appendChild(el2);
  }
}

// app/src/game/workout.ts
function newWorkout(_m) {
  return { setIndex: 0, repsInSet: 0, totalReps: 0, done: false };
}
function totalTarget(m) {
  return m.sets * m.repsPerSet;
}
function onRep(state, m) {
  if (state.done) {
    return { state, event: "repCounted" };
  }
  const repsInSet = state.repsInSet + 1;
  const totalReps = state.totalReps + 1;
  if (repsInSet >= m.repsPerSet) {
    const isLastSet = state.setIndex + 1 >= m.sets;
    if (isLastSet) {
      return {
        state: { setIndex: state.setIndex, repsInSet, totalReps, done: true },
        event: "monsterDefeated"
      };
    }
    return {
      state: { setIndex: state.setIndex + 1, repsInSet: 0, totalReps, done: false },
      event: "setComplete"
    };
  }
  return { state: { ...state, repsInSet, totalReps }, event: "repCounted" };
}

// web-game/src/card.ts
function renderCard(app3) {
  const m = currentMonster(app3.progression);
  const img = document.getElementById("card-img");
  const target = document.getElementById("card-target");
  const hp = document.getElementById("card-hp");
  const startBtn = document.getElementById("card-start-btn");
  const hint = document.getElementById("hint");
  if (!m) {
    target.textContent = "\u0412\u0441\u0435 \u0432\u0440\u0430\u0433\u0438 \u043F\u043E\u0432\u0435\u0440\u0436\u0435\u043D\u044B!";
    startBtn.style.display = "none";
    hint.textContent = "";
    img.removeAttribute("src");
    return;
  }
  img.src = `./games/${m.cardImage}`;
  hp.style.width = "100%";
  target.textContent = m.kind === "boss" ? `\u0411\u041E\u0421\u0421: ${m.sets} \u043F\u043E\u0434\u0445\u043E\u0434\u0430 \xD7 ${m.repsPerSet} (\u0432\u0441\u0435\u0433\u043E ${totalTarget(m)})` : `\u041F\u043E\u0431\u0435\u0434\u0438: ${m.repsPerSet} \u043E\u0442\u0436\u0438\u043C\u0430\u043D\u0438\u0439`;
  startBtn.style.display = "";
  hint.textContent = "";
}

// app/src/pose/config.ts
var DEFAULT_CONFIG = {
  minKeypointScore: 0.4,
  positionHoldMs: 400,
  gateLostGraceMs: 700,
  minRepDurationMs: 700,
  plankBodyMinAngleDeg: 140,
  maxBodyAspect: 2.5,
  legsBehindMinFrac: -3,
  legsBehindMaxFrac: 3,
  plankElbowBendMaxDeg: 150,
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
    bodyAspect: null,
    legsBehindFrac: null,
    legsBehind: false
  };
  process(pose, tMs) {
    this.debug.visibleKeypoints = this.countVisible(pose);
    this.debug.bodyAspect = this.bodyAspect(pose);
    const gate = this.evaluateGate(pose);
    this.debug.gateMode = gate.mode;
    this.debug.torsoAngle = gate.torsoAngle;
    this.debug.legsBehindFrac = gate.legsBehindFrac;
    this.debug.legsBehind = gate.legsBehind;
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
  // В планке (видно тело+ноги) счёт ведётся по проседанию корпуса — это
  // отсекает «на коленях просто сгибаю руки» (торс не опускается → нет
  // проседания → не считается). Если руки видны, «вниз» дополнительно требует
  // согнутого локтя: при вставании из упора проседание пересекает порог, но
  // руки остаются прямыми (~175°) — реальный повтор сгибает локоть до 119–137°.
  // Угол локтя как ЕДИНСТВЕННЫЙ сигнал используется лишь в запасном режиме,
  // когда ног в кадре нет и проседание вычислить нельзя.
  isDown(mode2, elbow, descent) {
    if (mode2 === "plank") {
      const descended = descent !== null && descent >= this.cfg.descentDownFrac;
      const elbowOk = elbow === null || elbow <= this.cfg.plankElbowBendMaxDeg;
      return descended && elbowOk;
    }
    return elbow !== null && elbow <= this.cfg.elbowFlexedDeg;
  }
  isUp(mode2, elbow, descent) {
    if (mode2 === "plank") {
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
      const torsoLen = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
      const legsBehindFrac = torsoLen > 1e-6 ? (shoulder.y - knee.y) / torsoLen : null;
      const legsBehind = legsBehindFrac !== null && legsBehindFrac >= this.cfg.legsBehindMinFrac && legsBehindFrac <= this.cfg.legsBehindMaxFrac;
      const straight = torsoAngle >= this.cfg.plankBodyMinAngleDeg;
      const horizontal = aspect !== null && aspect <= this.cfg.maxBodyAspect;
      return {
        inPosition: straight && horizontal && legsBehind,
        mode: "plank",
        torsoAngle,
        legsBehindFrac,
        legsBehind
      };
    }
    if (shoulder) {
      for (const arm of ARMS) {
        const s = this.vis(pose, arm.shoulder);
        const e = this.vis(pose, arm.elbow);
        const w = this.vis(pose, arm.wrist);
        if (s && e && w && w.y > s.y) {
          return {
            inPosition: true,
            mode: "fallback",
            torsoAngle: null,
            legsBehindFrac: null,
            legsBehind: false
          };
        }
      }
    }
    return {
      inPosition: false,
      mode: "none",
      torsoAngle: null,
      legsBehindFrac: null,
      legsBehind: false
    };
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

// web-game/src/battle-camera.ts
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
async function startBattleCamera(video, canvas, detector, onRep3, onStatus) {
  const ctx = canvas.getContext("2d");
  const repDetector = new RepDetector(DEFAULT_CONFIG);
  let paused = false;
  let stopped = false;
  onStatus("\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u043A\u0430\u043C\u0435\u0440\u0443\u2026");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
  onStatus("\u0417\u0430\u0439\u043C\u0438 \u0443\u043F\u043E\u0440 \u043B\u0451\u0436\u0430");
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
  async function loop() {
    if (stopped) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const poses = await detector.estimatePoses(video, { flipHorizontal: false });
    let pose = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({ x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0 });
      }
      if (!paused) {
        const events = repDetector.process(pose, performance.now());
        for (const e of events) {
          if (e === "repCounted") onRep3();
        }
      }
    }
    draw(pose);
    requestAnimationFrame(loop);
  }
  loop();
  return {
    stop() {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
    },
    setPaused(p) {
      paused = p;
    }
  };
}

// web-game/src/workout-screen.ts
function startWorkout(app3, detector) {
  const found = currentMonster(app3.progression);
  if (!found) return;
  const monster = found;
  const video = document.getElementById("wk-video");
  const canvas = document.getElementById("wk-overlay");
  const counterEl = document.getElementById("wk-counter");
  const setEl = document.getElementById("wk-set");
  const hpEl = document.getElementById("wk-hp");
  const restEl = document.getElementById("wk-rest");
  const statusEl = document.getElementById("wk-status");
  const backBtn = document.getElementById("wk-back");
  const monsterImg = document.getElementById("wk-monster");
  const monsterName = document.getElementById("wk-monster-name");
  const hpTextEl = document.getElementById("wk-hp-text");
  const timeEl = document.getElementById("wk-time");
  monsterImg.src = `./games/${monster.cardImage}`;
  monsterName.textContent = monster.name;
  const maxHp = totalTarget(monster);
  const hitSound = new Audio("./games/hit.mp3");
  hitSound.volume = 0.6;
  let wk = newWorkout(monster);
  let camera = null;
  let aborted = false;
  const startMs = performance.now();
  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1e3);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const timerId = window.setInterval(() => {
    timeEl.textContent = fmtTime(performance.now() - startMs);
  }, 250);
  const stopTimer = () => window.clearInterval(timerId);
  backBtn.onclick = () => {
    aborted = true;
    stopTimer();
    if (camera) camera.stop();
    app3.persistProfile();
    app3.render();
    app3.show("screen-map");
  };
  const updateHud = () => {
    counterEl.textContent = String(wk.repsInSet);
    setEl.textContent = monster.sets > 1 ? `\u0421\u0435\u0442 ${wk.setIndex + 1}/${monster.sets} \xB7 \u0446\u0435\u043B\u044C ${monster.repsPerSet}` : `\u0426\u0435\u043B\u044C ${monster.repsPerSet}`;
    const hp = Math.max(0, maxHp - wk.totalReps);
    hpEl.style.width = `${hp / maxHp * 100}%`;
    hpTextEl.textContent = `${hp} / ${maxHp} HP`;
  };
  updateHud();
  function startRest() {
    let left = monster.restBetweenSetsSec;
    if (left <= 0) {
      if (camera) camera.setPaused(false);
      return;
    }
    if (camera) camera.setPaused(true);
    restEl.style.display = "flex";
    restEl.textContent = `\u041E\u0442\u0434\u044B\u0445: ${left} \u0441 (\u043D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C)`;
    restEl.onclick = () => {
      restEl.style.display = "none";
      if (camera) camera.setPaused(false);
    };
    const tick = () => {
      if (restEl.style.display === "none") return;
      if (left <= 0) {
        restEl.style.display = "none";
        if (camera) camera.setPaused(false);
        return;
      }
      restEl.textContent = `\u041E\u0442\u0434\u044B\u0445: ${left} \u0441 (\u043D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C)`;
      left -= 1;
      setTimeout(tick, 1e3);
    };
    tick();
  }
  function handleRep() {
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {
      });
    } catch {
    }
    const res = onRep(wk, monster);
    wk = res.state;
    app3.addRep();
    updateHud();
    if (res.event === "monsterDefeated") {
      stopTimer();
      if (camera) camera.stop();
      app3.onDefeated();
    } else if (res.event === "setComplete") {
      startRest();
    }
  }
  startBattleCamera(video, canvas, detector, handleRep, (text) => {
    statusEl.textContent = text;
  }).then(
    (cam) => {
      camera = cam;
      if (aborted) cam.stop();
    },
    (err) => {
      statusEl.textContent = "\u041E\u0448\u0438\u0431\u043A\u0430: " + (err?.message ?? String(err));
      console.error(err);
    }
  );
}

// web-game/src/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// web-game/src/firebase.ts
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
var firebaseConfig = {
  apiKey: "AIzaSyD7-mxTSyGKJ-qDMB543r8I7XTyAdTAMjU",
  authDomain: "push-ups-rpg.firebaseapp.com",
  projectId: "push-ups-rpg",
  storageBucket: "push-ups-rpg.firebasestorage.app",
  messagingSenderId: "212910431084",
  appId: "1:212910431084:web:3a025b103755c097417149"
};
var app = initializeApp(firebaseConfig);
var auth = getAuth(app);
var db = getFirestore(app);

// web-game/src/nickname.ts
var NICK_RE = /^[a-z0-9_-]{3,20}$/;
var EMAIL_DOMAIN = "pushuprpg.app";
function normalizeNick(raw) {
  return raw.trim().toLowerCase();
}
function validateNick(raw) {
  if (!NICK_RE.test(normalizeNick(raw))) {
    return "\u041B\u043E\u0433\u0438\u043D: 3\u201320 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u0442\u043E\u043B\u044C\u043A\u043E \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0430, \u0446\u0438\u0444\u0440\u044B, _ \u0438 -";
  }
  return null;
}
function nickToEmail(raw) {
  return `${normalizeNick(raw)}@${EMAIL_DOMAIN}`;
}

// web-game/src/auth.ts
var PASSWORD_MIN = 6;
setPersistence(auth, browserLocalPersistence).catch(() => {
});
async function register(rawNick, password) {
  const nickErr = validateNick(rawNick);
  if (nickErr) throw new Error(nickErr);
  if (password.length < PASSWORD_MIN) throw new Error("\u041F\u0430\u0440\u043E\u043B\u044C: \u043C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
  try {
    const cred = await createUserWithEmailAndPassword(auth, nickToEmail(rawNick), password);
    await updateProfile(cred.user, { displayName: rawNick.trim() });
  } catch (e) {
    throw new Error(authErrorText(e));
  }
}
async function login(rawNick, password) {
  try {
    await signInWithEmailAndPassword(auth, nickToEmail(rawNick), password);
  } catch (e) {
    throw new Error(authErrorText(e));
  }
}
function logout() {
  return signOut(auth);
}
function onUser(cb) {
  onAuthStateChanged(auth, (u) => {
    if (!u) {
      cb(null);
      return;
    }
    const nickname = u.displayName || (u.email ? u.email.split("@")[0] : "");
    cb({ uid: u.uid, nickname });
  });
}
function authErrorText(e) {
  const code = e?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "\u041B\u043E\u0433\u0438\u043D \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C";
    case "auth/weak-password":
      return "\u041F\u0430\u0440\u043E\u043B\u044C: \u043C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432";
    case "auth/network-request-failed":
      return "\u041D\u0435\u0442 \u0441\u0435\u0442\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435";
    default:
      return "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0445\u043E\u0434\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437";
  }
}

// web-game/src/remote-storage.ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
async function loadRemote(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    progression: {
      defeatedCount: typeof d.defeatedCount === "number" ? d.defeatedCount : 0,
      lastWorkoutDate: typeof d.lastWorkoutDate === "string" ? d.lastWorkoutDate : null
    },
    totalReps: typeof d.totalReps === "number" ? d.totalReps : 0,
    bestArena: typeof d.bestArena === "number" ? d.bestArena : 0
  };
}
async function saveRemote(uid, profile, nickname) {
  await setDoc(
    doc(db, "users", uid),
    {
      nickname,
      defeatedCount: profile.progression.defeatedCount,
      lastWorkoutDate: profile.progression.lastWorkoutDate,
      totalReps: profile.totalReps,
      bestArena: profile.bestArena,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
async function loadLeaderboard(max) {
  const q = query(collection(db, "users"), orderBy("defeatedCount", "desc"), limit(max));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    rows.push({
      uid: docSnap.id,
      nickname: typeof d.nickname === "string" && d.nickname ? d.nickname : "\u2014",
      defeatedCount: typeof d.defeatedCount === "number" ? d.defeatedCount : 0,
      totalReps: typeof d.totalReps === "number" ? d.totalReps : 0
    });
  });
  return rows;
}
async function loadArenaLeaderboard(max) {
  const q = query(
    collection(db, "users"),
    where("bestArena", ">", 0),
    orderBy("bestArena", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    rows.push({
      uid: docSnap.id,
      nickname: typeof d.nickname === "string" && d.nickname ? d.nickname : "\u2014",
      kills: typeof d.bestArena === "number" ? d.bestArena : 0
    });
  });
  return rows;
}

// web-game/src/sync.ts
function latestDate(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}
function mergeProgress(a, b) {
  return {
    defeatedCount: Math.max(a.defeatedCount, b.defeatedCount),
    lastWorkoutDate: latestDate(a.lastWorkoutDate, b.lastWorkoutDate)
  };
}
function mergeProfile(a, b) {
  return {
    progression: mergeProgress(a.progression, b.progression),
    totalReps: Math.max(a.totalReps, b.totalReps),
    bestArena: Math.max(a.bestArena, b.bestArena)
  };
}

// web-game/src/auth-screen.ts
var mode = "login";
function el(id) {
  return document.getElementById(id);
}
function initAuthScreen() {
  const nick = el("auth-nick");
  const pass = el("auth-pass");
  const submit = el("auth-submit");
  const err = el("auth-error");
  const toggle = el("auth-toggle");
  const title = el("auth-title");
  const submitLabel = submit.querySelector("span");
  const toggleLabel = toggle.querySelector("span");
  function applyMode() {
    title.textContent = mode === "login" ? "\u0412\u0445\u043E\u0434" : "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F";
    submitLabel.textContent = mode === "login" ? "\u0412\u043E\u0439\u0442\u0438" : "\u0421\u043E\u0437\u0434\u0430\u0442\u044C";
    toggleLabel.textContent = mode === "login" ? "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F" : "\u0412\u043E\u0439\u0442\u0438";
    err.textContent = "";
  }
  toggle.addEventListener("click", () => {
    mode = mode === "login" ? "register" : "login";
    applyMode();
  });
  submit.addEventListener("click", async () => {
    err.textContent = "";
    submit.disabled = true;
    try {
      if (mode === "register") await register(nick.value, pass.value);
      else await login(nick.value, pass.value);
    } catch (e) {
      err.textContent = e.message;
    } finally {
      submit.disabled = false;
    }
  });
  applyMode();
}
function revealAuthForm() {
  el("auth-loading").style.display = "none";
  el("auth-form").style.display = "block";
}

// web-game/src/levels.ts
function locationLabel(defeatedCount) {
  const m = MONSTER_SEQUENCE[defeatedCount];
  if (!m) return { index: null, name: "\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u0430" };
  const match = /^loc(\d+)-/.exec(m.id);
  const index = match ? Number(match[1]) : null;
  const loc = index != null ? LOCATIONS.find((l) => l.index === index) : void 0;
  return { index, name: loc ? loc.name : `\u041B\u043E\u043A\u0430\u0446\u0438\u044F ${index ?? "?"}` };
}

// web-game/src/arena-screen.ts
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function xpRowHtml(row, rank, isMe) {
  const loc = locationLabel(row.defeatedCount);
  const locText = loc.index != null ? `\u041B\u043E\u043A\u0430\u0446\u0438\u044F ${loc.index} \xB7 ${esc(loc.name)}` : esc(loc.name);
  return `<div class="arena-row${isMe ? " me" : ""}"><div class="rank">${rank}</div><div class="who"><b>${esc(row.nickname)}</b><span>${locText}</span></div><div class="xp">${row.totalReps} XP</div></div>`;
}
function arenaRowHtml(row, rank, isMe) {
  return `<div class="arena-row${isMe ? " me" : ""}"><div class="rank">${rank}</div><div class="who"><b>${esc(row.nickname)}</b></div><div class="xp">${row.kills} \u{1F480}</div></div>`;
}
async function openModal(title, currentUid, load, sort, rowHtml) {
  const modal = document.getElementById("arena-modal");
  const list = document.getElementById("arena-modal-list");
  const h1 = document.querySelector("#arena-modal-panel h1");
  h1.textContent = title;
  modal.hidden = false;
  list.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026";
  try {
    const rows = await load();
    sort(rows);
    if (rows.length === 0) {
      list.innerHTML = '<div id="arena-empty">\u041F\u043E\u043A\u0430 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u0438\u0433\u0440\u0430\u043B</div>';
      return;
    }
    list.innerHTML = rows.map((r, i) => rowHtml(r, i + 1, r.uid === currentUid)).join("");
  } catch {
    list.innerHTML = '<div id="arena-empty">\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0435\u0439\u0442\u0438\u043D\u0433</div>';
  }
}
function openXpRatingModal(currentUid) {
  return openModal(
    "\u0420\u0435\u0439\u0442\u0438\u043D\u0433",
    currentUid,
    () => loadLeaderboard(50),
    (rows) => rows.sort((a, b) => b.defeatedCount - a.defeatedCount || b.totalReps - a.totalReps),
    xpRowHtml
  );
}
function openArenaRatingModal(currentUid) {
  return openModal(
    "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0430\u0440\u0435\u043D\u044B",
    currentUid,
    () => loadArenaLeaderboard(50),
    (rows) => rows.sort((a, b) => b.kills - a.kills),
    arenaRowHtml
  );
}
function closeArenaModal() {
  document.getElementById("arena-modal").hidden = true;
}

// app/src/game/arena.ts
var ARENA_CONFIG = {
  baseHp: 5,
  hpStep: 2,
  secondsPerRep: 4,
  baseTimerSec: 60,
  restSec: 30
};
function mobHp(n, cfg = ARENA_CONFIG) {
  return cfg.baseHp + cfg.hpStep * (n - 1);
}
function mobTimerSec(n, cfg = ARENA_CONFIG) {
  return Math.max(cfg.baseTimerSec, mobHp(n, cfg) * cfg.secondsPerRep);
}
function arenaMonster(n) {
  return MONSTER_SEQUENCE[(n - 1) % MONSTER_SEQUENCE.length];
}
function newRun(cfg = ARENA_CONFIG) {
  return { mobIndex: 1, hpLeft: mobHp(1, cfg), kills: 0, phase: "fighting" };
}
function onRep2(s, _cfg = ARENA_CONFIG) {
  if (s.phase !== "fighting") return { state: s, event: "noop" };
  const hpLeft = s.hpLeft - 1;
  if (hpLeft <= 0) {
    return {
      state: { ...s, hpLeft: 0, kills: s.kills + 1, phase: "resting" },
      event: "mobKilled"
    };
  }
  return { state: { ...s, hpLeft }, event: "hit" };
}
function onRestDone(s, cfg = ARENA_CONFIG) {
  if (s.phase !== "resting") return s;
  const mobIndex = s.mobIndex + 1;
  return { ...s, mobIndex, hpLeft: mobHp(mobIndex, cfg), phase: "fighting" };
}
function onTimeout(s) {
  if (s.phase !== "fighting") return s;
  return { ...s, phase: "over" };
}

// web-game/src/arena-lobby.ts
function openArenaLobby(app3) {
  const best = document.getElementById("arena-best");
  if (app3.bestArena > 0) {
    best.textContent = `\u041B\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442: ${app3.bestArena}`;
    best.style.display = "";
  } else {
    best.style.display = "none";
  }
  app3.show("screen-arena-lobby");
}
function showArenaPreview(app3) {
  const m = arenaMonster(1);
  const img = document.getElementById("card-img");
  const target = document.getElementById("card-target");
  const hp = document.getElementById("card-hp");
  const startBtn = document.getElementById("card-start-btn");
  const backBtn = document.getElementById("card-back-btn");
  const startSpan = startBtn.querySelector("span");
  const hint = document.getElementById("hint");
  img.src = `./games/${m.cardImage}`;
  hp.style.width = "100%";
  target.textContent = `\u0410\u0420\u0415\u041D\u0410 \xB7 ${m.name}: ${mobHp(1)} HP \xB7 ${mobTimerSec(1)} \u0441\u0435\u043A`;
  startSpan.textContent = "\u0412 \u0431\u043E\u0439";
  startBtn.style.display = "";
  hint.textContent = "";
  startBtn.onclick = () => app3.goArenaBattle();
  backBtn.onclick = () => openArenaLobby(app3);
  app3.show("screen-card");
}
function initArenaLobby(app3) {
  document.getElementById("arena-lobby-back").addEventListener("click", () => app3.show("screen-start"));
  document.getElementById("arena-lobby-rating").addEventListener("click", () => {
    void openArenaRatingModal(app3.currentUid());
  });
  document.getElementById("arena-lobby-start").addEventListener("click", () => showArenaPreview(app3));
  document.getElementById("arena-result-lobby").addEventListener("click", () => openArenaLobby(app3));
  document.getElementById("arena-result-again").addEventListener("click", () => showArenaPreview(app3));
}

// web-game/src/pose-model.ts
var detectorPromise = null;
function ensureDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend("webgl");
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      });
    })().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

// web-game/src/arena-battle.ts
function startArenaFlow(app3) {
  app3.show("screen-loading");
  const loadingBack = document.getElementById("loading-back");
  const loadingText = document.getElementById("loading-text");
  loadingBack.style.display = "none";
  loadingText.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u0440\u0435\u043D\u044B\u2026";
  ensureDetector().then(
    (detector) => {
      if (!document.getElementById("screen-loading").classList.contains("active")) return;
      app3.show("screen-workout");
      runArena(app3, detector);
    },
    () => {
      loadingText.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C";
      loadingBack.style.display = "inline-block";
    }
  );
}
function runArena(app3, detector) {
  const video = document.getElementById("wk-video");
  const canvas = document.getElementById("wk-overlay");
  const counterEl = document.getElementById("wk-counter");
  const setEl = document.getElementById("wk-set");
  const hpEl = document.getElementById("wk-hp");
  const restEl = document.getElementById("wk-rest");
  const statusEl = document.getElementById("wk-status");
  const backBtn = document.getElementById("wk-back");
  const monsterImg = document.getElementById("wk-monster");
  const monsterName = document.getElementById("wk-monster-name");
  const hpTextEl = document.getElementById("wk-hp-text");
  const timeEl = document.getElementById("wk-time");
  const hitSound = new Audio("./games/hit.mp3");
  hitSound.volume = 0.6;
  let state = newRun();
  let camera = null;
  let secLeft = mobTimerSec(state.mobIndex);
  let mobTimerId = 0;
  let ended = false;
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function renderMobHud() {
    const m = arenaMonster(state.mobIndex);
    monsterImg.src = `./games/${m.cardImage}`;
    monsterName.textContent = m.name;
    const maxHp = mobHp(state.mobIndex);
    hpEl.style.width = `${state.hpLeft / maxHp * 100}%`;
    hpTextEl.textContent = `${state.hpLeft} / ${maxHp} HP`;
    counterEl.textContent = String(maxHp - state.hpLeft);
    setEl.textContent = `\u0423\u0431\u0438\u0442\u043E: ${state.kills}`;
  }
  function renderTimer() {
    timeEl.textContent = fmtTime(Math.max(0, secLeft));
    timeEl.style.color = secLeft <= 10 ? "#ff6a56" : "#fff";
  }
  function startMobTimer() {
    secLeft = mobTimerSec(state.mobIndex);
    renderTimer();
    window.clearInterval(mobTimerId);
    mobTimerId = window.setInterval(() => {
      secLeft -= 1;
      renderTimer();
      if (secLeft <= 0) {
        window.clearInterval(mobTimerId);
        state = onTimeout(state);
        endRun();
      }
    }, 1e3);
  }
  function startRest() {
    if (camera) camera.setPaused(true);
    window.clearInterval(mobTimerId);
    let left = ARENA_CONFIG.restSec;
    restEl.style.display = "flex";
    const finishRest = () => {
      restEl.style.display = "none";
      state = onRestDone(state);
      renderMobHud();
      if (camera) camera.setPaused(false);
      startMobTimer();
    };
    restEl.onclick = finishRest;
    const tick = () => {
      if (restEl.style.display === "none") return;
      if (left <= 0) {
        finishRest();
        return;
      }
      restEl.textContent = `\u041E\u0442\u0434\u044B\u0445: ${left} \u0441 (\u043D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C)`;
      left -= 1;
      setTimeout(tick, 1e3);
    };
    tick();
  }
  function handleRep() {
    if (ended || state.phase !== "fighting") return;
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {
      });
    } catch {
    }
    const res = onRep2(state);
    state = res.state;
    app3.addRep();
    renderMobHud();
    if (res.event === "mobKilled") {
      startRest();
    }
  }
  function endRun() {
    if (ended) return;
    ended = true;
    window.clearInterval(mobTimerId);
    restEl.style.display = "none";
    timeEl.style.color = "#fff";
    if (camera) camera.stop();
    const kills = state.kills;
    const isRecord = kills > app3.bestArena;
    if (isRecord) {
      app3.bestArena = kills;
      saveBestArena(kills);
    }
    app3.persistProfile();
    document.getElementById("arena-result-kills").textContent = `\u0423\u0431\u0438\u0442\u043E \u043C\u043E\u0431\u043E\u0432: ${kills}`;
    document.getElementById("arena-result-record").textContent = isRecord ? "\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u043E\u0440\u0434!" : `\u0420\u0435\u043A\u043E\u0440\u0434: ${app3.bestArena}`;
    app3.show("screen-arena-result");
  }
  backBtn.onclick = () => endRun();
  renderMobHud();
  startMobTimer();
  startBattleCamera(video, canvas, detector, handleRep, (text) => {
    statusEl.textContent = text;
  }).then(
    (cam) => {
      camera = cam;
      if (ended) cam.stop();
    },
    (err) => {
      statusEl.textContent = "\u041E\u0448\u0438\u0431\u043A\u0430: " + (err?.message ?? String(err));
      console.error(err);
    }
  );
}

// web-game/src/main.ts
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
var victorySound = null;
function playVictory() {
  stopVictory();
  victorySound = new Audio("./games/victory.mp3");
  victorySound.volume = 0.8;
  victorySound.play().catch(() => {
  });
}
function stopVictory() {
  if (victorySound) {
    victorySound.pause();
    victorySound = null;
  }
}
var currentUser = null;
function showAccountChip(nickname) {
  const chip = document.getElementById("account-chip");
  const nick = document.getElementById("account-nick");
  if (nickname) {
    nick.textContent = nickname;
    chip.style.display = "flex";
  } else {
    chip.style.display = "none";
  }
}
function showSyncWarning() {
  const nick = document.getElementById("account-nick");
  if (currentUser) nick.textContent = `${currentUser.nickname} (\u043E\u0444\u0444\u043B\u0430\u0439\u043D)`;
}
var app2 = {
  progression: loadProgression(),
  totalReps: loadTotalReps(),
  bestArena: loadBestArena(),
  show,
  render() {
    renderMap(this);
  },
  goCard() {
    renderCard(this);
    const startBtn = document.getElementById("card-start-btn");
    const backBtn = document.getElementById("card-back-btn");
    const startSpan = startBtn.querySelector("span");
    startSpan.textContent = "\u041D\u0430\u0447\u0430\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443";
    startBtn.onclick = () => this.goWorkout();
    backBtn.onclick = () => {
      this.render();
      this.show("screen-map");
    };
    this.show("screen-card");
  },
  goWorkout() {
    show("screen-loading");
    const loadingBack = document.getElementById("loading-back");
    const loadingText = document.getElementById("loading-text");
    loadingBack.style.display = "none";
    loadingText.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0443\u0440\u043E\u0432\u043D\u044F\u2026";
    ensureDetector().then(
      (detector) => {
        if (!document.getElementById("screen-loading").classList.contains("active")) return;
        show("screen-workout");
        startWorkout(this, detector);
      },
      () => {
        loadingText.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C";
        loadingBack.style.display = "inline-block";
      }
    );
  },
  addRep() {
    this.totalReps += 1;
    saveTotalReps(this.totalReps);
  },
  persistProfile() {
    if (!currentUser) return;
    const profile = {
      progression: this.progression,
      totalReps: this.totalReps,
      bestArena: this.bestArena
    };
    saveRemote(currentUser.uid, profile, currentUser.nickname).catch(showSyncWarning);
  },
  currentUid() {
    return currentUser ? currentUser.uid : null;
  },
  goArenaBattle() {
    startArenaFlow(this);
  },
  onDefeated() {
    const m = currentMonster(this.progression);
    this.progression = defeatMonster(this.progression, todayISO());
    saveProgression(this.progression);
    this.persistProfile();
    document.getElementById("victory-name").textContent = m ? m.name : "";
    const next = currentMonster(this.progression);
    document.getElementById("victory-next").style.display = next ? "" : "none";
    show("screen-victory");
    playVictory();
  }
};
document.getElementById("btn-campaign").addEventListener("click", () => {
  app2.render();
  show("screen-map");
});
document.getElementById("btn-arena").addEventListener("click", () => openArenaLobby(app2));
document.getElementById("loading-back").addEventListener("click", () => show("screen-start"));
initArenaLobby(app2);
var menuVids = [
  document.getElementById("menu-bg-video"),
  document.getElementById("menu-bg-video-b")
].filter(Boolean);
if (menuVids.length === 2) {
  let active = 0;
  const advance = () => {
    const incoming = menuVids[active ^ 1];
    const outgoing = menuVids[active];
    incoming.classList.add("ready");
    void incoming.play().catch(() => {
    });
    outgoing.classList.remove("ready");
    active ^= 1;
    outgoing.pause();
    outgoing.currentTime = 0;
  };
  menuVids.forEach((v) => {
    v.loop = false;
    v.addEventListener("ended", advance);
  });
  const first = menuVids[0];
  const reveal = () => first.classList.add("ready");
  first.addEventListener("playing", reveal, { once: true });
  first.addEventListener("timeupdate", reveal, { once: true });
  const tryPlay = () => {
    void first.play().catch(() => {
    });
  };
  tryPlay();
  const kick = () => tryPlay();
  document.addEventListener("touchstart", kick, { once: true, passive: true });
  document.addEventListener("click", kick, { once: true });
}
document.getElementById("victory-next").addEventListener("click", () => {
  stopVictory();
  app2.render();
  app2.goCard();
});
document.getElementById("victory-map").addEventListener("click", () => {
  stopVictory();
  app2.render();
  show("screen-map");
});
document.getElementById("map-back").addEventListener("click", () => show("screen-start"));
document.getElementById("map-rating").addEventListener("click", () => {
  void openXpRatingModal(currentUser ? currentUser.uid : null);
});
var arenaModal = document.getElementById("arena-modal");
document.getElementById("arena-modal-close").addEventListener("click", closeArenaModal);
arenaModal.addEventListener("click", (e) => {
  if (e.target === arenaModal) closeArenaModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !arenaModal.hidden) closeArenaModal();
});
document.getElementById("btn-logout").addEventListener("click", () => {
  void logout();
});
initAuthScreen();
onUser(async (user) => {
  currentUser = user;
  if (!user) {
    showAccountChip(null);
    revealAuthForm();
    show("screen-auth");
    return;
  }
  const local = {
    progression: loadProgression(),
    totalReps: loadTotalReps(),
    bestArena: loadBestArena()
  };
  let remote = null;
  try {
    remote = await loadRemote(user.uid);
  } catch {
    showSyncWarning();
  }
  const merged = remote ? mergeProfile(local, remote) : local;
  app2.progression = merged.progression;
  app2.totalReps = merged.totalReps;
  app2.bestArena = merged.bestArena;
  saveProgression(merged.progression);
  saveTotalReps(merged.totalReps);
  saveBestArena(merged.bestArena);
  saveRemote(user.uid, merged, user.nickname).catch(showSyncWarning);
  showAccountChip(user.nickname);
  show("screen-start");
  void ensureDetector().catch(() => {
  });
});
