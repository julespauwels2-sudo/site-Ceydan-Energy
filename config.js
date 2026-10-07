/* =========================================================
   CEDYAN ENERGY — Réglages du site
   Tout ce qui est à personnaliser est ici. Rien d'autre à toucher.
   ========================================================= */
window.CEDYAN_CONFIG = {
  societe: "Cedyan Energy",
  telephone: "0590 32 15 20",
  telephoneLien: "+590590321520",
  email: "yann.pauwels@cedyanenergytrade.com",
  adresse: "AC Moudong, Immeuble Point Plomberie, 97122 Baie-Mahault, Guadeloupe",
  horaires: "Du lundi au jeudi de 8h30 à 16h, le vendredi de 8h30 à 13h",
  // Jours : 1 = lundi … 5 = vendredi. Heures décimales (8.5 = 8h30). Sert au badge « Ouvert maintenant ».
  ouverture: { 1: [8.5, 16], 2: [8.5, 16], 3: [8.5, 16], 4: [8.5, 16], 5: [8.5, 13] },
  horairesDetail: [["Lundi au jeudi", "8h30 à 16h"], ["Vendredi", "8h30 à 13h"], ["Samedi et dimanche", "Fermé"]],
  mapsLien: "https://www.google.com/maps/search/?api=1&query=Cedyan+Energy&query_place_id=ChIJg5bP5Y1FE4wRJmGbkJy_E24",
  // Position exacte du magasin (fiche Google de Cedyan Energy)
  gps: [16.2409161, -61.5809498],
  facebook: "https://www.facebook.com/Cedyan-Energy-1477937619169786/",
  youtube: "https://www.youtube.com/channel/UCXPs2lO-xhEK2AEzHWEL8Zg",

  // Numéro WhatsApp au format international SANS + ni espaces (ex : 590690123456).
  // Vide = les boutons WhatsApp sont masqués.
  whatsapp: "",

  // URL qui reçoit les leads en JSON (POST). Webhook Make / n8n / Zapier / Supabase Edge Function.
  // Vide = le lead part par e-mail (ouverture du logiciel mail du visiteur).
  leadWebhook: "",

  // Supabase (base de données, dashboard, alertes). Clé publique : elle peut être visible.
  supabase: {
    url: "https://uotqqkhraqxtlssgavlm.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdHFxa2hyYXF4dGxzc2dhdmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI1NTAsImV4cCI6MjEwNjgxODU1MH0.61NliFrPeWNilEmXPayAONTIVF49tmq3arjgdzSwPpM"
  },

  // Prime à l'investissement EDF SEI Guadeloupe (autoconsommation avec vente du surplus).
  // Barème trimestriel en € par Wc. Source : photovoltaique.info (ZNI Guadeloupe).
  prime: {
    periode: "du 1er août au 31 octobre 2026",
    paliers: [
      { maxKwc: 3, euroParWc: 1.80 },
      { maxKwc: 9, euroParWc: 1.09 },
      { maxKwc: 36, euroParWc: 0.82 },
      { maxKwc: 100, euroParWc: 0.56 }
    ]
  },

  // Avis Google. Mettre la vraie note et de vrais avis (copier depuis la fiche Google).
  google: {
    note: 4.8,       // ⚠️ à remplacer par la vraie note
    nombreAvis: 0,   // ⚠️ nombre réel d'avis (0 = masqué)
    lienAvis: "https://www.google.com/maps/search/?api=1&query=Cedyan+Energy+Baie-Mahault",
    avis: [
      // exemple: true affiche un badge « Exemple » : retirer la ligne quand l'avis est réel
      { nom: "Client particulier", commune: "Petit-Bourg", note: 5, texte: "Conseil clair pour dimensionner la batterie, matériel dispo tout de suite en magasin. On a passé les dernières coupures sans s'en rendre compte.", exemple: true },
      { nom: "Électricien installateur", commune: "Le Moule", note: 5, texte: "Je me fournis chez Cedyan depuis des années : stock fiable, vraies marques, et une équipe qui répond quand on a une question technique sur chantier.", exemple: true },
      { nom: "Exploitant agricole", commune: "Capesterre-Belle-Eau", note: 5, texte: "Kit isolé pour la pompe et le local de l'exploitation. Plus de groupe électrogène, plus de gasoil à monter.", exemple: true }
    ]
  }
};
