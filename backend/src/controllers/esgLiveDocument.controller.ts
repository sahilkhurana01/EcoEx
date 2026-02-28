/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Company } from '../models/Company';
import { Prediction } from '../models/Prediction';
import { WasteListing } from '../models/WasteListing';
import { Match } from '../models/Match';
import { Suggestion } from '../models/Suggestion';
import { logger } from '../utils/logger';
import Groq from 'groq-sdk';
import { env } from '../config/env';
import crypto from 'crypto';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ═══════════════════════════════════════════════════════════════
// SSE CLIENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════
const sseClients = new Map<string, Set<Response>>();

function notifyClients(companyId: string, data: any) {
    const clients = sseClients.get(companyId);
    if (!clients) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach((res) => {
        try { res.write(payload); } catch { /* client dropped */ }
    });
}

// ═══════════════════════════════════════════════════════════════
// FRAMEWORK MAPPING DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface FrameworkSection {
    code: string;
    name: string;
    status: 'complete' | 'partial' | 'missing';
    value: string | number | null;
    unit?: string;
    source?: string;
    confidence?: number;
    description?: string;
}

function buildGRISections(company: any, prediction: any, wasteMetrics: any): FrameworkSection[] {
    const elec = company.monthlyElectricity || [];
    const avgElec = elec.length > 0 ? elec.reduce((s: number, m: any) => s + (m.value || 0), 0) / elec.length : 0;
    const fc = company.fuelConsumption || {};
    const dieselTotal = (fc.diesel?.generators || 0) + (fc.diesel?.vehicles || 0) + (fc.diesel?.machinery || 0);
    const ce = prediction?.currentEmissions || {};

    return [
        { code: '302-1', name: 'Energy Consumption Within Organization', status: avgElec > 0 ? 'complete' : 'missing', value: avgElec > 0 ? Math.round(avgElec * 3.6) : null, unit: 'GJ/month', source: 'Electricity bills', confidence: avgElec > 0 ? 85 : 0, description: `Monthly electricity: ${Math.round(avgElec).toLocaleString()} kWh; Diesel: ${dieselTotal} L/month` },
        { code: '302-3', name: 'Energy Intensity', status: company.productionData?.monthlyProductionVolume ? 'complete' : 'partial', value: company.productionData?.monthlyProductionVolume ? +(avgElec / company.productionData.monthlyProductionVolume).toFixed(2) : null, unit: 'kWh/unit', source: 'Production records', confidence: 70 },
        { code: '302-4', name: 'Reduction of Energy Consumption', status: 'partial', value: company.renewablePercentage || 0, unit: '% renewable', source: 'Energy profile', confidence: 75 },
        { code: '305-1', name: 'Direct (Scope 1) GHG Emissions', status: ce.scope1 > 0 ? 'complete' : 'missing', value: ce.scope1 ? Math.round(ce.scope1) : null, unit: 'kg CO₂e/month', source: 'Fuel consumption data', confidence: prediction?.dataQuality?.fuelConfidence || 60 },
        { code: '305-2', name: 'Energy Indirect (Scope 2) GHG Emissions', status: ce.scope2 > 0 ? 'complete' : 'missing', value: ce.scope2 ? Math.round(ce.scope2) : null, unit: 'kg CO₂e/month', source: 'Grid electricity × CEA factor', confidence: prediction?.dataQuality?.electricityConfidence || 60 },
        { code: '305-3', name: 'Other Indirect (Scope 3) GHG Emissions', status: ce.scope3 > 0 ? 'complete' : 'partial', value: ce.scope3 ? Math.round(ce.scope3) : null, unit: 'kg CO₂e/month', source: 'Supply chain estimates', confidence: 50 },
        { code: '305-4', name: 'GHG Emissions Intensity', status: ce.totalCo2e && company.productionData?.monthlyProductionVolume ? 'complete' : 'partial', value: ce.totalCo2e && company.productionData?.monthlyProductionVolume ? +(ce.totalCo2e / company.productionData.monthlyProductionVolume).toFixed(2) : null, unit: 'kg CO₂e/unit', source: 'Calculated', confidence: 65 },
        { code: '306-1', name: 'Waste Generation', status: wasteMetrics.totalWasteKg > 0 ? 'complete' : 'missing', value: wasteMetrics.totalWasteKg > 0 ? Math.round(wasteMetrics.totalWasteKg) : null, unit: 'kg/month', source: 'Waste profile', confidence: prediction?.dataQuality?.wasteConfidence || 60 },
        { code: '306-2', name: 'Waste Diverted from Disposal', status: wasteMetrics.diversionRate > 0 ? 'complete' : 'missing', value: wasteMetrics.diversionRate > 0 ? Math.round(wasteMetrics.diversionRate) : null, unit: '%', source: 'Disposal methods', confidence: 70 },
        { code: '303-3', name: 'Water Withdrawal', status: company.waterUsage?.monthlyConsumptionKl ? 'complete' : 'missing', value: company.waterUsage?.monthlyConsumptionKl || null, unit: 'kiloliters/month', source: 'Water meter', confidence: 80 },
        { code: '303-5', name: 'Water Consumption', status: company.waterUsage?.recyclingPercentage != null ? 'complete' : 'missing', value: company.waterUsage?.recyclingPercentage ?? null, unit: '% recycled', source: 'Water treatment data', confidence: 70 },
    ];
}

