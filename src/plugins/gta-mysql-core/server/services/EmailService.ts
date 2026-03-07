/**
 * Email service for sending transactional emails (e.g. password reset).
 * Configuration is read from .env: MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_FROM_NAME.
 */

import * as alt from 'alt-server';

export interface MailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromAddress: string;
    fromName: string;
}

function getMailConfig(): MailConfig | null {
    const host = process.env.MAIL_HOST;
    const port = parseInt(process.env.MAIL_PORT || '587', 10);
    const user = process.env.MAIL_USERNAME;
    const password = process.env.MAIL_PASSWORD;
    const fromAddress = process.env.MAIL_FROM_ADDRESS;
    const fromName = process.env.MAIL_FROM_NAME || 'GTA Server';

    const missing: string[] = [];
    if (!host || host.trim() === '') missing.push('MAIL_HOST');
    if (!user || (typeof user === 'string' && user.trim() === '')) missing.push('MAIL_USERNAME');
    if (!password || (typeof password === 'string' && password.trim() === '')) missing.push('MAIL_PASSWORD');
    if (!fromAddress || (typeof fromAddress === 'string' && fromAddress.trim() === '')) missing.push('MAIL_FROM_ADDRESS');

    if (missing.length > 0) {
        alt.logWarning(`[EmailService] Mail not configured. Missing or empty in .env: ${missing.join(', ')}. Set these to send password reset emails.`);
        return null;
    }

    return {
        host,
        port,
        secure: port === 465,
        user,
        password,
        fromAddress,
        fromName,
    };
}

export interface SendResult {
    success: boolean;
    error?: string;
}

/**
 * Send an email. Returns success/failure. If MAIL_* env vars are not set, returns failure without throwing.
 */
export async function sendEmail(to: string, subject: string, textBody: string, htmlBody?: string): Promise<SendResult> {
    const config = getMailConfig();
    if (!config) {
        return { success: false, error: 'Mail not configured' };
    }

    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            requireTLS: !config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        await transporter.sendMail({
            from: `"${config.fromName}" <${config.fromAddress}>`,
            to,
            subject,
            text: textBody,
            html: htmlBody || textBody.replace(/\n/g, '<br>'),
        });

        alt.log(`[EmailService] Email sent to ${to}: ${subject}`);
        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alt.logError(`[EmailService] Failed to send email: ${message}`);
        return { success: false, error: message };
    }
}

/** Log at module load whether mail is configured (so server logs show why reset emails might not send). */
function logMailConfigStatus(): void {
    const config = getMailConfig();
    if (config) {
        alt.log(`[EmailService] Mail configured (host: ${config.host}:${config.port}, from: ${config.fromAddress}). Password reset emails will be sent.`);
    }
    // If not configured, getMailConfig() already logged missing vars
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
