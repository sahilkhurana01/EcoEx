import { Router } from 'express';
import { marketplaceController } from '../controllers/marketplace.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createWasteListingSchema, updateWasteListingSchema, createNeedListingSchema } from '../validators';

const router = Router();

// Public
router.get('/stats', marketplaceController.stats.bind(marketplaceController));

// Waste Listings
router.post('/waste-listings', authMiddleware, validate(createWasteListingSchema), marketplaceController.createWasteListing.bind(marketplaceController));
router.get('/waste-listings', optionalAuth, marketplaceController.searchWasteListings.bind(marketplaceController));
router.get('/waste-listings/:id', optionalAuth, marketplaceController.getWasteListing.bind(marketplaceController));
router.put('/waste-listings/:id', authMiddleware, validate(updateWasteListingSchema), marketplaceController.updateWasteListing.bind(marketplaceController));
router.delete('/waste-listings/:id', authMiddleware, marketplaceController.deleteWasteListing.bind(marketplaceController));
router.post('/waste-listings/:id/contact', authMiddleware, marketplaceController.contactSeller.bind(marketplaceController));

// Need Listings
router.post('/need-listings', authMiddleware, validate(createNeedListingSchema), marketplaceController.createNeedListing.bind(marketplaceController));
router.get('/need-listings', optionalAuth, marketplaceController.searchNeedListings.bind(marketplaceController));
router.get('/need-listings/:id', optionalAuth, marketplaceController.getNeedListing.bind(marketplaceController));
router.put('/need-listings/:id', authMiddleware, marketplaceController.updateNeedListing.bind(marketplaceController));

export default router;
