
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = "medisync-demo-records-v1";
const ACTIVITY_KEY = "medisync-demo-activity-v1";

function loadData(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let records = loadData(STORAGE_KEY);
let activities = loadData(ACTIVITY_KEY);
let toastTimer;

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    showToast("Unable to save. Browser storage may be full or disabled.");
    return false;
  }
}

function saveActivities() {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities.slice(0, 100)));
  } catch {
    // Keep the current page usable if storage is unavailable.
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function logActivity(message, icon = "✓") {
  activities.unshift({
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    message,
    icon,
    time: new Date().toISOString()
  });
  activities = activities.slice(0, 100);
  saveActivities();
  renderActivity();
}

function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        day: "2-digit", month: "short", year: "numeric"
      });
}

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function statusBadge(record) {
  return record.status === "synced"
    ? '<span class="status-pill synced">✓ Synced</span>'
    : '<span class="status-pill pending">◷ Pending</span>';
}

function uniquePatients() {
  return new Set(records.map(record => record.patientId)).size;
}

function renderDashboard() {
  const pending = records.filter(record => record.status !== "synced").length;
  const synced = records.length - pending;
  const percent = records.length ? Math.round(synced / records.length * 100) : 0;

  $("#total-patients").textContent = uniquePatients();
  $("#total-visits").textContent = records.length;
  $("#pending-count").textContent = pending;
  $("#synced-count").textContent = synced;
  $("#sync-percent").textContent = percent + "%";
  $("#sync-progress").style.width = percent + "%";

  const latest = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  $("#recent-table").innerHTML = latest.map(record => `
    <tr>
      <td><div class="patient-name">${escapeHTML(record.name)}</div>
          <div class="patient-id">${escapeHTML(record.patientId)}</div></td>
      <td>${escapeHTML(formatDate(record.date))}</td>
      <td>${statusBadge(record)}</td>
    </tr>`).join("");

  $("#recent-empty").hidden = latest.length > 0;
}

function renderPatients() {
  const search = ($("#patient-search").value || "").trim().toLowerCase();
  const filtered = [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(record => [record.name, record.patientId, record.notes]
      .some(value => String(value || "").toLowerCase().includes(search)));

  $("#patients-table").innerHTML = filtered.map(record => `
    <tr>
      <td>${escapeHTML(record.patientId)}</td>
      <td><div class="patient-name">${escapeHTML(record.name)}</div>
          <div class="patient-id">${escapeHTML(record.visitType)}</div></td>
      <td>${escapeHTML(formatDate(record.date))}</td>
      <td>${escapeHTML(record.notes.slice(0, 65))}${record.notes.length > 65 ? "…" : ""}</td>
      <td>${statusBadge(record)}</td>
    </tr>`).join("");

  $("#patients-empty").hidden = filtered.length > 0;
  $("#patient-subtitle").textContent =
    `${filtered.length} visit record${filtered.length === 1 ? "" : "s"} shown`;
}

function renderSync() {
  const pending = records.filter(record => record.status !== "synced").length;
  $("#sync-pending").textContent = pending;
  $("#sync-done").textContent = records.length - pending;

  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("#sync-table").innerHTML = sorted.map(record => `
    <tr>
      <td>${escapeHTML(record.id)}</td>
      <td>${escapeHTML(record.name)}</td>
      <td>${escapeHTML(formatTime(record.createdAt))}</td>
      <td>${statusBadge(record)}</td>
    </tr>`).join("");

  $("#sync-empty").hidden = sorted.length > 0;
  updateConnection();
}

function renderActivity() {
  const render = activities.slice(0, 20).map(item => `
    <div class="activity-item">
      <div class="activity-icon">${escapeHTML(item.icon)}</div>
      <div class="activity-copy">
        <p>${escapeHTML(item.message)}</p>
        <small>${escapeHTML(formatTime(item.time))}</small>
      </div>
    </div>`).join("");

  $("#dashboard-activity").innerHTML = render;
  $("#full-activity").innerHTML = render;
  $("#activity-empty").hidden = activities.length > 0;
}

function renderAll() {
  renderDashboard();
  renderPatients();
  renderSync();
  renderActivity();
}

function updateConnection() {
  const online = navigator.onLine;
  $("#connection-label").textContent = online ? "Browser is online" : "Browser is offline";
  $("#connection-detail").textContent = online ? "Local demo mode" : "Local mode";
  $("#sync-connection-title").textContent = online ? "Browser is online" : "Browser is offline";
  $("#sync-connection-description").textContent = online
    ? "The browser reports a network connection. No server sync is configured."
    : "Your browser reports no network connection. Locally saved demo records remain available.";
  $("#network-pill").textContent = online ? "Online" : "Offline";
  $("#network-pill").className = "status-pill " + (online ? "synced" : "offline");
}

function navigate(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return;

  $$(".page").forEach(item => item.classList.toggle("active", item.id === pageId));
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.page === pageId));

  const activeButton = $(`.nav-link[data-page="${pageId}"]`);
  $("#breadcrumb").textContent = activeButton
    ? activeButton.querySelector("span").textContent
    : "Dashboard";

  $(".sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "patients") renderPatients();
  if (pageId === "sync") renderSync();
}

