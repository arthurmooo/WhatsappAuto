import { runAgent } from './agent/bot';

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
        id: "MAR_01",
        name: "Broken French / Slang Booking",
        description: "User uses heavy slang and typos",
        turns: [
            {
                user: "jv rdv mard1 slt",
                expectedIncludeSome: ["mardi", "disponible", "créneau"],
                validate: (res) => res.toLowerCase().includes("mardi") ? true : "Bot failed to parse 'mard1'"
            }
        ]
    },
    {
        id: "MAR_02",
        name: "Atomic Logic Correction",
        description: "Testing if bot remembers name update while finding slots",
        turns: [
            {
                user: "Je veux rdv mercredi, mon nom c'est Marc.",
                expectedIncludeSome: ["mercredi", "Marc"]
            },
            {
                user: "Non pas Marc, c'est Jean-Pierre en fait. Et t'as quoi jeudi ?",
                expectedInclude: ["Jean-Pierre"],
                expectedIncludeSome: ["jeudi"],
                validate: (res) => {
                    if (res.toLowerCase().includes("marc")) return "Bot still calls him Marc";
                    if (!res.toLowerCase().includes("jean-pierre")) return "Bot missed Jean-Pierre update";
                    return true;
                }
            }
        ]
    },
    {
        id: "MAR_03",
        name: "Mid-Sentence Pivot (Contradiction)",
        description: "User changes date and name in one messy turn",
        turns: [
            {
                user: "Cherche lundi... ah nan en fait mardi. Et jsuis Paul... non Marc !",
                expectedInclude: ["Marc", "mardi"],
                forbiddenInclude: ["Paul", "lundi"]
            }
        ]
    },
    {
        id: "MAR_04",
        name: "SMS Style Cancellation",
        description: "Highly informal cancellation",
        turns: [
            { user: "Je suis Marc, marc@test.com. RDV mardi 10h.", expectedIncludeSome: ["mardi", "10:00"] },
            {
                user: "annul tou svp jpx pas vnr",
                expectedIncludeSome: ["annulé", "supprimé", "confirm", "noté", "aucun", "pas de rendez-vous"],
                validate: (res) => (res.toLowerCase().includes("mardi") || res.toLowerCase().includes("rendez-vous")) ? true : "Bot didn't acknowledge cancellation intent"
            }
        ]
    },
    {
        id: "MAR_05",
        name: "The 'Everything' Turn",
        description: "Name, email, date, time, and unrelated question in one go",
        turns: [
            {
                user: "Slt jsuis Bob bob@mail.com jv rdv vendredi 15h et c koi ladresse ??",
                expectedInclude: ["Bob", "bob@mail.com", "vendredi", "Arve"],
                expectedIncludeSome: ["15:00", "15h00", "15h"],
            }
        ]
    },
    {
        id: "MAR_06",
        name: "Implicit Duration Correction",
        description: "User asks for 45min (which was old standard), bot must say 1h",
        turns: [
            {
                user: "Une séance de 45 min svp",
                expectedIncludeSome: ["1 heure", "1h", "60 minutes"],
                validate: (res) => res.toLowerCase().includes("1") || res.toLowerCase().includes("une heure") ? true : "Failed duration correction"
            }
        ]
    },
    {
        id: "MAR_07",
        name: "Ambiguous Affirmation",
        description: "Bot offers 2 slots, user says 'Le premier c parti'",
        turns: [
            { user: "Dispo jeudi ?", expectedInclude: ["jeudi"] },
            {
                user: "Le premier c parti",
                expectedIncludeSome: ["confirmé", "réservé", "noté", "parfait", "merci", "choix"],
                validate: (res) => res.toLowerCase().includes("nom") || res.toLowerCase().includes("email") ? true : "Should ask for credentials"
            }
        ]
    },
    {
        id: "MAR_08",
        name: "Nested Identity Correction",
        description: "Correcting name, then email, then both",
        turns: [
            { user: "Je suis A", expectedInclude: ["A"] },
            { user: "Non B", expectedInclude: ["B"] },
            { user: "Mon mail c'est b@b.com", expectedInclude: ["b@b.com"] },
            { user: "En fait C et c@c.com", expectedInclude: ["C", "c@c.com"], validate: (res) => res.match(/\bB\b/) ? "Found forbidden: B" : true }
        ]
    },
    {
        id: "MAR_09",
        name: "The 'Just checking' Pivot",
        description: "User asks for info, then booking, then cancels logic",
        turns: [
            { user: "T'es où ?", expectedIncludeSome: ["Arve", "Cluses"] },
            { user: "Ok j'arrive mardi 10h", expectedIncludeSome: ["mardi", "10:00", "10h00"] },
            { user: "Ah non laisse tomber jsuis pas là", expectedIncludeSome: ["compris", "noté", "prochain", "aider", "disposition"] }
        ]
    },
    {
        id: "MAR_10",
        name: "Double Negative Exclusion",
        description: "Sauf lundi et sauf vendredi",
        turns: [
            {
                user: "Slt rdv n'importe quand mais pas lundi ni vendredi",
                expectedIncludeSome: ["mardi", "mercredi", "jeudi"],
                validate: (res) => {
                    const low = res.toLowerCase();
                    // Just check if it mentions the forbidden days in the context of a slot
                    if (low.match(/lundi (à|a) \d\dh/)) return "Found excluded Monday";
                    if (low.match(/vendredi (à|a) \d\dh/)) return "Found excluded Friday";
                    return true;
                }
            }
        ]
    },
    {
        id: "MAR_11",
        name: "Typos on Sensitive keywords",
        description: "Anuler, Confirmerrrr, Datee",
        turns: [
            { user: "jv rdv mardii", expectedInclude: ["mardi"] },
            { user: "jesuismarc@gmail.com", expectedIncludeSome: ["jesuismarc@gmail.com", "marc@gmail.com"] },
            { user: "anuler svp", expectedIncludeSome: ["annulé", "supprimé", "noté", "confirmer", "annulation", "annuler", "aucun"] }
        ]
    },
    {
        id: "MAR_12",
        name: "The 'Who are you' interruption",
        description: "Asking identity mid-flow",
        turns: [
            { user: "Je veux rdv mardi", expectedInclude: ["mardi"] },
            { user: "T'es une IA ?", expectedIncludeSome: ["assistant", "Dr. Mô", "intelligence"] },
            { user: "Ok et mon rdv alors ?", expectedIncludeSome: ["mardi", "propose"] }
        ]
    },
    {
        id: "MAR_13",
        name: "Extreme Date Logic",
        description: "RDV 'après demain'",
        currentDate: new Date("2026-01-05T10:00:00Z"), // Monday
        turns: [
            {
                user: "Rdv après demain",
                expectedIncludeSome: ["mercredi", "7 janvier"],
                validate: (res) => res.includes("7") ? true : "Failed 'après-demain' logic"
            }
        ]
    },
    {
        id: "MAR_14",
        name: "Primo-Consultant Mandatory Rule",
        description: "New patient must see the 1h + vitale warning",
        turns: [
            {
                user: "C'est ma première fois, je veux venir demain",
                expectedInclude: ["1h", "Vitale", "ordonnance"]
            }
        ]
    },
    {
        id: "MAR_15",
        name: "State Amnesia Final Boss",
        description: "User gives name + email + date in 3 fragmented fast turns",
        turns: [
            { user: "Marc Lavoine", expectedInclude: ["Marc Lavoine"] },
            { user: "marc@lavoine.fr", expectedInclude: ["marc@lavoine.fr"] },
            { user: "Jeudi 10h", expectedIncludeSome: ["jeudi", "10:00", "10h00"], validate: (res) => (res.includes("Marc") || res.includes("marc@")) ? true : "Lost profile in final step" }
        ]
    }
];

async function runScenario(scenario: TestScenario) {
    console.log(`\n🔥 MARATHON: [${scenario.id}] ${scenario.name}`);
    const history: any[] = [];
    const userPhone = "whatsapp:+336MARATHON" + scenario.id;
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
    console.log("🏃 THE AMBIGUITY MARATHON RUNNER 🏃");
    console.log("==================================================");

    let totalPassed = 0;
    for (const s of scenarios) {
        if (await runScenario(s)) totalPassed++;
    }

    console.log("\n==================================================");
    console.log(`🏆 FINAL SCORE: ${totalPassed}/${scenarios.length} Passed`);
    console.log("==================================================");

    if (totalPassed < scenarios.length) process.exit(1);
}

main();
