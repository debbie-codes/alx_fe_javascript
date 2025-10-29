// --- INITIAL QUOTES ---
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "The best way to predict the future is to invent it.", category: "Motivation" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Simplicity is the soul of efficiency.", category: "Design" },
  { text: "Don’t watch the clock; do what it does. Keep going.", category: "Motivation" }
];

// --- DOM ELEMENTS ---
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const exportBtn = document.getElementById("exportQuotesBtn");
const importFile = document.getElementById("importFile");
const categoryFilter = document.getElementById("categoryFilter");

// --- SAVE & LOAD HELPERS ---
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function getLastSelectedCategory() {
  return localStorage.getItem("lastCategory") || "all";
}

function setLastSelectedCategory(category) {
  localStorage.setItem("lastCategory", category);
}

// --- CATEGORY MANAGEMENT ---
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  const lastCategory = getLastSelectedCategory();
  categoryFilter.value = lastCategory;
}

// --- FILTERING LOGIC ---
function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  setLastSelectedCategory(selectedCategory);
  showRandomQuote(selectedCategory);
}

// --- DISPLAY RANDOM QUOTE ---
function showRandomQuote(category = getLastSelectedCategory()) {
  let filteredQuotes = quotes;
  if (category !== "all") {
    filteredQuotes = quotes.filter(q => q.category === category);
  }

  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = `<p>No quotes available in this category yet.</p>`;
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const randomQuote = filteredQuotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${randomQuote.text}"</p><em>- ${randomQuote.category}</em>`;

  sessionStorage.setItem("lastQuote", JSON.stringify(randomQuote));
}

// --- ADD NEW QUOTE ---
function addQuote() {
  const newText = document.getElementById("newQuoteText").value.trim();
  const newCategory = document.getElementById("newQuoteCategory").value.trim();

  if (!newText || !newCategory) {
    alert("Please enter both a quote and category.");
    return;
  }

  quotes.push({ text: newText, category: newCategory });
  saveQuotes();
  populateCategories();

  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";

  alert("Quote added successfully!");
}

// --- EXPORT JSON ---
function exportQuotesToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

// --- IMPORT JSON ---
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      const importedQuotes = JSON.parse(event.target.result);
      if (Array.isArray(importedQuotes)) {
        quotes.push(...importedQuotes);
        saveQuotes();
        populateCategories();
        alert("Quotes imported successfully!");
      } else {
        alert("Invalid JSON format.");
      }
    } catch (error) {
      alert("Error reading JSON file.");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// --- NEW FUNCTION: FETCH FROM SERVER (Simulated) ---
async function fetchQuotesFromServer() {
  try {
    // Simulate fetching server data (you can replace with a real API endpoint)
    const response = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
    const serverData = await response.json();

    // Convert mock data into quote format
    const serverQuotes = serverData.map(item => ({
      text: item.title,
      category: "Server"
    }));

    // Conflict resolution: Server data takes precedence
    const localQuotes = JSON.parse(localStorage.getItem("quotes")) || [];
    const mergedQuotes = resolveConflicts(localQuotes, serverQuotes);

    quotes = mergedQuotes;
    saveQuotes();
    populateCategories();

    notifyUser("Quotes synced with server!");
  } catch (error) {
    console.error("Error syncing with server:", error);
  }
}

// --- CONFLICT RESOLUTION ---
function resolveConflicts(local, server) {
  // If text already exists locally, prefer server version
  const localTexts = new Set(local.map(q => q.text));
  const merged = [...local];

  server.forEach(sq => {
    if (!localTexts.has(sq.text)) {
      merged.push(sq);
    } else {
      // Replace duplicate with server version (server wins)
      const index = merged.findIndex(lq => lq.text === sq.text);
      merged[index] = sq;
    }
  });

  return merged;
}

// --- USER NOTIFICATION ---
function notifyUser(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.background = "#007bff";
  notification.style.color = "white";
  notification.style.padding = "10px 20px";
  notification.style.borderRadius = "8px";
  notification.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notification.style.zIndex = "1000";
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

// --- PERIODIC SYNC (every 30 seconds) ---
setInterval(fetchQuotesFromServer, 30000);

// --- EVENT LISTENERS ---
newQuoteBtn.addEventListener("click", () => showRandomQuote());
addQuoteBtn.addEventListener("click", addQuote);
exportBtn.addEventListener("click", exportQuotesToJsonFile);
importFile.addEventListener("change", importFromJsonFile);
categoryFilter.addEventListener("change", filterQuotes);

// --- INITIALIZATION ---
populateCategories();
filterQuotes();
fetchQuotesFromServer(); // initial sync
