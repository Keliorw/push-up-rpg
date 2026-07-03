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

// web-game/src/map.ts
function currentLocationIndex(app2) {
  const m = currentMonster(app2.progression);
  if (!m) return null;
  const match = /^loc(\d+)-/.exec(m.id);
  return match ? Number(match[1]) : null;
}
function renderMap(app2) {
  const wrap = document.getElementById("map-wrap");
  wrap.querySelectorAll(".node").forEach((n) => n.remove());
  const curLoc = currentLocationIndex(app2);
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const locIndex = i + 1;
    const pos = NODE_POSITIONS[i];
    const el = document.createElement("div");
    el.className = "node";
    el.style.left = `${pos.x * 100}%`;
    el.style.top = `${pos.y * 100}%`;
    el.textContent = String(locIndex);
    const hasContent = locIndex <= LOCATIONS.length;
    if (curLoc === null) {
      el.classList.add(hasContent ? "done" : "locked");
    } else if (locIndex < curLoc) {
      el.classList.add("done");
    } else if (locIndex === curLoc && hasContent) {
      el.classList.add("current");
      el.addEventListener("click", () => app2.goCard());
    } else {
      el.classList.add("locked");
    }
    wrap.appendChild(el);
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
function renderCard(app2) {
  const m = currentMonster(app2.progression);
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

// web-game/src/workout-screen.ts
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
function startWorkout(app2) {
  const found = currentMonster(app2.progression);
  if (!found) return;
  const monster = found;
  const video = document.getElementById("wk-video");
  const canvas = document.getElementById("wk-overlay");
  const ctx = canvas.getContext("2d");
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
  const detector = new RepDetector(DEFAULT_CONFIG);
  let wk = newWorkout(monster);
  let resting = false;
  let finished = false;
  let stream = null;
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
    finished = true;
    stopTimer();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    app2.render();
    app2.show("screen-map");
  };
  const updateHud = () => {
    counterEl.textContent = String(wk.repsInSet);
    setEl.textContent = monster.sets > 1 ? `\u0421\u0435\u0442 ${wk.setIndex + 1}/${monster.sets} \xB7 \u0446\u0435\u043B\u044C ${monster.repsPerSet}` : `\u0426\u0435\u043B\u044C ${monster.repsPerSet}`;
    const hp = Math.max(0, maxHp - wk.totalReps);
    hpEl.style.width = `${hp / maxHp * 100}%`;
    hpTextEl.textContent = `${hp} / ${maxHp} HP`;
  };
  updateHud();
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
  function handleRep() {
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {
      });
    } catch {
    }
    const res = onRep(wk, monster);
    wk = res.state;
    updateHud();
    if (res.event === "monsterDefeated") {
      finished = true;
      stopTimer();
      app2.onDefeated();
    } else if (res.event === "setComplete") {
      startRest();
    }
  }
  function startRest() {
    resting = true;
    let left = monster.restBetweenSetsSec;
    restEl.style.display = "flex";
    const tick = () => {
      if (left <= 0) {
        restEl.style.display = "none";
        resting = false;
        updateHud();
        return;
      }
      restEl.textContent = `\u041E\u0442\u0434\u044B\u0445: ${left} \u0441 (\u043D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C)`;
      left -= 1;
      setTimeout(tick, 1e3);
    };
    if (monster.restBetweenSetsSec <= 0) {
      restEl.style.display = "none";
      resting = false;
    } else {
      restEl.textContent = `\u041E\u0442\u0434\u044B\u0445: ${left} \u0441 (\u043D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C)`;
      restEl.onclick = () => {
        restEl.style.display = "none";
        resting = false;
      };
      tick();
    }
  }
  async function run() {
    statusEl.textContent = "\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u043A\u0430\u043C\u0435\u0440\u0443\u2026";
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    statusEl.textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u044E \u043C\u043E\u0434\u0435\u043B\u044C\u2026";
    await tf.setBackend("webgl");
    await tf.ready();
    const det = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    statusEl.textContent = "\u0417\u0430\u0439\u043C\u0438 \u0443\u043F\u043E\u0440 \u043B\u0451\u0436\u0430";
    async function loop() {
      if (finished) {
        video.srcObject.getTracks().forEach((t) => t.stop());
        return;
      }
      const poses = await det.estimatePoses(video, { flipHorizontal: false });
      let pose = null;
      if (poses && poses[0]) {
        const kps = poses[0].keypoints;
        pose = [];
        for (let i = 0; i < KEYPOINT_COUNT; i++) {
          pose.push({ x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0 });
        }
        if (!resting) {
          const events = detector.process(pose, performance.now());
          for (const e of events) {
            if (e === "repCounted") handleRep();
          }
        }
      }
      draw(pose);
      requestAnimationFrame(loop);
    }
    loop();
  }
  run().catch((err) => {
    statusEl.textContent = "\u041E\u0448\u0438\u0431\u043A\u0430: " + (err?.message ?? String(err));
    console.error(err);
  });
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
var app = {
  progression: loadProgression(),
  show,
  render() {
    renderMap(this);
  },
  goCard() {
    renderCard(this);
    show("screen-card");
  },
  goWorkout() {
    show("screen-workout");
    startWorkout(this);
  },
  onDefeated() {
    const m = currentMonster(this.progression);
    this.progression = defeatMonster(this.progression, todayISO());
    saveProgression(this.progression);
    document.getElementById("victory-name").textContent = m ? m.name : "";
    show("screen-victory");
    playVictory();
  }
};
document.getElementById("btn-campaign").addEventListener("click", () => {
  app.render();
  show("screen-map");
});
var menuVideo = document.getElementById("menu-bg-video");
if (menuVideo) {
  const showVideo = () => {
    menuVideo.classList.add("ready");
    void menuVideo.play().catch(() => {
    });
  };
  if (menuVideo.readyState >= 3) {
    showVideo();
  } else {
    menuVideo.addEventListener("canplaythrough", showVideo, { once: true });
  }
}
document.getElementById("victory-btn").addEventListener("click", () => {
  stopVictory();
  app.render();
  show("screen-map");
});
document.getElementById("card-back-btn").addEventListener("click", () => {
  app.render();
  show("screen-map");
});
document.getElementById("card-start-btn").addEventListener("click", () => app.goWorkout());
