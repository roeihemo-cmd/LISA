(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function s(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(o){if(o.ep)return;o.ep=!0;const n=s(o);fetch(o.href,n)}})();const a={bg:"#080b11",panel:"#0d121b",panel2:"#111826",edge:"#1c2635",ink:"#e7edf5",dim:"#8a97a8",faint:"#586675",cyan:"#00e0ff",green:"#39d98a",amber:"#ffb020",red:"#ff4d6d",truth:"#00e0ff",est:"#39d98a"};function Z(){const t=`
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${a.bg}; color: ${a.ink};
    font: 14px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .mono { font-family: "SF Mono", "JetBrains Mono", Consolas, monospace; font-variant-numeric: tabular-nums; }

  #app { display: grid; grid-template-columns: 300px 1fr 340px; height: 100vh; }
  .rail { background: ${a.panel}; border-right: 1px solid ${a.edge}; overflow-y: auto; padding: 16px; }
  .rail.right { border-right: none; border-left: 1px solid ${a.edge}; }
  .stage { position: relative; display: flex; flex-direction: column; min-width: 0; }

  .brand { font-weight: 700; letter-spacing: .04em; font-size: 1.05rem; }
  .brand small { display:block; color: ${a.dim}; font-weight: 400; font-size: .68rem; letter-spacing:.14em; text-transform:uppercase; margin-top:2px; }
  .sec { color: ${a.faint}; font-size: .66rem; letter-spacing: .16em; text-transform: uppercase; margin: 20px 0 8px; }

  .ctl { margin-bottom: 12px; }
  .ctl label { display: flex; justify-content: space-between; font-size: .8rem; color: ${a.dim}; margin-bottom: 5px; }
  .ctl label b { color: ${a.cyan}; font-weight: 600; }
  .ctl input[type=range] { width: 100%; accent-color: ${a.cyan}; }
  .ctl select { width: 100%; background: ${a.panel2}; color: ${a.ink}; border: 1px solid ${a.edge}; border-radius: 8px; padding: 8px 10px; font-size: .85rem; }

  canvas { display: block; }
  .worldwrap { flex: 1; position: relative; min-height: 0; }
  #world { width: 100%; height: 100%; }

  .hud { position: absolute; top: 14px; left: 16px; pointer-events: none; }
  .hud .row { font-size: 1.05rem; font-weight: 700; letter-spacing: .02em; }
  .hud .k { color: ${a.dim}; font-weight: 500; font-size: .8rem; }

  .banner { position:absolute; top:50%; left:0; right:0; transform:translateY(-50%); text-align:center;
    font-weight:800; letter-spacing:.06em; font-size:1.5rem; text-shadow:0 0 20px currentColor; pointer-events:none; }

  .transport { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
  .transport button { background: ${a.panel2}; color: ${a.ink}; border: 1px solid ${a.edge};
    border-radius: 8px; padding: 8px 14px; font-size: .82rem; cursor: pointer; }
  .transport button:hover { border-color: ${a.cyan}; }

  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tile { background: ${a.panel2}; border: 1px solid ${a.edge}; border-radius: 10px; padding: 9px 11px; }
  .tile .k { color: ${a.faint}; font-size: .6rem; letter-spacing: .1em; text-transform: uppercase; }
  .tile .v { font-size: 1.15rem; font-weight: 700; margin-top: 2px; }

  .plot { background: ${a.panel2}; border: 1px solid ${a.edge}; border-radius: 10px; padding: 8px; margin-top: 10px; }
  .plot .cap { font-size: .62rem; color: ${a.faint}; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px; display:flex; justify-content:space-between; }
  .legend i { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:3px; vertical-align:middle; }

  .eqcard { background: ${a.panel2}; border: 1px solid ${a.edge}; border-left: 3px solid ${a.cyan};
    border-radius: 10px; padding: 11px 12px; margin-top: 10px; }
  .eqcard .t { font-size: .78rem; font-weight: 700; color: ${a.cyan}; margin-bottom: 6px; }
  .eqcard .f { font-size: .84rem; }
  .eqcard .sub { color: ${a.dim}; font-size: .74rem; margin-top: 6px; }
  .reasons { margin-top:8px; font-size:.72rem; color:${a.amber}; }
  `,e=document.createElement("style");e.textContent=t,document.head.appendChild(e)}function ee(t,e,s,i,o){t.clearRect(0,0,i,o),t.fillStyle=a.bg,t.fillRect(0,0,i,o);const n=i/2,r=o-70,h=40,c=(r-h)/s,d=Math.min(150,i*.34);t.fillStyle="#0f1620",t.fillRect(n-d/2,h-10,d,r-h+30),t.strokeStyle=a.edge,t.lineWidth=2,t.strokeRect(n-d/2,h-10,d,r-h+30),t.setLineDash([12,14]),t.strokeStyle="rgba(160,175,195,.3)",t.beginPath(),t.moveTo(n,h),t.lineTo(n,r),t.stroke(),t.setLineDash([]),t.fillStyle=a.faint,t.font="10px monospace",t.textAlign="left";for(let u=0;u<=s;u+=20){const p=r-u*c;t.strokeStyle="rgba(88,102,117,.18)",t.beginPath(),t.moveTo(n-d/2,p),t.lineTo(n+d/2,p),t.stroke(),t.fillText(`${u} m`,n+d/2+6,p+3)}const g=r-Math.max(0,e.trueRange)*c;if(e.measRange!=null){const u=r-e.measRange*c,p=t.createLinearGradient(n,r,n,u);p.addColorStop(0,"rgba(57,217,138,.20)"),p.addColorStop(1,"rgba(57,217,138,0)"),t.fillStyle=p,t.beginPath(),t.moveTo(n-6,r),t.lineTo(n-22,u),t.lineTo(n+22,u),t.lineTo(n+6,r),t.closePath(),t.fill()}if(E(t,n,g,40,66,"#7a3038",a.red),e.estRange!=null){const u=r-e.estRange*c;t.strokeStyle=a.est,t.lineWidth=2,t.setLineDash([4,4]),t.beginPath(),t.moveTo(n-d/2,u),t.lineTo(n+d/2,u),t.stroke(),t.setLineDash([]),t.fillStyle=a.est,t.textAlign="right",t.font="bold 10px monospace",t.fillText("EST",n-d/2-6,u+3)}const v=e.decision.brake?a.red:a.cyan;E(t,n,r,42,74,"#12212f",v)}function E(t,e,s,i,o,n,r){t.save(),t.fillStyle=n,t.strokeStyle=r,t.lineWidth=2,N(t,e-i/2,s-o/2,i,o,8),t.fill(),t.stroke(),t.fillStyle="rgba(0,0,0,.35)",N(t,e-i/2+6,s-o/2+8,i-12,o*.32,4),t.fill(),t.restore()}function N(t,e,s,i,o,n){t.beginPath(),t.moveTo(e+n,s),t.arcTo(e+i,s,e+i,s+o,n),t.arcTo(e+i,s+o,e,s+o,n),t.arcTo(e,s+o,e,s,n),t.arcTo(e,s,e+i,s,n),t.closePath()}class te{constructor(e,s=260){this.keys=e,this.cap=s;for(const i of e)this.series[i.key]={color:i.color,data:[]}}series={};cap;push(e){for(const s of this.keys){const i=this.series[s.key];i.data.push(e[s.key]??NaN),i.data.length>this.cap&&i.data.shift()}}reset(){for(const e of this.keys)this.series[e.key].data=[]}draw(e,s,i){e.clearRect(0,0,s,i);let o=1;for(const h of this.keys)for(const c of this.series[h.key].data)isFinite(c)&&c>o&&(o=c);o*=1.1;const n=this.cap,r=4;for(const h of this.keys){const c=this.series[h.key];e.strokeStyle=c.color,e.lineWidth=1.6,e.beginPath();let d=!1;c.data.forEach((g,v)=>{if(!isFinite(g)){d=!1;return}const u=r+v/(n-1)*(s-2*r),p=i-r-g/o*(i-2*r);d?e.lineTo(u,p):(e.moveTo(u,p),d=!0)}),e.stroke()}e.fillStyle=a.faint,e.font="9px monospace",e.textAlign="right",e.fillText(`${o.toFixed(0)} m`,s-3,10)}}const C=9.81,se=t=>t,ie=t=>t,S=t=>t/3.6,R=t=>t*3.6,x={tesla:{name:"Tesla Model 3",mu:.9,aMax:8,actuatorLatency:.15,maxSpeed:S(200)},corolla:{name:"Toyota Corolla",mu:.75,aMax:3,actuatorLatency:.25,maxSpeed:S(180)},truck:{name:"Heavy Truck",mu:.6,aMax:1.2,actuatorLatency:.45,maxSpeed:S(90)}},M={hardBrake:{name:"Hard Brake",egoSpeed0:S(90),leadRange0:90,leadSpeed0:S(80),leadBrakeAt:3,leadDecel:8,roadLength:500},stalled:{name:"Heavy Fog · Stalled Car",egoSpeed0:S(70),leadRange0:110,leadSpeed0:0,leadBrakeAt:1/0,leadDecel:0,roadLength:500}},oe={seed:1,vehicle:x.tesla,scenario:M.hardBrake,lidar:{maxRange:120,rxGain:25e7,lensDiameter:.05,reflectivity:.6,fogAlpha:.02,noise:.15,detThreshold:6,maWindow:8,trackHold:.6},decision:{tDsp:.03,tFilter:.13,safetyBuffer:5,dvThreshold:15}};class ne{cfg;listeners=new Set;constructor(e=oe){this.cfg=structuredClone(e)}get(){return this.cfg}patch(e,s){const i=this.cfg[e];this.cfg={...this.cfg,[e]:typeof i=="object"&&i!==null?{...i,...s}:s},this.emit()}set(e){this.cfg=structuredClone(e),this.emit()}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}emit(){for(const e of this.listeners)e(this.cfg)}}class ae{s;constructor(e){this.s=e>>>0||2654435769}next(){this.s|=0,this.s=this.s+1831565813|0;let e=Math.imul(this.s^this.s>>>15,1|this.s);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}gaussian(){let e=0,s=0;for(;e===0;)e=this.next();for(;s===0;)s=this.next();return Math.sqrt(-2*Math.log(e))*Math.cos(2*Math.PI*s)}normal(e,s){return e+s*this.gaussian()}}class re{time=0;ego;targets;roadLength;scenario;constructor(e){this.scenario=e,this.roadLength=e.roadLength,this.ego={s:0,v:e.egoSpeed0,a:0},this.targets=[{id:1,s:e.leadRange0,v:e.leadSpeed0,braking:!1}]}step(e){this.time+=e,this.ego.s+=this.ego.v*e;for(const s of this.targets)s.s+=s.v*e,this.time>=this.scenario.leadBrakeAt&&(s.braking=!0,s.v=Math.max(0,s.v-this.scenario.leadDecel*e))}applyEgo(e,s){this.ego.v=e,this.ego.a=s}trueRangeToLead(){const e=this.targets[0];return se(e.s-this.ego.s)}snapshot(){return{time:this.time,ego:{...this.ego},targets:this.targets.map(e=>({...e})),roadLength:this.roadLength}}}const le=320;function A(t){const e=Math.max(5,Math.ceil(6*t)|1),s=(e-1)/2;let i=0;for(let o=0;o<e;o++){const n=Math.exp(-((o-s)**2)/(2*t*t));i+=n*n}return Math.sqrt(i)}class de{sigma;shapeNorm;constructor(e){this.sigma=2+e*.8,this.shapeNorm=A(this.sigma)}setPulse(e){this.sigma=2+e*.8,this.shapeNorm=A(this.sigma)}echoAmp(e,s){if(e<=0)return 0;const i=s.lensDiameter;return 1*(i*i/(4*e*e))*Math.exp(-s.fogAlpha*2*e)*s.reflectivity*s.rxGain}measure(e,s,i){const o=e,n=this.echoAmp(o,s),r=Math.max(s.noise,1e-6),h=n*this.shapeNorm/r;let c=s.maxRange/le*(.5+6/Math.max(h,.001));c=Math.min(c,8);const d=h>=s.detThreshold;return{detected:d,measRange:d?o+i.gaussian()*c:null,snr:h,amp:n}}}class ce{constructor(e){this.n=e}buf=[];push(e){return this.buf.push(e),this.buf.length>this.n&&this.buf.shift(),this.buf.reduce((s,i)=>s+i,0)/this.buf.length}reset(){this.buf=[]}}const he=.4;class pe{ma;lastSm=null;holdT=0;prevRange=null;closingEma=0;trackHold;constructor(e){this.ma=new ce(e.maWindow),this.trackHold=e.trackHold}update(e,s){const i=e.detected?e.measRange:null;let o;if(i!=null?(o=this.ma.push(i),this.lastSm=o,this.holdT=0):(this.holdT+=s,this.holdT<this.trackHold&&this.lastSm!=null?o=this.lastSm:(this.ma.reset(),o=null,this.lastSm=null)),o!=null&&this.prevRange!=null&&s>0){const n=-(o-this.prevRange)/s;this.closingEma+=(n-this.closingEma)*Math.min(1,s/he)}else o==null&&(this.closingEma=0);return this.prevRange=o,{range:o!=null?ie(o):null,closing:o!=null?this.closingEma:0,detected:o!=null}}}const D=2.6;function ue(t){const{egoSpeed:e,setSpeed:s,estimate:i,vehicle:o,decision:n}=t,r=o.mu*C,h=n.tDsp+n.tFilter+o.actuatorLatency,c=e*e/(2*r),d=e*h+c+n.safetyBuffer,g=c+e*h,v=i.range,u=i.closing,p=i.detected&&v!=null&&u>.2?v/u:1/0,f=[];if(!i.detected||v==null)return{mode:"CRUISE",brake:!1,targetSpeed:s,inevitable:!1,ttc:1/0,dReq:d,dMinStop:g,reasons:f};const J=v<g&&isFinite(p)&&p<1,X=Math.max(0,e-u);return J?(f.push(`range ${v.toFixed(1)} m < min-stop ${g.toFixed(1)} m`,`TTC ${p.toFixed(2)} s < 1.0 s`),{mode:"AEB",brake:!0,targetSpeed:0,inevitable:!0,ttc:p,dReq:d,dMinStop:g,reasons:f}):v<d?(f.push(`range ${v.toFixed(1)} m < D_required ${d.toFixed(1)} m`),{mode:"AEB",brake:!0,targetSpeed:X,inevitable:!1,ttc:p,dReq:d,dMinStop:g,reasons:f}):isFinite(p)&&p<D?(f.push(`TTC ${p.toFixed(1)} s < ${D} s`),{mode:"FCW",brake:!1,targetSpeed:s,inevitable:!1,ttc:p,dReq:d,dMinStop:g,reasons:f}):{mode:"CRUISE",brake:!1,targetSpeed:s,inevitable:!1,ttc:p,dReq:d,dMinStop:g,reasons:f}}class ge{speed;a=0;braking=!1;coast=0;brakeTarget=0;constructor(e){this.speed=e}apply(e,s,i,o,n){const r=i.mu*C,h=i.aMax,c=o.tDsp+o.tFilter+i.actuatorLatency;e.brake?(this.braking||(this.braking=!0,this.coast=c),this.brakeTarget=e.targetSpeed):this.braking=!1;const d=this.speed;this.braking?this.coast>0?this.coast=Math.max(0,this.coast-n):this.speed=Math.max(this.brakeTarget,this.speed-r*n):this.speed<s?this.speed=Math.min(s,this.speed+h*n):this.speed>s&&(this.speed=Math.max(s,this.speed-r*n)),this.speed=Math.max(0,this.speed),this.a=n>0?(this.speed-d)/n:0}}const me=1.5,I=.2;class q{cfg;rng;world;lidar;estimator;vehicle;setSpeed;outcome="RUNNING";constructor(e){this.cfg=e,this.rng=new ae(e.seed),this.world=new re(e.scenario),this.lidar=new de(e.lidar.noise),this.estimator=new pe(e.lidar),this.vehicle=new ge(e.scenario.egoSpeed0),this.setSpeed=e.scenario.egoSpeed0}tick(e){if(this.outcome==="RUNNING"){this.world.step(e);const s=this.world.trueRangeToLead(),i=this.lidar.measure(s,this.cfg.lidar,this.rng),o=this.estimator.update(i,e),n=ue({egoSpeed:this.world.ego.v,setSpeed:this.setSpeed,estimate:o,vehicle:this.cfg.vehicle,decision:this.cfg.decision});return this.vehicle.apply(n,this.setSpeed,this.cfg.vehicle,this.cfg.decision,e),this.world.applyEgo(this.vehicle.speed,this.vehicle.a),s<=me?this.outcome="COLLISION":this.vehicle.speed<=I&&this.world.targets[0].v<=I&&(this.outcome="STOPPED"),this.lastDecision=n,this.frame(s,i,o,n)}return this.staticFrame()}frame(e,s,i,o){return{time:this.world.time,trueRange:e,egoSpeed:this.world.ego.v,leadSpeed:this.world.targets[0].v,measRange:s.measRange,snr:s.snr,detected:s.detected,estRange:i.range,estClosing:i.closing,decision:o,outcome:this.outcome}}lastDecision=null;staticFrame(){const e=this.lastDecision??{mode:"CRUISE",brake:!1,targetSpeed:0,inevitable:!1,ttc:1/0,dReq:0,dMinStop:0,reasons:[]};return{time:this.world.time,trueRange:this.world.trueRangeToLead(),egoSpeed:this.world.ego.v,leadSpeed:this.world.targets[0].v,measRange:null,snr:0,detected:!1,estRange:null,estClosing:0,decision:e,outcome:this.outcome}}}const k=.005;class ve{accumulator=0;paused=!1;stepsQueued=0;t=0;pump(e){if(this.paused){const i=this.stepsQueued;return this.stepsQueued=0,this.t+=i*k,i}this.accumulator+=Math.min(e,.25);let s=0;for(;this.accumulator>=k;)this.accumulator-=k,s++;return this.t+=s*k,s}step(e=1){this.stepsQueued+=e}alpha(){return this.accumulator/k}}Z();const m=new ne;let z=new q(m.get());const $=new ve,F=new te([{key:"true",color:a.truth},{key:"est",color:a.est}]);let b=null,L=0;const fe=document.getElementById("app");fe.innerHTML=`
  <div class="rail left">
    <div class="brand">LISA<small>LiDAR · ADAS Bench</small></div>

    <div class="sec">Scenario</div>
    <div class="ctl"><select id="scenario">${Object.entries(M).map(([t,e])=>`<option value="${t}">${e.name}</option>`).join("")}</select></div>

    <div class="sec">Vehicle</div>
    <div class="ctl"><select id="vehicle">${Object.entries(x).map(([t,e])=>`<option value="${t}">${e.name} (μ=${e.mu})</option>`).join("")}</select></div>

    <div class="sec">Parameters</div>
    <div class="ctl"><label>Set speed <b id="speed-v"></b></label><input type="range" id="speed" min="20" max="180" step="1"></div>
    <div class="ctl"><label>Fog / Dust α <b id="fog-v"></b></label><input type="range" id="fog" min="0" max="0.3" step="0.005"></div>
    <div class="ctl"><label>Reflectivity ρ <b id="rho-v"></b></label><input type="range" id="rho" min="0.05" max="1" step="0.05"></div>
    <div class="ctl"><label>Noise σ <b id="noise-v"></b></label><input type="range" id="noise" min="0" max="0.5" step="0.01"></div>

    <div class="sec">Pipeline</div>
    <div class="mono" style="font-size:.72rem;color:${a.dim};line-height:1.9">
      world → lidar → estimate<br>→ decision → vehicle
    </div>
    <div class="mono" style="font-size:.66rem;color:${a.faint};margin-top:10px">
      The car acts only on the LiDAR estimate.<br>Only the simulator knows the truth.
    </div>
  </div>

  <div class="stage">
    <div class="worldwrap">
      <canvas id="world"></canvas>
      <div class="hud mono" id="hud"></div>
      <div class="banner" id="banner" style="display:none"></div>
      <div class="transport">
        <button id="play">Pause</button>
        <button id="step">Step</button>
        <button id="restart">Restart</button>
      </div>
    </div>
  </div>

  <div class="rail right">
    <div class="sec">Analytics</div>
    <div class="tiles">
      <div class="tile"><div class="k">True Range</div><div class="v mono" id="t-true" style="color:${a.truth}">—</div></div>
      <div class="tile"><div class="k">Est Range · MA8</div><div class="v mono" id="t-est" style="color:${a.est}">—</div></div>
      <div class="tile"><div class="k">Sensor Error</div><div class="v mono" id="t-err">—</div></div>
      <div class="tile"><div class="k">SNR</div><div class="v mono" id="t-snr">—</div></div>
      <div class="tile"><div class="k">TTC</div><div class="v mono" id="t-ttc">—</div></div>
      <div class="tile"><div class="k">Closing Δv</div><div class="v mono" id="t-closing">—</div></div>
      <div class="tile"><div class="k">Stop Req</div><div class="v mono" id="t-dreq" style="color:${a.amber}">—</div></div>
      <div class="tile"><div class="k">Decision</div><div class="v mono" id="t-mode">—</div></div>
    </div>

    <div class="plot">
      <div class="cap"><span>Range vs time</span><span class="legend"><i style="background:${a.truth}"></i>true <i style="background:${a.est}"></i>est</span></div>
      <canvas id="plot" style="width:100%;height:120px"></canvas>
    </div>

    <div class="eqcard">
      <div class="t">Required Stopping Distance</div>
      <div class="f mono">D_req = V·(T_dsp+T_flt+T_act) + V²/(2μg) + D_buf</div>
      <div class="f mono" id="eq-sub" style="color:${a.est};margin-top:6px"></div>
      <div class="sub">The car brakes once the LiDAR-estimated gap drops below D_req.</div>
      <div class="reasons mono" id="reasons"></div>
    </div>
  </div>
`;const l=t=>document.getElementById(t),B=l("world"),_=l("plot"),G=B.getContext("2d"),j=_.getContext("2d");let H=0,U=0,W=0,V=0;function O(t,e){const s=window.devicePixelRatio||1,i=t.getBoundingClientRect();return t.width=Math.round(i.width*s),t.height=Math.round(i.height*s),e.setTransform(s,0,0,s,0,0),[i.width,i.height]}function Y(){[H,U]=O(B,G),[W,V]=O(_,j)}window.addEventListener("resize",Y);function Q(){const t=m.get();l("vehicle").value=Object.entries(x).find(([,e])=>e.name===t.vehicle.name)?.[0]??"tesla",l("speed").value=String(Math.round(R(t.scenario.egoSpeed0))),l("fog").value=String(t.lidar.fogAlpha),l("rho").value=String(t.lidar.reflectivity),l("noise").value=String(t.lidar.noise),w()}function w(){const t=m.get();l("speed-v").textContent=`${Math.round(R(t.scenario.egoSpeed0))} km/h`,l("fog-v").textContent=t.lidar.fogAlpha.toFixed(3),l("rho-v").textContent=t.lidar.reflectivity.toFixed(2),l("noise-v").textContent=t.lidar.noise.toFixed(2)}function y(){z=new q(m.get()),$.t=0,F.reset(),L=0,b=null}l("scenario").addEventListener("change",t=>{const e=t.target.value;m.patch("scenario",M[e]),Q(),y()});l("vehicle").addEventListener("change",t=>{m.patch("vehicle",x[t.target.value]),y()});l("speed").addEventListener("input",t=>{m.patch("scenario",{egoSpeed0:S(+t.target.value)}),w(),y()});l("fog").addEventListener("input",t=>{m.patch("lidar",{fogAlpha:+t.target.value}),w(),y()});l("rho").addEventListener("input",t=>{m.patch("lidar",{reflectivity:+t.target.value}),w(),y()});l("noise").addEventListener("input",t=>{m.patch("lidar",{noise:+t.target.value}),w(),y()});l("play").addEventListener("click",()=>{$.paused=!$.paused,l("play").textContent=$.paused?"Play":"Pause"});l("step").addEventListener("click",()=>$.step(40));l("restart").addEventListener("click",y);function be(t){ee(G,t,m.get().scenario.leadRange0,H,U),l("hud").innerHTML=`<div class="row" style="color:${a.cyan}">${R(t.egoSpeed).toFixed(0)} <span class="k">km/h</span></div><div class="row" style="color:${t.detected?a.est:a.red}">${t.estRange!=null?t.estRange.toFixed(1):"-- LOST"} <span class="k">m · LiDAR</span></div>`;const e=l("banner");t.outcome==="COLLISION"?T(e,"COLLISION",a.red):t.outcome==="STOPPED"?T(e,"STOPPED SAFELY",a.green):t.decision.inevitable?T(e,"COLLISION IMMINENT",a.red):e.style.display="none";const s=t.estRange!=null?t.estRange-t.trueRange:NaN;l("t-true").textContent=`${t.trueRange.toFixed(1)} m`,l("t-est").textContent=t.estRange!=null?`${t.estRange.toFixed(1)} m`:"-- LOST",l("t-err").textContent=isFinite(s)?`${s>=0?"+":""}${s.toFixed(2)} m`:"—",l("t-snr").textContent=t.snr>0?`${(20*Math.log10(t.snr)).toFixed(0)} dB`:"-∞",l("t-ttc").textContent=isFinite(t.decision.ttc)?`${t.decision.ttc.toFixed(1)} s`:"—",l("t-closing").textContent=`${R(t.estClosing).toFixed(0)} km/h`,l("t-dreq").textContent=`${t.decision.dReq.toFixed(1)} m`;const i=l("t-mode");i.textContent=t.decision.mode,i.style.color=t.decision.mode==="AEB"?a.red:t.decision.mode==="FCW"?a.amber:a.cyan,l("reasons").innerHTML=t.decision.reasons.map(c=>`• ${c}`).join("<br>");const o=m.get(),n=t.egoSpeed,r=o.decision.tDsp+o.decision.tFilter+o.vehicle.actuatorLatency,h=o.vehicle.mu*C;l("eq-sub").textContent=`= ${n.toFixed(1)}·${r.toFixed(2)} + ${n.toFixed(1)}²/(2·${h.toFixed(2)}) + ${o.decision.safetyBuffer} = ${t.decision.dReq.toFixed(1)} m`,F.draw(j,W,V)}function T(t,e,s){t.style.display="block",t.style.color=s,t.textContent=e}let P=performance.now();function K(t){const e=(t-P)/1e3;P=t;const s=$.pump(e);for(let i=0;i<s;i++)b=z.tick(k),b.outcome==="RUNNING"&&F.push({true:b.trueRange,est:b.estRange??NaN});b&&(be(b),b.outcome!=="RUNNING"&&(L+=e,L>3&&y())),requestAnimationFrame(K)}Q();Y();requestAnimationFrame(K);
