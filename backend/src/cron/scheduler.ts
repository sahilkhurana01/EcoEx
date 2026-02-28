import cron from 'node-cron';
import { WasteListing } from '../models/WasteListing';
import { NeedListing } from '../models/NeedListing';
import { Match } from '../models/Match';
import { Company } from '../models/Company';
import { matchingEngine } from '../services/matching/algorithm';
import { brevoService } from '../services/notifications/brevo.service';
import { impactPredictor } from '../services/impact/predictor';
import { ImpactAnalytics } from '../models/ImpactAnalytics';
import { logger } from '../utils/logger';
import { thresholdEngine } from '../services/alerts/thresholdEngine.service';
import mongoose from 'mongoose';

/**
 * Initialize all cron jobs
 * Only runs if MongoDB is connected
 */
export function initCronJobs(): void {
    if (mongoose.connection.readyState !== 1) {
        logger.warn('⚠️ Cron jobs disabled — MongoDB not connected');
        return;
    }

    logger.info('⏰ Initializing cron jobs...');

    // ─────────────────────────────────────────────────────
    // 1. Auto-expire stale listings — every hour
    // ─────────────────────────────────────────────────────
    cron.schedule('0 * * * *', async () => {
        try {
            const now = new Date();

            // Expire waste listings past their expiresAt date
            const expiredWaste = await WasteListing.updateMany(
                { status: 'active', expiresAt: { $lte: now } },
                { $set: { status: 'expired' } }
            );

            // Expire need listings past their expiresAt date
            const expiredNeed = await NeedListing.updateMany(
                { status: 'active', expiresAt: { $lte: now } },
                { $set: { status: 'expired' } }
            );

            // Expire pending matches older than 30 days
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const expiredMatches = await Match.updateMany(
                { 'negotiation.status': 'pending', createdAt: { $lte: thirtyDaysAgo } },
                { $set: { 'negotiation.status': 'expired' } }
            );

            if (expiredWaste.modifiedCount || expiredNeed.modifiedCount || expiredMatches.modifiedCount) {
                logger.info(
                    `🗑️ Expired: ${expiredWaste.modifiedCount} waste listings, ` +
                    `${expiredNeed.modifiedCount} need listings, ` +
                    `${expiredMatches.modifiedCount} matches`
                );
            }
        } catch (error) {
            logger.error('Cron: expire-listings failed:', error);
        }
    });

    // ─────────────────────────────────────────────────────
    // 2. Auto-relist — daily at midnight
    // ─────────────────────────────────────────────────────
    cron.schedule('0 0 * * *', async () => {
        try {
            const expired = await WasteListing.find({
                status: 'expired',
                autoRelist: true,
            });

            for (const listing of expired) {
                listing.status = 'active';
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 30);
                listing.expiresAt = newExpiry;
                await listing.save();
            }

            if (expired.length > 0) {
                logger.info(`🔄 Auto-relisted ${expired.length} waste listings`);
            }
        } catch (error) {
            logger.error('Cron: auto-relist failed:', error);
        }
    });

    // ─────────────────────────────────────────────────────
    // 3. Auto-match new listings — every 6 hours
    // ─────────────────────────────────────────────────────
    cron.schedule('0 */6 * * *', async () => {
        try {
            // Find active waste listings with 0 matches (new/unmatched)
            const unmatchedListings = await WasteListing.find({
                status: 'active',
                matchCount: 0,
            }).limit(20);

            let matchesCreated = 0;
            for (const listing of unmatchedListings) {
                try {
                    const results = await matchingEngine.findMatches(listing._id.toString());
                    if (results.length > 0) {
                        await matchingEngine.createMatches(listing._id.toString(), results);
                        matchesCreated += results.length;
                    }
                } catch (err) {
                    // Skip individual failures
                }
            }

            if (matchesCreated > 0) {
                logger.info(`🎯 Auto-matched: ${matchesCreated} new matches from ${unmatchedListings.length} listings`);
            }
        } catch (error) {
            logger.error('Cron: auto-match failed:', error);
        }
    });

    // ─────────────────────────────────────────────────────
    // 4. Weekly digest emails — every Monday at 9 AM IST
    // ─────────────────────────────────────────────────────
    cron.schedule('0 9 * * 1', async () => {
        try {
            const companies = await Company.find({
                email: { $exists: true, $ne: '' },
                verificationStatus: 'verified',
            });

            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const now = new Date();

            for (const company of companies) {
                try {
                    const newMatches = await Match.countDocuments({
                        $or: [{ sellerId: company._id }, { buyerId: company._id }],
                        createdAt: { $gte: oneWeekAgo },
                    });

                    const completedDeals = await Match.countDocuments({
                        $or: [{ sellerId: company._id }, { buyerId: company._id }],
                        'execution.status': 'completed',
                        completedAt: { $gte: oneWeekAgo },
                    });

                    const impactThisWeek = await Match.aggregate([
                        {
                            $match: {
                                $or: [{ sellerId: company._id }, { buyerId: company._id }],
                                'execution.status': 'completed',
                                completedAt: { $gte: oneWeekAgo },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                co2Saved: { $sum: '$actualImpact.netCo2Saved' },
                                moneySaved: { $sum: '$financials.buyerSavings' },
                            },
                        },
                    ]);

                    if (company.email) {
                        await brevoService.sendWeeklyDigest(company.email, {
                            weekRange: `${oneWeekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                            newMatches,
                            dealsCompleted: completedDeals,
                            co2Saved: impactThisWeek[0]?.co2Saved || 0,
                            moneySaved: impactThisWeek[0]?.moneySaved || 0,
                        });
                    }
                } catch (err) {
                    // Skip individual company failures
                }
            }

            logger.info(`📧 Weekly digests sent to ${companies.length} companies`);
        } catch (error) {
            logger.error('Cron: weekly-digest failed:', error);
        }
    });

    // ─────────────────────────────────────────────────────
    // 5. Update industry benchmarks — daily at 2 AM
    // ─────────────────────────────────────────────────────
    cron.schedule('0 2 * * *', async () => {
        try {
            const companies = await Company.find({
                verificationStatus: { $ne: 'suspended' },
            }).select('_id industry');

            let updated = 0;
            for (const company of companies) {
                try {
                    const benchmarks = await impactPredictor.calculateBenchmarks(
                        company._id.toString(),
                        company.industry
                    );

                    // Update the latest analytics record with benchmarks
                    await ImpactAnalytics.findOneAndUpdate(
                        { companyId: company._id },
                        {
                            $set: {
                                benchmarks: {
                                    industryAverage: benchmarks.industryAverage,
                                    percentile: benchmarks.percentile,
                                    trend: benchmarks.trend,
                                },
                            },
                        },
                        { sort: { date: -1 } }
                    );
                    updated++;
                } catch (err) {
                    // Skip individual failures
                }
            }

            logger.info(`📊 Updated benchmarks for ${updated} companies`);
        } catch (error) {
            logger.error('Cron: benchmark-update failed:', error);
        }
    });

    // ─────────────────────────────────────────────────────
    // 6. Threshold Monitoring — every hour at the 30-minute mark
    // ─────────────────────────────────────────────────────
    cron.schedule('30 * * * *', async () => {
        try {
            await thresholdEngine.checkAllThresholds();
        } catch (error) {
            logger.error('Cron: threshold-monitoring failed:', error);
        }
    });

    logger.info('✅ All cron jobs initialized');
}
