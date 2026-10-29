"use strict";

/* =========================================================
   SHOP IN 50 RUPEES - FRONTEND SCRIPT
   ========================================================= */

// Yahan localhost aur live URL dono handle kiye gaye hain
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:"
    ? "http://localhost:5000/api" 
    : "https://shop-in-50-backend.onrender.com/api"; // Yahan apna Render URL dalna hoga agar host kiya ho

const MEDIA_BASE_URL = API_BASE_URL.replace("/api", "");

const PRICE_50_RUPEE = 50;
const PRICE_100_RUPEE = 100;
const SALE_THRESHOLD = 40;
const FIXED_DELIVERY_CHARGE = 300;
const DELIVERY_CHARGE_PER_ITEM = 15;

const STORE_WHATSAPP_NUMBER = "923266501314";
const EASYPaisa_NUMBER = "03266501314";
const STORE_NAME = "Shop in 50 Rupees";

let cart = loadCart();
let lastPlacedOrder = null;
let isOrderSubmitting = false;
let currentDetailProduct = null;
let currentDetailQuantity = 1;
let notificationTimer = null;
let salePopupTimer = null;
let congratsShownForThisCart = false;
let currentDetailMedia = [];
let currentDetailMediaIndex = 0;

document.addEventListener("DOMContentLoaded", function () {
    initializeStore();
});

function initializeStore() {
    normalizeCart();
    forceHideSection("cartSection");
    forceHideSection("checkoutSection");
    forceHideSection("confirmationSection");
    forceHideSection("productDetailsModal");
    document.body.classList.remove("modal-open");

    updateCartUI();
    attachEventListeners();
    updateSaleOfferMessage();
    updateCheckoutSummary();
    togglePaymentDetails();
    scheduleSaleProgressPopup();
    
    // API se products load karein
    loadProductsFromAPI();
}

function attachEventListeners() {
    document.querySelectorAll(".category-card").forEach(function (card) {
        card.addEventListener("click", function () {
            const category = this.dataset.category;
            if (category) filterProducts(category);
        });
    });

    document.getElementById("searchInput")?.addEventListener("input", searchProducts);
    document.getElementById("searchButton")?.addEventListener("click", searchProducts);

    document.getElementById("cartButton")?.addEventListener("click", function (e) {
        e.preventDefault(); openCart();
    });

    document.getElementById("closeCartButton")?.addEventListener("click", function (e) {
        e.preventDefault(); closeCart();
    });

    document.getElementById("emptyCartShopButton")?.addEventListener("click", function (e) {
        e.preventDefault(); closeCart();
        setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 300);
    });

    document.getElementById("proceedToCheckout")?.addEventListener("click", function (e) {
        e.preventDefault(); proceedToCheckout();
    });

    document.getElementById("placeOrderBtn")?.addEventListener("click", function (e) {
        e.preventDefault(); placeOrder();
    });

    document.getElementById("backToCartBtn")?.addEventListener("click", function (e) {
        e.preventDefault(); backToCart();
    });

    document.getElementById("paymentMethod")?.addEventListener("change", togglePaymentDetails);
    document.getElementById("easypaisaTransactionId")?.addEventListener("input", validateEasypaisaTransactionId);

    document.getElementById("printInvoiceBtn")?.addEventListener("click", printInvoice);
    document.getElementById("whatsappInvoiceBtn")?.addEventListener("click", sendWhatsAppInvoice);
    document.getElementById("continueShoppingBtn")?.addEventListener("click", continueShopping);

    document.getElementById("closeProductDetailsButton")?.addEventListener("click", function (e) {
        e.preventDefault(); closeProductDetails();
    });

    document.getElementById("detailMinusButton")?.addEventListener("click", () => changeDetailQuantity(-1));
    document.getElementById("detailPlusButton")?.addEventListener("click", () => changeDetailQuantity(1));
    document.getElementById("detailAddToCartButton")?.addEventListener("click", addDetailProductToCart);

    document.getElementById("prevMediaBtn")?.addEventListener("click", showPrevMedia);
    document.getElementById("nextMediaBtn")?.addEventListener("click", showNextMedia);

    document.getElementById("shopNowButton")?.addEventListener("click", function () {
        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeCart(); closeCheckout(); closeProductDetails();
        }
    });

    document.addEventListener("click", function (event) {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        const id = button.dataset.id;
        if (!id) return;
        if (action === "plus") updateQuantity(id, 1);
        if (action === "minus") updateQuantity(id, -1);
        if (action === "remove") removeFromCart(id);
    });

    document.getElementById("dismissSalePopup")?.addEventListener("click", hideSaleProgressPopup);
}

