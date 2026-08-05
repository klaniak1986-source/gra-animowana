"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const message = document.getElementById("message");
const tooltip = document.getElementById("tooltip");

const ASSETS = {
  background: "assets/locations/rynek/rynek-przed-rewitalizacja.png",
  player: {
    idle: [
      "assets/characters/jarek/idle/idle-01.png",
      "assets/characters/jarek/idle/idle-02.png",
      "assets/characters/jarek/idle/idle-03.png",
      "assets/characters/jarek/idle/idle-04.png",
      "assets/characters/jarek/idle/idle-05.png",
      "assets/characters/jarek/idle/idle-06.png",
    ],
    left: Array.from({ length: 6 }, (_, i) => `assets/characters/jarek/walk-left/walk-left-${String(i + 1).padStart(2, "0")}.png`),
    right: Array.from({ length: 6 }, (_, i) => `assets/characters/jarek/walk-right/walk-right-${String(i + 1).padStart(2, "0")}.png`),
    front: Array.from({ length: 6 }, (_, i) => `assets/characters/jarek/walk-front/walk-front-${String(i + 1).padStart(2, "0")}.png`),
    back: Array.from({ length: 6 }, (_, i) => `assets/characters/jarek/walk-back/walk-back-${String(i + 1).padStart(2, "0")}.png`),
    pickup: Array.from({ length: 6 }, (_, i) => `assets/characters/jarek/pickup/pickup-${String(i + 1).padStart(2, "0")}.png`),
  },
};

const images = new Map();

function loadImage(path) {
  if (images.has(path)) return images.get(path);
  const record = { image: new Image(), ready: false, failed: false };
  record.image.onload = () => { record.ready = true; };
  record.image.onerror = () => { record.failed = true; };
  record.image.src = path;
  images.set(path, record);
  return record;
}

loadImage(ASSETS.background);
Object.values(ASSETS.player).flat().forEach(loadImage);

const state = {
  player: {
    x: 640,
    y: 555,
    targetX: 640,
    targetY: 555,
    speed: 220,
    direction: "idle",
    frame: 0,
    frameClock: 0,
    action: null,
  },
  inventory: new Set(["plakat"]),
  completed: new Set(),
  hovered: null,
  lastTime: performance.now(),
};

const walkArea = { left: 105, right: 1175, top: 430, bottom: 640 };

const hotspots = [
  { id: "tablica", label: "Tablica ogłoszeń", x: 820, y: 338, w: 105, h: 180 },
  { id: "klej", label: "Klej budowlany", x: 1040, y: 520, w: 80, h: 70 },
  { id: "lawka", label: "Ławka", x: 135, y: 440, w: 225, h: 105 },
  { id: "fontanna", label: "Fontanna", x: 470, y: 425, w: 245, h: 120 },
  { id: "golebie", label: "Gołębie", x: 710, y: 515, w: 155, h: 70 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hotspotAt(x, y) {
  return hotspots.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) || null;
}

function startAction(name) {
  state.player.action = name;
  state.player.frame = 0;
  state.player.frameClock = 0;
}

function interact(id) {
  switch (id) {
    case "klej":
      if (!state.inventory.has("klej")) {
        state.inventory.add("klej");
        startAction("pickup");
        message.textContent = "Jarek zdobył klej budowlany. Co może pójść nie tak?";
      } else {
        message.textContent = "Klej już jest w ekwipunku.";
      }
      break;
    case "tablica":
      if (state.completed.has("plakat-na-tablicy")) {
        message.textContent = "Plakat trzyma się aż podejrzanie dobrze.";
      } else if (state.inventory.has("plakat") && state.inventory.has("klej")) {
        state.completed.add("plakat-na-tablicy");
        state.inventory.delete("plakat");
        message.textContent = "Plakat przyklejony. Jarek próbuje go poprawić… ze ściany odpada tynk!";
      } else {
        message.textContent = "Potrzebny jest plakat i coś naprawdę mocnego do przyklejenia.";
      }
      break;
    case "lawka":
      message.textContent = "Jarek: Mieści trzy osoby. Albo jednego mieszkańca z zakupami.";
      break;
    case "fontanna":
      message.textContent = "Jarek: Na razie bez wody. Za to bardzo oszczędna.";
      break;
    case "golebie":
      message.textContent = "Jarek: Lokalna komisja kontroli jakości pieczywa.";
      break;
  }
}

canvas.addEventListener("mousemove", (event) => {
  const p = canvasPoint(event);
  state.hovered = hotspotAt(p.x, p.y);
  if (state.hovered) {
    tooltip.hidden = false;
    tooltip.textContent = state.hovered.label;
    tooltip.style.left = `${event.clientX - canvas.getBoundingClientRect().left}px`;
    tooltip.style.top = `${event.clientY - canvas.getBoundingClientRect().top}px`;
    canvas.style.cursor = "pointer";
  } else {
    tooltip.hidden = true;
    canvas.style.cursor = "crosshair";
  }
});

canvas.addEventListener("mouseleave", () => {
  tooltip.hidden = true;
  state.hovered = null;
});

canvas.addEventListener("click", (event) => {
  const p = canvasPoint(event);
  const hot = hotspotAt(p.x, p.y);
  if (hot) {
    interact(hot.id);
    return;
  }
  state.player.action = null;
  state.player.targetX = clamp(p.x, walkArea.left, walkArea.right);
  state.player.targetY = clamp(p.y, walkArea.top, walkArea.bottom);
});

function updateAnimation(dt, moving) {
  const p = state.player;
  p.frameClock += dt;
  const frameTime = p.action ? 0.12 : moving ? 0.11 : 0.45;

  if (p.frameClock < frameTime) return;
  p.frameClock = 0;
  p.frame += 1;

  if (p.action) {
    const frames = ASSETS.player[p.action] || [];
    if (p.frame >= frames.length) {
      p.action = null;
      p.frame = 0;
    }
  }
}

function update(dt) {
  const p = state.player;
  if (p.action) {
    updateAnimation(dt, false);
    return;
  }

  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const distance = Math.hypot(dx, dy);
  const moving = distance > 2;

  if (moving) {
    const step = Math.min(distance, p.speed * dt);
    p.x += (dx / distance) * step;
    p.y += (dy / distance) * step;

    if (Math.abs(dx) > Math.abs(dy)) p.direction = dx < 0 ? "left" : "right";
    else p.direction = dy < 0 ? "back" : "front";
  } else {
    p.direction = "idle";
  }

  updateAnimation(dt, moving);
}

function drawFallbackBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#6e7880");
  sky.addColorStop(0.58, "#bda98d");
  sky.addColorStop(1, "#7b6652");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6a4b38";
  ctx.fillRect(0, 250, canvas.width, 225);
  ctx.fillStyle = "#8a7867";
  ctx.fillRect(0, 460, canvas.width, 260);
}

