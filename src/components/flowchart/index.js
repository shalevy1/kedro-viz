import React, { Component } from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import 'd3-transition';
// import { interpolatePath } from 'd3-interpolate-path';
import { select, event } from 'd3-selection';
import { curveBasis, line } from 'd3-shape';
import { zoom, zoomIdentity } from 'd3-zoom';
import {
  setNodeTextBbox,
  toggleNodeClicked,
  toggleNodeHovered,
  updateChartSize
} from '../../actions';
import { getVisibleNodes } from '../../selectors/nodes';
import { getLayout, getZoomPosition } from '../../selectors/layout';
import { getCentralNode, getLinkedNodes } from '../../selectors/linked-nodes';
import { ReactComponent as DataIcon } from './icon-data.svg';
import { ReactComponent as TaskIcon } from './icon-task.svg';
import './styles/flowchart.css';

const DURATION = 700;

/**
 * Display a pipeline flowchart, mostly rendered with D3
 */
export class FlowChart extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tooltipVisible: false,
      tooltipIsRight: false,
      tooltipText: null,
      tooltipX: 0,
      tooltipY: 0
    };

    this.containerRef = React.createRef();
    this.svgRef = React.createRef();
    this.wrapperRef = React.createRef();
    this.edgesRef = React.createRef();
    this.nodesRef = React.createRef();
  }

  componentDidMount() {
    // Create D3 element selectors
    this.el = {
      svg: select(this.svgRef.current),
      wrapper: select(this.wrapperRef.current)
    };

    this.getNodeTextSize();
    this.updateChartSize();
    this.initZoomBehaviour();
    this.zoomChart();
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleWindowResize);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.visibleNav !== this.props.visibleNav) {
      this.updateChartSize();
    }
    if (prevProps.zoom !== this.props.zoom) {
      this.zoomChart();
    }
    if (prevProps.visibleNodes !== this.props.visibleNodes) {
      this.getNodeTextSize();
    }
  }

  /**
   * Configure globals for the container dimensions,
   * and apply them to the chart SVG
   */
  updateChartSize() {
    const {
      left,
      top,
      width,
      height
    } = this.containerRef.current.getBoundingClientRect();
    const navOffset = this.getNavOffset(width);
    this.props.onUpdateChartSize({
      x: left,
      y: top,
      outerWidth: width,
      outerHeight: height,
      width: width - navOffset,
      height,
      navOffset
    });
  }

  getNavOffset(width) {
    const navWidth = 300; // from _variables.scss
    const breakpointSmall = 480; // from _variables.scss
    if (this.props.visibleNav && width > breakpointSmall) {
      return navWidth;
    }
    return 0;
  }

  /**
   * Handle window resize
   */
  handleWindowResize = () => {
    this.updateChartSize();
  };

  /**
   * Setup D3 zoom behaviour on component mount
   */
  initZoomBehaviour() {
    this.zoomBehaviour = zoom().on('zoom', () => {
      this.el.wrapper.attr('transform', event.transform);
      this.hideTooltip();
    });
    this.el.svg.call(this.zoomBehaviour);
  }

  /**
   * Zoom and scale to fit
   */
  zoomChart() {
    const { chartSize, zoom } = this.props;
    const { scale, translateX, translateY } = zoom;
    const navOffset = this.getNavOffset(chartSize.outerWidth);
    this.el.svg
      .transition()
      .duration(DURATION)
      .call(
        this.zoomBehaviour.transform,
        zoomIdentity.translate(translateX + navOffset, translateY).scale(scale)
      );
  }

  /**
   * Get SVG BBox for node text labels, to calculate their width
   * so that their box wrappers can be sized appropriately
   */
  getNodeTextSize() {
    const newNodeTextBBox = {};
    this.props.visibleNodes.forEach(node => {
      if (!this.props.nodeTextBBox[node.id]) {
        newNodeTextBBox[node.id] = this.nodesRef.current
          .querySelector(`text[data-id="${node.id}"]`)
          .getBBox();
      }
    });
    if (Object.keys(newNodeTextBBox).length) {
      this.props.setTextBbox(newNodeTextBBox);
    }
  }

  /**
   * Enable a node's focus state and highlight linked nodes
   * @param {Object} node Datum for a single node
   */
  handleNodeClick = (event, node) => {
    this.props.onToggleNodeClicked(node.id);
    event.stopPropagation();
  };

  /**
   * Remove a node's focus state and dim linked nodes
   */
  handleChartClick = () => {
    this.props.onToggleNodeClicked(null);
  };

  /**
   * Enable a node's active state, show tooltip, and highlight linked nodes
   * @param {Object} node Datum for a single node
   */
  handleNodeMouseOver = (event, node) => {
    this.props.onToggleNodeHovered(node.id);
    this.showTooltip(event, node);
  };

  /**
   * Remove a node's active state, hide tooltip, and dim linked nodes
   * @param {Object} node Datum for a single node
   */
  handleNodeMouseOut = () => {
    this.props.onToggleNodeHovered(null);
    this.hideTooltip();
  };

  /**
   * Handle keydown event when a node is focused
   * @param {Object} node Datum for a single node
   */
  handleNodeKeyDown = (event, node) => {
    const ENTER = 13;
    const ESCAPE = 27;
    if (event.keyCode === ENTER) {
      this.props.onToggleNodeClicked(node.id);
    }
    if (event.keyCode === ESCAPE) {
      this.handleChartClick();
      this.handleNodeMouseOut(node);
    }
  };

  /**
   * Show, fill and and position the tooltip
   * @param {Object} node A node datum
   */
  showTooltip(event, node) {
    const { chartSize } = this.props;
    const eventOffset = event.target.getBoundingClientRect();
    const navOffset = this.getNavOffset(chartSize.outerWidth);
    const isRight = eventOffset.left - navOffset > chartSize.width / 2;
    const xOffset = isRight
      ? eventOffset.left - (chartSize.width + navOffset)
      : eventOffset.left;
    this.setState({
      tooltipVisible: true,
      tooltipIsRight: isRight,
      tooltipText: node.name,
      tooltipX: xOffset - chartSize.x + eventOffset.width / 2,
      tooltipY: eventOffset.top - chartSize.y
    });
  }

  /**
   * Hide the tooltip
   */
  hideTooltip() {
    if (this.state.tooltipVisible) {
      this.setState({
        tooltipVisible: false
      });
    }
  }

  /**
   * Render React elements
   */
  render() {
    const {
      centralNode,
      chartSize,
      layout,
      linkedNodes,
      textLabels
    } = this.props;
    const { outerWidth, outerHeight } = chartSize;
    const { nodes, edges } = layout;
    const {
      tooltipVisible,
      tooltipIsRight,
      tooltipText,
      tooltipX,
      tooltipY
    } = this.state;

    const icons = {
      data: DataIcon,
      task: TaskIcon
    };
    const iconSizes = {
      data: 17,
      task: 18
    };

    // Set up line shape function
    const lineShape = line()
      .x(d => d.x)
      .y(d => d.y)
      .curve(curveBasis);

    return (
      <div
        className="pipeline-flowchart kedro"
        ref={this.containerRef}
        onClick={this.handleChartClick}>
        <svg
          className="pipeline-flowchart__graph"
          width={outerWidth}
          height={outerHeight}
          ref={this.svgRef}>
          <defs>
            <marker
              id="arrowhead"
              className="pipeline-flowchart__arrowhead"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerUnits="strokeWidth"
              markerWidth="8"
              markerHeight="6"
              orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 L 4 5 z" />
            </marker>
          </defs>
          <g ref={this.wrapperRef}>
            <g className="pipeline-flowchart__edges" ref={this.edgesRef}>
              {edges.map(edge => (
                <g
                  key={edge.id}
                  className={classnames('edge', {
                    'edge--faded':
                      centralNode &&
                      (!linkedNodes[edge.source] || !linkedNodes[edge.target])
                  })}>
                  <path
                    markerEnd="url(#arrowhead)"
                    d={edge.points && lineShape(edge.points)}
                  />
                </g>
              ))}
            </g>
            <g
              id="nodes"
              className="pipeline-flowchart__nodes"
              ref={this.nodesRef}>
              {nodes
                .sort((a, b) => a.order - b.order)
                .map(node => {
                  const Icon = icons[node.type];
                  return (
                    <g
                      key={node.id}
                      tabIndex="0"
                      transform={`translate(${node.x || 0}, ${node.y || 0})`}
                      // opacity={0}
                      className={classnames('node', {
                        'node--data': node.type === 'data',
                        'node--task': node.type === 'task',
                        'node--icon': !textLabels,
                        'node--text': textLabels,
                        'node--active': node.active,
                        'node--highlight': centralNode && linkedNodes[node.id],
                        'node--faded': centralNode && !linkedNodes[node.id]
                      })}
                      onClick={e => this.handleNodeClick(e, node)}
                      onMouseOver={e => this.handleNodeMouseOver(e, node)}
                      onMouseOut={this.handleNodeMouseOut}
                      onFocus={e => this.handleNodeMouseOver(e, node)}
                      onBlur={this.handleNodeMouseOut}
                      onKeyDown={e => this.handleNodeKeyDown(e, node)}>
                      <rect
                        width={node.width - 5}
                        height={node.height - 5}
                        x={(node.width - 5) / -2}
                        y={(node.height - 5) / -2}
                        rx={node.type === 'data' ? node.height / 2 : 0}
                      />
                      <text data-id={node.id} textAnchor="middle" dy="4">
                        {node.name}
                      </text>
                      <Icon
                        className="node__icon"
                        width={iconSizes[node.type]}
                        height={iconSizes[node.type]}
                        x={iconSizes[node.type] / -2}
                        y={iconSizes[node.type] / -2}
                      />
                    </g>
                  );
                })}
            </g>
          </g>
        </svg>
        <div
          className={classnames('pipeline-flowchart__tooltip kedro', {
            'tooltip--visible': tooltipVisible,
            'tooltip--right': tooltipIsRight
          })}
          style={{ transform: `translate(${tooltipX}px, ${tooltipY}px)` }}>
          <span>{tooltipText}</span>
        </div>
      </div>
    );
  }
}

export const mapStateToProps = state => ({
  centralNode: getCentralNode(state),
  chartSize: state.chartSize,
  layout: getLayout(state),
  linkedNodes: getLinkedNodes(state),
  nodeTextBBox: state.nodeTextBBox,
  textLabels: state.textLabels,
  view: state.view,
  visibleNodes: getVisibleNodes(state),
  zoom: getZoomPosition(state)
});

export const mapDispatchToProps = dispatch => ({
  setTextBbox: nodes => {
    dispatch(setNodeTextBbox(nodes));
  },
  onToggleNodeClicked: nodeClicked => {
    dispatch(toggleNodeClicked(nodeClicked));
  },
  onToggleNodeHovered: nodeHovered => {
    dispatch(toggleNodeHovered(nodeHovered));
  },
  onUpdateChartSize: chartSize => {
    dispatch(updateChartSize(chartSize));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FlowChart);
