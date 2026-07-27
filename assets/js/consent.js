'use strict';

(function consentModule(global) {
  const root = global.ThePan = global.ThePan || {};
  const STORAGE_KEY = 'thePanAnalyticsConsent';
  const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let panel;
  let returnFocus;

  function storedStatus() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  function updateConsent(status) {
    try { localStorage.setItem(STORAGE_KEY, status); } catch (_) {}
    if (typeof global.gtag === 'function') {
      global.gtag('consent', 'update', {
        analytics_storage: status,
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  }

  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.body.removeAttribute('data-consent-open');
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  }

  function choose(status) {
    updateConsent(status);
    close();
  }

  function open(trigger) {
    if (!panel) return;
    returnFocus = trigger || document.activeElement;
    panel.hidden = false;
    document.body.setAttribute('data-consent-open', 'true');
    const first = panel.querySelector(focusableSelector);
    if (first) first.focus();
  }

  function onKeydown(event) {
    if (!panel || panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll(focusableSelector)].filter(element => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function init() {
    panel = document.querySelector('#consentPanel');
    if (!panel) return;
    panel.dataset.consentReady = 'true';
    const allow = document.querySelector('#acceptAnalytics');
    const decline = document.querySelector('#declineAnalytics');
    const settings = document.querySelector('#privacySettings');
    if (allow) allow.addEventListener('click', () => choose('granted'));
    if (decline) decline.addEventListener('click', () => choose('denied'));
    if (settings) settings.addEventListener('click', () => open(settings));
    panel.addEventListener('keydown', onKeydown);
    if (storedStatus() === null) open(document.querySelector('main'));
  }

  root.consent = Object.freeze({ init, open, close, storedStatus });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(window));
