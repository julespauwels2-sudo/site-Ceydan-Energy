/* =========================================================
   CEDYAN ENERGY — Catalogue
   - Ajouter un produit = ajouter une ligne dans PRODUITS.
   - nom : nom simple et lisible / ref : référence fabricant.
   - Version de secours : le catalogue réel est dans Supabase (modifiable depuis le dashboard).
   - Les prix ne sont plus ici : ils sont protégés dans Supabase, visibles des seuls pros validés.
   - "img" : photo produit. Si elle ne charge pas, une illustration s'affiche.
   (Étape 2 : ces données passeront dans Supabase, modifiables depuis le dashboard.)
   ========================================================= */
const IMG = (id, slug) => `https://cedyan-energy.net/${id}-home_default/${slug}.jpg`;

window.CATEGORIES = [
  { id: "kits", nom: "Kits solaires", desc: "Centrales isolées, kits raccordés réseau et Packs Détresse Cyclone, assemblés avec le matériel en stock." },
  { id: "panneaux", nom: "Panneaux photovoltaïques", desc: "JA Solar, Jinko Solar, Ecodelta et AXIworld." },
  { id: "regulateurs", nom: "Régulateurs", desc: "Régulateurs MPPT Victron SmartSolar, de 30 à 200 A." },
  { id: "onduleurs", nom: "Onduleurs", desc: "Onduleurs réseau et hybrides Huawei et GoodWe, monophasés et triphasés." },
  { id: "convertisseurs", nom: "Convertisseurs", desc: "Convertisseurs-chargeurs Victron MultiPlus-II et Quattro, 24 V et 48 V." },
  { id: "batteries", nom: "Batteries", desc: "Lithium LiFePO4 Pylontech, BYD, Huawei, BSL Batt et OPzS Hoppecke." },
  { id: "structures", nom: "Structure et fixation", desc: "Rails, étriers et visserie K2 Systems et Novotegra." },
  { id: "cables", nom: "Câbles", desc: "Câble solaire, connecteurs et câbles de liaison batterie." },
  { id: "monitoring", nom: "Monitoring et accessoires", desc: "Passerelles, écrans, compteurs et câbles de communication." },
  { id: "protections", nom: "Protection électrique", desc: "Coffrets AC et DC, sectionneurs, disjoncteurs et fusibles." }
];

