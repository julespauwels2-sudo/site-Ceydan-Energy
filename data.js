/* =========================================================
   CEDYAN ENERGY — Catalogue
   - Ajouter un produit = ajouter une ligne dans PRODUITS.
   - "prix" n'est affiché qu'aux professionnels vérifiés (SIREN actif).
     ⚠️ Les prix actuels sont repris de l'ancien site (prix publics) :
     à remplacer par la grille pro HT avant mise en ligne.
   - "img" peut pointer vers une image en ligne ; si elle ne charge pas,
     une illustration de la catégorie s'affiche à la place.
   ========================================================= */
const IMG = (id, slug) => `https://cedyan-energy.net/${id}-home_default/${slug}.jpg`;

window.CATEGORIES = [
  { id: "panneaux", nom: "Panneaux photovoltaïques", court: "Panneaux", desc: "Modules bifaciaux et full black de 500 Wc, testés pour le climat tropical." },
  { id: "onduleurs", nom: "Onduleurs", court: "Onduleurs", desc: "Onduleurs réseau et hybrides Huawei et GoodWe, mono et triphasés." },
  { id: "convertisseurs", nom: "Convertisseurs", court: "Convertisseurs", desc: "Convertisseurs-chargeurs Victron 24 V et 48 V pour sites isolés et secours." },
  { id: "regulateurs", nom: "Régulateurs", court: "Régulateurs", desc: "Régulateurs MPPT SmartSolar et BlueSolar pour charger vos batteries au maximum." },
  { id: "monitoring", nom: "Monitoring et pilotage", court: "Monitoring", desc: "Suivez production, batterie et consommation depuis votre téléphone." },
  { id: "batteries", nom: "Batteries", court: "Batteries", desc: "Lithium LiFePO4 Pylontech, BYD, Huawei, BSL Batt et OPzS Hoppecke." },
  { id: "structures", nom: "Structure et fixation", court: "Fixations", desc: "Rails et attaches K2 Systems et Novotegra pour toitures tôle, tuile et bac acier." },
  { id: "cables", nom: "Câbles et accessoires", court: "Câbles", desc: "Câble solaire H1Z2Z2-K, connecteurs, câbles de communication batterie." },
  { id: "protections", nom: "Protection électrique", court: "Protections", desc: "Coffrets AC/DC, sectionneurs, disjoncteurs et fusibles adaptés au photovoltaïque." }
];

