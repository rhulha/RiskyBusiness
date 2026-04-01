// Detect base path for GitHub Pages deployment
const basePath = import.meta.url.includes('/RiskyBusiness/')
    ? '/RiskyBusiness/'
    : new URL('.', import.meta.url).pathname;

const getPath = (file) => new URL(`${basePath}json/${file}`, import.meta.url).href;

export const COUNTRIES = await fetch(getPath('countries.json')).then(r => r.json());
export const COUNTRY_SET = new Set(COUNTRIES);
export const DISPLAY = await fetch(getPath('display.json')).then(r => r.json());
export const ADJ = await fetch(getPath('adjacency.json')).then(r => r.json());
export const CONTINENTS = await fetch(getPath('continents.json')).then(r => r.json());
