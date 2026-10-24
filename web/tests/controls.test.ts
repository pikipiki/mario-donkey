import { describe, expect, it } from 'vitest';
import { Controls } from '../src/controls';
describe('commandes mobiles à un doigt',()=>{
 it('garde la direction après le relâchement, puis permet un saut séparé',()=>{
  const c=new Controls(true);c.activate('right',0);c.release('right');c.activate('jump',100);
  expect(c.movement(120)).toBe(1);expect(c.jumpUntil).toBe(850);
 });
 it('un second appui sur la direction arrête',()=>{const c=new Controls(true);c.activate('left',0);c.activate('left',10);expect(c.movement(20)).toBe(0);});
 it('roule avec un seul bouton même à l’arrêt',()=>{const c=new Controls();c.activate('roll',0);expect(c.movement(100)).toBe(1);expect(c.movement(600)).toBe(0);});
 it('la roulade suit la dernière direction choisie',()=>{const c=new Controls();c.activate('left',0);c.activate('left',1);c.activate('roll',2);expect(c.movement(100)).toBe(-1);});
 it('Stop annule direction, saut et roulade',()=>{const c=new Controls();c.activate('right',0);c.activate('jump',0);c.activate('roll',0);c.stop();expect(c.movement(100)).toBe(0);expect(c.rollUntil).toBe(0);expect(c.jumpUntil).toBe(0);});
 it('permet les pouvoirs natifs par impulsions séparées',()=>{const c=new Controls();c.activate('tongue',100);c.activate('egg',200);c.activate('up',300);expect(c.tongueUntil).toBe(0);expect(c.eggUntil).toBe(330);expect(c.vertical).toBe(-1);c.pulse(10,400);expect(c.extra.get(10)).toBe(580);c.stop();expect(c.extra.size).toBe(0);expect(c.verticalUntil).toBe(0);});
 it('le mode classique relâche la direction',()=>{const c=new Controls(false);c.activate('right',0);c.release('right');expect(c.movement(5)).toBe(0);});
});

it('viser libère Bas et la langue pour ne pas annuler immédiatement le lancer',()=>{const c=new Controls();c.activate('right',0);c.activate('down',10);c.activate('tongue',20);c.activate('roll',30);c.activate('egg',40);expect(c.verticalUntil).toBe(0);expect(c.tongueUntil).toBe(0);expect(c.rollUntil).toBe(0);expect(c.movement(50)).toBe(0);expect(c.eggUntil).toBe(170);});

it('sépare deux appuis rapides sur Œuf par un relâchement natif',()=>{const c=new Controls();c.activate('egg',1000);c.activate('egg',1050);expect(c.eggPressed(1100)).toBe(true);expect(c.eggPressed(1160)).toBe(false);expect(c.eggPressed(1210)).toBe(true);expect(c.eggPressed(1341)).toBe(false);c.activate('egg',2000);c.activate('egg',2010);c.stop();expect(c.eggPressed(2300)).toBe(false);});

it('le stick rond couvre les diagonales et revient au centre',()=>{
 const c=new Controls();c.setStick(-0.8,-0.9);
 expect(c.movement(0)).toBe(-1);expect(c.verticalAxis(0)).toBe(-1);expect(c.runAxis()).toBeCloseTo(-0.8);
 c.setStick(0.1,0.1);expect(c.movement(0)).toBe(0);expect(c.verticalAxis(0)).toBe(0);
 c.releaseStick();expect(c.runAxis()).toBe(0);
});


