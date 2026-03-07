#!/usr/bin/env node
/**
 * Send a test email using the same transport as in-game password reset (mailTransport).
 * Usage: node scripts/send-test-mail.js <email>
 * Example: node scripts/send-test-mail.js pavlik@upanet.org
 */
import 'dotenv/config';
import { getMailConfig, sendMail } from '../resources/core/plugins/gta-mysql-core/server/mailTransport.js';

const to = process.argv[2];
if (!to || !to.includes('@')) {
    console.error('Usage: node scripts/send-test-mail.js <email>');
    process.exit(1);
}

if (!getMailConfig()) {
    const missing = ['MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'].filter(
        (k) => !process.env[k]?.trim()
    );
    console.error('Mail not configured. Set in .env or docker-compose: ' + missing.join(', '));
    process.exit(1);
}

const subject = 'GTA Server – test email';
const textBody = `This is a test email from the GTA server.\n\nIf you received this, the mail configuration is working and password reset emails will be sent.`;
const htmlBody = `<p>This is a test email from the GTA server.</p><p>If you received this, the mail configuration is working and password reset emails will be sent.</p>`;

const result = await sendMail(to, subject, textBody, htmlBody);
if (result.success) {
    console.log('Test email sent to', to);
} else {
    console.error('Failed to send:', result.error);
    process.exit(1);
}
