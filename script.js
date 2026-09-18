"use strict";

/* =========================================================
   SHOP IN 50 RUPEES
   COMPLETE FRONTEND SCRIPT
   ========================================================= */

/* ================= STORE RULES ================= */

const PRICE_50_RUPEE = 50;
const PRICE_100_RUPEE = 100;

const SALE_THRESHOLD = 40;

const FIXED_DELIVERY_CHARGE = 300;
const DELIVERY_CHARGE_PER_ITEM = 15;

const API_BASE_URL = "https://shop-in-50-backend-production-3c9c.up.railway.app";

const STORE_WHATSAPP_NUMBER = "923266501314";
const EASYPaisa_NUMBER = "03266501314";

const STORE_NAME = "Shop in 50 Rupees";


/* ================= CART STATE ================= */

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


/* ================= DOM READY ================= */

document.addEventListener("DOMContentLoaded", function () {
    initializeStore();
});


/* =========================================================
   INITIALIZE STORE
========================================================= */

function initializeStore() {

    console.log("Initializing Shop in 50 Rupees...");

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

    /* Sale popup system start */
    scheduleSaleProgressPopup();

    /* Load products from API */
    loadProductsFromAPI();

    console.log("Shop in 50 Rupees frontend loaded successfully.");
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function attachEventListeners() {

    /* Category buttons */
    document
        .querySelectorAll(".category-card")
        .forEach(function (card) {

            card.addEventListener("click", function () {

                const category = this.dataset.category;

                if (category) {
                    filterProducts(category);
                }
            });
        });


    /* Search */
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");

    if (searchInput) {
        searchInput.addEventListener("input", searchProducts);
    }

    if (searchButton) {
        searchButton.addEventListener("click", searchProducts);
    }


    /* Cart button */
    const cartButton = document.getElementById("cartButton");

    if (cartButton) {
        cartButton.addEventListener("click", function (event) {
            event.preventDefault();
            openCart();
        });
    }


    /* Close cart */
    const closeCartButton = document.getElementById("closeCartButton");

    if (closeCartButton) {
        closeCartButton.addEventListener("click", function (event) {
            event.preventDefault();
            closeCart();
        });
    }


    /* Empty cart shop button */
    const emptyCartShopButton =
        document.getElementById("emptyCartShopButton");

    if (emptyCartShopButton) {

        emptyCartShopButton.addEventListener("click", function () {

            closeCart();

            document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" });
        });
    }


    /* Proceed to checkout */
    const proceedButton =
        document.getElementById("proceedToCheckout");

    if (proceedButton) {

        proceedButton.addEventListener("click", function (event) {
            event.preventDefault();
            proceedToCheckout();
        });
    }


    /* Checkout form */
    const checkoutForm =
        document.getElementById("checkoutForm");

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", placeOrder);
    }


    /* Place order button */
    const placeOrderBtn =
        document.getElementById("placeOrderBtn");

    if (placeOrderBtn) {

        placeOrderBtn.addEventListener("click", function (event) {
            event.preventDefault();
            placeOrder();
        });
    }


    /* Back to cart */
    const backToCartBtn =
        document.getElementById("backToCartBtn");

    if (backToCartBtn) {

        backToCartBtn.addEventListener("click", function (event) {
            event.preventDefault();
            backToCart();
        });
    }


    /* Payment method */
    const paymentMethod =
        document.getElementById("paymentMethod");

    if (paymentMethod) {
        paymentMethod.addEventListener("change", togglePaymentDetails);
    }


    /* Easypaisa transaction ID */
    const transactionInput =
        document.getElementById("easypaisaTransactionId");

    if (transactionInput) {
        transactionInput.addEventListener(
            "input",
            validateEasypaisaTransactionId
        );
    }


    /* Print invoice */
    const printButton =
        document.getElementById("printInvoiceBtn");

    if (printButton) {
        printButton.addEventListener("click", printInvoice);
    }


    /* WhatsApp invoice */
    const whatsappButton =
        document.getElementById("whatsappInvoiceBtn");

    if (whatsappButton) {
        whatsappButton.addEventListener("click", sendWhatsAppInvoice);
    }


    /* Continue shopping */
    const continueButton =
        document.getElementById("continueShoppingBtn");

    if (continueButton) {
        continueButton.addEventListener("click", continueShopping);
    }


    /* Close product details */
    const closeProductDetailsButton =
        document.getElementById("closeProductDetailsButton");

    if (closeProductDetailsButton) {
        closeProductDetailsButton.addEventListener(
            "click",
            closeProductDetails
        );
    }


    /* Detail quantity buttons */
    const detailMinusButton =
        document.getElementById("detailMinusButton");

    if (detailMinusButton) {
        detailMinusButton.addEventListener("click", function () {
            changeDetailQuantity(-1);
        });
    }


    const detailPlusButton =
        document.getElementById("detailPlusButton");

    if (detailPlusButton) {
        detailPlusButton.addEventListener("click", function () {
            changeDetailQuantity(1);
        });
    }


    const detailAddToCartButton =
        document.getElementById("detailAddToCartButton");

    if (detailAddToCartButton) {
        detailAddToCartButton.addEventListener(
            "click",
            addDetailProductToCart
        );
    }


    /* Media navigation */
    const prevMediaBtn =
        document.getElementById("prevMediaBtn");

    if (prevMediaBtn) {
        prevMediaBtn.addEventListener("click", showPrevMedia);
    }


    const nextMediaBtn =
        document.getElementById("nextMediaBtn");

    if (nextMediaBtn) {
        nextMediaBtn.addEventListener("click", showNextMedia);
    }


    /* Main media click — zoom */
    const mainMedia =
        document.getElementById("detailMainMedia");

    if (mainMedia) {

        mainMedia.addEventListener("click", function (event) {

            if (
                event.target.tagName === "IMG" ||
                event.target.classList.contains("detail-media-emoji")
            ) {
                toggleDetailMediaZoom();
            }
        });
    }


    /* Shop now */
    const shopNowButton =
        document.getElementById("shopNowButton");

    if (shopNowButton) {

        shopNowButton.addEventListener("click", function () {

            document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" });
        });
    }


    /* Escape key */
    document.addEventListener("keydown", function (event) {

        if (event.key !== "Escape") {
            return;
        }

        closeCart();
        closeCheckout();
        closeProductDetails();
    });


    /* Cart item buttons */
    document.addEventListener("click", function (event) {

        const button = event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (!id) return;

        if (action === "plus") {
            updateQuantity(id, 1);
        }

        if (action === "minus") {
            updateQuantity(id, -1);
        }

        if (action === "remove") {
            removeFromCart(id);
        }
    });


    /* Cart backdrop */
    document.addEventListener("click", function (event) {

        const cartSection =
            document.getElementById("cartSection");

        if (cartSection && event.target === cartSection) {
            closeCart();
        }
    });


    /* Sale popup dismiss */
    const dismissSalePopup =
        document.getElementById("dismissSalePopup");

    if (dismissSalePopup) {
        dismissSalePopup.addEventListener("click", hideSaleProgressPopup);
    }


    /* Congrats popup dismiss */
    const dismissCongratsPopup =
        document.getElementById("dismissCongratsPopup");

    if (dismissCongratsPopup) {
        dismissCongratsPopup.addEventListener("click", hideCongratsPopup);
    }
}


/* =========================================================
   CART — LOAD / SAVE / NORMALIZE
========================================================= */

function loadCart() {
    try {
        const saved = localStorage.getItem("rupee50_cart");
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Cart load error:", error);
        return [];
    }
}


function saveCart() {
    try {
        localStorage.setItem("rupee50_cart", JSON.stringify(cart));
    } catch (error) {
        console.error("Cart save error:", error);
    }
}


