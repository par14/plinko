import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameConfigStore, MIN_BET } from './game-config.store';

function setup() {
  TestBed.configureTestingModule({});
  return TestBed.inject(GameConfigStore);
}

describe('GameConfigStore', () => {
  beforeEach(() => localStorage.clear());

  it('sets bet, rows and risk', () => {
    const store = setup();
    store.setBet(12.5);
    store.setRows(12);
    store.setRisk('high');
    expect(store.bet()).toBe(12.5);
    expect(store.rows()).toBe(12);
    expect(store.risk()).toBe('high');
    expect(JSON.parse(localStorage.getItem('plinko.config') ?? '{}')).toEqual({
      bet: 12.5,
      rows: 12,
      risk: 'high',
    });
  });

  it('caps a fractional bet at the available balance and never below MIN_BET', () => {
    const store = setup();
    store.setBet(100);
    store.betFraction(2, 150); // 200 desired, capped to balance
    expect(store.bet()).toBe(150);
    store.betFraction(0.001, 150); // tiny, floored to MIN_BET
    expect(store.bet()).toBe(MIN_BET);
  });

  it('tracks active balls without going negative', () => {
    const store = setup();
    store.addBall();
    store.addBall();
    store.removeBall();
    expect(store.activeBalls()).toBe(1);
    store.removeBall();
    store.removeBall();
    expect(store.activeBalls()).toBe(0);
  });

  it('replaces invalid saved switch values with supported defaults', () => {
    localStorage.setItem(
      'plinko.config',
      JSON.stringify({ bet: 'broken', rows: 99, risk: 'impossible' }),
    );

    const store = setup();

    expect(store.bet()).toBe(1);
    expect(store.rows()).toBe(8);
    expect(store.risk()).toBe('low');
  });
});
