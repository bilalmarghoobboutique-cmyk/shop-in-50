"use strict";

/*
=========================================================
SHOP IN 50 RUPEES
BACKEND SERVER
Professional Express Backend
=========================================================
*/

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const nodemailer = require("nodemailer");

/* PATHS */

const BACKEND_DIR = __dirname;
const ROOT_DIR = path.join(BACKEND_DIR, "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");

const UPLOADS_DIR = path.join(BACKEND_DIR, "uploads");
const PRODUCT_UPLOADS_DIR = path.join(UPLOADS_DIR, "products");

/* ENVIRONMENT */

dotenv.config({
    path: path.join(BACKEND_DIR, ".env")
});

/* APP */

const app = express();

const PORT = Number(process.env.PORT || 5000);

/* STORE RULES */

const PRICE_50 = 50;
const PRICE_100 = 100;
const SALE_THRESHOLD = 40;
const FIXED_DELIVERY = 300;
const DELIVERY_PER_ITEM = 15;

/* STORE INFORMATION */

const STORE_WHATSAPP =
    process.env.STORE_WHATSAPP_NUMBER || "923266501314";

const STORE_EASYPAISA =
    process.env.STORE_EASYPAISA_NUMBER || "03266501314";

const STORE_EMAIL =
    process.env.STORE_EMAIL ||
    "bilalmarghoobboutique@gmail.com";

const STORE_ADDRESS =
    process.env.STORE_ADDRESS ||
    "Shop in 50 Rupees, Main Bazaar, Ghaziabad, Lahore Cantt";

const EASYPAISA_TITLE = "Syed Ahmed Bilal";

/* DATA FILES */

const ordersFile = path.join(BACKEND_DIR, "orders.json");
const productsFile = path.join(BACKEND_DIR, "products.json");
const settingsFile = path.join(BACKEND_DIR, "settings.json");
const paymentsFile = path.join(BACKEND_DIR, "payments.json");

/* DIRECTORY / FILE HELPERS */

function ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

function ensureJsonFile(file, defaultValue) {
    ensureDirectory(path.dirname(file));

    if (!fs.existsSync(file)) {
        fs.writeFileSync(
            file,
            JSON.stringify(defaultValue, null, 2),
            "utf8"
        );
    }
}

ensureDirectory(UPLOADS_DIR);
ensureDirectory(PRODUCT_UPLOADS_DIR);
ensureJsonFile(ordersFile, []);
ensureJsonFile(productsFile, []);
ensureJsonFile(paymentsFile, []);

ensureJsonFile(settingsFile, {
    storeName: "Shop in 50 Rupees",
    email: STORE_EMAIL,
    whatsapp: STORE_WHATSAPP,
    easypaisa: STORE_EASYPAISA,
    address: STORE_ADDRESS,
    supportHours: "Monday - Saturday | 10:00 AM - 8:00 PM"
});

/* JSON HELPERS */

function readJson(file, fallback) {
    try {
        if (!fs.existsSync(file)) return fallback;
        const content = fs.readFileSync(file, "utf8");
        if (!content.trim()) return fallback;
        return JSON.parse(content);
    } catch (error) {
        console.error(`JSON read error: ${file}`, error.message);
        return fallback;
    }
}

function writeJson(file, data) {
    try {
        ensureDirectory(path.dirname(file));
        const temporary = `${file}.tmp`;
        fs.writeFileSync(
            temporary,
            JSON.stringify(data, null, 2),
            "utf8"
        );
        fs.renameSync(temporary, file);
        return true;
    } catch (error) {
        console.error(`JSON write error: ${file}`, error.message);
        return false;
    }
}

/* MIDDLEWARE */

app.disable("x-powered-by");

app.use(
    helmet({
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: false
    })
);

app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* STATIC FRONTEND */

app.use(express.static(FRONTEND_DIR));

/* STATIC UPLOADS */

app.use("/uploads", express.static(UPLOADS_DIR));

/* TEXT HELPERS */

function cleanText(value, maxLength = 500) {
    return String(value ?? "").trim().slice(0, maxLength);
}

/* EMAIL VALIDATION */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email || "").trim()
    );
}

/* PHONE VALIDATION */

function normalizePhone(phone) {
    let value = String(phone || "").trim();
    value = value.replace(/[\s\-()]/g, "");
    if (value.startsWith("+")) value = value.slice(1);
    if (value.startsWith("03")) value = "92" + value.slice(1);
    return value;
}

function isValidPhone(phone) {
    const digits = normalizePhone(phone);
    return /^92\d{10}$/.test(digits);
}

/* EASYPAISA TRANSACTION ID VALIDATION */

function isValidEasypaisaTransactionId(value) {
    const id = String(value ?? "").trim().replace(/[\s-]/g, "");
    if (!/^\d{8,20}$/.test(id)) return false;
    if (/^03\d{9}$/.test(id)) return false;
    if (/^923\d{9}$/.test(id)) return false;
    return true;
}

/* CALCULATIONS */

function calculateDelivery(quantity) {
    const total = Number(quantity) || 0;
    if (total <= 0) return 0;
    if (total <= 20) return FIXED_DELIVERY;
    return total * DELIVERY_PER_ITEM;
}

function calculateProductsTotal(totalQuantity) {
    const total = Number(totalQuantity) || 0;
    if (total <= 0) return 0;

    /* SALE UNLOCK: 40+ = ALL products Rs.50 */
    if (total >= SALE_THRESHOLD) {
        return total * PRICE_50;
    }

    return total * PRICE_100;
}

