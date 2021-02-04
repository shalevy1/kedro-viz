import React from 'react';
import { connect } from 'react-redux';
import { toggleDisplayLargeGraph } from '../../actions/graph';
import './largePipelineWarning.css';

export const LargePipelineWarning = ({
  nodeCount,
  onToggleDisplayLargeGraph
}) => {
  return (
    <div className="warning">
      <div className="title">Your pipeline is large.</div>
      <div className="subtitle">
        Your pipeline might take a while to render because it has{' '}
        <b>{nodeCount}</b> nodes. Use the sidebar controls to select a smaller
        graph, or click to render.
      </div>
      <button
        className="renderButton"
        onClick={() => onToggleDisplayLargeGraph(true)}>
        Render it anyway
      </button>
    </div>
  );
};

export const mapStateToProps = state => ({
  nodeCount: state.loading.nodeCount
});

export const mapDispatchToProps = dispatch => ({
  onToggleDisplayLargeGraph: value => {
    dispatch(toggleDisplayLargeGraph(value));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LargePipelineWarning);