function buildSASBSections(company: any, prediction: any): FrameworkSection[] {
    const ce = prediction?.currentEmissions || {};
    const elec = company.monthlyElectricity || [];
    const avgElec = elec.length > 0 ? elec.reduce((s: number, m: any) => s + (m.value || 0), 0) / elec.length : 0;

    return [
        { code: 'RT-EE-130a.1', name: 'Total Energy Consumed', status: avgElec > 0 ? 'complete' : 'missing', value: avgElec > 0 ? Math.round(avgElec * 3.6) : null, unit: 'GJ', source: 'Electricity records', confidence: 85 },
        { code: 'RT-EE-130a.2', name: 'Percentage Grid Electricity', status: 'complete', value: 100 - (company.renewablePercentage || 0), unit: '%', source: 'Energy profile', confidence: 90 },
        { code: 'RT-EE-130a.3', name: 'Percentage Renewable Energy', status: 'complete', value: company.renewablePercentage || 0, unit: '%', source: 'Energy mix data', confidence: 85 },
        { code: 'RT-EE-110a.1', name: 'Gross Global Scope 1 Emissions', status: ce.scope1 > 0 ? 'complete' : 'missing', value: ce.scope1 ? +(ce.scope1 / 1000).toFixed(2) : null, unit: 'tonnes CO₂e', source: 'Fuel combustion', confidence: 75 },
        { code: 'RT-EE-110a.2', name: 'Targets for Reducing GHG Emissions', status: company.compliance?.sustainabilityTargets ? 'complete' : 'missing', value: company.compliance?.sustainabilityTargets || null, unit: '', source: 'Company policy', confidence: 60 },
    ];
}

function buildTCFDSections(company: any, prediction: any): FrameworkSection[] {
    const ce = prediction?.currentEmissions || {};
    return [
        { code: 'GOV-A', name: 'Board Oversight of Climate Risks', status: company.compliance?.esgReporting ? 'partial' : 'missing', value: company.compliance?.esgReporting ? 'Active' : null, unit: '', source: 'Governance data', confidence: 50, description: 'Board-level oversight of climate-related risks and opportunities' },
        { code: 'STR-A', name: 'Climate Risks & Opportunities', status: prediction ? 'partial' : 'missing', value: prediction?.trendDirection || null, unit: '', source: 'ML-generated scenario analysis', confidence: 55, description: 'Impact of climate risks on business strategy' },
        { code: 'STR-B', name: 'Scenario Analysis', status: prediction?.forecasts?.length > 0 ? 'complete' : 'missing', value: prediction?.forecasts?.length > 0 ? `${prediction.forecasts.length} periods forecasted` : null, unit: '', source: 'EcoExchange Prediction Engine', confidence: 70 },
        { code: 'RM-A', name: 'Climate Risk Identification Process', status: 'partial', value: 'Automated monitoring via EcoExchange', unit: '', source: 'Platform data', confidence: 65 },
        { code: 'MET-A', name: 'GHG Emissions (Scope 1, 2, 3)', status: ce.totalCo2e > 0 ? 'complete' : 'missing', value: ce.totalCo2e ? Math.round(ce.totalCo2e) : null, unit: 'kg CO₂e/month', source: 'Real-time calculations', confidence: prediction?.dataQuality?.overallConfidence || 60 },
        { code: 'MET-B', name: 'Climate-Related Targets', status: company.compliance?.sustainabilityTargets ? 'complete' : 'missing', value: company.compliance?.sustainabilityTargets || null, unit: '', source: 'Company policy', confidence: 60 },
    ];
}

