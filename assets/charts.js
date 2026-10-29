/* Exact SVG charts: numeric axes, ticks and zero frequencies. */
var ThirtyCharts=(function(){
  'use strict';
  function barSVG(table,options={}) {
    const C=ThirtyCore,E=C.escapeHTML;
    if(!table.length)return '<p class="small muted">Todavía no hay mediciones en esta selección.</p>';
    const ordered=table.slice().sort((a,b)=>a.value-b.value),values=ordered.map(r=>r.value),counts=ordered.map(r=>r.count);
    const step=options.step||1,min=Math.min(...values),max=Math.max(...values),peak=Math.max(1,...counts,options.yMax||0);
    const yStep=Math.max(1,Math.ceil(peak/6)),yMax=Math.ceil(peak/yStep)*yStep;
    const width=Math.max(640,Math.min(2600,ordered.length*30+120)),height=365,left=68,right=25,top=32,bottom=70,pw=width-left-right,ph=height-top-bottom;
    const xLo=min-step/2,xHi=max+step/2,x=v=>left+(v-xLo)/(xHi-xLo)*pw,y=n=>top+ph-n/yMax*ph;
    const number=n=>Number(n).toLocaleString('es-CR',{maximumFractionDigits:2});
    let grid='',ticks='',bars='';
    for(let n=0;n<=yMax;n+=yStep){grid+=`<line x1="${left}" x2="${width-right}" y1="${y(n)}" y2="${y(n)}" class="chart-grid"/>`;ticks+=`<line x1="${left-5}" x2="${left}" y1="${y(n)}" y2="${y(n)}" class="chart-axis"/><text x="${left-12}" y="${y(n)+5}" text-anchor="end">${n}</text>`;}
    const tickEvery=Math.max(1,Math.ceil((max-min)/step/22)),tickStep=step*tickEvery;
    for(let i=0;i<=Math.round((max-min)/tickStep);i++){const v=Math.round((min+i*tickStep)*100)/100;ticks+=`<line x1="${x(v)}" x2="${x(v)}" y1="${y(0)}" y2="${y(0)+6}" class="chart-axis"/><text x="${x(v)}" y="${y(0)+25}" text-anchor="middle">${E(number(v))}</text>`;}
    const barWidth=Math.max(.6,Math.min(35,pw/(Math.max(1,(max-min)/step)+1)*.7));
    ordered.forEach(r=>{const h=y(0)-y(r.count);bars+=`<g><title>${E(number(r.value))} segundos: ${r.count}</title>${r.count?`<rect x="${x(r.value)-barWidth/2}" y="${y(r.count)}" width="${barWidth}" height="${h}" rx="2" class="chart-bar"/>`:`<circle cx="${x(r.value)}" cy="${y(0)}" r="2" class="chart-zero"/>`}${ordered.length<=45?`<text x="${x(r.value)}" y="${y(r.count)-8}" text-anchor="middle" class="chart-count">${r.count}</text>`:''}</g>`;});
    return `<div class="svg-chart-wrap"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="stat-chart" role="img" aria-label="${E(options.label||'Frecuencia absoluta según tiempo registrado en segundos')}. ${E(ordered.map(r=>number(r.value)+' s: '+r.count).join('; '))}"><text x="${left}" y="18">Frecuencia absoluta</text>${grid}<path d="M${left} ${top}V${y(0)}H${width-right}" fill="none" class="chart-axis"/>${ticks}${bars}<text x="${left+pw/2}" y="${height-12}" text-anchor="middle">Tiempo registrado (segundos)</text></svg></div><p class="small muted chart-caption">Los ejes tienen marcas numéricas. Los puntos sobre el eje horizontal indican frecuencia 0.</p>`;
  }
  return {barSVG};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ThirtyCharts;
