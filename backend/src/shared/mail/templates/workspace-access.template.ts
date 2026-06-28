/**
 * Generates a highly professional HTML template for organization switcher access OTP.
 *
 * @param email - The user's email address.
 * @param orgName - The name of the organization being switched to.
 * @param otpCode - The 6-digit access verification code.
 * @returns A string containing the formatted HTML email body.
 */
export function getWorkspaceAccessTemplate(
  email: string,
  orgName: string,
  otpCode: string,
): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Access Verification</title>
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
      background-color: #0f172a; /* Slate 900 for workspaces */
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
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      font-size: 11px;
      border-radius: 6px;
      margin-bottom: 20px;
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
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
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
      color: #0f172a;
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
        <div class="logo-text">MLHub Console</div>
      </div>
      <div class="content">
        <div class="badge">SECURITY CHALLENGE</div>
        <h1>Authorize Workspace Access</h1>
        <p>A request was made to sign into or switch workspace credentials for the organization <strong style="color: #0f172a;">${orgName}</strong> using your account (${email}).</p>
        <p>Please enter the following access verification code (OTP) to complete the security challenge:</p>
        
        <div class="code-container">
          <div class="otp-code">${otpCode}</div>
          <div class="expiry-text">This code will expire in 5 minutes.</div>
        </div>

        <p>If you did not initiate this workspace switch request, please verify your session context or contact support immediately.</p>
        
        <div class="security-notice">
          <strong>Security Notice:</strong> Always confirm the organization workspace name matches your target work environment before entering your OTP.
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">&copy; ${year} MLHub Platform. All rights reserved.</p>
        <p class="footer-text" style="margin-top: 4px;">Secure Workspace Switcher Context Challenge</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
