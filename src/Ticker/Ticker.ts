/**
 * Muuri Ticker
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Ticker/LICENSE.md
 */

import raf from '../utils/raf';

export type TickId = string;
export type TickCallback = (time: number) => any;

/**
 * A lane for ticker.
 */
class TickerLane {
  private _queue: (TickId | undefined)[];
  private _indices: Map<TickId, number>;
  private _callbacks: Map<TickId, TickCallback>;

  constructor() {
    this._queue = [];
    this._indices = new Map();
    this._callbacks = new Map();
  }

  public add(id: TickId, callback: TickCallback) {
    const { _queue, _indices, _callbacks } = this;
    const index = _indices.get(id);
    if (index !== undefined) _queue[index] = undefined;
    _queue.push(id);
    _callbacks.set(id, callback);
    _indices.set(id, _queue.length - 1);
  }

  public remove(id: TickId) {
    const { _queue, _indices, _callbacks } = this;
    const index = _indices.get(id);
    if (index === undefined) return;
    _queue[index] = undefined;
    _callbacks.delete(id);
    _indices.delete(id);
  }

  public flush(targetQueue: TickId[], targetCallbacks: Map<TickId, TickCallback>) {
    const { _queue, _callbacks, _indices } = this;
    let id: undefined | string;

    for (var i = 0; i < _queue.length; i++) {
      id = _queue[i];
      if (!id || targetCallbacks.has(id)) continue;
      targetQueue.push(id);
      targetCallbacks.set(id, _callbacks.get(id) as TickCallback);
    }

    _queue.length = 0;
    _callbacks.clear();
    _indices.clear();
  }
}

/**
 * A ticker system for handling DOM reads and writes in an efficient way.
 */
export default class Ticker {
  private _nextStep: number | null;
  private _lanes: TickerLane[];
  private _stepQueue: TickId[];
  private _stepCallbacks: Map<TickId, TickCallback>;

  constructor(numLanes = 1) {
    this._nextStep = null;
    this._lanes = [];
    this._stepQueue = [];
    this._stepCallbacks = new Map();

    this._step = this._step.bind(this);

    for (var i = 0; i < numLanes; i++) {
      this._lanes.push(new TickerLane());
    }
  }

  private _step(time: number) {
    const { _lanes, _stepQueue, _stepCallbacks } = this;
    let i = 0;

    this._nextStep = null;

    for (i = 0; i < _lanes.length; i++) {
      _lanes[i].flush(_stepQueue, _stepCallbacks);
    }

    for (i = 0; i < _stepQueue.length; i++) {
      (_stepCallbacks.get(_stepQueue[i]) as TickCallback)(time);
    }

    _stepQueue.length = 0;
    _stepCallbacks.clear();
  }

  public add(laneIndex: number, id: string, callback: TickCallback) {
    const lane = this._lanes[laneIndex];
    if (lane) {
      lane.add(id, callback);
      if (!this._nextStep) this._nextStep = raf(this._step);
    }
  }

  public remove(laneIndex: number, id: string) {
    const lane = this._lanes[laneIndex];
    if (lane) lane.remove(id);
  }
}