function calculatePricing(products) {
    const totalQuantity = products.reduce(
        (total, product) => {
            return total + (Number(product.quantity) || 0);
        },
        0
    );

    const isSaleActive = totalQuantity >= SALE_THRESHOLD;
    const productsTotal = calculateProductsTotal(totalQuantity);

    const pricePerItem =
        totalQuantity > 0
            ? Math.round((productsTotal / totalQuantity) * 100) / 100
            : PRICE_100;

    const deliveryCharges = calculateDelivery(totalQuantity);
    const grandTotal = productsTotal + deliveryCharges;

    return {
        totalQuantity,
        pricePerItem,
        productsTotal,
        deliveryCharges,
        grandTotal,
        isSaleActive
    };
}

/* ADMIN SESSION */

const adminSessions = new Map();

function createAdminToken() {
    return crypto.randomBytes(32).toString("hex");
}

function requireAdmin(req, res, next) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });
    }

    const token = match[1];
    const session = adminSessions.get(token);

    if (!session) {
        return res.status(401).json({
            success: false,
            message: "Admin session expired."
        });
    }

    const sessionAge = Date.now() - session.createdAt;
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;

    if (sessionAge > EIGHT_HOURS) {
        adminSessions.delete(token);
        return res.status(401).json({
            success: false,
            message: "Admin session expired."
        });
    }

    next();
}

/* HEALTH CHECK */

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "Shop in 50 Rupees Backend is running successfully!",
        time: new Date().toISOString()
    });
});

/* =========================================================
   TEST EMAIL ROUTE (Development Only)
   Browser mein kholo: http://localhost:5000/api/test-email
========================================================= */

app.get("/api/test-email", async (req, res) => {
    const to = req.query.to || process.env.ADMIN_EMAIL || STORE_EMAIL;

    console.log(`🧪 Test email triggered for: ${to}`);

    const result = await sendEmail(
        to,
        "✅ Test Email - Shop in 50 Rupees Backend",
        `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f5f7fa;">
            <div style="background:#101828;color:white;padding:25px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 style="margin:0;color:#f3d77b;">🛍️ Shop in 50 Rupees</h1>
            </div>
            <div style="background:white;padding:30px;border-radius:0 0 10px 10px;">
                <h2 style="color:#0f9d68;margin-top:0;">✅ Email System Working!</h2>
                <p>Agar ye email mil gayi hai to nodemailer + SMTP sahi chal raha hai.</p>
                <div style="background:#f5f7fa;padding:15px;border-radius:8px;margin:15px 0;">
                    <p style="margin:5px 0;"><strong>To:</strong> ${to}</p>
                    <p style="margin:5px 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
                    <p style="margin:5px 0;"><strong>Server:</strong> Shop in 50 Rupees Backend</p>
                </div>
                <p style="color:#667085;">Agar spam mein aayi hai to "Not Spam" mark kar dena.</p>
            </div>
        </div>
        `
    );

    res.json({
        success: result.success,
        to,
        result
    });
});

/* STORE INFO */

app.get("/api/store-info", (_req, res) => {
    res.json({
        success: true,
        store: {
            name: "Shop in 50 Rupees",
            email: STORE_EMAIL,
            whatsapp: STORE_WHATSAPP,
            easypaisa: STORE_EASYPAISA,
            easypaisaTitle: EASYPAISA_TITLE,
            address: STORE_ADDRESS,
            calculation: {
                saleThreshold: SALE_THRESHOLD,
                priceBeforeSale: PRICE_100,
                priceAfterSale: PRICE_50,
                delivery1To20: FIXED_DELIVERY,
                delivery21Plus: DELIVERY_PER_ITEM
            }
        }
    });
});

/* PUBLIC SETTINGS */

app.get("/api/settings", (_req, res) => {
    const settings = readJson(settingsFile, {});
    res.json({ success: true, settings });
});

/* ADMIN LOGIN */

app.post("/api/admin/login", (req, res) => {
    const username = cleanText(req.body?.username, 100);
    const password = String(req.body?.password || "");
    const correctUsername = process.env.ADMIN_USERNAME || "admin";
    const correctPassword =
        process.env.ADMIN_PASSWORD ||
        "ChangeThisToYourStrongPassword123!";

    if (
        username !== correctUsername ||
        password !== correctPassword
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid admin username or password."
        });
    }

    const token = createAdminToken();
    adminSessions.set(token, {
        username,
        createdAt: Date.now()
    });

    res.json({
        success: true,
        message: "Admin login successful.",
        token
    });
});

/* ADMIN LOGOUT */

app.post("/api/admin/logout", requireAdmin, (req, res) => {
    const token = String(
        req.headers.authorization?.replace(/^Bearer\s+/i, "") || ""
    );
    adminSessions.delete(token);
    res.json({ success: true, message: "Logged out successfully." });
});

/* ADMIN STATS (BASIC) */

app.get("/api/admin/stats", requireAdmin, (_req, res) => {
    const orders = readJson(ordersFile, []);
    const products = readJson(productsFile, []);

    const revenue = orders
        .filter(order => order.status !== "cancelled")
        .reduce((total, order) => {
            return total + Number(order.pricing?.grandTotal || 0);
        }, 0);

    const lowStockThreshold = 5;

    res.json({
        success: true,
        stats: {
            totalOrders: orders.length,
            pending: orders.filter(o => o.status === "pending").length,
            processing: orders.filter(o => o.status === "processing").length,
            delivered: orders.filter(o => o.status === "delivered").length,
            cancelled: orders.filter(o => o.status === "cancelled").length,
            revenue,
            products: products.length,
            lowStockProducts: products.filter(
                p =>
                    typeof p.stock === "number" &&
                    p.stock > 0 &&
                    p.stock <= lowStockThreshold
            ).length,
            outOfStockProducts: products.filter(
                p =>
                    typeof p.stock === "number" &&
                    p.stock <= 0
            ).length
        }
    });
});

