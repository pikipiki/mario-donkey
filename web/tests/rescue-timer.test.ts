import {describe,it,expect} from 'vitest';
import {RescueTimer} from '../src/rescue';

describe('ten active seconds to rescue Baby Mario',()=>{
 it('gives a low counter ten seconds and then lets the native capture start',()=>{
  const timer=new RescueTimer();let stars=timer.update(1000,true,50)!;expect(stars).toBe(100);
  for(let elapsed=100;elapsed<=10000;elapsed+=100){
   stars=timer.update(1000+elapsed,true,Math.max(0,stars-2))!;
   expect(stars).toBe(Math.ceil((10000-elapsed)/100));
  }
  expect(stars).toBe(0);
 });
 it('preserves a larger starting reserve and bonus stars',()=>{
  const timer=new RescueTimer();expect(timer.update(0,true,250)).toBe(250);
  expect(timer.update(1000,true,249)).toBe(240);
  expect(timer.update(1100,true,250)).toBe(249); // +10 native units = one bonus second
 });
 it('does not refill when frames repeat or the native counter has not changed',()=>{
  const timer=new RescueTimer();expect(timer.update(0,true,100)).toBe(100);
  expect(timer.update(16,true,100)).toBe(100);expect(timer.update(32,true,100)).toBe(100);
  expect(timer.update(1000,true,100)).toBe(90);
 });
 it('excludes a manual pause and background suspension',()=>{
  const timer=new RescueTimer();timer.update(0,true,100);expect(timer.update(2000,true,99)).toBe(80);
  timer.pause();expect(timer.update(62000,true,80)).toBe(80);expect(timer.update(63000,true,79)).toBe(70);
 });
 it('does not consume rescue time while an instruction is open',()=>{
  const timer=new RescueTimer();expect(timer.update(0,true,50,false)).toBeUndefined();
  expect(timer.update(30000,true,50,false)).toBeUndefined();expect(timer.update(60000,true,50)).toBe(100);
  expect(timer.update(61000,true,99)).toBe(90);timer.update(62000,true,90,false);
  expect(timer.update(90000,true,90)).toBe(90);
 });
 it('resets after recovery or leaving gameplay without changing a safe native counter',()=>{
  const timer=new RescueTimer();timer.update(0,true,100);timer.update(9000,true,1);
  expect(timer.update(10000,false,80)).toBeUndefined();expect(timer.update(11000,true,50)).toBe(100);
 });
 it('counts a long active frame gap rather than creating extra rescue time',()=>{
  const timer=new RescueTimer();timer.update(0,true,100);expect(timer.update(11000,true,0)).toBe(0);
 });
});
