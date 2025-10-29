/* script.js
   Dynamic Quote Generator with simulated server sync & conflict handling
   - Local storage key: "dqg.quotes"
   - Session storage: last viewed quote
   - Server endpoint: configurable via SERVER_URL (should return array of quote objects)
   Quote object expected shape:
     { id: "<string|number>", text: "<string>", category: "<string>", updatedAt: "<ISO timestamp>" }
   Notes: server interactions are best-effort; the code logs issues and continues using local data.
*/

// ----------------- Configuration -----------------
const LOCAL_KEY = "dqg.quotes";
const LAST_CATEGORY_KEY = "dqg.lastCategory";
const LAST_SYNC_KEY = "dqg.lastSyncAt";

// Put your mock server endpoint here. For demo you can set to an endpoint that returns an array.
// Example shape (server must provide id + updatedAt): 
// [ { id: "1", text: "hi", category: "X", updatedAt: "2025-10-28T12:00:00Z" }, ... ]
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts"; // << Default placeholder - not compatible shape
// For demo syncing behavior without a real server, code gracefully handles errors.

// Sync interval in ms (for automatic polling)
const SYNC_INTERVAL_MS = 1000 * 30; // 30s

// ----------------- Utilities -----------------
function nowISO() {
  return new Date().toISOString();
}

function generateLocalId() {
  return `local-${Date.now()}-${Math.floor(Math.random()*10000)}`;
}

function safeParse(json) {
  try { return JSON.parse(json); } catch (e) { return null; }
}

// ----------------- Initial Data -----------------
const defaultQuotes = [
  { id: "1", text: "The best way to predict the future is to invent it.", category: "Motivation", updatedAt: nowISO() },
  { id: "2", text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming", updatedAt: nowISO() },
  { id: "3", text: "Simplicity is the soul of efficiency.", category: "Design", updatedAt: nowISO() },
  { id: "4", text: "Don’t watch the clock; do what it does. Keep going.", category: "Motivation", updatedAt: nowISO() }
];

// Load from localStorage or use defaults
let quotes = (function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  const parsed = safeParse(raw);
  if (Array.isArray(parsed)) return parsed;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(defaultQuotes));
  return [...defaultQuotes];
})();

// ----------------- DOM refs -----------------
const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteBtn = document.getElementById("newQuote");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const exportBtn = document.getElementById("exportQuotesBtn");
const importFile = document.getElementById("importFile");

const syncNowBtn = document.getElementById("syncNowBtn");
const toggleAutoSyncBtn = document.getElementById("toggleAutoSyncBtn");
const syncStatus = document.getElementById("syncStatus");

const conflictPanel = document.getElementById("conflictPanel");
const conflictList = document.getElementById("conflictList");
const applyAllServerBtn = document.getElementById("applyAllServerBtn");
const openManualResolveBtn = document.getElementById("openManualResolveBtn");

// ----------------- Persistence helpers -----------------
function saveLocalQuotes() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(quotes));
}

function getLastCategory() {
  return localStorage.getItem(LAST_CATEGORY_KEY) || "all";
}

function setLastCategory(cat) {
  localStorage.setItem(LAST_CATEGORY_KEY, cat);
}

function setLastSyncAt(iso) {
  localStorage.setItem(LAST_SYNC_KEY, iso);
  syncStatus.textContent = `Last sync: ${iso}`;
}

// ----------------- Rendering / filtering -----------------
function populateCategories() {
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  categoryFilter.innerHTML = "";
  const allOpt = document.createElement("option"); allOpt.value = "all"; allOpt.textContent = "All Categories";
  categoryFilter.appendChild(allOpt);
  cats.forEach(c => {
    const opt = document.createElement("option"); opt.value = c; opt.textContent = c;
    categoryFilter.appendChild(opt);
  });
  // restore last selection if present
  const last = getLastCategory();
  if (Array.from(categoryFilter.options).some(o=>o.value===last)) categoryFilter.value = last;
  else categoryFilter.value = "all";
}

