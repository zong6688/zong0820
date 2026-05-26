// Emotion recognition game (derived from reference)
// Uses face-api.js TinyFaceDetector + FaceExpressionNet

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

const EMOTIONS = [
    { key: 'neutral',   name: '中性',  emoji: '😐', color: '#a4a8c5' },
    { key: 'happy',     name: '開心',  emoji: '😀', color: '#ffd76b' },
    { key: 'sad',       name: '難過',  emoji: '😢', color: '#7aa9ff' },
    { key: 'angry',     name: '生氣',  emoji: '😠', color: '#ff6b6b' },
    { key: 'fearful',   name: '害怕',  emoji: '😨', color: '#c98fff' },
    { key: 'disgusted', name: '厭惡',  emoji: '🤢', color: '#9cd97a' },
    { key: 'surprised', name: '驚訝',  emoji: '😲', color: '#ff9eb5' },
];

const CHALLENGE_THRESHOLD = 0.60;
const CHALLENGE_HOLD_FRAMES = 30;

class EmotionGame {
    constructor(){
        this.mode = 'live';
        this.targetIdx = 0;
        this.holdCount = 0;
        this.completed = 0;
        this.score = 0;
        this.lastExprs = null;
        this.dominantKey = null;
        this.lastFace = null;
        this.passingTimer = 0;
        this._lastChallengeKey = null;
    }
    setMode(m){ this.mode = m; this.holdCount=0; this.passingTimer=0; if(m==='challenge') this._pickChallenge(); }
    _pickChallenge(){ const pool = EMOTIONS.filter(e=>e.key!=='neutral'); let next; do { next = Math.floor(Math.random()*pool.length); } while(pool[next].key===this._lastChallengeKey && pool.length>1); this._lastChallengeKey = pool[next].key; this.targetIdx = EMOTIONS.findIndex(e=>e.key===pool[next].key); }
    skip(){ if(this.mode!=='challenge') return; this._pickChallenge(); this.holdCount=0; }
    reset(){ this.completed=0; this.score=0; this.holdCount=0; this.passingTimer=0; if(this.mode==='challenge') this._pickChallenge(); }
    update(exprs, faceBox){ this.lastExprs = exprs; this.lastFace = faceBox; if(exprs){ let maxKey=null, maxVal=-1; for(const e of EMOTIONS){ const v = exprs[e.key] ?? 0; if(v>maxVal){ maxVal=v; maxKey=e.key; } } this.dominantKey = maxKey; } else this.dominantKey = null;
        if(this.mode!=='challenge') return; if(this.passingTimer>0){ this.passingTimer--; if(this.passingTimer===0){ this._pickChallenge(); this.holdCount=0; } return; }
        const target = EMOTIONS[this.targetIdx]; const val = exprs ? (exprs[target.key] ?? 0) : 0; if(val >= CHALLENGE_THRESHOLD){ this.holdCount++; if(this.holdCount >= CHALLENGE_HOLD_FRAMES){ this.completed++; this.score += Math.round(val*100); this.passingTimer = 50; } } else { this.holdCount = Math.max(0, this.holdCount-1); }
    }
    get currentTarget(){ return EMOTIONS[this.targetIdx]; }
}

// DOM refs
const dom = {
    video: document.getElementById('video'),
    overlay: document.getElementById('overlay'),
    loading: document.getElementById('loading'),
    loadErr: document.getElementById('loading-error'),
    passFlash: document.getElementById('passFlash'),
    passText: document.getElementById('passText'),
    mDominant: document.getElementById('m-dominant'),
    mChallenge: document.getElementById('m-challenge'),
    mDone: document.getElementById('m-done'),
    mFps: document.getElementById('m-fps'),
    emoList: document.getElementById('emo-list'),
    chPanel: document.getElementById('challenge-panel'),
    chEmoji: document.getElementById('ch-emoji'),
    chName: document.getElementById('ch-name'),
    chProgress: document.getElementById('ch-progress'),
    modeDesc: document.getElementById('mode-desc'),
    stage: document.getElementById('stage'),
};

