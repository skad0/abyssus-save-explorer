import { describe, expect, it } from 'vitest';
import { parseGvasProperties } from './reader';

function fstring(s: string): number[] {
	const chars = [...new TextEncoder().encode(s), 0];
	const len = chars.length;
	return [len & 255, (len >> 8) & 255, (len >> 16) & 255, (len >> 24) & 255, ...chars];
}

function propsBuffer(body: number[]): ArrayBuffer {
	return Uint8Array.from([...body, ...fstring('None')]).buffer;
}

describe('BoolProperty tags', () => {
	it('reads the value after two int32 fields, including 0x10 as true', () => {
		const trueBuf = propsBuffer([
			...fstring('RunSuccesful'),
			...fstring('BoolProperty'),
			0, 0, 0, 0,
			0, 0, 0, 0,
			0x10
		]);
		const falseBuf = propsBuffer([
			...fstring('RunSuccesful'),
			...fstring('BoolProperty'),
			0, 0, 0, 0,
			0, 0, 0, 0,
			0x00
		]);
		expect(parseGvasProperties(trueBuf).RunSuccesful).toBe(true);
		expect(parseGvasProperties(falseBuf).RunSuccesful).toBe(false);
	});
});
