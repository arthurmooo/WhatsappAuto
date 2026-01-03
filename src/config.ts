import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    calcom: {
        apiKey: process.env.CALCOM_API_KEY,
        eventTypeId: process.env.CALCOM_EVENT_TYPE_ID,
    }
};

// Validate critical config
const missingKeys = [];
if (!config.openai.apiKey) missingKeys.push('OPENAI_API_KEY');
if (!config.twilio.accountSid) missingKeys.push('TWILIO_ACCOUNT_SID');
if (!config.twilio.authToken) missingKeys.push('TWILIO_AUTH_TOKEN');
if (!config.twilio.phoneNumber) missingKeys.push('TWILIO_PHONE_NUMBER');
if (!config.calcom.apiKey) missingKeys.push('CALCOM_API_KEY');
if (!config.calcom.eventTypeId) missingKeys.push('CALCOM_EVENT_TYPE_ID');

if (missingKeys.length > 0) {
    console.warn(`Missing configuration keys: ${missingKeys.join(', ')}. The app may not function correctly.`);
}
