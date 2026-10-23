import { describe, expect, it } from 'vitest';
import { Controls } from '../src/controls';
describe('commandes mobiles à un doigt',()=>{
 it('garde la direction après le relâchement, puis permet un saut séparé',()=>{
  const c=new Controls();c.activate('right',0);c.release('right');c.activate('jump',100);
  expect(c.movement(120)).toBe(1);expect(c.jumpUntil).toBe(850);
 });
 it('un second appui sur la direction arrête',()=>{const c=new Controls();c.activate('left',0);c.activate('left',10);expect(c.movement(20)).toBe(0);});
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
