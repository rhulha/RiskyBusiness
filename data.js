export const COUNTRIES = await fetch('countries.json').then(r => r.json());
export const COUNTRY_SET = new Set(COUNTRIES);
export const DISPLAY = await fetch('display.json').then(r => r.json());
export const ADJ = await fetch('adjacency.json').then(r => r.json());
export const CONTINENTS = await fetch('continents.json').then(r => r.json());
