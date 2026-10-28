"use strict";

/* =========================================================
   SHOP IN 50 RUPEES
   ADMIN DASHBOARD
   ========================================================= */

const API_BASE_URL = window.location.origin + "/api";

const TOKEN_KEY = "rupee50_admin_token";

let adminToken = localStorage.getItem(TOKEN_KEY) || "";

let productsCache = [];
let ordersCache = [];


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    attachAdminListeners();

    if (adminToken) {
        showDashboard();
        loadDashboard();
    } else {
        showLogin();
    }
});


/* =========================================================
   LISTENERS
========================================================= */

function attachAdminListeners() {

    document
        .getElementById("loginForm")
        ?.addEventListener("submit", loginAdmin);

    document
        .getElementById("logoutButton")
        ?.addEventListener("click", logoutAdmin);

    document
        .getElementById("refreshOrdersButton")
        ?.addEventListener("click", loadOrders);

    document
        .getElementById("refreshProductsButton")
        ?.addEventListener("click", loadProducts);

    document
        .getElementById("productForm")
        ?.addEventListener("submit", saveProduct);

    document
        .getElementById("cancelProductEdit")
        ?.addEventListener("click", resetProductForm);

    document
        .getElementById("settingsForm")
        ?.addEventListener("submit", saveSettings);

    document
        .querySelector("[data-close]")
        ?.addEventListener("click", closeOrderModal);

    document
        .getElementById("orderDetailsModal")
        ?.addEventListener("click", event => {

            if (event.target.id === "orderDetailsModal") {
                closeOrderModal();
            }
        });
}


/* =========================================================
   API REQUEST (Frontend Only Fix - Bypass Error)
========================================================= */

async function apiRequest(endpoint, options = {}) {
    // Since there is no backend, we return empty data to prevent "Could not fetch" errors.
    console.warn(`API Call bypassed for: ${endpoint}`);
    return { success: true, orders: [], products: [], stats: {}, settings: {} };
}


/* =========================================================
   LOGIN (Frontend Fix for GitHub)
========================================================= */

async function loginAdmin(event) {

    event.preventDefault();

    const username =
        document.getElementById("adminUsername")?.value.trim();

    const password =
        document.getElementById("adminPassword")?.value;

    showMessage("loginMessage", "Logging in...", "info");

    // Direct Frontend Login Check
    setTimeout(() => {
        if (username === "admin" && password === "Sidrabilal1#") {
            
            adminToken = "local_admin_token_" + Date.now();
            localStorage.setItem(TOKEN_KEY, adminToken);

            showDashboard();
            
            // Skip loading data to avoid errors
            console.log("Logged in successfully (Frontend Mode).");

        } else {
            showMessage(
                "loginMessage",
                "❌ Ghalat Username ya Password! (Username: admin, Password: Sidrabilal1#)",
                "error"
            );
        }
    }, 500);
}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutAdmin() {
    adminToken = "";
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
}


/* =========================================================
   VIEW SWITCH
========================================================= */

function showLogin() {

    document
        .getElementById("loginSection")
        ?.classList.remove("hidden");

    document
        .getElementById("dashboardSection")
        ?.classList.add("hidden");
}


function showDashboard() {

    document
        .getElementById("loginSection")
        ?.classList.add("hidden");

    document
        .getElementById("dashboardSection")
        ?.classList.remove("hidden");
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
    // Frontend only mode, no real data to load
    console.log("Dashboard loaded in Frontend mode.");
}


/* =========================================================
   HELPERS
========================================================= */

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}


function showMessage(id, message, type = "info") {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `admin-message ${type}`;
}