// Haftalık — aylık/haftalık plan ve yapışkan not panosu. Veriler localStorage'da durur.

function storeKey() {
  return HaftalikAuth.storageKey("haftalik.v1");
}
const COLORS = ["amber", "rose", "mint", "lilac", "peach", "sky"];
const KINDS = ["sticky", "task", "appointment", "routine"];
const KIND_LABEL = { sticky: "Not", task: "Görev", appointment: "Randevu", routine: "Rutin" };
const KIND_ORDER = { routine: 0, appointment: 1, task: 2, sticky: 3 };
const WD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const KEEP = Symbol("keep-time");

const editor = document.getElementById("editor");
const planForm = document.getElementById("plan-form");

let pendingFocus = null;
let draggedId = null;
let dragHappened = false;
let dragEl = null;
let overZone = null;
let toastTimer = 0;
let toastAction = null;

const THEMES = ["bordo", "lacivert", "beyaz", "koyu"];

const QUOTES = [
  "Bugün küçük bir adım, yarının düzeni.",
  "Önce bir işi bitir, sonra nefes al.",
  "Önemli olanı baş nota yaz, gerisi sıraya girer.",
  "Sakin tempo da ilerlemedir.",
  "Bitirdiğin her iş, güne bir yer açar.",
  "Dağınık bir zihin, bir nota sığabilir.",
  "Kendine ayırdığın saat boşa gitmez.",
  "Yavaş başlamak da başlamaktır.",
  "Bir işi küçültmek, onu bitirmeye yaklaştırır.",
  "Nazik bir liste, sert bir günden iyidir.",
  "Bugünün hali, yarının rahatlığı.",
  "Toplantıdan önce bir yudum su.",
  "Bitmeyen işi böl, biten işi kutla.",
  "Sıradaki tek iş, en doğru iş olabilir.",
];

const STICKERS = [
  { id: "heart", label: "Kalp", group: "tatlı" },
  { id: "cat", label: "Kedi", group: "tatlı" },
  { id: "paw", label: "Pati", group: "tatlı" },
  { id: "star", label: "Yıldız", group: "tatlı" },
  { id: "flower", label: "Çiçek", group: "tatlı" },
  { id: "coffee", label: "Kahve", group: "iş" },
  { id: "pin", label: "Raptiye", group: "iş" },
  { id: "check", label: "Tamam", group: "iş" },
  { id: "idea", label: "Fikir", group: "iş" },
  { id: "mail", label: "Posta", group: "iş" },
];

const STICKER_ART = {
  heart: `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#e23d5c" d="M24 40.5S8 29.5 8 19.2C8 13.2 12.4 9 17.8 9c3.2 0 5.4 1.6 6.2 3.2C24.8 10.6 27 9 30.2 9 35.6 9 40 13.2 40 19.2 40 29.5 24 40.5 24 40.5z"/></svg>`,
  cat: `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#f4c07a" d="M10 20 16 8l6 8h4l6-8 6 12v14a10 10 0 0 1-10 10H20A10 10 0 0 1 10 34Z"/><circle cx="19" cy="24" r="2.2" fill="#2a2118"/><circle cx="29" cy="24" r="2.2" fill="#2a2118"/><path fill="#e23d5c" d="m24 28 1.8 3h-3.6z"/><path d="M21 33.2c.8 1.3 1.5 1.8 3 1.8s2.2-.5 3-1.8" fill="none" stroke="#2a2118" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  paw: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="15" cy="16" r="4.2" fill="#e23d5c"/><circle cx="24" cy="12" r="4.2" fill="#e23d5c"/><circle cx="33" cy="16" r="4.2" fill="#e23d5c"/><circle cx="38" cy="24" r="3.4" fill="#e23d5c"/><ellipse cx="24" cy="30" rx="9" ry="8" fill="#e23d5c"/></svg>`,
  star: `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#f2c14e" d="m24 6 4.8 11.2L41 18.4 32 27.2l2.6 12L24 33.2 13.4 39.2 16 27.2 7 18.4l12.2-1.2Z"/></svg>`,
  flower: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="11" r="6" fill="#e23d5c"/><circle cx="35" cy="18" r="6" fill="#e23d5c"/><circle cx="35" cy="31" r="6" fill="#e23d5c"/><circle cx="24" cy="37" r="6" fill="#e23d5c"/><circle cx="13" cy="31" r="6" fill="#e23d5c"/><circle cx="13" cy="18" r="6" fill="#e23d5c"/><circle cx="24" cy="24" r="5" fill="#f2c14e"/></svg>`,
  coffee: `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#fffaf4" stroke="#6b3a22" stroke-width="2" d="M12 16h20v14a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8Z"/><path fill="none" stroke="#6b3a22" stroke-width="2" d="M32 20h4a5 5 0 0 1 0 10h-4"/><path fill="none" stroke="#6b3a22" stroke-width="2" stroke-linecap="round" d="M18 10c0 2 2 2 2 4M25 8c0 2 2 2 2 4"/></svg>`,
  pin: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="8" fill="#e23d5c"/><path stroke="#c6a36a" stroke-width="3" stroke-linecap="round" d="M24 23v16"/><circle cx="24" cy="16" r="3" fill="#fff"/></svg>`,
  check: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="#2f9e6b"/><path d="m16 24.5 5 5.5 12-13" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  idea: `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#ffe15a" stroke="#d7a106" stroke-width="1.6" d="M24 8a11 11 0 0 1 6 20.1V32H18v-3.9A11 11 0 0 1 24 8z"/><path stroke="#d7a106" stroke-width="2" stroke-linecap="round" d="M19 35h10M20.5 39h7"/></svg>`,
  mail: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="14" width="32" height="22" rx="3" fill="#7eb6e8"/><path d="m8 16 16 12L40 16" fill="none" stroke="#f7fbff" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
};

