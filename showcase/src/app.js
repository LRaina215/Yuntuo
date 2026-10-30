'use strict';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion=motionQuery.matches;
const contentAnimations=new Map();
const tours={};
function animateContent(el,slide=true){
  if(reduceMotion||!el)return;
  contentAnimations.get(el)?.cancel();
  const frames=slide?[{opacity:.4,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:.4},{opacity:1}];
  const animation=el.animate(frames,{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
  contentAnimations.set(el,animation);
  animation.onfinish=()=>contentAnimations.delete(el);
}
motionQuery.addEventListener('change',e=>{reduceMotion=e.matches;if(reduceMotion){contentAnimations.forEach(a=>a.cancel());contentAnimations.clear();$$('.reveal').forEach(el=>el.classList.add('is-visible'));}});
function activate(selector, el) { $$(selector).forEach(b => { const yes = b===el; b.classList.toggle('active',yes); b.setAttribute('aria-pressed',String(yes)); }); }

// Offline assembly viewer; hardware geometry, color and acrylic opacity are embedded.
(async function initRobot(){
  const stage=$('#model-stage'), loading=$('#model-loading');
  try {
    const data=JSON.parse($('#robot-data').textContent), T=THREE;
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
    stage.appendChild(renderer.domElement);
    const scene=new T.Scene(), camera=new T.PerspectiveCamera(35,1,.005,20);
    scene.add(new T.HemisphereLight(0xc6f7ff,0x283d51,.8));
    const key=new T.DirectionalLight(0xe4f8ff,1.7);key.position.set(1,2,1);scene.add(key);
    const rim=new T.DirectionalLight(0x71dad9,1.1);rim.position.set(-1,.6,-1);scene.add(rim);
    const fill=new T.DirectionalLight(0xffc79d,.45);fill.position.set(.5,-.2,-1);scene.add(fill);
    const root=new T.Group();scene.add(root);
    const transforms=new Map();
    function worldMatrix(p){
      if(transforms.has(p.name)) return transforms.get(p.name);
      const local=new T.Matrix4().compose(new T.Vector3(...p.origin),new T.Quaternion().setFromEuler(new T.Euler(...p.rpy,'ZYX')),new T.Vector3(1,1,1));
      const m=p.parent?worldMatrix(data.parts.find(x=>x.name===p.parent)).clone().multiply(local):local;
      transforms.set(p.name,m);return m;
    }
    const axes=new T.Matrix4().makeRotationX(-Math.PI/2), meshes=[];
    for(const part of data.parts){
      const raw=Uint8Array.from(atob(part.data),x=>x.charCodeAt(0));
      const buf=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      const q=new Uint16Array(buf,0,part.vertices*3), positions=new Float32Array(q.length);
      for(let i=0;i<q.length;i++) positions[i]=part.min[i%3]+q[i]/65535*part.size[i%3];
      // uint32 index bytes may follow an odd count of uint16 vertices: copy to align.
      const indexBytes=part.triangles*3*4;
      const indices=new Uint32Array(buf.slice(q.byteLength,q.byteLength+indexBytes));
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(indices,1));g.computeVertexNormals();
      if(part.vertexColors){
        const rgb=new Uint8Array(buf,q.byteLength+indexBytes),colors=new Float32Array(rgb.length);
        for(let i=0;i<rgb.length;i++){const s=rgb[i]/255;colors[i]=s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);}
        g.setAttribute('color',new T.BufferAttribute(colors,3));
      }
      g.applyMatrix4(axes.clone().multiply(worldMatrix(part)));
      const isWheel=part.name.includes('Wheel'), isBase=part.name==='base';
      const color=part.vertexColors?0xffffff:isBase?0x536e80:isWheel?0x96653f:0x278f97,opacity=part.opacity??1;
      const mat=new T.MeshStandardMaterial({color,vertexColors:!!part.vertexColors,metalness:opacity<1?.02:isWheel?.15:.38,roughness:opacity<1?.12:.52,side:T.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1});
      const mesh=new T.Mesh(g,mat);mesh.name=part.name;mesh.userData={baseColor:new T.Color(color),baseOpacity:opacity,component:part.component||part.name,triangles:part.triangles};root.add(mesh);meshes.push(mesh);
    }
    const bounds=new T.Box3().setFromObject(root), center=bounds.getCenter(new T.Vector3()), size=bounds.getSize(new T.Vector3());
    meshes.forEach(m=>m.geometry.translate(-center.x,-center.y,-center.z));
    const bottom=bounds.min.y-center.y-.004;
    const grid=new T.GridHelper(1.4,28,0x38616b,0x203d49);grid.position.y=bottom;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
    const floor=new T.Mesh(new T.CircleGeometry(.63,80),new T.MeshBasicMaterial({color:0x152d39,transparent:true,opacity:.36,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=bottom-.001;scene.add(floor);
    const ring=new T.Mesh(new T.RingGeometry(.25,.2508,96),new T.MeshBasicMaterial({color:0x4c8a95,side:T.DoubleSide,transparent:true,opacity:.45}));ring.rotation.x=-Math.PI/2;ring.position.y=bottom+.0001;scene.add(ring);
    const dirs={base:[0,.02,0],LeftBack_link:[-.10,.02,.09],LeftFront_link:[-.10,.02,-.09],LeftWheel_link:[-.22,-.015,-.07],RightBack_link:[.10,.02,.09],RightFront_link:[.10,.02,-.09],RightWheel_link:[.22,-.015,-.07],RK3588:[0,.13,.025],FPGA_with_acrylic:[0,.28,.025],FPGA_acrylic:[0,.28,.025],Astra_Pro_Plus:[0,.09,-.14],camera_adapter:[0,.055,-.12],XT_M60:[0,.035,-.22]};
    const names={base:'机身总成',LeftBack_link:'左后连杆',LeftFront_link:'左前连杆',LeftWheel_link:'左轮总成',RightBack_link:'右后连杆',RightFront_link:'右前连杆',RightWheel_link:'右轮总成',RK3588:'RK3588 计算盒',FPGA_with_acrylic:'FPGA 与亚克力保护板',Astra_Pro_Plus:'Astra Pro Plus 相机本体',camera_adapter:'相机安装托架'};
    const descriptions={base:'机舱承载上层 FPGA 与下层 RK3588，前上方安装深度相机，两侧连接轮腿机构。',LeftBack_link:'左侧后连杆，与前连杆共同组成腿部机构。',RightBack_link:'右侧后连杆，与前连杆共同组成腿部机构。',LeftFront_link:'左侧前连杆，连接腿部驱动与左轮总成。',RightFront_link:'右侧前连杆，连接腿部驱动与右轮总成。',LeftWheel_link:'左轮总成，轮速与右轮共同参与平衡、移动和转向。',RightWheel_link:'右轮总成，编码器反馈进入轮速闭环与里程计。',camera_adapter:'两侧支撑的相机托板，跨过原前置传感器，用于安装布置展示。'};
    const groups={all:meshes.map(m=>m.name),base:['base'],left:['LeftBack_link','LeftFront_link'],right:['RightBack_link','RightFront_link'],wheels:['LeftWheel_link','RightWheel_link'],fpga:['FPGA_with_acrylic','FPGA_acrylic'],rk:['RK3588'],camera:['Astra_Pro_Plus','camera_adapter'],radar:['XT_M60']};
    const groupCopy={all:['上下分层，感知前置。','上层 FPGA 带亚克力保护板，下层 RK3588；无底座深度相机位于前上方。拖动旋转或拆解查看。'],base:['机身总成',descriptions.base],left:['左侧腿部机构','前后连杆配合腿部驱动，实现轮腿构型与机体高度调节。'],right:['右侧腿部机构','与左侧构成双侧轮腿机构，四路舵机接受策略与逆运动学目标。'],wheels:['双轮驱动总成','两侧驱动轮结合 IMU 与编码器反馈，完成平衡、前进与转向。'],fpga:['上层 · FPGA 与亚克力保护板','ACX750 接口细化板保留双 SFP、网口、HDMI 与排针，上下亚克力板和支柱共同组成上层保护结构。'],rk:['下层 · RK3588 计算盒','带散热片的 G6 计算盒布置在 FPGA 下方，在车端运行视觉、语音和语言理解服务。'],camera:['前上方 · Astra Pro Plus','采用无底座相机本体，镜头朝前；RGB 与深度图像进入 RK3588，提供目标识别与空间位置。']};
    groupCopy.all=['上下分层，双路感知。','上层 FPGA 带亚克力板，下层 RK3588；前上方为无底座 RGB-D 相机，前置 XT-M60 为导航提供几何深度。'];
    groupCopy.radar=['前置 · XT-M60 固态激光雷达','60 线 Flash 雷达经百兆以太网向 FPGA 提供深度帧。点云投影、局部地图与结构匹配连接地形感知、定位和避障。'];
    Object.assign(dirs,{SG90:[0,.17,-.14],Ultrasonic:[0,.24,-.14],OV5640:[-.12,.09,-.14],Display:[0,.40,.025],accessory_mounts:[0,.06,-.03]});
    Object.assign(names,{SG90:'SG90 微型舵机',Ultrasonic:'YB-MVU04 超声波模块',OV5640:'OV5640 摄像头',Display:'5 寸电容触摸屏',accessory_mounts:'胶垫、转接片与屏幕垫柱',XT_M60:'XT-M60 固态激光雷达'});
    Object.assign(descriptions,{SG90:'SG90 粘接在深度相机顶面中央，顶部舵盘承载超声波模块。',Ultrasonic:'YB-MVU04 双探头模块安装在 SG90 上方，两个探头朝向车前方。',OV5640:'30 × 30 mm 摄像头板紧邻深度相机一侧，镜头朝前，胶垫表示粘接位置。',Display:'5 寸 800 × 480 电容触摸屏朝上叠放在 FPGA 亚克力板上，垫柱为背部排针留出空间。',accessory_mounts:'热熔胶粘接区域、超声波转接片和显示屏垫柱的近似外形。'});
    Object.assign(groups,{sonar:['SG90','Ultrasonic'],ov5640:['OV5640'],display:['Display']});
    Object.assign(groupCopy,{all:['分层算力，多路感知。','FPGA 与 RK3588 上下分层，顶层叠放触摸屏；前方 RGB-D、侧边 OV5640 和顶部超声波云台组成传感器布置。拖动或拆解查看。'],sonar:['顶部 · SG90 与超声波',descriptions.SG90+' '+descriptions.Ultrasonic],ov5640:['侧边 · OV5640 摄像头',descriptions.OV5640],display:['顶层 · 5 寸电容触摸屏',descriptions.Display]});
    let theta=2.38,phi=1.06,zoom=1,explode=0,auto=false,wire=false,selected='all',dirty=true,drag=null,frame=0,visible=true;
    const pose={theta,phi,zoom:reduceMotion?1:1.08,explode:0};let lastTime=performance.now();
    const baseRadius=Math.max(size.x,size.y,size.z)*2.15;
    const raycaster=new T.Raycaster(), pointer=new T.Vector2();
    function setSelection(value){
      selected=value;const list=groups[value]||[value];
      meshes.forEach(m=>{const on=list.includes(m.name);m.material.color.copy(m.userData.baseColor);m.material.emissive.set(on&&value!=='all'?0x143c41:0);m.material.opacity=m.userData.baseOpacity*(on?1:.13);m.material.transparent=m.material.opacity<1;m.material.depthWrite=m.material.opacity===1;});
      $$('.part-selector button').forEach(b=>{const on=b.dataset.part===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      const copy=groupCopy[value]||[names[value],descriptions[value]];
      $('#part-title').textContent=copy[0];$('#part-description').textContent=copy[1];
      const count=new Set(meshes.filter(m=>list.includes(m.name)).map(m=>m.userData.component)).size;
      $('#part-count').innerHTML=value==='all'?`${data.componentCount||7} 组件<br>整车装配`:`${count} 组件<br>URDF / CAD`;
      $('#part-marker').hidden=!!groups[value];$('#part-marker').textContent=names[value]||'';dirty=true;
    }
    function updateCamera(){
      const narrow=stage.clientWidth/stage.clientHeight<1.1?1.18:1;
      const r=baseRadius*pose.zoom*narrow*(1+pose.explode*.78);
      camera.position.set(r*Math.sin(pose.phi)*Math.sin(pose.theta),r*Math.cos(pose.phi),r*Math.sin(pose.phi)*Math.cos(pose.theta));camera.lookAt(0,.018,0);
    }
    function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
    new ResizeObserver(resize).observe(stage);resize();
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)dirty=true;}).observe(stage);
    function draw(time=performance.now()){frame=requestAnimationFrame(draw);const dt=Math.min(50,Math.max(1,time-lastTime));lastTime=time;if(!visible||document.hidden)return;if(auto){theta+=dt*.00022;dirty=true;}
      const targets={theta,phi,zoom,explode},blend=reduceMotion||drag?1:1-Math.exp(-dt/105);
      for(const key of Object.keys(pose)){const distance=targets[key]-pose[key];if(Math.abs(distance)>.0001){pose[key]+=distance*blend;dirty=true;}else pose[key]=targets[key];}
      if(!dirty)return;
      meshes.forEach(m=>m.position.set(...(dirs[m.name]||[0,0,0])).multiplyScalar(pose.explode));updateCamera();
      if(!groups[selected]){const m=meshes.find(x=>x.name===selected);const pt=new T.Box3().setFromObject(m).getCenter(new T.Vector3());pt.y+=.04;pt.project(camera);const label=$('#part-marker');label.style.left=`${(pt.x*.5+.5)*stage.clientWidth}px`;label.style.top=`${(-pt.y*.5+.5)*stage.clientHeight}px`;}
      renderer.render(scene,camera);dirty=false;
    }
    draw();setSelection('all');loading.hidden=true;stage.dataset.ready='true';stage.dataset.components=String(data.componentCount||7);stage.dataset.cameraBase=String(data.equipment?.cameraHasBase??true);
    const c=renderer.domElement;let pointers=new Map(), pinchDistance=0;
    c.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});c.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};auto=false;$('#rotate-button').setAttribute('aria-pressed','false');$('#rotate-button').classList.remove('active');if(pointers.size===2){const a=[...pointers.values()];pinchDistance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}});
    c.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!drag)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);zoom=Math.max(.55,Math.min(2.4,zoom*pinchDistance/Math.max(d,1)));pinchDistance=d;drag.moved=true;}else{const dx=e.clientX-drag.x,dy=e.clientY-drag.y;theta-=dx*.008;phi=Math.max(.06,Math.min(Math.PI*.88,phi+dy*.008));drag.moved||=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;drag.x=e.clientX;drag.y=e.clientY;}dirty=true;});
    c.addEventListener('pointerup',e=>{if(drag&&!drag.moved&&pointers.size===1){const rect=c.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(meshes).find(h=>h.object.material.opacity>.5);if(hit){const part=hit.object.name;setSelection(['FPGA_with_acrylic','FPGA_acrylic'].includes(part)?'fpga':part==='RK3588'?'rk':part==='Astra_Pro_Plus'?'camera':part==='XT_M60'?'radar':part);}}pointers.delete(e.pointerId);drag=null;});
    c.addEventListener('pointercancel',()=>{pointers.clear();drag=null;});
    c.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.4,zoom*Math.exp(e.deltaY*.001)));dirty=true;},{passive:false});
    stage.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')theta+=.12;if(e.key==='ArrowRight')theta-=.12;if(e.key==='ArrowUp')phi=Math.max(.06,phi-.1);if(e.key==='ArrowDown')phi=Math.min(Math.PI*.88,phi+.1);if(e.key==='+')zoom=Math.max(.55,zoom-.1);if(e.key==='-')zoom=Math.min(2.4,zoom+.1);dirty=true;});
    $('#explode').addEventListener('input',e=>{explode=Number(e.target.value)/100;$('#explode-value').textContent=`${e.target.value}%`;dirty=true;});
    $$('.part-selector button').forEach(b=>b.addEventListener('click',()=>setSelection(b.dataset.part)));
    $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{activate('[data-view]',b);const v={iso:[2.38,1.06],front:[Math.PI,1.45],side:[Math.PI/2,1.45],top:[Math.PI,.06]}[b.dataset.view];[theta,phi]=v;zoom=1;dirty=true;}));
    $('#rotate-button').addEventListener('click',e=>{auto=!auto;e.currentTarget.setAttribute('aria-pressed',String(auto));e.currentTarget.classList.toggle('active',auto);});
    $('#wire-button').addEventListener('click',e=>{wire=!wire;meshes.forEach(m=>m.material.wireframe=wire);e.currentTarget.setAttribute('aria-pressed',String(wire));e.currentTarget.classList.toggle('active',wire);dirty=true;});
    $('#model-reset').addEventListener('click',()=>{theta=2.38;phi=1.06;zoom=1;explode=0;auto=false;wire=false;meshes.forEach(m=>m.material.wireframe=false);$('#explode').value=0;$('#explode-value').textContent='0%';['#rotate-button','#wire-button'].forEach(id=>{$(id).classList.remove('active');$(id).setAttribute('aria-pressed','false');});activate('[data-view]',$('[data-view="iso"]'));setSelection('all');dirty=true;});
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);renderer.dispose();});
  } catch(e){loading.innerHTML='<span>三维视图未能启动。请使用支持 WebGL 和 gzip 解压的新版 Edge / Chrome。</span>';console.error('Robot viewer:',e);}
})();

