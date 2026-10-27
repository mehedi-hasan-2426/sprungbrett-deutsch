import type { Block, Course, Item, VocabEntry } from "../lib/types.ts";

type Word = [term: string, forms: string, meaning: string, example: string, exampleEn: string];
interface Addition {
  words: Word[];
  message: string;
  responses: [question: string, model: string][];
}

const weeks: Addition[] = [
  {
    words: [
      ["der Alltag", "usually singular", "everyday life; daily routine", "Mein Alltag beginnt früh.", "My day-to-day routine starts early."],
      ["der Wecker", "die Wecker", "alarm clock", "Der Wecker klingelt um sechs.", "The alarm clock rings at six."],
      ["der Kalender", "die Kalender", "calendar; diary", "Mein Termin steht im Kalender.", "My appointment is in the diary."],
      ["die Gewohnheit", "die Gewohnheiten", "habit", "Lesen am Abend ist meine Gewohnheit.", "Reading in the evening is my habit."],
      ["die Uhrzeit", "die Uhrzeiten", "time of day; clock time", "Welche Uhrzeit passt dir?", "What time suits you?"],
      ["der Tagesplan", "die Tagespläne", "daily schedule", "Mein Tagesplan hängt an der Wand.", "My daily schedule is on the wall."],
      ["die Freizeit", "usually singular", "free time", "In meiner Freizeit male ich.", "I paint in my free time."],
      ["sich waschen", "wäscht sich · hat sich gewaschen", "to wash oneself", "Ich wasche mich vor dem Frühstück.", "I wash before breakfast."],
      ["vor·bereiten", "bereitet vor · hat vorbereitet", "to prepare", "Ich bereite meine Tasche vor.", "I prepare my bag."],
      ["pünktlich", "adjective/adverb", "on time; punctual", "Der Kurs beginnt pünktlich.", "The course starts on time."],
    ],
    message: "Hallo Alex, unser Deutschkurs beginnt morgen schon um 8 Uhr, nicht um 9 Uhr. Bitte bring dein Heft mit. Nach dem Kurs können wir zusammen frühstücken. Ich warte um 7.50 Uhr vor der Schule. Viele Grüße, Mira",
    responses: [
      ["Wann und wo wartet Mira? Antworte in einem Satz.", "Mira wartet um 7.50 Uhr vor der Schule."],
      ["Du kannst erst um 8.15 Uhr kommen. Schreibe Mira eine kurze Nachricht mit einer Entschuldigung.", "Hallo Mira, entschuldige bitte, ich kann erst um 8.15 Uhr kommen. Warte bitte nicht auf mich."],
      ["Was brauchst du für den Kurs? Schreibe einen Satz und schlage etwas nach dem Kurs vor.", "Ich brauche mein Heft für den Kurs. Nach dem Kurs können wir zusammen frühstücken."],
    ],
  },
  {
    words: [
      ["der Einkaufszettel", "die Einkaufszettel", "shopping list", "Der Einkaufszettel liegt auf dem Tisch.", "The shopping list is on the table."],
      ["die Bäckerei", "die Bäckereien", "bakery", "Die Bäckerei öffnet früh.", "The bakery opens early."],
      ["das Wechselgeld", "no usual plural", "change returned after payment", "Das Wechselgeld stimmt nicht.", "The change is not correct."],
      ["die Quittung", "die Quittungen", "receipt; written acknowledgement of payment", "Kann ich eine Quittung bekommen?", "May I have a receipt?"],
      ["die Menge", "die Mengen", "quantity; amount", "Welche Menge brauchen Sie?", "What quantity do you need?"],
      ["das Pfand", "usually singular for bottle deposits", "refundable deposit", "Für die Flasche bezahle ich Pfand.", "I pay a deposit on the bottle."],
      ["die Zutat", "die Zutaten", "ingredient", "Alle Zutaten stehen im Rezept.", "All the ingredients are in the recipe."],
      ["wiegen", "wiegt · hat gewogen", "to weigh", "Die Verkäuferin wiegt die Äpfel.", "The shop assistant weighs the apples."],
      ["zurück·geben", "gibt zurück · hat zurückgegeben", "to return something; to give back", "Ich gebe die leeren Flaschen zurück.", "I return the empty bottles."],
      ["günstig", "adjective/adverb", "inexpensive; good value here", "Die Tomaten sind heute günstig.", "The tomatoes are good value today."],
    ],
    message: "Markt am Rathaus: Am Mittwoch verkaufen wir von 8 bis 13 Uhr frisches Obst und Gemüse. Drei Kilo Kartoffeln kosten vier Euro. Bitte bringen Sie eigene Taschen mit. Kartenzahlung ist leider nicht möglich.",
    responses: [
      ["Wann endet der Markt und wie können Sie bezahlen?", "Der Markt endet um 13 Uhr. Man kann nur bar bezahlen."],
      ["Sie möchten drei Kilo Kartoffeln kaufen. Schreiben Sie zwei Fragen an die Verkäuferin: zum Preis und zur Tasche.", "Was kosten drei Kilo Kartoffeln? Haben Sie auch eine Tasche für mich?"],
      ["Ihr Freund möchte am Mittwoch um 14 Uhr mit Karte einkaufen. Erklären Sie ihm in zwei Sätzen das Problem.", "Um 14 Uhr ist der Markt schon geschlossen. Du musst außerdem Bargeld mitbringen, weil Kartenzahlung nicht möglich ist."],
    ],
  },
  {
    words: [
      ["der Schlüssel", "die Schlüssel", "key", "Der Schlüssel liegt neben der Tür.", "The key is next to the door."],
      ["die Heizung", "die Heizungen", "heating; heater", "Die Heizung ist kaputt.", "The heating is broken."],
      ["der Umzug", "die Umzüge", "house move", "Unser Umzug ist am Samstag.", "We are moving home on Saturday."],
      ["der Mietvertrag", "die Mietverträge", "tenancy agreement", "Ich lese den Mietvertrag genau.", "I read the tenancy agreement carefully."],
      ["die Kaution", "die Kautionen", "security deposit", "Die Kaution beträgt zwei Monatsmieten.", "The deposit is two months' rent."],
      ["der Hausmeister", "die Hausmeister; female: die Hausmeisterin, -nen", "caretaker; building superintendent", "Der Hausmeister repariert die Tür.", "The caretaker repairs the door."],
      ["die Steckdose", "die Steckdosen", "power socket", "Die Steckdose ist hinter dem Sofa.", "The power socket is behind the sofa."],
      ["lüften", "lüftet · hat gelüftet", "to air a room; to ventilate", "Wir lüften jeden Morgen.", "We air the rooms every morning."],
      ["ein·ziehen", "zieht ein · ist eingezogen", "to move in", "Wir ziehen nächste Woche ein.", "We move in next week."],
      ["gemütlich", "adjective/adverb", "cosy; comfortable", "Das Wohnzimmer ist gemütlich.", "The living room is cosy."],
    ],
    message: "Liebe Mieterinnen und Mieter, am Donnerstag ist das Wasser von 9 bis 12 Uhr abgestellt. Wir reparieren eine Leitung im Keller. Bitte füllen Sie vorher Wasser in Flaschen. Bei Fragen rufen Sie das Büro an. Ihre Hausverwaltung",
    responses: [
      ["Warum gibt es am Donnerstag zeitweise kein Wasser?", "Eine Leitung im Keller wird repariert."],
      ["Ihre Nachbarin ist nicht zu Hause. Schreiben Sie ihr, wann es kein Wasser gibt und was sie vorher tun soll.", "Am Donnerstag gibt es von 9 bis 12 Uhr kein Wasser. Fülle bitte vorher Wasser in Flaschen."],
      ["Sie haben am Donnerstag einen wichtigen Termin. Fragen Sie das Büro in zwei Sätzen nach einer anderen Möglichkeit.", "Ich habe am Donnerstag einen wichtigen Termin. Kann ich vorher im Büro Wasser bekommen?"],
    ],
  },
  {
    words: [
      ["der Ausflugstipp", "die Ausflugstipps", "suggestion for a day trip", "Hast du einen Ausflugstipp für Sonntag?", "Do you have a day-trip suggestion for Sunday?"],
      ["die Eintrittskarte", "die Eintrittskarten", "admission ticket", "Die Eintrittskarte kostet acht Euro.", "The admission ticket costs eight euros."],
      ["die Erinnerung", "die Erinnerungen", "memory; recollection", "Das Foto ist eine schöne Erinnerung.", "The photo is a lovely memory."],
      ["der Regen", "no usual plural", "rain", "Wegen des Regens bleiben wir drinnen.", "We stay indoors because of the rain."],
      ["die Wanderung", "die Wanderungen", "hike", "Die Wanderung dauert zwei Stunden.", "The hike takes two hours."],
      ["die Sehenswürdigkeit", "die Sehenswürdigkeiten", "sight; tourist attraction", "Welche Sehenswürdigkeiten gibt es hier?", "What sights are there here?"],
      ["das Erlebnis", "die Erlebnisse", "experience; memorable event", "Der Ausflug war ein tolles Erlebnis.", "The trip was a great experience."],
      ["fotografieren", "fotografiert · hat fotografiert", "to take photographs", "Ich habe die alte Brücke fotografiert.", "I photographed the old bridge."],
      ["erleben", "erlebt · hat erlebt", "to experience", "Wir haben viel zusammen erlebt.", "We have experienced a lot together."],
      ["unterwegs", "adverb", "on the way; out and about", "Wir waren den ganzen Tag unterwegs.", "We were out and about all day."],
    ],
    message: "Hallo Ben, gestern waren wir am See. Zuerst sind wir eine Stunde gewandert. Dann hat es geregnet und wir sind ins kleine Museum gegangen. Die Eintrittskarte hat sechs Euro gekostet. Abends haben wir zu Hause gekocht. Wie war dein Wochenende? Anna",
    responses: [
      ["Was hat Anna nach der Wanderung gemacht und warum?", "Sie ist ins Museum gegangen, weil es geregnet hat."],
      ["Beantworten Sie Annas Frage mit zwei Sätzen im Perfekt über Ihr Wochenende.", "Ich habe meine Schwester besucht. Danach haben wir zusammen einen Film gesehen."],
      ["Ihr Freund sagt: Anna war den ganzen Tag draußen. Korrigieren Sie ihn mit zwei Informationen aus dem Text.", "Anna war nicht den ganzen Tag draußen. Sie ist ins Museum gegangen und hat abends zu Hause gekocht."],
    ],
  },
  {
    words: [
      ["die Untersuchung", "die Untersuchungen", "medical examination", "Die Untersuchung dauert zehn Minuten.", "The examination takes ten minutes."],
      ["das Wartezimmer", "die Wartezimmer", "waiting room", "Bitte warten Sie im Wartezimmer.", "Please wait in the waiting room."],
      ["die Versicherung", "die Versicherungen", "insurance; insurance company", "Meine Versicherung schickt mir eine neue Karte.", "My insurer sends me a new card."],
      ["die Erkältung", "die Erkältungen", "cold (illness)", "Ich habe eine Erkältung.", "I have a cold."],
      ["die Sprechstunde", "die Sprechstunden", "consultation hours", "Die Sprechstunde beginnt um acht.", "Consultation hours start at eight."],
      ["die Salbe", "die Salben", "ointment", "Die Apothekerin erklärt mir die Salbe.", "The pharmacist explains the ointment to me."],
      ["der Notfall", "die Notfälle", "emergency", "Ist das ein Notfall?", "Is this an emergency?"],
      ["sich verletzen", "verletzt sich · hat sich verletzt", "to injure oneself", "Er hat sich beim Sport verletzt.", "He injured himself while playing sport."],
      ["sich erholen", "erholt sich · hat sich erholt", "to recover; to recuperate", "Ich erhole mich zu Hause.", "I am recovering at home."],
      ["gesund", "adjective/adverb", "healthy; well", "Ich bin wieder gesund.", "I am well again."],
    ],
    message: "Praxis Sommer: Ihr Termin am Dienstag um 10 Uhr muss leider ausfallen. Wir bieten Ihnen Mittwoch um 11 Uhr oder Donnerstag um 15 Uhr an. Bitte bestätigen Sie einen Termin telefonisch. Bringen Sie Ihre Gesundheitskarte und Ihre Medikamentenliste mit.",
    responses: [
      ["Welche zwei neuen Termine bietet die Praxis an?", "Die Praxis bietet Mittwoch um 11 Uhr oder Donnerstag um 15 Uhr an."],
      ["Sie wählen Donnerstag. Formulieren Sie eine kurze telefonische Bestätigung.", "Guten Tag, hier spricht Alex. Ich bestätige den Termin am Donnerstag um 15 Uhr."],
      ["Ihr Partner begleitet Sie. Schreiben Sie ihm den neuen Termin und was Sie mitbringen müssen.", "Mein neuer Termin ist am Donnerstag um 15 Uhr. Ich muss meine Gesundheitskarte und meine Medikamentenliste mitbringen."],
    ],
  },
  {
    words: [
      ["der Gehweg", "die Gehwege", "pavement; sidewalk", "Bitte bleiben Sie auf dem Gehweg.", "Please stay on the pavement."],
      ["die Richtung", "die Richtungen", "direction", "In welche Richtung fährt der Bus?", "In which direction does the bus go?"],
      ["der Stadtplan", "die Stadtpläne", "city map", "Der Stadtplan hilft uns.", "The city map helps us."],
      ["die Fußgängerzone", "die Fußgängerzonen", "pedestrian zone", "Autos dürfen nicht in die Fußgängerzone.", "Cars are not allowed in the pedestrian zone."],
      ["der Eingang", "die Eingänge", "entrance", "Der Eingang ist rechts.", "The entrance is on the right."],
      ["der Ausgang", "die Ausgänge", "exit", "Wo ist der Ausgang?", "Where is the exit?"],
      ["die Baustelle", "die Baustellen", "building site; roadworks", "Die Baustelle ist vor der Bank.", "The roadworks are in front of the bank."],
      ["überqueren", "überquert · hat überquert", "to cross", "Wir überqueren die Straße an der Ampel.", "We cross the road at the traffic lights."],
      ["vorbei·gehen", "geht vorbei · ist vorbeigegangen", "to walk past", "Gehen Sie an der Schule vorbei.", "Walk past the school."],
      ["gegenüber", "preposition/adverb; with dative", "opposite; across from", "Die Post ist gegenüber der Bank.", "The post office is opposite the bank."],
    ],
    message: "Die Haltestelle Markt ist bis Freitag wegen einer Baustelle gesperrt. Bus 12 hält jetzt vor der Bibliothek. Vom Markt gehen Sie geradeaus bis zur Ampel und dann links. Nach hundert Metern sehen Sie die Bibliothek auf der rechten Seite.",
    responses: [
      ["Warum hält Bus 12 nicht am Markt und wo hält er jetzt?", "Wegen einer Baustelle hält er nicht am Markt. Er hält vor der Bibliothek."],
      ["Ihr Freund steht am Markt. Beschreiben Sie ihm den Weg zur neuen Haltestelle in zwei Sätzen.", "Geh geradeaus bis zur Ampel und dann links. Nach hundert Metern ist die Bibliothek rechts."],
      ["Sie möchten am Mittwoch zum Markt fahren. Fragen Sie beim Busunternehmen, wo Sie aussteigen sollen.", "Guten Tag, ich möchte am Mittwoch zum Markt fahren. An welcher Haltestelle soll ich aussteigen?"],
    ],
  },
  {
    words: [
      ["der Arbeitsvertrag", "die Arbeitsverträge", "employment contract", "Ich unterschreibe den Arbeitsvertrag morgen.", "I sign the employment contract tomorrow."],
      ["die Arbeitszeit", "die Arbeitszeiten", "working hours", "Meine Arbeitszeit beginnt um neun.", "My working hours start at nine."],
      ["der Kunde", "die Kunden; female: die Kundin, -nen", "customer; client", "Der Kunde wartet auf eine Antwort.", "The customer is waiting for an answer."],
      ["die Aufgabe", "die Aufgaben", "task; assignment", "Diese Aufgabe machen wir zusammen.", "We do this task together."],
      ["der Arbeitsplatz", "die Arbeitsplätze", "workplace; job", "Mein Arbeitsplatz ist am Fenster.", "My workstation is by the window."],
      ["die Teilzeit", "no usual plural", "part-time work", "Ich arbeite in Teilzeit.", "I work part-time."],
      ["das Vorstellungsgespräch", "die Vorstellungsgespräche", "job interview", "Das Vorstellungsgespräch ist am Montag.", "The job interview is on Monday."],
      ["sich bewerben", "bewirbt sich · hat sich beworben", "to apply for a job", "Ich bewerbe mich um eine Stelle.", "I apply for a job."],
      ["vereinbaren", "vereinbart · hat vereinbart", "to arrange; to agree on", "Wir vereinbaren einen Termin.", "We arrange an appointment."],
      ["zuverlässig", "adjective/adverb", "reliable", "Meine Kollegin ist sehr zuverlässig.", "My colleague is very reliable."],
    ],
    message: "Hallo Team, die Besprechung am Freitag beginnt schon um 9 Uhr in Raum 4. Bitte bringt eure Wochenpläne mit. Wer im Homeoffice arbeitet, kann online teilnehmen. Schickt eure Fragen bitte bis Donnerstag an Frau Wolf. Danke, Karim",
    responses: [
      ["Wann und wo findet die Besprechung statt?", "Sie findet am Freitag um 9 Uhr in Raum 4 statt."],
      ["Sie arbeiten am Freitag zu Hause. Schreiben Sie Karim, wie Sie teilnehmen und was Sie vorbereiten.", "Hallo Karim, ich nehme online teil. Ich bereite meinen Wochenplan vor und schicke meine Fragen bis Donnerstag."],
      ["Ein Kollege möchte seine Fragen erst Freitag schicken. Erklären Sie ihm, was in der Nachricht steht.", "Du sollst deine Fragen schon bis Donnerstag an Frau Wolf schicken. Am Freitag beginnt die Besprechung um 9 Uhr."],
    ],
  },
  {
    words: [
      ["der Schal", "die Schals", "scarf", "Der Schal ist weich.", "The scarf is soft."],
      ["die Mütze", "die Mützen", "cap; woolly hat", "Im Winter trage ich eine Mütze.", "I wear a woolly hat in winter."],
      ["das Paar", "die Paare", "pair", "Ich brauche ein Paar Schuhe.", "I need a pair of shoes."],
      ["die Farbe", "die Farben", "colour", "Welche Farbe gefällt dir?", "Which colour do you like?"],
      ["der Stoff", "die Stoffe", "fabric; material", "Dieser Stoff ist aus Baumwolle.", "This fabric is made of cotton."],
      ["die Baumwolle", "no usual plural", "cotton", "Das Hemd ist aus Baumwolle.", "The shirt is made of cotton."],
      ["die Rückgabe", "die Rückgaben", "return of purchased goods", "Die Rückgabe ist innerhalb von vierzehn Tagen möglich.", "Returns are possible within fourteen days."],
      ["ein·packen", "packt ein · hat eingepackt", "to wrap; to pack", "Können Sie das Geschenk einpacken?", "Can you wrap the present?"],
      ["aus·wählen", "wählt aus · hat ausgewählt", "to choose; to select", "Ich wähle den grünen Schal aus.", "I choose the green scarf."],
      ["bequem", "adjective/adverb", "comfortable", "Diese Schuhe sind bequem.", "These shoes are comfortable."],
    ],
    message: "Liebe Kundin, Ihre bestellte Jacke ist da. Sie können sie bis Samstag abholen und im Geschäft anprobieren. Bitte bringen Sie Ihre Bestellnummer mit. Am Samstag schließen wir bereits um 16 Uhr. Ihr Modehaus am Park",
    responses: [
      ["Bis wann können Sie die Jacke abholen und was brauchen Sie dafür?", "Ich kann sie bis Samstag abholen und brauche meine Bestellnummer."],
      ["Sie können erst Samstag um 17 Uhr kommen. Schreiben Sie dem Geschäft und bitten Sie um eine andere Möglichkeit.", "Guten Tag, ich kann erst am Samstag um 17 Uhr kommen. Kann ich die Jacke am Montag abholen?"],
      ["Eine Freundin möchte die Jacke vor dem Kauf sehen. Erklären Sie, wo und wann das möglich ist.", "Ich kann die Jacke im Geschäft anprobieren. Wir müssen bis Samstag kommen, am Samstag vor 16 Uhr."],
    ],
  },
  {
    words: [
      ["die Veranstaltung", "die Veranstaltungen", "event", "Die Veranstaltung beginnt um sieben.", "The event starts at seven."],
      ["die Verabredung", "die Verabredungen", "arrangement to meet; date", "Ich habe heute eine Verabredung.", "I have arranged to meet someone today."],
      ["der Treffpunkt", "die Treffpunkte", "meeting point", "Unser Treffpunkt ist vor dem Kino.", "Our meeting point is in front of the cinema."],
      ["die Überraschung", "die Überraschungen", "surprise", "Die Feier ist eine Überraschung.", "The party is a surprise."],
      ["der Kuchen", "die Kuchen", "cake", "Ich bringe einen Kuchen mit.", "I bring a cake."],
      ["das Getränk", "die Getränke", "drink; beverage", "Die Getränke stehen in der Küche.", "The drinks are in the kitchen."],
      ["die Mitfahrgelegenheit", "die Mitfahrgelegenheiten", "lift; opportunity to share a ride", "Ich suche eine Mitfahrgelegenheit zum Fest.", "I am looking for a lift to the festival."],
      ["teil·nehmen", "nimmt teil · hat teilgenommen; an + dative", "to take part", "Ich nehme am Sprachcafé teil.", "I take part in the language cafe."],
      ["mit·bringen", "bringt mit · hat mitgebracht", "to bring along", "Soll ich etwas mitbringen?", "Should I bring anything?"],
      ["gemeinsam", "adjective/adverb", "together; shared", "Wir planen gemeinsam ein Fest.", "We plan a celebration together."],
    ],
    message: "Hallo zusammen, wegen des Regens feiern wir meinen Geburtstag nicht im Park, sondern bei mir zu Hause. Die Adresse ist Gartenstraße 8. Es geht am Samstag um 18 Uhr los. Bringt bitte etwas zu trinken mit und sagt mir bis Freitag Bescheid. Lea",
    responses: [
      ["Wo findet die Feier jetzt statt und warum?", "Die Feier findet bei Lea zu Hause statt, weil es regnet."],
      ["Sagen Sie zu und fragen Sie, ob Sie einen Freund mitbringen dürfen.", "Hallo Lea, ich komme gern am Samstag. Darf ich einen Freund mitbringen?"],
      ["Sie können nicht kommen. Sagen Sie höflich ab und schlagen Sie ein anderes Treffen vor.", "Liebe Lea, leider kann ich am Samstag nicht kommen. Können wir uns am Sonntag im Café treffen?"],
    ],
  },
  {
    words: [
      ["der Fahrplan", "die Fahrpläne", "timetable", "Der neue Fahrplan gilt ab Montag.", "The new timetable applies from Monday."],
      ["der Sitzplatz", "die Sitzplätze", "seat", "Ist dieser Sitzplatz noch frei?", "Is this seat still available?"],
      ["die Hinreise", "die Hinreisen", "outward journey", "Die Hinreise dauert drei Stunden.", "The outward journey takes three hours."],
      ["die Rückreise", "die Rückreisen", "return journey", "Unsere Rückreise ist am Sonntag.", "Our return journey is on Sunday."],
      ["die Jugendherberge", "die Jugendherbergen", "youth hostel", "Die Jugendherberge liegt am Fluss.", "The youth hostel is by the river."],
      ["die Halbpension", "no usual plural", "half board (breakfast and one main meal)", "Wir buchen ein Zimmer mit Halbpension.", "We book a room with half board."],
      ["die Verbindung", "die Verbindungen", "transport connection; service here", "Gibt es eine direkte Verbindung?", "Is there a direct service?"],
      ["verpassen", "verpasst · hat verpasst", "to miss a service or event", "Wir haben den Bus verpasst.", "We missed the bus."],
      ["sich verspäten", "verspätet sich · hat sich verspätet", "to be late; to be delayed", "Unser Zug verspätet sich.", "Our train is delayed."],
      ["direkt", "adjective/adverb", "direct; directly", "Der Bus fährt direkt zum Flughafen.", "The bus goes directly to the airport."],
    ],
    message: "Sehr geehrter Herr Weber, Ihr Zimmer ist am Freitag ab 15 Uhr frei. Wenn Sie nach 20 Uhr ankommen, rufen Sie uns bitte vorher an. Frühstück gibt es von 7 bis 10 Uhr. Der Parkplatz kostet fünf Euro pro Nacht. Ihre Pension Adler",
    responses: [
      ["Ab wann ist das Zimmer frei und wann gibt es Frühstück?", "Das Zimmer ist ab 15 Uhr frei. Frühstück gibt es von 7 bis 10 Uhr."],
      ["Ihr Zug kommt erst um 21 Uhr an. Schreiben Sie eine kurze Nachricht an die Pension.", "Guten Tag, mein Zug kommt erst um 21 Uhr an. Wie bekomme ich dann meinen Zimmerschlüssel?"],
      ["Sie bleiben zwei Nächte mit dem Auto. Nennen Sie die Parkkosten und fragen Sie nach einem freien Parkplatz.", "Der Parkplatz kostet für zwei Nächte zehn Euro. Haben Sie noch einen freien Parkplatz für mich?"],
    ],
  },
  {
    words: [
      ["die Unterlage", "die Unterlagen", "document; supporting paperwork", "Bitte bringen Sie alle Unterlagen mit.", "Please bring all the documents."],
      ["die Kopie", "die Kopien", "copy", "Ich brauche eine Kopie von meinem Ausweis.", "I need a copy of my ID."],
      ["die Frist", "die Fristen", "deadline; time limit", "Die Frist endet am Freitag.", "The deadline is Friday."],
      ["die Gültigkeit", "usually singular", "validity", "Prüfen Sie bitte die Gültigkeit Ihres Passes.", "Please check the validity of your passport."],
      ["die Anschrift", "die Anschriften", "postal address", "Schreiben Sie Ihre Anschrift hier.", "Write your postal address here."],
      ["die Postleitzahl", "die Postleitzahlen", "postcode; ZIP code", "Wie lautet Ihre Postleitzahl?", "What is your postcode?"],
      ["der Dauerauftrag", "die Daueraufträge", "standing order", "Ich bezahle die Miete per Dauerauftrag.", "I pay the rent by standing order."],
      ["eröffnen", "eröffnet · hat eröffnet", "to open an account or business", "Ich möchte ein Konto eröffnen.", "I would like to open an account."],
      ["überweisen", "überweist · hat überwiesen", "to transfer money", "Ich überweise die Miete jeden Monat.", "I transfer the rent every month."],
      ["gültig", "adjective/adverb", "valid", "Mein Ausweis ist noch gültig.", "My ID is still valid."],
    ],
    message: "Ihr Termin im Bürgeramt ist am Montag um 10.30 Uhr. Bringen Sie bitte Ihren Ausweis, das ausgefüllte Formular und eine Kopie Ihres Mietvertrags mit. Bitte kommen Sie zehn Minuten früher. Wenn Sie verhindert sind, sagen Sie den Termin online ab.",
    responses: [
      ["Wann sollen Sie im Bürgeramt sein und welche Unterlagen brauchen Sie?", "Ich soll um 10.20 Uhr dort sein und meinen Ausweis, das Formular und eine Kopie meines Mietvertrags mitbringen."],
      ["Sie sind am Montag krank. Schreiben Sie eine kurze Bitte um einen neuen Termin.", "Guten Tag, leider bin ich am Montag krank. Kann ich bitte einen neuen Termin bekommen?"],
      ["Ihr Mitbewohner möchte nur den Mietvertrag mitnehmen. Erklären Sie ihm, was außerdem nötig ist.", "Du brauchst eine Kopie des Mietvertrags, deinen Ausweis und das ausgefüllte Formular. Bitte komm zehn Minuten vor dem Termin."],
    ],
  },
  {
    words: [
      ["die Prüfung", "die Prüfungen", "exam; examination", "Die Prüfung beginnt um neun.", "The exam starts at nine."],
      ["die Vorbereitung", "die Vorbereitungen", "preparation", "Für die Vorbereitung brauche ich Ruhe.", "I need quiet for the preparation."],
      ["die Lösung", "die Lösungen", "solution; answer", "Vergleiche deine Antwort mit der Lösung.", "Compare your answer with the solution."],
      ["die Anweisung", "die Anweisungen", "instruction", "Lies zuerst die Anweisungen.", "Read the instructions first."],
      ["der Fehler", "die Fehler", "mistake; error", "Aus Fehlern kann man lernen.", "You can learn from mistakes."],
      ["der Fortschritt", "die Fortschritte", "progress", "Du machst gute Fortschritte.", "You are making good progress."],
      ["das Ergebnis", "die Ergebnisse", "result", "Das Ergebnis bekommst du nächste Woche.", "You will receive the result next week."],
      ["wiederholen", "wiederholt · hat wiederholt", "to repeat; to revise", "Ich wiederhole die neuen Wörter.", "I revise the new words."],
      ["vergleichen", "vergleicht · hat verglichen", "to compare", "Wir vergleichen unsere Antworten.", "We compare our answers."],
      ["selbstständig", "adjective/adverb", "independent; independently", "Ich kann die Aufgabe selbstständig lösen.", "I can solve the task independently."],
    ],
    message: "Liebe Kursteilnehmende, unser Übungstest findet am Freitag von 9 bis 11 Uhr in Raum 6 statt. Bitte seid um 8.45 Uhr da und bringt einen Stift mit. Handys bleiben in der Tasche. Nach dem Test besprechen wir die Lösungen gemeinsam. Der Test ist nur zur Übung und kein offizielles Zertifikat.",
    responses: [
      ["Wann sollen die Teilnehmenden da sein und was müssen sie mitbringen?", "Sie sollen um 8.45 Uhr da sein und einen Stift mitbringen."],
      ["Ein Freund fragt, ob er nach dem Test ein offizielles Zertifikat bekommt. Antworten Sie mit Informationen aus dem Text.", "Nein, dieser Test ist nur zur Übung. Du bekommst kein offizielles Zertifikat."],
      ["Sie müssen um 11 Uhr sofort gehen. Schreiben Sie der Kursleitung und fragen Sie nach den Lösungen.", "Guten Tag, ich muss am Freitag um 11 Uhr sofort gehen. Können Sie mir die Lösungen später schicken?"],
    ],
  },
];

