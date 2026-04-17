const express = require("express");
const cors = require("cors");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
const PRODUCTS_FILE = path.join(__dirname, "products.json");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(__dirname));

async function readProducts() {
  const raw = await fs.readFile(PRODUCTS_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeProducts(products) {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8");
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized admin action" });
  }
  next();
}

app.get("/api/products", async (_req, res) => {
  try {
    const products = await readProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to load products" });
  }
});

app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password" });
  }
  res.json({ ok: true });
});

app.post("/api/products", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      type,
      price,
      rating,
      reviews,
      desc,
      image,
      images,
      badge
    } = req.body || {};

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

    const products = await readProducts();
    const nextId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const product = {
      id: nextId,
      name: String(name).trim(),
      type: String(type).trim(),
      price: parsedPrice,
      rating: Number(parsedRating.toFixed(1)),
      reviews: String(reviews).trim(),
      desc: String(desc).trim(),
      image: productImages[0],
      images: productImages,
      badge: String(badge).trim()
    };

    products.push(product);
    await writeProducts(products);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.patch("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, image, images } = req.body || {};
    const products = await readProducts();
    const product = products.find((item) => item.id === id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
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

    await writeProducts(products);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const protectedIds = Array.from({length: 16}, (_, i) => `p${i + 1}`);
    if (protectedIds.includes(id)) {
      return res.status(403).json({ error: "Cannot delete default products" });
    }

    let products = await readProducts();
    const initialLength = products.length;
    products = products.filter((item) => item.id !== id);

    if (products.length === initialLength) {
      return res.status(404).json({ error: "Product not found" });
    }

    await writeProducts(products);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
