type KeyTarget = { tagName?: string; isContentEditable?: boolean } | null;

export function isTypingTarget(target: KeyTarget | EventTarget | null): boolean {
	if (target == null || typeof target !== 'object') return false;
	const el = target as { tagName?: string; isContentEditable?: boolean };
	const tag = el.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return Boolean(el.isContentEditable);
}
