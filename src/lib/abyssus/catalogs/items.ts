/** Known unlockables used to show "missing" — not a complete packed-asset dump. */
export const KNOWN_WEAPONS = [
	{ id: 'EngineRifle', name: 'Engine Rifle' },
	{ id: 'Shotgun', name: 'Shotgun' },
	{ id: 'HarpoonGun', name: 'Harpoon Gun' },
	{ id: 'BoomerangGun', name: 'Boomerang Gun' },
	{ id: 'TeslaGun', name: 'Tesla Rifle' },
	{ id: 'BrineRifle', name: 'Brine Rifle' },
	{ id: 'CombatBow', name: 'Combat Bow' },
	{ id: 'BrineRevolver', name: 'Brine Revolver' },
	{ id: 'DiscThrower', name: 'Disc Thrower' },
	{ id: 'FishDeity', name: 'Fish Deity' },
	{ id: 'PlasmaLauncher', name: 'Plasma Launcher' }
] as const;

export const KNOWN_ABILITIES = [
	{ id: 'Anchor', name: 'Anchor' },
	{ id: 'AncientSpear', name: 'Ancient Spear' },
	{ id: 'AtlanteanCube', name: 'Atlantean Cube' },
	{ id: 'DropShield', name: 'Drop Shield' },
	{ id: 'FragGrenade', name: 'Frag Grenade' },
	{ id: 'HealingFlask', name: 'Healing Flask' },
	{ id: 'Turret', name: 'Turret' }
] as const;

export function matchesKnown(pathOrName: string, id: string): boolean {
	const compact = pathOrName.replace(/[\s_\-]/g, '').toLowerCase();
	return compact.includes(id.toLowerCase());
}