window.PRODUITS = [
  // Panneaux
  { id: "ja-500-lb", cat: "panneaux", marque: "JA Solar", nom: "JAM60D41 500 W bifacial full black", spec: "Double verre 2 mm, demi-cellules", prix: 196.22, img: IMG(1654, "ja-solar-jam60d41lb-500w-bifacial-double-glass-2mm-half-cut-full-black-jam60d41-500lb"), stock: true },
  { id: "peimar-500", cat: "panneaux", marque: "Peimar", nom: "Module 500 Wc", spec: "Monocristallin, cadre aluminium", prix: null, img: "", stock: true },
  { id: "trina-vertex", cat: "panneaux", marque: "Trina Solar", nom: "Vertex S+", spec: "Module résidentiel double verre", prix: null, img: "", stock: false },

  // Onduleurs
  { id: "goodwe-6000", cat: "onduleurs", marque: "GoodWe", nom: "GW6000N-EH hybride", spec: "6 kW monophasé, compatible batterie", prix: 1495, img: IMG(1737, "goodwe-gw6000n-eh"), stock: true },
  { id: "huawei-10k-map0", cat: "onduleurs", marque: "Huawei", nom: "SUN2000-10K-MAP0 hybride", spec: "10 kW triphasé, garantie 10 ans", prix: 3089, img: IMG(971, "huawei-sun2000-10k-map0-"), stock: true },
  { id: "huawei-lb0", cat: "onduleurs", marque: "Huawei", nom: "SUN2000-LB0 monophasé", spec: "Prêt pour batterie Luna 2000", prix: null, img: "", stock: true },

  // Convertisseurs
  { id: "mp2-3000", cat: "convertisseurs", marque: "Victron Energy", nom: "MultiPlus-II 48/3000", spec: "Convertisseur-chargeur 3000 VA", prix: null, img: "", stock: true },
  { id: "mp2-5000", cat: "convertisseurs", marque: "Victron Energy", nom: "MultiPlus-II 48/5000", spec: "Convertisseur-chargeur 5000 VA", prix: null, img: "", stock: true },
  { id: "mp2-8000", cat: "convertisseurs", marque: "Victron Energy", nom: "MultiPlus-II 48/8000", spec: "Convertisseur-chargeur 8000 VA", prix: null, img: "", stock: true },
  { id: "combo-3000", cat: "convertisseurs", marque: "Victron Energy", nom: "Combo MultiPlus-II 3000 + Cerbo GX + US5000", spec: "Pack prêt à brancher, 4,8 kWh", prix: 2619, img: IMG(1673, "combo-multiplus-ii-48v3000-cerbo-gx-us5000"), stock: true },
  { id: "combo-5000", cat: "convertisseurs", marque: "Victron Energy", nom: "Combo MultiPlus-II 5000 + Cerbo GX + 2 × US5000", spec: "Pack prêt à brancher, 9,6 kWh", prix: 4296, img: IMG(1674, "combo-multiplus-ii-48v5000-cerbo-gx-2-x-us5000"), stock: true },

  // Régulateurs
  { id: "mppt-100-30", cat: "regulateurs", marque: "Victron Energy", nom: "SmartSolar MPPT 100/30", spec: "Bluetooth intégré", prix: 190, img: IMG(277, "bluesolar-mppt-7515-retail"), stock: true },
  { id: "mppt-100-50", cat: "regulateurs", marque: "Victron Energy", nom: "SmartSolar MPPT 100/50", spec: "Bluetooth intégré", prix: 225, img: IMG(281, "mppt-victron-100-50"), stock: true },
  { id: "mppt-150-60", cat: "regulateurs", marque: "Victron Energy", nom: "BlueSolar MPPT 150/60", spec: "Pour champs jusqu'à 150 V", prix: null, img: "", stock: true },
  { id: "mppt-rs-450", cat: "regulateurs", marque: "Victron Energy", nom: "SmartSolar MPPT RS 450/200", spec: "Grandes installations 48 V", prix: null, img: "", stock: false },

  // Monitoring
  { id: "cerbo-gx", cat: "monitoring", marque: "Victron Energy", nom: "Cerbo GX", spec: "Supervision à distance via VRM", prix: null, img: "", stock: true },
  { id: "pluggable-display", cat: "monitoring", marque: "Victron Energy", nom: "SmartSolar Pluggable Display", spec: "Écran enfichable pour MPPT", prix: 44.99, img: IMG(917, "smartsolar-pluggable-display"), stock: true },
  { id: "huawei-dongle", cat: "monitoring", marque: "Huawei", nom: "Smart Dongle WLAN-FE", spec: "Suivi FusionSolar", prix: null, img: "", stock: true },
  { id: "vecan-bms", cat: "monitoring", marque: "Victron Energy", nom: "Câble VE.Can vers BMS type A 1,8 m", spec: "Communication batterie-convertisseur", prix: 21, img: IMG(929, "rj45-utp-cable-03-m"), stock: true },

  // Batteries
  { id: "us2000c", cat: "batteries", marque: "Pylontech", nom: "US2000C 2,4 kWh", spec: "LiFePO4, BMS intégré", prix: 770, img: IMG(604, "batterie-lithium-ion-us2000c-24kwh"), stock: true },
  { id: "up2500", cat: "batteries", marque: "Pylontech", nom: "UP2500 2,8 kWh", spec: "Format compact", prix: 1000, img: IMG(1571, "batterie-lithium-ion-up2500-28kwh"), stock: true },
  { id: "us3000", cat: "batteries", marque: "Pylontech", nom: "US3000 3,5 kWh", spec: "LiFePO4 modulaire", prix: 1100, img: IMG(1573, "batterie-lithium-ion-us3000-35kwh"), stock: true },
  { id: "us5000", cat: "batteries", marque: "Pylontech", nom: "US5000 4,8 kWh", spec: "LiFePO4 modulaire", prix: 1500, img: IMG(1456, "batterie-lithium-ion-us5000-48kwh"), stock: true },
  { id: "bsl-100", cat: "batteries", marque: "BSL Batt", nom: "LiFePO4 51,2 V 100 Ah", spec: "5,12 kWh", prix: 1050, img: IMG(1743, "bsl-batt-lifepo4-512-v-100-a"), stock: true },
  { id: "byd-lvs4", cat: "batteries", marque: "BYD", nom: "Battery-Box Premium LVS 4.0", spec: "4 kWh évolutif", prix: 2095, img: IMG(1742, "batterie-byd-lvs-40kwh"), stock: true },
  { id: "byd-pdu", cat: "batteries", marque: "BYD", nom: "Battery-Box PDU LVS", spec: "Unité de gestion de tour", prix: 537.5, img: IMG(1662, "batterie-box-byd-pdu-"), stock: true },
  { id: "luna-7", cat: "batteries", marque: "Huawei", nom: "Luna 2000 S1 7 kWh", spec: "LFP, extensible jusqu'à 20,7 kWh", prix: 7508, img: IMG(1745, "huawei-luna-2000-s1-set-de-batterie-7-kwh"), stock: true },
  { id: "luna-14", cat: "batteries", marque: "Huawei", nom: "Luna 2000 S1 14 kWh", spec: "LFP, 13,8 kWh utiles", prix: 13048, img: IMG(1749, "huawei-luna-2000-s1-set-de-batterie-14-kwh"), stock: true },
  { id: "opzs-420", cat: "batteries", marque: "Hoppecke", nom: "OPzS 420 Ah 2 V", spec: "Plaques tubulaires, sur commande", prix: 380.4, img: IMG(422, "batterie-1070ah-opz"), stock: false },
  { id: "opzs-1520", cat: "batteries", marque: "Hoppecke", nom: "OPzS 1520 Ah 2 V", spec: "Plaques tubulaires, sur commande", prix: 801.84, img: IMG(1274, "batterie-1520ah-opz"), stock: false },

  // Structures
  { id: "k2-rail", cat: "structures", marque: "K2 Systems", nom: "Rail SingleRail 36", spec: "Aluminium, toiture tôle et bac acier", prix: null, img: "", stock: true },
  { id: "novo-rails-croises", cat: "structures", marque: "Novotegra", nom: "Kit raccord de rails croisés C M14", spec: "Montage en croix", prix: 1.75, img: IMG(1687, "novotegra-kit-de-raccord-de-rails-croises-c-m14"), stock: true },
  { id: "novo-attache-ext", cat: "structures", marque: "Novotegra", nom: "Attache panneau d'extrémité 30-42 noir", spec: "Cadres 30 à 42 mm", prix: 6.2, img: IMG(1709, "novotegra-kit-d-attache-panneau-d-extremite-30-42-c-noir"), stock: true },
  { id: "k2-crochet", cat: "structures", marque: "K2 Systems", nom: "Crochet de toit tuile", spec: "Inox, réglable", prix: null, img: "", stock: true },

  // Câbles
  { id: "cable-6", cat: "cables", marque: "Câble solaire", nom: "H1Z2Z2-K 6 mm²", spec: "Au mètre, résistant UV", prix: 2.35, img: IMG(553, "cable-solaire-6mm-h1z2z2-k"), stock: true },
  { id: "mc4", cat: "cables", marque: "Stäubli Multi-Contact", nom: "Connecteurs MC4 mâle et femelle", spec: "Paire", prix: null, img: "", stock: true },
  { id: "cables-pylontech", cat: "cables", marque: "Pylontech", nom: "Câbles batterie gammes US et UP", spec: "Jeu de liaison", prix: 55, img: IMG(1598, "cables-de-batterie-pylontech-pour-gammes-us-et-up"), stock: true },
  { id: "rj45-20", cat: "cables", marque: "Victron Energy", nom: "Câble RJ45 UTP 20 m", spec: "Réseau VE.Bus", prix: 42, img: IMG(475, "rj45-utp-cable-03-m"), stock: true },

  // Protections
  { id: "coffret-acdc", cat: "protections", marque: "Cedyan", nom: "Coffret de protection AC/DC", spec: "Pré-câblé pour kit résidentiel", prix: null, img: "", stock: true },
  { id: "sectionneur-dc", cat: "protections", marque: "Sectionneur", nom: "Interrupteur sectionneur 40 A / 1000 Vdc", spec: "Coupure côté panneaux", prix: 73.55, img: IMG(647, "sectionneur-dc-40a-1000v"), stock: true },
  { id: "disj-16", cat: "protections", marque: "Disjoncteur", nom: "Disjoncteur 16 A Ph/N courbe C", spec: "4,5 kA", prix: 8.27, img: IMG(715, "poignee-de-transport"), stock: true },
  { id: "disj-32", cat: "protections", marque: "Disjoncteur", nom: "Disjoncteur 32 A Ph/N courbe C", spec: "6 kA", prix: 14.48, img: IMG(1756, "disjoncteur-32a-ph-n-courbe-c-6ka"), stock: true },
  { id: "mega-200-58", cat: "protections", marque: "Victron Energy", nom: "MEGA-fuse 200 A / 58 V", spec: "Pour produits 48 V", prix: 38.67, img: IMG(329, "fuse-holder-for-midi-fuse"), stock: true },
  { id: "midi-40-58", cat: "protections", marque: "Victron Energy", nom: "MIDI-fuse 40 A / 58 V", spec: "Pour produits 48 V", prix: 12.5, img: IMG(1362, "fuse-holder-for-midi-fuse"), stock: true }
];