/* ================= API SE PRODUCTS LOAD ================= */
async function loadProductsFromAPI() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #667085;">⏳ Loading products...</div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error("Server error");
        
        const result = await response.json();
        let products = result.products || [];

        if (products.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #667085;"><h3>No products available</h3><p>Admin panel se products add karein.</p></div>`;
            return;
        }

        grid.innerHTML = products.filter(p => p.active !== false).map(product => {
            const image = product.photos?.[0] ? `${MEDIA_BASE_URL}${product.photos[0]}` : null;
            const categoryLabel = formatCategory(product.category);
            const emoji = product.emoji || "📦";

            return `
                <article class="product-card" data-id="${escapeAttribute(product.id)}" data-category="${escapeAttribute(product.category)}" data-name="${escapeAttribute(product.name)}" data-emoji="${escapeAttribute(emoji)}">
                    <div class="product-image">
                        ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.name)}">` : `<div class="product-placeholder">${escapeHtml(emoji)}</div>`}
                    </div>
                    <div class="product-info">
                        <span class="product-category">${escapeHtml(categoryLabel)}</span>
                        <h3>${escapeHtml(product.name)}</h3>
                        <p class="product-description">${escapeHtml(product.description || "")}</p>
                        <div class="product-price">Rs.100 <span>/ item</span></div>
                        <p class="sale-note">🔥 40+ total items = Rs.50 each</p>
                        <button type="button" class="add-to-cart-button">Add to Cart</button>
                    </div>
                </article>
            `;
        }).join("");

        attachProductCardListeners();

    } catch (error) {
        console.error("Products load error:", error);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #dc3545;"><h3>Products load nahi ho sake</h3><p>Backend server chal raha hai?</p></div>`;
    }
}

/* ================= CART LOGIC ================= */
function loadCart() {
    try {
        const saved = localStorage.getItem("rupee50_cart");
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) { return []; }
}

function saveCart() {
    try { localStorage.setItem("rupee50_cart", JSON.stringify(cart)); } catch (error) {}
}

function normalizeCart() {
    cart = cart.filter(item => item && item.name).map(item => ({
        id: item.id ?? `${Date.now()}-${Math.random()}`,
        productId: item.productId || "",
        name: String(item.name),
        price: Number(item.price) || PRICE_100_RUPEE,
        category: String(item.category || "general"),
        emoji: String(item.emoji || "📦"),
        quantity: Math.max(1, Number(item.quantity) || 1)
    }));
    saveCart();
}

function addToCart(name, price = PRICE_100_RUPEE, category = "general", emoji = "📦", productId = "") {
    const cleanName = String(name || "").trim();
    if (!cleanName) return;

    let existingItem = cart.find(item => productId ? String(item.productId) === String(productId) : String(item.name).toLowerCase() === cleanName.toLowerCase());

    if (existingItem) {
        existingItem.quantity = Number(existingItem.quantity || 0) + 1;
    } else {
        cart.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            productId: String(productId || ""),
            name: cleanName,
            price: Number(price) || PRICE_100_RUPEE,
            category: String(category || "general"),
            emoji: String(emoji || "📦"),
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    updateSaleOfferMessage();
    updateCheckoutSummary();
    updateSaleProgressPopupContent();
    checkAndShowCongratsPopup();
    showNotification(`✅ ${cleanName} cart mein add ho gaya!`);
}

function updateQuantity(productId, change) {
    const item = cart.find(product => String(product.id) === String(productId));
    if (!item) return;
    item.quantity = Number(item.quantity || 0) + Number(change || 0);
    if (item.quantity <= 0) { removeFromCart(productId); return; }
    saveCart(); updateCartUI(); updateSaleOfferMessage(); updateCheckoutSummary(); updateSaleProgressPopupContent(); checkAndShowCongratsPopup();
}

function removeFromCart(productId) {
    cart = cart.filter(item => String(item.id) !== String(productId));
    saveCart(); updateCartUI(); updateSaleOfferMessage(); updateCheckoutSummary(); updateSaleProgressPopupContent();
    if (getTotalQuantity() < SALE_THRESHOLD) congratsShownForThisCart = false;
    showNotification("🗑️ Product cart se remove ho gaya.");
}

function getTotalQuantity() {
    return cart.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
}

function calculateProductsTotal(totalQuantity) {
    const total = Number(totalQuantity) || 0;
    if (total <= 0) return 0;
    if (total >= SALE_THRESHOLD) return total * PRICE_50_RUPEE;
    return total * PRICE_100_RUPEE;
}

function calculateTotals() {
    const totalQuantity = getTotalQuantity();
    const isSaleActive = totalQuantity >= SALE_THRESHOLD;
    const productsTotal = calculateProductsTotal(totalQuantity);
    const unitPrice = isSaleActive ? PRICE_50_RUPEE : PRICE_100_RUPEE;
    const pricePerItem = totalQuantity > 0 ? unitPrice : PRICE_100_RUPEE;

    let deliveryCharges = 0;
    if (totalQuantity > 0 && totalQuantity <= 20) deliveryCharges = FIXED_DELIVERY_CHARGE;
    else if (totalQuantity > 20) deliveryCharges = totalQuantity * DELIVERY_CHARGE_PER_ITEM;

    return { totalQuantity, pricePerItem, unitPrice, productsTotal, deliveryCharges, grandTotal: productsTotal + deliveryCharges, isSaleActive };
}

function calculateCartLineBreakdown() {
    const totals = calculateTotals();
    return cart.map(item => {
        const quantity = Number(item.quantity) || 0;
        return { item, quantity, unitPrice: totals.unitPrice, total: quantity * totals.unitPrice };
    });
}

function updateCartUI() {
    const totalQuantity = getTotalQuantity();
    const cartCount = document.getElementById("cartCount");
    if (cartCount) cartCount.textContent = totalQuantity;
    renderCart();
}

function renderCart() {
    const list = document.getElementById("cartItemsList");
    const empty = document.getElementById("emptyCartMessage");
    const summary = document.getElementById("cartSummary");
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = "";
        if (empty) { empty.classList.remove("hidden"); empty.style.display = "block"; }
        if (summary) { summary.classList.add("hidden"); summary.style.display = "none"; }
        updateCartSummary();
        return;
    }

    if (empty) { empty.classList.add("hidden"); empty.style.display = "none"; }
    if (summary) { summary.classList.remove("hidden"); summary.style.display = "block"; }

    const breakdown = calculateCartLineBreakdown();
    const totals = calculateTotals();

    list.innerHTML = breakdown.map(line => `
        <div class="cart-item">
            <div class="cart-item-image">${escapeHtml(line.item.emoji)}</div>
            <div class="cart-item-info">
                <span>${escapeHtml(formatCategory(line.item.category))}</span>
                <h3>${escapeHtml(line.item.name)}</h3>
                <strong>Rs.${line.unitPrice} <small>/ item</small></strong>
            </div>
            <div class="quantity-controls">
                <button type="button" data-action="minus" data-id="${escapeAttribute(line.item.id)}">−</button>
                <span>${line.quantity}</span>
                <button type="button" data-action="plus" data-id="${escapeAttribute(line.item.id)}">+</button>
            </div>
            <div class="cart-item-total">Rs.${line.total}</div>
            <button type="button" class="remove-cart-item" data-action="remove" data-id="${escapeAttribute(line.item.id)}">✕</button>
        </div>
    `).join("");

    if (totals.isSaleActive) {
        list.innerHTML += `<div class="sale-savings-note">🎉 <strong>Rs.50 SALE UNLOCKED!</strong> Aapne Rs.${(totals.totalQuantity * 50)} ki bachat ki!</div>`;
    }
    updateCartSummary();
}

