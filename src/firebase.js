import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { saveToCloud, listenToCloud } from "./firebase.js";

// Cloud doc ID — one shared document for the whole family
const CLOUD_DOC = "shared";
// Debounce helper
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ─── CATALOG ──────────────────────────────────────────────────────────────────
const DEFAULT_CAT = {
  "🥩 لحوم طازجة":["صدر دجاج","فخذ دجاج","دجاج كامل","لحم بقري مفروم","ريش بقري","كبدة بقر","لحم غنم","كتف غنم","كفتة","نقانق لحم","ستيك"],
  "🐟 أسماك ومأكولات بحرية":["سمك سلمون","سمك بلطي","سمك هامور","روبيان","كاليماري","تونة طازجة","سردين","كراب"],
  "🥚 ألبان وبيض":["بيض","حليب كامل","حليب قليل الدسم","لبن زبادي","زبدة","قشطة","كريمة خفق","جبن أبيض","جبن شيدر","جبن موزاريلا","جبن كريمي","لبنة","حليب مكثف"],
  "🥦 خضار طازجة":["طماطم","بصل","ثوم","بطاطس","جزر","كوسا","باذنجان","فلفل أخضر","فلفل أحمر","خيار","خس","بروكلي","سبانخ","قرنبيط","بطاطا حلوة","كراث","فجل","فاصوليا خضراء","بامية","ملفوف"],
  "🌿 أعشاب طازجة":["بقدونس","كزبرة","نعناع","ريحان","شبت","زعتر طازج","ليمون","ليمون أخضر"],
  "🍎 فواكه":["تفاح","موز","برتقال","عنب","بطيخ","شمام","مانجو","فراولة","أناناس","كيوي","رمان","تمر","مشمش","خوخ","توت","جريب فروت","كمثرى"],
  "🍞 خبز ومخبوزات":["خبز تميس","خبز عربي","خبز توست","خبز فرنسي","كرواسون","كعك","بسكويت","بريوش","خبز حبوب كاملة"],
  "🌾 أرز وحبوب":["أرز بسمتي","أرز مصري","أرز بني","عدس أحمر","عدس أخضر","حمص جاف","فول جاف","فاصوليا بيضاء","لوبيا","برغل","كينوا","شوفان","دقيق أبيض","سميد","نشا"],
  "🍝 مكرونة":["سباغيتي","بيني","فيتوتشيني","مكرونة قصيرة","شعيرية","كسكس","لازانيا","رامن"],
  "🥫 معلبات":["طماطم معلبة","فول معلب","حمص معلب","ذرة معلبة","تونة معلبة","سردين معلب","زيتون أسود","زيتون أخضر","مربى فراولة","عسل","دبس تمر"],
  "🫙 صلصات وزيوت":["صلصة طماطم","مايونيز","كاتشب","خردل","طحينة","صلصة صويا","صلصة حارة","خل أبيض","زيت زيتون","زيت نباتي","سمن بلدي","سمن نباتي"],
  "🧂 توابل وبهارات":["ملح","فلفل أسود","كمون","كركم","زعتر مجفف","هيل","قرفة","زنجبيل","بهارات مشكلة","ثوم بودرة","بصل بودرة","فلفل أحمر","سماق","ورق غار","شطة","كاري","بابريكا"],
  "🧃 مشروبات":["ماء معدني","عصير برتقال","عصير مانجو","عصير تفاح","شاي أكياس","شاي أخضر","قهوة مطحونة","نسكافيه","قهوة عربية","مشروب غازي","كاكاو","مشروب شعير"],
  "❄️ مجمدات":["دجاج مجمد","لحم مجمد","خضار مجمد مشكل","بيتزا مجمدة","برغر مجمد","سمك مجمد","روبيان مجمد","آيس كريم","بطاطس مجمدة","وجبات جاهزة مجمدة"],
  "🍪 وجبات خفيفة":["شيبس","مكسرات مشكلة","لوز","كاجو","فستق","شوكولاتة","حلوى","بسكويت","بوشار","تمر","زبيب","طاقة بار","كيك"],
  "🧹 منظفات المنزل":["مسحوق غسيل","سائل غسيل ملابس","منعم ملابس","سائل تنظيف أطباق","جلي صحون آلي","معقم أرضيات","مبيض","منظف حمام","منظف مطبخ","منظف زجاج","إسفنجة","لبادة تنظيف"],
  "🗑️ أكياس ومستلزمات":["كيس قمامة كبير","كيس قمامة صغير","ورق ألمنيوم","ورق زبدة","نايلون تغليف","علب بلاستيكية","شنط قماش"],
  "🧻 ورقيات":["ورق تواليت","مناديل ورقية","مناديل مطبخ","مناشف ورق","فوط صحية","حفاضات أطفال","مناديل مبللة"],
  "🧴 عناية شخصية":["شامبو","بلسم شعر","صابون سائل","غسول جسم","معجون أسنان","فرشاة أسنان","غسول وجه","كريم مرطب","مزيل تعرق","كريم شمسي","ورق حلاقة"],
  "💊 صحة وأدوية":["فيتامين سي","فيتامين د","مكمل كالسيوم","مكمل حديد","باراسيتامول","ملح معدني","بخاخ أنف","ضمادات","معقم جروح"],
};

const UNITS=["قطعة","كيلو","جرام","لتر","مل","علبة","كيس","عبوة","رزمة","حبة","ربطة","باكيت","كرتون","زجاجة","صينية"];
const PRI={high:{l:"⚡ عاجل",c:"#E53E3E"},medium:{l:"عادي",c:"#D97706"},low:{l:"اختياري",c:"#38A169"}};
const ICONS=["🏠","🏡","🏘️","🏢","🏗️","🏨","🌇","🏙️","🏕️","⛺"];
const COLORS=["#1B5E3B","#0D4F6B","#6B2D0D","#4A1A6B","#0D3B5E","#3B1A0D","#1A3B1A","#5C2D00","#1A1A5C","#3B0D1A"];
const CAT_EMOJIS=["🛒","🍽️","🫙","🥗","🌮","🍜","🥘","🥙","🍱","🥣","🍲","🍯","🥞","🍳","🥚","🥛","🧀","🍖","🍗","🥩","🥓","🌭","🍔","🍟","🍕","🌶️","🫑","🥦","🥬","🥒","🧄","🧅","🌽","🥕","🍠","🌿","🌾","🍄","🥜","🫘","🫐","🍓","🍇","🍉","🍊","🍋","🍌","🍎","🍐","🍑","🍒","🥝","🍅","🍞","🥐","🥖","🍵","☕","🫖","🥤","🧃","🧹","🧺","🧻","🪣","🧼","🧽","🧴","💊","🩺","🗑️","♻️","🛍️","📦"];

