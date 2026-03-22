import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendOTP(email: string, otp: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasCredentials = process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD;

  const mailOptions = {
    from: `"TutorMarket" <${process.env.EMAIL_FROM || 'noreply@tutormarket.com'}>`,
    to: email,
    subject: 'Your Verification Code - TutorMarket',
    text: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #1e293b; text-align: center;">Email Verification</h2>
        <p style="color: #4b5563; text-align: center;">Use the code below to verify your account on TutorMarket.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d97706;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">This code will expire in 5 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  if (!hasCredentials) {
    console.log('-----------------------------------------');
    console.log(`📧 MOCK EMAIL SENT TO: ${email}`);
    console.log(`🔢 OTP CODE: ${otp}`);
    console.log('-----------------------------------------');
    return true;
  }

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type AdminEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendResendEmail(payload: AdminEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.log('-----------------------------------------');
    console.log(`MOCK ADMIN EMAIL TO: ${payload.to}`);
    console.log(`SUBJECT: ${payload.subject}`);
    console.log(payload.text);
    console.log('-----------------------------------------');
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || process.env.EMAIL_FROM || 'TutorMarket <onboarding@resend.dev>',
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend email error:', errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Resend transport failure:', error);
    return false;
  }
}

function buildAdminTemplate(title: string, intro: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #102033;">
      <div style="border: 1px solid #e5ecf5; border-radius: 18px; overflow: hidden;">
        <div style="padding: 20px 24px; background: linear-gradient(135deg, #102033 0%, #1f3b5c 100%); color: #f5efe4;">
          <div style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.75;">TutorMarket Admin</div>
          <h1 style="margin: 12px 0 0; font-size: 28px; line-height: 1.2;">${title}</h1>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.7;">${intro}</p>
          <div style="padding: 16px 18px; border-radius: 14px; background: #f7fafc; border: 1px solid #e5ecf5; font-size: 14px; line-height: 1.7;">
            ${body}
          </div>
          <p style="margin: 18px 0 0; font-size: 12px; color: #61758a;">If you have questions, reply to this email and the operations team will follow up.</p>
        </div>
      </div>
    </div>
  `;
}

export async function sendVerificationApprovalEmail(email: string, platformName = 'TutorMarket') {
  const subject = `🎉 Your profile is now verified on ${platformName}`;
  const text = `Your tutor profile is now verified on ${platformName}. Your public profile is live in search and your verified badge is active.`;
  const html = buildAdminTemplate(
    'You are now verified',
    `Your tutor profile has been approved on ${platformName}.`,
    'Your profile is now publicly visible in search, your verified badge is active, and students can discover and book you immediately.'
  );

  return sendResendEmail({ to: email, subject, text, html });
}

export async function sendVerificationRejectionEmail(
  email: string,
  notes: string,
  requestedDocument?: string | null
) {
  const subject = 'Action needed for your tutor verification';
  const requestLine = requestedDocument ? `<p style="margin: 12px 0 0;"><strong>Requested document:</strong> ${requestedDocument}</p>` : '';
  const text = `Your tutor verification needs updates before it can be approved.\n\nAdmin notes: ${notes}${requestedDocument ? `\nRequested document: ${requestedDocument}` : ''}`;
  const html = buildAdminTemplate(
    'Verification requires updates',
    'Your tutor application was reviewed but could not be approved yet.',
    `<p style="margin: 0;"><strong>Admin notes:</strong> ${notes}</p>${requestLine}<p style="margin: 12px 0 0;">You can resubmit after updating the requested materials.</p>`
  );

  return sendResendEmail({ to: email, subject, text, html });
}

export async function sendWarningEmail(email: string, reason: string, strikeCount: number) {
  const subject = 'Warning issued on your TutorMarket account';
  const text = `An admin warning was issued on your account.\n\nReason: ${reason}\nCurrent strike count: ${strikeCount}`;
  const html = buildAdminTemplate(
    'Account warning issued',
    'An admin warning has been recorded against your account.',
    `<p style="margin: 0;"><strong>Reason:</strong> ${reason}</p><p style="margin: 12px 0 0;"><strong>Current strike count:</strong> ${strikeCount}</p>`
  );

  return sendResendEmail({ to: email, subject, text, html });
}

export async function sendSuspensionEmail(email: string, reason: string, suspendedUntil?: Date | null) {
  const untilLabel = suspendedUntil
    ? suspendedUntil.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Until further notice';
  const subject = 'Your TutorMarket account has been suspended';
  const text = `Your account has been suspended.\n\nReason: ${reason}\nSuspended until: ${untilLabel}`;
  const html = buildAdminTemplate(
    'Account suspended',
    'Your account has been temporarily suspended.',
    `<p style="margin: 0;"><strong>Reason:</strong> ${reason}</p><p style="margin: 12px 0 0;"><strong>Suspended until:</strong> ${untilLabel}</p>`
  );

  return sendResendEmail({ to: email, subject, text, html });
}

export async function sendBanEmail(email: string, reason: string, permanent = true) {
  const subject = permanent ? 'Your TutorMarket account has been permanently banned' : 'Your TutorMarket account has been suspended';
  const text = `${permanent ? 'Your account has been permanently banned.' : 'Your account has been suspended.'}\n\nReason: ${reason}`;
  const html = buildAdminTemplate(
    permanent ? 'Account permanently banned' : 'Account suspended',
    permanent ? 'Your account has been permanently removed from active use.' : 'Your account has been temporarily suspended.',
    `<p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>`
  );

  return sendResendEmail({ to: email, subject, text, html });
}

export async function sendBookingRequestEmail(input: {
  to: string;
  tutorName: string;
  studentName: string;
  subject: string;
  scheduledAt: Date;
  durationMinutes: number;
}) {
  const scheduledLabel = input.scheduledAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const subject = 'New booking request from TutorMarket';
  const text = `${input.studentName} requested a ${input.durationMinutes}-minute ${input.subject.replace(/_/g, ' ')} lesson on ${scheduledLabel}. Review the request from your tutor dashboard.`;
  const html = buildAdminTemplate(
    'New booking request',
    `${input.studentName} has requested a new lesson with you.`,
    `<p style="margin: 0;"><strong>Subject:</strong> ${input.subject.replace(/_/g, ' ')}</p><p style="margin: 12px 0 0;"><strong>Requested time:</strong> ${scheduledLabel}</p><p style="margin: 12px 0 0;"><strong>Duration:</strong> ${input.durationMinutes} minutes</p><p style="margin: 12px 0 0;">Open your tutor dashboard to accept or decline the request.</p>`
  );

  return sendResendEmail({ to: input.to, subject, text, html });
}

export async function sendRefundDecisionEmail(
  email: string,
  details: { type: 'FULL' | 'PARTIAL'; amount: number; reason: string }
) {
  const subject = details.type === 'FULL' ? 'A full refund has been issued' : 'A partial refund has been issued';
  const text = `${details.type === 'FULL' ? 'A full refund' : 'A partial refund'} of $${details.amount.toFixed(2)} has been processed.\n\nReason: ${details.reason}`;
  const html = buildAdminTemplate(
    details.type === 'FULL' ? 'Full refund issued' : 'Partial refund issued',
    `A ${details.type === 'FULL' ? 'full' : 'partial'} refund has been processed.`,
    `<p style="margin: 0;"><strong>Refund amount:</strong> $${details.amount.toFixed(2)}</p><p style="margin: 12px 0 0;"><strong>Reason:</strong> ${details.reason}</p>`
  );

  return sendResendEmail({ to: email, subject, text, html });
}