function updateCartSummary() {
    const totals = calculateTotals();
    setText("productsTotal", `Rs.${totals.productsTotal}`);
    setText("deliveryCharges", `Rs.${totals.deliveryCharges}`);
    setText("grandTotal", `Rs.${totals.grandTotal}`);
}

function updateSaleOfferMessage() {
    const title = document.getElementById("saleOfferTitle");
    const message = document.getElementById("saleOfferMessage");
    const box = document.getElementById("saleOfferBox");
    const total = getTotalQuantity();

    if (total >= SALE_THRESHOLD) {
        if (title) title.textContent = "🔥 SALE UNLOCKED — Rs.50 PER ITEM";
        if (message) message.textContent = `Congratulations! ${total} products are in your cart. Every product is now Rs.50.`;
        if (box) box.classList.add("sale-unlocked");
        return;
    }

    const remaining = SALE_THRESHOLD - total;
    if (title) title.textContent = "🔥 Unlock Rs.50 Per Item Sale";
    if (message) {
        if (total === 0) message.textContent = "Add 40 products to unlock the special Rs.50 price.";
        else message.textContent = `Add ${remaining} more product(s) to unlock Rs.50 per item.`;
    }
    if (box) box.classList.remove("sale-unlocked");
}

/* ================= POPUPS & MODALS ================= */
function scheduleSaleProgressPopup() {
    let popup = document.getElementById("saleProgressPopup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "saleProgressPopup";
        popup.className = "sale-progress-popup";
        popup.innerHTML = `
            <button type="button" class="popup-close-btn" id="dismissSalePopup" aria-label="Close">✕</button>
            <div class="popup-content">
                <div class="popup-icon">🔥</div>
                <div class="popup-dancer" id="popupDancer">🕺</div>
                <div class="popup-info">
                    <h4>RUPEE 50 SALE</h4>
                    <p id="popupProgressText">🎯 0 / 40 products</p>
                    <p id="popupRemainingText">Sirf 40 products aur add karein!</p>
                    <p id="popupSavingsText" class="popup-savings">💰 Bachat: Rs.0</p>
                </div>
                <button type="button" class="popup-cta-btn" id="popupAddMoreBtn">👉 ADD MORE</button>
            </div>
        `;
        document.body.appendChild(popup);
        document.getElementById("dismissSalePopup")?.addEventListener("click", hideSaleProgressPopup);
        document.getElementById("popupAddMoreBtn")?.addEventListener("click", function () {
            window.open(window.location.pathname + "#products", "_blank");
        });
    }
    updateSaleProgressPopupContent();
    showSaleProgressPopup();
    clearTimeout(salePopupTimer);
    salePopupTimer = setTimeout(function () { showSaleProgressPopup(); }, 1000);
}

function updateSaleProgressPopupContent() {
    const total = getTotalQuantity();
    const progressText = document.getElementById("popupProgressText");
    const remainingText = document.getElementById("popupRemainingText");
    const savingsText = document.getElementById("popupSavingsText");
    const popup = document.getElementById("saleProgressPopup");
    const dancer = document.getElementById("popupDancer");
    if (!progressText) return;

    if (total >= SALE_THRESHOLD) {
        if (popup) popup.classList.add("sale-unlocked");
        if (dancer) dancer.style.display = "flex";
        progressText.textContent = `🎉 ${total} / 40 products — SALE UNLOCKED!`;
        remainingText.textContent = "Aapki SAARI products ab sirf Rs.50 each!";
        if (savingsText) savingsText.textContent = `💰 Bachat: Rs.${total * 50}`;
        return;
    }
    if (popup) popup.classList.remove("sale-unlocked");
    if (dancer) dancer.style.display = "none";
    const remaining = SALE_THRESHOLD - total;
    progressText.textContent = `🎯 Aap ne ${total} / 40 products add kiye hain`;
    remainingText.textContent = remaining === 1 ? "🔥 ALMOST THERE! Sirf 1 product aur!" : `Sirf ${remaining} products aur add karein!`;
    if (savingsText) savingsText.textContent = `💰 Bachat: Rs.${total * 50}`;
}

