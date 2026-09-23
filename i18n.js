const db = require('./database');
const baseItems = require('./items');
const fr = require('./locales/fr');
const en = require('./locales/en');

const locales = { fr, en };

function getLanguage(guildId) {
    if (!guildId) return 'fr';
    return db.getGuildLanguage(guildId) || 'fr';
}

function resolveLang(guildIdOrLang) {
    if (!guildIdOrLang) return 'fr';
    if (guildIdOrLang === 'fr' || guildIdOrLang === 'en') return guildIdOrLang;
    return getLanguage(guildIdOrLang);
}

function getNestedValue(obj, keyPath) {
    if (!obj || !keyPath) return undefined;
    const parts = keyPath.split('.');
    let curr = obj;
    for (const part of parts) {
        if (curr == null || typeof curr !== 'object') return undefined;
        curr = curr[part];
    }
    return curr;
}

function t(guildIdOrLang, key, params = {}) {
    const lang = resolveLang(guildIdOrLang);
    let str = getNestedValue(locales[lang], key);

    // Fallback sur le français si la clé est manquante
    if (str === undefined && lang !== 'fr') {
        str = getNestedValue(locales.fr, key);
    }

    if (str === undefined) {
        return key;
    }

    if (typeof str !== 'string') {
        return str;
    }

    return str.replace(/\{(\w+)\}/g, (match, paramKey) => {
        if (paramKey in params) {
            return params[paramKey];
        }
        return match;
    });
}

function formatNumber(number, guildIdOrLang) {
    const lang = resolveLang(guildIdOrLang);
    const localeCode = lang === 'en' ? 'en-US' : 'fr-FR';
    return Number(number || 0).toLocaleString(localeCode);
}

function getItem(itemId, guildIdOrLang) {
    const lang = resolveLang(guildIdOrLang);
    const base = baseItems[itemId];
    if (!base) return null;
    const locItem = locales[lang]?.items?.[itemId] || locales.fr.items?.[itemId] || {};
    return {
        ...base,
        name: locItem.name || base.name,
        description: locItem.description || base.description,
    };
}

function getAllItems(guildIdOrLang) {
    const result = {};
    for (const id in baseItems) {
        result[id] = getItem(id, guildIdOrLang);
    }
    return result;
}

module.exports = {
    getLanguage,
    resolveLang,
    t,
    formatNumber,
    getItem,
    getAllItems,
};
