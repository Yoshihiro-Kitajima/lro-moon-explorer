import * as THREE from 'three';
import {OrbitControls} from './OrbitControls.js';
import {heightAt,lonLat,RADIUS,WIDTH,HEIGHT} from './terrain.js';
const $=id=>document.getElementById(id), rad=Math.PI/180;
const places=[
 {name:'ティコ',sub:'光条の広がるクレーター',lat:-43.3,lon:-11.4},
 {name:'コペルニクス',sub:'中央峰と段状の壁',lat:9.6,lon:-20.1},
 {name:'プラトー',sub:'雨の海の北のほとり',lat:51.6,lon:-9.4},
 {name:'静かの海',sub:'アポロ11号の着陸地域',lat:0.7,lon:23.5},
 {name:'ツィオルコフスキー',sub:'月の裏側の暗い床',lat:-20.4,lon:129},
 {name:'南極周辺',sub:'極域を斜めから見る',lat:-88,lon:0}
];
let renderer,scene,camera,controls,globe,patch,grid,material,texture,heightData,meta;
let mode='globe',selected={...places[0]},exaggeration=1,basis=null,ready=false,transition=null;
let sun,ambient,marker,viewWidth=1,viewHeight=1,lastHover=0,hovering=false;
const labelItems=[],pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
const tmp=new THREE.Vector3(),color=new THREE.Color(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const palette=['#263d78','#4c96b0','#aab79b','#d2b585','#f3e4cf'].map(c=>new THREE.Color(c));
function direction(lat,lon){return new THREE.Vector3(Math.cos(lat*rad)*Math.sin(lon*rad),Math.sin(lat*rad),Math.cos(lat*rad)*Math.cos(lon*rad));}
function elevation(lat,lon){return heightAt(heightData,lat,lon);}
function spherePoint(lat,lon){return direction(lat,lon).multiplyScalar(1+elevation(lat,lon)*exaggeration/RADIUS);}
function elevationColor(h){const p=THREE.MathUtils.clamp((h+9)/20,0,.99999)*4,i=Math.floor(p);return color.copy(palette[i]).lerp(palette[Math.min(4,i+1)],p-i);}
function status(text){$('status').textContent=text;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,3200);}
function coordinates(lat,lon){return `${lat>=0?'北緯':'南緯'} ${Math.abs(lat).toFixed(2)}° / ${lon>=0?'東経':'西経'} ${Math.abs(lon).toFixed(2)}°`;}
function readout(lat,lon){$('location').textContent=coordinates(lat,lon);const h=elevation(lat,lon);$('height').textContent=`標高 ${h>=0?'+':''}${h.toFixed(2)} km`;}

