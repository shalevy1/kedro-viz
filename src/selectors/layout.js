import { createSelector } from 'reselect';
import { getVisibleNodes } from './nodes';
import { getVisibleEdges } from './edges';
import { getVisibleLayerIDs } from './disabled';
import { getVisibleMetaSidebar } from '../selectors/metadata';
import {
  sidebarWidth,
  metaSidebarWidth,
  codeSidebarWidth,
  chartMinWidth
} from '../config';

const getOldgraphFlag = state => state.flags.oldgraph;
const getVisibleSidebar = state => state.visible.sidebar;
const getVisibleCode = state => state.visible.code;
const getFontLoaded = state => state.fontLoaded;
const getChartSizeState = state => state.chartSize;

/**
 * Select a subset of state that is watched by graph layout calculators
 * and used to prepare state.graph via async web worker actions
 */
export const getGraphInput = createSelector(
  [
    getVisibleNodes,
    getVisibleEdges,
    getVisibleLayerIDs,
    getOldgraphFlag,
    getFontLoaded
  ],
  (nodes, edges, layers, oldgraph, fontLoaded) => {
    if (!fontLoaded) {
      return null;
    }
    return { nodes, edges, layers, oldgraph, fontLoaded };
  }
);

/**
 * Calculate the displayed width of a sidebar
 */
export const getSidebarWidth = (visible, { open, closed }) =>
  visible ? open : closed;

/**
 * Convert the DOMRect into an Object, mutate some of the properties,
 * and add some useful new ones
 */
export const getChartSize = createSelector(
  [getVisibleSidebar, getVisibleMetaSidebar, getVisibleCode, getChartSizeState],
  (visibleSidebar, visibleMetaSidebar, visibleCodeSidebar, chartSize) => {
    const { left, top, width, height } = chartSize;
    if (!width || !height) {
      return {};
    }

    // Get the actual sidebar width
    const sidebarWidthActual = getSidebarWidth(visibleSidebar, sidebarWidth);
    const metaSidebarWidthActual = getSidebarWidth(
      visibleMetaSidebar,
      metaSidebarWidth
    );
    const codeSidebarWidthActual = getSidebarWidth(
      visibleCodeSidebar,
      codeSidebarWidth
    );

    // Find the resulting space for the chart
    let chartWidth =
      width -
      sidebarWidthActual -
      metaSidebarWidthActual -
      codeSidebarWidthActual;

    // Enforce minimum chart width
    if (chartWidth < chartMinWidth) {
      chartWidth = chartMinWidth;
    }

    return {
      left,
      top,
      outerWidth: width,
      outerHeight: height,
      height,
      width: chartWidth,
      sidebarWidth: sidebarWidthActual,
      metaSidebarWidth: metaSidebarWidthActual,
      codeSidebarWidth: codeSidebarWidthActual
    };
  }
);

/**
 * Gets the current chart zoom
 */
export const getChartZoom = createSelector(
  [state => state.zoom],
  zoom => ({
    ...zoom
  })
);
