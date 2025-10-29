// Initial quotes array with category
let quotes = [
  { text: "The best way to predict the future is to invent it.", category: "Motivation" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Simplicity is the soul of efficiency.", category: "Design" },
  { text: "Don’t watch the clock; do what it does. Keep going.", category: "Motivation" }
];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const categorySelect = document.getElementById("categorySelect");
const newQuoteBtn = document.getElementById("newQuote");

// --- Helper Functions ---

// 1. Populate categories dynamically
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))]; // Unique categories
  categorySelect.innerHTML = ""; // Clear previous
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

// 2. Show a random quote
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  const filteredQuotes = quotes.filter(q => q.category === selectedCategory);
  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category yet.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const randomQuote = filteredQuotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${randomQuote.text}"</p><em>- ${randomQuote.category}</em>`;
}

// 3. Add a new quote dynamically
function addQuote() {
  const newText = document.getElementById("newQuoteText").value.trim();
  const newCategory = document.getElementById("newQuoteCategory").value.trim();

  if (!newText || !newCategory) {
    alert("Please enter both a quote and category.");
    return;
  }

  // Add to quotes array
  quotes.push({ text: newText, category: newCategory });

  // Update categories and reset form
  populateCategories();
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";

  alert("Quote added successfully!");
}

// 4. Dynamically create the Add Quote Form
function createAddQuoteForm() {
  const formContainer = document.createElement("div");
  formContainer.id = "addQuoteForm";
  formContainer.style.marginTop = "20px";

  const heading = document.createElement("h3");
  heading.textContent = "Add a New Quote";
  formContainer.appendChild(heading);

  // Quote input
  const quoteInput = document.createElement("input");
  quoteInput.type = "text";
  quoteInput.id = "newQuoteText";
  quoteInput.placeholder = "Enter a new quote";
  quoteInput.style.margin = "5px";
  formContainer.appendChild(quoteInput);

  // Category input
  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.id = "newQuoteCategory";
  categoryInput.placeholder = "Enter quote category";
  categoryInput.style.margin = "5px";
  formContainer.appendChild(categoryInput);

  // Add button
  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.id = "addQuoteBtn";
  addButton.style.margin = "5px";
  addButton.addEventListener("click", addQuote);
  formContainer.appendChild(addButton);

  // Append form to the body (or below the quote section)
  document.body.appendChild(formContainer);
}

// --- Event Listeners ---
newQuoteBtn.addEventListener("click", showRandomQuote);

// Initialize page
populateCategories();
showRandomQuote();
createAddQuoteForm(); // <-- dynamically create the Add Quote form
