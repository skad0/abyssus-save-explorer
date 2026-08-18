/* Ported from abyssus_save_explorer.html — UE 5.6 GVAS reader for Abyssus saves. */

const ATOMIC = new Set([
	'Guid',
	'DateTime',
	'Timespan',
	'Vector',
	'Vector2D',
	'Vector4',
	'Rotator',
	'Quat',
	'Color',
	'LinearColor',
	'IntPoint',
	'IntVector',
	'UniqueNetIdRepl'
]);

const UTF8 = new TextDecoder('utf-8');

type GvasValue = string | number | boolean | null | GvasProps | GvasValue[] | [unknown, unknown][];

interface GvasProps {
	[key: string]: GvasValue;
}

class Reader {
	d: DataView;
	u8: Uint8Array;
	p = 0;
	len: number;

	constructor(buf: ArrayBuffer) {
		this.d = new DataView(buf);
		this.u8 = new Uint8Array(buf);
		this.len = buf.byteLength;
	}

	need(n: number): void {
		if (this.p + n > this.len) throw new Error(`unexpected end of file at byte ${this.p}`);
	}

	i8(): number {
		this.need(1);
		return this.d.getInt8(this.p++);
	}

	u8v(): number {
		this.need(1);
		return this.d.getUint8(this.p++);
	}

	i16(): number {
		this.need(2);
		const v = this.d.getInt16(this.p, true);
		this.p += 2;
		return v;
	}

	u16(): number {
		this.need(2);
		const v = this.d.getUint16(this.p, true);
		this.p += 2;
		return v;
	}

	i32(): number {
		this.need(4);
		const v = this.d.getInt32(this.p, true);
		this.p += 4;
		return v;
	}

	u32(): number {
		this.need(4);
		const v = this.d.getUint32(this.p, true);
		this.p += 4;
		return v;
	}

	i64(): bigint {
		this.need(8);
		const v = this.d.getBigInt64(this.p, true);
		this.p += 8;
		return v;
	}

	f32(): number {
		this.need(4);
		const v = this.d.getFloat32(this.p, true);
		this.p += 4;
		return v;
	}

	f64(): number {
		this.need(8);
		const v = this.d.getFloat64(this.p, true);
		this.p += 8;
		return v;
	}

	guid(): void {
		this.need(16);
		this.p += 16;
	}

	str(): string {
		const n = this.i32();
		if (n === 0) return '';
		if (n > 0) {
			this.need(n);
			let end = n;
			if (end > 0 && this.u8[this.p + end - 1] === 0) end--;
			const s = UTF8.decode(this.u8.subarray(this.p, this.p + end));
			this.p += n;
			return s;
		}
		const cnt = -n;
		this.need(cnt * 2);
		let s = '';
		for (let i = 0; i < cnt; i++) {
			const c = this.d.getUint16(this.p + i * 2, true);
			if (c === 0 && i === cnt - 1) break;
			s += String.fromCharCode(c);
		}
		this.p += cnt * 2;
		return s;
	}

	typeName(): string {
		this.i32();
		return this.str();
	}
}

function readAtomic(r: Reader, name: string, size: number): GvasValue {
	const start = r.p;
	let v: GvasValue = null;
	try {
		if (name === 'Guid') {
			r.guid();
			v = null;
		} else if (name === 'DateTime' || name === 'Timespan') {
			v = r.i64().toString();
		} else if (name === 'UniqueNetIdRepl') {
			r.i32();
			v = { subsystem: r.str(), id: r.str() };
		} else if (name === 'Vector' || name === 'Rotator') {
			v = [r.f64(), r.f64(), r.f64()];
		} else if (name === 'Vector2D') {
			v = [r.f64(), r.f64()];
		} else if (name === 'LinearColor') {
			v = [r.f32(), r.f32(), r.f32(), r.f32()];
		} else if (name === 'IntPoint') {
			v = [r.i32(), r.i32()];
		} else if (name === 'IntVector') {
			v = [r.i32(), r.i32(), r.i32()];
		}
	} catch {
		v = null;
	}
	r.p = start + size;
	return v;
}

function readPrim(r: Reader, type: string): GvasValue {
	switch (type) {
		case 'IntProperty':
			return r.i32();
		case 'Int8Property':
			return r.i8();
		case 'Int16Property':
			return r.i16();
		case 'Int64Property':
			return Number(r.i64());
		case 'UInt16Property':
			return r.u16();
		case 'UInt32Property':
			return r.u32();
		case 'FloatProperty':
			return r.f32();
		case 'DoubleProperty':
			return r.f64();
		case 'BoolProperty':
			return r.u8v() !== 0;
		case 'StrProperty':
		case 'NameProperty':
		case 'ObjectProperty':
		case 'EnumProperty':
			return r.str();
		case 'SoftObjectProperty': {
			const a = r.str();
			r.str();
			return a;
		}
		case 'ByteProperty':
			return r.u8v();
		default:
			return null;
	}
}

