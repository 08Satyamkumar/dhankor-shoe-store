const express = require("express");
const cors = require("cors");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
const PRODUCTS_FILE = path.join(__dirname, "products.json");

app.use(cors());
app.use(express.json({ limit: "12mb" }));
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

app.patch("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, image } = req.body || {};
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

    if (typeof image !== "undefined") {
      if (typeof image !== "string" || !image.trim()) {
        return res.status(400).json({ error: "Invalid image value" });
      }
      product.image = image;
    }

    await writeProducts(products);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
