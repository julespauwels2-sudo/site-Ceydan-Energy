# Site Cedyan Energy

Site statique (HTML/CSS/JS), sans build. Déploiement : GitHub puis Vercel, preset **Other**.
Tous les fichiers sont à la racine : glisse-les d'un coup dans GitHub (Add file → Upload files).

## À faire avant la mise en ligne
Tout se règle dans **config.js** et **data.js**, pas besoin de toucher au reste.

1. **config.js → whatsapp** : numéro au format 590690123456 (sinon le bouton WhatsApp est masqué).
2. **config.js → leadWebhook** : URL Make / n8n / Supabase qui reçoit les leads en JSON.
   Sans webhook, le lead s'ouvre dans le logiciel mail du visiteur vers cedyanenergycaraibes@gmail.com.
3. **config.js → google** : vraie note, nombre d'avis, vrais avis (retirer `exemple: true`).
4. **config.js → horaires** : à confirmer.
5. **config.js → prime** : barème EDF SEI, à mettre à jour chaque trimestre (photovoltaique.info, Guadeloupe ZNI).
6. **data.js → prix** : ce sont les prix PUBLICS de l'ancien site, mis en attendant. Remplacer par la grille PRO.
7. **mentions-legales.html** : compléter les zones surlignées en jaune (SIRET, forme juridique, directeur de publication).

## Format d'un lead (POST JSON)
```
{ type: "questionnaire" | "devis" | "compte-pro" | "pack-cyclone",
  date, page, profil, utm, score (0-100),
  contact: { nom, telephone, email, commune, entreprise?, siren?, metier? },
  reponses: { typeClient, besoin, facture, delai },
  recommandation, panier: [{ id, q, nom }], message, verification }
```
`score` aide à prioriser : délai « au plus vite », téléphone, panier rempli et profil pro le font monter.

## Espace pro
Vérification du SIREN/SIRET via l'API publique recherche-entreprises.api.gouv.fr (gratuite, sans clé) :
numéro valide + entreprise active = prix affichés. Si l'API ne répond pas, la demande part en vérification manuelle.
Limite : les prix sont dans data.js, donc lisibles par quelqu'un qui inspecte le code.
Pour un vrai verrou, étape suivante : comptes pros dans Supabase et prix servis côté serveur.

## Photos produits
Chargées depuis cedyan-energy.net. Si une image ne charge pas, une illustration de catégorie s'affiche.
Si l'ancien site est coupé, rapatrier les photos et changer les URL dans data.js.

## Ajouter un produit
Copier une ligne dans `PRODUITS` (data.js), changer id, cat, marque, nom, spec, prix, img, stock.
Catégories : panneaux, onduleurs, convertisseurs, regulateurs, monitoring, batteries, structures, cables, protections.
