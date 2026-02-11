const CHECKBOX_KEY = "stajRehberiCheckboxes";
const TRACKER_KEY = "stajRehberiTrackerRows";

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
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function setupChecklistPersistence() {
  const saved = loadJson(CHECKBOX_KEY, {});
  const checkboxes = Array.from(document.querySelectorAll(".checklist input[type='checkbox'][data-key]"));

  checkboxes.forEach((input) => {
    const key = input.dataset.key;
    if (saved[key]) input.checked = true;

    input.addEventListener("change", () => {
      const state = loadJson(CHECKBOX_KEY, {});
      state[key] = input.checked;
      saveJson(CHECKBOX_KEY, state);
      const roleContainer = input.closest(".checklist");
      if (roleContainer?.dataset.role) updateRoleProgress(roleContainer.dataset.role);
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

function setupDecisionArea() {
  const decisionInputs = Array.from(document.querySelectorAll("#decisionChecklist input[type='checkbox']"));
  decisionInputs.forEach((input) => input.addEventListener("change", evaluateDecision));

  const resetButton = document.getElementById("resetChecks");
  const copyButton = document.getElementById("copyNotice");

  resetButton?.addEventListener("click", () => {
    decisionInputs.forEach((item) => {
      item.checked = false;
    });
    evaluateDecision();
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
    const fields = [
      "name",
      "no",
      "company",
      "start",
      "end",
      "document",
      "committee",
      "admin",
      "note"
    ];

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
  });

  clearRows?.addEventListener("click", () => {
    const ok = window.confirm("Tablodaki tüm satırlar temizlensin mi?");
    if (!ok) return;
    saveJson(TRACKER_KEY, []);
    renderTrackerRows([]);
  });

  exportCsv?.addEventListener("click", () => {
    const state = loadJson(TRACKER_KEY, []);
    exportTrackerCsv(state);
  });
}

function init() {
  setupTabs();
  setupChecklistPersistence();
  setupPlanner();
  setupDecisionArea();
  setupTrackerTable();
}

document.addEventListener("DOMContentLoaded", init);