// Original supplier STEP, shown independently from the car's installed radar.
(async function initLidar(){
  const stage=$('#lidar-stage');let frame=0;
  try{
    const data=JSON.parse($('#lidar-data').textContent),T=THREE;
    const raw=Uint8Array.from(atob(data.data),c=>c.charCodeAt(0));
    const parts=JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.append(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.001,3),root=new T.Group();scene.add(root);
    scene.add(new T.HemisphereLight(0xe0ffff,0x334954,1.2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(.2,.3,.4);scene.add(light);const rim=new T.DirectionalLight(0x72e7df,1);rim.position.set(-.2,.1,-.2);scene.add(rim);
    parts.forEach(p=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.vertices.flat(),3));g.setIndex(p.triangles.flat());g.computeVertexNormals();root.add(new T.Mesh(g,new T.MeshStandardMaterial({color:new T.Color(...p.color).convertSRGBToLinear(),metalness:.35,roughness:.44,side:T.DoubleSide})))});
    const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3());root.position.copy(center).multiplyScalar(-1);
    let theta=.55,phi=1.22,distance=.19,drag=null,visible=false,dirty=true;
    function draw(){frame=requestAnimationFrame(draw);if(!visible||document.hidden||!dirty)return;camera.position.set(distance*Math.sin(phi)*Math.sin(theta),distance*Math.cos(phi),distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(0,0,0);renderer.render(scene,camera);dirty=false;}
    new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();dirty=true}).observe(stage);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)dirty=true}).observe(stage);
    const c=renderer.domElement;c.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId)});c.addEventListener('pointermove',e=>{if(!drag)return;theta-=(e.clientX-drag[0])*.01;phi=Math.max(.1,Math.min(3,phi+(e.clientY-drag[1])*.01));drag=[e.clientX,e.clientY];dirty=true});c.addEventListener('pointerup',()=>drag=null);c.addEventListener('pointercancel',()=>drag=null);
    c.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(.1,Math.min(.35,distance*Math.exp(e.deltaY*.001)));dirty=true},{passive:false});
    stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')theta+=.15;if(e.key==='ArrowRight')theta-=.15;if(e.key==='ArrowUp')phi=Math.max(.1,phi-.12);if(e.key==='ArrowDown')phi=Math.min(3,phi+.12);dirty=true});
    draw();stage.dataset.ready='true';stage.dataset.bodies=String(data.bodies);$('#lidar-loading').hidden=true;
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);renderer.dispose()});
  }catch(e){$('#lidar-loading').textContent='请使用支持 WebGL 的新版 Edge / Chrome 查看模型。';console.error('Lidar viewer:',e)}
})();

