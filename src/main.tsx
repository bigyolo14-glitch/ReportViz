import React, {useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import Papa from "papaparse";
import * as echarts from "echarts";
import "./styles.css";

type Row = Record<string, string | number | null>;
type AxisSide = "left" | "right";
type ViewMode = "overlay" | "lanes";

const palette = ["#e56b2f", "#2f8f5b", "#245f8f", "#8b5e3c", "#7c4d9f", "#b58b00"];

const demo = Array.from({length: 420}, (_, i) => {
  const t = i * 1000;
  const ramp = Math.min(1, Math.max(0, (t - 18000) / 30000));
  const speed = 2480 * ramp + 35 * Math.sin(i / 4);
  const current = 35 + 220 * (1 - Math.exp(-Math.max(0, t - 22000) / 28000)) + 12 * Math.sin(i * 1.7);
  const power = Math.max(0, speed * current / 9550 * 0.55) + 1.8 * Math.sin(i * 1.1);
  const temperature = 47 + Math.max(0, i - 35) * 0.28 + 2.5 * Math.sin(i / 12);
  return {Time: t, Current: current, Speed: speed, Power: power, Temperature: temperature};
});

function unitFor(name: string){
  const n=name.toLowerCase();
  if(n.includes("speed") || n.includes("rpm")) return "RPM";
  if(n.includes("current") || n.includes("amp")) return "A rms";
  if(n.includes("power")) return "kW";
  if(n.includes("temperature") || n.includes("temp")) return "°C";
  if(n.includes("torque")) return "Nm";
  if(n.includes("voltage") || n.includes("volt")) return "V";
  return "";
}

function App(){
  const [rows,setRows]=useState<Row[]>(demo);
  const [fileName,setFileName]=useState("demo_motor_test.csv");
  const [signals,setSignals]=useState(["Current","Speed","Power","Temperature"]);
  const [x,setX]=useState("Time");
  const [axisSide,setAxisSide]=useState<AxisSide>("left");
  const [viewMode,setViewMode]=useState<ViewMode>("overlay");
  const [dragOver,setDragOver]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const columns=useMemo(()=>rows.length ? Object.keys(rows[0]) : [],[rows]);

  function load(file:File){
    setFileName(file.name);
    if(file.name.toLowerCase().endsWith(".csv")){
      Papa.parse<Row>(file,{header:true,dynamicTyping:true,skipEmptyLines:true,complete:r=>{
        const clean=r.data.filter(row=>Object.values(row).some(v=>v!==null && v!==""));
        setRows(clean);
        const cols=clean.length?Object.keys(clean[0]):[];
        const firstNumeric=cols.filter(c=>c!==x).filter(c=>clean.some(r=>Number.isFinite(Number(r[c]))));
        setSignals(firstNumeric.slice(0,4));
      }});
    }
  }

  return <main className="app">
    <header className="topbar">
      <div className="brand"><span className="mark">R</span><div><strong>ReportViz</strong><small>Engineering Data Studio</small></div></div>
      <div className="filepill">● {fileName}</div>
      <button className="ghost">⌘K</button><button className="ghost">⚙</button>
    </header>
    <section className="workspace">
      <aside className="sidebar">
        <div className="sectionTitle">VARIABLES</div>
        <input className="search" placeholder="Search variables..." />
        <label className="axis">X axis <select value={x} onChange={e=>setX(e.target.value)}>{columns.map(c=><option key={c}>{c}</option>)}</select></label>
        <div className="signalList">
          {columns.filter(c=>c!==x).map((c,i)=><label key={c} className="signal">
            <input type="checkbox" checked={signals.includes(c)} onChange={()=>setSignals(s=>s.includes(c)?s.filter(v=>v!==c):[...s,c])}/>
            <span className="swatch" style={{background:palette[signals.indexOf(c)%palette.length]}}></span>
            <span>{c}</span><em>{unitFor(c)}</em>
          </label>)}
        </div>
        <div className="sideDivider"/>
        <div className="sectionTitle">VIEW MODE</div>
        <div className="axisMode">
          <button className={viewMode==="overlay"?"selected":""} onClick={()=>setViewMode("overlay")}>Overlay</button>
          <button className={viewMode==="lanes"?"selected":""} onClick={()=>setViewMode("lanes")}>Signal lanes</button>
        </div>
        <div className="sectionTitle">AXIS MODE</div>
        <div className="axisMode">
          <button className={axisSide==="left"?"selected":""} onClick={()=>setAxisSide("left")}>All left</button>
          <button className={axisSide==="right"?"selected":""} onClick={()=>setAxisSide("right")}>All right</button>
        </div>
        <div className="hint">Every variable keeps an independent scale and unit.</div>
        <button className="upload" onClick={()=>input.current?.click()}>＋ Upload report</button>
        <input ref={input} hidden type="file" accept=".csv" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])}/>
      </aside>
      <section className="canvas">
        <div className="canvasHead"><div><h1>Engineering graph</h1><p>{viewMode==="overlay"?"Independent Y-axis scaling · synchronized crosshair · zoom":"One independent lane per signal · synchronized X-axis"}</p></div><div className="actions"><button>↶</button><button>↷</button><button>⛶</button><button className="primary">Export</button></div></div>
        <div className={"chartShell "+(dragOver?"dropActive":"")} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)load(f)}}>
          <div className="plotBadge">ENGINEERING MODE <span>• {signals.length} signals</span></div>
          <Chart rows={rows} x={x} signals={signals} axisSide={axisSide} viewMode={viewMode}/>
          {dragOver && <div className="dropOverlay">Drop report to analyze</div>}
        </div>
        <div className="statusbar"><span>Mouse wheel: zoom</span><span>Shift + wheel: horizontal</span><span>Drag: pan</span><span>Double click: reset</span><span>Ctrl/Cmd + wheel: vertical scale</span></div>
        <div className="cards">
          <Metric title="Rows" value={rows.length.toLocaleString()} sub="Samples loaded"/>
          <Metric title="Signals" value={String(signals.length)} sub="Independent axes"/>
          <Metric title="X range" value={`${formatNumber(rows[0]?.[x])} → ${formatNumber(rows[rows.length-1]?.[x])}`} sub={unitFor(x) || "raw units"}/>
        </div>
      </section>
    </section>
  </main>
}