/* Kits : pas de prix public, uniquement sur demande (ou affichés aux pros). */
window.KITS = {
  isoles: [
    { id: "iso-3-bsl", nom: "Centrale isolée 3 kVA", stockage: "5,1 kWh BSL Batt", detail: "6 panneaux Peimar 500 Wc, MultiPlus-II 48/3000, MPPT 150/60, Cerbo GX", pour: "Carbet, petite maison, local technique", prix: 6480, img: IMG(1799, "centrale-solaire-30-kva-batterie-bsl-batt-51kwh") },
    { id: "iso-3-pylon", nom: "Centrale isolée 3 kVA", stockage: "4,8 kWh Pylontech", detail: "6 panneaux Peimar 500 Wc, MultiPlus-II 48/3000, MPPT 150/60, Cerbo GX", pour: "Maison secondaire, gîte", prix: 6985, img: IMG(1795, "centrale-solaire-30-kva-batterie-pylontech-48kwh") },
    { id: "iso-5-pylon", nom: "Centrale isolée 5 kVA", stockage: "9,6 kWh Pylontech", detail: "9 panneaux JA Solar bifaciaux 500 Wc, MultiPlus-II, MPPT SmartSolar, Cerbo GX", pour: "Maison familiale hors réseau", prix: 9460, img: IMG(1784, "centrale-solaire-50-kva-batterie-pylontech-96kwh") },
    { id: "iso-8-pylon", nom: "Centrale isolée 8 kVA", stockage: "14,4 kWh Pylontech", detail: "18 panneaux Peimar 500 Wc, MultiPlus-II 48/8000, MPPT RS 450/200", pour: "Grande maison, exploitation agricole", prix: 17860, img: IMG(1793, "centrale-solaire-80-kva-batterie-pylontech-144kwh") }
  ],
  reseau: [
    { id: "res-3-sans", nom: "Centrale raccordée 3 kWc", stockage: "Sans batterie", detail: "6 panneaux JA Solar bifaciaux 500 Wc, onduleur GoodWe, suivi sur téléphone", pour: "Baisser la facture le jour, revendre le surplus", prix: 4299, img: IMG(1790, "centrale-solaire-30-kva-sans-batterie") },
    { id: "res-3-huawei", nom: "Centrale raccordée 3 kWc Huawei", stockage: "Prête pour batterie Luna 2000", detail: "6 panneaux JA Solar bifaciaux 500 Wc, onduleur Huawei SUN2000-LB0, FusionSolar", pour: "Commencer sans batterie, l'ajouter plus tard", prix: 5000, img: IMG(1789, "centrale-solaire-30-kva-huawei-batterie") }
  ],
  secours: [
    { id: "sec-veille", gamme: "Pack Détresse Cyclone", nom: "Essentiel", stockage: "4,8 kWh", detail: "Victron MultiPlus-II 48/3000, Cerbo GX, batterie Pylontech US5000", garde: "Réfrigérateur, éclairage, box internet, ventilateurs, recharge des téléphones", duree: "Environ une journée et une nuit pour les essentiels", prix: 2619 },
    { id: "sec-foyer", gamme: "Pack Détresse Cyclone", nom: "Foyer", stockage: "9,6 kWh", detail: "Victron MultiPlus-II 48/5000, Cerbo GX, 2 batteries Pylontech US5000", garde: "Les essentiels, plus congélateur, pompe à eau, télévision", duree: "Environ deux jours pour un foyer raisonnable", prix: 4296 },
    { id: "sec-bastion", gamme: "Pack Détresse Cyclone", nom: "Bastion", stockage: "14,4 kWh", detail: "Victron MultiPlus-II 48/8000, Cerbo GX, 3 batteries Pylontech US5000", garde: "Presque toute la maison, ou un commerce, un cabinet, une boulangerie", duree: "Plusieurs jours, et sans limite si vous ajoutez des panneaux", prix: 6749 }
  ]
};
