export interface CoinCatalogEntry {
	key: string;
	label: string;
	wardrobe: string;
	total: number;
}

/** wiki.gg Surge Fissures totals. Room names are not in the save or the wiki checklist. */
export const COIN_CATALOG: CoinCatalogEntry[] = [
	{ key: 'Lobby', label: 'Lobby', wardrobe: 'Tinker', total: 8 },
	{ key: 'Boatyard', label: 'Abandoned Temple', wardrobe: 'Sturdy', total: 15 },
	{ key: 'Submarine', label: 'Submarine', wardrobe: 'Brine', total: 15 },
	{ key: 'Gardens', label: 'Gardens', wardrobe: 'Vines', total: 15 },
	{ key: 'Sanctuary', label: 'Sanctuary', wardrobe: 'Deep', total: 15 },
	{ key: 'Void', label: 'Royal Abyss', wardrobe: 'Heavenly', total: 6 }
];

export function coinCatalogByKey(): Map<string, CoinCatalogEntry> {
	return new Map(COIN_CATALOG.map((c) => [c.key, c]));
}
