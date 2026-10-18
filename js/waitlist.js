/* buildurfitness.com: BUF launch waitlist.
   Until the app is out, every "Get the app" entry point (href="#waitlist", [data-waitlist], or any link to
   buffitness.app) opens this sign-up in a modal instead of leaving the site.
   Submits by FormSubmit AJAX to the same inbox as the site's existing form (_subject "BUF waitlist").
   GA4 generate_lead {form_name:'buf_waitlist'} fires once, only after FormSubmit confirms success. */
(function () {
  'use strict';
  var ENDPOINT = 'https://formsubmit.co/ajax/coachsalimheyaime@gmail.com';
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
  var APP_HOST = /(^|\.)buffitness\.app$/i;

  var form = document.getElementById('wl-form');
  var box = document.getElementById('wl-box');
  var home = document.getElementById('wl-home');
  var dialog = document.getElementById('wl-dialog');
  var slot = document.getElementById('wl-slot');
  var thanks = document.getElementById('wl-thanks');
  var err = document.getElementById('wl-err');
  if (!form || !box) return;
  form.noValidate = true; // JS validation below; no-JS visitors keep native validation + plain POST fallback
  var email = form.elements.email;
  var btn = form.querySelector('button[type="submit"]');
  var sending = false, done = false, lastTrigger = null;

  // UTM params: keep the ones the visitor landed with for this session.
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('buf_utm') || '{}') || {}; } catch (e) {}
  try {
    var q = new URLSearchParams(location.search), got = false, fresh = {};
    UTM.forEach(function (k) { var v = q.get(k); if (v) { fresh[k] = v.slice(0, 200); got = true; } });
    if (got) { utm = fresh; try { sessionStorage.setItem('buf_utm', JSON.stringify(utm)); } catch (e) {} }
  } catch (e) {}

  function setField(name, val) { if (form.elements[name]) form.elements[name].value = val; }

  /* ---- modal ---- */
  var canModal = dialog && typeof dialog.showModal === 'function';
  function open(trigger) {
    lastTrigger = trigger || null;
    var entry = (trigger && trigger.getAttribute('data-waitlist')) || 'link';
    if (!done) {
      setField('entry_point', entry);
      setField('role', (trigger && trigger.getAttribute('data-waitlist-role')) || 'client');
    }
    if (!canModal) { // very old browser: scroll to the inline form instead
      home.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!done) setTimeout(function () { form.elements.first_name.focus({ preventScroll: true }); }, 400);
      return;
    }
    if (!dialog.open) {
      slot.appendChild(box);
      document.body.classList.add('wl-lock');
      dialog.showModal();
    }
    (done ? thanks : form.elements.first_name).focus();
  }
  function onClose() {
    home.appendChild(box);
    document.body.classList.remove('wl-lock');
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }
  if (canModal) {
    dialog.addEventListener('close', onClose);
    document.getElementById('wl-close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); }); // backdrop click
  }

  // Every Get the app / waitlist entry point, plus any buffitness.app link, opens the waitlist.
  document.addEventListener('click', function (e) {
    if (e.button !== 0) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href],[data-waitlist]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '', isApp = false;
    if (href) { try { isApp = APP_HOST.test(new URL(a.href, location.href).hostname); } catch (x) {} }
    if (a.hasAttribute('data-waitlist') || href === '#waitlist' || isApp) {
      e.preventDefault();
      open(a);
    }
  });
  // Also neutralise app links on middle-click / "open in new tab" by rewriting them to the on-page waitlist.
  Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
    try { if (APP_HOST.test(new URL(a.href, location.href).hostname)) { a.setAttribute('href', '#waitlist'); a.removeAttribute('target'); if (!a.hasAttribute('data-waitlist')) a.setAttribute('data-waitlist', 'app_link'); } } catch (x) {}
  });

  /* ---- validation + submit ---- */
  function showErr(msg) { err.textContent = msg; err.hidden = false; }
  function clearErr() { err.hidden = true; err.textContent = ''; email.removeAttribute('aria-invalid'); }
  email.addEventListener('input', function () { if (!err.hidden) clearErr(); });

  function showThanks() {
    done = true;
    var n = (form.elements.first_name.value || '').trim();
    document.getElementById('wl-thanks-name').textContent = n ? ', ' + n : '';
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending || done) return;
    clearErr();
    var em = (email.value || '').trim();
    if (!em) { email.setAttribute('aria-invalid', 'true'); showErr('Please enter your email address.'); email.focus(); return; }
    if (!EMAIL_RE.test(em) || em.length > 254) { email.setAttribute('aria-invalid', 'true'); showErr('Please enter a valid email address, like name@example.com.'); email.focus(); return; }

    // Honeypot: bots that fill the hidden field get a thank-you, but nothing is sent and nothing is tracked.
    if ((form.elements._honey.value || '').trim()) { showThanks(); return; }

    var optIn = form.elements.marketing_opt_in.checked ? 'yes' : 'no';
    var ts = new Date().toISOString();
    var data = {
      _subject: 'BUF waitlist',
      _template: 'table',
      _captcha: 'false',
      _honey: '',
      source: 'buf_waitlist',
      first_name: (form.elements.first_name.value || '').trim().slice(0, 60),
      email: em,
      marketing_opt_in: optIn,
      role: form.elements.role.value || 'client',
      entry_point: form.elements.entry_point.value || 'waitlist_section',
      page: location.origin + location.pathname,
      page_url: location.href.slice(0, 500),
      timestamp: ts
    };
    UTM.forEach(function (k) { data[k] = utm[k] || ''; });
    setField('timestamp', ts);

    sending = true; btn.disabled = true; btn.textContent = 'Joining…';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !(j.success === true || j.success === 'true')) throw new Error('not ok');
      });
    }).then(function () {
      showThanks();
      try { if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form_name: 'buf_waitlist' }); } catch (x) {}
    }).catch(function () {
      showErr('Something went wrong and you’re not on the list yet. Please try again in a moment.');
    }).then(function () {
      sending = false; btn.disabled = false; btn.textContent = 'Join the waitlist';
    });
  });
})();
