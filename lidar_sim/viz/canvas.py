"""High-fidelity animated driving scene rendered on an HTML5 Canvas.

The Python backend computes the LiDAR/safety state and passes it as a config
object into a self-contained 60 FPS requestAnimationFrame loop. All animation
(road scrolling, AEB deceleration, autonomous lane change, fog particles) runs
client-side so it stays smooth and does not trigger Streamlit reruns.
"""

import json


def build_scene_html(cfg: dict, height: int = 560) -> str:
    """Return a self-contained HTML document for st.components.v1.html.

    Expected cfg keys:
        speed_kmh, detected (bool), range_hat (float|None), braking_distance,
        level ('safe'|'critical'|'lowvis'), protocol ('aeb'|'merge'),
        fog_alpha, max_range, max_speed.
    """
    cfg_json = json.dumps(cfg)
    return _TEMPLATE.replace("__CFG__", cfg_json).replace("__H__", str(height))


_TEMPLATE = r"""
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#05060a;overflow:hidden;}
  #wrap{position:relative;width:100%;height:__H__px;}
  canvas{display:block;width:100%;height:100%;
    border-radius:14px;box-shadow:0 0 30px rgba(0,240,255,.15) inset;}
</style></head>
<body>
<div id="wrap"><canvas id="c"></canvas></div>
<script>
const CFG = __CFG__;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const W = 900, H = __H__;
cv.width = W; cv.height = H;

// ---- scene constants ----
const ROAD_X0 = 270, ROAD_X1 = 630, ROAD_W = ROAD_X1 - ROAD_X0;
const LANES = [ROAD_X0 + ROAD_W*0.18, ROAD_X0 + ROAD_W*0.5, ROAD_X0 + ROAD_W*0.82];
const Y_HORIZON = 60, Y_EGO = H - 120;
const MAXV = CFG.max_range;               // metres mapped to full road depth
const fog = Math.max(0, Math.min(1, CFG.fog_alpha / 0.3));

// ---- dynamic state (animated client-side) ----
let egoLane = 1;                          // start middle lane
let egoX = LANES[egoLane];
let targetX = LANES[egoLane];
let animSpeed = CFG.speed_kmh;            // km/h, animated
let scroll = 0;                           // road dash scroll
let braking = false, merging = false, mergeDone = false;
let t0 = null;

const critical = CFG.detected && CFG.level === 'critical';
const blinded  = CFG.level === 'lowvis';

// decide protocol action
if (critical && CFG.protocol === 'aeb')   braking = true;
if (critical && CFG.protocol === 'merge') merging = true;
if (merging) targetX = LANES[2];          // merge to right lane

function lerp(a,b,t){return a+(b-a)*t;}

// map a range [m] to a screen y (perspective: far = near horizon)
function rangeToY(r){
  const f = Math.max(0, Math.min(1, r / MAXV));
  return lerp(Y_EGO, Y_HORIZON, f);
}
// road half-width at a given y (perspective taper)
function roadHalf(y){
  const f = (y - Y_HORIZON) / (Y_EGO - Y_HORIZON);   // 0 top .. 1 bottom
  return lerp(ROAD_W*0.10, ROAD_W*0.5, f);
}
function roadCenter(){ return (ROAD_X0+ROAD_X1)/2; }
function laneScreenX(laneCenter, y){
  // taper lane x toward the vanishing point
  const f = (y - Y_HORIZON) / (Y_EGO - Y_HORIZON);
  return lerp(roadCenter(), laneCenter, f);
}

// ---- fog particles ----
const parts = [];
const NP = Math.floor(fog * 220);
for(let i=0;i<NP;i++){
  parts.push({x:Math.random()*W, y:Math.random()*H,
              s:1+Math.random()*2.5, v:1+Math.random()*3});
}

function drawRoad(){
  // grass / dark ground
  ctx.fillStyle = '#070a0f'; ctx.fillRect(0,0,W,H);
  // asphalt trapezoid
  ctx.beginPath();
  ctx.moveTo(roadCenter()-roadHalf(Y_HORIZON), Y_HORIZON);
  ctx.lineTo(roadCenter()+roadHalf(Y_HORIZON), Y_HORIZON);
  ctx.lineTo(roadCenter()+roadHalf(Y_EGO+40), Y_EGO+40);
  ctx.lineTo(roadCenter()-roadHalf(Y_EGO+40), Y_EGO+40);
  ctx.closePath();
  const g = ctx.createLinearGradient(0,Y_HORIZON,0,H);
  g.addColorStop(0,'#10131a'); g.addColorStop(1,'#181c24');
  ctx.fillStyle = g; ctx.fill();
  // side neon edges
  ctx.lineWidth = 3;
  for(const side of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(roadCenter()+side*roadHalf(Y_HORIZON), Y_HORIZON);
    ctx.lineTo(roadCenter()+side*roadHalf(Y_EGO+40), Y_EGO+40);
    ctx.strokeStyle = 'rgba(0,240,255,.55)';
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 12; ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // dashed lane dividers (scrolling)
  for(const lc of [ROAD_X0+ROAD_W/3, ROAD_X0+2*ROAD_W/3]){
    for(let k=-1;k<26;k++){
      const yy = Y_HORIZON + ((k*34 + scroll) % (Y_EGO-Y_HORIZON+60));
      if(yy<Y_HORIZON||yy>Y_EGO+40) continue;
      const y2 = Math.min(yy+16, Y_EGO+40);
      ctx.beginPath();
      ctx.moveTo(laneScreenX(lc,yy), yy);
      ctx.lineTo(laneScreenX(lc,y2), y2);
      ctx.lineWidth = lerp(1.2,5,(yy-Y_HORIZON)/(Y_EGO-Y_HORIZON));
      ctx.strokeStyle = 'rgba(230,230,230,.7)'; ctx.stroke();
    }
  }
}

function drawObstacle(){
  const r = (CFG.range_hat!=null)? CFG.range_hat : CFG.max_range*0.8;
  const y = rangeToY(r);
  const cx = LANES[1];                       // obstacle in middle lane
  const sx = laneScreenX(cx, y);
  const sc = lerp(0.25,1.0,(y-Y_HORIZON)/(Y_EGO-Y_HORIZON));
  const w = 46*sc, h = 72*sc;
  ctx.save();
  ctx.globalAlpha = CFG.detected ? 1 : 0.4;
  // broken-down car body
  ctx.fillStyle = CFG.detected ? '#7a2230' : '#2a2d34';
  roundRect(sx-w/2, y-h/2, w, h, 8*sc); ctx.fill();
  ctx.fillStyle = 'rgba(20,22,28,.9)';
  roundRect(sx-w/2+5*sc, y-h/2+12*sc, w-10*sc, h*0.42, 5*sc); ctx.fill();
  // neon outline if locked
  if(CFG.detected){
    ctx.lineWidth = 3; ctx.strokeStyle = '#39ff14';
    ctx.shadowColor='#39ff14'; ctx.shadowBlur=16;
    roundRect(sx-w/2, y-h/2, w, h, 8*sc); ctx.stroke(); ctx.shadowBlur=0;
    // hazard lights
    const blink = (Math.sin(perfNow()/180)>0);
    ctx.fillStyle = blink? '#ffb400':'#5a4500';
    ctx.beginPath(); ctx.arc(sx-w/2+6*sc, y+h/2-6*sc,3*sc,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(sx+w/2-6*sc, y+h/2-6*sc,3*sc,0,7); ctx.fill();
  }
  ctx.restore();
  return {sx, y, w, h};
}

function drawBeam(obx, oby){
  if(CFG.range_hat==null && !CFG.detected) return;
  const fx = egoX, fy = Y_EGO-30;
  const tx = obx!=null?obx:LANES[1], ty = oby!=null?oby:Y_HORIZON+40;
  const col = CFG.detected ? '57,255,20' : '255,45,85';
  // glow halo
  ctx.strokeStyle = 'rgba('+col+',.10)'; ctx.lineWidth=18;
  ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx,ty); ctx.stroke();
  // animated dashed pulse core
  ctx.save();
  ctx.setLineDash([10,14]); ctx.lineDashOffset = -(perfNow()/12)%24;
  ctx.strokeStyle = 'rgba('+col+',.95)'; ctx.lineWidth=3.5;
  ctx.shadowColor = CFG.detected?'#39ff14':'#ff2d55'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx,ty); ctx.stroke();
  ctx.restore(); ctx.shadowBlur=0;
}

function drawEgo(){
  const x = egoX, y = Y_EGO;
  const w = 54, h = 92;
  // shadow
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.ellipse(x,y+h/2,w*0.6,10,0,0,7); ctx.fill();
  // body (metallic gradient)
  const g = ctx.createLinearGradient(x-w/2,0,x+w/2,0);
  g.addColorStop(0,'#1c2330'); g.addColorStop(.5,'#3a4760'); g.addColorStop(1,'#1c2330');
  ctx.fillStyle=g; roundRect(x-w/2,y-h/2,w,h,12); ctx.fill();
  // cabin
  ctx.fillStyle='rgba(10,20,35,.95)'; roundRect(x-w/2+7,y-h*0.22,w-14,h*0.4,7); ctx.fill();
  // cyan trim
  ctx.lineWidth=2; ctx.strokeStyle='rgba(0,240,255,.8)';
  ctx.shadowColor='#00f0ff'; ctx.shadowBlur=10;
  roundRect(x-w/2,y-h/2,w,h,12); ctx.stroke(); ctx.shadowBlur=0;
  // headlights (front = top)
  for(const sx of [x-w/2+10, x+w/2-10]){
    const grd=ctx.createRadialGradient(sx,y-h/2,1,sx,y-h/2,26);
    grd.addColorStop(0,'rgba(255,255,210,.9)'); grd.addColorStop(1,'rgba(255,255,210,0)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(sx,y-h/2,26,0,7); ctx.fill();
  }
  // brake lights (rear = bottom) — bright when braking
  const on = braking;
  for(const sx of [x-w/2+10, x+w/2-10]){
    ctx.fillStyle = on? '#ff1a1a':'#5a1414';
    if(on){ctx.shadowColor='#ff1a1a';ctx.shadowBlur=18;}
    ctx.beginPath(); ctx.arc(sx,y+h/2-4,5,0,7); ctx.fill(); ctx.shadowBlur=0;
  }
}

function drawWeather(){
  if(fog<=0) return;
  // foggy overlay
  ctx.fillStyle='rgba(200,205,212,'+(0.06+0.45*fog)+')';
  ctx.fillRect(0,0,W,H);
  // particles (rain streaks when heavy)
  ctx.strokeStyle='rgba(220,225,232,'+(0.25+0.4*fog)+')';
  ctx.lineWidth=1.4;
  for(const p of parts){
    if(fog>0.55){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-2,p.y+10); ctx.stroke(); }
    else { ctx.fillStyle='rgba(225,230,236,'+(0.3*fog)+')';
           ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,7); ctx.fill(); }
    p.y += p.v*(0.5+fog); p.x -= 0.3;
    if(p.y>H){p.y=-5;p.x=Math.random()*W;}
  }
}

let _perf=0; function perfNow(){return _perf;}

function overlay(text, color){
  const a = 0.55+0.45*Math.abs(Math.sin(_perf/220));
  ctx.save();
  ctx.font='bold 30px Segoe UI, sans-serif'; ctx.textAlign='center';
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,H/2-40,W,80);
  ctx.fillStyle=color; ctx.globalAlpha=a;
  ctx.shadowColor=color; ctx.shadowBlur=24;
  ctx.fillText(text, W/2, H/2+10);
  ctx.restore();
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function frame(ts){
  if(t0==null) t0=ts; _perf=ts-t0;

  // --- physics of the animation ---
  if(braking){ animSpeed = Math.max(0, animSpeed - 0.9); }   // decelerate to 0
  // scroll proportional to current animated speed
  scroll = (scroll + animSpeed*0.012) % 1000;
  // ease lane change
  egoX = lerp(egoX, targetX, 0.06);
  if(merging && Math.abs(egoX-targetX)<1) mergeDone=true;

  // --- render ---
  drawRoad();
  const ob = drawObstacle();
  drawBeam(ob.sx, ob.y);
  drawEgo();
  drawWeather();

  // HUD speed readout
  ctx.fillStyle='#00f0ff'; ctx.font='bold 16px Consolas, monospace';
  ctx.textAlign='left';
  ctx.fillText('SPEED '+animSpeed.toFixed(0)+' km/h', 16, 28);
  ctx.fillText('RANGE '+(CFG.detected?CFG.range_hat.toFixed(1)+' m':'-- LOST'), 16, 50);

  // --- cinematic overlays ---
  if(blinded){
    overlay('⚠ SENSOR BLINDED — DISENGAGING AUTOPILOT', '#ffb400');
  } else if(critical && CFG.protocol==='aeb'){
    overlay('🚨 EMERGENCY BRAKING ENGAGED', '#ff2d55');
  } else if(critical && CFG.protocol==='merge'){
    overlay('↪ COLLISION AVOIDANCE: AUTONOMOUS LANE CHANGE', '#39ff14');
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
</script>
</body></html>
"""
