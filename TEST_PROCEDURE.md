# Test & Launch Procedures

## 1. Local Development (Console)
To test the bot's logic without using WhatsApp/Twilio:
```bash
npm run console
```

## 2. WhatsApp Testing (Full Integration)
To test the bot directly on WhatsApp, you need to expose your local server to the internet.

### Step A: Start the Server
```bash
npm run dev
```
*The server will run on [http://localhost:3000](http://localhost:3000).*

### Step B: Start Ngrok
In a new terminal:
```bash
ngrok http 3000
```
*Copy the **Forwarding** URL (e.g., `https://xxxx-xxxx.ngrok-free.app`).*

### Step C: Update Twilio Webhook
1. Log in to your [Twilio Console](https://console.twilio.com/).
2. Go to **Messaging > Try it Out > Send a WhatsApp message** (if using Sandbox) OR **Phone Numbers > Manage > Active Numbers**.
3. Locate the **Webhook** section for "A message comes in".
4. Replace the existing URL with: `https://xxxx-xxxx.ngrok-free.app/webhook/whatsapp`
5. Save changes.

## 3. Environment Check
Ensure your `.env` file contains:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `CALCOM_API_KEY`
- `OPENAI_API_KEY`