function normalizeCart() {

    cart = cart
        .filter(function (item) {
            return item && item.name;
        })
        .map(function (item) {

            return {
                id: item.id ?? `${Date.now()}-${Math.random()}`,
                productId: item.productId || "",
                name: String(item.name),
                price: Number(item.price) || PRICE_100_RUPEE,
                category: String(item.category || "general"),
                emoji: String(item.emoji || "📦"),
                quantity: Math.max(1, Number(item.quantity) || 1)
            };
        });

    saveCart();
}


/* =========================================================
   ADD TO CART
========================================================= */

function addToCart(
    name,
    price = PRICE_100_RUPEE,
    category = "general",
    emoji = "📦",
    productId = ""
) {

    const cleanName = String(name || "").trim();

    if (!cleanName) {
        showNotification("❌ Product name missing.");
        return;
    }

    let existingItem = cart.find(function (item) {

        if (productId) {
            return String(item.productId) === String(productId);
        }

        return (
            String(item.name).toLowerCase() === cleanName.toLowerCase()
        );
    });

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

    /* Update sale bar */
    updateSaleProgressPopupContent();

    /* Check if 40th product reached */
    checkAndShowCongratsPopup();

    showNotification(`✅ ${cleanName} cart mein add ho gaya!`);
}


/* =========================================================
   UPDATE QUANTITY
========================================================= */

function updateQuantity(productId, change) {

    const item = cart.find(function (product) {
        return String(product.id) === String(productId);
    });

    if (!item) return;

    item.quantity = Number(item.quantity || 0) + Number(change || 0);

    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveCart();
    updateCartUI();
    updateSaleOfferMessage();
    updateCheckoutSummary();
    updateSaleProgressPopupContent();

    checkAndShowCongratsPopup();
}


/* =========================================================
   REMOVE FROM CART
========================================================= */

function removeFromCart(productId) {

    cart = cart.filter(function (item) {
        return String(item.id) !== String(productId);
    });

    saveCart();
    updateCartUI();
    updateSaleOfferMessage();
    updateCheckoutSummary();
    updateSaleProgressPopupContent();

    const total = getTotalQuantity();

    if (total < SALE_THRESHOLD) {
        congratsShownForThisCart = false;
    }

    showNotification("🗑️ Product cart se remove ho gaya.");
}/* =========================================================
   TOTAL QUANTITY
========================================================= */

function getTotalQuantity() {

    return cart.reduce(function (total, item) {
        return total + Math.max(0, Number(item.quantity) || 0);
    }, 0);
}


/* =========================================================
   CALCULATE PRODUCTS TOTAL
========================================================= */

function calculateProductsTotal(totalQuantity) {

    const total = Number(totalQuantity) || 0;

    if (total <= 0) return 0;

    /* 40+ = SAAB products Rs.50 */
    if (total >= SALE_THRESHOLD) {
        return total * PRICE_50_RUPEE;
    }

    /* 1-39 = Rs.100 each */
    return total * PRICE_100_RUPEE;
}


/* =========================================================
   CALCULATE TOTALS
========================================================= */

function calculateTotals() {

    const totalQuantity = getTotalQuantity();
    const isSaleActive = totalQuantity >= SALE_THRESHOLD;

    const productsTotal = calculateProductsTotal(totalQuantity);

    const unitPrice = isSaleActive ? PRICE_50_RUPEE : PRICE_100_RUPEE;

    const pricePerItem = totalQuantity > 0 ? unitPrice : PRICE_100_RUPEE;

    let deliveryCharges = 0;

    if (totalQuantity > 0 && totalQuantity <= 20) {
        deliveryCharges = FIXED_DELIVERY_CHARGE;
    } else if (totalQuantity > 20) {
        deliveryCharges = totalQuantity * DELIVERY_CHARGE_PER_ITEM;
    }

    const grandTotal = productsTotal + deliveryCharges;

    return {
        totalQuantity,
        pricePerItem,
        unitPrice,
        productsTotal,
        deliveryCharges,
        grandTotal,
        isSaleActive
    };
}


/* =========================================================
   CART LINE BREAKDOWN
========================================================= */

function calculateCartLineBreakdown() {

    const totals = calculateTotals();

    return cart.map(function (item) {

        const quantity = Number(item.quantity) || 0;

        return {
            item,
            quantity,
            unitPrice: totals.unitPrice,
            total: quantity * totals.unitPrice
        };
    });
}


/* =========================================================
   COMPATIBILITY
========================================================= */

function calculateCartTotals(items) {

    const totalProducts = (items || []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
    );

    const productCost = calculateProductsTotal(totalProducts);

    let deliveryCharge = 0;

    if (totalProducts > 0 && totalProducts <= 20) {
        deliveryCharge = FIXED_DELIVERY_CHARGE;
    } else if (totalProducts > 20) {
        deliveryCharge = totalProducts * DELIVERY_CHARGE_PER_ITEM;
    }

    return {
        totalProducts,
        productCost,
        deliveryCharge,
        grandTotal: productCost + deliveryCharge
    };
}


/* =========================================================
   UPDATE CART UI
========================================================= */

function updateCartUI() {

    const totalQuantity = getTotalQuantity();

    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.textContent = totalQuantity;
    }

    renderCart();
}


/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {

    const list = document.getElementById("cartItemsList");
    const empty = document.getElementById("emptyCartMessage");
    const summary = document.getElementById("cartSummary");

    if (!list) return;

    if (cart.length === 0) {

        list.innerHTML = "";

        if (empty) {
            empty.classList.remove("hidden");
            empty.style.display = "block";
        }

        if (summary) {
            summary.classList.add("hidden");
            summary.style.display = "none";
        }

        updateCartSummary();
        return;
    }

    if (empty) {
        empty.classList.add("hidden");
        empty.style.display = "none";
    }

    if (summary) {
        summary.classList.remove("hidden");
        summary.style.display = "block";
    }

    const breakdown = calculateCartLineBreakdown();
    const totals = calculateTotals();

    list.innerHTML = breakdown
        .map(function (line) {

            const item = line.item;

            return `
                <div class="cart-item">

                    <div class="cart-item-image">
                        ${escapeHtml(item.emoji)}
                    </div>

                    <div class="cart-item-info">

                        <span>
                            ${escapeHtml(formatCategory(item.category))}
                        </span>

                        <h3>${escapeHtml(item.name)}</h3>

                        <strong>
                            Rs.${line.unitPrice}
                            <small>/ item</small>
                        </strong>

                    </div>

                    <div class="quantity-controls">

                        <button
                            type="button"
                            data-action="minus"
                            data-id="${escapeAttribute(item.id)}"
                        >−</button>

                        <span>${line.quantity}</span>

                        <button
                            type="button"
                            data-action="plus"
                            data-id="${escapeAttribute(item.id)}"
                        >+</button>

                    </div>

                    <div class="cart-item-total">
                        Rs.${line.total}
                    </div>

                    <button
                        type="button"
                        class="remove-cart-item"
                        data-action="remove"
                        data-id="${escapeAttribute(item.id)}"
                        aria-label="Remove product"
                    >✕</button>

                </div>
            `;
        })
        .join("");

    if (totals.isSaleActive) {

        list.innerHTML += `
            <div class="sale-savings-note">
                🎉 <strong>Rs.50 SALE UNLOCKED!</strong>
                Aapne Rs.${(totals.totalQuantity * 50)} ki bachat ki!
            </div>
        `;
    }

    updateCartSummary();
}


/* =========================================================
   CART SUMMARY
========================================================= */

function updateCartSummary() {

    const totals = calculateTotals();

    setText("productsTotal", `Rs.${totals.productsTotal}`);
    setText("deliveryCharges", `Rs.${totals.deliveryCharges}`);
    setText("grandTotal", `Rs.${totals.grandTotal}`);
}


/* =========================================================
   SALE OFFER MESSAGE
========================================================= */

