const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const dateInput = document.getElementById('date');
const monthFilter = document.getElementById('month-filter');
const clearBtn = document.getElementById('clear-btn');
const addCategoryBtn = document.getElementById('add-category-btn');
const submitBtn = form.querySelector('.btn');

let transactions = [];
let categories = [];
let expenseChart = null;

let isEditing = false;
let editId = null;

// Set current month/date restrictions
const today = new Date();
const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM
const currentDateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

monthFilter.value = currentMonthStr;
monthFilter.max = currentMonthStr;
dateInput.value = currentDateStr;
dateInput.max = currentDateStr;

// Event Listeners
monthFilter.addEventListener('change', updateUI);
// addCategoryBtn listener is added later with modal logic

// Fetch and Populate Categories
async function getCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    categories = data;
  } catch (err) {
    console.error('Error fetching categories, using defaults:', err);
    // Fallback defaults if DB not set up
    categories = [
      { name: 'Food', color: '#e74c3c', type: 'expense' },
      { name: 'Income', color: '#27ae60', type: 'income' },
      { name: 'Borrow From', color: '#8e44ad', type: 'income' },
      { name: 'EMI', color: '#f1c40f', type: 'expense' },
      { name: 'Daily Expenses', color: '#9b59b6', type: 'expense' },
      { name: 'Savings', color: '#2ecc71', type: 'expense' },
      { name: 'Grocery', color: '#e67e22', type: 'expense' },
      { name: 'Snacks', color: '#d35400', type: 'expense' },
      { name: 'School Fee', color: '#3498db', type: 'expense' },
      { name: 'Medical', color: '#1abc9c', type: 'expense' },
      { name: 'Petrol', color: '#34495e', type: 'expense' },
      { name: 'Loan', color: '#7f8c8d', type: 'expense' },
      { name: 'Other', color: '#ecf0f1', type: 'expense' }
    ];
  }
  populateCategorySelect();
}

function populateCategorySelect() {
  // Keep reference to currently selected value (if any)
  const currentVal = category.value;

  category.innerHTML = '';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.name;
    option.innerText = cat.name;
    category.appendChild(option);
  });

  // Restore selection if it still exists
  if (currentVal && categories.find(c => c.name === currentVal)) {
    category.value = currentVal;
  }
}

// Modal Elements
const categoryModal = document.getElementById('category-modal');
const newCategoryInput = document.getElementById('new-category-name');
const confirmCatBtn = document.getElementById('confirm-cat-btn');
const cancelCatBtn = document.getElementById('cancel-cat-btn');
const userCategoryList = document.getElementById('user-category-list');
const userCategoriesSection = document.getElementById('user-categories-section');

// Open Modal
function openModal() {
  categoryModal.classList.add('show');
  newCategoryInput.focus();
  renderUserCategories();
}

// Close Modal
function closeModal() {
  categoryModal.classList.remove('show');
  newCategoryInput.value = '';
}

