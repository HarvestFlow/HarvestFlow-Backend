import mongoose from 'mongoose';

const buyerFormSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: {
        name: { type: String, required: true },
        address: {
            country: { type: String, required: true },
            street: String,
            city: String,
            postalCode: String
        },
        contactEmail: { type: String, required: true },
        registrationNumber: String,
        contactPhone: String
    },
    productCategory: { type: String, required: true, enum: ['Wheat', 'Barley'] },
    productNeeded: { type: String, required: true },
    quantityDesired: {
        value: { type: Number, required: true },
        unit: { type: String, required: true }
    },
    pricePerUnit: {
        value: { type: Number, required: true },
        currency: { type: String, required: true }
    },
    paymentTerms: { type: String, required: true },
    deliveryLocation: { type: String, required: true },
    preferredSuppliersFrom: [{ type: String }],
    productSpecifications: String,
    contactName: { type: String, required: true },
    offerEndDate: { type: Date, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedStatus: { type: String, default: 'NOT_VERIFIED', enum: ['NOT_VERIFIED', 'PENDING', 'VERIFIED'] },
    vector: [{ type: Number }],
    recommendations: [{
        type: { type: String, enum: ['farmer_form', 'external_offer'] },
        item: {
            id: {
                type: mongoose.Schema.Types.Mixed, // Allow String or ObjectId
                required: true,
            },
                        title: { type: String },
            quantity: { type: String },
            price: { type: String },
            location: { type: String },
            contact: { type: String },
            email: { type: String }
        },
        similarity: { type: Number },
        reason: { type: String }
    }],
    lastMatched: { type: Date }
}, { timestamps: true });

export default mongoose.model('BuyerForm', buyerFormSchema);