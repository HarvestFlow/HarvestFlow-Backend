import mongoose from 'mongoose';

const farmerFormSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        company: {
            name: { type: String, required: true },
            address: {
                street: { type: String },
                city: { type: String },
                state: { type: String },
                country: { type: String, required: true },
                postalCode: { type: String },
            },
            contactEmail: { type: String, required: true },
            contactPhone: { type: String },
        },
        productCategory: { type: String, required: true },
        productOffered: { type: String, required: true },
        quantityAvailable: {
            value: { type: Number, required: true },
            unit: { type: String, required: true },
        },
        pricePerUnit: {
            value: { type: Number, required: true },
            currency: { type: String, required: true },
        },
        paymentTerms: { type: String, default: 'Other' },
        destination: { type: String, required: true },
        lookingForBuyersFrom: [{ type: String }],
        productDescription: { type: String },
        contactName: { type: String, required: true },
        verifiedStatus: {
            type: String,
            enum: ['NOT_VERIFIED', 'PENDING', 'VERIFIED'],
            default: 'NOT_VERIFIED',
        },
        availabilityEndDate: { type: Date, required: true },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        vector: { type: [Number], required: true },
        recommendations: [
            {
                type: { type: String, enum: ['buyer_form'], required: true },
                item: {
                    id: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'BuyerForm',
                        required: true,
                    },
                    title: { type: String, required: true },
                    quantity: { type: Number, required: true },
                    price: { type: Number, required: true },
                    location: { type: String, required: true },
                    contact: { type: String },
                    email: { type: String },
                },
                similarity: { type: Number, required: true },
                reason: { type: String, required: true },
            },
        ],
    },
    { timestamps: true },
);

export default mongoose.model('FarmerForm', farmerFormSchema);