function showSaleProgressPopup() {
    const popup = document.getElementById("saleProgressPopup");
    if (!popup) { scheduleSaleProgressPopup(); return; }
    popup.classList.remove("hidden");
    popup.classList.add("show");
    popup.style.display = "block";
    popup.style.position = "fixed";
    popup.style.bottom = "0"; popup.style.left = "0"; popup.style.right = "0";
    popup.style.zIndex = "99999";
}

function hideSaleProgressPopup() {
    const popup = document.getElementById("saleProgressPopup");
    if (!popup) return;
    popup.classList.remove("show");
    popup.style.display = "none";
    clearTimeout(salePopupTimer);
    salePopupTimer = setTimeout(function () { showSaleProgressPopup(); }, 25000);
}

function checkAndShowCongratsPopup() {
    const total = getTotalQuantity();
    if (total >= SALE_THRESHOLD && !congratsShownForThisCart) {
        congratsShownForThisCart = true;
        showCongratsPopup();
    }
    if (total < SALE_THRESHOLD) congratsShownForThisCart = false;
}

function showCongratsPopup() {
    let popup = document.getElementById("congratsPopup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "congratsPopup";
        popup.className = "congrats-popup";
        popup.innerHTML = `
            <div class="confetti-container" id="confettiContainer"></div>
            <div class="congrats-content">
                <button type="button" class="congrats-close-btn" id="dismissCongratsPopup">✕</button>
                <div class="congrats-emoji">🎉</div>
                <h2>CONGRATULATIONS!</h2>
                <h3>💰 RUPEE 50 SALE IS NOW UNLOCKED! 💰</h3>
                <p>✅ Aapki <strong>SAARI products</strong> ab sirf Rs.50 each!</p>
                <p class="congrats-savings">💰 Aap ne bachaye: <strong>Rs.<span id="congratsSavings">0</span></strong></p>
                <div class="congrats-actions">
                    <button type="button" class="congrats-cta-btn" id="congratsCheckoutBtn">🛒 PROCEED TO CHECKOUT</button>
                    <button type="button" class="congrats-continue-btn" id="congratsContinueBtn">Continue Shopping</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        document.getElementById("congratsSavings").textContent = getTotalQuantity() * 50;
        createConfetti();
        document.getElementById("dismissCongratsPopup").addEventListener("click", hideCongratsPopup);
        document.getElementById("congratsContinueBtn").addEventListener("click", hideCongratsPopup);
        document.getElementById("congratsCheckoutBtn").addEventListener("click", function () {
            hideCongratsPopup(); proceedToCheckout();
        });
    }
    requestAnimationFrame(() => popup.classList.add("show"));
}

function hideCongratsPopup() {
    document.getElementById("congratsPopup")?.classList.remove("show");
}

function createConfetti() {
    const container = document.getElementById("confettiContainer");
    if (!container) return;
    container.innerHTML = "";
    const colors = ["#d4a72c", "#f3d77b", "#0f9d68", "#1677ff", "#dc3545", "#ff9800"];
    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti";
        confetti.style.left = Math.random() * 100 + "%";
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.6 + "s";
        confetti.style.animationDuration = (1.8 + Math.random() * 1.5) + "s";
        container.appendChild(confetti);
    }
}

function openCart() {
    forceHideSection("checkoutSection"); forceHideSection("confirmationSection"); forceHideSection("productDetailsModal");
    const cartSection = document.getElementById("cartSection");
    if (!cartSection) return;

    updateCartUI(); updateSaleOfferMessage(); updateCheckoutSummary();
    cartSection.classList.remove("hidden"); cartSection.classList.add("show");
    
    cartSection.style.setProperty("display", "block", "important");
    cartSection.style.setProperty("visibility", "visible", "important");
    cartSection.style.setProperty("opacity", "1", "important");
    cartSection.style.setProperty("position", "fixed", "important");
    cartSection.style.setProperty("top", "50%", "important");
    cartSection.style.setProperty("left", "50%", "important");
    cartSection.style.setProperty("transform", "translate(-50%, -50%)", "important");
    cartSection.style.setProperty("width", "min(95vw, 900px)", "important");
    cartSection.style.setProperty("max-height", "90vh", "important");
    cartSection.style.setProperty("overflow-y", "auto", "important");
    cartSection.style.setProperty("z-index", "999999", "important");
    cartSection.style.setProperty("background", "#ffffff", "important");
    cartSection.style.setProperty("border-radius", "18px", "important");
    cartSection.style.setProperty("padding", "25px", "important");
    cartSection.style.setProperty("box-shadow", "0 25px 70px rgba(0,0,0,0.5)", "important");
    document.body.classList.add("modal-open");
}

function closeCart() {
    const cartSection = document.getElementById("cartSection");
    if (cartSection) {
        cartSection.classList.add("hidden"); cartSection.classList.remove("show");
        cartSection.style.setProperty("display", "none", "important");
        cartSection.style.setProperty("visibility", "hidden", "important");
        cartSection.style.setProperty("opacity", "0", "important");
        cartSection.style.position = ""; cartSection.style.top = ""; cartSection.style.left = "";
        cartSection.style.transform = ""; cartSection.style.width = ""; cartSection.style.maxHeight = "";
        cartSection.style.overflowY = ""; cartSection.style.zIndex = ""; cartSection.style.background = "";
        cartSection.style.borderRadius = ""; cartSection.style.padding = ""; cartSection.style.boxShadow = "";
    }
    document.body.classList.remove("modal-open");
}

function proceedToCheckout() {
    if (cart.length === 0) { showNotification("❌ Pehle products cart mein add karein."); return; }
    try { sessionStorage.setItem("rupee50_checkout_cart", JSON.stringify(cart)); } catch (e) {}
    const checkoutWindow = window.open("checkout.html", "_blank", "width=900,height=800,resizable=yes,scrollbars=yes");
    if (!checkoutWindow) {
        showNotification("⚠️ New window block hui. Same window mein khol rahe hain.");
        renderCheckoutProducts(); updateCheckoutSummary();
        document.body.classList.remove("modal-open");
        showSection("checkoutSection");
        return;
    }
    closeCart();
}

function backToCart() { forceHideSection("checkoutSection"); openCart(); }
function closeCheckout() { forceHideSection("checkoutSection"); document.body.classList.remove("modal-open"); }

function updateCheckoutSummary() {
    const totals = calculateTotals();
    setText("checkoutProductsTotal", `Rs.${totals.productsTotal}`);
    setText("checkoutDeliveryTotal", `Rs.${totals.deliveryCharges}`);
    setText("checkoutGrandTotal", `Rs.${totals.grandTotal}`);
    renderCheckoutProducts();
}

function renderCheckoutProducts() {
    const list = document.getElementById("checkoutProductsList");
    if (!list) return;
    if (cart.length === 0) { list.innerHTML = "<p>No products in cart.</p>"; return; }
    const breakdown = calculateCartLineBreakdown();
    list.innerHTML = breakdown.map(line => `
        <div class="checkout-product-row">
            <div>
                <strong>${escapeHtml(line.item.name)}</strong>
                <span>${line.quantity} × Rs.${line.unitPrice}</span>
            </div>
            <strong>Rs.${line.total}</strong>
        </div>
    `).join("");
}

function togglePaymentDetails() {
    const method = document.getElementById("paymentMethod");
    const cod = document.getElementById("codDetails");
    const easypaisa = document.getElementById("easypaisaDetails");
    if (!method) return;
    if (cod) { cod.classList.add("hidden"); cod.style.display = "none"; }
    if (easypaisa) { easypaisa.classList.add("hidden"); easypaisa.style.display = "none"; }
    if (method.value === "cod" && cod) { cod.classList.remove("hidden"); cod.style.display = "block"; }
    if (method.value === "easypaisa" && easypaisa) { easypaisa.classList.remove("hidden"); easypaisa.style.display = "block"; }
}

function validateEasypaisaTransactionId() {
    const input = document.getElementById("easypaisaTransactionId");
    const message = document.getElementById("easypaisaValidationMessage");
    if (!input) return false;
    const value = input.value.trim();
    if (!value) {
        if (message) { message.textContent = ""; message.className = "validation-message"; }
        input.classList.remove("input-valid", "input-invalid");
        return false;
    }
    const valid = /^\d{8,20}$/.test(value) && !/^03\d{9}$/.test(value) && !/^923\d{9}$/.test(value) && !/^ORD/i.test(value);
    if (valid) {
        if (message) { message.textContent = "✓ Transaction ID format looks valid."; message.className = "validation-message valid"; }
        input.classList.add("input-valid"); input.classList.remove("input-invalid");
        return true;
    }
    if (message) { message.textContent = "Enter a valid Easypaisa transaction/reference ID."; message.className = "validation-message invalid"; }
    input.classList.remove("input-valid"); input.classList.add("input-invalid");
    return false;
}

function validateCustomerForm() {
    const fields = [
        { id: "customerName", label: "Full Name" },
        { id: "customerPhone", label: "Phone Number" },
        { id: "customerCity", label: "City" },
        { id: "customerAddress", label: "Complete Address" }
    ];
    for (const field of fields) {
        const element = document.getElementById(field.id);
        if (!element || !element.value.trim()) {
            showCheckoutMessage(`❌ ${field.label} is required.`, "error");
            element?.focus();
            return false;
        }
    }
    const phone = cleanPhone(document.getElementById("customerPhone").value);
    if (phone.length < 10 || phone.length > 15) {
        showCheckoutMessage("❌ Please enter a valid phone number.", "error");
        document.getElementById("customerPhone").focus();
        return false;
    }
    const email = document.getElementById("customerEmail")?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showCheckoutMessage("❌ Please enter a valid email address.", "error");
        document.getElementById("customerEmail")?.focus();
        return false;
    }
    return true;
}

async function placeOrder(event) {
    if (event) event.preventDefault();
    if (isOrderSubmitting) return;
    clearCheckoutMessage();
    if (cart.length === 0) { showCheckoutMessage("❌ Cart is empty.", "error"); return; }
    if (!validateCustomerForm()) return;

    const paymentMethod = document.getElementById("paymentMethod")?.value || "";
    if (!paymentMethod) { showCheckoutMessage("❌ Please select a payment method.", "error"); return; }
    if (paymentMethod === "easypaisa" && !validateEasypaisaTransactionId()) {
        showCheckoutMessage("❌ Please enter a valid Easypaisa transaction/reference ID.", "error"); return;
    }

    const totals = calculateTotals();
    const transactionId = document.getElementById("easypaisaTransactionId")?.value.trim() || "";
    const orderData = {
        customer: {
            name: document.getElementById("customerName").value.trim(),
            phone: cleanPhone(document.getElementById("customerPhone").value),
            email: document.getElementById("customerEmail")?.value.trim() || "",
            city: document.getElementById("customerCity").value.trim(),
            address: document.getElementById("customerAddress").value.trim()
        },
        products: cart.map(item => ({ id: item.productId || item.id, name: item.name, category: item.category, emoji: item.emoji, quantity: Number(item.quantity) || 1 })),
        payment: { method: paymentMethod, transactionId: paymentMethod === "easypaisa" ? transactionId : "" },
        notes: document.getElementById("orderNotes")?.value.trim() || "",
        pricing: { totalQuantity: totals.totalQuantity, pricePerItem: totals.pricePerItem, productsTotal: totals.productsTotal, deliveryCharges: totals.deliveryCharges, grandTotal: totals.grandTotal, isSaleActive: totals.isSaleActive }
    };

    isOrderSubmitting = true;
    const button = document.getElementById("placeOrderBtn");
    const originalText = button?.textContent || "🔒 Place Order Securely";
    if (button) { button.disabled = true; button.textContent = "⏳ Processing Order..."; }

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        let result = null;
        try { result = await response.json(); } catch { result = null; }

        if (!response.ok) throw new Error(result?.message || `Server error (${response.status})`);
        if (!result || result.success !== true) throw new Error(result?.message || "Order could not be completed.");

        lastPlacedOrder = result.order || {
            orderNumber: result.orderNumber,
            customer: orderData.customer,
            products: orderData.products.map(p => ({...p, unitPrice: totals.unitPrice, total: p.quantity * totals.unitPrice})),
            payment: result.payment || { ...orderData.payment, status: "Pending" },
            pricing: result.pricing || orderData.pricing
        };

        showOrderConfirmation(lastPlacedOrder);
        cart = []; saveCart(); congratsShownForThisCart = false;
        updateCartUI(); updateSaleOfferMessage(); updateSaleProgressPopupContent();
        hideSaleProgressPopup();
        document.getElementById("checkoutForm")?.reset();
        togglePaymentDetails();

    } catch (error) {
        console.error("Place order error:", error);
        showCheckoutMessage(`❌ ${error.message || "Order place nahi ho saka."}`, "error");
    } finally {
        isOrderSubmitting = false;
        if (button) { button.disabled = false; button.textContent = originalText; }
    }
}

function showOrderConfirmation(order) {
    forceHideSection("checkoutSection"); forceHideSection("cartSection");
    showSection("confirmationSection");
    const customer = order.customer || {};
    const payment = order.payment || {};
    const pricing = order.pricing || {};

    setText("confirmationOrderNumber", order.orderNumber || "—");
    setText("confirmationName", customer.name || "—");
    setText("confirmationPhone", customer.phone || "—");
    setText("confirmationCity", customer.city || "—");
    setText("confirmationPaymentMethod", formatPaymentMethod(payment.method));
    setText("confirmationPaymentStatus", payment.status || (payment.method === "easypaisa" ? "Advance Payment - Awaiting Verification" : "Cash on Delivery - Pending"));
    setText("confirmationProductsTotal", `Rs.${Number(pricing.productsTotal || 0)}`);
    setText("confirmationDelivery", `Rs.${Number(pricing.deliveryCharges || 0)}`);
    setText("confirmationGrandTotal", `Rs.${Number(pricing.grandTotal || 0)}`);

    const productsContainer = document.getElementById("orderedProducts");
    if (productsContainer) {
        productsContainer.innerHTML = (order.products || []).map(item => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice || pricing.pricePerItem || PRICE_100_RUPEE);
            const lineTotal = Number(item.total) || quantity * unitPrice;
            return `
                <div class="ordered-product-row">
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <span>${quantity} × Rs.${unitPrice}</span>
                    </div>
                    <strong>Rs.${lineTotal}</strong>
                </div>
            `;
        }).join("");
    }
}

function continueShopping() {
    forceHideSection("confirmationSection"); forceHideSection("checkoutSection"); forceHideSection("cartSection"); forceHideSection("productDetailsModal");
    document.body.classList.remove("modal-open");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    scheduleSaleProgressPopup();
}

function completeOrder() { if (!lastPlacedOrder) { continueShopping(); return; } showNotification("✅ Order completed successfully."); continueShopping(); }

function printInvoice() {
    if (!lastPlacedOrder) { showNotification("❌ Order information not available."); return; }
    const order = lastPlacedOrder;
    const pricing = order.pricing || {};
    const customer = order.customer || {};
    const payment = order.payment || {};
    const printWindow = window.open("", "_blank");
    if (!printWindow) { showNotification("❌ Browser ne print window block kar di."); return; }

    const products = (order.products || []).map(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice || pricing.pricePerItem || PRICE_100_RUPEE);
        const lineTotal = Number(item.total) || quantity * unitPrice;
        return `<tr><td>${escapeHtml(item.name)}</td><td>${quantity}</td><td>Rs.${unitPrice}</td><td>Rs.${lineTotal}</td></tr>`;
    }).join("");

    printWindow.document.write(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${escapeHtml(order.orderNumber || "")}</title>
        <style>body { font-family: Arial, sans-serif; padding: 35px; } .invoice { max-width: 850px; margin: auto; } .box { border: 1px solid #ddd; padding: 18px; margin: 18px 0; border-radius: 10px; } table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; } .total { margin-top: 20px; margin-left: auto; max-width: 350px; } .total div { display: flex; justify-content: space-between; padding: 8px 0; } .grand { font-size: 20px; font-weight: bold; border-top: 2px solid #172033; padding-top: 12px; }</style>
        </head><body><div class="invoice"><h1>${escapeHtml(STORE_NAME)}</h1><p>Official Order Invoice</p>
        <div class="box"><strong>Order Number:</strong> ${escapeHtml(order.orderNumber || "—")}<br><strong>Customer:</strong> ${escapeHtml(customer.name || "—")}<br><strong>Phone:</strong> ${escapeHtml(customer.phone || "—")}<br><strong>City:</strong> ${escapeHtml(customer.city || "—")}<br><strong>Address:</strong> ${escapeHtml(customer.address || "—")}</div>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${products}</tbody></table>
        <div class="total"><div><span>Products</span><strong>Rs.${Number(pricing.productsTotal || 0)}</strong></div><div><span>Delivery</span><strong>Rs.${Number(pricing.deliveryCharges || 0)}</strong></div><div class="grand"><span>Grand Total</span><strong>Rs.${Number(pricing.grandTotal || 0)}</strong></div></div>
        <div class="box"><strong>Payment:</strong> ${escapeHtml(formatPaymentMethod(payment.method))}<br><strong>Status:</strong> ${escapeHtml(payment.status || "Pending")}</div>
        <p>Thank you for shopping with us.</p></div></body></html>
    `);
    printWindow.document.close(); printWindow.focus(); setTimeout(() => printWindow.print(), 300);
}

