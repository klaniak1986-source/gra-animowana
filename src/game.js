"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const message = document.getElementById("message");
const tooltip = document.getElementById("tooltip");

const state = {
  player: { x: 640, y: 555, targetX: 640, targetY: 555, speed: 220 },
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

function interact(id) {
  switch (id) {
    case "klej":
      if (!state.inventory.has("klej")) {
        state.inventory.add("klej");
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
  state.player.targetX = clamp(p.x, walkArea.left, walkArea.right);
  state.player.targetY = clamp(p.y, walkArea.top, walkArea.bottom);
});

function update(dt) {
  const p = state.player;
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 2) {
    const step = Math.min(distance, p.speed * dt);
    p.x += (dx / distance) * step;
    p.y += (dy / distance) * step;
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#6e7880");
  sky.addColorStop(0.58, "#bda98d");
  sky.addColorStop(1, "#7b6652");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#6a4b38";
  ctx.fillRect(0, 250, canvas.width, 225);
  for (let i = 0; i < 9; i += 1) {
    const x = i * 155 - 30;
    ctx.fillStyle = i % 2 ? "#92725a" : "#735544";
    ctx.fillRect(x, 205 + (i % 3) * 18, 170, 270);
    ctx.fillStyle = "#2d2724";
    for (let wy = 245; wy < 410; wy += 55) {
      for (let wx = x + 20; wx < x + 145; wx += 48) ctx.fillRect(wx, wy, 25, 34);
    }
  }

  ctx.fillStyle = "#8a7867";
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.lineTo(canvas.width, 420);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(60,48,42,.35)";
  ctx.lineWidth = 2;
  for (let y = 470; y < 720; y += 35) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y - 30); ctx.stroke();
  }
  for (let x = 0; x < canvas.width; x += 75) {
    ctx.beginPath(); ctx.moveTo(x, 460); ctx.lineTo(x + 60, 720); ctx.stroke();
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

  ctx.fillStyle = "#9a8f63";
  ctx.fillRect(1040, 540, 65, 42);
  ctx.fillStyle = "#39362e";
  ctx.fillRect(1052, 528, 40, 15);

  ctx.fillStyle = "#4d3321";
  ctx.fillRect(145, 485, 205, 20);
  ctx.fillRect(165, 445, 165, 18);
  ctx.fillRect(168, 505, 14, 55);
  ctx.fillRect(312, 505, 14, 55);

  ctx.fillStyle = "#62584f";
  ctx.beginPath();
  ctx.ellipse(590, 505, 120, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3c4547";
  ctx.beginPath();
  ctx.ellipse(590, 495, 87, 23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#343638";
  for (const [x, y] of [[735,535],[770,550],[810,528]]) {
    ctx.beginPath(); ctx.ellipse(x, y, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPlayer() {
  const p = state.player;
  const scale = 0.72 + ((p.y - walkArea.top) / (walkArea.bottom - walkArea.top)) * 0.32;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(0, 7, 35, 10, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#2e4f75";
  ctx.fillRect(-22, -78, 17, 75);
  ctx.fillRect(5, -78, 17, 75);
  ctx.fillStyle = "#47301f";
  ctx.fillRect(-27, -8, 25, 12);
  ctx.fillRect(2, -8, 25, 12);

  ctx.fillStyle = "#d96d1f";
  ctx.fillRect(-32, -145, 64, 72);
  ctx.fillStyle = "#d7a57e";
  ctx.fillRect(-42, -140, 11, 58);
  ctx.fillRect(31, -140, 11, 58);

  ctx.fillStyle = "#d7a57e";
  ctx.beginPath(); ctx.arc(0, -170, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#59483e";
  ctx.beginPath(); ctx.arc(0, -178, 31, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(-23, -158, 46, 9);
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
