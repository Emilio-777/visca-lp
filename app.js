/* VISCA Influencer-Playbook – Landingpage-Logik */
(function () {
  'use strict';
  var CFG = window.VISCA_CONFIG || {};
  var CALENDLY = CFG.calendlyUrl || 'https://calendly.com/jannik-viscamarketing/30min';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Scroll-Animation ---------- */
  var fades = $$('.scroll-fade');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    fades.forEach(function (el) { io.observe(el); });
  } else { fades.forEach(function (el) { el.classList.add('is-visible'); }); }

  /* ---------- Sparklines in den Founder-Stats (wie Website) ---------- */
  $$('.fc-stat[data-graph]').forEach(function (el, idx) {
    var v = el.getAttribute('data-graph').split(',').map(Number);
    var max = Math.max.apply(null, v), min = Math.min.apply(null, v), W = 120, H = 32;
    var pts = v.map(function (p, i) { return (i / (v.length - 1) * W).toFixed(2) + ',' + (H - (p - min) / ((max - min) || 1) * H).toFixed(2); });
    var d = 'M' + pts.join(' L'), id = 'g' + idx;
    el.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b82f6" stop-opacity=".4"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs><path d="' + d + '" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + ' L120,32 L0,32 Z" fill="url(#' + id + ')"/></svg>');
  });

  /* ---------- Logos optisch ausgleichen (gleiche Fläche statt gleicher Höhe) ---------- */
  function balance(img, area, maxW, maxH) {
    function apply() {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      var r = w / h, s = parseFloat(getComputedStyle(img.parentElement).getPropertyValue('--s')) || 1;
      var hh = Math.sqrt(area * s * s / r), ww = hh * r;
      if (ww > maxW) { ww = maxW; hh = ww / r; }
      if (hh > maxH) { hh = maxH; ww = hh * r; }
      img.style.width = ww.toFixed(1) + 'px'; img.style.height = hh.toFixed(1) + 'px';
      img.style.maxWidth = '100%'; img.style.maxHeight = 'none';
    }
    if (img.complete) apply(); else img.addEventListener('load', apply);
  }
  function balanceAll() {
    var wide = window.innerWidth >= 1024;
    $$('.logo-wall img').forEach(function (i) { balance(i, wide ? 2300 : 1500, wide ? 118 : 92, wide ? 44 : 34); });
    $$('.track-logos img').forEach(function (i) { balance(i, 2300, 116, 46); });
    $$('.t-brand').forEach(function (i) { balance(i, 2600, 150, 40); });
    $$('.case-logo').forEach(function (i) { balance(i, 3600, 190, 44); });
  }
  balanceAll();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(balanceAll, 150); });

  /* ---------- Zum Formular ---------- */
  var heroForm = $('#anfrage');
  $$('.js-to-form').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      heroForm.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      var first = $('#view-form:not([hidden]) input') || $('#booking-title:not([hidden])');
      setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
    });
  });

  /* ---------- Sticky-CTA (mobil) ---------- */
  var sticky = $('#sticky-cta'), hero = $('#hero'), footer = $('.site-footer');
  if ('IntersectionObserver' in window && sticky) {
    var heroVisible = true, footerVisible = false;
    var upd = function () {
      var show = !heroVisible && !footerVisible && !hero.classList.contains('is-booking') && !hero.classList.contains('is-done') && !hero.classList.contains('is-thanks');
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      $('a', sticky).tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(heroForm);
    new IntersectionObserver(function (e) { footerVisible = e[0].isIntersecting; upd(); }).observe(footer);
  }

  /* ---------- Formular ---------- */
  var form = $('#lead-form');
  var fields = { name: $('#f-name'), shop: $('#f-shop'), email: $('#f-email'), budget: $('#f-budget'), planned: $('#f-planned') };
  var plannedWrap = $('#planned-wrap');
  var alertBox = $('#form-alert');
  var submitBtn = $('#submit-btn');
  var touched = {};

  function normalizeShop(v) {
    v = (v || '').trim().replace(/\s+/g, '');
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
    return v;
  }
  function validShop(v) {
    var u = normalizeShop(v);
    if (!u) return false;
    try {
      var host = new URL(u).hostname;
      return /^([a-z0-9äöüß]([a-z0-9äöüß-]{0,61}[a-z0-9äöüß])?\.)+[a-z]{2,24}$/i.test(host);
    } catch (e) { return false; }
  }
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Bitte gib deinen Namen an.'; },
    shop: function (v) { return !v.trim() ? 'Bitte gib die URL deines Online-Shops an.' : (validShop(v) ? '' : 'Bitte gib eine gültige Shop-Adresse an, z. B. deinebrand.de'); },
    email: function (v) { return !v.trim() ? 'Bitte gib deine E-Mail-Adresse an.' : (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) ? '' : 'Bitte gib eine gültige E-Mail-Adresse an.'); },
    budget: function (v) { return v ? '' : 'Bitte wähle dein monatliches Influencer-Budget.'; },
    planned: function (v) { return plannedWrap.hidden ? '' : (v ? '' : 'Bitte wähle, wie viel Budget du planst.'); }
  };
  var errIds = { name: 'e-name', shop: 'e-shop', email: 'e-email', budget: 'e-budget', planned: 'e-planned' };

  function check(key, show) {
    var el = fields[key], msg = rules[key](el.value || '');
    if (show) {
      var wrap = el.closest('.field');
      wrap.classList.toggle('has-error', !!msg);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      document.getElementById(errIds[key]).textContent = msg;
    }
    return !msg;
  }
  function clearError(key) {
    var el = fields[key];
    el.closest('.field').classList.remove('has-error');
    el.removeAttribute('aria-invalid');
    document.getElementById(errIds[key]).textContent = '';
  }

  ['name', 'shop', 'email'].forEach(function (k) {
    fields[k].addEventListener('blur', function () { if (fields[k].value.trim()) { touched[k] = true; check(k, true); } });
    fields[k].addEventListener('input', function () { if (touched[k]) check(k, true); });
  });
  fields.shop.addEventListener('blur', function () {
    // sichtbare Normalisierung nur bei gültiger Eingabe ohne Protokoll: wir lassen die Eingabe, wie sie ist
  });

  function syncSelectPlaceholder(sel) { sel.classList.toggle('is-placeholder', !sel.value); }
  [fields.budget, fields.planned].forEach(syncSelectPlaceholder);

  fields.budget.addEventListener('change', function () {
    syncSelectPlaceholder(fields.budget);
    touched.budget = true; check('budget', true);
    var none = fields.budget.value === 'Noch keins';
    // Zusatzfeld bei jeder Änderung der Hauptauswahl zurücksetzen
    fields.planned.value = '';
    syncSelectPlaceholder(fields.planned);
    clearError('planned');
    plannedWrap.hidden = !none;
    fields.planned.required = none;
  });
  fields.planned.addEventListener('change', function () { syncSelectPlaceholder(fields.planned); check('planned', true); });

  function showAlert(html) { alertBox.innerHTML = html; alertBox.hidden = false; }
  function hideAlert() { alertBox.hidden = true; alertBox.innerHTML = ''; }
  function setLoading(on) {
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    $('.btn-label', submitBtn).textContent = on ? 'Wird gesendet …' : 'Weiter zum Brand-Check';
  }

  function utm() {
    var p = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) { if (p.get(k)) o[k] = p.get(k); });
    return o;
  }

  function send(payload) {
    var endpoint = (CFG.formEndpoint || '').trim();
    var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
    var forceFail = new URLSearchParams(location.search).get('fail') === '1';
    if (forceFail) {
      return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('Testfehler (?fail=1)')); }, 700); });
    }
    if (!endpoint) {
      if (isLocal && CFG.localTestMode !== false) {
        return new Promise(function (res) { setTimeout(function () { res({ test: true, qualified: isQualified(payload.budget, payload.plannedBudget) }); }, 700); });
      }
      return Promise.reject(new Error('no-endpoint'));
    }
    var json = (CFG.formFormat || 'json') === 'json';
    var body = json ? JSON.stringify(payload) : new URLSearchParams(Object.keys(payload).reduce(function (a, k) {
      a[k] = typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : payload[k]; return a; }, {})).toString();
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded' },
      body: body,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(to);
      // Lokal ohne API-Server (nur statisches Ausliefern): sichtbar gekennzeichneter Testmodus
      if (r.status === 404 && isLocal && CFG.localTestMode !== false) return { test: true, qualified: isQualified(payload.budget, payload.plannedBudget) };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function (j) { return { test: false, qualified: !(j && j.qualified === false) }; },
        function () { return { test: false, qualified: true }; });
    }, function (e) { clearTimeout(to); throw e; });
  }

  // Nur Anzeige-Hilfe fuer den lokalen Testmodus ohne Server. Massgeblich ist die Regel in api/lead.js.
  function isQualified(budget, planned) { return budget !== 'Unter 5.000 €' && planned !== 'Unter 5.000 €'; }

  var leadEmail = '';
  function openThanks() {
    $('#view-form').hidden = true;
    $('#view-thanks').hidden = false;
    hero.classList.add('is-thanks');
    heroForm.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { $('#thanks-title').focus({ preventScroll: true }); }, 300);
  }
  function reportBooked() {
    var ep = (CFG.bookedEndpoint || '').trim();
    if (!ep || !leadEmail) return;
    try {
      fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: leadEmail }), keepalive: true })
        .catch(function () {});
    } catch (e) { /* Meldung ist optional, die Buchung bleibt gueltig */ }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();
    var keys = ['name', 'shop', 'email', 'budget', 'planned'];
    var firstBad = null;
    keys.forEach(function (k) { touched[k] = true; if (!check(k, true) && !firstBad) firstBad = fields[k]; });
    if (firstBad) { firstBad.focus(); return; }
    if ($('#f-company').value) { return; } // Honeypot

    var payload = {
      name: fields.name.value.trim(),
      shopUrl: normalizeShop(fields.shop.value),
      email: fields.email.value.trim(),
      budget: fields.budget.value,
      plannedBudget: plannedWrap.hidden ? '' : fields.planned.value,
      company: $('#f-company').value
    };

    setLoading(true);
    send(payload).then(function (res) {
      setLoading(false);
      leadEmail = payload.email;
      if (res && res.qualified === false) { openThanks(); return; }
      openBooking(payload, res && res.test);
    }).catch(function (err) {
      setLoading(false);
      var cfgMissing = err && err.message === 'no-endpoint';
      showAlert((cfgMissing
        ? '<strong>Deine Anfrage konnte gerade nicht gesendet werden.</strong> '
        : '<strong>Das hat leider nicht geklappt.</strong> Bitte prüfe deine Verbindung und versuche es erneut. ') +
        'Du kannst deinen Brand-Check auch <a href="' + CALENDLY + '" target="_blank" rel="noopener">direkt bei Calendly buchen ↗</a>.');
      if (window.console) console.warn('[Formular] Versand fehlgeschlagen:', err && err.message);
      alertBox.focus && alertBox.setAttribute('tabindex', '-1');
    });
  });

  /* ---------- Schrittanzeige ---------- */
  function setStep(n) {
    $$('.step').forEach(function (s) {
      var k = +s.getAttribute('data-step');
      s.classList.toggle('is-active', k === n);
      s.classList.toggle('is-done', k < n);
      if (k === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
  }

  /* ---------- Buchung (Calendly) ---------- */
  var booked = false, calendlyLoaded = false;
  function markCalendlyLoaded() { calendlyLoaded = true; var l = $('#calendly-loading'); if (l) l.remove(); }
  function calendlyUrl(p, embed) {
    var q = new URLSearchParams();
    if (embed) { q.set('embed_domain', location.host || 'localhost'); q.set('embed_type', 'Inline'); }
    q.set('hide_gdpr_banner', '1');
    if (p) { q.set('name', p.name); q.set('email', p.email); q.set('a1', p.shopUrl); }
    var t = utm(); ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (t[k]) q.set(k, t[k]); });
    return CALENDLY + '?' + q.toString();
  }
  function openBooking(p, isTest) {
    $('#view-form').hidden = true;
    $('#view-booking').hidden = false;
    $('#test-badge').hidden = !isTest;
    hero.classList.add('is-booking');
    setStep(2);
    $('#calendly-fallback').href = calendlyUrl(p, false);

    var wrap = $('#calendly-wrap');
    var iframe = document.createElement('iframe');
    iframe.title = 'Brand-Check bei Calendly buchen';
    iframe.src = calendlyUrl(p, true);
    iframe.setAttribute('loading', 'eager');
    iframe.addEventListener('load', markCalendlyLoaded);
    wrap.appendChild(iframe);
    setTimeout(function () {
      if (!calendlyLoaded) { var l = $('#calendly-loading'); if (l) l.innerHTML = '<span>Der Kalender lädt ungewöhnlich lange.<br><a href="' + calendlyUrl(p, false) + '" target="_blank" rel="noopener" style="color:#2563eb;font-weight:500">Brand-Check direkt bei Calendly buchen ↗</a></span>'; }
    }, 12000);

    heroForm.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { $('#booking-title').focus({ preventScroll: true }); }, 300);
  }
  window.addEventListener('message', function (e) {
    if (!/^https:\/\/([a-z0-9-]+\.)?calendly\.com$/.test(e.origin)) return;
    var ev = e.data && e.data.event;
    if (ev && ev.indexOf('calendly.') === 0) markCalendlyLoaded();
    if (ev === 'calendly.page_height' && e.data.payload && e.data.payload.height) {
      var h = parseInt(e.data.payload.height, 10);
      if (h > 400) { var f = $('#calendly-wrap iframe'); if (f) f.style.height = h + 'px'; }
    }
    if (ev === 'calendly.event_scheduled' && !booked) {
      booked = true;
      reportBooked();
      $('#view-booking').hidden = true;
      $('#view-done').hidden = false;
      hero.classList.add('is-done');
      setStep(3);
      // Playbook ist noch nicht erstellt: Schritt 3 nur als nächster Schritt markieren, nicht als aktiv/erledigt
      var s3 = $('.step[data-step="3"]'); s3.classList.remove('is-active'); s3.removeAttribute('aria-current');
      $('#done-title').focus();
      if (window.dataLayer) window.dataLayer.push({ event: 'brand_check_booked' });
    }
  });

  /* ---------- Video-Modal ---------- */
  var vModal = $('#video-modal'), vFrame = $('#video-frame'), lastTrigger = null;
  function closeModal(m) { if (m.open) m.close(); }
  $$('.js-video').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lastTrigger = btn;
      var id = btn.getAttribute('data-video');
      $('#video-modal-title').textContent = btn.getAttribute('data-title') || 'Video';
      vFrame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="' + (btn.getAttribute('data-title') || 'Video') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      vModal.showModal();
    });
  });
  vModal.addEventListener('close', function () { vFrame.innerHTML = ''; if (lastTrigger) lastTrigger.focus(); });

  /* ---------- Bild-Lightbox ---------- */
  var iModal = $('#image-modal');
  $$('.js-lightbox').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lastTrigger = btn;
      $('#image-modal-img').src = btn.getAttribute('data-src');
      $('#image-modal-img').alt = (btn.querySelector('img') || {}).alt || '';
      $('#image-modal-caption').textContent = btn.getAttribute('data-caption') || '';
      iModal.showModal();
    });
  });
  iModal.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });

  [vModal, iModal].forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  });

  /* ---------- Testimonial-Karussell ---------- */
  var track = $('#carousel-track'), prev = $('#c-prev'), next = $('#c-next'), dotsBox = $('#c-dots');
  var cards = $$('.t-slide', track);
  cards.forEach(function () { dotsBox.appendChild(document.createElement('span')); });
  var dots = $$('span', dotsBox);
  function step() { return cards[0].getBoundingClientRect().width + 16; }
  function updateCarousel() {
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
    var i = Math.round(track.scrollLeft / step());
    if (track.scrollLeft >= max) i = cards.length - 1 - Math.max(0, Math.round(track.clientWidth / step()) - 1);
    dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    cards.forEach(function (c, k) {
      var r = c.getBoundingClientRect(), tr = track.getBoundingClientRect();
      var vis = r.left >= tr.left - 4 && r.right <= tr.right + 4;
      c.setAttribute('aria-hidden', vis ? 'false' : 'true');
      c.setAttribute('aria-label', (k + 1) + ' von ' + cards.length);
    });
  }
  function go(dir) { track.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' }); }
  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  var st; track.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(updateCarousel, 60); }, { passive: true });
  window.addEventListener('resize', updateCarousel);
  updateCarousel();
})();
