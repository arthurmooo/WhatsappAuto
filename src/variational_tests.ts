import { runAgent } from './agent/bot';
import { CalComService } from './services/calcom';

interface TestTurn {
    user: string;
    expectedInclude?: string[];
    expectedIncludeSome?: string[];
    forbiddenInclude?: string[];
    validate?: (response: string) => boolean | string;
}

interface TestScenario {
    id: string;
    name: string;
    description: string;
    turns: TestTurn[];
    currentDate?: Date;
}

const scenarios: TestScenario[] = [
    {
        id: "VAR_01",
        name: "Data Before Intent (Inversion)",
        description: "User provides identifying info before asking for a slot",
        turns: [
            {
                user: "Je m'appelle Marc Lavoine, mon mail c'est marc@lavoine.fr. Vous avez quoi demain ?",
                expectedIncludeSome: ["demain", "disponible", "créneau"],
                validate: (res) => {
                    if (res.includes("votre nom") || res.includes("votre mail")) return "Bot asked for info already provided!";
                    return true;
                }
            }
        ]
    },
    {
        id: "VAR_02",
        name: "Implicit Willingness",
        description: "No explicit 'booking' word, just status and time",
        turns: [
            {
                user: "J'ai la cheville en vrac et je suis libre jeudi toute la journée.",
                expectedIncludeSome: ["jeudi", "disponibilité", "proposer", "créneau"],
                validate: (res) => res.includes("jeudi") ? true : "Bot didn't check Thursday"
            }
        ]
    },
    {
        id: "VAR_03",
        name: "The Mid-Flow Email Pivot",
        description: "User corrects email while choosing a slot",
        turns: [
            {
                user: "Je veux un RDV mardi à 10h. Je suis Jean (jean@old.com)",
                expectedIncludeSome: ["mardi", "10:00"]
            },
            {
                user: "En fait oublie le vieux mail, utilise jean.pro@new.com",
                expectedInclude: ["jean.pro@new.com"],
                validate: (res) => res.toLowerCase().includes("mardi") || res.toLowerCase().includes("confirm") ? true : "Bot lost track of the booking"
            }
        ]
    },
    {
        id: "VAR_04",
        name: "Slang & Fuzzy Time",
        description: "Using 'aprèm', 'fin de journée', etc.",
        turns: [
            {
                user: "T'as un truc demain fin d'aprem ? Genre après 17h ?",
                expectedIncludeSome: ["demain", "17h", "17:00", "soir"]
            }
        ]
    },
    {
        id: "VAR_05",
        name: "Double Negative / Exclusion",
        description: "Testing 'anything but X'",
        turns: [
            {
                user: "Je veux un RDV n'importe quand sauf le lundi.",
                expectedIncludeSome: ["mardi", "mercredi", "jeudi", "vendredi"],
                validate: (res) => {
                    // Fail only if it actually proposes a slot on Monday
                    if (res.toLowerCase().match(/lundi (à|a) \d\dh\d\d/)) return "Proposé un créneau pour lundi alors que c'est exclu";
                    return true;
                }
            }
        ]
    },
    {
        id: "VAR_06",
        name: "The 'Just checking' intent",
        description: "User just wants to see, not book yet",
        turns: [
            {
                user: "Je veux juste voir vos dispos pour la semaine prochaine sans rien bloquer.",
                expectedIncludeSome: ["semaine prochaine", "disponibilités"]
            }
        ]
    },
    {
        id: "VAR_07",
        name: "Explicit Multi-Step (Fragmented)",
        description: "User gives name, then waits, then email, then date",
        turns: [
            { user: "Bonjour je suis Bob.", expectedInclude: ["Bob"] },
            { user: "bob@gmail.com", expectedInclude: ["bob@gmail.com"] },
            { user: "Je voudrais venir vendredi matin.", expectedIncludeSome: ["vendredi", "matin"] }
        ]
    },
    {
        id: "VAR_08",
        name: "Vague Confirmation",
        description: "User says 'Ok pour le premier' instead of repeating time",
        turns: [
            { user: "Dispos demain matin ?", expectedIncludeSome: ["demain", "matin"] },
            {
                user: "Ok pour le premier créneau.",
                expectedIncludeSome: ["confirmé", "réservé", "noté", "parfait"],
                validate: (res) => res.toLowerCase().includes("votre nom") || res.toLowerCase().includes("email") ? true : "Should ask for info if missing"
            }
        ]
    },
    {
        id: "VAR_09",
        name: "Address Query Mid-Booking",
        description: "Asking for location while choosing a slot",
        turns: [
            { user: "Je veux un rdv mardi. C'est où le cabinet ?", expectedIncludeSome: ["mardi", "Arve", "adresse", "parking"] }
        ]
    },
    {
        id: "VAR_10",
        name: "Correction with Ambiguous Name",
        description: "User says 'Non, pas Arthur, c'est Marc'",
        turns: [
            { user: "Je veux un rdv, je m'appelle Arthur.", expectedIncludeSome: ["Arthur", "Bonjour"] },
            {
                user: "Ah non pardon je me suis trompé, c'est Marc.",
                expectedInclude: ["Marc"],
                validate: (res) => {
                    if (res.toLowerCase().includes("arthur") && !res.toLowerCase().includes("marc")) return "Still calling him Arthur!";
                    return true;
                }
            }
        ]
    },
    {
        id: "VAR_11",
        name: "Conflicting Dates in One Turn",
        description: "User says 'Lundi, non Mardi'",
        turns: [
            { user: "Je veux venir lundi... ah non en fait mardi plutôt.", expectedInclude: ["mardi"], forbiddenInclude: ["lundi"] }
        ]
    },
    {
        id: "VAR_12",
        name: "Extreme Vagueness",
        description: "User just says 'Dispo ?'",
        turns: [
            { user: "Dispo ?", expectedIncludeSome: ["bonjour", "bienvenue", "aider", "disponibilité"] }
        ]
    },
    {
        id: "VAR_13",
        name: "Price Query Mid-Booking",
        description: "User asks 'C'est combien ?' while looking at slots",
        turns: [
            { user: "Je veux rdv demain.", expectedIncludeSome: ["demain", "disponible"] },
            { user: "C'est combien la séance ?", expectedIncludeSome: ["tarif", "secteur 1", "conventionné"] }
        ]
    },
    {
        id: "VAR_14",
        name: "The 'Next available' Intent",
        description: "ASAP intent",
        turns: [
            { user: "Le plus tôt possible svp", expectedIncludeSome: ["plus tôt", "prochaine", "dispo", "janvier"] }
        ]
    },
    {
        id: "VAR_15",
        name: "Double Correction Email/Name",
        description: "Fixing both independently",
        turns: [
            { user: "Je suis Paul, paul@test.com. RDV mardi.", expectedIncludeSome: ["mardi"] },
            { user: "Pardon, mail c'est paul.v2@test.com", expectedInclude: ["paul.v2@test.com"] },
            { user: "Et mon nom c'est Paulo en fait", expectedInclude: ["Paulo"] }
        ]
    },
    {
        id: "VAR_16",
        name: "Requesting Specific Length",
        description: "User mentions 30min or 45min",
        turns: [
            { user: "Je veux une séance de 45 minutes demain.", expectedIncludeSome: ["1 heure", "1h", "60 minutes"] } // Should correct the duration
        ]
    },
    {
        id: "VAR_17",
        name: "The 'I already have a booking' query",
        description: "Checking existing booking status",
        turns: [
            { user: "J'ai déjà un rdv ? Je m'appelle Jean Martin.", expectedIncludeSome: ["vérifier", "rechercher", "aucun", "pas", "trouvé", "enregistré"] }
        ]
    },
    {
        id: "VAR_18",
        name: "Polite Refusal of Slot",
        description: "User says 'Non pas celui là, l'autre'",
        turns: [
            { user: "Quels sont les créneaux demain ?", expectedIncludeSome: ["demain"] },
            { user: "Non 10h c'est trop tard, t'as pas plus tôt ?", expectedIncludeSome: ["tôt", "matin", "08:00", "09:00"] }
        ]
    },
    {
        id: "VAR_19",
        name: "Asking for Documents",
        description: "Does the bot remember the vitale/ordomanance rules?",
        turns: [
            { user: "Je dois ramener quoi ?", expectedIncludeSome: ["vitale", "ordonnance"] }
        ]
    },
    {
        id: "VAR_20",
        name: "Combined Slack/Polite Mix",
        description: "Yo + merci",
        turns: [
            { user: "Yo l'équipe, dispo fin de semaine ? Merci d'avance !", expectedIncludeSome: ["fin de semaine", "jeudi", "vendredi"] }
        ]
    }
];

