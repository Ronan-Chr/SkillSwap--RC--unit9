// Skills now come from the backend API instead of a hardcoded array
let skills = [];

const cardGrid = document.querySelector(".card-grid");

// Small helper to build an element with a class and text (textContent = safe from HTML injection)
function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Draw a list of skills as cards in the grid
function renderSkills(list) {
  cardGrid.innerHTML = "";

  if (list.length === 0) {
    cardGrid.appendChild(makeEl("p", "", "No skills found."));
    return;
  }

  list.forEach(function(skill) {
    const card = makeEl("article", "card");
    card.appendChild(makeEl("p", "label", skill.category));
    card.appendChild(makeEl("h3", "", skill.title));
    card.appendChild(makeEl("p", "card-desc", skill.description || ""));

    const footer = makeEl("div", "card-footer");
    footer.appendChild(makeEl("span", "provider", skill.provider || ""));
    footer.appendChild(makeEl("span", "price", `$${skill.price}/hr`));
    card.appendChild(footer);

    card.addEventListener("click", function() {
      alert(skill.title + "\n" + (skill.description || ""));
    });

    cardGrid.appendChild(card);
  });
}

// Fetch skills from the API, store them, and render them
async function loadSkills() {
  cardGrid.innerHTML = "<p>Loading skills...</p>";
  try {
    const data = await window.apiService.fetchSkills();
    // Handle either a plain array or an object wrapping the array
    const list = Array.isArray(data) ? data : (data.skills || data.data || []);
    // Sequelize can return DECIMAL prices as strings, so convert to numbers
    skills = list.map(function(skill) {
      return { ...skill, price: parseFloat(skill.price) };
    });
    renderSkills(skills);
    renderCategoryControls();
  } catch (error) {
    cardGrid.innerHTML = "<p>Couldn't load skills. Is the backend running on port 3000?</p>";
  }
}

// Build filter buttons, matcher options, and form suggestions from the categories in the database
function renderCategoryControls() {
  const categories = [...new Set(skills.map(function(skill) { return skill.category; }))].sort();

  const filterBox = document.querySelector(".filter-buttons");
  filterBox.innerHTML = "";
  ["All"].concat(categories).forEach(function(category) {
    const button = makeEl("button", "", category);
    button.dataset.category = category;
    button.addEventListener("click", function() {
      renderSkills(filterSkillsByCategory(skills, category));
    });
    filterBox.appendChild(button);
  });

  const matchSelect = document.getElementById("match-category");
  const selected = matchSelect.value;
  matchSelect.innerHTML = "";
  ["All"].concat(categories).forEach(function(category) {
    const option = makeEl("option", "", category);
    option.value = category;
    matchSelect.appendChild(option);
  });
  if (["All"].concat(categories).includes(selected)) matchSelect.value = selected;

  const datalist = document.getElementById("category-options");
  datalist.innerHTML = "";
  categories.forEach(function(category) {
    const option = document.createElement("option");
    option.value = category;
    datalist.appendChild(option);
  });
}

// Cost calculator (unchanged)
let calculateButton = document.getElementById("calculate-btn");

calculateButton.addEventListener("click", function() {
  let hourlyRate = parseFloat(document.getElementById("HourlyRate").value);
  let hours = parseFloat(document.getElementById("hours").value);
  let totalCost = calculateTotalCost(hourlyRate, hours);
  let resultDiv = document.getElementById("cost-result");
  resultDiv.textContent = `Total Cost: $${totalCost}`;
});

// Skill matcher (now runs against API data)
let matchButton = document.getElementById("match-btn");

matchButton.addEventListener("click", function() {
  let category = document.getElementById("match-category").value;
  let maxPrice = parseFloat(document.getElementById("max-price").value);
  let matches = matchSkillstoUser({ category: category, maxPrice: maxPrice }, skills);
  let matchResults = document.getElementById("match-results");

  if (matches.length === 0) {
    matchResults.textContent = "No matches found.";
  } else {
    let text = "Matches Found: ";
    matches.forEach(function(skill) {
      text = text + `${skill.title} (${skill.category}) - $${skill.price}/hr\n`;
    });
    matchResults.textContent = text;
  }
});

// Add-skill form: POST to the API, then reload from the database
let skillForm = document.getElementById("skill-form");
let formStatus = document.getElementById("form-status");

skillForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const newSkill = {
    title: document.getElementById("skill-title").value.trim(),
    category: document.getElementById("skill-category").value,
    price: parseFloat(document.getElementById("skill-price").value),
    description: document.getElementById("skill-description").value.trim()
  };

  formStatus.textContent = "Saving...";
  try {
    await window.apiService.createSkill(newSkill);
    formStatus.textContent = "Skill added!";
    skillForm.reset();
    await loadSkills();
  } catch (error) {
    formStatus.textContent = "Couldn't add skill. Check the console for details.";
  }
});

// Load skills from the database when the page opens
loadSkills();