async function sendWhatsAppInvoice() {
    if (!lastPlacedOrder) { showNotification("❌ Order information not available."); return; }
    const order = lastPlacedOrder;
    const customer = order.customer || {};
    const pricing = order.pricing || {};
    let invoiceText = `*${STORE_NAME}*\n\nOrder: ${order.orderNumber || "-"}\nCustomer: ${customer.name || "-"}\nPhone: ${customer.phone || "-"}\nCity: ${customer.city || "-"}\n\n*Products:*\n`;
    
    (order.products || []).forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice || pricing.pricePerItem || PRICE_100_RUPEE);
        const lineTotal = Number(item.total) || quantity * unitPrice;
        invoiceText += `${item.name} × ${quantity} = Rs.${lineTotal}\n`;
    });
    invoiceText += `\nProducts Total: Rs.${Number(pricing.productsTotal || 0)}\nDelivery: Rs.${Number(pricing.deliveryCharges || 0)}\n*Grand Total: Rs.${Number(pricing.grandTotal || 0)}*`;

    const whatsappUrl = `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(invoiceText)}`;
    window.open(whatsappUrl, "_blank");
}

/* ================= SEARCH & FILTER ================= */
function searchProducts() {
    const query = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
    const cards = document.querySelectorAll(".product-card");
    let visibleCount = 0;
    cards.forEach(card => {
        const match = !query || (card.dataset.name || "").toLowerCase().includes(query) || (card.dataset.category || "").toLowerCase().includes(query) || card.textContent.toLowerCase().includes(query);
        if (match) { card.classList.remove("product-hidden"); card.style.display = ""; visibleCount++; }
        else { card.classList.add("product-hidden"); card.style.display = "none"; }
    });
    const noProducts = document.getElementById("noProductsMessage");
    if (noProducts) { noProducts.classList.toggle("hidden", visibleCount !== 0); noProducts.style.display = visibleCount === 0 ? "block" : "none"; }
    setText("activeFilter", query ? `Search results for "${query}"` : "Showing All Products");
}

