/**
 * Shared mail transport: config from env + nodemailer. No alt-server dependency.
 * Used by EmailService (in-game) and by scripts/send-test-mail.js (CLI).
 */

export interface MailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromAddress: string;
    fromName: string;
}

export function getMailConfig(): MailConfig | null {
    const host = process.env.MAIL_HOST;
    const port = parseInt(process.env.MAIL_PORT || '587', 10);
    const user = process.env.MAIL_USERNAME;
    const password = process.env.MAIL_PASSWORD;
    const fromAddress = process.env.MAIL_FROM_ADDRESS;
    const fromName = process.env.MAIL_FROM_NAME || 'GTA Server';

    const missing: string[] = [];
    if (!host || (typeof host === 'string' && host.trim() === '')) missing.push('MAIL_HOST');
    if (!user || (typeof user === 'string' && user.trim() === '')) missing.push('MAIL_USERNAME');
    if (!password || (typeof password === 'string' && password.trim() === '')) missing.push('MAIL_PASSWORD');
    if (!fromAddress || (typeof fromAddress === 'string' && fromAddress.trim() === '')) missing.push('MAIL_FROM_ADDRESS');

    if (missing.length > 0) {
        return null;
    }

    return {
        host: host!,
        port,
        secure: port === 465,
        user: user!,
        password: password!,
        fromAddress: fromAddress!,
        fromName,
    };
}

export interface SendResult {
    success: boolean;
    error?: string;
}

/**
 * Send an email using the same nodemailer transport as in-game password reset.
 * Returns { success, error? }. Does not log – caller may use alt.log or console.
 */
export async function sendMail(to: string, subject: string, textBody: string, htmlBody?: string): Promise<SendResult> {
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
            html: htmlBody ?? textBody.replace(/\n/g, '<br>'),
        });

        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}