function buildEmotionList(){ dom.emoList.innerHTML=''; for(const e of EMOTIONS){ const row = document.createElement('div'); row.className='emotion-row'; row.dataset.key = e.key; row.innerHTML = `
        <div class="emotion-name"><span class="dot" style="background:${e.color}"></span><span>${e.emoji} ${e.name}</span></div>
        <div class="emotion-bar"><div class="emotion-fill" style="width:0%; background:${e.color}"></div></div>
        <div class="emotion-pct">0%</div>
    `; dom.emoList.appendChild(row); } }

document.querySelectorAll('.toggle-mode button').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.toggle-mode button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); const mode = btn.dataset.mode; game.setMode(mode); if(mode==='challenge'){ dom.chPanel.style.display=''; dom.modeDesc.textContent = '隨機指定情緒，達到 60% 並維持 1 秒過關。'; } else { dom.chPanel.style.display='none'; dom.modeDesc.textContent = '即時顯示鏡頭中人臉的 7 種情緒比例與主要情緒。'; } updateChallengePanel(); }); });

window.addEventListener('keydown', e=>{ const k = e.key.toLowerCase(); if(k==='n') game.skip(); else if(k==='r'){ game.reset(); updateChallengePanel(); } });

function updateEmotionBars(exprs, dominantKey){ for(const e of EMOTIONS){ const row = dom.emoList.querySelector(`.emotion-row[data-key="${e.key}"]`); if(!row) continue; const val = exprs ? (exprs[e.key] ?? 0) : 0; const pct = (val*100).toFixed(1); row.querySelector('.emotion-fill').style.width = `${pct}%`; row.querySelector('.emotion-pct').textContent = `${pct}%`; if(e.key === dominantKey && val>0.05) row.classList.add('dominant'); else row.classList.remove('dominant'); } }

function updateMetrics(){ const dom_dominant = game.dominantKey ? EMOTIONS.find(e=>e.key===game.dominantKey) : null; if(dom_dominant){ dom.mDominant.textContent = `${dom_dominant.emoji} ${dom_dominant.name}`; dom.mDominant.style.color = dom_dominant.color; } else { dom.mDominant.textContent='--'; dom.mDominant.style.color='var(--text-mute)'; } dom.mChallenge.textContent = String(game.score); dom.mDone.textContent = String(game.completed); }

function updateChallengePanel(){ if(game.mode !== 'challenge') return; const t = game.currentTarget; dom.chEmoji.textContent = t.emoji; dom.chName.textContent = t.name; dom.chProgress.textContent = `${game.holdCount} / ${CHALLENGE_HOLD_FRAMES}`; }

function triggerPassFx(){ dom.passFlash.classList.remove('show'); dom.passText.classList.remove('show'); void dom.passFlash.offsetWidth; dom.passFlash.classList.add('show'); dom.passText.classList.add('show'); }

