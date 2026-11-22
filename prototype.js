/* Local Lenis integration; native sticky sections retain keyboard/touch scrolling. */
(() => {
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 const preview=document.querySelector('.app-preview-section');
 const frame=preview?.querySelector('.app-preview-frame');
 const image=frame?.querySelector('img');
 const download=document.querySelector('.download-scroll');
 const card=download?.querySelector('.download-cta');
 const transition=document.querySelector('.logo-transition');
 const taxi=document.querySelector('.getspeed-home-section');
 const headerLogo=document.querySelector('.site-header .logo img');
 const flight=document.querySelector('.logo-vector-flight');
 const flightGroup=flight?.querySelector('g');
 const orangeLogo='/assets/branding/logos/nuerburg-guide-logo-mark-orange-ed2000.svg';
 const whiteLogo='/assets/branding/logos/nuerburg-guide-logo-mark-white.svg';
 let headerTheme='light';
 function setHeader(theme){
  if(theme===headerTheme)return;
  headerTheme=theme;
  document.body.classList.toggle('header-orange',theme==='orange');
  document.body.classList.toggle('header-dark',theme==='dark');
  document.body.classList.toggle('dark-scene',theme!=='light');
  headerLogo.src=theme==='orange'?whiteLogo:orangeLogo;
 }
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};

 const clamp=v=>Math.max(0,Math.min(1,v));
 let lenis,travel=0,previewDistance=1,rafId=0;
 let pointer={x:75,y:50,tx:75,ty:50};
 function measure(){
   if(!frame||!image)return;
   const heading=preview.querySelector('.section-heading');
   preview.style.setProperty('--preview-heading-height',`${heading?.getBoundingClientRect().height||60}px`);
   const aspect=image.naturalWidth/image.naturalHeight;
   if(Number.isFinite(aspect)&&aspect>0){
    frame.style.setProperty('--preview-aspect',String(aspect));
    // Explicit geometry prevents intrinsic image sizing and edge glow diverging.
    if(!motion.matches&&document.body.classList.contains('motion-ready'))image.style.width=`${frame.clientHeight*aspect}px`;
    else image.style.removeProperty('width');
   }
   const imageWidth=image.getBoundingClientRect().width;
   frame.style.setProperty('--preview-image-width',`${imageWidth}px`);
   travel=Math.max(0,imageWidth-frame.clientWidth);
   previewDistance=Math.max(innerHeight*2.3,travel*1.65);
   preview.style.setProperty('--preview-height',`${innerHeight+previewDistance}px`);
   lenis?.resize();
   dirty=true;
 }
 function update(){
   if(motion.matches){const features=document.querySelector('.features-section');setHeader(features?.getBoundingClientRect().top<=92?'orange':download?.getBoundingClientRect().top<=92?'dark':'light');return;}
   if(preview&&image){
    const raw=clamp(-preview.getBoundingClientRect().top/previewDistance);
    const progress=smooth((raw-.04)/.92);
    // Ease the last 100 px of vertical travel into the sticky stage.
    const top=preview.getBoundingClientRect().top;
    const arrival=clamp((100-top)/200);
    const offset=top>0?100*arrival*arrival:100*(1-arrival)*(1-arrival);
    preview.querySelector('.preview-pin').style.setProperty('--preview-arrival',`${offset}px`);
    image.style.setProperty('--preview-shift',`${-progress*travel}px`);
    frame.style.setProperty('--preview-shift',`${-progress*travel}px`);
   }
   if(download&&card){
    const progress=clamp((innerHeight-download.getBoundingClientRect().top)/(innerHeight*.72));
    const reveal=smooth((progress-.78)/.22);
    download.style.setProperty('--dark-radius',`${reveal*150}%`);
    document.body.classList.toggle('download-settled',progress>=.98);
    card.style.setProperty('--download-angle',`${(1-progress)*24}deg`);
    card.style.setProperty('--download-scale',`${.9+progress*.1}`);
   }
   if(transition&&headerLogo&&flightGroup){
    const rect=transition.getBoundingClientRect();
    const span=Math.max(1,transition.offsetHeight-innerHeight);
    const raw=-rect.top/span;
    const active=raw>0&&raw<1;
    setHeader(raw>=.9?'orange':document.body.classList.contains('download-settled')?'dark':'light');
    flight.style.visibility=active?'visible':'hidden';
    headerLogo.style.visibility=active&&raw<.9?'hidden':'';
    if(active){
     const r=headerLogo.getBoundingClientRect();
     const move=smooth(raw/.28),zoom=smooth((raw-.12)/.78);
     const base=r.width/1839;
     const end=Math.max(innerWidth,innerHeight)/45;
     const scale=base*Math.pow(end/base,zoom);
     const x=(r.left+1450*base)*(1-move)+innerWidth/2*move;
     const y=(r.top+80*base)*(1-move)+innerHeight/2*move;
     // Render the vector path in viewport coordinates, never scale a raster layer.
     flight.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
     flightGroup.setAttribute('transform',`translate(${x} ${y}) scale(${scale}) translate(-1450 -80)`);
    }
    transition.querySelector('.logo-pin').style.background=raw>=.9?'#ed2000':'#161616';
   }
   if(taxi&&fine.matches){
    pointer.x+=(pointer.tx-pointer.x)*.075;pointer.y+=(pointer.ty-pointer.y)*.075;
    taxi.style.setProperty('--light-x',`${pointer.x}%`);taxi.style.setProperty('--light-y',`${pointer.y}%`);
   }
 }
 // Lenis needs every frame; the scroll effects only when scroll, viewport or the pointer light changed.
 let lastFrame='',dirty=true;
 function tick(time){
  lenis?.raf(time);
  const frameKey=`${scrollY}|${innerWidth}|${innerHeight}`;
  const light=Math.abs(pointer.tx-pointer.x)>.05||Math.abs(pointer.ty-pointer.y)>.05;
  if(dirty||light||frameKey!==lastFrame){dirty=false;lastFrame=frameKey;update();}
  rafId=fine.matches?requestAnimationFrame(tick):0;
 }
 function schedule(){dirty=true;if(!rafId)rafId=requestAnimationFrame(tick);}
 function setup(){
   cancelAnimationFrame(rafId);lenis?.destroy();lenis=null;
   document.body.classList.toggle('motion-ready',!motion.matches);
   if(flight)flight.style.visibility='hidden';
   if(headerLogo)headerLogo.style.visibility='';
   if(!motion.matches){
    if(window.Lenis&&fine.matches)lenis=new Lenis({duration:1.05,smoothWheel:true,syncTouch:false,anchors:true});
    measure();rafId=requestAnimationFrame(tick);
   }else{update();}
 }
 taxi?.addEventListener('pointermove',e=>{if(!fine.matches||motion.matches)return;const r=taxi.getBoundingClientRect();pointer.tx=(e.clientX-r.left)/r.width*100;pointer.ty=(e.clientY-r.top)/r.height*100;},{passive:true});
 taxi?.addEventListener('pointerleave',()=>{pointer.tx=75;pointer.ty=50});
 image?.addEventListener('load',measure);
 addEventListener('resize',measure);addEventListener('pageshow',measure);
 motion.addEventListener('change',setup);
 addEventListener('scroll',()=>{if(motion.matches)update();else schedule();},{passive:true});
 addEventListener('resize',()=>{if(!motion.matches)schedule();});
 const headerElement=document.querySelector('.site-header');
 if(headerElement)new ResizeObserver(()=>{measure();if(!motion.matches)schedule();}).observe(headerElement);
 if(frame)new ResizeObserver(measure).observe(frame);
 // Content above may resize without scrolling (fonts, images, countdown removal).
 new ResizeObserver(()=>{if(!motion.matches)schedule();}).observe(document.body);
 setup();
})();

// Language switcher: /site-theme.js. GetSpeed background video: /getspeed-motion.js.
