import mongoose from 'mongoose';
import BuyerForm from '../models/BuyerForm.js';
import { findOfferMatches, triggerRecalculation } from '../utils/matching.js';
import { generateBuyerFormVector } from '../utils/offerNormalization.js';

// @desc    Create a new buyer form submission
// @route   POST /buyerform/buyer
// @access  Private (authenticated users)
export const createBuyerForm = async (req, res) => {
    try {
        const {
            title,
            company,
            productCategory,
            productNeeded,
            quantityDesired,
            pricePerUnit,
            paymentTerms,
            deliveryLocation,
            preferredSuppliersFrom,
            productSpecifications,
            contactName,
            offerEndDate,
            userId
        } = req.body;

        // Validate required fields
        if (!title || !['Wheat', 'Barley'].includes(productCategory) || !quantityDesired || !pricePerUnit || !deliveryLocation || !contactName || !offerEndDate || !userId) {
            return res.status(400).json({ status: 'error', message: 'Missing or invalid required fields' });
        }

        // Validate nested fields
        if (!quantityDesired.value || !quantityDesired.unit) {
            return res.status(400).json({ status: 'error', message: 'quantityDesired must have value and unit' });
        }
        if (!pricePerUnit.value || !pricePerUnit.currency) {
            return res.status(400).json({ status: 'error', message: 'pricePerUnit must have value and currency' });
        }

        // Generate vector with validated inputs
        const vector = generateBuyerFormVector({
            quantityDesired,
            productCategory,
            deliveryLocation,
            pricePerUnit
        });

        // Create BuyerForm
        const buyerForm = new BuyerForm({
            title,
            company,
            productCategory,
            productNeeded,
            quantityDesired,
            pricePerUnit,
            paymentTerms: paymentTerms || 'Other', // Default to 'Other' if not provided
            deliveryLocation,
            preferredSuppliersFrom: preferredSuppliersFrom || [],
            productSpecifications,
            contactName,
            offerEndDate,
            userId,
            vector,
            verifiedStatus: 'NOT_VERIFIED',
            recommendations: [],
            lastMatched: new Date()
        });

        // Save BuyerForm to get _id
        await buyerForm.save();

        // Generate recommendations
        const recommendations = await findOfferMatches({
            queryVector: vector,
            cropType: productCategory,
            preferredCountries: preferredSuppliersFrom || []
        });

        // Update BuyerForm with recommendations
        await BuyerForm.updateOne(
            { _id: buyerForm._id },
            {
                $set: {
                    recommendations,
                    lastMatched: new Date()
                }
            }
        );

        // Fetch updated BuyerForm
        const updatedBuyerForm = await BuyerForm.findById(buyerForm._id).lean();

        // Trigger recalculation
        try {
            await triggerRecalculation();
            console.log(`Triggered recalculation for BuyerForm: ${buyerForm._id}`);
        } catch (recalcError) {
            console.error(`Recalculation failed: ${recalcError.message}`);
        }

        res.status(201).json({
            status: 'success',
            data: updatedBuyerForm,
            recommendations
        });
    } catch (error) {
        console.error('Error creating BuyerForm:', error.message);
        res.status(500).json({ status: 'error', message: 'Server error', error: error.message });
    }
};

// @desc    Get buyer forms by user ID
// @route   GET /buyerform/buyer/:userId
// @access  Private
export const getBuyerForms = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Valid User ID is required' });
        }

        // Ensure userId matches authenticated user
        if (req.user && req.user._id.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized: User ID does not match' });
        }

        const forms = await BuyerForm.find({ userId }).populate('userId', 'email');

        // Trigger recalculation
        try {
            await triggerRecalculation();
            console.log(`Triggered recalculation after fetching buyer forms for userId: ${userId}`);
        } catch (recalcError) {
            console.error(`Recalculation failed: ${recalcError.message}`);
        }

        res.status(200).json(forms);
    } catch (error) {
        console.error('Error fetching buyer forms:', error);
        res.status(500).json({ error: 'Server error while fetching forms' });
    }
};

