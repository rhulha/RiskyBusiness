export const COUNTRIES = await fetch('../json/countries.json').then(r => r.json());
export const COUNTRY_SET = new Set(COUNTRIES);
export const DISPLAY = await fetch('../json/display.json').then(r => r.json());
export const ADJ = await fetch('../json/adjacency.json').then(r => r.json());
export const CONTINENTS = await fetch('../json/continents.json').then(r => r.json());
