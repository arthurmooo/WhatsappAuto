import twilio from 'twilio';
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
}
