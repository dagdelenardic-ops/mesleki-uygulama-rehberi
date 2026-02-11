const CHECKBOX_KEY = "stajRehberiCheckboxes";
const TRACKER_KEY = "stajRehberiTrackerRows";
const DECISION_FORM_KEY = "stajRehberiDecisionForm";
const COMMISSION_AUTH_KEY = "stajRehberiCommissionAuth";
const COMMISSION_PASSWORD = "Medipol1453";
const COMMISSION_POLL_MS = 8000;
const COMMISSION_PUSH_DEBOUNCE_MS = 700;

let commissionSyncUrl = "";
let commissionSyncActive = false;
let commissionPendingLocal = false;
let commissionRemoteFingerprint = "";
let commissionPollTimer = null;
let commissionPushTimer = null;
let commissionIsPulling = false;
let commissionIsPushing = false;

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isCommissionPage() {
  return Boolean(document.getElementById("commissionContent"));
}

function emitCommissionLocalChange() {
  if (!isCommissionPage()) return;
  window.dispatchEvent(new Event("commission:local-change"));
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const panel = document.getElementById(target);
      if (panel) panel.classList.add("active");
    });
  });
}

function updateRoleProgress(role) {
  const list = document.querySelector(`.checklist[data-role="${role}"]`);
  if (!list) return;

  const checks = Array.from(list.querySelectorAll("input[type='checkbox']"));
  const done = checks.filter((item) => item.checked).length;
  const percent = checks.length ? Math.round((done / checks.length) * 100) : 0;

  const target = document.querySelector(`[data-progress-for="${role}"]`);
  if (target) target.textContent = `${percent}%`;
}

function applyChecklistStateFromStorage() {
  const saved = loadJson(CHECKBOX_KEY, {});
  const checkboxes = Array.from(document.querySelectorAll(".checklist input[type='checkbox'][data-key]"));
  checkboxes.forEach((input) => {
    const key = input.dataset.key;
    input.checked = Boolean(key && saved[key]);
  });
}

function setupChecklistPersistence() {
  applyChecklistStateFromStorage();
  const checkboxes = Array.from(document.querySelectorAll(".checklist input[type='checkbox'][data-key]"));

  checkboxes.forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.key;
      if (!key) return;

      const state = loadJson(CHECKBOX_KEY, {});
      state[key] = input.checked;
      saveJson(CHECKBOX_KEY, state);

      const roleContainer = input.closest(".checklist");
      if (roleContainer?.dataset.role) updateRoleProgress(roleContainer.dataset.role);

      const isStudentItem = roleContainer?.dataset.role === "student";
      if (isCommissionPage() && !isStudentItem) {
        emitCommissionLocalChange();
      }
    });
  });

  ["student", "secretary", "assistant", "faculty"].forEach(updateRoleProgress);
}

function setupPlanner() {
  const input = document.getElementById("submissionDate");
  const plus15 = document.getElementById("datePlus15");
  const plus20 = document.getElementById("datePlus20");

  if (!input || !plus15 || !plus20) return;

  const render = () => {
    if (!input.value) {
      plus15.textContent = "-";
      plus20.textContent = "-";
      return;
    }

    const base = new Date(`${input.value}T00:00:00`);
    plus15.textContent = formatDate(addDays(base, 15));
    plus20.textContent = formatDate(addDays(base, 20));
  };

  input.addEventListener("change", render);
  render();
}

function setupCommissionAuth() {
  const authGate = document.getElementById("authGate");
  const content = document.getElementById("commissionContent");
  const input = document.getElementById("commissionPassword");
  const loginButton = document.getElementById("commissionLogin");
  const message = document.getElementById("authMessage");
  const logoutButton = document.getElementById("commissionLogout");

  if (!authGate || !content || !input || !loginButton || !message) return;

  const unlock = () => {
    authGate.hidden = true;
    content.hidden = false;
    content.classList.add("unlocked");
    document.dispatchEvent(new Event("commission:unlocked"));
  };

  const lock = () => {
    sessionStorage.removeItem(COMMISSION_AUTH_KEY);
    content.hidden = true;
    authGate.hidden = false;
    input.value = "";
    message.textContent = "";
    content.classList.remove("unlocked");
    document.dispatchEvent(new Event("commission:locked"));
  };

  if (sessionStorage.getItem(COMMISSION_AUTH_KEY) === "ok") {
    unlock();
  } else {
    lock();
  }

  const tryLogin = () => {
    const value = input.value.trim();
    if (value === COMMISSION_PASSWORD) {
      sessionStorage.setItem(COMMISSION_AUTH_KEY, "ok");
      unlock();
      message.textContent = "";
      return;
    }
    message.textContent = "Şifre hatalı. Lütfen tekrar deneyin.";
  };

  loginButton.addEventListener("click", tryLogin);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      tryLogin();
    }
  });
  logoutButton?.addEventListener("click", lock);
}

