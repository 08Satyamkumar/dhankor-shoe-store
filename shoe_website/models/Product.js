const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // p1, p2, or custom id
  name: { type: String, required: true },
  type: { type: String }, // Running, Casual, Formal
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  reviews: { type: String, default: "0k" },
  desc: { type: String, default: "" },
  image: { type: String, default: "" }, // Main Thumbnail
  images: { type: [String], default: [] }, // All Variants
  badge: { type: String, default: "" },
  
  // Future Phase 2 Feature: Linking to specific Seller
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: false }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
