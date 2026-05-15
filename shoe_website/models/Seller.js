const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  shopUrl: { type: String, required: true, unique: true }, // The unique custom URL slug for the VIP storefront
  ownerName: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false }, // Mandatory KYC Guard
  logo: { type: String, default: "" }, // Premium branding
  
  // Geospatial Data for "Near Me" searching
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [Longitude, Latitude]
  }
}, { timestamps: true });

sellerSchema.index({ location: '2dsphere' }); // Crucial for ultra-fast geographical proximity search

module.exports = mongoose.model("Seller", sellerSchema);
