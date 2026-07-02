// app/src/game/monsters.ts
function minion(id, name, cardImage, repsPerSet) {
  return { id, name, kind: "minion", cardImage, sets: 1, repsPerSet, restBetweenSetsSec: 0 };
}
function boss(id, name, cardImage, repsPerSet) {
  return { id, name, kind: "boss", cardImage, sets: 3, repsPerSet, restBetweenSetsSec: 0 };
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
  }
];
var MONSTER_SEQUENCE = LOCATIONS.flatMap((l) => l.monsters);
var NODE_POSITIONS = [
  { x: 0.21, y: 0.93 },
  // 1
  { x: 0.57, y: 0.79 },
  // 2
  { x: 0.42, y: 0.71 },
  // 3
  { x: 0.57, y: 0.63 },
  // 4
  { x: 0.42, y: 0.55 },
  // 5
  { x: 0.58, y: 0.47 },
  // 6
  { x: 0.48, y: 0.39 },
  // 7
  { x: 0.57, y: 0.31 },
  // 8
  { x: 0.4, y: 0.24 },
  // 9
  { x: 0.53, y: 0.16 }
  // 10
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
    if (typeof p.defeatedCount === "number") return p;
  } catch {
  }
  return INITIAL_PROGRESSION;
}
function saveProgression(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}
function resetProgression() {
  localStorage.removeItem(KEY);
}

// app/src/game/dailyLock.ts
function isLockedToday(p, today) {
  return p.lastWorkoutDate === today;
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
  const locked = isLockedToday(app2.progression, todayISO());
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
      if (!locked) {
        el.addEventListener("click", () => app2.goCard());
      }
    } else {
      el.classList.add("locked");
    }
    wrap.appendChild(el);
  }
}

// app/src/game/workout.ts
function totalTarget(m) {
  return m.sets * m.repsPerSet;
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
  const locked = isLockedToday(app2.progression, todayISO());
  if (locked) {
    startBtn.style.display = "none";
    hint.textContent = "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u2014 \u043F\u0440\u0438\u0445\u043E\u0434\u0438 \u0437\u0430\u0432\u0442\u0440\u0430.";
  } else {
    startBtn.style.display = "";
    hint.textContent = "";
  }
}

// web-game/src/workout-screen.ts
function startWorkout(_app) {
}

// web-game/src/main.ts
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
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
  }
};
document.getElementById("start-btn").addEventListener("click", () => {
  app.render();
  show("screen-map");
});
document.getElementById("victory-btn").addEventListener("click", () => {
  app.render();
  show("screen-map");
});
document.getElementById("card-back-btn").addEventListener("click", () => {
  app.render();
  show("screen-map");
});
document.getElementById("card-start-btn").addEventListener("click", () => app.goWorkout());
document.getElementById("dev-reset-day").addEventListener("click", () => {
  app.progression = { ...app.progression, lastWorkoutDate: null };
  saveProgression(app.progression);
  app.render();
});
document.getElementById("dev-reset-progress").addEventListener("click", () => {
  resetProgression();
  app.progression = INITIAL_PROGRESSION;
  app.render();
});
document.getElementById("dev-prev").addEventListener("click", () => {
  app.progression = {
    ...app.progression,
    defeatedCount: Math.max(0, app.progression.defeatedCount - 1)
  };
  saveProgression(app.progression);
  app.render();
});
document.getElementById("dev-next").addEventListener("click", () => {
  app.progression = {
    ...app.progression,
    defeatedCount: Math.min(MONSTER_SEQUENCE.length, app.progression.defeatedCount + 1)
  };
  saveProgression(app.progression);
  app.render();
});