function buildBRSRSections(company: any, prediction: any, wasteMetrics: any): FrameworkSection[] {
    const ce = prediction?.currentEmissions || {};
    const elec = company.monthlyElectricity || [];
    const avgElec = elec.length > 0 ? elec.reduce((s: number, m: any) => s + (m.value || 0), 0) / elec.length : 0;

    return [
        { code: 'P6-E1', name: 'Total Energy Consumption (GJ)', status: avgElec > 0 ? 'complete' : 'missing', value: avgElec > 0 ? Math.round(avgElec * 3.6) : null, unit: 'GJ/month', source: 'Electricity + fuel data', confidence: 80 },
        { code: 'P6-E2', name: 'Energy Intensity per Unit of Output', status: company.productionData?.monthlyProductionVolume > 0 ? 'complete' : 'missing', value: company.productionData?.monthlyProductionVolume ? +(avgElec / company.productionData.monthlyProductionVolume).toFixed(2) : null, unit: 'kWh/unit', source: 'Production logs', confidence: 70 },
        { code: 'P6-W1', name: 'Total Water Withdrawal', status: company.waterUsage?.monthlyConsumptionKl ? 'complete' : 'missing', value: company.waterUsage?.monthlyConsumptionKl || null, unit: 'KL/month', source: 'Water meter', confidence: 80 },
        { code: 'P6-W2', name: 'Water Intensity per Unit', status: 'partial', value: company.waterUsage?.monthlyConsumptionKl && company.productionData?.monthlyProductionVolume ? +(company.waterUsage.monthlyConsumptionKl / company.productionData.monthlyProductionVolume).toFixed(3) : null, unit: 'KL/unit', source: 'Calculated', confidence: 65 },
        { code: 'P6-GHG1', name: 'Total Scope 1 & 2 GHG Emissions', status: ce.scope1 + ce.scope2 > 0 ? 'complete' : 'missing', value: (ce.scope1 || 0) + (ce.scope2 || 0) > 0 ? Math.round((ce.scope1 || 0) + (ce.scope2 || 0)) : null, unit: 'kg CO₂e/month', source: 'EcoExchange Engine', confidence: 75 },
        { code: 'P6-GHG2', name: 'GHG Emission Intensity', status: ce.totalCo2e && company.productionData?.monthlyProductionVolume ? 'complete' : 'missing', value: ce.totalCo2e && company.productionData?.monthlyProductionVolume ? +(ce.totalCo2e / company.productionData.monthlyProductionVolume).toFixed(2) : null, unit: 'kg CO₂e/unit', source: 'Calculated', confidence: 65 },
        { code: 'P6-WM1', name: 'Total Waste Generated', status: wasteMetrics.totalWasteKg > 0 ? 'complete' : 'missing', value: wasteMetrics.totalWasteKg > 0 ? Math.round(wasteMetrics.totalWasteKg) : null, unit: 'kg/month', source: 'Waste profile', confidence: 70 },
        { code: 'P6-WM2', name: 'Waste Recovery Rate', status: wasteMetrics.diversionRate > 0 ? 'complete' : 'partial', value: wasteMetrics.diversionRate > 0 ? Math.round(wasteMetrics.diversionRate) : null, unit: '%', source: 'Disposal methods', confidence: 70 },
    ];
}

// ═══════════════════════════════════════════════════════════════
// DATA AGGREGATION
// ═══════════════════════════════════════════════════════════════