function renderUserCategories() {
  const userCats = categories.filter(c => c.user_id !== null);

  if (userCats.length > 0) {
    userCategoriesSection.style.display = 'block';
    userCategoryList.innerHTML = '';

    userCats.forEach(cat => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span style="color: ${cat.color}">●</span> ${cat.name} 
        <small style="opacity: 0.6; font-size: 0.7rem;">(${cat.type})</small>
        <button class="delete-btn" onclick="removeCategory(${cat.id}, '${cat.name}')">x</button>
      `;
      userCategoryList.appendChild(li);
    });
  } else {
    userCategoriesSection.style.display = 'none';
  }
}

async function removeCategory(id, name) {
  showConfirm('Delete Category?', `Are you sure you want to delete "${name}"? Transactions using this category will remain, but the category label will be unstyled.`, async () => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        categories = categories.filter(c => c.id !== id);
        populateCategorySelect();
        renderUserCategories();
        updateUI(); // In case some categories in view changed
      } else {
        const error = await res.json();
        alert(error);
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Add Category logic
async function addNewCategory() {
  const name = newCategoryInput.value;
  const type = document.querySelector('input[name="cat-type"]:checked').value; // 'expense' or 'income'

  if (name && name.trim() !== "") {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type: type })
      });
      const newCat = await res.json();
      categories.push(newCat);
      populateCategorySelect();
      category.value = newCat.name; // Select the new one

      closeModal();
      // Optional: alert('Category Added'); 
    } catch (err) {
      console.error(err);
      alert("Failed to add category. It might already exist.");
    }
  } else {
    // highlight input error
    newCategoryInput.style.borderColor = '#e74c3c';
    setTimeout(() => newCategoryInput.style.borderColor = '', 1000);
  }
}

// Category Modal Event Listeners
addCategoryBtn.removeEventListener('click', addNewCategory); // Remove old listener
addCategoryBtn.addEventListener('click', openModal);
confirmCatBtn.addEventListener('click', addNewCategory);
cancelCatBtn.addEventListener('click', closeModal);

// Close modal if clicking outside
categoryModal.addEventListener('click', (e) => {
  if (e.target === categoryModal) {
    closeModal();
  }
});

// Confirmation Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMsg = document.getElementById('confirm-msg');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

let pendingConfirmAction = null;

function showConfirm(title, message, action) {
  confirmTitle.innerText = title;
  confirmMsg.innerText = message;
  pendingConfirmAction = action;
  confirmModal.classList.add('show');
}

function closeConfirm() {
  confirmModal.classList.remove('show');
  pendingConfirmAction = null;
}

confirmCancelBtn.addEventListener('click', closeConfirm);
confirmYesBtn.addEventListener('click', () => {
  if (pendingConfirmAction) pendingConfirmAction();
  closeConfirm();
});

// Close confirm on outside click
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) closeConfirm();
});

// Allow Enter key to simple confirm (optional context) or Esc to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && confirmModal.classList.contains('show')) {
    closeConfirm();
  }
});


// Add transaction
async function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === '' || amount.value.trim() === '' || dateInput.value === '') {
    alert('Please add a text, amount, and date');
  } else {
    if (isEditing) {
      await updateTransaction();
    } else {
      // Find category type
      const selectedCatInfo = categories.find(c => c.name === category.value);
      const isExpense = selectedCatInfo && selectedCatInfo.type === 'expense';

      // Force sign based on type
      let finalAmount = Math.abs(+amount.value);
      if (isExpense) finalAmount = finalAmount * -1;

      const transaction = {
        text: text.value,
        amount: finalAmount,
        category: category.value,
        date: dateInput.value
      };

      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transaction)
        });
        const data = await res.json();
        transactions.push(data);

        // Check if added date falls in current filter
        if (data.date.startsWith(monthFilter.value)) {
          updateUI();
        } else {
          alert('Transaction added! Switch month to view it.');
        }
      } catch (err) {
        console.error(err);
      }
    }

    text.value = '';
    amount.value = '';
    dateInput.value = currentDateStr;

    // Reset to default state if was editing
    if (isEditing) {
      isEditing = false;
      editId = null;
      submitBtn.innerText = 'Add transaction';
      submitBtn.style.background = 'linear-gradient(135deg, var(--accent-blue) 0%, #8b5cf6 100%)';
    }
  }
}

// Update existing transaction
async function updateTransaction() {
  try {
    const selectedCatInfo = categories.find(c => c.name === category.value);
    const isExpense = selectedCatInfo && selectedCatInfo.type === 'expense';

    // Force sign based on type
    let finalAmount = Math.abs(+amount.value);
    if (isExpense) finalAmount = finalAmount * -1;

    const updatedTransaction = {
      text: text.value,
      amount: finalAmount,
      category: category.value,
      date: dateInput.value
    };

    const res = await fetch(`/api/transactions/${editId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedTransaction)
    });

    const data = await res.json();

    transactions = transactions.map(transaction => {
      if (transaction.id === editId) {
        return data;
      }
      return transaction;
    });

    updateUI();

  } catch (err) {
    console.error(err);
  }
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
  // Get sign
  const sign = transaction.amount < 0 ? '-' : '+';

  const item = document.createElement('li');

  // Add class based on value
  item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');

  // Format date
  const dateObj = new Date(transaction.date);
  const dateStr = dateObj.toLocaleDateString();

  item.innerHTML = `
    <div>
        ${transaction.text} 
        <small style="margin-left:5px; opacity:0.7;">(${transaction.category || 'Other'})</small>
        <div style="font-size: 0.7rem; color: var(--text-secondary);">${dateStr}</div>
    </div>
    <div class="item-controls">
        <span>${sign}₹${Math.abs(transaction.amount)}</span> 
        <button class="edit-btn" onclick="editTransaction(${transaction.id})">&#9998;</button>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
    </div>
  `;

  list.appendChild(item);
}

// Update UI (Balance, List, Chart) based on Month Filter
function updateUI() {
  const selectedMonth = monthFilter.value;

  // Filter transactions by selected month
  const filteredTransactions = transactions.filter(t => {
    if (!t.date) return false;
    // Handle ISO date string (YYYY-MM-DD...)
    return t.date.startsWith(selectedMonth);
  });

  // Update List
  list.innerHTML = '';
  filteredTransactions.forEach(addTransactionDOM);

  // Update Values
  const amounts = filteredTransactions.map(transaction => Number(transaction.amount));

  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

  const income = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0)
    .toFixed(2);

  const expense = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1
  ).toFixed(2);

  balance.innerText = `₹${total}`;
  money_plus.innerText = `+₹${income}`;
  money_minus.innerText = `-₹${expense}`;

  // Update Chart
  updateChart(filteredTransactions);
}