function renderOverlay(){ const w = dom.overlay.width, h = dom.overlay.height; const ctx = dom.overlay.getContext('2d'); ctx.clearRect(0,0,w,h); if(!game.lastFace){ ctx.save(); ctx.fillStyle = 'rgba(255, 158, 181, 0.92)'; ctx.font = '600 22px -apple-system, "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.fillText('請讓臉部正對鏡頭', w/2, h/2); ctx.restore(); return; } const { x,y,width,height } = game.lastFace; const dominant = game.dominantKey ? EMOTIONS.find(e=>e.key===game.dominantKey) : null; const boxColor = dominant ? dominant.color : '#7afcff'; ctx.save(); ctx.strokeStyle = boxColor; ctx.lineWidth = 3; ctx.shadowColor = boxColor; ctx.shadowBlur = 18; const cornerLen = Math.min(width,height)*0.18; const corners = [ [[x, y+cornerLen],[x,y],[x+cornerLen,y]], [[x+width-cornerLen,y],[x+width,y],[x+width,y+cornerLen]], [[x+width,y+height-cornerLen],[x+width,y+height],[x+width-cornerLen,y+height]], [[x+cornerLen,y+height],[x,y+height],[x,y+height-cornerLen]] ]; for(const c of corners){ ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); ctx.lineTo(c[1][0], c[1][1]); ctx.lineTo(c[2][0], c[2][1]); ctx.stroke(); } ctx.restore(); if(dominant){ const lblY = y - 14; const txt = `${dominant.emoji} ${dominant.name} ${Math.round((game.lastExprs[dominant.key]||0)*100)}%`; ctx.save(); ctx.font = '700 16px -apple-system, "Segoe UI", sans-serif'; const metrics = ctx.measureText(txt); const padX = 12, padY=6; const tw = metrics.width + padX*2; const th = 28; ctx.fillStyle = dominant.color; roundRect(ctx, x, lblY-th, tw, th, 8); ctx.fill(); ctx.fillStyle = '#06070d'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x+padX, lblY - th/2); ctx.restore(); }
    if(game.mode === 'challenge'){ const target = game.currentTarget; ctx.save(); ctx.font = '700 22px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.textAlign = 'center'; ctx.fillText(`做出「${target.name}」表情`, w/2, 50); const prog = game.holdCount / CHALLENGE_HOLD_FRAMES; const bw = 280, bx = (w-bw)/2, by = 70; ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, bx, by, bw, 8, 4); ctx.fill(); ctx.fillStyle = target.color; ctx.shadowBlur = 18; roundRect(ctx, bx, by, bw*prog, 8, 4); ctx.fill(); ctx.restore(); } }

function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }

const game = new EmotionGame(); let fpsTimer=performance.now(), fpsFrames=0, fpsValue=0, lastVideoTime=-1, lastCompleted=0;

async function loop(){ const w = dom.overlay.width, h = dom.overlay.height; if(dom.video.readyState>=2 && dom.video.currentTime !== lastVideoTime){ lastVideoTime = dom.video.currentTime; const detection = await faceapi.detectSingleFace(dom.video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceExpressions(); let exprs = null; let faceBox = null; if(detection){ exprs = detection.expressions; const vw = dom.video.videoWidth || 1; const vh = dom.video.videoHeight || 1; const sx = w / vw, sy = h / vh; const b = detection.detection.box; faceBox = { x: w - (b.x + b.width) * sx, y: b.y * sy, width: b.width * sx, height: b.height * sy }; } game.update(exprs, faceBox); updateEmotionBars(exprs, game.dominantKey); updateMetrics(); if(game.mode === 'challenge') updateChallengePanel(); renderOverlay(); if(game.completed !== lastCompleted){ lastCompleted = game.completed; triggerPassFx(); } }
    fpsFrames++; const now = performance.now(); if(now - fpsTimer >= 1000){ fpsValue = fpsFrames * 1000 / (now - fpsTimer); fpsFrames = 0; fpsTimer = now; dom.mFps.textContent = fpsValue.toFixed(0); } requestAnimationFrame(loop); }

function resizeCanvas(){ const rect = dom.stage.getBoundingClientRect(); dom.overlay.width = rect.width; dom.overlay.height = rect.height; }

async function init(){ buildEmotionList(); try{ const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ ideal:1280 }, height:{ ideal:720 }, facingMode:'user' }, audio:false }); dom.video.srcObject = stream; await new Promise(res => dom.video.onloadedmetadata = res); await dom.video.play(); await Promise.all([ faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL), faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL) ]); dom.loading.classList.add('hidden'); resizeCanvas(); window.addEventListener('resize', resizeCanvas); loop(); }catch(err){ console.error(err); dom.loadErr.textContent = `初始化失敗: ${err.message || err}`; } }

init();