function updateSaleOfferMessage() {

    const title = document.getElementById("saleOfferTitle");
    const message = document.getElementById("saleOfferMessage");
    const box = document.getElementById("saleOfferBox");

    const total = getTotalQuantity();

    if (total >= SALE_THRESHOLD) {

        if (title) {
            title.textContent = "🔥 SALE UNLOCKED — Rs.50 PER ITEM";
        }

        if (message) {
            message.textContent =
                `Congratulations! ${total} products are in your cart. Every product is now Rs.50.`;
        }

        if (box) box.classList.add("sale-unlocked");

        return;
    }

    const remaining = SALE_THRESHOLD - total;

    if (title) {
        title.textContent = "🔥 Unlock Rs.50 Per Item Sale";
    }

    if (message) {

        if (total === 0) {
            message.textContent =
                "Add 40 products to unlock the special Rs.50 price.";
        } else {
            message.textContent =
                `Add ${remaining} more product(s) to unlock Rs.50 per item.`;
        }
    }

    if (box) box.classList.remove("sale-unlocked");
}


/* =========================================================
   SALE PROGRESS POPUP — CREATE
========================================================= */

function scheduleSaleProgressPopup() {

    console.log("📢 scheduleSaleProgressPopup called");

    let popup = document.getElementById("saleProgressPopup");

    if (!popup) {

        console.log("📢 Creating sale popup element...");

        popup = document.createElement("div");
        popup.id = "saleProgressPopup";
        popup.className = "sale-progress-popup";

        popup.innerHTML = `
            <button
                type="button"
                class="popup-close-btn"
                id="dismissSalePopup"
                aria-label="Close"
            >✕</button>

            <div class="popup-content">

                <div class="popup-icon">🔥</div>

                <div class="popup-dancer" id="popupDancer">🕺</div>

                <div class="popup-info">

                    <h4>RUPEE 50 SALE</h4>

                    <p id="popupProgressText">🎯 0 / 40 products</p>

                    <p id="popupRemainingText">Sirf 40 products aur add karein!</p>

                    <p id="popupSavingsText" class="popup-savings">💰 Bachat: Rs.0</p>

                </div>

                <button
                    type="button"
                    class="popup-cta-btn"
                    id="popupAddMoreBtn"
                >
                    👉 ADD MORE
                </button>

            </div>
        `;

        document.body.appendChild(popup);

        console.log("📢 Popup element created and appended.");

        const dismissBtn = document.getElementById("dismissSalePopup");
        if (dismissBtn) {
            dismissBtn.addEventListener("click", hideSaleProgressPopup);
        }

        const addMoreBtn = document.getElementById("popupAddMoreBtn");
        if (addMoreBtn) {

            addMoreBtn.addEventListener("click", function () {
                window.open(window.location.pathname + "#products", "_blank");
            });
        }
    }

    updateSaleProgressPopupContent();

    console.log("📢 Calling showSaleProgressPopup()...");

    showSaleProgressPopup();

    clearTimeout(salePopupTimer);

    salePopupTimer = setTimeout(function () {
        console.log("📢 Backup showSaleProgressPopup() called");
        showSaleProgressPopup();
    }, 1000);
}


/* =========================================================
   UPDATE SALE POPUP CONTENT
========================================================= */

function updateSaleProgressPopupContent() {

    const total = getTotalQuantity();

    const progressText = document.getElementById("popupProgressText");
    const remainingText = document.getElementById("popupRemainingText");
    const savingsText = document.getElementById("popupSavingsText");
    const popup = document.getElementById("saleProgressPopup");
    const dancer = document.getElementById("popupDancer");

    if (!progressText) return;

    /* SALE UNLOCKED */
    if (total >= SALE_THRESHOLD) {

        if (popup) popup.classList.add("sale-unlocked");
        if (dancer) dancer.style.display = "flex";

        progressText.textContent =
            `🎉 ${total} / 40 products — SALE UNLOCKED!`;

        remainingText.textContent =
            "Aapki SAARI products ab sirf Rs.50 each!";

        if (savingsText) {
            savingsText.textContent = `💰 Bachat: Rs.${total * 50}`;
        }

        return;
    }

    /* Sale not unlocked */
    if (popup) popup.classList.remove("sale-unlocked");
    if (dancer) dancer.style.display = "none";

    const remaining = SALE_THRESHOLD - total;

    progressText.textContent =
        `🎯 Aap ne ${total} / 40 products add kiye hain`;

    if (remaining === 1) {
        remainingText.textContent =
            "🔥 ALMOST THERE! Sirf 1 product aur!";
    } else {
        remainingText.textContent =
            `Sirf ${remaining} products aur add karein!`;
    }

    if (savingsText) {
        savingsText.textContent = `💰 Bachat: Rs.${total * 50}`;
    }
}


/* =========================================================
   SHOW SALE POPUP
========================================================= */

function showSaleProgressPopup() {

    console.log("📢 showSaleProgressPopup() called");

    const popup = document.getElementById("saleProgressPopup");

    if (!popup) {
        console.warn("📢 Popup element not found! Creating...");
        scheduleSaleProgressPopup();
        return;
    }

    /* Force show */
    popup.classList.remove("hidden");
    popup.classList.add("show");

    popup.style.display = "block";
    popup.style.visibility = "visible";
    popup.style.opacity = "1";
    popup.style.position = "fixed";
    popup.style.bottom = "0";
    popup.style.left = "0";
    popup.style.right = "0";
    popup.style.zIndex = "99999";

    console.log("📢 Sale bar shown. Total:", getTotalQuantity());
}


/* =========================================================
   HIDE SALE POPUP
========================================================= */

function hideSaleProgressPopup() {

    const popup = document.getElementById("saleProgressPopup");

    if (!popup) return;

    popup.classList.remove("show");
    popup.style.display = "none";

    clearTimeout(salePopupTimer);

    salePopupTimer = setTimeout(function () {
        showSaleProgressPopup();
    }, 25000);
}


/* =========================================================
   CONGRATS POPUP
========================================================= */

