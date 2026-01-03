import readline from 'readline';
import { runAgent } from './agent/bot';

// Mock history
const history: any[] = [];
// Mock Phone
const userPhone = 'whatsapp:+33612345678';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('--- Dr. Mô Bot Test Console ---');
console.log('Type your message and press Enter. Type "exit" to quit.');

const ask = () => {
    rl.question('You: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
            rl.close();
            return;
        }

        try {
            console.log('Bot is thinking...');
            const response = await runAgent(input, userPhone, history);

            console.log(`Bot: ${response}`);

            // Update local history
            history.push({ role: 'user', content: input });
            history.push({ role: 'assistant', content: response });

        } catch (error) {
            console.error('Error:', error);
        }

        ask();
    });
};

ask();
