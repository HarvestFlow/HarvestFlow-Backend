import BuyerForm from '../models/BuyerForm.js';
import FarmerForm from '../models/FarmerForm.js';
import { recalculateAllMatches } from '../utils/matching.js';

// @desc    Trigger recalculation of matches and verify updates
// @route   POST /matches/recalculate
// @access  Private (authenticated users)
export const recalculateMatches = async (req, res) => {
    try {
        console.log('Recalculation triggered via /matches/recalculate');

        // Capture BuyerForms state before recalculation
        const beforeBuyerForms = await BuyerForm.find({
            offerEndDate: { $gte: new Date() },
        })
            .select('_id title recommendations lastMatched')
            .lean();

        // Capture FarmerForms state before recalculation
        const beforeFarmerForms = await FarmerForm.find({
            availabilityEndDate: { $gte: new Date() },
        })
            .select('_id title recommendations lastMatched')
            .lean();

        // Trigger recalculation
        await recalculateAllMatches();

        // Capture BuyerForms state after recalculation
        const afterBuyerForms = await BuyerForm.find({
            offerEndDate: { $gte: new Date() },
        })
            .select('_id title recommendations lastMatched')
            .lean();

        // Capture FarmerForms state after recalculation
        const afterFarmerForms = await FarmerForm.find({
            availabilityEndDate: { $gte: new Date() },
        })
            .select('_id title recommendations lastMatched')
            .lean();

        // Identify updated BuyerForms
        const updatedBuyerForms = afterBuyerForms.filter((form) => {
            const beforeForm = beforeBuyerForms.find(
                (bf) => bf._id.toString() === form._id.toString(),
            );
            if (!beforeForm) return false;
            const beforeRecommendations = JSON.stringify(
                beforeForm.recommendations || [],
            );
            const afterRecommendations = JSON.stringify(
                form.recommendations || [],
            );
            const beforeLastMatched = new Date(beforeForm.lastMatched || 0).getTime();
            const afterLastMatched = new Date(form.lastMatched).getTime();
            return (
                beforeRecommendations !== afterRecommendations ||
                afterLastMatched > beforeLastMatched
            );
        });

        // Identify updated FarmerForms
        const updatedFarmerForms = afterFarmerForms.filter((form) => {
            const beforeForm = beforeFarmerForms.find(
                (bf) => bf._id.toString() === form._id.toString(),
            );
            if (!beforeForm) return false;
            const beforeRecommendations = JSON.stringify(
                beforeForm.recommendations || [],
            );
            const afterRecommendations = JSON.stringify(
                form.recommendations || [],
            );
            const beforeLastMatched = new Date(beforeForm.lastMatched || 0).getTime();
            const afterLastMatched = new Date(form.lastMatched).getTime();
            return (
                beforeRecommendations !== afterRecommendations ||
                afterLastMatched > beforeLastMatched
            );
        });

        // Generate report
        const report = {
            totalBuyerFormsProcessed: afterBuyerForms.length,
            updatedBuyerFormsCount: updatedBuyerForms.length,
            updatedBuyerForms: updatedBuyerForms.map((form) => ({
                id: form._id,
                title: form.title,
                recommendationsCount: form.recommendations.length,
                lastMatched: form.lastMatched,
            })),
            totalFarmerFormsProcessed: afterFarmerForms.length,
            updatedFarmerFormsCount: updatedFarmerForms.length,
            updatedFarmerForms: updatedFarmerForms.map((form) => ({
                id: form._id,
                title: form.title,
                recommendationsCount: form.recommendations.length,
                lastMatched: form.lastMatched,
            })),
        };

        console.log(
            `Recalculation report: ${JSON.stringify(report, null, 2)}`,
        );

        res.status(200).json({
            status: 'success',
            message: 'Recalculation completed',
            report,
        });
    } catch (error) {
        console.error('Error in recalculateMatches:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to recalculate matches',
            error: error.message,
        });
    }
};
