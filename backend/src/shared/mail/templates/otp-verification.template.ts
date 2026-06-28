/**
 * Generates a highly professional HTML template for user account verification OTP.
 *
 * @param fullName - The full name of the registering user.
 * @param otpCode - The 6-digit verification code.
 * @returns A string containing the formatted HTML email body.
 */
export function getOtpVerificationTemplate(
  fullName: string,
  otpCode: string,
): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Account</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background-color: #4f46e5;
      padding: 32px 24px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin: 0;
    }
    .content {
      padding: 40px 32px;
      color: #334155;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .code-container {
      background-color: #f1f5f9;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #4f46e5;
      margin: 0;
    }
    .expiry-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 8px;
      font-weight: 500;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 32px;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0;
    }
    .security-notice {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-text">MLHub</div>
      </div>
      <div class="content">
        <h1>Verify Your Account, ${fullName}</h1>
        <p>Thank you for registering on MLHub. To complete your sign-up process and verify your email address, please use the 6-digit verification code below:</p>
        
        <div class="code-container">
          <div class="otp-code">${otpCode}</div>
          <div class="expiry-text">This code will expire in 15 minutes.</div>
        </div>

        <p>If you did not request this verification code, please ignore this email. Your password is secure, and no action is required.</p>
        
        <div class="security-notice">
          <strong>Security Notice:</strong> Never share this verification code with anyone. MLHub support representatives will never ask for your code.
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">&copy; ${year} MLHub Platform. All rights reserved.</p>
        <p class="footer-text" style="margin-top: 4px;">Unified ML Deployment and Marketplace Infrastructure</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
