import { createStore } from 'redux';
import reducer from '../reducers';
import { largeGraphThreshold } from '../config';
import { mockState, prepareState } from '../utils/state.mock';
import animals from '../utils/data/animals.mock.json';
import { changeFlag } from './index';
import { calculateGraph, updateGraph } from './graph';
import { getGraphInput } from '../selectors/layout';

describe('graph actions', () => {
  describe('calculateGraph', () => {
    it('returns updateGraph action if input is falsey', () => {
      expect(calculateGraph(null)).toEqual(updateGraph(null));
    });

    it('sets loading to true immediately', () => {
      const store = createStore(reducer, mockState.animals);
      expect(store.getState().loading.graph).not.toBe(true);
      calculateGraph(getGraphInput(mockState.animals))(store.dispatch);
      expect(store.getState().loading.graph).toBe(true);
    });

    it('sets loading to false and graph visibility to true after finishing calculation', () => {
      const store = createStore(reducer, mockState.animals);
      return calculateGraph(getGraphInput(mockState.animals))(
        store.dispatch
      ).then(() => {
        const state = store.getState();
        expect(state.loading.graph).toBe(false);
        expect(state.visible.graph).toBe(true);
      });
    });

    it('calculates a graph', () => {
      const state = Object.assign({}, mockState.animals);
      delete state.graph;
      const store = createStore(reducer, state);
      expect(store.getState().graph).toEqual({});
      return calculateGraph(getGraphInput(state))(store.dispatch).then(() => {
        expect(store.getState().graph).toEqual(
          expect.objectContaining({
            oldgraph: expect.any(Boolean),
            nodes: expect.any(Array),
            edges: expect.any(Array),
            size: expect.any(Object)
          })
        );
      });
    });

    it('uses new graph by default if the oldgraph flag is not set', () => {
      const state = reducer(mockState.animals, changeFlag('oldgraph', false));
      const store = createStore(reducer, state);
      return calculateGraph(getGraphInput(state))(store.dispatch).then(() => {
        expect(store.getState().graph.oldgraph).toBe(false);
      });
    });

    it('uses dagre if the oldgraph flag is set to true', () => {
      const state = reducer(mockState.animals, changeFlag('oldgraph', true));
      const store = createStore(reducer, state);
      return calculateGraph(getGraphInput(state))(store.dispatch).then(() => {
        expect(store.getState().graph.oldgraph).toBe(true);
      });
    });

    it('triggers large warning', () => {
      // Modify the animals dataset to add so many nodes that it triggers the warning:
      const data = { ...animals };
      let extraNodes = [];
      const iterations = Math.ceil(largeGraphThreshold / data.nodes.length) + 1;
      new Array(iterations).fill().forEach((d, i) => {
        const extraNodeGroup = data.nodes.map(node => ({
          ...node,
          id: node.id + i
        }));
        extraNodes = extraNodes.concat(extraNodeGroup);
      });
      data.nodes = data.nodes.concat(extraNodes);
      const customMockState = prepareState({ data });
      const store = createStore(reducer, customMockState);
      return calculateGraph(getGraphInput(customMockState))(
        store.dispatch
      ).then(() => {
        const state = store.getState();
        expect(state.loading.isLarge).toBe(true);
      });
    });
  });
});
