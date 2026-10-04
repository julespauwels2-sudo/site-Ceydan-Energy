/* =========================================================
   CEDYAN ENERGY — app.js
   Profil particulier/pro, liste de devis, questionnaire,
   envoi des leads, catalogue, kits, prime, kit décomposé.
   ========================================================= */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  const C = window.CEDYAN_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

  const SVG = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("is-on"), 2600);
  }

  /* ---------- Coordonnées depuis la config ---------- */
  $$("[data-tel]").forEach((a) => { a.href = "tel:" + C.telephoneLien; if (!a.children.length && !a.dataset.garde) a.textContent = C.telephone; });
  $$("[data-mail]").forEach((a) => { a.href = "mailto:" + C.email; if (!a.children.length) a.textContent = C.email; });
  $$("[data-horaires]").forEach((e) => (e.textContent = C.horaires));
  $$("[data-adresse]").forEach((e) => (e.textContent = C.adresse));
  $$("[data-maps]").forEach((a) => (a.href = C.mapsLien));
  $$("[data-wa]").forEach((a) => {
    if (!C.whatsapp) { a.hidden = true; return; }
    a.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(a.dataset.wa || "Bonjour Cedyan Energy, j'ai une question sur un projet solaire.");
  });
  $$("[data-annee]").forEach((e) => (e.textContent = new Date().getFullYear()));

  /* ---------- Header ---------- */
  const header = $(".header");
  const onScrollHeader = () => header && header.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScrollHeader, { passive: true }); onScrollHeader();
  const burger = $(".burger");
  if (burger) burger.addEventListener("click", () => {
    const o = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", o);
  });
  $$(".nav a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

  /* ---------- Profil particulier / pro ---------- */
  const pro = () => store.get("cedyan_pro", null);
  const profil = () => store.get("cedyan_profil", pro() ? "pro" : "particulier");
  const voitPrix = () => profil() === "pro" && !!pro();
  function majProfil() {
    const p = profil();
    $$("[data-profil]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.profil === p)));
    $$("[data-si-pro]").forEach((e) => (e.hidden = !voitPrix()));
    $$("[data-si-part]").forEach((e) => (e.hidden = voitPrix()));
    $$("[data-pro-nom]").forEach((e) => (e.textContent = pro() ? pro().nom : ""));
    document.dispatchEvent(new CustomEvent("profil"));
  }
  $$("[data-profil]").forEach((b) => b.addEventListener("click", (ev) => {
    if (b.dataset.profil === "pro" && !pro()) return; // lien vers pro.html
    ev.preventDefault();
    store.set("cedyan_profil", b.dataset.profil);
    majProfil();
    toast(b.dataset.profil === "pro" ? "Tarifs professionnels affichés" : "Vue particulier : prix sur devis");
  }));

  /* ---------- Liste de devis ---------- */
  const devis = { get: () => store.get("cedyan_devis", []), set: (l) => { store.set("cedyan_devis", l); majDevis(); } };
  const tousProduits = () => [].concat(window.PRODUITS || [], ...Object.values(window.KITS || {}).map((l) => l.map((k) => ({ ...k, cat: "kit", marque: k.gamme || "Kit Cedyan", spec: k.stockage }))));
  const trouver = (id) => tousProduits().find((p) => p.id === id);
  function ajouterDevis(id, btn) {
    const l = devis.get(); const x = l.find((i) => i.id === id);
    if (x) x.q++; else l.push({ id, q: 1 });
    devis.set(l);
    const p = trouver(id);
    toast((p ? (p.gamme ? p.gamme + " " : "") + p.nom : "Produit") + " ajouté à votre devis");
    if (btn) { btn.classList.add("is-in"); btn.innerHTML = SVG.ok; setTimeout(() => { btn.classList.remove("is-in"); btn.innerHTML = SVG.plus; }, 1400); }
  }
  window.cedyanAjouter = ajouterDevis;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ajout]");
    if (b) { e.preventDefault(); ajouterDevis(b.dataset.ajout, b.classList.contains("ajout") ? b : null); }
  });
  function visuel(p, cls = "") {
    const ico = (window.ICONES || {})[p.cat] || (window.ICONES || {}).batteries || "";
    if (!p.img) return `<span class="illu ${cls}">${ico}</span>`;
    return `<img src="${esc(p.img)}" alt="" loading="lazy" decoding="async" class="${cls}" data-cat="${esc(p.cat)}" onerror="cedyanImgKo(this)">`;
  }
  window.cedyanImgKo = (img) => {
    const s = document.createElement("span"); s.className = "illu " + img.className;
    s.innerHTML = (window.ICONES || {})[img.dataset.cat] || (window.ICONES || {}).batteries || "";
    img.replaceWith(s);
  };
  function majDevis() {
    const l = devis.get(); const n = l.reduce((a, i) => a + i.q, 0);
    $$("[data-devis-n]").forEach((b) => { b.textContent = n || ""; b.dataset.n = n; });
    const liste = $(".tiroir__liste"); if (!liste) return;
    if (!l.length) {
      liste.innerHTML = `<div class="vide"><p><b>Votre devis est vide.</b></p><p>Ajoutez des produits depuis le catalogue avec le bouton +, ou décrivez directement votre projet ci-dessous.</p><a class="btn btn--ligne btn--petit" href="catalogue.html">Parcourir le catalogue</a></div>`;
      return;
    }
    liste.innerHTML = l.map((i) => {
      const p = trouver(i.id); if (!p) return "";
      return `<div class="ligne-devis"><div>${visuel(p)}</div><div><b>${esc(p.gamme ? p.gamme + " " + p.nom : p.nom)}</b><small>${esc(p.marque || "")}</small></div>
      <div class="qte"><button type="button" data-q="-1" data-id="${p.id}" aria-label="Retirer un">−</button><span>${i.q}</span><button type="button" data-q="1" data-id="${p.id}" aria-label="Ajouter un">+</button></div></div>`;
    }).join("");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]"); if (!b) return;
    const l = devis.get(); const x = l.find((i) => i.id === b.dataset.id); if (!x) return;
    x.q += +b.dataset.q; devis.set(l.filter((i) => i.q > 0));
  });
  const tiroir = $(".tiroir");
  function ouvrirTiroir() { if (!tiroir) return; majDevis(); tiroir.classList.add("is-open"); document.body.style.overflow = "hidden"; setTimeout(() => $(".tiroir__tete button", tiroir).focus(), 50); }
  function fermerTiroir() { if (!tiroir) return; tiroir.classList.remove("is-open"); document.body.style.overflow = ""; }
  $$("[data-ouvrir-devis]").forEach((b) => b.addEventListener("click", ouvrirTiroir));
  $$("[data-fermer-devis]").forEach((b) => b.addEventListener("click", fermerTiroir));

  /* ---------- Envoi des leads ---------- */
  function utm() {
    const q = new URLSearchParams(location.search); const o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "gclid"].forEach((k) => q.get(k) && (o[k] = q.get(k)));
    if (Object.keys(o).length) store.set("cedyan_utm", o);
    return store.get("cedyan_utm", {});
  }
  utm();
  async function envoyerLead(lead) {
    const payload = Object.assign({ date: new Date().toISOString(), page: location.pathname, profil: profil(), pro_verifie: pro(), utm: utm() }, lead);
    store.set("cedyan_dernier_lead", payload);
    if (C.leadWebhook) {
      try {
        const r = await fetch(C.leadWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (r.ok || r.type === "opaque") return { ok: true, via: "webhook" };
      } catch (e) {}
    }
    // Repli : e-mail pré-rempli
    const lignes = [];
    const ajoute = (k, v) => v && lignes.push(k + " : " + v);
    ajoute("Type de demande", payload.type);
    Object.entries(payload.contact || {}).forEach(([k, v]) => ajoute(k, v));
    Object.entries(payload.reponses || {}).forEach(([k, v]) => ajoute(k, v));
    if (payload.recommandation) ajoute("Recommandation", payload.recommandation);
    if (payload.panier && payload.panier.length) { lignes.push("", "Produits :"); payload.panier.forEach((p) => lignes.push("- " + p.q + " × " + p.nom)); }
    if (payload.message) lignes.push("", payload.message);
    const sujet = "Demande site web : " + (payload.sujet || payload.type);
    location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(lignes.join("\n"));
    return { ok: true, via: "mail" };
  }
  window.cedyanLead = envoyerLead;

  function lireForm(form) {
    const d = {}; new FormData(form).forEach((v, k) => (d[k] = String(v).trim()));
    return d;
  }
  function valider(form) {
    let ok = true;
    $$("[required]", form).forEach((i) => {
      let bon = i.type === "checkbox" ? i.checked : !!i.value.trim();
      if (bon && i.type === "email") bon = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value.trim());
      if (bon && i.name === "telephone") bon = i.value.replace(/\D/g, "").length >= 9;
      i.setAttribute("aria-invalid", String(!bon)); if (!bon) ok = false;
    });
    const err = $(".erreur", form);
    if (err) err.hidden = ok;
    if (!ok) { const f = $('[aria-invalid="true"]', form); f && f.focus(); }
    return ok;
  }

  /* Formulaire du tiroir devis */
  const formDevis = $("#form-devis");
  if (formDevis) formDevis.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!valider(formDevis)) return;
    const d = lireForm(formDevis);
    const panier = devis.get().map((i) => { const p = trouver(i.id); return { id: i.id, q: i.q, nom: p ? (p.gamme ? p.gamme + " " : "") + p.nom : i.id }; });
    await envoyerLead({ type: "devis", sujet: "demande de devis (" + panier.length + " produit" + (panier.length > 1 ? "s" : "") + ")", contact: { nom: d.nom, telephone: d.telephone, email: d.email, commune: d.commune }, message: d.message, panier, score: scoreLead({ tel: d.telephone, panier }) });
    devis.set([]); formDevis.reset();
    $(".tiroir__liste").innerHTML = `<div class="vide"><p><b>Demande envoyée.</b></p><p>Un conseiller Cedyan vous rappelle ou vous écrit sous 24 h ouvrées avec votre devis.</p></div>`;
  });

  function scoreLead({ tel, panier = [], delai, besoin, typeClient, facture } = {}) {
    let s = 20;
    if (tel) s += 15;
    if (panier.length) s += 15 + Math.min(panier.length * 3, 15);
    if (delai === "Au plus vite") s += 25; else if (delai === "D'ici 3 mois") s += 12;
    if (besoin === "Matériel pour un chantier" || typeClient === "Professionnel du bâtiment") s += 15;
    if (besoin === "Ne plus subir les coupures") s += 8;
    if (facture === "Plus de 300 €" || facture === "150 à 300 €") s += 8;
    return Math.min(100, s);
  }

  /* ---------- Questionnaire « Trouver mon kit » ---------- */
  const modale = $("#quiz");
  const QUIZ = [
    { k: "typeClient", q: "Vous êtes…", o: [["🏠", "Particulier", "Maison, appartement, résidence secondaire"], ["🔧", "Professionnel du bâtiment", "Électricien, installateur, bureau d'étude"], ["🏢", "Entreprise ou commerce", "Local, magasin, cabinet, restaurant"], ["🌱", "Exploitation agricole", "Pompe, chambre froide, bâtiment"]] },
    { k: "besoin", q: "Qu'est-ce qui compte le plus pour vous ?", o: [["🌀", "Ne plus subir les coupures", "Cyclones, délestages, pannes réseau"], ["⛰️", "Alimenter un lieu sans réseau", "Site isolé, carbet, terrain, exploitation"], ["💡", "Baisser ma facture EDF", "Autoconsommation et revente du surplus"], ["📦", "Matériel pour un chantier", "Je sais ce qu'il me faut"]] },
    { k: "facture", q: "Votre facture d'électricité tourne autour de…", sous: "Par mois, à peu près. Ça sert à dimensionner les batteries.", o: [["▁", "Moins de 80 €", ""], ["▃", "80 à 150 €", ""], ["▅", "150 à 300 €", ""], ["▇", "Plus de 300 €", ""]] },
    { k: "delai", q: "Pour quand ?", o: [["⚡", "Au plus vite", "Avant la prochaine alerte cyclonique"], ["📅", "D'ici 3 mois", ""], ["🔎", "Je me renseigne", "Je compare les solutions"]] },
    { k: "contact", q: "Où vous envoyer votre sélection ?", contact: true }
  ];
  const COMMUNES = ["Les Abymes", "Anse-Bertrand", "Baie-Mahault", "Baillif", "Basse-Terre", "Bouillante", "Capesterre-Belle-Eau", "Capesterre-de-Marie-Galante", "Deshaies", "La Désirade", "Gourbeyre", "Le Gosier", "Goyave", "Grand-Bourg", "Lamentin", "Morne-à-l'Eau", "Le Moule", "Petit-Bourg", "Petit-Canal", "Pointe-à-Pitre", "Pointe-Noire", "Port-Louis", "Saint-Claude", "Saint-François", "Saint-Louis", "Sainte-Anne", "Sainte-Rose", "Terre-de-Bas", "Terre-de-Haut", "Trois-Rivières", "Vieux-Fort", "Vieux-Habitants", "Martinique", "Saint-Martin", "Saint-Barthélemy", "Autre territoire"];
  window.CEDYAN_COMMUNES = COMMUNES;
  $$("select[data-communes]").forEach((s) => (s.innerHTML = '<option value="">Choisir…</option>' + COMMUNES.map((c) => `<option>${esc(c)}</option>`).join("")));

  let rep = {}, etape = 0, dernierFocus = null;
  function rendreQuiz() {
    const box = $(".quiz__corps", modale);
    box.innerHTML = QUIZ.map((s, i) => {
      if (s.contact) return `<form class="quiz__etape" data-i="${i}" novalidate>
        <h2 id="quiz-titre-${i}">${s.q}</h2>
        <p class="lead" style="margin-top:-8px">Un conseiller vous rappelle avec une sélection de matériel en stock et un prix. Pas d'engagement.</p>
        <div class="grille-2"><div class="champ"><label for="q-prenom">Prénom et nom</label><input class="input" id="q-prenom" name="nom" autocomplete="name" required></div>
        <div class="champ"><label for="q-tel">Téléphone</label><input class="input" id="q-tel" name="telephone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="0690 00 00 00"></div></div>
        <div class="grille-2"><div class="champ"><label for="q-mail">E-mail <span class="info">(facultatif)</span></label><input class="input" id="q-mail" name="email" type="email" autocomplete="email"></div>
        <div class="champ"><label for="q-commune">Commune</label><select class="select" id="q-commune" name="commune" required><option value="">Choisir…</option>${COMMUNES.map((c) => `<option>${esc(c)}</option>`).join("")}</select></div></div>
        <label class="consent"><input type="checkbox" name="rgpd" required><span>J'accepte d'être recontacté par Cedyan Energy au sujet de ma demande. Mes données ne sont ni revendues ni utilisées pour autre chose. <a href="mentions-legales.html#donnees">En savoir plus</a></span></label>
        <p class="erreur" hidden>Vérifiez les champs entourés en rouge.</p>
        <div class="quiz__nav"><button type="button" class="quiz__retour" data-retour>Retour</button><button class="btn" type="submit">Recevoir ma sélection</button></div>
      </form>`;
      return `<div class="quiz__etape" data-i="${i}"><h2 id="quiz-titre-${i}">${s.q}</h2>${s.sous ? `<p class="lead" style="margin-top:-8px">${s.sous}</p>` : ""}
        <div class="choix" role="group" aria-labelledby="quiz-titre-${i}">${s.o.map(([e, t, d]) => `<button type="button" data-v="${esc(t)}" aria-pressed="${rep[s.k] === t}"><span class="emo" aria-hidden="true">${e}</span><span>${esc(t)}${d ? `<small>${esc(d)}</small>` : ""}</span></button>`).join("")}</div>
        ${i ? '<div class="quiz__nav"><button type="button" class="quiz__retour" data-retour>Retour</button></div>' : ""}</div>`;
    }).join("") + '<div class="quiz__etape quiz__resultat" data-i="fin"></div>';
    allerA(etape);
  }
  function allerA(i) {
    etape = i;
    $$(".quiz__etape", modale).forEach((e) => e.classList.toggle("is-on", e.dataset.i === String(i)));
    $(".quiz__progress i", modale).style.width = (i === "fin" ? 100 : (i / QUIZ.length) * 100 + 8) + "%";
    const t = $(`.quiz__etape.is-on h2, .quiz__etape.is-on .t-l`, modale);
    if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
  }
  function ouvrirQuiz(pre = {}) {
    if (!modale) return;
    dernierFocus = document.activeElement;
    rep = Object.assign({}, pre); etape = 0;
    if (rep.besoin) etape = rep.typeClient ? 2 : 0;
    rendreQuiz();
    modale.classList.add("is-open"); document.body.style.overflow = "hidden";
  }
  function fermerQuiz() { modale.classList.remove("is-open"); document.body.style.overflow = ""; dernierFocus && dernierFocus.focus && dernierFocus.focus(); }
  $$("[data-quiz]").forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    const pre = {}; if (b.dataset.quiz) pre.besoin = b.dataset.quiz;
    ouvrirQuiz(pre);
  }));
  if (modale) {
    modale.addEventListener("click", (e) => {
      if (e.target.closest("[data-fermer-quiz]")) return fermerQuiz();
      const ch = e.target.closest(".choix button");
      if (ch) {
        const i = +ch.closest(".quiz__etape").dataset.i; const k = QUIZ[i].k;
        rep[k] = ch.dataset.v;
        $$("button", ch.parentNode).forEach((b) => b.setAttribute("aria-pressed", String(b === ch)));
        let suiv = i + 1;
        if (k === "besoin" && rep.besoin === "Matériel pour un chantier") suiv = 3; // pas besoin de la facture
        setTimeout(() => allerA(suiv), 180);
      }
      if (e.target.closest("[data-retour]")) {
        let p = etape - 1; if (etape === 3 && rep.besoin === "Matériel pour un chantier") p = 1;
        allerA(Math.max(0, p));
      }
    });
    modale.addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target; if (!valider(f)) return;
      const d = lireForm(f);
      const reco = recommander(rep);
      const res = $(".quiz__resultat", modale);
      res.innerHTML = `<h2 class="t-l">C'est noté, ${esc(d.nom.split(" ")[0])}.</h2>
        <p class="lead">Un conseiller Cedyan vous rappelle sous 24 h ouvrées au ${esc(d.telephone)}. Voici déjà la piste qu'on regardera ensemble :</p>
        <div class="quiz__reco"><b>${esc(reco.titre)}</b><span>${esc(reco.texte)}</span></div>
        <div class="quiz__nav"><a class="btn" href="${reco.lien}">${esc(reco.cta)}</a><a class="btn btn--ligne" data-tel data-garde="1" href="tel:${C.telephoneLien}">Appeler maintenant</a></div>`;
      allerA("fin");
      await envoyerLead({ type: "questionnaire", sujet: rep.besoin || "projet solaire", contact: { nom: d.nom, telephone: d.telephone, email: d.email, commune: d.commune }, reponses: rep, recommandation: reco.titre, score: scoreLead({ tel: d.telephone, ...rep }) });
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modale && modale.classList.contains("is-open")) fermerQuiz();
    if (tiroir && tiroir.classList.contains("is-open")) fermerTiroir();
  });
  function recommander(r) {
    const f = r.facture || "";
    const gros = f === "150 à 300 €" || f === "Plus de 300 €";
    if (r.besoin === "Ne plus subir les coupures") {
      const n = f === "Plus de 300 €" || r.typeClient === "Entreprise ou commerce" ? "Bastion" : gros || f === "80 à 150 €" ? "Foyer" : "Essentiel";
      return { titre: "Pack Détresse Cyclone " + n, texte: "Un convertisseur Victron et des batteries lithium qui prennent le relais en une fraction de seconde quand le réseau tombe. Extensible avec des panneaux.", lien: "pack-cyclone.html#packs", cta: "Voir les packs cyclone" };
    }
    if (r.besoin === "Alimenter un lieu sans réseau") {
      const n = r.typeClient === "Exploitation agricole" || f === "Plus de 300 €" ? "8 kVA avec 14,4 kWh" : gros ? "5 kVA avec 9,6 kWh" : "3 kVA avec 4,8 à 5,1 kWh";
      return { titre: "Centrale isolée " + n, texte: "Panneaux, régulateur MPPT, convertisseur et batteries lithium : tout ce qu'il faut pour vivre sans réseau, en stock à Baie-Mahault.", lien: "kits.html#isole", cta: "Voir les kits isolés" };
    }
    if (r.besoin === "Baisser ma facture EDF") {
      return { titre: "Centrale raccordée 3 kWc, avec ou sans batterie", texte: "Vous consommez votre production et revendez le surplus. Posée par un installateur RGE, elle ouvre droit à la prime EDF SEI, environ " + euro(Math.round(primePour(3))) + " pour 3 kWc au barème actuel.", lien: "kits.html#reseau", cta: "Voir les kits raccordés" };
    }
    return { titre: "Accès au catalogue professionnel", texte: "Panneaux, onduleurs, batteries, protections : vérifiez votre SIRET pour voir les tarifs et préparer votre commande.", lien: "pro.html", cta: "Ouvrir mon espace pro" };
  }

  /* ---------- Prime ---------- */
  function primePour(kwc) {
    const p = (C.prime && C.prime.paliers) || [];
    const pal = p.find((x) => kwc <= x.maxKwc); return pal ? kwc * 1000 * pal.euroParWc : 0;
  }
  const calc = $("#prime-range");
  if (calc) {
    const maj = () => {
      const k = +calc.value;
      $("#prime-kwc").textContent = k.toLocaleString("fr-FR") + " kWc";
      $("#prime-montant").textContent = euro(Math.round(primePour(k) / 10) * 10);
      $("#prime-prod").textContent = "Production estimée : environ " + Math.round(k * 1350).toLocaleString("fr-FR") + " kWh par an.";
      $("#prime-seuil").hidden = k <= 3;
      calc.style.setProperty("--fill", ((k - calc.min) / (calc.max - calc.min)) * 100 + "%");
    };
    calc.addEventListener("input", maj); maj();
  }
  $$("[data-prime-periode]").forEach((e) => (e.textContent = (C.prime && C.prime.periode) || ""));
  $$("[data-prime-3]").forEach((e) => (e.textContent = euro(Math.round(primePour(3)))));

  /* ---------- Avis Google ---------- */
  const avisBox = $("#avis-liste");
  if (avisBox && C.google) {
    const g = C.google;
    avisBox.innerHTML = (g.avis || []).map((a) => `<article class="avi">${a.exemple ? '<span class="avi__ex">Exemple</span>' : ""}<span class="etoiles" aria-label="${a.note} sur 5">${"★".repeat(a.note)}</span><p>${esc(a.texte)}</p><footer><b>${esc(a.nom)}</b>, ${esc(a.commune)}</footer></article>`).join("");
    $$("[data-google-note]").forEach((e) => (e.textContent = String(g.note).replace(".", ",")));
    $$("[data-google-nb]").forEach((e) => (e.textContent = g.nombreAvis ? g.nombreAvis + " avis Google" : "Avis Google"));
    $$("[data-google-lien]").forEach((a) => (a.href = g.lienAvis));
  }

  /* ---------- Catalogue ---------- */
  const grille = $("#produits");
  if (grille && window.PRODUITS) {
    const filtres = $("#filtres"); const rech = $("#recherche");
    let cat = (location.hash || "").slice(1) || "tout";
    const cats = [{ id: "tout", court: "Tout le matériel" }].concat(window.CATEGORIES);
    filtres.insertAdjacentHTML("beforeend", cats.map((c) => {
      const n = c.id === "tout" ? PRODUITS.length : PRODUITS.filter((p) => p.cat === c.id).length;
      return `<button type="button" data-cat="${c.id}" aria-pressed="false">${esc(c.nom || c.court)}<small>${n}</small></button>`;
    }).join(""));
    const rendre = () => {
      const q = (rech && rech.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const liste = PRODUITS.filter((p) => (cat === "tout" || p.cat === cat) && (!q || (p.nom + " " + p.marque + " " + p.spec).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)));
      $$("button", filtres).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
      const c = window.CATEGORIES.find((x) => x.id === cat);
      $("#cat-titre").textContent = c ? c.nom : "Tout le matériel";
      $("#cat-desc").textContent = c ? c.desc : "Panneaux, onduleurs, batteries, fixations et protections : ce que nous avons en stock en Guadeloupe.";
      const prix = voitPrix();
      grille.innerHTML = liste.length ? liste.map((p) => `<article class="produit">
        <div class="produit__img">${visuel(p)}<span class="produit__stock${p.stock ? "" : " produit__stock--cmd"}">${p.stock ? "En stock" : "Sur commande"}</span></div>
        <div class="produit__corps"><span class="produit__marque">${esc(p.marque)}</span><h3 class="produit__nom">${esc(p.nom)}</h3><span class="produit__spec">${esc(p.spec)}</span>
        <div class="produit__pied">${prix ? (p.prix ? `<span class="prix">${euro(p.prix)}<small>votre tarif</small></span>` : '<span class="prix--cache">Tarif sur devis</span>') : '<span class="prix--cache">Prix sur devis</span>'}
        <button class="ajout" type="button" data-ajout="${p.id}" aria-label="Ajouter ${esc(p.nom)} au devis">${SVG.plus}</button></div></div></article>`).join("")
        : `<div class="vide" style="grid-column:1/-1"><p><b>Aucun produit ne correspond à « ${esc(rech.value)} ».</b></p><p>Nous avons bien plus de références en magasin que sur le site. Décrivez ce que vous cherchez, on vous répond.</p><button class="btn btn--petit" type="button" data-ouvrir-devis>Demander ce produit</button></div>`;
      $$("[data-ouvrir-devis]", grille).forEach((b) => b.addEventListener("click", ouvrirTiroir));
    };
    filtres.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-cat]"); if (!b) return;
      cat = b.dataset.cat; history.replaceState(null, "", cat === "tout" ? location.pathname : "#" + cat); rendre();
      if (innerWidth < 920) grille.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
    });
    rech && rech.addEventListener("input", rendre);
    addEventListener("hashchange", () => { cat = location.hash.slice(1) || "tout"; rendre(); });
    document.addEventListener("profil", rendre);
    rendre();
  }

  /* ---------- Kits ---------- */
  $$("[data-kits]").forEach((box) => {
    const l = (window.KITS || {})[box.dataset.kits] || [];
    const rendre = () => {
      const prix = voitPrix();
      box.innerHTML = l.map((k) => `<article class="kitc"><div class="kitc__img">${visuel({ ...k, cat: box.dataset.kits === "reseau" ? "panneaux" : "batteries" })}</div>
      <div class="kitc__corps"><span class="kitc__stock">${esc(k.stockage)}</span><h3>${esc(k.nom)}</h3><p>${esc(k.detail)}</p><p class="kitc__pour"><b>Pour :</b> ${esc(k.pour)}</p>
      <div class="kitc__pied">${prix && k.prix ? `<span class="prix">${euro(k.prix)}<small>votre tarif</small></span>` : '<span class="prix--cache">Prix sur devis</span>'}<button class="btn btn--petit" type="button" data-ajout="${k.id}">Ajouter au devis</button></div></div></article>`).join("");
    };
    document.addEventListener("profil", rendre); rendre();
  });

  /* ---------- Saison cyclonique ---------- */
  $$("[data-saison]").forEach((e) => {
    const m = new Date().getMonth();
    e.textContent = m >= 5 && m <= 10 ? "Saison cyclonique en cours, jusqu'au 30 novembre" : "Prochaine saison cyclonique le 1er juin : préparez-vous avant la ruée";
  });

  /* ---------- Vérification professionnelle (SIREN / SIRET) ---------- */
  function luhn(n) { let s = 0; for (let i = 0; i < n.length; i++) { let d = +n[n.length - 1 - i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; } return s % 10 === 0; }
  async function verifierSiren(brut) {
    const n = brut.replace(/\D/g, "");
    if (!(n.length === 9 || n.length === 14)) return { etat: "ko", msg: "Saisissez un SIREN (9 chiffres) ou un SIRET (14 chiffres)." };
    if (!luhn(n.slice(0, 9)) || (n.length === 14 && !luhn(n) && !n.startsWith("356000000"))) return { etat: "ko", msg: "Ce numéro n'est pas valide. Vérifiez-le sur votre Kbis ou votre avis de situation INSEE." };
    const siren = n.slice(0, 9);
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch("https://recherche-entreprises.api.gouv.fr/search?q=" + siren + "&page=1&per_page=1", { signal: ctrl.signal });
      if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json(); const e = (j.results || [])[0];
      if (!e || e.siren !== siren) return { etat: "ko", msg: "Aucune entreprise trouvée avec ce numéro dans le registre national." };
      const actif = (e.etat_administratif || (e.siege && e.siege.etat_administratif)) === "A";
      if (!actif) return { etat: "ko", msg: "Cette entreprise apparaît comme fermée dans le registre national. Contactez-nous si c'est une erreur." };
      const naf = e.activite_principale || (e.siege && e.siege.activite_principale) || "";
      const cp = (e.siege && e.siege.code_postal) || "";
      return { etat: "ok", siren, nom: e.nom_complet || e.nom_raison_sociale || "Entreprise " + siren, naf, cp, energie: /^(43\.2|35\.1|71\.12|46\.69|47\.54|43\.99|33\.14)/.test(naf), dom: /^97/.test(cp) };
    } catch (err) {
      return { etat: "attente", siren, msg: "Le registre national ne répond pas pour le moment. Votre demande est transmise : nous vérifions votre entreprise à la main et vous ouvrons l'accès sous 24 h ouvrées." };
    }
  }
  const formPro = $("#form-pro");
  if (formPro) {
    const sortie = $("#verif", formPro);
    const sirenIn = $("#pro-siren", formPro);
    sirenIn.addEventListener("input", () => { sirenIn.value = sirenIn.value.replace(/[^\d ]/g, "").slice(0, 17); });
    formPro.addEventListener("submit", async (e) => {
      e.preventDefault(); if (!valider(formPro)) return;
      const d = lireForm(formPro); const btn = $("button[type=submit]", formPro);
      btn.disabled = true; btn.textContent = "Vérification en cours…";
      sortie.className = "verif is-wait"; sortie.textContent = "Nous interrogeons le registre national des entreprises…";
      const v = await verifierSiren(d.siren);
      btn.disabled = false; btn.textContent = "Vérifier et débloquer mes tarifs";
      if (v.etat === "ko") { sortie.className = "verif is-ko"; sortie.textContent = v.msg; sirenIn.setAttribute("aria-invalid", "true"); sirenIn.focus(); return; }
      const contact = { nom: d.nom, entreprise: v.nom || d.entreprise, metier: d.metier, telephone: d.telephone, email: d.email, siren: v.siren };
      if (v.etat === "attente") {
        sortie.className = "verif is-wait"; sortie.textContent = v.msg;
        await envoyerLead({ type: "compte-pro", sujet: "ouverture compte pro (vérification manuelle)", contact, verification: "manuelle", score: 70 });
        return;
      }
      store.set("cedyan_pro", { siren: v.siren, nom: v.nom, naf: v.naf, cp: v.cp, date: new Date().toISOString() });
      store.set("cedyan_profil", "pro"); majProfil();
      sortie.className = "verif is-ok";
      sortie.innerHTML = `<b>${esc(v.nom)}</b> est bien active au registre national. Vos tarifs sont débloqués sur ce navigateur. <a class="lien" href="catalogue.html">Voir le catalogue avec mes tarifs</a>`;
      await envoyerLead({ type: "compte-pro", sujet: "nouveau compte pro : " + v.nom, contact, verification: { naf: v.naf, code_postal: v.cp, secteur_energie: v.energie, dom: v.dom }, score: v.energie ? 85 : 65 });
    });
  }
  $$("[data-pro-sortir]").forEach((b) => b.addEventListener("click", () => { localStorage.removeItem("cedyan_pro"); store.set("cedyan_profil", "particulier"); majProfil(); toast("Espace pro fermé sur ce navigateur"); }));
  // Raccourci SIRET (bandeau pro de l'accueil) -> pré-remplit pro.html
  const mini = $("#mini-pro");
  if (mini) mini.addEventListener("submit", (e) => { e.preventDefault(); location.href = "pro.html?siren=" + encodeURIComponent($("input", mini).value.replace(/\D/g, "")); });
  if (formPro) { const s = new URLSearchParams(location.search).get("siren"); if (s) $("#pro-siren").value = s; }

  /* ---------- Formulaires simples (pack cyclone, contact) ---------- */
  $$("form[data-lead]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!valider(f)) return; const d = lireForm(f);
    await envoyerLead({ type: f.dataset.lead, sujet: f.dataset.sujet || f.dataset.lead, contact: { nom: d.nom, telephone: d.telephone, email: d.email, commune: d.commune }, reponses: { choix: d.choix }, message: d.message, score: scoreLead({ tel: d.telephone, delai: d.delai }) });
    f.innerHTML = `<div class="verif is-ok" style="display:block"><b>Merci ${esc((d.nom || "").split(" ")[0])}.</b> Un conseiller vous rappelle sous 24 h ouvrées.</div>`;
  }));

  /* ---------- Kit décomposé (accueil) ---------- */
  const kit = $(".kit");
  if (kit) {
    const scene = $(".kit__scene", kit); const couches = $$(".kit__couche", kit);
    const etiquettes = $$(".kit__etiquette", kit); const fin = $(".kit__fin", kit);
    let geo = null, actif = false;
    const mesurer = () => {
      actif = innerWidth > 920 && !reduit;
      if (!actif) { kit.style.removeProperty("--fin"); return; }
      const H = $(".kit__stage", kit).clientHeight, W = $(".kit__stage", kit).clientWidth;
      const ratios = couches.map((c) => +c.dataset.ratio);
      const somme = ratios.reduce((a, b) => a + b, 0);
      const gap = 18, dispo = H * 0.8 - gap * (couches.length - 1);
      const w = Math.min(W * 0.46, dispo / somme, 470);
      const hs = ratios.map((r) => r * w);
      const total = hs.reduce((a, b) => a + b, 0) + gap * (couches.length - 1);
      let y = -total / 2 - H * 0.05; const y1 = [];
      hs.forEach((h) => { y1.push(y + h / 2); y += h + gap; });
      // assemblé : couches serrées, qui se chevauchent
      const serre = hs.map((h) => h * 0.38); const tot0 = serre.reduce((a, b) => a + b, 0);
      let z = -tot0 / 2 + H * 0.06; const y0 = [];
      serre.forEach((h) => { y0.push(z + h / 2); z += h; });
      couches.forEach((c, i) => { c.style.setProperty("--w", w + "px"); c.style.setProperty("--y0", y0[i] + "px"); c.style.setProperty("--y1", y1[i] + "px"); c.style.setProperty("--z", couches.length - i); });
      geo = { top: kit.offsetTop, h: kit.offsetHeight };
      tick();
    };
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const clamp = (v) => Math.max(0, Math.min(1, v));
    let raf = 0;
    function tick() {
      raf = 0; if (!actif || !geo) return;
      const p = clamp((scrollY - geo.top + innerHeight * 0.1) / (geo.h - innerHeight));
      const e = ease(clamp((p - 0.1) / 0.6));
      const f = clamp((p - 0.72) / 0.14);
      scene.style.setProperty("--e", e.toFixed(4));
      scene.style.setProperty("--p", p.toFixed(4));
      scene.style.setProperty("--fin", f.toFixed(3));
      etiquettes.forEach((t) => t.classList.toggle("is-on", e > 0.75));
      fin.classList.toggle("is-on", f > 0.6);
    }
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    addEventListener("resize", mesurer);
    addEventListener("load", mesurer);
    mesurer();
  }

  /* ---------- Apparitions ---------- */
  if ("IntersectionObserver" in window && !reduit) {
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("is-vu"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".apparait").forEach((el) => io.observe(el));
  } else $$(".apparait").forEach((el) => el.classList.add("is-vu"));

  majProfil(); majDevis();
})();
