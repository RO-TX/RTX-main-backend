import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.MAIL_HOST || !env.MAIL_AUTH || !env.MAIL_PASS) {
    return null; // not configured — caller falls back to logging
  }
  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465,
    auth: { user: env.MAIL_AUTH, pass: env.MAIL_PASS },
  });
  return transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email. If SMTP isn't configured (e.g. local dev), it logs the message
 * instead of failing — so OTP/reset flows remain testable without a mail server.
 */
export async function sendMail(opts: MailOptions): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logger.warn(`[mailer] SMTP not configured — would send to ${opts.to}: "${opts.subject}"`);
    logger.debug(`[mailer] body:\n${opts.text ?? opts.html}`);
    return;
  }
  await tx.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  logger.info(`[mailer] sent "${opts.subject}" to ${opts.to}`);
}

/* ── Branded templates ── */

export function otpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: `Your ${env.COMPANY_NAME} verification code`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1e3a8a">${env.COMPANY_NAME}</h2>
        <p>Use the code below to verify your email. It expires in <b>10 minutes</b>.</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1e40af;
                    background:#eff6ff;padding:16px;text-align:center;border-radius:8px">${code}</div>
        <p style="color:#64748b;font-size:13px">If you didn't request this, you can ignore this email.</p>
      </div>`,
  };
}

export function resetEmail(link: string): { subject: string; html: string; text: string } {
  return {
    subject: `Reset your ${env.COMPANY_NAME} password`,
    text: `Reset your password using this link (valid 1 hour): ${link}`,
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1e3a8a">${env.COMPANY_NAME}</h2>
        <p>We received a request to reset your password. This link is valid for <b>1 hour</b>.</p>
        <p><a href="${link}" style="display:inline-block;background:#1e40af;color:#fff;
              padding:12px 20px;border-radius:8px;text-decoration:none">Reset Password</a></p>
        <p style="color:#64748b;font-size:13px">If you didn't request this, you can ignore this email.</p>
      </div>`,
  };
}
