/* =========================================================
   CEDYAN ENERGY — anim.js
   Chargeur, vidéos, titres animés, compteurs, défilements,
   pluie et éclairs, effets au survol. Respecte « réduire les animations ».
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tactile = matchMedia("(hover: none)").matches;
  const eco = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ---------- Header : transparent sur la vidéo, plein au défilement ---------- */
  const header = $(".header");
  const majHeader = () => header && header.classList.toggle("is-solide", scrollY > 60 || document.body.classList.contains("menu-open"));
  addEventListener("scroll", majHeader, { passive: true }); majHeader();
  document.addEventListener("click", (e) => { if (e.target.closest(".burger")) setTimeout(majHeader, 0); });

  /* ---------- Titres : apparition mot par mot ---------- */
  function decouper(el) {
    if (el.dataset.decoupe) return;
    el.dataset.decoupe = "1";
    const mots = [];
    const parcourir = (n) => {
      Array.from(n.childNodes).forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((m) => {
            if (!m) return;
            if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(m)); return; }
            const w = document.createElement("span"); w.className = "mot";
            const i = document.createElement("span"); i.textContent = m; w.appendChild(i);
            frag.appendChild(w); mots.push(i);
          });
          n.replaceChild(frag, c);
        } else if (c.nodeType === 1) parcourir(c);
      });
    };
    parcourir(el);
    mots.forEach((m, k) => (m.style.transitionDelay = k * 55 + "ms"));
  }
  $$("main .sec h2.t-xl, main .sec h2.t-l").forEach((h) => h.classList.add("titre-anim"));
  const titres = $$(".titre-anim");
  if (!reduit) titres.forEach(decouper);

  /* ---------- Apparition au défilement (titres, blocs, compteurs) ---------- */
  function compter(el) {
    const fin = +el.dataset.compte; const debut = el.hasAttribute("data-sans-espace") ? Math.max(0, fin - 40) : 0;
    const t0 = performance.now(), d = 1600;
    const pas = (t) => {
      const p = clamp((t - t0) / d); const e = 1 - Math.pow(1 - p, 4);
      const v = Math.round(debut + (fin - debut) * e);
      el.textContent = el.hasAttribute("data-sans-espace") ? String(v) : v.toLocaleString("fr-FR");
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
  if ("IntersectionObserver" in window && !reduit) {
    const io = new IntersectionObserver((en) => en.forEach((x) => {
      if (!x.isIntersecting) return;
      x.target.classList.add("is-vu");
      if (x.target.dataset.compte) compter(x.target);
      io.unobserve(x.target);
    }), { rootMargin: "0px 0px -12% 0px" });
    $$(".titre-anim, [data-compte], .manifeste__lignes, .cyclones__noms, .qsn-annee, .gcarte, .solution, .services-v li, .etapes-pro li, .pack, .partenaire, .regle, .contact-carte").forEach((el) => io.observe(el));
  } else $$(".titre-anim, .gcarte, .solution").forEach((e) => e.classList.add("is-vu"));

  /* ---------- Vidéos de fond : lecture seulement quand visibles ---------- */
  // Mode économie d'énergie de l'iPhone : Safari refuse la lecture automatique. Dans ce cas on affiche
  // la photo de la vidéo, puis on relance la lecture au premier contact du doigt sur la page
  // (Safari l'autorise alors), et à chaque contact suivant pour les vidéos encore bloquées.
  const videos = $$("video[data-autoplay]");
  const enAttente = new Set();
  const visible = (v) => { const r = v.getBoundingClientRect(); return r.bottom > -200 && r.top < innerHeight + 200; };
  const lire = (v) => {
    v.muted = true; v.playsInline = true;
    if (v.preload === "none") { v.preload = "auto"; v.load(); }
    const p = v.play();
    if (p) p.then(() => { enAttente.delete(v); v.classList.add("is-on"); }).catch(() => { v.classList.add("is-on", "en-pause"); enAttente.add(v); armer(); });
  };
  let arme = false;
  const debloquer = () => {
    arme = false;
    enAttente.forEach((v) => { if (visible(v)) { const p = v.play(); p && p.then(() => { enAttente.delete(v); v.classList.remove("en-pause"); }).catch(() => {}); } });
    if (enAttente.size) armer();
  };
  function armer() {
    if (arme) return; arme = true;
    ["touchend", "click", "pointerup", "keydown"].forEach((ev) => document.addEventListener(ev, debloquer, { once: true, capture: true, passive: true }));
  }
  if (!reduit && !eco && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver((en) => en.forEach((x) => {
      const v = x.target;
      if (x.isIntersecting) {
        v.addEventListener("playing", () => { v.classList.add("is-on"); v.classList.remove("en-pause"); }, { once: true });
        lire(v);
      } else v.pause();
    }), { rootMargin: "200px 0px" });
    videos.forEach((v) => vio.observe(v));
  } else videos.forEach((v) => v.classList.add("is-on"));

  /* ---------- Hero : bande-démo de 3 vidéos en fondu enchaîné ---------- */
  const heroV = $(".hero-v");
  if (heroV) {
    const clips = $$(".hero-v__clip", heroV);
    const barres = $$(".hero-v__progress i", heroV);
    let k = 0, raf = 0;
    const DUREE = 7000;
    let t0 = performance.now();
    const lancer = (i) => {
      const v = clips[i]; if (!v) return;
      if (v.preload === "none") { v.preload = "auto"; v.load(); }
      try { v.currentTime = 0; } catch (e) {}
      v.addEventListener("playing", () => heroV.classList.add("video-ok"), { once: true });
      v.muted = true; v.playsInline = true;
      const p = v.play(); p && p.catch(() => { enAttente.add(v); armer(); });
    };
    const suivant = () => {
      const prec = clips[k]; k = (k + 1) % clips.length; lancer(k);
      clips[k].classList.add("is-on"); setTimeout(() => { prec.classList.remove("is-on"); prec.pause(); }, 1200);
      t0 = performance.now();
      if (clips[(k + 1) % clips.length].preload === "none") { const n = clips[(k + 1) % clips.length]; setTimeout(() => { n.preload = "auto"; n.load(); }, 1500); }
    };
    const boucle = (t) => {
      const p = clamp((t - t0) / DUREE);
      barres.forEach((b, i) => b.style.setProperty("--p", i < k ? 1 : i === k ? p : 0));
      if (p >= 1) { if (k === clips.length - 1) barres.forEach((b) => b.style.setProperty("--p", 0)); suivant(); }
      raf = requestAnimationFrame(boucle);
    };
    if (!reduit && !eco) {
      lancer(0);
      setTimeout(() => { const n = clips[1]; if (n) { n.preload = "auto"; n.load(); } }, 2500);
      raf = requestAnimationFrame(boucle);
      document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); clips[k].pause(); } else { t0 = performance.now(); clips[k].play().catch(() => {}); raf = requestAnimationFrame(boucle); } });
    }
    // léger parallaxe du contenu au défilement
    const contenu = $(".hero-v__in", heroV), media = $(".hero-v__media", heroV);
    if (!reduit) addEventListener("scroll", () => {
      const y = scrollY; if (y > innerHeight * 1.2) return;
      contenu.style.transform = `translateY(${y * 0.25}px)`; contenu.style.opacity = String(1 - y / (innerHeight * 0.8));
      media.style.transform = `scale(${1 + y / innerHeight * 0.08})`;
    }, { passive: true });
  }

  /* ---------- Chargeur d'entrée (une fois par session) ---------- */
  const chargeur = $(".chargeur");
  if (chargeur) {
    if (!root.classList.contains("intro")) chargeur.remove();
    else {
      const cases = $$(".chargeur__batterie i", chargeur), pct = $(".chargeur__pct", chargeur);
      const t0 = performance.now(), d = 1500;
      const pas = (t) => {
        const p = clamp((t - t0) / d), e = 1 - Math.pow(1 - p, 3);
        pct.textContent = Math.round(e * 100) + " %";
        cases.forEach((c, i) => c.classList.toggle("on", e * cases.length > i + 0.2));
        if (p < 1) requestAnimationFrame(pas);
        else { chargeur.classList.add("fini"); root.classList.remove("intro"); try { sessionStorage.setItem("cedyan_intro", "1"); } catch (er) {} setTimeout(() => chargeur.remove(), 1100); }
      };
      requestAnimationFrame(pas);
    }
  }

  /* ---------- Manifeste : les mots s'allument au défilement ---------- */
  const mani = $("[data-mots]");
  if (mani) {
    const mots = mani.textContent.trim().split(/\s+/);
    mani.innerHTML = mots.map((m) => `<span class="mm">${m}</span>`).join(" ");
    const spans = $$(".mm", mani);
    const maj = () => {
      const r = mani.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.45));
      const n = reduit ? spans.length : Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("on", i < n));
    };
    addEventListener("scroll", maj, { passive: true }); maj();
  }

  /* ---------- Gamme : défilement horizontal piloté par le scroll ---------- */
  // Hauteur calculée une seule fois par largeur d'écran (la barre d'adresse mobile ne la fait plus sauter),
  // et mouvement lissé image par image pour un rendu fluide au doigt.
  const gamme = $(".gamme"), piste = $(".gamme__piste");
  if (gamme && piste) {
    let actif = false, deb = 0, cible = 0, pos = 0, boucle = 0, largeur = 0, hautVue = innerHeight;
    const appliquer = () => { piste.style.transform = `translate3d(${-pos.toFixed(1)}px,0,0)`; };
    const anim = () => {
      pos += (cible - pos) * 0.16;
      if (Math.abs(cible - pos) < 0.4) pos = cible;
      appliquer();
      boucle = pos !== cible ? requestAnimationFrame(anim) : 0;
    };
    const calculerCible = () => {
      if (!actif) return;
      const r = gamme.getBoundingClientRect();
      const course = gamme.offsetHeight - hautVue;
      cible = clamp(-r.top / (course || 1)) * deb;
      if (!boucle) boucle = requestAnimationFrame(anim);
    };
    const mesurer = (force) => {
      if (!force && innerWidth === largeur) return; // simple apparition/disparition de la barre d'adresse : on ne touche à rien
      largeur = innerWidth; hautVue = innerHeight;
      actif = !reduit;
      if (!actif) { gamme.style.height = ""; piste.style.transform = ""; return; }
      piste.style.transform = "none";
      deb = Math.max(0, piste.scrollWidth - innerWidth + (innerWidth <= 920 ? 32 : 80));
      gamme.style.height = hautVue + deb * (innerWidth <= 920 ? 0.75 : 0.5) + "px";
      calculerCible(); pos = cible; appliquer();
    };
    addEventListener("scroll", calculerCible, { passive: true });
    addEventListener("resize", () => mesurer(false));
    addEventListener("load", () => mesurer(true));
    mesurer(true);
  }

  /* ---------- Bande vidéo : parallaxe ---------- */
  $$(".bande-video, .banniere").forEach((b) => {
    const v = $("video", b); if (!v || reduit) return;
    addEventListener("scroll", () => {
      const r = b.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      v.style.transform = `translate3d(0,${(r.top) * -0.18}px,0) scale(1.15)`;
    }, { passive: true });
  });

  /* ---------- Pluie et éclairs ---------- */
  $$("canvas.pluie").forEach((cv) => {
    if (reduit) return;
    const ctx = cv.getContext("2d"); let gouttes = [], W = 0, H = 0, vis = false;
    const taille = () => {
      W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight;
      gouttes = Array.from({ length: Math.round(W * H / 16000) }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 22, v: 9 + Math.random() * 10, o: 0.06 + Math.random() * 0.16 }));
    };
    const dessiner = () => {
      if (!vis) return;
      ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1;
      gouttes.forEach((g) => {
        ctx.strokeStyle = `rgba(190,205,240,${g.o})`;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.l * 0.28, g.y + g.l); ctx.stroke();
        g.y += g.v; g.x -= g.v * 0.28;
        if (g.y > H) { g.y = -20; g.x = Math.random() * (W + 200); }
      });
      requestAnimationFrame(dessiner);
    };
    new IntersectionObserver((en) => { vis = en[0].isIntersecting; if (vis) { if (!W) taille(); dessiner(); } }).observe(cv);
    addEventListener("resize", taille);
    const flash = cv.parentNode.querySelector(".cyclone-v__eclair");
    if (flash) (function eclair() {
      setTimeout(() => { if (vis) { flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on"); } eclair(); }, 4500 + Math.random() * 6000);
    })();
  });

  /* ---------- Avis : défilement continu ---------- */
  const avis = $("#avis-liste");
  if (avis && avis.closest(".avis-defile")) {
    // Sur ordinateur : bande qui défile (copie masquée aux lecteurs d'écran). Sur mobile : cartes à faire glisser, sans copie.
    const cloner = () => {
      if (!avis.children.length || avis.dataset.clone || innerWidth <= 920) return;
      avis.dataset.clone = "1";
      Array.from(avis.children).forEach((c) => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); k.querySelectorAll("a").forEach((x) => x.setAttribute("tabindex", "-1")); avis.appendChild(k); });
    };
    cloner(); setTimeout(cloner, 300); document.addEventListener("cedyan:donnees", () => setTimeout(cloner, 50)); document.addEventListener("cedyan:avis", () => setTimeout(cloner, 30));
  }
  $$("[data-tel-texte]").forEach((e) => { const c = window.CEDYAN_CONFIG; if (c) e.textContent = c.telephone; });


  /* ---------- Statut « Ouvert maintenant » (heure de Guadeloupe) ---------- */
  const C = window.CEDYAN_CONFIG || {};
  function statut() {
    const o = C.ouverture || {};
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guadeloupe" }));
    const j = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    const fmt = (x) => Math.floor(x) + "h" + (x % 1 ? String(Math.round((x % 1) * 60)).padStart(2, "0") : "");
    const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const p = o[j];
    if (p && h >= p[0] && h < p[1]) return { ouvert: true, txt: "Ouvert, ferme à " + fmt(p[1]) };
    if (p && h < p[0]) return { ouvert: false, txt: "Fermé, ouvre à " + fmt(p[0]) };
    for (let k = 1; k <= 7; k++) { const jj = (j + k) % 7; if (o[jj]) return { ouvert: false, txt: "Fermé, ouvre " + (k === 1 ? "demain" : jours[jj]) + " à " + fmt(o[jj][0]) }; }
    return { ouvert: false, txt: "Fermé" };
  }
  $$("[data-statut]").forEach((e) => { const st = statut(); e.classList.toggle("is-ouvert", st.ouvert); $("span", e).textContent = st.txt; });
  $$("[data-horaires-table]").forEach((t) => {
    const j = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guadeloupe" })).getDay();
    const idx = j >= 1 && j <= 4 ? 0 : j === 5 ? 1 : 2;
    const tr = t.querySelectorAll("tr")[idx]; if (tr) tr.classList.add("aujourdhui");
  });

  /* ---------- Simulateur de coupure (scène maison) ---------- */
  const simu = $("[data-simu]");
  if (simu) {
    const zone = simu.closest("[data-simu-zone]");
    const btn = $("[data-simu-btn]", simu), badge = $(".cyc__badge", simu), etatTxt = $("[data-etat-txt]", simu);
    const pct = $("[data-pct]", simu), auto = $("[data-auto]", simu), hEl = $("[data-heures]", simu), jauge = $(".cyc__jauge i", simu);
    let w = 142, kwh = 4.8, enCoupure = false, timer = 0, heures = 0, deja = false;
    const autonomie = () => (kwh * 0.9 * 1000) / w;
    const maj = (p) => { pct.textContent = Math.round(p) + " %"; jauge.style.setProperty("--niv", p / 100); auto.textContent = "≈ " + Math.round(autonomie() * p / 100) + " h"; hEl.textContent = heures + " h"; };
    const arreter = () => { clearInterval(timer); enCoupure = false; heures = 0; zone.classList.remove("coupure", "secours"); badge.dataset.etat = "ok"; etatTxt.textContent = "Réseau EDF en ligne"; btn.lastChild.textContent = "Simuler une coupure"; maj(100); };
    const couper = () => {
      enCoupure = true; zone.classList.add("coupure"); badge.dataset.etat = "ko"; etatTxt.textContent = "Coupure de courant"; btn.lastChild.textContent = "Rétablir le réseau";
      setTimeout(() => {
        if (!enCoupure) return;
        zone.classList.add("secours"); badge.dataset.etat = "secours"; etatTxt.textContent = "Pack actif, bascule en 0,02 s";
        const total = autonomie();
        timer = setInterval(() => { heures++; maj(100 - (heures / total) * 100); if (heures >= Math.min(12, Math.floor(total) - 1)) clearInterval(timer); }, reduit ? 60 : 700);
      }, reduit ? 0 : 1300);
    };
    btn.addEventListener("click", () => (enCoupure ? arreter() : couper()));
    $$("[data-pack]", simu).forEach((b) => b.addEventListener("click", () => {
      $$("[data-pack]", simu).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      w = +b.dataset.w; kwh = +b.dataset.kwh; const etait = enCoupure; arreter(); if (etait) couper();
    }));
    maj(100);
    if ("IntersectionObserver" in window) new IntersectionObserver((en, o) => { if (en[0].isIntersecting && !deja) { deja = true; o.disconnect(); setTimeout(couper, 1400); } }, { threshold: 0.55 }).observe(simu);
  }

  /* ---------- Pile de produits : parallaxe ---------- */
  const pile = $$("[data-parallax]");
  if (pile.length && !reduit) addEventListener("scroll", () => {
    pile.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; el.style.translate = `0 ${(r.top - innerHeight / 2) * +el.dataset.parallax}px`; });
  }, { passive: true });


  /* ---------- Saison cyclonique : barre et menu (1er juin - 30 novembre) ---------- */
  const enSaison = (() => { const m = new Date().getMonth(); return m >= 5 && m <= 10; })();
  if (enSaison) {
    let ferme = false; try { ferme = sessionStorage.getItem("cedyan_saison_ferme") === "1"; } catch (e) {}
    $$("[data-seulement-saison]").forEach((el) => { if (el.classList.contains("barre-saison") && ferme) return; el.hidden = false; });
    if (!ferme && $(".barre-saison")) document.body.classList.add("avec-saison");
  }
  $$("[data-fermer-saison]").forEach((b) => b.addEventListener("click", () => {
    $(".barre-saison").hidden = true; document.body.classList.remove("avec-saison");
    try { sessionStorage.setItem("cedyan_saison_ferme", "1"); } catch (e) {}
  }));

  /* ---------- Coupure de courant (plein écran) ---------- */
  $$("[data-blackout]").forEach((b) => b.addEventListener("click", () => {
    if (document.body.classList.contains("noir")) return;
    let o = $(".noir-ecran");
    if (!o) {
      o = document.createElement("div"); o.className = "noir-ecran"; o.setAttribute("role", "status");
      o.innerHTML = '<p class="noir-ecran__l1">Coupure.</p><p class="noir-ecran__l2">0,02 s plus tard, le pack a pris le relais.</p>' + (location.pathname.indexOf("pack-cyclone") < 0 ? '<a class="btn btn--soleil noir-ecran__cta" href="pack-cyclone.html">Voir les Packs Détresse Cyclone</a>' : "");
      document.body.appendChild(o);
    }
    b.classList.add("is-on");
    document.body.classList.add("noir");
    setTimeout(() => document.body.classList.add("noir--relais"), reduit ? 200 : 1700);
    setTimeout(() => { document.body.classList.remove("noir", "noir--relais"); $$("[data-blackout]").forEach((x) => x.classList.remove("is-on")); }, reduit ? 2600 : 5600);
  }));

  /* ---------- Mot qui tourne (catalogue) ---------- */
  $$("[data-mots-tournants]").forEach((el) => {
    const mots = el.dataset.motsTournants.split(","); let k = 0; const b = $("b", el);
    if (reduit) return;
    setInterval(() => {
      el.classList.add("sort");
      setTimeout(() => { k = (k + 1) % mots.length; b.textContent = mots[k]; el.classList.remove("sort"); el.classList.add("entre"); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("entre"))); }, 320);
    }, 2200);
  });

  /* ---------- Survols : boutons magnétiques et cartes inclinées ---------- */
  if (!tactile && !reduit) {
    $$(".magnetique").forEach((b) => {
      b.addEventListener("mousemove", (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.28}px)`; });
      b.addEventListener("mouseleave", () => (b.style.transform = ""));
    });
    $$(".tilt, .gcarte").forEach((c) => {
      c.addEventListener("mousemove", (e) => {
        const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg"); c.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
        c.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%"); c.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
      });
      c.addEventListener("mouseleave", () => { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
    });
  }
})();
