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

    if (!host || !user || !password || !fromAddress) {
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
        alt.logWarning('[EmailService] Mail not configured. Set MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS in .env');
        return { success: false, error: 'Mail not configured' };
    }

    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
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

/**
 * Send the temporary password to the user's email after a reset request.
 */
export async function sendTemporaryPasswordEmail(to: string, temporaryPassword: string): Promise<SendResult> {
    const subject = 'Your temporary password';
    const textBody = `You requested a password reset. Your temporary password is: ${temporaryPassword}\n\nYou must change this password after logging in.`;
    const htmlBody = `<p>You requested a password reset.</p><p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>You must change this password after logging in.</p>`;
    return sendEmail(to, subject, textBody, htmlBody);
}