function filterProducts(category) {
    const normalized = String(category || "all").toLowerCase().trim();
    const cards = document.querySelectorAll(".product-card");
    let visibleCount = 0;
    cards.forEach(card => {
        const show = normalized === "all" || String(card.dataset.category || "").toLowerCase() === normalized;
        if (show) { card.classList.remove("product-hidden"); card.style.display = ""; visibleCount++; }
        else { card.classList.add("product-hidden"); card.style.display = "none"; }
    });
    const searchInput = document.getElementById("searchInput"); if (searchInput) searchInput.value = "";
    const noProducts = document.getElementById("noProductsMessage");
    if (noProducts) { noProducts.classList.toggle("hidden", visibleCount !== 0); noProducts.style.display = visibleCount === 0 ? "none" : "block"; }
    setText("activeFilter", `Showing ${normalized === "all" ? "All Products" : formatCategory(normalized)}`);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
}

/* ================= PRODUCT DETAILS ================= */
function openProductDetails(card) {
    if (!card) return;
    currentDetailProduct = {
        id: card.dataset.id || "",
        name: card.dataset.name || "Product",
        category: card.dataset.category || "general",
        emoji: card.dataset.emoji || "📦",
        description: card.querySelector(".product-description")?.textContent?.trim() || "Quality product.",
        price: PRICE_100_RUPEE,
        photos: [], video: ""
    };
    currentDetailQuantity = 1;
    setText("detailProductCategory", formatCategory(currentDetailProduct.category));
    setText("detailProductName", currentDetailProduct.name);
    setText("detailProductPrice", `Rs.${currentDetailProduct.price}`);
    setText("detailProductDescription", currentDetailProduct.description);
    setText("detailProductQuantity", "1");
    const mainMedia = document.getElementById("detailMainMedia");
    if (mainMedia) mainMedia.innerHTML = `<div class="detail-media-emoji">${escapeHtml(currentDetailProduct.emoji)}</div>`;
    document.getElementById("detailThumbnails").innerHTML = "";
    document.getElementById("prevMediaBtn").style.display = "none";
    document.getElementById("nextMediaBtn").style.display = "none";
    showSection("productDetailsModal");
}

