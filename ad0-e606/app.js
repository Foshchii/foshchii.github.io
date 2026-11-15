(() => {
"use strict";
const sections=window.EXAM_SECTIONS, bank=window.EXAM_QUESTIONS;
const root=document.getElementById("app");
const STORAGE="ad0-e606-practice-v1";
if(!root||!Array.isArray(sections)||!Array.isArray(bank)){ if(root)root.innerHTML='<p class="error">Questions could not load. Refresh the page.</p>';return; }
const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const byId=id=>document.getElementById(id);
const seedShuffle=(arr,seed)=>{const result=[...arr];let n=(seed>>>0)||1;for(let i=result.length-1;i>0;i--){n^=n<<13;n^=n>>>17;n^=n<<5;const j=(n>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;};
const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||"{}")}catch{return {}}};
let saved=load();
let history=Array.isArray(saved.history)?saved.history.slice(-40):[];
let session=saved.session&&Array.isArray(saved.session.ids)?saved.session:null;
function store(){try{localStorage.setItem(STORAGE,JSON.stringify({history,session}))}catch{}}
const sectionFor=id=>sections.find(s=>s.id===id);
function clearHtml(){root.innerHTML="";window.scrollTo({top:0,behavior:"instant"})}
function createSession(mode,section=null){
 let ids=bank.map((_,i)=>i);
 if(mode==="focus")ids=ids.filter(i=>bank[i].section===section);
 if(mode==="weak")ids=ids.filter(i=>["content","data"].includes(bank[i].section));
 if(mode==="missed"){const set=new Set(history.flatMap(a=>a.missed||[]));ids=ids.filter(i=>set.has(i));}
 if(mode==="quick")ids=seedShuffle(ids,Date.now()).slice(0,15);
 else ids=seedShuffle(ids,Date.now());
 if(!ids.length){renderDashboard("There are no missed questions yet. Finish a practice session first.");return}
 session={mode,section,ids,position:0,answers:{},started:new Date().toISOString(),seed:Date.now()};
 store();renderQuestion();
}
function titleFor(){if(!session)return"";if(session.mode==="mock")return"Full 50-question practice";if(session.mode==="weak")return"Priority weak areas";if(session.mode==="quick")return"15-question practice";if(session.mode==="missed")return"Review missed questions";if(session.mode==="focus")return sectionFor(session.section)?.name||"Topic practice";return"Practice";}
function sectionMeter(label,pct,muted=false){return '<div class="meter" aria-label="'+h(label)+': '+pct+' percent"><span'+(muted?' class="weak"':'')+' style="width:'+Math.min(100,Math.max(0,pct))+'%"></span></div>'}
function dashboardMarkup(){
 const latest=history.length?history[history.length-1]:null;
 return '<section class="hero"><div><div class="eyebrow">ADOBE JOURNEY OPTIMIZER · DEVELOPER EXPERT</div><h1>Understand the answer.<br>Pass the next exam.</h1><p>Practice with scenario-based questions, immediate explanations, and official Adobe documentation links. Study the sections that cost you the most marks.</p></div><div class="score-orb"><strong>22<span style="font-size:22px">/50</span></strong><span>YOUR EXAM · NOV 15</span><small>44% baseline</small></div></section>'+
 '<div class="grid2"><section class="card"><h2>Choose a practice mode</h2><p>Learn as you go. The correct answer and the reasoning are revealed after every question.</p><div class="action-list">'+
 (session?'<button class="action-card" data-action="resume"><div><strong>Resume your session</strong><span>'+h(titleFor())+' · '+(session.position+1)+' of '+session.ids.length+'</span></div><span class="arrow">→</span></button>':'')+
 '<button class="action-card" data-action="weak"><div><strong>Focus on weak areas</strong><span>20 questions · Content Authoring + Data Modeling</span></div><span class="arrow">→</span></button>'+
 '<button class="action-card" data-action="mock"><div><strong>Full practice exam</strong><span>50 questions · All 5 domains · Target: 33 correct</span></div><span class="arrow">→</span></button>'+
 '<button class="action-card" data-action="quick"><div><strong>Quick practice</strong><span>15 mixed questions, randomized</span></div><span class="arrow">→</span></button>'+
 '<button class="action-card" data-action="missed"><div><strong>Review past mistakes</strong><span>Retest questions you missed in completed sessions</span></div><span class="arrow">→</span></button></div></section>'+
 '<section class="card"><h2>Your exam breakdown</h2><p>Actual November 15 exam score. Start with the two weakest domains.</p>'+
 sections.map(s=>{const pct=Math.round(s.baseline/s.total*100);return '<div class="section-row"><span class="section-name">'+h(s.name)+'</span><span class="section-meta">'+s.baseline+'/'+s.total+' · '+pct+'%</span>'+sectionMeter(s.short,pct,pct<40)+'</div>'}).join('')+
 '<div class="small-note">Your original score: 22/50. Section bars show the actual result, not your latest practice results.</div></section></div>'+
 '<h2 class="section-title">Or practice a specific section</h2><div class="section-actions">'+sections.map(s=>'<button class="chip" data-action="focus" data-section="'+h(s.id)+'">'+h(s.short)+' <span class="sub">('+s.total+')</span></button>').join('')+'</div>'+
 (latest?'<section class="card" style="margin-top:24px"><h2>Most recent practice</h2><p>'+h(new Date(latest.completed).toLocaleDateString())+' · '+h(latest.modeName)+' · '+latest.correct+'/'+latest.total+' correct ('+Math.round(latest.correct/latest.total*100)+'%)</p><button class="btn ghost" data-action="results">View review →</button></section>':'')+
 '<p class="small-note">Questions are independently written practice items, not actual Adobe examination questions. Your answers are saved locally in this browser only.</p>';
}
function renderDashboard(message){
 clearHtml();root.innerHTML=(message?'<p class="error" role="status">'+h(message)+'</p>':'')+dashboardMarkup();
 root.querySelectorAll("[data-action]").forEach(el=>el.addEventListener("click",()=>{const action=el.dataset.action;if(action==="resume")renderQuestion();else if(action==="results")renderResults(history[history.length-1]);else createSession(action,el.dataset.section||null)}));
}
function optionOrder(idx){return seedShuffle([0,1,2,3],(session.seed||1)+idx*7549)}
function renderQuestion(){
 if(!session){renderDashboard();return}
 if(session.position>=session.ids.length){finishSession();return}
 const idx=session.ids[session.position],question=bank[idx],existing=session.answers[idx];
 const done=Number.isInteger(existing);
 const section=sectionFor(question.section);
 const count=Object.keys(session.answers).length;
 const order=optionOrder(idx);
 const correct=question.correct;
 clearHtml();
 root.innerHTML='<div class="practice-shell"><div class="practice-top"><button class="back-button" id="exit">← Dashboard / save progress</button><span class="session-label">'+h(titleFor())+'</span></div>'+
 '<div class="progress-labels"><span>Question '+(session.position+1)+' of '+session.ids.length+'</span><span>'+count+'/'+session.ids.length+' answered</span></div>'+
 '<div class="progress-track"><div style="width:'+(count/session.ids.length*100)+'%"></div></div>'+
 '<article class="question-card"><div class="question-kicker"><span>'+h(section.name)+'</span><span class="topic">'+h(question.topic)+'</span></div>'+
 '<h1>'+h(question.prompt)+'</h1><div class="answers" id="answers" role="group" aria-label="Answer choices">'+
 order.map((original,i)=>'<button class="answer'+(done?(original===correct?" correct":original===existing?" incorrect":" muted"):"")+'" data-option="'+original+'" '+(done?'disabled':'')+' aria-pressed="'+(done&&original===existing?'true':'false')+'"><span class="answer-letter">'+String.fromCharCode(65+i)+'</span><span class="answer-text">'+h(question.options[original])+'</span></button>').join('')+'</div>'+
 (done?feedbackMarkup(question,existing,section):'<p class="small-note">Select an answer to see the explanation instantly. There is no penalty for taking your time.</p>')+
 '<div class="question-actions"><span class="muted">'+(done?(existing===correct?'✓ Correct answer':'✕ Incorrect answer'):'Choose one answer')+'</span><button class="btn" id="next" '+(!done?'disabled':'')+'>'+(session.position===session.ids.length-1?'See results':'Next question →')+'</button></div></article></div>';
 byId("exit").addEventListener("click",()=>renderDashboard());
 if(!done)root.querySelectorAll("[data-option]").forEach(el=>el.addEventListener("click",()=>{
  if(Object.prototype.hasOwnProperty.call(session.answers,idx))return;
  session.answers[idx]=Number(el.dataset.option);store();renderQuestion();
 }));
 byId("next").addEventListener("click",()=>{if(!Object.prototype.hasOwnProperty.call(session.answers,idx))return;session.position++;store();renderQuestion()});
}
function feedbackMarkup(q,answer,section){
 const yes=answer===q.correct;
 return '<section class="feedback '+(yes?'correct':'incorrect')+'" aria-live="polite">'+
 '<div class="feedback-status '+(yes?'good':'bad')+'">'+(yes?'✓ Correct — well done':'✕ Not quite — here is why')+'</div>'+
 '<p><strong>Correct answer:</strong> '+h(q.options[q.correct])+'</p><p>'+h(q.explanation)+'</p>'+
 '<a class="ref-link" href="'+h(section.doc)+'" rel="noopener noreferrer" target="_blank">Read Adobe Experience League documentation ↗</a></section>';
}
function finishSession(){
 const ids=session.ids;
 const result={completed:new Date().toISOString(),modeName:titleFor(),ids:[...ids],answers:{...session.answers},total:ids.length,
 correct:ids.filter(id=>session.answers[id]===bank[id].correct).length,
 missed:ids.filter(id=>session.answers[id]!==bank[id].correct)};
 history.push(result);history=history.slice(-40);session=null;store();renderResults(result);
}
function renderResults(result){
 if(!result){renderDashboard();return}
 clearHtml();
 const pct=Math.round(result.correct/result.total*100);
 const hasFull=result.total===50;
 const isTarget=hasFull&&result.correct>=33;
 const touched=sections.map(s=>{const ids=result.ids.filter(id=>bank[id].section===s.id);const correct=ids.filter(id=>result.answers[id]===bank[id].correct).length;return {...s,attempted:ids.length,correct}});
 root.innerHTML='<div class="practice-shell"><button class="back-button" id="back">← Dashboard</button>'+
 '<section class="result-hero"><div class="eyebrow">PRACTICE SESSION COMPLETE</div><div class="result-number">'+result.correct+'/'+result.total+'</div>'+
 '<h1>'+(pct>=80?'Strong performance':pct>=66?'Keep building confidence':'You have a clear study path')+'</h1>'+
 '<p>'+pct+'% correct · '+result.missed.length+' question'+(result.missed.length===1?'':'s')+' to revisit</p>'+
 (hasFull?'<p>'+(isTarget?'You met the 33/50 practice target.':'You need '+Math.max(0,33-result.correct)+' more correct answer'+(33-result.correct===1?'':'s')+' to reach the 33/50 practice target.')+'</p>':'')+
 '<div class="result-actions"><button class="btn" id="retry">Practice missed questions →</button><button class="btn ghost" id="newmock">New full exam</button></div></section>'+
 '<section class="card"><h2>Performance by section</h2><p>Review the domains with the lowest accuracy.</p><div class="result-table">'+
 touched.filter(s=>s.attempted).map(s=>{const p=Math.round(100*s.correct/s.attempted);return '<div class="result-item"><div class="result-item-header"><span>'+h(s.name)+'</span><strong>'+s.correct+'/'+s.attempted+' · '+p+'%</strong></div>'+sectionMeter(s.name,p,p<40)+'</div>'}).join('')+'</div><p class="results-notice">Practice scores are educational only. They do not predict an official pass.</p></section>'+
 (result.missed.length?'<h2 class="section-title">Review incorrect answers</h2><div class="review-list">'+result.missed.map(id=>'<div class="review-item"><div><strong>'+h(bank[id].topic)+'</strong><small>'+h(bank[id].prompt)+'</small></div><button class="btn ghost" data-review="'+id+'">Explain</button></div>').join('')+'</div>':'<p class="small-note">No incorrect answers in this session.</p>')+'</div>';
 byId("back").addEventListener("click",()=>renderDashboard());
 byId("newmock").addEventListener("click",()=>createSession("mock"));
 byId("retry").disabled=!result.missed.length;
 byId("retry").addEventListener("click",()=>{session={mode:"missed",section:null,ids:seedShuffle(result.missed,Date.now()),position:0,answers:{},started:new Date().toISOString(),seed:Date.now()};store();renderQuestion()});
 root.querySelectorAll("[data-review]").forEach(el=>el.addEventListener("click",()=>{
  const id=Number(el.dataset.review),q=bank[id],s=sectionFor(q.section);
  const modal=document.createElement("dialog");modal.className="card";modal.style.cssText="color:var(--text);background:var(--panel);border:1px solid var(--line);max-width:min(92vw,610px);border-radius:20px;box-shadow:0 16px 100px #0009;padding:26px";
  modal.innerHTML='<h2>'+h(q.topic)+'</h2><p style="color:var(--text)">'+h(q.prompt)+'</p>'+feedbackMarkup(q,result.answers[id],s)+'<div style="text-align:right;margin-top:20px"><button class="btn ghost" id="close-review">Close</button></div>';
  document.body.appendChild(modal);modal.showModal();modal.querySelector("#close-review").addEventListener("click",()=>modal.close());modal.addEventListener("close",()=>modal.remove());
 }));
}
if(bank.length!==50||sections.some(s=>bank.filter(q=>q.section===s.id).length!==s.total)){
 root.innerHTML='<p class="error">The question bank needs maintenance. Please contact the site owner.</p>';return;
}
if(session&&session.ids.every(id=>Number.isInteger(id)&&id>=0&&id<bank.length)&&session.position<session.ids.length)renderDashboard();else{session=null;renderDashboard()}
})();