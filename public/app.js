// ------------------------------
//  VENDING TRACKER FRONTEND JS
// ------------------------------

// 🔗 Auto-detect backend (local or deployed)
const localURL = "http://localhost:3000";
const renderURL = "https://vending-tracker.onrender.com"; // 👈 Replace with your Render backend URL
const apiUrl = window.location.hostname === "localhost" ? localURL : renderURL;

// ------------------------------
//   UI ELEMENTS
// ------------------------------
const itemList = document.getElementById("itemList");
const addItemForm = document.getElementById("addItemForm");
const saleForm = document.getElementById("saleForm");
const reportExcelBtn = document.getElementById("downloadExcel");
const reportPdfBtn = document.getElementById("downloadPdf");
const statusMsg = document.getElementById("statusMsg");

// ------------------------------
//   HELPERS
// ------------------------------
function showStatus(msg, type = "info") {
  statusMsg.textContent = msg;
  statusMsg.className = type;
  setTimeout(() => (statusMsg.textContent = ""), 3000);
}

// ------------------------------
//   LOAD ITEMS
// ------------------------------
async function loadItems() {
  try {
    const res = await fetch(`${apiUrl}/api/items`);
    if (!res.ok) throw new Error("Failed to fetch items");

    const items = await res.json();
    renderItems(items);
  } catch (err) {
    console.error("Error loading items:", err);
    showStatus("Failed to load items. Please check backend connection.", "error");
  }
}

// ------------------------------
//   RENDER ITEMS IN TABLE
// ------------------------------
function renderItems(items) {
  itemList.innerHTML = "";
  if (!items.length) {
    itemList.innerHTML = `<tr><td colspan="4" style="text-align:center;">No items available</td></tr>`;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>${item.stock}</td>
      <td><button class="delete-btn" data-id="${item._id}">🗑 Delete</button></td>
    `;
    itemList.appendChild(row);
  });
}

// ------------------------------
//   ADD NEW ITEM
// ------------------------------
addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = e.target.name.value.trim();
  const price = parseFloat(e.target.price.value);
  const stock = parseInt(e.target.stock.value);

  if (!name || isNaN(price)) {
    showStatus("Name and price are required", "error");
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, stock }),
    });

    if (!res.ok) throw new Error("Failed to add item");

    showStatus("✅ Item added successfully", "success");
    e.target.reset();
    loadItems();
  } catch (err) {
    console.error("Add item error:", err);
    showStatus("Error adding item", "error");
  }
});

// ------------------------------
//   DELETE ITEM
// ------------------------------
itemList.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-btn")) return;

  const id = e.target.dataset.id;
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    const res = await fetch(`${apiUrl}/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete item");

    showStatus("🗑️ Item deleted", "success");
    loadItems();
  } catch (err) {
    console.error("Delete error:", err);
    showStatus("Error deleting item", "error");
  }
});

// ------------------------------
//   RECORD SALE
// ------------------------------
saleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const itemId = e.target.itemId.value;
  const quantity = parseInt(e.target.quantity.value);
  const paymentType = e.target.paymentType.value;
  const buyerType = e.target.buyerType.value;

  if (!itemId || !quantity) {
    showStatus("All fields are required", "error");
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/api/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity, paymentType, buyerType }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to record sale");

    showStatus("💰 Sale recorded successfully", "success");
    e.target.reset();
    loadItems();
  } catch (err) {
    console.error("Sale error:", err);
    showStatus("Error recording sale", "error");
  }
});

// ------------------------------
//   DOWNLOAD REPORTS
// ------------------------------
reportExcelBtn.addEventListener("click", () => {
  window.open(`${apiUrl}/api/reports/excel`, "_blank");
});

reportPdfBtn.addEventListener("click", () => {
  window.open(`${apiUrl}/api/reports/pdf`, "_blank");
});

// ------------------------------
//   INITIAL LOAD
// ------------------------------
loadItems();
