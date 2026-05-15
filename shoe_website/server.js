require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("node:path");
const fs = require("node:fs/promises");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Product = require("./models/Product");
const Seller = require("./models/Seller");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "dhankor_super_secret_key_2026";

// Connect to MongoDB Atlas
if (MONGO_URI && MONGO_URI !== 'put_your_cloud_database_link_here') {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log("✅ Linked to MongoDB Cloud Database");
      // Seed default products if database is completely empty
      const count = await Product.countDocuments();
      if (count === 0) {
        console.log("Database is empty. Seeding from locally saved products.json...");
        try {
          const raw = await fs.readFile(path.join(__dirname, "products.json"), "utf8");
          const defaultProducts = JSON.parse(raw);
          await Product.insertMany(defaultProducts);
          console.log("✅ Database seeded with default products!");
        } catch (e) {
          console.log("⚠️ Could not seed initial data:", e.message);
        }
      }
    })
    .catch((err) => console.log("❌ Failed to connect to MongoDB:", err.message));
} else {
  console.log("⚠️ WARNING: MONGO_URI is missing or invalid in .env file. The server won't function correctly without it.");
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(__dirname));

function requireAuth(req, res, next) {
  const password = req.header("x-admin-password");
  if (password === ADMIN_PASSWORD) {
    req.user = { role: "admin" };
    return next();
  }

  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { role: "seller", sellerId: decoded.sellerId };
      return next();
    } catch (e) {
      // fall through to 401
    }
  }

  return res.status(401).json({ error: "Unauthorized action" });
}

app.get("/api/products", async (req, res) => {
  try {
    const { shopUrl } = req.query;
    let query = {};
    if (shopUrl) {
      const seller = await Seller.findOne({ shopUrl, isVerified: true });
      if (!seller) return res.status(404).json({ error: "Shop not found or unverified" });
      query.sellerId = seller._id;
    } else {
      // Mega Mall Mode: only show products from Verified sellers or System default products (sellerId: null)
      // For simplicity, we can fetch all products, but let's exclude unverified seller products.
      // Wait, getting all products where sellerId is either null or in an array of verified seller IDs.
      const verifiedSellers = await Seller.find({ isVerified: true }, { _id: 1 }).lean();
      const verifiedIds = verifiedSellers.map(s => s._id);
      query = { $or: [{ sellerId: { $in: verifiedIds } }, { sellerId: null }, { sellerId: { $exists: false } }] };
    }
    
    // We send back both products and optionally the shop info if shopUrl is provided
    const products = await Product.find(query, { _id: 0, __v: 0 }).lean();
    
    if (shopUrl) {
      const seller = await Seller.findOne({ shopUrl }, { password: 0 });
      res.json({ products, shopInfo: seller });
    } else {
      res.json(products);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to load products from cloud" });
  }
});

// Serve the Main App for VIP Storefront links
app.get("/shop/:shopUrl", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- GEO SEARCH ENDPOINT ---
app.get("/api/shops/nearby", async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });
    
    const sellers = await Seller.find({
      isVerified: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radiusKm) * 1000 // meters -> ~10km default
        }
      }
    }, { password: 0 }).lean();
    
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: "Failed to locate nearby shops" });
  }
});

app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password" });
  }
  res.json({ ok: true });
});

// --- SUPER ADMIN KYC ENDPOINTS ---
app.get("/api/admin/sellers", requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Super Admin only" });
  try {
    const sellers = await Seller.find({}, { password: 0 }).lean();
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: "Failed to load sellers" });
  }
});

app.patch("/api/admin/sellers/:id/verify", requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Super Admin only" });
  try {
    const { isVerified } = req.body;
    const seller = await Seller.findByIdAndUpdate(req.params.id, { isVerified }, { new: true });
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    res.json({ ok: true, seller });
  } catch (error) {
    res.status(500).json({ error: "Failed to update verification" });
  }
});

