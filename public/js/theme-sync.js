(function() {
  function getTheme() {
    try {
      return localStorage.getItem('mohami_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function applyTheme(theme) {
    var isLight = theme === 'light';
    if (isLight) {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Update all toggle buttons
    var buttons = document.querySelectorAll('.uh-theme-toggle, [data-theme-toggle]');
    buttons.forEach(function(btn) {
      btn.innerHTML = isLight ? '🌙' : '☀️';
      btn.setAttribute('aria-label', isLight ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح');
      btn.setAttribute('title', isLight ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح');
    });
  }

  // Apply immediately before DOM is fully painted
  var currentTheme = getTheme();
  applyTheme(currentTheme);

  // Expose global toggle function
  window.toggleSiteTheme = function() {
    var cur = getTheme();
    var next = cur === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('mohami_theme', next);
      localStorage.setItem('app_theme', next === 'light' ? 'slate' : 'navy');
    } catch (e) {}
    applyTheme(next);
    window.dispatchEvent(new CustomEvent('mohami_theme_change', { detail: next }));
  };

  // Sync when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyTheme(getTheme());
    });
  } else {
    applyTheme(getTheme());
  }

  // Sync across tabs
  window.addEventListener('storage', function(e) {
    if (e.key === 'mohami_theme') {
      applyTheme(e.newValue || 'dark');
    }
  });
})();
