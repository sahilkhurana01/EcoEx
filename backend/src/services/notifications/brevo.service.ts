import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { EmailLog } from '../../models/EmailLog';

// ═══════════════════════════════════════════════════════════════
// BREVO EMAIL SERVICE — HTTP API (works on Render, no SMTP needed)
// ═══════════════════════════════════════════════════════════════

export class BrevoService {
  private apiKey: string | null;
  private senderEmail: string;
  private senderName: string = 'EcoExchange';
  private apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor() {
    this.senderEmail = env.BREVO_SENDER_EMAIL || 'noreply@ecoexchange.ai';
    this.apiKey = env.BREVO_API_KEY || null;

    if (this.apiKey) {
      if (this.apiKey.startsWith('xsmtpsib-')) {
        logger.warn('⚠️ BREVO_API_KEY looks like an SMTP key (xsmtpsib-...). The HTTP API needs a v3 API key (xkeysib-...). Get it from: Brevo Dashboard → Settings → SMTP & API → API Keys');
      }
      // Verify API key on startup with a lightweight call
      this.verifyApiKey();
    } else {
      logger.warn('⚠️ Brevo API key NOT configured. Emails will be skipped. Set BREVO_API_KEY in environment variables.');
    }
  }

  private async verifyApiKey(): Promise<void> {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'api-key': this.apiKey!,
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const account: any = await res.json();
        logger.info(`✅ Brevo HTTP API Ready — Account: ${account.email || 'verified'}, Plan: ${account.plan?.[0]?.type || 'active'}`);
      } else if (res.status === 401) {
        logger.error('❌ Brevo API key is INVALID or UNAUTHORIZED. Make sure you\'re using a v3 API key (starts with xkeysib-), not an SMTP key (xsmtpsib-). Get it from: Brevo Dashboard → Settings → SMTP & API → API Keys');
      } else {
        const errBody = await res.text();
        logger.error(`❌ Brevo API key verification failed (HTTP ${res.status}): ${errBody}`);
      }
    } catch (error: any) {
      logger.error(`❌ Brevo API connectivity check failed: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC EMAIL METHODS
  // ═══════════════════════════════════════════════════════════════

  async sendMatchNotification(buyerEmail: string, matchData: any): Promise<void> {
    try {
      await this.sendEmail({
        to: [{ email: buyerEmail }],
        subject: `🔄 New Match Found — ${matchData.material} (${matchData.score}% compatibility)`,
        htmlContent: this.matchNotificationTemplate(matchData),
      });
      await this.logEmail(matchData.matchId, 'match_notification', buyerEmail);
    } catch (error: any) {
      logger.error('Failed to send match notification:', {
        message: error.message,
        recipient: buyerEmail
      });
    }
  }

  async sendImpactCertificate(userEmail: string, passportData: any): Promise<void> {
    try {
      await this.sendEmail({
        to: [{ email: userEmail }],
        subject: `🌍 Impact Certificate — ${passportData.passportNumber}`,
        htmlContent: this.impactCertificateTemplate(passportData),
      });
      await this.logEmail(undefined, 'impact_certificate', userEmail);
    } catch (error: any) {
      logger.error('Failed to send impact certificate:', {
        message: error.message,
        recipient: userEmail
      });
    }
  }

  async sendWeeklyDigest(userEmail: string, summary: any): Promise<void> {
    try {
      await this.sendEmail({
        to: [{ email: userEmail }],
        subject: `📊 Weekly EcoExchange Digest — ${summary.weekRange}`,
        htmlContent: this.weeklyDigestTemplate(summary),
      });
      await this.logEmail(undefined, 'weekly_digest', userEmail);
    } catch (error: any) {
      logger.error('Failed to send weekly digest:', {
        message: error.message,
        recipient: userEmail
      });
    }
  }

  async sendContactSellerEmail(sellerEmail: string, data: any): Promise<void> {
    try {
      await this.sendEmail({
        to: [{ email: sellerEmail }],
        subject: `🛒 New Buyer Interest — ${data.buyerName} wants your ${data.materialName}`,
        htmlContent: this.contactSellerTemplate(data),
      });
      await this.logEmail(undefined, 'contact_seller', sellerEmail);
    } catch (error: any) {
      logger.error('Failed to send contact seller email:', {
        message: error.message,
        recipient: sellerEmail,
        code: error.code,
      });
      throw error;
    }
  }

  async sendAlertEmail(recipientEmail: string, subject: string, htmlBody: string): Promise<string | null> {
    const messageId = await this.sendEmail({
      to: [{ email: recipientEmail }],
      subject,
      htmlContent: htmlBody,
    });
    await this.logEmail(undefined, 'alert', recipientEmail);
    return messageId;
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE — Brevo HTTP API (replaces SMTP)
  // ═══════════════════════════════════════════════════════════════

  private async sendEmail(payload: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    htmlContent: string;
  }): Promise<string | null> {
    if (!this.apiKey) {
      const errorMsg = 'Brevo API key not configured — skipping email. Set BREVO_API_KEY in environment variables.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const body = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: payload.to.map(r => ({ email: r.email, name: r.name || r.email })),
      subject: payload.subject,
      htmlContent: payload.htmlContent,
    };

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), // 15s hard timeout
      });

      if (res.ok) {
        const result: any = await res.json();
        const messageId = result.messageId || null;
        logger.info(`📧 Email sent via Brevo HTTP API to ${payload.to.map(r => r.email).join(', ')} (ID: ${messageId})`);
        return messageId;
      } else {
        const errBody = await res.text();
        logger.error(`❌ Brevo HTTP API Error (${res.status}): ${errBody}`, {
          recipient: payload.to[0]?.email,
          status: res.status,
        });
        throw new Error(`Brevo API error (${res.status}): ${errBody}`);
      }
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        logger.error(`❌ Brevo HTTP API Timeout after 15s`, { recipient: payload.to[0]?.email });
        throw new Error('Email service timed out. Please try again later.');
      }
      throw error;
    }
  }

  private async logEmail(matchId: string | undefined, type: string, recipient: string): Promise<void> {
    try {
      await EmailLog.create({ matchId, type, recipient, sentAt: new Date(), status: 'sent' });
    } catch (error) {
      logger.error('Failed to log email to DB:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EMAIL TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  private matchNotificationTemplate(data: any): string {
    return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669, #0284c7); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔄 New Match Found!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">${data.score}% Compatibility Score</p>
  </div>
  <div style="padding: 24px;">
    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #10b981; margin: 0 0 8px;">Material</h3>
      <p style="margin: 0;">${data.material} — ${data.quantity}</p>
    </div>
    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #10b981; margin: 0 0 8px;">From</h3>
      <p style="margin: 0;">${data.sellerName} (${data.distance}km away)</p>
    </div>
    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #10b981; margin: 0 0 8px;">Price</h3>
      <p style="margin: 0;">₹${data.price || 'Negotiable'}</p>
    </div>
    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #10b981; margin: 0 0 8px;">Environmental Impact</h3>
      <p style="margin: 0;">CO₂ Saved: ${data.impact?.co2Saved || 'N/A'} kg</p>
    </div>
    <a href="${env.FRONTEND_URL}/matches/${data.matchId}" style="display: block; background: linear-gradient(135deg, #059669, #0284c7); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Match Details →</a>
  </div>
</div>`;
  }

  private impactCertificateTemplate(data: any): string {
    return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669, #047857); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0;">🌍 Impact Certificate</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">${data.passportNumber}</p>
  </div>
  <div style="padding: 24px;">
    <p>Your circular economy transaction has been verified.</p>
    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px;">
      <p>CO₂ Saved: <strong>${data.impact?.co2SavedVsVirgin || 0} kg</strong></p>
      <p>Water Saved: <strong>${data.impact?.waterSavedLiters?.toLocaleString() || 0} L</strong></p>
      <p>Energy Saved: <strong>${data.impact?.energySavedKwh || 0} kWh</strong></p>
    </div>
  </div>
</div>`;
  }

  private weeklyDigestTemplate(data: any): string {
    return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0284c7, #7c3aed); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0;">📊 Weekly Digest</h1>
    <p style="color: rgba(255,255,255,0.9);">${data.weekRange}</p>
  </div>
  <div style="padding: 24px;">
    <p>New Matches: <strong>${data.newMatches || 0}</strong></p>
    <p>Deals Completed: <strong>${data.dealsCompleted || 0}</strong></p>
    <p>CO₂ Saved: <strong>${data.co2Saved || 0} kg</strong></p>
    <p>Money Saved: <strong>₹${(data.moneySaved || 0).toLocaleString()}</strong></p>
  </div>
</div>`;
  }

  private contactSellerTemplate(data: any): string {
    return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0284c7, #059669); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🛒 New Buyer Interest!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Someone wants to buy your listed material</p>
  </div>
  <div style="padding: 24px;">
    <p style="margin: 0 0 16px; font-size: 15px;">Hi <strong>${data.sellerName}</strong>,</p>
    <p style="margin: 0 0 20px; color: #a3a3a3;">Great news! A verified company on EcoExchange is interested in purchasing your listed waste material.</p>

    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #10b981; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Listing</h3>
      <p style="margin: 0; font-size: 16px;"><strong style="text-transform: capitalize;">${data.materialName}</strong></p>
      <p style="margin: 4px 0 0; color: #a3a3a3;">${data.quantity} · ${data.price}</p>
    </div>

    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #0284c7; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Interested Buyer</h3>
      <p style="margin: 0;"><strong>${data.buyerName}</strong></p>
      <p style="margin: 4px 0 0; color: #a3a3a3;">Industry: ${data.buyerIndustry}</p>
      ${data.buyerEmail ? `<p style="margin: 4px 0 0; color: #a3a3a3;">Email: ${data.buyerEmail}</p>` : ''}
    </div>

    ${data.buyerMessage ? `
    <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #f59e0b; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Message from Buyer</h3>
      <p style="margin: 0; font-style: italic;">"${data.buyerMessage}"</p>
    </div>
    ` : ''}

    <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/marketplace" style="display: block; background: linear-gradient(135deg, #059669, #0284c7); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View on Marketplace →</a>

    <p style="margin: 20px 0 0; color: #525252; font-size: 12px; text-align: center;">This is an automated notification from EcoExchange. Please do not reply directly to this email.</p>
  </div>
</div>`;
  }
}

export const brevoService = new BrevoService();
