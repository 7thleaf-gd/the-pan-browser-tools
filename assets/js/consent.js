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

  function makeBilingual() {
    if (!panel) return;
    const box = panel.querySelector('.consent-box');
    if (!box) return;
    box.dataset.bilingual = 'true';
    const eyebrow = box.querySelector('.eyebrow');
    const title = box.querySelector('h2');
    const copy = box.querySelector('p:not(.eyebrow)');
    const allow = box.querySelector('#acceptAnalytics');
    const decline = box.querySelector('#declineAnalytics');
    if (eyebrow) eyebrow.textContent = 'PRIVACY / プライバシー';
    if (title) title.innerHTML = 'ANALYTICS<br><span class="ja">アクセス解析の設定</span>';
    if (copy) copy.innerHTML = '<span class="consent-ja">任意の匿名アクセス解析です。作品ファイル・ファイル名・個人情報は収集しません。許可しなくても、すべての機能を使えます。</span><span class="consent-en">Optional anonymous analytics only. Creative files, filenames, and personal data are not collected. Every tool works if you decline.</span>';
    if (allow) allow.innerHTML = '許可する<br><small>ALLOW ANALYTICS</small>';
    if (decline) decline.innerHTML = '許可しない<br><small>DECLINE</small>';
    const settings = document.querySelector('#privacySettings');
    if (settings) settings.textContent = 'プライバシー設定 / PRIVACY';
  }

  function init() {
    panel = document.querySelector('#consentPanel');
    if (!panel) return;
    panel.dataset.consentReady = 'true';
    makeBilingual();
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
