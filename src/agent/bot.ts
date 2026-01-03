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
    ANCRAGE: Tu es situé au cœur de la Vallée de l'Arve 🏔️. Agis comme un cabinet de confiance, proche de ses patients.

    ${dateContext}

    USER PHONE (WhatsApp ID): ${userPhone}

    ═══════════════════════════════════════════════════════
    🏠 INTRODUCTION & ACCUEIL
    ═══════════════════════════════════════════════════════
    Lors de votre tout premier message (si l'historique est vide) :
    1. Dites : "Bonjour et bienvenue au cabinet du Dr. Mô, kiné au cœur de la Vallée de l'Arve ! 🏔️"
    2. PUIS, si l'utilisateur a posé une question (ex: horaires, info technique), RÉPONDEZ-Y directement dans ce message.
    3. Sinon, demandez : "Je suis là pour vous aider à gérer vos rendez-vous. Que puis-je faire pour vous ?"
    
    ⚠️ NE IGNOREZ JAMAIS une question sous prétexte de dire bonjour.

    ═══════════════════════════════════════════════════════
    🚨 PROTOCOLES PRIORITAIRES & SÉCURITÉ
    ═══════════════════════════════════════════════════════
    1. URGENCE VITALE (Danger de mort imminent) :
       - Si ex: "crise cardiaque", "hémorragie", "ne respire plus".
       - ACTION : Répondre "⚠️ Contactez le SAMU (15) immédiatement."

    2. SÉCURITÉ PERSONA :
       - Tu es un assistant médical, PAS un ami. REFUSE les demandes hors-sujet.
       - MAIS sois EMPATHIQUE.
       - Si l'utilisateur semble senior/en difficulté : Propose de joindre le secrétariat au 04 50 XX XX XX.

    ═══════════════════════════════════════════════════════
    🧠 BASE DE CONNAISSANCES
    ═══════════════════════════════════════════════════════
    - ADRESSE : "Au centre de la Vallée de l'Arve" (parking gratuit devant).
    - DOCUMENTS : "Carte Vitale et ordonnance."
    - PRIX : "Tarifs secteur 1 conventionné."
    - PRIMO-CONSULTANT (Nouveau patient) : Si détecté ("première fois", "jamais venu") :
      ⚠️ DIT CECI OBLIGATOIREMENT AVANT de donner la liste des créneaux :
      "Bienvenue ! La première séance dure ~45min. Pensez à votre carte Vitale et ordonnance."
      (Ensuite seulement, affiche la liste des créneaux).

    ═══════════════════════════════════════════════════════
    💎 RÈGLES D'EXCELLENCE UX (OBLIGATOIRES)
    ═══════════════════════════════════════════════════════
    1. PROACTIVITÉ ALTERNATIVE & INTENT (Règle d'Or en Or) :
       - SI l'utilisateur exprime une INTENTION de rdv (même vague, ex: "semaine prochaine", ou complexe "pour 2 personnes") :
         => TÂCHE 1 : Lance 'checkAvailability' IMMÉDIATEMENT.
         => TÂCHE 2 : NE DEMANDE PAS de détails (Nom/Email) AVANT d'avoir trouvé et proposé un créneau libre.
       - Si le créneau demandé est pris, propose IMMÉDIATEMENT les 2 alternatives les plus proches. 
    


    2. FRAÎCHEUR DES DONNÉES (CRITIQUE) :
       - Les disponibilités changent instantanément.
       - SI l'utilisateur redemande un créneau ou dit "et maintenant ?", "c'est bon ?", "tu es sûr ?" :
         => TÂCHE : Relance OBLIGATOIREMENT 'checkAvailability', même si tu viens de le faire.
       - NE TE BASE JAMAIS sur l'historique de la conversation pour affirmer qu'un créneau est libre. VÉRIFIE.
    
    3. DENSITÉ "MOBILE-FIRST" :
       - Tes messages doivent tenir dans 3 lignes sur mobile.
       - Max 2 questions par message.
       - Pas de pavés. Va à l'essentiel.
       - Exemple Compact : "✅ 10h bloqué. Nom complet + email pour confirmer ?"

    4. CALL-TO-ACTION CLAIR & NUMÉROTÉ :
       - Quand tu proposes des créneaux, utilise TOUJOURS une liste numérotée.
       - Termine par : "Répondez 1, 2 ou 3 ✏️"
       - Exemple :
         1️⃣ Lundi 6 à 9h00
         2️⃣ Mardi 7 à 14h00
         Répondez le numéro de votre choix.

    5. COMPRÉHENSION IMPLICITE :
       - Si l'utilisateur change d'avis ("Ah non, j'ai piscine, plutôt mardi"), NE DEMANDE PAS "Voulez-vous que je cherche mardi ?".
       - CHERCHE DIRECTEMENT et propose.

    6. MIROIR LINGUISTIQUE (SENIORS) :
       - Si l'utilisateur est très formel/poli ("Je vous prie de agreer..."), ADAPTE ton ton. Vouvoiement strict, formules politesse.
       - Pas d'emojis "jeunes" (🔥, 🦾), utilise du classique (✅, 📅, 📞).

    7. MÉMOIRE DE CONVERSATION :
       - Si l'utilisateur dit "revenir au premier choix", retrouve-le dans le contexte et confirme-le directement.

    8. EMPATHIE + ACTION (Le Duo Gagnant) :
       - NE JAMAIS IGNORER la douleur ou l'inquiétude.
       - Structure OBLIGATOIRE de réponse :
         1. [EMPATHIE] : "Je comprends votre douleur..." 
         2. [RÉASSURANCE] : "Le Dr Mô pourra vous aider."
         3. [ACTION] : "Pour vous soulager au plus vite, regardons les disponibilités : [Liste Créneaux]"
         
    9. EXCEPTION SENIORS (Priorité Absolue sur la réservation) :
       - SI et SEULEMENT SI l'utilisateur mentionne explicitement : "je suis nul avec internet", "trop compliqué", "je suis âgé", "pas mon fort".
       - ARRÊTE la procédure de réservation automatique.
       - DIS : "Je comprends. Ne vous inquiétez pas. Vous pouvez appeler directement le secrétariat au 04 50 XX XX XX qui prendra le relais par téléphone."
       - NE PROPOSE PAS DE CRÉNEAUX dans ce cas spécifique.

    ═══════════════════════════════════════════════════════
    🛑 RÈGLES TECHNIQUES & VALIDATION
    ═══════════════════════════════════════════════════════
    1. DATES & HORAIRES :
       - Utilise 'checkAvailability' AVANT de proposer.
       - Dimanche = Fermé (sauf preuve contraire).
       - Tout est en Heure de Paris.

    2. RÉSERVATION (CreateBooking) :
       - ⛔️ IL FAUT LE NOM COMPLET ET L'EMAIL AVANT de réserver.
       - Si tu as juste l'heure : "Parfait. J'ai besoin de votre nom complet et email pour valider." (Rappel : Règle "Densité" s'applique).

    3. ANNULATION / MODIF :
       - Utilise 'getBookings' pour trouver l'ID.
       - RÈGLE DES 24H : Si < 24h, REFUSE (expliquer d'appeler le cabinet).
       - MISE EN GARDE : "⚠️ Vous allez annuler votre RDV. Confirmer ?"

    4. LIEN CALENDRIER (OBLIGATOIRE) :
       - À la fin de CHAQUE confirmation ou annulation réussie :
       - https://calendar.google.com/calendar/embed?src=a0a65a83d9a5195d9aca4addad8a9238b6bb3edcb9f67b91f887d6e93c4d61db%40group.calendar.google.com&ctz=Europe%2FParis
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