function readArray(r: Reader, inner: string | null, end: number): GvasValue[] {
	const count = r.i32();
	if (count < 0 || count > 200_000) throw new Error(`implausible array count ${count}`);
	const items: GvasValue[] = [];
	if (inner === 'StructProperty') {
		for (let i = 0; i < count && r.p < end; i++) items.push(readProps(r, end));
	} else if (inner === 'SoftObjectProperty') {
		for (let i = 0; i < count && r.p < end; i++) {
			items.push(r.str());
			r.str();
		}
	} else if (inner) {
		for (let i = 0; i < count && r.p < end; i++) items.push(readPrim(r, inner));
	}
	r.p = end;
	return items;
}

function readMapSide(r: Reader, type: string, end: number): GvasValue {
	if (type === 'StructProperty') return readProps(r, end);
	return readPrim(r, type);
}

function readMap(r: Reader, kt: string | null, vt: string | null, end: number): [unknown, unknown][] {
	const rm = r.i32();
	if (rm < 0 || rm > 200_000) throw new Error('implausible map header');
	if (kt) {
		for (let i = 0; i < rm; i++) readMapSide(r, kt, end);
	}
	const n = r.i32();
	if (n < 0 || n > 200_000) throw new Error('implausible map size');
	const pairs: [unknown, unknown][] = [];
	for (let i = 0; i < n && r.p < end; i++) {
		try {
			const k = kt ? readMapSide(r, kt, end) : null;
			const v = vt ? readMapSide(r, vt, end) : null;
			pairs.push([k, v]);
		} catch {
			break;
		}
	}
	r.p = end;
	return pairs;
}

function readProps(r: Reader, end: number | null): GvasProps {
	const out: GvasProps = {};
	let guard = 0;
	for (;;) {
		if (++guard > 50_000) throw new Error('desync while reading properties');
		if (end != null && r.p >= end) break;
		let name: string;
		try {
			name = r.str();
		} catch {
			break;
		}
		if (name === '' || name === 'None') break;
		const type = r.str();
		let val: GvasValue;
		let size: number;
		let structName: string | null = null;

		if (type === 'StructProperty') {
			structName = r.typeName();
			r.typeName();
			r.i32();
			size = r.i32();
			if (r.u8v() === 1) r.guid();
			const vend = r.p + size;
			try {
				val = structName && ATOMIC.has(structName) ? readAtomic(r, structName, size) : readProps(r, vend);
			} catch {
				val = null;
			}
			r.p = vend;
			out[name] = val;
			continue;
		}

		let inner: string | null = null;
		let kt: string | null = null;
		let vt: string | null = null;

		if (type === 'ByteProperty' || type === 'EnumProperty') r.typeName();
		else if (type === 'ArrayProperty' || type === 'SetProperty') {
			inner = r.typeName();
			if (inner === 'StructProperty') {
				r.typeName();
				r.typeName();
			}
		} else if (type === 'MapProperty') {
			kt = r.typeName();
			if (kt === 'StructProperty') {
				r.typeName();
				r.typeName();
			}
			vt = r.typeName();
			if (vt === 'StructProperty') {
				r.typeName();
				r.typeName();
			}
		}

		r.i32();
		size = r.i32();
		let boolVal: boolean | null = null;
		if (type === 'BoolProperty') {
			// Tag body is two int32s then the value byte (Abyssus writes 0x10 for true).
			boolVal = r.u8v() !== 0;
			size = 0;
		} else if (r.u8v() === 1) r.guid();

		const vend = r.p + size;
		try {
			if (type === 'BoolProperty') val = boolVal;
			else if (type === 'ArrayProperty' || type === 'SetProperty') val = readArray(r, inner, vend);
			else if (type === 'MapProperty') val = readMap(r, kt, vt, vend);
			else val = readPrim(r, type);
		} catch {
			val = null;
		}
		r.p = vend;
		out[name] = val;
	}
	return out;
}

export interface GvasParsed {
	engine: string;
	saveClass: string;
	props: GvasProps;
}

export function parseGVAS(buf: ArrayBuffer): GvasParsed {
	const r = new Reader(buf);
	const magic = String.fromCharCode(r.u8v(), r.u8v(), r.u8v(), r.u8v());
	if (magic !== 'GVAS') {
		throw new Error(`Not an Unreal save file — expected GVAS header, got "${magic}".`);
	}
	r.i32();
	r.i32();
	r.i32();
	const maj = r.u16();
	const min = r.u16();
	const pat = r.u16();
	r.u32();
	r.str();
	r.i32();
	const nCV = r.i32();
	if (nCV < 0 || nCV > 4000) throw new Error('save header looks corrupt');
	for (let i = 0; i < nCV; i++) {
		r.guid();
		r.i32();
	}
	const saveClass = r.str();
	const mark = r.p;
	const peek = r.d.getInt32(r.p, true);
	if (!(peek > 0 && peek < 200)) r.p = mark + 1;
	const props = readProps(r, null);
	return { engine: `${maj}.${min}.${pat}`, saveClass, props };
}

/** Property-stream only (no GVAS header). Used by tests for BoolProperty tag layout. */
export function parseGvasProperties(buf: ArrayBuffer): GvasProps {
	return readProps(new Reader(buf), null);
}