/* ADMIN STATISTICS (DETAILED FINANCIAL REPORT) */

app.get("/api/admin/statistics", requireAdmin, (req, res) => {
    try {
        const orders = readJson(ordersFile, []);
        const products = readJson(productsFile, []);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const STATUSES = [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ];

        /* Helper: calculate stats for a set of orders */
        function calcStats(filteredOrders) {
            const stats = {
                orders: 0,
                productsSold: 0,
                revenue: 0,
                productRevenue: 0,
                deliveryRevenue: 0,
                avgOrderValue: 0,
                productBreakdown: {}
            };

            filteredOrders.forEach(order => {
                stats.orders++;
                const pricing = order.pricing || {};

                stats.productsSold += Number(pricing.totalQuantity || 0);
                stats.revenue += Number(pricing.grandTotal || 0);
                stats.productRevenue += Number(pricing.productsTotal || 0);
                stats.deliveryRevenue += Number(pricing.deliveryCharges || 0);

                (order.products || []).forEach(item => {
                    const key = item.name || "Unknown";
                    if (!stats.productBreakdown[key]) {
                        stats.productBreakdown[key] = {
                            name: key,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    stats.productBreakdown[key].quantity +=
                        Number(item.quantity || 0);
                    stats.productBreakdown[key].revenue +=
                        Number(item.total || 0);
                });
            });

            stats.avgOrderValue = stats.orders > 0
                ? Math.round(stats.revenue / stats.orders)
                : 0;

            stats.productBreakdown = Object.values(stats.productBreakdown)
                .sort((a, b) => b.quantity - a.quantity);

            return stats;
        }

        /* =========================
           FILTER BY PERIOD
        ========================= */
        function filterByPeriod(orders, period) {
            return orders.filter(o => {
                if (!o.createdAt) return false;
                const d = new Date(o.createdAt);

                if (period === "daily") return d >= today;
                if (period === "weekly") return d >= weekAgo;
                if (period === "monthly") return d >= monthAgo;
                if (period === "yearly") return d >= yearStart;
                return true;
            });
        }

        /* =========================
           FILTER BY STATUS
        ========================= */
        function filterByStatus(orders, status) {
            if (!status || status === "all") return orders;
            return orders.filter(o => o.status === status);
        }

        /* =========================
           PERIOD STATS
        ========================= */
        const periods = {
            daily: filterByPeriod(orders, "daily"),
            weekly: filterByPeriod(orders, "weekly"),
            monthly: filterByPeriod(orders, "monthly"),
            yearly: filterByPeriod(orders, "yearly"),
            allTime: orders
        };

        /* =========================
           PERIOD + STATUS STATS
        ========================= */
        const periodStatusStats = {};
        Object.keys(periods).forEach(period => {
            periodStatusStats[period] = {};

            /* All orders in period */
            periodStatusStats[period].all = calcStats(periods[period]);

            /* Each status separately */
            STATUSES.forEach(status => {
                periodStatusStats[period][status] = calcStats(
                    filterByStatus(periods[period], status)
                );
            });
        });

        /* =========================
           STOCK SUMMARY
        ========================= */
        const stockSummary = products.map(p => ({
            id: p.id,
            name: p.name || "Product",
            category: p.category || "general",
            stock: Number(p.stock || 0),
            sold: Number(p.sold || 0),
            price: Number(p.price || 0),
            stockValue: Number(p.stock || 0) * Number(p.price || 0),
            status:
                Number(p.stock || 0) === 0 ? "out_of_stock"
                : Number(p.stock || 0) <= 5 ? "low_stock"
                : "in_stock"
        })).sort((a, b) => a.stock - b.stock);

        /* =========================
           MONTHLY BREAKDOWN
        ========================= */
        const monthlyBreakdown = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            const monthOrders = orders.filter(o => {
                if (!o.createdAt) return false;
                const d = new Date(o.createdAt);
                return d >= monthStart && d <= monthEnd;
            });

            const monthStats = calcStats(monthOrders);
            const deliveredStats = calcStats(
                monthOrders.filter(o => o.status === "delivered")
            );

            monthlyBreakdown.push({
                month: monthStart.toLocaleString("en-PK", { month: "short", year: "numeric" }),
                monthKey: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
                orders: monthStats.orders,
                productsSold: monthStats.productsSold,
                revenue: monthStats.revenue,
                productRevenue: monthStats.productRevenue,
                deliveryRevenue: monthStats.deliveryRevenue,
                deliveredRevenue: deliveredStats.revenue,
                deliveredOrders: deliveredStats.orders
            });
        }

        /* =========================
           SUMMARY
        ========================= */
        const summary = {
            totalProducts: products.length,
            inStock: stockSummary.filter(s => s.status === "in_stock").length,
            lowStock: stockSummary.filter(s => s.status === "low_stock").length,
            outOfStock: stockSummary.filter(s => s.status === "out_of_stock").length,
            totalStockValue: stockSummary.reduce((sum, s) => sum + s.stockValue, 0),
            totalSold: stockSummary.reduce((sum, s) => sum + s.sold, 0)
        };

        /* =========================
           FINAL RESPONSE
        ========================= */
        res.json({
            success: true,
            generatedAt: new Date().toISOString(),

            /* Period data (with status breakdown) */
            daily: periodStatusStats.daily,
            weekly: periodStatusStats.weekly,
            monthly: periodStatusStats.monthly,
            yearly: periodStatusStats.yearly,
            allTime: periodStatusStats.allTime,

            monthlyBreakdown,
            stockSummary,
            summary,

            /* Status labels for frontend */
            statuses: STATUSES
        });

    } catch (error) {
        console.error("Statistics error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Statistics load failed."
        });
    }
});

