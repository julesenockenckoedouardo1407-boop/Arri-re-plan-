const $=id=>document.getElementById(id);
const preview=$("preview"), canvas=$("canvas"), ctx=canvas.getContext("2d");
let stream=null, facing="environment", recorder=null, chunks=[], deferredInstall=null, db=null;

async function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open("JulesArrierePlanDB",1);
    req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains("captures"))d.createObjectStore("captures",{keyPath:"id",autoIncrement:true})};
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function saveCapture(blob,type){
  try{if(!db)db=await openDB();const tx=db.transaction("captures","readwrite");tx.objectStore("captures").add({blob,type,date:new Date().toISOString()});await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=()=>j(tx.error)});loadGallery()}catch(e){console.error(e)}
}
async function loadGallery(){
  if(!db) db=await openDB();
  const tx=db.transaction("captures","readonly"), req=tx.objectStore("captures").getAll();
  req.onsuccess=()=>{const items=$("items"),empty=$("empty");items.innerHTML="";const data=req.result.reverse();empty.classList.toggle("hidden",data.length>0);
    data.forEach(x=>{const url=URL.createObjectURL(x.blob), fig=document.createElement("figure");
      if(x.type==="photo"){fig.innerHTML=`<a href="${url}" download="jules-photo-${x.id}.jpg"><img src="${url}" alt="Photo"></a>`}
      else{fig.innerHTML=`<a href="${url}" download="jules-video-${x.id}.webm"><video src="${url}" controls playsinline></video></a>`}
      const cap=document.createElement("figcaption");cap.textContent=new Date(x.date).toLocaleString("fr-FR");fig.appendChild(cap);items.appendChild(fig);
    });
  };
}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){$("permissionHelp").textContent="La caméra n'est pas disponible dans ce navigateur.";$("permissionHelp").classList.remove("hidden");return}
  if(stream) stream.getTracks().forEach(t=>t.stop());
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}},audio:true});
    preview.srcObject=stream;$("message").classList.add("hidden");$("permissionHelp").classList.add("hidden");$("status").textContent="Caméra active";
  }catch(e){$("permissionHelp").classList.remove("hidden");$("status").textContent="Caméra indisponible";console.error(e)}
}
$("startBtn").onclick=startCamera;
$("switchBtn").onclick=async()=>{facing=facing==="environment"?"user":"environment";await startCamera()};
$("captureBtn").onclick=async()=>{
  if(!stream){await startCamera();return}
  canvas.width=preview.videoWidth;canvas.height=preview.videoHeight;
  if(facing==="user"){ctx.save();ctx.translate(canvas.width,0);ctx.scale(-1,1)}
  ctx.drawImage(preview,0,0,canvas.width,canvas.height);if(facing==="user")ctx.restore();
  canvas.toBlob(async b=>{if(b)await saveCapture(b,"photo")},"image/jpeg",.92);
  $("status").textContent="Photo enregistrée";setTimeout(()=>{$("status").textContent="Caméra active"},1200);
};
$("recordBtn").onclick=async()=>{
  if(!stream){await startCamera();return}
  if(recorder?.state==="recording"){recorder.stop();return}
  const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
  chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=async()=>{const blob=new Blob(chunks,{type:mime});await saveCapture(blob,"video");$("recordBtn").classList.remove("recording");$("captureBtn").classList.remove("recording");$("status").textContent="Vidéo enregistrée";setTimeout(()=>{$("status").textContent="Caméra active"},1200)};
  recorder.start();$("recordBtn").classList.add("recording");$("captureBtn").classList.add("recording");$("status").textContent="● Enregistrement";
};
$("galleryBtn").onclick=async()=>{$("gallery").classList.remove("hidden");await loadGallery()};
$("closeGallery").onclick=()=>$("gallery").classList.add("hidden");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").classList.add("hidden")}};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
window.addEventListener("load",()=>{openDB().catch(console.error)});
