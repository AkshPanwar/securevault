const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
function getOTPExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if OTP is expired
 */
function isOTPExpired(expiry) {
  return new Date() > new Date(expiry);
}

/**
 * Create email transporter
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send OTP email
 */
async function sendOTPEmail(email, otp, name) {
  // In development, just log the OTP
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
    console.log(`\n🔐 OTP for ${email}: ${otp}\n`);
    return { success: true, preview: otp };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"SecureVault" <${process.env.FROM_EMAIL || 'noreply@securevault.com'}>`,
    to: email,
    subject: 'SecureVault - Your Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #0a0a0f; color: #e2e8f0; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: #12121a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
          .body { padding: 30px; }
          .otp-box { background: #1e1e2e; border: 2px solid #6366f1; border-radius: 12px; text-align: center; padding: 20px; margin: 20px 0; }
          .otp { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #a78bfa; font-family: monospace; }
          .expiry { color: #94a3b8; font-size: 14px; margin-top: 8px; }
          .footer { text-align: center; padding: 20px; color: #475569; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 SecureVault</h1>
          </div>
          <div class="body">
            <p>Hello ${name},</p>
            <p>Your verification code is:</p>
            <div class="otp-box">
              <div class="otp">${otp}</div>
              <div class="expiry">Expires in 10 minutes</div>
            </div>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 SecureVault. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
}

module.exports = {
  generateOTP,
  getOTPExpiry,
  isOTPExpired,
  sendOTPEmail,
};