let state = {
  view: "month",
  cursor: "",
  selected: "",
  trayOpen: false,
  lastColor: "amber",
  theme: "bordo",
  head: { text: "", color: "amber" },
  stickers: [],
  items: [],
};

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
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

function clip(value, max = 42) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function cap(value) {
  if (!value) return "";
  return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1);
}

function todayISO() {
  return toISO(new Date());
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  return toISO(parseISO(value)) === value;
}

function addDays(date, amount) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(iso, amount) {
  const date = parseISO(iso);
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));
  return toISO(next);
}

function startOfWeek(date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

function weekdayIndex(iso) {
  return (parseISO(iso).getDay() + 6) % 7;
}

function monthMatrix(iso) {
  const start = startOfWeek(new Date(parseISO(iso).getFullYear(), parseISO(iso).getMonth(), 1));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function isoWeek(date) {
  const marker = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  marker.setDate(marker.getDate() + 3 - ((marker.getDay() + 6) % 7));
  const week1 = new Date(marker.getFullYear(), 0, 4);
  week1.setDate(week1.getDate() - ((week1.getDay() + 6) % 7));
  return 1 + Math.round((marker - week1) / 604800000);
}

function monthTitle(iso) {
  const date = parseISO(iso);
  const month = cap(new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date));
  return `${month} ${date.getFullYear()}`;
}

function rangeLabel(start, end) {
  const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric" });
  const month = new Intl.DateTimeFormat("tr-TR", { month: "long" });
  const leftMonth = cap(month.format(start));
  const rightMonth = cap(month.format(end));
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${day.format(start)}–${day.format(end)} ${rightMonth} ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${day.format(start)} ${leftMonth} – ${day.format(end)} ${rightMonth} ${end.getFullYear()}`;
  }
  return `${day.format(start)} ${leftMonth} ${start.getFullYear()} – ${day.format(end)} ${rightMonth} ${end.getFullYear()}`;
}

function shortDate(iso) {
  const date = parseISO(iso);
  const month = cap(new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(date).replace(".", ""));
  return `${date.getDate()} ${month}`;
}

function periodText() {
  if (state.view === "month") return monthTitle(state.cursor);
  if (state.view === "day") {
    const date = parseISO(state.cursor);
    const weekday = cap(new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date));
    const month = cap(new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date));
    return `${date.getDate()} ${month}, ${weekday}`;
  }
  const start = startOfWeek(parseISO(state.cursor));
  const end = addDays(start, 6);
  return `${rangeLabel(start, end)} · ${isoWeek(start)}. hafta`;
}

function safeColor(color) {
  return COLORS.includes(color) ? color : "amber";
}

function hydrate(item) {
  const kind = KINDS.includes(item.kind) ? item.kind : "sticky";
  const weekdays = Array.isArray(item.weekdays)
    ? [...new Set(item.weekdays.map(Number).filter((day) => day >= 0 && day <= 6))]
    : [];
  return {
    id: String(item.id || uid()),
    title: String(item.title || "").replace(/[\r\n]+/g, " ").trim().slice(0, 180),
    note: String(item.note || "").trim().slice(0, 800),
    color: safeColor(item.color),
    date: kind === "routine" ? null : (isISO(item.date) ? item.date : null),
    time: /^\d{2}:\d{2}$/.test(item.time || "") ? item.time : null,
    kind,
    done: Boolean(item.done),
    doneDates: Array.isArray(item.doneDates) ? item.doneDates.filter(isISO) : [],
    weekdays,
    createdAt: Number(item.createdAt) || Date.now(),
  };
}

function byId(id) {
  return state.items.find((item) => item.id === id);
}

function boardItems() {
  return state.items
    .filter((item) => item.kind !== "routine" && !item.date)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
}

function routines() {
  return state.items
    .filter((item) => item.kind === "routine")
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title, "tr"));
}

function itemsForDate(iso) {
  const weekday = weekdayIndex(iso);
  return state.items.filter((item) => {
    if (item.kind === "routine") return item.weekdays.includes(weekday);
    return item.date === iso;
  });
}

function isDone(item, iso) {
  if (item.kind === "routine") return item.doneDates.includes(iso);
  return item.done;
}

function sortItems(items, iso) {
  return items.slice().sort((a, b) => {
    const done = Number(isDone(a, iso)) - Number(isDone(b, iso));
    if (done) return done;
    const time = (a.time || "99:99").localeCompare(b.time || "99:99");
    if (time) return time;
    const kind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    if (kind) return kind;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function partition(iso) {
  const all = sortItems(itemsForDate(iso), iso);
  const done = all.filter((item) => isDone(item, iso));
  const open = all.filter((item) => !isDone(item, iso));
  return {
    timed: open.filter((item) => item.time),
    loose: open.filter((item) => !item.time),
    done,
  };
}

function progressText(iso) {
  const all = itemsForDate(iso);
  if (!all.length) return "Boş gün";
  const done = all.filter((item) => isDone(item, iso)).length;
  return `${done}/${all.length} tamam`;
}

function todayLabel() {
  const iso = todayISO();
  const all = itemsForDate(iso);
  const open = all.filter((item) => !isDone(item, iso)).length;
  if (!all.length) return "Bugün boş";
  if (!open) return "Bugün tamam";
  return `Bugün ${open} açık`;
}

function weekdayLabel(days) {
  return days.slice().sort((a, b) => a - b).map((day) => WD[day]).filter(Boolean).join(" · ");
}

function tiltOf(id) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n + id.charCodeAt(i) * (i + 1)) % 97;
  return (((n % 7) - 3) * 1.15).toFixed(2);
}

function quoteFor(iso) {
  const date = parseISO(iso);
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.round((date - start) / 86400000);
  return QUOTES[((day % QUOTES.length) + QUOTES.length) % QUOTES.length];
}

function quoteHTML() {
  return `<p class="day-quote"><span>Günün sözü</span>${esc(quoteFor(todayISO()))}</p>`;
}

function stickerById(id) {
  return STICKERS.find((sticker) => sticker.id === id) || null;
}

function stickerSVG(id) {
  return STICKER_ART[id] || STICKER_ART.star;
}

function hydrateSticker(item) {
  if (!item || !stickerById(item.name) || !isISO(item.date)) return null;
  return { id: String(item.id || uid()), name: item.name, date: item.date };
}

function hydrateHead(head) {
  return {
    text: String(head?.text || "").slice(0, 280),
    color: "amber",
  };
}

function decalsFor(iso) {
  return state.stickers.filter((sticker) => sticker.date === iso);
}

function decalHTML(sticker) {
  const label = stickerById(sticker.name)?.label || "Sticker";
  return `<span class="decal" style="--tilt:${tiltOf(sticker.id)}deg" draggable="true" data-drag="placed:${sticker.id}" title="${esc(label)}">${stickerSVG(sticker.name)}<button type="button" class="decal-x" data-action="remove-decal" data-id="${sticker.id}" aria-label="Stickerı kaldır">×</button></span>`;
}

function stickerSheetHTML() {
  const row = (group) => STICKERS.filter((sticker) => sticker.group === group).map((sticker) => (
    `<button type="button" class="stamp" draggable="true" data-drag="stamp:${sticker.id}" title="${esc(sticker.label)}" aria-label="${esc(sticker.label)}">${stickerSVG(sticker.id)}</button>`
  )).join("");
  return `<h2>Stickerlar</h2>
    <p class="hint">Tut, bir günün köşesine bırak.</p>
    <p class="stamp-label">Tatlı</p>
    <div class="stamp-row">${row("tatlı")}</div>
    <p class="stamp-label">İş</p>
    <div class="stamp-row">${row("iş")}</div>`;
}

function readStore() {
  try {
    const raw = localStorage.getItem(storeKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(storeKey(), JSON.stringify({
      version: 1,
      view: state.view,
      cursor: state.cursor,
      lastColor: state.lastColor,
      theme: state.theme,
      head: state.head,
      stickers: state.stickers,
      items: state.items,
    }));
  } catch {
    toast("Tarayıcı kaydı yazılamadı.");
  }
}

function seedItems() {
  const today = todayISO();
  const tomorrow = toISO(addDays(parseISO(today), 1));
  const now = Date.now();
  return [
    { id: uid(), title: "Annemi ara — pazar planı", color: "rose", kind: "sticky", createdAt: now - 3000 },
    { id: uid(), title: "Faturayı kontrol et", note: "Son ödeme bu hafta", color: "amber", kind: "sticky", createdAt: now - 2000 },
    { id: uid(), title: "Kitap: sayfa 184", color: "mint", kind: "sticky", createdAt: now - 1000 },
    { id: uid(), title: "Haftalık programı toparla", color: "sky", date: today, kind: "task", createdAt: now },
    { id: uid(), title: "Proje toplantısı", note: "Gündem: takvim ve pano", color: "lilac", date: tomorrow, time: "15:00", kind: "appointment", createdAt: now },
    { id: uid(), title: "Sabah yürüyüşü", color: "peach", time: "07:30", kind: "routine", weekdays: [0, 2, 4], createdAt: now },
  ].map(hydrate);
}

function chipHTML(item, iso) {
  const done = isDone(item, iso) ? " is-done" : "";
  const drag = item.kind === "routine" ? "" : ` draggable="true" data-drag="${item.id}"`;
  const prefix = item.kind === "routine" ? "↻ " : "";
  const time = item.time ? `<span class="chip-time">${esc(item.time)}</span>` : "";
  return `<div role="button" tabindex="0" class="chip c-${safeColor(item.color)} k-${item.kind}${done}" style="--tilt:${tiltOf(item.id)}deg"${drag} data-action="chip" data-id="${item.id}" data-date="${iso}" title="${esc(item.title)}">${time}<span class="chip-label">${prefix}${esc(item.title)}</span></div>`;
}

function mastHTML(kicker, title) {
  return `<header class="mast">
    <span class="rings" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <div>
      <p class="mast-kicker">${esc(kicker)}</p>
      <h2 class="mast-title">${esc(title)}</h2>
    </div>
  </header>`;
}

function rowHTML(item, iso, compact) {
  const done = isDone(item, iso);
  const drag = item.kind === "routine" ? "" : ` draggable="true" data-drag="${item.id}"`;
  const unsched = item.kind !== "routine" && item.date
    ? `<button type="button" class="text-btn" data-action="unschedule" data-id="${item.id}" aria-label="Panoya al">${compact ? "↩" : "Panoya"}</button>`
    : "";
  const meta = !compact && item.kind === "routine"
    ? weekdayLabel(item.weekdays)
    : (!compact ? KIND_LABEL[item.kind] : "");
  const tilt = compact ? ` style="--tilt:${tiltOf(item.id)}deg"` : "";
  return `<div class="row k-${item.kind} c-${safeColor(item.color)}${done ? " is-done" : ""}${compact ? " is-compact" : ""}"${tilt}${drag}>
    <button type="button" class="check${done ? " is-on" : ""}" data-check data-id="${item.id}" data-date="${iso}" aria-label="${done ? "Geri al" : "Tamamlandı"}"></button>
    <div class="row-main" role="button" tabindex="0" data-action="open" data-id="${item.id}">
      ${item.time ? `<span class="row-time">${esc(item.time)}</span>` : ""}
      <span class="row-title">${esc(item.title)}</span>
      ${!compact && item.note ? `<span class="row-note">${esc(item.note)}</span>` : ""}
      ${meta ? `<span class="row-meta">${esc(item.kind === "routine" ? `Rutin · ${meta}` : meta)}</span>` : ""}
    </div>
    <div class="row-actions">${unsched}<button type="button" class="text-btn" data-action="delete" data-id="${item.id}" aria-label="Sil">${compact ? "×" : "Sil"}</button></div>
  </div>`;
}

function groupHTML(title, items, iso) {
  if (!items.length) return "";
  return `<h3 class="group-label">${title}</h3>${items.map((item) => rowHTML(item, iso, false)).join("")}`;
}

function quickForm(iso) {
  return `<form class="quick" data-quick="${iso}" autocomplete="off">
    <input type="time" name="time" aria-label="Saat" />
    <input class="quick-title" type="text" name="title" maxlength="180" placeholder="Bu güne ekle" aria-label="Bu güne ekle" />
    <button type="submit" class="primary">Ekle</button>
  </form>`;
}

function renderHours(iso, items) {
  const early = items.filter((item) => Number(item.time.slice(0, 2)) < 7);
  const late = items.filter((item) => Number(item.time.slice(0, 2)) > 21);
  const today = iso === todayISO();
  const nowHour = new Date().getHours();
  let html = "";
  if (early.length) {
    html += `<div class="hour-row is-extra"><div class="hour-label">Erken</div><div class="hour-items">${early.map((item) => rowHTML(item, iso, true)).join("")}</div></div>`;
  }
  for (let hour = 7; hour <= 21; hour += 1) {
    const slot = items.filter((item) => Number(item.time.slice(0, 2)) === hour);
    const now = today && nowHour === hour ? " is-now" : "";
    html += `<div class="hour-row${now}" data-drop="date" data-date="${iso}" data-hour="${hour}">
      <div class="hour-label">${String(hour).padStart(2, "0")}:00</div>
      <div class="hour-items">${slot.map((item) => rowHTML(item, iso, true)).join("")}</div>
    </div>`;
  }
  if (late.length) {
    html += `<div class="hour-row is-extra"><div class="hour-label">Geç</div><div class="hour-items">${late.map((item) => rowHTML(item, iso, true)).join("")}</div></div>`;
  }
  return html;
}

function renderTray(iso) {
  if (!isISO(iso)) return "";
  const date = parseISO(iso);
  const month = cap(new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date));
  const weekday = cap(new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date));
  const parts = partition(iso);
  const body = [
    groupHTML("Saatli", parts.timed, iso),
    groupHTML("Yapılacaklar", parts.loose, iso),
    groupHTML("Tamamlanan", parts.done, iso),
  ].join("");
  return `<section class="tray" data-drop="date" data-date="${iso}">
    <header class="tray-head">
      <div>
        <h2>${date.getDate()} ${esc(month)}</h2>
        <p>${esc(weekday)} · ${esc(progressText(iso))}</p>
      </div>
      <button type="button" class="icon-btn" data-action="close-tray" aria-label="Günü kapat">×</button>
    </header>
    <div class="tray-body">
      <div class="tray-list" data-scroll>${body || '<p class="empty">Bu gün boş. Panodan not bırak veya aşağıya yaz.</p>'}</div>
      ${quickForm(iso)}
    </div>
  </section>`;
}

function renderMonth() {
  const cursor = parseISO(state.cursor);
  const today = todayISO();
  const dow = WD.map((name, index) => `<div class="dow${index >= 5 ? " is-weekend" : ""}">${name}</div>`).join("");
  const cells = monthMatrix(state.cursor).map((date) => {
    const iso = toISO(date);
    const items = sortItems(itemsForDate(iso), iso);
    const extra = items.length - 2;
    const classes = [
      "day-cell",
      date.getMonth() !== cursor.getMonth() ? "is-out" : "",
      iso === today ? "is-today" : "",
      state.trayOpen && iso === state.selected ? "is-selected" : "",
      date.getDay() === 0 || date.getDay() === 6 ? "is-weekend" : "",
    ].filter(Boolean).join(" ");
    return `<div class="${classes}" data-drop="date" data-date="${iso}" data-action="select"${iso === today ? ' aria-current="date"' : ""}>
      <div class="cell-top">
        <span class="num${iso === today ? " is-today" : ""}">${date.getDate()}</span>
        <span class="cell-marks">${decalsFor(iso).slice(0, 2).map(decalHTML).join("")}</span>
        <button type="button" class="cell-add" data-action="add" data-date="${iso}" data-kind="task" aria-label="${date.getDate()} gününe iş ekle">+</button>
      </div>
      <div class="cell-items">
        ${items.slice(0, 2).map((item) => chipHTML(item, iso)).join("")}
        ${extra > 0 ? `<button type="button" class="more" data-action="focus-day" data-date="${iso}">+${extra}</button>` : ""}
      </div>
    </div>`;
  }).join("");
  const tray = state.trayOpen ? renderTray(state.selected) : "";
  return `<div class="month-wrap">${mastHTML("Masa takvimi", monthTitle(state.cursor))}${quoteHTML()}<div class="month-grid">${dow}${cells}</div>${tray}</div>`;
}

function renderWeek() {
  const start = startOfWeek(parseISO(state.cursor));
  const today = todayISO();
  const cols = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const iso = toISO(date);
    const parts = partition(iso);
    const items = [...parts.timed, ...parts.loose, ...parts.done];
    const classes = [
      "week-col",
      index >= 5 ? "is-weekend" : "",
      iso === today ? "is-today" : "",
    ].filter(Boolean).join(" ");
    const marks = decalsFor(iso);
    return `<section class="${classes}" data-drop="date" data-date="${iso}">
      <button type="button" class="week-head" data-action="open-day" data-date="${iso}" aria-label="${WD[index]} ${date.getDate()} gününü aç">
        <span class="wk${index >= 5 ? " wk-end" : ""}">${WD[index]}</span>
        <span class="num${iso === today ? " is-today" : ""}">${date.getDate()}</span>
      </button>
      <div class="col-body" data-scroll>
        <div class="decal-row">${marks.map(decalHTML).join("")}</div>
        ${items.length ? items.map((item) => rowHTML(item, iso, true)).join("") : (marks.length ? "" : '<p class="empty">Boş</p>')}
        <button type="button" class="col-add" data-action="add" data-date="${iso}" data-kind="task">Ekle</button>
      </div>
    </section>`;
  }).join("");
  const startLabel = rangeLabel(start, addDays(start, 6));
  return `<div class="week-wrap">${mastHTML(`${isoWeek(start)}. hafta`, startLabel)}${quoteHTML()}<div class="week">${cols}</div></div>`;
}

function renderDay(iso) {
  const date = parseISO(iso);
  const weekday = cap(new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date));
  const month = cap(new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date));
  const parts = partition(iso);
  const looseDone = parts.done.filter((item) => !item.time);
  const timedDone = parts.done.filter((item) => item.time);
  return `<div class="day-view" data-drop="date" data-date="${iso}">
    ${quoteHTML()}
    <header class="day-head">
      <div>
        <p class="kicker">${esc(weekday)}</p>
        <h2>${date.getDate()} ${esc(month)}</h2>
      </div>
      <div class="decal-row day-decals">${decalsFor(iso).map(decalHTML).join("")}</div>
      <p class="progress">${esc(progressText(iso))}</p>
    </header>
    <div class="day-columns">
      <section class="day-todos">
        <h3>Yapılacaklar</h3>
        <div class="stack-list" data-scroll>
          ${parts.loose.map((item) => rowHTML(item, iso, false)).join("") || '<p class="empty">Saatsiz iş yok.</p>'}
          ${looseDone.length ? `<h3 class="group-label">Tamamlanan</h3>${looseDone.map((item) => rowHTML(item, iso, false)).join("")}` : ""}
        </div>
        ${quickForm(iso)}
      </section>
      <section class="day-timeline">
        <h3>Saatler</h3>
        <div class="hours" data-scroll>${renderHours(iso, [...parts.timed, ...timedDone])}</div>
      </section>
    </div>
  </div>`;
}

function renderSheet() {
  if (state.view === "week") return renderWeek();
  if (state.view === "day") return renderDay(state.cursor);
  return renderMonth();
}

function stickyHTML(item) {
  return `<article class="sticky c-${safeColor(item.color)}${item.done ? " is-done" : ""}" style="--tilt:${tiltOf(item.id)}deg" draggable="true" data-drag="${item.id}">
    <div class="sticky-main" role="button" tabindex="0" data-action="open" data-id="${item.id}">
      <p class="sticky-title">${esc(item.title)}</p>
      ${item.note ? `<p class="sticky-note">${esc(item.note)}</p>` : ""}
      ${item.time ? `<p class="sticky-time">${esc(item.time)}</p>` : ""}
    </div>
    <div class="sticky-tools">
      <button type="button" class="check${item.done ? " is-on" : ""}" data-check data-id="${item.id}" data-date="" aria-label="${item.done ? "Geri al" : "Tamamlandı"}"></button>
      <button type="button" class="text-btn" data-action="delete" data-id="${item.id}">Sil</button>
    </div>
  </article>`;
}

function routineHTML(item) {
  const days = weekdayLabel(item.weekdays);
  return `<article class="routine c-${safeColor(item.color)}">
    <div class="routine-main" role="button" tabindex="0" data-action="open" data-id="${item.id}">
      <p class="routine-title">${item.time ? `<span>${esc(item.time)}</span>` : ""}${esc(item.title)}</p>
      <p class="routine-days">${esc(days || "Gün seçilmedi")}</p>
    </div>
    <button type="button" class="text-btn" data-action="delete" data-id="${item.id}">Sil</button>
  </article>`;
}

function renderBoard() {
  const head = document.getElementById("head-text");
  if (head && document.activeElement !== head) head.value = state.head.text;
  document.getElementById("sticker-sheet").innerHTML = stickerSheetHTML();
  const notes = boardItems();
  document.getElementById("board-count").textContent = notes.length ? `${notes.length} not` : "Boş";
  document.getElementById("note-list").innerHTML = notes.length
    ? notes.map(stickyHTML).join("")
    : '<div class="empty-note"><p>Pano boş.</p><p>Aklına geleni aşağıya yaz. İstersen sonra bir güne bırakırsın.</p></div>';
  const list = routines();
  document.getElementById("routine-block").innerHTML = `
    <div class="routine-head"><h2>Rutinler</h2><button type="button" data-action="add-routine">Ekle</button></div>
    ${list.length ? list.map(routineHTML).join("") : '<p class="empty">Haftada tekrar eden işler burada durur.</p>'}
  `;
}

function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : "bordo";
  state.theme = next;
  document.body.dataset.theme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  const bar = { bordo: "#4a1d2a", lacivert: "#12243d", beyaz: "#ece7e2", koyu: "#0c0e12" };
  if (meta) meta.content = bar[next];
}

function setTheme(theme) {
  applyTheme(theme);
  save();
  renderChrome();
}

function renderChrome() {
  document.getElementById("period-label").textContent = periodText();
  document.getElementById("today-count").textContent = todayLabel();
  document.querySelectorAll('[data-action="set-view"]').forEach((button) => {
    const on = button.dataset.view === state.view;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll('[data-action="set-theme"]').forEach((button) => {
    const on = button.dataset.theme === state.theme;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
  document.title = `${periodText()} — Haftalık`;
}

function snapshot() {
  return {
    quick: document.querySelector(".quick-title")?.value ?? null,
    quickTime: document.querySelector('.quick [name="time"]')?.value ?? null,
    boardScroll: document.getElementById("board-scroll")?.scrollTop ?? 0,
    scrolls: [...document.querySelectorAll("[data-scroll]")].map((node) => node.scrollTop),
  };
}

function restore(snap) {
  const board = document.getElementById("board-scroll");
  if (board) board.scrollTop = snap.boardScroll;
  document.querySelectorAll("[data-scroll]").forEach((node, index) => {
    if (snap.scrolls[index] != null) node.scrollTop = snap.scrolls[index];
  });
  const quick = document.querySelector(".quick-title");
  if (quick && snap.quick != null) {
    quick.value = snap.quick;
    const time = document.querySelector('.quick [name="time"]');
    if (time && snap.quickTime != null) time.value = snap.quickTime;
  }
  if (pendingFocus === "quick" && quick) {
    quick.focus();
    pendingFocus = null;
  }
}

function paint() {
  const snap = snapshot();
  renderChrome();
  document.getElementById("sheet").innerHTML = renderSheet();
  renderBoard();
  restore(snap);
}

function toast(message, onUndo) {
  const node = document.getElementById("toast");
  document.getElementById("toast-text").textContent = message;
  const undo = document.getElementById("toast-undo");
  toastAction = onUndo || null;
  undo.hidden = !onUndo;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
    toastAction = null;
  }, 4600);
}

function showError(message) {
  const node = document.getElementById("form-error");
  node.hidden = !message;
  node.textContent = message || "";
}

function syncDialogFields() {
  const kind = planForm.kind.value;
  document.getElementById("field-date").hidden = kind === "routine";
  document.getElementById("field-weekdays").hidden = kind !== "routine";
  const help = document.getElementById("date-help");
  if (kind === "appointment") help.textContent = "Randevu bir güne bağlıdır.";
  else if (kind === "sticky" || kind === "task") help.textContent = "Günü boş bırakırsan panoda kalır.";
  else help.textContent = "";
}

function openEditor(partial = {}) {
  const item = partial.id ? byId(partial.id) : null;
  const src = item || {
    title: "",
    note: "",
    color: state.lastColor || "amber",
    date: partial.date || "",
    time: partial.time || "",
    kind: partial.kind || "task",
    weekdays: partial.weekdays || [],
  };
  planForm.dataset.id = item?.id || "";
  planForm.title.value = src.title || "";
  planForm.note.value = src.note || "";
  planForm.kind.value = KINDS.includes(src.kind) ? src.kind : "task";
  planForm.date.value = src.date || "";
  planForm.time.value = src.time || "";
  const radio = planForm.querySelector(`input[name="color"][value="${safeColor(src.color)}"]`);
  if (radio) radio.checked = true;
  planForm.querySelectorAll('input[name="wd"]').forEach((input) => {
    input.checked = (src.weekdays || []).includes(Number(input.value));
  });
  document.getElementById("delete-btn").hidden = !item;
  document.getElementById("dialog-title").textContent = item ? "Düzenle" : "Yeni plan";
  showError("");
  syncDialogFields();
  if (!editor.open) editor.showModal();
  planForm.title.focus();
}

function setStickyColor(color) {
  const input = document.querySelector(`#sticky-form input[value="${safeColor(color)}"]`);
  if (input) input.checked = true;
}

function shiftHour(oldTime, hour) {
  const minutes = oldTime && /^\d{2}:\d{2}$/.test(oldTime) ? oldTime.slice(3, 5) : "00";
  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

function placeSticker(name, date) {
  if (!stickerById(name) || !isISO(date)) return;
  const sticker = { id: uid(), name, date };
  state.stickers.push(sticker);
  save();
  paint();
  toast("Sticker güne yapıştı.", () => {
    state.stickers = state.stickers.filter((item) => item.id !== sticker.id);
    save();
    paint();
  });
}

function moveSticker(id, date) {
  const sticker = state.stickers.find((item) => item.id === id);
  if (!sticker) return;
  const prev = sticker.date;
  if (!date) {
    state.stickers = state.stickers.filter((item) => item.id !== id);
    save();
    paint();
    toast("Sticker kalktı.", () => {
      state.stickers.push({ ...sticker, date: prev });
      save();
      paint();
    });
    return;
  }
  if (prev === date) return;
  sticker.date = date;
  save();
  paint();
  toast(`Sticker → ${shortDate(date)}`, () => {
    const current = state.stickers.find((item) => item.id === id);
    if (!current) return;
    current.date = prev;
    save();
    paint();
  });
}

function moveTo(id, date, hour = KEEP) {
  const item = byId(id);
  if (!item || item.kind === "routine") return;
  const prevDate = item.date;
  const prevTime = item.time;
  const nextTime = hour === KEEP ? item.time : shiftHour(item.time, hour);
  if (prevDate === date && prevTime === nextTime) return;
  item.date = date;
  item.time = nextTime;
  if (date && state.view === "month") {
    state.selected = date;
    state.trayOpen = true;
  }
  save();
  paint();
  const where = date ? `${shortDate(date)}${nextTime ? ` ${nextTime}` : ""}` : "pano";
  toast(`${clip(item.title)} → ${where}`, () => {
    const current = byId(id);
    if (!current) return;
    current.date = prevDate;
    current.time = prevTime;
    save();
    paint();
  });
}

function toggleDone(id, iso) {
  const item = byId(id);
  if (!item) return;
  if (item.kind === "routine") {
    if (!isISO(iso)) return;
    item.doneDates = item.doneDates.includes(iso)
      ? item.doneDates.filter((day) => day !== iso)
      : [...item.doneDates, iso];
  } else {
    item.done = !item.done;
  }
  save();
  paint();
}

function removeItem(id) {
  const index = state.items.findIndex((item) => item.id === id);
  if (index < 0) return;
  const [item] = state.items.splice(index, 1);
  save();
  paint();
  toast(`“${clip(item.title)}” silindi`, () => {
    state.items.splice(Math.min(index, state.items.length), 0, item);
    save();
    paint();
  });
}

function validatePlan(value) {
  if (!value.title) return "Bir başlık yaz.";
  if (value.kind === "appointment" && !value.date) return "Randevu için bir gün seç.";
  if (value.kind === "routine" && value.weekdays.length === 0) return "Rutin için en az bir gün seç.";
  return "";
}

function onPlanSubmit(event) {
  event.preventDefault();
  const kind = planForm.kind.value;
  const dateValue = planForm.date.value;
  const payload = {
    title: planForm.title.value.replace(/[\r\n]+/g, " ").trim(),
    note: planForm.note.value.trim(),
    kind,
    color: safeColor(planForm.color.value),
    date: kind === "routine" ? null : (dateValue || null),
    time: planForm.time.value || null,
    weekdays: kind === "routine"
      ? [...planForm.querySelectorAll('input[name="wd"]:checked')].map((input) => Number(input.value))
      : [],
  };
  const error = validatePlan(payload);
  if (error) {
    showError(error);
    return;
  }
  const id = planForm.dataset.id;
  if (id && byId(id)) Object.assign(byId(id), payload);
  else {
    state.items.push(hydrate({
      ...payload,
      id: uid(),
      createdAt: Date.now(),
      done: false,
      doneDates: [],
    }));
  }
  state.lastColor = payload.color;
  if (payload.date) {
    state.selected = payload.date;
    state.cursor = payload.date;
    if (state.view === "month") state.trayOpen = true;
  }
  editor.close();
  save();
  paint();
}

function onStickySubmit(event) {
  event.preventDefault();
  const raw = event.target.text.value.trim();
  if (!raw) {
    event.target.text.focus();
    return;
  }
  const [first, ...rest] = raw.split("\n");
  const color = safeColor(event.target.color.value);
  state.items.push(hydrate({
    id: uid(),
    title: first,
    note: rest.join("\n").trim(),
    color,
    kind: "sticky",
    createdAt: Date.now(),
  }));
  state.lastColor = color;
  event.target.reset();
  setStickyColor(color);
  save();
  paint();
  event.target.text.focus();
}

function onQuickSubmit(event) {
  event.preventDefault();
  const title = event.target.title.value.replace(/[\r\n]+/g, " ").trim();
  if (!title) {
    event.target.title.focus();
    return;
  }
  const time = event.target.time.value || null;
  state.items.push(hydrate({
    id: uid(),
    title,
    date: event.target.dataset.quick,
    time,
    kind: time ? "appointment" : "task",
    color: state.lastColor || "sky",
    createdAt: Date.now(),
  }));
  event.target.reset();
  pendingFocus = "quick";
  save();
  paint();
}

function setView(view) {
  if (!["month", "week", "day"].includes(view)) return;
  if (view === "day" && state.trayOpen && state.selected) state.cursor = state.selected;
  state.view = view;
  if (view !== "month") state.trayOpen = false;
  save();
  paint();
}

function shift(direction) {
  if (state.view === "month") state.cursor = addMonths(state.cursor, direction);
  else if (state.view === "week") state.cursor = toISO(addDays(parseISO(state.cursor), 7 * direction));
  else state.cursor = toISO(addDays(parseISO(state.cursor), direction));
  state.trayOpen = false;
  save();
  paint();
}

function goToday() {
  const iso = todayISO();
  state.cursor = iso;
  state.selected = iso;
  state.trayOpen = state.view === "month";
  save();
  paint();
}

function clearOver() {
  overZone?.classList.remove("is-over");
  overZone = null;
  document.querySelectorAll(".is-over").forEach((node) => node.classList.remove("is-over"));
}

function exportData() {
  const blob = new Blob([JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    items: state.items,
    head: state.head,
    stickers: state.stickers,
  }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `haftalik-${todayISO()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  document.querySelector(".menu")?.removeAttribute("open");
}

function onClick(event) {
  if (dragHappened) {
    dragHappened = false;
    return;
  }
  const check = event.target.closest("[data-check]");
  if (check) {
    event.preventDefault();
    toggleDone(check.dataset.id, check.dataset.date);
    return;
  }
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const { action, id, date, kind, view, theme } = el.dataset;
  switch (action) {
    case "prev": shift(-1); break;
    case "next": shift(1); break;
    case "today": goToday(); break;
    case "set-view": setView(view); break;
    case "set-theme": setTheme(theme); break;
    case "new-plan":
      openEditor({
        kind: "appointment",
        date: state.view === "day" ? state.cursor : (state.trayOpen ? state.selected : todayISO()),
      });
      break;
    case "select":
      if (state.trayOpen && state.selected === date) state.trayOpen = false;
      else {
        state.selected = date;
        state.trayOpen = true;
      }
      paint();
      break;
    case "focus-day":
      state.selected = date;
      state.trayOpen = true;
      paint();
      break;
    case "chip":
      if (state.trayOpen && state.selected === date) openEditor({ id });
      else {
        state.selected = date;
        state.trayOpen = true;
        paint();
      }
      break;
    case "open":
      openEditor({ id });
      break;
    case "add":
      state.selected = date;
      if (state.view === "month") state.trayOpen = true;
      paint();
      openEditor({ date, kind: kind || "task" });
      break;
    case "add-routine":
      openEditor({ kind: "routine", weekdays: [weekdayIndex(todayISO())] });
      break;
    case "open-day":
      state.cursor = date;
      state.selected = date;
      state.view = "day";
      state.trayOpen = false;
      save();
      paint();
      break;
    case "close-tray":
      state.trayOpen = false;
      paint();
      break;
    case "unschedule":
      moveTo(id, null);
      break;
    case "delete":
      removeItem(id);
      break;
    case "remove-decal":
      moveSticker(id, null);
      break;
    case "close-dialog":
      editor.close();
      break;
    case "export":
      exportData();
      break;
    case "import":
      document.getElementById("import-file").click();
      break;
    default:
      break;
  }
}

function bind() {
  document.addEventListener("click", onClick);
  document.addEventListener("dblclick", (event) => {
    const cell = event.target.closest(".day-cell");
    if (!cell || event.target.closest(".chip, button")) return;
    state.cursor = cell.dataset.date;
    state.selected = cell.dataset.date;
    state.view = "day";
    state.trayOpen = false;
    save();
    paint();
  });
  document.addEventListener("keydown", (event) => {
    if (editor.open) return;
    const roleButton = event.target.getAttribute?.("role") === "button";
    if (event.target.closest("button, [role='button'], a, input, textarea, select, summary")) {
      if (roleButton && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.target.click();
      }
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); shift(-1); }
    else if (event.key === "ArrowRight") { event.preventDefault(); shift(1); }
    else if (event.key === "t" || event.key === "T") goToday();
    else if (event.key === "n" || event.key === "N") document.getElementById("sticky-text")?.focus();
    else if (event.key === "1") setView("month");
    else if (event.key === "2") setView("week");
    else if (event.key === "3") setView("day");
    else if (event.key === "Escape" && state.trayOpen) {
      state.trayOpen = false;
      paint();
    }
  });
  document.addEventListener("dragstart", (event) => {
    if (event.target.closest("[data-check], [data-action='delete'], [data-action='unschedule'], .decal-x")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const el = event.target.closest("[data-drag]");
    if (!el || !event.dataTransfer) return;
    draggedId = el.dataset.drag;
    dragHappened = true;
    dragEl = el;
    el.classList.add("is-dragging-item");
    event.dataTransfer.setData("text/plain", draggedId);
    event.dataTransfer.effectAllowed = "move";
    document.body.classList.add("is-dragging");
  }, true);
  document.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-drop]");
    if (!zone || !draggedId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    if (overZone !== zone) {
      overZone?.classList.remove("is-over");
      zone.classList.add("is-over");
      overZone = zone;
    }
  });
  document.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-drop]");
    if (!zone || !draggedId) return;
    event.preventDefault();
    const token = draggedId;
    const date = zone.dataset.drop === "board" ? null : zone.dataset.date;
    const hour = zone.dataset.hour != null && zone.dataset.hour !== "" ? Number(zone.dataset.hour) : KEEP;
    draggedId = null;
    document.body.classList.remove("is-dragging");
    dragEl?.classList.remove("is-dragging-item");
    dragEl = null;
    clearOver();
    if (token.startsWith("stamp:")) {
      if (!date) toast("Stickerı bir günün üzerine bırak.");
      else placeSticker(token.slice(6), date);
      return;
    }
    if (token.startsWith("placed:")) {
      moveSticker(token.slice(7), date);
      return;
    }
    moveTo(token, date, hour);
  });
  document.addEventListener("dragend", () => {
    draggedId = null;
    document.body.classList.remove("is-dragging");
    dragEl?.classList.remove("is-dragging-item");
    dragEl = null;
    clearOver();
    setTimeout(() => { dragHappened = false; }, 0);
  });
  document.getElementById("sticky-form").addEventListener("submit", onStickySubmit);
  document.getElementById("head-text").addEventListener("input", (event) => {
    state.head.text = event.target.value.slice(0, 280);
    save();
  });
  document.getElementById("sticky-text").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      document.getElementById("sticky-form").requestSubmit();
    }
  });
  document.addEventListener("submit", (event) => {
    if (event.target.matches("[data-quick]")) onQuickSubmit(event);
  });
  planForm.addEventListener("submit", onPlanSubmit);
  planForm.kind.addEventListener("change", () => {
    showError("");
    syncDialogFields();
  });
  document.getElementById("delete-btn").addEventListener("click", () => {
    const id = planForm.dataset.id;
    editor.close();
    if (id) removeItem(id);
  });
  editor.addEventListener("click", (event) => {
    if (event.target === editor) editor.close();
  });
  document.getElementById("toast-undo").addEventListener("click", () => {
    const action = toastAction;
    toastAction = null;
    document.getElementById("toast").hidden = true;
    clearTimeout(toastTimer);
    action?.();
  });
  document.getElementById("import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(items)) throw new Error("format");
      if (!confirm("Mevcut plan, dosyadaki kayıtlarla değiştirilecek. Devam edilsin mi?")) return;
      state.items = items.map(hydrate).filter((item) => item.title);
      if (data && !Array.isArray(data) && data.head) state.head = hydrateHead(data.head);
      if (data && !Array.isArray(data) && Array.isArray(data.stickers)) {
        state.stickers = data.stickers.map(hydrateSticker).filter(Boolean);
      }
      save();
      paint();
      toast(`${state.items.length} kayıt alındı.`);
    } catch {
      toast("Bu dosya okunamadı.");
    }
    document.querySelector(".menu")?.removeAttribute("open");
  });
}

function init() {
  const today = todayISO();
  state.cursor = today;
  state.selected = today;
  const saved = readStore();
  if (saved) {
    state.view = ["month", "week", "day"].includes(saved.view) ? saved.view : "month";
    state.cursor = isISO(saved.cursor) ? saved.cursor : today;
    state.selected = state.cursor;
    state.lastColor = safeColor(saved.lastColor || "amber");
    state.theme = THEMES.includes(saved.theme) ? saved.theme : "bordo";
    state.head = hydrateHead(saved.head);
    state.stickers = Array.isArray(saved.stickers) ? saved.stickers.map(hydrateSticker).filter(Boolean) : [];
    state.items = (Array.isArray(saved.items) ? saved.items : []).map(hydrate).filter((item) => item.title);
  } else {
    state.items = seedItems();
    state.head = hydrateHead({ text: "Bugün önemli olanı buraya yaz." });
    state.stickers = [];
    save();
  }
  const params = new URLSearchParams(location.search);
  if (THEMES.includes(params.get("tema"))) state.theme = params.get("tema");
  if (["month", "week", "day"].includes(params.get("gorunum"))) state.view = params.get("gorunum");
  applyTheme(state.theme);
  setStickyColor(state.lastColor);
  bind();
  paint();
}

HaftalikAuth.onReady(init);