function checkAndShowCongratsPopup() {

    const total = getTotalQuantity();

    if (total >= SALE_THRESHOLD && !congratsShownForThisCart) {
        congratsShownForThisCart = true;
        showCongratsPopup();
    }

    if (total < SALE_THRESHOLD) {
        congratsShownForThisCart = false;
    }
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

                <button
                    type="button"
                    class="congrats-close-btn"
                    id="dismissCongratsPopup"
                    aria-label="Close"
                >✕</button>

                <div class="congrats-emoji">🎉</div>

                <h2>CONGRATULATIONS!</h2>

                <h3>💰 RUPEE 50 SALE IS NOW UNLOCKED! 💰</h3>

                <p>
                    ✅ Aapki <strong>SAARI products</strong>
                    ab sirf Rs.50 each!
                </p>

                <p class="congrats-savings">
                    💰 Aap ne bachaye:
                    <strong>Rs.<span id="congratsSavings">0</span></strong>
                </p>

                <div class="congrats-actions">

                    <button
                        type="button"
                        class="congrats-cta-btn"
                        id="congratsCheckoutBtn"
                    >🛒 PROCEED TO CHECKOUT</button>

                    <button
                        type="button"
                        class="congrats-continue-btn"
                        id="congratsContinueBtn"
                    >Continue Shopping</button>

                </div>

            </div>
        `;

        document.body.appendChild(popup);

        const total = getTotalQuantity();

        document.getElementById("congratsSavings").textContent = total * 50;

        createConfetti();

        document
            .getElementById("dismissCongratsPopup")
            .addEventListener("click", hideCongratsPopup);

        document
            .getElementById("congratsContinueBtn")
            .addEventListener("click", hideCongratsPopup);

        document
            .getElementById("congratsCheckoutBtn")
            .addEventListener("click", function () {
                hideCongratsPopup();
                proceedToCheckout();
            });
    }

    requestAnimationFrame(function () {
        popup.classList.add("show");
    });
}


function hideCongratsPopup() {

    const popup = document.getElementById("congratsPopup");

    if (popup) popup.classList.remove("show");
}


function createConfetti() {

    const container = document.getElementById("confettiContainer");

    if (!container) return;

    container.innerHTML = "";

    const colors = [
        "#d4a72c", "#f3d77b", "#0f9d68",
        "#1677ff", "#dc3545", "#ff9800"
    ];

    for (let i = 0; i < 60; i++) {

        const confetti = document.createElement("div");

        confetti.className = "confetti";

        confetti.style.left = Math.random() * 100 + "%";
        confetti.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.6 + "s";
        confetti.style.animationDuration =
            (1.8 + Math.random() * 1.5) + "s";
        confetti.style.transform =
            `rotate(${Math.random() * 360}deg)`;

        container.appendChild(confetti);
    }
}/* =========================================================
   OPEN CART
========================================================= */

function openCart() {

    console.log("Cart button clicked.");

    forceHideSection("checkoutSection");
    forceHideSection("confirmationSection");
    forceHideSection("productDetailsModal");

    const cartSection = document.getElementById("cartSection");

    if (!cartSection) {
        console.error("cartSection not found.");
        showNotification("❌ Cart section nahi mila.");
        return;
    }

    updateCartUI();
    updateSaleOfferMessage();
    updateCheckoutSummary();

    cartSection.classList.remove("hidden");
    cartSection.style.display = "block";
    cartSection.style.visibility = "visible";
    cartSection.style.opacity = "1";
    cartSection.style.position = "fixed";
    cartSection.style.top = "50%";
    cartSection.style.left = "50%";
    cartSection.style.transform = "translate(-50%, -50%)";
    cartSection.style.width = "min(95vw, 900px)";
    cartSection.style.maxHeight = "90vh";
    cartSection.style.overflowY = "auto";
    cartSection.style.overflowX = "hidden";
    cartSection.style.margin = "0";
    cartSection.style.zIndex = "999999";

    document.body.classList.add("modal-open");

    window.scrollTo({ top: window.scrollY, behavior: "auto" });

    console.log("Cart popup opened successfully.");
}


/* =========================================================
   CLOSE CART
========================================================= */

function closeCart() {

    const cartSection = document.getElementById("cartSection");

    if (cartSection) {
        cartSection.classList.add("hidden");
        cartSection.style.display = "none";
        cartSection.style.visibility = "hidden";
        cartSection.style.opacity = "0";
        cartSection.style.position = "";
        cartSection.style.top = "";
        cartSection.style.left = "";
        cartSection.style.transform = "";
        cartSection.style.width = "";
        cartSection.style.maxHeight = "";
        cartSection.style.overflowY = "";
        cartSection.style.overflowX = "";
        cartSection.style.margin = "";
        cartSection.style.zIndex = "";
    }

    document.body.classList.remove("modal-open");
    console.log("Cart popup closed.");
}


/* =========================================================
   PROCEED TO CHECKOUT
========================================================= */

function proceedToCheckout() {

    if (cart.length === 0) {
        showNotification("❌ Pehle products cart mein add karein.");
        return;
    }

    try {
        sessionStorage.setItem(
            "rupee50_checkout_cart",
            JSON.stringify(cart)
        );
    } catch (e) {
        console.warn("sessionStorage save failed:", e);
    }

    const checkoutWindow = window.open(
        "checkout.html",
        "_blank",
        "width=900,height=800,resizable=yes,scrollbars=yes"
    );

    if (!checkoutWindow) {
        showNotification(
            "⚠️ New window block hui. Same window mein khol rahe hain."
        );

        renderCheckoutProducts();
        updateCheckoutSummary();
        document.body.classList.remove("modal-open");
        showSection("checkoutSection");
        return;
    }

    closeCart();
}


/* =========================================================
   BACK TO CART
========================================================= */

function backToCart() {
    forceHideSection("checkoutSection");
    openCart();
}


/* =========================================================
   CLOSE CHECKOUT
========================================================= */

function closeCheckout() {
    forceHideSection("checkoutSection");
    document.body.classList.remove("modal-open");
}


/* =========================================================
   CHECKOUT SUMMARY
========================================================= */

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

    if (cart.length === 0) {
        list.innerHTML = "<p>No products in cart.</p>";
        return;
    }

    const breakdown = calculateCartLineBreakdown();

    list.innerHTML = breakdown
        .map(function (line) {

            const item = line.item;
            const priceLabel =
                `${line.quantity} × Rs.${line.unitPrice}`;

            return `
                <div class="checkout-product-row">
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <span>${priceLabel}</span>
                    </div>
                    <strong>Rs.${line.total}</strong>
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   PAYMENT DETAILS
========================================================= */

function togglePaymentDetails() {

    const paymentMethod = document.getElementById("paymentMethod");
    const cod = document.getElementById("codDetails");
    const easypaisa = document.getElementById("easypaisaDetails");

    if (!paymentMethod) return;

    if (cod) {
        cod.classList.add("hidden");
        cod.style.display = "none";
    }

    if (easypaisa) {
        easypaisa.classList.add("hidden");
        easypaisa.style.display = "none";
    }

    if (paymentMethod.value === "cod") {
        if (cod) {
            cod.classList.remove("hidden");
            cod.style.display = "block";
        }
    }

    if (paymentMethod.value === "easypaisa") {
        if (easypaisa) {
            easypaisa.classList.remove("hidden");
            easypaisa.style.display = "block";
        }
    }
}


/* =========================================================
   EASYPAISA VALIDATION
========================================================= */

function validateEasypaisaTransactionId() {

    const input = document.getElementById("easypaisaTransactionId");
    const message = document.getElementById("easypaisaValidationMessage");

    if (!input) return false;

    const value = input.value.trim();

    if (!value) {

        if (message) {
            message.textContent = "";
            message.className = "validation-message";
        }

        input.classList.remove("input-valid", "input-invalid");
        return false;
    }

    const digitsOnly = /^\d{8,20}$/;
    const mobilePattern1 = /^03\d{9}$/;
    const mobilePattern2 = /^923\d{9}$/;
    const orderPattern = /^ORD/i;

    let valid = digitsOnly.test(value);

    if (
        mobilePattern1.test(value) ||
        mobilePattern2.test(value) ||
        orderPattern.test(value)
    ) {
        valid = false;
    }

    if (valid) {

        if (message) {
            message.textContent = "✓ Transaction ID format looks valid.";
            message.className = "validation-message valid";
        }

        input.classList.add("input-valid");
        input.classList.remove("input-invalid");
        return true;
    }

    if (message) {
        message.textContent =
            "Enter a valid Easypaisa transaction/reference ID.";
        message.className = "validation-message invalid";
    }

    input.classList.remove("input-valid");
    input.classList.add("input-invalid");

    return false;
}


/* =========================================================
   CUSTOMER FORM VALIDATION
========================================================= */

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

            showCheckoutMessage(
                `❌ ${field.label} is required.`,
                "error"
            );

            element?.focus();
            return false;
        }
    }

    const phoneElement = document.getElementById("customerPhone");
    const phone = cleanPhone(phoneElement.value);

    if (phone.length < 10 || phone.length > 15) {

        showCheckoutMessage(
            "❌ Please enter a valid phone number.",
            "error"
        );

        phoneElement.focus();
        return false;
    }

    const emailElement = document.getElementById("customerEmail");

    if (emailElement) {

        const email = emailElement.value.trim();

        if (!email) {
            showCheckoutMessage("❌ Email address is required.", "error");
            emailElement.focus();
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showCheckoutMessage(
                "❌ Please enter a valid email address.",
                "error"
            );
            emailElement.focus();
            return false;
        }
    }

    return true;
}


