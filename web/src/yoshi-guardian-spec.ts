import{dkcStageOrdinal,DKC_STAGE_ORDER,isDkcMinecartStage}from'./dkc-levels';
/** Native DKC entrance IDs, including checkpoints, bonuses and boss arenas.
 * Stage labels come from DKC1 entrance definitions (also used by dkc-levels).
 * World order is Kongo / Monkey / Vine / Glacier / Kremkroc / Chimp / Galleon.
 * Never infer a world from entrance numeric order: Queen B is E5 in world 3.
 */
export type YoshiGuardianId='burt'|'salvo'|'bigger-boo'|'milde'|'froggy'|'raphael'|'tap-tap';
const WORLD_ENTRANCES:readonly(readonly number[])[]=[[1,2,4,6,8,9,11,12,14,15,22,23,25,26,27,28,37,38,70,71,72,76,92,93,95,110,111,112,118,119,191,192,201,224,234,236],[3,7,16,17,21,46,49,53,56,60,66,74,75,79,81,85,86,87,88,120,121,130,131,151,174,175,176,204,205,217,218,225,237],[13,29,30,31,32,67,82,83,84,89,90,91,101,113,114,115,116,117,164,165,169,170,177,178,179,180,181,182,183,184,185,186,187,188,208,209,212,219,220,221,222,223,229,233],[19,20,36,40,62,63,98,102,103,105,106,107,109,148,149,150,167,168,171,172,173,193,194,195,196,197,198,199,200,202,203,206,207,213,214,215,216,226,232],[24,34,35,39,42,47,57,59,64,65,68,69,77,96,97,99,100,125,126,127,136,137,138,140,141,142,143,144,145,146,147,154,155,156,157,158,160,161,162,163,189,190,227,231],[5,10,18,41,43,44,45,48,50,51,54,55,58,61,73,78,80,122,123,124,128,129,132,133,134,135,139,152,153,159,228,230],[104]];
const ENTRANCE_WORLD=new Map(WORLD_ENTRANCES.flatMap((ids,i)=>ids.map(id=>[id,i+1] as const)));
/** Unknown/test/animal-token rooms have no world. Callers can retain their
 * last known region, rather than silently treating an unknown ID as world 1. */
export function dkcWorldForEntrance(entrance:number):number|undefined{return ENTRANCE_WORLD.get(entrance);}
export interface YoshiGuardianSpec{id:YoshiGuardianId;name:string;width:number;height:number;hp:number;motion:'hop'|'slime'|'ghost'|'turtle'|'slug'|'orbit'|'bounce';source:string;}
export const YOSHI_GUARDIANS:readonly YoshiGuardianSpec[]=[
 {id:'burt',name:'Burt the Bashful',width:88,height:112,hp:6,motion:'hop',source:'bank06 init_burt / main_burt; native room3D'},
 {id:'salvo',name:'Salvo the Slime',width:94,height:80,hp:6,motion:'slime',source:'bank06 0689B1..068B94; native room70 sprite2D'},
 {id:'bigger-boo',name:'Bigger Boo',width:72,height:80,hp:6,motion:'ghost',source:'bank04 04B354..04C108; native room74 sprite16'},
 {id:'milde',name:'Marching Milde',width:96,height:104,hp:6,motion:'bounce',source:'bank06 06AC4C..06B223; native room82 spriteD2 in special slot1'},
 {id:'froggy',name:'Prince Froggy',width:60,height:48,hp:6,motion:'bounce',source:'bank02 02C873..02C89D; native outside roomBF controller45 spawns sprite17 with subtype0D'},
 {id:'raphael',name:'Raphael the Raven',width:80,height:80,hp:6,motion:'orbit',source:'native roomC4 sprite0C'},
 {id:'tap-tap',name:'Tap-Tap the Red Nose',width:72,height:80,hp:6,motion:'bounce',source:'native roomCC sprite3C'},
];
/** Legacy 1-based world metadata, not the encounter rotation. Return undefined for unknown worlds. Availability of
 * authentic art must be checked by the caller; metadata is not an art claim. */
export function guardianForWorld(world:number):YoshiGuardianSpec|undefined{return Number.isInteger(world)?YOSHI_GUARDIANS[world-1]:undefined;}
/** One different guardian for every campaign stage, then repeat after all seven.
 * Native boss stages count too; their crossover still follows the original fight. */
export function guardianForEntrance(entrance:number):YoshiGuardianSpec|undefined{const ordinal=dkcStageOrdinal(entrance);if(ordinal===undefined||isDkcMinecartStage(entrance))return;const index=DKC_STAGE_ORDER.slice(0,ordinal).filter(id=>!isDkcMinecartStage(id)).length;return YOSHI_GUARDIANS[index%YOSHI_GUARDIANS.length];}
/** Salvo's native EU50Hz motion constants: source068A85 jumpFCE0;
 * acceleration10 and target x-speedC0 at068A68 / 0689E5. The native morph
 * and shrink state machine is a separate visual system, not recreated here. */
export const SALVO_NATIVE={fps:50,jumpVelocity:(0xfce0-0x10000)/256*50,speed:0xc0/256*50,acceleration:0x10/256*50*50};
