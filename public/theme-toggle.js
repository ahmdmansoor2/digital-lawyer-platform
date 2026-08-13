(function () {
  'use strict';

  var STORAGE_KEY = 'mohamidigital_theme';

  function getTheme() {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.publicTheme = theme;
    document.documentElement.classList.toggle('public-theme-light', theme === 'light');
    document.documentElement.classList.toggle('public-theme-dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);

    var button = document.querySelector('.public-theme-toggle');
    if (button) {
      var nextTheme = theme === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', nextTheme === 'light' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
      button.setAttribute('title', nextTheme === 'light' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
      button.innerHTML = theme === 'dark' ? '<span aria-hidden="true">☼</span><span>الوضع الفاتح</span>' : '<span aria-hidden="true">◐</span><span>الوضع الداكن</span>';
    }
  }

  function addToggle() {
    var actions = document.querySelector('.header-actions');
    if (!actions || document.querySelector('.public-theme-toggle')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'public-theme-toggle';
    button.addEventListener('click', function () {
      applyTheme(document.documentElement.classList.contains('public-theme-dark') ? 'light' : 'dark');
    });

    var mobileToggle = actions.querySelector('.header-mobile-toggle');
    if (mobileToggle) actions.insertBefore(button, mobileToggle);
    else actions.appendChild(button);
    applyTheme(getTheme());
  }

  applyTheme(getTheme());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addToggle);
  else addToggle();
})();