/* SETTINGS UPDATE */

app.patch("/api/settings", requireAdmin, (req, res) => {
    const current = readJson(settingsFile, {});
    const email = cleanText(req.body?.email, 200);

    if (email && !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid store email."
        });
    }

    const settings = {
        ...current,
        storeName:
            cleanText(req.body?.storeName, 200) ||
            current.storeName ||
            "Shop in 50 Rupees",
        email: email || current.email || STORE_EMAIL,
        whatsapp:
            cleanText(req.body?.whatsapp, 50) ||
            current.whatsapp ||
            STORE_WHATSAPP,
        easypaisa:
            cleanText(req.body?.easypaisa, 50) ||
            current.easypaisa ||
            STORE_EASYPAISA,
        supportHours:
            cleanText(req.body?.supportHours, 200) ||
            current.supportHours ||
            "Monday - Saturday | 10:00 AM - 8:00 PM",
        address:
            cleanText(req.body?.address, 500) ||
            current.address ||
            STORE_ADDRESS
    };

    if (!writeJson(settingsFile, settings)) {
        return res.status(500).json({
            success: false,
            message: "Settings save failed."
        });
    }

    res.json({
        success: true,
        message: "Settings saved successfully.",
        settings
    });
});

/* MULTER FILE UPLOAD */

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, PRODUCT_UPLOADS_DIR);
    },
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `${Date.now()}-${crypto
            .randomBytes(6)
            .toString("hex")}${extension}`;
        callback(null, filename);
    }
});

const upload = multer({
    storage,
    limits: { files: 51, fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const allowedImages = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        const allowedVideos = [".mp4", ".webm", ".ogg", ".mov"];
        const extension = path.extname(file.originalname).toLowerCase();

        if (file.fieldname === "photos") {
            return callback(null, allowedImages.includes(extension));
        }
        if (file.fieldname === "video") {
            return callback(null, allowedVideos.includes(extension));
        }
        callback(null, false);
    }
});

/* PRODUCT CATEGORIES */

const ALLOWED_CATEGORIES = [
    "electronics", "fashion", "home", "toys", "beauty",
    "computers", "books", "sports", "automotive",
    "mobile-accessories", "gaming", "furniture"
];

function validateCategory(category) {
    return ALLOWED_CATEGORIES.includes(category);
}

/* PUBLIC PRODUCTS */

app.get("/api/products", (_req, res) => {
    const products = readJson(productsFile, []).filter(
        product => product.active !== false
    );
    res.json({ success: true, products });
});

/* ADMIN PRODUCTS */

app.get("/api/admin/products", requireAdmin, (_req, res) => {
    res.json({
        success: true,
        products: readJson(productsFile, [])
    });
});

/* CREATE PRODUCT */

app.post(
    "/api/products",
    requireAdmin,
    upload.fields([
        { name: "photos", maxCount: 50 },
        { name: "video", maxCount: 1 }
    ]),
    (req, res) => {
        try {
            const name = cleanText(req.body?.name, 250);
            const category = cleanText(req.body?.category, 100);
            const description = cleanText(req.body?.description, 10000);
            const stock = Number(req.body?.stock);

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required."
                });
            }
            if (!validateCategory(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product category."
                });
            }
            if (!description) {
                return res.status(400).json({
                    success: false,
                    message: "Product details are required."
                });
            }
            if (!Number.isInteger(stock) || stock < 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid stock quantity. Enter 0 or a positive whole number."
                });
            }

            const products = readJson(productsFile, []);

            const product = {
                id: crypto.randomUUID(),
                name,
                category,
                description,
                price: PRICE_100,
                stock,
                sold: 0,
                emoji: cleanText(req.body?.emoji, 10) || "📦",
                photos: (req.files?.photos || []).map(
                    file => `/uploads/products/${file.filename}`
                ),
                video: req.files?.video?.[0]
                    ? `/uploads/products/${req.files.video[0].filename}`
                    : "",
                active: req.body?.active !== "false",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            products.push(product);

            if (!writeJson(productsFile, products)) {
                return res.status(500).json({
                    success: false,
                    message: "Product save failed."
                });
            }

            res.status(201).json({
                success: true,
                message: "Product created successfully.",
                product
            });
        } catch (error) {
            console.error("Create product error:", error);
            res.status(500).json({
                success: false,
                message: "Product create failed."
            });
        }
    }
);

/* UPDATE PRODUCT */