window.PRODUITS = [
  // Panneaux
  { id: "ja-500", cat: "panneaux", marque: "JA Solar", nom: "Panneau 500 W Full Black", ref: "JAM60D41-500/LB", img: IMG(1654, "ja-solar-jam60d41lb-500w-bifacial-double-glass-2mm-half-cut-full-black-jam60d41-500lb"), stock: true },
  { id: "jinko-tiger", cat: "panneaux", marque: "Jinko Solar", nom: "Panneau Tiger Neo", ref: "Gamme Tiger Neo", img: "", stock: true },
  { id: "ecodelta", cat: "panneaux", marque: "Ecodelta", nom: "Panneau monocristallin", ref: "Gamme Ecodelta", img: "", stock: true },
  { id: "axiworld", cat: "panneaux", marque: "AXIworld", nom: "Panneau AXIworldpremium", ref: "Gamme AXIworld", img: "", stock: true },

  // Régulateurs
  { id: "mppt-100-30", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 100/30", ref: "SmartSolar MPPT 100/30", img: IMG(277, "bluesolar-mppt-7515-retail"), stock: true },
  { id: "mppt-100-50", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 100/50", ref: "SmartSolar MPPT 100/50", img: IMG(281, "mppt-victron-100-50"), stock: true },
  { id: "mppt-150-35", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 150/35", ref: "SmartSolar MPPT 150/35", img: IMG(285, "mppt-victron-150-35"), stock: true },
  { id: "mppt-150-60", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 150/60", ref: "SmartSolar MPPT 150/60-Tr", img: IMG(1276, "mppt-victron-150-60"), stock: true },
  { id: "mppt-150-70", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 150/70", ref: "SmartSolar MPPT 150/70-Tr", img: IMG(780, "mppt-victron-150-70"), stock: true },
  { id: "mppt-250-70", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 250/70", ref: "SmartSolar MPPT 250/70-Tr", img: IMG(794, "smartsolar-mppt-25070-tr"), stock: true },
  { id: "mppt-250-100", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT 250/100", ref: "SmartSolar MPPT 250/100-Tr VE.Can", img: IMG(1751, "smartsolar-mppt-250100-tr-vecan-"), stock: true },
  { id: "mppt-rs-450", cat: "regulateurs", marque: "Victron Energy", nom: "Régulateur MPPT RS 450/200", ref: "SmartSolar MPPT RS 450/200-Tr", img: IMG(1511, "smartsolar-mppt-rs-450200-tr"), stock: true },

  // Onduleurs
  { id: "goodwe-3000", cat: "onduleurs", marque: "GoodWe", nom: "Onduleur 3 kW", ref: "GW3000-XS G3", img: IMG(1740, "goodwe-gw3000-xs-g3"), stock: true },
  { id: "goodwe-6000", cat: "onduleurs", marque: "GoodWe", nom: "Onduleur hybride 6 kW", ref: "GW6000N-EH", img: IMG(1737, "goodwe-gw6000n-eh"), stock: true },
  { id: "huawei-3k", cat: "onduleurs", marque: "Huawei", nom: "Onduleur hybride 3 kW", ref: "SUN2000-3K-LB0", img: IMG(991, "huawei-sun2000-3k-lb0"), stock: true },
  { id: "huawei-5k", cat: "onduleurs", marque: "Huawei", nom: "Onduleur hybride 5 kW", ref: "SUN2000-5K-LB0", img: IMG(986, "huawei-sun2000-5k-lb0"), stock: true },
  { id: "huawei-6k", cat: "onduleurs", marque: "Huawei", nom: "Onduleur hybride 6 kW", ref: "SUN2000-6K-LB0", img: IMG(1375, "huawei-sun2000-6k-lb0"), stock: true },
  { id: "huawei-8k", cat: "onduleurs", marque: "Huawei", nom: "Onduleur hybride 8 kW", ref: "SUN2000-8KTL-LC0", img: IMG(1385, "huawei-sun2000-8ktl-lc0"), stock: true },
  { id: "huawei-10k", cat: "onduleurs", marque: "Huawei", nom: "Onduleur hybride triphasé 10 kW", ref: "SUN2000-10K-MAP0", img: IMG(971, "huawei-sun2000-10k-map0-"), stock: true },

  // Convertisseurs
  { id: "mp2-48-3000", cat: "convertisseurs", marque: "Victron Energy", nom: "Convertisseur-chargeur 3000 VA 48 V", ref: "MultiPlus-II 48/3000/35-32", img: IMG(1667, "multiplus-ii-48300035-32-230v"), stock: true },
  { id: "mp2-24-3000", cat: "convertisseurs", marque: "Victron Energy", nom: "Convertisseur-chargeur 3000 VA 24 V", ref: "MultiPlus-II 24/3000/70-32", img: IMG(795, "multiplus-ii-24300070-32-230v"), stock: true },
  { id: "mp2-48-5000", cat: "convertisseurs", marque: "Victron Energy", nom: "Convertisseur-chargeur 5000 VA 48 V", ref: "MultiPlus-II 48/5000/70-50", img: IMG(489, "multiplus-ii-24300070-32-230v"), stock: true },
  { id: "mp2-48-8000", cat: "convertisseurs", marque: "Victron Energy", nom: "Convertisseur-chargeur 8000 VA 48 V", ref: "MultiPlus-II 48/8000/110-100", img: IMG(1419, "multiplus-ii-488000110-100-230v"), stock: true },
  { id: "mp2-48-10000", cat: "convertisseurs", marque: "Victron Energy", nom: "Convertisseur-chargeur 10 000 VA 48 V", ref: "MultiPlus-II 48/10000/140-100", img: IMG(1556, "multiplus-ii-4810000140-100-230v-"), stock: true },
  { id: "quattro-48-5000", cat: "convertisseurs", marque: "Victron Energy", nom: "Quattro 5000 VA 48 V", ref: "Quattro 48/5000/70-100/100", img: IMG(487, "quattro-123000120-5050-230v-vebus"), stock: true },
  { id: "quattro-48-10000", cat: "convertisseurs", marque: "Victron Energy", nom: "Quattro 10 000 VA 48 V", ref: "Quattro 48/10000/140-100/100", img: IMG(484, "quattro-123000120-5050-230v-vebus"), stock: true },

  // Batteries
  { id: "us2000c", cat: "batteries", marque: "Pylontech", nom: "Batterie lithium 2,4 kWh", ref: "US2000C", img: IMG(604, "batterie-lithium-ion-us2000c-24kwh"), stock: true },
  { id: "up2500", cat: "batteries", marque: "Pylontech", nom: "Batterie lithium 2,8 kWh", ref: "UP2500", img: IMG(1571, "batterie-lithium-ion-up2500-28kwh"), stock: true },
  { id: "us3000", cat: "batteries", marque: "Pylontech", nom: "Batterie lithium 3,5 kWh", ref: "US3000C", img: IMG(1573, "batterie-lithium-ion-us3000-35kwh"), stock: true },
  { id: "us5000", cat: "batteries", marque: "Pylontech", nom: "Batterie lithium 4,8 kWh", ref: "US5000", img: IMG(1456, "batterie-lithium-ion-us5000-48kwh"), stock: true },
  { id: "bsl-100", cat: "batteries", marque: "BSL Batt", nom: "Batterie lithium 5,12 kWh", ref: "LiFePO4 51,2 V 100 Ah", img: IMG(1743, "bsl-batt-lifepo4-512-v-100-a"), stock: true },
  { id: "byd-lvs4", cat: "batteries", marque: "BYD", nom: "Module batterie 4 kWh", ref: "Battery-Box Premium LVS 4.0", img: IMG(1742, "batterie-byd-lvs-40kwh"), stock: true },
  { id: "byd-pdu", cat: "batteries", marque: "BYD", nom: "Unité de gestion de tour", ref: "Battery-Box LVS PDU", img: IMG(1662, "batterie-box-byd-pdu-"), stock: true },
  { id: "luna-7", cat: "batteries", marque: "Huawei", nom: "Batterie lithium 7 kWh", ref: "LUNA2000 S1 7 kWh", img: IMG(1745, "huawei-luna-2000-s1-set-de-batterie-7-kwh"), stock: true },
  { id: "luna-14", cat: "batteries", marque: "Huawei", nom: "Batterie lithium 14 kWh", ref: "LUNA2000 S1 14 kWh", img: IMG(1749, "huawei-luna-2000-s1-set-de-batterie-14-kwh"), stock: true },
  { id: "opzs-420", cat: "batteries", marque: "Hoppecke", nom: "Batterie OPzS 2 V 420 Ah", ref: "OPzS 420 Ah", img: IMG(422, "batterie-1070ah-opz"), stock: false },
  { id: "opzs-1520", cat: "batteries", marque: "Hoppecke", nom: "Batterie OPzS 2 V 1520 Ah", ref: "OPzS 1520 Ah", img: IMG(1274, "batterie-1520ah-opz"), stock: false },

  // Structures
  { id: "k2-clamp-mc", cat: "structures", marque: "K2 Systems", nom: "Étrier intermédiaire 25-40 mm", ref: "K2 Clamp MC", img: IMG(1514, "k2-clamp-mc-25-40-mm-"), stock: true },
  { id: "k2-clamp-ec", cat: "structures", marque: "K2 Systems", nom: "Étrier de fin 30-40 mm", ref: "K2 Clamp EC Hybrid", img: IMG(1517, "k2-clamp-ec-30-40-hybrid"), stock: true },
  { id: "k2-raccord", cat: "structures", marque: "K2 Systems", nom: "Raccord de rail SolidRail", ref: "K2 SolidRail", img: IMG(666, "raccord-k2-solidrail-kd25059"), stock: true },
  { id: "vis-m10", cat: "structures", marque: "K2 Systems", nom: "Vis double filetage bois M10 × 180", ref: "Inox", img: IMG(1394, "vis-double-filetage-bois-m10x180"), stock: true },
  { id: "novo-croise", cat: "structures", marque: "Novotegra", nom: "Raccord de rails croisés", ref: "Kit C M14", img: IMG(1687, "novotegra-kit-de-raccord-de-rails-croises-c-m14"), stock: true },
  { id: "novo-ext-noir", cat: "structures", marque: "Novotegra", nom: "Attache d'extrémité noire 30-42 mm", ref: "Kit C noir", img: IMG(1709, "novotegra-kit-d-attache-panneau-d-extremite-30-42-c-noir"), stock: true },
  { id: "novo-centre-noir", cat: "structures", marque: "Novotegra", nom: "Attache centrale noire avec mise à la terre", ref: "Kit C noir MAT", img: IMG(1704, "novotegra-kit-d-attache-centrale-panneau-30-42-c-noir-avec-mat"), stock: true },
  { id: "novo-vis-c47", cat: "structures", marque: "Novotegra", nom: "Kit de vis pour rail C47", ref: "Kit C47", img: IMG(1677, "kit-de-vis-c47-novotegra-fixation-rail-photovoltaique"), stock: true },

  // Câbles
  { id: "cable-6", cat: "cables", marque: "Câble solaire", nom: "Câble solaire 6 mm² au mètre", ref: "H1Z2Z2-K", img: IMG(553, "cable-solaire-6mm-h1z2z2-k"), stock: true },
  { id: "mc4", cat: "cables", marque: "Stäubli", nom: "Connecteurs MC4 (paire)", ref: "MC4 Multi-Contact", img: "", stock: true },
  { id: "cables-pylontech", cat: "cables", marque: "Pylontech", nom: "Jeu de câbles batterie", ref: "Gammes US et UP", img: IMG(1598, "cables-de-batterie-pylontech-pour-gammes-us-et-up"), stock: true },
  { id: "bloc-25", cat: "cables", marque: "Digital Electric", nom: "Bloc de distribution 25 mm²", ref: "2 entrées / 2 sorties", img: IMG(1562, "poignee-de-transport"), stock: true },

  // Monitoring et accessoires
  { id: "cerbo-gx", cat: "monitoring", marque: "Victron Energy", nom: "Passerelle de supervision", ref: "Cerbo GX", img: IMG(893, "cerbo-gx"), stock: true },
  { id: "gx-touch", cat: "monitoring", marque: "Victron Energy", nom: "Écran tactile 5 pouces", ref: "GX Touch 50", img: IMG(914, "gx-touch-50"), stock: true },
  { id: "pluggable-display", cat: "monitoring", marque: "Victron Energy", nom: "Écran pour régulateur", ref: "SmartSolar Pluggable Display", img: IMG(917, "smartsolar-pluggable-display"), stock: true },
  { id: "huawei-dongle", cat: "monitoring", marque: "Huawei", nom: "Clé Wi-Fi et Ethernet", ref: "Smart Dongle WLAN-FE", img: IMG(958, "huawei-smart-dongle-wlanfe-supportant-le-wlan-hotspot-"), stock: true },
  { id: "huawei-dongle-4g", cat: "monitoring", marque: "Huawei", nom: "Clé 4G", ref: "Smart Dongle B-06-EU", img: IMG(661, "huawei-smart-dongleb-06-eu-4g"), stock: true },
  { id: "huawei-meter", cat: "monitoring", marque: "Huawei", nom: "Compteur intelligent monophasé", ref: "DDSU666-H 100 A", img: IMG(1524, "huawei-smart-power-sensor-ddsu666-h-1-ph-100a"), stock: true },
  { id: "vedirect", cat: "monitoring", marque: "Victron Energy", nom: "Câble VE.Direct 0,9 m", ref: "VE.Direct", img: IMG(192, "vedirect-cable-03m"), stock: true },
  { id: "vecan-bms", cat: "monitoring", marque: "Victron Energy", nom: "Câble de communication batterie", ref: "VE.Can vers BMS type A", img: IMG(929, "rj45-utp-cable-03-m"), stock: true },
  { id: "rj45-20", cat: "monitoring", marque: "Victron Energy", nom: "Câble RJ45 20 m", ref: "UTP VE.Bus", img: IMG(475, "rj45-utp-cable-03-m"), stock: true },

  // Protections
  { id: "coffret-ac-3", cat: "protections", marque: "Coffret PV", nom: "Coffret AC 3 kW", ref: "16 A IP65", img: IMG(1480, "coffret-pv-3kw-ac-16a-ip65"), stock: true },
  { id: "coffret-ac-6", cat: "protections", marque: "Coffret PV", nom: "Coffret AC 6 kW", ref: "32 A IP65 + interrupteur", img: IMG(1559, "coffret-pv-6kw-ac-32a-ip65-inter-3p"), stock: true },
  { id: "coffret-acdc-3", cat: "protections", marque: "Coffret PV", nom: "Coffret AC/DC 3 kW", ref: "MCPV 600 Vdc 25 A", img: IMG(1476, "mcpv-1t2e1s-600vdc-25a-pf-3kw"), stock: true },
  { id: "coffret-abs-12", cat: "protections", marque: "Coffret ABS", nom: "Coffret étanche 12 modules", ref: "IP65", img: IMG(1759, "coffret-abs-12-modules"), stock: true },
  { id: "sectionneur-dc", cat: "protections", marque: "Sectionneur", nom: "Sectionneur DC 40 A", ref: "1000 Vdc", img: IMG(647, "sectionneur-dc-40a-1000v"), stock: true },
  { id: "disj-16", cat: "protections", marque: "Disjoncteur", nom: "Disjoncteur 16 A", ref: "Ph/N courbe C 4,5 kA", img: IMG(715, "poignee-de-transport"), stock: true },
  { id: "disj-32", cat: "protections", marque: "Disjoncteur", nom: "Disjoncteur 32 A", ref: "Ph/N courbe C 6 kA", img: IMG(1756, "disjoncteur-32a-ph-n-courbe-c-6ka"), stock: true },
  { id: "mega-200-58", cat: "protections", marque: "Victron Energy", nom: "Fusible MEGA 200 A", ref: "MEGA-fuse 58 V", img: IMG(329, "fuse-holder-for-midi-fuse"), stock: true },
  { id: "midi-40-58", cat: "protections", marque: "Victron Energy", nom: "Fusible MIDI 40 A", ref: "MIDI-fuse 58 V", img: IMG(1362, "fuse-holder-for-midi-fuse"), stock: true }
];

/* Kits : affichés dans la catégorie « Kits solaires » du catalogue. */
window.KITS = {
  isoles: [
    { id: "iso-3-bsl", nom: "Centrale isolée 3 kVA", stockage: "5,1 kWh BSL Batt", detail: "6 panneaux 500 Wc, convertisseur Victron 3000 VA, régulateur MPPT, Cerbo GX, fixations et protections", pour: "Carbet, petite maison, local technique", img: IMG(1799, "centrale-solaire-30-kva-batterie-bsl-batt-51kwh") },
    { id: "iso-3-pylon", nom: "Centrale isolée 3 kVA", stockage: "4,8 kWh Pylontech", detail: "6 panneaux 500 Wc, convertisseur Victron 3000 VA, régulateur MPPT, Cerbo GX, fixations et protections", pour: "Maison secondaire, gîte", img: IMG(1795, "centrale-solaire-30-kva-batterie-pylontech-48kwh") },
    { id: "iso-5-pylon", nom: "Centrale isolée 5 kVA", stockage: "9,6 kWh Pylontech", detail: "9 panneaux JA Solar 500 Wc, convertisseur Victron, régulateur MPPT, Cerbo GX", pour: "Maison familiale hors réseau", img: IMG(1784, "centrale-solaire-50-kva-batterie-pylontech-96kwh") },
    { id: "iso-8-pylon", nom: "Centrale isolée 8 kVA", stockage: "14,4 kWh Pylontech", detail: "18 panneaux 500 Wc, convertisseur Victron 8000 VA, régulateur MPPT RS", pour: "Grande maison, exploitation agricole", img: IMG(1793, "centrale-solaire-80-kva-batterie-pylontech-144kwh") }
  ],
  reseau: [
    { id: "res-3-sans", nom: "Centrale raccordée 3 kWc", stockage: "Sans batterie", detail: "6 panneaux JA Solar 500 Wc, onduleur GoodWe, suivi sur téléphone", pour: "Autoconsommation de jour et revente du surplus", img: IMG(1790, "centrale-solaire-30-kva-sans-batterie") },
    { id: "res-3-huawei", nom: "Centrale raccordée 3 kWc Huawei", stockage: "Prête pour batterie", detail: "6 panneaux JA Solar 500 Wc, onduleur hybride Huawei SUN2000, FusionSolar", pour: "Commencer sans batterie, l'ajouter plus tard", img: IMG(1789, "centrale-solaire-30-kva-huawei-batterie") }
  ],
  secours: [
    { id: "sec-essentiel", gamme: "Pack Détresse Cyclone", nom: "Essentiel", stockage: "4,8 kWh", detail: "Convertisseur Victron 3000 VA, Cerbo GX, batterie Pylontech US5000", garde: "Réfrigérateur, éclairage, box internet, ventilateurs, recharge des téléphones", duree: "Environ 30 h pour les essentiels (estimation)", pour: "Garder les essentiels pendant une coupure", img: IMG(1673, "combo-multiplus-ii-48v3000-cerbo-gx-us5000") },
    { id: "sec-foyer", gamme: "Pack Détresse Cyclone", nom: "Foyer", stockage: "9,6 kWh", detail: "Convertisseur Victron 5000 VA, Cerbo GX, 2 batteries Pylontech US5000", garde: "Les essentiels, plus congélateur, pompe à eau, télévision", duree: "Environ 35 h pour toute la maison (estimation)", pour: "Toute une famille pendant une longue coupure", img: IMG(1674, "combo-multiplus-ii-48v5000-cerbo-gx-2-x-us5000") },
    { id: "sec-bastion", gamme: "Pack Détresse Cyclone", nom: "Bastion", stockage: "14,4 kWh", detail: "Convertisseur Victron 8000 VA, Cerbo GX, 3 batteries Pylontech US5000", garde: "Presque toute la maison, ou un commerce, un cabinet, une boulangerie", duree: "Environ 25 h pour un petit commerce, illimité avec des panneaux", pour: "Grande maison, commerce, cabinet", img: IMG(1672, "combo-multiplus-ii-48v8000-cerbo-gx-3-x-us5000") }
  ]
};
