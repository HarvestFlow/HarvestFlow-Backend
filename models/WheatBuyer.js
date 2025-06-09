// models/WheatBuyer.js
import mongoose from 'mongoose';

const buyerSchema = new mongoose.Schema({
    buyer_id: { type: String, required: true, unique: true },
    title: String,
    country: String,
    quantity_required: String,
    payment_terms: String,
    destination: String,
    supplier_regions: String,
    product_description: String,
    contact_name: String,
    verified_status: String,
    date: String,
    cereal_type: { type: String, default: 'N/A' },
    last_updated: Date,
    is_active: Boolean,
    vector: { type: [Number], default: [] } // Champ pour le vecteur KNN
});

export const WheatBuyer = mongoose.model('WheatBuyer', buyerSchema);