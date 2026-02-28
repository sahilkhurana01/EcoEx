import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// ─── Simulation Scenario Definitions (synthetic but realistic) ──
export const SIMULATION_SCENARIOS: Record<string, {
    category: string;
    metric: string;
    unit: string;
    baseline: number;
    currentMultiplier: number;
    thresholdMultiplier: number;
    title: string;
    description: string;
}> = {
    carbon_spike: {
        category: 'carbon',
        metric: 'Monthly CO₂ Emissions',
        unit: 'kg CO₂e',
        baseline: 12500,
        currentMultiplier: 1.40,
        thresholdMultiplier: 1.10,
        title: 'Carbon Emission Spike Detected',
        description: 'Monthly emissions have exceeded 140% of your established baseline, significantly above the 110% threshold.',
    },
    energy_overuse: {
        category: 'energy',
        metric: 'Electricity Consumption',
        unit: 'kWh',
        baseline: 45000,
        currentMultiplier: 1.25,
        thresholdMultiplier: 1.20,
        title: 'Energy Consumption Exceeds Prediction',
        description: 'Current electricity usage is 25% above predicted levels for current production volume.',
    },
    waste_overflow: {
        category: 'waste',
        metric: 'Waste Storage Utilization',
        unit: '%',
        baseline: 100, // represents capacity
        currentMultiplier: 0.85,
        thresholdMultiplier: 0.80,
        title: 'Waste Storage Approaching Capacity',
        description: 'Your waste storage is at 85% capacity with no exchange matches processed in 5 days.',
    },
    cost_anomaly: {
        category: 'cost',
        metric: 'Monthly Energy Bill',
        unit: '₹',
        baseline: 280000,
        currentMultiplier: 1.50,
        thresholdMultiplier: 1.30,
        title: 'Energy Cost Anomaly Detected',
        description: 'Your energy bill is 150% of forecast, well above the 130% alert threshold.',
    },
    missed_opportunity: {
        category: 'waste',
        metric: 'Untapped Circular Savings',
        unit: '₹/month',
        baseline: 0,
        currentMultiplier: 1,
        thresholdMultiplier: 1,
        title: 'Significant Savings Opportunity Untapped',
        description: 'Analysis shows ₹1,00,000+ monthly savings available through waste exchange that remain uncaptured.',
    },
    compliance_risk: {
        category: 'compliance',
        metric: 'ESG Reporting Deadline',
        unit: 'days remaining',
        baseline: 15,
        currentMultiplier: 1,
        thresholdMultiplier: 1,
        title: 'Compliance Deadline Approaching',
        description: 'ESG reporting deadline is 15 days away with 40% of required data still incomplete.',
    },
};

interface AlertEmailData {
    alertType: string;
    severity: 'critical' | 'high' | 'medium';
    companyName: string;
    industry: string;
    location: string;
    metric: string;
    currentValue: string;
    threshold: string;
    percentageExceeded: number;
    thirtyDayAvg: string;
    lastMonthValue: string;
    trend: string;
    recommendations: string[];
    industryPercentile: number;
    peerCount: number;
    adminName: string;
    aiTone: 'urgent' | 'balanced' | 'gentle';
    isSimulation: boolean;
    simulatedBy?: string;
    description?: string;
}

export class AIEmailGeneratorService {

    /**
     * Generate alert email content using Groq (fast, <500ms target)
     */
    async generateAlertEmail(data: AlertEmailData): Promise<{
        subject: string;
        previewText: string;
        htmlBody: string;
        generatedBy: 'groq' | 'gemini';
        generationTimeMs: number;
    }> {
        const start = Date.now();

        try {
            const result = await this.generateWithGroq(data);
            const elapsed = Date.now() - start;
            return { ...result, generatedBy: 'groq', generationTimeMs: elapsed };
        } catch (groqError) {
            logger.warn('Groq failed for alert email, falling back to Gemini:', groqError);
            try {
                const result = await this.generateWithGemini(data);
                const elapsed = Date.now() - start;
                return { ...result, generatedBy: 'gemini', generationTimeMs: elapsed };
            } catch (geminiError) {
                logger.error('Both AI providers failed for alert email:', geminiError);
                const elapsed = Date.now() - start;
                return {
                    ...this.generateFallbackEmail(data),
                    generatedBy: 'groq',
                    generationTimeMs: elapsed,
                };
            }
        }
    }