async function runScenario(scenario: TestScenario) {
    console.log(`\n🔍 TESTING VARIATION: [${scenario.id}] ${scenario.name}`);
    const history: any[] = [];
    const userPhone = "whatsapp:+336VARIATION" + scenario.id;
    let allPassed = true;

    for (const [i, turn] of scenario.turns.entries()) {
        try {
            const response = await runAgent(turn.user, userPhone, history, scenario.currentDate);
            console.log(`   [Turn ${i + 1}] User: ${turn.user}`);
            console.log(`   [Turn ${i + 1}] Bot: ${response.split('\n')[0]}...`);

            history.push({ role: 'user', content: turn.user });
            history.push({ role: 'assistant', content: response });

            const errors: string[] = [];
            if (turn.expectedInclude) {
                for (const exp of turn.expectedInclude) {
                    if (!response.toLowerCase().includes(exp.toLowerCase())) errors.push(`Missing: "${exp}"`);
                }
            }
            if (turn.expectedIncludeSome) {
                const found = turn.expectedIncludeSome.some(exp => response.toLowerCase().includes(exp.toLowerCase()));
                if (!found) errors.push(`Missing one of: ${turn.expectedIncludeSome.join(', ')}`);
            }
            if (turn.forbiddenInclude) {
                for (const forb of turn.forbiddenInclude) {
                    if (response.toLowerCase().includes(forb.toLowerCase())) errors.push(`Found forbidden: "${forb}"`);
                }
            }
            if (turn.validate) {
                const v = turn.validate(response);
                if (v !== true) errors.push(v as string);
            }

            if (errors.length > 0) {
                console.error(`   ❌ FAIL: ${errors.join(' | ')}`);
                console.error(`      Full Bot Response: "${response}"`);
                allPassed = false;
            } else {
                console.log(`   ✅ OK`);
            }
        } catch (e: any) {
            console.error(`   ❌ ERROR: ${e.message}`);
            allPassed = false;
        }
    }
    return allPassed;
}

async function main() {
    console.log("==================================================");
    console.log("🧪 VARIATIONAL COMMAND SANITY BATTERY 🧪");
    console.log("==================================================");

    let totalPassed = 0;
    for (const s of scenarios) {
        if (await runScenario(s)) totalPassed++;
    }

    console.log("\n==================================================");
    console.log(`📊 FINAL SYNOPSIS: ${totalPassed}/${scenarios.length} Passed`);
    console.log("==================================================");

    if (totalPassed < scenarios.length) process.exit(1);
}

main();
