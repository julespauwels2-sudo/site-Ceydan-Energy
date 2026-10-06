# Site Cedyan Energy (version 3, cinématique)

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

## Dashboard et base de données (Supabase, projet « Cedyanenergy »)
- Dashboard : /dashboard.html (connexion par lien e-mail, réservé aux personnes de la table « staff »).
- Demandes : tout formulaire du site arrive dans la base, trié par « pour quand », avec alerte e-mail
  (et WhatsApp si « au plus vite » ou compte pro).
- Comptes pro : SIRET + Kbis (stockage privé). Le patron valide : le pro reçoit un e-mail, se connecte
  sur pro.html et voit ses prix. Les prix sont dans la table « tarifs », lisibles uniquement par les pros validés.
- Catalogue et installateurs : modifiables depuis le dashboard, visibles tout de suite sur le site.
  data.js et partenaires.js ne servent plus que de secours si la base ne répond pas.
- Trafic : statistiques maison, sans cookie (table « visites »).
- Réglages : mode alerte cyclone (barre orange ou rouge sur tout le site) et bouton de test des alertes.

Secrets à créer dans Supabase (Edge Functions > Secrets) :
RESEND_API_KEY, PATRON_EMAIL, CALLMEBOT_PHONE, CALLMEBOT_APIKEY
Optionnels : EMAIL_FROM (ex. « Cedyan Energy <alertes@cedyanenergytrade.com> » une fois le domaine validé), SITE_URL.
Tant que le domaine n'est pas validé dans Resend, les e-mails ne partent que vers l'adresse du compte Resend.

Fonctions : « demande » (publique, reçoit les formulaires) et « equipe » (réservée à l'équipe).

## Annuaire des installateurs
partenaires.js : une ligne par installateur. Les 3 fiches « Exemple » sont à supprimer.

## Photos produits
Chargées depuis cedyan-energy.net. Si une image ne charge pas, une illustration de catégorie s'affiche.
Si l'ancien site est coupé, rapatrier les photos et changer les URL dans data.js.

## Ajouter un produit
Copier une ligne dans `PRODUITS` (data.js), changer id, cat, marque, nom, spec, prix, img, stock.
Catégories : panneaux, onduleurs, convertisseurs, regulateurs, monitoring, batteries, structures, cables, protections.


## Vidéos
Les vidéos de fond viennent de Mixkit (licence gratuite, usage commercial autorisé, sans mention obligatoire).
Elles sont chargées depuis assets.mixkit.co, seulement quand elles sont visibles à l'écran.
Pour les héberger soi-même (plus fiable) : télécharger le fichier depuis mixkit.co, le mettre à la racine
et remplacer l'adresse https://assets.mixkit.co/videos/... par le nom du fichier dans le HTML.
Le jour où Cedyan a ses propres images (drone sur un chantier, magasin, équipe), on les remplace : c'est le meilleur upgrade possible.

## Cache
style.css, app.js, anim.js et icones.js sont versionnés automatiquement (?v=...) : chaque nouvelle version est vue tout de suite.
config.js, data.js et partenaires.js ne sont jamais mis en cache : tu peux les modifier directement sur GitHub.

Vidéos utilisées : accueil 46623, 32441 et 46624 ; services 47097 ; cyclone 4059 ; installateurs 23491 ; kits 46502 ; qui sommes-nous 32448 ; catalogue 32520 ; pro 34596 ; contact 46501.

## Animations
anim.js : écran de chargement (une fois par visite), bande-démo vidéo, titres mot par mot, compteurs,
gamme en défilement horizontal, pluie et éclairs, survols. Tout se coupe automatiquement si le visiteur
a activé « réduire les animations » ou le mode économie de données.

## Trouver un installateur
- Carte réelle : Leaflet (cdnjs) avec le fond de carte CARTO Voyager (gratuit, attribution affichée).
- Distances calculées depuis la commune saisie. Coordonnées des communes dans app.js (COORDS).
- Onglet « Vérifier une entreprise » : registre national (recherche-entreprises.api.gouv.fr)
  + annuaire RGE public de l'ADEME (data.ademe.fr). Si l'ADEME ne répond pas, lien vers France Rénov'.
- partenaires.js : on peut ajouter "siren" à un partenaire pour qu'il soit reconnu comme partenaire Cedyan à la vérification.
