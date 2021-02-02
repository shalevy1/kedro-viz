import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import Modal from '../modal';
import FlowChart from '../flowchart';
import Sidebar from '../sidebar';
import MetaData from '../metadata';
import ExportModal from '../export-modal';
import LoadingIcon from '../icons/loading';
import { isLoading } from '../../selectors/loading';
import './wrapper.css';

/**
 * Main app container. Handles showing/hiding the sidebar nav, and theme classes.
 */
export const Wrapper = ({ loading, theme, isChonky, displayChonkyGraph }) => {
  const displayWarning = isChonky && !displayChonkyGraph ? true : false;

  return (
    <div
      className={classnames('kedro-pipeline', {
        'kui-theme--dark': theme === 'dark',
        'kui-theme--light': theme === 'light'
      })}>
      <h1 className="pipeline-title">Kedro-Viz</h1>
      <Sidebar />
      <MetaData />
      <div className="pipeline-wrapper">
        {displayWarning === true ? <Modal /> : <FlowChart />}
        <LoadingIcon className="pipeline-wrapper__loading" visible={loading} />
      </div>
      <ExportModal />
    </div>
  );
};

export const mapStateToProps = state => ({
  loading: isLoading(state),
  theme: state.theme,
  isChonky: state.loading.isChonky,
  displayChonkyGraph: state.loading.displayChonkyGraph
});

export default connect(mapStateToProps)(Wrapper);