/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder(event) {

    if (event) event.preventDefault();

    if (isOrderSubmitting) return;

    clearCheckoutMessage();

    if (cart.length === 0) {
        showCheckoutMessage("❌ Cart is empty.", "error");
        return;
    }

    if (!validateCustomerForm()) return;

    const paymentMethod =
        document.getElementById("paymentMethod")?.value || "";

    if (!paymentMethod) {
        showCheckoutMessage(
            "❌ Please select a payment method.",
            "error"
        );
        return;
    }

    if (paymentMethod === "easypaisa") {

        if (!validateEasypaisaTransactionId()) {
            showCheckoutMessage(
                "❌ Please enter a valid Easypaisa transaction/reference ID.",
                "error"
            );
            return;
        }
    }

    const totals = calculateTotals();

    const transactionInput =
        document.getElementById("easypaisaTransactionId");

    const transactionId = transactionInput?.value.trim() || "";

    const emailElement = document.getElementById("customerEmail");

    const orderData = {

        customer: {
            name: document.getElementById("customerName").value.trim(),
            phone: cleanPhone(
                document.getElementById("customerPhone").value
            ),
            email: emailElement ? emailElement.value.trim() : "",
            city: document.getElementById("customerCity").value.trim(),
            address: document.getElementById("customerAddress").value.trim()
        },

        products: cart.map(function (item) {
            return {
                id: item.productId || item.id,
                name: item.name,
                category: item.category,
                emoji: item.emoji,
                quantity: Number(item.quantity) || 1
            };
        }),

        payment: {
            method: paymentMethod,
            transactionId:
                paymentMethod === "easypaisa" ? transactionId : ""
        },

        notes:
            document.getElementById("orderNotes")?.value.trim() || "",

        pricing: {
            totalQuantity: totals.totalQuantity,
            pricePerItem: totals.pricePerItem,
            productsTotal: totals.productsTotal,
            deliveryCharges: totals.deliveryCharges,
            grandTotal: totals.grandTotal,
            isSaleActive: totals.isSaleActive
        }
    };

    isOrderSubmitting = true;

    const button =
        document.getElementById("placeOrderBtn") ||
        document.querySelector(".place-order-button");

    const originalText =
        button?.textContent || "🔒 Place Order Securely";

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ Processing Order...";
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/orders`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData)
            }
        );

        let result = null;

        try {
            result = await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            throw new Error(
                result?.message || `Server error (${response.status})`
            );
        }

        if (!result || result.success !== true) {
            throw new Error(
                result?.message || "Order could not be completed."
            );
        }

        lastPlacedOrder =
            result.order || {
                orderNumber: result.orderNumber,
                customer: orderData.customer,
                products: orderData.products,
                payment: orderData.payment,
                pricing: result.pricing || orderData.pricing
            };

        showOrderConfirmation(lastPlacedOrder);

        cart = [];
        saveCart();
        congratsShownForThisCart = false;

        updateCartUI();
        updateSaleOfferMessage();
        updateSaleProgressPopupContent();

        hideSaleProgressPopup();

        document.getElementById("checkoutForm")?.reset();
        togglePaymentDetails();

    } catch (error) {

        console.error("Place order error:", error);
        showCheckoutMessage(
            `❌ ${error.message || "Order place nahi ho saka."}`,
            "error"
        );

    } finally {

        isOrderSubmitting = false;

        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}


/* =========================================================
   SHOW ORDER CONFIRMATION
========================================================= */

function showOrderConfirmation(order) {

    forceHideSection("checkoutSection");
    forceHideSection("cartSection");

    showSection("confirmationSection");

    const customer = order.customer || {};
    const payment = order.payment || {};
    const pricing = order.pricing || {};

    setText(
        "confirmationOrderNumber",
        order.orderNumber || "—"
    );

    setText("confirmationName", customer.name || "—");
    setText("confirmationPhone", customer.phone || "—");
    setText("confirmationCity", customer.city || "—");

    setText(
        "confirmationPaymentMethod",
        formatPaymentMethod(payment.method)
    );

    setText(
        "confirmationPaymentStatus",
        payment.status ||
        (payment.method === "easypaisa"
            ? "Advance Payment - Awaiting Verification"
            : "Cash on Delivery - Pending")
    );

    setText(
        "confirmationProductsTotal",
        `Rs.${Number(pricing.productsTotal || 0)}`
    );

    setText(
        "confirmationDelivery",
        `Rs.${Number(pricing.deliveryCharges || 0)}`
    );

    setText(
        "confirmationGrandTotal",
        `Rs.${Number(pricing.grandTotal || 0)}`
    );

    const productsContainer =
        document.getElementById("orderedProducts");

    if (productsContainer) {

        productsContainer.innerHTML =
            (order.products || [])
                .map(function (item) {

                    const quantity = Number(item.quantity) || 0;

                    const unitPrice =
                        Number(
                            item.unitPrice ||
                            pricing.pricePerItem ||
                            PRICE_100_RUPEE
                        );

                    const lineTotal =
                        Number(item.total) || quantity * unitPrice;

                    return `
                        <div class="ordered-product-row">
                            <div>
                                <strong>${escapeHtml(item.name)}</strong>
                                <span>${quantity} × Rs.${unitPrice}</span>
                            </div>
                            <strong>Rs.${lineTotal}</strong>
                        </div>
                    `;
                })
                .join("");
    }
}


/* =========================================================
   CONTINUE SHOPPING
========================================================= */

function continueShopping() {

    forceHideSection("confirmationSection");
    forceHideSection("checkoutSection");
    forceHideSection("cartSection");
    forceHideSection("productDetailsModal");

    document.body.classList.remove("modal-open");

    document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });

    scheduleSaleProgressPopup();
}


function completeOrder() {

    if (!lastPlacedOrder) {
        continueShopping();
        return;
    }

    showNotification("✅ Order completed successfully.");
    continueShopping();
}


/* =========================================================
   PRINT INVOICE
========================================================= */

function printInvoice() {

    if (!lastPlacedOrder) {
        showNotification("❌ Order information not available.");
        return;
    }

    const order = lastPlacedOrder;
    const pricing = order.pricing || {};
    const customer = order.customer || {};
    const payment = order.payment || {};

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        showNotification("❌ Browser ne print window block kar di.");
        return;
    }

    const products =
        (order.products || [])
            .map(function (item) {

                const quantity = Number(item.quantity) || 0;

                const unitPrice =
                    Number(
                        item.unitPrice ||
                        pricing.pricePerItem ||
                        PRICE_100_RUPEE
                    );

                const lineTotal =
                    Number(item.total) || quantity * unitPrice;

                return `
                    <tr>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${quantity}</td>
                        <td>Rs.${unitPrice}</td>
                        <td>Rs.${lineTotal}</td>
                    </tr>
                `;
            })
            .join("");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice ${escapeHtml(order.orderNumber || "")}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 35px; color: #172033; }
                .invoice { max-width: 850px; margin: auto; }
                h1 { margin-bottom: 4px; }
                .muted { color: #667085; }
                .box { border: 1px solid #ddd; padding: 18px; margin: 18px 0; border-radius: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
                .total { margin-top: 20px; margin-left: auto; max-width: 350px; }
                .total div { display: flex; justify-content: space-between; padding: 8px 0; }
                .grand { font-size: 20px; font-weight: bold; border-top: 2px solid #172033; padding-top: 12px; }
            </style>
        </head>
        <body>
            <div class="invoice">
                <h1>${escapeHtml(STORE_NAME)}</h1>
                <p class="muted">Official Order Invoice</p>
                <div class="box">
                    <strong>Order Number:</strong> ${escapeHtml(order.orderNumber || "—")}<br>
                    <strong>Customer:</strong> ${escapeHtml(customer.name || "—")}<br>
                    <strong>Phone:</strong> ${escapeHtml(customer.phone || "—")}<br>
                    <strong>City:</strong> ${escapeHtml(customer.city || "—")}<br>
                    <strong>Address:</strong> ${escapeHtml(customer.address || "—")}
                </div>
                <table>
                    <thead>
                        <tr><th>Product</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
                    </thead>
                    <tbody>${products}</tbody>
                </table>
                <div class="total">
                    <div><span>Products</span><strong>Rs.${Number(pricing.productsTotal || 0)}</strong></div>
                    <div><span>Delivery</span><strong>Rs.${Number(pricing.deliveryCharges || 0)}</strong></div>
                    <div class="grand"><span>Grand Total</span><strong>Rs.${Number(pricing.grandTotal || 0)}</strong></div>
                </div>
                <div class="box">
                    <strong>Payment:</strong> ${escapeHtml(formatPaymentMethod(payment.method))}<br>
                    <strong>Status:</strong> ${escapeHtml(payment.status || "Pending")}
                </div>
                <p class="muted">Thank you for shopping with us.</p>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(function () { printWindow.print(); }, 300);
}


/* =========================================================
   WHATSAPP INVOICE
========================================================= */

async function sendWhatsAppInvoice() {

    if (!lastPlacedOrder) {
        showNotification("❌ Order information not available.");
        return;
    }

    const order = lastPlacedOrder;
    const customer = order.customer || {};
    const pricing = order.pricing || {};

    let invoiceText = `*${STORE_NAME}*\n\n`;
    invoiceText += `Order: ${order.orderNumber || "-"}\n`;
    invoiceText += `Customer: ${customer.name || "-"}\n`;
    invoiceText += `Phone: ${customer.phone || "-"}\n`;
    invoiceText += `City: ${customer.city || "-"}\n\n`;
    invoiceText += `*Products:*\n`;

    (order.products || []).forEach(function (item) {

        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(
            item.unitPrice || pricing.pricePerItem || PRICE_100_RUPEE
        );
        const lineTotal =
            Number(item.total) || quantity * unitPrice;

        invoiceText +=
            `${item.name} × ${quantity} = Rs.${lineTotal}\n`;
    });

    invoiceText +=
        `\nProducts Total: Rs.${Number(pricing.productsTotal || 0)}`;
    invoiceText +=
        `\nDelivery: Rs.${Number(pricing.deliveryCharges || 0)}`;
    invoiceText +=
        `\n*Grand Total: Rs.${Number(pricing.grandTotal || 0)}*`;

    try {

        const response = await fetch(
            `${API_BASE_URL}/whatsapp/send-invoice`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderNumber: order.orderNumber,
                    customerPhone: customer.phone,
                    invoiceText
                })
            }
        );

        const result = await response.json();

        if (result.success) {
            showNotification("✅ WhatsApp invoice sent.");
            return;
        }

    } catch (error) {
        console.warn("WhatsApp API unavailable:", error);
    }

    const whatsappUrl =
        `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${
            encodeURIComponent(invoiceText)
        }`;

    window.open(whatsappUrl, "_blank");
}


/* =========================================================
   EASYPAISA PAYMENT WINDOW
========================================================= */

function openEasypaisaPaymentWindow() {

    const totals = calculateTotals();

    const paymentWindow = window.open(
        "",
        "_blank",
        "width=520,height=700,resizable=yes,scrollbars=yes"
    );

    if (!paymentWindow) {
        showNotification("❌ New window blocked. Please allow popups.");
        return;
    }

    paymentWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Easypaisa Payment</title>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; padding: 25px; font-family: Arial, sans-serif; background: #f4f6f8; color: #172033; }
                .payment-box { max-width: 460px; margin: 20px auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 50px rgba(0,0,0,.12); }
                .brand { text-align: center; font-size: 28px; font-weight: 900; margin-bottom: 6px; }
                .muted { text-align: center; color: #667085; }
                .amount { margin: 25px 0; padding: 22px; text-align: center; background: #eef8ff; border-radius: 15px; border: 1px solid #b8ddf8; }
                .amount span { display: block; font-size: 13px; color: #53657a; }
                .amount strong { display: block; margin-top: 5px; font-size: 35px; }
                .account { margin: 15px 0; padding: 16px; background: #f8fafc; border-radius: 12px; }
                .account span { display: block; font-size: 12px; color: #667085; }
                .account strong { display: block; margin-top: 5px; font-size: 21px; }
                .steps { line-height: 1.8; }
                .warning { margin-top: 20px; padding: 15px; border-radius: 12px; background: #fff8e6; border: 1px solid #f4d68d; }
            </style>
        </head>
        <body>
            <div class="payment-box">
                <div class="brand">Shop in 50 Rupees</div>
                <p class="muted">Easypaisa Advance Payment</p>

                <div class="amount">
                    <span>PAY THIS AMOUNT</span>
                    <strong>Rs.${totals.grandTotal}</strong>
                </div>

                <div class="account">
                    <span>Account Title</span>
                    <strong>Syed Ahmed Bilal</strong>
                </div>

                <div class="account">
                    <span>Easypaisa Number</span>
                    <strong>${EASYPaisa_NUMBER}</strong>
                </div>

                <div class="steps">
                    <strong>Payment Steps</strong>
                    <ol>
                        <li>Open Easypaisa.</li>
                        <li>Send Rs.${totals.grandTotal}.</li>
                        <li>Keep your transaction/reference ID.</li>
                        <li>Return to checkout.</li>
                        <li>Enter the transaction/reference ID.</li>
                    </ol>
                </div>

                <div class="warning">
                    ⚠️ Enter only your genuine Easypaisa transaction/reference ID.
                </div>
            </div>
        </body>
        </html>
    `);

    paymentWindow.document.close();
}