app.put(
    "/api/products/:id",
    requireAdmin,
    upload.fields([
        { name: "photos", maxCount: 50 },
        { name: "video", maxCount: 1 }
    ]),
    (req, res) => {
        try {
            const products = readJson(productsFile, []);
            const index = products.findIndex(
                product => product.id === req.params.id
            );

            if (index < 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            const old = products[index];
            const name = cleanText(req.body?.name, 250);
            const category = cleanText(req.body?.category, 100);
            const description = cleanText(req.body?.description, 10000);

            const stockProvided =
                req.body?.stock !== undefined &&
                req.body?.stock !== "";

            const stock = stockProvided
                ? Number(req.body?.stock)
                : old.stock;

            if (!name || !description || !validateCategory(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product information."
                });
            }

            if (
                stockProvided &&
                (!Number.isInteger(stock) || stock < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid stock quantity. Enter 0 or a positive whole number."
                });
            }

            const newPhotos = (req.files?.photos || []).map(
                file => `/uploads/products/${file.filename}`
            );

            const replacePhotos = req.body?.replacePhotos === "true";

            const photos = replacePhotos
                ? newPhotos
                : [...(old.photos || []), ...newPhotos];

            let video = old.video || "";

            if (req.files?.video?.[0]) {
                video = `/uploads/products/${req.files.video[0].filename}`;
            }

            if (req.body?.removeVideo === "true") {
                video = "";
            }

            products[index] = {
                ...old,
                name,
                category,
                description,
                price: PRICE_100,
                stock,
                emoji:
                    cleanText(req.body?.emoji, 10) ||
                    old.emoji ||
                    "📦",
                photos,
                video,
                active: req.body?.active !== "false",
                updatedAt: new Date().toISOString()
            };

            if (!writeJson(productsFile, products)) {
                return res.status(500).json({
                    success: false,
                    message: "Product update failed."
                });
            }

            res.json({
                success: true,
                message: "Product updated successfully.",
                product: products[index]
            });
        } catch (error) {
            console.error("Update product error:", error);
            res.status(500).json({
                success: false,
                message: "Product update failed."
            });
        }
    }
);

/* DELETE PRODUCT */

app.delete("/api/products/:id", requireAdmin, (req, res) => {
    const products = readJson(productsFile, []);
    const index = products.findIndex(
        product => product.id === req.params.id
    );

    if (index < 0) {
        return res.status(404).json({
            success: false,
            message: "Product not found."
        });
    }

    const removed = products.splice(index, 1)[0];

    if (!writeJson(productsFile, products)) {
        return res.status(500).json({
            success: false,
            message: "Product delete failed."
        });
    }

    res.json({
        success: true,
        message: "Product deleted successfully.",
        product: removed
    });
});

/* =========================================================
   ORDER NUMBER
========================================================= */

function generateOrderNumber() {
    const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

    const random = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();

    return `S50-${date}-${random}`;
}

/* =========================================================
   EMAIL NOTIFICATION HELPERS
========================================================= */

let emailTransporter = null;

function getEmailTransporter() {

    if (emailTransporter) return emailTransporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || "true") === "true";

    if (!host || !user || !pass) {
        console.warn("⚠️ SMTP credentials not configured. Email will be skipped.");
        return null;
    }

    emailTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });

    console.log("✅ Email transporter created:", user);
    return emailTransporter;
}

