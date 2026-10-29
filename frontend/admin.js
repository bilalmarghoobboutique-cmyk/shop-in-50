"use strict";

/* =========================================================
   SHOP IN 50 RUPEES - ADMIN DASHBOARD
   ========================================================= */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:"
    ? "http://localhost:5000/api" 
    : "https://shop-in-50-backend.onrender.com/api"; 

const TOKEN_KEY = "rupee50_admin_token";
let adminToken = localStorage.getItem(TOKEN_KEY) || "";
let productsCache = [];
let ordersCache = [];

document.addEventListener("DOMContentLoaded", () => {
    attachAdminListeners();
    if (adminToken) {
        showDashboard();
        loadDashboard();
    } else {
        showLogin();
    }
});

function attachAdminListeners() {
    document.getElementById("loginForm")?.addEventListener("submit", loginAdmin);
    document.getElementById("logoutButton")?.addEventListener("click", logoutAdmin);
    document.getElementById("refreshOrdersButton")?.addEventListener("click", loadOrders);
    document.getElementById("refreshProductsButton")?.addEventListener("click", loadProducts);
    document.getElementById("productForm")?.addEventListener("submit", saveProduct);
    document.getElementById("cancelProductEdit")?.addEventListener("click", resetProductForm);
    document.getElementById("settingsForm")?.addEventListener("submit", saveSettings);
    document.querySelector("[data-close]")?.addEventListener("click", closeOrderModal);
    
    document.getElementById("orderDetailsModal")?.addEventListener("click", event => {
        if (event.target.id === "orderDetailsModal") closeOrderModal();
    });
}