async function aggregateCompanyData(companyId: string) {
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    const prediction = await Prediction.findOne({ companyId }).sort({ generatedAt: -1 });
    const listings = await WasteListing.find({ companyId });
    const matches = await Match.find({ $or: [{ sellerId: companyId }, { buyerId: companyId }] });
    const suggestions = await Suggestion.find({ companyId, status: { $ne: 'dismissed' } }).sort({ impactScore: -1 }).limit(6);

    // Calculate waste metrics
    const wasteStreams = company.wasteStreams || [];
    const totalWasteKg = wasteStreams.reduce((sum: number, w: any) => {
        const qty = w.quantityPerMonth || 0;
        return sum + (w.unit === 'ton' ? qty * 1000 : qty);
    }, 0);
    const divertedWaste = wasteStreams.filter((w: any) => w.disposalMethod && w.disposalMethod !== 'landfill');
    const diversionRate = totalWasteKg > 0
        ? (divertedWaste.reduce((s: number, w: any) => s + (w.unit === 'ton' ? (w.quantityPerMonth || 0) * 1000 : (w.quantityPerMonth || 0)), 0) / totalWasteKg) * 100
        : 0;
    const wasteMetrics = { totalWasteKg, diversionRate, streamCount: wasteStreams.length };

    // Build framework sections
    const gri = buildGRISections(company, prediction, wasteMetrics);
    const sasb = buildSASBSections(company, prediction);
    const tcfd = buildTCFDSections(company, prediction);
    const brsr = buildBRSRSections(company, prediction, wasteMetrics);

    // Compliance scores
    const calcScore = (sections: FrameworkSection[]) => {
        const complete = sections.filter(s => s.status === 'complete').length;
        const partial = sections.filter(s => s.status === 'partial').length;
        return Math.round(((complete + partial * 0.5) / sections.length) * 100);
    };

    const ce = prediction?.currentEmissions || {};

    // Version hash for audit trail
    const versionHash = crypto.createHash('sha256')
        .update(JSON.stringify({ ce, wasteMetrics, ts: new Date().toISOString() }))
        .digest('hex').substring(0, 16);

    return {
        company: {
            id: company._id.toString(),
            name: company.name,
            industry: company.industry,
            location: company.location,
            iso14001: company.compliance?.iso14001 || 'none',
            totalEmployees: company.totalEmployees || 0,
        },
        reportingPeriod: {
            start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString(),
            end: new Date().toISOString(),
        },
        lastUpdated: new Date().toISOString(),
        versionHash,
        emissions: {
            totalCo2e: Math.round(ce.totalCo2e || 0),
            scope1: Math.round(ce.scope1 || 0),
            scope2: Math.round(ce.scope2 || 0),
            scope3: Math.round(ce.scope3 || 0),
            breakdown: ce.breakdown || {},
            trendDirection: prediction?.trendDirection || 'stable',
            annualProjection: prediction?.annualProjection || null,
            forecasts: prediction?.forecasts || [],
        },
        wasteMetrics,
        water: {
            monthlyConsumptionKl: company.waterUsage?.monthlyConsumptionKl || 0,
            recyclingPercentage: company.waterUsage?.recyclingPercentage || 0,
        },
        energy: {
            avgMonthlyKwh: (() => {
                const elec = company.monthlyElectricity || [];
                return elec.length > 0 ? Math.round(elec.reduce((s: number, m: any) => s + (m.value || 0), 0) / elec.length) : 0;
            })(),
            renewablePercentage: company.renewablePercentage || 0,
        },
        frameworks: {
            GRI: { sections: gri, score: calcScore(gri) },
            SASB: { sections: sasb, score: calcScore(sasb) },
            TCFD: { sections: tcfd, score: calcScore(tcfd) },
            BRSR: { sections: brsr, score: calcScore(brsr) },
        },
        overallScore: Math.round((calcScore(gri) + calcScore(sasb) + calcScore(tcfd) + calcScore(brsr)) / 4),
        topSuggestions: suggestions.slice(0, 3).map((s: any) => ({
            title: s.title,
            category: s.category,
            impactScore: s.impactScore,
            annualSavings: s.annualSavings,
        })),
        circularEconomy: {
            activeListings: listings.length,
            completedExchanges: matches.filter((m: any) => m.status === 'confirmed' || m.status === 'completed').length,
            totalMatches: matches.length,
        },
        riskFlags: (() => {
            const flags: Array<{ level: 'red' | 'yellow' | 'green'; metric: string; message: string }> = [];
            if (prediction?.trendDirection === 'worsening') flags.push({ level: 'red', metric: 'Emissions', message: 'Carbon output is increasing month-over-month' });
            if (diversionRate < 30) flags.push({ level: 'yellow', metric: 'Waste', message: `Only ${Math.round(diversionRate)}% waste diverted from landfill` });
            if ((company.waterUsage?.recyclingPercentage || 0) < 20) flags.push({ level: 'yellow', metric: 'Water', message: 'Water recycling below 20%' });
            if ((company.renewablePercentage || 0) > 20) flags.push({ level: 'green', metric: 'Energy', message: `${company.renewablePercentage}% renewable energy achieved` });
            if (prediction?.trendDirection === 'improving') flags.push({ level: 'green', metric: 'Emissions', message: 'Carbon output is declining — on track' });
            return flags;
        })(),
    };
}

// ═══════════════════════════════════════════════════════════════
// AI NARRATIVE GENERATION
// ═══════════════════════════════════════════════════════════════

async function generateAINarrative(data: any): Promise<string> {
    try {
        const prompt = `You are a professional ESG report writer. Write a concise 4-5 sentence executive summary for ${data.company.name} (${data.company.industry} industry).

KEY FACTS:
- Total emissions: ${data.emissions.totalCo2e} kg CO₂e/month (Scope 1: ${data.emissions.scope1}, Scope 2: ${data.emissions.scope2}, Scope 3: ${data.emissions.scope3})
- Trend: ${data.emissions.trendDirection}
- Monthly electricity: ${data.energy.avgMonthlyKwh} kWh (${data.energy.renewablePercentage}% renewable)
- Waste: ${data.wasteMetrics.totalWasteKg} kg/month, ${Math.round(data.wasteMetrics.diversionRate)}% diverted from landfill
- Water: ${data.water.monthlyConsumptionKl} KL/month, ${data.water.recyclingPercentage}% recycled
- Active marketplace listings: ${data.circularEconomy.activeListings}
- Overall ESG compliance score: ${data.overallScore}%

Write in simple, professional business language. Use specific numbers. Highlight any concerns and wins. Do NOT use markdown headings, just plain paragraph text.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 500,
        });

        return completion.choices[0]?.message?.content || 'Executive summary generation in progress.';
    } catch (error: any) {
        logger.error('AI narrative generation failed:', error.message);
        return `${data.company.name} recorded ${data.emissions.totalCo2e.toLocaleString()} kg CO₂e total emissions this period. Scope 1 direct emissions stand at ${data.emissions.scope1.toLocaleString()} kg, while Scope 2 grid electricity emissions contribute ${data.emissions.scope2.toLocaleString()} kg. The overall ESG compliance readiness is ${data.overallScore}% across GRI, SASB, TCFD and BRSR frameworks.`;
    }
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

export class ESGLiveDocumentController {
    /**
     * GET /api/esg-live/:companyId
     * Full live document data snapshot
     */
    async getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await aggregateCompanyData(req.params.companyId);
            const narrative = await generateAINarrative(data);
            res.json({ success: true, data: { ...data, executiveSummary: narrative } });
        } catch (error: any) {
            if (error.message === 'Company not found') {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }
            next(error);
        }
    }

    /**
     * GET /api/esg-live/:companyId/stream
     * Server-Sent Events for real-time updates
     */
    async streamUpdates(req: Request, res: Response): Promise<void> {
        const companyId = req.params.companyId;

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        // Register client
        if (!sseClients.has(companyId)) sseClients.set(companyId, new Set());
        sseClients.get(companyId)!.add(res);

        // Send initial data
        try {
            const data = await aggregateCompanyData(companyId);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
            res.write(`data: ${JSON.stringify({ error: 'Failed to load initial data' })}\n\n`);
        }

        // Heartbeat every 30s
        const heartbeat = setInterval(() => {
            try { res.write(`:heartbeat\n\n`); } catch { clearInterval(heartbeat); }
        }, 30000);

        // Cleanup on disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.get(companyId)?.delete(res);
            if (sseClients.get(companyId)?.size === 0) sseClients.delete(companyId);
        });
    }

    /**
     * POST /api/esg-live/:companyId/refresh
     * Manually trigger a refresh + notify SSE clients
     */
    async refreshDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await aggregateCompanyData(req.params.companyId);
            const narrative = await generateAINarrative(data);
            const fullData = { ...data, executiveSummary: narrative };

            // Notify all connected SSE clients
            notifyClients(req.params.companyId, fullData);

            res.json({ success: true, data: fullData });
        } catch (error: any) {
            if (error.message === 'Company not found') {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }
            next(error);
        }
    }

    /**
     * GET /api/esg-live/:companyId/framework/:framework
     * Get sections for a specific framework
     */
    async getFramework(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await aggregateCompanyData(req.params.companyId);
            const fw = req.params.framework.toUpperCase() as 'GRI' | 'SASB' | 'TCFD' | 'BRSR';
            const frameworkData = (data.frameworks as any)[fw];
            if (!frameworkData) {
                res.status(400).json({ success: false, error: `Unknown framework: ${fw}` });
                return;
            }
            res.json({ success: true, data: frameworkData });
        } catch (error: any) {
            next(error);
        }
    }
}

export const esgLiveDocumentController = new ESGLiveDocumentController();

// Export the notifyClients function for use by other controllers
export { notifyClients as notifyESGClients };

export async function triggerESGLiveUpdate(companyId: string) {
    // Only process the expensive aggregation if a client is actively watching
    if (!sseClients.has(companyId)) return;
    try {
        const data = await aggregateCompanyData(companyId);
        const narrative = await generateAINarrative(data);
        notifyClients(companyId, { ...data, executiveSummary: narrative });
    } catch (err: any) {
        logger.error('Failed to trigger background ESG update', err.message);
    }
}