// --- SELLER AUTH ENDPOINTS ---
app.post("/api/seller/register", async (req, res) => {
  try {
    const { shopName, ownerName, whatsappNumber, email, password, lat, lng } = req.body || {};
    if (!shopName || !ownerName || !whatsappNumber || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existing = await Seller.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let baseSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug || "shop";
    let counter = 1;
    while (await Seller.findOne({ shopUrl: slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const sellerInfo = {
      shopName, shopUrl: slug, ownerName, whatsappNumber, email, password: hashedPassword,
      isVerified: false
    };

    if (lat !== undefined && lng !== undefined) {
       sellerInfo.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
    }

    const seller = new Seller(sellerInfo);
    await seller.save();
    
    const token = jwt.sign({ sellerId: seller._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ ok: true, token, seller: { shopName: seller.shopName, shopUrl: seller.shopUrl, email: seller.email, isVerified: seller.isVerified } });
  } catch (err) {
    res.status(500).json({ error: "Failed to register seller" });
  }
});

app.post("/api/seller/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    
    const seller = await Seller.findOne({ email });
    if (!seller) return res.status(404).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ sellerId: seller._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ ok: true, token, seller: { shopName: seller.shopName, shopUrl: seller.shopUrl, email: seller.email, isVerified: seller.isVerified } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/seller/products", requireAuth, async (req, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ error: "Sellers only" });
  try {
    const products = await Product.find({ sellerId: req.user.sellerId }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your products" });
  }
});

app.post("/api/products", requireAuth, async (req, res) => {
  try {
    const { name, type, price, rating, reviews, desc, image, images, badge } = req.body || {};
    const parsedPrice = Number(price);
    const parsedRating = Number(rating);
    const productImages = Array.isArray(images) && images.length > 0 ? images.map(img => String(img).trim()) : (image ? [String(image).trim()] : []);

    if (
      !name || !type || !reviews || !desc || productImages.length === 0 || !badge ||
      !Number.isFinite(parsedPrice) || parsedPrice <= 0 ||
      !Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5
    ) {
      return res.status(400).json({ error: "Invalid product details" });
    }

    const nextId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const product = new Product({
      id: nextId,
      name: String(name).trim(),
      type: String(type).trim(),
      price: parsedPrice,
      rating: Number(parsedRating.toFixed(1)),
      reviews: String(reviews).trim(),
      desc: String(desc).trim(),
      image: productImages[0],
      images: productImages,
      badge: String(badge).trim(),
      sellerId: req.user.role === 'seller' ? req.user.sellerId : undefined
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product in cloud: " + error.message });
  }
});

app.patch("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, image, images } = req.body || {};
    
    const product = await Product.findOne({ id: id });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Check ownership for sellers
    if (req.user.role === 'seller') {
      if (String(product.sellerId) !== String(req.user.sellerId)) {
        return res.status(403).json({ error: "Access denied. You don't own this product." });
      }
    }

    if (typeof price !== "undefined") {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: "Invalid price" });
      }
      product.price = parsedPrice;
    }

    if (Array.isArray(images) && images.length > 0) {
      product.images = images.map(img => String(img).trim());
      product.image = product.images[0];
    } else if (typeof image !== "undefined") {
      if (typeof image !== "string" || !image.trim()) {
        return res.status(400).json({ error: "Invalid image value" });
      }
      product.image = image;
      product.images = [image];
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product in cloud: " + error.message });
  }
});

app.delete("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const protectedIds = Array.from({length: 16}, (_, i) => `p${i + 1}`);
    if (protectedIds.includes(id)) {
      return res.status(403).json({ error: "Cannot delete default products" });
    }
    
    const product = await Product.findOne({ id: id });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Check ownership for sellers
    if (req.user.role === 'seller') {
      if (String(product.sellerId) !== String(req.user.sellerId)) {
        return res.status(403).json({ error: "Access denied. You don't own this product." });
      }
    }

    await Product.findOneAndDelete({ id: id });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product from cloud" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Export the app for Vercel Serverless Functions
module.exports = app;
