import fs from 'fs';
import path from 'path';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const res = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const k = t.split('=')[0].trim();
    const v = t.slice(t.indexOf('=') + 1).trim();
    res[k] = v;
  }
  return res;
}

function updateEnvFile(filePath, updates) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = content.split('\n');
  const existingKeys = new Set();
  
  const newLines = lines.map(line => {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) return line;
    const k = t.split('=')[0].trim();
    existingKeys.add(k);
    if (k in updates) {
      return `${k}=${updates[k]}`;
    }
    return line;
  });

  // Append new keys that were not present in the file
  for (const [k, v] of Object.entries(updates)) {
    if (!existingKeys.has(k)) {
      newLines.push(`${k}=${v}`);
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  console.log(`Updated: ${filePath} (${Object.keys(updates).length} keys checked/updated)`);
}

// 1. Read live reference keys
const liveEnv = parseEnv('d:/live-perfumebooth/perfumebooth/.env.local');

const resendKey = liveEnv.RESEND_API_KEY || 're_feB5N...';
const razorpayKeyId = liveEnv.RAZORPAY_KEY_ID;
const razorpaySecret = liveEnv.RAZORPAY_KEY_SECRET;
const razorpayWebhookSecret = liveEnv.RAZORPAY_WEBHOOK_SECRET;
const shiprocketEmail = liveEnv.SHIPROCKET_API_EMAIL;
const shiprocketPassword = liveEnv.SHIPROCKET_API_PASSWORD;
const judgemePublicToken = liveEnv.NEXT_PUBLIC_JUDGEME_PUBLIC_TOKEN;
const judgemePrivateToken = liveEnv.JUDGEME_PRIVATE_TOKEN;
const contactRecipient = liveEnv.CONTACT_RECIPIENT_EMAIL || 'admin@perfumebooth.com,connect@perfumebooth.com';
const contactSender = liveEnv.CONTACT_SENDER_EMAIL || 'connect@perfumebooth.com';

// 2. Update Storefront .env.local
updateEnvFile('perfumebooth/.env.local', {
  RAZORPAY_KEY_ID: razorpayKeyId,
  RAZORPAY_KEY_SECRET: razorpaySecret,
  RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
  SHIPROCKET_API_EMAIL: shiprocketEmail,
  SHIPROCKET_API_PASSWORD: shiprocketPassword,
  RESEND_API_KEY: resendKey,
  NEXT_PUBLIC_JUDGEME_PUBLIC_TOKEN: judgemePublicToken,
  JUDGEME_PRIVATE_TOKEN: judgemePrivateToken,
  CONTACT_RECIPIENT_EMAIL: contactRecipient,
  CONTACT_SENDER_EMAIL: contactSender,
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
  NEXT_PUBLIC_API_URL: 'http://localhost:8000',
  BACKEND_API_URL: 'http://localhost:8000',
  DJANGO_API_URL: 'http://localhost:8000'
});

// 3. Update Backend .env
updateEnvFile('perfumebooth-backend/.env', {
  RAZORPAY_KEY_ID: razorpayKeyId,
  RAZORPAY_KEY_SECRET: razorpaySecret,
  RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
  SHIPROCKET_API_EMAIL: shiprocketEmail,
  SHIPROCKET_API_PASSWORD: shiprocketPassword,
  EMAIL_HOST: 'smtp.resend.com',
  EMAIL_PORT: '587',
  EMAIL_USE_TLS: 'True',
  EMAIL_HOST_USER: 'resend',
  EMAIL_HOST_PASSWORD: resendKey,
  DEFAULT_FROM_EMAIL: 'PerfumeBooth <onboarding@resend.dev>',
  NOTIFICATION_FROM_EMAIL: 'PerfumeBooth <onboarding@resend.dev>',
  NOTIFICATION_SITE_URL: 'http://localhost:3001',
  CUSTOMER_NOTIFICATIONS_ENABLED: 'True',
  SHIPROCKET_PICKUP_PINCODE: '110001',
  SHIPROCKET_PICKUP_LOCATION: 'Primary Warehouse'
});

// 4. Update Docker .env.docker
updateEnvFile('perfumebooth/.env.docker', {
  RAZORPAY_KEY_ID: razorpayKeyId,
  RAZORPAY_KEY_SECRET: razorpaySecret,
  RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
  SHIPROCKET_API_EMAIL: shiprocketEmail,
  SHIPROCKET_API_PASSWORD: shiprocketPassword,
  RESEND_API_KEY: resendKey,
  EMAIL_HOST: 'smtp.resend.com',
  EMAIL_PORT: '587',
  EMAIL_USE_TLS: 'True',
  EMAIL_HOST_USER: 'resend',
  EMAIL_HOST_PASSWORD: resendKey,
  DEFAULT_FROM_EMAIL: 'PerfumeBooth <onboarding@resend.dev>',
  NOTIFICATION_FROM_EMAIL: 'PerfumeBooth <onboarding@resend.dev>',
  NOTIFICATION_SITE_URL: 'http://localhost:3001',
  CUSTOMER_NOTIFICATIONS_ENABLED: 'True',
  NEXT_PUBLIC_JUDGEME_PUBLIC_TOKEN: judgemePublicToken,
  JUDGEME_PRIVATE_TOKEN: judgemePrivateToken,
  CONTACT_RECIPIENT_EMAIL: contactRecipient,
  CONTACT_SENDER_EMAIL: contactSender,
  SHIPROCKET_PICKUP_PINCODE: '110001',
  SHIPROCKET_PICKUP_LOCATION: 'Primary Warehouse'
});

// 5. Update / Create MPS .env.local
updateEnvFile('perfumebooth-MPS/.env.local', {
  NEXT_PUBLIC_API_BASE_URL: 'http://localhost:8000',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
  NEXT_PUBLIC_CKEDITOR_LICENSE_KEY: 'GPL'
});

console.log('\n--- ALL ENV FILES SYNCHRONIZED SUCCESSFULLY ---');