const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const ts=()=>new Date().toLocaleString("ar-SA",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"});

const MONTHS_AR=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const getMonthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const parseMonthKey=k=>{const[y,m]=k.split("-");return{year:parseInt(y),month:parseInt(m)-1};};
const formatMonthKey=k=>{const{year,month}=parseMonthKey(k);return`${MONTHS_AR[month]} ${year}`;};
const fmt=n=>Number(n||0).toLocaleString("ar-SA",{maximumFractionDigits:2});

function migrate(){
  if(LS.get("m_v10",false))return;
  ["houses","lists","saved"].forEach(k=>{const src=LS.get(`${k}_v9`,null)||LS.get(`${k}_v8`,null);if(src&&!LS.get(`${k}_v10`,null))LS.set(`${k}_v10`,src);});
  const hp=LS.get("hp_v9","")||LS.get("hp_v8","");
  if(hp&&!LS.get("hp_v10",""))LS.set("hp_v10",hp);
  const ord=LS.get("orders_v9",null)||LS.get("orders_v8",null);
  if(ord&&!LS.get("orders_v10",null))LS.set("orders_v10",ord);
  const cat=LS.get("catalog_v9",null)||LS.get("catalog_v8",null);
  if(cat&&!LS.get("catalog_v10",null))LS.set("catalog_v10",cat);
  const bud=LS.get("budgets_v9",null);
  if(bud&&!LS.get("budgets_v10",null))LS.set("budgets_v10",bud);
  LS.set("m_v10",true);
}
migrate();

function groupByCat(items){const g={};items.forEach(it=>{const k=it.category||"أخرى";if(!g[k])g[k]=[];g[k].push(it);});Object.values(g).forEach(a=>a.sort((x,y)=>({high:0,medium:1,low:2}[x.priority]-{high:0,medium:1,low:2}[y.priority])));return g;}

function buildPrintHTML(order){
  const g=groupByCat(order.items);const urgent=order.items.filter(i=>i.priority==="high");
  const rows=Object.entries(g).map(([cat,items])=>`<tr><td colspan="4" style="background:#1B4332;color:#fff;padding:8px 14px;font-weight:900;font-size:13px">${cat}</td></tr>${items.map((it,i)=>`<tr style="background:${i%2===0?"#F7FAF8":"#fff"}"><td style="width:16px;padding:7px 10px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PRI[it.priority].c}"></span></td><td style="padding:7px 10px;font-weight:700;font-size:13px">${it.name}${it.note?`<br><span style="color:#888;font-size:11px">${it.note}</span>`:""}</td><td style="padding:7px 10px;text-align:center;font-weight:700;color:#1B4332;font-size:13px">${it.qty}</td><td style="padding:7px 10px;color:#555;font-size:13px">${it.unit}</td></tr>`).join("")}`).join("");
  const urgHtml=urgent.length?`<div style="background:#FFF5F5;border:2px solid #FC8181;border-radius:10px;padding:14px 18px;margin-bottom:20px"><p style="color:#C53030;font-weight:900;font-size:15px;margin:0 0 8px">⚡ العاجل (${urgent.length})</p>${urgent.map(i=>`<p style="color:#C53030;font-size:13px;margin:3px 0">• ${i.name} — ${i.qty} ${i.unit}</p>`).join("")}</div>`:"";
  const totalLine=order.totalAmount?`<p style="text-align:center;font-weight:900;font-size:16px;color:#1B4332;margin-top:12px">💰 إجمالي الطلب: ${fmt(order.totalAmount)} ريال</p>`:"";
  return`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>قائمة ${order.houseName}</title><style>body{font-family:Arial,sans-serif;direction:rtl;padding:24px;max-width:700px;margin:0 auto}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #E8F0E5}@media print{body{padding:0}}</style></head><body><div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><h1 style="font-size:20px;font-weight:900;margin:0">🛒 قائمة ${order.houseName}</h1><p style="font-size:12px;opacity:.8;margin:4px 0 0">${order.items.length} منتج · ${urgent.length} عاجل</p></div><div style="font-size:12px;opacity:.8">${order.sentAt}</div></div>${urgHtml}<table>${rows}</table>${totalLine}<p style="text-align:center;color:#aaa;font-size:11px;margin-top:20px;border-top:1px solid #eee;padding-top:12px">تم الإنشاء بتطبيق مقاضي · ${new Date().toLocaleDateString("ar-SA")}</p><script>window.onload=()=>window.print()<\/script></body></html>`;
}
function buildText(order){
  const g=groupByCat(order.items);const urgent=order.items.filter(i=>i.priority==="high");
  let t=`🛒 قائمة مقاضي ${order.houseName}\n📅 ${order.sentAt}\n${"─".repeat(30)}\n\n`;
  if(urgent.length)t+=`⚡ عاجل:\n${urgent.map(i=>`  • ${i.name} — ${i.qty} ${i.unit}`).join("\n")}\n\n${"─".repeat(30)}\n\n`;
  Object.entries(g).forEach(([cat,items])=>{t+=`${cat}\n${items.map(i=>`  ${i.priority==="high"?"⚡":"•"} ${i.name} — ${i.qty} ${i.unit}${i.note?` (${i.note})`:""}`).join("\n")}\n\n`;});
  t+=`${"─".repeat(30)}\nالإجمالي: ${order.items.length} منتج`;
  if(order.totalAmount)t+=`\n💰 إجمالي المبلغ: ${fmt(order.totalAmount)} ريال`;
  return t;
}

// ─── ARABIC PHONE-STYLE PIN PAD ───────────────────────────────────────────────
// RTL layout: 3-2-1 / 6-5-4 / 9-8-7 / ⌫-0-*blank
// Displayed row by row left-to-right but values match Arabic phone standard
const PIN_ROWS=[
  ["3","2","1"],
  ["6","5","4"],
  ["9","8","7"],
  ["⌫","0",""],
];

function PinPad({value,onChange,accent="#C8960C"}){
  return(
    <div style={{width:"100%",maxWidth:272,margin:"0 auto"}}>
      {/* Dots */}
      <div style={{display:"flex",gap:14,justifyContent:"center",margin:"16px 0 20px"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:14,height:14,borderRadius:"50%",background:value.length>i?accent:"transparent",border:`2px solid ${value.length>i?accent:"#2A3A4A"}`,transition:"all .15s",boxShadow:value.length>i?`0 0 10px ${accent}99`:"none"}}/>
        ))}
      </div>
      {/* Keys grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {PIN_ROWS.flat().map((key,i)=>{
          const isEmpty=key==="";
          const isDel=key==="⌫";
          return(
            <button key={i} disabled={isEmpty}
              style={{height:64,borderRadius:14,background:isEmpty?"transparent":isDel?"#1A2B3C":"#16222E",border:isEmpty?"none":`1px solid ${isDel?"#253545":"#1E2F3E"}`,color:isDel?"#6B8F71":"#E8F0FE",fontSize:isDel?22:26,fontWeight:300,cursor:isEmpty?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:isEmpty?0:1,boxShadow:isEmpty?"none":"0 2px 8px rgba(0,0,0,.35)",transition:"transform .08s,background .1s",fontFamily:"'Tajawal',sans-serif",letterSpacing:0,userSelect:"none"}}
              onClick={()=>{
                if(isEmpty)return;
                if(isDel){onChange(v=>typeof v==="function"?v("").slice(0,-1):(typeof v==="string"?v.slice(0,-1):""));return;}
                onChange(v=>{const cur=typeof v==="string"?v:(typeof v==="function"?v(""):v)||"";return cur.length<4?cur+key:cur;});
              }}
              onPointerDown={e=>{e.currentTarget.style.transform="scale(.91)";e.currentTarget.style.background=isEmpty?"transparent":isDel?"#253545":"#1E2F3E";}}
              onPointerUp={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.background=isEmpty?"transparent":isDel?"#1A2B3C":"#16222E";}}
              onPointerLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.background=isEmpty?"transparent":isDel?"#1A2B3C":"#16222E";}}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CHART COMPONENTS ─────────────────────────────────────────────────────────
function MiniBarChart({data,color}){
  const max=Math.max(...data.map(d=>d.amount),1);
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height:52,padding:"0 2px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{width:"100%",borderRadius:"4px 4px 0 0",background:d.current?color:`${color}44`,height:Math.max(4,Math.round((d.amount/max)*48)),transition:"height .4s ease"}}/>
          <span style={{fontSize:9,color:d.current?"#E8F0FE":"#4A6070",fontWeight:d.current?700:400,whiteSpace:"nowrap"}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function RadialProgress({pct,size=80,color="#38A169"}){
  const r=30,circ=2*Math.PI*r,dash=circ*(Math.min(pct,100)/100);
  return(
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1A2B3C" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:13,fontWeight:900,color:"#E8F0FE"}}>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [headPin,  setHeadPin]  = useState(()=>LS.get("hp_v10",""));
  const [houses,   setHouses]   = useState(()=>{
    // Load + immediately fix any duplicate IDs at init time
    const raw = LS.get("houses_v10",[]);
    const seen = new Set();
    return raw.map(h => {
      if (!seen.has(h.id)) { seen.add(h.id); return h; }
      return { ...h, id: Math.random().toString(36).slice(2,9)+Date.now().toString(36) };
    });
  });
  const [lists,    setLists]    = useState(()=>LS.get("lists_v10",{}));
  const [saved,    setSaved]    = useState(()=>LS.get("saved_v10",{}));
  // orders: {id, houseId, houseName, houseIcon, houseColor, items[], status:'active'|'archived', checked:{}, totalAmount, budgetMonth, sentAt, editedAt, archivedAt, reply, read}
  const [orders,   setOrders]   = useState(()=>LS.get("orders_v10",[]));
  // draft: { [houseId]: {items:[]} } — current draft being built (separate from sent orders)
  const [drafts,   setDrafts]   = useState(()=>LS.get("drafts_v10",{}));
  const [catalog,  setCatalog]  = useState(()=>LS.get("catalog_v10",DEFAULT_CAT));
  const [budgets,  setBudgets]  = useState(()=>LS.get("budgets_v10",{}));

  const [screen,       setScreen]     = useState("splash");
  const [role,         setRole]       = useState(null);
  const [pinTarget,    setPinTarget]  = useState(null);
  const [pinVal,       setPinVal]     = useState("");
  const [pinErr,       setPinErr]     = useState(false);
  const [activeHouse,  setActiveHouse]= useState(null);
  const [toast,        setToast]      = useState(null);
  const [modal,        setModal]      = useState(null);
  const [headTab,      setHeadTab]    = useState("active"); // active|archived|budget
  const [houseTab,     setHouseTab]   = useState("draft");  // draft|sent|budget
  const [settingsTab,  setSettingsTab]= useState("houses");
  const [budgetMonth,  setBudgetMonth]= useState(()=>getMonthKey());
  const [houseBudgetMonth,setHouseBudgetMonth]=useState(()=>getMonthKey());

  // Add/edit item (for draft or order)
  const [addMode,     setAddMode]    = useState(false);
  const [editItem,    setEditItem]   = useState(null);
  const [editInOrder, setEditInOrder]= useState(null); // orderId if editing inside sent order
  const [search,      setSearch]     = useState("");
  const [selCat,      setSelCat]     = useState(null);
  const [picked,      setPicked]     = useState(null);
  const [qty,         setQty]        = useState("1");
  const [unit,        setUnit]       = useState("قطعة");
  const [pri,         setPri]        = useState("medium");
  const [note,        setNote]       = useState("");

  const [filterCat,   setFilterCat]  = useState("الكل");
  const [houseForm,   setHouseForm]  = useState({id:null,name:"",pin:"",icon:"🏠",color:"#1B5E3B"});
  const [showHF,      setShowHF]     = useState(false);
  const [settingHP,   setSettingHP]  = useState(false);
  const [newHP,       setNewHP]      = useState("");
  const [editSaved,   setEditSaved]  = useState(null);
  const [openCat,     setOpenCat]    = useState(null);
  const [newCatName,  setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji]= useState("🛒");
  const [showEmojiPick,setShowEmojiPick]=useState(false);
  const [newItemName, setNewItemName]= useState("");
  const [renameCat,   setRenameCat]  = useState(null);
  const searchRef = useRef(null);
  const backupFileRef = useRef(null);

  // ── REQUEST NOTIFICATION PERMISSION ──
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => {
        Notification.requestPermission().catch(()=>{});
      }, 3000);
    }
  }, []);

  useEffect(()=>LS.set("hp_v10",headPin),[headPin]);
  useEffect(()=>LS.set("houses_v10",houses),[houses]);
  useEffect(()=>LS.set("lists_v10",lists),[lists]);
  useEffect(()=>LS.set("saved_v10",saved),[saved]);
  useEffect(()=>LS.set("orders_v10",orders),[orders]);
  useEffect(()=>LS.set("drafts_v10",drafts),[drafts]);
  useEffect(()=>LS.set("catalog_v10",catalog),[catalog]);
  useEffect(()=>LS.set("budgets_v10",budgets),[budgets]);

  // ── CLOUD SYNC ────────────────────────────────────────────────────────────────
  // "global" doc = shared between ALL devices: houses, orders, catalog, budgets, headPin
  // "local-{houseId}" doc = per-house: lists, saved, drafts (written only by that house)

  const eqJSON = (a,b) => JSON.stringify(a) === JSON.stringify(b);

  // Push GLOBAL shared data (debounced 1.5s)
  const pushGlobal = useCallback(debounce((data) => {
    saveToCloud("global", data);
  }, 1500), []);

  useEffect(() => {
    pushGlobal({ houses, orders, catalog, budgets, headPin });
  }, [houses, orders, catalog, budgets, headPin]);

  // Push per-house local data when a house is active
  const pushLocal = useCallback(debounce((hid, data) => {
    if (hid) saveToCloud("local-" + hid, data);
  }, 1500), []);

  useEffect(() => {
    if (activeHouse) {
      pushLocal(activeHouse, {
        lists: { [activeHouse]: lists[activeHouse]||[] },
        saved: { [activeHouse]: saved[activeHouse]||[] },
        drafts: { [activeHouse]: drafts[activeHouse]||{items:[]} },
      });
    }
  }, [lists, saved, drafts, activeHouse]);

  // Listen to GLOBAL doc (all devices)
  const [cloudReady, setCloudReady] = useState(false);
  useEffect(() => {
    const unsub = listenToCloud("global", (data) => {
      if (!data) { setCloudReady(true); return; }
      if (data.houses && !eqJSON(data.houses, houses)) {
        const seen = new Set();
        const cleaned = data.houses.map(h => {
          if (!seen.has(h.id)) { seen.add(h.id); return h; }
          return { ...h, id: Math.random().toString(36).slice(2,9)+Date.now().toString(36) };
        });
        setHouses(cleaned);
      }
      // ── NOTIFICATION DETECTION ──
      if (data.orders && !eqJSON(data.orders, orders)) {
        // Detect new orders (for head)
        if (cloudReady && role === "head") {
          const newOrders = data.orders.filter(o => 
            o.status === "active" && 
            !orders.find(existing => existing.id === o.id)
          );
          if (newOrders.length > 0) {
            try {
              navigator.vibrate && navigator.vibrate([200, 100, 200]);
              if (Notification.permission === "granted") {
                new Notification("🛒 طلب جديد", {
                  body: `طلب جديد من ${newOrders[0].houseName} (${newOrders[0].items.length} منتج)`,
                  icon: "/icon-192.png",
                  tag: "new-order"
                });
              }
            } catch(e){}
          }
        }
        // Detect new replies (for house)
        if (cloudReady && role && role.startsWith("house:")) {
          const houseId = role.split(":")[1];
          const myOrders = data.orders.filter(o => o.houseId === houseId);
          const newReplies = myOrders.filter(o => {
            const oldOrder = orders.find(existing => existing.id === o.id);
            return o.reply && (!oldOrder || oldOrder.reply !== o.reply);
          });
          if (newReplies.length > 0) {
            try {
              navigator.vibrate && navigator.vibrate([100, 50, 100, 50, 100]);
              if (Notification.permission === "granted") {
                new Notification("💬 رسالة من رب الأسرة", {
                  body: newReplies[0].reply,
                  icon: "/icon-192.png",
                  tag: "new-reply"
                });
              }
            } catch(e){}
          }
        }
        setOrders(data.orders);
      }
      if (data.catalog && !eqJSON(data.catalog, catalog)) setCatalog(data.catalog);
      if (data.budgets && !eqJSON(data.budgets, budgets)) setBudgets(data.budgets);
      if (data.headPin && data.headPin !== headPin)        setHeadPin(data.headPin);
      setCloudReady(true);
    });
    return () => unsub();
  }, []);

  // Listen to per-house local doc when active house changes
  useEffect(() => {
    if (!activeHouse) return;
    const unsub = listenToCloud("local-" + activeHouse, (data) => {
      if (!data) return;
      if (data.lists?.[activeHouse]  && !eqJSON(data.lists[activeHouse],  lists[activeHouse]))  setLists(p=>({...p,[activeHouse]:data.lists[activeHouse]}));
      if (data.saved?.[activeHouse]  && !eqJSON(data.saved[activeHouse],  saved[activeHouse]))  setSaved(p=>({...p,[activeHouse]:data.saved[activeHouse]}));
      if (data.drafts?.[activeHouse] && !eqJSON(data.drafts[activeHouse], drafts[activeHouse])) setDrafts(p=>({...p,[activeHouse]:data.drafts[activeHouse]}));
    });
    return () => unsub();
  }, [activeHouse]);

  // ── FIX DUPLICATE HOUSE IDs ────────────────────────────────────────────────
  // If two or more houses share the same ID (sync collision), give each a fresh ID
  // and clear orders/drafts/lists/saved/budgets for the new IDs (start fresh).
  useEffect(() => {
    const seen = new Set();
    let changed = false;
    const fixed = houses.map(h => {
      if (!seen.has(h.id)) {
        seen.add(h.id);
        return h;
      }
      changed = true;
      return { ...h, id: uid() }; // fresh unique id
    });
    if (changed) {
      setHouses(fixed);
    }
  }, [houses.length]);

  const toast$=(msg,err=false)=>{setToast({msg,err});setTimeout(()=>setToast(null),2700);};
  const house    = houses.find(h=>h.id===activeHouse);
  const draft    = drafts[activeHouse]||{items:[]};
  const draftItems = draft.items||[];
  const filtDraft= filterCat==="الكل"?draftItems:draftItems.filter(i=>i.category===filterCat);
  const draftCats= ["الكل",...new Set(draftItems.map(i=>i.category))];

  const activeOrders   = orders.filter(o=>o.status==="active");
  const archivedOrders = orders.filter(o=>o.status==="archived");
  const unread = activeOrders.filter(o=>!o.read).length;
  const mySentOrders   = hid=>orders.filter(o=>o.houseId===hid&&o.status==="active");
  const myArchivedOrders=hid=>orders.filter(o=>o.houseId===hid&&o.status==="archived");
  const ALL_ITEMS = Object.entries(catalog).flatMap(([cat,items])=>items.map(n=>({name:n,cat})));

  // ── BUDGET ───────────────────────────────────────────────────────────────────
  const budgetData = useMemo(()=>{
    const result={};
    orders.filter(o=>o.totalAmount>0).forEach(o=>{
      const mk=o.budgetMonth||getMonthKey();
      if(!result[o.houseId])result[o.houseId]={};
      if(!result[o.houseId][mk])result[o.houseId][mk]={spent:0,orders:[]};
      result[o.houseId][mk].spent+=parseFloat(o.totalAmount)||0;
      result[o.houseId][mk].orders.push(o);
    });
    return result;
  },[orders]);

  const getAllMonths=()=>{const m=new Set([getMonthKey()]);houses.forEach(h=>(budgetData[h.id]?Object.keys(budgetData[h.id]):[]).forEach(k=>m.add(k)));return[...m].sort().reverse();};
  const getMonthsForHouse=hid=>{const m=new Set([getMonthKey()]);(budgetData[hid]?Object.keys(budgetData[hid]):[]).forEach(k=>m.add(k));return[...m].sort().reverse();};
  const getLast6=hid=>Array.from({length:6},(_,i)=>{const d=new Date(new Date().getFullYear(),new Date().getMonth()-5+i,1);const mk=getMonthKey(d);return{label:MONTHS_AR[d.getMonth()].slice(0,3),amount:budgetData[hid]?.[mk]?.spent||0,current:mk===getMonthKey()};});
  const getBudgetLimit=hid=>budgets[hid]?.monthlyLimit||0;
  const setMonthlyLimit=(hid,limit)=>{setBudgets(p=>({...p,[hid]:{...p[hid],monthlyLimit:parseFloat(limit)||0}}));toast$("✅ تم حفظ الميزانية");};
  const setOrderAmount=(orderId,amount,month)=>{setOrders(p=>p.map(o=>o.id===orderId?{...o,totalAmount:parseFloat(amount)||0,budgetMonth:month||getMonthKey()}:o));toast$("💰 تم تسجيل المبلغ");};

  // ── PIN ───────────────────────────────────────────────────────────────────────
  const askPin=(type,h=null)=>{setPinTarget({type,house:h});setPinVal("");setPinErr(false);setScreen("pin");};
  useEffect(()=>{
    if(pinVal.length!==4)return;
    setTimeout(()=>{
      if(pinTarget?.type==="head"){
        if(!headPin){setHeadPin(pinVal);setRole("head");setScreen("head");toast$("✅ تم تعيين الرقم السري");setPinVal("");return;}
        if(pinVal===headPin){setRole("head");setScreen("head");setPinVal("");}
        else{setPinErr(true);setTimeout(()=>{setPinVal("");setPinErr(false);},700);}
      }else{
        const h=pinTarget?.house;
        if(h&&(!h.pin||pinVal===h.pin)){setActiveHouse(h.id);setRole(`house:${h.id}`);setHouseTab("draft");setScreen("house");setPinVal("");}
        else{setPinErr(true);setTimeout(()=>{setPinVal("");setPinErr(false);},700);}
      }
    },130);
  },[pinVal]);

  // ── SEARCH ────────────────────────────────────────────────────────────────────
  const searchRes=search.trim()?ALL_ITEMS.filter(i=>i.name.includes(search.trim())||i.cat.includes(search.trim())).slice(0,24):selCat?ALL_ITEMS.filter(i=>i.cat===selCat).slice(0,40):[];

  const openAdd=(item=null,orderId=null)=>{
    setEditItem(item);setEditInOrder(orderId);
    if(item){setPicked({name:item.name,cat:item.category});setQty(item.qty);setUnit(item.unit);setPri(item.priority);setNote(item.note||"");}
    else{setPicked(null);setQty("1");setUnit("قطعة");setPri("medium");setNote("");}
    setSearch("");setSelCat(null);setAddMode(true);
    setTimeout(()=>searchRef.current?.focus(),220);
  };

  const submitItem=()=>{
    const name=picked?.name||search.trim();
    if(!name)return toast$("اختر أو اكتب اسم المنتج","err");
    const cat=picked?.cat||selCat||"أخرى";

    if(editInOrder){
      // Editing inside a SENT order
      setOrders(p=>p.map(o=>{
        if(o.id!==editInOrder)return o;
        const items=editItem?o.items.map(i=>i.id===editItem.id?{...i,name,category:cat,qty,unit,priority:pri,note}:i):[...o.items,{id:uid(),name,category:cat,qty,unit,priority:pri,note,addedAt:ts()}];
        return{...o,items,editedAt:ts()};
      }));
      toast$(editItem?"✏️ تم التعديل في الطلب":"✅ أُضيف للطلب");
    }else if(editItem&&!editInOrder){
      // Editing inside DRAFT
      setDrafts(p=>({...p,[activeHouse]:{...p[activeHouse],items:(p[activeHouse]?.items||[]).map(i=>i.id===editItem.id?{...i,name,category:cat,qty,unit,priority:pri,note}:i)}}));
      toast$("✏️ تم التعديل");
    }else{
      // Adding to DRAFT
      const ni={id:uid(),name,category:cat,qty,unit,priority:pri,note,addedAt:ts()};
      setDrafts(p=>({...p,[activeHouse]:{items:[ni,...(p[activeHouse]?.items||[])]}}));
      toast$("✅ تمت الإضافة للطلب الجديد");
    }
    setAddMode(false);setEditItem(null);setEditInOrder(null);setPicked(null);setSearch("");setSelCat(null);
  };

  // ── DRAFT ACTIONS ─────────────────────────────────────────────────────────────
  const deleteDraftItem=id=>{setDrafts(p=>({...p,[activeHouse]:{items:(p[activeHouse]?.items||[]).filter(i=>i.id!==id)}}));toast$("🗑️ حُذف");};
  const clearDraft=()=>{setDrafts(p=>({...p,[activeHouse]:{items:[]}}));toast$("🗑️ تم مسح الطلب");};

  // ── SEND ORDER (creates a new independent order from draft) ────────────────────
  const sendOrder=()=>{
    if(!draftItems.length)return toast$("أضف منتجات أولاً","err");
    if(!headPin)return toast$("لم يُعيَّن رقم رب الأسرة","err");
    const order={id:uid(),houseId:activeHouse,houseName:house?.name,houseIcon:house?.icon,houseColor:house?.color,items:[...draftItems],sentAt:ts(),read:false,status:"active",checked:{},reply:"",editedAt:null,archivedAt:null,totalAmount:0,budgetMonth:getMonthKey()};
    setOrders(p=>[order,...p]);
    // Clear the draft after sending
    setDrafts(p=>({...p,[activeHouse]:{items:[]}}));
    setHouseTab("sent");
    toast$("📤 أُرسل الطلب لرب الأسرة");
  };

  // ── ORDER CHECK (shared, synced) ──────────────────────────────────────────────
  const toggleOrderCheck=(orderId,itemId)=>{
    setOrders(p=>p.map(o=>{
      if(o.id!==orderId)return o;
      const checked={...(o.checked||{}),[itemId]:!(o.checked||{})[itemId]};
      const allDone=o.items.length>0&&o.items.every(i=>checked[i.id]);
      // Auto-archive when all items checked
      return{...o,checked,status:allDone?"archived":o.status,archivedAt:allDone?ts():o.archivedAt};
    }));
  };

  // ── ARCHIVE (head only → synced, house sees it as read-only archived) ─────────
  const archiveOrder=id=>{setOrders(p=>p.map(o=>o.id===id?{...o,status:"archived",archivedAt:ts(),read:true}:o));toast$("📦 أُرشف الطلب");};
  const restoreOrder=id=>{setOrders(p=>p.map(o=>o.id===id?{...o,status:"active",archivedAt:null}:o));toast$("🔄 استُعيد الطلب");};
  const deleteOrder=id=>{setOrders(p=>p.filter(o=>o.id!==id));setModal(null);toast$("🗑️ حُذف الطلب");};

  const deleteOrderItem=(orderId,itemId)=>{setOrders(p=>p.map(o=>o.id===orderId?{...o,items:o.items.filter(i=>i.id!==itemId),editedAt:ts()}:o));toast$("🗑️ حُذف");};

  // ── SAVED ─────────────────────────────────────────────────────────────────────
  const saveList=name=>{
    if(!draftItems.length)return toast$("الطلب فارغ","err");
    setSaved(p=>({...p,[activeHouse]:[{id:uid(),name,items:[...draftItems],at:ts()},...(p[activeHouse]||[])]}));
    toast$("💾 تم الحفظ");
  };
  const loadSaved=(e,mode)=>{
    const newItems=e.items.map(i=>({...i,id:uid()}));
    if(mode==="replace")setDrafts(p=>({...p,[activeHouse]:{items:newItems}}));
    else setDrafts(p=>({...p,[activeHouse]:{items:[...(p[activeHouse]?.items||[]),...newItems]}}));
    setModal(null);setEditSaved(null);toast$("📋 تم التحميل للطلب الجديد");
  };
  const deleteSavedItem=(entryId,itemId)=>{setSaved(p=>({...p,[activeHouse]:p[activeHouse].map(e=>e.id!==entryId?e:{...e,items:e.items.filter(i=>i.id!==itemId)})}));};

  // ── HOUSE CRUD ────────────────────────────────────────────────────────────────
  const saveHouseForm=()=>{
    if(!houseForm.name.trim())return toast$("اكتب اسم المنزل","err");
    if(houseForm.pin&&houseForm.pin.length!==4)return toast$("الرقم السري 4 أرقام","err");
    if(houseForm.id){setHouses(p=>p.map(h=>h.id===houseForm.id?{...h,...houseForm}:h));toast$("✅ تم التحديث");}
    else{const nh={id:uid(),...houseForm};setHouses(p=>[...p,nh]);setLists(p=>({...p,[nh.id]:[]}));toast$("🏠 تم الإضافة");}
    setShowHF(false);setHouseForm({id:null,name:"",pin:"",icon:"🏠",color:"#1B5E3B"});
  };
  const deleteHouse=h=>{setHouses(p=>p.filter(x=>x.id!==h.id));setLists(p=>{const n={...p};delete n[h.id];return n;});setSaved(p=>{const n={...p};delete n[h.id];return n;});setDrafts(p=>{const n={...p};delete n[h.id];return n;});setOrders(p=>p.filter(o=>o.houseId!==h.id));setBudgets(p=>{const n={...p};delete n[h.id];return n;});setModal(null);toast$("🗑️ حُذف المنزل");};

  // ── CATALOG ───────────────────────────────────────────────────────────────────
  const addCategory=()=>{const name=(newCatEmoji+" "+newCatName.trim()).trim();if(!newCatName.trim())return toast$("اكتب اسم الفئة","err");if(catalog[name])return toast$("الفئة موجودة","err");setCatalog(p=>({...p,[name]:[]}));setNewCatName("");setNewCatEmoji("🛒");toast$("✅ تمت إضافة الفئة");};
  const deleteCategory=n=>{if(Object.keys(catalog).length<=1)return toast$("لا يمكن حذف الفئة الأخيرة","err");setCatalog(p=>{const x={...p};delete x[n];return x;});if(openCat===n)setOpenCat(null);toast$("🗑️ حُذفت الفئة");};
  const startRename=n=>{const p=n.split(" ");setRenameCat({old:n,newEmoji:p[0],newName:p.slice(1).join(" ")});};
  const confirmRename=()=>{if(!renameCat.newName.trim())return;const k=(renameCat.newEmoji+" "+renameCat.newName.trim()).trim();if(k!==renameCat.old&&catalog[k])return toast$("الاسم موجود","err");setCatalog(p=>{const n={};Object.entries(p).forEach(([key,v])=>{n[key===renameCat.old?k:key]=v;});return n;});if(openCat===renameCat.old)setOpenCat(k);setRenameCat(null);toast$("✅ تم");};
  const addItemToCat=n=>{if(!newItemName.trim())return toast$("اكتب اسم المنتج","err");if(catalog[n]?.includes(newItemName.trim()))return toast$("المنتج موجود","err");setCatalog(p=>({...p,[n]:[...p[n],newItemName.trim()]}));setNewItemName("");toast$("✅ أُضيف");};
  const deleteItemFromCat=(cn,name)=>setCatalog(p=>({...p,[cn]:p[cn].filter(i=>i!==name)}));
  const renameItemInCat=(cn,old,nw)=>{if(!nw.trim()||catalog[cn]?.includes(nw.trim()))return;setCatalog(p=>({...p,[cn]:p[cn].map(i=>i===old?nw.trim():i)}));toast$("✅ تم");};

  // ── BACKUP ────────────────────────────────────────────────────────────────────
  const handleBackup=()=>{
    const data={version:"maqadi_v10",createdAt:new Date().toISOString(),headPin,houses,lists,saved,orders,drafts,catalog,budgets};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=`مقاضي-${new Date().toISOString().slice(0,10)}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);toast$("💾 تم حفظ النسخة الاحتياطية");
  };
  const handleRestore=file=>{
    const r=new FileReader();
    r.onload=e=>{try{
      const d=JSON.parse(e.target.result);
      if(!d.houses)throw new Error("invalid");
      if(d.headPin)setHeadPin(d.headPin);if(d.houses)setHouses(d.houses);if(d.lists)setLists(d.lists);if(d.saved)setSaved(d.saved);if(d.orders)setOrders(d.orders);if(d.drafts)setDrafts(d.drafts);if(d.catalog)setCatalog(d.catalog);if(d.budgets)setBudgets(d.budgets);
      toast$("✅ تمت الاستعادة");setModal(null);
    }catch{toast$("❌ ملف غير صالح","err");}};
    r.readAsText(file);
  };

  // ── EXPORTS ───────────────────────────────────────────────────────────────────
  const doExportPDF=o=>{const html=buildPrintHTML(o);const blob=new Blob([html],{type:"text/html;charset=utf-8"});const url=URL.createObjectURL(blob);const w=window.open(url,"_blank","noopener");if(!w){const a=document.createElement("a");a.href=url;a.download=`قائمة-${o.houseName}.html`;a.click();}else toast$("🖨️ استخدم طباعة المتصفح");setTimeout(()=>URL.revokeObjectURL(url),30000);};
  const doExportText=o=>{const t=buildText(o);if(navigator.share){navigator.share({title:`قائمة ${o.houseName}`,text:t}).catch(()=>{});return;}if(navigator.clipboard?.writeText){navigator.clipboard.writeText(t).then(()=>toast$("📋 نُسخت"));return;}const a=document.createElement("a");a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(t);a.download=`قائمة-${o.houseName}.txt`;a.click();};

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARED COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Order Checklist (read-only = no edit/delete buttons shown)
  const OrderChecklist=({order,allowEdit=false})=>{
    const g=groupByCat(order.items);const ck=order.checked||{};
    const bN=Object.values(ck).filter(Boolean).length;
    const pct=order.items.length?Math.round(bN/order.items.length*100):0;
    const col=order.houseColor||"#2D6A4F";
    return(<div>
      {order.items.length>0&&<div style={{padding:"10px 14px 6px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#8A9BAE",fontWeight:700}}>تم الشراء</span><span style={{fontSize:12,color:col,fontWeight:900}}>{bN}/{order.items.length} ({pct}%)</span></div><div style={{background:"#1A2B3C",borderRadius:8,height:8,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:8,transition:"width .4s"}}/></div></div>}
      <div style={{padding:"6px 12px"}}>
        {Object.entries(g).map(([cat,items])=>(
          <div key={cat} style={{marginBottom:8}}>
            <p style={{color:"#8A9BAE",fontSize:11,fontWeight:700,padding:"4px 0",borderBottom:"1px solid #1A2B3C",marginBottom:4}}>{cat}</p>
            {items.map(it=>{const checked=ck[it.id];return(
              <div key={it.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:"1px solid #0A1520",opacity:checked?.5:1,transition:"opacity .2s"}}>
                <button style={{background:"none",border:"none",fontSize:18,cursor:"pointer",flexShrink:0}} onClick={()=>toggleOrderCheck(order.id,it.id)}>{checked?"✅":"⬜"}</button>
                <span style={{width:8,height:8,borderRadius:"50%",background:PRI[it.priority].c,flexShrink:0,display:"inline-block"}}/>
                <span style={{flex:1,color:"#E8F0FE",fontSize:13,fontWeight:600,textDecoration:checked?"line-through":"none"}}>{it.name}</span>
                <span style={{color:"#8A9BAE",fontSize:12,flexShrink:0}}>{it.qty} {it.unit}</span>
                {allowEdit&&<>
                  <button style={{background:"#1A2B3C",border:"none",borderRadius:7,padding:"3px 6px",fontSize:12,cursor:"pointer"}} onClick={()=>openAdd(it,order.id)}>✏️</button>
                  <button style={{background:"#2A1A1A",border:"none",borderRadius:7,padding:"3px 6px",fontSize:12,cursor:"pointer"}} onClick={()=>deleteOrderItem(order.id,it.id)}>🗑️</button>
                </>}
              </div>
            );})}
          </div>
        ))}
        {allowEdit&&<button style={{width:"100%",background:"transparent",border:`1.5px dashed ${col}`,borderRadius:10,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer",color:col,marginTop:4}} onClick={()=>openAdd(null,order.id)}>＋ إضافة منتج للطلب</button>}
      </div>
    </div>);
  };

  // Amount panel (head only)
  function AmountPanel({order}){
    const [amt,setAmt]=useState(order.totalAmount>0?String(order.totalAmount):"");
    const [mon,setMon]=useState(order.budgetMonth||getMonthKey());
    return(
      <div style={{background:"#0A1520",borderRadius:12,padding:"12px 14px",border:"1px solid #1A2B3C",margin:"0 12px 12px"}}>
        <p style={{color:"#C8960C",fontSize:13,fontWeight:800,marginBottom:8}}>💰 تسجيل مبلغ الطلب</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:110}}>
            <label style={S.lbl}>المبلغ (ريال)</label>
            <input style={{...S.inp,fontSize:16,fontWeight:700,textAlign:"center"}} type="number" min="0" step="0.5" placeholder="0.00" value={amt} onChange={e=>setAmt(e.target.value)}/>
          </div>
          <div style={{flex:1,minWidth:110}}>
            <label style={S.lbl}>الشهر</label>
            <select style={S.sel} value={mon} onChange={e=>setMon(e.target.value)}>{getAllMonths().map(m=><option key={m} value={m}>{formatMonthKey(m)}</option>)}</select>
          </div>
        </div>
        <button style={{...S.bigBtn,background:"#C8960C",marginTop:10}} onClick={()=>setOrderAmount(order.id,amt,mon)}>💾 حفظ المبلغ</button>
        {order.totalAmount>0&&<p style={{color:"#38A169",fontSize:12,fontWeight:700,textAlign:"center",marginTop:8}}>✅ مسجّل: {fmt(order.totalAmount)} ريال — {formatMonthKey(order.budgetMonth||getMonthKey())}</p>}
      </div>
    );
  }

  // Full order card (head side - with all controls)
  const HeadOrderCard=({order,archived=false})=>{
    const col=order.houseColor||"#2D6A4F";
    return(
      <div style={{...S.orderCard,borderColor:archived?"#2A3A4A":col}}>
        <div style={{...S.orderHdr,background:archived?"linear-gradient(135deg,#1A2B3C,#1E2D3D)":`linear-gradient(135deg,${col},${col}BB)`}}>
          <div>
            <span style={{color:"#fff",fontWeight:900,fontSize:15}}>{order.houseIcon} {order.houseName}</span>
            {order.editedAt&&<p style={{color:"rgba(255,255,255,.65)",fontSize:11,margin:"2px 0 0"}}>🔄 عُدّل {order.editedAt}</p>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
            <span style={{color:"rgba(255,255,255,.7)",fontSize:11}}>{order.sentAt}</span>
            {order.totalAmount>0&&<span style={{...S.stBadge,background:"#C8960C"}}>💰 {fmt(order.totalAmount)} ر</span>}
            {archived&&<span style={{...S.stBadge,background:"#38A169"}}>📦 مؤرشف</span>}
          </div>
        </div>
        {/* Reply note appears IMMEDIATELY after header for visibility */}
        {order.reply&&(
          <div style={{background:"linear-gradient(135deg,#3D2A0A,#2A1E08)",padding:"12px 14px",borderBottom:"2px solid #C8960C",display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:20,flexShrink:0}}>💬</span>
            <div style={{flex:1}}>
              <p style={{color:"#FFD580",fontSize:11,fontWeight:800,marginBottom:3}}>ملاحظتك للأسرة</p>
              <p style={{color:"#FFF",fontSize:14,lineHeight:1.6,fontWeight:600}}>{order.reply}</p>
            </div>
          </div>
        )}
        <OrderChecklist order={order} allowEdit={!archived}/>
        {!archived&&<AmountPanel order={order}/>}
        {!archived&&(
          <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:8}}>
            <input style={S.replyInp} placeholder={order.reply?"تعديل الملاحظة...":"اكتب ملاحظة للأسرة..."} defaultValue={order.reply}
              onBlur={e=>setOrders(p=>p.map(o=>o.id===order.id?{...o,reply:e.target.value}:o))}/>
            <div style={{display:"flex",gap:6}}>
              <button style={{...S.expBtn,background:"#1A6B8A",flex:3}} onClick={()=>doExportPDF(order)}>🖨️ PDF</button>
              <button style={{...S.expBtn,background:"#2D6A4F",flex:3}} onClick={()=>doExportText(order)}>📋 مشاركة</button>
              <button style={{...S.expBtn,background:"#5C3700",flex:2}} onClick={()=>archiveOrder(order.id)}>📦 أرشفة</button>
              <button style={{...S.expBtn,background:"#4A1A1A",flex:1}} onClick={()=>setModal({type:"delOrder",id:order.id})}>🗑️</button>
            </div>
          </div>
        )}
        {archived&&(
          <div style={{padding:"0 12px 12px",display:"flex",gap:6}}>
            <button style={{...S.expBtn,background:"#1A6B8A",flex:3}} onClick={()=>doExportPDF(order)}>🖨️ PDF</button>
            <button style={{...S.expBtn,background:"#2D3F6B",flex:3}} onClick={()=>restoreOrder(order.id)}>🔄 استعادة</button>
            <button style={{...S.expBtn,background:"#4A1A1A",flex:1}} onClick={()=>setModal({type:"delOrder",id:order.id})}>🗑️</button>
          </div>
        )}
      </div>
    );
  };

  // House sent order card (can edit active, read-only archived)
  const HouseSentOrderCard=({order})=>{
    const col=house?.color||"#2D6A4F";
    const archived=order.status==="archived";
    return(
      <div style={{...S.orderCard,borderColor:archived?"#2A3A4A44":col}}>
        <div style={{...S.orderHdr,background:archived?"linear-gradient(135deg,#1A2B3C,#222F3A)":`linear-gradient(135deg,${col},${col}BB)`}}>
          <div>
            <span style={{color:"#fff",fontWeight:800,fontSize:14}}>
              {archived?"📦 مؤرشف · ":"📤 "}{order.sentAt}
            </span>
            {order.editedAt&&<p style={{color:"rgba(255,255,255,.65)",fontSize:11,margin:"2px 0 0"}}>🔄 عُدّل {order.editedAt}</p>}
            {archived&&<p style={{color:"rgba(255,255,255,.55)",fontSize:10,margin:"2px 0 0"}}>للاطلاع فقط — لا يمكن التعديل</p>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
            {order.totalAmount>0&&<span style={{...S.stBadge,background:"#C8960C"}}>💰 {fmt(order.totalAmount)} ر</span>}
            {order.reply&&<span style={{...S.stBadge,background:"#1A6B8A"}}>💬 رد</span>}
          </div>
        </div>
        {order.reply&&(
          <div style={{background:"linear-gradient(135deg,#1A2B3C,#162030)",padding:"10px 14px",borderBottom:"1px solid #0A1520",display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0}}>💬</span>
            <div>
              <p style={{color:"#C8960C",fontSize:11,fontWeight:700,marginBottom:2}}>ملاحظة رب الأسرة</p>
              <p style={{color:"#E8F0FE",fontSize:13,lineHeight:1.5}}>{order.reply}</p>
            </div>
          </div>
        )}
        {/* Checklist — always allow toggling checkmarks, but no add/edit/delete if archived */}
        <OrderChecklist order={order} allowEdit={!archived}/>
        {!archived&&(
          <div style={{padding:"0 12px 12px",display:"flex",gap:6}}>
            <button style={{...S.expBtn,background:"#1A6B8A",flex:1}} onClick={()=>doExportText(order)}>📋 مشاركة</button>
          </div>
        )}
      </div>
    );
  };


  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return(
    <div style={S.root}>
      <style>{CSS}</style>
      {toast&&<div style={{...S.toast,background:toast.err?"#C53030":"#1B4332"}} className="an-up">{toast.msg}</div>}

      {/* ══ SPLASH ══ */}
      {screen==="splash"&&(
        <div style={S.splash}>
          <div style={S.glow}/>
          <div style={{fontSize:78,filter:"drop-shadow(0 10px 32px #1B5E3B88)"}}>🛒</div>
          <h1 style={S.splashH}>مقاضي</h1>
          <p style={S.splashSub}>نظّم احتياجات منزلك بذكاء</p>
          <div style={{width:"100%",maxWidth:340,marginTop:36,display:"flex",flexDirection:"column",gap:10}}>
            <button style={{...S.bigBtn,background:"linear-gradient(135deg,#92700A,#C8960C)",boxShadow:"0 6px 24px #C8960C44"}} onClick={()=>askPin("head")}>
              <span style={{fontSize:22}}>👨‍👩‍👧‍👦</span><span>حساب رب الأسرة</span>
              {unread>0&&<span style={S.badge}>{unread}</span>}
            </button>
            {houses.length>0&&<div style={S.divider}><span style={S.divTx}>— المنازل —</span></div>}
            {houses.map(h=>(
              <button key={h.id} style={{...S.houseCard,background:`linear-gradient(135deg,${h.color},${h.color}CC)`}} onClick={()=>askPin("house",h)} className="an-up">
                <span style={{fontSize:26}}>{h.icon}</span>
                <div style={{flex:1,textAlign:"right"}}><p style={S.hcName}>{h.name}</p><p style={S.hcMeta}>{drafts[h.id]?.items?.length||0} منتج في الطلب الجديد{h.pin?" · 🔒":""}</p></div>
                {mySentOrders(h.id).length>0&&<span style={S.liveDot}/>}
                <span style={{fontSize:17,opacity:.4}}>←</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ PIN ══ */}
      {screen==="pin"&&(
        <div style={S.pinScreen}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:300}}>
            <div style={{fontSize:52,marginBottom:8}}>{pinTarget?.type==="head"?"👨‍👩‍👧‍👦":pinTarget?.house?.icon}</div>
            <h2 style={S.pinH}>{pinTarget?.type==="head"?(headPin?"رب الأسرة":"رقم سري جديد"):pinTarget?.house?.name}</h2>
            <p style={S.pinSub}>{pinTarget?.type==="head"&&!headPin?"أنشئ رقماً سرياً":"أدخل الرقم السري"}</p>
            {pinErr&&<p style={{color:"#FC8181",fontSize:14,fontWeight:700,marginBottom:4,textAlign:"center"}} className="shake">رقم سري خاطئ ❌</p>}
            <PinPad value={pinVal} onChange={v=>setPinVal(p=>{const cur=typeof p==="string"?p:"";return typeof v==="function"?v(cur):(typeof v==="string"?v:cur);})} accent={pinTarget?.type==="head"?"#C8960C":pinTarget?.house?.color||"#2D6A4F"}/>
            <button style={S.backLink} onClick={()=>setScreen("splash")}>← رجوع</button>
          </div>
        </div>
      )}

      {/* ══ HEAD DASHBOARD ══ */}
      {screen==="head"&&(
        <div style={S.shell}>
          <div style={{...S.topBar,background:"linear-gradient(135deg,#92700A,#B8860B)"}}>
            <button style={S.tbBack} onClick={()=>setScreen("splash")}>←</button>
            <span style={S.tbTitle}>👨‍👩‍👧‍👦 رب الأسرة</span>
            <button style={S.tbAct} onClick={()=>setScreen("settings")}>⚙️</button>
          </div>
          <div style={{...S.tabsBar,overflowX:"auto",scrollbarWidth:"none"}}>
            {[{k:"active",l:"الطلبات النشطة"},{k:"archived",l:"الأرشيف"},{k:"budget",l:"💰 الميزانية"}].map(t=>(
              <button key={t.k} style={{...S.tabBtn,whiteSpace:"nowrap",...(headTab===t.k?{...S.tabActive,color:"#C8960C",borderColor:"#C8960C"}:{})}} onClick={()=>setHeadTab(t.k)}>
                {t.l}{t.k==="active"&&activeOrders.length>0&&<span style={S.tabBadge}>{activeOrders.length}</span>}
              </button>
            ))}
          </div>
          {headTab==="budget"
            ?<BudgetPanel isHead={true} houseColor="#C8960C" selMonth={budgetMonth} setSelMonth={setBudgetMonth} spent={houses.reduce((s,h)=>s+(budgetData[h.id]?.[budgetMonth]?.spent||0),0)} houses={houses} budgetData={budgetData} getBudgetLimit={getBudgetLimit} getLast6={getLast6} getAllMonths={getAllMonths} getMonthsForHouse={getMonthsForHouse} setMonthlyLimit={setMonthlyLimit} S={S}/>
            :<div style={S.scroll}>
              <div style={S.summGrid}>{houses.map(h=>{const p=mySentOrders(h.id).length;return(<div key={h.id} style={{...S.summCard,borderColor:h.color}}><span style={{fontSize:24}}>{h.icon}</span><p style={S.summName}>{h.name}</p><p style={{fontSize:12,marginTop:3,color:p>0?"#FC8181":"#8A9BAE"}}>{p>0?`${p} طلب`:"لا طلبات"}</p></div>);})}</div>
              {(headTab==="active"?activeOrders:archivedOrders).length===0
                ?<div style={S.empty}><span style={{fontSize:48}}>{headTab==="active"?"📭":"🗄️"}</span><p style={S.emptyT}>{headTab==="active"?"لا توجد طلبات نشطة":"الأرشيف فارغ"}</p></div>
                :headTab==="active"
                  ?activeOrders.map(order=><HeadOrderCard key={order.id} order={order} archived={false}/>)
                  :archivedOrders.map(order=>(
                    <ArchivedOrderCard key={order.id} order={order} isHead={true}
                      onExportPDF={doExportPDF} onExportText={doExportText}
                      onRestore={restoreOrder} onDelete={id=>setModal({type:"delOrder",id})}
                      toggleCheck={toggleOrderCheck}/>
                  ))
              }
            </div>
          }
        </div>
      )}

      {/* ══ HOUSE ══ */}
      {screen==="house"&&house&&(
        <div style={S.shell}>
          <div style={{...S.topBar,background:`linear-gradient(135deg,${house.color},${house.color}CC)`}}>
            <button style={S.tbBack} onClick={()=>setScreen("splash")}>←</button>
            <span style={S.tbTitle}>{house.icon} {house.name}</span>
            <button style={S.tbAct} onClick={()=>setScreen("saved")}>💾</button>
          </div>
          <div style={{...S.tabsBar,overflowX:"auto",scrollbarWidth:"none"}}>
            {[
              {k:"draft",l:"📋 طلب جديد",badge:draftItems.length,bc:house.color},
              {k:"sent",l:"📤 المرسلة",badge:mySentOrders(activeHouse).length,bc:"#D97706"},
              {k:"archived_house",l:"📦 المؤرشفة",badge:myArchivedOrders(activeHouse).length,bc:"#38A169"},
              {k:"budget",l:"💰 الميزانية"},
            ].map(t=>(
              <button key={t.k} style={{...S.tabBtn,whiteSpace:"nowrap",...(houseTab===t.k?{...S.tabActive,color:house.color,borderColor:house.color}:{})}} onClick={()=>setHouseTab(t.k)}>
                {t.l}{t.badge>0&&<span style={{...S.tabBadge,background:t.bc||house.color}}>{t.badge}</span>}
              </button>
            ))}
          </div>

          {/* DRAFT TAB */}
          {houseTab==="draft"&&(
            <div style={S.scroll}>
              {/* Stats */}
              <div style={S.statsRow}>
                {[{n:draftItems.length,l:"منتج"},{n:draftItems.filter(i=>i.priority==="high").length,l:"عاجل",c:house.color},{n:(saved[activeHouse]||[]).length,l:"محفوظة"},{n:mySentOrders(activeHouse).length,l:"مرسلة",c:"#D97706"}].map((st,i)=>(
                  <div key={i} style={{...S.statBox,...(st.c?{borderColor:st.c}:{})}}>
                    <span style={{...S.statN,...(st.c?{color:st.c}:{})}}>{st.n}</span>
                    <span style={S.statL}>{st.l}</span>
                  </div>
                ))}
              </div>
              <div style={S.actionRow}>
                <button style={{...S.actBtn,background:house.color,flex:1}} onClick={()=>openAdd()}>➕ إضافة</button>
                <button style={{...S.actBtn,background:"#1A6B8A",flex:1}} onClick={sendOrder}>📤 إرسال الطلب</button>
              </div>
              {draftItems.length>0&&<button style={{...S.actBtn,background:"#4A1A1A",width:"100%",marginBottom:10}} onClick={()=>setModal({type:"clearDraft"})}>🗑️ مسح الطلب الجديد</button>}
              {draftCats.length>1&&<div style={S.filterRow}>{draftCats.map(c=><button key={c} onClick={()=>setFilterCat(c)} style={{...S.filterPill,...(filterCat===c?{background:house.color,color:"#fff",borderColor:"transparent"}:{})}}>{c}</button>)}</div>}
              {filtDraft.length===0
                ?<div style={S.empty}><span style={{fontSize:52}}>📋</span><p style={S.emptyT}>الطلب الجديد فارغ</p><p style={S.emptyS}>اضغط ➕ لإضافة منتجات للطلب</p></div>
                :filtDraft.map(item=>(
                  <div key={item.id} style={S.itemRow}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:PRI[item.priority].c,flexShrink:0,display:"inline-block"}}/>
                        <span style={{fontSize:14,fontWeight:700,color:"#E8F0FE"}}>{item.name}</span>
                      </div>
                      <div style={S.chips}><span style={S.chip}>{item.qty} {item.unit}</span><span style={S.chip}>{item.category}</span>{item.note&&<span style={S.chip}>📝 {item.note}</span>}</div>
                    </div>
                    <button style={S.editBtn} onClick={()=>openAdd(item)}>✏️</button>
                    <button style={S.delBtn} onClick={()=>deleteDraftItem(item.id)}>🗑️</button>
                  </div>
                ))
              }
            </div>
          )}

          {/* SENT TAB */}
          {houseTab==="sent"&&(
            <div style={S.scroll}>
              {mySentOrders(activeHouse).length===0
                ?<div style={S.empty}><span style={{fontSize:52}}>📤</span><p style={S.emptyT}>لا توجد طلبات مرسلة</p><p style={S.emptyS}>اضغط "إرسال الطلب" من تبويب الطلب الجديد</p></div>
                :mySentOrders(activeHouse).map(order=><HouseSentOrderCard key={order.id} order={order}/>)
              }
            </div>
          )}

          {/* ARCHIVED TAB (house - read-only, collapsible) */}
          {houseTab==="archived_house"&&(
            <div style={S.scroll}>
              {myArchivedOrders(activeHouse).length===0
                ?<div style={S.empty}><span style={{fontSize:52}}>📦</span><p style={S.emptyT}>لا توجد طلبات مؤرشفة</p><p style={S.emptyS}>تظهر هنا الطلبات بعد اكتمال الشراء</p></div>
                :myArchivedOrders(activeHouse).map(order=>(
                  <ArchivedOrderCard key={order.id} order={order} houseColor={house.color} isHead={false}
                    onExportPDF={doExportPDF} onExportText={doExportText} toggleCheck={toggleOrderCheck}/>
                ))
              }
            </div>
          )}

          {/* BUDGET TAB */}
          {houseTab==="budget"&&house&&<BudgetPanel isHead={false} houseColor={house.color} houseId={activeHouse} selMonth={houseBudgetMonth} setSelMonth={setHouseBudgetMonth} spent={budgetData[activeHouse]?.[houseBudgetMonth]?.spent||0} houses={houses} budgetData={budgetData} getBudgetLimit={getBudgetLimit} getLast6={getLast6} getAllMonths={getAllMonths} getMonthsForHouse={getMonthsForHouse} setMonthlyLimit={setMonthlyLimit} S={S}/>}

          <div style={S.botNav}>
            <button style={S.navBtn} onClick={()=>setScreen("splash")}><span>🏠</span><span style={S.navL}>رئيسية</span></button>
            <button style={{...S.navCenter,background:house.color}} onClick={()=>openAdd()}><span style={{fontSize:28,color:"#fff",lineHeight:1}}>+</span></button>
            <button style={S.navBtn} onClick={()=>setScreen("saved")}><span>💾</span><span style={S.navL}>محفوظة</span></button>
          </div>
        </div>
      )}

      {/* ══ SAVED ══ */}
      {screen==="saved"&&house&&(
        <div style={S.shell}>
          <div style={{...S.topBar,background:`linear-gradient(135deg,${house.color},${house.color}CC)`}}>
            <button style={S.tbBack} onClick={()=>{setEditSaved(null);setScreen("house");}}>←</button>
            <span style={S.tbTitle}>{editSaved?"📋 "+editSaved.name:"💾 المحفوظة"}</span>
            <div style={{width:40}}/>
          </div>
          <div style={S.scroll}>
            {editSaved?(<>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <button style={{...S.bigBtn,background:house.color,flex:2}} onClick={()=>setModal({type:"loadSaved",entry:editSaved})}>📥 تحميل للطلب الجديد</button>
                <button style={{...S.actBtn,background:"#1E2D3D",flex:1}} onClick={()=>setEditSaved(null)}>↩ رجوع</button>
              </div>
              {editSaved.items.map(item=>(
                <div key={item.id} style={S.itemRow}>
                  <div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><span style={{width:8,height:8,borderRadius:"50%",background:PRI[item.priority].c,flexShrink:0,display:"inline-block"}}/><span style={{fontSize:14,fontWeight:700,color:"#E8F0FE"}}>{item.name}</span></div><div style={S.chips}><span style={S.chip}>{item.qty} {item.unit}</span><span style={S.chip}>{item.category}</span>{item.note&&<span style={S.chip}>📝 {item.note}</span>}</div></div>
                  <button style={S.editBtn} onClick={()=>setModal({type:"editSavedItem",entryId:editSaved.id,item})}>✏️</button>
                  <button style={S.delBtn} onClick={()=>{deleteSavedItem(editSaved.id,item.id);setEditSaved(p=>({...p,items:p.items.filter(i=>i.id!==item.id)}));}}>🗑️</button>
                </div>
              ))}
            </>):(<>
              <button style={{...S.bigBtn,background:house.color,marginBottom:14}} onClick={()=>{if(!draftItems.length)return toast$("الطلب الجديد فارغ","err");setModal({type:"saveName"});}}>💾 حفظ الطلب الجديد الحالي</button>
              {(saved[activeHouse]||[]).length===0?<div style={S.empty}><span style={{fontSize:48}}>💾</span><p style={S.emptyT}>لا توجد قوائم محفوظة</p></div>
              :(saved[activeHouse]||[]).map(e=>(
                <div key={e.id} style={S.savedCard}>
                  <div style={{flex:1}}><p style={S.savedName}>{e.name}</p><p style={S.savedMeta}>{e.items.length} منتج · {e.at}</p></div>
                  <button style={{...S.smBtn,background:"#1A6B8A"}} onClick={()=>setEditSaved(e)}>👁</button>
                  <button style={{...S.smBtn,background:house.color}} onClick={()=>setModal({type:"loadSaved",entry:e})}>📥</button>
                  <button style={{...S.smBtn,background:"#E53E3E"}} onClick={()=>{setSaved(p=>({...p,[activeHouse]:p[activeHouse].filter(x=>x.id!==e.id)}));toast$("🗑️ حُذف");}}>🗑️</button>
                </div>
              ))}
            </>)}
          </div>
        </div>
      )}

      {/* ══ SETTINGS ══ */}
      {screen==="settings"&&(
        <div style={S.shell}>
          <div style={{...S.topBar,background:"#1E2D3D"}}>
            <button style={S.tbBack} onClick={()=>setScreen(role==="head"?"head":"splash")}>←</button>
            <span style={S.tbTitle}>⚙️ الإعدادات</span>
            <div style={{width:40}}/>
          </div>
          <div style={{...S.tabsBar,overflowX:"auto",scrollbarWidth:"none"}}>
            {[{k:"houses",l:"🏠 المنازل"},{k:"catalog",l:"🗂️ الفئات"},{k:"backup",l:"💾 النسخ الاحتياطية"}].map(t=>(
              <button key={t.k} style={{...S.tabBtn,whiteSpace:"nowrap",...(settingsTab===t.k?{...S.tabActive,color:"#C8960C",borderColor:"#C8960C"}:{})}} onClick={()=>setSettingsTab(t.k)}>{t.l}</button>
            ))}
          </div>
          <div style={S.scroll}>
            {settingsTab==="houses"&&<>
              <p style={S.secLbl}>👨‍👩‍👧‍👦 رقم سري رب الأسرة</p>
              <div style={S.setCard}>
                <p style={S.setTitle}>الرقم السري لحسابك</p>
                <p style={S.setDesc}>{headPin?"●●●● مُعيَّن":"لم يُعيَّن بعد"}</p>
                <button style={{...S.smBtn,background:"#C8960C",marginTop:8}} onClick={()=>{setNewHP("");setSettingHP(true);}}>
                  {headPin?"تغيير الرقم السري":"تعيين رقم سري"}
                </button>
                {settingHP&&<div style={{background:"#0A1520",borderRadius:16,padding:"16px 12px",border:"1px solid #1A2B3C",marginTop:10}}>
                  <p style={{color:"#8A9BAE",fontSize:13,textAlign:"center",marginBottom:4}}>الرقم السري الجديد</p>
                  <PinPad value={newHP} onChange={v=>setNewHP(p=>{const cur=typeof p==="string"?p:"";return typeof v==="function"?v(cur):(typeof v==="string"?v:cur);})} accent="#C8960C"/>
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button style={{...S.smBtn,background:"#38A169",flex:1}} onClick={()=>{if(newHP.length!==4)return toast$("4 أرقام","err");setHeadPin(newHP);setSettingHP(false);setNewHP("");toast$("✅ تم");}}>حفظ</button>
                    <button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>{setSettingHP(false);setNewHP("");}}>إلغاء</button>
                  </div>
                </div>}
              </div>
              <p style={S.secLbl}>🏠 المنازل</p>
              <div style={{...S.setCard,background:"#0D1A26",borderColor:"#C8960C44",marginBottom:12}}>
                <p style={{color:"#C8960C",fontSize:13,fontWeight:700}}>⚙️ إدارة المنازل من صلاحية رب الأسرة حصراً</p>
              </div>
              {houses.map(h=>(
                <div key={h.id} style={{...S.setCard,borderRight:`4px solid ${h.color}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:26}}>{h.icon}</span>
                    <div style={{flex:1}}><p style={S.setTitle}>{h.name}</p><p style={S.setDesc}>{h.pin?"🔒 محمي":"🔓 مفتوح"}</p></div>
                    <button style={{...S.smBtn,background:h.color}} onClick={()=>{setHouseForm({...h,pin:h.pin||""});setShowHF(true);}}>✏️</button>
                    <button style={{...S.smBtn,background:"#E53E3E"}} onClick={()=>setModal({type:"deleteHouse",house:h})}>🗑️</button>
                  </div>
                </div>
              ))}
              {!showHF
                ?<button style={{...S.bigBtn,background:"#1B5E3B",marginTop:8}} onClick={()=>{setHouseForm({id:null,name:"",pin:"",icon:"🏠",color:"#1B5E3B"});setShowHF(true);}}>＋ إضافة منزل</button>
                :<HouseFormPanel/>
              }
            </>}

            {settingsTab==="catalog"&&<CatalogPanel/>}

            {settingsTab==="backup"&&<>
              <p style={S.secLbl}>💾 النسخ الاحتياطية</p>
              <div style={{...S.setCard,borderColor:"#38A16944",marginBottom:14}}>
                <p style={{...S.setTitle,color:"#38A169"}}>📥 إنشاء نسخة احتياطية</p>
                <p style={{...S.setDesc,marginBottom:12}}>حفظ جميع البيانات: المنازل، الفئات، القوائم، الميزانيات، الطلبات.</p>
                <button style={{...S.bigBtn,background:"#38A169"}} onClick={handleBackup}>💾 تحميل النسخة الاحتياطية</button>
              </div>
              <div style={{...S.setCard,borderColor:"#1A6B8A44"}}>
                <p style={{...S.setTitle,color:"#4FC3F7"}}>📤 استعادة نسخة احتياطية</p>
                <p style={{...S.setDesc,marginBottom:12}}>ستستبدل جميع البيانات الحالية.</p>
                <button style={{...S.bigBtn,background:"#1A6B8A"}} onClick={()=>backupFileRef.current?.click()}>📂 اختر ملف النسخة الاحتياطية</button>
                <input ref={backupFileRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setModal({type:"confirmRestore",file:f});e.target.value="";}}/>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* ══ ADD SHEET ══ */}
      {addMode&&(
        <div style={S.overlay} onClick={()=>setAddMode(false)}>
          <div style={S.sheet} onClick={e=>e.stopPropagation()} className="an-sheet">
            <div style={S.shHandle}/>
            <h3 style={S.shTitle}>{editItem?(editInOrder?"✏️ تعديل في الطلب المرسل":"✏️ تعديل في الطلب الجديد"):editInOrder?"➕ إضافة للطلب المرسل":"➕ إضافة للطلب الجديد"}</h3>
            {picked&&<div style={{...S.pickedBadge,background:house?.color||"#C8960C"}}>✅ {picked.name}<button style={S.pickedX} onClick={()=>{setPicked(null);setTimeout(()=>searchRef.current?.focus(),100);}}>✕</button></div>}
            {!picked&&!editItem&&(<>
              <div style={S.searchWrap}><span style={{fontSize:18,flexShrink:0,opacity:.5}}>🔍</span><input ref={searchRef} style={S.searchInp} placeholder="ابحث: دجاج، منظف، طماطم..." value={search} onChange={e=>{setSearch(e.target.value);setSelCat(null);}}/>{search&&<button style={S.searchX} onClick={()=>setSearch("")}>✕</button>}</div>
              {search?(<div style={S.resList}>
                {searchRes.length===0?<div style={{padding:12,textAlign:"center"}}><p style={{color:"#8A9BAE",fontSize:13}}>لم يُعثر عليه</p><button style={{...S.smBtn,background:house?.color||"#2D6A4F",marginTop:8}} onClick={()=>setPicked({name:search,cat:"أخرى"})}>إضافة "{search}"</button></div>
                :searchRes.map((it,i)=><button key={i} style={S.resRow} onClick={()=>{setPicked(it);setSearch("");}}><span style={{color:"#E8F0FE",fontSize:14,fontWeight:700}}>{it.name}</span><span style={{color:"#8A9BAE",fontSize:11}}>{it.cat}</span></button>)}
              </div>):(<>
                <p style={S.lbl}>أو اختر من الفئات</p>
                <div style={S.catScroll}>{Object.keys(catalog).map(c=><button key={c} style={{...S.catPill,...(selCat===c?{background:house?.color||"#2D6A4F",color:"#fff",borderColor:"transparent"}:{})}} onClick={()=>setSelCat(selCat===c?null:c)}>{c}</button>)}</div>
                {selCat&&<div style={S.catItems}>{(catalog[selCat]||[]).map((name,i)=><button key={i} style={S.catItemBtn} onClick={()=>setPicked({name,cat:selCat})}>{name}</button>)}</div>}
              </>)}
            </>)}
            {(picked||editItem)&&<div style={S.detBox}>
              <div style={S.twoCol}><div style={{flex:1}}><label style={S.lbl}>الكمية</label><input style={S.inp} type="number" min="0.5" step="0.5" value={qty} onChange={e=>setQty(e.target.value)}/></div><div style={{flex:1}}><label style={S.lbl}>الوحدة</label><select style={S.sel} value={unit} onChange={e=>setUnit(e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div></div>
              <label style={S.lbl}>الأولوية</label>
              <div style={S.priRow}>{Object.entries(PRI).map(([k,v])=><button key={k} style={{...S.priBtn,...(pri===k?{background:v.c,color:"#fff",borderColor:"transparent"}:{})}} onClick={()=>setPri(k)}>{v.l}</button>)}</div>
              <label style={S.lbl}>ملاحظة (اختياري)</label>
              <input style={S.inp} placeholder="ماركة معينة أو ملاحظة..." value={note} onChange={e=>setNote(e.target.value)}/>
            </div>}
            <button style={{...S.bigBtn,background:house?.color||"#C8960C",marginTop:14}} onClick={submitItem}>{editItem?"✅ حفظ التعديل":editInOrder?"➕ إضافة للطلب المرسل":"➕ إضافة للطلب الجديد"}</button>
            <button style={S.ghostBtn} onClick={()=>setAddMode(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}
      {modal&&(
        <div style={S.overlay} onClick={()=>setModal(null)}>
          <div style={S.dialog} onClick={e=>e.stopPropagation()}>
            {modal.type==="saveName"&&(()=>{let n="";return(<><p style={S.dlgT}>💾 حفظ الطلب</p><input style={{...S.inp,marginTop:10}} placeholder="اسم الطلب..." autoFocus onChange={e=>n=e.target.value}/><div style={{display:"flex",gap:8,marginTop:10}}><button style={{...S.smBtn,background:"#2D6A4F",flex:1}} onClick={()=>{saveList(n||"طلب "+ts());setModal(null);}}>حفظ</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>);})()}
            {modal.type==="loadSaved"&&(<><p style={S.dlgT}>📥 "{modal.entry.name}"</p><p style={{color:"#8A9BAE",fontSize:13,marginTop:4}}>كيف تريد التحميل للطلب الجديد؟</p><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>loadSaved(modal.entry,"replace")}>استبدال</button><button style={{...S.smBtn,background:"#2D6A4F",flex:1}} onClick={()=>loadSaved(modal.entry,"merge")}>إضافة</button></div><button style={{...S.ghostBtn,marginTop:8}} onClick={()=>setModal(null)}>إلغاء</button></>)}
            {modal.type==="clearDraft"&&(<><p style={S.dlgT}>🗑️ مسح الطلب الجديد</p><p style={{color:"#8A9BAE",fontSize:13,marginTop:6}}>هل تريد مسح جميع المنتجات من الطلب الجديد؟</p><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>{clearDraft();setModal(null);}}>مسح</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>)}
            {modal.type==="deleteHouse"&&(<><p style={S.dlgT}>🗑️ حذف المنزل</p><p style={{color:"#8A9BAE",fontSize:13,marginTop:6}}>سيُحذف "{modal.house.name}" نهائياً.</p><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>deleteHouse(modal.house)}>حذف نهائي</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>)}
            {modal.type==="delOrder"&&(<><p style={S.dlgT}>🗑️ حذف الطلب</p><p style={{color:"#8A9BAE",fontSize:13,marginTop:6}}>هل أنت متأكد؟ لا يمكن التراجع.</p><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>deleteOrder(modal.id)}>حذف</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>)}
            {modal.type==="confirmRestore"&&(<><p style={S.dlgT}>⚠️ تأكيد الاستعادة</p><p style={{color:"#FC8181",fontSize:13,marginTop:6,lineHeight:1.6}}>ستُستبدل <strong>جميع</strong> البيانات الحالية.</p><div style={{display:"flex",gap:8,marginTop:14}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>handleRestore(modal.file)}>نعم، استعادة</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>)}
            {modal.type==="editSavedItem"&&(()=>{let q=modal.item.qty,u=modal.item.unit,nt=modal.item.note||"";return(<><p style={S.dlgT}>✏️ {modal.item.name}</p><div style={{display:"flex",gap:8,marginTop:10}}><div style={{flex:1}}><label style={S.lbl}>الكمية</label><input style={S.inp} type="number" defaultValue={q} onChange={e=>q=e.target.value}/></div><div style={{flex:1}}><label style={S.lbl}>الوحدة</label><select style={S.sel} defaultValue={u} onChange={e=>u=e.target.value}>{UNITS.map(x=><option key={x} value={x}>{x}</option>)}</select></div></div><label style={S.lbl}>ملاحظة</label><input style={S.inp} defaultValue={nt} onChange={e=>nt=e.target.value}/><div style={{display:"flex",gap:8,marginTop:10}}><button style={{...S.smBtn,background:"#2D6A4F",flex:1}} onClick={()=>{setSaved(prev=>({...prev,[activeHouse]:prev[activeHouse].map(e=>e.id!==modal.entryId?e:{...e,items:e.items.map(i=>i.id!==modal.item.id?i:{...i,qty:q,unit:u,note:nt})})}));setEditSaved(prev=>prev?{...prev,items:prev.items.map(i=>i.id!==modal.item.id?i:{...i,qty:q,unit:u,note:nt})}:prev);setModal(null);toast$("✅ تم");}}>حفظ</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>);})()}
            {modal.type==="deleteCat"&&(<><p style={S.dlgT}>🗑️ حذف الفئة</p><p style={{color:"#8A9BAE",fontSize:13,marginTop:6}}>سيُحذف "{modal.catName}" مع {catalog[modal.catName]?.length} منتج.</p><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>{deleteCategory(modal.catName);setModal(null);}}>حذف</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>)}
            {modal.type==="resetCatalog"&&(<><p style={S.dlgT}>🔄 إعادة التعيين</p><p style={{color:"#8A9BAE",fontSize:13,marginTop:6}}>ستعود الفئات للافتراضية.</p><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...S.smBtn,background:"#E53E3E",flex:1}} onClick={()=>{setCatalog(DEFAULT_CAT);setModal(null);toast$("🔄 تم");}}>إعادة تعيين</button><button style={{...S.smBtn,background:"#2A3A4A",flex:1}} onClick={()=>setModal(null)}>إلغاء</button></div></>)}
          </div>
        </div>
      )}
    </div>
  );

  // ── HOUSE FORM PANEL ──────────────────────────────────────────────────────────
  function HouseFormPanel(){
    return(
      <div style={{...S.setCard,marginTop:10}} className="an-up">
        <p style={S.setTitle}>{houseForm.id?"تعديل المنزل":"منزل جديد"}</p>
        <label style={S.lbl}>اسم المنزل</label>
        <input style={S.inp} placeholder="المنزل الرئيسي..." value={houseForm.name} onChange={e=>setHouseForm(p=>({...p,name:e.target.value}))}/>
        <label style={S.lbl}>رقم سري (4 أرقام) — اتركه فارغاً للدخول المفتوح</label>
        <div style={{background:"#0A1520",borderRadius:16,padding:"16px 12px",border:"1px solid #1A2B3C",marginTop:4}}>
          <PinPad value={houseForm.pin} onChange={v=>setHouseForm(p=>{const cur=typeof p.pin==="string"?p.pin:"";const nv=typeof v==="function"?v(cur):(typeof v==="string"?v:cur);return{...p,pin:nv};})} accent={houseForm.color}/>
          {houseForm.pin&&<div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12}}><span style={{fontSize:13,color:"#8A9BAE"}}>الرقم: {houseForm.pin}</span><button style={{background:"none",border:"none",color:"#E53E3E",fontSize:12,cursor:"pointer"}} onClick={()=>setHouseForm(p=>({...p,pin:""}))}>مسح ✕</button></div>}
        </div>
        <label style={S.lbl}>الأيقونة</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:4}}>{ICONS.map(ic=><button key={ic} style={{...S.iconPick,...(houseForm.icon===ic?{background:houseForm.color}:{})}} onClick={()=>setHouseForm(p=>({...p,icon:ic}))}>{ic}</button>)}</div>
        <label style={S.lbl}>اللون</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{COLORS.map(c=><button key={c} style={{...S.colPick,background:c,...(houseForm.color===c?{transform:"scale(1.3)",border:"3px solid #fff"}:{})}} onClick={()=>setHouseForm(p=>({...p,color:c}))}/>)}</div>
        <div style={{display:"flex",gap:8}}><button style={{...S.bigBtn,background:houseForm.color,flex:1}} onClick={saveHouseForm}>{houseForm.id?"✅ حفظ":"➕ إضافة"}</button><button style={{...S.ghostBtn,flex:1,marginTop:0}} onClick={()=>setShowHF(false)}>إلغاء</button></div>
      </div>
    );
  }

  // ── CATALOG PANEL ─────────────────────────────────────────────────────────────
  function CatalogPanel(){
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><p style={S.secLbl}>{Object.keys(catalog).length} فئة</p><button style={{...S.smBtn,background:"#4A1A1A",fontSize:12}} onClick={()=>setModal({type:"resetCatalog"})}>🔄 إعادة تعيين</button></div>
        <div style={{...S.setCard,marginBottom:14,borderColor:"#C8960C44"}}>
          <p style={{...S.setTitle,color:"#C8960C",marginBottom:10}}>➕ إضافة فئة جديدة</p>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <div style={{width:52}}><label style={S.lbl}>أيقونة</label><button style={{...S.iconPick,width:"100%",fontSize:22,background:"#0A1520",border:"1.5px solid #1A2B3C"}} onClick={()=>setShowEmojiPick(p=>!p)}>{newCatEmoji}</button></div>
            <div style={{flex:1}}><label style={S.lbl}>الاسم</label><input style={S.inp} placeholder="اسم الفئة..." value={newCatName} onChange={e=>setNewCatName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCategory()}/></div>
            <button style={{...S.smBtn,background:"#C8960C",padding:"11px 16px"}} onClick={addCategory}>إضافة</button>
          </div>
          {showEmojiPick&&<div style={{marginTop:10,background:"#0A1520",borderRadius:12,padding:10,border:"1px solid #1A2B3C",maxHeight:160,overflowY:"auto"}}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{CAT_EMOJIS.map((em,i)=><button key={i} style={{background:newCatEmoji===em?"#1A2B3C":"none",border:"none",fontSize:22,cursor:"pointer",borderRadius:8,padding:"2px 4px"}} onClick={()=>{setNewCatEmoji(em);setShowEmojiPick(false);}}>{em}</button>)}</div></div>}
        </div>
        {Object.entries(catalog).map(([catName,items])=>(
          <div key={catName} style={{...S.setCard,marginBottom:10}}>
            {renameCat?.old===catName?(
              <div style={{display:"flex",gap:6,alignItems:"flex-end",marginBottom:8}}>
                <input style={{...S.inp,flex:1}} value={renameCat.newName} onChange={e=>setRenameCat(p=>({...p,newName:e.target.value}))} autoFocus onKeyDown={e=>e.key==="Enter"&&confirmRename()}/>
                <button style={{...S.smBtn,background:"#38A169"}} onClick={confirmRename}>✅</button>
                <button style={{...S.smBtn,background:"#2A3A4A"}} onClick={()=>setRenameCat(null)}>✕</button>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <button style={{background:"none",border:"none",cursor:"pointer",flex:1,textAlign:"right",display:"flex",alignItems:"center",gap:6,padding:"2px 0"}} onClick={()=>setOpenCat(openCat===catName?null:catName)}>
                  <span style={{fontSize:15,fontWeight:800,color:"#E8F0FE"}}>{catName}</span>
                  <span style={{color:"#8A9BAE",fontSize:12}}>({items.length})</span>
                  <span style={{marginRight:"auto",color:"#8A9BAE",fontSize:14}}>{openCat===catName?"▲":"▼"}</span>
                </button>
                <button style={{...S.smBtn,background:"#1A3B5E",padding:"5px 9px",fontSize:13}} onClick={()=>startRename(catName)}>✏️</button>
                <button style={{...S.smBtn,background:"#4A1A1A",padding:"5px 9px",fontSize:13}} onClick={()=>setModal({type:"deleteCat",catName})}>🗑️</button>
              </div>
            )}
            {openCat===catName&&<div className="an-up">
              <div style={{display:"flex",gap:6,marginBottom:10}}><input style={{...S.inp,flex:1,fontSize:13,padding:"8px 12px"}} placeholder="اسم المنتج الجديد..." value={newItemName} onChange={e=>setNewItemName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItemToCat(catName)}/><button style={{...S.smBtn,background:"#38A169"}} onClick={()=>addItemToCat(catName)}>إضافة</button></div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {items.length===0&&<p style={{color:"#8A9BAE",fontSize:13,textAlign:"center",padding:"8px 0"}}>لا توجد منتجات</p>}
                {items.map((itemName,idx)=><ItemRow key={idx} name={itemName} onRename={n=>renameItemInCat(catName,itemName,n)} onDelete={()=>deleteItemFromCat(catName,itemName)}/>)}
              </div>
            </div>}
          </div>
        ))}
      </div>
    );
  }
}


// ─── EXTERNAL BUDGET PANEL (must be outside App to allow useState) ─────────────
function BudgetPanel({isHead,houseColor,houseId,selMonth,setSelMonth,spent,houses,budgetData,getBudgetLimit,getLast6,getAllMonths,getMonthsForHouse,setMonthlyLimit,S}){
  const [editingLimit,setEditingLimit]=useState(null);
  const [limitVal,setLimitVal]=useState("");
  const months=isHead?getAllMonths():getMonthsForHouse(houseId);

  return(
    <div style={S.scroll}>
      {/* Month selector */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:14,scrollbarWidth:"none"}}>
        {months.map(m=>(
          <button key={m} onClick={()=>setSelMonth(m)}
            style={{...S.filterPill,...(m===selMonth
              ?{background:houseColor||"#C8960C",color:"#fff",borderColor:"transparent"}
              :{borderColor:`${houseColor||"#C8960C"}55`,color:houseColor||"#C8960C"}
            ),flexShrink:0,fontWeight:800}}>
            {formatMonthKey(m)}
          </button>
        ))}
      </div>

      {isHead?(
        <>
          <div style={{background:"linear-gradient(135deg,#92700A,#C8960C)",borderRadius:20,padding:"20px 22px",marginBottom:14,boxShadow:"0 8px 32px #C8960C44"}}>
            <p style={{color:"rgba(255,255,255,.75)",fontSize:13,fontWeight:700}}>إجمالي جميع المنازل</p>
            <p style={{color:"#fff",fontSize:34,fontWeight:900,letterSpacing:-1,margin:"6px 0 2px"}}>{fmt(spent)}</p>
            <p style={{color:"rgba(255,255,255,.7)",fontSize:14}}>ريال · {formatMonthKey(selMonth)}</p>
          </div>
          {houses.map(h=>{
            const hs=budgetData[h.id]?.[selMonth]?.spent||0;
            const hl=getBudgetLimit(h.id);
            const hp=hl>0?Math.min((hs/hl)*100,100):0;
            const hover=hl>0&&hs>hl;
            const hOrds=budgetData[h.id]?.[selMonth]?.orders||[];
            const chart=getLast6(h.id);
            return(
              <div key={h.id} style={{...S.setCard,padding:0,overflow:"hidden",marginBottom:14,borderRight:`4px solid ${h.color}`}}>
                <div style={{background:`linear-gradient(135deg,${h.color}22,${h.color}11)`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:26}}>{h.icon}</span>
                  <div style={{flex:1}}>
                    <p style={{color:"#E8F0FE",fontWeight:800,fontSize:15}}>{h.name}</p>
                    <p style={{color:"#8A9BAE",fontSize:12,marginTop:2}}>{hOrds.length} طلب مسجّل</p>
                  </div>
                  <div style={{textAlign:"left"}}>
                    <p style={{color:hover?"#FC8181":h.color,fontWeight:900,fontSize:20}}>{fmt(hs)}</p>
                    <p style={{color:"#8A9BAE",fontSize:11}}>ريال</p>
                  </div>
                </div>
                <div style={{padding:"12px 16px"}}>
                  {hl>0&&(
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:12,color:"#8A9BAE",fontWeight:700}}>الميزانية الشهرية</span>
                        <span style={{fontSize:12,color:hover?"#FC8181":"#38A169",fontWeight:800}}>{fmt(hs)} / {fmt(hl)} ريال</span>
                      </div>
                      <div style={{background:"#1A2B3C",borderRadius:8,height:10,overflow:"hidden",marginBottom:10}}>
                        <div style={{width:`${hp}%`,height:"100%",background:hover?"#E53E3E":hp>80?"#D97706":h.color,borderRadius:8,transition:"width .5s ease"}}/>
                      </div>
                      {hover&&<p style={{color:"#FC8181",fontSize:12,fontWeight:700,marginBottom:8}}>⚠️ تجاوزت بـ {fmt(hs-hl)} ريال</p>}
                    </>
                  )}
                  {!hl&&<p style={{color:"#8A9BAE",fontSize:12,marginBottom:10}}>لا توجد ميزانية شهرية</p>}
                  {editingLimit===h.id
                    ?(<div style={{display:"flex",gap:8,marginBottom:10}}>
                        <input style={{...S.inp,flex:1,fontSize:15}} type="number" min="0" placeholder="مثال: 1500" value={limitVal} onChange={e=>setLimitVal(e.target.value)}/>
                        <button style={{...S.smBtn,background:"#38A169"}} onClick={()=>{setMonthlyLimit(h.id,limitVal);setEditingLimit(null);setLimitVal("");}}>حفظ</button>
                        <button style={{...S.smBtn,background:"#2A3A4A"}} onClick={()=>{setEditingLimit(null);setLimitVal("");}}>✕</button>
                      </div>)
                    :(<button style={{...S.smBtn,background:h.color,fontSize:12,marginBottom:10}} onClick={()=>{setEditingLimit(h.id);setLimitVal(hl>0?String(hl):"");}}>{hl>0?"✏️ تعديل الميزانية":"＋ تحديد ميزانية"}</button>)
                  }
                  {chart.some(d=>d.amount>0)&&(
                    <div style={{background:"#0A1520",borderRadius:12,padding:"10px 12px",border:"1px solid #1A2B3C"}}>
                      <p style={{color:"#8A9BAE",fontSize:11,fontWeight:700,marginBottom:8}}>آخر 6 أشهر (ريال)</p>
                      <MiniBarChart data={chart} color={h.color}/>
                    </div>
                  )}
                  {hOrds.length>0&&(
                    <div style={{marginTop:10}}>
                      <p style={{color:"#8A9BAE",fontSize:11,fontWeight:700,marginBottom:6}}>تفاصيل الطلبات</p>
                      {hOrds.map(o=>(
                        <div key={o.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1A2B3C"}}>
                          <span style={{color:"#C8D8E8",fontSize:12}}>{o.sentAt}</span>
                          <span style={{color:h.color,fontWeight:800,fontSize:13}}>{fmt(o.totalAmount)} ريال</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      ):(
        <HouseBudgetContent houseId={houseId} houseColor={houseColor} selMonth={selMonth} spent={spent} budgetData={budgetData} getLast6={getLast6} getBudgetLimit={getBudgetLimit}/>
      )}
    </div>
  );
}

// ─── HOUSE BUDGET CONTENT (extracted to fix JSX-const bug) ───────────────────
function HouseBudgetContent({houseId,houseColor,selMonth,spent,budgetData,getLast6,getBudgetLimit}){
  const hl2   = getBudgetLimit(houseId);
  const hp2   = hl2>0 ? Math.min((spent/hl2)*100,100) : 0;
  const over2 = hl2>0 && spent>hl2;
  const hOrds2= budgetData[houseId]?.[selMonth]?.orders||[];
  const chart2= getLast6(houseId);
  const label = formatMonthKey(selMonth);
  return(
    <>
      <div style={{background:`linear-gradient(135deg,${houseColor},${houseColor}CC)`,borderRadius:20,padding:"20px 22px",marginBottom:14,boxShadow:`0 8px 32px ${houseColor}44`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{color:"rgba(255,255,255,.75)",fontSize:13,fontWeight:700}}>إجمالي الإنفاق</p>
          <p style={{color:"#fff",fontSize:32,fontWeight:900,letterSpacing:-1,margin:"4px 0 2px"}}>{fmt(spent)}</p>
          <p style={{color:"rgba(255,255,255,.7)",fontSize:13}}>ريال · {label}</p>
        </div>
        {hl2>0&&<RadialProgress pct={hp2} color={over2?"#E53E3E":"#38A169"}/>}
      </div>
      {hl2>0&&(
        <div style={{background:"#111E2C",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #1A2B3C"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:13,color:"#E8F0FE",fontWeight:700}}>الميزانية الشهرية</span>
            <span style={{fontSize:13,color:over2?"#FC8181":"#38A169",fontWeight:800}}>{fmt(hl2)} ريال</span>
          </div>
          <div style={{background:"#1A2B3C",borderRadius:8,height:12,overflow:"hidden",marginBottom:8}}>
            <div style={{width:`${hp2}%`,height:"100%",background:over2?"#E53E3E":hp2>80?"#D97706":houseColor,borderRadius:8,transition:"width .5s ease"}}/>
          </div>
          {over2
            ?<p style={{color:"#FC8181",fontSize:13,fontWeight:700}}>⚠️ تجاوزت بـ {fmt(spent-hl2)} ريال</p>
            :<p style={{color:"#38A169",fontSize:13,fontWeight:700}}>المتبقي: {fmt(hl2-spent)} ريال</p>
          }
        </div>
      )}
      {chart2.some(d=>d.amount>0)&&(
        <div style={{background:"#111E2C",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #1A2B3C"}}>
          <p style={{color:"#8A9BAE",fontSize:12,fontWeight:700,marginBottom:10}}>📊 الإنفاق — آخر 6 أشهر</p>
          <MiniBarChart data={chart2} color={houseColor}/>
        </div>
      )}
      {hOrds2.length>0?(
        <div style={{background:"#111E2C",borderRadius:14,padding:14,border:"1px solid #1A2B3C"}}>
          <p style={{color:"#8A9BAE",fontSize:12,fontWeight:700,marginBottom:10}}>📋 تفاصيل الطلبات</p>
          {hOrds2.map(o=>(
            <div key={o.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1A2B3C"}}>
              <div>
                <p style={{color:"#C8D8E8",fontSize:13}}>{o.sentAt}</p>
                <p style={{color:"#8A9BAE",fontSize:11}}>{o.items.length} منتج</p>
              </div>
              <span style={{color:houseColor,fontWeight:900,fontSize:15}}>{fmt(o.totalAmount)} ريال</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0"}}>
            <span style={{color:"#E8F0FE",fontWeight:700,fontSize:14}}>الإجمالي</span>
            <span style={{color:houseColor,fontWeight:900,fontSize:18}}>{fmt(spent)} ريال</span>
          </div>
        </div>
      ):(
        <div style={{textAlign:"center",padding:"48px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <span style={{fontSize:48}}>📊</span>
          <p style={{fontSize:18,fontWeight:800,color:"#E8F0FE"}}>لا توجد بيانات لهذا الشهر</p>
          <p style={{fontSize:13,color:"#8A9BAE"}}>سيظهر هنا الإنفاق بعد تسجيل المبالغ</p>
        </div>
      )}
    </>
  );
}

// ─── COLLAPSIBLE ARCHIVED ORDER CARD ─────────────────────────────────────────
function ArchivedOrderCard({order, houseColor, onExportText, onExportPDF, isHead=false, onRestore, onDelete, toggleCheck}){
  const [expanded, setExpanded] = useState(false);
  const col = order.houseColor||houseColor||"#2D6A4F";
  const checked = order.checked||{};
  const bN = Object.values(checked).filter(Boolean).length;
  const pct = order.items.length ? Math.round(bN/order.items.length*100) : 0;
  const g = groupByCat(order.items);
  return(
    <div style={{background:"#111E2C",borderRadius:16,marginBottom:10,border:"1.5px solid #2A3A4A",overflow:"hidden"}}>
      {/* Summary row — always visible */}
      <button style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",textAlign:"right",padding:0}} onClick={()=>setExpanded(e=>!e)}>
        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
          {isHead&&<span style={{fontSize:20}}>{order.houseIcon}</span>}
          <div style={{flex:1}}>
            <p style={{color:"#C8D8E8",fontSize:14,fontWeight:700,marginBottom:2}}>
              {isHead?`${order.houseName} · `:""}📦 {order.sentAt}
            </p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{background:"#1A2B3C",color:"#8A9BAE",fontSize:11,padding:"2px 8px",borderRadius:6,fontWeight:600}}>{order.items.length} منتج</span>
              <span style={{background:"#1A2B3C",color:"#8A9BAE",fontSize:11,padding:"2px 8px",borderRadius:6,fontWeight:600}}>{pct}% مكتمل</span>
              {order.totalAmount>0&&<span style={{background:"#1A2B3C",color:"#C8960C",fontSize:11,padding:"2px 8px",borderRadius:6,fontWeight:700}}>💰 {fmt(order.totalAmount)} ريال</span>}
              {order.archivedAt&&<span style={{background:"#1A2B3C",color:"#38A169",fontSize:11,padding:"2px 8px",borderRadius:6,fontWeight:600}}>📦 {order.archivedAt}</span>}
            </div>
          </div>
          <span style={{color:"#8A9BAE",fontSize:18,transition:"transform .2s",transform:expanded?"rotate(180deg)":"none"}}>▼</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded&&(
        <div className="an-up">
          {/* Progress bar */}
          {order.items.length>0&&(
            <div style={{padding:"4px 14px 10px"}}>
              <div style={{background:"#1A2B3C",borderRadius:6,height:6,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:"#38A169",borderRadius:6,transition:"width .4s"}}/>
              </div>
            </div>
          )}
          {/* Items by category - read-only checklist */}
          <div style={{padding:"0 12px 8px"}}>
            {Object.entries(g).map(([cat,items])=>(
              <div key={cat} style={{marginBottom:8}}>
                <p style={{color:"#8A9BAE",fontSize:11,fontWeight:700,padding:"4px 0",borderBottom:"1px solid #1A2B3C",marginBottom:4}}>{cat}</p>
                {items.map(it=>{
                  const ck=checked[it.id];
                  return(
                    <div key={it.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:"1px solid #0A1520",opacity:ck?.5:1}}>
                      <button style={{background:"none",border:"none",fontSize:16,cursor:"pointer",flexShrink:0}} onClick={()=>toggleCheck&&toggleCheck(order.id,it.id)}>{ck?"✅":"⬜"}</button>
                      <span style={{width:7,height:7,borderRadius:"50%",background:PRI[it.priority].c,flexShrink:0,display:"inline-block"}}/>
                      <span style={{flex:1,color:"#C8D8E8",fontSize:13,textDecoration:ck?"line-through":"none"}}>{it.name}</span>
                      <span style={{color:"#8A9BAE",fontSize:11}}>{it.qty} {it.unit}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Reply */}
          {order.reply&&<div style={{background:"#1A2B3C",padding:"9px 14px",fontSize:13,color:"#C8960C",fontWeight:600,margin:"0 12px 10px",borderRadius:10}}>💬 {isHead?"رب الأسرة":""} {order.reply}</div>}
          {/* Actions */}
          <div style={{padding:"0 12px 12px",display:"flex",gap:6}}>
            <button style={{border:"none",borderRadius:10,padding:"8px 8px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",background:"#1A6B8A",flex:3}} onClick={()=>onExportPDF&&onExportPDF(order)}>🖨️ PDF</button>
            <button style={{border:"none",borderRadius:10,padding:"8px 8px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",background:"#2D6A4F",flex:3}} onClick={()=>onExportText&&onExportText(order)}>📋 مشاركة</button>
            {isHead&&onRestore&&<button style={{border:"none",borderRadius:10,padding:"8px 8px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",background:"#2D3F6B",flex:2}} onClick={()=>onRestore(order.id)}>🔄 استعادة</button>}
            {isHead&&onDelete&&<button style={{border:"none",borderRadius:10,padding:"8px 8px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",background:"#4A1A1A",flex:1}} onClick={()=>onDelete(order.id)}>🗑️</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({name,onRename,onDelete}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(name);
  const inp=useRef(null);
  useEffect(()=>{if(editing)setTimeout(()=>inp.current?.focus(),80);},[editing]);
  return editing?(
    <div style={{display:"flex",gap:6,alignItems:"center",padding:"3px 0"}}>
      <input ref={inp} style={{flex:1,background:"#0A1520",border:"1px solid #1A2B3C",borderRadius:8,padding:"5px 10px",fontSize:13,color:"#E8F0FE",direction:"rtl"}} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onRename(val);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/>
      <button style={{background:"#38A169",border:"none",borderRadius:7,padding:"4px 9px",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}} onClick={()=>{onRename(val);setEditing(false);}}>✅</button>
      <button style={{background:"#2A3A4A",border:"none",borderRadius:7,padding:"4px 9px",color:"#fff",fontSize:12,cursor:"pointer"}} onClick={()=>setEditing(false)}>✕</button>
    </div>
  ):(
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 2px"}}>
      <span style={{flex:1,color:"#C8D8E8",fontSize:13}}>{name}</span>
      <button style={{background:"#1A2B3C",border:"none",borderRadius:7,padding:"3px 8px",fontSize:12,cursor:"pointer",color:"#8A9BAE"}} onClick={()=>{setVal(name);setEditing(true);}}>✏️</button>
      <button style={{background:"#2A1A1A",border:"none",borderRadius:7,padding:"3px 8px",fontSize:12,cursor:"pointer",color:"#FC8181"}} onClick={onDelete}>🗑️</button>
    </div>
  );
}

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:#0A1520;}
  ::-webkit-scrollbar{display:none;}
  input,select{outline:none;font-family:'Tajawal',sans-serif;}
  button{font-family:'Tajawal',sans-serif;}
  @keyframes up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes sheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes shake{0%,100%{transform:translateX(0)}30%{transform:translateX(-8px)}70%{transform:translateX(8px)}}
  .an-up{animation:up .3s ease}.an-sheet{animation:sheet .35s cubic-bezier(.4,0,.2,1)}.shake{animation:shake .35s ease}
`;

const S={
  root:{fontFamily:"'Tajawal',sans-serif",direction:"rtl",maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#0A1520",color:"#E8F0FE",position:"relative"},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",color:"#fff",padding:"11px 22px",borderRadius:24,fontSize:14,fontWeight:800,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"},
  splash:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"},
  glow:{position:"absolute",top:-80,left:"50%",transform:"translateX(-50%)",width:400,height:400,background:"radial-gradient(circle,#1B5E3B33,transparent 70%)",pointerEvents:"none"},
  splashH:{fontSize:40,fontWeight:900,color:"#fff",letterSpacing:-1},splashSub:{fontSize:14,color:"#6B8F71",marginTop:4},
  badge:{background:"#E53E3E",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:900},
  bigBtn:{width:"100%",padding:"15px",border:"none",borderRadius:16,color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8},
  ghostBtn:{width:"100%",padding:"13px",border:"1.5px solid #1E2D3D",borderRadius:16,color:"#8A9BAE",fontSize:15,fontWeight:700,cursor:"pointer",background:"transparent",marginTop:8},
  divider:{display:"flex",alignItems:"center",gap:10,margin:"4px 0"},divTx:{color:"#2A4A35",fontSize:12,fontWeight:700,letterSpacing:1},
  houseCard:{border:"none",borderRadius:18,padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,width:"100%",boxShadow:"0 6px 24px rgba(0,0,0,.35)"},
  hcName:{color:"#fff",fontSize:15,fontWeight:800},hcMeta:{color:"rgba(255,255,255,.65)",fontSize:12,marginTop:2},
  liveDot:{width:10,height:10,background:"#38A169",borderRadius:"50%",boxShadow:"0 0 0 3px #38A16944",flexShrink:0},
  pinScreen:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"#0A1520"},
  pinH:{fontSize:20,fontWeight:900,color:"#fff",marginTop:8,textAlign:"center"},
  pinSub:{color:"#8A9BAE",fontSize:13,marginTop:4,marginBottom:4,textAlign:"center"},
  backLink:{background:"none",border:"none",color:"#8A9BAE",fontSize:13,cursor:"pointer",marginTop:20},
  shell:{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#0A1520"},
  topBar:{padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:"0 0 20px 20px",boxShadow:"0 4px 20px rgba(0,0,0,.3)",flexShrink:0},
  tbBack:{background:"rgba(255,255,255,.15)",border:"none",borderRadius:12,padding:"7px 13px",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"},
  tbTitle:{color:"#fff",fontSize:16,fontWeight:800},tbAct:{background:"rgba(255,255,255,.15)",border:"none",borderRadius:12,padding:"7px 11px",color:"#fff",fontSize:17,cursor:"pointer"},
  tabsBar:{display:"flex",background:"#0D1A26",borderBottom:"1px solid #1A2B3C",flexShrink:0,overflowX:"auto",scrollbarWidth:"none"},
  tabBtn:{flexShrink:0,padding:"11px 12px",background:"transparent",border:"none",color:"#8A9BAE",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,borderBottom:"2px solid transparent",whiteSpace:"nowrap"},
  tabActive:{color:"#E8F0FE",borderBottom:"2px solid"},tabBadge:{background:"#E53E3E",color:"#fff",borderRadius:12,padding:"2px 6px",fontSize:10,fontWeight:900},
  scroll:{flex:1,overflowY:"auto",padding:"14px 14px 110px"},
  secLbl:{color:"#8A9BAE",fontSize:13,fontWeight:700,marginBottom:10,marginTop:4},
  summGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:14},
  summCard:{background:"#111E2C",borderRadius:14,padding:"12px 10px",textAlign:"center",border:"2px solid"},summName:{color:"#E8F0FE",fontSize:13,fontWeight:800,marginTop:5},
  orderCard:{background:"#111E2C",borderRadius:16,marginBottom:14,border:"2px solid",overflow:"hidden"},
  orderHdr:{padding:"12px 14px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:6},
  stBadge:{borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:800,color:"#fff"},
  replyInp:{width:"100%",padding:"9px 12px",border:"1.5px solid #1A2B3C",borderRadius:10,fontSize:13,background:"#0A1520",color:"#E8F0FE",direction:"rtl",boxSizing:"border-box"},
  replyBox:{background:"linear-gradient(135deg,#1A2B3C,#162030)",padding:"10px 14px",fontSize:13,color:"#E8F0FE",fontWeight:500,borderBottom:"1px solid #0A1520"},
  expBtn:{border:"none",borderRadius:10,padding:"9px 8px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"},
  statsRow:{display:"flex",gap:8,marginBottom:12},
  statBox:{flex:1,background:"#111E2C",borderRadius:12,padding:"10px 6px",textAlign:"center",border:"1px solid #1E2D3D"},
  statN:{display:"block",fontSize:20,fontWeight:900,color:"#E8F0FE"},statL:{display:"block",fontSize:10,color:"#8A9BAE",marginTop:2},
  actionRow:{display:"flex",gap:8,marginBottom:10},actBtn:{border:"none",borderRadius:12,padding:"10px 12px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"},
  filterRow:{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:8,scrollbarWidth:"none"},
  filterPill:{background:"#111E2C",border:"1.5px solid #1E2D3D",borderRadius:20,padding:"6px 13px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",color:"#8A9BAE",fontWeight:700,flexShrink:0},
  itemRow:{background:"#111E2C",borderRadius:14,padding:"11px 11px",display:"flex",alignItems:"center",gap:8,marginBottom:7,border:"1px solid #1A2B3C"},
  chips:{display:"flex",gap:5,flexWrap:"wrap",marginTop:3},chip:{background:"#1A2B3C",color:"#8A9BAE",fontSize:10,padding:"2px 7px",borderRadius:6,fontWeight:600},
  editBtn:{background:"#1A2B3C",border:"none",borderRadius:8,padding:"5px 7px",fontSize:13,cursor:"pointer",flexShrink:0},
  delBtn:{background:"#2A1A1A",border:"none",borderRadius:8,padding:"5px 7px",fontSize:13,cursor:"pointer",flexShrink:0},
  empty:{textAlign:"center",padding:"48px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:8},
  emptyT:{fontSize:18,fontWeight:800,color:"#E8F0FE"},emptyS:{fontSize:13,color:"#8A9BAE"},
  botNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#111E2C",borderTop:"1px solid #1A2B3C",display:"flex",alignItems:"center",justifyContent:"space-around",padding:"8px 8px 18px",zIndex:100},
  navBtn:{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 16px",fontSize:20},
  navL:{fontSize:11,color:"#6B8F71",fontWeight:700},
  navCenter:{border:"none",borderRadius:"50%",width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.4)",marginTop:-18,flexShrink:0},
  savedCard:{background:"#111E2C",borderRadius:14,padding:13,display:"flex",alignItems:"center",gap:8,marginBottom:9,border:"1px solid #1A2B3C"},
  savedName:{color:"#E8F0FE",fontWeight:800,fontSize:14},savedMeta:{color:"#8A9BAE",fontSize:11,marginTop:2},
  smBtn:{border:"none",borderRadius:10,padding:"7px 12px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0},
  setCard:{background:"#111E2C",borderRadius:14,padding:14,marginBottom:10,border:"1px solid #1A2B3C"},
  setTitle:{color:"#E8F0FE",fontWeight:800,fontSize:14},setDesc:{color:"#8A9BAE",fontSize:12,marginTop:3},
  lbl:{display:"block",fontSize:12,fontWeight:700,color:"#8A9BAE",marginBottom:5,marginTop:12},
  inp:{width:"100%",padding:"11px 13px",border:"1.5px solid #1A2B3C",borderRadius:12,fontSize:14,background:"#0A1520",color:"#E8F0FE",direction:"rtl",boxSizing:"border-box"},
  sel:{width:"100%",padding:"11px 13px",border:"1.5px solid #1A2B3C",borderRadius:12,fontSize:14,background:"#0A1520",color:"#E8F0FE",direction:"rtl",boxSizing:"border-box",appearance:"none"},
  iconPick:{background:"#1A2B3C",border:"none",borderRadius:10,padding:"7px 10px",fontSize:19,cursor:"pointer"},
  colPick:{width:28,height:28,borderRadius:"50%",border:"2px solid transparent",cursor:"pointer",transition:"transform .15s"},
  twoCol:{display:"flex",gap:10},priRow:{display:"flex",gap:8,marginBottom:4},
  priBtn:{flex:1,padding:"9px 4px",border:"1.5px solid #1A2B3C",borderRadius:11,fontSize:12,fontWeight:800,cursor:"pointer",background:"#111E2C",color:"#8A9BAE"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"},
  sheet:{background:"#111E2C",borderRadius:"22px 22px 0 0",padding:"0 16px 28px",maxHeight:"94vh",overflowY:"auto",border:"1px solid #1A2B3C"},
  shHandle:{width:38,height:4,background:"#1A2B3C",borderRadius:2,margin:"11px auto 4px"},
  shTitle:{color:"#fff",fontSize:16,fontWeight:900,marginBottom:12,textAlign:"center"},
  pickedBadge:{borderRadius:12,padding:"9px 14px",color:"#fff",fontWeight:700,fontSize:14,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between"},
  pickedX:{background:"rgba(255,255,255,.2)",border:"none",borderRadius:8,padding:"2px 8px",color:"#fff",cursor:"pointer",fontSize:12},
  searchWrap:{display:"flex",alignItems:"center",background:"#0A1520",borderRadius:13,border:"1.5px solid #1A2B3C",padding:"0 12px",marginBottom:10},
  searchInp:{flex:1,background:"transparent",border:"none",padding:"11px 10px",fontSize:14,color:"#E8F0FE",direction:"rtl"},
  searchX:{background:"none",border:"none",color:"#8A9BAE",fontSize:15,cursor:"pointer"},
  resList:{background:"#0A1520",borderRadius:12,border:"1px solid #1A2B3C",marginBottom:10,maxHeight:200,overflowY:"auto"},
  resRow:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"transparent",border:"none",borderBottom:"1px solid #1A2B3C",cursor:"pointer",width:"100%"},
  catScroll:{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,scrollbarWidth:"none"},
  catPill:{background:"#0A1520",border:"1.5px solid #1A2B3C",borderRadius:20,padding:"6px 12px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",color:"#8A9BAE",fontWeight:700,flexShrink:0},
  catItems:{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10},
  catItemBtn:{background:"#1A2B3C",border:"none",borderRadius:11,padding:"7px 13px",fontSize:13,color:"#E8F0FE",fontWeight:600,cursor:"pointer"},
  detBox:{background:"#0A1520",borderRadius:13,padding:13,marginTop:8,border:"1px solid #1A2B3C"},
  dialog:{background:"#111E2C",borderRadius:22,padding:20,width:"100%",maxWidth:340,margin:"auto 20px",border:"1px solid #1A2B3C",alignSelf:"center"},
  dlgT:{color:"#fff",fontSize:17,fontWeight:900},
};
