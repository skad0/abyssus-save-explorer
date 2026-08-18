import fs from "fs";

const ATOMIC = new Set(["Guid","DateTime","Timespan","Vector","Vector2D","Vector4","Rotator",
  "Quat","Color","LinearColor","IntPoint","IntVector","UniqueNetIdRepl"]);
const UTF8 = new TextDecoder("utf-8");

class Reader{
  constructor(buf){ this.d=new DataView(buf.buffer, buf.byteOffset, buf.byteLength); this.u8=buf; this.p=0; this.len=buf.byteLength; }
  need(n){ if(this.p+n>this.len) throw new Error("eof "+this.p); }
  i8(){ this.need(1); return this.d.getInt8(this.p++); }
  u8v(){ this.need(1); return this.d.getUint8(this.p++); }
  i16(){ this.need(2); const v=this.d.getInt16(this.p,true); this.p+=2; return v; }
  u16(){ this.need(2); const v=this.d.getUint16(this.p,true); this.p+=2; return v; }
  i32(){ this.need(4); const v=this.d.getInt32(this.p,true); this.p+=4; return v; }
  u32(){ this.need(4); const v=this.d.getUint32(this.p,true); this.p+=4; return v; }
  i64(){ this.need(8); const v=this.d.getBigInt64(this.p,true); this.p+=8; return v; }
  f32(){ this.need(4); const v=this.d.getFloat32(this.p,true); this.p+=4; return v; }
  f64(){ this.need(8); const v=this.d.getFloat64(this.p,true); this.p+=8; return v; }
  guid(){ this.need(16); this.p+=16; }
  str(){
    const n=this.i32();
    if(n===0) return "";
    if(n>0){
      this.need(n);
      let end=n; if(end>0&&this.u8[this.p+end-1]===0) end--;
      const s=UTF8.decode(this.u8.subarray(this.p,this.p+end));
      this.p+=n; return s;
    }
    const cnt=-n; this.need(cnt*2); let s="";
    for(let i=0;i<cnt;i++){const c=this.d.getUint16(this.p+i*2,true); if(c===0&&i===cnt-1)break; s+=String.fromCharCode(c);}
    this.p+=cnt*2; return s;
  }
  typeName(){ this.i32(); return this.str(); }
}

function readAtomic(r,name,size){
  const start=r.p; let v=null;
  try{
    if(name==="Guid"){ r.guid(); v=null; }
    else if(name==="DateTime"||name==="Timespan"){ v=r.i64().toString(); }
    else if(name==="UniqueNetIdRepl"){ r.i32(); const sys=r.str(); const id=r.str(); v={subsystem:sys,id:id}; }
    else if(name==="Vector"||name==="Rotator"){ v=[r.f64(),r.f64(),r.f64()]; }
    else if(name==="Vector2D"){ v=[r.f64(),r.f64()]; }
    else if(name==="LinearColor"){ v=[r.f32(),r.f32(),r.f32(),r.f32()]; }
    else if(name==="IntPoint"){ v=[r.i32(),r.i32()]; }
    else if(name==="IntVector"){ v=[r.i32(),r.i32(),r.i32()]; }
  }catch(e){ v=null; }
  r.p=start+size; return v;
}

function readPrim(r,type){
  switch(type){
    case "IntProperty": return r.i32();
    case "Int8Property": return r.i8();
    case "Int16Property": return r.i16();
    case "Int64Property": return Number(r.i64());
    case "UInt16Property": return r.u16();
    case "UInt32Property": return r.u32();
    case "FloatProperty": return r.f32();
    case "DoubleProperty": return r.f64();
    case "BoolProperty": return r.u8v()!==0;
    case "StrProperty": case "NameProperty": case "ObjectProperty": case "EnumProperty": return r.str();
    case "SoftObjectProperty": { const a=r.str(); r.str(); return a; }
    case "ByteProperty": return r.u8v();
    default: return null;
  }
}

function readArray(r,inner,end){
  const count=r.i32();
  if(count<0||count>200000) throw new Error("bad array "+count);
  const items=[];
  if(inner==="StructProperty"){
    for(let i=0;i<count&&r.p<end;i++) items.push(readProps(r,end));
  }else if(inner==="SoftObjectProperty"){
    for(let i=0;i<count&&r.p<end;i++){ items.push(r.str()); r.str(); }
  }else{
    for(let i=0;i<count&&r.p<end;i++) items.push(readPrim(r,inner));
  }
  r.p=end; return items;
}

function readMapSide(r,type,end){
  if(type==="StructProperty") return readProps(r,end);
  return readPrim(r,type);
}

function readMap(r,kt,vt,end){
  const rm=r.i32();
  if(rm<0||rm>200000) throw new Error("bad map header");
  for(let i=0;i<rm;i++) readMapSide(r,kt,end);
  const n=r.i32();
  if(n<0||n>200000) throw new Error("bad map size");
  const pairs=[];
  for(let i=0;i<n&&r.p<end;i++){
    try{ const k=readMapSide(r,kt,end); const v=readMapSide(r,vt,end); pairs.push([k,v]); }
    catch(e){ break; }
  }
  r.p=end; return pairs;
}

