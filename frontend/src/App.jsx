import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Float, Stars, OrbitControls, Line, Sparkles } from '@react-three/drei';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BrainCircuit, Building2, CalendarDays,
  ChartNoAxesCombined, CheckCircle2, ChevronDown, CircleAlert, Command, CreditCard,
  Database, Download, FileSpreadsheet, Filter, Globe2, LayoutDashboard, MapPin,
  Menu, Network, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Upload,
  Wallet, X, Zap, ArrowRight, Clock3, RefreshCw, Eye, Layers3
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line as RLine,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import GeographicMap from './components/GeographicMap';
import { loadLocalDataset, parseAndStoreLocalUpload, resetLocalDataset } from './utils/localDataset';

const API = import.meta.env.VITE_API_BASE_URL || '';
const COLORS = ['#52e4ff', '#9b8cff', '#49e0b0', '#ffb66e', '#ff6f91', '#7aa8ff'];
const NAV = [
  ['Overview', LayoutDashboard], ['Transaction Flow', Network], ['Analytics', ChartNoAxesCombined],
  ['Geographic Intelligence', Globe2], ['Risk & Failures', ShieldAlert], ['Data Explorer', Database],
  ['Reports', FileSpreadsheet], ['AI Insights', BrainCircuit]
];
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const compact = n => Number(n || 0).toLocaleString('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const norm = s => String(s || '').toLowerCase();
const safeDate = s => String(s || '').slice(0, 10);

function GlobeScene({ rows }) {
  const arcs = useMemo(() => {
    const pts = [[-1.4,.25,.1],[-.9,.7,.15],[-.35,.2,1.05],[.25,.85,.1],[.8,.25,.8],[1.25,.6,.05],[.9,-.55,.4],[-.45,-.75,.2]];
    return pts.slice(0, Math.max(3, Math.min(pts.length, rows.length))).map((p,i) => {
      const q = pts[(i + 3) % pts.length];
      return [p, q, [((p[0]+q[0])/2)*.65, Math.max(p[1],q[1])+.45, ((p[2]+q[2])/2)*.65]];
    });
  }, [rows.length]);
  return <Canvas camera={{ position:[0,0,4.6], fov:42 }} dpr={[1,1.7]}>
    <ambientLight intensity={.7}/>
    <pointLight position={[4,3,4]} intensity={22} color="#3deaff"/>
    <pointLight position={[-4,-2,-2]} intensity={13} color="#5b70ff"/>
    <Stars radius={70} depth={45} count={1400} factor={3} saturation={.4} fade speed={.45}/>
    <Float speed={.8} rotationIntensity={.12} floatIntensity={.12}>
      <mesh>
        <sphereGeometry args={[1.25,64,64]}/>
        <meshPhysicalMaterial color="#071c35" metalness={.62} roughness={.26} transparent opacity={.93}/>
      </mesh>
      <mesh>
        <sphereGeometry args={[1.27,36,36]}/>
        <meshBasicMaterial color="#3bdcff" wireframe transparent opacity={.16}/>
      </mesh>
      <mesh scale={1.32}>
        <sphereGeometry args={[1,48,48]}/>
        <meshBasicMaterial color="#2f9cff" wireframe transparent opacity={.09}/>
      </mesh>
      {arcs.map((a,i)=><Line key={i} points={a} color={i%2?'#a78bfa':'#44eaff'} lineWidth={1.4} transparent opacity={.7}/>)}
      {arcs.map((a,i)=><mesh key={'n'+i} position={a[0]}><sphereGeometry args={[.035,12,12]}/><meshBasicMaterial color="#a4f5ff"/></mesh>)}
    </Float>
    <Sparkles count={85} scale={4.2} size={2.4} speed={.25} color="#67e8f9"/>
    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={.28}/>
  </Canvas>;
}

function Metric({ label, value, sub, icon: Icon, tone='cyan', delay=0 }) {
  return <motion.div className={`metric-card ${tone}`} initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.55,delay,ease:[.2,.8,.2,1]}} whileHover={{y:-5,scale:1.012}}>
    <div className="metric-head"><span>{label}</span><span className="metric-icon"><Icon size={17}/></span></div>
    <div className="metric-value">{value}</div><div className="metric-sub">{sub}</div>
    <div className="metric-spark"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
  </motion.div>;
}
function Panel({title, subtitle, tag, children, className=''}) {
  return <motion.section className={`panel ${className}`} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.35}}>
    <div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{tag && <span className="panel-tag">{tag}</span>}</div>{children}
  </motion.section>;
}
function Empty({text='No records match the current filters.'}) { return <div className="empty-state"><Database size={22}/><span>{text}</span></div>; }

