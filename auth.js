const HaftalikAuth = (() => {
  const SESSION = "haftalik.session";
  const ACCOUNTS = [
    { email: "sude.cinay@d1-tech.com", name: "Sude Cinay", pass: "03897c186c4cf5ca6b40019f78825f3b1b3925da5b435093d94920a61934b3bd" },
    { email: "arda.kocaoglu@d1-tech.com", name: "Arda Kocaoğlu", pass: "28858a84f5a04b561a26c1c0151f9c0bd789984808010f78b51f9d31b2c06842" },
  ];

  function accountByEmail(email) {
    const next = String(email || "").trim().toLowerCase();
    return ACCOUNTS.find((account) => account.email === next) || null;
  }

  function currentEmail() {
    return sessionStorage.getItem(SESSION) || "";
  }

  function currentAccount() {
    return accountByEmail(currentEmail());
  }

  function storageKey(base) {
    const email = currentEmail();
    return email ? `${base}:${email}` : base;
  }

  function adoptLegacy(base, email) {
    const scoped = `${base}:${email}`;
    if (localStorage.getItem(scoped) != null) return;
    const legacy = localStorage.getItem(base);
    if (legacy == null) return;
    localStorage.setItem(scoped, legacy);
    localStorage.removeItem(base);
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function showApp(account) {
    document.body.classList.remove("is-locked");
    const gate = document.getElementById("gate");
    if (gate) gate.hidden = true;
    const who = document.getElementById("who");
    const logout = document.getElementById("logout-btn");
    if (who) {
      who.hidden = false;
      who.textContent = account.name;
    }
    if (logout) logout.hidden = false;
  }

  function showGate() {
    document.body.classList.add("is-locked");
    const gate = document.getElementById("gate");
    if (gate) gate.hidden = false;
  }

  function enter(account) {
    sessionStorage.setItem(SESSION, account.email);
    adoptLegacy("haftalik.v1", account.email);
    adoptLegacy("haftalik.mesai.v1", account.email);
    showApp(account);
    document.dispatchEvent(new Event("haftalik-auth"));
  }

  function onReady(fn) {
    document.addEventListener("haftalik-auth", () => fn());
  }

  function mount() {
    const gate = document.getElementById("gate");
    const form = document.getElementById("gate-form");
    const error = document.getElementById("gate-error");
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION);
      location.href = "index.html";
    });
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const account = accountByEmail(data.get("email"));
      const digest = await sha256(String(data.get("password") || ""));
      if (!account || digest !== account.pass) {
        if (error) {
          error.hidden = false;
          error.textContent = "E-posta veya şifre uyuşmuyor.";
        }
        return;
      }
      if (error) error.hidden = true;
      enter(account);
    });
    const account = currentAccount();
    if (account) enter(account);
    else showGate();
  }

  return { onReady, storageKey, mount };
})();

document.addEventListener("DOMContentLoaded", () => HaftalikAuth.mount());
