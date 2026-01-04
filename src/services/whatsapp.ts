import twilio from 'twilio';
import axios from 'axios';
import { config } from '../config';

export class WhatsAppService {
    private client: twilio.Twilio;
    private fromNumber: string;

    constructor() {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
        this.fromNumber = config.twilio.phoneNumber || '';
    }

    async sendMessage(to: string, body: string) {
        try {
            await this.client.messages.create({
                from: this.fromNumber,
                to: to,
                body: body,
            });
            console.log(`Message sent to ${to}`);
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw new Error('Failed to send message');
        }
    }

    async sendTypingIndicator(messageSid: string) {
        try {
            const url = 'https://messaging.twilio.com/v2/Indicators/Typing.json';
            const auth = Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64');

            await axios.post(url,
                new URLSearchParams({
                    channel: 'whatsapp',
                    messageId: messageSid
                }), {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            console.log(`Typing indicator sent for message ${messageSid}`);
        } catch (error) {
            console.error('Error sending typing indicator:', error);
            // Non-blocking error, so we don't throw
        }
    }
}
