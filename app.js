/* MonsterDay dashboard — render puro (sem libs, SVG na mão) sobre window.MDAY */
(function(){
'use strict';
var D = window.MDAY || {};
var arr = function(x){ return Array.isArray(x) ? x : (x ? [x] : []); };
var clamp = function(x){ return Math.max(0, Math.min(1, x)); };
var nf0 = new Intl.NumberFormat('pt-BR');
var nf1 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
var nf2 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
var money = function(v){ return 'R$ ' + nf2.format(v||0); };
var money0 = function(v){ return 'R$ ' + nf0.format(Math.round(v||0)); };
var intf = function(v){ return nf0.format(Math.round(v||0)); };
var pct = function(v){ return nf1.format(v||0) + '%'; };
var dv = function(a,b){ return b>0 ? a/b : 0; };
function fmtBR(iso){ if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; var p=iso.split('-'); return p[2]+'/'+p[1]; }
function el(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

var daily = arr(D.daily), grain = arr(D.grain);
var isDate = function(x){ return /^\d{4}-\d{2}-\d{2}$/.test(x); };
var allDates = daily.map(function(d){return d.date;}).filter(isDate).sort();
var maxDate = D.dateMax || allDates[allDates.length-1] || '';
var minDate = D.dateMin || allDates[0] || '';
function addDays(iso,n){ var p=iso.split('-'); var dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); dt.setUTCDate(dt.getUTCDate()+n); return dt.toISOString().slice(0,10); }
function daysBetween(a,b){ var pa=a.split('-'),pb=b.split('-'); return Math.round((Date.UTC(+pb[0],+pb[1]-1,+pb[2])-Date.UTC(+pa[0],+pa[1]-1,+pa[2]))/86400000); }
function inRange(dt,r){ return dt>=r[0] && dt<=r[1]; }

var PRESETS = [
  {k:'hoje',label:'Hoje'},{k:'ontem',label:'Ontem'},{k:'7d',label:'7 dias'},
  {k:'30d',label:'30 dias'},{k:'leads',label:'Período dos leads'},{k:'tudo',label:'Tudo'}
];
var period = 'tudo', customRange = null;
function rangeFor(k){
  if(k==='custom' && customRange) return customRange;
  if(k==='tudo')  return [minDate, maxDate];
  if(k==='hoje')  return [maxDate, maxDate];
  if(k==='ontem'){ var y=addDays(maxDate,-1); return [y,y]; }
  if(k==='7d')    return [addDays(maxDate,-6),  maxDate];
  if(k==='30d')   return [addDays(maxDate,-29), maxDate];
  if(k==='leads') return [D.leadDateMin||minDate, D.leadDateMax||maxDate];
  return [minDate, maxDate];
}
function prevRange(rng){ var len=daysBetween(rng[0],rng[1])+1; var pe=addDays(rng[0],-1); return [addDays(pe,-(len-1)), pe]; }

var METS=['spend','impr','clicks','lpv','v3','v75','metaLeads','leads','A','B','C','D'];
function aggDaily(rng){
  var o={}; METS.forEach(function(k){o[k]=0;});
  daily.forEach(function(d){ if(!inRange(d.date,rng))return; METS.forEach(function(k){o[k]+=(d[k]||0);}); });
  return o;
}
function daysInRange(rng){ return daily.filter(function(d){return isDate(d.date)&&inRange(d.date,rng);}).sort(function(a,b){return a.date.localeCompare(b.date);}); }

/* ---------- meta / goal (localStorage) ---------- */
function getMeta(){ var v=parseFloat(localStorage.getItem('mday_meta_invest')); return (isFinite(v)&&v>0)?v:15000; }
function setMeta(v){ localStorage.setItem('mday_meta_invest', v); }

/* ---------- trend ---------- */
function trendHTML(cur, prev, higherBetter){
  if(prev==null || !isFinite(prev) || prev===0 || !isFinite(cur)) return '';
  var ch=(cur-prev)/Math.abs(prev)*100; if(Math.abs(ch)<0.1) return '';
  var up=ch>0, good = higherBetter?up:!up;
  return '<span class="trend '+(good?'up':'down')+'">'+(up?'▲':'▼')+' '+nf1.format(Math.abs(ch))+'%</span>';
}

/* =================== KPI COLUMN =================== */
function subRow(l,v,tr){ return '<div class="sub-row"><span class="s-l">'+l+'</span><span class="s-v">'+v+(tr||'')+'</span></div>'; }
function kpiCard(hl,label,val,subs){
  return '<div class="kpi-card'+(hl?' hl':'')+'"><div class="kpi-main"><div class="m-lab">'+label+'</div><div class="m-val">'+val+'</div></div>'
    +'<div class="kpi-sub">'+subs+'</div></div>';
}
function renderKpiCol(a, p){
  var q=a.A+a.B, pq=p.A+p.B;
  var meta=getMeta(), goal = meta>0 ? a.spend/meta*100 : 0;
  var hero='<div class="kpi-hero"><div class="h-top"><div><div class="h-lab">Investimento com imposto</div>'
    +'<div class="h-val">'+money(a.spend)+'</div></div>'
    +'<div class="meta-inp">Meta R$ <input id="metaInp" type="number" min="0" step="500" value="'+meta+'"></div></div>'
    +'<div class="goal-wrap"><div class="goal-track"><span style="width:'+Math.min(100,goal).toFixed(1)+'%"></span></div>'
    +'<div class="goal-meta"><span class="goal-pct">'+pct(goal)+' da meta</span><span>Meta '+money0(meta)+'</span></div></div></div>';

  var cards='';
  // Impressões
  cards+=kpiCard(false,'Impressões',intf(a.impr),
    subRow('CPM', money(dv(a.spend,a.impr)*1000), trendHTML(dv(a.spend,a.impr)*1000, dv(p.spend,p.impr)*1000, false))
    + subRow('CTR', pct(dv(a.clicks,a.impr)*100), trendHTML(dv(a.clicks,a.impr), dv(p.clicks,p.impr), true)));
  // Link Clicks
  cards+=kpiCard(false,'Cliques no link',intf(a.clicks),
    subRow('CPC', money(dv(a.spend,a.clicks)), trendHTML(dv(a.spend,a.clicks), dv(p.spend,p.clicks), false))
    + subRow('CR clique→LP', pct(dv(a.lpv,a.clicks)*100), trendHTML(dv(a.lpv,a.clicks), dv(p.lpv,p.clicks), true)));
  // Page Views
  cards+=kpiCard(false,'Landing Page Views',intf(a.lpv),
    subRow('CPV', money(dv(a.spend,a.lpv)), trendHTML(dv(a.spend,a.lpv), dv(p.spend,p.lpv), false))
    + subRow('Conv. LP→Lead', pct(dv(a.leads,a.lpv)*100), trendHTML(dv(a.leads,a.lpv), dv(p.leads,p.lpv), true)));
  // Leads
  cards+=kpiCard(true,'Leads',intf(a.leads),
    subRow('CPL', money(dv(a.spend,a.leads)), trendHTML(dv(a.spend,a.leads), dv(p.spend,p.leads), false))
    + subRow('Taxa de qualificação', pct(dv(q,a.leads)*100), trendHTML(dv(q,a.leads), dv(pq,p.leads), true))
    + subRow('Meta pixel', '<small>'+intf(a.metaLeads)+' leads</small>',''));
  // Leads Qualificados
  var cplQ=dv(a.spend,q), tgt=150, barW=Math.min(100, tgt>0?cplQ/tgt*100:0), barC = cplQ<=tgt?'var(--good)':(cplQ<=tgt*2?'var(--warn)':'var(--bad)');
  cards+=kpiCard(true,'Leads Qualificados (A+B)',intf(q),
    subRow('CPL Qualificado', q?money(cplQ):'—', trendHTML(cplQ, dv(p.spend,pq), false))
    + subRow('Composição', '<small><b style="color:var(--A)">'+a.A+' A</b> · <b style="color:var(--B)">'+a.B+' B</b></small>','')
    + '<div class="mini-bar"><span style="width:'+barW.toFixed(0)+'%;background:'+barC+'"></span></div>'
    + '<div class="goal-meta"><span>CPL Qualif vs meta R$ '+tgt+'</span></div>');

  el('kpiCol').innerHTML = hero + cards;
  var mi=el('metaInp'); if(mi){ mi.addEventListener('change',function(){ var v=parseFloat(mi.value); if(isFinite(v)&&v>0){ setMeta(v); renderKpiCol(a,p);} }); }
}

/* =================== CHARTS (SVG) =================== */
function xticks(days){ var n=days.length; if(n<=1) return [0]; var step=Math.max(1,Math.round(n/7)); var t=[]; for(var i=0;i<n;i+=step)t.push(i); if(t[t.length-1]!==n-1)t.push(n-1); return t; }

/* --- tooltip dos gráficos --- */
var _tip=null;
function tipEl(){ if(!_tip){ _tip=document.createElement('div'); _tip.className='chart-tip'; _tip.style.display='none'; document.body.appendChild(_tip); } return _tip; }
function tipShow(html,x,y){ var t=tipEl(); t.innerHTML=html; t.style.display='block'; var w=t.offsetWidth,h=t.offsetHeight,nx=x+14,ny=y+14;
  if(nx+w>window.innerWidth-8) nx=x-w-14; if(ny+h>window.innerHeight-8) ny=y-h-14; t.style.left=Math.max(6,nx)+'px'; t.style.top=Math.max(6,ny)+'px'; }
function tipHide(){ if(_tip) _tip.style.display='none'; }
function hitRects(days,pl,gw,pt,ph){ var s=''; for(var i=0;i<days.length;i++){ s+='<rect class="hit" data-i="'+i+'" x="'+(pl+gw*i).toFixed(1)+'" y="'+pt+'" width="'+gw.toFixed(1)+'" height="'+ph+'" fill="transparent" pointer-events="all"/>'; } return s; }
function bindHits(containerId,days,fmt){ var c=el(containerId); if(!c) return;
  Array.prototype.forEach.call(c.querySelectorAll('.hit'),function(r){
    r.addEventListener('mousemove',function(e){ var i=+r.getAttribute('data-i'); if(days[i]) tipShow(fmt(days[i]),e.clientX,e.clientY); });
    r.addEventListener('mouseleave',tipHide); }); }
function tipLeads(d){ var q=d.A+d.B;
  return '<div class="tt-d">'+fmtBR(d.date)+'</div>'
    +'<div class="tt-r"><span style="color:#ff8fb2">Leads</span><b>'+intf(d.leads)+'</b></div>'
    +'<div class="tt-r"><span style="color:#ff1e63">Qualificados A+B</span><b>'+intf(q)+'</b></div>'
    +'<div class="tt-sub">A '+d.A+' · B '+d.B+' · C '+d.C+' · D '+d.D+'</div>'; }
function tipInvest(d){ var q=d.A+d.B;
  return '<div class="tt-d">'+fmtBR(d.date)+'</div>'
    +'<div class="tt-r"><span style="color:var(--pink2)">Investimento</span><b>'+money0(d.spend)+'</b></div>'
    +'<div class="tt-r"><span style="color:#ffab2e">CPL Qualificado</span><b>'+(q>0?money(dv(d.spend,q)):'—')+'</b></div>'
    +'<div class="tt-sub">Leads '+intf(d.leads)+' · Qualif '+intf(q)+' · CPM '+money(dv(d.spend,d.impr)*1000)+'</div>'; }

function renderChartLeads(days){
  var W=600,H=210,pl=30,pr=10,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxL=Math.max.apply(null,days.map(function(d){return d.leads||0;}).concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(2,Math.min(13,gw*0.34));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  // gridlines
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line class="g" x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#242430" stroke-dasharray="2 3"/>'; s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#6d6d78" font-size="9">'+Math.round(maxL*f)+'</text>'; });
  days.forEach(function(d,i){
    var xc=pl+gw*i+gw/2, lh=ph*dv(d.leads,maxL), qh=ph*dv((d.A+d.B),maxL);
    if(d.leads>0) s+='<rect x="'+(xc-bw-1).toFixed(1)+'" y="'+(base-lh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+lh.toFixed(1)+'" rx="1.5" fill="rgba(255,92,143,.5)"/>';
    if((d.A+d.B)>0) s+='<rect x="'+(xc+1).toFixed(1)+'" y="'+(base-qh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+qh.toFixed(1)+'" rx="1.5" fill="#ff1e63"/>';
  });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#6d6d78" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('chartLeads').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(255,92,143,.6)"></span>Leads</span><span><span class="dot" style="background:#ff1e63"></span>Qualificados (A+B)</span></div>';
  bindHits('chartLeads',days,tipLeads);
}

function renderChartInvest(days){
  var W=600,H=210,pl=34,pr=38,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxS=Math.max.apply(null,days.map(function(d){return d.spend||0;}).concat([1]));
  var cpls=days.map(function(d){ var q=d.A+d.B; return q>0?dv(d.spend,q):null; });
  var maxC=Math.max.apply(null,cpls.filter(function(x){return x!=null;}).concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(2,Math.min(15,gw*0.55));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#242430" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#6d6d78" font-size="9">'+Math.round(maxS*f/1000)+'k</text>';
    s+='<text x="'+(W-pr+4)+'" y="'+(y+3)+'" text-anchor="start" fill="#c98a2a" font-size="9">'+Math.round(maxC*f)+'</text>'; });
  days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, sh=ph*dv(d.spend,maxS);
    if(d.spend>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="1.5" fill="rgba(255,30,99,.35)"/>'; });
  // line CPL (right axis)
  var pts=[]; days.forEach(function(d,i){ if(cpls[i]!=null){ var xc=pl+gw*i+gw/2, y=base-ph*dv(cpls[i],maxC); pts.push([xc,y]); } });
  if(pts.length>1){ var dpath='M'+pts.map(function(pp){return pp[0].toFixed(1)+' '+pp[1].toFixed(1);}).join(' L'); s+='<path d="'+dpath+'" fill="none" stroke="#ffab2e" stroke-width="2"/>'; }
  pts.forEach(function(pp){ s+='<circle cx="'+pp[0].toFixed(1)+'" cy="'+pp[1].toFixed(1)+'" r="2.6" fill="#ffab2e"/>'; });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#6d6d78" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('chartInvest').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(255,30,99,.5)"></span>Investimento</span><span><span class="ln" style="background:#ffab2e"></span>CPL Qualificado</span></div>';
  bindHits('chartInvest',days,tipInvest);
}

/* =================== DAILY HEATMAP =================== */
function heatBg(rgb,frac){ return 'background:rgba('+rgb+','+(0.10+0.42*clamp(frac)).toFixed(3)+')'; }
function cplClass(v,lo,hi){ if(v==null||!isFinite(v)||v<=0) return 'cpl-n'; if(v<=lo) return 'cpl-g'; if(v<=hi) return 'cpl-a'; return 'cpl-r'; }
function renderDaily(rng){
  var rows=daysInRange(rng).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var maxS=Math.max.apply(null,rows.map(function(r){return r.spend||0;}).concat([1]));
  var maxL=Math.max.apply(null,rows.map(function(r){return r.leads||0;}).concat([1]));
  var maxQ=Math.max.apply(null,rows.map(function(r){return (r.A+r.B)||0;}).concat([1]));
  var head='<thead><tr><th>Dia</th><th>Gasto</th><th>Leads</th><th>A</th><th>B</th><th>Qualif</th><th>%Qualif</th><th>CPL Qualif</th><th>CPM</th><th>CTR</th></tr></thead>';
  var body=rows.map(function(r){
    var q=r.A+r.B, taxaQ=dv(q,r.leads)*100, cplQ=q>0?dv(r.spend,q):null, cpm=dv(r.spend,r.impr)*1000, ctr=dv(r.clicks,r.impr)*100;
    return '<tr><td>'+fmtBR(r.date)+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('61,139,255',r.spend/maxS)+'">'+money0(r.spend)+'</span></td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('61,139,255',r.leads/maxL)+'">'+intf(r.leads)+'</span></td>'
      +'<td class="num">'+(r.A?'<span class="pillA">'+r.A+'</span>':'·')+'</td>'
      +'<td class="num">'+(r.B?'<span class="pillB">'+r.B+'</span>':'·')+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('255,30,99',q/maxQ)+'">'+(q||'·')+'</span></td>'
      +'<td class="num">'+(r.leads?'<span class="heatcell" style="'+heatBg('51,214,159',taxaQ/100)+'">'+pct(taxaQ)+'</span>':'—')+'</td>'
      +'<td class="num">'+(cplQ!=null?'<span class="cpl-pill '+cplClass(cplQ,100,250)+'">'+money0(cplQ)+'</span>':'—')+'</td>'
      +'<td class="num"><span class="cpl-pill '+cplClass(cpm,50,90)+'">'+money(cpm)+'</span></td>'
      +'<td class="num">'+pct(ctr)+'</td></tr>';
  }).join('');
  if(!rows.length) body='<tr><td colspan="10" class="empty">Sem dados no período.</td></tr>';
  el('dailyTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
}

/* =================== OTIMIZAÇÃO (árvore inline) =================== */
function prettyCamp(c){ return c==='SEM_RASTREIO' ? '— sem rastreio —' : c; }
function prettyAd(a){ return a==='SEM_RASTREIO' ? '— sem rastreio —' : a; }
function newNode(name,full){ return {name:name,full:full,spend:0,impr:0,clicks:0,lpv:0,leads:0,A:0,B:0,C:0,D:0,kids:{}}; }
function accum(n,r){ n.spend+=r.spend||0;n.impr+=r.impr||0;n.clicks+=r.clicks||0;n.lpv+=r.lpv||0;n.leads+=r.leads||0;n.A+=r.A||0;n.B+=r.B||0;n.C+=r.C||0;n.D+=r.D||0; }
var expanded={}, treeInited=false;
function buildTree(rows){ var c={}; rows.forEach(function(r){
  var cn=c[r.campaign]||(c[r.campaign]=newNode(prettyCamp(r.campaign),r.campaign)); accum(cn,r);
  var sn=cn.kids[r.adset]||(cn.kids[r.adset]=newNode(prettyAd(r.adset),r.adset)); accum(sn,r);
  var an=sn.kids[r.ad]||(sn.kids[r.ad]=newNode(prettyAd(r.ad),r.ad)); accum(an,r); }); return c; }
function metricsCells(n){ var q=n.A+n.B, taxaQ=dv(q,n.leads)*100, cplQ=q>0?dv(n.spend,q):null, ctr=dv(n.clicks,n.impr)*100;
  return '<td class="num">'+money0(n.spend)+'</td>'
    +'<td class="num">'+intf(n.leads)+'</td>'
    +'<td class="num">'+(n.A?'<span class="pillA">'+n.A+'</span>':'·')+'</td>'
    +'<td class="num">'+(n.B?'<span class="pillB">'+n.B+'</span>':'·')+'</td>'
    +'<td class="num qcell">'+(q||'·')+'</td>'
    +'<td class="num">'+(n.leads?pct(taxaQ):'—')+'</td>'
    +'<td class="num">'+(cplQ!=null?'<span class="cpl-pill '+cplClass(cplQ,100,250)+'">'+money0(cplQ)+'</span>':'—')+'</td>'
    +'<td class="num">'+pct(ctr)+'</td>'; }
function treeRow(n,lvl,key,hasKids){
  var caret=hasKids?'<span class="caret'+(expanded[key]?' open':'')+'">▶</span>':'<span class="caret" style="opacity:.2">•</span>';
  return '<tr class="lvl'+lvl+(hasKids?' parent':'')+'" data-key="'+encodeURIComponent(key)+'">'
    +'<td><span class="name" title="'+esc(n.full||n.name)+'">'+caret+' '+esc(n.name)+'</span></td>'+metricsCells(n)+'</tr>';
}
function sortKids(obj){ return Object.keys(obj).sort(function(x,y){ return (obj[y].A+obj[y].B)-(obj[x].A+obj[x].B) || obj[y].spend-obj[x].spend; }); }
function renderTree(rng){
  var rows=grain.filter(function(r){return inRange(r.date,rng);});
  var camps=buildTree(rows), order=sortKids(camps);
  if(!treeInited){ order.forEach(function(cK){ expanded['c:'+cK]=true; }); treeInited=true; }
  var head='<thead><tr><th>Campanha › Conjunto › Anúncio</th><th>Gasto</th><th>Leads</th><th>A</th><th>B</th><th>Qualif</th><th>%Qualif</th><th>CPL Qualif</th><th>CTR</th></tr></thead>';
  var out=[];
  order.forEach(function(cK){ var c=camps[cK],cKey='c:'+cK,cHas=Object.keys(c.kids).length>0; out.push(treeRow(c,0,cKey,cHas));
    if(expanded[cKey]){ sortKids(c.kids).forEach(function(sK){ var sN=c.kids[sK],sKey=cKey+'|s:'+sK,sHas=Object.keys(sN.kids).length>0; out.push(treeRow(sN,1,sKey,sHas));
      if(expanded[sKey]){ sortKids(sN.kids).forEach(function(aK){ out.push(treeRow(sN.kids[aK],2,sKey+'|a:'+aK,false)); }); } }); } });
  if(!out.length) out.push('<tr><td colspan="9" class="empty">Sem dados no período.</td></tr>');
  el('treeTbl').innerHTML=head+'<tbody>'+out.join('')+'</tbody>';
  el('treeLegend').innerHTML='<span><span class="dot" style="background:var(--A)"></span>Leadscore A</span>'
    +'<span><span class="dot" style="background:var(--B)"></span>Leadscore B</span>'
    +'<span><span class="dot" style="background:#1f9c73"></span>CPL Qualif barato</span>'
    +'<span><span class="dot" style="background:#c23b52"></span>CPL Qualif caro</span>'
    +'<span style="color:var(--muted2)">ordenado por quem traz mais lead qualificado</span>';
  Array.prototype.forEach.call(el('treeTbl').querySelectorAll('tr.parent'),function(tr){
    tr.addEventListener('click',function(){ var k=decodeURIComponent(tr.getAttribute('data-key')); expanded[k]=!expanded[k]; renderTree(rangeFor(period)); }); });
}

/* =================== LEADSCORE TAB =================== */
function donut(frac,color,cv,cl,size){ size=size||150; var sw=14,r=(size-sw)/2,cx=size/2,c=2*Math.PI*r,off=c*(1-clamp(frac));
  return '<div class="gauge" style="width:'+size+'px;height:'+size+'px"><svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
    +'<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="#20202a" stroke-width="'+sw+'"/>'
    +'<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" transform="rotate(-90 '+cx+' '+cx+')"/></svg>'
    +'<div class="gauge-num"><span class="g-val" style="color:'+color+'">'+cv+'</span><span class="g-lab" style="color:'+color+'">'+cl+'</span></div></div>'; }
function renderScoreTab(a){
  var q=a.A+a.B, total=a.leads, qFrac=dv(q,total);
  el('scoreGauge').innerHTML=donut(qFrac,'#ff1e63',total?pct(qFrac*100):'—','qualif A+B',150);
  var tiers=[['A','Quente',a.A,'var(--A)'],['B','Morno',a.B,'var(--B)'],['C','Frio',a.C,'var(--C)'],['D','Desq.',a.D,'var(--D)']];
  var maxT=Math.max.apply(null,tiers.map(function(t){return t[2];}).concat([1]));
  el('scoreBars').innerHTML='<div style="flex:1">'+tiers.map(function(t){ var w=t[2]>0?Math.max(4,t[2]/maxT*100):0;
    return '<div class="hl-row"><span class="hl-k" style="width:96px"><b style="color:'+t[3]+'">'+t[0]+'</b> '+t[1]+'</span><span class="hl-bar"><span style="width:'+w+'%;background:'+t[3]+'"></span></span><span class="hl-v">'+intf(t[2])+(total?' · '+pct(dv(t[2],total)*100):'')+'</span></div>'; }).join('')+'</div>';
  el('scoringRules').innerHTML=arr(D.scoring).map(function(s){ var pos=s.pts>=0; return '<div class="rule"><span>'+s.label+'</span><span class="pts '+(pos?'pos':'neg')+'">'+(pos?'+':'')+s.pts+'</span></div>'; }).join('');
  el('tierRules').innerHTML='<div class="tier-rules">'+arr(D.tiers).map(function(t){ var col={A:'var(--A)',B:'var(--B)',C:'var(--C)',D:'var(--D)'}[t.tier];
    var rng=t.tier==='D'?'≤ 0':(t.tier==='A'?'≥ '+t.min:t.min+' a '+({B:4,C:2}[t.tier]));
    return '<div class="tier-chip"><div class="t" style="color:'+col+'">'+t.tier+'</div><div class="l">'+t.label+'</div><div class="r">'+rng+' pts</div></div>'; }).join('')+'</div>';
  el('qualifBreak').innerHTML=qbBlock('Faturamento mensal',arr(D.qualifFat))+qbBlock('Como atua',arr(D.qualifAtua))+qbBlock('Funil de venda',arr(D.qualifFun));
  renderAdRank(rangeFor(period));
}
function qbBlock(title,list){ var max=Math.max.apply(null,list.map(function(x){return x.n;}).concat([1]));
  var bars=list.length?list.map(function(x){ return '<div class="qbar"><div class="qbar-top"><span class="l" title="'+esc(x.label)+'">'+esc(x.label)+'</span><span class="n">'+x.n+'</span></div><div class="qbar-track"><span style="width:'+Math.max(6,x.n/max*100)+'%"></span></div></div>'; }).join(''):'<div class="empty">Sem qualificados ainda.</div>';
  return '<div><div class="qb-h">'+title+'</div>'+bars+'</div>'; }
function renderAdRank(rng){
  var rows=grain.filter(function(r){return inRange(r.date,rng)&&r.ad!=='SEM_RASTREIO';}), ads={};
  rows.forEach(function(r){ var k=r.ad+'##'+r.campaign; var n=ads[k]||(ads[k]={ad:prettyAd(r.ad),camp:r.campaign,spend:0,leads:0,A:0,B:0}); n.spend+=r.spend||0;n.leads+=r.leads||0;n.A+=r.A||0;n.B+=r.B||0; });
  var list=Object.keys(ads).map(function(k){return ads[k];}).filter(function(n){return n.leads>0;}).sort(function(x,y){return (y.A+y.B)-(x.A+x.B)||y.A-x.A;});
  var head='<thead><tr><th>Anúncio</th><th>Campanha</th><th>Gasto</th><th>Leads</th><th>A</th><th>B</th><th>Qualif</th><th>CPL Qualif</th></tr></thead>';
  var body=list.map(function(n){ var q=n.A+n.B, cplQ=q>0?dv(n.spend,q):null;
    return '<tr><td>'+esc(n.ad)+'</td><td style="color:var(--muted)"><span class="name" title="'+esc(n.camp)+'">'+esc(n.camp)+'</span></td>'
      +'<td class="num">'+money0(n.spend)+'</td><td class="num">'+intf(n.leads)+'</td>'
      +'<td class="num">'+(n.A?'<span class="pillA">'+n.A+'</span>':'·')+'</td><td class="num">'+(n.B?'<span class="pillB">'+n.B+'</span>':'·')+'</td>'
      +'<td class="num qcell">'+(q||'·')+'</td><td class="num">'+(cplQ!=null?'<span class="cpl-pill '+cplClass(cplQ,100,250)+'">'+money0(cplQ)+'</span>':'—')+'</td></tr>'; }).join('');
  if(!list.length) body='<tr><td colspan="8" class="empty">Nenhum lead rastreado no período.</td></tr>';
  el('adRankTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
}

/* =================== CHROME =================== */
function periodsHTML(){
  return PRESETS.map(function(p){return '<button data-k="'+p.k+'" class="pbtn">'+p.label+'</button>';}).join('')
    + '<span class="daterange" id="daterange"><span class="dr-l">De</span> <input type="date" id="dtDe" min="'+minDate+'" max="'+maxDate+'"> <span class="dr-l">até</span> <input type="date" id="dtAte" min="'+minDate+'" max="'+maxDate+'"></span>';
}
function syncPeriodUI(){
  var rng=rangeFor(period);
  Array.prototype.forEach.call(el('periods').querySelectorAll('.pbtn'),function(b){ b.classList.toggle('on', period===b.getAttribute('data-k')); });
  var drEl=el('daterange'); if(drEl) drEl.classList.toggle('on', period==='custom');
  var de=el('dtDe'), ate=el('dtAte'); if(de&&ate){ de.value=rng[0]; ate.value=rng[1]; }
}
function initPeriods(){
  el('periods').innerHTML=periodsHTML();
  Array.prototype.forEach.call(el('periods').querySelectorAll('.pbtn'),function(b){
    b.addEventListener('click',function(){ period=b.getAttribute('data-k'); customRange=null; syncPeriodUI(); renderAll(); });
  });
  var de=el('dtDe'), ate=el('dtAte');
  function onDate(){
    var s=de.value, e=ate.value; if(!s||!e) return;
    if(s>e){ var t=s; s=e; e=t; }
    if(s<minDate) s=minDate; if(e>maxDate) e=maxDate;
    customRange=[s,e]; period='custom'; syncPeriodUI(); renderAll();
  }
  de.addEventListener('change',onDate); ate.addEventListener('change',onDate);
  syncPeriodUI();
}
function renderAll(){ var rng=rangeFor(period), a=aggDaily(rng), p=aggDaily(prevRange(rng)), days=daysInRange(rng);
  renderKpiCol(a,p); renderChartLeads(days); renderChartInvest(days); renderDaily(rng); renderTree(rng); renderScoreTab(a); }
function activateTab(id){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.toggle('active',x.getAttribute('data-tab')===id);});
  ['funil','score'].forEach(function(k){ el('tab-'+k).classList.toggle('hidden',k!==id); }); }
function initTabs(){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(t){ t.addEventListener('click',function(){ var id=t.getAttribute('data-tab'); activateTab(id); if(history.replaceState)history.replaceState(null,'','#'+id); }); });
  var h=(location.hash||'').replace('#',''); if(h==='score'||h==='funil')activateTab(h);
  window.addEventListener('hashchange',function(){ var k=(location.hash||'').replace('#',''); if(k==='score'||k==='funil')activateTab(k); }); }
function initCoverage(){ el('updated').textContent=D.generatedAtBR||'—'; el('taxf').textContent=nf2.format(D.taxMultiplier||1.1385);
  el('coverage').innerHTML='Leads registrados: <b>'+fmtBR(D.leadDateMin||'')+' → '+fmtBR(D.leadDateMax||'')+'</b> · Tráfego/gasto: <b>'+fmtBR(minDate)+' → '+fmtBR(maxDate)+'</b> — a planilha de leads começa em '+fmtBR(D.leadDateMin||'')+'; em dias sem lead o CPL fica "—". Use "Período dos leads" p/ alinhar.'; }

if(!daily.length && !grain.length){ el('coverage').innerHTML='<b>Sem dados.</b> Rode o build.ps1 para gerar o data.js.'; }
else { initCoverage(); initPeriods(); initTabs(); renderAll(); }
})();