function readProps(r,end){
  const out={}; let guard=0;
  for(;;){
    if(++guard>50000) throw new Error("desync");
    if(end!=null && r.p>=end) break;
    let name; try{ name=r.str(); }catch(e){ break; }
    if(name===""||name==="None") break;
    const type=r.str();
    let val, size, structName=null;

    if(type==="StructProperty"){
      structName=r.typeName(); r.typeName();
      r.i32(); size=r.i32();
      if(r.u8v()===1) r.guid();
      const vend=r.p+size;
      try{ val = ATOMIC.has(structName) ? readAtomic(r,structName,size) : readProps(r,vend); }
      catch(e){ val=null; }
      r.p=vend;
      out[name]=val; continue;
    }

    let inner=null,kt=null,vt=null,boolVal=null;
    if(type==="ByteProperty"||type==="EnumProperty"){ r.typeName(); }
    else if(type==="ArrayProperty"||type==="SetProperty"){
      inner=r.typeName();
      if(inner==="StructProperty"){ r.typeName(); r.typeName(); }
    }
    else if(type==="MapProperty"){
      kt=r.typeName(); if(kt==="StructProperty"){ r.typeName(); r.typeName(); }
      vt=r.typeName(); if(vt==="StructProperty"){ r.typeName(); r.typeName(); }
    }

    r.i32(); size=r.i32();
    if(type==="BoolProperty"){ boolVal=r.u8v()!==0; size=0; }
    else if(r.u8v()===1) r.guid();

    const vend=r.p+size;
    try{
      if(type==="BoolProperty") val=boolVal;
      else if(type==="ArrayProperty"||type==="SetProperty") val=readArray(r,inner,vend);
      else if(type==="MapProperty") val=readMap(r,kt,vt,vend);
      else val=readPrim(r,type);
    }catch(e){ val=null; }
    r.p=vend;
    out[name]=val;
  }
  return out;
}

function parseGVAS(buf){
  const r=new Reader(buf);
  const magic=String.fromCharCode(r.u8v(),r.u8v(),r.u8v(),r.u8v());
  if(magic!=="GVAS") throw new Error("not gvas");
  r.i32(); r.i32(); r.i32();
  const maj=r.u16(),min=r.u16(),pat=r.u16(); r.u32();
  r.str(); r.i32();
  const nCV=r.i32();
  if(nCV<0||nCV>4000) throw new Error("header");
  for(let i=0;i<nCV;i++){ r.guid(); r.i32(); }
  const saveClass=r.str();
  const mark=r.p, peek=r.d.getInt32(r.p,true);
  if(!(peek>0&&peek<200)) r.p=mark+1;
  const props=readProps(r,null);
  return {engine:maj+"."+min+"."+pat, saveClass, props};
}

function schema(obj, path, acc){
  if(obj==null){ acc.push({path, type:"null", example:null}); return; }
  if(Array.isArray(obj)){
    acc.push({path, type:"array", len:obj.length, example: summarize(obj[0])});
    if(obj.length && obj[0] && typeof obj[0]==="object" && !Array.isArray(obj[0])){
      // union of keys across first 3 items
      const keys=new Set();
      obj.slice(0,5).forEach(it=>Object.keys(it||{}).forEach(k=>keys.add(k)));
      keys.forEach(k=>{
        const vals=obj.map(it=>it?.[k]).filter(v=>v!==undefined);
        schema(vals[0], path+"[]."+k, acc);
      });
    } else if(obj.length && Array.isArray(obj[0]) && obj[0].length===2){
      acc.push({path:path+"[][0]", type:typeof obj[0][0], example:summarize(obj[0][0])});
      schema(obj[0][1], path+"[][1]", acc);
    } else if(obj.length){
      acc.push({path:path+"[]", type:typeof obj[0], example:summarize(obj[0])});
    }
    return;
  }
  if(typeof obj==="object"){
    acc.push({path, type:"object", keys:Object.keys(obj)});
    for(const [k,v] of Object.entries(obj)) schema(v, path?path+"."+k:k, acc);
    return;
  }
  acc.push({path, type:typeof obj, example:summarize(obj)});
}

function summarize(v){
  if(v==null) return v;
  if(typeof v==="string") return v.length>180?v.slice(0,180)+"…":v;
  if(typeof v==="number"||typeof v==="boolean") return v;
  if(Array.isArray(v)) return {arrayLen:v.length, first:summarize(v[0])};
  if(typeof v==="object") return {keys:Object.keys(v).slice(0,40)};
  return String(v).slice(0,80);
}

const file=process.argv[2];
const buf=fs.readFileSync(file);
const parsed=parseGVAS(buf);
const acc=[];
schema(parsed.props, "", acc);
const out={engine:parsed.engine, saveClass:parsed.saveClass, schema:acc, props:parsed.props};
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log("engine", parsed.engine, "class", parsed.saveClass, "schema rows", acc.length, "top keys", Object.keys(parsed.props));