function closeProductDetails() { forceHideSection("productDetailsModal"); document.body.classList.remove("modal-open"); currentDetailProduct = null; }
function changeDetailQuantity(change) { currentDetailQuantity = Math.max(1, currentDetailQuantity + Number(change || 0)); setText("detailProductQuantity", currentDetailQuantity); }
function addDetailProductToCart() {
    if (!currentDetailProduct) return;
    for (let i = 0; i < currentDetailQuantity; i++) {
        addToCart(currentDetailProduct.name, currentDetailProduct.price, currentDetailProduct.category, currentDetailProduct.emoji, currentDetailProduct.id);
    }
    closeProductDetails();
}

function showNotification(message) {
    const notification = document.getElementById("cartNotification");
    if (!notification) { console.log(message); return; }
    notification.textContent = message; notification.classList.add("show");
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => notification.classList.remove("show"), 2200);
}

function showSection(id) {
    const element = document.getElementById(id);
    if (!element) return false;
    element.classList.remove("hidden");
    element.style.setProperty("display", "block", "important");
    element.style.setProperty("visibility", "visible", "important");
    element.style.setProperty("opacity", "1", "important");
    if (["cartSection", "productDetailsModal"].includes(id)) document.body.classList.add("modal-open");
    else {
        document.body.classList.remove("modal-open");
        requestAnimationFrame(() => element.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    return true;
}

function forceHideSection(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.classList.add("hidden");
    element.style.setProperty("display", "none", "important");
    element.style.setProperty("visibility", "hidden", "important");
    element.style.setProperty("opacity", "0", "important");
    if (id === "cartSection") {
        element.style.position = ""; element.style.top = ""; element.style.left = ""; element.style.transform = "";
        element.style.width = ""; element.style.maxHeight = ""; element.style.overflowY = ""; element.style.margin = "";
        element.style.background = ""; element.style.borderRadius = ""; element.style.padding = ""; element.style.boxShadow = "";
    }
}

function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function cleanPhone(phone) { return String(phone || "").replace(/[^\d+]/g, ""); }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
function formatCategory(category) { return String(category || "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }
function formatPaymentMethod(method) { return method === "easypaisa" ? "Advance Payment - Easypaisa" : "Cash on Delivery"; }

function showCheckoutMessage(message, type = "error") {
    let element = document.getElementById("checkoutMessage");
    if (!element) {
        const form = document.getElementById("checkoutForm");
        if (!form) { console.error(message); return; }
        element = document.createElement("div"); element.id = "checkoutMessage"; element.className = "checkout-message"; form.prepend(element);
    }
    element.textContent = message; element.className = `checkout-message ${type}`; element.style.display = "block";
}

function clearCheckoutMessage() {
    const element = document.getElementById("checkoutMessage");
    if (!element) return;
    element.textContent = ""; element.className = "checkout-message"; element.style.display = "none";
}

function attachProductCardListeners() {
    document.querySelectorAll(".add-to-cart-button").forEach(button => {
        if (button.dataset.listenerAttached === "true") return;
        button.dataset.listenerAttached = "true";
        button.addEventListener("click", function (e) {
            e.preventDefault(); e.stopPropagation();
            const card = button.closest(".product-card");
            if (!card) return;
            addToCart(card.dataset.name || "Product", 100, card.dataset.category || "general", card.dataset.emoji || "📦", card.dataset.id || "");
        });
    });

    document.querySelectorAll(".product-card").forEach(card => {
        if (card.dataset.detailsListenerAttached === "true") return;
        card.dataset.detailsListenerAttached = "true";
        card.addEventListener("click", function (e) {
            if (e.target.closest(".add-to-cart-button")) return;
            openProductDetails(card);
        });
    });
}

// Mobile Categories Tab Logic
document.addEventListener("DOMContentLoaded", function() {
    const categoriesTabButton = document.getElementById("categoriesTabButton");
    const categoriesTabClose = document.getElementById("categoriesTabClose");
    const categoriesSection = document.getElementById("categories");
    if (!categoriesTabButton || !categoriesSection) return;

    categoriesTabButton.addEventListener("click", function(e) {
        e.preventDefault(); e.stopPropagation();
        categoriesSection.classList.add("tab-open"); document.body.classList.add("categories-tab-open"); document.body.style.overflow = "hidden";
    });

    function closeCategoriesTab() {
        categoriesSection.classList.remove("tab-open"); document.body.classList.remove("categories-tab-open"); document.body.style.overflow = "";
    }

    categoriesTabClose?.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); closeCategoriesTab(); });
    categoriesSection.querySelectorAll(".category-card").forEach(card => card.addEventListener("click", () => setTimeout(closeCategoriesTab, 200)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeCategoriesTab(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 768) closeCategoriesTab(); });
});

// Exports
window.addToCart = addToCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.proceedToCheckout = proceedToCheckout;
window.backToCart = backToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.placeOrder = placeOrder;
window.continueShopping = continueShopping;
window.completeOrder = completeOrder;
window.printInvoice = printInvoice;
window.sendWhatsAppInvoice = sendWhatsAppInvoice;
window.togglePaymentDetails = togglePaymentDetails;
window.closeProductDetails = closeProductDetails;
window.changeDetailQuantity = changeDetailQuantity;
window.addDetailProductToCart = addDetailProductToCart;
window.showOverlay = showSection;
window.hideOverlay = forceHideSection;
window.openProductDetails = openProductDetails;