const systems={
 fpga:{k:'DETERMINISTIC MOTION',title:'导航与控制，<br>落在同一片 FPGA。',desc:'ACX750 / GW5AT-LV138 上，RTL 与 PicoRV32 软核协同处理导航。原 4500 策略在片内运行，从环境点云一路连接到轮腿动作。',rows:[['环境与地图','雷达收包、点云变换、滚动高程图、地形代价与机体包络膨胀。'],['定位与规划','SLF 结构匹配、位姿维护、A*、局部轨迹评估，以及探索和目标跟踪。'],['运动与反馈','速度约束、策略推理、腿部 IK、轮速闭环与控制遥测。']],io:'RK 下发任务、目标和地图；FPGA 返回导航状态与控制测量。连续运动速度在 FPGA 导航侧产生。'},
 rk:{k:'EDGE TASK INTELLIGENCE',title:'多种模型，<br>汇入同一个任务引擎。',desc:'RK3588 运行视觉、语音、语言理解与业务服务，将用户意图和现场目标转为结构化任务，再根据机器人反馈管理执行过程。',rows:[['视觉目标','YOLO26n 检测类别，RGB-D 提供深度，目标跟踪维持身份与位置。'],['自然交互','SenseVoice 识别语音，规则与 Qwen3 解析任务，Matcha + Vocos 合成播报。'],['任务服务','FastAPI、SQLite 与 fpga_bridge 管理预检、确认、下发、暂停及完成反馈。']],io:'Astra 相机、麦克风和用户请求进入 RK；结构化目标经 NV 串口发送到导航，V2 串口接收独立控制遥测。'},
 cloud:{k:'CONNECTED ROBOT',title:'一条接入链路，<br>连接设备、服务与用户。',desc:'云网关提供公网业务入口与鉴权，MediaMTX 承担视频中继。RK 产生一条车载媒体流，Web 与小程序使用适合各端的播放方式。',rows:[['接口网关','Nginx 转发业务请求，统一 HTTPS / WSS 接入路径。'],['视频分发','robot/front 媒体流通过 WebRTC / WHEP 与 HLS 提供播放。'],['状态同步','WebSocket 推送设备和任务变化，REST 用于查询与恢复。']],io:'视频、状态与任务数据经云端分发；局域网内 Web 也可直接访问 RK 服务。'},
 clients:{k:'HUMAN–ROBOT INTERACTION',title:'同一台机器人，<br>两种随手可用的入口。',desc:'Web 控制台适合地图管理和综合观察，微信小程序适合移动任务操作与语音交互。两端共享任务、地图、视频和状态接口。',rows:[['任务操作','定点移动、多点巡检、返航、找物与人员跟随，配合暂停、继续和取消。'],['地图与视频','查看先验地图、位姿、航点、目标和历史轨迹，观察车载视频。'],['助手与反馈','文字或语音表达任务，确认运动意图，并查看事件与任务状态。']],io:'用户请求先进入任务层核对参数和执行条件；界面依据反馈区分请求、执行中与完成状态。'}
};
function showSystem(key){const d=systems[key];$('#system-kicker').textContent=d.k;$('#system-title').innerHTML=d.title;$('#system-description').textContent=d.desc;$('#system-features').innerHTML=d.rows.map((r,i)=>`<div class="feature-row"><span>0${i+1}</span><b>${r[0]}</b><p>${r[1]}</p></div>`).join('');$('#system-interface').textContent=d.io;animateContent($('.system-detail'));}
$$('[data-system]').forEach(b=>b.addEventListener('click',()=>{activate('[data-system]',b);showSystem(b.dataset.system);}));showSystem('fpga');