function geometry(local=false){
 const nx=local?320:720,ny=local?320:360,count=(nx+1)*(ny+1);
 const pos=new Float32Array(count*3),uv=new Float32Array(count*2),colors=new Float32Array(count*3),indices=new Uint32Array(nx*ny*6);
 const directions=new Float32Array(count*3),elevations=new Float32Array(count);
 const n=local?basis.n:null,e=local?basis.e:null,north=local?basis.north:null;
 let k=0;
 for(let row=0;row<=ny;row++)for(let col=0;col<=nx;col++){
  let lat,lon,d;
  if(local){d=n.clone().addScaledVector(e,(col/nx-.5)*.28).addScaledVector(north,(.5-row/ny)*.28).normalize();({lat,lon}=lonLat(d.x,d.y,d.z));}
  else{lat=90-row/ny*180;lon=-180+col/nx*360;d=direction(lat,lon);}
  const h=elevation(lat,lon);elevations[k]=h;
  if(local){directions[k*3]=d.dot(e);directions[k*3+1]=d.dot(n);directions[k*3+2]=-d.dot(north);}
  else d.toArray(directions,k*3);
  const scale=1+h*exaggeration/RADIUS;
  pos[k*3]=directions[k*3]*scale;pos[k*3+1]=directions[k*3+1]*scale-(local?1:0);pos[k*3+2]=directions[k*3+2]*scale;
  uv[k*2]=(lon+180)/360;uv[k*2+1]=(lat+90)/180;
  elevationColor(h).toArray(colors,k*3);k++;
 }
 k=0;
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const a=y*(nx+1)+x,b=a+nx+1,c=a+1,d=b+1;
  indices.set([a,b,c,b,d,c],k);k+=6;
 }
 // Unwrap texture coordinates on triangles crossing the +/-180 seam.
 if(local){let min=1,max=0;for(let i=0;i<count;i++){min=Math.min(min,uv[i*2]);max=Math.max(max,uv[i*2]);}if(max-min>.5)for(let i=0;i<count;i++)if(uv[i*2]<.5)uv[i*2]+=1;}
 const g=new THREE.BufferGeometry();g.setIndex(new THREE.BufferAttribute(indices,1));g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.userData={directions,elevations,local};g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function updateRelief(mesh){if(!mesh)return;const g=mesh.geometry,{directions,elevations,local}=g.userData,p=g.attributes.position.array;for(let i=0;i<elevations.length;i++){const s=1+elevations[i]*exaggeration/RADIUS;p[i*3]=directions[i*3]*s;p[i*3+1]=directions[i*3+1]*s-(local?1:0);p[i*3+2]=directions[i*3+2]*s;}g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
function makeGrid(){if(grid){scene.remove(grid);grid.geometry.dispose();grid.material.dispose();}const points=[];function add(lat1,lon1,lat2,lon2){const p=spherePoint(lat1,lon1).multiplyScalar(1.001),q=spherePoint(lat2,lon2).multiplyScalar(1.001);points.push(...p.toArray(),...q.toArray());}for(let lat=-60;lat<=60;lat+=30)for(let lon=-180;lon<180;lon++)add(lat,lon,lat,lon+1);for(let lon=-180;lon<180;lon+=30)for(let lat=-90;lat<90;lat++)add(lat,lon,lat+1,lon);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));grid=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb8cbd7,transparent:true,opacity:.2}));grid.visible=$('grid').checked&&mode==='globe';scene.add(grid);}
function setModeUI(){const local=mode==='terrain';$('globeBtn').classList.toggle('active',!local);$('terrainBtn').classList.toggle('active',local);$('modeTag').textContent=local?'TERRAIN VIEW':'GLOBAL VIEW';$('viewTitle').textContent=local?selected.name||'選んだ月面':selected.name||'月の表側';$('viewSub').textContent=local?'ドラッグして、クレーターを斜めから。':'月面をダブルクリックすると、その場所へ接近。';$('grid').disabled=local;$('showLabels').disabled=local;$('auto').checked=false;controls.autoRotate=false;grid.visible=!local&&$('grid').checked;status(local?'地域の立体地形 · 元データ 約1.9 km 間隔':'LRO LOLA · 元データ 約1.9 km 間隔');}
function fly(pos,target,duration=650){transition={from:camera.position.clone(),to:pos.clone(),startTarget:controls.target.clone(),target:target.clone(),start:performance.now(),duration:reduced?1:duration};}
function globeView(lat=12,lon=-8,dist=3.3){if(!ready)return;const wasLocal=mode==='terrain';mode='globe';globe.visible=true;if(patch)patch.visible=false;camera.up.set(0,1,0);controls.minPolarAngle=.005;controls.maxPolarAngle=Math.PI-.005;controls.minDistance=1.13;controls.maxDistance=7;controls.enablePan=true;controls.target.set(0,0,0);controls.update();camera.near=.001;camera.far=50;camera.updateProjectionMatrix();setModeUI();const dest=direction(lat,lon).multiplyScalar(dist);if(wasLocal){camera.position.copy(dest);controls.update();transition=null;}else fly(dest,new THREE.Vector3());updateMarker();}
function terrainView(){if(!ready)return;transition=null;mode='terrain';const n=direction(selected.lat,selected.lon),e=new THREE.Vector3(Math.cos(selected.lon*rad),0,-Math.sin(selected.lon*rad)),north=n.clone().cross(e).normalize();basis={n,e,north};if(patch){scene.remove(patch);patch.geometry.dispose();}patch=new THREE.Mesh(geometry(true),material);scene.add(patch);globe.visible=false;grid.visible=false;marker.visible=false;camera.up.set(0,1,0);const h=elevation(selected.lat,selected.lon)*exaggeration/RADIUS;controls.target.set(0,h,0);camera.position.set(.035,h+.18,.24);controls.minPolarAngle=.05;controls.maxPolarAngle=1.42;controls.minDistance=.025;controls.maxDistance=.75;controls.update();setModeUI();readout(selected.lat,selected.lon);}
function choose(place,local=mode==='terrain'){selected={...place};$('lat').value=place.lat.toFixed(3);$('lon').value=place.lon.toFixed(3);document.querySelectorAll('#places button').forEach((el,i)=>el.classList.toggle('selected',places[i].name===place.name));if(local)terrainView();else globeView(place.lat,place.lon,2.25);readout(place.lat,place.lon);}
const landingSites = [];
function createLandingRings() {
 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = 64;
 const pen = canvas.getContext('2d');
 pen.beginPath();
 pen.arc(32, 32, 23, 0, Math.PI * 2);
 for (const [width, color] of [[12, '#251710'], [6, '#ffbb44']]) {
   pen.lineWidth = width;
   pen.strokeStyle = color;
   pen.stroke();
 }
 const material = new THREE.SpriteMaterial({
   map: new THREE.CanvasTexture(canvas), transparent: true,
   depthWrite: false, depthTest: false, sizeAttenuation: false
 });
 for (const option of document.querySelectorAll('#missionSelect option[data-lat]')) {
   const ring = new THREE.Sprite(material);
   ring.renderOrder = 5;
   scene.add(ring);
   landingSites.push({ring, lat:Number(option.dataset.lat), lon:Number(option.dataset.lon)});
 }
}
function positionLandingRings() {
 for (const {ring, lat, lon} of landingSites) {
   const point = spherePoint(lat, lon);
   if (mode === 'globe') {
     ring.position.copy(point);
     ring.visible = point.dot(camera.position) > point.lengthSq();
   } else {
     const up = point.dot(basis.n);
     const east = point.dot(basis.e);
     const north = point.dot(basis.north);
     ring.visible = up > 0 && Math.abs(east / up) < .14 && Math.abs(north / up) < .14;
     ring.position.set(east, up - 1, -north);
   }
   const active = Math.abs(selected.lat - lat) < .0006 && Math.abs(selected.lon - lon) < .0006;
   ring.scale.setScalar((active ? 24 : 15) * 2 * Math.tan(camera.fov * rad / 2) / viewHeight);
 }
}
function updateMarker(){if(!marker||!ready)return;marker.visible=mode==='globe';marker.position.copy(spherePoint(selected.lat,selected.lon).multiplyScalar(1.002));}
function hit(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const h=raycaster.intersectObject(mode==='globe'?globe:patch,false)[0];if(!h)return null;let p=h.point;if(mode==='terrain')p=basis.n.clone().multiplyScalar(1+p.y).addScaledVector(basis.e,p.x).addScaledVector(basis.north,-p.z);return lonLat(p.x,p.y,p.z);}
function lightUpdate(){const angle=+$('sun').value*rad;let base=mode==='globe'?camera.position.clone().sub(controls.target).normalize():new THREE.Vector3(0,.7,1).normalize();base.applyAxisAngle(new THREE.Vector3(0,1,0),angle);sun.position.copy(base.multiplyScalar(5));ambient.intensity=$('topo').checked?1.8:1.0;}
function zoom(factor){if(!ready)return;transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
function renderLabels(){for(const item of labelItems){if(mode!=='globe'||!$('showLabels').checked){item.el.hidden=true;continue;}const v=spherePoint(item.place.lat,item.place.lon).multiplyScalar(1.001);const facing=v.dot(camera.position.clone().sub(v))>0;v.project(camera);const visible=facing&&Math.abs(v.x)<.95&&Math.abs(v.y)<.95&&v.z<1;item.el.hidden=!visible;if(visible){item.el.style.left=`${(v.x+1)*viewWidth/2}px`;item.el.style.top=`${(1-v.y)*viewHeight/2}px`;}}}
function resize(){const r=$('viewport').getBoundingClientRect();viewWidth=Math.max(1,r.width);viewHeight=Math.max(1,r.height);camera.aspect=viewWidth/viewHeight;camera.updateProjectionMatrix();renderer.setSize(viewWidth,viewHeight);}
function animate(t){requestAnimationFrame(animate);if(!ready)return;if(transition){const f=Math.min(1,(t-transition.start)/transition.duration),a=f*f*(3-2*f);camera.position.lerpVectors(transition.from,transition.to,a);controls.target.lerpVectors(transition.startTarget,transition.target,a);if(f===1)transition=null;}controls.update();if(mode==='terrain'){
 // Keep the observer above the displayed surface even after a low-angle pan.
 controls.target.x=THREE.MathUtils.clamp(controls.target.x,-.10,.10);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-.10,.10);
 const d=basis.n.clone().addScaledVector(basis.e,camera.position.x).addScaledVector(basis.north,-camera.position.z).normalize();const ll=lonLat(d.x,d.y,d.z);const surface=d.dot(basis.n)*(1+elevation(ll.lat,ll.lon)*exaggeration/RADIUS)-1;camera.position.y=Math.max(camera.position.y,surface+.003);
 }else{
 // Prevent a panned orbit from going through the globe.
 const ll=lonLat(camera.position.x,camera.position.y,camera.position.z),min=1+elevation(ll.lat,ll.lon)*exaggeration/RADIUS+.015;if(camera.position.length()<min)camera.position.setLength(min);
 }
 positionLandingRings();lightUpdate();renderer.render(scene,camera);renderLabels();if(!hovering){const dist=camera.position.distanceTo(controls.target)*RADIUS;$('distance').textContent=`注視点まで ${Math.round(dist).toLocaleString()} km`;}}