// @desc    Get all buyer forms
// @route   GET /buyerform/buyer
// @access  Public
export const getAllBuyerForms = async (req, res) => {
    try {
        const forms = await BuyerForm.find().populate('userId', 'email').sort({ createdAt: -1 });

        // Trigger recalculation
        try {
            await triggerRecalculation();
            console.log(`Triggered recalculation after fetching all buyer forms`);
        } catch (recalcError) {
            console.error(`Recalculation failed: ${recalcError.message}`);
        }

        res.status(200).json(forms);
    } catch (error) {
        console.error('Error fetching all buyer forms:', error);
        res.status(500).json({ error: 'Server error while fetching forms' });
    }
};

// @desc    Update a buyer form
// @route   PUT /buyerform/buyer/:formId
// @access  Private
export const updateBuyerForm = async (req, res) => {
    try {
        const { formId } = req.params;
        const {
            title,
            company,
            productCategory,
            productNeeded,
            quantityDesired,
            pricePerUnit,
            paymentTerms,
            deliveryLocation,
            preferredSuppliersFrom,
            productSpecifications,
            contactName,
            verifiedStatus,
            offerEndDate,
            userId,
        } = req.body;

        // Validate formId
        if (!mongoose.Types.ObjectId.isValid(formId)) {
            return res.status(400).json({ error: 'Valid Form ID is required' });
        }

        // Validate userId
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Valid User ID is required' });
        }

        // Ensure userId matches authenticated user
        if (req.user && req.user._id.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized: User ID does not match' });
        }

        // Validate offerEndDate
        if (offerEndDate && new Date(offerEndDate) < new Date()) {
            return res.status(400).json({ error: 'Offer end date must be in the future' });
        }

        // Check if form exists and belongs to user
        const existingForm = await BuyerForm.findById(formId);
        if (!existingForm) {
            return res.status(404).json({ error: 'Form not found' });
        }
        if (existingForm.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized: Form does not belong to user' });
        }

        const formData = {
            title,
            company,
            productCategory,
            productNeeded,
            quantityDesired,
            pricePerUnit,
            paymentTerms: paymentTerms || 'Other', // Default to 'Other'
            deliveryLocation,
            preferredSuppliersFrom: preferredSuppliersFrom || [],
            productSpecifications,
            contactName,
            verifiedStatus: verifiedStatus || 'NOT_VERIFIED',
            offerEndDate,
            userId,
            vector: generateBuyerFormVector({
                quantityDesired,
                productCategory,
                deliveryLocation,
                pricePerUnit
            })
        };

        const form = await BuyerForm.findByIdAndUpdate(formId, formData, {
            new: true,
            runValidators: true,
        });

        // Generate new recommendations after update
        const recommendations = await findOfferMatches({
            queryVector: formData.vector,
            cropType: productCategory,
            preferredCountries: preferredSuppliersFrom || []
        });

        await BuyerForm.updateOne(
            { _id: formId },
            {
                $set: {
                    recommendations,
                    lastMatched: new Date()
                }
            }
        );

        const updatedForm = await BuyerForm.findById(formId).lean();

        // Trigger recalculation
        try {
            await triggerRecalculation();
            console.log(`Triggered recalculation for BuyerForm: ${formId}`);
        } catch (recalcError) {
            console.error(`Recalculation failed: ${recalcError.message}`);
        }

        res.status(200).json(updatedForm);
    } catch (error) {
        console.error('Error updating buyer form:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Delete a buyer form
// @route   DELETE /buyerform/buyer/:formId
// @access  Private
export const deleteBuyerForm = async (req, res) => {
    try {
        const { formId } = req.params;

        

        // Check if form exists
        const form = await BuyerForm.findById(formId);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        await BuyerForm.findByIdAndDelete(formId);

        // Trigger recalculation
        try {
            await triggerRecalculation();
            console.log(`Triggered recalculation after deleting BuyerForm: ${formId}`);
        } catch (error) {
            console.error('Error during recalculation:', error);
        }

        res.status(201).json({ message: 'Form deleted successfully', status: 'success', });
    } catch (error) {
        console.error('Error deleting buyer form:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};