/** EU map addresses verified against the bundled ROM. World IDs are doubled;
 * each world reserves twelve global stage slots, including Extra and Bonus. */
const MODE=0x118,WORLD=0x218,STAGE=0x21a,WORLD_TAB=0x1119;

export function isWorldMap(wram:Uint8Array):boolean{return wram[MODE]===0x26;}
/** The tab flag belongs to the map scene; callers must also check its mode. */
export function isWorldTab(wram:Uint8Array):boolean{return wram[WORLD_TAB]!==0;}
export function needsLevelReturn(wram:Uint8Array):boolean{
 return isWorldMap(wram)&&wram[WORLD_TAB]===wram[WORLD]+2;
}

export function campaignStageLabel(wram:Uint8Array):string{
 const world=wram[WORLD]>>>1,prefix=`World ${world+1} · `;
 if(isWorldMap(wram)){
  if(needsLevelReturn(wram))return prefix+'↓ Choose a level';
  return prefix+(isWorldTab(wram)?'Choose a world':'Choose a level');
 }
 const level=wram[STAGE]-world*12;
 return prefix+(level>=0&&level<8?`Level ${level+1}`:level===8?'Extra':level===9?'Bonus':'Extra / bonus');
}

export type MapConfirmAction='levels'|'enter';
/** Keep one action for the entire press. Returning from a tab to the grid
 * must not turn the still-held Down command into an unintended level entry. */
export class MapConfirmInput{
 private held=false;private action:MapConfirmAction|undefined;
 update(wram:Uint8Array,pressed:boolean):MapConfirmAction|undefined{
  if(!pressed){this.reset();return;}
  if(!this.held){
   this.held=true;
   this.action=isWorldMap(wram)?needsLevelReturn(wram)?'levels':'enter':undefined;
  }
  return isWorldMap(wram)?this.action:undefined;
 }
 reset():void{this.held=false;this.action=undefined;}
}