// Remove transaction by ID
function removeTransaction(id) {
  showConfirm('Delete Transaction?', 'This will permanently remove this transaction.', async () => {
    try {
      await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });

      transactions = transactions.filter(transaction => transaction.id !== id);
      updateUI();
    } catch (err) {
      console.error(err);
    }
  });
}

// Edit Transaction
function editTransaction(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  // Populate form
  text.value = transaction.text;
  amount.value = transaction.amount;
  category.value = transaction.category || 'Other';
  // Format date for input
  if (transaction.date) {
    dateInput.value = new Date(transaction.date).toISOString().slice(0, 10);
  }

  // Set edit mode
  isEditing = true;
  editId = id;

  // Change button text and color to indicate edit mode
  submitBtn.innerText = 'Update transaction';
  submitBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
}

// Clear all transactions
function clearHistory() {
  showConfirm('Clear All History?', 'Are you sure? This will delete ALL transactions.', async () => {
    try {
      await fetch('/api/transactions', {
        method: 'DELETE'
      });
      transactions = [];
      updateUI();
    } catch (err) {
      console.error(err);
    }
  });
}

// Update Chart
function updateChart(items) {
  const ctx = document.getElementById('expenseChart').getContext('2d');

  // Group by category
  const categoryTotals = {};
  items.forEach(t => {
    const cat = t.category || 'Other';
    const amt = Math.abs(t.amount);
    if (categoryTotals[cat]) {
      categoryTotals[cat] += amt;
    } else {
      categoryTotals[cat] = amt;
    }
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  // Destroy previous chart if exists
  if (expenseChart) {
    expenseChart.destroy();
  }

  // Colors mapping (dynamic from categories)

  const backgroundColors = labels.map(label => {
    const cat = categories.find(c => c.name === label);
    return cat ? cat.color : '#95a5a6';
  });

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Amount by Category',
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#fff',
            font: {
              family: "'Outfit', sans-serif"
            }
          }
        }
      }
    }
  });
}

// Init app
async function init() {
  try {
    // Check if user is authenticated
    const userRes = await fetch('/api/user');
    if (userRes.status === 401) {
      // Not logged in, show overlay
      document.getElementById('login-overlay').style.display = 'flex';
      return; // Stop init
    }

    const user = await userRes.json();
    // Logged in, hide overlay and show profile
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('user-profile').style.display = 'flex';
    document.getElementById('user-name').innerText = user.display_name || user.email;
    if (user.avatar) document.getElementById('user-avatar').src = user.avatar;

    await getCategories(); // Fetch categories first

    // Then transactions
    const res = await fetch('/api/transactions');
    const data = await res.json();
    transactions = data;

    updateUI();
  } catch (err) {
    console.error(err);
  }
}

init();

const toggleChartBtn = document.getElementById('toggle-chart-btn');
const chartContainer = document.getElementById('chart-container');

const exportBtn = document.getElementById('export-btn');

toggleChartBtn.addEventListener('click', () => {
  if (chartContainer.style.display === 'none') {
    chartContainer.style.display = 'flex'; // chart-container is flex centered
    toggleChartBtn.innerText = 'Hide Chart';
  } else {
    chartContainer.style.display = 'none';
    toggleChartBtn.innerText = 'Show Chart';
  }
});

function exportToExcel() {
  const selectedMonth = monthFilter.value;

  // Filter for current view
  const filteredTransactions = transactions.filter(t => {
    if (!t.date) return false;
    return t.date.startsWith(selectedMonth);
  });

  if (filteredTransactions.length === 0) {
    alert("No transactions to export for this month.");
    return;
  }

  // Format data for Excel
  const data = filteredTransactions.map(t => {
    // Find category info to get type if needed, or infer from amount
    const isExpense = t.amount < 0;
    return {
      Date: new Date(t.date).toLocaleDateString(),
      Category: t.category,
      Type: isExpense ? 'Expense' : 'Income',
      Description: t.text,
      Amount: Math.abs(t.amount)
    };
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Append Summary Rows
  data.push({}); // Empty row
  data.push({ Description: 'Total Income', Amount: totalIncome });
  data.push({ Description: 'Total Expense', Amount: totalExpense });
  data.push({ Description: 'Net Balance', Amount: (totalIncome - totalExpense) });

  // Create clean workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  // Save file
  XLSX.writeFile(wb, `Expense_Tracker_${selectedMonth}.xlsx`);
}

exportBtn.addEventListener('click', exportToExcel);

form.addEventListener('submit', addTransaction);
clearBtn.addEventListener('click', clearHistory);
