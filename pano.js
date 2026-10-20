function panoKey() {
  return HaftalikAuth.storageKey("haftalik.pano.v1");
}
function planKey() {
  return HaftalikAuth.storageKey("haftalik.v1");
}

const COLORS = ["amber", "rose", "mint", "lilac", "peach", "sky"];
const PINS = ["red", "purple", "green", "blue", "gold"];
const PAPERS = ["sticky", "lined", "photo"];
const THEMES = ["bordo", "lacivert", "beyaz", "koyu"];
const THEME_BAR = { bordo: "#4a1d2a", lacivert: "#12243d", beyaz: "#ece7e2", koyu: "#0c0e12" };

let cork;
let notesNode;
let emptyNode;
let form;
let countNode;
let notes = [];
let lastColor = "amber";
let drag = null;

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeColor(color) {
  return COLORS.includes(color) ? color : "amber";
}

function pinOf(id) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n += id.charCodeAt(i);
  return PINS[n % PINS.length];
}

function tiltOf(id) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n + id.charCodeAt(i) * (i + 1)) % 97;
  return (((n % 7) - 3) * 2.1).toFixed(2);
}

function noteWidth(item) {
  if (item.paper === "photo") return 168;
  const len = `${item.title} ${item.note || ""}`.trim().length;
  if (len < 18) return 138;
  if (len < 40) return 168;
  return 196;
}

function byId(id) {
  return notes.find((note) => note.id === id);
}

function nextSpot() {
  const n = notes.length;
  return {
    x: 7 + (n % 4) * 18 + (n % 2) * 4,
    y: 12 + (n % 3) * 22,
    z: (notes.reduce((max, note) => Math.max(max, note.z || 0), 0) || 0) + 1,
  };
}

