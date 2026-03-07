/**
 * Email service for sending transactional emails (e.g. password reset).
 * Uses shared mailTransport (same code path as scripts/send-test-mail.js).
 */

import * as alt from 'alt-server';
import { getMailConfig, sendMail as sendMailTransport, type SendResult } from './mailTransport.js';

export type { SendResult };

/**
 * Send an email. Uses the same transport as in-game password reset and CLI test script.
 */
export async function sendEmail(to: string, subject: string, textBody: string, htmlBody?: string): Promise<SendResult> {
    const config = getMailConfig();
    if (!config) {
        const missing = ['MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'].filter(
            (k) => !process.env[k]?.trim()
        );
        alt.logWarning(`[EmailService] Mail not configured. Missing or empty: ${missing.join(', ')}`);
        return { success: false, error: 'Mail not configured' };
    }

    const result = await sendMailTransport(to, subject, textBody, htmlBody);
    if (result.success) {
        alt.log(`[EmailService] Email sent to ${to}: ${subject}`);
    } else {
        alt.logError(`[EmailService] Failed to send email: ${result.error}`);
    }
    return result;
}

/** Log at module load whether mail is configured (so server logs show why reset emails might not send). */
function logMailConfigStatus(): void {
    const config = getMailConfig();
    if (config) {
        alt.log(`[EmailService] Mail configured (host: ${config.host}:${config.port}, from: ${config.fromAddress}). Password reset emails will be sent.`);
    } else {
        const missing = ['MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'].filter(
            (k) => !process.env[k]?.trim()
        );
        alt.logWarning(`[EmailService] Mail not configured. Missing or empty: ${missing.join(', ')}`);
    }
}
logMailConfigStatus();

/**
 * Send the temporary password to the user's email after a reset request.
 */
export async function sendTemporaryPasswordEmail(to: string, temporaryPassword: string): Promise<SendResult> {
    const subject = 'Your temporary password';
    const textBody = `You requested a password reset. Your temporary password is: ${temporaryPassword}\n\nYou must change this password after logging in.`;
    const htmlBody = `<p>You requested a password reset.</p><p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>You must change this password after logging in.</p>`;
    return sendEmail(to, subject, textBody, htmlBody);
}

/**
 * Send a test email to verify mail configuration. Use /testmail <email> in-game.
 */
export async function sendTestEmail(to: string): Promise<SendResult> {
    const subject = 'GTA Server – test email';
    const textBody = `This is a test email from the GTA server.\n\nIf you received this, the mail configuration (MAIL_HOST, MAIL_USERNAME, etc.) is working and password reset emails will be sent.`;
    const htmlBody = `<p>This is a test email from the GTA server.</p><p>If you received this, the mail configuration is working and password reset emails will be sent.</p>`;
    return sendEmail(to, subject, textBody, htmlBody);
}
