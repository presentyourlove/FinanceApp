import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import zhTW from './zh-TW.json';

const i18n = new I18n({
    'zh-TW': zhTW,
});

i18n.locale = getLocales()[0].languageTag;
i18n.enableFallback = true;
i18n.defaultLocale = 'zh-TW';

export default i18n;
