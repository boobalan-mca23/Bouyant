import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const fallbackJwtSecret = 'super-secret-jwt-key-buoyant-media-2026';
const fallbackRefreshSecret = 'super-secret-refresh-key-buoyant-media-2026';

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/buoyant_media?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || fallbackJwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || fallbackRefreshSecret,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  STALL_HOLD_DURATION_MINUTES: parseInt(process.env.STALL_HOLD_DURATION_MINUTES || '10', 10),
  GSTIN_API_KEY: process.env.GSTIN_API_KEY || '',
  RAZORPAY_API_KEY: (process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_KEY_ID || "").trim(),
  RAZORPAY_API_SECRET: (process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_KEY_SECRET || "").trim(),

  // WhatsApp Configuration
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED === 'true',
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || 'v20.0',
  WHATSAPP_PHONE_NUMBER_ID: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
  WHATSAPP_ACCESS_TOKEN: (process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim(),
  WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',

  // Configurable WhatsApp Templates
  WHATSAPP_TEMPLATE_BOOKING_CREATED: process.env.WHATSAPP_TEMPLATE_BOOKING_CREATED || 'booking_created',
  WHATSAPP_TEMPLATE_PAYMENT_SUCCESS: process.env.WHATSAPP_TEMPLATE_PAYMENT_SUCCESS || 'payment_success',
  WHATSAPP_TEMPLATE_BOOKING_CONFIRMED: process.env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED || 'booking_confirmed',
  WHATSAPP_TEMPLATE_PAYMENT_FAILED: process.env.WHATSAPP_TEMPLATE_PAYMENT_FAILED || 'payment_failed',
  WHATSAPP_TEMPLATE_BOOKING_EXPIRED: process.env.WHATSAPP_TEMPLATE_BOOKING_EXPIRED || 'booking_expired',
  WHATSAPP_TEMPLATE_INVOICE_GENERATED: process.env.WHATSAPP_TEMPLATE_INVOICE_GENERATED || 'invoice_generated',
  WHATSAPP_TEMPLATE_ADMIN_ALERT: process.env.WHATSAPP_TEMPLATE_ADMIN_ALERT || 'admin_alert',

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  CLOUDINARY_API_KEY: (process.env.CLOUDINARY_API_KEY || '').trim(),
  CLOUDINARY_API_SECRET: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  CLOUDINARY_URL: (process.env.CLOUDINARY_URL || '').trim(),
  ASKEVA_TOKEN: (process.env.ASKEVA_TOKEN || '').trim(),
  API_BASE_URL:(process.env.API_BASE_URL || '')
};

if (
  env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET ||
    !process.env.REFRESH_TOKEN_SECRET ||
    env.JWT_SECRET === fallbackJwtSecret ||
    env.REFRESH_TOKEN_SECRET === fallbackRefreshSecret)
) {
  throw new Error('Production JWT secrets must be explicitly configured with strong unique values.');
}
