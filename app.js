const $=id=>document.getElementById(id);
const camera=$("camera"),output=$("output"),ctx=output.getContext("2d"),work=$("work"),wctx=work.getContext("2d"),maskCanvas=$("mask"),mctx=maskCanvas.getContext("2d"),personCanvas=$("person"),pctx=personCanvas.getContext("2d");
let stream=null,facing="user",running=false,segmentation=null,recorder=null,chunks=[],db=null,customImage=null;
let background={type:"none",src:""};let activeCategory="tous";

const presets=[
 {name:"Aucun",cat:"tous",src:"none"},{name:"Salle de classe",cat:"scolaire",src:"classroom.svg"},
 {name:"Tableau pédagogique",cat:"scolaire",src:"blackboard.svg"},{name:"Bibliothèque",cat:"scolaire",src:"library.svg"},
 {name:"Cour d'école",cat:"scolaire",src:"schoolyard.svg"},{name:"Laboratoire",cat:"scolaire",src:"science-lab.svg"},
 {name:"Salle informatique",cat:"scolaire",src:"computer-lab.svg"},{name:"Coucher de soleil",cat:"nature",src:"sunset.svg"},
 {name:"Bureau moderne",cat:"moderne",src:"office.svg"}
];

function buildPicker(){
 const box=$("choices");box.innerHTML="";
 presets.filter(p=>activeCategory==="tous"||p.cat===activeCategory).forEach(p=>{
  const b=document.createElement("button");b.className="choice";
  if(p.src==="none")b.style.background="#111";
  else b.style.backgroundImage=`url("${p.src}")`;
  const s=document.createElement("span");s.textContent=p.name;b.appendChild(s);
  b.onclick=()=>{background={type:p.src==="none"?"none":"image",src:p.src};customImage=null;document.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("backgrounds").classList.add("hidden");$("status").textContent=p.name};
  box.appendChild(b);
 });
}
buildPicker();
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");activeCategory=t.dataset.cat;buildPicker()});

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open("JulesArrierePlanDB",1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("captures"))r.result.createObjectStore("captures",{keyPath:"id",autoIncrement:true})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveCapture(blob,type){if(!db)db=await openDB();const tx=db.transaction("captures","readwrite");tx.objectStore("captures").add({blob,type,date:Date.now()});await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onerror=()=>no(tx.error)})}
async function loadGallery(){if(!db)db=await openDB();const r=db.transaction("captures","readonly").objectStore("captures").getAll();r.onsuccess=()=>{const box=$("items");box.innerHTML="";const a=r.result.reverse();$("empty").classList.toggle("hidden",a.length>0);a.forEach(x=>{const u=URL.createObjectURL(x.blob),f=document.createElement("figure");f.innerHTML=x.type==="photo"?`<a href="${u}" download="jules-photo-${x.id}.jpg"><img src="${u}" alt="Photo"></a>`:`<a href="${u}" download="jules-video-${x.id}.webm"><video src="${u}" controls playsinline></video></a>`;const c=document.createElement("figcaption");c.textContent=new Date(x.date).toLocaleString("fr-FR");f.appendChild(c);box.appendChild(f)})}}

async function startCamera(){
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error("getUserMedia indisponible");
  if(stream)stream.getTracks().forEach(t=>t.stop());
  // Exact facingMode fixes browsers that ignore the previous "ideal" constraint.
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:false});
  camera.srcObject=stream;await camera.play();running=true;$("startPanel").classList.add("hidden");$("error").classList.add("hidden");
  $("status").textContent=facing==="user"?"Caméra avant":"Caméra arrière";initSegmentation();requestAnimationFrame(renderLoop);
 }catch(e){
  if(facing==="environment"){
   try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:"environment"}},audio:false})}catch(_){showError("La caméra arrière n'est pas disponible dans ce navigateur/appareil.");return}
  }else{showError("Impossible d'accéder à la caméra. Vérifie l'autorisation caméra et HTTPS.");return}
  camera.srcObject=stream;await camera.play();running=true;$("startPanel").classList.add("hidden");initSegmentation();requestAnimationFrame(renderLoop);
 }
}