function evaluateDecision() {
  const mustChecks = Array.from(document.querySelectorAll("#decisionChecklist input[data-decision='must']"));
  const isOnline = document.getElementById("isOnline")?.checked;
  const onlineApproved = document.getElementById("onlineApproved")?.checked;
  const box = document.getElementById("decisionBox");
  if (!box) return;

  const requiredOk = mustChecks.every((item) => item.checked);
  const onlineOk = !isOnline || onlineApproved;

  box.classList.remove("ok", "warn");

  if (requiredOk && onlineOk) {
    box.classList.add("ok");
    box.innerHTML = "Ön karar: <strong>Onaya Uygun</strong>";
    return;
  }

  box.classList.add("warn");
  if (!requiredOk) {
    box.innerHTML = "Ön karar: <strong>Eksik Evrak/Kriter Var</strong>";
    return;
  }

  box.innerHTML = "Ön karar: <strong>Online Staj İçin Komisyon Onayı Bekleniyor</strong>";
}

function copyNoticeTemplate() {
  const studentName = document.getElementById("studentName")?.value.trim() || "[Öğrenci Ad Soyad]";
  const studentNo = document.getElementById("studentNo")?.value.trim() || "[Öğrenci No]";
  const companyName = document.getElementById("companyName")?.value.trim() || "[Kurum Adı]";
  const startDate = document.getElementById("startDate")?.value || "[Başlangıç Tarihi]";
  const endDate = document.getElementById("endDate")?.value || "[Bitiş Tarihi]";
  const resultText = (document.getElementById("decisionBox")?.textContent || "").replace(/\s+/g, " ").trim();

  const text = `Konu: Mesleki Uygulama Onay/SGK Bildirimi\n\n${studentNo} numaralı ${studentName} isimli öğrencinin ${startDate} - ${endDate} tarihleri arasında ${companyName} kurumunda mesleki uygulama yapması bölüm mesleki uygulama komisyonu tarafından değerlendirilmiştir.\nÖn değerlendirme sonucu: ${resultText}.\nGerekli idari ve SGK işlemlerinin bu değerlendirmeye göre başlatılması/izlenmesi hususunda gereğini arz ederim.`;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const button = document.getElementById("copyNotice");
      if (!button) return;
      const old = button.textContent;
      button.textContent = "Kopyalandı";
      setTimeout(() => {
        button.textContent = old;
      }, 1300);
    })
    .catch(() => {
      alert("Kopyalama başarısız oldu. Lütfen tarayıcı izinlerini kontrol edin.");
    });
}

function restoreDecisionForm() {
  const saved = loadJson(DECISION_FORM_KEY, {});
  const fields = ["studentName", "studentNo", "companyName", "startDate", "endDate"];
  fields.forEach((id) => {
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement)) return;
    const value = saved[id];
    if (typeof value === "string") {
      input.value = value;
    }
  });
}

function persistDecisionForm() {
  const fields = ["studentName", "studentNo", "companyName", "startDate", "endDate"];
  const next = {};
  fields.forEach((id) => {
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) {
      next[id] = input.value;
    }
  });
  saveJson(DECISION_FORM_KEY, next);
}

function setupDecisionArea() {
  const decisionInputs = Array.from(document.querySelectorAll("#decisionChecklist input[type='checkbox']"));
  const decisionFields = Array.from(
    document.querySelectorAll("#studentName, #studentNo, #companyName, #startDate, #endDate")
  );

  restoreDecisionForm();

  decisionInputs.forEach((input) => {
    input.addEventListener("change", () => {
      evaluateDecision();
      if (!input.dataset.key && isCommissionPage()) {
        emitCommissionLocalChange();
      }
    });
  });

  decisionFields.forEach((input) => {
    input.addEventListener("input", () => {
      persistDecisionForm();
      if (isCommissionPage()) emitCommissionLocalChange();
    });
    input.addEventListener("change", () => {
      persistDecisionForm();
      if (isCommissionPage()) emitCommissionLocalChange();
    });
  });

  const resetButton = document.getElementById("resetChecks");
  const copyButton = document.getElementById("copyNotice");

  resetButton?.addEventListener("click", () => {
    const checkboxState = loadJson(CHECKBOX_KEY, {});
    decisionInputs.forEach((item) => {
      item.checked = false;
      if (item.dataset.key) checkboxState[item.dataset.key] = false;
    });
    saveJson(CHECKBOX_KEY, checkboxState);
    evaluateDecision();
    if (isCommissionPage()) emitCommissionLocalChange();
  });

  copyButton?.addEventListener("click", copyNoticeTemplate);
  evaluateDecision();
}