export default function App() {
  const [rows,setRows] = useState([]), [source,setSource] = useState('Connecting to data engine');
  const [busy,setBusy] = useState(true), [page,setPage] = useState('Overview');
  const [query,setQuery] = useState(''), [status,setStatus] = useState('All'), [kind,setKind] = useState('All');
  const [range,setRange] = useState('All time'), [mobileNav,setMobileNav] = useState(false);
  const [selected,setSelected] = useState(null), [notice,setNotice] = useState('');
  async function parseApiJson(r) {
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('API_UNAVAILABLE');
    }
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || 'API error');
    return j;
  }
  async function load() {
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/transactions`);
      const j = await parseApiJson(r);
      setRows(j.records || []);
      setSource(j.source || 'Dataset loaded');
    } catch {
      const local = loadLocalDataset();
      setRows(local.records);
      setSource(local.source);
    } finally {
      setBusy(false);
    }
  }
  useEffect(()=>{load()},[]);
  const filtered = useMemo(()=>{
    const latest = rows.reduce((max,x)=>safeDate(x.Transaction_Date)>max?safeDate(x.Transaction_Date):max,'');
    const cutoff = range==='Last 7 days'?new Date(new Date(latest).getTime()-6*86400000):range==='Last 30 days'?new Date(new Date(latest).getTime()-29*86400000):null;
    return rows.filter(x=>
      (status==='All'||norm(x.Status)===norm(status)) &&
      (kind==='All'||x.Transaction_Type===kind) &&
      (!cutoff||new Date(safeDate(x.Transaction_Date))>=cutoff) &&
      (!query||[x.Transaction_ID,x.Customer_ID,x.Location,x.Transaction_Type].join(' ').toLowerCase().includes(query.toLowerCase()))
    );
  },[rows,status,kind,query,range]);
  const total=filtered.reduce((s,x)=>s+Number(x.Amount||0),0);
  const success=filtered.filter(x=>norm(x.Status)==='success').length;
  const failed=filtered.filter(x=>norm(x.Status)==='failed').length;
  const rate=filtered.length?success/filtered.length*100:0;
  const failedValue=filtered.filter(x=>norm(x.Status)==='failed').reduce((s,x)=>s+Number(x.Amount||0),0);
  const byDay=Object.values(filtered.reduce((a,x)=>{const d=safeDate(x.Transaction_Date);a[d]??={date:d,amount:0,count:0};a[d].amount+=Number(x.Amount||0);a[d].count++;return a},{})).sort((a,b)=>a.date.localeCompare(b.date));
  const byType=Object.values(filtered.reduce((a,x)=>{const k=x.Transaction_Type||'Other';a[k]??={name:k,value:0,count:0};a[k].value+=Number(x.Amount||0);a[k].count++;return a},{}));
  const byLocation=Object.values(filtered.reduce((a,x)=>{const k=x.Location||'Unknown';a[k]??={name:k,amount:0,count:0};a[k].amount+=Number(x.Amount||0);a[k].count++;return a},{})).sort((a,b)=>b.amount-a.amount);
  const dailyCount=byDay.map(x=>({...x,amount:x.amount}));
  const typeSeries=useMemo(()=>{
    const baseTypes=['Withdrawal','Transfer','Deposit'];
    const discovered=[...new Set(filtered.map(x=>x.Transaction_Type).filter(Boolean))];
    const ordered=[...baseTypes,...discovered.filter(t=>!baseTypes.some(b=>norm(b)===norm(t)))];
    const allDates=byDay.map(d=>d.date);
    const palette={withdrawal:'#52e4ff',transfer:'#9b8cff',deposit:'#49e0b0'};
    return ordered.map((type,idx)=>{
      const matching=filtered.filter(x=>norm(x.Transaction_Type)===norm(type));
      const map=matching.reduce((a,x)=>{
        const d=safeDate(x.Transaction_Date);
        a[d]??={date:d,amount:0,count:0};
        a[d].amount+=Number(x.Amount||0);
        a[d].count++;
        return a;
      },{});
      const series=allDates.map(d=>map[d]||{date:d,amount:0,count:0});
      const sum=matching.reduce((s,x)=>s+Number(x.Amount||0),0);
      return {
        name:type,
        color:palette[norm(type)]||COLORS[idx%COLORS.length],
        total:sum,
        count:matching.length,
        series,
      };
    });
  },[filtered,byDay]);
  const alerts=filtered.filter(x=>norm(x.Status)==='failed').sort((a,b)=>Number(b.Amount)-Number(a.Amount));
  const avg=filtered.length?total/filtered.length:0;
  const setPageSafe=p=>{setPage(p);setMobileNav(false);window.scrollTo({top:0,behavior:'smooth'});};
  async function onUpload(e){
    const f=e.target.files?.[0];
    if(!f)return;
    const fd=new FormData();
    fd.append('file',f);
    setBusy(true);
    try{
      let j;
      try {
        const r=await fetch(`${API}/api/upload`,{method:'POST',body:fd});
        j=await parseApiJson(r);
      } catch (apiErr) {
        if (apiErr.message === 'API_UNAVAILABLE' || apiErr.name === 'TypeError') {
          j = await parseAndStoreLocalUpload(f);
        } else {
          throw apiErr;
        }
      }
      setRows(j.records||[]);
      setSource(j.source||f.name);
      setStatus('All');
      setKind('All');
      setQuery('');
      setNotice(`Loaded ${j.records?.length||0} records from ${f.name}`);
    }catch(err){
      setNotice(err.message);
    }finally{
      setBusy(false);
      e.target.value='';
    }
  }
  async function resetDataset(){
    setBusy(true);
    try{
      let j;
      try {
        const r=await fetch(`${API}/api/reset-dataset`,{method:'POST'});
        j=await parseApiJson(r);
      } catch (apiErr) {
        if (apiErr.message === 'API_UNAVAILABLE' || apiErr.name === 'TypeError') {
          j = resetLocalDataset();
        } else {
          throw apiErr;
        }
      }
      setRows(j.records||[]);
      setSource(j.source||'Bundled sample');
      setStatus('All');
      setKind('All');
      setQuery('');
      setNotice('Restored the bundled sample dataset.');
    }catch(err){
      setNotice(err.message);
    }finally{
      setBusy(false);
    }
  }
  function exportCsv(){const cols=['Transaction_ID','Customer_ID','Transaction_Date','Transaction_Type','Amount','Location','Status'];const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv=[cols.join(','),...filtered.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='vault_filtered_transactions.csv';a.click();URL.revokeObjectURL(a.href);}
  const pageSub={
    'Overview':'A unified view of value movement, payment outcomes and transaction behaviour.',
    'Transaction Flow':'Explore how value moves through the transaction network.',
    'Analytics':'Measure transaction volume, value distribution and payment outcomes.',
    'Geographic Intelligence':'Understand where transaction activity is concentrated.',
    'Risk & Failures':'Review failed transactions and identify records requiring investigation.',
    'Data Explorer':'Search, filter and inspect the underlying transaction records.',
    'Reports':'Create an export from the currently filtered dataset.',
    'AI Insights':'Evidence-led observations calculated directly from the available records.'
  };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-symbol"><ShieldCheck size={23}/></div><div><b>VAULT<span>.</span></b><small>FINANCIAL INTELLIGENCE</small></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="side-caption">WORKSPACE</div>
      <nav>{NAV.map(([name,Icon])=><button key={name} className={`nav-item ${page===name?'active':''}`} onClick={()=>setPageSafe(name)}><Icon size={17}/><span>{name}</span>{page===name&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="engine-card"><div className="engine-top"><span className={`engine-dot ${busy?'busy':''}`}/>{busy?'SYNCING':'ENGINE STATUS'}</div><strong>{busy?'Connecting':source.startsWith('API offline')?'Offline':'Operational'}</strong><small>{rows.length.toLocaleString('en-IN')} records indexed</small></div>
        <div className="workspace-user"><div className="user-avatar">BI</div><div><b>Big Data Lab</b><small>Academic workspace</small></div><ChevronDown size={14}/></div>
      </div>
    </aside>
    {mobileNav&&<button className="scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar">
        <div className="top-left"><button className="menu-button" onClick={()=>setMobileNav(true)}><Menu size={19}/></button><span className="crumb">VAULT <b>/</b> {page.toUpperCase()}</span></div>
        <div className="top-actions"><div className="global-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transactions, customers, locations…"/><kbd>⌘ K</kbd></div><span className="connection"><i/>{busy?'SYNCING':'CONNECTED'}</span><label className="icon-action upload-action" title="Import CSV or Excel"><Upload size={17}/><input type="file" accept=".csv,.xlsx,.xls" onChange={onUpload}/></label><button className="icon-action" onClick={()=>setNotice('No new system notifications.')}><Bell size={17}/><i className="notification-dot"/></button><div className="profile"><div className="profile-avatar">BI</div><div><b>Analyst</b><small>Workspace</small></div><ChevronDown size={13}/></div></div>
      </header>
      <div className="content">
        <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-pulse"/> BANKING TRANSACTION INTELLIGENCE <span className="eyebrow-sep">/</span> {page.toUpperCase()}</div><h1>{page==='Overview'?<>Intelligence in <em>motion.</em></>:page==='Risk & Failures'?<>Risk, made <em>visible.</em></>:page==='Geographic Intelligence'?<>Follow the <em>footprint.</em></>:<>{page.split(' ')[0]} <em>intelligence.</em></>}</h1><p>{pageSub[page]}</p></div><div className="intro-actions"><div className="dataset-pill"><Database size={14}/><span>{source.startsWith('Uploaded:')?'UPLOADED DATA':'ACTIVE DATASET'}</span><b>{rows.length} ROWS</b></div><button className="button-secondary" onClick={load}><RefreshCw size={14}/> Refresh</button>{source.startsWith('Uploaded:')||source.startsWith('Persistent uploaded')?<button className="button-secondary restore-button" onClick={resetDataset}><Database size={14}/> Restore sample</button>:null}</div></div>
        {notice&&<motion.div className="notice" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}><span>{notice}</span><button onClick={()=>setNotice('')}><X size={14}/></button></motion.div>}
        <div className="page-transition-wrap">
          {page==='Overview'&&<motion.div key="overview" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}>
            <section className="hero-stage">
              <div className="hero-backdrop"/><div className="hero-copy"><div className="hero-kicker"><span/> GLOBAL TRANSACTION PULSE <b>DATASET VIEW</b></div><h2>See beyond<br/>the <em>transaction.</em></h2><p>Understand the movement of value across your banking dataset with a unified intelligence workspace.</p><div className="hero-buttons"><button className="button-primary" onClick={()=>setPageSafe('Analytics')}>Explore analytics <ArrowUpRight size={16}/></button><button className="button-quiet" onClick={exportCsv}><Download size={15}/> Export dataset</button></div><div className="hero-foot"><span><i/> {source}</span><span>{rows.length} records available</span></div></div>
              <div className="globe-wrap"><div className="globe-halo"/><GlobeScene rows={filtered}/><div className="globe-caption"><span className="globe-caption-dot"/> NETWORK VISUALIZATION <b>3D</b></div></div>
              <div className="hero-live-card"><div><span className="live-wave"><Activity size={14}/></span> TRANSACTION VALUE</div><strong>{money(total)}</strong><small>Across current filtered records</small><div className="live-line"><span/><span/><span/><span/><span/><span/><span/><span/></div></div>
            </section>
            <div className="filter-strip"><div className="filter-label"><SlidersHorizontal size={14}/> LIVE FILTERS</div><select value={kind} onChange={e=>setKind(e.target.value)}><option value="All">All transaction types</option>{[...new Set(rows.map(x=>x.Transaction_Type))].map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Success</option><option>Failed</option></select><select value={range} onChange={e=>setRange(e.target.value)}><option>All time</option><option>Last 7 days</option><option>Last 30 days</option></select><span className="filter-count">{filtered.length} MATCHING RECORDS</span></div>
            <div className="metrics-grid">
              <Metric label="TOTAL TRANSACTIONS" value={filtered.length.toLocaleString('en-IN')} sub="Records in current view" icon={Activity} delay={.02}/>
              <Metric label="TOTAL TRANSACTION VALUE" value={money(total)} sub="Combined value · INR" icon={Wallet} tone="violet" delay={.08}/>
              <Metric label="SUCCESS RATE" value={`${rate.toFixed(1)}%`} sub={`${success} successful transactions`} icon={ShieldCheck} tone="green" delay={.14}/>
              <Metric label="FAILED TRANSACTIONS" value={failed.toLocaleString('en-IN')} sub={`${money(failedValue)} value affected`} icon={ShieldAlert} tone="rose" delay={.2}/>
            </div>
            <div className="dashboard-grid overview-grid">
              <Panel title="Value movement" subtitle="Daily transaction value · INR" tag="TIME SERIES" className="span-2"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={byDay}><defs><linearGradient id="vaultArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45dff7" stopOpacity={.36}/><stop offset="95%" stopColor="#45dff7" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff" strokeOpacity={.055} vertical={false}/><XAxis dataKey="date" tick={{fill:'#778aa5',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#778aa5',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${compact(v)}`}/><Tooltip contentStyle={{background:'#091728',border:'1px solid #28506a',borderRadius:12,color:'#e9f8ff'}} formatter={v=>money(v)}/><Area type="monotone" dataKey="amount" stroke="#4be2fa" strokeWidth={2.5} fill="url(#vaultArea)" activeDot={{r:5,fill:'#fff',stroke:'#4be2fa',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div></Panel>
              <Panel title="Transaction outcomes" subtitle="Success and failed records" tag="QUALITY"><div className="outcome-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{name:'Success',value:success},{name:'Failed',value:failed}]} dataKey="value" innerRadius="72%" outerRadius="94%" paddingAngle={4} stroke="none">{[0,1].map((v,i)=><Cell key={i} fill={i?'#ff6e83':'#42e0b0'}/>)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><b>{rate.toFixed(0)}%</b><small>SUCCESS</small></div></div><div className="outcome-legend"><span><i className="green-dot"/>Successful <b>{success}</b></span><span><i className="red-dot"/>Failed <b>{failed}</b></span><small>Calculated from visible records</small></div></div></Panel>
              <Panel title="Transaction mix" subtitle="Value distribution by type" tag="COMPOSITION"><div className="chart-area compact-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byType} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4} stroke="none">{byType.map((x,i)=><Cell key={x.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{background:'#091728',border:'1px solid #28506a',borderRadius:12}} formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="type-legend">{byType.map((x,i)=><span key={x.name}><i style={{background:COLORS[i%COLORS.length]}}/>{x.name}<b>{money(x.value)}</b></span>)}</div></Panel>
              <Panel title="Activity by location" subtitle="Highest transaction value" tag="GEOGRAPHY" className="span-2"><div className="location-bars">{byLocation.slice(0,5).map((x,i)=><div className="location-row" key={x.name}><span className="location-rank">0{i+1}</span><div className="location-info"><div><b>{x.name}</b><small>{x.count} transactions</small></div><div className="bar-track"><i style={{width:`${byLocation[0]?.amount?x.amount/byLocation[0].amount*100:0}%`,background:COLORS[i%COLORS.length]}}/></div></div><strong>{money(x.amount)}</strong></div>)}</div></Panel>
              <Panel title="Recent transactions" subtitle="Latest records in the active dataset" tag="RECORDS"><div className="mini-transactions">{[...filtered].slice(-5).reverse().map(x=><button key={x.Transaction_ID} className="mini-transaction" onClick={()=>setSelected(x)}><span className={`transaction-symbol ${norm(x.Status)==='failed'?'failed':''}`}>{norm(x.Status)==='failed'?<CircleAlert size={15}/>:<ArrowUpRight size={15}/>}</span><span><b>{x.Transaction_Type} · {x.Transaction_ID}</b><small>{x.Location} · {safeDate(x.Transaction_Date)}</small></span><strong>{money(x.Amount)}</strong></button>)}</div><button className="text-link" onClick={()=>setPageSafe('Data Explorer')}>Open transaction explorer <ArrowRight size={14}/></button></Panel>
            </div>
          </motion.div>}
          {page==='Transaction Flow'&&<motion.div key="flow" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><div className="flow-hero"><div><span className="eyebrow">NETWORK INTELLIGENCE</span><h2>Transaction <em>flow map</em></h2><p>Explore the transaction network by location, type and outcome. Each node represents a location present in the dataset.</p></div><div className="flow-total"><small>VALUE IN VIEW</small><b>{money(total)}</b><span>{filtered.length} records</span></div></div><Panel title="Location-to-location activity" subtitle="Dataset-derived location nodes and transaction volume" tag="NETWORK"><div className="flow-network"><div className="network-orbit orbit-a"/><div className="network-orbit orbit-b"/><svg viewBox="0 0 900 390" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="flowline"><stop stopColor="#4be4ff" stopOpacity=".1"/><stop offset=".5" stopColor="#8d8aff"/><stop offset="1" stopColor="#4be4ff" stopOpacity=".1"/></linearGradient></defs>{byLocation.map((a,i)=>byLocation.slice(i+1).map((b,j)=><path key={`${a.name}-${b.name}`} d={`M ${80+i*(740/Math.max(1,byLocation.length-1))} ${100+(i%3)*85} Q ${450} ${35+j*45} ${80+(i+j+1)*(740/Math.max(1,byLocation.length-1))} ${115+((i+j)%3)*75}`} stroke="url(#flowline)" strokeWidth={Math.max(1,Math.min(4,a.amount/Math.max(total,1)*18))} fill="none" strokeDasharray="7 8" className="flow-path"/>))}{byLocation.map((x,i)=><g key={x.name} className="flow-node" onClick={()=>{setQuery(x.name);setPageSafe('Data Explorer')}}><circle cx={80+i*(740/Math.max(1,byLocation.length-1))} cy={100+(i%3)*85} r={Math.min(28,13+x.count*2)} fill="#0c2940" stroke={COLORS[i%COLORS.length]} strokeWidth="2"/><circle cx={80+i*(740/Math.max(1,byLocation.length-1))} cy={100+(i%3)*85} r="5" fill={COLORS[i%COLORS.length]}/><text x={80+i*(740/Math.max(1,byLocation.length-1))} y={145+(i%3)*85} textAnchor="middle">{x.name}</text><text x={80+i*(740/Math.max(1,byLocation.length-1))} y={160+(i%3)*85} textAnchor="middle" className="node-value">{money(x.amount)}</text></g>)}</svg></div></Panel><div className="metrics-grid three"><Metric label="NETWORK LOCATIONS" value={byLocation.length} sub="Distinct locations" icon={MapPin}/><Metric label="AVERAGE TRANSACTION" value={money(avg)} sub="Per visible record" icon={Wallet} tone="violet"/><Metric label="VALUE IN FAILED FLOW" value={money(failedValue)} sub="Failed transaction amount" icon={ShieldAlert} tone="rose"/></div></motion.div>}
          {page==='Analytics'&&<motion.div key="analytics" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><div className="metrics-grid"><Metric label="TOTAL VALUE" value={money(total)} sub="Current filter selection" icon={Wallet}/><Metric label="AVERAGE VALUE" value={money(avg)} sub="Per transaction" icon={Activity} tone="violet"/><Metric label="TRANSACTION TYPES" value={byType.length} sub="Distinct categories" icon={Layers3} tone="green"/><Metric label="RECORD COUNT" value={filtered.length} sub="Visible records" icon={Database} tone="rose"/></div><div className="dashboard-grid"><Panel title="Daily value and volume" subtitle="Combined value and transaction count by date" tag="TREND" className="span-2"><div className="chart-area tall"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={dailyCount}><defs><linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4be2fa" stopOpacity={.3}/><stop offset="95%" stopColor="#4be2fa" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff" strokeOpacity={.055} vertical={false}/><XAxis dataKey="date" tick={{fill:'#778aa5',fontSize:10}} axisLine={false} tickLine={false} minTickGap={28}/><YAxis yAxisId="left" tick={{fill:'#778aa5',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${compact(v)}`}/><YAxis yAxisId="right" orientation="right" tick={{fill:'#778aa5',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip contentStyle={{background:'#091728',border:'1px solid #28506a',borderRadius:12,color:'#e9f8ff'}} formatter={(v,name)=>name==='amount'?[money(v),'Value']:[`${v} txns`,'Volume']}/><Bar yAxisId="right" dataKey="count" fill="#9b8cff" fillOpacity={.35} radius={[3,3,0,0]} maxBarSize={9}/><Area yAxisId="left" type="monotone" dataKey="amount" stroke="#4be2fa" strokeWidth={2.2} fill="url(#analyticsArea)" activeDot={{r:4,fill:'#fff',stroke:'#4be2fa',strokeWidth:2}}/></ComposedChart></ResponsiveContainer></div></Panel><Panel title="Value by transaction type" subtitle="Compare category totals" tag="BREAKDOWN"><div className="chart-area tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={byType} layout="vertical"><CartesianGrid stroke="#ffffff" strokeOpacity={.05} horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={85} tick={{fill:'#a9b8cc',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#091728',border:'1px solid #28506a',borderRadius:12}} formatter={v=>money(v)}/><Bar dataKey="value" radius={[0,7,7,0]}>{byType.map((x,i)=><Cell key={x.name} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></Panel></div><div className="dashboard-grid">{typeSeries.map(t=><Panel key={t.name} title={`${t.name} trend`} subtitle={`${money(t.total)} · ${t.count} transactions`} tag={t.name.toUpperCase()}><div className="chart-area">{t.series.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={t.series}><defs><linearGradient id={`grad-${norm(t.name)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t.color} stopOpacity={.34}/><stop offset="95%" stopColor={t.color} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff" strokeOpacity={.055} vertical={false}/><XAxis dataKey="date" tick={{fill:'#778aa5',fontSize:9}} axisLine={false} tickLine={false} minTickGap={34}/><YAxis tick={{fill:'#778aa5',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${compact(v)}`}/><Tooltip contentStyle={{background:'#091728',border:'1px solid #28506a',borderRadius:12,color:'#e9f8ff'}} formatter={(v,_n,p)=>[`${money(v)} (${p?.payload?.count||0} txns)`,t.name]}/><Area type="monotone" dataKey="amount" stroke={t.color} strokeWidth={2.2} fill={`url(#grad-${norm(t.name)})`} activeDot={{r:4,fill:'#fff',stroke:t.color,strokeWidth:2}}/></AreaChart></ResponsiveContainer>:<Empty text={`No ${t.name.toLowerCase()} records in current view.`}/>}</div></Panel>)}</div></motion.div>}
          {page==='Geographic Intelligence'&&<motion.div key="geo" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><Panel title="Geographic activity field" subtitle="Location distribution projected across India · click a city pin to inspect records" tag="LOCATION INTELLIGENCE"><div className="geo-layout"><GeographicMap locations={byLocation} colors={COLORS} money={money} onSelectLocation={(loc)=>{setQuery(loc);setPageSafe('Data Explorer')}}/><div className="geo-ranking"><span className="eyebrow">LOCATION RANKING</span>{byLocation.map((x,i)=><div className="geo-rank" key={x.name}><span>{String(i+1).padStart(2,'0')}</span><div><b>{x.name}</b><small>{x.count} records</small></div><strong>{money(x.amount)}</strong></div>)}</div></div></Panel><div className="metrics-grid three"><Metric label="ACTIVE LOCATIONS" value={byLocation.length} sub="Distinct dataset locations" icon={MapPin}/><Metric label="TOP LOCATION" value={byLocation[0]?.name||'—'} sub={money(byLocation[0]?.amount||0)} icon={Globe2} tone="violet"/><Metric label="LOCATION COVERAGE" value={`${byLocation.length} cities`} sub="Observed in current dataset" icon={Building2} tone="green"/></div></motion.div>}
          {page==='Risk & Failures'&&<motion.div key="risk" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><div className="risk-banner"><div className="risk-icon"><ShieldAlert size={28}/></div><div><span className="eyebrow">PAYMENT OUTCOME MONITOR</span><h2>{failed} failed <em>transactions</em></h2><p>These are records marked Failed in the source dataset; they are not independently verified fraud findings.</p></div><div className="risk-rate"><b>{filtered.length?(failed/filtered.length*100).toFixed(1):'0.0'}%</b><small>FAILURE RATE</small></div></div><div className="metrics-grid three"><Metric label="FAILED RECORDS" value={failed} sub="Status = Failed" icon={CircleAlert} tone="rose"/><Metric label="FAILED VALUE" value={money(failedValue)} sub="Total failed amount" icon={Wallet} tone="violet"/><Metric label="SUCCESSFUL RECORDS" value={success} sub="Status = Success" icon={CheckCircle2} tone="green"/></div><Panel title="Failure review queue" subtitle="Sorted by transaction amount · inspect source records" tag="REVIEW"><div className="review-list">{alerts.length?alerts.map(x=><button className="review-row" key={x.Transaction_ID} onClick={()=>setSelected(x)}><span className="review-alert"><CircleAlert size={17}/></span><span className="review-main"><b>{x.Transaction_ID} · {x.Transaction_Type}</b><small>{x.Location} · {safeDate(x.Transaction_Date)} · Customer {x.Customer_ID}</small></span><strong>{money(x.Amount)}</strong><span className="status-badge failed">FAILED</span><Eye size={16}/></button>):<Empty text="No failed records in the current filter selection."/>}</div></Panel></motion.div>}
          {page==='Data Explorer'&&<motion.div key="data" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><div className="explorer-toolbar"><div><span className="eyebrow">SOURCE RECORDS</span><h2>Transaction <em>ledger</em></h2><p>Search and filter the records currently loaded into VAULT.</p></div><div className="explorer-controls"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="All">All types</option>{[...new Set(rows.map(x=>x.Transaction_Type))].map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Success</option><option>Failed</option></select><button className="button-primary" onClick={exportCsv}><Download size={14}/> Export CSV</button></div></div><Panel title="All transactions" subtitle={`${filtered.length} records match your current search and filters`} tag="LIVE DATA"><div className="table-wrap"><table><thead><tr><th>TRANSACTION ID</th><th>CUSTOMER</th><th>DATE</th><th>TYPE</th><th>LOCATION</th><th>AMOUNT</th><th>STATUS</th><th/></tr></thead><tbody>{filtered.map(x=><tr key={x.Transaction_ID} onClick={()=>setSelected(x)} className="clickable-row"><td className="mono">{x.Transaction_ID}</td><td>{x.Customer_ID}</td><td>{safeDate(x.Transaction_Date)}</td><td>{x.Transaction_Type}</td><td>{x.Location}</td><td className="amount-cell">{money(x.Amount)}</td><td><span className={`status-badge ${norm(x.Status)}`}>{x.Status}</span></td><td><Eye size={15}/></td></tr>)}</tbody></table>{!filtered.length&&<Empty/>}</div><div className="table-footer"><span>Showing {filtered.length} of {rows.length} records</span><button onClick={exportCsv}><Download size={14}/> Download filtered records</button></div></Panel></motion.div>}
          {page==='Reports'&&<motion.div key="reports" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><div className="report-hero"><FileSpreadsheet size={34}/><div><span className="eyebrow">DATASET EXPORT</span><h2>Build your <em>report.</em></h2><p>Export the current filtered view as a CSV file for further analysis in spreadsheet or Big Data tools.</p></div><button className="button-primary" onClick={exportCsv}><Download size={15}/> Export current view</button></div><div className="metrics-grid three"><Metric label="RECORDS TO EXPORT" value={filtered.length} sub="Current filter selection" icon={Database}/><Metric label="TOTAL VALUE" value={money(total)} sub="INR" icon={Wallet} tone="violet"/><Metric label="FAILED RECORDS" value={failed} sub="Included in export" icon={ShieldAlert} tone="rose"/></div><Panel title="Export contents" subtitle="The export preserves the source transaction fields" tag="CSV"><div className="export-fields">{['Transaction_ID','Customer_ID','Transaction_Date','Transaction_Type','Amount','Location','Status'].map((x,i)=><span key={x}><CheckCircle2 size={15}/>{x}</span>)}</div></Panel></motion.div>}
          {page==='AI Insights'&&<motion.div key="insights" className="page-stack" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.24}}><div className="insight-intro"><BrainCircuit size={32}/><div><span className="eyebrow">RULE-BASED DATA OBSERVATIONS</span><h2>Signals from <em>your data.</em></h2><p>These observations are computed from the current dataset. They are descriptive, not predictive AI or fraud determinations.</p></div></div><div className="insight-grid">{[{title:'Payment completion',value:`${rate.toFixed(1)}%`,body:`${success} of ${filtered.length} visible transactions are marked Success.`,icon:CheckCircle2,tone:'green'},{title:'Largest transaction',value:money(Math.max(0,...filtered.map(x=>Number(x.Amount||0)))),body:filtered.length?`Largest visible record by amount in ${filtered.reduce((a,b)=>Number(a.Amount)>Number(b.Amount)?a:b).Location}.`:'No transaction data available.',icon:Wallet,tone:'cyan'},{title:'Most active location',value:byLocation[0]?.name||'—',body:byLocation[0]?`${byLocation[0].count} transactions totalling ${money(byLocation[0].amount)}.`:'No location data available.',icon:MapPin,tone:'violet'},{title:'Failure exposure',value:money(failedValue),body:`Total amount associated with ${failed} records marked Failed.`,icon:ShieldAlert,tone:'rose'}].map((x,i)=><motion.div className={`insight-card ${x.tone}`} key={x.title} whileHover={{y:-4}}><div className="insight-icon"><x.icon size={19}/></div><small>{x.title}</small><strong>{x.value}</strong><p>{x.body}</p><span className="insight-index">OBSERVATION 0{i+1}</span></motion.div>)}</div></motion.div>}
        </div>
        <footer className="footer"><span><b>VAULT.</b> BANKING TRANSACTION INTELLIGENCE</span><span>{source} · {rows.length} records · Academic analytics workspace</span></footer>
      </div>
    </main>
    <AnimatePresence>{selected&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSelected(null)}><motion.div className="detail-modal" initial={{y:25,scale:.97}} animate={{y:0,scale:1}} exit={{y:15,scale:.98}} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">TRANSACTION DETAIL</span><h3>{selected.Transaction_ID}</h3></div><button className="icon-action" onClick={()=>setSelected(null)}><X size={17}/></button></div><div className="modal-amount">{money(selected.Amount)}<span className={`status-badge ${norm(selected.Status)}`}>{selected.Status}</span></div><div className="detail-grid">{[['Customer ID',selected.Customer_ID],['Date',safeDate(selected.Transaction_Date)],['Type',selected.Transaction_Type],['Location',selected.Location]].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div><p className="detail-note">Details shown directly from the currently loaded transaction record.</p></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