describe('joystick accessible à un doigt',()=>{
 it('conserve la marche pour un saut touché après le relâchement du stick',()=>{
  const c=new Controls(true);c.setStick(0.8,0);expect(c.runAxis()).toBeCloseTo(.8);c.releaseStick();c.activate('jump',100);
  expect(c.movement(120)).toBe(1);expect(c.runAxis()).toBe(1);expect(c.jumpUntil).toBe(850);expect(c.usingStick).toBe(false);expect(c.stickX).toBe(0);
 });
 it('s’arrête quand on retouche le centre puis relâche',()=>{
  const c=new Controls(true);c.setStick(-1,0);c.releaseStick();expect(c.movement(20)).toBe(-1);c.setStick(0.1,-0.1);expect(c.movement(30)).toBe(0);c.releaseStick();expect(c.movement(40)).toBe(0);
 });
 it('change de direction au prochain geste horizontal',()=>{
  const c=new Controls(true);c.setStick(1,0);c.releaseStick();c.setStick(-.6,0);c.releaseStick();expect(c.movement(10)).toBe(-1);expect(c.facing).toBe(-1);
 });
 it('ne colle jamais la direction verticale après une diagonale',()=>{
  const c=new Controls(true);c.setStick(.8,-.9);expect(c.verticalAxis(10)).toBe(-1);c.releaseStick();expect(c.verticalAxis(20)).toBe(0);expect(c.movement(20)).toBe(1);
 });
 it('le geste vertical seul arrête la marche horizontale mémorisée',()=>{
  const c=new Controls(true);c.setStick(1,0);c.releaseStick();c.setStick(0,1);expect(c.verticalAxis(10)).toBe(1);c.releaseStick();expect(c.movement(20)).toBe(0);expect(c.verticalAxis(20)).toBe(0);
 });
 it('garde un stick momentané en mode classique',()=>{
  const c=new Controls(false);c.setStick(1,0);expect(c.movement(0)).toBe(1);c.releaseStick();c.activate('jump',100);expect(c.movement(120)).toBe(0);
 });
 it('Stop et donc blur annulent la direction mémorisée et la roulade',()=>{
  const c=new Controls(true);c.setStick(1,0);c.releaseStick();c.activate('roll',0);c.stop();expect(c.movement(100)).toBe(0);expect(c.movement(1000)).toBe(0);expect(c.direction).toBe(0);
 });
 it('préserve le clavier après avoir relâché le stick et reprend la marche après une roulade',()=>{
  const c=new Controls(true);c.keyboardDirection=-1;c.setStick(1,0);c.releaseStick();expect(c.movement(0)).toBe(-1);c.keyboardDirection=0;c.activate('roll',10);expect(c.movement(20)).toBe(1);expect(c.movement(1000)).toBe(1);
 });
});


describe('native flutter tap edges',()=>{
 it('releases B between overlapping taps, then provides a complete hold',()=>{
  const c=new Controls();c.activate('jump',1000);expect(c.jumpPressed(1000)).toBe(true);
  c.activate('jump',1200);expect(c.jumpPressed(1200)).toBe(false);expect(c.jumpPressed(1259)).toBe(false);
  expect(c.jumpPressed(1260)).toBe(true);expect(c.jumpPressed(2009)).toBe(true);expect(c.jumpPressed(2010)).toBe(false);
 });
 it('starts immediately after a previous hold expired and clears the pending press on stop',()=>{
  const c=new Controls();c.activate('jump',1000);c.activate('jump',1800);expect(c.jumpPressed(1800)).toBe(true);
  c.activate('jump',1900);c.stop();expect(c.jumpPressed(1960)).toBe(false);
 });
});


describe('directions momentanées par défaut',()=>{
 it('arrête les deux axes au relâchement, même après un saut',()=>{
  const c=new Controls();expect(c.sticky).toBe(false);c.setStick(1,-1);expect(c.movement(0)).toBe(1);
  c.releaseStick();c.activate('jump',100);expect(c.movement(110)).toBe(0);expect(c.verticalAxis(110)).toBe(0);
  c.setStick(-1,0);c.releaseStick();expect(c.movement(120)).toBe(0);
 });
 it('relâche aussi une touche directionnelle et permet de changer de sens',()=>{
  const c=new Controls();c.activate('right',0);expect(c.movement(1)).toBe(1);c.release('right');expect(c.movement(2)).toBe(0);
  c.activate('left',3);expect(c.movement(4)).toBe(-1);c.release('left');expect(c.movement(5)).toBe(0);
 });
});
