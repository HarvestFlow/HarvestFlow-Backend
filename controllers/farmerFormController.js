import mongoose from 'mongoose';
import FarmerForm from '../models/FarmerForm.js';
import { generateFarmerFormVector } from '../utils/offerNormalization.js';
import { triggerRecalculation } from '../utils/matching.js';
import asyncHandler from 'express-async-handler';
// @desc    Create a new farmer form submission
// @route   POST /farmerform/farmer
// @access  Private (authenticated users)
export const createFarmerForm = async (req, res) => {
    try {
        const {
            title,
            company,
            productCategory,
            productOffered,
            quantityAvailable,
            pricePerUnit,
            paymentTerms,
            destination,
            lookingForBuyersFrom,
            productDescription,
            contactName,
            verifiedStatus,
            availabilityEndDate,
            userId,
        } = req.body;

        // Validate userId
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Valid User ID is required' });
        }

        // Validate availabilityEndDate
        if (availabilityEndDate && new Date(availabilityEndDate) < new Date()) {
            return res.status(400).json({ error: 'Availability end date must be in the future' });
        }

        // Ensure userId matches authenticated user (assuming req.user from auth middleware)
        if (req.user && req.user._id.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized: User ID does not match' });
        }

        const formData = {
            title,
            company,
            productCategory,
            productOffered,
            quantityAvailable,
            pricePerUnit,
            paymentTerms: paymentTerms || 'Other',
            destination,
            lookingForBuyersFrom: lookingForBuyersFrom || [],
            productDescription,
            contactName,
            verifiedStatus: verifiedStatus || 'NOT_VERIFIED',
            availabilityEndDate,
            userId,
            vector: generateFarmerFormVector({
                quantityAvailable,
                productCategory,
                destination,
                pricePerUnit
            })
        };

        const form = await FarmerForm.create(formData);

        // Trigger recalculation of matches
        console.log(`New FarmerForm created: ${form._id}. Triggering recalculation...`);
        await triggerRecalculation();

        res.status(201).json(form);
    } catch (error) {
        console.error('Error creating farmer form:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get farmer forms by user ID
// @route   GET /farmerform/farmer/:userId
// @access  Private
export const getFarmerForms = async (req, res) => {
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

        const forms = await FarmerForm.find({ userId }).populate('userId', 'email');
        res.status(200).json(forms);
    } catch (error) {
        console.error('Error fetching farmer forms:', error.message);
        res.status(500).json({ error: 'Server error while fetching forms' });
    }
};

// @desc    Get all farmer forms
// @route   GET /farmerform/farmer
// @access  Public
export const getAllFarmerForms = async (req, res) => {
    try {
        const forms = await FarmerForm.find().populate('userId', 'email').sort({ createdAt: -1 });
        res.status(200).json(forms);
    } catch (error) {
        console.error('Error fetching all farmer forms:', error.message);
        res.status(500).json({ error: 'Server error while fetching forms' });
    }
};

// @desc    Update a farmer form
// @route   PUT /farmerform/farmer/:formId
// @access  Private
export const updateFarmerForm = async (req, res) => {
    try {
        const { formId } = req.params;
        const {
            title,
            company,
            productCategory,
            productOffered,
            quantityAvailable,
            pricePerUnit,
            paymentTerms,
            destination,
            lookingForBuyersFrom,
            productDescription,
            contactName,
            verifiedStatus,
            availabilityEndDate,
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

        // Validate availabilityEndDate
        if (availabilityEndDate && new Date(availabilityEndDate) < new Date()) {
            return res.status(400).json({ error: 'Availability end date must be in the future' });
        }

        // Check if form exists and belongs to user
        const existingForm = await FarmerForm.findById(formId);
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
            productOffered,
            quantityAvailable,
            pricePerUnit,
            paymentTerms: paymentTerms || 'Other',
            destination,
            lookingForBuyersFrom: lookingForBuyersFrom || [],
            productDescription,
            contactName,
            verifiedStatus: verifiedStatus || 'NOT_VERIFIED',
            availabilityEndDate,
            userId,
            vector: generateFarmerFormVector({
                quantityAvailable,
                productCategory,
                destination,
                pricePerUnit
            })
        };

        const form = await FarmerForm.findByIdAndUpdate(formId, formData, {
            new: true,
            runValidators: true,
        });

        // Trigger recalculation of matches
        console.log(`FarmerForm updated: ${form._id}. Triggering recalculation...`);
        await triggerRecalculation();

        res.status(200).json(form);
    } catch (error) {
        console.error('Error updating farmer form:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Delete a farmer form
// @route   DELETE /farmerform/farmer/:formId
// @access  Private
export const deleteFarmerForm = async (req, res) => {
    try {
        const { id } = req.params; // Changed from formId to id

        // Validate id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Valid Form ID is required' });
        }

        // Check if form exists and belongs to user
        const form = await FarmerForm.findById(id);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }
        if (req.user && form.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized: Form does not belong to user' });
        }

        await FarmerForm.findByIdAndDelete(id);

        // Trigger recalculation of matches
        console.log(`FarmerForm deleted: ${id}. Triggering recalculation...`);
        await triggerRecalculation();

        res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
        console.error('Error deleting farmer form:', error.message);
        res.status(500).json({ error: 'Server error while deleting form' });
    }
};
export const getRecommendations = asyncHandler(async (req, res) => {
    console.log('getRecommendations called with offerId:', req.params.offerId);
    const { offerId } = req.params;
  
    // Validate offerId
    if (!offerId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid offerId:', offerId);
      return res.status(400).json({ error: 'Invalid offer ID' });
    }
  
    try {
      // Find the farmer form and populate BuyerForm for recommendations.item.id
      const farmerForm = await FarmerForm.findById(offerId)
        .select('recommendations')
        .populate({
          path: 'recommendations.item.id',
          model: 'BuyerForm',
        })
        .lean();
  
      if (!farmerForm) {
        console.log('FarmerForm not found for offerId:', offerId);
        return res.status(404).json({ error: 'Offer not found' });
      }
  
      // Map recommendations to merge populated BuyerForm data with item fields
      const recommendations = farmerForm.recommendations.map((rec) => ({
        _id: rec._id,
        type: rec.type,
        item: {
          ...rec.item.id, // Populated BuyerForm fields
          title: rec.item.title, // Embedded fields from FarmerForm
          quantity: rec.item.quantity,
          price: rec.item.price,
          location: rec.item.location,
          contact: rec.item.contact,
          email: rec.item.email,
        },
        similarity: rec.similarity,
        reason: rec.reason,
      }));
  
      // Log for debugging
      console.log('Recommendations Fetched:', {
        offerId,
        recommendationsCount: recommendations.length,
        recommendations,
      });
  
      res.status(200).json(recommendations);
    } catch (error) {
      console.error('Error in getRecommendations:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });