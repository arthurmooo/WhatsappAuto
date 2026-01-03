
import { runAgent } from './agent/bot';

async function main() {
    // Mock history
    const history: any[] = [];
    // Mock Phone
    const userPhone = 'whatsapp:+33612345678';

    // Simulate user asking for appointment on next Tuesday at noon
    const input = "je voudrais prendre rdv mardi prochain à midi";

    console.log(`User: ${input}`);
    console.log('Bot is thinking...');

    // We capture console.log to see tool calls or modifications
    // ideally runAgent logs "Executing tool ..."

    const response = await runAgent(input, userPhone, history);

    console.log(`Bot: ${response}`);
}

main().catch(console.error);