// A compact, synthetic scene explains map layers. A* is local to this illustration.
const MW=64,MH=52,cellCount=MW*MH,terrain=new Uint8Array(cellCount),elevation=new Float32Array(cellCount),inflated=new Uint8Array(cellCount);
const idx=(x,y)=>y*MW+x;
for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
 const i=idx(x,y);elevation[i]=.04*Math.sin(x*.16)*Math.cos(y*.18);
 if(x>=8&&x<=24&&y>=6&&y<=17){terrain[i]=1;elevation[i]=.1+(x-8)/16*.65;}
 if(x>=30&&x<=34&&y>=16&&y<=42){terrain[i]=2;elevation[i]=.8;}
 if(x>=43&&x<=51&&y>=32&&y<=38){terrain[i]=3;elevation[i]=-.5;}
 if((x>=52&&y>=42)||(x<=4&&y<23)){terrain[i]=4;elevation[i]=0;}
 if(x<2||y<2||x>MW-3||y>MH-3){terrain[i]=4;}
}
for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){if(terrain[idx(x,y)]===2||terrain[idx(x,y)]===3)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=x+dx,b=y+dy;if(a>=0&&b>=0&&a<MW&&b<MH&&dx*dx+dy*dy<=6)inflated[idx(a,b)]=1;}}
const start=[10,39];let goal=[51,11],layer='height',path=[];
function blocked(x,y){return x<0||x>=MW||y<0||y>=MH||inflated[idx(x,y)]||terrain[idx(x,y)]===4;}
function findPath(){
 const si=idx(...start),gi=idx(...goal),g=new Float32Array(cellCount).fill(Infinity),prev=new Int32Array(cellCount).fill(-1),closed=new Uint8Array(cellCount),open=[si];g[si]=0;
 const heuristic=i=>Math.hypot(i%MW-goal[0],Math.floor(i/MW)-goal[1]);
 while(open.length){let best=0;for(let k=1;k<open.length;k++)if(g[open[k]]+heuristic(open[k])<g[open[best]]+heuristic(open[best]))best=k;const c=open.splice(best,1)[0];if(c===gi){const p=[];for(let j=c;j>=0;j=prev[j])p.push([j%MW,Math.floor(j/MW)]);return p.reverse();}if(closed[c])continue;closed[c]=1;const x=c%MW,y=Math.floor(c/MW);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const a=x+dx,b=y+dy;if(blocked(a,b)||dx&&dy&&(blocked(x+dx,y)||blocked(x,y+dy)))continue;const n=idx(a,b);if(closed[n])continue;const cost=g[c]+Math.hypot(dx,dy)*(terrain[n]===1?1.6:1);if(cost<g[n]){g[n]=cost;prev[n]=c;open.push(n);}}}return [];
}
path=findPath();
const layerData={height:{title:'从点云到局部高程',desc:'雷达深度转为点云，经姿态和安装外参变换后进入滚动栅格。每个单元保存高程与观测历史，让地图随机器人移动持续更新。',label:'高程观测',legend:[['低','#224858'],['高','#8ed6ca'],['未知','#202d36']]},terrain:{title:'识别影响通行的地形',desc:'从高程中提取坡度、高差、粗糙度和落差，形成原始危险与通行代价。坡面、台阶和沟槽在这一层呈现不同的通行条件。',label:'原始地形代价',legend:[['一般地面','#265361'],['较高代价','#a98d55'],['危险','#c66d58'],['未知','#202d36']]},inflation:{title:'把车体包络放进地图',desc:'对危险区域按机器人足迹扩张，为车体、轮腿与轨迹检查留出空间。原始危险描述地形本身，膨胀区描述机器人通过所需的空间。',label:'障碍膨胀',legend:[['危险','#c66d58'],['膨胀区','#785953'],['未知','#202d36']]},path:{title:'让路径绕开危险与余量',desc:'A* 提供全局路径引导，实际导航再由局部轨迹评估结合地形代价、目标方向和运动约束选择速度。点击空地，可重新计算这张示意图中的 A* 路径。',label:'路径引导',legend:[['路径','#88eee3'],['膨胀区','#785953'],['目标','#f5ab79']]}};
const mapCanvas=$('#map-canvas'), ctx=mapCanvas.getContext('2d');let mapRect={};
function drawMap(){
 const w=mapCanvas.clientWidth,h=w/1.22,dpr=Math.min(devicePixelRatio,2);mapCanvas.width=w*dpr;mapCanvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const cw=w/MW,ch=h/MH;mapRect={cw,ch};
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y),t=terrain[i];let color='#265361';if(layer==='height'){const n=elevation[i];color=n<0?'#143442':`rgb(${Math.round(40+n*112)},${Math.round(83+n*115)},${Math.round(97+n*91)})`;}else{if(t===1)color='#a98d55';if(t===2||t===3)color='#c66d58';if((layer==='inflation'||layer==='path')&&inflated[i]&&t!==2&&t!==3)color='#785953';}if(t===4)color=(x+y)%3===0?'#293b46':'#202d36';ctx.fillStyle=color;ctx.fillRect(x*cw,y*ch,cw+.2,ch+.2);}
 ctx.strokeStyle='#08121a45';ctx.lineWidth=.4;ctx.beginPath();for(let x=0;x<=MW;x+=4){ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,h);}for(let y=0;y<=MH;y+=4){ctx.moveTo(0,y*ch);ctx.lineTo(w,y*ch);}ctx.stroke();
 const point=([x,y])=>[(x+.5)*cw,(y+.5)*ch];
 if(layer==='path'&&path.length){ctx.beginPath();path.forEach((p,i)=>{const [x,y]=point(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle='#b1fff1';ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.shadowColor='#7fe7e1';ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;}
 ctx.font=`${Math.max(9,w/48)}px "Microsoft YaHei",sans-serif`;ctx.fillStyle='#dbe9e8';[['坡面',16,12],['台阶',32,28],['沟槽',47,36]].forEach(([s,x,y])=>{ctx.fillStyle='#07131caa';ctx.fillRect(x*cw-19,y*ch-10,38,18);ctx.fillStyle='#e7f0ef';ctx.textAlign='center';ctx.fillText(s,x*cw,y*ch+3);});
 const [sx,sy]=point(start);ctx.strokeStyle='#d7f7f2';ctx.fillStyle='#7fe7e1';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(sx,sy-5);ctx.lineTo(sx-4,sy+4);ctx.lineTo(sx+4,sy+4);ctx.closePath();ctx.fill();
 const [gx,gy]=point(goal);ctx.strokeStyle='#f5ab79';ctx.beginPath();ctx.arc(gx,gy,6,0,Math.PI*2);ctx.moveTo(gx-10,gy);ctx.lineTo(gx+10,gy);ctx.moveTo(gx,gy-10);ctx.lineTo(gx,gy+10);ctx.stroke();ctx.fillStyle='#f5ab79';ctx.font='9px Consolas';ctx.textAlign='left';ctx.fillText('GOAL',gx+10,gy-7);
}
function showLayer(key){layer=key;const d=layerData[key];$('#map-title').textContent=d.title;$('#map-description').textContent=d.desc;$('#map-mode-label').textContent=d.label;$('#map-legend').innerHTML=d.legend.map(([s,c])=>`<span><i style="background:${c}"></i>${s}</span>`).join('');$('#map-status').textContent=key==='path'?'点击空地设置示意目标；键盘方向键可微调目标。':'';drawMap();animateContent(mapCanvas);}
$$('[data-layer]').forEach(b=>b.addEventListener('click',()=>{activate('[data-layer]',b);showLayer(b.dataset.layer);}));
function setGoal(x,y){if(layer!=='path')return;if(blocked(x,y)){$('#map-status').textContent='该位置位于危险、膨胀或未知区域，请选择可通行区域。';return;}goal=[x,y];path=findPath();$('#map-status').textContent=path.length?'已更新目标与示意路径。':'当前示意场景中没有可达路径。';drawMap();}
mapCanvas.addEventListener('click',e=>{const r=mapCanvas.getBoundingClientRect();setGoal(Math.floor((e.clientX-r.left)/mapRect.cw),Math.floor((e.clientY-r.top)/mapRect.ch));});
mapCanvas.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d||layer!=='path')return;e.preventDefault();setGoal(goal[0]+d[0],goal[1]+d[1]);});
new ResizeObserver(drawMap).observe(mapCanvas);showLayer('height');

