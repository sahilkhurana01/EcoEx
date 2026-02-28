import { AlertSettings } from '../../models/Alert';
import { alertOrchestratorService } from './alertOrchestrator.service';
import { logger } from '../../utils/logger';
import { Company } from '../../models/Company';
import { ImpactAnalytics } from '../../models/ImpactAnalytics';

/**
 * The Threshold Monitoring Engine is responsible for:
 * 1. Periodically checking company metrics against their alert settings.
 * 2. Detecting spikes, deviations, and threshold breaches.
 * 3. Triggering the Alert Orchestrator for real-world (non-simulated) alerts.
 */
export class ThresholdMonitoringEngine {

    /**
     * Main execution loop for monitoring
     */
    async checkAllThresholds() {
        logger.info('🚀 Starting Threshold Monitoring Scan...');
        const startTime = Date.now();

        try {
            const settingsList = await AlertSettings.find({ enabled: true }).lean();

            for (const settings of settingsList) {
                await this.processCompanyMetrics(settings.companyId.toString(), settings);
            }

            logger.info(`✅ Threshold Scan Completed in ${Date.now() - startTime}ms`);
        } catch (error: any) {
            logger.error('❌ Threshold Monitoring Scan Failed:', { message: error.message });
        }
    }

    /**
     * Logic for processing a single company's metrics
     */
    private async processCompanyMetrics(companyId: string, settings: any) {
        try {
            // 1. Fetch Company & Latest Analytics
            const [company, latestAnalytics] = await Promise.all([
                Company.findById(companyId).lean() as any,
                ImpactAnalytics.findOne({ companyId }).sort({ date: -1 }).lean() as any
            ]);

            if (!company || !latestAnalytics) return;

            // 2. Check Carbon Thresholds
            if (settings.thresholds?.carbon?.enabled) {
                const totalEmissions = latestAnalytics.emissions?.totalCo2e || 0;
                // Example check: if current emissions exceed a baseline (mocked at 10000 for demonstration)
                const baseline = 10000;
                const threshold = baseline * (settings.thresholds.carbon.emissionsBaselinePercent / 100);

                if (totalEmissions > threshold) {
                    await alertOrchestratorService.triggerAlert({
                        companyId,
                        alertType: 'carbon_spike',
                        category: 'carbon',
                        severity: 'high',
                        metric: 'Monthly CO2e',
                        currentValue: totalEmissions,
                        thresholdValue: threshold,
                        unit: 'kg CO2e',
                        title: 'Carbon Emission Threshold Exceeded',
                        description: `Your monthly emissions of ${totalEmissions} kg CO2e have exceeded the threshold of ${threshold} kg CO2e.`,
                        isSimulation: false
                    });
                }
            }

            // 3. Check Waste Thresholds
            if (settings.thresholds?.waste?.enabled) {
                const wasteGenerated = latestAnalytics.waste?.generated || 0;
                const capacity = 5000; // Mocked capacity
                const threshold = capacity * (settings.thresholds.waste.storageCapacityPercent / 100);

                if (wasteGenerated > threshold) {
                    await alertOrchestratorService.triggerAlert({
                        companyId,
                        alertType: 'waste_overflow',
                        category: 'waste',
                        severity: 'medium',
                        metric: 'Waste Generation',
                        currentValue: wasteGenerated,
                        thresholdValue: threshold,
                        unit: 'kg',
                        title: 'Waste Production Alert',
                        description: `Waste generation has reached ${wasteGenerated} kg, exceeding the ${settings.thresholds.waste.storageCapacityPercent}% capacity threshold.`,
                        isSimulation: false
                    });
                }
            }

        } catch (error: any) {
            logger.error(`Error processing metrics for company ${companyId}:`, error.message);
        }
    }
}

export const thresholdEngine = new ThresholdMonitoringEngine();