    private buildPrompt(data: AlertEmailData): string {
        const toneGuide = {
            urgent: 'Executive briefing tone. Firm, direct, action-required. Use strong verbs.',
            balanced: 'Professional and solution-oriented. Data-driven but approachable.',
            gentle: 'Supportive and informative. Encourage action without pressure.',
        };

        return `You are EcoExchange AI Alert System. Generate a professional alert email.

ALERT TYPE: ${data.alertType}
SEVERITY: ${data.severity.toUpperCase()}
COMPANY: ${data.companyName}, ${data.industry}, ${data.location || 'India'}

CURRENT SITUATION:
- Metric: ${data.metric}
- Current Value: ${data.currentValue}
- Threshold: ${data.threshold}
- Exceeded By: ${data.percentageExceeded}%
- Detected At: ${new Date().toISOString()}

HISTORICAL CONTEXT:
- 30-day average: ${data.thirtyDayAvg}
- Same period last month: ${data.lastMonthValue}
- Trend: ${data.trend}

ACTIVE RECOMMENDATIONS:
${data.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

PEER COMPARISON:
- You are at the ${data.industryPercentile}th percentile in your industry
- ${data.peerCount} similar companies have better metrics

${data.isSimulation ? 'NOTE: This is a SIMULATION alert for demonstration purposes.' : ''}

TONE: ${toneGuide[data.aiTone]}

Generate a JSON response with these fields:
{
  "subject": "Alert subject line — urgent but not alarmist, include metric and action keyword",
  "previewText": "One-line summary for mobile notification (max 80 chars)",
  "greeting": "Personalized greeting to ${data.adminName || 'Team'}",
  "situation": "What happened and why it matters (2-3 sentences)",
  "impact": "If this continues, projected cost and environmental impact over 30 days (2 sentences)",
  "immediateAction": "One specific step to take right now with expected result",
  "longTermFix": "Reference a strategic improvement they should implement",
  "closing": "Professional sign-off"
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no code fences. Keep each field concise.
Length: 150-200 words total across all fields.`;
    }