function readPlan() {
  try {
    return JSON.parse(localStorage.getItem(planKey()) || "null");
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : "bordo";
  document.body.dataset.theme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_BAR[next];
  document.querySelectorAll(".theme-dot").forEach((button) => {
    const on = button.dataset.theme === next;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const plan = readPlan();
  if (plan && typeof plan === "object") {
    plan.theme = next;
    localStorage.setItem(planKey(), JSON.stringify(plan));
  }
}

function hydrate(item) {
  const paper = PAPERS.includes(item?.paper) ? item.paper : "sticky";
  const title = String(item?.title || "").replace(/[\r\n]+/g, " ").trim().slice(0, 180);
  const image = paper === "photo" && String(item?.image || "").startsWith("data:image/") ? item.image : "";
  if (!title && !image) return null;
  return {
    id: String(item.id || uid()),
    title,
    note: String(item.note || "").trim().slice(0, 800),
    color: safeColor(item.color),
    paper,
    image,
    pin: PINS.includes(item.pin) ? item.pin : pinOf(String(item.id || title)),
    x: clamp(Number(item.x) || 8, 0, 88),
    y: clamp(Number(item.y) || 10, 0, 82),
    z: Number(item.z) || 1,
    createdAt: Number(item.createdAt) || Date.now(),
  };
}

function loadNotes() {
  try {
    const data = JSON.parse(localStorage.getItem(panoKey()) || "[]");
    notes = Array.isArray(data) ? data.map(hydrate).filter(Boolean) : [];
  } catch {
    notes = [];
  }
}

function saveNotes() {
  localStorage.setItem(panoKey(), JSON.stringify(notes));
}

function setStickyColor(color) {
  const input = form?.querySelector(`input[name="color"][value="${safeColor(color)}"]`);
  if (input) input.checked = true;
}

function addItem(partial) {
  notes.push(hydrate({
    id: uid(),
    ...nextSpot(),
    createdAt: Date.now(),
    ...partial,
  }));
  saveNotes();
  paint();
}

function paint() {
  const active = document.activeElement;
  const editingId = active?.dataset?.note || "";
  const caret = editingId ? active.selectionStart : null;
  countNode.textContent = notes.length ? `${notes.length} iğne` : "Boş";
  emptyNode.hidden = notes.length > 0;
  notesNode.innerHTML = notes.map((item) => {
    const body = item.note ? `${item.title}\n${item.note}` : item.title;
    if (item.paper === "photo") {
      return `<article class="pano-note pano-polaroid" data-id="${esc(item.id)}" style="left:${item.x}%;top:${item.y}%;z-index:${item.z};--tilt:${tiltOf(item.id)}deg">
        <span class="pin pin-${esc(item.pin)}" aria-hidden="true"></span>
        <div class="pano-grip" data-grip="${esc(item.id)}"></div>
        <img src="${esc(item.image)}" alt="" draggable="false" />
        <label class="sr" for="note-${esc(item.id)}">Yazı</label>
        <textarea id="note-${esc(item.id)}" data-note="${esc(item.id)}" maxlength="80" rows="1" placeholder="alt yazı">${esc(item.title)}</textarea>
        <button type="button" class="text-btn pano-x" data-delete="${esc(item.id)}" aria-label="Sil">×</button>
      </article>`;
    }
    return `<article class="pano-note paper-${item.paper} c-${item.color}" data-id="${esc(item.id)}" style="left:${item.x}%;top:${item.y}%;z-index:${item.z};width:${noteWidth(item)}px;--tilt:${tiltOf(item.id)}deg">
      <span class="pin pin-${esc(item.pin)}" aria-hidden="true"></span>
      <div class="pano-grip" data-grip="${esc(item.id)}"></div>
      <label class="sr" for="note-${esc(item.id)}">Not</label>
      <textarea id="note-${esc(item.id)}" data-note="${esc(item.id)}" maxlength="800" rows="4">${esc(body)}</textarea>
      <div class="pano-tools">
        <button type="button" class="swatch c-${item.color}" data-recolor="${esc(item.id)}" aria-label="Rengi değiştir"></button>
        <button type="button" class="text-btn" data-delete="${esc(item.id)}">Sil</button>
      </div>
    </article>`;
  }).join("");
  if (editingId) {
    const field = notesNode.querySelector(`textarea[data-note="${editingId}"]`);
    if (field) {
      field.focus();
      const pos = caret == null ? field.value.length : caret;
      field.setSelectionRange(pos, pos);
    }
  }
}

function placeFromPointer(el, event) {
  const item = byId(el.dataset.id);
  if (!item) return;
  const rect = cork.getBoundingClientRect();
  const left = event.clientX - drag.offsetX - rect.left;
  const top = event.clientY - drag.offsetY - rect.top;
  const maxX = Math.max(0, rect.width - el.offsetWidth);
  const maxY = Math.max(0, rect.height - el.offsetHeight);
  item.x = rect.width ? (clamp(left, 0, maxX) / rect.width) * 100 : 0;
  item.y = rect.height ? (clamp(top, 0, maxY) / rect.height) * 100 : 0;
  el.style.left = `${item.x}%`;
  el.style.top = `${item.y}%`;
}

function onPointerDown(event) {
  if (event.button != null && event.button !== 0) return;
  if (event.target.closest("textarea, button, input, label")) return;
  const card = event.target.closest(".pano-note");
  if (!card) return;
  const item = byId(card.dataset.id);
  if (!item) return;
  const rect = card.getBoundingClientRect();
  item.z = (notes.reduce((max, note) => Math.max(max, note.z || 0), 0) || 0) + 1;
  card.style.zIndex = String(item.z);
  drag = {
    id: item.id,
    el: card,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  card.classList.add("is-lift");
  card.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function onPointerMove(event) {
  if (!drag) return;
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
  if (!drag.moved) return;
  placeFromPointer(drag.el, event);
}

function onPointerUp(event) {
  if (!drag) return;
  if (drag.moved) {
    placeFromPointer(drag.el, event);
    saveNotes();
  }
  drag.el.classList.remove("is-lift");
  drag = null;
}

function onSubmit(event) {
  event.preventDefault();
  const raw = form.text.value.trim();
  if (!raw) {
    form.text.focus();
    return;
  }
  const [first, ...rest] = raw.split("\n");
  const color = safeColor(form.color.value);
  const paper = form.paper.value === "lined" ? "lined" : "sticky";
  lastColor = color;
  addItem({
    title: first,
    note: rest.join("\n").trim(),
    color,
    paper,
  });
  form.reset();
  setStickyColor(color);
  form.paper.value = paper;
  form.text.focus();
}

function writeNote(id, raw, removeIfEmpty) {
  const item = byId(id);
  if (!item) return;
  const text = String(raw || "").trim();
  if (!text) {
    if (item.paper === "photo") {
      item.title = "";
      item.note = "";
      saveNotes();
      return;
    }
    if (!removeIfEmpty) return;
    notes = notes.filter((note) => note.id !== id);
    saveNotes();
    paint();
    return;
  }
  const [first, ...rest] = text.split("\n");
  item.title = first.replace(/[\r\n]+/g, " ").trim().slice(0, item.paper === "photo" ? 80 : 180);
  item.note = rest.join("\n").trim().slice(0, 800);
  saveNotes();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("okunamadı"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 420;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () => reject(new Error("görsel"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function onPhoto(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !file.type.startsWith("image/")) return;
  try {
    const image = await compressImage(file);
    addItem({
      title: "",
      paper: "photo",
      color: "amber",
      image,
    });
  } catch {
    window.alert("Bu görsel iğnelenemedi.");
  }
}

function boot() {
  cork = document.getElementById("cork");
  notesNode = document.getElementById("pano-notes");
  emptyNode = document.getElementById("pano-empty");
  form = document.getElementById("sticky-form");
  countNode = document.getElementById("pano-count");
  const plan = readPlan();
  applyTheme(THEMES.includes(plan?.theme) ? plan.theme : "bordo");
  lastColor = safeColor(plan?.lastColor || "amber");
  loadNotes();
  setStickyColor(lastColor);
  paint();
  form.addEventListener("submit", onSubmit);
  form.text.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.getElementById("photo-btn").addEventListener("click", () => {
    document.getElementById("photo-file").click();
  });
  document.getElementById("photo-file").addEventListener("change", onPhoto);
  cork.addEventListener("pointerdown", onPointerDown);
  cork.addEventListener("pointermove", onPointerMove);
  cork.addEventListener("pointerup", onPointerUp);
  cork.addEventListener("pointercancel", onPointerUp);
  cork.addEventListener("click", (event) => {
    const recolor = event.target.closest("[data-recolor]");
    const del = event.target.closest("[data-delete]");
    if (recolor) {
      const item = byId(recolor.dataset.recolor);
      if (!item) return;
      item.color = COLORS[(COLORS.indexOf(item.color) + 1) % COLORS.length];
      saveNotes();
      paint();
    } else if (del) {
      notes = notes.filter((note) => note.id !== del.dataset.delete);
      saveNotes();
      paint();
    }
  });
  cork.addEventListener("input", (event) => {
    const field = event.target.closest("textarea[data-note]");
    if (field) writeNote(field.dataset.note, field.value, false);
  });
  cork.addEventListener("blur", (event) => {
    const field = event.target.closest?.("textarea[data-note]");
    if (field) writeNote(field.dataset.note, field.value, true);
  }, true);
  document.querySelectorAll(".theme-dot").forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.theme));
  });
}

if (typeof document !== "undefined") HaftalikAuth.onReady(boot);