async function apiRequest(endpoint, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (adminToken) headers.set("Authorization", `Bearer ${adminToken}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    let data = null;
    try { data = await response.json(); } catch { data = null; }

    if (response.status === 401) {
        logoutAdmin();
        throw new Error("Admin session expired. Please login again.");
    }
    if (!response.ok) {
        throw new Error(data?.message || `Server error (${response.status})`);
    }
    return data;
}

async function loginAdmin(event) {
    event.preventDefault();
    const username = document.getElementById("adminUsername")?.value.trim();
    const password = document.getElementById("adminPassword")?.value;
    showMessage("loginMessage", "Logging in...", "info");

    try {
        const result = await apiRequest("/admin/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });
        if (!result.success || !result.token) throw new Error(result.message || "Login failed.");
        adminToken = result.token;
        localStorage.setItem(TOKEN_KEY, adminToken);
        showDashboard();
        await loadDashboard();
    } catch (error) {
        showMessage("loginMessage", `❌ ${error.message}`, "error");
    }
}

async function logoutAdmin() {
    try {
        if (adminToken) await fetch(`${API_BASE_URL}/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${adminToken}` } });
    } catch { }
    adminToken = "";
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
}

function showLogin() {
    document.getElementById("loginSection")?.classList.remove("hidden");
    document.getElementById("dashboardSection")?.classList.add("hidden");
}

function showDashboard() {
    document.getElementById("loginSection")?.classList.add("hidden");
    document.getElementById("dashboardSection")?.classList.remove("hidden");
}

async function loadDashboard() {
    try {
        await Promise.all([loadStats(), loadOrders(), loadProducts(), loadSettings()]);
    } catch (error) {
        console.error("Dashboard loading error:", error);
    }
}

async function loadStats() {
    try {
        const result = await apiRequest("/admin/stats");
        const stats = result.stats || {};
        setText("totalOrders", stats.totalOrders || 0);
        setText("pendingOrders", stats.pending || 0);
        setText("totalSales", `Rs.${Number(stats.revenue || 0)}`);
        setText("totalProducts", stats.products || 0);
    } catch (error) { console.warn("Stats load failed:", error); }
}

async function loadOrders() {
    const loading = document.getElementById("ordersLoading");
    const empty = document.getElementById("ordersEmpty");
    loading?.classList.remove("hidden");
    empty?.classList.add("hidden");

    try {
        const result = await apiRequest("/orders");
        ordersCache = Array.isArray(result.orders) ? result.orders : Array.isArray(result) ? result : [];
        renderOrders();
    } catch (error) {
        showMessage("ordersEmpty", `❌ ${error.message}`, "error");
    } finally {
        loading?.classList.add("hidden");
    }
}

function renderOrders() {
    const body = document.getElementById("ordersTableBody");
    const empty = document.getElementById("ordersEmpty");
    if (!body) return;

    if (ordersCache.length === 0) {
        body.innerHTML = "";
        empty?.classList.remove("hidden");
        return;
    }
    empty?.classList.add("hidden");

    body.innerHTML = ordersCache.map(order => {
        const customer = order.customer || {};
        const payment = order.payment || {};
        const pricing = order.pricing || {};
        const status = order.status || "pending";

        return `
            <tr>
                <td><strong>${escapeHtml(order.orderNumber || "—")}</strong></td>
                <td><strong>${escapeHtml(customer.name || "—")}</strong><small>${escapeHtml(customer.phone || "")}</small></td>
                <td>${escapeHtml(formatPayment(payment.method))}</td>
                <td><strong>Rs.${Number(pricing.grandTotal || 0)}</strong></td>
                <td>
                    <select class="status-select" data-order="${escapeAttribute(order.orderNumber)}">
                        ${statusOptions(status)}
                    </select>
                </td>
                <td>${formatDate(order.createdAt)}</td>
                <td><button type="button" class="view-order-button" data-view-order="${escapeAttribute(order.orderNumber)}">View</button></td>
            </tr>
        `;
    }).join("");

    body.querySelectorAll("[data-view-order]").forEach(button => {
        button.addEventListener("click", () => viewOrderDetails(button.dataset.viewOrder));
    });
    body.querySelectorAll(".status-select").forEach(select => {
        select.addEventListener("change", () => changeOrderStatus(select.dataset.order, select.value));
    });
}

async function changeOrderStatus(orderNumber, status) {
    try {
        await apiRequest(`/orders/${encodeURIComponent(orderNumber)}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        await loadOrders();
        await loadStats();
    } catch (error) {
        alert(`Status update failed: ${error.message}`);
        await loadOrders();
    }
}

async function viewOrderDetails(orderNumber) {
    try {
        const result = await apiRequest(`/orders/${encodeURIComponent(orderNumber)}`);
        const order = result.order || result;
        renderOrderDetails(order);
        document.getElementById("orderDetailsModal")?.classList.remove("hidden");
    } catch (error) {
        alert(`Order details error: ${error.message}`);
    }
}

function renderOrderDetails(order) {
    const customer = order.customer || {};
    const payment = order.payment || {};
    const pricing = order.pricing || {};
    setText("orderDetailsNumber", order.orderNumber || "Order");
    const content = document.getElementById("orderDetailsContent");
    if (!content) return;

    const products = (order.products || []).map(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice || pricing.pricePerItem || 100);
        const lineTotal = Number(item.total) || quantity * unitPrice;
        return `
            <div class="detail-product-row">
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${quantity} × Rs.${unitPrice}</small>
                </div>
                <strong>Rs.${lineTotal}</strong>
            </div>
        `;
    }).join("");

    content.innerHTML = `
        <div class="order-detail-grid">
            <div class="detail-box">
                <span>Customer</span>
                <strong>${escapeHtml(customer.name || "—")}</strong>
                <p>${escapeHtml(customer.phone || "")}</p>
                <p>${escapeHtml(customer.city || "")}</p>
                <p>${escapeHtml(customer.address || "")}</p>
                ${customer.email ? `<p>${escapeHtml(customer.email)}</p>` : ""}
            </div>
            <div class="detail-box">
                <span>Payment</span>
                <strong>${escapeHtml(formatPayment(payment.method))}</strong>
                <p>Status: ${escapeHtml(payment.status || "Pending")}</p>
                ${payment.transactionId ? `<p>Transaction ID: <strong>${escapeHtml(payment.transactionId)}</strong></p>` : ""}
            </div>
        </div>
        <h3 class="details-products-title">Products</h3>
        <div class="detail-products-list">${products || "<p>No products.</p>"}</div>
        <div class="detail-totals">
            <div><span>Products</span><strong>Rs.${Number(pricing.productsTotal || 0)}</strong></div>
            <div><span>Delivery</span><strong>Rs.${Number(pricing.deliveryCharges || 0)}</strong></div>
            <div class="grand"><span>Total</span><strong>Rs.${Number(pricing.grandTotal || 0)}</strong></div>
        </div>
    `;
}

