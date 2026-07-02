// Vollständiges Content-Schema für das kaiser-Template (Referenz).
// haldenhof/sueden/valeron bekommen später eigene Dateien (Kopie + Deltas).
//
// Das Dashboard rendert das Formular automatisch aus `fields`; `defaults` sind
// Seed-/Startwerte aus den hartkodierten kaiser-Dateien. Bild-Felder starten
// leer — dort greift auf der Template-Site der lokale Fallback.

import type { ContentSchema } from './types';

export const kaiserSchema: ContentSchema = {
  template: 'kaiser',
  groups: [
    { key: 'global', label: 'Global' },
    { key: 'home', label: 'Startseite' },
    { key: 'restaurant', label: 'Restaurant' },
    { key: 'hotel', label: 'Hotel' },
    { key: 'kaiserFranz', label: 'Kaiser Franz' },
    { key: 'contact', label: 'Kontakt' },
    { key: 'impressum', label: 'Impressum' },
  ],
  fields: [
    // ---- GLOBAL ----
    { group: 'global', key: 'footer.address', label: 'Footer-Adresse', type: 'richtext' },
    { group: 'global', key: 'footer.phone', label: 'Footer-Telefon', type: 'text' },
    { group: 'global', key: 'footer.email', label: 'Footer-E-Mail', type: 'text' },
    {
      group: 'global',
      key: 'announcement.enabled',
      label: 'Ankündigungsbanner anzeigen',
      type: 'boolean',
    },
    { group: 'global', key: 'announcement.title', label: 'Ankündigung — Titel', type: 'text' },
    { group: 'global', key: 'announcement.text', label: 'Ankündigung — Text', type: 'richtext' },

    // ---- STARTSEITE ----
    { group: 'home', key: 'home.hero.headline', label: 'Hero — Überschrift', type: 'text' },
    { group: 'home', key: 'home.hero.text', label: 'Hero — Text', type: 'richtext' },
    { group: 'home', key: 'home.hero.image', label: 'Hero — Bild', type: 'image' },
    {
      group: 'home',
      key: 'home.gallery',
      label: 'Galerie (Masonry)',
      type: 'gallery',
      help: 'Etwa 7 Bilder für die Startseiten-Galerie.',
    },
    {
      group: 'home',
      key: 'home.sections',
      label: 'Inhalts-Abschnitte',
      type: 'list',
      itemLabel: 'Abschnitt',
      fields: [
        { key: 'headline', label: 'Überschrift', type: 'text' },
        { key: 'text', label: 'Text', type: 'richtext' },
        { key: 'image', label: 'Bild', type: 'image' },
        { key: 'buttonLabel', label: 'Button-Text', type: 'text' },
        { key: 'buttonHref', label: 'Button-Link', type: 'text' },
      ],
    },

    // ---- RESTAURANT ----
    {
      group: 'restaurant',
      key: 'restaurant.hero.headline',
      label: 'Hero — Überschrift',
      type: 'text',
    },
    { group: 'restaurant', key: 'restaurant.hero.text', label: 'Hero — Text', type: 'richtext' },
    { group: 'restaurant', key: 'restaurant.hero.image', label: 'Hero — Bild', type: 'image' },
    { group: 'restaurant', key: 'restaurant.gallery', label: 'Galerie', type: 'gallery' },
    { group: 'restaurant', key: 'restaurant.intro.text', label: 'Einleitung', type: 'richtext' },

    // ---- HOTEL ----
    { group: 'hotel', key: 'hotel.hero.headline', label: 'Hero — Überschrift', type: 'text' },
    { group: 'hotel', key: 'hotel.hero.text', label: 'Hero — Text', type: 'richtext' },
    { group: 'hotel', key: 'hotel.hero.image', label: 'Hero — Bild', type: 'image' },
    { group: 'hotel', key: 'hotel.gallery', label: 'Galerie', type: 'gallery' },
    {
      group: 'hotel',
      key: 'hotel.booking.text',
      label: 'Buchungsanfragen — Text',
      type: 'richtext',
    },
    {
      group: 'hotel',
      key: 'hotel.rooms',
      label: 'Zimmer',
      type: 'list',
      itemLabel: 'Zimmer',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'description', label: 'Beschreibung', type: 'text' },
        { key: 'price', label: 'Preis', type: 'text' },
        { key: 'images', label: 'Bilder', type: 'gallery' },
      ],
    },

    // ---- KAISER FRANZ ----
    {
      group: 'kaiserFranz',
      key: 'kaiserFranz.hero.headline',
      label: 'Hero — Überschrift',
      type: 'text',
    },
    { group: 'kaiserFranz', key: 'kaiserFranz.hero.text', label: 'Hero — Text', type: 'richtext' },
    { group: 'kaiserFranz', key: 'kaiserFranz.hero.image', label: 'Hero — Bild', type: 'image' },
    { group: 'kaiserFranz', key: 'kaiserFranz.gallery', label: 'Galerie', type: 'gallery' },
    { group: 'kaiserFranz', key: 'kaiserFranz.text', label: 'Text', type: 'richtext' },
    { group: 'kaiserFranz', key: 'kaiserFranz.button.label', label: 'Button-Text', type: 'text' },
    { group: 'kaiserFranz', key: 'kaiserFranz.button.href', label: 'Button-Link', type: 'text' },

    // ---- KONTAKT ----
    { group: 'contact', key: 'contact.address', label: 'Adresse', type: 'richtext' },
    { group: 'contact', key: 'contact.phone', label: 'Telefon', type: 'text' },
    { group: 'contact', key: 'contact.email', label: 'E-Mail', type: 'text' },
    {
      group: 'contact',
      key: 'contact.hours',
      label: 'Öffnungszeiten',
      type: 'list',
      itemLabel: 'Zeile',
      fields: [
        { key: 'day', label: 'Tag(e)', type: 'text' },
        { key: 'hours', label: 'Zeiten', type: 'text' },
      ],
    },
    {
      group: 'contact',
      key: 'contact.mapEmbed',
      label: 'Karten-Embed (iframe-URL)',
      type: 'text',
    },

    // ---- IMPRESSUM ----
    { group: 'impressum', key: 'impressum.body', label: 'Impressum', type: 'richtext' },
  ],
  defaults: {
    'footer.address': 'Hotel & Restaurant der Kaiser\nGünterstalstr. 38, 79100 Freiburg',
    'footer.phone': '',
    'footer.email': '',
    'announcement.enabled': false,
    'announcement.title': '',
    'announcement.text': '',

    'home.hero.headline': 'Willkommen im Freiburger Kaiser',
    'home.hero.text':
      'Ihrem Rückzugsort im Herzen der Wiehre! Unser traditionsreiches Haus vereint stilvolle Gastlichkeit mit charmantem Kaiserflair und bietet sowohl Hotel als auch Restaurant unter einem Dach. Bei uns erwartet Sie eine Mischung aus entspanntem Luxus und echter Herzlichkeit – ganz nach dem Motto: Ankommen, wohlfühlen, genießen. Ob Sie für eine Übernachtung in Freiburg sind oder sich kulinarisch verwöhnen lassen möchten – im Kaiser sind Sie immer richtig.',
    'home.hero.image': null,
    'home.gallery': [],
    'home.sections': [
      {
        headline: 'Badische Küche mit Tradition',
        text: 'Unser Restaurant lädt Sie ein, badische Küche in stilvollem Ambiente zu genießen. Wir vereinen das Beste aus der Region mit einem Hauch von herrschaftlichem Flair – und servieren Ihnen gutbürgerliche Klassiker auf bestem handwerklichen Niveau.',
        image: null,
        buttonLabel: 'Zum Restaurant',
        buttonHref: '/restaurant',
      },
      {
        headline: 'Übernachten mit Stil und Charme',
        text: 'In unserem Hotel verschmelzen Tradition und zeitgemäßer Komfort zu einer besonderen Wohlfühlatmosphäre. Hier, im malerischen Stadtteil Wiehre, erwarten Sie gemütliche Zimmer, die mit viel Liebe zum Detail gestaltet wurden.',
        image: null,
        buttonLabel: 'Zum Hotel',
        buttonHref: '/hotel',
      },
      {
        headline: 'Hier regiert der Fußball – Willkommen im Kaiser Franz!',
        text: 'Im Kaiser Franz dreht sich alles um die schönste Nebensache der Welt. Unser Fußball-Tempel ist der perfekte Ort, um packende Spiele live zu erleben – in Stadionatmosphäre und bei kühlen Getränken.',
        image: null,
        buttonLabel: 'Zum Kaiser Franz',
        buttonHref: '/kaiser-franz',
      },
    ],

    'restaurant.hero.headline': '',
    'restaurant.hero.text': '',
    'restaurant.hero.image': null,
    'restaurant.gallery': [],
    'restaurant.intro.text': '',

    'hotel.hero.headline': '',
    'hotel.hero.text': '',
    'hotel.hero.image': null,
    'hotel.gallery': [],
    'hotel.booking.text': '',
    'hotel.rooms': [
      { name: 'Suite 102', description: 'Dusche & WC', price: 'ab 135 Euro', images: [] },
      { name: 'Suite 201', description: 'Dusche & WC', price: 'ab 135 Euro', images: [] },
      { name: 'Familienzimmer 106', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 101', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 103', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 104', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 105', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 107', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 108', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 110', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Doppelzimmer 203', description: 'Dusche & WC', price: 'ab 115 Euro', images: [] },
      { name: 'Einzelzimmer 109', description: 'Dusche & WC', price: 'ab 90 Euro', images: [] },
      {
        name: 'Zimmer mit Etagenbad 204',
        description: 'Dusche & WC',
        price: 'ab 69 Euro',
        images: [],
      },
      {
        name: 'Doppelzimmer mit Etagenbad 205',
        description: 'Dusche & WC',
        price: 'ab 80 Euro',
        images: [],
      },
    ],

    'kaiserFranz.hero.headline': '',
    'kaiserFranz.hero.text': '',
    'kaiserFranz.hero.image': null,
    'kaiserFranz.gallery': [],
    'kaiserFranz.text': '',
    'kaiserFranz.button.label': '',
    'kaiserFranz.button.href': '',

    'contact.address': 'Hotel & Restaurant der Kaiser\nGünterstalstr. 38, 79100 Freiburg',
    'contact.phone': '',
    'contact.email': '',
    'contact.hours': [],
    'contact.mapEmbed': '',

    'impressum.body': '',
  },
};