$$("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    navigate(button.dataset.page);
  });
});

$$("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("#menu-toggle").addEventListener("click", () => {
  $(".sidebar").classList.toggle("open");
});

$("#patient-search").addEventListener("input", renderPatients);

$("#visit-form").elements.date.value = new Date().toLocaleDateString("en-CA");



$("#visit-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

  const record = {
    id: "VIS-" + Date.now().toString(36).toUpperCase(),
    name: String(data.get("name") || "").trim(),
    patientId:
      String(data.get("patientId") || "").trim() ||
      "P-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    date: String(data.get("date") || ""),
    visitType: String(data.get("visitType") || ""),
    notes: String(data.get("notes") || "").trim(),
    plan: String(data.get("plan") || "").trim(),
    createdAt: new Date().toISOString()
  };

  const message = $("#form-message");
  message.textContent = "Saving visit to the server...";

  try {
    const response = await fetch(`${API_URL}/visits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(record)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail
          ? JSON.stringify(result.detail)
          : "Request failed with status " + response.status
      );
    }

    console.log("Visit saved to SQLite:", result);

    // Keep the website's local record list updated too.
    records.unshift({ ...record, status: "synced" });

    if (!saveRecords()) {
      records.shift();
      throw new Error("The server saved the visit, but local saving failed.");
    }

    logActivity("Saved visit to the server for " + record.name, "+");
    renderAll();

    message.textContent = "Visit successfully saved to the server and SQLite.";
    showToast("Visit saved successfully");

    form.reset();
    form.elements.date.value = new Date().toLocaleDateString("en-CA");

    navigate("patients");
  } catch (error) {
    console.error("Could not save visit:", error);
    message.textContent =
      "Could not confirm saving: " + error.message;
  }
});



$("#sync-button").addEventListener("click", () => {
  if (!navigator.onLine) {
    $("#sync-message").textContent = "You're offline. Reconnect before running the demo sync.";
    showToast("Browser is offline");
    return;
  }

  const pending = records.filter(record => record.status !== "synced");
  if (!pending.length) {
    $("#sync-message").textContent = "No pending records to process.";
    showToast("Nothing to sync");
    return;
  }

  // Simulation only: no server receives these records.
  records = records.map(record => ({ ...record, status: "synced" }));
  if (!saveRecords()) {
    records = records.map(record => ({ ...record, status: "pending" }));
    return;
  }

  logActivity("Demo sync marked " + pending.length + " record(s) as synced locally", "⇄");
  renderAll();
  $("#sync-message").textContent =
    `${pending.length} record(s) marked synced in this browser demo. No server upload occurred.`;
  showToast("Demo sync complete");
});

$("#clear-activity").addEventListener("click", () => {
  if (!confirm("Clear the saved activity log? Patient records will remain.")) return;
  activities = [];
  saveActivities();
  renderActivity();
  showToast("Activity log cleared");
});

window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

$("#today").textContent = new Date().toLocaleDateString(undefined, {
  day: "numeric", month: "short", year: "numeric"
});

renderAll();



const API_URL = "http://127.0.0.1:8000";


async function loadVisitsFromServer() {
  try {
    const response = await fetch(`${API_URL}/visits`);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const serverVisits = await response.json();

    // Use SQLite records as the website's patient list.
    records = serverVisits.map(visit => ({
      ...visit,
      status: "synced"
    }));

    saveRecords();
    renderAll();

    console.log("Visits loaded from SQLite:", records.length);
  } catch (error) {
    console.error("Could not load visits from SQLite:", error);
    showToast("Could not load visits from the server");
  }
}


async function checkBackend() {
    try {
        const response = await fetch(`${API_URL}/health`);

        if (!response.ok) {
            throw new Error("Backend request failed");
        }

        const data = await response.json();

        console.log("FastAPI connected:", data);
    } catch (error) {
        console.error("Could not connect to FastAPI:", error);
    }
}

checkBackend();

loadVisitsFromServer();
