function mesaiKey() {
  return HaftalikAuth.storageKey("haftalik.mesai.v1");
}
function planKey() {
  return HaftalikAuth.storageKey("haftalik.v1");
}
const THEMES = ["bordo", "lacivert", "beyaz", "koyu"];
const THEME_BAR = { bordo: "#4a1d2a", lacivert: "#12243d", beyaz: "#ece7e2", koyu: "#0c0e12" };

let form;
let listNode;
let sumNode;
let saveBtn;
let rows = [];
let editingId = "";

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

function xml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[ch]));
}

function todayISO() {
  const date = new Date();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function isISO(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function formatDate(iso) {
  if (!isISO(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
}

function formatHours(hours) {
  const text = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(hours);
  return `${text} sa`;
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

function loadRows() {
  try {
    const data = JSON.parse(localStorage.getItem(mesaiKey()) || "[]");
    rows = Array.isArray(data) ? data.map(hydrate).filter(Boolean) : [];
  } catch {
    rows = [];
  }
}

function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
}

function hoursBetween(start, end) {
  if (!isTime(start) || !isTime(end)) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes === 0) return null;
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.round((minutes / 60) * 100) / 100;
  return hours > 0 && hours <= 24 ? hours : null;
}

function hydrate(item) {
  const name = String(item?.name || "").trim().slice(0, 80);
  const start = isTime(item?.start) ? item.start : null;
  const end = isTime(item?.end) ? item.end : null;
  let hours = Number(item?.hours);
  if (start && end) hours = hoursBetween(start, end);
  if (!name || !isISO(item?.date) || !Number.isFinite(hours) || hours <= 0 || hours > 24) return null;
  return {
    id: String(item.id || uid()),
    name,
    date: item.date,
    start,
    end,
    hours: Math.round(hours * 100) / 100,
    note: String(item.note || "").trim().slice(0, 800),
    createdAt: Number(item.createdAt) || Date.now(),
  };
}

function saveRows() {
  localStorage.setItem(mesaiKey(), JSON.stringify(rows));
}

function sortedRows() {
  return rows.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function resetForm() {
  editingId = "";
  form.reset();
  form.date.value = todayISO();
  saveBtn.textContent = "Ekle";
}

function paint() {
  const items = sortedRows();
  const total = items.reduce((sum, item) => sum + item.hours, 0);
  sumNode.textContent = items.length
    ? `${items.length} kayıt · toplam ${formatHours(total)}`
    : "Başlangıç ve bitiş yazılınca süre kendisi dolar. Gece yarısını geçen mesai de sayılır.";
  document.getElementById("export-xlsx").disabled = items.length === 0;
  if (!items.length) {
    listNode.innerHTML = "";
    return;
  }
  listNode.innerHTML = `<div class="mesai-table-wrap"><table class="mesai-table">
    <thead><tr><th>İsim</th><th>Tarih</th><th>Başlangıç</th><th>Bitiş</th><th>Süre</th><th>Ne iş yapıldı</th><th></th></tr></thead>
    <tbody>${items.map((item) => `<tr>
      <td>${esc(item.name)}</td>
      <td>${esc(formatDate(item.date))}</td>
      <td class="mesai-hours">${esc(item.start || "—")}</td>
      <td class="mesai-hours">${esc(item.end || "—")}</td>
      <td class="mesai-hours">${esc(formatHours(item.hours))}</td>
      <td class="mesai-note">${esc(item.note) || "—"}</td>
      <td class="mesai-actions">
        <button type="button" class="text-btn" data-edit="${esc(item.id)}">Düzenle</button>
        <button type="button" class="text-btn" data-delete="${esc(item.id)}">Sil</button>
      </td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function onSubmit(event) {
  event.preventDefault();
  const data = new FormData(form);
  const start = String(data.get("start") || "");
  const end = String(data.get("end") || "");
  form.end.setCustomValidity("");
  if (isTime(start) && isTime(end) && !hoursBetween(start, end)) {
    form.end.setCustomValidity("Bitiş, başlangıçla aynı olamaz.");
    form.end.reportValidity();
    return;
  }
  const next = hydrate({
    id: editingId || uid(),
    name: data.get("name"),
    date: data.get("date"),
    start,
    end,
    hours: data.get("hours"),
    note: data.get("note"),
    createdAt: rows.find((item) => item.id === editingId)?.createdAt || Date.now(),
  });
  if (!next) {
    form.reportValidity();
    return;
  }
  if (editingId) rows = rows.map((item) => (item.id === editingId ? next : item));
  else rows.push(next);
  saveRows();
  resetForm();
  paint();
}

function startEdit(id) {
  const item = rows.find((row) => row.id === id);
  if (!item) return;
  editingId = id;
  form.name.value = item.name;
  form.date.value = item.date;
  form.start.value = item.start || "";
  form.end.value = item.end || "";
  form.hours.value = String(item.hours);
  form.note.value = item.note;
  saveBtn.textContent = "Güncelle";
  form.name.focus();
}

function removeRow(id) {
  const item = rows.find((row) => row.id === id);
  if (!item) return;
  if (!confirm(`${item.name} · ${formatDate(item.date)} kaydı silinsin mi?`)) return;
  rows = rows.filter((row) => row.id !== id);
  if (editingId === id) resetForm();
  saveRows();
  paint();
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function u16(value) {
  return [value & 255, (value >>> 8) & 255];
}

function u32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function concat(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.data);
    const crc = crc32(data);
    const local = concat([
      Uint8Array.from([0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]),
      name,
      data,
    ]);
    const central = concat([
      Uint8Array.from([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  });
  const centralStart = offset;
  const centralBlob = concat(centrals);
  const end = Uint8Array.from([
    0x50, 0x4b, 0x05, 0x06,
    ...u16(0), ...u16(0),
    ...u16(files.length), ...u16(files.length),
    ...u32(centralBlob.length), ...u32(centralStart),
    ...u16(0),
  ]);
  return concat([...locals, centralBlob, end]);
}

function columnName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function cell(ref, value, kind) {
  if (kind === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function sheetXml(items) {
  const headers = ["İsim", "Tarih", "Başlangıç", "Bitiş", "Saat", "Ne iş yapıldı"];
  const lines = [headers, ...items.map((item) => [item.name, item.date, item.start || "", item.end || "", item.hours, item.note])];
  const totalRow = lines.length + 1;
  const rowsXml = lines.map((line, rowIndex) => {
    const cells = line.map((value, col) => {
      const ref = `${columnName(col)}${rowIndex + 1}`;
      return cell(ref, value, rowIndex > 0 && col === 4 ? "number" : "text");
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const total = `<row r="${totalRow}"><c r="A${totalRow}" t="inlineStr"><is><t>Toplam</t></is></c><c r="E${totalRow}"><f>SUM(E2:E${lines.length})</f></c></row>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="24" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
    <col min="3" max="3" width="12" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="10" customWidth="1"/>
    <col min="6" max="6" width="48" customWidth="1"/>
  </cols>
  <sheetData>${rowsXml}${items.length ? total : ""}</sheetData>
</worksheet>`;
}

function buildMesaiXlsx(items) {
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Mesai" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(items) },
  ];
  return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function exportExcel() {
  const items = sortedRows();
  if (!items.length) return;
  const blob = buildMesaiXlsx(items);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mesai-${todayISO()}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}

function boot() {
  form = document.getElementById("mesai-form");
  listNode = document.getElementById("mesai-list");
  sumNode = document.getElementById("mesai-sum");
  saveBtn = document.getElementById("save-btn");
  const plan = readPlan();
  applyTheme(THEMES.includes(plan?.theme) ? plan.theme : "bordo");
  loadRows();
  form.date.value = todayISO();
  const fillHours = () => {
    const hours = hoursBetween(form.start.value, form.end.value);
    if (hours) form.hours.value = String(hours);
    form.end.setCustomValidity("");
  };
  form.start.addEventListener("input", fillHours);
  form.end.addEventListener("input", fillHours);
  paint();
  form.addEventListener("submit", onSubmit);
  listNode.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    if (edit) startEdit(edit.dataset.edit);
    if (del) removeRow(del.dataset.delete);
  });
  document.getElementById("export-xlsx").addEventListener("click", exportExcel);
  document.querySelectorAll(".theme-dot").forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.theme));
  });
}

globalThis.buildMesaiXlsx = buildMesaiXlsx;
if (typeof document !== "undefined") HaftalikAuth.onReady(boot);
