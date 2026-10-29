"use strict";

/* =========================================================
   SHOP IN 50 RUPEES - ADMIN DASHBOARD (FIXED)
   ========================================================= */

const TOKEN_KEY = "rupee50_admin_token";
let adminToken = localStorage.getItem(TOKEN_KEY) || "";
let productsCache = [];

// Cloudinary Settings
const CLOUDINARY_CLOUD_NAME = "c95dd1dc2b78b5e486c969b1f5d4d52";
const CLOUDINARY_UPLOAD_PRESET = "sale-50";

document.addEventListener("DOMContentLoaded", () => {
    loadLocalProducts(); 
    attachAdminListeners();

    if (adminToken) {
        showDashboard();
        renderProducts();
    } else {
        showLogin();
    }
});

function attachAdminListeners() {
    document.getElementById("loginForm")?.addEventListener("submit", loginAdmin);
    document.getElementById("logoutButton")?.addEventListener("click", logoutAdmin);
    document.getElementById("productForm")?.addEventListener("submit", saveProduct);
    document.getElementById("cancelProductEdit")?.addEventListener("click", resetProductForm);
    document.getElementById("refreshProductsButton")?.addEventListener("click", renderProducts);
    
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
            renderProducts(); 
        } else {
            showMessage("loginMessage", "❌ Ghalat Username ya Password!", "error");
        }
    }, 500);
}

async function logoutAdmin() {
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

/* ================= PRODUCTS ================= */
function loadLocalProducts() {
    try {
        const saved = localStorage.getItem("rupee50_admin_products");
        if (saved) productsCache = JSON.parse(saved);
        else productsCache = []; 
    } catch (e) {
        productsCache = [];
    }
}

function saveLocalProducts() {
    localStorage.setItem("rupee50_admin_products", JSON.stringify(productsCache));
}

async function saveProduct(event) {
    event.preventDefault();

    const editingId = document.getElementById("editingProductId").value.trim();
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const stock = document.getElementById("productStock").value;
    const emojiInput = document.getElementById("productEmoji");
    const description = document.getElementById("productDetails").value.trim();
    const active = document.getElementById("productActive").checked;

    if (!name || !category || !description) {
        showMessage("productFormMessage", "❌ Name, Category aur Details zaroori hain.", "error");
        return;
    }

    // Image Upload to Cloudinary
    let imageUrl = "";
    const photoInput = document.getElementById("productPhotos");
    
    if (photoInput && photoInput.files.length > 0) {
        showMessage("productFormMessage", "⏳ Image upload ho rahi hai (please wait)...", "info");
        const file = photoInput.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            
            if (data.secure_url) {
                imageUrl = data.secure_url;
                // === AUTO-FILL EMOJI BOX WITH IMAGE URL ===
                emojiInput.value = imageUrl; 
            } else {
                throw new Error(data.error?.message || "Cloudinary ne error diya. Preset 'Unsigned' hai?");
            }
        } catch (error) {
            showMessage("productFormMessage", `❌ Image Upload Failed: ${error.message}`, "error");
            return;
        }
    }

    // Agar image upload nahi hui tu purana emoji use karo
    const finalEmoji = imageUrl || emojiInput.value.trim() || "📦";

    if (editingId) {
        const index = productsCache.findIndex(p => String(p.id) === String(editingId));
        if (index !== -1) {
            const newPhotos = imageUrl ? [imageUrl] : (productsCache[index].photos || []);
            productsCache[index] = { ...productsCache[index], name, category, stock: Number(stock) || 0, emoji: finalEmoji, description, active, photos: newPhotos };
            showMessage("productFormMessage", "✓ Product update ho gaya!", "success");
        }
    } else {
        const newProduct = {
            id: "prod-" + Date.now(),
            name,
            category,
            stock: Number(stock) || 0,
            emoji: finalEmoji,
            description,
            active,
            photos: imageUrl ? [imageUrl] : []
        };
        productsCache.push(newProduct);
        showMessage("productFormMessage", "✓ Naya product save ho gaya!", "success");
    }

    saveLocalProducts();
    renderProducts();
    resetProductForm();
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
        const image = product.photos && product.photos.length > 0 ? product.photos[0] : "";
        
        return `
            <article class="admin-product-card">
                <div class="admin-product-image">
                    ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.name)}">` : `<span>${escapeHtml(product.emoji || "📦")}</span>`}
                </div>
                <div class="admin-product-info">
                    <span>${escapeHtml(product.category || "General")}</span>
                    <h3>${escapeHtml(product.name)}</h3>
                    <strong>Rs.100 <small>/ item</small></strong>
                    <small class="stock-label">Stock: ${product.stock || 0}</small>
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

function deleteProduct(id) {
    const product = productsCache.find(item => String(item.id) === String(id));
    if (!product) return;

    if (confirm(`Kya aap waqai "${product.name}" delete karna chahte hain?`)) {
        productsCache = productsCache.filter(item => String(item.id) !== String(id));
        saveLocalProducts();
        renderProducts();
    }
}

/* ================= HELPERS ================= */
function showMessage(id, message, type = "info") {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `admin-message ${type}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

function closeOrderModal() {
    document.getElementById("orderDetailsModal")?.classList.add("hidden");
}