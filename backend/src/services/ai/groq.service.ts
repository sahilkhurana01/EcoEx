import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export class GroqService {
    /**
     * Generate match explanations in <100ms
     */
    async explainMatch(
        wasteListing: any,
        needListing: any,
        matchScore: number,
        distance: number
    ): Promise<string> {
        try {
            const prompt = `
As an industrial sustainability expert, explain why this waste-to-resource match is valuable.

SELLER: ${wasteListing.companyName || 'Industrial Supplier'}
- Material: ${wasteListing.material?.category} (${wasteListing.material?.subType || 'general'})
- Quantity: ${wasteListing.quantity?.value} ${wasteListing.quantity?.unit}
- Quality: ${wasteListing.quality?.grade || 'standard'}, ${wasteListing.quality?.condition || 'mixed'}
- Price: ₹${wasteListing.pricing?.amount || 'negotiable'}/${wasteListing.quantity?.unit}

BUYER: ${needListing.companyName || 'Industrial Buyer'}
- Needs: ${needListing.requirements?.material?.category}
- Quantity: ${needListing.requirements?.quantity?.min}-${needListing.requirements?.quantity?.max} ${needListing.requirements?.quantity?.unit}
- Budget: Up to ₹${needListing.requirements?.budget?.maxPricePerUnit}

MATCH METRICS:
- Compatibility Score: ${matchScore}%
- Distance: ${distance}km
- Estimated Transport Cost: ₹${Math.round(distance * 35)}

Write a compelling, professional explanation (max 75 words) highlighting:
1. Material fit quality
2. Economic advantage
3. Environmental benefit
4. Logistics practicality

Tone: Executive summary. No fluff. Numbers matter.`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama3-8b-8192',
                temperature: 0.2,
                max_tokens: 150,
            });

            return completion.choices[0]?.message?.content || 'High compatibility match based on material fit and proximity.';
        } catch (error) {
            logger.error('Groq explainMatch error:', error);
            return 'High compatibility match identified based on material compatibility, price range, and logistics feasibility.';
        }
    }

    /**
     * Generate optimization recommendations
     */
    async generateRecommendations(companyData: any, impactData: any): Promise<Array<{
        priority: 'high' | 'medium' | 'low';
        category: 'energy' | 'waste' | 'logistics' | 'process';
        title: string;
        description: string;
        estimatedSavings: { co2: number; money: number };
        implementation: string;
    }>> {
        try {
            const prompt = `
Analyze this industrial facility and provide 3 specific, actionable optimization recommendations.

FACILITY: ${companyData.name}
INDUSTRY: ${companyData.industry}

CURRENT METRICS:
- Monthly Electricity: ${impactData?.inputs?.electricityKwh || 'N/A'} kWh
- Monthly CO2: ${impactData?.emissions?.totalCo2e || 'N/A'} kg
- Carbon Intensity: ${impactData?.efficiency?.carbonIntensity || 'N/A'} kg CO2/₹lakh revenue
- Waste Generated: ${impactData?.waste?.generated || 'N/A'} kg
- Waste Exchanged: ${impactData?.waste?.exchanged || 'N/A'} kg

Provide exactly 3 recommendations. Respond ONLY with a JSON object in this format:
{
  "recommendations": [
    {
      "priority": "high",
      "category": "energy",
      "title": "Brief action title",
      "description": "Specific what and why (50 words)",
      "estimatedSavings": { "co2": 1000, "money": 50000 },
      "implementation": "First step to take (20 words)"
    }
  ]
}

Prioritize by: ROI > Environmental impact > Ease of implementation`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'mixtral-8x7b-32768',
                temperature: 0.3,
                max_tokens: 800,
            });

            const content = completion.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(content);
            return parsed.recommendations || [];
        } catch (error) {
            logger.error('Groq generateRecommendations error:', error);
            return [
                {
                    priority: 'high',
                    category: 'energy',
                    title: 'Optimize peak hour energy consumption',
                    description: 'Shift high-energy operations to off-peak hours to reduce both costs and grid stress.',
                    estimatedSavings: { co2: 500, money: 25000 },
                    implementation: 'Audit current shift schedules and identify movable operations.',
                },
                {
                    priority: 'medium',
                    category: 'waste',
                    title: 'List unutilized waste on marketplace',
                    description: 'Convert waste disposal costs into revenue by listing materials on EcoExchange.',
                    estimatedSavings: { co2: 200, money: 15000 },
                    implementation: 'Categorize and photograph waste streams for listing.',
                },
                {
                    priority: 'low',
                    category: 'process',
                    title: 'Implement water recycling',
                    description: 'Install basic water treatment for reuse in non-critical processes.',
                    estimatedSavings: { co2: 100, money: 10000 },
                    implementation: 'Get a water audit done by a certified agency.',
                },
            ];
        }
    }

    /**
     * Chat assistant for platform
     */
    async chatAssistant(userQuery: string, context: any): Promise<string> {
        try {
            const prompt = `
You are EcoExchange AI Assistant, an expert in industrial sustainability and circular economy.

USER CONTEXT:
Company: ${context.companyName || 'Unknown'}
Industry: ${context.industry || 'Unknown'}
Recent Activity: ${context.recentActivity || 'N/A'}

USER QUESTION: ${userQuery}

Provide a helpful, specific answer. If asking about data, reference their actual metrics.
If asking about features, explain how to use the platform.
If asking about sustainability, provide actionable advice.

Keep under 100 words. Be professional but approachable.`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama3-8b-8192',
                temperature: 0.4,
                max_tokens: 200,
            });

            return completion.choices[0]?.message?.content || 'I apologize, I could not process that request. Please try again.';
        } catch (error) {
            logger.error('Groq chatAssistant error:', error);
            return 'I apologize, the AI assistant is temporarily unavailable. Please try again shortly.';
        }
    }

    /**
     * Generate dynamic ROI Report Email Content
     */
    async generateRoiReport(companyName: string, metrics: any): Promise<string> {
        try {
            const prompt = `
You are the EcoExchange AI Chief Financial Officer.
Write a 2-paragraph executive summary for ${companyName}'s Return on Sustainability Investment report.

METRICS:
- Total Capital Saved: ₹${(metrics.totalCapitalSaved || 0).toLocaleString()}
- Carbon Liabilities Removed: ${(metrics.totalCarbonLiabilitiesRemoved || 0).toLocaleString()} kg CO2
- Portfolio ROI: ${metrics.portfolioRoi || 0}%
- ESG Rating Index: ${metrics.esgRating || 70}/100

Format as HTML (just the paragraphs, no <html> or <body> tags, use <p> and <strong>). Tone should be highly professional, encouraging, and data-driven. Highlight their specific ROI and Savings.`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama3-8b-8192',
                temperature: 0.2,
                max_tokens: 300,
            });

            return completion.choices[0]?.message?.content || `<p>Your executive sustainability report has been generated successfully.</p>`;
        } catch (error) {
            logger.error('Groq generateRoiReport error:', error);
            return `<p>Your executive sustainability report has been generated successfully. Please view the dashboard for details.</p>`;
        }
    }
}

export const groqService = new GroqService();