function formatNumber(v:unknown){
  const n=Number(v); return Number.isFinite(n)?n.toLocaleString():"—";
}

function Metric({title,value,sub}:{title:string,value:string,sub:string}){
 return <div className="metricCard"><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>
}

function Chart({rows,x,signals,axisSide,viewMode}:{rows:Row[],x:string,signals:string[],axisSide:AxisSide,viewMode:ViewMode}){
 const ref=useRef<HTMLDivElement>(null);
 React.useEffect(()=>{
   if(!ref.current || !signals.length)return;
   const chart=echarts.init(ref.current);
   const colors=signals.map((_,i)=>palette[i%palette.length]);
   const numericX=rows.map(r=>Number(r[x])).filter(Number.isFinite);
   const xMin=numericX.length?Math.min(...numericX):0;
   const xMax=numericX.length?Math.max(...numericX):rows.length-1;
   const ranges=signals.map(s=>{
     const vals=rows.map(r=>Number(r[s])).filter(Number.isFinite);
     const min=vals.length?Math.min(...vals):0;
     const max=vals.length?Math.max(...vals):1;
     const span=Math.max(max-min,Math.abs(max)*.02,1);
     return {min:min-span*.06,max:max+span*.06};
   });

   if(viewMode==="lanes"){
     const gap=34, laneHeight=Math.max(105,Math.floor(440/Math.max(1,signals.length)));
     const grids=signals.map((_,i)=>({left:64,right:24,top:42+i*laneHeight,height:laneHeight-gap}));
     const xAxes=signals.map((_,i)=>({type:"value",gridIndex:i,min:xMin,max:xMax,axisLine:{lineStyle:{color:"#69778a"}},axisTick:{show:i===signals.length-1},axisLabel:{show:i===signals.length-1,color:"#5d6878",fontSize:10},splitLine:{show:true,lineStyle:{color:"#e3e7ec"}},name:i===signals.length-1?(unitFor(x)?`${x} (${unitFor(x)})`:x):"",nameLocation:"middle",nameGap:28,nameTextStyle:{color:"#5d6878"}}));
     const yAxes=signals.map((s,i)=>({type:"value",gridIndex:i,min:ranges[i].min,max:ranges[i].max,axisLine:{show:true,lineStyle:{color:colors[i]}},axisTick:{show:true,lineStyle:{color:colors[i]}},axisLabel:{color:colors[i],fontSize:10},name:`${s}${unitFor(s)?` (${unitFor(s)})`:""}`,nameLocation:"middle",nameRotate:90,nameGap:35,nameTextStyle:{color:colors[i],fontSize:10,fontWeight:600},splitLine:{show:true,lineStyle:{color:"#e8ebef"}}}));
     chart.setOption({backgroundColor:"#f7f8fa",animationDuration:300,color:colors,tooltip:{trigger:"axis",axisPointer:{type:"line",lineStyle:{color:"#334155"}},backgroundColor:"rgba(20,27,38,.96)",borderWidth:0,textStyle:{color:"#fff",fontSize:11}},grid:grids,xAxis:xAxes,yAxis:yAxes,series:signals.map((s,i)=>({name:s,type:"line",xAxisIndex:i,yAxisIndex:i,showSymbol:false,smooth:false,data:rows.map(r=>[Number(r[x]),Number(r[s])]),lineStyle:{color:colors[i],width:1.4},emphasis:{lineStyle:{width:2.5}}})),dataZoom:[{type:"inside",xAxisIndex:signals.map((_,i)=>i),filterMode:"none"},{type:"slider",xAxisIndex:signals.map((_,i)=>i),height:16,bottom:7,left:80,right:80} ],legend:{show:false}});
   } else {
     const yAxes=signals.map((s,i)=>({type:"value",position:axisSide,offset:i*54,min:ranges[i].min,max:ranges[i].max,name:`${s}${unitFor(s)?` (${unitFor(s)})`:""}`,nameLocation:"middle",nameGap:34,nameRotate:90,nameTextStyle:{color:colors[i],fontSize:10,fontWeight:600},axisLine:{show:true,lineStyle:{color:colors[i],width:1.2}},axisTick:{show:true,lineStyle:{color:colors[i]}},axisLabel:{color:colors[i],fontSize:10,formatter:(v:number)=>Number(v).toLocaleString(undefined,{maximumFractionDigits:1})},splitLine:{show:i===0,lineStyle:{color:"#d8dde4"}}}));
     const axisRoom=65+Math.max(0,signals.length-1)*54;
     chart.setOption({animationDuration:350,backgroundColor:"#f7f8fa",color:colors,tooltip:{trigger:"axis",axisPointer:{type:"cross",lineStyle:{color:"#334155",width:1}},backgroundColor:"rgba(20,27,38,.96)",borderWidth:0,textStyle:{fontSize:11,color:"#f8fafc"},formatter:(items:any[])=>{if(!items?.length)return "";const xValue=items[0].axisValue;return `<div style="min-width:180px"><div style="color:#8997ad;margin-bottom:7px">${xValue}</div>${items.map((item:any)=>`<div style="display:flex;justify-content:space-between;gap:22px"><span>${item.marker}${item.seriesName}</span><b>${Number(item.value?.[1]??item.value).toLocaleString(undefined,{maximumFractionDigits:3})}</b></div>`).join("")}</div>`}},legend:{show:true,top:9,left:12,itemWidth:18,itemHeight:3,textStyle:{color:"#445267",fontSize:11}},grid:{left:axisSide==="left"?axisRoom:30,right:axisSide==="right"?axisRoom:30,top:42,bottom:64,containLabel:false},xAxis:{type:"value",min:xMin,max:xMax,name:unitFor(x)?`${x} (${unitFor(x)})`:x,nameLocation:"middle",nameGap:32,axisLine:{lineStyle:{color:"#5d6878"}},axisTick:{lineStyle:{color:"#5d6878"}},axisLabel:{color:"#5d6878",fontSize:10,formatter:(v:number)=>Number(v).toLocaleString()},splitLine:{lineStyle:{color:"#e3e7ec"}}},yAxis:yAxes,dataZoom:[{type:"inside",xAxisIndex:0,filterMode:"none"},{type:"slider",xAxisIndex:0,height:16,bottom:9,left:axisSide==="left"?axisRoom:30,right:axisSide==="right"?axisRoom:30}],series:signals.map((s,i)=>({name:s,type:"line",yAxisIndex:i,xAxisIndex:0,smooth:false,showSymbol:false,connectNulls:false,data:rows.map(r=>[Number(r[x]),Number(r[s])]),lineStyle:{width:1.3,color:colors[i]},itemStyle:{color:colors[i]},emphasis:{focus:"series",lineStyle:{width:2.6}}}))});
   }
   const on=()=>chart.resize(); window.addEventListener("resize",on);
   chart.getZr().on("dblclick",()=>chart.dispatchAction({type:"dataZoom",start:0,end:100}));
   return()=>{window.removeEventListener("resize",on);chart.dispose()}
 },[rows,x,signals,axisSide,viewMode]);
 return <div ref={ref} style={{width:"100%",height:"100%"}}/>;
}

createRoot(document.getElementById("root")!).render(<App/>);
