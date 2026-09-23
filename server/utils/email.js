const nodemailer = require("nodemailer");

/**
 * Email sending.
 *
 * - When EMAIL_HOST is configured: a single pooled SMTP transporter is created
 *   and the connection is verified once at boot (status is logged).
 * - When EMAIL_HOST is empty (local dev): a mock transport prints the message
 *   to the server console with a loud warning, so verification codes remain
 *   testable without a real SMTP account — and it is obvious no real email went out.
 *
 * Use `sendEmail` when a failure should surface to the caller, and
 * `sendEmailSafe` for fire-and-forget sends (never throws).
 */

const isConfigured = Boolean(process.env.EMAIL_HOST);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: process.env.EMAIL_USER
        ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        : undefined,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    })
  : null;

// Boot-time connection check — never crashes the server.
if (transporter) {
  transporter
    .verify()
    .then(() =>
      console.log(`✅ SMTP ready: emails will be sent via ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT || 587}`)
    )
    .catch((err) =>
      console.warn(
        `⚠️ SMTP connection check FAILED (${err.message}).\n` +
          `   Emails will fail until EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS in server/.env are corrected.`
      )
    );
} else {
  console.warn(
    "⚠️ EMAIL NOT CONFIGURED (EMAIL_HOST is empty in server/.env).\n" +
      "   No real emails will be sent — verification/reset codes are printed to this console only."
  );
}

const sendEmail = async ({ to, subject, text, html }) => {
  const message = {
    from: process.env.EMAIL_FROM || "Yoyo <no-reply@yoyo.example>",
    to,
    subject,
    text,
    html,
  };

  if (!transporter) {
    console.log("\n📧 ⚠️  MOCK EMAIL — NOT SENT (EMAIL_HOST is not configured) ⚠️");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html || ""}`);
    console.log("──────────────────────────────────────────\n");
    return { mock: true };
  }

  return transporter.sendMail(message);
};

/**
 * Fire-and-forget wrapper: never throws. Returns
 * { sent: boolean, mock?: boolean, error?: string }.
 */
const sendEmailSafe = async (opts) => {
  try {
    const info = await sendEmail(opts);
    return { sent: !info.mock, mock: Boolean(info.mock) };
  } catch (err) {
    console.error(`❌ Email send failed to ${opts.to}: ${err.message}`);
    return { sent: false, error: err.message };
  }
};

module.exports = { sendEmail, sendEmailSafe, isEmailConfigured: isConfigured };