function closeOrderModal() {
    document.getElementById("orderDetailsModal")?.classList.add("hidden");
}

async function loadProducts() {
    const loading = document.getElementById("productsLoading");
    loading?.classList.remove("hidden");
    try {
        const result = await apiRequest("/admin/products");
        productsCache = Array.isArray(result.products) ? result.products : [];
        renderProducts();
    } catch (error) {
        showMessage("productsEmpty", `❌ ${error.message}`, "error");
    } finally {
        loading?.classList.add("hidden");
    }
}

function renderProducts() {
    const grid = document.getElementById("adminProductsGrid");
    const empty = document.getElementById("productsEmpty");
    if (!grid) return;

    if (productsCache.length === 0) {
        grid.innerHTML = "";
        empty?.classList.remove("hidden");
        return;
    }
    empty?.classList.add("hidden");

    grid.innerHTML = productsCache.map(product => {
        const image = product.photos?.[0] ? getMediaUrl(product.photos[0]) : "";
        const stockLabel = typeof product.stock === "number" ? `Stock: ${product.stock}` : "";
        return `
            <article class="admin-product-card">
                <div class="admin-product-image">
                    ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.name)}">` : `<span>${escapeHtml(product.emoji || "📦")}</span>`}
                </div>
                <div class="admin-product-info">
                    <span>${escapeHtml(product.category || "General")}</span>
                    <h3>${escapeHtml(product.name)}</h3>
                    <strong>Rs.100 <small>/ item</small></strong>
                    <small class="stock-label">${escapeHtml(stockLabel)}</small>
                    <small>${product.active !== false ? "Active" : "Inactive"}</small>
                    <div class="admin-product-actions">
                        <button type="button" data-edit-product="${escapeAttribute(product.id)}">Edit</button>
                        <button type="button" class="danger" data-delete-product="${escapeAttribute(product.id)}">Delete</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    grid.querySelectorAll("[data-edit-product]").forEach(button => {
        button.addEventListener("click", () => editProduct(button.dataset.editProduct));
    });
    grid.querySelectorAll("[data-delete-product]").forEach(button => {
        button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
    });
}

async function saveProduct(event) {
    event.preventDefault();
    const editingId = document.getElementById("editingProductId").value.trim();
    const formData = new FormData();

    formData.append("name", document.getElementById("productName").value.trim());
    formData.append("category", document.getElementById("productCategory").value);
    formData.append("stock", document.getElementById("productStock").value);
    formData.append("emoji", document.getElementById("productEmoji").value.trim());
    formData.append("description", document.getElementById("productDetails").value.trim());
    formData.append("active", document.getElementById("productActive").checked ? "true" : "false");

    const photoInput = document.getElementById("productPhotos");
    if (photoInput?.files) {
        Array.from(photoInput.files).forEach(file => formData.append("photos", file));
    }

    const videoInput = document.getElementById("productVideo");
    if (videoInput?.files?.length) {
        formData.append("video", videoInput.files[0]);
    }

    if (editingId) {
        formData.append("replacePhotos", document.getElementById("replacePhotos").checked ? "true" : "false");
    }

    try {
        const result = await apiRequest(editingId ? `/products/${encodeURIComponent(editingId)}` : "/products", {
            method: editingId ? "PUT" : "POST",
            body: formData
        });
        showMessage("productFormMessage", `✓ ${result.message || "Product saved successfully."}`, "success");
        resetProductForm();
        await loadProducts();
        await loadStats();
    } catch (error) {
        showMessage("productFormMessage", `❌ ${error.message}`, "error");
    }
}

function editProduct(id) {
    const product = productsCache.find(item => String(item.id) === String(id));
    if (!product) return;
    document.getElementById("editingProductId").value = product.id;
    document.getElementById("productName").value = product.name || "";
    document.getElementById("productCategory").value = product.category || "";
    document.getElementById("productStock").value = product.stock ?? 0;
    document.getElementById("productEmoji").value = product.emoji || "📦";
    document.getElementById("productDetails").value = product.description || "";
    document.getElementById("productActive").checked = product.active !== false;
    document.getElementById("editProductOptions")?.classList.remove("hidden");
    document.getElementById("cancelProductEdit")?.classList.remove("hidden");
    document.getElementById("productForm")?.scrollIntoView({ behavior: "smooth" });
}

function resetProductForm() {
    document.getElementById("productForm")?.reset();
    document.getElementById("editingProductId").value = "";
    document.getElementById("productStock").value = 0;
    document.getElementById("productActive").checked = true;
    document.getElementById("editProductOptions")?.classList.add("hidden");
    document.getElementById("cancelProductEdit")?.classList.add("hidden");
}

async function deleteProduct(id) {
    const product = productsCache.find(item => String(item.id) === String(id));
    if (!product) return;
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
        await apiRequest(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadProducts();
        await loadStats();
    } catch (error) {
        alert(`Delete failed: ${error.message}`);
    }
}

async function loadSettings() {
    try {
        const result = await apiRequest("/settings");
        const settings = result.settings || result;
        document.getElementById("settingsEmail").value = settings.email || "";
        document.getElementById("settingsWhatsapp").value = settings.whatsapp || "";
        document.getElementById("settingsEasypaisa").value = settings.easypaisa || "";
        document.getElementById("settingsSupportHours").value = settings.supportHours || "";
        document.getElementById("settingsAddress").value = settings.address || "";
    } catch (error) {
        showMessage("settingsMessage", `❌ ${error.message}`, "error");
    }
}

async function saveSettings(event) {
    event.preventDefault();
    const data = {
        email: document.getElementById("settingsEmail").value.trim(),
        whatsapp: document.getElementById("settingsWhatsapp").value.trim(),
        easypaisa: document.getElementById("settingsEasypaisa").value.trim(),
        supportHours: document.getElementById("settingsSupportHours").value.trim(),
        address: document.getElementById("settingsAddress").value.trim()
    };
    try {
        await apiRequest("/settings", { method: "PATCH", body: JSON.stringify(data) });
        showMessage("settingsMessage", "✓ Settings saved successfully.", "success");
    } catch (error) {
        showMessage("settingsMessage", `❌ ${error.message}`, "error");
    }
}

function getMediaUrl(value) {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `${API_BASE_URL.replace('/api', '')}${value.startsWith("/") ? value : `/${value}`}`;
}

function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
function showMessage(id, message, type = "info") { const element = document.getElementById(id); if (!element) return; element.textContent = message; element.className = `admin-message ${type}`; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
function formatPayment(method) { return method === "easypaisa" ? "Easypaisa" : "COD"; }
function formatDate(value) { if (!value) return "—"; const date = new Date(value); return isNaN(date.getTime()) ? "—" : date.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }); }
function statusOptions(selected) {
    const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    return statuses.map(status => `<option value="${status}" ${selected === status ? "selected" : ""}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`).join("");
}