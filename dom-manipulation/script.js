// script.js

// ---------- Storage keys ----------
const LOCAL_STORAGE_KEY = "dynamicQuoteGenerator.quotes";
const SESSION_STORAGE_KEY = "dynamicQuoteGenerator.lastViewedQuote";

// ---------- Initial default quotes (used only if localStorage empty) ----------
const defaultQuotes = [
  { text: "The best way to predict the future is to invent it.", category: "Motivation" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Simplicity is the soul of efficiency.", category: "Design" },
  { text: "Don’t watch the clock; do what it does. Keep going.", category: "Motivation" }
];

// ---------- State ----------
let quotes = [];

// ---------- DOM references ----------
const quoteDisplay = document.getElementById("quoteDisplay");
const categorySelect = document.getElementById("categorySelect");
const newQuoteBtn = document.getElementById("newQuote");

// ---------- Storage helpers ----------
function saveQuotesToLocalStorage() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error("Could not save quotes to localStorage:", e);
  }
}

function loadQuotesFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Basic validation: ensure each has text and category
    const valid = parsed.every(q => q && typeof q.text === "string" && typeof q.category === "string");
    return valid ? parsed : null;
  } catch (e) {
    console.error("Could not load/parse quotes from localStorage:", e);
    return null;
  }
}

function saveLastViewedToSession(quoteObj) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(quoteObj));
  } catch (e) {
    console.error("Could not save last viewed quote to sessionStorage:", e);
  }
}

function loadLastViewedFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Could not load/parse sessionStorage lastViewed:", e);
    return null;
  }
}

// ---------- UI / behavior functions ----------

// 1. Populate categories dynamically (preserves previous selection when possible)
function populateCategories(preferredCategory = null) {
  const categories = [...new Set(quotes.map(q => q.category))]; // Unique categories
  const prev = categorySelect.value; // previously selected

  categorySelect.innerHTML = ""; // Clear previous
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  // Choose preferredCategory if provided, else previous selection if still present, else first category
  if (preferredCategory && categories.includes(preferredCategory)) {
    categorySelect.value = preferredCategory;
  } else if (prev && categories.includes(prev)) {
    categorySelect.value = prev;
  } else if (categories.length > 0) {
    categorySelect.value = categories[0];
  } else {
    // no categories
    categorySelect.innerHTML = "";
  }
}

// 2. Show a random quote for the selected category
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  if (!selectedCategory) {
    quoteDisplay.textContent = "No categories available. Add a quote to get started.";
    return;
  }
  const filteredQuotes = quotes.filter(q => q.category === selectedCategory);
  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category yet.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const randomQuote = filteredQuotes[randomIndex];
  renderQuote(randomQuote);
  saveLastViewedToSession(randomQuote);
}

// Renders a single quote object into quoteDisplay
function renderQuote(q) {
  // clear and build content
  quoteDisplay.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = `"${q.text}"`;
  p.style.fontSize = "1.25rem";
  p.style.marginBottom = "0.5rem";

  const em = document.createElement("em");
  em.textContent = `— ${q.category}`;

  quoteDisplay.appendChild(p);
  quoteDisplay.appendChild(em);
}

// 3. Add a new quote dynamically
function addQuote() {
  const newTextEl = document.getElementById("newQuoteText");
  const newCategoryEl = document.getElementById("newQuoteCategory");
  if (!newTextEl || !newCategoryEl) {
    alert("Form elements missing.");
    return;
  }

  const newText = newTextEl.value.trim();
  const newCategory = newCategoryEl.value.trim();

  if (!newText || !newCategory) {
    alert("Please enter both a quote and category.");
    return;
  }

  const newQuoteObj = { text: newText, category: newCategory };
  quotes.push(newQuoteObj);

  // Save to localStorage
  saveQuotesToLocalStorage();

  // Update categories, select the new one, and show a quote (could be random within new category)
  populateCategories(newCategory);
  // show the newly added quote explicitly to provide immediate feedback
  renderQuote(newQuoteObj);
  saveLastViewedToSession(newQuoteObj);

  // reset form inputs
  newTextEl.value = "";
  newCategoryEl.value = "";

  // small non-blocking notice
  showTemporaryMessage("Quote added successfully!", 1800);
}

// small helper to show temporary messages in the quoteDisplay area footer
function showTemporaryMessage(msg, ms = 1500) {
  const note = document.createElement("div");
  note.textContent = msg;
  note.style.marginTop = "10px";
  quoteDisplay.appendChild(note);
  setTimeout(() => {
    if (note.parentNode) note.parentNode.removeChild(note);
  }, ms);
}

