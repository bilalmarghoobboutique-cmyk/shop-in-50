"use strict";

/* =========================================================
   SHOP IN 50 RUPEES - ADMIN DASHBOARD (SUPABASE + CLOUDINARY)
   ========================================================= */

// Supabase Configuration
const SUPABASE_URL = "https://avcktyxixujsiqlygfuw.supabase.co";
const SUPABASE_KEY = "sb_publishable_bw7yXcQKAaYVtXWrGRlnzA_Q1PdiXer";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "mo7txjdn";
const CLOUDINARY_UPLOAD_PRESET = "sale-50";

const TOKEN_KEY = "rupee50_admin_token";
let adminToken = localStorage.getItem(TOKEN_KEY) || "";
let productsCache = [];

document.addEventListener("DOMContentLoaded", () => {
    attachAdminListeners();

    if (adminToken) {
        showDashboard();
        loadProducts();
        loadStatistics();
    } else {
        showLogin();
    }
});

function attachAdminListeners() {
    document.getElementById("loginForm")?.addEventListener("submit", loginAdmin);
    document.getElementById("logoutButton")?.addEventListener("click", logoutAdmin);
    document.getElementById("productForm")?.addEventListener("submit", saveProduct);
    document.getElementById("cancelProductEdit")?.addEventListener("click", resetProductForm);
    
    document.getElementById("refreshProductsButton")?.addEventListener("click", () => {
        loadProducts();
        loadStatistics();
    });
    
    document.getElementById("refreshStatsButton")?.addEventListener("click", loadStatistics);

    document.querySelector("[data-close]")?.addEventListener("click", closeOrderModal);
    document.getElementById("orderDetailsModal")?.addEventListener("click", event => {
        if (event.target.id === "orderDetailsModal") closeOrderModal();
    });
}

/* ================= LOGIN ================= */
async function loginAdmin(event) {
    event.preventDefault();
    const username = document.getElementById("adminUsername")?.value.trim();
    const password = document.getElementById("adminPassword")?.value;

    showMessage("loginMessage", "Logging in...", "info");

    setTimeout(() => {
        if (username === "admin" && password === "Sidrabilal1#") {
            adminToken = "local_admin_token_" + Date.now();
            localStorage.setItem(TOKEN_KEY, adminToken);
            showDashboard();
            loadProducts(); 
            loadStatistics();
        } else {
            showMessage("loginMessage", "❌ Ghalat Username ya Password!", "error");
        }
    }, 500);
}

function logoutAdmin() {
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

/* ================= SUPABASE API ================= */
async function loadProducts() {
    const grid = document.getElementById("adminProductsGrid");
    if (grid) grid.innerHTML = "<p>⏳ Products loading...</p>";

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!res.ok) throw new Error("Supabase connection failed.");
        productsCache = await res.json();
        renderProducts();
    } catch (error) {
        if (grid) grid.innerHTML = `<p style="color:red;">❌ Error: ${error.message}</p>`;
    }
}

async function saveProduct(event) {
    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const stock = document.getElementById("productStock").value;
    const description = document.getElementById("productDetails").value.trim();
    const active = document.getElementById("productActive").checked;
    const photoInput = document.getElementById("productPhotos");

    if (!name || !category || !description) {
        showMessage("productFormMessage", "❌ Name, Category aur Details zaroori hain.", "error");
        return;
    }

    let imageUrl = "";

    // Upload to Cloudinary
    if (photoInput && photoInput.files.length > 0) {
        showMessage("productFormMessage", "⏳ Image upload ho rahi hai...", "info");
        const formData = new FormData();
        formData.append("file", photoInput.files[0]);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST", body: formData
            });
            const data = await res.json();
            if (data.secure_url) imageUrl = data.secure_url;
            else throw new Error("Cloudinary ne error diya.");
        } catch (err) {
            showMessage("productFormMessage", `❌ Image Upload Failed: ${err.message}`, "error");
            return;
        }
    }

    showMessage("productFormMessage", "⏳ Database mein save ho raha hai...", "info");

    const productData = {
        name: name,
        category: category,
        description: description,
        stock: parseInt(stock) || 0,
        active: active,
        image_url: imageUrl,
        emoji: imageUrl ? "" : "📦"
    };

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(productData)
        });

        if (!res.ok) throw new Error("Database save error.");

        showMessage("productFormMessage", "✓ Product save ho gaya!", "success");
        resetProductForm();
        loadProducts();
        loadStatistics();
    } catch (err) {
        showMessage("productFormMessage", `❌ ${err.message}`, "error");
    }
}

function renderProducts() {
    const grid = document.getElementById("adminProductsGrid");
    if (!grid) return;

    if (productsCache.length === 0) {
        grid.innerHTML = "<p>Koi product nahi hai. Naya add karein.</p>";
        return;
    }

    grid.innerHTML = productsCache.map(product => `
        <article class="admin-product-card">
            <div class="admin-product-image">
                ${product.image_url ? `<img src="${product.image_url}" alt="img">` : `<span>📦</span>`}
            </div>
            <div class="admin-product-info">
                <span>${product.category}</span>
                <h3>${product.name}</h3>
                <strong>Rs.100 <small>/ item</small></strong>
                <small class="stock-label">Stock: ${product.stock}</small>
                <small>${product.active ? "Active" : "Inactive"}</small>
                <div class="admin-product-actions">
                    <button type="button" class="danger" onclick="deleteProduct('${product.id}')">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

async function deleteProduct(id) {
    if (!confirm("Kya aap waqai delete karna chahte hain?")) return;
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
            method: "DELETE",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        loadProducts();
        loadStatistics();
    } catch (err) {
        alert("Delete error: " + err.message);
    }
}

function resetProductForm() {
    document.getElementById("productForm")?.reset();
    document.getElementById("productActive").checked = true;
}

/* ================= STATISTICS ================= */
function loadStatistics() {
    let inStock = 0, lowStock = 0, outOfStock = 0, totalStockValue = 0;

    productsCache.forEach(p => {
        const stock = Number(p.stock) || 0;
        totalStockValue += (stock * 100);
        if (stock === 0) outOfStock++;
        else if (stock <= 5) lowStock++;
        else inStock++;
    });

    // Basic Stats
    setText("totalProducts", productsCache.length);
    setText("totalOrders", 0);
    setText("pendingOrders", 0);
    setText("totalSales", "Rs.0");

    // Stock Status
    setText("stockInStock", inStock);
    setText("stockLowStock", lowStock);
    setText("stockOutOfStock", outOfStock);
    setText("stockTotalValue", `Rs.${totalStockValue}`);

    // Stock Table
    const tbody = document.getElementById("stockListBody");
    if (tbody) {
        tbody.innerHTML = productsCache.length === 0 
            ? `<tr><td colspan="7" style="text-align:center;">No products</td></tr>` 
            : productsCache.map(p => {
                const stock = Number(p.stock) || 0;
                let status = "In Stock", cls = "in-stock";
                if (stock === 0) { status = "Out of Stock"; cls = "out-of-stock"; }
                else if (stock <= 5) { status = "Low Stock"; cls = "low-stock"; }

                return `<tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.category}</td>
                    <td>${stock}</td>
                    <td>0</td>
                    <td>Rs.100</td>
                    <td>Rs.${stock * 100}</td>
                    <td><span class="status-pill ${cls}">${status}</span></td>
                </tr>`;
            }).join("");
    }
}

/* ================= HELPERS ================= */
function showMessage(id, message, type = "info") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.className = `admin-message ${type}`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function closeOrderModal() {
    document.getElementById("orderDetailsModal")?.classList.add("hidden");
}
