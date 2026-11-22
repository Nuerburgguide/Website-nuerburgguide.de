/*
 * Touristenfahrten season countdown (homepage, DE/EN/ES).
 *
 * ============================================================
 * SEASON START: single source of truth for the countdown.
 * ============================================================
 *
 * PROVISIONAL: Nürburgring has not yet published the official start of the
 * 2027 Touristenfahrten season. 6 March 2027, 08:00 local time at the
 * Nürburgring (CET, UTC+01:00; summer time only begins on 28 March 2027) is a
 * placeholder. Replace this value as soon as the official date and opening
 * time are published. Keep the explicit UTC offset so every visitor counts
 * down to the same instant, whatever their own time zone.
 *
 * The season year shown in the heading is derived from this value as well.
 * Once the moment has passed, the whole section (including its spacing) is
 * removed and the homepage returns to its normal layout.
 */
const SEASON_START = "2027-03-06T08:00:00+01:00";

(() => {
 const section=document.getElementById("season-countdown");
 if(!section)return;
 const target=new Date(SEASON_START).getTime();
 const values={};
 section.querySelectorAll("[data-unit]").forEach(el=>{values[el.dataset.unit]=el;});
 section.querySelectorAll("[data-season-year]").forEach(el=>{el.textContent=String(new Date(target).getUTCFullYear());});
 let timer=0;

 // Calendar months from `from`, clamped to the last day of shorter months.
 function addMonths(from,months){
  const d=new Date(from);
  const day=d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth()+months);
  const lastDay=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,lastDay));
  return d.getTime();
 }
 function remaining(now){
  let months=0;
  while(addMonths(now,months+1)<=target)months++;
  let rest=Math.floor((target-addMonths(now,months))/1000);
  const days=Math.floor(rest/86400);rest-=days*86400;
  const hours=Math.floor(rest/3600);rest-=hours*3600;
  const minutes=Math.floor(rest/60);
  return{months,days,hours,minutes,seconds:rest-minutes*60};
 }
 function render(){
  const now=Date.now();
  if(!Number.isFinite(target)||now>=target){
   // Season has started: never show 00:00:00, drop the section and its spacing.
   clearTimeout(timer);
   section.remove();
   return;
  }
  const parts=remaining(now);
  for(const unit in values){
   if(!(unit in parts))continue;
   const text=unit==="months"||unit==="days"?String(parts[unit]):String(parts[unit]).padStart(2,"0");
   if(values[unit].textContent!==text)values[unit].textContent=text;
  }
  section.hidden=false;
  // Align updates with the wall-clock second so the seconds tick evenly.
  timer=setTimeout(render,1000-(Date.now()%1000)+20);
 }
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&section.isConnected){clearTimeout(timer);render();}});
 render();
})();
