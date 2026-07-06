export function getOrganizationInvitationTemplate(
  inviteeName: string,
  orgName: string,
  role: string,
  inviterName: string,
): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f7fb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f4f7fb;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #dbe4f0;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      padding: 32px 28px;
      text-align: center;
    }
    .brand {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .content {
      padding: 36px 32px;
      color: #334155;
    }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 11px;
      border-radius: 999px;
      margin-bottom: 18px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 14px 0;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.7;
      color: #475569;
      margin: 0 0 18px 0;
    }
    .panel {
      background-color: #f8fbff;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      padding: 20px;
      margin: 24px 0;
    }
    .panel-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .panel-value {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .role-chip {
      display: inline-block;
      margin-top: 12px;
      padding: 6px 12px;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
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
      line-height: 1.6;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand">MLHub Console</div>
      </div>
      <div class="content">
        <div class="badge">Organization Invitation</div>
        <h1>You have been invited to join ${orgName}</h1>
        <p>Hello ${inviteeName},</p>
        <p><strong>${inviterName}</strong> has invited you to collaborate inside the organization <strong style="color:#0f172a;">${orgName}</strong> on MLHub.</p>

        <div class="panel">
          <div class="panel-label">Assigned Workspace Role</div>
          <p class="panel-value">${role}</p>
          <div class="role-chip">Access will apply to the ${orgName} workspace</div>
        </div>

        <p>After signing in to your account, you can open the organization workspace and start collaborating based on the permissions attached to your role.</p>
        <p>If you were not expecting this invitation, you can safely ignore this message.</p>
      </div>
      <div class="footer">
        <p class="footer-text">&copy; ${year} MLHub Platform. All rights reserved.</p>
        <p class="footer-text" style="margin-top: 4px;">Professional collaborative ML workspace invitations</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