const aiModels={
 vision:{resource:'NPU · RKNN / INT8',name:'YOLO26n + RGB-D',desc:'Astra Pro Plus 提供彩色与深度图像。YOLO 检测目标，后处理核对类别、颜色和深度，持续关联目标身份，并转换到机身坐标系。',flow:['彩色 / 深度','目标检测','深度关联','位置与跟踪'],output:'类别、颜色、目标 ID、置信度与三维位置。视觉目标经任务桥接发送到 FPGA 导航。',visual:'<span class="visual-label">RGB-D / TARGET UNDERSTANDING</span><div class="vision-scene"><div class="bottle"></div><div class="bbox"></div><div class="depth-axis">RGB + DEPTH<br>↓<br>TARGET</div></div><span class="visual-caption">视觉处理示意 · 类别 + 颜色 + 空间位置</span>'},
 language:{resource:'NPU · RKLLM / W8A8',name:'Qwen3-1.7B',desc:'常用指令由规则快速解析，复杂表达交给 Qwen。语言服务结合文本与结构化任务上下文，输出意图和参数，再由业务层核对并请求确认。',flow:['用户表达','规则 / Qwen','参数核对','任务确认'],output:'结构化任务类型、目标属性、航点参数，或面向用户的自然语言回复。',visual:'<span class="visual-label">LANGUAGE / STRUCTURED INTENT</span><div class="language-bubble">“帮我找一下蓝色水瓶。”</div><div class="intent-code"><span>任务</span> → 寻找目标<br><span>类别</span> → bottle<br><span>颜色</span> → blue</div><span class="visual-caption">模型部署 · 1.7B 参数 / W8A8 量化</span>'},
 voice:{resource:'CPU · SHERPA-ONNX',name:'SenseVoice → Matcha + Vocos',desc:'车载语音由 SenseVoice 转为文本，经过任务理解后生成回复，再由 Matcha 与 Vocos 合成语音。小程序端也可通过微信语音识别输入任务。',flow:['麦克风','SenseVoice','任务理解','Matcha + Vocos'],output:'识别文本与语音播报，覆盖用户输入、任务确认、进度反馈和交互回复。',visual:'<span class="visual-label">VOICE / LISTEN & RESPOND</span><div class="waveform">'+Array.from({length:45},(_,i)=>`<i style="height:${12+Math.abs(Math.sin(i*.73))*58+Math.sin(i*.3)**2*30}px;animation-delay:${-i*.09}s"></i>`).join('')+'</div><div class="wave-caption">听见任务，也说出反馈。</div><span class="visual-caption">车载识别与合成 · 本地音频服务</span>'},
 media:{resource:'MPP + CPU · VIDEO / TASK SERVICES',name:'硬件视频与任务服务',desc:'MPP 完成 H.264 编码，媒体服务向 Web 与小程序提供播放。FastAPI 和 fpga_bridge 管理任务生命周期，结合导航状态与控制反馈同步用户界面。',flow:['相机视频','MPP 编码','MediaMTX','Web / 小程序'],output:'可播放的视频、任务事件与设备状态。客户端通过 WebSocket 接收状态变化，通过 REST 查询业务数据。',visual:'<span class="visual-label">MEDIA / ONE STREAM, TWO CLIENTS</span><div class="video-graphic">▷</div><div class="wave-caption">一条车载流，连接两端。</div><span class="visual-caption">H.264 → WebRTC / HLS</span>'}
};
function showAI(key){const d=aiModels[key];$('#ai-resource').textContent=d.resource;$('#ai-name').textContent=d.name;$('#ai-description').textContent=d.desc;$('#ai-pipeline').innerHTML=d.flow.map(s=>`<span>${s}</span>`).join('<b>→</b>');$('#ai-output').textContent=d.output;$('#ai-visual').innerHTML=`<div class="ai-scene">${d.visual}</div>`;animateContent($('.ai-copy'),false);animateContent($('.ai-scene'),false);}
$$('[data-ai]').forEach(b=>b.addEventListener('click',()=>{activate('[data-ai]',b);showAI(b.dataset.ai);}));showAI('vision');

