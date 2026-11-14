// Local muted playlist. Decode only when this section is near the viewport.
(() => {
 const video=document.querySelector('.getspeed-background-video');
 if(!video)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 // Select once: resizing must not trigger a second video download.
 const videoDirectory='/assets/partners/getspeed/video/optimized/'+(matchMedia('(max-width: 760px)').matches?'mobile/':'');
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
  video.src=videoDirectory+clips[index];
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
