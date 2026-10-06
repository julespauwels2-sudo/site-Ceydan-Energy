/* =========================================================
   CEDYAN ENERGY — Installateurs partenaires
   zones : "Grande-Terre", "Basse-Terre", "Marie-Galante", "Les Saintes",
           "La Désirade", "Martinique", "Saint-Martin", "Saint-Barthélemy"
   specialites : "Raccordé réseau", "Site isolé", "Batteries", "Pack cyclone"
   exemple: true affiche un badge « Exemple » : supprimer ces 3 fiches
   quand les vrais partenaires sont saisis.
   (Étape 2 : le patron ajoute les partenaires depuis le dashboard.)
   ========================================================= */
window.PARTENAIRES = [
  { nom: "Exemple Solaire Grande-Terre", commune: "Le Gosier", zones: ["Grande-Terre"], rge: true, specialites: ["Raccordé réseau", "Batteries"], telephone: "", email: "", exemple: true },
  { nom: "Exemple Énergie Basse-Terre", commune: "Petit-Bourg", zones: ["Basse-Terre", "Grande-Terre"], rge: true, specialites: ["Raccordé réseau", "Site isolé", "Pack cyclone"], telephone: "", email: "", exemple: true },
  { nom: "Exemple Élec Marie-Galante", commune: "Grand-Bourg", zones: ["Marie-Galante"], rge: false, specialites: ["Site isolé", "Batteries"], telephone: "", email: "", exemple: true }
];