function renderQuote(q) {
  quoteDisplay.innerHTML = "";
  if (!q) {
    quoteDisplay.textContent = "No quote to display.";
    return;
  }
  const p = document.createElement("p"); p.textContent = `"${q.text}"`; p.style.fontSize = "1.2rem";
  const em = document.createElement("em"); em.textContent = `— ${q.category}`;
  const meta = document.createElement("div"); meta.className = "small"; meta.textContent = `id:${q.id} • updated:${q.updatedAt}`;
  quoteDisplay.appendChild(p); quoteDisplay.appendChild(em); quoteDisplay.appendChild(meta);
}

function showRandomQuote(category = null) {
  const cat = category === null ? getLastCategory() : category;
  setLastCategory(cat);
  let pool = quotes;
  if (cat !== "all") pool = quotes.filter(q=>q.category===cat);
  if (pool.length === 0) {
    quoteDisplay.innerHTML = `<p>No quotes in this category yet.</p>`;
    return;
  }
  const q = pool[Math.floor(Math.random()*pool.length)];
  sessionStorage.setItem("dqg.lastQuote", JSON.stringify(q));
  renderQuote(q);
}

// ----------------- Add / import / export -----------------
function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();
  if (!text || !category) { alert("Enter both quote and category"); return; }
  const newObj = { id: generateLocalId(), text, category, updatedAt: nowISO() };
  quotes.push(newObj);
  saveLocalQuotes();
  populateCategories();
  renderQuote(newObj);
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  showTemporaryMessage("Quote added locally");
}

function exportQuotesToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `quotes_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function importFromJsonFile(evt) {
  const file = evt.target.files && evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
      let added = 0;
      parsed.forEach(it=>{
        if (it && typeof it.text==="string" && typeof it.category==="string") {
          // if missing id, assign
          if (!it.id) it.id = generateLocalId();
          if (!it.updatedAt) it.updatedAt = nowISO();
          const exists = quotes.some(q=>q.id===it.id);
          if (!exists) { quotes.push(it); added++; }
        }
      });
      if (added>0) {
        saveLocalQuotes();
        populateCategories();
        showTemporaryMessage(`${added} quotes imported.`);
      } else {
        showTemporaryMessage("No new quotes imported (duplicates skipped).");
      }
    } catch (err) {
      alert("Failed to import JSON: " + err.message);
    } finally {
      evt.target.value = ""; // clear input to allow re-import same file
    }
  };
  reader.readAsText(file);
}

// ----------------- Temporary messages -----------------
function showTemporaryMessage(msg, ttl=1600) {
  const el = document.createElement("div"); el.textContent = msg; el.style.marginTop="8px"; el.style.color="#333";
  quoteDisplay.appendChild(el);
  setTimeout(()=>el.remove(), ttl);
}

// ----------------- Sync logic -----------------
let autoSync = false;
let autoSyncHandle = null;

// A simple function to fetch server quotes. We assume server returns an array of objects.
// If server returns another shape (e.g., jsonplaceholder posts), this will not match exactly.
// This function is defensive and returns [] on error.
async function fetchServerQuotes() {
  try {
    const res = await fetch(SERVER_URL, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // If server returns posts (jsonplaceholder), map to minimal shape if possible:
    if (Array.isArray(data) && data.length>0 && data[0].hasOwnProperty("title")) {
      // map jsonplaceholder posts -> quote shape (best effort)
      return data.slice(0,20).map(p => ({
        id: `srv-${p.id}`,
        text: (p.title || p.body || "").slice(0,200),
        category: "Server",
        updatedAt: nowISO()
      }));
    }
    // Otherwise assume server returned the expected shape
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.warn("fetchServerQuotes failed:", err);
    return [];
  }
}

// Attempt to send local-only quotes to server. This is best-effort: server may reject or ignore.
// Expected that server accepts POST /quotes with a quote body and returns created resource.
async function pushLocalNewQuotesToServer(localOnly) {
  if (!Array.isArray(localOnly) || localOnly.length===0) return [];
  const pushed = [];
  for (const q of localOnly) {
    try {
      // Try posting; some mock endpoints ignore body; we still treat it as "pushed" on success
      const res = await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(q)
      });
      if (res.ok) {
        const created = await res.json();
        // If server returns id or updatedAt, capture them (best-effort)
        const serverVersion = {
          id: created.id ? `srv-${created.id}` : q.id,
          text: created.text || created.title || q.text,
          category: created.category || q.category,
          updatedAt: created.updatedAt || nowISO()
        };
        pushed.push({ local: q, server: serverVersion });
      } else {
        console.warn("pushLocalNewQuotesToServer: server responded", res.status);
      }
    } catch (err) {
      console.warn("pushLocalNewQuotesToServer failed for", q.id, err);
    }
  }
  return pushed;
}

// Conflict detection and resolution strategy
// Server-wins by default, but we record conflicts and expose UI for manual resolution.
function detectConflicts(localArr, serverArr) {
  const conflicts = [];
  const serverMap = new Map(serverArr.map(s => [String(s.id), s]));
  for (const local of localArr) {
    if (serverMap.has(String(local.id))) {
      const srv = serverMap.get(String(local.id));
      // If updatedAt differs and text or category differs => conflict
      if (srv.updatedAt !== local.updatedAt && (srv.text !== local.text || srv.category !== local.category)) {
        conflicts.push({ id: local.id, local, server: srv });
      }
    }
  }
  return conflicts;
}

// Apply server-first merge: server takes precedence for conflicts; new server quotes added; local-only pushed
async function syncNow() {
  setSyncStatus("Syncing...");
  const serverQuotes = await fetchServerQuotes();

  // Normalise IDs to strings for robust comparison
  const srvById = new Map(serverQuotes.map(s=>[String(s.id), s]));

  // Detect new server quotes not in local
  const localIds = new Set(quotes.map(q=>String(q.id)));
  const newServer = serverQuotes.filter(s => !localIds.has(String(s.id)));

  // Detect local-only quotes (candidates to push to server)
  const serverIds = new Set(serverQuotes.map(s=>String(s.id)));
  const localOnly = quotes.filter(q => !serverIds.has(String(q.id)));

  // Detect conflicts where ids match but updatedAt differs
  const conflicts = detectConflicts(quotes, serverQuotes);

  // If conflicts exist, prepare UI and (by default) do server-wins auto-resolution
  if (conflicts.length > 0) {
    // Apply server-wins immediately to keep consistency (server takes precedence)
    conflicts.forEach(c => {
      // replace local object content with server version
      const idx = quotes.findIndex(x => String(x.id) === String(c.local.id));
      if (idx !== -1) quotes[idx] = { ...c.server };
    });
    saveLocalQuotes();
    // show conflict UI with details so user can manually review and optionally override
    presentConflicts(conflicts);
  }

  // Merge new server quotes into local (server-first)
  if (newServer.length > 0) {
    newServer.forEach(s => quotes.push(s));
    saveLocalQuotes();
  }

  // Try pushing local-only to server (best-effort)
  const pushed = await pushLocalNewQuotesToServer(localOnly);
  // If pushed returned server ids, we can optionally rewrite local ids to server ids
  // For now, we ignore rewriting unless server returns id info. (server-wins policy keeps server authoritative)

  setLastSyncAt(nowISO());
  setSyncStatus("Synced");
  return { conflicts, newServer, pushed };
}

// ----------------- Conflict UI -----------------
function presentConflicts(conflicts) {
  conflictPanel.style.display = "block";
  conflictList.innerHTML = "";
  conflicts.forEach((c, i) => {
    const wrap = document.createElement("div"); wrap.className = "conflictItem";
    const hdr = document.createElement("div"); hdr.innerHTML = `<strong>Conflict ${i+1} (id: ${c.local.id})</strong>`;
    const localEl = document.createElement("div"); localEl.innerHTML = `<div class="small"><strong>Local:</strong> "${c.local.text}" • ${c.local.category} • ${c.local.updatedAt}</div>`;
    const serverEl = document.createElement("div"); serverEl.innerHTML = `<div class="small"><strong>Server:</strong> "${c.server.text}" • ${c.server.category} • ${c.server.updatedAt}</div>`;

    const actions = document.createElement("div"); actions.className = "conflictActions";
    const chooseLocalBtn = document.createElement("button"); chooseLocalBtn.textContent = "Keep Local";
    const chooseServerBtn = document.createElement("button"); chooseServerBtn.textContent = "Keep Server";
    chooseLocalBtn.style.marginRight = "8px";

    chooseLocalBtn.addEventListener("click", () => {
      // Keep local: overwrite local's updatedAt to now (and push to server next sync)
      const idx = quotes.findIndex(q=>String(q.id)===String(c.local.id));
      if (idx!==-1) {
        quotes[idx] = { ...c.local, updatedAt: nowISO() };
        saveLocalQuotes();
        showTemporaryMessage("Kept local version for id "+c.local.id);
      }
      // remove conflict UI row
      wrap.remove();
    });
    chooseServerBtn.addEventListener("click", () => {
      const idx = quotes.findIndex(q=>String(q.id)===String(c.local.id));
      if (idx!==-1) {
        quotes[idx] = { ...c.server };
        saveLocalQuotes();
        showTemporaryMessage("Applied server version for id "+c.local.id);
      }
      wrap.remove();
    });

    actions.appendChild(chooseLocalBtn);
    actions.appendChild(chooseServerBtn);

    wrap.appendChild(hdr);
    wrap.appendChild(localEl);
    wrap.appendChild(serverEl);
    wrap.appendChild(actions);
    conflictList.appendChild(wrap);
  });
}

applyAllServerBtn.addEventListener("click", () => {
  // Accept all server versions: conflicts were already server-applied during syncNow by default,
  // But clicking here will simply hide the panel and notify user
  conflictPanel.style.display = "none";
  showTemporaryMessage("All server versions accepted.");
});

openManualResolveBtn.addEventListener("click", () => {
  // Expand conflict panel (already visible) and encourage manual choices
  showTemporaryMessage("Use the buttons to resolve each conflict manually.");
});

// ----------------- Sync UI helpers -----------------
function setSyncStatus(text) {
  syncStatus.textContent = text;
}

function setLastSyncAt(iso) {
  localStorage.setItem(LAST_SYNC_KEY, iso);
  syncStatus.textContent = `Last sync: ${iso}`;
}

// ----------------- Auto sync controls -----------------
function enableAutoSync() {
  if (autoSyncHandle) clearInterval(autoSyncHandle);
  autoSyncHandle = setInterval(() => { syncNow().catch(()=>{}); }, SYNC_INTERVAL_MS);
  autoSync = true;
  toggleAutoSyncBtn.textContent = "Auto Sync: ON";
  toggleAutoSyncBtn.classList.remove("secondary");
}

function disableAutoSync() {
  if (autoSyncHandle) { clearInterval(autoSyncHandle); autoSyncHandle = null; }
  autoSync = false;
  toggleAutoSyncBtn.textContent = "Auto Sync: OFF";
  toggleAutoSyncBtn.classList.add("secondary");
}

// ----------------- Boot / event wiring -----------------
addQuoteBtn.addEventListener("click", addQuote);
newQuoteBtn.addEventListener("click", ()=>showRandomQuote());
exportBtn.addEventListener("click", exportQuotesToJsonFile);
importFile.addEventListener("change", importFromJsonFile);
categoryFilter.addEventListener("change", (e)=> { setLastCategory(e.target.value); showRandomQuote(e.target.value); });

syncNowBtn.addEventListener("click", async () => {
  await syncNow();
});

toggleAutoSyncBtn.addEventListener("click", () => {
  if (autoSync) disableAutoSync(); else enableAutoSync();
});

// Initialize UI
populateCategories();
showRandomQuote(getLastCategory());
const lastSync = localStorage.getItem(LAST_SYNC_KEY);
if (lastSync) syncStatus.textContent = `Last sync: ${lastSync}`;

// Expose syncNow for debug in console
window.dqg_syncNow = syncNow;
