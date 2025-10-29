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

  // Restore last selected category
  const lastCategory = getLastSelectedCategory();
  categoryFilter.value = lastCategory;
}

// --- FILTERING LOGIC ---
function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  setLastSelectedCategory(selectedCategory);
  showRandomQuote(selectedCategory);
}

// --- DISPLAY A RANDOM QUOTE ---
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

  // Save last viewed quote in sessionStorage (optional)
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

// --- EVENT LISTENERS ---
newQuoteBtn.addEventListener("click", () => showRandomQuote());
addQuoteBtn.addEventListener("click", addQuote);
exportBtn.addEventListener("click", exportQuotesToJsonFile);
importFile.addEventListener("change", importFromJsonFile);
categoryFilter.addEventListener("change", filterQuotes);

// --- INITIALIZATION ---
populateCategories();
filterQuotes(); // Load quotes based on last selected filter
