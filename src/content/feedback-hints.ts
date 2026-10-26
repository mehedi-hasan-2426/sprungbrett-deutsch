import type { Category } from "../lib/types.ts";

export interface Hint {
  tag?: Category;
  hint: string;
  rule: string;
}

// Keyed by unit and exercise group: "w<week>:<group>" or "p:<group>" for the placement test.
export const HINTS: Record<string, Hint> = {
  "w1:G1": { tag: "VF", hint: "Vowel change for du/er? Separable verb: the prefix goes to the end.", rule: "er fährt, sie liest · Der Kurs fängt um 9 Uhr an." },
  "w1:G2": { tag: "VP", hint: "What is in position 2?", rule: "Time first → then the verb, then the subject: Am Samstag kaufe ich ein." },
  "w1:G3": { tag: "VP", hint: "W-question: verb in position 2. Yes/no question: verb in position 1.", rule: "Wann stehst du auf? · Arbeitest du am Samstag?" },
  "w2:G1": { tag: "KA", hint: "Only masculine changes in the accusative.", rule: "der → den, ein → einen, kein → keinen." },
  "w2:G2": { tag: "KA", hint: "Noun with ein or no article → kein. Otherwise → nicht.", rule: "Ich habe keine Zeit. · Der Saft ist nicht teuer." },
  "w2:G3": { tag: "VF", hint: "Modal verb: no ending for ich/er. Masculine possessive in the accusative: -en.", rule: "Kannst du …? · Er sucht seinen Schlüssel." },
  "w3:G1": { tag: "KA", hint: "Dative after mit, bei, zu, von, aus, nach, seit.", rule: "dem / der / dem, plural den + -n · zu + der = zur." },
  "w3:G2": { tag: "KA", hint: "Personal pronoun in the dative.", rule: "mir, dir, ihm, ihr, ihm, uns, euch, ihnen, Ihnen." },
  "w3:G3": { tag: "VP", hint: "Verb in position 2; dative after seit/mit.", rule: "Er wohnt seit drei Monaten hier." },
  "w4:G1": { tag: "VF", hint: "ge-…-t or ge-…-en? be-/ver-: no ge-. Separable: ein-ge-kauft.", rule: "gemacht, geschrieben, eingekauft, besucht." },
  "w4:G2": { tag: "VF", hint: "Movement or change of state → sein. Otherwise haben.", rule: "Wir sind gegangen. · Ich habe gegessen." },
  "w4:G3": { tag: "VF", hint: "haben/sein in position 2, participle at the end.", rule: "Ich habe meine Freundin getroffen." },
  "w4:G4": { tag: "VF", hint: "Simple past of sein and haben.", rule: "ich war, du warst, wir waren · ich hatte, du hattest, wir hatten." },
  "w5:G1": { tag: "VF", hint: "du form without -st and without du. Sie form: verb + Sie.", rule: "du nimmst → Nimm! · Nehmen Sie …! · ihr: Nehmt!" },
  "w5:G2": { tag: "VF", hint: "Conjugate sollen like müssen.", rule: "ich soll, du sollst, er soll, wir sollen, ihr sollt." },
  "w5:G3": { tag: "KA", hint: "Who does it hurt? → dative. Plural → tun.", rule: "Mir tut der Kopf weh. · Ihm tun die Füße weh." },
  "w6:G1": { tag: "KA", hint: "Wo? (where) → dative. Wohin? (where to) → accusative.", rule: "im Kino (wo) · ins Kino (wohin)." },
  "w6:G2": { tag: "VF", hint: "An action (where to) or the result (where)?", rule: "stellen/legen → stehen/liegen." },
  "w6:G3": { tag: "VP", hint: "Sie imperative: verb first. gegenüber + dative.", rule: "Biegen Sie dann links ab. · gegenüber dem Bahnhof." },
  "w7:G1": { tag: "VP", hint: "After weil the conjugated verb goes to the end.", rule: "…, weil ich müde bin. · …, weil ich arbeiten muss." },
  "w7:G2": { tag: "VP", hint: "denn: verb in position 2. deshalb: verb straight after it.", rule: "…, denn ich habe kein Auto. · Deshalb nehme ich den Zug." },
  "w7:G3": { tag: "VF", hint: "-ieren and be-/ver-: no ge-. Separable: an-ge-fangen.", rule: "hat studiert, hat bekommen, hat angefangen." },
  "w8:G1": { tag: "VF", hint: "Comparative: -er + als. Watch for umlauts and irregular forms.", rule: "teuer → teurer, jung → jünger, gern → lieber." },
  "w8:G2": { tag: "VF", hint: "Superlative: am …-sten.", rule: "am schönsten, am kältesten, am liebsten." },
  "w8:G3": { tag: "KA", hint: "Which article? Nominative or accusative?", rule: "ein warmer / einen warmen · ein schickes · die blaue · die schwarzen." },
  "w9:G1": { tag: "VP", hint: "After dass the verb goes to the end.", rule: "Ich glaube, dass die Party super ist." },
  "w9:G2": { tag: "VP", hint: "wenn clause first → the main clause starts with the verb.", rule: "Wenn ich Zeit habe, komme ich gern." },
  "w9:G3": { tag: "VF", hint: "The reflexive pronoun matches the subject.", rule: "ich → mich, du → dich, er → sich, wir → uns, ihr → euch." },
  "w10:G1": { tag: "VF", hint: "Simple past of modal verbs: no umlaut, ich = er.", rule: "konnte, musste, wollte, durfte, sollte." },
  "w10:G2": { tag: "PR", hint: "Past, until now, afterwards, future or duration?", rule: "vor zwei Jahren · seit einem Jahr · nach dem Essen · in zehn Minuten · für zwei Wochen." },
  "w10:G3": { tag: "VF", hint: "Movement → sein.", rule: "Wir sind umgestiegen. · Ich habe gebucht." },
  "w11:G1": { tag: "VF", hint: "Konjunktiv II: könnte, würde, hätte.", rule: "Könnten Sie mir bitte helfen? · Ich hätte gern einen Termin." },
  "w11:G2": { tag: "VP", hint: "W-word or ob, then the verb goes to the end.", rule: "Können Sie mir sagen, wo das Amt ist? · Wissen Sie, ob …?" },
  "w11:G3": { tag: "VF", hint: "Separable: aus-ge-füllt. unter-: no ge-.", rule: "habe ausgefüllt, haben unterschrieben, haben uns angemeldet." },
  "w12:G1": { hint: "Check the case, the verb in subordinate clauses, the simple past and comparisons.", rule: "See the grammar overview in week 12." },
  "w12:G2": { tag: "VP", hint: "Common mistakes: verb position, kein/keine, haben/sein, dative.", rule: "Gestern habe ich … · …, weil ich … will." },
  "p:A": { tag: "WS", hint: "Read that part of the text again carefully.", rule: "The answer is in the text." },
  "p:B": { tag: "HÖ", hint: "Listen again for numbers and days.", rule: "Key words: numbers, times, places." },
  "p:C": { tag: "GE", hint: "der, die or das?", rule: "Always learn nouns with their article." },
  "p:D1": { tag: "VF", hint: "Vowel change? Irregular verb?", rule: "ich spreche, er fährt, du hast, wir sind." },
  "p:D2": { tag: "VP", hint: "Verb in position 2; separable part or infinitive at the end.", rule: "Ich stehe um 7 Uhr auf. · Ich kann morgen nicht kommen." },
  "p:D3": { tag: "KA", hint: "Masculine accusative: einen/keinen.", rule: "einen Bruder, eine Schwester, kein Auto." },
  "p:D4": { tag: "VP", hint: "W-question or yes/no question?", rule: "Wo wohnst du? · Trinkst du gern Tee?" },
  "p:D5": { tag: "VF", hint: "The possessive matches the owner; modal verb has no ending for ich/er.", rule: "Anna → ihr Mann · man darf · ich muss." },
};

export const DEFAULT_HINT: Record<Category, Hint> = {
  VP: { hint: "Where does the verb go?", rule: "Main clause: position 2 · subordinate clause: at the end." },
  KA: { hint: "Which case? Nominative, accusative or dative?", rule: "Acc.: den/einen · dat.: dem/der/den." },
  GE: { hint: "der, die or das?", rule: "Always learn nouns with their article." },
  PL: { hint: "Which plural ending? Umlaut?", rule: "der Apfel → die Äpfel · das Ei → die Eier." },
  VF: { hint: "Check the verb form (person, tense, haben/sein).", rule: "ich arbeite, er arbeitet · hat gemacht, ist gefahren." },
  PR: { hint: "Which preposition fits?", rule: "seit/vor/nach + dative · für + accusative." },
  WS: { hint: "Read the task again carefully.", rule: "Look for key words." },
  AU: { hint: "Say the word aloud.", rule: "Compare it with this week's rule." },
  RS: { hint: "Capital or lower case?", rule: "Nouns start with a capital; verbs and adjectives don't." },
  HÖ: { hint: "Listen again for numbers, times and places.", rule: "Read the questions before you listen." },
};
