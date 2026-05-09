import nodemailer from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const supportEmail = 'support@carenest.lk';
const supportPhone = '+94 11 234 5678';

function buildEmailLayout(params: {
  preheader: string;
  headline: string;
  emoji?: string;
  bodyHtml: string;
}) {
  const { preheader, headline, emoji = '💚', bodyHtml } = params;

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="background:linear-gradient(120deg,#0d9488,#0891b2);padding:24px 28px;color:#ffffff;">
                  <div style="font-size:26px;font-weight:700;line-height:1.2;">${emoji} CareNest</div>
                  <div style="font-size:14px;opacity:0.95;margin-top:6px;">Maternal & Midwifery Care Platform</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <h2 style="margin:0 0 14px 0;font-size:24px;line-height:1.3;color:#0f172a;">${headline}</h2>
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;">
                  <p style="margin:0 0 10px 0;font-size:13px;color:#334155;">
                    🔗 <a href="${appUrl}" style="color:#0f766e;text-decoration:none;font-weight:600;">CareNest Website</a> &nbsp;|&nbsp;
                    👤 <a href="${appUrl}/login" style="color:#0f766e;text-decoration:none;font-weight:600;">Login</a> &nbsp;|&nbsp;
                    🏥 <a href="${appUrl}/register" style="color:#0f766e;text-decoration:none;font-weight:600;">Register</a>
                  </p>
                  <p style="margin:0;font-size:13px;color:#334155;">
                    📧 <a href="mailto:${supportEmail}" style="color:#0f766e;text-decoration:none;">${supportEmail}</a> &nbsp;|&nbsp;
                    ☎️ <a href="tel:+94112345678" style="color:#0f766e;text-decoration:none;">${supportPhone}</a>
                  </p>
                  <p style="margin:12px 0 0 0;font-size:12px;color:#64748b;">
                    Please contact your nearest MOH office for urgent maternal care support.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function isMailerConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(payload: MailPayload) {
  if (!isMailerConfigured()) {
    console.warn(`Email skipped: SMTP is not configured. Subject: ${payload.subject}`);
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function sendMotherAccountCreatedEmail(params: {
  motherName: string;
  motherEmail: string;
  loginPassword: string;
  hasAssignedMidwife: boolean;
}) {
  const { motherName, motherEmail, loginPassword, hasAssignedMidwife } = params;

  const activationLine = hasAssignedMidwife
    ? 'Your account is active and ready to use.'
    : 'Your account is created but pending activation until a midwife is assigned.';

  const accountStatusBadge = hasAssignedMidwife
    ? '<span style="display:inline-block;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">✅ Active</span>'
    : '<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">⏳ Pending Activation</span>';

  await sendEmail({
    to: motherEmail,
    subject: '✨ Your CareNest Account Is Ready',
    text: `Welcome to CareNest, ${motherName}!

Your mother account has been created.
- Login Email: ${motherEmail}
- Password: ${loginPassword}
- Status: ${hasAssignedMidwife ? 'Active' : 'Pending activation until midwife assignment'}

Sign in: ${appUrl}/login
Website: ${appUrl}
Support: ${supportEmail} | ${supportPhone}
`,
    html: buildEmailLayout({
      preheader: 'Your mother account is ready in CareNest.',
      headline: `Welcome, ${motherName}! 🎉`,
      emoji: '🤰',
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">
          Your <strong>CareNest mother account</strong> has been created successfully by the admin.
        </p>
        <div style="margin:0 0 14px 0;">${accountStatusBadge}</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 16px 0;">
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>📩 Login Email:</strong> ${motherEmail}</p>
          <p style="margin:0;font-size:14px;"><strong>🔑 Password:</strong> ${loginPassword}</p>
        </div>
        <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;">${activationLine}</p>
        <p style="margin:0 0 18px 0;">
          <a href="${appUrl}/login" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:11px 16px;">🚀 Sign in to CareNest</a>
        </p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">
          We are glad to support your maternal care journey with trusted midwifery guidance.
        </p>
      `,
    }),
  });
}

export async function sendMidwifeAssignmentEmails(params: {
  motherName: string;
  motherEmail: string;
  midwifeName: string;
  midwifeEmail: string;
}) {
  const { motherName, motherEmail, midwifeName, midwifeEmail } = params;

  await Promise.all([
    sendEmail({
      to: motherEmail,
      subject: '👩‍⚕️ Midwife Assigned to Your Care',
      text: `Hello ${motherName},

Good news! ${midwifeName} has been assigned as your midwife in CareNest.
You can now sign in and continue your maternal care journey.

Login: ${appUrl}/login
Support: ${supportEmail} | ${supportPhone}
`,
      html: buildEmailLayout({
        preheader: 'A midwife has been assigned to your CareNest account.',
        headline: 'Your Midwife Has Been Assigned 👩‍⚕️',
        emoji: '🌸',
        bodyHtml: `
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">Hello ${motherName},</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">
            Great news! <strong>${midwifeName}</strong> has been assigned as your midwife in CareNest.
          </p>
          <p style="margin:0 0 18px 0;">
            <a href="${appUrl}/login" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:11px 16px;">💬 Open CareNest</a>
          </p>
          <p style="margin:0;font-size:14px;color:#334155;">You can now sign in and continue your care journey.</p>
        `,
      }),
    }),
    sendEmail({
      to: midwifeEmail,
      subject: '🩺 New Mother Assigned to You',
      text: `Hello ${midwifeName},

${motherName} has been assigned to your care in CareNest.
Please review and begin follow-up.

Midwife Dashboard: ${appUrl}/midwife
Support: ${supportEmail} | ${supportPhone}
`,
      html: buildEmailLayout({
        preheader: 'A new mother has been assigned to your care.',
        headline: 'New Mother Assignment 🩺',
        emoji: '📋',
        bodyHtml: `
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">Hello ${midwifeName},</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">
            <strong>${motherName}</strong> has been assigned to your care in CareNest.
          </p>
          <p style="margin:0 0 18px 0;">
            <a href="${appUrl}/midwife" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:11px 16px;">📌 Open Midwife Dashboard</a>
          </p>
          <p style="margin:0;font-size:14px;color:#334155;">Please review the mother profile and begin the care follow-up process.</p>
        `,
      }),
    }),
  ]);
}

