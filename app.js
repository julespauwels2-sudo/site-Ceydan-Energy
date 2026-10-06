/* =========================================================
   CEDYAN ENERGY — app.js
   Profil particulier/pro, liste de devis, questionnaire,
   envoi des leads, catalogue, kits, prime, kit décomposé.
   ========================================================= */
(async function () {
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

  /* ---------- Supabase : catalogue, partenaires, réglages, session pro ---------- */
  const SB = C.supabase && C.supabase.url && C.supabase.anonKey ? C.supabase : null;
  const LIB_SB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  const chargerScript = (src) => new Promise((ok, ko) => { if (window.supabase) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  const enTetesSB = () => ({ apikey: SB.anonKey, Authorization: "Bearer " + SB.anonKey });
  const rest = (chemin) => fetch(SB.url + "/rest/v1/" + chemin, { headers: enTetesSB() }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  let sbClient = null;
  window.cedyanCompte = null;
  async function chargerDonnees() {
    if (!SB) return;
    const besoinSession = !!document.querySelector("#produits, [data-kits], #form-pro, #connexion-pro, #fiche");
    const t = (p, ms) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko("délai"), ms))]);
    try {
      const ok = (p) => p.catch(() => null);
      const [prods, parts, regl] = await t(Promise.all([
        ok(rest("produits?select=id,cat,marque,nom,ref,img,stock,extra,description,caracteristiques,fiche_technique&actif=eq.true&order=ordre")),
        ok(rest("partenaires?select=nom,commune,zones,rge,specialites,telephone,email,siren,exemple&actif=eq.true&order=created_at")),
        ok(rest("reglages?select=cle,valeur")),
      ]), 2500);
      if (prods && prods.length) {
        const fiche = (p) => ({ description: p.description || "", caracteristiques: p.caracteristiques || [], fiche: p.fiche_technique || "" });
        window.PRODUITS = prods.filter((p) => p.cat !== "kits").map((p) => ({ id: p.id, cat: p.cat, marque: p.marque, nom: p.nom, ref: p.ref, img: p.img, stock: p.stock, ...fiche(p) }));
        const K = { isoles: [], reseau: [], secours: [] };
        prods.filter((p) => p.cat === "kits").forEach((p) => { const x = p.extra || {}; const t = K[x.type] ? x.type : "isoles"; K[t].push({ id: p.id, gamme: x.gamme || undefined, nom: x.nomCourt || p.nom, stockage: x.stockage || p.ref || "", detail: x.detail || "", pour: x.pour || "", garde: x.garde || "", duree: x.duree || "", img: p.img, ...fiche(p) }); });
        window.KITS = K;
      }
      if (parts) window.PARTENAIRES = parts;
      window.CEDYAN_REGLAGES = Object.fromEntries((regl || []).map((r) => [r.cle, r.valeur]));
    } catch (e) { /* le site reste utilisable avec les données locales */ }
    if (!besoinSession) return;
    try {
      await t(chargerScript(LIB_SB), 4000);
      sbClient = window.supabase.createClient(SB.url, SB.anonKey);
      const { data: { session } } = await sbClient.auth.getSession();
      if (!session) { store.set("cedyan_pro", null); return; }
      const { data: comptes } = await sbClient.from("comptes_pro").select("statut, entreprise, siren, created_at").order("created_at", { ascending: false }).limit(1);
      const c = (comptes || [])[0] || null;
      window.cedyanCompte = c ? { ...c, email: session.user.email } : { statut: "aucun", email: session.user.email };
      if (c && c.statut === "valide") {
        const { data: tar } = await sbClient.from("tarifs").select("produit_id, prix");
        store.set("cedyan_pro", { nom: c.entreprise || session.user.email, email: session.user.email, tarifs: Object.fromEntries((tar || []).map((x) => [x.produit_id, +x.prix])), date: Date.now() });
      } else store.set("cedyan_pro", null);
    } catch (e) {}
  }
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

  /* ---------- Statut pro ---------- */
  const pro = () => { const p = store.get("cedyan_pro", null); return p && p.tarifs && Date.now() - (p.date || 0) < 7 * 864e5 ? p : null; };
  const voitPrix = () => !!pro();
  const prixDe = (id) => (pro() && pro().tarifs[id] != null ? pro().tarifs[id] : null);
  function majProfil() {
    $$("[data-si-pro]").forEach((e) => (e.hidden = !voitPrix()));
    $$("[data-si-part]").forEach((e) => (e.hidden = voitPrix()));
    $$("[data-pro-nom]").forEach((e) => (e.textContent = pro() ? pro().nom : ""));
    $$("[data-pro-libelle]").forEach((e) => (e.textContent = pro() ? "Mon espace pro" : "Débloquer mes tarifs pro"));
    document.dispatchEvent(new CustomEvent("profil"));
  }
  const profil = () => (pro() ? "pro" : "particulier");

  /* ---------- Liste de devis ---------- */
  const devis = { get: () => store.get("cedyan_devis", []), set: (l) => { store.set("cedyan_devis", l); majDevis(); } };
  const kitsListe = () => [].concat(...Object.entries(window.KITS || {}).map(([t, l]) => l.map((k) => ({ ...k, cat: "kits", type: t, marque: k.gamme || (t === "isoles" ? "Kit isolé" : "Kit raccordé réseau"), nom: k.gamme ? k.gamme + " " + k.nom : k.nom, ref: k.stockage, stock: true }))));
  const tousProduits = () => [].concat(kitsListe(), window.PRODUITS || []);
  const trouver = (id) => tousProduits().find((p) => p.id === id);
  function ajouterDevis(id, btn) {
    const l = devis.get(); const x = l.find((i) => i.id === id);
    if (x) x.q++; else l.push({ id, q: 1 });
    devis.set(l);
    const p = trouver(id);
    toast((p ? p.nom : "Produit") + " ajouté à votre devis");
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
      return `<div class="ligne-devis"><div>${visuel(p)}</div><div><b>${esc(p.nom)}</b><small>${esc(p.marque || "")}${p.ref ? " · " + esc(p.ref) : ""}</small></div>
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
  async function envoyerLead(lead, fichier) {
    const payload = Object.assign({ date: new Date().toISOString(), page: location.pathname, profil: profil(), pro_verifie: pro(), utm: utm() }, lead);
    payload.pour_quand = payload.pour_quand || (payload.reponses && payload.reponses.delai) || "Non précisé";
    payload.priorite = payload.pour_quand === "Au plus vite" ? "haute" : payload.pour_quand === "D'ici 3 mois" ? "moyenne" : "basse";
    store.set("cedyan_dernier_lead", payload);
    if (SB) {
      try {
        const opts = { method: "POST", headers: enTetesSB() };
        if (fichier) { const fd = new FormData(); fd.append("payload", JSON.stringify(payload)); fd.append("kbis", fichier); opts.body = fd; }
        else { opts.headers = { ...opts.headers, "Content-Type": "application/json" }; opts.body = JSON.stringify(payload); }
        const r = await fetch(SB.url + "/functions/v1/demande", opts);
        if (r.ok) return { ok: true, via: "supabase" };
      } catch (e) {}
    }
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
    ajoute("Pour quand", payload.pour_quand + " (priorité " + payload.priorite + ")");
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
    const panier = devis.get().map((i) => { const p = trouver(i.id); return { id: i.id, q: i.q, nom: p ? p.nom + (p.ref ? " (" + p.ref + ")" : "") : i.id }; });
    await envoyerLead({ type: "devis", sujet: "demande de devis (" + panier.length + " produit" + (panier.length > 1 ? "s" : "") + ")", contact: { nom: d.nom, telephone: d.telephone, email: d.email, commune: d.commune, profil: d.profil }, pour_quand: d.delai, message: d.message, panier, score: scoreLead({ tel: d.telephone, panier, delai: d.delai, typeClient: d.profil === "Installateur ou électricien" ? "Professionnel du bâtiment" : "" }) });
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

  // Les données (catalogue, partenaires, session pro) arrivent ici : tout ce qui précède marche déjà.
  await chargerDonnees();
  document.dispatchEvent(new CustomEvent("cedyan:donnees"));

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

  /* ---------- Avis Google (automatiques via Supabase, sinon config.js) ---------- */
  const avisBox = $("#avis-liste");
  function afficherAvis(g, depuisGoogle) {
    if (!avisBox || !g) return;
    const liste = (g.avis || []).slice(0, 8);
    avisBox.innerHTML = liste.map((a) => {
      const n = Math.max(1, Math.min(5, Math.round(a.note || 5)));
      const qui = depuisGoogle
        ? `<footer class="avi__pied">${a.photo ? `<img src="${esc(a.photo)}" alt="" width="32" height="32" loading="lazy" referrerpolicy="no-referrer">` : ""}<span><b>${a.lienAuteur ? `<a href="${esc(a.lienAuteur)}" target="_blank" rel="noopener">${esc(a.nom)}</a>` : esc(a.nom)}</b><small>${esc(a.quand || "")}, sur Google</small></span></footer>`
        : `<footer><b>${esc(a.nom)}</b>${a.commune ? ", " + esc(a.commune) : ""}</footer>`;
      const texte = String(a.texte || ""); const court = texte.length > 260 ? texte.slice(0, 250).replace(/\s+\S*$/, "") + "…" : texte;
      return `<article class="avi">${a.exemple ? '<span class="avi__ex">Exemple</span>' : ""}<span class="etoiles" aria-label="${n} sur 5">${"★".repeat(n)}${"☆".repeat(5 - n)}</span><p>${esc(court)}</p>${qui}</article>`;
    }).join("");
    delete avisBox.dataset.clone;
    if (g.note) $$("[data-google-note]").forEach((e) => (e.textContent = (+g.note).toFixed(1).replace(".", ",")));
    $$("[data-google-nb]").forEach((e) => (e.textContent = g.nombreAvis ? g.nombreAvis + " avis Google" : "Avis Google"));
    $$("[data-google-lien]").forEach((x) => (x.href = g.lien || g.lienAvis || "#"));
    document.dispatchEvent(new CustomEvent("cedyan:avis"));
  }
  if (avisBox || $("[data-google-note]")) {
    // Ordre : 1) derniers avis Google gardés sur l'appareil, 2) avis frais de Google, 3) avis réels saisis dans config.js.
    // Les avis d'exemple ne sont jamais affichés sur le site en ligne.
    const sectionAvis = avisBox && avisBox.closest("section");
    const reels = C.google ? { ...C.google, avis: (C.google.avis || []).filter((a) => !a.exemple) } : null;
    // Les avis arrivent déjà avec les réglages du site (lus directement en base) : pas d'attente.
    const enBase = (window.CEDYAN_REGLAGES || {}).avis_google;
    if (enBase && enBase.avis && enBase.avis.length) store.set("cedyan_avis_google", enBase);
    const memo = store.get("cedyan_avis_google", null);
    let affiche = false;
    if (memo && memo.avis && memo.avis.length) { afficherAvis(memo, true); affiche = true; }
    else if (reels && reels.avis.length) { afficherAvis(reels, false); affiche = true; }
    else if (sectionAvis) sectionAvis.hidden = true;
    if (SB) {
      fetch(SB.url + "/functions/v1/avis-google", { headers: enTetesSB(), cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((g) => {
          if (!(g && g.note && (g.avis || []).length)) return;
          store.set("cedyan_avis_google", g);
          if (!memo || memo.maj !== g.maj || !affiche) { afficherAvis(g, true); if (sectionAvis) sectionAvis.hidden = false; }
        })
        .catch(() => {});
    }
  }

  /* ---------- Catalogue ---------- */
  const lienFiche = (id) => "produit.html?id=" + encodeURIComponent(id);
  window.cedyanLienFiche = lienFiche;
  function carteProduit(p) {
    const prix = voitPrix();
    return `<article class="produit${p.cat === "kits" ? " produit--kit" : ""}">
      <div class="produit__img">${visuel(p)}<span class="produit__stock${p.stock ? "" : " produit__stock--cmd"}">${p.cat === "kits" ? "Kit complet" : p.stock ? "En stock" : "Sur commande"}</span></div>
      <div class="produit__corps"><span class="produit__marque">${esc(p.marque)}</span><h3 class="produit__nom"><a class="lien-fiche" href="${lienFiche(p.id)}">${esc(p.nom)}</a></h3><span class="produit__spec">${esc(p.ref || "")}</span>
      ${p.pour ? `<span class="produit__spec">Pour : ${esc(p.pour)}</span>` : ""}
      <div class="produit__pied">${prix ? (prixDe(p.id) != null ? `<span class="prix">${euro(prixDe(p.id))}<small>votre tarif HT</small></span>` : '<span class="prix--cache">Tarif sur devis</span>') : '<a class="prix--cache" href="pro.html">Prix pro sur compte</a>'}
      <button class="ajout" type="button" data-ajout="${p.id}" aria-label="Ajouter ${esc(p.nom)} au devis">${SVG.plus}</button></div></div></article>`;
  }
  const grille = $("#produits");
  if (grille && window.PRODUITS) {
    const filtres = $("#filtres"); const rech = $("#recherche");
    const qUrl = new URLSearchParams(location.search).get("q");
    if (qUrl && rech) rech.value = qUrl;
    let cat = (location.hash || "").slice(1) || "tout";
    const tous = tousProduits();
    const cats = [{ id: "tout", nom: "Tout le matériel" }].concat(window.CATEGORIES);
    filtres.insertAdjacentHTML("beforeend", cats.map((c) => {
      const n = c.id === "tout" ? tous.length : tous.filter((p) => p.cat === c.id).length;
      return `<button type="button" data-cat="${c.id}" aria-pressed="false">${esc(c.nom)}<small>${n}</small></button>`;
    }).join(""));
    const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const rendre = () => {
      const q = norm(rech && rech.value);
      const liste = tous.filter((p) => (cat === "tout" || p.cat === cat) && (!q || q.split(/\s+/).every((m) => norm(p.nom + " " + p.marque + " " + (p.ref || "") + " " + (p.detail || "")).includes(m))));
      $$("button", filtres).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
      const c = window.CATEGORIES.find((x) => x.id === cat);
      $("#cat-titre").textContent = q ? `Résultats pour « ${rech.value} »` : c ? c.nom : "Tout le matériel";
      $("#cat-desc").textContent = c ? c.desc : "Kits, panneaux, conversion, stockage, fixations et protections en stock en Guadeloupe.";
      const ki = $("#kits-info"); if (ki) ki.hidden = cat !== "kits";
      const rc = $("#rappel-cyclone"); if (rc) rc.hidden = !["kits", "batteries", "convertisseurs"].includes(cat);
      grille.innerHTML = liste.length ? liste.map(carteProduit).join("")
        : `<div class="vide" style="grid-column:1/-1"><p><b>Aucun produit ne correspond à « ${esc(rech.value)} ».</b></p><p>Le magasin compte bien plus de références que ce site. Décrivez ce que vous cherchez, on vous répond.</p><button class="btn btn--petit" type="button" data-ouvrir-devis>Demander ce produit</button></div>`;
      $$("[data-ouvrir-devis]", grille).forEach((b) => b.addEventListener("click", ouvrirTiroir));
    };
    filtres.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-cat]"); if (!b) return;
      cat = b.dataset.cat; if (rech) rech.value = "";
      history.replaceState(null, "", cat === "tout" ? location.pathname : "#" + cat); rendre();
      if (innerWidth < 920) grille.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
    });
    rech && rech.addEventListener("input", rendre);
    addEventListener("hashchange", () => { cat = location.hash.slice(1) || "tout"; rendre(); });
    document.addEventListener("profil", rendre);
    rendre();
  }

  /* ---------- Packs cyclone ---------- */
  const OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  $$("[data-packs]").forEach((b) => {
    b.innerHTML = ((window.KITS || {}).secours || []).map((p, i) => `<article class="pack${i === 1 ? " pack--phare" : ""}">${i === 1 ? '<span class="pack__ruban">Le plus choisi</span>' : ""}<span class="pack__gamme">${esc(p.gamme)}</span><h3><a class="lien-fiche" href="${lienFiche(p.id)}">${esc(p.nom)}</a></h3><div class="pack__kwh">${esc(p.stockage.replace(" kWh", ""))}<small>kWh</small></div><p>${esc(p.detail)}</p><ul><li>${OK}<span><b>Garde allumé :</b> ${esc(p.garde)}</span></li><li>${OK}<span>${esc(p.duree)}</span></li></ul><button class="btn ${i === 1 ? "" : "btn--soleil"}" type="button" data-ajout="${p.id}">Ajouter à mon devis</button></article>`).join("");
  });
  $$("[data-packs-mini]").forEach((b) => {
    b.innerHTML = ((window.KITS || {}).secours || []).map((p) => `<a class="pack-mini" href="pack-cyclone.html#packs"><b>${esc(p.nom)}</b><span>${esc(p.stockage)}</span><small>${esc(p.pour)}</small></a>`).join("");
  });
  $$("[data-img-kit]").forEach((el) => {
    const k = kitsListe().find((x) => x.id === el.dataset.imgKit); if (!k || !k.img) return;
    const im = new Image(); im.alt = ""; im.loading = "lazy"; im.decoding = "async";
    im.onload = () => { el.innerHTML = ""; el.appendChild(im); el.classList.add("a-photo"); };
    im.src = k.img;
  });

  /* ---------- Kits ---------- */
  $$("[data-kits]").forEach((box) => {
    const l = (window.KITS || {})[box.dataset.kits] || [];
    const rendre = () => {
      const prix = voitPrix();
      box.innerHTML = l.map((k) => `<article class="kitc"><div class="kitc__img">${visuel({ ...k, cat: "kits" })}</div>
      <div class="kitc__corps"><span class="kitc__stock">${esc(k.stockage)}</span><h3><a class="lien-fiche" href="${lienFiche(k.id)}">${esc(k.nom)}</a></h3><p>${esc(k.detail)}</p><p class="kitc__pour"><b>Pour :</b> ${esc(k.pour)}</p>
      <div class="kitc__pied">${prix && prixDe(k.id) != null ? `<span class="prix">${euro(prixDe(k.id))}<small>votre tarif HT</small></span>` : '<a class="prix--cache" href="pro.html">Prix pro sur compte</a>'}<button class="btn btn--petit" type="button" data-ajout="${k.id}">Ajouter au devis</button></div></div></article>`).join("");
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
    const kbis = $("#pro-kbis", formPro);
    sirenIn.addEventListener("input", () => { sirenIn.value = sirenIn.value.replace(/[^\d ]/g, "").slice(0, 17); });
    kbis && kbis.addEventListener("change", () => {
      const f = kbis.files[0]; const lbl = $("[data-fichier-nom]", formPro);
      if (f && f.size > 8 * 1024 * 1024) { kbis.value = ""; lbl.textContent = "Fichier trop lourd (8 Mo maximum)"; return; }
      lbl.textContent = f ? f.name : "Choisir un fichier PDF ou une photo";
      kbis.closest(".fichier").classList.toggle("is-ok", !!f);
    });
    formPro.addEventListener("submit", async (e) => {
      e.preventDefault(); if (!valider(formPro)) return;
      const d = lireForm(formPro); const btn = $("button[type=submit]", formPro);
      btn.disabled = true; btn.textContent = "Vérification en cours…";
      sortie.className = "verif is-wait"; sortie.textContent = "Nous interrogeons le registre national des entreprises…";
      const v = await verifierSiren(d.siren);
      btn.disabled = false; btn.textContent = "Envoyer ma demande d'ouverture";
      if (v.etat === "ko") { sortie.className = "verif is-ko"; sortie.textContent = v.msg; sirenIn.setAttribute("aria-invalid", "true"); sirenIn.focus(); return; }
      const fichier = kbis && kbis.files[0];
      const contact = { nom: d.nom, entreprise: v.nom || "", metier: d.metier, telephone: d.telephone, email: d.email, siren: v.siren };
      const verification = v.etat === "ok" ? { registre: "entreprise active", naf: v.naf, code_postal: v.cp, secteur_energie: v.energie, dom: v.dom } : { registre: "non joignable, à vérifier à la main" };
      btn.disabled = true; btn.textContent = "Envoi de votre Kbis…";
      await envoyerLead({ type: "compte-pro", sujet: "Demande de compte pro : " + (v.nom || d.siren) + " (Kbis à valider)", contact, verification, pour_quand: "Au plus vite", score: v.energie ? 85 : 65 }, fichier);
      sortie.className = "verif is-ok";
      sortie.innerHTML = (v.etat === "ok" ? `<b>${esc(v.nom)}</b> est bien active au registre national. ` : "") + "Votre demande et votre Kbis sont transmis au responsable. Après validation, sous 24 h ouvrées, vous recevez un e-mail pour vous connecter et voir vos tarifs.";
      formPro.querySelectorAll("input,select,button").forEach((x) => (x.disabled = true));
    });
  }
  $$("[data-pro-sortir]").forEach((b) => b.addEventListener("click", async () => { try { sbClient && (await sbClient.auth.signOut()); } catch (e) {} localStorage.removeItem("cedyan_pro"); majProfil(); toast("Vous êtes déconnecté de l'espace pro"); setTimeout(() => location.reload(), 600); }));

  /* ---------- Connexion pro (lien magique par e-mail) ---------- */
  const fCo = $("#form-connexion");
  if (fCo) {
    const sortieCo = $("#connexion-etat");
    const cpt = window.cedyanCompte;
    if (cpt && cpt.statut === "en_attente") { sortieCo.className = "verif is-wait"; sortieCo.textContent = "Connecté avec " + cpt.email + ". Votre compte est en cours de validation : vous recevrez un e-mail dès qu'il sera validé."; }
    else if (cpt && cpt.statut === "refuse") { sortieCo.className = "verif is-ko"; sortieCo.textContent = "Votre demande n'a pas pu être validée. Appelez-nous au " + C.telephone + "."; }
    else if (cpt && cpt.statut === "aucun") { sortieCo.className = "verif is-wait"; sortieCo.textContent = "Connecté avec " + cpt.email + ", mais aucune demande de compte pro n'est liée à cette adresse. Remplissez le formulaire ci-dessous."; }
    fCo.addEventListener("submit", async (e) => {
      e.preventDefault(); const em = $("#co-email", fCo).value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { sortieCo.className = "verif is-ko"; sortieCo.textContent = "Saisissez une adresse e-mail valide."; return; }
      try {
        if (!sbClient) { await chargerScript(LIB_SB); sbClient = window.supabase.createClient(SB.url, SB.anonKey); }
        const { error } = await sbClient.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + "/pro.html" } });
        if (error) throw error;
        sortieCo.className = "verif is-ok"; sortieCo.textContent = "C'est envoyé. Ouvrez l'e-mail reçu sur " + em + " et cliquez sur le lien pour vous connecter.";
      } catch (er) { sortieCo.className = "verif is-ko"; sortieCo.textContent = "Envoi impossible pour le moment. Réessayez dans quelques minutes."; }
    });
  }

  /* ---------- Mode alerte cyclone (réglé depuis le dashboard) ---------- */
  const alerte = (window.CEDYAN_REGLAGES || {}).alerte_cyclone;
  if (alerte && alerte.actif) {
    const barre = $(".barre-saison");
    if (barre) {
      barre.hidden = false; barre.classList.add("barre-saison--alerte", "barre-saison--" + (alerte.niveau === "rouge" ? "rouge" : "orange"));
      document.body.classList.add("avec-saison");
      const t = $(".barre-saison__txt", barre); if (t) t.innerHTML = '<i aria-hidden="true"></i><b>' + esc(alerte.message || "Vigilance cyclonique") + "</b>";
      const f = $(".barre-saison__fermer", barre); if (f) f.remove();
    }
    $$(".nav__cyclone").forEach((n) => (n.hidden = false));
  }

  /* ---------- Statistiques de visite (sans cookie) ---------- */
  if (SB && !/dashboard/.test(location.pathname)) {
    try {
      let sid = sessionStorage.getItem("cedyan_sid"); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("cedyan_sid", sid); }
      let ref = ""; try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
      if (ref === location.hostname) ref = "";
      fetch(SB.url + "/rest/v1/visites", { method: "POST", keepalive: true, headers: { ...enTetesSB(), "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ page: (location.pathname.replace(/\.html$/, "") || "/").slice(0, 200), ref: ref.slice(0, 300), source: (utm().utm_source || "").slice(0, 100), session: sid.slice(0, 64), mobile: innerWidth < 768 }) }).catch(() => {});
    } catch (e) {}
  }
  // Raccourci SIRET (bandeau pro de l'accueil) -> pré-remplit pro.html
  const mini = $("#mini-pro");
  if (mini) mini.addEventListener("submit", (e) => { e.preventDefault(); location.href = "pro.html?siren=" + encodeURIComponent($("input", mini).value.replace(/\D/g, "")); });
  if (formPro) { const s = new URLSearchParams(location.search).get("siren"); if (s) $("#pro-siren").value = s; }

  /* ---------- Formulaires simples (pack cyclone, contact) ---------- */
  $$("form[data-lead]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!valider(f)) return; const d = lireForm(f);
    await envoyerLead({ type: f.dataset.lead, sujet: f.dataset.sujet || f.dataset.lead, contact: { nom: d.nom, telephone: d.telephone, email: d.email, commune: d.commune }, reponses: { choix: d.choix }, pour_quand: d.delai, message: d.message, score: scoreLead({ tel: d.telephone, delai: d.delai }) });
    f.innerHTML = `<div class="verif is-ok" style="display:block"><b>Merci ${esc((d.nom || "").split(" ")[0])}.</b> Un conseiller vous rappelle sous 24 h ouvrées.</div>`;
  }));

  /* ---------- Horaires ---------- */
  $$("[data-horaires-table]").forEach((t) => (t.innerHTML = (C.horairesDetail || []).map(([j, h]) => `<tr><th scope="row">${esc(j)}</th><td>${esc(h)}</td></tr>`).join("")));

  /* ---------- Vidéo YouTube (chargée au clic) ---------- */
  $$("[data-youtube]").forEach((b) => b.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + b.dataset.youtube + "?autoplay=1";
    f.title = "Vidéo Cedyan Energy"; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true;
    b.replaceWith(f);
  }));

  /* ---------- Annuaire des installateurs (façon Qualit'EnR) ---------- */
  const COORDS = { "Les Abymes": [16.271, -61.504], "Anse-Bertrand": [16.472, -61.507], "Baie-Mahault": [16.267, -61.585], "Baillif": [16.020, -61.746], "Basse-Terre": [15.997, -61.726], "Bouillante": [16.131, -61.767], "Capesterre-Belle-Eau": [16.044, -61.564], "Capesterre-de-Marie-Galante": [15.896, -61.214], "Deshaies": [16.306, -61.794], "La Désirade": [16.305, -61.075], "Gourbeyre": [15.993, -61.692], "Le Gosier": [16.206, -61.493], "Goyave": [16.135, -61.574], "Grand-Bourg": [15.883, -61.315], "Lamentin": [16.268, -61.632], "Morne-à-l'Eau": [16.333, -61.457], "Le Moule": [16.333, -61.344], "Petit-Bourg": [16.192, -61.592], "Petit-Canal": [16.380, -61.486], "Pointe-à-Pitre": [16.241, -61.533], "Pointe-Noire": [16.233, -61.788], "Port-Louis": [16.418, -61.531], "Saint-Claude": [16.023, -61.701], "Saint-François": [16.252, -61.274], "Saint-Louis": [15.958, -61.316], "Sainte-Anne": [16.226, -61.380], "Sainte-Rose": [16.333, -61.697], "Terre-de-Bas": [15.854, -61.640], "Terre-de-Haut": [15.866, -61.583], "Trois-Rivières": [15.976, -61.645], "Vieux-Fort": [15.950, -61.705], "Vieux-Habitants": [16.059, -61.765], "Martinique": [14.64, -61.02], "Saint-Martin": [18.07, -63.05], "Saint-Barthélemy": [17.90, -62.83] };
  const CEDYAN_GPS = [16.256, -61.578];
  const distKm = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const annuaire = $("#annuaire-liste");
  if (annuaire) {
    const ZONES = { "Grande-Terre": ["Les Abymes", "Anse-Bertrand", "Le Gosier", "Le Moule", "Morne-à-l'Eau", "Petit-Canal", "Pointe-à-Pitre", "Port-Louis", "Saint-François", "Sainte-Anne"], "Basse-Terre": ["Baie-Mahault", "Baillif", "Basse-Terre", "Bouillante", "Capesterre-Belle-Eau", "Deshaies", "Gourbeyre", "Goyave", "Lamentin", "Petit-Bourg", "Pointe-Noire", "Saint-Claude", "Sainte-Rose", "Trois-Rivières", "Vieux-Fort", "Vieux-Habitants"], "Marie-Galante": ["Grand-Bourg", "Capesterre-de-Marie-Galante", "Saint-Louis"], "Les Saintes": ["Terre-de-Haut", "Terre-de-Bas"], "La Désirade": ["La Désirade"], "Martinique": ["Martinique"], "Saint-Martin": ["Saint-Martin"], "Saint-Barthélemy": ["Saint-Barthélemy"] };
    const zoneDe = (c) => Object.keys(ZONES).find((z) => ZONES[z].includes(c));
    const inC = $("#a-commune"), selT = $("#a-type"), rge = $("#a-rge"), tri = $("#a-tri");
    $("#liste-communes").innerHTML = COMMUNES.filter((c) => COORDS[c]).map((c) => `<option value="${esc(c)}">`).join("");
    const memo = store.get("cedyan_commune", ""); if (memo && COORDS[memo]) inC.value = memo;
    const parts = (window.PARTENAIRES || []).map((p, k) => { const g = COORDS[p.commune] || CEDYAN_GPS; return { ...p, gps: p.gps || [g[0] + ((k * 37) % 7 - 3) * 0.004, g[1] + ((k * 53) % 7 - 3) * 0.004] }; });
    // Carte Leaflet
    let carte = null, calque = null, pinCommune = null;
    if (window.L && $("#carte-annuaire")) {
      carte = L.map("carte-annuaire", { scrollWheelZoom: false, zoomControl: true }).setView([16.17, -61.45], 10);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap, © CARTO", subdomains: "abcd", maxZoom: 18 }).addTo(carte);
      calque = L.layerGroup().addTo(carte);
      L.marker(CEDYAN_GPS, { icon: L.divIcon({ className: "pin pin--cedyan", html: "<span>Cedyan</span>", iconSize: [64, 28], iconAnchor: [32, 28] }) }).addTo(carte).bindPopup("<b>Cedyan Energy</b><br>Magasin et comptoir, Baie-Mahault");
    } else $(".ann-carte") && $(".ann-carte").classList.add("sans-carte");
    const rendre = (centrer) => {
      const c = COORDS[inC.value] ? inC.value : ""; if (c) store.set("cedyan_commune", c);
      const z = c ? zoneDe(c) : ""; const type = selT.value;
      let l = parts.filter((p) => (!rge.checked || p.rge) && (!type || (p.specialites || []).includes(type)) && (!z || (p.zones || []).includes(z) || p.commune === c));
      l.forEach((p) => (p.km = c ? distKm(COORDS[c], p.gps) : null));
      l.sort(tri.value === "nom" ? (a, b) => a.nom.localeCompare(b.nom) : (a, b) => (a.km ?? 0) - (b.km ?? 0) || b.rge - a.rge);
      $("#annuaire-compte").textContent = c ? `${l.length} installateur${l.length > 1 ? "s" : ""} près de ${c}` : `${l.length} installateur${l.length > 1 ? "s" : ""} partenaire${l.length > 1 ? "s" : ""} en Guadeloupe`;
      annuaire.innerHTML = l.length ? l.map((p, k) => `<article class="ann-fiche" data-k="${k}">
        ${p.exemple ? '<span class="avi__ex">Exemple</span>' : ""}
        <div class="ann-fiche__tete"><span class="ann-fiche__mono">${esc(p.nom.split(" ").filter((m) => m.length > 2).slice(0, 2).map((m) => m[0]).join("").toUpperCase())}</span>
        <div><h3>${esc(p.nom)}</h3><p>${esc(p.commune)}${p.km != null ? ` <b class="ann-km">à ${p.km < 1 ? "moins d'1" : Math.round(p.km)} km</b>` : ""}</p></div></div>
        <div class="ann-fiche__quali">${p.rge ? '<span class="badge-rge">RGE QualiPV</span>' : '<span class="badge-non">Non RGE</span>'}${(p.specialites || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <p class="ann-fiche__zone">Intervient en ${esc((p.zones || []).join(", "))}</p>
        <div class="ann-fiche__actions">${p.telephone ? `<a class="btn btn--ligne btn--petit" href="tel:${esc(p.telephone.replace(/\s/g, ""))}">Appeler</a>` : ""}<a class="btn btn--petit" href="contact.html?partenaire=${encodeURIComponent(p.nom)}">Demander un devis</a></div></article>`).join("")
        : `<div class="vide" style="text-align:left"><p><b>Aucun partenaire ne correspond à cette recherche.</b></p><p>Laissez-nous votre projet : nous le transmettons à un installateur qui peut intervenir chez vous.</p><a class="btn btn--petit" href="#" data-quiz-direct>Être mis en relation</a></div>`;
      $$("[data-quiz-direct]", annuaire).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); ouvrirQuiz({}); }));
      $$(".ann-fiche__mono", annuaire).forEach((m, k) => (m.dataset.n = k + 1));
      if (carte) {
        calque.clearLayers(); const pts = [];
        l.forEach((p, k) => {
          const m = L.marker(p.gps, { icon: L.divIcon({ className: "pin" + (p.rge ? " pin--rge" : ""), html: `<span>${k + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(calque).bindPopup(`<b>${esc(p.nom)}</b><br>${esc(p.commune)}`);
          pts.push(p.gps);
          const fiche = annuaire.querySelector(`[data-k="${k}"]`);
          if (fiche) { fiche.addEventListener("mouseenter", () => m.getElement() && m.getElement().classList.add("is-on")); fiche.addEventListener("mouseleave", () => m.getElement() && m.getElement().classList.remove("is-on")); fiche.addEventListener("click", (e) => { if (!e.target.closest("a")) { carte.flyTo(p.gps, 12, { duration: .8 }); m.openPopup(); } }); }
        });
        if (pinCommune) { carte.removeLayer(pinCommune); pinCommune = null; }
        if (c) { pinCommune = L.circleMarker(COORDS[c], { radius: 9, color: "#fff", weight: 3, fillColor: "#2b4b9b", fillOpacity: 1 }).addTo(carte).bindTooltip(c, { permanent: true, direction: "top", className: "pin-tip" }); pts.push(COORDS[c]); }
        if (centrer !== false) { if (pts.length > 1) carte.flyToBounds(pts, { padding: [40, 40], maxZoom: 12, duration: .8 }); else if (pts.length) carte.flyTo(pts[0], 12, { duration: .8 }); else carte.flyTo([16.17, -61.45], 10, { duration: .8 }); }
      }
    };
    $("#form-annu").addEventListener("submit", (e) => { e.preventDefault(); rendre(); document.querySelector(".ann-res").scrollIntoView({ behavior: reduit ? "auto" : "smooth" }); });
    [selT, rge, tri].forEach((x) => x.addEventListener("change", () => rendre()));
    inC.addEventListener("change", () => rendre());
    const reset = $("[data-zone-reset]"); reset && reset.addEventListener("click", () => { inC.value = ""; selT.value = ""; rendre(); });
    rendre(false);
    // Onglets
    $$("[data-onglet]").forEach((o) => o.addEventListener("click", () => {
      $$("[data-onglet]").forEach((x) => x.setAttribute("aria-selected", String(x === o)));
      $$("[data-panneau]").forEach((p) => p.classList.toggle("is-on", p.dataset.panneau === o.dataset.onglet));
    }));
    // Vérifier une entreprise : registre national + annuaire RGE de l'ADEME
    const fv = $("#form-verif-rge");
    fv && fv.addEventListener("submit", async (e) => {
      e.preventDefault(); const out = $("#verif-rge"); const n = $("#v-siret").value.replace(/\D/g, "");
      if (!(n.length === 9 || n.length === 14)) { out.className = "verif is-ko"; out.textContent = "Saisissez un SIRET (14 chiffres) ou un SIREN (9 chiffres)."; return; }
      out.className = "verif is-wait"; out.textContent = "Vérification en cours…";
      const v = await verifierSiren(n);
      let rgeTxt = "";
      try {
        const r = await fetch("https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines?size=20&qs=siret:" + (n.length === 14 ? n : n + "*"));
        const j = await r.json(); const lignes = (j.results || []);
        const pv = lignes.filter((x) => /qualipv|photovolta/i.test(JSON.stringify(x)));
        rgeTxt = lignes.length ? (pv.length ? "<b>Qualification RGE photovoltaïque trouvée</b> (QualiPV)." : "Entreprise RGE, mais pas pour le photovoltaïque.") : "Aucune qualification RGE trouvée pour ce numéro.";
      } catch (er) { rgeTxt = 'Vérifiez la qualification RGE sur <a class="lien" href="https://france-renov.gouv.fr/annuaire-rge" target="_blank" rel="noopener">l\'annuaire officiel France Rénov\'</a>.'; }
      const partenaire = parts.find((p) => p.siren && n.startsWith(p.siren));
      if (v.etat === "ko") { out.className = "verif is-ko"; out.textContent = v.msg; return; }
      out.className = "verif is-ok";
      out.innerHTML = (v.nom ? `<b>${esc(v.nom)}</b> : entreprise active au registre national. ` : "") + rgeTxt + (partenaire ? " <b>Partenaire Cedyan Energy.</b>" : "");
    });
  }
  // Pré-remplir le message contact quand on vient de l'annuaire
  const partenaireQ = new URLSearchParams(location.search).get("partenaire");
  if (partenaireQ && $("#ct-msg")) { $("#ct-msg").value = "Je souhaite être mis en relation avec " + partenaireQ + " pour mon projet : "; $("#ct-objet").value = "Demande de prix"; }

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
      const e = ease(clamp((p - 0.04) / 0.56));
      const f = clamp((p - 0.64) / 0.12);
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


  /* ---------- Recherche : suggestions de produits sous la barre ---------- */
  const normR = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9,./ -]/g, " ");
  const singulier = (m) => (m.length > 3 && /[sx]$/.test(m) ? m.slice(0, -1) : m);
  function chercher(q) {
    const mots = normR(q).split(/\s+/).filter(Boolean).map(singulier);
    if (!mots.length) return [];
    const cats = Object.fromEntries((window.CATEGORIES || []).map((c) => [c.id, c.nom]));
    return tousProduits().map((p) => {
      const nom = normR(p.nom), marque = normR(p.marque), ref = normR(p.ref), cat = normR(cats[p.cat] || p.cat), autre = normR((p.detail || "") + " " + (p.description || ""));
      let score = 0;
      for (const m of mots) {
        const debut = (t) => t.split(/[\s,./-]+/).some((w) => w.startsWith(m));
        let s = 0;
        if (ref.replace(/\s/g, "").startsWith(m)) s = 60; else if (debut(ref)) s = 40;
        if (debut(nom)) s = Math.max(s, 30); else if (nom.includes(m)) s = Math.max(s, 15);
        if (debut(marque)) s = Math.max(s, 25);
        if (debut(cat)) s = Math.max(s, 12);
        if (!s && m.length > 2 && autre.includes(m)) s = 4;
        if (!s) return { p, score: 0 };
        score += s;
      }
      return { p, score: score + (p.stock ? 2 : 0) };
    }).filter((x) => x.score > 0).sort((x, y) => y.score - x.score).map((x) => x.p);
  }
  function surligner(t, q) {
    let h = esc(t); const mots = q.trim().split(/\s+/).filter((m) => m.length > 1);
    mots.forEach((m) => { const re = new RegExp("(" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"); h = h.replace(re, "<mark>$1</mark>"); });
    return h;
  }
  function brancherSuggestions(input, opts = {}) {
    if (!input) return;
    const boite = document.createElement("div"); boite.className = "suggestions"; boite.id = "sugg-" + input.id; boite.setAttribute("role", "listbox"); boite.hidden = true;
    document.body.appendChild(boite);
    input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-controls", boite.id); input.setAttribute("aria-expanded", "false");
    const ancre = input.closest(".recherche-hero, .recherche, form") || input;
    let res = [], actif = -1;
    const placer = () => {
      const r = ancre.getBoundingClientRect(); const bas = innerHeight - r.bottom, haut = r.top;
      boite.style.left = Math.max(8, r.left) + "px"; boite.style.width = Math.min(r.width, innerWidth - 16) + "px";
      if (bas < 320 && haut > bas) { boite.style.top = ""; boite.style.bottom = innerHeight - r.top + 8 + "px"; boite.classList.add("vers-haut"); }
      else { boite.style.bottom = ""; boite.style.top = r.bottom + 8 + "px"; boite.classList.remove("vers-haut"); }
    };
    const fermer = () => { boite.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); actif = -1; };
    const voirTout = () => (opts.voirTout ? opts.voirTout(input.value) : (location.href = "catalogue.html?q=" + encodeURIComponent(input.value.trim())));
    const montrer = () => {
      const q = input.value.trim();
      if (q.length < 2) return fermer();
      res = chercher(q); actif = -1;
      const cats = Object.fromEntries((window.CATEGORIES || []).map((c) => [c.id, c.nom]));
      boite.innerHTML = res.length
        ? res.slice(0, 6).map((p, k) => `<a class="sugg" role="option" id="${boite.id}-${k}" href="${lienFiche(p.id)}"><span class="sugg__img">${visuel(p)}</span><span class="sugg__txt"><b>${surligner(p.nom, q)}</b><small>${surligner([p.marque, p.ref].filter(Boolean).join(" · "), q)}</small></span><span class="sugg__cat">${esc(cats[p.cat] || "")}</span></a>`).join("")
          + `<button type="button" class="sugg__tout" data-tout>${res.length > 6 ? `Voir les ${res.length} résultats` : "Voir dans le catalogue"} pour « ${esc(q)} » →</button>`
        : `<div class="sugg__vide"><b>Aucun produit pour « ${esc(q)} »</b><span>Le magasin compte bien plus de références que le site.</span><button type="button" class="btn btn--petit" data-demander>Demander ce produit</button></div>`;
      boite.hidden = false; input.setAttribute("aria-expanded", "true"); placer();
    };
    const marquer = () => { $$(".sugg", boite).forEach((x, k) => x.classList.toggle("is-actif", k === actif)); if (actif >= 0) input.setAttribute("aria-activedescendant", boite.id + "-" + actif); };
    input.addEventListener("input", montrer);
    input.addEventListener("focus", () => input.value.trim().length >= 2 && montrer());
    input.addEventListener("keydown", (e) => {
      const n = $$(".sugg", boite).length;
      if (e.key === "ArrowDown" && !boite.hidden) { e.preventDefault(); actif = (actif + 1) % n; marquer(); }
      else if (e.key === "ArrowUp" && !boite.hidden) { e.preventDefault(); actif = (actif - 1 + n) % n; marquer(); }
      else if (e.key === "Escape") fermer();
      else if (e.key === "Enter" && actif >= 0 && !boite.hidden) { e.preventDefault(); $$(".sugg", boite)[actif].click(); }
      else if (e.key === "Enter" && opts.voirTout) { e.preventDefault(); fermer(); voirTout(); }
    });
    boite.addEventListener("mousedown", (e) => e.preventDefault());
    boite.addEventListener("click", (e) => {
      if (e.target.closest("[data-tout]")) { fermer(); voirTout(); }
      else if (e.target.closest("[data-demander]")) { fermer(); const m = $("#message-devis") || $("textarea[name=message]"); ouvrirTiroir(); setTimeout(() => { const t = $(".tiroir textarea"); if (t && !t.value) t.value = "Je cherche : " + input.value.trim(); }, 80); }
    });
    input.addEventListener("blur", () => setTimeout(fermer, 120));
    addEventListener("resize", () => !boite.hidden && placer());
    addEventListener("scroll", () => !boite.hidden && placer(), { passive: true });
  }
  brancherSuggestions($("#q-hero"));
  brancherSuggestions($("#recherche"), { voirTout: (q) => { const r = $("#recherche"); r.value = q; r.dispatchEvent(new Event("input")); const g = $("#produits"); g && g.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" }); } });

  /* ---------- Fiche produit ---------- */
  const ficheBox = $("#fiche");
  if (ficheBox) {
    const id = new URLSearchParams(location.search).get("id") || "";
    const rendreFiche = () => {
      const p = trouver(id);
      const cats = Object.fromEntries((window.CATEGORIES || []).map((c) => [c.id, c.nom]));
      if (!p) {
        ficheBox.innerHTML = `<div class="vide"><p><b>Ce produit n'est plus en ligne.</b></p><p>Il est peut-être toujours disponible au magasin : appelez-nous ou consultez le catalogue.</p><a class="btn" href="catalogue.html">Voir le catalogue</a></div>`;
        return;
      }
      const catNom = p.cat === "kits" ? "Kits solaires" : cats[p.cat] || "Catalogue";
      document.title = `${p.nom}${p.ref ? " " + p.ref : ""} | ${p.marque || "Cedyan Energy"} | Cedyan Energy`;
      const md = $('meta[name="description"]'); if (md) md.setAttribute("content", `${p.nom} ${p.marque || ""} ${p.ref || ""} en stock chez Cedyan Energy, grossiste solaire à Baie-Mahault, Guadeloupe.`.replace(/\s+/g, " "));
      $("#fiche-fil").innerHTML = `<a href="index.html">Accueil</a> / <a href="catalogue.html">Catalogue</a> / <a href="catalogue.html#${esc(p.cat)}">${esc(catNom)}</a> / <span>${esc(p.nom)}</span>`;
      const intro = {
        kits: () => `Kit complet prêt à poser${p.detail ? " : " + p.detail.charAt(0).toLowerCase() + p.detail.slice(1) : ""}.${p.pour ? " Idéal pour : " + p.pour.toLowerCase() + "." : ""} Tout le matériel est en stock à Baie-Mahault et vérifié par notre service technique.`,
        panneaux: () => `Panneau photovoltaïque ${p.marque || ""}, disponible chez Cedyan Energy à Baie-Mahault. Notre service technique vous aide à dimensionner l'installation : nombre de panneaux, onduleur ou régulateur compatible, fixations.`,
        batteries: () => `Batterie ${p.marque || ""} pour stocker l'énergie solaire ou tenir pendant les coupures. Avant la commande, nous vérifions avec vous la compatibilité avec votre onduleur ou votre convertisseur.`,
        onduleurs: () => `Onduleur ${p.marque || ""} pour installation raccordée au réseau. Nous vérifions avec vous la compatibilité avec vos panneaux et, si besoin, avec une batterie.`,
        convertisseurs: () => `Convertisseur-chargeur ${p.marque || ""}, au cœur des installations isolées et des systèmes de secours. Bascule automatique sur batterie en cas de coupure.`,
        regulateurs: () => `Régulateur de charge ${p.marque || ""} pour piloter la recharge des batteries à partir des panneaux. Nous vous aidons à choisir le bon calibre selon votre champ solaire.`,
      };
      const texte = p.description || (intro[p.cat] ? intro[p.cat]() : `${p.nom} ${p.marque || ""}, ${p.stock ? "en stock" : "disponible sur commande"} chez Cedyan Energy à Baie-Mahault. Besoin d'un conseil de compatibilité ? Notre service technique vous répond.`);
      const lignes = [[p.cat === "kits" ? "Gamme" : "Marque", p.marque], ["Référence", p.ref], ["Catégorie", catNom], ["Disponibilité", p.cat === "kits" ? "Kit complet, en stock" : p.stock ? "En stock à Baie-Mahault" : "Sur commande"]]
        .concat(p.cat === "kits" ? [["Composition", p.detail], ["Pour", p.pour], ["Garde allumé", p.garde], ["Autonomie", p.duree]] : [])
        .concat((p.caracteristiques || []).map((c) => (Array.isArray(c) ? c : ["", c])))
        .filter(([, v]) => v);
      const prix = voitPrix();
      const blocPrix = prix
        ? (prixDe(p.id) != null ? `<p class="fiche__prix">${euro(prixDe(p.id))}<small>votre tarif pro HT</small></p>` : `<p class="fiche__prix fiche__prix--devis">Tarif sur devis</p>`)
        : `<div class="fiche__pro"><b>Professionnel ?</b><span>Débloquez vos tarifs sur tout le catalogue.</span><a class="btn btn--petit btn--soleil" href="pro.html">${SVG.cle || ""}Voir mon prix pro</a></div>`;
      const wa = C.whatsapp ? `https://wa.me/${C.whatsapp}?text=${encodeURIComponent("Bonjour, je suis intéressé par : " + p.nom + (p.ref ? " (" + p.ref + ")" : ""))}` : "";
      ficheBox.innerHTML = `
        <div class="fiche__visuel"><div class="fiche__img">${visuel(p, "fiche__photo")}</div><span class="produit__stock${p.stock ? "" : " produit__stock--cmd"}">${p.cat === "kits" ? "Kit complet" : p.stock ? "En stock" : "Sur commande"}</span></div>
        <div class="fiche__infos">
          <a class="fiche__marque" href="catalogue.html?q=${encodeURIComponent(p.marque || "")}">${esc(p.marque || "")}</a>
          <h1 class="fiche__nom">${esc(p.nom)}</h1>
          ${p.ref ? `<p class="fiche__ref">Réf. ${esc(p.ref)}</p>` : ""}
          ${blocPrix}
          <div class="fiche__achat">
            <div class="qte qte--grande"><button type="button" data-fq="-1" aria-label="Moins">−</button><input type="number" min="1" max="999" value="1" id="fiche-q" aria-label="Quantité"><button type="button" data-fq="1" aria-label="Plus">+</button></div>
            <button class="btn" type="button" id="fiche-ajout">${SVG.plus}Ajouter au devis</button>
          </div>
          <div class="fiche__question">${wa ? `<a class="lien" href="${wa}" target="_blank" rel="noopener">Une question ? WhatsApp</a>` : ""}<a class="lien" href="tel:${esc((C.telephoneLien || C.telephone || "").replace(/\s/g, ""))}">Appeler le ${esc(C.telephone || "")}</a></div>
          <ul class="fiche__plus"><li>${SVG.ok}<span>Stock à Baie-Mahault</span></li><li>${SVG.ok}<span>Livraison en 48 h en Guadeloupe</span></li><li>${SVG.ok}<span>Retrait gratuit au comptoir</span></li><li>${SVG.ok}<span>Garantie fabricant</span></li></ul>
        </div>
        <div class="fiche__details">
          <section><h2>Présentation</h2><p>${esc(texte).replace(/\n/g, "<br>")}</p>${p.fiche ? `<a class="btn btn--ligne btn--petit" href="${esc(p.fiche)}" target="_blank" rel="noopener">Télécharger la fiche technique (PDF)</a>` : ""}</section>
          <section><h2>Caractéristiques</h2><table class="fiche__carac">${lignes.map(([k, v]) => `<tr>${k ? `<th>${esc(k)}</th><td>${esc(v)}</td>` : `<td colspan="2">${esc(v)}</td>`}</tr>`).join("")}</table></section>
        </div>`;
      const q = $("#fiche-q");
      $$("[data-fq]", ficheBox).forEach((b) => b.addEventListener("click", () => (q.value = Math.max(1, Math.min(999, (+q.value || 1) + +b.dataset.fq)))));
      $("#fiche-ajout").addEventListener("click", (e) => {
        const n = Math.max(1, Math.min(999, Math.round(+q.value || 1)));
        const l = devis.get(); const x = l.find((i) => i.id === p.id); if (x) x.q += n; else l.push({ id: p.id, q: n }); devis.set(l);
        toast(`${n} × ${p.nom} ajouté${n > 1 ? "s" : ""} à votre devis`);
        const b = e.currentTarget; b.classList.add("is-in"); setTimeout(() => b.classList.remove("is-in"), 1200);
      });
      const sim = tousProduits().filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
      $("#fiche-similaires").innerHTML = sim.length ? `<h2 class="t-l">Dans la même gamme</h2><div class="produits">${sim.map(carteProduit).join("")}</div>` : "";
      let ld = $("#fiche-ld"); if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "fiche-ld"; document.head.appendChild(ld); }
      ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: p.nom, brand: p.marque ? { "@type": "Brand", name: p.marque } : undefined, sku: p.ref || undefined, image: p.img || undefined, description: texte, category: catNom });
    };
    rendreFiche(); document.addEventListener("profil", rendreFiche);
  }

  majProfil(); majDevis();
})();