function drawBackground() {
  const record = images.get(ASSETS.background);
  if (record?.ready) {
    ctx.drawImage(record.image, 0, 0, canvas.width, canvas.height);
  } else {
    drawFallbackBackground();
  }
}

function drawProps() {
  ctx.fillStyle = "#4f3623";
  ctx.fillRect(820, 338, 105, 180);
  ctx.fillStyle = "#d8c08f";
  ctx.fillRect(833, 350, 79, 115);
  if (state.completed.has("plakat-na-tablicy")) {
    ctx.fillStyle = "#e37322";
    ctx.fillRect(842, 360, 61, 92);
    ctx.fillStyle = "#fff1ce";
    ctx.font = "bold 13px Georgia";
    ctx.fillText("ŚWIĘTO", 846, 390);
    ctx.fillText("SMAKU", 850, 410);
  }
}

function currentPlayerFrame() {
  const p = state.player;
  const animation = p.action || p.direction;
  const frames = ASSETS.player[animation] || ASSETS.player.idle;
  return frames[p.frame % frames.length];
}

function drawFallbackPlayer(scale) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = "#2e4f75";
  ctx.fillRect(-22, -78, 17, 75);
  ctx.fillRect(5, -78, 17, 75);
  ctx.fillStyle = "#d96d1f";
  ctx.fillRect(-32, -145, 64, 72);
  ctx.fillStyle = "#d7a57e";
  ctx.beginPath();
  ctx.arc(0, -170, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;
  const scale = 0.72 + ((p.y - walkArea.top) / (walkArea.bottom - walkArea.top)) * 0.32;
  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(0, 7, 35 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const framePath = currentPlayerFrame();
  const record = images.get(framePath);
  if (record?.ready) {
    const targetHeight = 205 * scale;
    const ratio = record.image.width / record.image.height;
    const targetWidth = targetHeight * ratio;
    ctx.drawImage(record.image, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);
  } else {
    drawFallbackPlayer(scale);
  }
  ctx.restore();
}

function drawDebugHotspots() {
  if (!state.hovered) return;
  ctx.save();
  ctx.strokeStyle = "#ffb04a";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(state.hovered.x, state.hovered.y, state.hovered.w, state.hovered.h);
  ctx.restore();
}

function render() {
  drawBackground();
  drawProps();
  drawPlayer();
  drawDebugHotspots();
}

function frame(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
