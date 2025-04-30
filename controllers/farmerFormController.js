import mongoose from 'mongoose';
import FarmerForm from '../models/FarmerForm.js';

// @desc    Create a new farmer form submission
// @route   POST /api/farmerforms
// @access  Public
export const createFarmerForm = async (req, res) => {
  try {
    const {
      title,
      country,
      quantityRequired,
      paymentTerms,
      destination,
      lookingForSuppliersFrom,
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

    // Validate availabilityEndDate if provided
    if (availabilityEndDate && new Date(availabilityEndDate) < new Date()) {
      return res.status(400).json({ error: 'Availability end date must be in the future' });
    }

    const formData = {
      title,
      country,
      quantityRequired,
      paymentTerms: paymentTerms || 'N/A',
      destination: destination || 'N/A',
      lookingForSuppliersFrom: lookingForSuppliersFrom || 'N/A',
      productDescription,
      contactName,
      verifiedStatus: verifiedStatus || 'NOT_VERIFIED',
      availabilityEndDate: availabilityEndDate || undefined,
      userId,
    };

    const form = await FarmerForm.create(formData);
    res.status(201).json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get farmer forms by user ID
// @route   GET /api/farmerforms/:userId
// @access  Public
export const getFarmerForms = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Valid User ID is required' });
    }

    const forms = await FarmerForm.find({ userId }).populate('userId', 'email');
    res.json(forms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all farmer forms
// @route   GET /api/farmerforms
// @access  Public
export const getAllFarmerForms = async (req, res) => {
  try {
    const forms = await FarmerForm.find().populate('userId', 'email').sort({ createdAt: -1 });
    res.status(200).json(forms);
  } catch (error) {
    console.error('Error fetching all farmer forms:', error);
    res.status(500).json({ error: 'Server error while fetching forms.' });
  }
};