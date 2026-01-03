import express from 'express';
import { config } from './config';
import { runAgent } from './agent/bot';
import { WhatsAppService } from './services/whatsapp';

const app = express();
app.use(express.urlencoded({ extended: true })); // Twilio sends form-urlencoded

const whatsappService = new WhatsAppService();

// In-memory session storage (Replace with Redis/DB in production)
const sessions = new Map<string, any[]>();

app.post('/webhook/whatsapp', async (req, res) => {
    const { Body, From } = req.body;

    console.log(`Received message from ${From}: ${Body}`);

    // 1. Acknowledge Twilio immediately to avoid timeout
    res.status(200).send('<Response></Response>');

    // 2. Process in background
    try {
        // Get history
        const history = sessions.get(From) || [];

        // Run Agent
        const responseText = await runAgent(Body, From, history);

        if (responseText) {
            // Update history (User + Assistant)
            history.push({ role: 'user', content: Body });
            history.push({ role: 'assistant', content: responseText });

            // Limit history size to last 20 messages
            if (history.length > 20) history.splice(0, history.length - 20);
            sessions.set(From, history);

            // Send Response
            await whatsappService.sendMessage(From, responseText);
        }

    } catch (error) {
        console.error('Error processing message:', error);
        // Optional: Send error message to user
    }
});

const PORT = config.port;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
