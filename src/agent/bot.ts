import OpenAI from 'openai';
import { config } from '../config';
import { CalComService } from '../services/calcom';
import { addDays } from 'date-fns';
import { format as formatZoned } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

const openai = new OpenAI({
    apiKey: config.openai.apiKey,
});

const calComService = new CalComService();

// Define Tools
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'checkAvailability',
            description: 'Check for available appointment slots in a given time range.',
            parameters: {
                type: 'object',
                properties: {
                    startTime: { type: 'string', description: 'Start time in ISO 8601 format' },
                    endTime: { type: 'string', description: 'End time in ISO 8601 format' },
                },
                required: ['startTime', 'endTime'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'createBooking',
            description: 'Book an appointment for the patient.',
            parameters: {
                type: 'object',
                properties: {
                    startTime: { type: 'string', description: 'Selected slot start time in ISO 8601 format' },
                    name: { type: 'string', description: 'Patient name' },
                    email: { type: 'string', description: 'Patient email' },
                    description: { type: 'string', description: 'Reason for visit' },
                    phoneNumber: { type: 'string', description: 'Patient phone number (WhatsApp ID)' },
                },
                required: ['startTime', 'name', 'email', 'description', 'phoneNumber'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cancelBooking',
            description: 'Cancel an existing appointment. CRITICAL: This tool ONLY works if you have a valid numeric bookingId. If the user wants to cancel or modify, ALWAYS call getBookings first to find their active appointments and get the correct ID. NEVER invent an ID.',
            parameters: {
                type: 'object',
                properties: {
                    bookingId: { type: 'number', description: 'The exact numeric ID from getBookings response.' },
                    reason: { type: 'string', description: 'Reason for cancellation (optional)' },
                },
                required: ['bookingId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getBookings',
            description: 'Retrieve existing ACTIVE bookings for the patient. Use this to find the booking ID before calling cancelBooking. If the result is empty, the user has no active bookings to cancel/modify.',
            parameters: {
                type: 'object',
                properties: {
                    email: { type: 'string', description: 'Optional: Search by email if the WhatsApp ID lookup fails or for proxy cancellations.' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getDayOfWeek',
            description: 'Get the correct day of the week for a specific date. USE THIS ALWAYS for dates that are not in the 14-day context calendar.',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: 'Date in format YYYY-MM-DD' },
                },
                required: ['date'],
            },
        },
    },
];

// Function to validate day-date combinations in user messages and detect mismatches
function validateDayDateInMessage(message: string): string | null {
    const today = new Date();
    const timeZone = 'Europe/Paris';

    // Map French day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const frenchDays: { [key: string]: number } = {
        'dimanche': 0, 'lundi': 1, 'mardi': 2, 'mercredi': 3,
        'jeudi': 4, 'vendredi': 5, 'samedi': 6
    };

    // Map French months to month numbers (0-indexed)
    const frenchMonths: { [key: string]: number } = {
        'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3,
        'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'aout': 7,
        'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11
    };

    const dayNames = Object.keys(frenchDays).join('|');
    const monthNames = Object.keys(frenchMonths).join('|');

    // Regex to match patterns like "mardi 8 janvier" or "le mercredi 12 janvier"
    const regex = new RegExp(`(${dayNames})\\s+(\\d{1,2})\\s+(${monthNames})`, 'gi');

    let match;
    while ((match = regex.exec(message.toLowerCase())) !== null) {
        const mentionedDay = match[1].toLowerCase();
        const dateNum = parseInt(match[2]);
        const monthName = match[3].toLowerCase();

        const month = frenchMonths[monthName];
        if (month === undefined) continue;

        // Construct the date (assume current year or next year)
        let year = today.getFullYear();
        const testDate = new Date(year, month, dateNum);

        // If the date is in the past, try next year
        if (testDate < today) {
            testDate.setFullYear(year + 1);
            year++;
        }

        // Get the actual day of the week for this date
        const actualDayNum = testDate.getDay();
        const expectedDayNum = frenchDays[mentionedDay];

        if (actualDayNum !== expectedDayNum) {
            // Find the correct day name
            const actualDayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            const correctDayName = actualDayNames[actualDayNum];

            // Format dates for suggestion
            const correctDate = formatZoned(testDate, 'd MMMM yyyy', { locale: fr, timeZone });

            // Find the actual date for the mentioned day (next occurrence)
            let nextCorrectDayDate = new Date(today);
            while (nextCorrectDayDate.getDay() !== expectedDayNum || nextCorrectDayDate <= today) {
                nextCorrectDayDate = addDays(nextCorrectDayDate, 1);
            }
            const alternativeDate = formatZoned(nextCorrectDayDate, 'd MMMM yyyy', { locale: fr, timeZone });

            return `⚠️ ATTENTION: Le ${dateNum} ${monthName} ${year} est un ${correctDayName.toUpperCase()}, pas un ${mentionedDay}. ` +
                `Voulez-vous dire le ${correctDayName} ${correctDate} ou le ${mentionedDay} ${alternativeDate} ?`;
        }
    }

    return null; // No mismatch detected
}

// function processUserMessage removed


export async function runAgent(userMessage: string, userPhone: string, history: any[]) {
    // First, check for day-date mismatches and return correction immediately if found
    console.log(`[DEBUG] Received message: "${userMessage}" from ${userPhone}`);
    const dateValidationError = validateDayDateInMessage(userMessage);
    if (dateValidationError) {
        console.log('[DEBUG] Date validation error detected:', dateValidationError);
        return dateValidationError;
    }

    const today = new Date();
    const timeZone = 'Europe/Paris';
    console.log(`[DEBUG] Current time: ${today.toISOString()}, Timezone: ${timeZone}`);

    // Generate a complete calendar for the next 14 days to prevent date hallucination
    const calendarDays: string[] = [];
    const dayNameToDate: { [key: string]: string[] } = {
        'lundi': [],
        'mardi': [],
        'mercredi': [],
        'jeudi': [],
        'vendredi': [],
        'samedi': [],
        'dimanche': []
    };

    for (let i = 0; i <= 14; i++) {
        const day = addDays(today, i);
        const fullDate = formatZoned(day, 'EEEE d MMMM yyyy', { locale: fr, timeZone });
        const dayName = formatZoned(day, 'EEEE', { locale: fr, timeZone }).toLowerCase();
        const dateNum = formatZoned(day, 'd MMMM', { locale: fr, timeZone });

        const label = i === 0 ? ' ← AUJOURD\'HUI' : i === 1 ? ' ← DEMAIN' : '';
        calendarDays.push(`  • ${fullDate}${label}`);

        // Build reverse lookup
        if (dayNameToDate[dayName]) {
            dayNameToDate[dayName].push(dateNum);
        }
    }

    // Create explicit day-to-date mapping
    const dayMapping = Object.entries(dayNameToDate)
        .filter(([_, dates]) => dates.length > 0)
        .map(([day, dates]) => `  ${day.toUpperCase()} = ${dates.join(' ou ')}`)
        .join('\n');

    const dateContext = `
═══════════════════════════════════════════════════════
CALENDRIER OFFICIEL (14 prochains jours)
═══════════════════════════════════════════════════════
${calendarDays.join('\n')}

═══════════════════════════════════════════════════════
CORRESPONDANCE JOUR → DATE (à vérifier AVANT de répondre)
═══════════════════════════════════════════════════════
${dayMapping}

Heure actuelle: ${formatZoned(today, 'HH:mm', { timeZone })}
═══════════════════════════════════════════════════════`;

    const systemPrompt = `
    Tu es l'assistant du Dr. Mô (masseur-kinésithérapeute), secrétaire médical virtuel d'élite.
    TON: Professionnel, chaleureux, empathique et directif quand nécessaire.

    ${dateContext}

    USER PHONE (WhatsApp ID): ${userPhone}

    ═══════════════════════════════════════════════════════
    🏠 INTRODUCTION (IMPORTANT)
    ═══════════════════════════════════════════════════════
    Lors de votre tout premier message (si l'historique est vide), présentez-vous systématiquement : "Bonjour, je suis l'assistant du kiné Mô."

    ═══════════════════════════════════════════════════════
    🚨 PROTOCOLES PRIORITAIRES & SÉCURITÉ
    ═══════════════════════════════════════════════════════
    1. URGENCE VITALE (Danger de mort imminent) :
       - Si ex: "crise cardiaque", "hémorragie", "ne respire plus".
       - ACTION : Répondre "⚠️ Contactez le SAMU (15) immédiatement."

    2. SÉCURITÉ PERSONA (Cadre strict) :
       - Tu es un assistant médical, PAS un ami ni une IA générique.
       - REFUSE les demandes hors-sujet (blagues, recettes, politique).
       - MAIS sois EMPATHIQUE avec les seniors ou les personnes en difficulté :
         - Si l'utilisateur semble âgé, a du mal à écrire, ou demande un rappel :
         - NE DIS PAS "Je ne peux pas".
         - DIS : "Ne vous inquiétez pas [Nom si connu]. Le Dr Mô est en consultation, mais vous pouvez joindre le secrétariat au 04 50 XX XX XX."

    ═══════════════════════════════════════════════════════
    🧠 BASE DE CONNAISSANCES (Répondre directement)
    ═══════════════════════════════════════════════════════
    - ADRESSE : "Au centre de la Vallée de l'Arve" (si demandé : parking gratuit devant).
    - DOCUMENTS : "Carte Vitale et ordonnance si vous en avez une."
    - PRIX/REMBOURSEMENT : "Tarifs secteur 1 conventionné."
    - AVIS MÉDICAL : "Je ne suis pas médecin, seul le Dr Mô peut vous donner un avis médical en consultation."
    ➜ RELANCE SYSTÉMATIQUE : Après avoir donné une info, termine TOUJOURS par : "Souhaitez-vous prendre rendez-vous ?"

    ═══════════════════════════════════════════════════════
    🛑 RÈGLES DE VALIDATION (ANTI-HALLUCINATIONS)
    ═══════════════════════════════════════════════════════
    1. DATES & HORAIRES :
       - INTERDICTION FORMELLE d'inventer des créneaux.
       - Ne propose JAMAIS un créneau sans avoir appelé 'checkAvailability' AVANT.
       - Supposons que le dimanche est FERMÉ sauf si 'checkAvailability' dit le contraire.
       - Si le patient demande "Dimanche ?", dis : "Je vérifie..." -> Check -> (Vide) -> "Désolé, le cabinet est fermé le dimanche."
       - Rappel : Tous les créneaux s'entendent en Heure de Paris.
    
    2. RÉSERVATION (CreateBooking) :
       - ⛔️ INTERDICTION d'appeler createBooking SANS avoir CLAIREMENT collecté le NOM COMPLET et l'EMAIL.
       - Si l'utilisateur dit "Ok pour 10h", tu DOIS répondre : "Parfait, je bloque le créneau de 10h. Pour confirmer, j'ai besoin de votre nom complet et de votre email."
       - Ne tente jamais de deviner l'email ou de mettre un placeholder.

    ═══════════════════════════════════════════════════════
    🚜 GUIDELINES OPÉRATIONNELLES
    ═══════════════════════════════════════════════════════
    1. PRIS DE RDV PROACTIVE :
       - Si demande vague ("RDV semaine pro") -> Appelle 'checkAvailability' tout de suite.
       - Propose 3-5 créneaux précis.
    2. ANNULATION :
       - Demande si c'est pour l'utilisateur ou un tiers. Si tiers -> demander Email.
       - Utilise 'getBookings' pour voir les détails (date/heure).
       - RÈGLE DES 24H : Si le rendez-vous est dans moins de 24h par rapport à maintenant, REFUSEZ l'annulation ou la modification en ligne.
         Dites : "Désolé, l'annulation n'est plus possible en ligne moins de 24h avant le rendez-vous car le praticien ne peut plus combler ce créneau. Merci d'appeler directement le cabinet au 04 50 XX XX XX."
       - MISE EN GARDE (OBLIGATOIRE) : Avant d'annuler un rendez-vous (si > 24h), vous DEVEZ envoyer ce message exact : "⚠️ Attention, vous allez annuler votre rendez-vous. Voulez-vous confirmer ?"
       - Attendez la confirmation explicite de l'utilisateur avant d'appeler 'cancelBooking'.

    3. CONFIRMATION / ANNULATION / MODIFICATION :
        - Récapitule toujours : Date, Heure, Nom avant de confirmer définitivement.
        - Pour CHAQUE action réussie (Réservation, Annulation, Modification), terminez TOUJOURS par : "Merci de votre confiance."
        - À chaque fois qu'un rendez-vous est confirmé, annulé ou déplacé, ajoutez TOUJOURS ce lien à la fin de votre message pour que l'utilisateur puisse vérifier le calendrier : https://calendar.google.com/calendar/embed?src=a0a65a83d9a5195d9aca4addad8a9238b6bb3edcb9f67b91f887d6e93c4d61db%40group.calendar.google.com&ctz=Europe%2FParis
    
    `;


    let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage }
    ];

    let loopCount = 0;
    while (loopCount < 5) { // Max 5 turns
        console.log(`[DEBUG] Loop ${loopCount + 1}: Sending request to OpenAI (model: gpt-4o-mini)...`);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            tools: tools,
            tool_choice: 'auto',
        });

        const message = completion.choices[0].message;
        console.log(`[DEBUG] OpenAI response received. Tool calls: ${message.tool_calls ? message.tool_calls.length : 0}`);
        messages.push(message);

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                let result;

                console.log(`Executing tool ${toolCall.function.name}`);

                try {
                    if (toolCall.function.name === 'checkAvailability') {
                        result = await calComService.getAvailability(args.startTime, args.endTime);
                    } else if (toolCall.function.name === 'createBooking') {
                        result = await calComService.createBooking(args.startTime, args.name, args.email, args.description, args.phoneNumber);
                    } else if (toolCall.function.name === 'cancelBooking') {
                        console.log(`[DEBUG] Calling cancelBooking for ID: ${args.bookingId}`);

                        // Enforce 24h rule in code as a final safety measure
                        const bookingsData = await calComService.getBookings(undefined, userPhone);
                        const booking = bookingsData.bookings.find((b: any) => b.id === args.bookingId);

                        if (booking && booking.rawStartTime) {
                            const startTime = new Date(booking.rawStartTime);
                            const now = new Date();
                            const diffInHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                            if (diffInHours < 24 && diffInHours > -1) { // -1 to allow cancelling just passed RDVs if needed, but standard is > 0
                                console.log(`[DEBUG] Cancellation blocked: Appointment is in ${diffInHours.toFixed(1)} hours.`);
                                result = {
                                    success: false,
                                    error: "POLITIQUE_24H",
                                    message: "Désolé, l'annulation n'est plus possible en ligne moins de 24h avant le rendez-vous car le praticien ne peut plus combler ce créneau. Merci d'appeler directement le cabinet au 04 50 XX XX XX."
                                };
                            } else {
                                result = await calComService.cancelBooking(args.bookingId, args.reason);
                            }
                        } else {
                            result = await calComService.cancelBooking(args.bookingId, args.reason);
                        }

                    } else if (toolCall.function.name === 'getBookings') {
                        console.log(`[DEBUG] Calling getBookings for email: ${args.email}, phone: ${userPhone}`);
                        result = await calComService.getBookings(args.email, userPhone);
                    } else if (toolCall.function.name === 'getDayOfWeek') {
                        const date = new Date(args.date);
                        const dayName = formatZoned(date, 'EEEE', { locale: fr, timeZone: 'Europe/Paris' });
                        const fullDate = formatZoned(date, 'EEEE d MMMM yyyy', { locale: fr, timeZone: 'Europe/Paris' });
                        result = { dayOfWeek: dayName, fullDate: fullDate, message: `The date ${args.date} is a ${dayName.toUpperCase()}` };
                    }
                    console.log(`[DEBUG] Tool ${toolCall.function.name} result:`, JSON.stringify(result));
                } catch (e: any) {
                    console.error(`[ERROR] Tool ${toolCall.function.name} failed:`, e.message);
                    result = { error: e.message };
                }

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
            }
        } else {
            const finalContent = message.content || "Je n'ai pas pu générer de réponse. Réessayez.";
            console.log(`[DEBUG] Returning content: "${finalContent.substring(0, 50)}..."`);
            return finalContent;
        }
        loopCount++;
    }
    return "Je suis désolé, je tourne en rond. Contactez le cabinet directement.";
}
