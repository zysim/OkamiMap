const lang = document.querySelector('html').lang || 'en'

const locale = {
  en: {
    currency: 'Yen',
  },
  es: {
    currency: 'Yen',
  },
  de: {
    currency: 'Yen',
  },
  fr: {
    currency: 'Ryo',
  },
  zh: {
    currency: '兩',
  },
  ja: {
    currency: '両',
  },
}

export const getLocale = key => locale[lang][key]