/* =========================================================
   COPY EASYPAISA NUMBER
========================================================= */

async function copyPaymentNumber() {

    try {
        await navigator.clipboard.writeText(EASYPaisa_NUMBER);
        showNotification("✅ Easypaisa number copied.");
    } catch {
        showNotification(`📱 Easypaisa: ${EASYPaisa_NUMBER}`);
    }
}


/* =========================================================
   SEARCH / FILTER
========================================================= */

function searchProducts() {

    const input = document.getElementById("searchInput");
    const query = input?.value.trim().toLowerCase() || "";
    const cards = document.querySelectorAll(".product-card");

    let visibleCount = 0;

    cards.forEach(function (card) {

        const name = (card.dataset.name || "").toLowerCase();
        const category = (card.dataset.category || "").toLowerCase();
        const text = card.textContent.toLowerCase();

        const match =
            !query ||
            name.includes(query) ||
            category.includes(query) ||
            text.includes(query);

        if (match) {
            card.classList.remove("product-hidden");
            card.style.display = "";
            visibleCount++;
        } else {
            card.classList.add("product-hidden");
            card.style.display = "none";
        }
    });

    const noProducts = document.getElementById("noProductsMessage");

    if (noProducts) {
        noProducts.classList.toggle("hidden", visibleCount !== 0);
        noProducts.style.display =
            visibleCount === 0 ? "block" : "none";
    }

    setText(
        "activeFilter",
        query
            ? `Search results for "${query}"`
            : "Showing All Products"
    );
}


function filterProducts(category) {

    const normalized =
        String(category || "all").toLowerCase().trim();

    const cards = document.querySelectorAll(".product-card");

    let visibleCount = 0;

    cards.forEach(function (card) {

        const productCategory =
            String(card.dataset.category || "").toLowerCase();

        const show =
            normalized === "all" ||
            productCategory === normalized;

        if (show) {
            card.classList.remove("product-hidden");
            card.style.display = "";
            visibleCount++;
        } else {
            card.classList.add("product-hidden");
            card.style.display = "none";
        }
    });

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";

    const noProducts = document.getElementById("noProductsMessage");

    if (noProducts) {
        noProducts.classList.toggle("hidden", visibleCount !== 0);
        noProducts.style.display =
            visibleCount === 0 ? "block" : "none";
    }

    const categoryName =
        normalized === "all"
            ? "All Products"
            : formatCategory(normalized);

    setText("activeFilter", `Showing ${categoryName}`);

    document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });
}


/* =========================================================
   PRODUCT DETAILS — OPEN
========================================================= */