async function boot(){
 try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;$('viewport').appendChild(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.001,50);camera.position.copy(direction(12,-8).multiplyScalar(3.3));controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.rotateSpeed=.6;controls.zoomSpeed=.8;controls.autoRotateSpeed=.4;controls.addEventListener('start',()=>{transition=null;});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;$('loading').hidden=false;$('loadText').textContent='描画が中断されました。ページを再読み込みしてください。';});
 let done=0;const tick=()=>{$('progress').value=++done;};
 const json=await fetch('./data.json');if(!json.ok)throw Error('データ情報を取得できません');meta=await json.json();
 const chunks=await Promise.all([0,1,2,3].map(async i=>{const r=await fetch(`./lro-height-${i}.i16`);if(!r.ok)throw Error('標高データを読み込めません');const b=await r.arrayBuffer();if(b.byteLength!==WIDTH*HEIGHT/4*2)throw Error('標高データの大きさが一致しません');tick();return new Int16Array(b);}));
 heightData=new Int16Array(WIDTH*HEIGHT);chunks.forEach((a,i)=>heightData.set(a,i*a.length));
 texture=await new THREE.TextureLoader().loadAsync('./moon-color.jpg');tick();texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 material=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0});
 $('loadText').textContent='実測標高から月面を組み立てています…';await new Promise(r=>setTimeout(r,30));
 globe=new THREE.Mesh(geometry(),material);scene.add(globe);ambient=new THREE.AmbientLight(0xffffff,1);sun=new THREE.DirectionalLight(0xfff5e7,2.5);scene.add(ambient,sun);
 marker=new THREE.Mesh(new THREE.SphereGeometry(.004,12,8),new THREE.MeshBasicMaterial({color:0xf2d0a0}));scene.add(marker);makeGrid();createLandingRings();
 for(const place of places){const el=document.createElement('button');el.className='map-label';el.textContent=place.name;el.addEventListener('click',()=>choose(place));$('labels').appendChild(el);labelItems.push({el,place});}
 ready=true;selected={...places[0]};globeView();transition=null;$('viewTitle').textContent='月の表側';$('viewSub').textContent='ドラッグして、月の裏側へ。';readout(selected.lat,selected.lon);$('loading').hidden=true;resize();new ResizeObserver(resize).observe($('viewport'));requestAnimationFrame(animate);wireCanvas();
 }catch(e){console.error(e);$('loadText').textContent='月面を読み込めませんでした。通信環境とWebGLを確認して、再読み込みしてください。';const b=document.createElement('button');b.textContent='再読み込み';b.style.padding='10px 20px';b.onclick=()=>location.reload();$('loading').appendChild(b);status('読み込みエラー');}
}
function wireCanvas(){let down=null;const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{if(e.button!==0||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const ll=hit(e);if(ll){readout(ll.lat,ll.lon);if(mode==='globe'){selected={...ll,name:'選んだ月面'};$('lat').value=ll.lat.toFixed(3);$('lon').value=ll.lon.toFixed(3);updateMarker();document.querySelectorAll('#places button').forEach(el=>el.classList.remove('selected'));}}});canvas.addEventListener('dblclick',e=>{const ll=hit(e);if(ll)choose({...ll,name:'選んだ月面'},true);});canvas.addEventListener('pointermove',e=>{if(e.buttons||performance.now()-lastHover<90)return;lastHover=performance.now();const ll=hit(e);if(ll){readout(ll.lat,ll.lon);canvas.style.cursor='crosshair';}else canvas.style.cursor='grab';});canvas.addEventListener('pointerleave',()=>readout(selected.lat,selected.lon));}
places.forEach(p=>{const b=document.createElement('button');const name=document.createElement('span');name.textContent=p.name;const sub=document.createElement('small');sub.textContent=p.sub;b.append(name,sub);b.addEventListener('click',()=>{if(ready)choose(p);});$('places').appendChild(b);});
$('globeBtn').onclick=()=>globeView(selected.lat,selected.lon,3.3);$('terrainBtn').onclick=terrainView;
$('coords').onsubmit=e=>{e.preventDefault();if(ready)choose({lat:+$('lat').value,lon:((+$('lon').value+180)%360+360)%360-180,name:'指定した月面'});};
$('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);
$('reset').onclick=()=>{if(!ready)return;selected={...places[0]};$('lat').value=selected.lat;$('lon').value=selected.lon;globeView();readout(selected.lat,selected.lon);$('viewTitle').textContent='月の表側';document.querySelectorAll('#places button').forEach(el=>el.classList.remove('selected'));};
$('relief').oninput=()=>{$('reliefVal').textContent=`${$('relief').value}×${+$('relief').value===1?' · 実寸比':' · 高さを強調'}`;};
$('relief').onchange=()=>{if(!ready)return;exaggeration=+$('relief').value;updateRelief(globe);updateRelief(patch);makeGrid();updateMarker();if(mode==='terrain'){const h=elevation(selected.lat,selected.lon)*exaggeration/RADIUS;controls.target.y=h;}toast(exaggeration===1?'実際の縦横比で表示しています':`地形の高さを ${exaggeration} 倍に強調しています`);};
$('sun').oninput=()=>{$('sunVal').textContent=`${$('sun').value}°`;};
$('topo').onchange=()=>{if(!ready)return;material.map=$('topo').checked?null:texture;material.vertexColors=$('topo').checked;material.needsUpdate=true;$('legend').hidden=!$('topo').checked;};
$('grid').onchange=()=>{if(ready)grid.visible=$('grid').checked&&mode==='globe';};
$('auto').onchange=()=>{if(ready)controls.autoRotate=$('auto').checked;};
$('help').onclick=()=>$('info').showModal();document.querySelector('.close').onclick=()=>$('info').close();$('info').addEventListener('click',e=>{if(e.target===$('info')){const r=$('info').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('info').close();}});
$('capture').onclick=()=>{if(!ready)return;renderer.render(scene,camera);const out=document.createElement('canvas');out.width=renderer.domElement.width;out.height=renderer.domElement.height+90;const ctx=out.getContext('2d');ctx.fillStyle='#090d13';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(renderer.domElement,0,0);ctx.fillStyle='#e4c291';ctx.font='20px sans-serif';ctx.fillText(`月を歩く LRO版 · ${mode==='globe'?'全球':selected.name} · 起伏 ${exaggeration} 倍`,22,out.height-54);ctx.fillStyle='#b5c0cc';ctx.font='14px sans-serif';ctx.fillText('標高 NASA/LRO/LOLA（加工） · 画像 NASA/GSFC/SVS・LROC/ASU',22,out.height-25);out.toBlob(blob=>{const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`moon-${mode}-${new Date().toISOString().slice(0,10)}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('現在の眺めを画像に保存しました');});};
boot();
