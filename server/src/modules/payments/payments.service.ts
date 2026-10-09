import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { Prisma } from '@prisma/client';
import crypto from "crypto";
import { env } from '../../config/env.js';
import { razorpay } from '../../config/razorpay.js';
import { TokenPayload } from '../../utils/jwt.js';
import { EmailService } from '../../services/email.service.js';
import { InvoicePdfService } from '../../services/InvoicePdfService.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WhatsappService } from '../../services/whatsapp.service.js';
import { generateReference } from '../../utils/reference.js';

export class PaymentsService {
  /**
   * VERIFY PAYMENT SERVER-SIDE
   */
 static async verifyAndProcessPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  // =========================================================
  // 1. BASIC INPUT VALIDATION
  // =========================================================

  if (
    !data.razorpay_order_id ||
    !data.razorpay_payment_id ||
    !data.razorpay_signature
  ) {
    throw ApiError.badRequest(
      'Razorpay payment details are required.'
    );
  }

  // =========================================================
  // 2. FIND OUR PAYMENT
  // =========================================================

  const payment = await prisma.payment.findUnique({
    where: {
      razorpayOrderId: data.razorpay_order_id,
    },
  });

  if (!payment) {
    throw ApiError.notFound(
      'Payment record not found for this Razorpay order.'
    );
  }

  // =========================================================
  // 3. IDEMPOTENCY CHECK
  //
  // If this exact payment was already processed successfully,
  // don't process the booking again.
  // =========================================================

