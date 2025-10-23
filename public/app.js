// ✅ Change this to your Render API base URL
// Example: const apiUrl = "https://vending-tracker.onrender.com/api";
const apiUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://vending-tracker.onrender.com/api";

// --- Load Items ---
async function loadItems() {
  try {
    const res = await fetch(`${apiUrl}/items`);
    if (!res.ok) throw new Error("Failed to load items");
    const items = await res.json();

    const itemList = document.getElementById("item-list");
    itemList.innerHTML = "";

    items.forEach((item) => {
      const div = document.createElement("div");
      div.textContent = `${item.name} ($${item.price}) - Stock: ${item.stock}`;

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = async () => {
        await fetch(`${apiUrl}/items/${item._id}`, { method: "DELETE" });
        loadItems();
      };

      div.appendChild(delBtn);
      itemList.appendChild(div);
    });

    // Update Sales dropdown
    const itemSelect = document.getElementById("sale-item");
    itemSelect.innerHTML = "";
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item._id;
      option.textContent = `${item.name} ($${item.price}) - Stock: ${item.stock}`;
      itemSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading items:", err);
    alert("Failed to load items. Please check backend connection.");
  }
}

// --- Add Item ---
async function addItem() {
  const name = document.getElementById("item-name").value;
  const price = document.getElementById("item-price").value;
  const stock = document.getElementById("item-stock").value;

  if (!name || !price || !stock) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: parseFloat(price), stock: parseInt(stock) }),
    });

    if (!res.ok) throw new Error("Failed to add item");
    await res.json();

    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
    document.getElementById("item-stock").value = "";

    await loadItems();
  } catch (err) {
    console.error(err);
    alert("Error adding item. Please try again.");
  }
}

// --- Record Sale ---
async function recordSale() {
  const itemId = document.getElementById("sale-item").value;
  const quantity = document.getElementById("sale-qty").value;
  const paymentType = document.getElementById("payment-type").value;
  const buyerType = document.getElementById("buyer-type").value;

  if (!quantity) {
    alert("Enter quantity");
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: parseInt(quantity), paymentType, buyerType }),
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert("✅ Sale recorded successfully!");
      document.getElementById("sale-qty").value = "";
      await loadItems();
    }
  } catch (err) {
    console.error(err);
    alert("Error recording sale. Please check connection.");
  }
}

// --- Download Report ---
async function downloadReport(type) {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  window.location.href = `${apiUrl}/reports/${type}?start=${startDate}&end=${endDate}`;
}

// Load items on page load
window.onload = loadItems;
