import { Request, Response, NextFunction } from 'express';
import { Company } from '../models/Company';
import { Prediction } from '../models/Prediction';
import { Suggestion } from '../models/Suggestion';
import { logger } from '../utils/logger';
import Groq from 'groq-sdk';
import { env } from '../config/env';
import { generatePrediction } from './prediction.controller';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ═══════════════════════════════════════════════════════════════
// AI SUGGESTION GENERATION
// ═══════════════════════════════════════════════════════════════

interface SuggestionInput {
    companyId: string;
    companyName: string;
    industry: string;
    currentEmissions: any;
    dataQuality: any;
    trendDirection: string;
    wasteStreams: any[];
    electricityKwh: number;
    fuelConsumption: any;
    waterUsage: any;
    renewablePercentage: number;
}

async function generateAISuggestions(input: SuggestionInput): Promise<any[]> {
    const prompt = `You are an industrial sustainability consultant for ${input.companyName}, a ${input.industry} company in India.

CURRENT EMISSIONS DATA:
- Total CO2e: ${input.currentEmissions.totalCo2e} kg/month
- Scope 1 (Direct fuel): ${input.currentEmissions.scope1} kg
- Scope 2 (Electricity): ${input.currentEmissions.scope2} kg
- Scope 3 (Supply chain): ${input.currentEmissions.scope3} kg
- Trend: ${input.trendDirection}
- Data confidence: ${input.dataQuality.overallConfidence}%

BREAKDOWN:
- Electricity: ${input.currentEmissions.breakdown?.electricity || 0} kg CO2
- Diesel: ${input.currentEmissions.breakdown?.diesel || 0} kg CO2
- Coal: ${input.currentEmissions.breakdown?.coal || 0} kg CO2
- Natural Gas: ${input.currentEmissions.breakdown?.naturalGas || 0} kg CO2
- Waste: ${input.currentEmissions.breakdown?.waste || 0} kg CO2

CONTEXT:
- Monthly electricity: ${input.electricityKwh} kWh
- Renewable energy: ${input.renewablePercentage}%
- Waste streams: ${JSON.stringify(input.wasteStreams?.slice(0, 5) || [])}
- Water usage: ${JSON.stringify(input.waterUsage || {})}

Generate exactly 6 actionable sustainability recommendations as a JSON array. Each must have:
{
  "category": one of ["energy_efficiency", "fuel_switching", "waste_valorization", "process_optimization", "water_efficiency"],
  "title": "Short title (max 60 chars)",
  "description": "2-3 sentence explanation with specific numbers",
  "implementationSteps": ["Step 1", "Step 2", "Step 3"],
  "complexity": "low" | "medium" | "high",
  "investmentInr": number or null,
  "annualSavingsCo2Kg": number,
  "annualSavingsInr": number,
  "paybackMonths": number or null,
  "impactScore": 0-100
}

Prioritize by impact. Be specific to the ${input.industry} industry. Use realistic Indian market costs.
Return ONLY the JSON array, no markdown, no explanation.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 3000,
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content || '{}';
        let parsed: any;

        try {
            parsed = JSON.parse(content);
        } catch {
            // Try to extract JSON array from response
            const arrayMatch = content.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                parsed = { suggestions: JSON.parse(arrayMatch[0]) };
            } else {
                throw new Error('Failed to parse AI response');
            }
        }

        const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || parsed.recommendations || []);

        return suggestions.map((s: any, idx: number) => ({
            category: s.category || 'energy_efficiency',
            title: s.title || `Suggestion ${idx + 1}`,
            description: s.description || '',
            implementationSteps: s.implementationSteps || s.steps || [],
            complexity: s.complexity || 'medium',
            investmentInr: s.investmentInr ?? s.investment ?? null,
            annualSavings: {
                co2Kg: s.annualSavingsCo2Kg || s.co2Savings || 0,
                inr: s.annualSavingsInr || s.costSavings || 0,
            },
            paybackMonths: s.paybackMonths ?? s.payback ?? null,
            impactScore: s.impactScore || 50,
            priorityRank: idx + 1,
            source: 'groq' as const,
            metadata: {
                model: 'llama-3.3-70b-versatile',
                generatedAt: new Date(),
            },
        }));
    } catch (error: any) {
        logger.error('Groq AI suggestion generation failed:', error.message);

        // Fallback: rules-based suggestions
        return generateRuleBasedSuggestions(input);
    }
}

// ═══════════════════════════════════════════════════════════════
// RULES-BASED FALLBACK SUGGESTIONS
// ═══════════════════════════════════════════════════════════════
function generateRuleBasedSuggestions(input: SuggestionInput): any[] {
    const suggestions: any[] = [];

    // High electricity → solar recommendation
    if (input.electricityKwh > 10000) {
        const solarCapacityKw = Math.round(input.electricityKwh * 0.3 / 120); // 30% offset
        suggestions.push({
            category: 'energy_efficiency',
            title: `Install ${solarCapacityKw} kW Rooftop Solar System`,
            description: `Your monthly electricity consumption of ${input.electricityKwh.toLocaleString()} kWh can be reduced by 30% with a rooftop solar installation. At current grid rates (₹8-10/kWh), this provides significant cost savings.`,
            implementationSteps: [
                'Conduct rooftop structural assessment',
                'Get quotes from MNRE-empaneled vendors',
                'Apply for state subsidy (30-40% for industrial)',
                'Install and commission within 45-60 days',
            ],
            complexity: 'medium',
            investmentInr: solarCapacityKw * 45000,
            annualSavings: {
                co2Kg: Math.round(input.electricityKwh * 0.3 * 12 * 0.71),
                inr: Math.round(input.electricityKwh * 0.3 * 12 * 8.5),
            },
            paybackMonths: 36,
            impactScore: 85,
            priorityRank: 1,
            source: 'rules_engine',
        });
    }

    // Low power factor
    if (input.electricityKwh > 5000) {
        suggestions.push({
            category: 'energy_efficiency',
            title: 'Power Factor Correction using APFC Panel',
            description: `Installing an Automatic Power Factor Correction panel can reduce MD penalties and improve energy efficiency by 5-8%. Most Indian utilities penalize for PF below 0.9.`,
            implementationSteps: [
                'Audit current power factor from utility bills',
                'Size APFC panel based on reactive power demand',
                'Install capacitor bank with automatic switching',
                'Monitor and maintain quarterly',
            ],
            complexity: 'low',
            investmentInr: 150000,
            annualSavings: { co2Kg: Math.round(input.electricityKwh * 0.05 * 12 * 0.71), inr: Math.round(input.electricityKwh * 0.05 * 12 * 8) },
            paybackMonths: 12,
            impactScore: 65,
            priorityRank: 2,
            source: 'rules_engine',
        });
    }

    // Diesel usage → natural gas switch
    const dieselUsage = (input.fuelConsumption?.diesel?.generators || 0) +
        (input.fuelConsumption?.diesel?.vehicles || 0) +
        (input.fuelConsumption?.diesel?.machinery || 0);
    if (dieselUsage > 500) {
        suggestions.push({
            category: 'fuel_switching',
            title: 'Switch DG Sets from Diesel to Natural Gas',
            description: `Converting ${dieselUsage.toLocaleString()} L/month diesel consumption to natural gas can reduce emissions by ~25% and fuel costs by 30-40%.`,
            implementationSteps: [
                'Check PNG pipeline availability in your area',
                'Get dual-fuel conversion kit quotes',
                'Apply for industrial gas connection',
                'Phase out diesel generators over 6 months',
            ],
            complexity: 'high',
            investmentInr: 500000,
            annualSavings: { co2Kg: Math.round(dieselUsage * 12 * 0.67), inr: Math.round(dieselUsage * 12 * 25) },
            paybackMonths: 18,
            impactScore: 78,
            priorityRank: 3,
            source: 'rules_engine',
        });
    }

    // LED retrofit
    suggestions.push({
        category: 'energy_efficiency',
        title: 'LED Lighting Retrofit Across Facility',
        description: `Replace conventional lighting with LED fixtures. Industrial facilities typically save 40-60% on lighting energy, which accounts for 15-20% of total electricity.`,
        implementationSteps: [
            'Conduct lighting audit (lux levels, fixture count)',
            'Procure BEE 5-star rated LED fixtures',
            'Phase-wise replacement starting with high-use areas',
            'Install occupancy sensors in low-traffic zones',
        ],
        complexity: 'low',
        investmentInr: Math.round((input.electricityKwh / 100) * 500),
        annualSavings: { co2Kg: Math.round(input.electricityKwh * 0.1 * 12 * 0.71), inr: Math.round(input.electricityKwh * 0.1 * 12 * 8) },
        paybackMonths: 8,
        impactScore: 60,
        priorityRank: 4,
        source: 'rules_engine',
    });

    // Waste valorization
    if (input.wasteStreams && input.wasteStreams.length > 0) {
        const landfilledWaste = input.wasteStreams.filter((w: any) =>
            (w.disposalMethod === 'landfill' || w.currentDisposal === 'landfill')
        );
        if (landfilledWaste.length > 0) {
            suggestions.push({
                category: 'waste_valorization',
                title: 'Divert Waste from Landfill to Recycling/Exchange',
                description: `You have ${landfilledWaste.length} waste stream(s) going to landfill. Listing them on EcoExchange marketplace can generate revenue while reducing methane emissions.`,
                implementationSteps: [
                    'Segregate waste at source by material type',
                    'List available quantities on EcoExchange marketplace',
                    'Accept matched buyers within 100km radius',
                    'Track impact through digital product passports',
                ],
                complexity: 'low',
                investmentInr: null,
                annualSavings: { co2Kg: 5000, inr: 100000 },
                paybackMonths: null,
                impactScore: 70,
                priorityRank: 5,
                source: 'rules_engine',
            });
        }
    }

    // Water efficiency
    if (input.waterUsage && input.waterUsage.recyclingPercentage < 50) {
        suggestions.push({
            category: 'water_efficiency',
            title: 'Implement Wastewater Recycling System',
            description: `Current recycling rate is ${input.waterUsage.recyclingPercentage || 0}%. Installing an ETP/STP with tertiary treatment can recycle 60-80% of process water, reducing freshwater intake and discharge costs.`,
            implementationSteps: [
                'Conduct water audit and characterize effluent',
                'Design ETP/STP based on BOD/COD levels',
                'Install filtration + RO for process water reuse',
                'Target 70% recycling within 12 months',
            ],
            complexity: 'high',
            investmentInr: 800000,
            annualSavings: { co2Kg: 2000, inr: 200000 },
            paybackMonths: 48,
            impactScore: 55,
            priorityRank: 6,
            source: 'rules_engine',
        });
    }

    return suggestions;
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTION CONTROLLER
// ═══════════════════════════════════════════════════════════════
export class SuggestionController {
    /**
     * POST /api/suggestions/:companyId/generate
     * Generate AI suggestions based on latest prediction
     */
    async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const company = await Company.findById(req.params.companyId);
            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            // Get latest prediction
            let prediction = await Prediction.findOne({
                companyId: req.params.companyId,
            }).sort({ generatedAt: -1 });

            if (!prediction) {
                logger.info(`No prediction found for company ${req.params.companyId}. Auto-generating...`);
                const predictionData = await generatePrediction(company);
                prediction = await Prediction.create(predictionData);
            }

            const fc = company.fuelConsumption || {};
            const monthlyElec = company.monthlyElectricity;
            const avgElectricity = monthlyElec && monthlyElec.length > 0
                ? monthlyElec.reduce((sum: number, m: any) => sum + (m.value || 0), 0) / monthlyElec.length
                : company.baselineMetrics?.monthlyElectricityKwh || 0;

            const suggestionInput: SuggestionInput = {
                companyId: company._id.toString(),
                companyName: company.name,
                industry: company.industry,
                currentEmissions: prediction.currentEmissions,
                dataQuality: prediction.dataQuality,
                trendDirection: prediction.trendDirection || 'stable',
                wasteStreams: company.wasteStreams || company.baselineMetrics?.wasteStreams || [],
                electricityKwh: avgElectricity,
                fuelConsumption: fc,
                waterUsage: company.waterUsage || {},
                renewablePercentage: company.renewablePercentage || company.energyContext?.renewablePercentage || 0,
            };

            const aiSuggestions = await generateAISuggestions(suggestionInput);

            // Clear old suggestions for this company
            await Suggestion.deleteMany({ companyId: req.params.companyId, status: 'new' });

            // Save new ones
            const saved = await Suggestion.insertMany(
                aiSuggestions.map((s) => ({
                    ...s,
                    companyId: req.params.companyId,
                    predictionId: prediction!._id.toString(),
                    status: 'new',
                }))
            );

            logger.info(`Generated ${saved.length} suggestions for company ${company.name}`);

            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/suggestions/:companyId
     * Get suggestions for a company
     */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category, status, sort = 'priorityRank' } = req.query;
            const filter: any = { companyId: req.params.companyId };
            if (category) filter.category = category;
            if (status) filter.status = status;

            const suggestions = await Suggestion.find(filter)
                .sort(sort === 'impact' ? { impactScore: -1 } : { priorityRank: 1 })
                .limit(20);

            res.json({ success: true, data: suggestions });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/suggestions/:id/status
     * Update suggestion status
     */
    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { status } = req.body;
            if (!['new', 'saved', 'in_progress', 'done', 'dismissed'].includes(status)) {
                res.status(400).json({ success: false, error: 'Invalid status' });
                return;
            }

            const suggestion = await Suggestion.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true }
            );

            if (!suggestion) {
                res.status(404).json({ success: false, error: 'Suggestion not found' });
                return;
            }

            res.json({ success: true, data: suggestion });
        } catch (error) {
            next(error);
        }
    }
}

export const suggestionController = new SuggestionController();