  if (payment.status === 'SUCCESS') {
    return {
      success: true,
      message: 'Payment has already been processed.',
      data: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        paymentStatus: 'SUCCESS',
      },
    };
  }

  // Only PENDING payment can continue.
  if (payment.status !== 'PENDING') {
    throw ApiError.badRequest(
      `Payment verification is not allowed because payment status is ${payment.status}.`
    );
  }

  // =========================================================
  // 4. VERIFY RAZORPAY SIGNATURE
  // =========================================================

  const signatureBody =
    `${data.razorpay_order_id}|${data.razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac(
      'sha256',
      env.RAZORPAY_API_SECRET
    )
    .update(signatureBody)
    .digest('hex');

  const receivedSignature = data.razorpay_signature;

  const expectedBuffer = Buffer.from(
    expectedSignature,
    'utf8'
  );

  const receivedBuffer = Buffer.from(
    receivedSignature,
    'utf8'
  );

  const isAuthentic =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    );

  if (!isAuthentic) {
    throw ApiError.badRequest(
      'Payment signature verification failed.'
    );
  }

  // =========================================================
  // 5. FETCH PAYMENT FROM RAZORPAY
  //
  // Never trust only the frontend response.
  // Ask Razorpay for the actual payment information.
  // =========================================================

  let razorpayPayment;

  try {
    razorpayPayment =
      await razorpay.payments.fetch(
        data.razorpay_payment_id
      );
  } catch (_error) {
    throw ApiError.internal(
      'Unable to verify the payment with the payment gateway.'
    );
  }

  // =========================================================
  // 6. VERIFY PAYMENT BELONGS TO OUR RAZORPAY ORDER
  // =========================================================

  if (
    razorpayPayment.order_id !==
    payment.razorpayOrderId
  ) {
    throw ApiError.badRequest(
      'Razorpay payment does not belong to this order.'
    );
  }

  // =========================================================
  // 7. VERIFY CURRENCY
  // =========================================================

  if (razorpayPayment.currency !== 'INR') {
    throw ApiError.badRequest(
      'Invalid payment currency.'
    );
  }

  // =========================================================
  // 8. VERIFY AMOUNT
  //
  // payment.amount comes from OUR database.
  // Never trust amount from frontend.
  // =========================================================

  const expectedAmountPaise = new Prisma.Decimal(
    payment.amount.toString()
  )
    .mul(100)
    .toNumber();

  if (
    razorpayPayment.amount !==
    expectedAmountPaise
  ) {
    throw ApiError.badRequest(
      'Payment amount does not match the expected payment amount.'
    );
  }

  // =========================================================
  // 9. HANDLE FAILED PAYMENT
  // =========================================================

  if (razorpayPayment.status === 'failed') {
    return await prisma.$transaction(
      async (tx) => {
        const currentPayment =
          await tx.payment.findUnique({
            where: {
              id: payment.id,
            },
          });

        if (!currentPayment) {
          throw ApiError.notFound(
            'Payment record not found.'
          );
        }

        // Another request may have already succeeded.
        if (currentPayment.status === 'SUCCESS') {
          return {
            success: true,
            message:
              'Payment has already been processed.',
            data: {
              paymentId: currentPayment.id,
              bookingId:
                currentPayment.bookingId,
              paymentStatus: 'SUCCESS',
            },
          };
        }

        if (currentPayment.status !== 'PENDING') {
          throw ApiError.badRequest(
            `Payment is already ${currentPayment.status}.`
          );
        }

        // -----------------------------------------------------
        // Get booking
        // -----------------------------------------------------

	      const booking =
	        await tx.booking.findUnique({
	          where: {
	            id: currentPayment.bookingId,
	          },
	          include: {
	            company: {
	              include: {
	                users: {
	                  select: {
	                    id: true,
	                  },
	                },
	              },
	            },
	            stalls: {
	              include: {
	                stall: true,
	              },
	            },
	          },
	        });

        if (!booking) {
          throw ApiError.notFound(
            'Booking not found.'
          );
        }

        // -----------------------------------------------------
        // Mark payment failed
        // -----------------------------------------------------

        const updatedPayment =
          await tx.payment.updateMany({
            where: {
              id: currentPayment.id,
              status: 'PENDING',
            },
            data: {
              status: 'FAILED',
              razorpayPaymentId:
                data.razorpay_payment_id,
              razorpaySignature:
                data.razorpay_signature,
              failureReason:
                razorpayPayment.error_description ||
                'Razorpay payment failed.',
            },
          });

        if (updatedPayment.count !== 1) {
          throw ApiError.conflict(
            'Payment was already processed.'
          );
        }

        // -----------------------------------------------------
        // IMPORTANT:
        //
        // Do NOT immediately release the stall if your
        // business rule is to keep the 15-minute hold.
        //
        // Keep:
        // Booking = PENDING_PAYMENT
        // Stall   = PAYMENT_PENDING
        //
        // The expiry mechanism will release it later.
        // -----------------------------------------------------

        return {
          success: false,
          message:
            'Payment failed. Your payment attempt was unsuccessful. The stall hold remains active until it expires.',
          data: {
            paymentId: currentPayment.id,
            bookingId: booking.id,
            paymentStatus: 'FAILED',
            bookingStatus: booking.status,
            balanceAmount:
              booking.balanceAmount,
          },
        };
      },
      {
        timeout: 10000,
      }
    );
  }

  // =========================================================
  // 10. ONLY CAPTURED PAYMENT CAN CONFIRM BOOKING
  // =========================================================

  if (razorpayPayment.status !== 'captured') {
    throw ApiError.badRequest(
      `Payment is not captured. Current status: ${razorpayPayment.status}`
    );
  }

  // =========================================================
  // 11. FINAL DATABASE TRANSACTION
  // =========================================================

  const result = await prisma.$transaction(
    async (tx) => {
      // =====================================================
      // Re-read Payment inside transaction
      // =====================================================

      const currentPayment =
        await tx.payment.findUnique({
          where: {
            id: payment.id,
          },
        });

      if (!currentPayment) {
        throw ApiError.notFound(
          'Payment record not found.'
        );
      }

      // =====================================================
      // IDEMPOTENCY
      // =====================================================

      if (currentPayment.status === 'SUCCESS') {
        return {
          response: {
            success: true,
            message:
              'Payment has already been processed.',
            data: {
              paymentId: currentPayment.id,
              bookingId:
                currentPayment.bookingId,
              paymentStatus: 'SUCCESS',
            },
          },
          emailData: null,
        };
      }

      if (currentPayment.status !== 'PENDING') {
        throw ApiError.badRequest(
          `Payment is already ${currentPayment.status}.`
        );
      }

      // =====================================================
      // GET BOOKING
      // =====================================================

      const booking =
        await tx.booking.findUnique({
          where: {
            id: currentPayment.bookingId,
          },
          include: {
            company: {
              include: {
                users: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            stalls: {
              include: {
                stall: true,
              },
            },
            exhibition: {
              include: {
                createdBy: true,
              },
            },
          },
        });

      if (!booking) {
        throw ApiError.notFound(
          'Booking not found.'
        );
      }

      // =====================================================
      // BOOKING STATE VALIDATION
      // =====================================================

      if (booking.status !== 'PENDING_PAYMENT') {
        throw ApiError.conflict(
          `Booking cannot be completed because its current status is ${booking.status}.`
        );
      }

      if (
        booking.paymentStatus === 'UNPAID' &&
        booking.expiresAt &&
        booking.expiresAt <= new Date()
      ) {
        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: 'EXPIRED',
          },
        });

        throw ApiError.badRequest(
          'This booking hold has expired. Please create a new booking.'
        );
      }

      const stallIds =
        booking.stalls.map(
          (item) => item.stallId
        );

      if (booking.paymentStatus === 'UNPAID') {
        const companyUserIds = new Set(
          booking.company.users.map((companyUser) => companyUser.id)
        );
        const invalidHeldStall = booking.stalls.find(
          (item) =>
            !['TEMPORARILY_HELD', 'PAYMENT_PENDING'].includes(item.stall.status) ||
            !item.stall.heldByUserId ||
            !companyUserIds.has(item.stall.heldByUserId)
        );

        if (invalidHeldStall) {
          throw ApiError.conflict(
            'One or more stalls are no longer held for this booking.'
          );
        }
      }

      // =====================================================
      // CALCULATE BALANCE
      // =====================================================

      const paymentAmount =
        new Prisma.Decimal(
          currentPayment.amount.toString()
        );

      const currentBalance =
        new Prisma.Decimal(
          booking.balanceAmount.toString()
        );

      // Prevent payment from exceeding balance.
      if (
        paymentAmount.greaterThan(
          currentBalance
        )
      ) {
        throw ApiError.badRequest(
          'Payment amount exceeds the remaining booking balance.'
        );
      }

      const remainingBalance =
        currentBalance.minus(
          paymentAmount
        );

      const finalBalance =
        remainingBalance.lessThan(0)
          ? new Prisma.Decimal(0)
          : remainingBalance;

      const bookingIsFullyPaid =
        finalBalance.equals(0);

      // =====================================================
      // ATOMIC PAYMENT STATE CHANGE
      // =====================================================

      const paymentUpdate =
        await tx.payment.updateMany({
          where: {
            id: currentPayment.id,
            status: 'PENDING',
          },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId:
              data.razorpay_payment_id,
            razorpaySignature:
              data.razorpay_signature,
            paidAt:  new Date(),
          },
        });

      // =====================================================
      // CONCURRENCY PROTECTION
      // =====================================================

      if (paymentUpdate.count !== 1) {
        throw ApiError.conflict(
          'This payment has already been processed.'
        );
      }

      // =====================================================
      // UPDATE BOOKING
      // =====================================================

      const newPaidAmount = new Prisma.Decimal(booking.paidAmount?.toString() || '0').add(paymentAmount);

      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: finalBalance,
          status:
            bookingIsFullyPaid
              ? 'CONFIRMED'
              : 'PENDING_PAYMENT',
          paymentStatus:
                bookingIsFullyPaid
                  ? 'PAID_FULL'
                  : 'PARTIALLY_PAID',
        },
      });

      // =====================================================
      // FIRST SUCCESSFUL PAYMENT → CONFIRM ALL STALLS
      // =====================================================

      if (booking.paymentStatus === 'UNPAID') {
        const stallUpdate =
          await tx.stall.updateMany({
            where: {
              id: {
                in: stallIds,
              },
              status: {
                in: ['AVAILABLE', 'TEMPORARILY_HELD', 'PAYMENT_PENDING', 'BLOCKED'],
              },
            },
            data: {
              status: 'BOOKED_CONFIRMED',
              heldUntil: null,
              heldByUserId: null,
            },
          });

        if (stallUpdate.count !== stallIds.length) {
          throw ApiError.conflict(
            'One or more stalls could not be confirmed.'
          );
        }
      }

      // =====================================================
      // RESPONSE
      // =====================================================

      const response = {
        success: true,

        message: bookingIsFullyPaid
          ? 'Payment successful. Booking confirmed.'
          : 'Payment successful. Remaining balance is pending.',

        data: {
          paymentId:
            currentPayment.id,

          paymentReference:
            currentPayment.paymentReference,

          paymentStatus:
            'SUCCESS',

          bookingId:
            booking.id,

          bookingStatus:
            bookingIsFullyPaid
              ? 'CONFIRMED'
              : 'PENDING_PAYMENT',

          paidAmount:
            paymentAmount,

          balanceAmount:
            finalBalance,

          paidAt: new Date()
        },
      };

      return {
        response,
        emailData: {
          booking,
          payment: currentPayment,
          paymentAmount,
          finalBalance,
        },
      };
    },
    {
      timeout: 10000,
    }
  );

  // OUT OF BAND SIDE-EFFECTS (AFTER DB TRANSACTION COMMITS)
  if (result.emailData) {
    const { booking, payment, paymentAmount, finalBalance } = result.emailData;
    setImmediate(async () => {
      try {
        let invoice = await prisma.invoice.findFirst({ where: { paymentId: payment.id } });

        // Auto-create invoice if missing for this payment
        if (!invoice) {
          try {
            const invoiceNum = generateReference('INV', 6);
            const total = Number(booking.totalAmount || 0);
            const tax = Number(booking.taxAmount || 0);
            const grand = Number(booking.grandTotal || total + tax);

            invoice = await prisma.invoice.create({
              data: {
                invoiceNumber: invoiceNum,
                bookingId: booking.id,
                paymentId: payment.id,
                companyId: booking.companyId,
                totalAmount: new Prisma.Decimal(total),
                taxAmount: new Prisma.Decimal(tax),
                grandTotal: new Prisma.Decimal(grand),
                status: 'ISSUED',
                issueDate: new Date(),
              },
            });
          } catch (invErr: any) {
            console.error('⚠️ [INVOICE CREATION FAILED]:', invErr?.message || invErr);
          }
        }

        const invoiceNumber = invoice?.invoiceNumber || `INV-${booking.bookingReference}`;

        let pdfBuffer: Buffer | null = null;
        if (invoice) {
          const pdfData = InvoicePdfService.buildInvoicePdfData(invoice, booking);
          pdfBuffer = await InvoicePdfService.generateInvoicePdf(pdfData).catch((err: any) => {
            console.error('⚠️ [PDF GENERATION FAILED] PDF creation error:', err?.message || err);
            return null;
          });
        }

        const stalls = (booking.stalls || []).map((s: any) => ({
          stallNumber: s.stall?.stallNumber || s.stallId,
          category: s.stall?.category || 'Standard',
        }));

        const firstUser = booking.company.users?.[0];

        await EmailService.sendBookingConfirmationEmail({
          toEmail: booking.company.email,
          toName: booking.company.contactPerson || booking.company.name,
          companyName: booking.company.name,
          bookingReference: booking.bookingReference,
          exhibitionTitle: booking.exhibition.title,
          stalls,
          invoiceNumber,
          paymentPercentage: (payment as any).paymentPercentage || 100,
          paymentAmount: paymentAmount.toNumber(),
          remainingBalance: finalBalance.toNumber(),
          paymentDate: payment.paidAt || new Date(),
          paymentReference: payment.paymentReference,
          userName: firstUser?.username || booking.company.email,
          pdfBuffer,
        }).catch((err: any) => console.error('⚠️ [EMAIL SEND FAILED] Confirmation email error:', err?.message || err));

        // DISPATCH ADMIN PAYMENT NOTIFICATION EMAIL
        try {
          const adminEmails: string[] = [];

          if (booking.exhibition?.notificationEmails) {
            const parsed = booking.exhibition.notificationEmails
              .split(/[\s,;]+/)
              .map((e: string) => e.trim())
              .filter((e: string) => e.length > 0 && e.includes('@'));
            adminEmails.push(...parsed);
          }

          const createdByEmail = (booking.exhibition as any)?.createdBy?.email;
          if (createdByEmail) {
            adminEmails.push(createdByEmail);
          }

          if (adminEmails.length === 0) {
            const adminUsers = await prisma.user.findMany({
              where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, isActive: true },
              select: { email: true },
            });
            adminUsers.forEach((u) => {
              if (u.email) adminEmails.push(u.email);
            });
          }

          const uniqueAdminEmails = Array.from(new Set(adminEmails));

          if (uniqueAdminEmails.length > 0) {
            const comp = booking.company as any;
            await EmailService.sendPaymentAdminEmail({
              notificationEmails: uniqueAdminEmails,
              companyName: comp?.name || 'Exhibitor',
              contactPerson: comp?.contactPerson || comp?.name,
              email: comp?.email,
              phone: comp?.phone || comp?.contactPhone || comp?.mobile || comp?.telephone,
              gstNumber: comp?.gstNumber || undefined,
              bookingReference: booking.bookingReference,
              exhibitionTitle: booking.exhibition?.title || 'Exhibition Event',
              stalls: (booking.stalls || []).map((s: any) => ({
                stallNumber: s.stall?.stallNumber || s.stallId,
                category: s.stall?.category || 'Standard',
                price: s.price ? Number(s.price) : undefined,
              })),
              invoiceNumber,
              paymentPercentage: (payment as any).paymentPercentage || 100,
              paymentAmount: paymentAmount.toNumber(),
              remainingBalance: finalBalance.toNumber(),
              grandTotal: Number(booking.grandTotal || 0),
              paymentMethod: payment.paymentMethod || 'Online Gateway',
              paymentDate: payment.paidAt || new Date(),
              paymentReference: payment.paymentReference,
              pdfBuffer,
            });
          }
        } catch (adminEmailErr: any) {
          console.error('⚠️ [ADMIN PAYMENT EMAIL FAILED]:', adminEmailErr?.message || adminEmailErr);
        }

        // Send WhatsApp Confirmation with Invoice attachment via AskEva
        await WhatsappService.sendBookingConfirmation({
          booking,
          payment,
          invoice,
          paymentAmount: paymentAmount.toNumber(),
        });
      

        // // Dispatch notifications & admin alerts
        // NotificationsService.dispatchEvent({
        //   event: 'PAYMENT_RECEIVED',
        //   bookingId: booking.id,
        //   paymentId: payment.id,
        // });
      } catch (err: any) {
        console.error('⚠️ [AFTER-PAYMENT SIDE EFFECT FAILED]:', err?.message || err);
      }
    });
  }

  return result.response;
}

static async createBalancePaymentOrder(
  bookingId: string,
  user?: TokenPayload
) {
  // -----------------------------------------
  // 1. Validate bookingId
  // -----------------------------------------

  if (!bookingId) {
    throw ApiError.badRequest(
      'Booking ID is required.'
    );
  }

  // -----------------------------------------
  // 2. Find booking
  // -----------------------------------------

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },

    include: {
      company: true,
      exhibition: true,
      stalls: {
        include: {
          stall: true,
        },
      },
    },
  });

  if (!booking) {
    throw ApiError.notFound(
      'Booking not found.'
    );
  }

  const canManagePayments = [
    'ADMIN',
    'SUPERADMIN',
    'STAFF',
  ].includes(user?.role ?? '');

  if (!user) {
    throw ApiError.unauthorized('Authentication is required to create a balance payment order.');
  }

  if (!canManagePayments && booking.companyId !== user.companyId) {
    throw ApiError.forbidden('You can only pay the balance for your own booking.');
  }

  // -----------------------------------------
  // 3. Validate booking status
  // -----------------------------------------

  if (booking.status !== 'PENDING_PAYMENT') {
    throw ApiError.badRequest(
      `Balance payment is not allowed for booking with status ${booking.status}.`
    );
  }

  // -----------------------------------------
  // 4. Validate balance amount
  // -----------------------------------------

  const balanceAmount =
    new Prisma.Decimal(
      booking.balanceAmount.toString()
    );

  if (balanceAmount.lessThanOrEqualTo(0)) {
    throw ApiError.badRequest(
      'No balance amount is pending for this booking.'
    );
  }

  // -----------------------------------------
  // 5. Validate booking expiry
  // -----------------------------------------

  // if (
  //   booking.expiresAt &&
  //   booking.expiresAt <= new Date()
  // ) {
  //   throw ApiError.badRequest(
  //     'This booking has expired. Balance payment is no longer allowed.'
  //   );
  // }

  // -----------------------------------------
  // 6. Validate stalls
  // -----------------------------------------

  if (!booking.stalls.length) {
    throw ApiError.badRequest(
      'No stalls are associated with this booking.'
    );
  }

  // -----------------------------------------
  // 7. Validate stall status
  // -----------------------------------------

  const invalidStall = booking.stalls.find(
    (item) =>
      item.stall.status !== 'PAYMENT_PENDING' &&
      item.stall.status !== 'BOOKED_CONFIRMED'
  );

  if (invalidStall) {
    throw ApiError.badRequest(
      'One or more stalls are no longer available for balance payment.'
    );
  }

  // -----------------------------------------
  // 8. Create Razorpay Order
  // -----------------------------------------

  let razorpayOrder;

try {
  razorpayOrder = await razorpay.orders.create({
    amount: balanceAmount
      .mul(100)
      .toNumber(),

    currency: 'INR',

    receipt: `BAL-${booking.bookingReference}`,

    notes: {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      paymentType: 'BALANCE',
    },
  });
   } catch (_error) {

      throw ApiError.internal(
        'Payment gateway is currently unavailable. Please try again later.'
      );
    }
  // -----------------------------------------
  // 9. Create Payment record
  // -----------------------------------------
  const paymentReference = `PAY-${Date.now()}`;

  const payment = await prisma.payment.create({
  data: {
    paymentReference,

    bookingId: booking.id,

    amount: balanceAmount,

    status: 'PENDING',

    razorpayOrderId: razorpayOrder.id,
  },
});

  // -----------------------------------------
  // 10. Return Razorpay details
  // -----------------------------------------

  return {
    bookingId: booking.id,

    bookingReference:
      booking.bookingReference,

    paymentId: payment.id,

    razorpayOrderId:
      razorpayOrder.id,

    amount: razorpayOrder.amount,

    currency: razorpayOrder.currency,

    keyId: env.RAZORPAY_API_KEY,

    balanceAmount,
  };
}

  static async listPayments(page = 1, limit = 50) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count(),
      prisma.payment.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              stalls: { include: { stall: true } },
              company: true,
            },
          },
          // user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return { payments, total, page, limit: take, totalPages: Math.ceil(total / take) };
  }
}