async function sendEmail(toEmail, subject, htmlContent) {

    try {

        const transporter = getEmailTransporter();

        if (!transporter) {
            return { success: false, reason: "not_configured" };
        }

        if (!toEmail || !isValidEmail(toEmail)) {
            return { success: false, reason: "invalid_email" };
        }

        const fromName = "Shop in 50 Rupees";
        const fromUser = process.env.SMTP_USER;

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromUser}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent
        });

        console.log(`✅ Email sent to ${toEmail}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {

        console.error("❌ Email send failed:", error.message);
        return { success: false, reason: "exception", details: error.message };
    }
}

/* =========================================================
   EMAIL TEMPLATES
========================================================= */

function buildCustomerEmailHTML(order) {

    const customer = order.customer || {};
    const pricing = order.pricing || {};

    const productsHTML = (order.products || [])
        .map(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice || pricing.pricePerItem || 100);
            return `<tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">${item.name}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">Rs.${price}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">Rs.${qty * price}</td>
            </tr>`;
        })
        .join("");

    return `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f5f7fa;">
            <div style="background:#101828;color:white;padding:25px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 style="margin:0;color:#f3d77b;">🛍️ Shop in 50 Rupees</h1>
                <p style="margin:8px 0 0;color:#cbd5e1;">Order Confirmation</p>
            </div>

            <div style="background:white;padding:30px;border-radius:0 0 10px 10px;">
                <h2 style="color:#0f9d68;margin-top:0;">✅ Order Confirmed!</h2>

                <div style="background:#f5f7fa;padding:15px;border-radius:8px;margin:15px 0;">
                    <p style="margin:5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
                    <p style="margin:5px 0;"><strong>Customer:</strong> ${customer.name}</p>
                    <p style="margin:5px 0;"><strong>Phone:</strong> ${customer.phone}</p>
                    <p style="margin:5px 0;"><strong>City:</strong> ${customer.city}</p>
                    <p style="margin:5px 0;"><strong>Address:</strong> ${customer.address}</p>
                </div>

                <h3 style="color:#101828;">🛒 Products</h3>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#101828;color:white;">
                            <th style="padding:10px;text-align:left;">Product</th>
                            <th style="padding:10px;text-align:center;">Qty</th>
                            <th style="padding:10px;text-align:right;">Rate</th>
                            <th style="padding:10px;text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${productsHTML}</tbody>
                </table>

                <div style="margin-top:20px;padding:15px;background:#f5f7fa;border-radius:8px;">
                    <p style="margin:5px 0;display:flex;justify-content:space-between;">
                        <span>Products Total:</span>
                        <strong>Rs.${Number(pricing.productsTotal || 0)}</strong>
                    </p>
                    <p style="margin:5px 0;display:flex;justify-content:space-between;">
                        <span>Delivery Charges:</span>
                        <strong>Rs.${Number(pricing.deliveryCharges || 0)}</strong>
                    </p>
                    <p style="margin:10px 0 0;padding-top:10px;border-top:2px solid #101828;display:flex;justify-content:space-between;font-size:18px;">
                        <span><strong>Grand Total:</strong></span>
                        <strong style="color:#1677ff;">Rs.${Number(pricing.grandTotal || 0)}</strong>
                    </p>
                </div>

                <p style="margin-top:20px;">
                    <strong>Payment Method:</strong>
                    ${order.payment?.method === "easypaisa" ? "Easypaisa" : "Cash on Delivery"}
                </p>

                <p style="color:#667085;margin-top:25px;text-align:center;">
                    Thank you for shopping with us! 🙏
                </p>
            </div>

            <p style="text-align:center;color:#667085;font-size:12px;margin-top:15px;">
                © Shop in 50 Rupees | 923266501314
            </p>
        </div>
    `;
}

function buildAdminEmailHTML(order) {

    const customer = order.customer || {};
    const pricing = order.pricing || {};

    const productsHTML = (order.products || [])
        .map(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice || pricing.pricePerItem || 100);
            return `<tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">${item.name}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">Rs.${qty * price}</td>
            </tr>`;
        })
        .join("");

    return `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f5f7fa;">
            <div style="background:#dc3545;color:white;padding:25px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 style="margin:0;">🔔 NEW ORDER RECEIVED</h1>
                <p style="margin:8px 0 0;">Shop in 50 Rupees</p>
            </div>

            <div style="background:white;padding:30px;border-radius:0 0 10px 10px;">
                <h2 style="color:#101828;margin-top:0;">Order #${order.orderNumber}</h2>

                <h3 style="color:#101828;">👤 Customer</h3>
                <div style="background:#f5f7fa;padding:15px;border-radius:8px;margin:15px 0;">
                    <p style="margin:5px 0;"><strong>Name:</strong> ${customer.name}</p>
                    <p style="margin:5px 0;"><strong>Phone:</strong> ${customer.phone}</p>
                    <p style="margin:5px 0;"><strong>Email:</strong> ${customer.email || "—"}</p>
                    <p style="margin:5px 0;"><strong>City:</strong> ${customer.city}</p>
                    <p style="margin:5px 0;"><strong>Address:</strong> ${customer.address}</p>
                </div>

                <h3 style="color:#101828;">🛒 Products</h3>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#101828;color:white;">
                            <th style="padding:10px;text-align:left;">Product</th>
                            <th style="padding:10px;text-align:center;">Qty</th>
                            <th style="padding:10px;text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${productsHTML}</tbody>
                </table>

                <div style="margin-top:20px;padding:15px;background:#f5f7fa;border-radius:8px;">
                    <p style="margin:5px 0;display:flex;justify-content:space-between;">
                        <span>Products Total:</span>
                        <strong>Rs.${Number(pricing.productsTotal || 0)}</strong>
                    </p>
                    <p style="margin:5px 0;display:flex;justify-content:space-between;">
                        <span>Delivery:</span>
                        <strong>Rs.${Number(pricing.deliveryCharges || 0)}</strong>
                    </p>
                    <p style="margin:10px 0 0;padding-top:10px;border-top:2px solid #101828;display:flex;justify-content:space-between;font-size:18px;">
                        <span><strong>Grand Total:</strong></span>
                        <strong style="color:#1677ff;">Rs.${Number(pricing.grandTotal || 0)}</strong>
                    </p>
                </div>

                <p style="margin-top:20px;">
                    <strong>Payment:</strong>
                    ${order.payment?.method === "easypaisa" ? "Easypaisa (TID: " + (order.payment?.transactionId || "-") + ")" : "Cash on Delivery"}
                </p>

                <p style="margin-top:25px;text-align:center;">
                    <a href="http://localhost:5000/admin.html" style="background:#101828;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">
                        View in Admin Panel
                    </a>
                </p>
            </div>
        </div>
    `;
}

/* =========================================================
   SEND ORDER NOTIFICATIONS
========================================================= */

async function sendOrderNotifications(order) {

    const customer = order.customer || {};

    const results = {
        customerEmail: null,
        adminEmail: null
    };

    /* 1. Customer Email */
    if (customer.email) {

        results.customerEmail = await sendEmail(
            customer.email,
            `✅ Order Confirmed - ${order.orderNumber} | Shop in 50 Rupees`,
            buildCustomerEmailHTML(order)
        );
    }

    /* 2. Admin Email */
    const adminEmail = process.env.ADMIN_EMAIL;

    if (adminEmail) {

        results.adminEmail = await sendEmail(
            adminEmail,
            `🔔 NEW ORDER - ${order.orderNumber} - Rs.${Number(order.pricing?.grandTotal || 0)}`,
            buildAdminEmailHTML(order)
        );
    }

    console.log("📧 Order notifications:", results);
    return results;
}

/* =========================================================
   CREATE ORDER
========================================================= */

app.post("/api/orders", (req, res) => {
    try {
        const body = req.body || {};
        const customer = body.customer || {};
        const payment = body.payment || {};

        const name = cleanText(customer.name, 100);
        const phone = cleanText(customer.phone, 30);
        const email = cleanText(customer.email, 200);
        const city = cleanText(customer.city, 80);
        const address = cleanText(customer.address, 500);

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Customer name is required."
            });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid Pakistani customer phone number is required. Example: 03XXXXXXXXX"
            });
        }

        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer email address."
            });
        }

        if (!city) {
            return res.status(400).json({
                success: false,
                message: "Customer city is required."
            });
        }

        if (!address) {
            return res.status(400).json({
                success: false,
                message: "Customer address is required."
            });
        }

        const paymentMethod = cleanText(
            payment.method,
            30
        ).toLowerCase();

        if (!["cod", "easypaisa"].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method."
            });
        }

        const transactionId = cleanText(
            payment.transactionId,
            20
        ).replace(/[\s-]/g, "");

        if (paymentMethod === "easypaisa") {
            if (!isValidEasypaisaTransactionId(transactionId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid Easypaisa transaction/reference ID."
                });
            }
        }

        if (
            !Array.isArray(body.products) ||
            body.products.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required."
            });
        }

        let requestedProducts;

        try {
            requestedProducts = body.products.map(item => {
                const quantity = Number(item.quantity);

                if (
                    !Number.isInteger(quantity) ||
                    quantity < 1 ||
                    quantity > 10000
                ) {
                    throw new Error("Invalid product quantity.");
                }

                const itemName = cleanText(item.name, 250);

                if (!itemName) {
                    throw new Error("Product name is required.");
                }

                return {
                    id: cleanText(item.id, 100),
                    name: itemName,
                    category: cleanText(item.category, 100),
                    emoji:
                        cleanText(item.emoji, 10) || "📦",
                    quantity
                };
            });
        } catch (productError) {
            return res.status(400).json({
                success: false,
                message:
                    productError.message ||
                    "Invalid product information."
            });
        }

        const catalog = readJson(productsFile, []);

        for (const item of requestedProducts) {
            const catalogProduct = catalog.find(
                p => p.id === item.id
            );

            if (
                catalogProduct &&
                typeof catalogProduct.stock === "number" &&
                catalogProduct.stock < item.quantity
            ) {
                return res.status(400).json({
                    success: false,
                    message: `"${item.name}" is only available in ${catalogProduct.stock} unit(s). Please reduce the quantity.`
                });
            }
        }

        const pricing = calculatePricing(requestedProducts);

        const unitPrice = pricing.isSaleActive
            ? PRICE_50
            : PRICE_100;

        const products = requestedProducts.map(item => {
            const quantity = Number(item.quantity) || 0;

            return {
                ...item,
                unitPrice,
                total: quantity * unitPrice
            };
        });

        const orderNumber = generateOrderNumber();

        const paymentStatus =
            paymentMethod === "easypaisa"
                ? "Advance Payment - Awaiting Verification"
                : "Cash on Delivery - Pending";

        const order = {
            orderNumber,

            customer: {
                name,
                phone: normalizePhone(phone),
                email,
                city,
                address,
                notes: cleanText(body.notes, 1000)
            },

            products,
            pricing,

            payment: {
                method: paymentMethod,
                status: paymentStatus,
                transactionId:
                    paymentMethod === "easypaisa"
                        ? transactionId
                        : ""
            },

            notes: cleanText(body.notes, 1000),
            status: "pending",
            createdAt: new Date().toISOString(),
            serverReceivedAt: new Date().toISOString(),

            store: {
                name: "Shop in 50 Rupees",
                whatsapp: STORE_WHATSAPP,
                easypaisa: STORE_EASYPAISA,
                email: STORE_EMAIL,
                address: STORE_ADDRESS
            }
        };

        const orders = readJson(ordersFile, []);
        orders.push(order);

        if (!writeJson(ordersFile, orders)) {
            return res.status(500).json({
                success: false,
                message: "Order save nahi ho saka."
            });
        }

        let stockChanged = false;

        for (const item of requestedProducts) {
            const catalogProduct = catalog.find(
                p => p.id === item.id
            );

            if (!catalogProduct) continue;

            if (typeof catalogProduct.stock === "number") {
                catalogProduct.stock = Math.max(
                    catalogProduct.stock - item.quantity,
                    0
                );
            }

            catalogProduct.sold =
                (Number(catalogProduct.sold) || 0) + item.quantity;

            stockChanged = true;
        }

        if (stockChanged) {
            writeJson(productsFile, catalog);
        }

        if (paymentMethod === "easypaisa") {
            const payments = readJson(paymentsFile, []);

            payments.push({
                orderNumber,
                transactionId,
                amount: pricing.grandTotal,
                status: "pending_verification",
                createdAt: new Date().toISOString()
            });

            if (!writeJson(paymentsFile, payments)) {
                console.warn(
                    "Warning: payment record could not be saved."
                );
            }
        }

        console.log("");
        console.log("==============================================");
        console.log("ORDER SAVED SUCCESSFULLY");
        console.log(`Order Number: ${orderNumber}`);
        console.log(`Customer: ${name}`);
        console.log(`Quantity: ${pricing.totalQuantity}`);
        console.log(`Sale Active: ${pricing.isSaleActive}`);
        console.log(`Unit Price: Rs.${unitPrice}`);
        console.log(`Products Total: Rs.${pricing.productsTotal}`);
        console.log(`Delivery: Rs.${pricing.deliveryCharges}`);
        console.log(`Grand Total: Rs.${pricing.grandTotal}`);
        console.log("==============================================");
        console.log("");

        /* ============ 🔥 EMAIL NOTIFICATIONS ============ */
        sendOrderNotifications(order).catch(err =>
            console.error("❌ Email notification error:", err)
        );
        /* =============================================== */

        res.status(201).json({
            success: true,
            message: "Your order has been completed successfully.",
            orderNumber,
            order,
            pricing,
            payment: order.payment
        });

    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Order save nahi ho saka."
        });
    }
});

/* =========================================================
   ADMIN ORDERS (list)
========================================================= */

app.get("/api/orders", requireAdmin, (_req, res) => {
    const orders = readJson(ordersFile, []);

    orders.sort(
        (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
    );

    res.json({
        success: true,
        totalOrders: orders.length,
        orders
    });
});

/* =========================================================
   ORDER DETAILS
========================================================= */

app.get(
    "/api/orders/:orderNumber",
    requireAdmin,
    (req, res) => {
        const orders = readJson(ordersFile, []);

        const order = orders.find(
            item =>
                item.orderNumber === req.params.orderNumber
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        res.json({
            success: true,
            order
        });
    }
);

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

app.patch(
    "/api/orders/:orderNumber/status",
    requireAdmin,
    (req, res) => {
        const allowedStatuses = [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ];

        const status = cleanText(
            req.body?.status,
            30
        ).toLowerCase();

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status."
            });
        }

        const orders = readJson(ordersFile, []);

        const index = orders.findIndex(
            order =>
                order.orderNumber === req.params.orderNumber
        );

        if (index < 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const previousStatus = orders[index].status;

        orders[index].status = status;
        orders[index].updatedAt = new Date().toISOString();

        if (
            status === "cancelled" &&
            previousStatus !== "cancelled"
        ) {
            const catalog = readJson(productsFile, []);

            let stockRestored = false;

            for (const item of orders[index].products || []) {
                const catalogProduct = catalog.find(
                    p => p.id === item.id
                );

                if (!catalogProduct) continue;

                if (typeof catalogProduct.stock === "number") {
                    catalogProduct.stock += item.quantity;
                }

                catalogProduct.sold = Math.max(
                    (Number(catalogProduct.sold) || 0) -
                        item.quantity,
                    0
                );

                stockRestored = true;
            }

            if (stockRestored) {
                writeJson(productsFile, catalog);
            }
        }

        if (!writeJson(ordersFile, orders)) {
            return res.status(500).json({
                success: false,
                message: "Order status update failed."
            });
        }

        res.json({
            success: true,
            message: "Order status updated.",
            order: orders[index]
        });
    }
);

/* =========================================================
   WHATSAPP INVOICE
========================================================= */

app.post(
    "/api/whatsapp/send-invoice",
    async (req, res) => {
        const token =
            process.env.WHATSAPP_ACCESS_TOKEN;

        const phoneNumberId =
            process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!token || !phoneNumberId) {
            return res.status(503).json({
                success: false,
                configured: false,
                message:
                    "WhatsApp API credentials are not configured. Using manual WhatsApp sharing for now."
            });
        }

        return res.status(501).json({
            success: false,
            configured: true,
            message:
                "WhatsApp API credentials are present, but automatic API sending is not connected yet."
        });
    }
);

/* =========================================================
   API 404 HANDLER
========================================================= */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
});

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use((req, res, next) => {
    if (req.method !== "GET") {
        return next();
    }

    if (req.path.startsWith("/api/")) {
        return next();
    }

    if (req.path.startsWith("/uploads/")) {
        return next();
    }

    const indexFile = path.join(
        FRONTEND_DIR,
        "index.html"
    );

    if (!fs.existsSync(indexFile)) {
        return res
            .status(404)
            .send("Frontend index.html not found.");
    }

    res.sendFile(indexFile);
});

/* =========================================================
   FINAL 404
========================================================= */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Resource not found."
    });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, _req, res, _next) => {
    console.error("Server error:", error);

    if (error?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            message: "Uploaded file is too large."
        });
    }

    if (error?.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
            success: false,
            message: "Too many files uploaded."
        });
    }

    res.status(error.status || 500).json({
        success: false,
        message: error.message || "Server error."
    });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "        SHOP IN 50 RUPEES BACKEND"
    );
    console.log(
        "=============================================="
    );

    console.log(`Server:   http://localhost:${PORT}`);
    console.log(
        `Health:   http://localhost:${PORT}/api/health`
    );
    console.log(
        `Test Email: http://localhost:${PORT}/api/test-email`
    );
    console.log(`Frontend: http://localhost:${PORT}`);

    console.log(
        "----------------------------------------------"
    );

    console.log("SALE SYSTEM (UNLOCK)");
    console.log("Products 1-39   = Rs.100 each");
    console.log(
        "Products 40+    = Rs.50 each (ALL products)"
    );

    console.log(
        "----------------------------------------------"
    );

    console.log("DELIVERY SYSTEM");
    console.log(
        "1-20 products = Rs.300 delivery"
    );
    console.log(
        "21+ products = Rs.15 per item"
    );

    console.log(
        "----------------------------------------------"
    );

    console.log(`Orders:   ${ordersFile}`);
    console.log(`Products: ${productsFile}`);
    console.log(`Payments: ${paymentsFile}`);

    console.log(
        "----------------------------------------------"
    );

    console.log(
        `Admin username: ${
            process.env.ADMIN_USERNAME || "admin"
        }`
    );

    console.log(
        "=============================================="
    );

    console.log("");
});