const scenarios={
 find:[['理解意图','RK · 语言与任务','输入经规则或语言模型解析为寻找蓝色水瓶的意图。任务层核对目标类别、颜色与操作参数。','目标类别：bottle\n目标颜色：blue\n任务类型：寻找目标'],['确认并启动','Web / 小程序 → RK','运动类语音意图呈现给用户确认。确认后，任务状态机检查链路与执行条件，再进入执行流程。','用户确认 → 预检 → 启动\n任务状态：准备执行'],['探索与观察','FPGA 导航 + RK 视觉','探索模块选择观察位置，导航规划路径；视觉服务持续检测目标并结合深度跟踪位置。','边界探索 → 路径引导\nRGB-D → 检测与深度关联'],['锁定并接近','RK TARGET → FPGA','发现符合条件的目标后更新 TARGET。导航结合目标位置与周围地形规划接近速度。','目标身份：持续跟踪\n目标位置：相机 → 机身\n导航模式：接近目标'],['核对与停止','任务状态机 + 控制反馈','任务层复核目标身份、估计距离、反馈新鲜度和连续停稳条件，等待执行反馈确认。','目标核对 + 距离核对\n双轮速度 + 角速度 + 持续时间'],['反馈结果','RK → Web / 小程序','任务状态与事件同步到两端，并可触发语音播报。界面展示任务结果，保留事件记录。','任务结果 → 状态推送\n事件记录 → 用户查看']],
 patrol:[['选择巡检点','Web / 小程序','从地图选定航点或巡检点序列，形成有顺序的导航任务。','任务类型：巡检\n目标：航点序列'],['检查任务条件','RK · 任务编排','检查地图、位姿、链路与任务参数，组织航点和停留逻辑，再下发导航任务。','预检 → 航点下发\n导航接口：GOAL / WAYPOINTS'],['定位与全局规划','FPGA · PicoRV32 + RTL','里程计和 IMU 提供预测，雷达 SLF 匹配修正位姿。A* 在地图中生成路径引导。','轮里程计 + IMU + SLF\n地图 → A* 路径'],['避障与轮腿执行','FPGA · 导航与控制','局部轨迹评估考虑地形和机器人足迹，速度经过约束后交给原 4500 策略与执行器闭环。','局部轨迹 → SAFE\n原 4500 → IK / 轮速闭环'],['到点核对','RK · 任务状态机','到点后结合距离、定位状态与新鲜运动反馈复核到达，按任务安排停留或前往下一点。','导航到达 → 目标与反馈核对\n停留 / 下一航点'],['同步巡检结果','Web / 小程序','任务事件、轨迹与状态持续呈现，用户可查看视频，或选择暂停、继续与取消。','状态 + 事件 + 视频\n多端共享任务进度']],
 follow:[['指定跟随任务','用户 → RK','用户选择人员跟随，任务层确认类型与运行条件，建立跟随任务。','任务类型：人员跟随\n目标类别：person'],['识别并关联人员','RK · YOLO + RGB-D','视觉服务检测人员、关联身份，并通过深度估计目标在机身坐标系中的位置。','person → 目标 ID\n深度 → 三维位置'],['持续更新目标','RK → FPGA TARGET','视觉目标按受控频率发送，过滤延时过大的帧。导航使用有效目标位置驱动跟踪。','目标位置 + 置信度 + 延时\nTARGET → 导航'],['地形约束下跟踪','FPGA 导航与控制','跟踪期望结合当前局部地图，选择符合地形和运动约束的速度，由轮腿控制执行。','目标方向 + 局部代价\n速度约束 → 轮腿动作'],['处理遮挡与丢失','视觉跟踪 + 任务模式','目标失去有效观测后进入丢失处理，任务模式决定后续搜索或停止行为。','有效期核对 → 丢失处理\n搜索 / 停止'],['用户结束跟随','Web / 小程序 → RK','停止请求进入任务流程，撤销运动目标，并根据新鲜控制反馈确认停止结果。','停止请求 → 执行反馈\n任务状态同步']]
};
let scenario='find',step=0;
function showStep(i){step=i;const list=scenarios[scenario],d=list[i];$('#task-steps').innerHTML=list.map((x,n)=>`<button class="task-step ${n===i?'active':''}" data-step="${n}" aria-pressed="${n===i}"><span class="step-number">0${n+1}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><b class="step-arrow">${n===i?'→':''}</b></button>`).join('');$$('[data-step]').forEach(b=>b.addEventListener('click',()=>{showStep(Number(b.dataset.step));}));$('#task-step-number').textContent=`STEP 0${i+1} / 0${list.length}`;$('#task-step-title').textContent=d[0];$('#task-step-description').textContent=d[2];$('#task-module').textContent=d[1];$('#task-payload').textContent=d[3];$('#task-progress').style.width=`${(i+1)/list.length*100}%`;$('#task-prev').disabled=i===0;$('#task-next').disabled=i===list.length-1;animateContent($('.task-detail'));}
$$('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{activate('[data-scenario]',b);scenario=b.dataset.scenario;showStep(0);}));
$('#task-prev').addEventListener('click',()=>{showStep(Math.max(0,step-1));});$('#task-next').addEventListener('click',()=>{showStep(Math.min(scenarios[scenario].length-1,step+1));});
showStep(0);

const clientScreens=JSON.parse($('#client-screens').textContent);
let clientFrame=0;
function showClient(key,shot=1){
  const web=key==='web';clientFrame=web?0:shot;
  const screen=clientScreens[clientFrame];
  activate('[data-client]',$(`[data-client="${web?'web':'mini'}"]`));
  $('#client-features').innerHTML=(web?['地图、位姿、航点、目标与历史轨迹集中展示','先验地图上传与加载进度管理','WebRTC / WHEP 视频，任务与事件联动']:['总览、任务、助手、我的四个页面','HLS 视频与地图查看，移动任务操作','微信语音输入，任务确认与状态反馈']).map(x=>`<li>${x}</li>`).join('');
  $('#terminal-preview').innerHTML=`<figure class="client-capture ${web?'web-capture':'mini-capture'}"><div class="capture-heading"><span>${screen.title}</span><span>${web?'lingxunrobot.cn':'WECHAT MINI PROGRAM'}</span></div><button class="capture-image" aria-label="放大查看${screen.title}" title="放大查看原图"><img src="${screen.src}" alt="${screen.title}实际界面截图"></button><figcaption>${screen.source}<span>点击查看原图 ↗</span></figcaption>${web?'':`<div class="capture-tabs" role="group" aria-label="小程序截图"><button data-mini-shot="1" class="${shot===1?'active':''}" aria-pressed="${shot===1}">总览</button><button data-mini-shot="2" class="${shot===2?'active':''}" aria-pressed="${shot===2}">语音助手</button></div>`}</figure>`;
  $('.capture-image').addEventListener('click',()=>openScreen(clientFrame));
  $$('[data-mini-shot]').forEach(b=>b.addEventListener('click',()=>showClient('mini',Number(b.dataset.miniShot))));
  animateContent($('#terminal-preview'));
}
$$('[data-client]').forEach(b=>b.addEventListener('click',()=>showClient(b.dataset.client)));showClient('web');

const screenDialog=$('#screen-dialog');let screenIndex=0;
function openScreen(index){
  screenIndex=(index+clientScreens.length)%clientScreens.length;
  const screen=clientScreens[screenIndex];
  $('#screen-dialog-title').textContent=screen.title;$('#screen-dialog-source').textContent=screen.source;
  $('#screen-dialog-image').src=screen.src;$('#screen-dialog-image').alt=screen.title+'实际界面截图';
  if(!screenDialog.open){screenDialog.showModal();animateContent(screenDialog);}
}
$('#close-screen').addEventListener('click',()=>screenDialog.close());
$('#screen-prev').addEventListener('click',()=>openScreen(screenIndex-1));
$('#screen-next').addEventListener('click',()=>openScreen(screenIndex+1));
screenDialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();openScreen(screenIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();openScreen(screenIndex+1);}});
screenDialog.addEventListener('click',e=>{if(e.target===screenDialog){const r=screenDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)screenDialog.close();}});