export function addWeeklyPractice(course: Course): Course {
  for (const [index, addition] of weeks.entries()) {
    const unit = course.weeks[index];
    if (!unit) throw new Error(`Missing week ${index + 1}`);
    const extra: VocabEntry[] = addition.words.map(([term, forms, meaning, example, exampleEn], position) => {
      const article = term.match(/^(der|die|das) /)?.[1] as VocabEntry["article"];
      return {
        id: `${unit.id}-plus-word-${position + 1}`, week: index + 1, term, forms, meaning, example, exampleEn,
        ...(article ? { article, noun: term.slice(4), ...(forms.startsWith("die ") ? { plural: forms } : {}) } : {}),
      };
    });
    course.vocab.push(...extra);
    const retrieval = unit.sections.find((s) => s.role === "retrieval");
    const reading = unit.sections.find((s) => s.role === "reading");
    if (!retrieval || !reading) throw new Error(`Missing practice sections in ${unit.id}`);
    for (const [position, word] of extra.slice(0, 3).entries()) {
      const id = `${unit.id}-plus-easy-${position + 1}`;
      const candidates = [extra[position], extra[(position + 1) % 3], extra[(position + 2) % 3]];
      const correct = ["a", "b", "c"][position];
      const options = ["a", "b", "c"].map((key, option) => ({ key, label: candidates[(option - position + 3) % 3]?.meaning ?? "" }));
      const item: Item = {
        id, n: position + 1, group: "Plus-easy", difficulty: "easy", prompt: `Choose the English meaning: ${word.term}`,
        kind: "choice", blanks: 0, capStart: false, options, correct, answers: [], display: word.meaning ?? "", tag: "WS",
        hint: `Think of this week's topic. ${word.example}`, rule: `${word.term}: ${word.meaning}`,
      };
      unit.items[id] = item;
      retrieval.blocks.push({ kind: "item", itemId: id });
      const mediumId = `${unit.id}-plus-medium-${position + 1}`;
      const noun = word.noun ?? word.term;
      if (!word.example.includes(noun)) throw new Error(`Cloze does not contain ${noun}`);
      unit.items[mediumId] = {
        id: mediumId, n: position + 1, group: "Plus-medium", difficulty: "medium",
        prompt: `Complete with the German word (${word.meaning}): ${word.example.replace(noun, "___")}`,
        kind: "text", blanks: 1, capStart: false, answers: [[noun]], display: noun, tag: "WS",
        hint: "Use the noun from the vocabulary list, with a capital letter.", rule: `${word.term}: ${word.meaning}`,
      };
      retrieval.blocks.push({ kind: "item", itemId: mediumId });
    }
    reading.blocks.push(
      { kind: "h", text: [{ t: "Zusatztraining: eine Nachricht verstehen" }] },
      { kind: "p", text: [{ t: "Lesen Sie die Nachricht. Antworten Sie auf Deutsch. Mehrere Antworten sind möglich. Vergleichen Sie Ihre Antwort mit dem Beispiel." }] },
      { kind: "quote", lines: [[{ t: addition.message }]] },
    );
    for (const [position, [prompt, model]] of addition.responses.entries()) {
      const id = `${unit.id}-plus-hard-${position + 1}`;
      unit.items[id] = {
        id, n: position + 1, group: "Plus-hard", difficulty: "hard", prompt, kind: "open", blanks: 0,
        capStart: false, answers: [], display: model, tag: "WS",
        hint: "Find the relevant detail in the message, then write a short German response.",
        rule: "Check the facts, the required points, verb position and polite wording. Other correct answers are possible.",
      };
      reading.blocks.push({ kind: "item", itemId: id });
    }
    const vocabulary = unit.sections.find((s) => s.role === "vocab");
    if (!vocabulary) throw new Error(`Missing vocabulary section in ${unit.id}`);
    vocabulary.blocks = vocabularyBlocks(course.vocab.filter((entry) => entry.week === index + 1));
  }
  const dictionary = course.docs.find((doc) => doc.slug === "wortschatz");
  if (dictionary) dictionary.blocks = course.weeks.flatMap((unit, index) => [
    { kind: "h", text: [{ t: unit.title }] } as Block,
    ...vocabularyBlocks(course.vocab.filter((entry) => entry.week === index + 1)),
  ]);
  return course;
}

function vocabularyBlocks(entries: VocabEntry[]): Block[] {
  return [{
    kind: "table",
    variant: "vocabulary",
    header: ["Deutsch", "English meaning", "Forms / plural", "Example / translation"].map((t) => [{ t }]),
    rows: entries.map((entry) => [entry.term, entry.meaning ?? "", entry.forms, `${entry.example}\n${entry.exampleEn ?? ""}`].map((t) => [{ t }])),
  }];
}