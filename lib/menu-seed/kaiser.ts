// Startvorlage für die Speisekarte: die aktuelle Karte des Freiburger Kaiser,
// 1:1 übernommen aus app/data/menuDataStatic.ts im kaiser-Repo.
//
// Damit muss niemand zehn Kategorien abtippen — der Redakteur lädt die Vorlage
// einmal ins Dashboard und pflegt von dort aus weiter. Die im kaiser-Repo
// AUSKOMMENTIERTE Spargelkarte ist hier als `visible: false` erhalten: nicht
// verloren, aber ausgeblendet — genau dafür gibt es das Flag.

import type { StoredCategory, StoredItem, StoredMenu, PriceVariant } from '@/lib/menu-data';

const single = (name: string, price: string, description = ''): StoredItem => ({
  name,
  description,
  priceMode: 'single',
  price,
  variants: [],
});

const varied = (
  name: string,
  variants: PriceVariant[],
  description = '',
): StoredItem => ({
  name,
  description,
  priceMode: 'variants',
  price: '',
  variants,
});

const category = (name: string, items: StoredItem[], visible = true): StoredCategory => ({
  name,
  visible,
  items,
});

export const kaiserMenuSeed: StoredMenu = {
  categories: [
    // Saisonal — im kaiser-Repo auskommentiert, hier ausgeblendet statt gelöscht.
    category(
      'Spargel',
      [
        varied('Spargelcremesuppe', [
          { label: 'klein', price: '6,90 €' },
          { label: 'groß', price: '8,20 €' },
        ]),
        single(
          'Spargelflammkuchen',
          '15,70 €',
          'mit Kirschtomaten, Rucola und Sauce Hollandaise',
        ),
        single(
          'Spargel im Pfannkuchen',
          '18,80 €',
          'mit Tomatenwürfeln, Olivenöl, Grana Padano und Rucola',
        ),
        varied(
          'Spargelsalat an Kräuter-Dressing',
          [
            { label: 'vegan', price: '21,70 €' },
            { label: 'mit 6 Black Tiger Garnelen', price: '29,70 €' },
          ],
          'mit Kirschtomaten, Frühlingszwiebeln und Rucola (vegan)',
        ),
        single(
          'Portion Spargel',
          '24,50 €',
          'mit neuen Kartoffeln oder Kratzete und Sauce Hollandaise',
        ),
        single('Gemischter Schinken', '8,00 €', 'als Beilage zum Spargel oder Spargelsalat'),
        single(
          'Schweineschnitzel „Wiener Art“',
          '9,50 €',
          'als Beilage zum Spargel oder Spargelsalat',
        ),
        single('Kleines Lachsfilet', '12,90 €', 'als Beilage zum Spargel oder Spargelsalat'),
        single(
          'Rinderhüftsteak (ca. 250 g)',
          '16,50 €',
          'als Beilage zum Spargel oder Spargelsalat',
        ),
        varied(
          'Laufener Burg Neuenfels Sauvignon Blanc (trocken)',
          [
            { label: '0,125 l', price: '4,20 €' },
            { label: '0,25 l', price: '7,90 €' },
          ],
          'empfohlene Weinbegleitung',
        ),
      ],
      false,
    ),

    category('Vorspeisen', [
      varied('Des Kaisers Tagessuppe', [
        { label: 'klein', price: '6,40 €' },
        { label: 'groß', price: '8,40 €' },
      ]),
      varied('Rinderkraftbrühe mit Flädle', [
        { label: 'klein', price: '7,70 €' },
        { label: 'groß', price: '9,50 €' },
      ]),
      single('Vorspeisensalat mit Rohkost', '5,90 €'),
      single(
        'Rote Bete-Carpaccio mit Kräuter-Vinaigrette',
        '16,80 €',
        'und Ziegenfrischkäse vom Horbener Ringlihof an Salatbouquet',
      ),
      single('Hausgebeizter Lachs an Honig-Senf-Sauce', '17,80 €', 'und Salatbouquet'),
    ]),

    category('Salate', [
      varied('Gemischter Marktsalat mit Rohkost und Kracherle', [
        { label: 'klein', price: '9,90 €' },
        { label: 'groß', price: '16,50 €' },
      ]),
      single(
        'Großer gemischter Marktsalat mit Rohkost',
        '20,90 €',
        'und gebratenen Hähnchenbruststreifen in süß-saurer Chilisauce, Sesamöl und Koriander',
      ),
      single(
        'Großer gemischter Marktsalat mit Rohkost',
        '21,90 €',
        'und gegrillten Rinderstreifen in Rotwein-Knoblauchsauce',
      ),
      single(
        '„Gitzi-Salat“ Horbener Natur-Ziegenfrischkäse vom Ringlihof',
        '22,50 €',
        'an fein mariniertem Wiesenkräutersalat mit Artischocken gerösteten Nüssen und Thymian-Honig',
      ),
      single(
        'Großer gemischter Marktsalat mit Rohkost',
        '24,50 €',
        'und gegrillten Filets von Dorade und Lachs',
      ),
    ]),

    category('Fleisch', [
      varied(
        'Schnitzel vom Schwein „Wiener Art“',
        [
          { label: 'eins', price: '13,90 €' },
          { label: 'zwei', price: '18,80 €' },
        ],
        'mit Pommes frites, Brägele, hausgemachten Spätzle oder gemischtem Marktsalat',
      ),
      single('Gegrilltes Pollo Fino', '19,50 €', 'mit Ratatouille und gebackenen Kartoffeln'),
      single(
        'Putengulasch von der Keule',
        '19,50 €',
        'in Kapernsauce mit Gemüse der Saison und Basmatireis',
      ),
      single(
        'Hausgemachte Frikadellen von Rind und Schwein',
        '21,50 €',
        'mit Zwiebelsauce, Gemüse der Saison und Bandnudeln',
      ),
      single(
        'Gesottener Tafelspitz mit würziger Meerrettichsauce',
        '22,80 €',
        'Bouillonkartoffeln und Rote Bete-Salat',
      ),
      single(
        'Gegrilltes Rinderhüftsteak (ca. 250 g) an Pfeffer-Rahmsauce oder Kräuterbutter',
        '30,90 €',
        'mit Pommes frites, Brägele, hausgemachten Spätzle oder gemischtem Marktsalat',
      ),
    ]),

    category('Vegetarisch', [
      single(
        'Käsespätzle',
        '14,80 €',
        'mit Bergkäse, Emmentaler, Edamer und karamellisierten Zwiebeln',
      ),
      single('Käsespätzle mit Speck', '16,80 €'),
      single(
        'Gebackene Kichererbsen-Krapfen an pikanter Tomatensauce',
        '18,70 €',
        'mit Gemüsebulgur (vegan)',
      ),
      single(
        'Tomate aus dem Ofen gefüllt mit Gemüsebulgur',
        '18,70 €',
        'Kräuter-Joghurt-Dip und kleinem Blattsalat',
      ),
    ]),

    category('Fisch', [
      single('Gebratenes Lachsfilet', '24,90 €', 'mit Kokosspinat und Basmatireis'),
      single('Zwei gegrillte Doradenfilets', '25,50 €', 'auf Ratatouille und Bandnudeln'),
    ]),

    category('Flammkuchen', [
      single('Flammkuchen „Joseph“', '14,40 €', 'mit Schmand, Speck, Zwiebeln und Bergkäse'),
      single(
        'Flammkuchen „Günter“',
        '15,60 €',
        'mit Schmand, Ziegenkäse, Rucola, Wiesenkräuter-Pesto und Thymian-Honig',
      ),
    ]),

    category('Dessert', [
      single('Crème brûlée faite maison', '7,60 €'),
      single('Hausgemachte Apfelküchle mit Sahne und Vanilleeis', '8,70 €'),
      single('Vegane Schokoladenmousse', '7,60 €'),
      varied(
        'Eisauswahl',
        [
          { label: 'je Kugel', price: '2,50 €' },
          { label: 'mit Sahne', price: '0,60 €' },
        ],
        'Vanille, Erdbeere, Schokolade, Walnuss und Zitrone (vegan)',
      ),
    ]),

    category('Für unsere „kleinen“ Gäste', [
      single('Schnitzel „Wiener Art“', '9,90 €', 'mit Pommes frites oder Spätzle'),
      single('Kinderspaghetti mit Tomatensauce und Reibekäse', '6,20 €'),
      single('Kinderspätzle mit Rahmsauce', '5,60 €'),
      single('Kinderpommes', '5,20 €'),
    ]),

    category('Vesperkarte ab 15 Uhr', [
      varied('Des Kaisers Tagessuppe', [
        { label: 'klein', price: '6,40 €' },
        { label: 'groß', price: '8,40 €' },
      ]),
      varied(
        'Wurstsalat',
        [
          { label: 'dazu Brot', price: '14,20 €' },
          { label: 'dazu Brägele', price: '17,40 €' },
        ],
        'mit sauren Gurkenstreifen und Zwiebeln',
      ),
      varied(
        'Elsässer Wurstsalat',
        [
          { label: 'dazu Brot', price: '15,30 €' },
          { label: 'dazu Brägele', price: '18,50 €' },
        ],
        'mit Zwiebeln',
      ),
      single('Bibbeleskäs', '16,50 €', 'mit Brägele und gemischtem Marktsalat'),
      single(
        '„Badisches Dreierlei“',
        '18,50 €',
        'Wurstsalat mit sauren Gurkenstreifen, Bibbeleskäs und Brägele',
      ),
      varied('Gemischter Marktsalat mit Rohkost und Kracherle', [
        { label: 'klein', price: '9,90 €' },
        { label: 'groß', price: '16,50 €' },
      ]),
      single(
        'Großer gemischter Marktsalat mit Rohkost',
        '20,90 €',
        'und gebratenen Hähnchenbruststreifen in süß-saurer Chilisauce, Sesamöl und Koriander',
      ),
      varied(
        'Schnitzel vom Schwein „Wiener Art“',
        [
          { label: 'eins', price: '13,90 €' },
          { label: 'zwei', price: '18,80 €' },
        ],
        'mit Pommes frites, Brägele, hausgemachten Spätzle oder gemischtem Marktsalat',
      ),
      single(
        'Gebackene Kichererbsen-Krapfen an pikanter Tomatensauce',
        '18,70 €',
        'mit Gemüsebulgur (vegan)',
      ),
      single('Flammkuchen „Joseph“', '14,40 €', 'mit Schmand, Speck, Zwiebeln und Bergkäse'),
      single(
        'Flammkuchen „Günter“',
        '15,60 €',
        'mit Schmand, Ziegenkäse, Rucola, Wiesenkräuter-Pesto und Thymian-Honig',
      ),
      single('Große Portion Pommes frites', '7,60 €'),
      single('Große Portion hausgemachte Spätzle mit Rahmsauce', '8,60 €'),
    ]),
  ],
};
