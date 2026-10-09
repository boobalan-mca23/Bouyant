import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SendConfirmationParams {
  booking: any;
  payment: any;
  invoice: any;
  paymentAmount: number;
}

export class WhatsappService {

  /**
   * Generate a secure, short-lived (15 minutes) signed URL for WhatsApp/AskEva download
   */

   private static readonly API_BASE = 'https://backend.askeva.io/v1/message/send-message';

  static generateSignedDownloadUrl(invoiceId: string, bookingId: string): string {
    const token = jwt.sign(
      { invoiceId, bookingId, purpose: 'INVOICE_DOWNLOAD' },
      env.JWT_SECRET,
      { expiresIn: '15m' } // Valid for 15 minutes
    );

    const baseUrl = env.API_BASE_URL || `http://localhost:${env.PORT}`;
    return `${baseUrl}/api/v1/invoices/public/${invoiceId}/pdf?token=${token}`;
  }

  /**       
   * Validate token from query param
   */
  static verifySignedToken(token: string, invoiceId: string): boolean {
    try {
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      return decoded.purpose === 'INVOICE_DOWNLOAD' && decoded.invoiceId === invoiceId;
    } catch {
      return false;
    }
  }
  
  static async sendBookingConfirmation(params: SendConfirmationParams): Promise<void> {

    const { booking, invoice, paymentAmount } = params;
    
    try {
      const askEvaToken = process.env.ASKEVA_TOKEN;
      if (!askEvaToken) {
        console.warn('⚠️ [ASKEVA] ASKEVA_TOKEN is not set in environment. Skipping WhatsApp dispatch.');
        return;
      }
      // 1. Format and normalize recipient phone number (e.g. 919876543210)
      const rawPhone = (booking.company?.mobile || booking.company?.phone || '').replace(/[^0-9]/g, '');
      if (!rawPhone || rawPhone.length < 10) {
        console.warn(`⚠️ [ASKEVA] Invalid or missing phone number for company "${booking.company?.name}". Skipping.`);
        return;
      }
      const formattedPhone = rawPhone.startsWith('91') && rawPhone.length > 10 ? rawPhone : `91${rawPhone.slice(-10)}`;
      // 2. Generate secure 15-min signed download link
      const downloadUrl = this.generateSignedDownloadUrl(invoice.id, booking.id);
      // 3. Format stall numbers & dimensions
      const stallNumbers = (booking.stalls || [])
        .map((s: any) => s.stall?.stallNumber || s.stallId)
        .join(', ') || 'N/A';
      // Format stall dimensions / area for WhatsApp
      const stallDimensions = (booking.stalls || [])
        .map((s: any) => {
          const stall = s.stall;
          if (!stall) return 'Standard';
          
          // Option A: Display Area in Sq.Ft (e.g. "100 Sq.Ft")
          if (stall.areaSqFt) {
            return `${stall.areaSqFt} Sq.Ft`;
          }
    
          // Option B: Display Width x Height (e.g. "10m x 10m" or "100 x 100")
          if (stall.width && stall.height) {
      return `${stall.width}m x ${stall.height}m`;
    }

    // Option C: Fallback to Category
    return stall.category || 'Standard';
  })
  .join(', ') || 'Standard';

      // 4. Construct AskEva Payload
      const payload = {
        to: formattedPhone,
        type: 'template',
        template: {
          language: {
            policy: 'deterministic',
            code: 'en',
          },
          name: 'invoice',
          components: [
            {
              type: 'header',
              parameters: [
                {
                  type: 'document',
                  document: {
                    link: downloadUrl,
                    filename: `Invoice-${booking.bookingReference}.pdf`,
                  },
                },
              ],
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', text: booking.company.contactPerson || booking.company.name },
                { type: 'text', text: booking.exhibition.title },
                { type: 'text', text: booking.bookingReference },
                { type: 'text', text: stallNumbers },
                { type: 'text', text: stallDimensions },
                { type: 'text', text: paymentAmount.toString() },
              ],
            },
          ],
        },
      };
      // 5. Send Request
      const response = await fetch(`${this.API_BASE}?token=${askEvaToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        console.error('❌ [ASKEVA WHATSAPP ERROR]:', responseData);
      } else {
        console.log('responseData of whatsapp',responseData)
        console.log(`✅ [ASKEVA WHATSAPP SENT] to ${formattedPhone} for booking ${booking.bookingReference}`);
      }
    } catch (err: any) {
      console.error('⚠️ [ASKEVA DISPATCH EXCEPTION]:', err?.message || err);
    }
  }


}
