import mongoose from 'mongoose';
import FarmerForm from '../models/FarmerForm.js';
import BuyerForm from '../models/BuyerForm.js'
import Offer from '../models/Offer.js'; // Add this import
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const offers = await FarmerForm.find()
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalOffers = await FarmerForm.countDocuments();

    res.status(200).json({
      offers,
      totalOffers,
      totalPages: Math.ceil(totalOffers / limit),
    });
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
      // Find the farmer form and populate recommendations
      const farmerForm = await FarmerForm.findById(offerId)
        .select('recommendations')
        .lean();
  
      if (!farmerForm) {
        console.log('FarmerForm not found for offerId:', offerId);
        return res.status(404).json({ error: 'Offer not found' });
      }
  
      // Fetch full details for each recommendation
      const recommendations = await Promise.all(
        farmerForm.recommendations.map(async (rec) => {
          let itemDetails = {};
          if (rec.type === 'buyer_form' && mongoose.Types.ObjectId.isValid(rec.item.id)) {
            const buyerForm = await BuyerForm.findById(rec.item.id).lean();
            if (buyerForm) {
              itemDetails = {
                _id: buyerForm._id,
                title: buyerForm.title,
                company: buyerForm.company,
                productCategory: buyerForm.productCategory,
                productNeeded: buyerForm.productNeeded,
                quantityDesired: buyerForm.quantityDesired,
                pricePerUnit: buyerForm.pricePerUnit,
                paymentTerms: buyerForm.paymentTerms,
                deliveryLocation: buyerForm.deliveryLocation,
                preferredSuppliersFrom: buyerForm.preferredSuppliersFrom,
                productSpecifications: buyerForm.productSpecifications,
                contactName: buyerForm.contactName,
                offerEndDate: buyerForm.offerEndDate,
                userId: buyerForm.userId,
                verifiedStatus: buyerForm.verifiedStatus,
                vector: buyerForm.vector,
                createdAt: buyerForm.createdAt,
                updatedAt: buyerForm.updatedAt,
              };
            }
          }
          return {
            _id: rec._id,
            type: rec.type,
            item: itemDetails,
            similarity: rec.similarity,
            reason: rec.reason,
          };
        })
      );
  
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
  
  // @desc    Get recommendations with full offer details for a BuyerForm
  // @route   GET /farmerform/buyer/recommendations/:buyerFormId
  // @access  Private
  export const getBuyerRecommendations = asyncHandler(async (req, res) => {
    console.log('getBuyerRecommendations called with buyerFormId:', req.params.buyerFormId);
    const { buyerFormId } = req.params;
  
    // Validate buyerFormId
    if (!buyerFormId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid buyerFormId:', buyerFormId);
      return res.status(400).json({ error: 'Invalid buyer form ID' });
    }
  
    try {
      // Find the buyer form
      const buyerForm = await BuyerForm.findById(buyerFormId)
        .select('recommendations')
        .lean();
  
      if (!buyerForm) {
        console.log('BuyerForm not found for buyerFormId:', buyerFormId);
        return res.status(404).json({ error: 'Buyer form not found' });
      }
  
      // Fetch full details for each recommendation
      const recommendations = await Promise.all(
        buyerForm.recommendations.map(async (rec) => {
          let itemDetails = {};
          if (rec.type === 'farmer_form' && mongoose.Types.ObjectId.isValid(rec.item.id)) {
            const farmerForm = await FarmerForm.findById(rec.item.id).lean();
            if (farmerForm) {
              itemDetails = {
                _id: farmerForm._id,
                title: farmerForm.title,
                company: farmerForm.company,
                productCategory: farmerForm.productCategory,
                productOffered: farmerForm.productOffered,
                quantityAvailable: farmerForm.quantityAvailable,
                pricePerUnit: farmerForm.pricePerUnit,
                paymentTerms: farmerForm.paymentTerms,
                destination: farmerForm.destination,
                lookingForBuyersFrom: farmerForm.lookingForBuyersFrom,
                productDescription: farmerForm.productDescription,
                contactName: farmerForm.contactName,
                verifiedStatus: farmerForm.verifiedStatus,
                availabilityEndDate: farmerForm.availabilityEndDate,
                userId: farmerForm.userId,
                vector: farmerForm.vector,
                createdAt: farmerForm.createdAt,
                updatedAt: farmerForm.updatedAt,
              };
            }
          } else if (rec.type === 'external_offer' && rec.item.id) {
            const offer = await Offer.findOne({ offer_id: rec.item.id }).lean();
            if (offer) {
              itemDetails = {
                offer_id: offer.offer_id,
                title: offer.title,
                price: offer.price,
                min_quantity: offer.min_quantity,
                supplier: offer.supplier,
                supplier_info: offer.supplier_info,
                contact_name: offer.contact_name,
                email: offer.email,
                phone: offer.phone,
                image_url: offer.image_url,
                crop_type: offer.crop_type,
                vector: offer.vector,
                created_at: offer.created_at,
                last_updated: offer.last_updated,
                scraped_at: offer.scraped_at,
                status: offer.status,
                is_manually_edited: offer.is_manually_edited,
              };
            }
          }
          return {
            _id: rec._id,
            type: rec.type,
            item: itemDetails,
            similarity: rec.similarity,
            reason: rec.reason,
          };
        })
      );
  
      // Log for debugging
      console.log('Buyer Recommendations Fetched:', {
        buyerFormId,
        recommendationsCount: recommendations.length,
        recommendations,
      });
  
      res.status(200).json(recommendations);
    } catch (error) {
      console.error('Error in getBuyerRecommendations:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });