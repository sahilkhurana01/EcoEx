import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import {
    RECYCLING_SAVINGS,
    WATER_SAVINGS_PER_KG,
    ENERGY_SAVINGS_PER_KG,
    LANDFILL_VOLUME_PER_KG,
    TRANSPORT_EMISSION_FACTORS,
} from '../../utils/constants';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export class GeminiService {
    private model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    /**
     * Calculate environmental impact with scientific precision
     */
    async calculateImpact(
        wasteType: string,
        quantity: number,
        unit: string,
        transportDistance: number,
        disposalMethod: string
    ): Promise<{
        co2Saved: number;
        waterSaved: number;
        energySaved: number;
        landfillAvoided: number;
        methodology: string;
        confidence: number;
    }> {
        try {
            const prompt = `
Calculate the environmental impact of diverting ${quantity} ${unit} of ${wasteType} 
from ${disposalMethod} to recycling/reuse, with ${transportDistance}km transport by truck.

Use standard EPA/IPCC emission factors for India context.

Return ONLY this JSON structure (no markdown, no explanation):
{
  "co2Saved": <number in kg CO2e>,
  "waterSaved": <number in liters>,
  "energySaved": <number in kWh>,
  "landfillAvoided": <number in cubic meters>,
  "methodology": "string citing specific emission factors used",
  "confidence": <number 0-100>
}

Include transport emissions in calculation (subtract from savings).
Be precise. Use 2024 emission factors.`;

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                },
            });

            const response = result.response;
            const text = response.text();
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON in response');
        } catch (error) {
            logger.warn('Gemini calculateImpact fallback to local calculation:', error);
            // Fallback: use local emission constants
            return this.localImpactCalculation(wasteType, quantity, unit, transportDistance);
        }
    }

    /**
     * Local deterministic fallback for impact calculation
     */
    private localImpactCalculation(
        wasteType: string,
        quantity: number,
        unit: string,
        transportDistance: number
    ) {
        const kg = unit === 'ton' ? quantity * 1000 : unit === 'cubic_meter' ? quantity * 500 : quantity;
        const type = wasteType as keyof typeof RECYCLING_SAVINGS;

        const co2Savings = (RECYCLING_SAVINGS[type] || 1.0) * kg;
        const transportEmissions = transportDistance * (kg / 1000) * TRANSPORT_EMISSION_FACTORS.truck;
        const co2Saved = Math.round((co2Savings - transportEmissions) * 100) / 100;
        const waterSaved = Math.round((WATER_SAVINGS_PER_KG[type] || 10) * kg);
        const energySaved = Math.round((ENERGY_SAVINGS_PER_KG[type] || 1.5) * kg * 100) / 100;
        const landfillAvoided = Math.round((LANDFILL_VOLUME_PER_KG[type] || 0.001) * kg * 1000) / 1000;

        return {
            co2Saved,
            waterSaved,
            energySaved,
            landfillAvoided,
            methodology: 'EPA WARM Model + IPCC India Grid Factors (local calculation fallback)',
            confidence: 75,
        };
    }

    /**
     * Predict future emissions based on historical data
     */
    async predictEmissions(
        historicalData: any[],
        companyInfo: any
    ): Promise<{
        predictions: Array<{
            month: string;
            predictedCo2: number;
            confidenceInterval: [number, number];
            keyDrivers: string[];
        }>;
        riskAlerts: string[];
        optimizationOpportunities: string[];
    }> {
        try {
            const prompt = `
Analyze industrial emission data and predict next 3 months.

COMPANY: ${companyInfo.name} (${companyInfo.industry})

HISTORICAL DATA (last 6 months):
${JSON.stringify(historicalData.slice(-6), null, 2)}

Provide predictions in this JSON format (no markdown):
{
  "predictions": [
    {
      "month": "2024-07",
      "predictedCo2": 5000,
      "confidenceInterval": [4500, 5500],
      "keyDrivers": ["seasonal demand increase"]
    }
  ],
  "riskAlerts": ["Alert about high-emission periods"],
  "optimizationOpportunities": ["Specific optimization suggestion"]
}`;

            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON in response');
        } catch (error) {
            logger.warn('Gemini predictEmissions fallback:', error);
            return {
                predictions: [],
                riskAlerts: ['Unable to generate predictions. More historical data needed.'],
                optimizationOpportunities: ['Submit at least 3 months of data for accurate predictions.'],
            };
        }
    }

    /**
     * Generate ESG report content
     */
    async generateESGReport(
        companyData: any,
        impactData: any[],
        period: string
    ): Promise<{
        executiveSummary: string;
        keyAchievements: string[];
        improvementAreas: string[];
        complianceStatus: Record<string, boolean>;
    }> {
        try {
            const prompt = `
Generate ESG report content for ${companyData.name} for ${period}.

INDUSTRY: ${companyData.industry}
PERFORMANCE DATA:
${JSON.stringify(impactData.slice(-12), null, 2)}

Provide in this JSON format (no markdown):
{
  "executiveSummary": "150 word executive summary with metrics",
  "keyAchievements": ["Achievement 1 with numbers", "Achievement 2", "Achievement 3"],
  "improvementAreas": ["Area 1 with specific suggestion", "Area 2"],
  "complianceStatus": { "GRI": true, "SASB": true, "TCFD": false, "BRSR": true }
}

Tone: Professional, suitable for investor presentation.`;

            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON in response');
        } catch (error) {
            logger.warn('Gemini generateESGReport fallback:', error);
            return {
                executiveSummary: `${companyData.name} has demonstrated commitment to sustainability during ${period}. Detailed metrics are available in the analytics dashboard.`,
                keyAchievements: ['Active participation in circular economy marketplace', 'Regular emissions monitoring and reporting'],
                improvementAreas: ['Expand waste exchange partnerships', 'Implement renewable energy solutions'],
                complianceStatus: { GRI: false, SASB: false, TCFD: false, BRSR: false },
            };
        }
    }
}

export const geminiService = new GeminiService();
