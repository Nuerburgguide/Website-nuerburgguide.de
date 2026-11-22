// Run with node tests/background-video.test.cjs (no browser or network required).
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
// The homepage and the GetSpeed pages share this one implementation.
for (const file of ['getspeed-motion.js']) {
 const source=fs.readFileSync(file,'utf8').split('// Local muted playlist.')[1];
 const code=source.slice(source.indexOf('(() => {'),source.indexOf('})();')+5);
 for (const mobile of [false,true]) for(const reduce of [false,true]) for(const seed of [0.1,0.4,0.7,0.95]) {
  const events={}, docEvents={}, preference={matches:reduce,addEventListener(_,fn){this.change=fn;}};
  let observer,loads=0,plays=0,pauses=0;
  const video={duration:30,currentTime:0,muted:false,classList:{add(){},remove(){}},
   getAttribute(){return this.src;},closest(){return {};},load(){loads++;},
   play(){plays++;return Promise.resolve();},pause(){pauses++;},addEventListener(k,v){events[k]=v;}};
  const document={hidden:false,querySelector(){return video;},addEventListener(k,v){docEvents[k]=v;}};
  vm.runInNewContext(code,{document,Math:Object.assign(Object.create(Math),{random:()=>seed}),matchMedia:q=>q.includes('reduced-motion')?preference:{matches:mobile},IntersectionObserver:class{constructor(fn){observer=fn;}observe(){}}});
  assert.equal(loads,0,'No download before intersection');
  observer([{isIntersecting:true}]);
  if(reduce){assert.equal(loads,0,'Reduced motion uses existing static image');continue;}
  assert.equal(loads,1);assert.equal(video.src.includes('/mobile/'),mobile);assert(video.src.includes('/optimized/'));
  events.loadedmetadata();assert(video.currentTime>0&&video.currentTime<=25,'Random seek leaves five seconds');
  events.seeked();assert.equal(plays,1);assert(video.muted);
  observer([{isIntersecting:false}]);const oldPlays=plays;assert(pauses>0);
  events.seeked();assert.equal(plays,oldPlays,'Offscreen never starts');
  observer([{isIntersecting:true}]);document.hidden=true;docEvents.visibilitychange();assert(pauses>1);
  document.hidden=false;docEvents.visibilitychange();
  const previous=video.src;events.ended();assert.notEqual(video.src,previous);assert.equal(loads,2,'Only next selected clip loads');
  preference.matches=true;preference.change();const count=plays;events.seeked();assert.equal(plays,count);
 }
 console.log(file+': desktop/mobile, four random selections, random seek, visibility, reduced-motion passed');
}
