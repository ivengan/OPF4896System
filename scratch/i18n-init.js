// public/i18n-init.js

const updateContent = () => {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key.startsWith('[') && key.endsWith(']')) {
      const attr = key.slice(1, -1);
      const realKey = el.dataset.i18nKey;
      el.setAttribute(attr, i18next.t(realKey));
    } else {
      el.innerHTML = i18next.t(key);
    }
  });
  const titleKey = document.querySelector('title')?.dataset.i18n;
  if(titleKey) {
      document.title = i18next.t(titleKey);
  }
};

async function initializeI18next() {
  await i18next
    .use(i18nextBrowserLanguageDetector)
    .use(i18nextHttpBackend)
    .init({
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      load: 'languageOnly',
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
    });
  
  updateContent();
}

initializeI18next();

i18next.on('languageChanged', () => {
  updateContent();
});