const miniDialog=$('#mini-dialog');
$('#show-mini-code').addEventListener('click',()=>{$('#mini-dialog-image').src=$('#show-mini-code img').src;miniDialog.showModal();animateContent(miniDialog);});
$('#close-mini-code').addEventListener('click',()=>miniDialog.close());
miniDialog.addEventListener('click',e=>{if(e.target===miniDialog){const r=miniDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)miniDialog.close();}});

// Reveal once, close to the viewport; ambient illustrations pause off-screen.
const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}});},{threshold:.06,rootMargin:'0px 0px -20px 0px'});
$$('.hero-copy > *, .model-panel, .section-heading, .architecture-layout, .control-band, .lidar-feature, .navigation-layout, .nav-chain, .model-tabs, .ai-layout, .deployment-row, .scenario-buttons, .task-layout, .terminals, .access-panel, .repo-grid > a, .document-links').forEach(el=>{el.classList.add('reveal');if(reduceMotion)el.classList.add('is-visible');else revealObserver.observe(el);});
$$('.hero-copy > *').forEach((el,i)=>el.style.setProperty('--reveal-delay',`${i*55}ms`));
const ambientObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-live',entry.isIntersecting)),{threshold:.1});
$$('.system-map,.ai-visual').forEach(el=>ambientObserver.observe(el));
document.documentElement.classList.add('motion-ready');