    private async generateWithGroq(data: AlertEmailData): Promise<{
        subject: string;
        previewText: string;
        htmlBody: string;
    }> {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: this.buildPrompt(data) }],
            model: 'llama3-8b-8192',
            temperature: 0.3,
            max_tokens: 600,
        });

        const raw = completion.choices[0]?.message?.content || '';
        return this.parseAndRenderEmail(raw, data);
    }

    private async generateWithGemini(data: AlertEmailData): Promise<{
        subject: string;
        previewText: string;
        htmlBody: string;
    }> {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(this.buildPrompt(data));
        const raw = result.response.text();
        return this.parseAndRenderEmail(raw, data);
    }

    private parseAndRenderEmail(raw: string, data: AlertEmailData): {
        subject: string;
        previewText: string;
        htmlBody: string;
    } {
        let parsed: any;
        try {
            // Strip code fences if present
            const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            logger.warn('Failed to parse AI response as JSON, using fallback');
            return this.generateFallbackEmail(data);
        }

        const severityColors: Record<string, string> = {
            critical: '#ef4444',
            high: '#f97316',
            medium: '#eab308',
        };

        const categoryIcons: Record<string, string> = {
            carbon: '🌫️',
            energy: '⚡',
            waste: '♻️',
            cost: '💰',
            compliance: '📋',
        };

        const color = severityColors[data.severity] || '#eab308';
        const icon = categoryIcons[data.alertType.split('_')[0]] || '🔔';
        const simBanner = data.isSimulation
            ? `<div style="background: #1e40af; color: white; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; letter-spacing: 1px;">
                 🧪 SIMULATION — Triggered by ${data.simulatedBy || 'User'} at ${new Date().toLocaleTimeString('en-IN')}
               </div>`
            : '';

        const htmlBody = `
<div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden; border: 1px solid #262626;">
  ${simBanner}
  <div style="background: linear-gradient(135deg, ${color}dd, ${color}88); padding: 28px 32px; text-align: center;">
    <div style="font-size: 36px; margin-bottom: 8px;">${icon}</div>
    <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">${parsed.subject || data.alertType}</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">${parsed.previewText || ''}</p>
    <div style="display: inline-block; margin-top: 12px; background: rgba(0,0,0,0.25); padding: 4px 14px; border-radius: 20px; font-size: 11px; color: white; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
      ${data.severity} severity
    </div>
  </div>

  <div style="padding: 28px 32px;">
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">${parsed.greeting || `Hi ${data.adminName || 'Team'},`}</p>

    <div style="background: #171717; border-left: 3px solid ${color}; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <h3 style="color: ${color}; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">⚠ Situation</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #d4d4d4;">${parsed.situation || data.description || ''}</p>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
      <div style="flex: 1; background: #171717; border-radius: 8px; padding: 14px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Current</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: ${color};">${data.currentValue}</p>
      </div>
      <div style="flex: 1; background: #171717; border-radius: 8px; padding: 14px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Threshold</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #10b981;">${data.threshold}</p>
      </div>
      <div style="flex: 1; background: #171717; border-radius: 8px; padding: 14px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Exceeded</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: ${color};">+${data.percentageExceeded}%</p>
      </div>
    </div>

    ${parsed.impact ? `
    <div style="background: #171717; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <h3 style="color: #f59e0b; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">📊 Impact Projection</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #d4d4d4;">${parsed.impact}</p>
    </div>` : ''}

    <div style="background: #0a2e1c; border: 1px solid #166534; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <h3 style="color: #4ade80; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">⚡ Immediate Action</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #bbf7d0;">${parsed.immediateAction || 'Review the affected metrics on your dashboard and take corrective measures.'}</p>
    </div>

    ${parsed.longTermFix ? `
    <div style="background: #171717; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <h3 style="color: #60a5fa; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">🔧 Long-term Recommendation</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #d4d4d4;">${parsed.longTermFix}</p>
    </div>` : ''}

    <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/alerts" style="display: block; background: linear-gradient(135deg, #059669, #0284c7); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px; font-size: 14px;">
      View Alert Dashboard →
    </a>

    <p style="margin: 24px 0 0; font-size: 13px; color: #737373; line-height: 1.5;">${parsed.closing || 'Stay proactive with EcoExchange AI.'}</p>
  </div>

  <div style="background: #0a0a0a; border-top: 1px solid #262626; padding: 16px 32px; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #525252;">
      EcoExchange AI — Industrial Sustainability Intelligence
      ${data.isSimulation ? '<br>🧪 This was a simulation alert for demonstration purposes.' : ''}
    </p>
  </div>
</div>`;

        return {
            subject: data.isSimulation
                ? `[SIMULATION] ${parsed.subject || data.alertType}`
                : parsed.subject || `Alert: ${data.metric}`,
            previewText: parsed.previewText || '',
            htmlBody,
        };
    }

    private generateFallbackEmail(data: AlertEmailData): {
        subject: string;
        previewText: string;
        htmlBody: string;
    } {
        // Build a good email even without AI
        const fallbackData = {
            subject: `${data.severity === 'critical' ? '🚨' : '⚠️'} ${data.metric} Alert — Action Required`,
            previewText: `${data.metric} at ${data.currentValue} exceeds threshold of ${data.threshold}`,
            situation: `Your ${data.metric.toLowerCase()} has reached ${data.currentValue}, which is ${data.percentageExceeded}% above the threshold of ${data.threshold}. This requires your attention.`,
            impact: `If this trend continues, projected costs could increase significantly over the next 30 days.`,
            immediateAction: 'Review the affected metrics on your EcoExchange dashboard and identify the primary contributing factors.',
            longTermFix: 'Consider implementing the recommendations provided on your dashboard to prevent future threshold breaches.',
            greeting: `Hi ${data.adminName || 'Team'},`,
            closing: 'Stay proactive — EcoExchange AI',
        };

        return this.parseAndRenderEmail(JSON.stringify(fallbackData), data);
    }
}

export const aiEmailGeneratorService = new AIEmailGeneratorService();