function openProductDetails(card) {

    if (!card) return;

    const productId = card.dataset.id || "";

    currentDetailProduct = {
        id: productId,
        name: card.dataset.name || "Product",
        category: card.dataset.category || "general",
        emoji:
            card.dataset.emoji ||
            card.querySelector(".product-placeholder")
                ?.textContent?.trim() ||
            "📦",
        description:
            card.querySelector(".product-description")
                ?.textContent?.trim() ||
            card.querySelector(".product-info p")
                ?.textContent?.trim() ||
            "Quality product.",
        price: PRICE_100_RUPEE,
        photos: [],
        video: ""
    };

    currentDetailQuantity = 1;

    setText(
        "detailProductCategory",
        formatCategory(currentDetailProduct.category)
    );

    setText("detailProductName", currentDetailProduct.name);
    setText("detailProductPrice", `Rs.${currentDetailProduct.price}`);
    setText("detailProductDescription", currentDetailProduct.description);
    setText("detailProductQuantity", "1");

    const mainMedia = document.getElementById("detailMainMedia");

    if (mainMedia) {
        mainMedia.innerHTML = `
            <div class="detail-media-emoji">
                ${escapeHtml(currentDetailProduct.emoji)}
            </div>
        `;
    }

    const thumbnails = document.getElementById("detailThumbnails");
    if (thumbnails) thumbnails.innerHTML = "";

    const prevBtn = document.getElementById("prevMediaBtn");
    const nextBtn = document.getElementById("nextMediaBtn");
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";

    showSection("productDetailsModal");

    if (productId) {
        fetchProductDetails(productId);
    }
}


/* =========================================================
   FETCH PRODUCT DETAILS
========================================================= */

async function fetchProductDetails(productId) {

    try {

        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) return;

        const result = await response.json();

        const products = Array.isArray(result.products)
            ? result.products
            : [];

        const product = products.find(
            p => String(p.id) === String(productId)
        );

        if (!product) return;

        if (product.description) {
            currentDetailProduct.description = product.description;
            setText("detailProductDescription", product.description);
        }

        const media = [];

        (product.photos || []).forEach(function (photo, index) {
            media.push({
                type: "image",
                src: `https://shop-in-50-backend-production-3c9c.up.railway.app${photo}`,
                index
            });
        });

        if (product.video) {
            media.push({
                type: "video",
                src: `https://shop-in-50-backend-production-3c9c.up.railway.app${product.video}`,
                index: media.length
            });
        }

        if (media.length === 0) return;

        currentDetailMedia = media;
        currentDetailMediaIndex = 0;

        renderDetailMedia();
        renderDetailThumbnails();

        const prevBtn = document.getElementById("prevMediaBtn");
        const nextBtn = document.getElementById("nextMediaBtn");

        if (media.length > 1) {
            if (prevBtn) prevBtn.style.display = "grid";
            if (nextBtn) nextBtn.style.display = "grid";
        }

    } catch (error) {
        console.warn("Failed to fetch product details:", error);
    }
}


/* =========================================================
   RENDER MEDIA
========================================================= */

function renderDetailMedia() {

    const mainMedia = document.getElementById("detailMainMedia");

    if (!mainMedia || currentDetailMedia.length === 0) return;

    const media = currentDetailMedia[currentDetailMediaIndex];
    if (!media) return;

    if (media.type === "video") {

        mainMedia.innerHTML = `
            <video
                controls autoplay muted playsinline
                src="${escapeAttribute(media.src)}"
            ></video>
        `;

    } else {

        mainMedia.innerHTML = `
            <img
                src="${escapeAttribute(media.src)}"
                alt="${escapeAttribute(currentDetailProduct.name || "")}"
                onerror="this.parentElement.innerHTML='<div class=\\'detail-media-emoji\\'>📦</div>';"
            >
        `;
    }

    document
        .querySelectorAll(".detail-thumb")
        .forEach(function (thumb, index) {
            thumb.classList.toggle(
                "active",
                index === currentDetailMediaIndex
            );
        });
}


function renderDetailThumbnails() {

    const container = document.getElementById("detailThumbnails");
    if (!container) return;

    container.innerHTML = currentDetailMedia
        .map(function (media, index) {

            if (media.type === "video") {

                return `
                    <button
                        type="button"
                        class="detail-thumb video-thumb ${index === currentDetailMediaIndex ? "active" : ""}"
                        data-thumb-index="${index}"
                    >▶</button>
                `;
            }

            return `
                <button
                    type="button"
                    class="detail-thumb ${index === currentDetailMediaIndex ? "active" : ""}"
                    data-thumb-index="${index}"
                >
                    <img src="${escapeAttribute(media.src)}" alt="Thumbnail">
                </button>
            `;
        })
        .join("");

    container
        .querySelectorAll("[data-thumb-index]")
        .forEach(function (thumb) {

            thumb.addEventListener("click", function () {

                const index = Number(thumb.dataset.thumbIndex);

                if (!isNaN(index)) {
                    currentDetailMediaIndex = index;
                    renderDetailMedia();
                }
            });
        });
}


function showNextMedia() {
    if (currentDetailMedia.length === 0) return;
    currentDetailMediaIndex =
        (currentDetailMediaIndex + 1) % currentDetailMedia.length;
    renderDetailMedia();
}

function showPrevMedia() {
    if (currentDetailMedia.length === 0) return;
    currentDetailMediaIndex =
        (currentDetailMediaIndex - 1 + currentDetailMedia.length) %
        currentDetailMedia.length;
    renderDetailMedia();
}


function toggleDetailMediaZoom() {
    const mainMedia = document.getElementById("detailMainMedia");
    if (mainMedia) mainMedia.classList.toggle("zoomed");
}


/* =========================================================
   CLOSE PRODUCT DETAILS
========================================================= */

function closeProductDetails() {
    forceHideSection("productDetailsModal");
    document.body.classList.remove("modal-open");
    currentDetailProduct = null;
}


function changeDetailQuantity(change) {
    currentDetailQuantity = Math.max(
        1,
        currentDetailQuantity + Number(change || 0)
    );
    setText("detailProductQuantity", currentDetailQuantity);
}


function addDetailProductToCart() {

    if (!currentDetailProduct) return;

    for (let i = 0; i < currentDetailQuantity; i++) {
        addToCart(
            currentDetailProduct.name,
            currentDetailProduct.price,
            currentDetailProduct.category,
            currentDetailProduct.emoji,
            currentDetailProduct.id
        );
    }

    closeProductDetails();
}


/* =========================================================
   NOTIFICATION
=========================================================/* =========================================================
   NOTIFICATION
========================================================= */

function showNotification(message) {

    const notification =
        document.getElementById("cartNotification");

    if (!notification) {
        console.log(message);
        return;
    }

    notification.textContent = message;
    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(function () {
        notification.classList.remove("show");
    }, 2200);
}


/* =========================================================
   SECTION VISIBILITY
========================================================= */

const OVERLAY_POPUP_SECTIONS = [
    "cartSection",
    "productDetailsModal"
];