function renderTrackerRows(rows) {
  const body = document.getElementById("trackerBody");
  if (!body) return;

  body.innerHTML = "";

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    const fields = ["name", "no", "company", "start", "end", "document", "committee", "admin", "note"];

    fields.forEach((field) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = row[field] || "";
      input.dataset.index = String(index);
      input.dataset.field = field;
      input.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        const state = loadJson(TRACKER_KEY, []);
        const rowIndex = Number(target.dataset.index);
        const key = target.dataset.field;
        if (!state[rowIndex] || !key) return;

        state[rowIndex][key] = target.value;
        saveJson(TRACKER_KEY, state);
        if (isCommissionPage()) emitCommissionLocalChange();
      });

      td.appendChild(input);
      tr.appendChild(td);
    });

    const action = document.createElement("td");
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Sil";
    del.className = "icon-btn";
    del.addEventListener("click", () => {
      const state = loadJson(TRACKER_KEY, []);
      state.splice(index, 1);
      saveJson(TRACKER_KEY, state);
      renderTrackerRows(state);
      if (isCommissionPage()) emitCommissionLocalChange();
    });
    action.appendChild(del);
    tr.appendChild(action);

    body.appendChild(tr);
  });
}

function exportTrackerCsv(rows) {
  const headers = [
    "Ad Soyad",
    "Öğrenci No",
    "Kurum",
    "Başlangıç",
    "Bitiş",
    "Evrak Durumu",
    "Komisyon",
    "İdari Bildirim",
    "Not"
  ];

  const csvRows = [headers.join(",")];

  rows.forEach((row) => {
    const values = [
      row.name,
      row.no,
      row.company,
      row.start,
      row.end,
      row.document,
      row.committee,
      row.admin,
      row.note
    ].map((value) => `"${String(value || "").replace(/"/g, '""')}"`);

    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mesleki-uygulama-takip.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function setupTrackerTable() {
  const initial = loadJson(TRACKER_KEY, []);
  renderTrackerRows(initial);

  const addRow = document.getElementById("addRow");
  const clearRows = document.getElementById("clearRows");
  const exportCsv = document.getElementById("exportCsv");

  addRow?.addEventListener("click", () => {
    const state = loadJson(TRACKER_KEY, []);
    state.push({
      name: "",
      no: "",
      company: "",
      start: "",
      end: "",
      document: "",
      committee: "",
      admin: "",
      note: ""
    });
    saveJson(TRACKER_KEY, state);
    renderTrackerRows(state);
    if (isCommissionPage()) emitCommissionLocalChange();
  });

  clearRows?.addEventListener("click", () => {
    const ok = window.confirm("Tablodaki tüm satırlar temizlensin mi?");
    if (!ok) return;
    saveJson(TRACKER_KEY, []);
    renderTrackerRows([]);
    if (isCommissionPage()) emitCommissionLocalChange();
  });

  exportCsv?.addEventListener("click", () => {
    const state = loadJson(TRACKER_KEY, []);
    exportTrackerCsv(state);
  });
}

function normalizeCommissionSnapshot(value) {
  if (!value || typeof value !== "object") return null;

  const checkboxes =
    value.checkboxes && typeof value.checkboxes === "object" && !Array.isArray(value.checkboxes)
      ? value.checkboxes
      : {};

  const trackerRows = Array.isArray(value.trackerRows) ? value.trackerRows : [];

  const decisionForm =
    value.decisionForm && typeof value.decisionForm === "object" && !Array.isArray(value.decisionForm)
      ? value.decisionForm
      : {};

  return {
    checkboxes,
    trackerRows,
    decisionForm,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : ""
  };
}

function getCommissionSnapshot() {
  return {
    checkboxes: loadJson(CHECKBOX_KEY, {}),
    trackerRows: loadJson(TRACKER_KEY, []),
    decisionForm: loadJson(DECISION_FORM_KEY, {}),
    updatedAt: new Date().toISOString()
  };
}

function fingerprintCommissionSnapshot(snapshot) {
  return JSON.stringify({
    checkboxes: snapshot.checkboxes || {},
    trackerRows: Array.isArray(snapshot.trackerRows) ? snapshot.trackerRows : [],
    decisionForm: snapshot.decisionForm || {}
  });
}

function applyCommissionSnapshot(snapshot) {
  saveJson(CHECKBOX_KEY, snapshot.checkboxes);
  saveJson(TRACKER_KEY, snapshot.trackerRows);
  saveJson(DECISION_FORM_KEY, snapshot.decisionForm);

  applyChecklistStateFromStorage();
  restoreDecisionForm();
  renderTrackerRows(snapshot.trackerRows);
  ["secretary", "assistant", "faculty"].forEach(updateRoleProgress);
  evaluateDecision();
}

async function fetchCommissionRemoteSnapshot() {
  if (!commissionSyncUrl) return null;
  const response = await fetch(commissionSyncUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return normalizeCommissionSnapshot(data);
}

async function pushCommissionRemoteSnapshot() {
  if (!commissionSyncUrl || !commissionSyncActive || commissionIsPushing) return;
  commissionIsPushing = true;
  try {
    const snapshot = getCommissionSnapshot();
    const response = await fetch(commissionSyncUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    commissionRemoteFingerprint = fingerprintCommissionSnapshot(snapshot);
    commissionPendingLocal = false;
  } catch (error) {
    console.error("Komisyon verisi buluta yazılamadı:", error);
  } finally {
    commissionIsPushing = false;
  }
}

async function pullCommissionRemoteSnapshot() {
  if (!commissionSyncUrl || !commissionSyncActive || commissionIsPulling || commissionPendingLocal) return;
  commissionIsPulling = true;
  try {
    const remoteSnapshot = await fetchCommissionRemoteSnapshot();
    if (!remoteSnapshot) return;

    const nextFingerprint = fingerprintCommissionSnapshot(remoteSnapshot);
    if (nextFingerprint !== commissionRemoteFingerprint) {
      applyCommissionSnapshot(remoteSnapshot);
      commissionRemoteFingerprint = nextFingerprint;
    }
  } catch (error) {
    console.error("Komisyon verisi buluttan okunamadı:", error);
  } finally {
    commissionIsPulling = false;
  }
}

function scheduleCommissionPush() {
  if (!commissionSyncUrl || !commissionSyncActive) return;
  commissionPendingLocal = true;
  if (commissionPushTimer) window.clearTimeout(commissionPushTimer);
  commissionPushTimer = window.setTimeout(() => {
    void pushCommissionRemoteSnapshot();
  }, COMMISSION_PUSH_DEBOUNCE_MS);
}

async function startCommissionSync() {
  if (!commissionSyncUrl || commissionSyncActive) return;
  commissionSyncActive = true;
  commissionPendingLocal = false;

  try {
    const remoteSnapshot = await fetchCommissionRemoteSnapshot();
    if (remoteSnapshot) {
      applyCommissionSnapshot(remoteSnapshot);
      commissionRemoteFingerprint = fingerprintCommissionSnapshot(remoteSnapshot);
    } else {
      await pushCommissionRemoteSnapshot();
    }
  } catch (error) {
    console.error("Komisyon senkronizasyonu başlatılamadı:", error);
  }

  commissionPollTimer = window.setInterval(() => {
    void pullCommissionRemoteSnapshot();
  }, COMMISSION_POLL_MS);
}

function stopCommissionSync() {
  commissionSyncActive = false;
  commissionPendingLocal = false;
  if (commissionPollTimer) {
    window.clearInterval(commissionPollTimer);
    commissionPollTimer = null;
  }
  if (commissionPushTimer) {
    window.clearTimeout(commissionPushTimer);
    commissionPushTimer = null;
  }
}

function setupCommissionSharedSync() {
  if (!isCommissionPage()) return;

  commissionSyncUrl = typeof window.STAJ_COMMISSION_REMOTE_URL === "string" ? window.STAJ_COMMISSION_REMOTE_URL.trim() : "";
  if (!commissionSyncUrl) {
    console.warn(
      "STAJ_COMMISSION_REMOTE_URL tanımlı değil. Komisyon verileri yalnızca bu cihaza kaydedilir."
    );
    return;
  }

  window.addEventListener("commission:local-change", scheduleCommissionPush);
  document.addEventListener("commission:unlocked", () => {
    void startCommissionSync();
  });
  document.addEventListener("commission:locked", stopCommissionSync);

  if (sessionStorage.getItem(COMMISSION_AUTH_KEY) === "ok") {
    void startCommissionSync();
  }
}

function init() {
  setupCommissionAuth();
  setupTabs();
  setupChecklistPersistence();
  setupPlanner();
  setupDecisionArea();
  setupTrackerTable();
  setupCommissionSharedSync();
}

document.addEventListener("DOMContentLoaded", init);
