// Local muted playlist. Decode only when this section is near the viewport.
(() => {
 const video=document.querySelector('.getspeed-background-video');
 if(!video)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clips=['VideoTouristenfahrten.mp4','VideoNLS.mp4','C3714_3_prob3.mp4','C3714_5_prob3.mp4'];
 let index=Math.floor(Math.random()*clips.length),visible=false,ready=false;
 const allowed=()=>visible&&!reduced.matches&&!document.hidden;
 function play(){
  if(!allowed()){video.pause();return;}
  if(!video.getAttribute('src')){loadClip();return;}
  if(!ready)return;
  video.muted=true;
  video.play().catch(()=>video.classList.remove('is-playing'));
 }
 function loadClip(){
  ready=false;video.classList.remove('is-playing');
  video.src='/assets/partners/getspeed/video/'+clips[index];
  video.load();
 }
 video.addEventListener('loadedmetadata',()=>{
  const duration=video.duration;
  // Leave at least five seconds before the next clip.
  const start=Number.isFinite(duration)?Math.random()*Math.max(0,duration-5):0;
  if(start>.05){video.currentTime=start;}else{ready=true;play();}
 });
 video.addEventListener('seeked',()=>{ready=true;play();});
 video.addEventListener('playing',()=>video.classList.add('is-playing'));
 video.addEventListener('error',()=>video.classList.remove('is-playing'));
 video.addEventListener('ended',()=>{
  index=(index+1+Math.floor(Math.random()*(clips.length-1)))%clips.length;
  loadClip();
 });
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;play();},{rootMargin:'150px'}).observe(video.closest('section'));
 reduced.addEventListener('change',()=>{if(reduced.matches)video.classList.remove('is-playing');play();});
 document.addEventListener('visibilitychange',play);
})();


(() => {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const booking=document.querySelector('.getspeed-booking-section');
 const cards=[...document.querySelectorAll('.getspeed-vehicle-card,.getspeed-booking-card')];
 let pending=false;
 function update(){
  pending=false;
  const dark=document.body.classList.contains('getspeed-dark')||(booking&&booking.getBoundingClientRect().top<innerHeight*.72);
  document.body.classList.toggle('booking-dark',!!dark);
  cards.forEach(card=>{
   const anchor=card.parentElement;
   const progress=Math.max(0,Math.min(1,(innerHeight-anchor.getBoundingClientRect().top)/(innerHeight*.72)));
   const eased=progress*progress*(3-2*progress);
   card.style.setProperty('--card-angle',reduce.matches?'0deg':((1-eased)*24)+'deg');
   card.style.setProperty('--card-scale',reduce.matches?'1':String(.98+eased*.02));
  });
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduce.addEventListener('change',schedule);update();
})();