function showSection(id) {

    const element = document.getElementById(id);

    if (!element) {
        console.error("Section not found:", id);
        return false;
    }

    element.classList.remove("hidden");
    element.style.display = "block";
    element.style.visibility = "visible";
    element.style.opacity = "1";

    const isOverlayPopup =
        OVERLAY_POPUP_SECTIONS.includes(id);

    if (!isOverlayPopup) {
        element.style.position = "relative";
        element.style.zIndex = "100";
    }

    if (isOverlayPopup) {
        document.body.classList.add("modal-open");
    } else {
        document.body.classList.remove("modal-open");

        requestAnimationFrame(function () {
            element.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    return true;
}


function forceHideSection(id) {

    const element = document.getElementById(id);

    if (!element) return;

    element.classList.add("hidden");
    element.style.display = "none";
    element.style.visibility = "hidden";
    element.style.opacity = "0";
    element.style.zIndex = "";

    if (id === "cartSection") {
        element.style.position = "";
        element.style.top = "";
        element.style.left = "";
        element.style.transform = "";
        element.style.width = "";
        element.style.maxHeight = "";
        element.style.overflowY = "";
        element.style.overflowX = "";
        element.style.margin = "";
    }
}


function showOverlay(id) {
    return showSection(id);
}


function hideOverlay(id) {

    forceHideSection(id);

    const visibleSections = document.querySelectorAll(
        "#cartSection:not(.hidden), " +
        "#checkoutSection:not(.hidden), " +
        "#confirmationSection:not(.hidden), " +
        ".overlay-section:not(.hidden), " +
        ".product-details-modal:not(.hidden)"
    );

    if (visibleSections.length === 0) {
        document.body.classList.remove("modal-open");
    }
}


/* =========================================================
   HELPERS
========================================================= */

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function cleanPhone(phone) {
    return String(phone || "").replace(/[^\d+]/g, "");
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
    return escapeHtml(value);
}


function formatCategory(category) {

    return String(category || "")
        .split("-")
        .map(function (word) {
            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            );
        })
        .join(" ");
}


function formatPaymentMethod(method) {

    if (method === "easypaisa") {
        return "Advance Payment - Easypaisa";
    }

    if (method === "cod") {
        return "Cash on Delivery";
    }

    return "Cash on Delivery";
}


/* =========================================================
   CHECKOUT MESSAGE
========================================================= */

function showCheckoutMessage(message, type = "error") {

    let element =
        document.getElementById("checkoutMessage");

    if (!element) {

        const form =
            document.getElementById("checkoutForm");

        if (!form) {
            console.error(message);
            return;
        }

        element = document.createElement("div");
        element.id = "checkoutMessage";
        element.className = "checkout-message";

        form.prepend(element);
    }

    element.textContent = message;
    element.className = `checkout-message ${type}`;
    element.style.display = "block";
}


function clearCheckoutMessage() {

    const element =
        document.getElementById("checkoutMessage");

    if (!element) return;

    element.textContent = "";
    element.className = "checkout-message";
    element.style.display = "none";
}


/* =========================================================
   LOAD PRODUCTS FROM API
========================================================= */

async function loadProductsFromAPI() {

    const grid = document.getElementById("productsGrid");

    if (!grid) {
        console.warn("productsGrid not found.");
        return;
    }

    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #667085;">
            ⏳ Loading products...
        </div>
    `;

    try {

        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) {
            throw new Error(`Server error (${response.status})`);
        }

        const result = await response.json();

        const products = Array.isArray(result.products)
            ? result.products
            : [];

        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #667085;">
                    <div style="font-size: 50px; margin-bottom: 15px;">📦</div>
                    <h3 style="color: #101828; margin-bottom: 8px;">No products available</h3>
                    <p>Admin panel se products add karein.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products
            .filter(p => p.active !== false)
            .map(function (product) {

                const image = product.photos?.[0]
                    ? `https://shop-in-50-backend-production-3c9c.up.railway.app${product.photos[0]}`
                    : null;

                const emoji = product.emoji || "📦";
                const category = product.category || "general";
                const categoryLabel = formatCategory(category);

                const stockLabel = typeof product.stock === "number"
                    ? (product.stock > 0
                        ? `✅ Stock: ${product.stock}`
                        : `❌ Out of Stock`)
                    : "";

                return `
                    <article
                        class="product-card"
                        data-id="${escapeAttribute(product.id || "")}"
                        data-category="${escapeAttribute(category)}"
                        data-name="${escapeAttribute(product.name || "")}"
                        data-emoji="${escapeAttribute(emoji)}"
                    >
                        <div class="product-image">
                            ${
                                image
                                    ? `<img
                                            src="${escapeAttribute(image)}"
                                            alt="${escapeAttribute(product.name || "")}"
                                            onerror="this.style.display='none';"
                                       >`
                                    : `<div class="product-placeholder">${escapeHtml(emoji)}</div>`
                            }
                        </div>

                        <div class="product-info">

                            <span class="product-category">
                                ${escapeHtml(categoryLabel)}
                            </span>

                            <h3>${escapeHtml(product.name || "Product")}</h3>

                            <p class="product-description">
                                ${escapeHtml(product.description || "")}
                            </p>

                            <div class="product-price">
                                Rs.100 <span>/ item</span>
                            </div>

                            <p class="sale-note">
                                🔥 40+ total items = Rs.50 each
                            </p>

                            ${stockLabel
                                ? `<p style="font-size:11px;color:#667085;margin-top:4px;">${stockLabel}</p>`
                                : ""
                            }

                            <button
                                type="button"
                                class="add-to-cart-button"
                            >
                                Add to Cart
                            </button>

                        </div>
                    </article>
                `;
            })
            .join("");

        attachProductCardListeners();

        console.log(`Loaded ${products.length} products from API.`);

    } catch (error) {

        console.error("Failed to load products:", error);

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #dc3545;">
                <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
                <h3>Products load nahi ho sake</h3>
                <p>Server chal raha hai? (https://shop-in-50-backend-production-3c9c.up.railway.app)</p>
            </div>
        `;
    }
}


/* =========================================================
   ATTACH PRODUCT CARD LISTENERS
========================================================= */

function attachProductCardListeners() {

    document
        .querySelectorAll(".add-to-cart-button")
        .forEach(function (button) {

            if (button.dataset.listenerAttached === "true") {
                return;
            }

            button.dataset.listenerAttached = "true";

            button.addEventListener("click", function (event) {

                event.preventDefault();
                event.stopPropagation();

                const card = button.closest(".product-card");

                if (!card) return;

                const name =
                    card.dataset.name ||
                    card.querySelector("h3")?.textContent?.trim() ||
                    "Product";

                const category = card.dataset.category || "general";

                const emoji =
                    card.dataset.emoji ||
                    card
                        .querySelector(".product-placeholder")
                        ?.textContent?.trim() ||
                    "📦";

                const productId = card.dataset.id || "";

                addToCart(name, 100, category, emoji, productId);
            });
        });


    document
        .querySelectorAll(".product-card")
        .forEach(function (card) {

            if (card.dataset.detailsListenerAttached === "true") {
                return;
            }

            card.dataset.detailsListenerAttached = "true";

            card.addEventListener("click", function (event) {

                if (event.target.closest(".add-to-cart-button")) {
                    return;
                }

                openProductDetails(card);
            });
        });
}


/* =========================================================
   PUBLIC FUNCTIONS (window exports)
========================================================= */

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
window.copyPaymentNumber = copyPaymentNumber;
window.openEasypaisaPaymentWindow = openEasypaisaPaymentWindow;
window.closeProductDetails = closeProductDetails;
window.changeDetailQuantity = changeDetailQuantity;
window.addDetailProductToCart = addDetailProductToCart;
window.showOverlay = showOverlay;
window.hideOverlay = hideOverlay;
window.openProductDetails = openProductDetails;
window.loadProductsFromAPI = loadProductsFromAPI;


/* =========================================================
   CART SYNC BETWEEN WINDOWS
========================================================= */

window.addEventListener("storage", function (event) {

    if (event.key === "rupee50_cart") {

        try {
            const saved = localStorage.getItem("rupee50_cart");

            if (!saved) {

                cart = [];
                updateCartUI();
                updateSaleOfferMessage();
                updateCheckoutSummary();

                const popup = document.getElementById("saleProgressPopup");
                if (popup) popup.classList.remove("show");

                congratsShownForThisCart = false;

                console.log("Cart cleared from another window.");
            }
        } catch (e) {
            console.warn("Storage sync error:", e);
        }
    }
});


/* =========================================================
   CHECKOUT WINDOW → MAIN WINDOW MESSAGE
========================================================= */

window.addEventListener("message", function (event) {

    if (event.data && event.data.type === "ORDER_PLACED") {

        console.log("Order placed in another window. Clearing cart...");

        cart = [];
        saveCart();
        updateCartUI();
        updateSaleOfferMessage();
        updateCheckoutSummary();

        const popup = document.getElementById("saleProgressPopup");
        if (popup) popup.classList.remove("show");
    }
});