// Automatic presentation, without extra playback controls or manual modes.
function createTour({root,selector,delay=2500,count,getIndex,select,manualRoots=[]}){
  const options=selector?$$(selector):null;
  count??=options.length;
  getIndex??=()=>Math.max(0,options.findIndex(b=>b.classList.contains('active')));
  let timer=null,visible=false;
  function stop(){clearTimeout(timer);timer=null;}
  function restart(){
    stop();
    root.dataset.playback=visible&&!document.hidden?'playing':'offscreen';
    $$('[aria-live]',root).forEach(el=>el.setAttribute('aria-live',visible?'off':'polite'));
    if(!visible||document.hidden)return;
    timer=setTimeout(()=>{
      if(!document.querySelector('dialog[open]'))select((getIndex()+1)%count);
      restart();
    },delay);
  }
  // A chosen item stays for a full reading interval, then the slideshow continues.
  [root,...manualRoots].forEach(el=>el.addEventListener('click',restart));
  document.addEventListener('visibilitychange',restart);
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.18;
    restart();
  },{threshold:[0,.18],rootMargin:'-80px 0px -45px 0px'}).observe(root);
  return {stop};
}
function selectOption(selector,index,render,key){const options=$$(selector),button=options[index];activate(selector,button);render(button.dataset[key]);}
tours.system=createTour({root:$('.architecture-layout'),selector:'[data-system]',select:i=>selectOption('[data-system]',i,showSystem,'system')});
tours.map=createTour({root:$('.navigation-layout'),selector:'[data-layer]',select:i=>selectOption('[data-layer]',i,showLayer,'layer')});
tours.ai=createTour({root:$('.ai-layout'),selector:'[data-ai]',manualRoots:[$('.model-tabs')],select:i=>selectOption('[data-ai]',i,showAI,'ai')});
tours.client=createTour({root:$('.terminals'),count:3,getIndex:()=>clientFrame,select:i=>showClient(i===0?'web':'mini',i)});
const scenarioKeys=Object.keys(scenarios);
tours.task=createTour({root:$('.task-layout'),count:18,getIndex:()=>scenarioKeys.indexOf(scenario)*6+step,manualRoots:[$('.scenario-buttons')],select:i=>{scenario=scenarioKeys[Math.floor(i/6)];activate('[data-scenario]',$(`[data-scenario="${scenario}"]`));showStep(i%6);}});
window.addEventListener('pagehide',()=>Object.values(tours).forEach(t=>t.stop()));