function initSegmentation(){
 if(segmentation||!window.SelfieSegmentation)return;
 segmentation=new SelfieSegmentation({locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`});
 segmentation.setOptions({modelSelection:1});segmentation.onResults(renderResult);
}

function resizeCanvases(){
 const W=Math.max(1,innerWidth),H=Math.max(1,innerHeight);
 [output,work,maskCanvas,personCanvas].forEach(c=>{c.width=W;c.height=H});
}
function fit(W,H,iw,ih){const s=Math.max(W/iw,H/ih);return{w:iw*s,h:ih*s,x:(W-iw*s)/2,y:(H-ih*s)/2}}
function drawCamera(){
 resizeCanvases();const W=output.width,H=output.height,q=fit(W,H,camera.videoWidth||W,camera.videoHeight||H);
 wctx.clearRect(0,0,W,H);wctx.save();
 if(facing==="user"){wctx.translate(W,0);wctx.scale(-1,1);wctx.drawImage(camera,-q.x-q.w,q.y,q.w,q.h)}
 else wctx.drawImage(camera,q.x,q.y,q.w,q.h);
 wctx.restore();
}
const bgCache={};
function getBg(src){if(!bgCache[src]){const i=new Image();i.src=src;bgCache[src]=i}return bgCache[src]}
function drawBackground(){
 const W=output.width,H=output.height;
 if(background.type==="none"){ctx.drawImage(work,0,0);return}
 if(background.type==="custom"&&customImage){ctx.drawImage(customImage,0,0,W,H);return}
 const img=getBg(background.src);
 if(img.complete)ctx.drawImage(img,0,0,W,H);else{ctx.fillStyle="#18252c";ctx.fillRect(0,0,W,H)}
}
function renderResult(result){
 drawCamera();
 if(background.type==="none"){ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(work,0,0);return}
 // Correct composition: full background first, then camera pixels clipped by the person mask.
 drawBackground();
 mctx.clearRect(0,0,output.width,output.height);mctx.drawImage(result.segmentationMask,0,0,output.width,output.height);
 pctx.clearRect(0,0,output.width,output.height);pctx.drawImage(work,0,0);
 pctx.globalCompositeOperation="destination-in";pctx.drawImage(maskCanvas,0,0);pctx.globalCompositeOperation="source-over";
 ctx.drawImage(personCanvas,0,0);
}
async function renderLoop(){if(!running)return;if(segmentation){try{await segmentation.send({image:camera})}catch(e){renderFallback()}}else renderFallback();requestAnimationFrame(renderLoop)}
function renderFallback(){resizeCanvases();ctx.clearRect(0,0,output.width,output.height);drawCamera()}

$("start").onclick=startCamera;
$("switch").onclick=()=>{facing=facing==="user"?"environment":"user";startCamera()};
$("bgBtn").onclick=()=>$("backgrounds").classList.remove("hidden");
$("closePicker").onclick=()=>$("backgrounds").classList.add("hidden");
$("gallery").onclick=async()=>{$("galleryPanel").classList.remove("hidden");await loadGallery()};
$("closeGallery").onclick=()=>$("galleryPanel").classList.add("hidden");
$("customBg").onchange=e=>{const file=e.target.files[0];if(!file)return;const url=URL.createObjectURL(file);customImage=new Image();customImage.onload=()=>{background={type:"custom"};$("backgrounds").classList.add("hidden");$("status").textContent="Arrière-plan personnalisé"};customImage.src=url};

$("photo").onclick=async()=>{if(!running)return;const blob=await new Promise(r=>output.toBlob(r,"image/jpeg",.94));if(blob){await saveCapture(blob,"photo");$("status").textContent="Photo enregistrée";setTimeout(()=>{$("status").textContent=facing==="user"?"Caméra avant":"Caméra arrière"},1200)}};
$("video").onclick=async()=>{
 if(!running)return;if(recorder?.state==="recording"){recorder.stop();return}
 const capture=output.captureStream(30);const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
 chunks=[];recorder=new MediaRecorder(capture,{mimeType:mime});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 recorder.onstop=async()=>{await saveCapture(new Blob(chunks,{type:"video/webm"}),"video");$("video").classList.remove("recording");$("status").textContent="Vidéo enregistrée"};
 recorder.start();$("video").classList.add("recording");$("status").textContent="● Enregistrement";
};
let installEvent=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;$("install").classList.remove("hidden")});
$("install").onclick=async()=>{if(installEvent){installEvent.prompt();await installEvent.userChoice;installEvent=null;$("install").classList.add("hidden")}};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
window.addEventListener("resize",()=>{if(running)resizeCanvases()});openDB().catch(console.error);
function showError(t){$("error").textContent=t;$("error").classList.remove("hidden");setTimeout(()=>$("error").classList.add("hidden"),7000)}
