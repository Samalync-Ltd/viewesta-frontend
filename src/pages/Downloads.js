import React from 'react';
import { FaDownload } from 'react-icons/fa';
import './Downloads.css';

const Downloads = () => {
  return (
    <div className="downloads-page">
      <div className="downloads-container layout-container">
        <div className="downloads-header">
          <h1 className="downloads-title">
            <FaDownload />
            Downloads
          </h1>
          <p className="downloads-subtitle">
            Content you download for offline viewing will appear here.
          </p>
        </div>
        <div className="empty-downloads">
          <FaDownload className="empty-downloads-icon" />
          <h3>No downloads</h3>
          <p>No data available. Download titles from the catalog to watch offline.</p>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
