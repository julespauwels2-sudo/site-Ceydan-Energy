# Site Cedyan Energy (version 2)

Site statique (HTML/CSS/JS), sans build. Déploiement : GitHub puis Vercel, preset **Other**.
Tous les fichiers sont à la racine : glisse-les d'un coup dans GitHub (Add file → Upload files).

## À faire avant la mise en ligne
Tout se règle dans **config.js** et **data.js**, pas besoin de toucher au reste.

1. **config.js → whatsapp** : numéro au format 590690123456 (sinon le bouton WhatsApp est masqué).
2. **config.js → leadWebhook** : URL Make / n8n / Supabase qui reçoit les leads en JSON.
   Sans webhook, le lead s'ouvre dans le logiciel mail du visiteur vers cedyanenergycaraibes@gmail.com.
3. **partenaires.js** : remplacer les fiches exemples par les vrais installateurs (ou laisser vide).
4. **config.js → google** : vraie note, nombre d'avis, vrais avis (retirer `exemple: true`).
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
1. SIRET vérifié automatiquement (API publique recherche-entreprises.api.gouv.fr, gratuite, sans clé).
2. Le pro dépose son Kbis (PDF ou photo, 8 Mo max).
3. La demande part au patron, qui valide. Les prix ne s'affichent pas avant.
config.js → demoDeblocageImmediat: true débloque les prix tout de suite (pour une démo uniquement).
Tant que le dashboard n'est pas branché, le fichier Kbis n'est pas transmis (seul son nom l'est).

## Étape 2 : dashboard (Supabase)
Prévu : comptes pros avec validation du Kbis, prix servis côté serveur, demandes triées par « pour quand »,
gestion des produits et des partenaires installateurs, statistiques de trafic, alertes e-mail et WhatsApp.
Chaque lead contient déjà `pour_quand` et `priorite` (haute / moyenne / basse) pour le tri.

## Annuaire des installateurs
partenaires.js : une ligne par installateur. Les 3 fiches « Exemple » sont à supprimer.

## Photos produits
Chargées depuis cedyan-energy.net. Si une image ne charge pas, une illustration de catégorie s'affiche.
Si l'ancien site est coupé, rapatrier les photos et changer les URL dans data.js.

## Ajouter un produit
Copier une ligne dans `PRODUITS` (data.js), changer id, cat, marque, nom, spec, prix, img, stock.
Catégories : panneaux, onduleurs, convertisseurs, regulateurs, monitoring, batteries, structures, cables, protections.
