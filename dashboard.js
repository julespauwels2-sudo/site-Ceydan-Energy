/* =========================================================
   CEDYAN ENERGY — Dashboard (patron et équipe)
   Connexion par lien e-mail. Les droits sont vérifiés côté base (RLS).
   ========================================================= */
(async function () {
  "use strict";
  const C = window.CEDYAN_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => (n == null || n === "" ? "" : (+n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
  const date = (d) => new Date(d).toLocaleString("fr-FR", { timeZone: "America/Guadeloupe", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const depuis = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
  const toast = (t) => { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("on"), 2600); };

  if (!C.supabase || !window.supabase) { document.body.innerHTML = "<p style='padding:40px'>Configuration Supabase manquante.</p>"; return; }
  const sb = window.supabase.createClient(C.supabase.url, C.supabase.anonKey);

  const STATUTS = { nouveau: "Nouveau", a_valider: "Devis à valider", attente_kbis: "Attente Kbis", en_cours: "En cours", devis_envoye: "Devis envoyé", gagne: "Gagné", perdu: "Perdu", expire: "Expiré" };
  const A_TRAITER = ["nouveau", "a_valider", "attente_kbis"];
  const TYPES = { devis: "Devis", questionnaire: "Questionnaire", "pack-cyclone": "Pack cyclone", contact: "Contact", "compte-pro": "Compte pro" };
  const PRIO = { haute: "Au plus vite", moyenne: "D'ici 3 mois", basse: "Se renseigne" };
  let CATS = { kits: "Kits solaires", panneaux: "Panneaux", regulateurs: "Régulateurs", onduleurs: "Onduleurs", convertisseurs: "Convertisseurs", batteries: "Batteries", structures: "Fixations", cables: "Câbles", monitoring: "Monitoring", protections: "Protections" };
  const COMMUNES = ["Les Abymes", "Anse-Bertrand", "Baie-Mahault", "Baillif", "Basse-Terre", "Bouillante", "Capesterre-Belle-Eau", "Capesterre-de-Marie-Galante", "Deshaies", "La Désirade", "Gourbeyre", "Le Gosier", "Goyave", "Grand-Bourg", "Lamentin", "Morne-à-l'Eau", "Le Moule", "Petit-Bourg", "Petit-Canal", "Pointe-à-Pitre", "Pointe-Noire", "Port-Louis", "Saint-Claude", "Saint-François", "Saint-Louis", "Sainte-Anne", "Sainte-Rose", "Terre-de-Bas", "Terre-de-Haut", "Trois-Rivières", "Vieux-Fort", "Vieux-Habitants", "Martinique", "Saint-Martin", "Saint-Barthélemy"];
  const ZONES = ["Grande-Terre", "Basse-Terre", "Marie-Galante", "Les Saintes", "La Désirade", "Martinique", "Saint-Martin", "Saint-Barthélemy"];
  const SPECS = ["Raccordé réseau", "Site isolé", "Batteries", "Pack cyclone"];
  let moi = null, D = { demandes: [], pros: [], produits: [], partenaires: [], equipe: [] };

  /* Rangement des produits : même règle que le catalogue du site (marque, type, puis capacité croissante) */
  // Grandeur principale du produit : puissance (W, kW, VA, kVA, Wc), énergie (kWh), capacité (Ah), courant (A)
  const CLASSES = { W: [0, 1], Wc: [0, 1], kW: [0, 1000], VA: [0, 1], kVA: [0, 1000], kWh: [1, 1000], Ah: [2, 1], A: [3, 1] };
  function cleProduit(nom) {
    const t = [...String(nom || "").matchAll(/(\d+(?:[.,]\d+)?)\s*(kWh|kW|kVA|VA|Wc|W|Ah|A)\b/g)];
    // on retient la grandeur la plus « importante » citée (puissance avant énergie, avant capacité, avant courant)
    let rang = 9, cap = null;
    t.forEach((m) => { const [r, mult] = CLASSES[m[2]]; const v = parseFloat(m[1].replace(",", ".")) * mult; if (r < rang || (r === rang && v > cap)) { rang = r; cap = v; } });
    return { rang, cap };
  }
  function rangerProduits(liste) {
    const ordreCat = Object.fromEntries((window.CATEGORIES || []).map((c, i) => [c.id, i]));
    const col = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
    const nombre = (s) => String(s || "").replace(/(\d+)k(\d)\b/gi, (m, x, y) => String(+x * 1000 + +y * 100)).replace(/(\d),(\d)/g, "$1.$2");
    // Catégorie, puis marque, puis les produits principaux du plus petit au plus grand, puis les accessoires
    return [...(liste || [])].map((p) => ({ p, c: cleProduit(p.nom) })).sort((A, B) => {
      const a = A.p, b = B.p;
      return ((ordreCat[a.cat] ?? 99) - (ordreCat[b.cat] ?? 99)) ||
        col.compare(a.marque || "", b.marque || "") ||
        (A.c.rang - B.c.rang) ||
        (A.c.cap != null && B.c.cap != null ? A.c.cap - B.c.cap : 0) ||
        col.compare(nombre(a.nom), nombre(b.nom)) ||
        col.compare(a.ref || "", b.ref || "");
    }).map((x) => x.p);
  }

  /* ---------- Connexion ---------- */
  const montrer = (id) => ["ecran-connexion", "ecran-refus", "app"].forEach((x) => ($("#" + x).hidden = x !== id));
  // Connexion par e-mail + mot de passe
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault(); const em = $("#login-email").value.trim(), mdp = $("#login-mdp").value, msg = $("#login-msg");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = "Adresse e-mail invalide."; return; }
    if (!mdp) { msg.textContent = "Saisissez votre mot de passe. Première connexion ? Utilisez le lien juste en dessous."; return; }
    msg.textContent = "Connexion…";
    const { error } = await sb.auth.signInWithPassword({ email: em.toLowerCase(), password: mdp });
    if (error) { msg.textContent = /rate|limit/i.test(error.message) ? "Trop de tentatives. Patientez une minute avant de réessayer." : "E-mail ou mot de passe incorrect. Pas encore de mot de passe, ou oublié ? Utilisez le lien juste en dessous."; return; }
    msg.textContent = "";
  });
  // Première connexion ou mot de passe oublié : lien par e-mail, puis choix du mot de passe
  $("#login-lien").addEventListener("click", async () => {
    const em = $("#login-email").value.trim(); const msg = $("#login-msg");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = "Saisissez d'abord votre e-mail ci-dessus."; $("#login-email").focus(); return; }
    msg.textContent = "Envoi…";
    try { localStorage.setItem("cedyan_definir_mdp", "1"); } catch (e) {}
    // Aucun compte n'est créé depuis cette page, et la réponse est la même que l'adresse soit autorisée ou non :
    // impossible de deviner qui a accès au dashboard.
    const { error } = await sb.auth.signInWithOtp({ email: em.toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
    if (error && /rate|limit|security purposes/i.test(error.message)) { msg.textContent = "Trop de tentatives. Patientez une minute avant de réessayer."; return; }
    msg.textContent = "Si cette adresse a accès au dashboard, un lien de connexion vient d'y être envoyé. Après connexion, vous pourrez choisir votre mot de passe.";
  });

  /* ---------- Mot de passe ---------- */
  const dlgMdp = $("#dlg-mdp");
  const ouvrirMdp = () => { $("#mdp-msg").textContent = ""; $("#form-mdp").reset(); dlgMdp.showModal(); $("#mdp1").focus(); };
  $("#btn-mdp").addEventListener("click", ouvrirMdp);
  $("#mdp-annuler").addEventListener("click", () => dlgMdp.close());
  $("#form-mdp").addEventListener("submit", async (e) => {
    e.preventDefault(); const a = $("#mdp1").value, b = $("#mdp2").value, msg = $("#mdp-msg");
    if (a.length < 8) { msg.textContent = "Au moins 8 caractères."; return; }
    if (a !== b) { msg.textContent = "Les deux mots de passe ne sont pas identiques."; return; }
    $("#mdp-ok").disabled = true; msg.textContent = "Enregistrement…";
    const { error } = await sb.auth.updateUser({ password: a });
    $("#mdp-ok").disabled = false;
    if (error) { msg.textContent = /reauth|nonce|recent/i.test(error.message) ? "Par sécurité, déconnectez-vous, reconnectez-vous avec un lien e-mail, puis recommencez." : "Enregistrement impossible : " + error.message; return; }
    msg.textContent = "Mot de passe enregistré.";
    setTimeout(() => dlgMdp.close(), 1200);
  });
  $$("[data-deconnexion]").forEach((b) => b.addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); }));

  /* Déconnexion automatique après 12 heures sans activité (ordinateur laissé ouvert, téléphone prêté…) */
  const INACTIVITE = 12 * 60 * 60 * 1000; // 12 h sans activité
  let derniereActivite = Date.now();
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, () => (derniereActivite = Date.now()), { passive: true }));
  setInterval(async () => {
    if (!moi || Date.now() - derniereActivite < INACTIVITE) return;
    moi = null; try { await sb.auth.signOut(); } catch (e) {}
    location.reload();
  }, 30000);
  // Au retour sur l'onglet après une longue absence, on vérifie tout de suite
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && moi && Date.now() - derniereActivite >= INACTIVITE) { sb.auth.signOut().finally(() => location.reload()); } });

  // Images cassées des vignettes : retirées sans gestionnaire en ligne (compatible avec la politique de sécurité stricte)
  addEventListener("error", (e) => { const t = e.target; if (t && t.tagName === "IMG" && t.closest(".vignette")) t.remove(); }, true);

  async function demarrer() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return montrer("ecran-connexion");
    const email = session.user.email.toLowerCase();
    const { data: m } = await sb.from("staff").select("email, nom, role").ilike("email", email).maybeSingle();
    if (!m) { $("#refus-txt").textContent = `${email} n'a pas accès au dashboard. Demandez au patron de vous ajouter à l'équipe.`; return montrer("ecran-refus"); }
    moi = m; $("#moi-nom").textContent = m.nom || m.email;
    montrer("app"); await toutCharger();
    try { if (localStorage.getItem("cedyan_definir_mdp") === "1") { localStorage.removeItem("cedyan_definir_mdp"); ouvrirMdp(); } } catch (e) {}
    setInterval(() => { if (!document.hidden) { chargerDemandes(); badgeDevis(); } }, 60000);
  }
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" && !moi) demarrer(); });

  /* ---------- Navigation ---------- */
  $$("[data-vue]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-vue]").forEach((x) => x.classList.toggle("is-on", x === b));
    $$("[data-vue-p]").forEach((v) => v.classList.toggle("is-on", v.dataset.vuePP === b.dataset.vue || v.dataset.vueP === b.dataset.vue));
    if (b.dataset.vue === "trafic") chargerTrafic();
    if (b.dataset.vue === "equipe") chargerEquipe();
    if (b.dataset.vue === "reglages") chargerReglages();
    if (b.dataset.vue === "devis") chargerCadreDevis();
  }));

  /* ---------- Devis (page devis.html affichée dans le tableau de bord) ---------- */
  let cadreDevisCharge = false;
  function chargerCadreDevis(id) {
    const f = $("#cadre-devis");
    if (id) { f.src = "devis.html?embed=1&d=" + encodeURIComponent(id); cadreDevisCharge = true; }
    else if (!cadreDevisCharge) { f.src = "devis.html?embed=1"; cadreDevisCharge = true; }
  }
  function ouvrirDevis(id) {
    const b = $('[data-vue="devis"]');
    if (!b.classList.contains("is-on")) { cadreDevisCharge = true; b.click(); }
    chargerCadreDevis(id);
    if (!id && !$("#cadre-devis").src) $("#cadre-devis").src = "devis.html?embed=1";
  }
  async function badgeDevis() {
    // Devis à valider + clients à rappeler (relance J+14)
    const { count } = await sb.from("devis").select("id", { count: "exact", head: true }).or("statut.eq.brouillon,and(statut.eq.envoye,a_appeler.eq.true)");
    $('[data-badge="devis"]').textContent = count || "";
  }
  addEventListener("message", (e) => { if (e.origin === location.origin && e.data?.type === "devis-maj") { badgeDevis(); chargerDemandes(); } });
  $$("[data-rafraichir]").forEach((b) => b.addEventListener("click", () => toutCharger().then(() => toast("À jour"))));

  async function toutCharger() { await Promise.all([chargerDemandes(), chargerPros(), chargerProduits(), chargerPartenaires(), badgeDevis()]); }

  /* ---------- Panneau ---------- */
  const panneau = $("#panneau");
  const ouvrirPanneau = (html) => { $("#panneau-corps").innerHTML = html; panneau.hidden = false; document.body.style.overflow = "hidden"; };
  const fermerPanneau = () => { panneau.hidden = true; document.body.style.overflow = ""; };
  $$("[data-fermer-panneau]").forEach((b) => b.addEventListener("click", fermerPanneau));
  addEventListener("keydown", (e) => e.key === "Escape" && !panneau.hidden && fermerPanneau());

  /* =========================================================
     DEMANDES
     ========================================================= */
  async function chargerDemandes() {
    const { data, error } = await sb.from("demandes").select("*").order("created_at", { ascending: false }).limit(800);
    if (error) return toast("Erreur : " + error.message);
    D.demandes = data || []; rendreDemandes();
  }
  const ordrePrio = { haute: 0, moyenne: 1, basse: 2 };
  function rendreDemandes() {
    const l = D.demandes;
    const nouv = l.filter((d) => A_TRAITER.includes(d.statut));
    const urg = nouv.filter((d) => d.priorite === "haute");
    const debMois = new Date(); debMois.setDate(1); debMois.setHours(0, 0, 0, 0);
    const mois = l.filter((d) => new Date(d.created_at) >= debMois);
    const gagnes = mois.filter((d) => d.statut === "gagne").length;
    $("#kpis-demandes").innerHTML = [["Nouvelles", nouv.length, "à traiter"], ["Au plus vite", urg.length, "nouvelles urgentes", "rouge"], ["Ce mois-ci", mois.length, "demandes reçues"], ["Gagnées ce mois", gagnes, mois.length ? Math.round((gagnes / mois.length) * 100) + " % de transformation" : "—", "vert"]]
      .map(([t, n, s, c]) => `<div class="kpi ${c ? "kpi--" + c : ""}"><span>${t}</span><b>${n}</b><small>${s}</small></div>`).join("");
    $('[data-badge="demandes"]').textContent = nouv.length || "";
    const q = $("#f-recherche").value.toLowerCase(), st = $("#f-statut").value, ty = $("#f-type").value, tri = $("#f-tri").value;
    let f = l.filter((d) => (st === "actives" ? [...A_TRAITER, "en_cours"].includes(d.statut) : !st || d.statut === st) && (!ty || d.type === ty)
      && (!q || JSON.stringify(d.contact || {}).toLowerCase().includes(q) || (d.message || "").toLowerCase().includes(q)));
    f.sort(tri === "date" ? (a, b) => new Date(b.created_at) - new Date(a.created_at)
      : tri === "score" ? (a, b) => (b.score || 0) - (a.score || 0)
      : (a, b) => (ordrePrio[a.priorite] ?? 3) - (ordrePrio[b.priorite] ?? 3) || new Date(b.created_at) - new Date(a.created_at));
    $("#liste-demandes").innerHTML = f.length ? f.map((d) => { const c = d.contact || {}; return `<tr data-id="${d.id}" class="${A_TRAITER.includes(d.statut) ? "is-nouveau" : ""}">
      <td><span class="prio prio--${d.priorite || "basse"}">${PRIO[d.priorite] || "—"}</span></td>
      <td title="${date(d.created_at)}">${depuis(d.created_at)}</td>
      <td><b>${esc(c.nom || c.entreprise || "Sans nom")}</b><br><small>${esc(c.telephone || c.email || "")}</small></td>
      <td><span class="tag">${TYPES[d.type] || esc(d.type)}</span></td>
      <td>${esc(c.commune || "")}</td>
      <td>${d.score != null ? `<span class="score" style="--s:${d.score}">${d.score}</span>` : ""}</td>
      <td><span class="statut statut--${d.statut}">${d.type === "compte-pro" && d.statut === "gagne" ? "Compte validé" : d.type === "compte-pro" && d.statut === "perdu" ? "Compte refusé" : STATUTS[d.statut]}</span></td></tr>`; }).join("")
      : `<tr><td colspan="7" class="vide">Aucune demande pour ces filtres.</td></tr>`;
  }
  ["#f-recherche", "#f-statut", "#f-type", "#f-tri"].forEach((s) => $(s).addEventListener("input", rendreDemandes));
  const telWa = (t) => { let n = String(t || "").replace(/\D/g, ""); if (n.startsWith("0")) n = "590" + n.slice(1); return n; };
  $("#liste-demandes").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return;
    const d = D.demandes.find((x) => x.id === tr.dataset.id); if (!d) return;
    const c = d.contact || {};
    const lignes = Object.entries(c).filter(([, v]) => v).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
    const reps = d.reponses ? Object.entries(d.reponses).filter(([, v]) => v).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("") : "";
    const panier = Array.isArray(d.panier) && d.panier.length ? `<h3>Produits demandés</h3><ul class="panier">${d.panier.map((p) => `<li><b>${esc(p.q)} ×</b> ${esc(p.nom)}</li>`).join("")}</ul>` : "";
    ouvrirPanneau(`<span class="prio prio--${d.priorite}">${PRIO[d.priorite] || ""}</span>
      <h2 id="panneau-titre">${esc(c.nom || c.entreprise || "Demande")}</h2>
      <p class="sous">${TYPES[d.type] || d.type} · reçue le ${date(d.created_at)}${d.page ? " depuis " + esc(d.page) : ""}</p>
      <div class="actions">${c.telephone ? `<a class="b b--jaune" href="tel:${esc(c.telephone.replace(/\s/g, ""))}">Appeler</a><a class="b" href="https://wa.me/${telWa(c.telephone)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${c.email ? `<a class="b" href="mailto:${esc(c.email)}">E-mail</a>` : ""}</div>
      <div class="actions" id="d-devis"></div>
      <label class="champ">Statut<select id="d-statut">${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${k === d.statut ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <table class="infos">${lignes}${reps}</table>
      ${panier}
      ${d.message ? `<h3>Message</h3><p class="message">${esc(d.message).replace(/\n/g, "<br>")}</p>` : ""}
      <label class="champ">Note interne<textarea id="d-note" rows="4" placeholder="Rappelé le…, devis n°…">${esc(d.note || "")}</textarea></label>
      <div class="actions"><button class="b b--jaune" id="d-enregistrer">Enregistrer</button>${moi.role === "patron" ? '<button class="b b--danger" id="d-supprimer">Supprimer</button>' : ""}</div>
      ${d.traite_par ? `<p class="sous">Dernière modification par ${esc(d.traite_par)}</p>` : ""}`);
    // Lien vers le devis de cette demande (ou bouton pour le préparer)
    (async () => {
      const zone = $("#d-devis"); if (!zone) return;
      const { data: dv } = await sb.from("devis").select("id,statut,total_ttc,numero").eq("demande_id", d.id).order("created_at", { ascending: false }).limit(1);
      const x = dv && dv[0];
      const montant = (n) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
      if (x) zone.innerHTML = `<button class="b b--vert" type="button" data-voir-devis="${x.id}">${x.statut === "brouillon" ? "Relire et valider le devis" : "Voir le devis " + esc(x.numero || "")} (${montant(x.total_ttc)})</button>`;
      else if (d.type !== "compte-pro") zone.innerHTML = `<button class="b" type="button" data-preparer-devis>Préparer un devis pour cette demande</button>`;
      zone.querySelector("[data-voir-devis]")?.addEventListener("click", (e) => { fermerPanneau(); ouvrirDevis(e.currentTarget.dataset.voirDevis); });
      zone.querySelector("[data-preparer-devis]")?.addEventListener("click", async (e) => {
        e.currentTarget.disabled = true; e.currentTarget.textContent = "Préparation du devis…";
        const { data: r, error } = await sb.functions.invoke("devis", { body: { action: "generer", demande_id: d.id } });
        if (error || !r?.devis_id) { toast("Devis non créé : " + (r?.ignore || r?.erreur || error?.message || "erreur")); e.currentTarget.disabled = false; return; }
        fermerPanneau(); badgeDevis(); ouvrirDevis(r.devis_id);
      });
    })();
    $("#d-enregistrer").addEventListener("click", async () => {
      const maj = { statut: $("#d-statut").value, note: $("#d-note").value, traite_par: moi.email, updated_at: new Date().toISOString() };
      const { error } = await sb.from("demandes").update(maj).eq("id", d.id);
      if (error) return toast("Erreur : " + error.message);
      Object.assign(d, maj); rendreDemandes(); fermerPanneau(); toast("Demande mise à jour");
    });
    const sup = $("#d-supprimer"); sup && sup.addEventListener("click", async () => {
      if (!confirm("Supprimer définitivement cette demande ?")) return;
      const { error } = await sb.from("demandes").delete().eq("id", d.id);
      if (error) return toast("Erreur : " + error.message);
      D.demandes = D.demandes.filter((x) => x.id !== d.id); rendreDemandes(); fermerPanneau(); toast("Demande supprimée");
    });
  });

  /* =========================================================
     COMPTES PRO
     ========================================================= */
  const appelEquipe = async (corps) => {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(C.supabase.url + "/functions/v1/equipe", { method: "POST", headers: { "Content-Type": "application/json", apikey: C.supabase.anonKey, Authorization: "Bearer " + session.access_token }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erreur || "Erreur " + r.status); return j;
  };
  async function chargerPros() {
    const { data, error } = await sb.from("comptes_pro").select("*").order("created_at", { ascending: false });
    if (error) return toast("Erreur : " + error.message);
    D.pros = data || []; rendrePros();
  }
  let filtrePros = null;
  function rendrePros() {
    const ordre = { en_attente: 0, valide: 1, refuse: 2 };
    const tous = [...D.pros].sort((a, b) => ordre[a.statut] - ordre[b.statut] || new Date(b.created_at) - new Date(a.created_at));
    const nb = (s) => tous.filter((p) => p.statut === s).length;
    const att = nb("en_attente");
    $('[data-badge="pros"]').textContent = att || "";
    if (filtrePros === null) filtrePros = att ? "en_attente" : "";
    const onglets = [["en_attente", "À valider", att], ["valide", "Validés", nb("valide")], ["refuse", "Refusés", nb("refuse")], ["", "Tous", tous.length]];
    $("#pros-onglets").innerHTML = onglets.map(([k, t, n]) => `<button type="button" data-fp="${k}" class="${k === filtrePros ? "is-on" : ""}">${t} <b>${n}</b></button>`).join("");
    const q = ($("#pros-recherche").value || "").toLowerCase();
    const l = tous.filter((p) => (!filtrePros || p.statut === filtrePros) && (!q || `${p.entreprise} ${p.siren} ${p.nom} ${p.email} ${p.telephone} ${p.metier}`.toLowerCase().includes(q)));
    $("#liste-pros").innerHTML = l.length ? `<div class="tableau"><table class="pros"><thead><tr><th>Entreprise</th><th>Contact</th><th>Registre</th><th>Reçu</th><th>Statut</th><th></th></tr></thead><tbody>${l.map((p) => { const v = p.verification || {}; const ok = v.registre === "entreprise active"; return `<tr class="pro-ligne pro-ligne--${p.statut}" data-id="${p.id}">
      <td><b>${esc(p.entreprise || "Entreprise " + p.siren)}</b><br><small>SIREN ${esc(p.siren)}${p.metier ? " · " + esc(p.metier) : ""}</small></td>
      <td>${esc(p.nom || "")}<br><small><a href="tel:${esc((p.telephone || "").replace(/\s/g, ""))}">${esc(p.telephone || "")}</a> · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></small></td>
      <td><span class="pastille ${ok ? "pastille--ok" : "pastille--att"}" title="${ok ? "Active au registre national" : "Registre non vérifié"}${v.naf ? " · NAF " + esc(v.naf) : ""}">${ok ? "✓ Active" : "⚠ À contrôler"}</span></td>
      <td title="${date(p.created_at)}">${depuis(p.created_at)}</td>
      <td><span class="statut statut--${p.statut}">${{ en_attente: "À valider", valide: "Validé", refuse: "Refusé" }[p.statut]}</span></td>
      <td class="pro-actions">${p.kbis_path ? `<button class="b b--petit" data-kbis="${p.id}">Kbis</button>` : '<span class="sous" title="Pas de Kbis joint">Sans Kbis</span>'}${p.statut !== "valide" ? `<button class="b b--petit b--vert" data-decision="valide" data-id="${p.id}">Valider</button>` : ""}${p.statut !== "refuse" ? `<button class="b b--petit b--danger" data-decision="refuse" data-id="${p.id}" title="Refuser">${p.statut === "valide" ? "Révoquer" : "Refuser"}</button>` : ""}${moi.role === "patron" ? `<button class="b b--petit" data-suppr-pro="${p.id}" title="Effacer définitivement ce compte, son Kbis et sa demande (droit à l'effacement)">🗑</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>`
      : `<p class="vide">${q ? "Aucun compte ne correspond." : filtrePros === "en_attente" ? "Aucun compte à valider. Tout est à jour." : "Aucun compte pro pour le moment."}</p>`;
  }
  $("#pros-onglets").addEventListener("click", (e) => { const b = e.target.closest("[data-fp]"); if (!b) return; filtrePros = b.dataset.fp; rendrePros(); });
  $("#pros-recherche").addEventListener("input", rendrePros);
  $("#liste-pros").addEventListener("click", async (e) => {
    const k = e.target.closest("[data-kbis]");
    if (k) { try { const j = await appelEquipe({ action: "kbis_url", id: k.dataset.kbis }); window.open(j.url, "_blank", "noopener"); } catch (er) { toast(er.message); } return; }
    const sp = e.target.closest("[data-suppr-pro]");
    if (sp) {
      if (!confirm("Effacer définitivement ce compte, son Kbis et la demande liée ? À utiliser notamment quand la personne demande la suppression de ses données.")) return;
      try { await appelEquipe({ action: "supprimer_pro", id: sp.dataset.supprPro }); toast("Compte effacé"); await Promise.all([chargerPros(), chargerDemandes()]); } catch (er) { toast(er.message); }
      return;
    }
    const b = e.target.closest("[data-decision]"); if (!b) return;
    const valide = b.dataset.decision === "valide";
    if (!confirm(valide ? "Valider ce compte ? Le pro recevra un e-mail et verra ses tarifs." : "Refuser ce compte ? Le pro recevra un e-mail et ne verra plus les tarifs.")) return;
    b.disabled = true;
    try { const j = await appelEquipe({ action: "decision_pro", id: b.dataset.id, decision: b.dataset.decision }); toast(valide ? "Compte validé" + (j.email && j.email.ok ? ", e-mail envoyé" : " (e-mail non envoyé : vérifier Resend)") : "Compte refusé"); await Promise.all([chargerPros(), chargerDemandes()]); }
    catch (er) { toast(er.message); b.disabled = false; }
  });

  /* =========================================================
     CATALOGUE
     ========================================================= */
  // Catégories : lues dans la base (modifiables), avec la liste d'origine en secours
  D.cats = Object.entries(CATS).map(([id, nom], k) => ({ id, nom, ordre: k + 1 }));
  const optionsCats = (sel) => D.cats.map((c) => `<option value="${esc(c.id)}" ${c.id === sel ? "selected" : ""}>${esc(c.nom)}</option>`).join("");
  function majSelectCats() { const s = $("#p-cat"), v = s.value; s.innerHTML = '<option value="">Toutes les catégories</option>' + optionsCats(v); }
  async function chargerCategories() {
    const { data } = await sb.from("categories").select("*").order("ordre");
    if (data && data.length) { D.cats = data; CATS = Object.fromEntries(data.map((c) => [c.id, c.nom])); }
    majSelectCats();
  }
  const DISPO = { stock: "En stock", commande: "Sur commande" };
  const dispoDe = (p) => (D.prive[p.id] || {}).dispo || (p.stock === false ? "commande" : "stock");
  D.prive = {}; D.sel = new Set(); D.replies = new Set();
  async function chargerProduits() {
    const [r, rp] = await Promise.all([sb.from("produits").select("*, tarifs(prix)").order("ordre"), sb.from("produits_prive").select("*"), chargerCategories()]);
    if (r.error) return toast("Erreur : " + r.error.message);
    D.produits = (r.data || []).map((p) => ({ ...p, prix: p.tarifs ? (Array.isArray(p.tarifs) ? (p.tarifs[0] || {}).prix : p.tarifs.prix) : null }));
    D.prive = Object.fromEntries((rp.data || []).map((x) => [x.produit_id, x]));
    D.sel.forEach((id) => { if (!D.produits.some((p) => p.id === id)) D.sel.delete(id); });
    rendreProduits();
  }
  const ligneProduit = (p) => { const pv = D.prive[p.id] || {}; return `<tr data-id="${esc(p.id)}" class="${p.actif ? "" : "is-masque"} ${D.sel.has(p.id) ? "is-sel" : ""}">
      <td class="sel-cel"><input type="checkbox" data-sel ${D.sel.has(p.id) ? "checked" : ""} aria-label="Sélectionner ${esc(p.nom)}"></td>
      <td class="produit-cel"><label class="vignette" title="Changer la photo">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ""}<span class="vignette__plus" aria-hidden="true">+</span><input type="file" accept="image/*" class="sr" data-photo-rapide aria-label="Changer la photo de ${esc(p.nom)}"></label><span><b>${esc(p.nom)}</b><br><small>${esc(p.marque || "")} ${esc(p.ref || "")}</small>${pv.note ? `<br><small class="note-int" title="Note interne">✎ ${esc(pv.note)}</small>` : ""}</span></td>
      <td><input class="prix-in" type="number" min="0" step="0.01" value="${p.prix ?? ""}" placeholder="Sur devis" aria-label="Prix pro HT"></td>
      <td><select class="dispo-in dispo--${dispoDe(p)}" data-dispo aria-label="Disponibilité affichée sur le site">${Object.entries(DISPO).map(([k, v]) => `<option value="${k}" ${dispoDe(p) === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
      
      <td><label class="inter inter--petit"><input type="checkbox" data-champ="actif" ${p.actif ? "checked" : ""}><span></span></label></td>
      <td><button class="b b--petit" data-editer>Modifier</button></td></tr>`; };
  function rendreProduits() {
    const q = $("#p-recherche").value.toLowerCase(), c = $("#p-cat").value, v = $("#p-visible").value;
    const l = D.produits.filter((p) => (!c || p.cat === c) && (!v || (v === "oui" ? p.actif : !p.actif)) && (!q || `${p.nom} ${p.ref} ${p.marque} ${p.ref_dolibarr || ""} ${(D.prive[p.id] || {}).note || ""}`.toLowerCase().includes(q)));
    const nbV = D.produits.filter((p) => p.actif).length;
    $("#p-compte").textContent = `${l.length} produit${l.length > 1 ? "s" : ""} affiché${l.length > 1 ? "s" : ""} · ${nbV} visibles sur le site, ${D.produits.length - nbV} masqués.`;
    const range = (x) => rangerProduits(x);
    const groupes = D.cats.map((cat) => ({ cat, l: cat.id === "kits" ? l.filter((p) => p.cat === cat.id) : range(l.filter((p) => p.cat === cat.id)) })).filter((g) => g.l.length);
    const orphelins = l.filter((p) => !D.cats.some((x) => x.id === p.cat)); if (orphelins.length) groupes.push({ cat: { id: "_", nom: "Sans catégorie" }, l: orphelins });
    const ferme = (id) => D.replies.has(id) && !q;
    $("#liste-produits").innerHTML = groupes.map((g) => { const tous = g.l.every((p) => D.sel.has(p.id)); return `<tr class="groupe ${ferme(g.cat.id) ? "is-ferme" : ""}" data-groupe="${esc(g.cat.id)}"><td class="sel-cel"><input type="checkbox" data-sel-groupe ${tous ? "checked" : ""} aria-label="Tout sélectionner dans ${esc(g.cat.nom)}"></td><td colspan="5"><button type="button" class="groupe__btn" data-replier><span class="groupe__chev" aria-hidden="true">▾</span>${esc(g.cat.nom)} <span class="groupe__n">${g.l.length}</span></button></td></tr>${ferme(g.cat.id) ? "" : g.l.map(ligneProduit).join("")}`; }).join("") || `<tr><td colspan="6" class="vide">Aucun produit.</td></tr>`;
    majSelection();
  }
  function majSelection() {
    const n = D.sel.size, barre = $("#p-lot");
    barre.hidden = !n; $("#p-lot-n").textContent = `${n} produit${n > 1 ? "s" : ""} sélectionné${n > 1 ? "s" : ""}`;
    $("#p-lot-cat").innerHTML = '<option value="">Changer de catégorie…</option>' + optionsCats("");
    $("#p-lot-suppr").hidden = moi.role !== "patron";
  }
  ["#p-recherche", "#p-cat", "#p-visible"].forEach((s) => $(s).addEventListener("input", rendreProduits));
  $("#liste-produits").addEventListener("change", async (e) => {
    if (e.target.matches("[data-sel-groupe]")) {
      const g = e.target.closest("tr").dataset.groupe, ids = $$(`#liste-produits tr[data-id]`).filter((tr) => (D.produits.find((p) => p.id === tr.dataset.id) || {}).cat === g || (g === "_" && !D.cats.some((c) => c.id === (D.produits.find((p) => p.id === tr.dataset.id) || {}).cat))).map((tr) => tr.dataset.id);
      ids.forEach((id) => (e.target.checked ? D.sel.add(id) : D.sel.delete(id))); rendreProduits(); return;
    }
    const tr = e.target.closest("tr[data-id]"); if (!tr) return; const p = D.produits.find((x) => x.id === tr.dataset.id);
    if (e.target.matches("[data-sel]")) { e.target.checked ? D.sel.add(p.id) : D.sel.delete(p.id); tr.classList.toggle("is-sel", e.target.checked); majSelection(); return; }
    if (e.target.matches("[data-dispo]")) {
      const v = e.target.value === "commande" ? "commande" : "stock", pv = D.prive[p.id] || {};
      const r1 = await sb.from("produits").update({ stock: v === "stock", updated_at: new Date().toISOString() }).eq("id", p.id);
      if (r1.error) return toast("Erreur : " + r1.error.message);
      const r2 = await sb.from("produits_prive").upsert({ produit_id: p.id, dispo: v, note: pv.note || null, updated_at: new Date().toISOString(), updated_by: moi.email });
      if (r2.error) return toast("Erreur : " + r2.error.message);
      p.stock = v === "stock"; D.prive[p.id] = { ...pv, produit_id: p.id, dispo: v }; e.target.className = `dispo-in dispo--${v}`;
      toast(v === "stock" ? "Affiché « En stock » sur le site" : "Affiché « Sur commande » sur le site"); return;
    }
    if (e.target.matches("[data-photo-rapide]")) {
      const f = e.target.files[0]; if (!f) return; const v = $(".vignette", tr); v.classList.add("is-envoi");
      try {
        const url = await envoyerPhoto(f, p.id);
        const { error } = await sb.from("produits").update({ img: url, updated_at: new Date().toISOString() }).eq("id", p.id);
        if (error) throw new Error(error.message);
        p.img = url; v.querySelector("img") ? (v.querySelector("img").src = url) : v.insertAdjacentHTML("afterbegin", `<img src="${url}" alt="">`); toast("Photo mise à jour");
      } catch (er) { toast(er.message); }
      v.classList.remove("is-envoi"); return;
    }
    if (e.target.classList.contains("prix-in")) {
      const v = e.target.value === "" ? null : +e.target.value;
      const { error } = v == null ? await sb.from("tarifs").delete().eq("produit_id", p.id) : await sb.from("tarifs").upsert({ produit_id: p.id, prix: v, updated_at: new Date().toISOString() });
      if (error) return toast("Erreur : " + error.message); p.prix = v; toast("Prix enregistré");
    } else if (e.target.dataset.champ) {
      const ch = e.target.dataset.champ, v = e.target.checked;
      const { error } = await sb.from("produits").update({ [ch]: v, updated_at: new Date().toISOString() }).eq("id", p.id);
      if (error) return toast("Erreur : " + error.message); p[ch] = v; tr.classList.toggle("is-masque", !p.actif); toast("Enregistré");
    }
  });
  const formProduit = (p = {}) => `<h2 id="panneau-titre">${p.id ? "Modifier le produit" : "Nouveau produit"}</h2>
    <form id="form-produit" class="formulaire">
      <label class="champ">Nom affiché<input name="nom" required value="${esc(p.nom || "")}" placeholder="Batterie lithium 4,8 kWh"></label>
      <div class="ligne"><label class="champ">Marque<input name="marque" value="${esc(p.marque || "")}"></label><label class="champ">Référence<input name="ref" value="${esc(p.ref || "")}"></label></div>
      <div class="ligne"><label class="champ">Catégorie<select name="cat">${optionsCats(p.cat)}</select></label><label class="champ">Prix pro HT (€)<input name="prix" type="number" step="0.01" min="0" value="${p.prix ?? ""}" placeholder="Vide = sur devis"></label></div>
      <div class="champ">Photo
        <label class="photo-zone" id="photo-zone">
          <span class="photo-zone__apercu" id="photo-apercu">${p.img ? `<img src="${esc(p.img)}" alt="">` : ""}</span>
          <span class="photo-zone__txt"><b>${p.img ? "Changer la photo" : "Ajouter une photo"}</b><small>Glissez une image ici ou cliquez. Elle est allégée automatiquement.</small></span>
          <input type="file" id="photo-fichier" accept="image/*" class="sr">
        </label>
        <details class="photo-url"><summary>Ou coller l'adresse d'une image</summary><input name="img" value="${esc(p.img || "")}" placeholder="https://…"></details>
      </div>
      <label class="champ">Description <span class="aide-inline">(affichée sur la fiche produit)</span><textarea name="description" rows="4" placeholder="À quoi sert ce produit, pour qui, ses points forts…">${esc(p.description || "")}</textarea></label>
      <label class="champ">Caractéristiques <span class="aide-inline">(une par ligne, au format « Nom : valeur »)</span><textarea name="caracteristiques" rows="5" placeholder="Puissance : 500 Wc&#10;Dimensions : 1 952 × 1 134 × 30 mm&#10;Garantie : 25 ans">${esc(caracVersTexte(p.caracteristiques))}</textarea></label>
      <div class="champ">Fiche technique (PDF)
        <div class="ligne"><input type="file" id="pdf-fichier" accept="application/pdf"><input name="fiche_technique" value="${esc(p.fiche_technique || "")}" placeholder="ou adresse d'un PDF en ligne"></div>
        ${p.fiche_technique ? `<a class="aide" href="${esc(p.fiche_technique)}" target="_blank" rel="noopener">Voir la fiche actuelle</a>` : ""}
      </div>
      <fieldset class="champ kit-champs" ${p.cat === "kits" ? "" : "hidden"}><legend>Kit</legend>
        <div class="ligne"><label class="champ">Type de kit<select name="kit_type">${[["isoles", "Site isolé"], ["reseau", "Raccordé réseau"], ["secours", "Pack Détresse Cyclone"]].map(([k, v]) => `<option value="${k}" ${(p.extra || {}).type === k ? "selected" : ""}>${v}</option>`).join("")}</select></label><label class="champ">Pour qui<input name="kit_pour" value="${esc((p.extra || {}).pour || "")}" placeholder="Maison secondaire, gîte…"></label></div>
        <label class="champ">Composition du kit<textarea name="kit_detail" rows="3" placeholder="6 panneaux 500 Wc, convertisseur Victron…">${esc((p.extra || {}).detail || "")}</textarea></label>
      </fieldset>
      <label class="champ">Disponibilité affichée sur le site<select name="dispo">${Object.entries(DISPO).map(([k, v]) => `<option value="${k}" ${dispoDe(p) === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <fieldset class="champ interne"><legend>Note interne <span class="aide-inline">(jamais affichée sur le site)</span></legend>
        <textarea name="note" rows="2" placeholder="Délai fournisseur, emplacement en réserve, client intéressé…">${esc((D.prive[p.id] || {}).note || "")}</textarea>
      </fieldset>
      <div class="ligne"><label class="inter"><input type="checkbox" name="actif" ${p.actif !== false ? "checked" : ""}><span></span>Visible sur le site</label></div>
      <div class="actions"><button class="b b--jaune" type="submit">Enregistrer</button>${p.id && moi.role === "patron" ? '<button class="b b--danger" type="button" id="p-supprimer">Supprimer</button>' : ""}</div>
    </form>`;
  /* Photos : compressées dans le navigateur (WebP, 1200 px max) puis envoyées dans le stockage « produits ». */
  // Recadre au plus près du produit (fond clair uni détecté dans les coins), avec une marge fixe :
  // tous les produits ont ainsi la même taille dans les vignettes du site.
  function rogner(cv) {
    const W = cv.width, H = cv.height, ctx = cv.getContext("2d"), d = ctx.getImageData(0, 0, W, H).data;
    const coins = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + W - 1) * 4];
    const fond = [0, 1, 2].map((k) => coins.reduce((s, i) => s + d[i + k], 0) / 4);
    if (Math.min(...fond) < 200) return { cv, rogne: false };
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (Math.abs(d[i] - fond[0]) + Math.abs(d[i + 1] - fond[1]) + Math.abs(d[i + 2] - fond[2]) > 18) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) return { cv, rogne: false };
    const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w * h > W * H * 0.9) return { cv, rogne: false };
    const c2 = document.createElement("canvas"); c2.width = w; c2.height = h;
    c2.getContext("2d").drawImage(cv, x0, y0, w, h, 0, 0, w, h);
    return { cv: c2, rogne: true };
  }
  async function compresser(fichier) {
    const img = await createImageBitmap(fichier);
    const max = 1200, r = Math.min(1, max / Math.max(img.width, img.height));
    const cv0 = document.createElement("canvas"); cv0.width = Math.round(img.width * r); cv0.height = Math.round(img.height * r);
    const ctx = cv0.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv0.width, cv0.height); ctx.drawImage(img, 0, 0, cv0.width, cv0.height);
    const { cv, rogne } = rogner(cv0);
    const blob = await new Promise((ok) => cv.toBlob(ok, "image/webp", 0.86));
    return blob && blob.type === "image/webp" ? { blob, ext: "webp", rogne } : { blob: await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.88)), ext: "jpg", rogne };
  }
  // Recadre en une fois les photos déjà en ligne (hébergées sur votre espace), kits exclus
  async function recadrerTout(bouton) {
    const base = sb.storage.from("produits").getPublicUrl("x").data.publicUrl.replace(/x$/, "");
    const liste = D.produits.filter((p) => p.cat !== "kits" && p.img && p.img.startsWith(base) && !/\.png$/i.test(p.img));
    if (!liste.length) return toast("Aucune photo à recadrer");
    if (!confirm(`Recadrer ${liste.length} photo(s) au plus près du produit ? Les produits apparaîtront tous à la même taille sur le site.`)) return;
    bouton.disabled = true; let n = 0, ok = 0;
    for (const p of liste) {
      n++; bouton.textContent = `Recadrage ${n}/${liste.length}…`;
      try {
        const r = await fetch(p.img, { cache: "no-store" }); if (!r.ok) continue;
        const c = await compresser(await r.blob()); if (!c.rogne) continue;
        const chemin = `${p.id}/${Date.now()}.${c.ext}`;
        const up = await sb.storage.from("produits").upload(chemin, c.blob, { contentType: c.blob.type, cacheControl: "31536000" }); if (up.error) continue;
        const url = sb.storage.from("produits").getPublicUrl(chemin).data.publicUrl;
        const { error } = await sb.from("produits").update({ img: url, updated_at: new Date().toISOString() }).eq("id", p.id);
        if (!error) { p.img = url; ok++; }
      } catch (e) { /* photo ignorée */ }
    }
    bouton.disabled = false; bouton.textContent = "Recadrer les photos";
    rendreProduits(); toast(`${ok} photo(s) recadrée(s)`);
  }
  async function envoyerPdf(fichier, idProduit) {
    if (!/pdf$/i.test(fichier.type) && !/\.pdf$/i.test(fichier.name)) throw new Error("La fiche technique doit être un PDF.");
    if (fichier.size > 10 * 1024 * 1024) throw new Error("PDF trop lourd (10 Mo maximum).");
    const chemin = `${idProduit}/fiche-${Date.now()}.pdf`;
    const { error } = await sb.storage.from("produits").upload(chemin, fichier, { contentType: "application/pdf", cacheControl: "31536000" });
    if (error) throw new Error("Envoi du PDF impossible : " + error.message);
    return sb.storage.from("produits").getPublicUrl(chemin).data.publicUrl;
  }
  const caracVersTexte = (c) => (Array.isArray(c) ? c.map((x) => (Array.isArray(x) ? x.join(" : ") : x)).join("\n") : "");
  const texteVersCarac = (t) => String(t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l]; });
  async function envoyerPhoto(fichier, idProduit) {
    if (!/^image\/(jpeg|png|webp|heic|heif|gif|avif)$/i.test(fichier.type) && !/\.(jpe?g|png|webp|heic|avif)$/i.test(fichier.name)) throw new Error("Choisissez une image (JPG, PNG, WebP).");
    const { blob, ext } = await compresser(fichier);
    const chemin = `${idProduit}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("produits").upload(chemin, blob, { contentType: blob.type, cacheControl: "31536000" });
    if (error) throw new Error("Envoi impossible : " + error.message);
    return sb.storage.from("produits").getPublicUrl(chemin).data.publicUrl;
  }
  const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  function editerProduit(p) {
    p = p || {};
    ouvrirPanneau(formProduit(p));
    const selCat = $("#form-produit [name=cat]"); selCat.addEventListener("change", () => ($(".kit-champs").hidden = selCat.value !== "kits"));
    let photo = null;
    const zone = $("#photo-zone"), inF = $("#photo-fichier"), apercu = $("#photo-apercu");
    const choisir = (f) => { if (!f) return; photo = f; apercu.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`; $(".photo-zone__txt b", zone).textContent = "Photo prête : " + f.name; };
    inF.addEventListener("change", () => choisir(inF.files[0]));
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("is-survol"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("is-survol"); }));
    zone.addEventListener("drop", (e) => choisir(e.dataTransfer.files[0]));
    $("#form-produit").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const id = p && p.id ? p.id : slug(f.get("marque") + " " + f.get("nom")) + "-" + Date.now().toString(36).slice(-3);
      const btn = $("button[type=submit]", e.target); btn.disabled = true; btn.textContent = photo ? "Envoi de la photo…" : "Enregistrement…";
      let img = f.get("img");
      let fiche = f.get("fiche_technique") || null; const pdf = $("#pdf-fichier").files[0];
      try {
        if (photo) img = await envoyerPhoto(photo, id);
        if (pdf) { btn.textContent = "Envoi du PDF…"; fiche = await envoyerPdf(pdf, id); }
      } catch (er) { btn.disabled = false; btn.textContent = "Enregistrer"; return toast(er.message); }
      const ligne = { id, nom: f.get("nom"), marque: f.get("marque"), ref: f.get("ref"), cat: f.get("cat"), img, stock: f.get("dispo") !== "commande", actif: !!f.get("actif"),
        description: f.get("description") || null, caracteristiques: texteVersCarac(f.get("caracteristiques")), fiche_technique: fiche, updated_at: new Date().toISOString() };
      if (ligne.cat === "kits") {
        const t = f.get("kit_type"); const ex = p.extra || {};
        ligne.extra = { ...ex, type: t, gamme: t === "secours" ? "Pack Détresse Cyclone" : null, nomCourt: t === "secours" ? (ex.nomCourt || ligne.nom.replace(/^Pack Détresse Cyclone\s*/i, "")) : ligne.nom, stockage: ligne.ref, detail: f.get("kit_detail") || "", pour: f.get("kit_pour") || "" };
      }
      if (!p.id) ligne.ordre = (Math.max(0, ...D.produits.map((x) => x.ordre || 0)) + 1);
      const { error } = await sb.from("produits").upsert(ligne); if (error) { btn.disabled = false; btn.textContent = "Enregistrer"; return toast("Erreur : " + error.message); }
      const prix = f.get("prix");
      const r2 = prix === "" ? await sb.from("tarifs").delete().eq("produit_id", id) : await sb.from("tarifs").upsert({ produit_id: id, prix: +prix });
      if (r2.error) return toast("Erreur prix : " + r2.error.message);
      const r3 = await sb.from("produits_prive").upsert({ produit_id: id, dispo: f.get("dispo") === "commande" ? "commande" : "stock", note: (f.get("note") || "").trim() || null, updated_at: new Date().toISOString(), updated_by: moi.email });
      if (r3.error) return toast("Erreur annotation : " + r3.error.message);
      fermerPanneau(); await chargerProduits(); toast("Produit enregistré");
    });
    const s = $("#p-supprimer"); s && s.addEventListener("click", async () => {
      if (!p.id) return;
      if (!confirm("Supprimer ce produit du catalogue ? (Vous pouvez aussi simplement le masquer.)")) return;
      const { error } = await sb.from("produits").delete().eq("id", p.id); if (error) return toast("Erreur : " + error.message);
      fermerPanneau(); await chargerProduits(); toast("Produit supprimé");
    });
  }
  $("#liste-produits").addEventListener("click", (e) => {
    const rp = e.target.closest("[data-replier]");
    if (rp) { const g = rp.closest("tr").dataset.groupe; D.replies.has(g) ? D.replies.delete(g) : D.replies.add(g); rendreProduits(); return; }
    if (!e.target.closest("[data-editer]")) return; const tr = e.target.closest("tr[data-id]"); editerProduit(D.produits.find((x) => x.id === tr.dataset.id)); });
  async function actionLot(maj, message) {
    const ids = [...D.sel]; if (!ids.length) return;
    const { error } = await sb.from("produits").update({ ...maj, updated_at: new Date().toISOString() }).in("id", ids);
    if (error) return toast("Erreur : " + error.message);
    await chargerProduits(); toast(message);
  }
  $("#p-lot").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-lot]"); if (!b) return; const n = D.sel.size;
    if (b.dataset.lot === "afficher") return actionLot({ actif: true }, `${n} produit(s) visibles sur le site`);
    if (b.dataset.lot === "masquer") return actionLot({ actif: false }, `${n} produit(s) masqués`);
    if (b.dataset.lot === "annuler") { D.sel.clear(); return rendreProduits(); }
    if (b.dataset.lot === "supprimer") {
      if (!confirm(`Supprimer définitivement ${n} produit(s) du catalogue ? Leurs prix et annotations seront aussi supprimés. (Pour les retirer du site sans les perdre, utilisez plutôt « Masquer ».)`)) return;
      const ids = [...D.sel];
      const { error } = await sb.from("produits").delete().in("id", ids);
      if (error) return toast("Erreur : " + error.message);
      D.sel.clear(); await chargerProduits(); toast(`${n} produit(s) supprimés`);
    }
  });
  $("#p-lot-cat").addEventListener("change", (e) => { const c = e.target.value; if (!c) return; actionLot({ cat: c }, `${D.sel.size} produit(s) déplacés dans « ${CATS[c]} »`); });

  /* ---------- Gestion des catégories ---------- */
  function gererCategories() {
    const nb = (id) => D.produits.filter((p) => p.cat === id).length;
    ouvrirPanneau(`<h2 id="panneau-titre">Catégories</h2>
      <p class="aide">Elles organisent le catalogue du site et ce tableau. Renommez-les, changez leur ordre, ajoutez-en ou supprimez-les.</p>
      <ul class="cats-liste">${D.cats.map((c, k) => `<li data-cat-id="${esc(c.id)}">
        <div class="cats-ordre"><button type="button" data-cat-monter ${k === 0 ? "disabled" : ""} aria-label="Monter">▲</button><button type="button" data-cat-descendre ${k === D.cats.length - 1 ? "disabled" : ""} aria-label="Descendre">▼</button></div>
        <div class="cats-champs"><input class="input" data-cat-nom value="${esc(c.nom)}" aria-label="Nom de la catégorie"><input class="input input--petit" data-cat-desc value="${esc(c.description || "")}" placeholder="Phrase affichée en haut de la catégorie sur le site" aria-label="Description"></div>
        <span class="tag" title="Produits dans cette catégorie">${nb(c.id)}</span>
        ${c.id === "kits" ? '<span class="sous" title="Catégorie utilisée par la page Kits du site">fixe</span>' : `<button type="button" class="b b--petit b--danger" data-cat-suppr aria-label="Supprimer ${esc(c.nom)}">🗑</button>`}
      </li>`).join("")}</ul>
      <form id="form-cat" class="ligne cats-ajout"><input class="input" name="nom" required placeholder="Nouvelle catégorie (ex. Bornes de recharge)"><button class="b b--jaune" type="submit">Ajouter</button></form>`);
    const liste = $(".cats-liste");
    liste.addEventListener("change", async (e) => {
      const li = e.target.closest("[data-cat-id]"); if (!li) return; const id = li.dataset.catId;
      const maj = e.target.matches("[data-cat-nom]") ? { nom: e.target.value.trim() } : e.target.matches("[data-cat-desc]") ? { description: e.target.value.trim() || null } : null;
      if (!maj || maj.nom === "") return toast("Le nom ne peut pas être vide");
      const { error } = await sb.from("categories").update(maj).eq("id", id); if (error) return toast("Erreur : " + error.message);
      await chargerCategories(); rendreProduits(); toast("Catégorie mise à jour");
    });
    liste.addEventListener("click", async (e) => {
      const li = e.target.closest("[data-cat-id]"); if (!li) return; const id = li.dataset.catId; const k = D.cats.findIndex((c) => c.id === id);
      if (e.target.closest("[data-cat-monter],[data-cat-descendre]")) {
        const j = e.target.closest("[data-cat-monter]") ? k - 1 : k + 1; if (j < 0 || j >= D.cats.length) return;
        const l = [...D.cats]; [l[k], l[j]] = [l[j], l[k]];
        await Promise.all(l.map((c, i) => sb.from("categories").update({ ordre: i + 1 }).eq("id", c.id)));
        await chargerCategories(); rendreProduits(); gererCategories(); return;
      }
      if (e.target.closest("[data-cat-suppr]")) {
        const n = nb(id), c = D.cats[k];
        if (n) {
          const autres = D.cats.filter((x) => x.id !== id);
          const choix = prompt(`« ${c.nom} » contient ${n} produit(s). Dans quelle catégorie les déplacer avant de la supprimer ?\n\n${autres.map((x, i) => `${i + 1}. ${x.nom}`).join("\n")}\n\nTapez le numéro :`);
          const cible = autres[(+choix || 0) - 1]; if (!cible) return toast("Suppression annulée");
          const { error } = await sb.from("produits").update({ cat: cible.id }).eq("cat", id); if (error) return toast("Erreur : " + error.message);
        } else if (!confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
        const { error } = await sb.from("categories").delete().eq("id", id); if (error) return toast("Erreur : " + error.message);
        await chargerProduits(); gererCategories(); toast("Catégorie supprimée");
      }
    });
    $("#form-cat").addEventListener("submit", async (e) => {
      e.preventDefault(); const nom = new FormData(e.target).get("nom").trim(); if (!nom) return;
      let id = slug(nom) || "categorie"; while (D.cats.some((c) => c.id === id)) id += "-2";
      const { error } = await sb.from("categories").insert({ id, nom, ordre: D.cats.length + 1 }); if (error) return toast("Erreur : " + error.message);
      await chargerCategories(); rendreProduits(); gererCategories(); toast("Catégorie ajoutée");
    });
  }
  /* ---------- Import de photos en masse ----------
     Les fichiers sont reconnus par leur nom : référence fabricant (ex. BAT512110710.png),
     référence affichée ou mots du nom du produit. Chaque correspondance reste modifiable. */
  const normal = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  const mots = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((m) => m.length > 1);
  function devinerProduit(nomFichier) {
    const base = nomFichier.replace(/\.[a-z0-9]+$/i, ""), n = normal(base);
    let meilleur = null, score = 0;
    D.produits.forEach((p) => {
      const cles = [p.ref_dolibarr, p.ref, p.id.replace(/^d-/, "")].map(normal).filter((c) => c.length >= 4);
      let s = 0;
      if (cles.some((c) => c === n)) s = 100;
      else if (cles.some((c) => n.includes(c) || (n.length >= 6 && c.includes(n)))) s = 90;
      else { const mf = mots(base), mp = new Set(mots(p.nom + " " + p.ref + " " + p.marque)); const com = mf.filter((m) => mp.has(m)).length; if (mf.length) s = Math.round((com / mf.length) * 70); }
      if (s > score) { score = s; meilleur = p; }
    });
    return score >= 45 ? { p: meilleur, score } : { p: null, score };
  }
  function importerPhotos() {
    const opts = (sel) => '<option value="">— Ignorer —</option>' + D.cats.map((c) => { const l = D.produits.filter((p) => p.cat === c.id); return l.length ? `<optgroup label="${esc(c.nom)}">${l.map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? "selected" : ""}>${esc(p.nom)}${p.img ? " ✓" : ""}</option>`).join("")}</optgroup>` : ""; }).join("");
    ouvrirPanneau(`<h2 id="panneau-titre">Importer des photos</h2>
      <p class="aide">Glissez plusieurs images d'un coup. Chaque fichier est rattaché automatiquement au bon produit grâce à son nom (idéalement la référence fabricant, par exemple <code>BAT512110710.png</code>). Vérifiez, corrigez si besoin, puis envoyez : les photos sont allégées et hébergées sur votre espace.</p>
      <label class="photo-zone" id="lot-zone"><span class="photo-zone__txt"><b>Choisir ou glisser des photos</b><small>JPG, PNG ou WebP, plusieurs à la fois. Les PNG détourés (fond transparent) donnent le meilleur rendu.</small></span><input type="file" id="lot-fichiers" accept="image/*" multiple class="sr"></label>
      <label class="inter" style="margin:10px 0"><input type="checkbox" id="lot-remplacer"><span></span>Remplacer les photos déjà présentes</label>
      <div id="lot-liste" class="lot-liste"></div>
      <div class="actions"><button class="b b--jaune" type="button" id="lot-envoyer" disabled>Envoyer les photos</button><span class="aide" id="lot-etat"></span></div>`);
    let fichiers = [];
    const rendre = () => {
      $("#lot-liste").innerHTML = fichiers.map((f, i) => `<div class="lot-ligne ${f.p ? "" : "is-vide"}" data-i="${i}"><img src="${f.url}" alt=""><div><b>${esc(f.file.name)}</b><small>${f.p ? (f.score >= 90 ? "Reconnu par la référence" : "Rapproché par le nom, à vérifier") : "Non reconnu, choisissez le produit"}</small></div><select data-lot-p>${opts(f.p ? f.p.id : "")}</select><span class="lot-statut">${f.etat || ""}</span></div>`).join("");
      const n = fichiers.filter((f) => f.p).length; $("#lot-envoyer").disabled = !n; $("#lot-envoyer").textContent = n ? `Envoyer ${n} photo${n > 1 ? "s" : ""}` : "Envoyer les photos";
    };
    const ajouter = (liste) => { [...liste].filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|avif)$/i.test(f.name)).forEach((file) => { const g = devinerProduit(file.name); fichiers.push({ file, url: URL.createObjectURL(file), p: g.p, score: g.score }); }); rendre(); };
    const zone = $("#lot-zone");
    $("#lot-fichiers").addEventListener("change", (e) => ajouter(e.target.files));
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("is-survol"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("is-survol"); }));
    zone.addEventListener("drop", (e) => ajouter(e.dataTransfer.files));
    $("#lot-liste").addEventListener("change", (e) => { if (!e.target.matches("[data-lot-p]")) return; const f = fichiers[+e.target.closest("[data-i]").dataset.i]; f.p = D.produits.find((p) => p.id === e.target.value) || null; f.score = 100; rendre(); });
    $("#lot-envoyer").addEventListener("click", async (e) => {
      const remplacer = $("#lot-remplacer").checked, aFaire = fichiers.filter((f) => f.p && !f.fait);
      e.target.disabled = true; let ok = 0, saut = 0, ko = 0;
      for (const [k, f] of aFaire.entries()) {
        $("#lot-etat").textContent = `Envoi ${k + 1} / ${aFaire.length}…`;
        if (f.p.img && !remplacer) { f.etat = "Déjà une photo, ignorée"; saut++; rendre(); continue; }
        try {
          const url = await envoyerPhoto(f.file, f.p.id);
          const { error } = await sb.from("produits").update({ img: url, updated_at: new Date().toISOString() }).eq("id", f.p.id);
          if (error) throw new Error(error.message);
          f.p.img = url; f.fait = true; f.etat = "✓ Envoyée"; ok++;
        } catch (er) { f.etat = "✗ " + er.message; ko++; }
        rendre();
      }
      $("#lot-etat").textContent = `${ok} photo(s) ajoutée(s)${saut ? `, ${saut} ignorée(s) (déjà une photo)` : ""}${ko ? `, ${ko} en erreur` : ""}.`;
      rendreProduits(); e.target.disabled = false;
    });
  }
  $("#btn-photos").addEventListener("click", importerPhotos);
  $("#btn-recadrer").addEventListener("click", (e) => recadrerTout(e.currentTarget));
  $("#btn-categories").addEventListener("click", gererCategories);
  $("#btn-nouveau-produit").addEventListener("click", () => editerProduit({ cat: $("#p-cat").value || "batteries", stock: true, actif: true }));

  /* =========================================================
     INSTALLATEURS PARTENAIRES
     ========================================================= */
  async function chargerPartenaires() {
    const { data, error } = await sb.from("partenaires").select("*").order("ordre").order("created_at");
    if (error) return toast("Erreur : " + error.message);
    D.partenaires = data || [];
    $("#liste-partenaires").innerHTML = D.partenaires.length ? D.partenaires.map((p, k) => `<article class="carte carte--part ${p.actif ? "" : "is-masque"}" data-id="${p.id}">
      <div class="ordre" aria-label="Position sur le site"><button type="button" data-monter="${p.id}" ${k === 0 ? "disabled" : ""} aria-label="Monter ${esc(p.nom)}">▲</button><span>${k + 1}</span><button type="button" data-descendre="${p.id}" ${k === D.partenaires.length - 1 ? "disabled" : ""} aria-label="Descendre ${esc(p.nom)}">▼</button></div>
      <div class="carte__tete"><div><h3>${esc(p.nom)} ${p.exemple ? '<span class="tag">Exemple, masqué du site</span>' : ""}${p.lien_cedyan ? ' <span class="tag">Société liée</span>' : ""}</h3><p class="sous">${esc(p.commune || "")} · ${esc((p.zones || []).join(", "))}</p></div>${p.rge ? '<span class="statut statut--valide">RGE</span>' : ""}</div>
      <p>${(p.specialites || []).map((s) => `<span class="tag">${esc(s)}</span>`).join(" ")}</p>
      <div class="actions"><button class="b b--petit" data-editer-part="${p.id}">Modifier</button>${p.actif ? "" : '<span class="sous">Masqué du site</span>'}</div></article>`).join("")
      : `<p class="vide">Aucun installateur. Ajoutez le premier.</p>`;
  }
  function editerPartenaire(p) {
    p = p || {};
    ouvrirPanneau(`<h2 id="panneau-titre">${p.id ? "Modifier l'installateur" : "Nouvel installateur"}</h2>
      <form id="form-part" class="formulaire">
        <label class="champ">Nom de l'entreprise<input name="nom" required value="${esc(p.nom || "")}"></label>
        <div class="ligne"><label class="champ">Commune<select name="commune">${COMMUNES.map((c) => `<option ${c === p.commune ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="champ">SIREN<input name="siren" value="${esc(p.siren || "")}" inputmode="numeric"></label></div>
        <div class="ligne"><label class="champ">Téléphone<input name="telephone" value="${esc(p.telephone || "")}"></label><label class="champ">E-mail<input name="email" type="email" value="${esc(p.email || "")}"></label></div>
        <fieldset class="champ"><legend>Zones d'intervention</legend><div class="cases">${ZONES.map((z) => `<label><input type="checkbox" name="zones" value="${z}" ${(p.zones || []).includes(z) ? "checked" : ""}> ${z}</label>`).join("")}</div></fieldset>
        <fieldset class="champ"><legend>Spécialités</legend><div class="cases">${SPECS.map((z) => `<label><input type="checkbox" name="specialites" value="${z}" ${(p.specialites || []).includes(z) ? "checked" : ""}> ${z}</label>`).join("")}</div></fieldset>
        <div class="ligne"><label class="inter"><input type="checkbox" name="rge" ${p.rge ? "checked" : ""}><span></span>Certifié RGE QualiPV</label><label class="inter"><input type="checkbox" name="actif" ${p.actif !== false ? "checked" : ""}><span></span>Visible sur le site</label><label class="inter"><input type="checkbox" name="exemple" ${p.exemple ? "checked" : ""}><span></span>Fiche d'exemple (jamais affichée sur le site)</label></div>
        <label class="inter"><input type="checkbox" name="lien_cedyan" ${p.lien_cedyan ? "checked" : ""}><span></span>Société liée à Cedyan Energy (participation au capital) : affiché sur sa fiche, obligatoire pour la transparence</label>
        <div class="actions"><button class="b b--jaune" type="submit">Enregistrer</button>${p.id ? '<button class="b b--danger" type="button" id="part-suppr">Supprimer</button>' : ""}</div>
      </form>`);
    $("#form-part").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const ligne = { nom: f.get("nom"), commune: f.get("commune"), siren: (f.get("siren") || "").replace(/\D/g, "") || null, telephone: f.get("telephone") || null, email: f.get("email") || null, zones: f.getAll("zones"), specialites: f.getAll("specialites"), rge: !!f.get("rge"), actif: !!f.get("actif"), exemple: !!f.get("exemple"), lien_cedyan: !!f.get("lien_cedyan") };
      if (!p.id) ligne.ordre = Math.max(0, ...D.partenaires.map((x) => x.ordre || 0)) + 1;
      const r = p.id ? await sb.from("partenaires").update(ligne).eq("id", p.id) : await sb.from("partenaires").insert(ligne);
      if (r.error) return toast("Erreur : " + r.error.message); fermerPanneau(); await chargerPartenaires(); toast("Installateur enregistré");
    });
    const s = $("#part-suppr"); s && s.addEventListener("click", async () => { if (!confirm("Supprimer cet installateur ?")) return; const r = await sb.from("partenaires").delete().eq("id", p.id); if (r.error) return toast("Erreur : " + r.error.message); fermerPanneau(); await chargerPartenaires(); });
  }
  $("#liste-partenaires").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-editer-part]"); if (b) return editerPartenaire(D.partenaires.find((x) => x.id === b.dataset.editerPart));
    const m = e.target.closest("[data-monter],[data-descendre]"); if (!m) return;
    const id = m.dataset.monter || m.dataset.descendre; const i = D.partenaires.findIndex((x) => x.id === id); const j = m.dataset.monter ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= D.partenaires.length) return;
    const l = [...D.partenaires]; [l[i], l[j]] = [l[j], l[i]];
    D.partenaires = l.map((x, k) => ({ ...x, ordre: k + 1 }));
    $$("#liste-partenaires button").forEach((x) => (x.disabled = true));
    const r = await Promise.all([D.partenaires[i], D.partenaires[j]].map((x) => sb.from("partenaires").update({ ordre: x.ordre }).eq("id", x.id)));
    const err = r.find((x) => x.error); if (err) toast("Erreur : " + err.error.message);
    else { // remet un ordre propre 1, 2, 3… pour toute la liste
      await Promise.all(D.partenaires.map((x) => sb.from("partenaires").update({ ordre: x.ordre }).eq("id", x.id)));
      toast("Ordre mis à jour sur le site");
    }
    chargerPartenaires();
  });
  $("#btn-nouveau-partenaire").addEventListener("click", () => editerPartenaire(null));

  /* =========================================================
     TRAFIC
     ========================================================= */
  async function chargerTrafic() {
    // Les dates sont comptées à l'heure de la Guadeloupe (UTC-4, sans heure d'été)
    const TZH = 4 * 3600e3, local = (d) => new Date(new Date(d).getTime() - TZH);
    const jourL = (d) => local(d).toISOString().slice(0, 10);
    const minuitUTC = (jour) => new Date(jour + "T04:00:00Z");
    const auj = jourL(new Date()), p = $("#t-periode").value;
    let deb, fin = new Date(minuitUTC(auj).getTime() + 864e5);
    if (p === "j0") deb = minuitUTC(auj);
    else if (p === "j1") { fin = minuitUTC(auj); deb = new Date(fin.getTime() - 864e5); }
    else if (p === "mois") deb = minuitUTC(auj.slice(0, 8) + "01");
    else if (p === "moisprec") { fin = minuitUTC(auj.slice(0, 8) + "01"); const d = local(new Date(fin.getTime() - 864e5)); deb = minuitUTC(d.toISOString().slice(0, 8) + "01"); }
    else deb = new Date(fin.getTime() - +p * 864e5);
    const duree = fin - deb, debPrec = new Date(deb.getTime() - duree);
    const [{ data: v }, { data: d }] = await Promise.all([
      sb.from("visites").select("created_at, page, ref, source, session, mobile").gte("created_at", debPrec.toISOString()).lt("created_at", fin.toISOString()).order("created_at").limit(50000),
      sb.from("demandes").select("created_at, utm, page").gte("created_at", debPrec.toISOString()).lt("created_at", fin.toISOString()),
    ]);
    const dans = (x) => new Date(x.created_at) >= deb;
    const visT = v || [], demT = d || [], vis = visT.filter(dans), visP = visT.filter((x) => !dans(x)), dem = demT.filter(dans), demP = demT.filter((x) => !dans(x));
    // Sessions : pages vues dans l'ordre, pour les rebonds, les pages d'arrivée et les parcours
    const sessionsDe = (l) => { const m = new Map(); l.forEach((x) => { if (!m.has(x.session)) m.set(x.session, []); m.get(x.session).push(x); }); return m; };
    const S = sessionsDe(vis), SP = sessionsDe(visP);
    const rebond = (m) => m.size ? Math.round([...m.values()].filter((l) => l.length === 1).length / m.size * 100) : 0;
    const tend = (a, b) => b ? Math.round((a - b) / b * 100) : null;
    const t = (a, b, inverse) => { const x = tend(a, b); if (x === null) return ""; const bon = inverse ? x <= 0 : x >= 0; return `<span class="tend ${bon ? "mont" : "desc"}">${x > 0 ? "↗ +" : x < 0 ? "↘ " : "= "}${x} %</span>`; };
    const pct = (a, b) => b ? (Math.round(a / b * 1000) / 10).toLocaleString("fr-FR") + " %" : "—";
    const mob = vis.length ? Math.round(vis.filter((x) => x.mobile).length / vis.length * 100) : 0;
    $("#t-compare").textContent = `Du ${local(deb).toLocaleDateString("fr-FR")} au ${local(new Date(fin.getTime() - 1)).toLocaleDateString("fr-FR")}. Les flèches comparent à la période précédente de même durée.`;
    $("#kpis-trafic").innerHTML = [
      ["Visiteurs", S.size, "visites distinctes", t(S.size, SP.size)],
      ["Pages vues", vis.length, `${S.size ? (Math.round(vis.length / S.size * 10) / 10).toLocaleString("fr-FR") : 0} page(s) par visite`, t(vis.length, visP.length)],
      ["Rebond", rebond(S) + " %", "repartis après 1 seule page", t(rebond(S), rebond(SP), true)],
      ["Demandes", dem.length, "devis, contacts, comptes pro…", t(dem.length, demP.length)],
      ["Transformation", pct(dem.length, S.size), "demandes / visiteurs", t(S.size ? dem.length / S.size : 0, SP.size ? demP.length / SP.size : 0), "vert"],
      ["Sur mobile", mob + " %", "des pages vues", ""],
    ].map(([n, val, s2, tr, c]) => `<div class="kpi ${c ? "kpi--" + c : ""}"><span>${n}</span><b>${val}</b><small>${s2}</small>${tr}</div>`).join("");
    // Graphe par jour (visiteurs + demandes)
    const parJour = {}; for (let x = new Date(deb); x < fin; x = new Date(x.getTime() + 864e5)) parJour[jourL(x)] = { s: new Set(), d: 0 };
    vis.forEach((x) => parJour[jourL(x.created_at)]?.s.add(x.session)); dem.forEach((x) => { const o = parJour[jourL(x.created_at)]; if (o) o.d++; });
    const ks = Object.keys(parJour), max = Math.max(1, ...ks.map((k) => parJour[k].s.size)), W = 900, H = 200, bw = W / Math.max(1, ks.length);
    const fmt = (k) => k.slice(5).split("-").reverse().join("/");
    $("#graphe").innerHTML = ks.length <= 1 ? `<p class="aide">Sur une seule journée : ${S.size} visiteur(s), ${dem.length} demande(s). Regardez le détail par heure ci-dessous.</p>` :
      `<svg viewBox="0 0 ${W} ${H + 26}" class="graphe" role="img" aria-label="Visiteurs par jour">${[.25, .5, .75, 1].map((f) => `<line x1="0" x2="${W}" y1="${H - f * H}" y2="${H - f * H}" stroke="#e3ebe4"/><text x="2" y="${H - f * H - 3}" class="axe">${Math.round(f * max)}</text>`).join("")}
      ${ks.map((k, i) => { const n = parJour[k].s.size, h = n / max * H; return `<g><rect x="${i * bw + 2}" y="${H - h}" width="${Math.max(2, bw - 4)}" height="${h}" rx="3" class="barre"><title>${fmt(k)} : ${n} visiteur(s), ${parJour[k].d} demande(s)</title></rect>${parJour[k].d ? `<circle cx="${i * bw + bw / 2}" cy="${H - h - 9}" r="5" class="point-dem"><title>${parJour[k].d} demande(s)</title></circle>` : ""}</g>`; }).join("")}
      <text x="0" y="${H + 20}" class="axe">${fmt(ks[0])}</text><text x="${W}" y="${H + 20}" text-anchor="end" class="axe">${fmt(ks[ks.length - 1])}</text></svg><p class="aide">Barres : visiteurs par jour (survolez une barre pour le détail). Points jaunes : jours avec des demandes.</p>`;
    // Canaux d'arrivée (par visite, d'après la 1re page)
    const canal = (x) => { const r = (x.ref || "").toLowerCase();
      if (x.source) return "Campagnes (liens suivis)"; if (!r) return "Accès direct (lien tapé, favori, appli)";
      if (/google|bing|yahoo|duckduckgo|qwant|ecosia/.test(r)) return "Moteurs de recherche (Google…)";
      if (/facebook|instagram|tiktok|linkedin|youtube|t\.co|twitter|x\.com|whatsapp|snapchat|pinterest/.test(r)) return "Réseaux sociaux";
      return "Autres sites (liens)"; };
    const entrees = [...S.values()].map((l) => l[0]);
    const barres = (sel, paires, total) => { $(sel).innerHTML = paires.map(([n, val]) => `<li><i style="width:${total ? Math.round(val / total * 100) : 0}%"></i><span>${esc(n)}</span><b>${val} · ${pct(val, total)}</b></li>`).join("") || "<li class='vide'>Pas encore de données.</li>"; };
    const compte = (arr) => Object.entries(arr.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]);
    barres("#t-canaux", compte(entrees.map(canal)), entrees.length);
    const detail = compte(entrees.filter((x) => x.ref || x.source).map((x) => x.source ? "Campagne : " + x.source : x.ref.replace(/^www\.|^m\.|^l\.|^lm\./, ""))).slice(0, 10);
    $("#top-sources").innerHTML = detail.map(([n, val]) => `<li><span>${esc(n)}</span><b>${val}</b></li>`).join("") || "<li class='vide'>Aucun site ni campagne sur la période.</li>";
    barres("#t-appareils", compte(entrees.map((x) => x.mobile ? "Téléphone" : "Ordinateur ou tablette")), entrees.length);
    // Heures et jours de la semaine (heure locale)
    const heures = Array(24).fill(0), jours = Array(7).fill(0);
    entrees.forEach((x) => { const l = local(x.created_at); heures[l.getUTCHours()]++; jours[(l.getUTCDay() + 6) % 7]++; });
    const mini = (sel, vals, lab) => { const m = Math.max(1, ...vals); $(sel).innerHTML = `<div class="mini-barres">${vals.map((n, i) => `<div title="${lab(i)} : ${n} visite(s)"><i style="height:${Math.round(n / m * 100)}%"></i><small>${i % (vals.length > 7 ? 3 : 1) === 0 ? lab(i) : ""}</small></div>`).join("")}</div>`; };
    mini("#t-heures", heures, (i) => i + "h"); mini("#t-jours", jours, (i) => ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"][i]);
    // Pages vues / visiteurs, pages d'arrivée / rebond
    const noms = { "/": "Accueil", "/index": "Accueil", "/catalogue": "Catalogue", "/produit": "Fiche produit", "/pack-cyclone": "Pack cyclone", "/pro": "Espace pro", "/installateurs": "Installateurs", "/contact": "Contact", "/qui-sommes-nous": "Qui sommes-nous", "/kits": "Kits solaires", "/sav": "SAV (QR code)", "/accepter": "Acceptation de devis" };
    const nomProduit = (id) => { const p = (D.produits || []).find((x) => x.id === id); return p ? [p.marque, p.nom].filter(Boolean).join(" ") : id; };
    const nom = (pg) => noms[pg] || (pg && pg.startsWith("/produit?id=") ? "Fiche : " + nomProduit(decodeURIComponent(pg.slice(12))) : pg);
    const parPage = {}; vis.forEach((x) => { const o = parPage[nom(x.page)] ||= { v: 0, s: new Set() }; o.v++; o.s.add(x.session); });
    $("#top-pages").innerHTML = Object.entries(parPage).sort((a, b) => b[1].v - a[1].v).slice(0, 12).map(([n, o]) => `<tr><td>${esc(n)}</td><td>${o.v}</td><td>${o.s.size}</td></tr>`).join("") || `<tr><td colspan="3" class="vide">Pas encore de données.</td></tr>`;
    const parEntree = {}; [...S.values()].forEach((l) => { const o = parEntree[nom(l[0].page)] ||= { n: 0, r: 0 }; o.n++; if (l.length === 1) o.r++; });
    $("#t-entrees").innerHTML = Object.entries(parEntree).sort((a, b) => b[1].n - a[1].n).slice(0, 10).map(([n, o]) => `<tr><td>${esc(n)}</td><td>${o.n}</td><td>${Math.round(o.r / o.n * 100)} %</td></tr>`).join("") || `<tr><td colspan="3" class="vide">Pas encore de données.</td></tr>`;
    // Derniers parcours (une demande dans les 2 h qui suivent la visite = visite convertie)
    const derniers = [...S.values()].sort((a, b) => new Date(b[0].created_at) - new Date(a[0].created_at)).slice(0, 15);
    $("#t-parcours").innerHTML = derniers.map((l) => { const d0 = new Date(l[0].created_at), d1 = new Date(l[l.length - 1].created_at);
      const conv = dem.some((x) => new Date(x.created_at) >= d0 && new Date(x.created_at) <= new Date(d1.getTime() + 2 * 3600e3));
      const min = Math.round((d1 - d0) / 60000);
      return `<li class="${conv ? "conv" : ""}"><span class="q">${conv ? "★ " : ""}${local(d0).toLocaleString("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${esc(canal(l[0]))}${l[0].ref ? " (" + esc(l[0].ref.replace(/^www\./, "")) + ")" : ""} · ${l[0].mobile ? "téléphone" : "ordinateur"} · ${l.length} page(s)${min ? ", " + min + " min" : ""}</span>
        <span class="ch">${l.slice(0, 12).map((x) => `<span>${esc(nom(x.page))}</span>`).join("<em>›</em>")}${l.length > 12 ? "<em>…</em>" : ""}</span></li>`; }).join("") || "<li class='vide'>Pas encore de visites sur la période.</li>";
  }
  $("#t-periode").addEventListener("change", chargerTrafic);

  /* =========================================================
     ÉQUIPE
     ========================================================= */
  async function chargerEquipe() {
    const { data } = await sb.from("staff").select("*").order("created_at");
    D.equipe = data || [];
    $("#liste-equipe").innerHTML = D.equipe.map((m) => `<li><span><b>${esc(m.nom || m.email)}</b><br><small>${esc(m.email)}</small></span><span class="tag">${m.role === "patron" ? "Patron" : "Employé"}</span>${moi.role === "patron" && m.email !== moi.email ? `<button class="b b--petit b--danger" data-retirer="${esc(m.email)}">Retirer</button>` : ""}</li>`).join("");
    $("#form-inviter").hidden = moi.role !== "patron";
  }
  $("#liste-equipe").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-retirer]"); if (!b || !confirm("Retirer l'accès de " + b.dataset.retirer + " ?")) return;
    const { error } = await sb.from("staff").delete().eq("email", b.dataset.retirer); if (error) return toast("Erreur : " + error.message); chargerEquipe();
  });
  $("#form-inviter").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const msg = $("#inviter-msg"); msg.textContent = "Envoi…";
    try { const j = await appelEquipe({ action: "inviter", email: f.get("email"), nom: f.get("nom"), role: f.get("role") }); msg.textContent = "Accès donné." + (j.email && j.email.ok ? " Un e-mail d'invitation est parti." : " (E-mail non envoyé : vérifier Resend.)"); e.target.reset(); chargerEquipe(); }
    catch (er) { msg.textContent = er.message; }
  });

  /* =========================================================
     RÉGLAGES
     ========================================================= */
  async function chargerReglages() {
    const { data } = await sb.from("reglages").select("*").eq("cle", "alerte_cyclone").maybeSingle();
    const v = (data && data.valeur) || {}; const f = $("#form-alerte");
    f.actif.checked = !!v.actif; f.niveau.value = v.niveau || "orange"; f.message.value = v.message || "";
  }
  $("#form-alerte").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target;
    const valeur = { actif: f.actif.checked, niveau: f.niveau.value, message: f.message.value || "Vigilance cyclonique : Packs Détresse Cyclone disponibles au comptoir" };
    const { error } = await sb.from("reglages").update({ valeur, updated_at: new Date().toISOString() }).eq("cle", "alerte_cyclone");
    $("#alerte-msg").textContent = error ? "Erreur : " + error.message : valeur.actif ? "Alerte activée : elle est visible sur le site." : "Alerte désactivée.";
  });
  $("#btn-test").addEventListener("click", async () => {
    const m = $("#test-msg"); m.textContent = "Envoi…";
    try { const j = await appelEquipe({ action: "test_alertes" });
      m.innerHTML = `E-mail : ${j.email.ok ? "✓ envoyé" : "✗ " + esc(j.email.raison || j.email.detail || "échec")}`;
    } catch (er) { m.textContent = er.message; }
  });

  demarrer();
})();
