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

  const STATUTS = { nouveau: "Nouveau", en_cours: "En cours", devis_envoye: "Devis envoyé", gagne: "Gagné", perdu: "Perdu" };
  const TYPES = { devis: "Devis", questionnaire: "Questionnaire", "pack-cyclone": "Pack cyclone", contact: "Contact", "compte-pro": "Compte pro" };
  const PRIO = { haute: "Au plus vite", moyenne: "D'ici 3 mois", basse: "Se renseigne" };
  const CATS = { kits: "Kits solaires", panneaux: "Panneaux", regulateurs: "Régulateurs", onduleurs: "Onduleurs", convertisseurs: "Convertisseurs", batteries: "Batteries", structures: "Fixations", cables: "Câbles", monitoring: "Monitoring", protections: "Protections" };
  const COMMUNES = ["Les Abymes", "Anse-Bertrand", "Baie-Mahault", "Baillif", "Basse-Terre", "Bouillante", "Capesterre-Belle-Eau", "Capesterre-de-Marie-Galante", "Deshaies", "La Désirade", "Gourbeyre", "Le Gosier", "Goyave", "Grand-Bourg", "Lamentin", "Morne-à-l'Eau", "Le Moule", "Petit-Bourg", "Petit-Canal", "Pointe-à-Pitre", "Pointe-Noire", "Port-Louis", "Saint-Claude", "Saint-François", "Saint-Louis", "Sainte-Anne", "Sainte-Rose", "Terre-de-Bas", "Terre-de-Haut", "Trois-Rivières", "Vieux-Fort", "Vieux-Habitants", "Martinique", "Saint-Martin", "Saint-Barthélemy"];
  const ZONES = ["Grande-Terre", "Basse-Terre", "Marie-Galante", "Les Saintes", "La Désirade", "Martinique", "Saint-Martin", "Saint-Barthélemy"];
  const SPECS = ["Raccordé réseau", "Site isolé", "Batteries", "Pack cyclone"];
  let moi = null, D = { demandes: [], pros: [], produits: [], partenaires: [], equipe: [] };

  /* ---------- Connexion ---------- */
  const montrer = (id) => ["ecran-connexion", "ecran-refus", "app"].forEach((x) => ($("#" + x).hidden = x !== id));
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault(); const em = $("#login-email").value.trim(); const msg = $("#login-msg");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = "Adresse e-mail invalide."; return; }
    msg.textContent = "Envoi…";
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname } });
    msg.textContent = error ? "Envoi impossible : " + error.message : "Lien envoyé. Ouvrez l'e-mail reçu sur " + em + " et cliquez dessus.";
  });
  $$("[data-deconnexion]").forEach((b) => b.addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); }));

  async function demarrer() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return montrer("ecran-connexion");
    const email = session.user.email.toLowerCase();
    const { data: m } = await sb.from("staff").select("email, nom, role").ilike("email", email).maybeSingle();
    if (!m) { $("#refus-txt").textContent = `${email} n'a pas accès au dashboard. Demandez au patron de vous ajouter à l'équipe.`; return montrer("ecran-refus"); }
    moi = m; $("#moi-nom").textContent = m.nom || m.email;
    montrer("app"); await toutCharger();
    setInterval(() => { if (!document.hidden) chargerDemandes(); }, 60000);
  }
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" && !moi) demarrer(); });

  /* ---------- Navigation ---------- */
  $$("[data-vue]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-vue]").forEach((x) => x.classList.toggle("is-on", x === b));
    $$("[data-vue-p]").forEach((v) => v.classList.toggle("is-on", v.dataset.vuePP === b.dataset.vue || v.dataset.vueP === b.dataset.vue));
    if (b.dataset.vue === "trafic") chargerTrafic();
    if (b.dataset.vue === "equipe") chargerEquipe();
    if (b.dataset.vue === "reglages") chargerReglages();
  }));
  $$("[data-rafraichir]").forEach((b) => b.addEventListener("click", () => toutCharger().then(() => toast("À jour"))));

  async function toutCharger() { await Promise.all([chargerDemandes(), chargerPros(), chargerProduits(), chargerPartenaires()]); }

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
    const nouv = l.filter((d) => d.statut === "nouveau");
    const urg = nouv.filter((d) => d.priorite === "haute");
    const debMois = new Date(); debMois.setDate(1); debMois.setHours(0, 0, 0, 0);
    const mois = l.filter((d) => new Date(d.created_at) >= debMois);
    const gagnes = mois.filter((d) => d.statut === "gagne").length;
    $("#kpis-demandes").innerHTML = [["Nouvelles", nouv.length, "à traiter"], ["Au plus vite", urg.length, "nouvelles urgentes", "rouge"], ["Ce mois-ci", mois.length, "demandes reçues"], ["Gagnées ce mois", gagnes, mois.length ? Math.round((gagnes / mois.length) * 100) + " % de transformation" : "—", "vert"]]
      .map(([t, n, s, c]) => `<div class="kpi ${c ? "kpi--" + c : ""}"><span>${t}</span><b>${n}</b><small>${s}</small></div>`).join("");
    $('[data-badge="demandes"]').textContent = nouv.length || "";
    const q = $("#f-recherche").value.toLowerCase(), st = $("#f-statut").value, ty = $("#f-type").value, tri = $("#f-tri").value;
    let f = l.filter((d) => (st === "actives" ? ["nouveau", "en_cours"].includes(d.statut) : !st || d.statut === st) && (!ty || d.type === ty)
      && (!q || JSON.stringify(d.contact || {}).toLowerCase().includes(q) || (d.message || "").toLowerCase().includes(q)));
    f.sort(tri === "date" ? (a, b) => new Date(b.created_at) - new Date(a.created_at)
      : tri === "score" ? (a, b) => (b.score || 0) - (a.score || 0)
      : (a, b) => (ordrePrio[a.priorite] ?? 3) - (ordrePrio[b.priorite] ?? 3) || new Date(b.created_at) - new Date(a.created_at));
    $("#liste-demandes").innerHTML = f.length ? f.map((d) => { const c = d.contact || {}; return `<tr data-id="${d.id}" class="${d.statut === "nouveau" ? "is-nouveau" : ""}">
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
      <label class="champ">Statut<select id="d-statut">${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${k === d.statut ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <table class="infos">${lignes}${reps}</table>
      ${panier}
      ${d.message ? `<h3>Message</h3><p class="message">${esc(d.message).replace(/\n/g, "<br>")}</p>` : ""}
      <label class="champ">Note interne<textarea id="d-note" rows="4" placeholder="Rappelé le…, devis n°…">${esc(d.note || "")}</textarea></label>
      <div class="actions"><button class="b b--jaune" id="d-enregistrer">Enregistrer</button>${moi.role === "patron" ? '<button class="b b--danger" id="d-supprimer">Supprimer</button>' : ""}</div>
      ${d.traite_par ? `<p class="sous">Dernière modification par ${esc(d.traite_par)}</p>` : ""}`);
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
  $("#p-cat").insertAdjacentHTML("beforeend", Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join(""));
  async function chargerProduits() {
    const { data, error } = await sb.from("produits").select("*, tarifs(prix)").order("ordre");
    if (error) return toast("Erreur : " + error.message);
    D.produits = (data || []).map((p) => ({ ...p, prix: p.tarifs ? (Array.isArray(p.tarifs) ? (p.tarifs[0] || {}).prix : p.tarifs.prix) : null }));
    rendreProduits();
  }
  function rendreProduits() {
    const q = $("#p-recherche").value.toLowerCase(), c = $("#p-cat").value;
    const l = D.produits.filter((p) => (!c || p.cat === c) && (!q || `${p.nom} ${p.ref} ${p.marque}`.toLowerCase().includes(q)));
    $("#liste-produits").innerHTML = l.map((p) => `<tr data-id="${esc(p.id)}" class="${p.actif ? "" : "is-masque"}">
      <td class="produit-cel"><label class="vignette" title="Changer la photo">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="vignette__plus" aria-hidden="true">+</span><input type="file" accept="image/*" class="sr" data-photo-rapide aria-label="Changer la photo de ${esc(p.nom)}"></label><span><b>${esc(p.nom)}</b><br><small>${esc(p.marque || "")} ${esc(p.ref || "")}</small></span></td>
      <td>${CATS[p.cat] || esc(p.cat)}</td>
      <td><input class="prix-in" type="number" min="0" step="0.01" value="${p.prix ?? ""}" placeholder="Sur devis" aria-label="Prix pro HT"></td>
      <td><label class="inter inter--petit"><input type="checkbox" data-champ="stock" ${p.stock ? "checked" : ""}><span></span></label></td>
      <td><label class="inter inter--petit"><input type="checkbox" data-champ="actif" ${p.actif ? "checked" : ""}><span></span></label></td>
      <td><button class="b b--petit" data-editer>Modifier</button></td></tr>`).join("") || `<tr><td colspan="6" class="vide">Aucun produit.</td></tr>`;
  }
  ["#p-recherche", "#p-cat"].forEach((s) => $(s).addEventListener("input", rendreProduits));
  $("#liste-produits").addEventListener("change", async (e) => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return; const p = D.produits.find((x) => x.id === tr.dataset.id);
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
      <div class="ligne"><label class="champ">Catégorie<select name="cat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${k === p.cat ? "selected" : ""}>${v}</option>`).join("")}</select></label><label class="champ">Prix pro HT (€)<input name="prix" type="number" step="0.01" min="0" value="${p.prix ?? ""}" placeholder="Vide = sur devis"></label></div>
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
      <div class="ligne"><label class="inter"><input type="checkbox" name="stock" ${p.stock !== false ? "checked" : ""}><span></span>En stock</label><label class="inter"><input type="checkbox" name="actif" ${p.actif !== false ? "checked" : ""}><span></span>Visible sur le site</label></div>
      <div class="actions"><button class="b b--jaune" type="submit">Enregistrer</button>${p.id && moi.role === "patron" ? '<button class="b b--danger" type="button" id="p-supprimer">Supprimer</button>' : ""}</div>
    </form>`;
  /* Photos : compressées dans le navigateur (WebP, 1200 px max) puis envoyées dans le stockage « produits ». */
  async function compresser(fichier) {
    const img = await createImageBitmap(fichier);
    const max = 1200, r = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise((ok) => cv.toBlob(ok, "image/webp", 0.86));
    return blob && blob.type === "image/webp" ? { blob, ext: "webp" } : { blob: await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.88)), ext: "jpg" };
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
      const ligne = { id, nom: f.get("nom"), marque: f.get("marque"), ref: f.get("ref"), cat: f.get("cat"), img, stock: !!f.get("stock"), actif: !!f.get("actif"),
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
      fermerPanneau(); await chargerProduits(); toast("Produit enregistré");
    });
    const s = $("#p-supprimer"); s && s.addEventListener("click", async () => {
      if (!p.id) return;
      if (!confirm("Supprimer ce produit du catalogue ? (Vous pouvez aussi simplement le masquer.)")) return;
      const { error } = await sb.from("produits").delete().eq("id", p.id); if (error) return toast("Erreur : " + error.message);
      fermerPanneau(); await chargerProduits(); toast("Produit supprimé");
    });
  }
  $("#liste-produits").addEventListener("click", (e) => { if (!e.target.closest("[data-editer]")) return; const tr = e.target.closest("tr[data-id]"); editerProduit(D.produits.find((x) => x.id === tr.dataset.id)); });
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
    const jours = +$("#t-periode").value; const deb = new Date(Date.now() - jours * 864e5).toISOString();
    const [{ data: v }, { data: d }] = await Promise.all([
      sb.from("visites").select("created_at, page, ref, source, session, mobile").gte("created_at", deb).order("created_at").limit(20000),
      sb.from("demandes").select("created_at").gte("created_at", deb),
    ]);
    const vis = v || [], dem = d || [];
    const sessions = new Set(vis.map((x) => x.session)).size;
    const mob = vis.length ? Math.round((vis.filter((x) => x.mobile).length / vis.length) * 100) : 0;
    $("#kpis-trafic").innerHTML = [["Pages vues", vis.length, ""], ["Visiteurs", sessions, "sessions uniques"], ["Demandes", dem.length, "reçues sur la période"], ["Transformation", sessions ? (Math.round((dem.length / sessions) * 1000) / 10).toLocaleString("fr-FR") + " %" : "—", "demandes / visiteurs", "vert"], ["Sur mobile", mob + " %", "des pages vues"]]
      .map(([t, n, s, c]) => `<div class="kpi ${c ? "kpi--" + c : ""}"><span>${t}</span><b>${n}</b><small>${s}</small></div>`).join("");
    // graphe
    const parJour = {}; for (let i = jours - 1; i >= 0; i--) { const k = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); parJour[k] = { v: 0, d: 0 }; }
    vis.forEach((x) => { const k = x.created_at.slice(0, 10); if (parJour[k]) parJour[k].v++; });
    dem.forEach((x) => { const k = x.created_at.slice(0, 10); if (parJour[k]) parJour[k].d++; });
    const ks = Object.keys(parJour), max = Math.max(1, ...ks.map((k) => parJour[k].v));
    const W = 900, H = 220, bw = W / ks.length;
    $("#graphe").innerHTML = `<svg viewBox="0 0 ${W} ${H + 24}" class="graphe" role="img" aria-label="Visites par jour">${ks.map((k, i) => { const h = (parJour[k].v / max) * H; return `<g><rect x="${i * bw + 2}" y="${H - h}" width="${Math.max(2, bw - 4)}" height="${h}" rx="3" class="barre"><title>${k} : ${parJour[k].v} vues, ${parJour[k].d} demandes</title></rect>${parJour[k].d ? `<circle cx="${i * bw + bw / 2}" cy="${H - h - 8}" r="4" class="point-dem"/>` : ""}</g>`; }).join("")}
      <text x="0" y="${H + 18}" class="axe">${ks[0].slice(5).split("-").reverse().join("/")}</text><text x="${W}" y="${H + 18}" text-anchor="end" class="axe">${ks[ks.length - 1].slice(5).split("-").reverse().join("/")}</text></svg><p class="aide">Barres : pages vues. Points jaunes : jours avec au moins une demande.</p>`;
    const top = (arr, n = 8) => Object.entries(arr.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]).slice(0, n);
    const noms = { "/": "Accueil", "/index": "Accueil", "/catalogue": "Catalogue", "/pack-cyclone": "Pack cyclone", "/pro": "Espace pro", "/installateurs": "Installateurs", "/contact": "Contact", "/qui-sommes-nous": "Qui sommes-nous", "/kits": "Kits solaires" };
    const pages = top(vis.map((x) => noms[x.page] || x.page));
    $("#top-pages").innerHTML = pages.map(([p, n]) => `<li><span>${esc(p)}</span><b>${n}</b></li>`).join("") || "<li class='vide'>Pas encore de données.</li>";
    const srcs = top(vis.filter((x) => x.ref || x.source).map((x) => x.source ? "Campagne : " + x.source : x.ref.replace(/^www\./, "").replace(/^l\.facebook\.com|^m\.facebook\.com/, "facebook.com")));
    const direct = vis.filter((x) => !x.ref && !x.source).length;
    $("#top-sources").innerHTML = (direct ? `<li><span>Accès direct</span><b>${direct}</b></li>` : "") + srcs.map(([p, n]) => `<li><span>${esc(p)}</span><b>${n}</b></li>`).join("") || "<li class='vide'>Pas encore de données.</li>";
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
      m.innerHTML = `E-mail : ${j.email.ok ? "✓ envoyé" : "✗ " + esc(j.email.raison || j.email.detail || "échec")}<br>WhatsApp : ${j.whatsapp.ok ? "✓ envoyé" : "✗ " + esc(j.whatsapp.raison || j.whatsapp.detail || "échec")}`;
    } catch (er) { m.textContent = er.message; }
  });

  demarrer();
})();