// 4. Dynamically create the Add Quote Form + Import/Export UI
function createAddQuoteForm() {
  // Container
  const formContainer = document.createElement("div");
  formContainer.id = "addQuoteForm";
  formContainer.style.marginTop = "20px";
  formContainer.style.textAlign = "center";

  const heading = document.createElement("h3");
  heading.textContent = "Add a New Quote";
  formContainer.appendChild(heading);

  // Quote input
  const quoteInput = document.createElement("input");
  quoteInput.type = "text";
  quoteInput.id = "newQuoteText";
  quoteInput.placeholder = "Enter a new quote";
  quoteInput.style.margin = "5px";
  quoteInput.style.width = "60%";
  formContainer.appendChild(quoteInput);

  // Category input
  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.id = "newQuoteCategory";
  categoryInput.placeholder = "Enter quote category";
  categoryInput.style.margin = "5px";
  categoryInput.style.width = "30%";
  formContainer.appendChild(categoryInput);

  // Add button
  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.id = "addQuoteBtn";
  addButton.style.margin = "5px";
  addButton.addEventListener("click", addQuote);
  formContainer.appendChild(addButton);

  // Export button
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export Quotes (JSON)";
  exportBtn.style.margin = "5px";
  exportBtn.addEventListener("click", exportQuotesToJsonFile);
  formContainer.appendChild(exportBtn);

  // Import file input
  const importLabel = document.createElement("label");
  importLabel.textContent = " Import JSON: ";
  importLabel.style.marginLeft = "8px";
  importLabel.style.marginRight = "4px";
  importLabel.htmlFor = "importFile";
  formContainer.appendChild(importLabel);

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.id = "importFile";
  importInput.accept = ".json,application/json";
  importInput.style.margin = "5px";
  importInput.addEventListener("change", importFromJsonFile);
  formContainer.appendChild(importInput);

  // Append form to the body below the main content
  // Prefer inserting after quoteDisplay if present
  const ref = quoteDisplay;
  if (ref && ref.parentNode) {
    ref.parentNode.insertBefore(formContainer, ref.nextSibling);
  } else {
    document.body.appendChild(formContainer);
  }
}

// 5. Export quotes to JSON file
function exportQuotesToJsonFile() {
  try {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const now = new Date();
    const filename = `quotes_export_${now.toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // revoke after short delay to free memory
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error("Error exporting quotes:", e);
    alert("Could not export quotes — see console for details.");
  }
}

// 6. Import quotes from selected JSON file
function importFromJsonFile(event) {
  const file = event.target && event.target.files && event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (loadEvent) {
    try {
      const parsed = JSON.parse(loadEvent.target.result);
      if (!Array.isArray(parsed)) {
        throw new Error("Imported JSON must be an array of quote objects.");
      }
      // Validate shape: each must have text and category strings
      const filtered = parsed.filter(
        q => q && typeof q.text === "string" && typeof q.category === "string"
      );
      if (filtered.length === 0) {
        throw new Error("No valid quote objects found in the file (each must have text and category).");
      }

      // Merge: avoid duplicates if exact same text+category already present
      let addedCount = 0;
      filtered.forEach(inQ => {
        const exists = quotes.some(existing => existing.text === inQ.text && existing.category === inQ.category);
        if (!exists) {
          quotes.push(inQ);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        saveQuotesToLocalStorage();
        populateCategories(); // keep current selection if possible
        showTemporaryMessage(`${addedCount} quote(s) imported.`, 2200);
      } else {
        showTemporaryMessage("No new quotes to import (duplicates skipped).", 2200);
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import JSON file: " + (err.message || err));
    } finally {
      // clear input so same file can be re-imported later if desired
      event.target.value = "";
    }
  };

  reader.onerror = function (err) {
    console.error("FileReader error:", err);
    alert("Failed to read file.");
    event.target.value = "";
  };

  reader.readAsText(file);
}

// ---------- Initialization ----------

function initializeApp() {
  // Load saved quotes if present, else use defaults
  const saved = loadQuotesFromLocalStorage();
  if (saved && Array.isArray(saved) && saved.length > 0) {
    quotes = saved;
  } else {
    quotes = [...defaultQuotes];
    saveQuotesToLocalStorage(); // persist defaults for first time users
  }

  // Create dynamic UI pieces (form, import/export)
  createAddQuoteForm();

  // Populate categories and set initial selection
  populateCategories();

  // If sessionStorage has a last viewed quote, display it; otherwise show a random
  const last = loadLastViewedFromSession();
  if (last && typeof last.text === "string" && typeof last.category === "string") {
    renderQuote(last);
  } else {
    // show a random quote from first category to give immediate content
    showRandomQuote();
  }

  // wire up the newQuoteBtn (already in static html)
  if (newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);
}

// Run initialization on DOMContentLoaded to ensure static DOM elements exist
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
