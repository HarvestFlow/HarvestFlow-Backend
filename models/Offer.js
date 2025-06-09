import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    offer_id: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: String,
        required: true,
        trim: true,
    },
    min_quantity: {
        type: String,
        required: true,
        default: 'N/A',
        trim: true,
    },
    supplier: {
        type: String,
        required: true,
        trim: true,
    },
    supplier_info: {
        type: String,
        required: true,
        trim: true,
    },
    contact_name: {
        type: String,
        default: 'N/A',
        trim: true,
    },
    email: {
        type: String,
        default: 'N/A',
        trim: true,
    },
    phone: {
        type: String,
        default: 'N/A',
        trim: true,
    },
    image_url: {
        type: String,
        default: 'N/A',
        trim: true,
    },
    crop_type: {
        type: String,
        required: true,
        enum: ['wheat', 'barley'],
        trim: true,
    },
    vector: {
        type: [Number],
        default: [],
        required: true,
    },
    created_at: {
        type: Date,
        required: true,
    },
    last_updated: {
        type: Date,
        required: true,
    },
    scraped_at: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    is_manually_edited: {
        type: Boolean,
        default: false,
    },
});

export default mongoose.model('Offer', offerSchema);