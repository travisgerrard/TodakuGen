import React, { useState } from 'react';
import './MigrationNotice.css';

const MigrationNotice = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="migration-notice">
      <div className="migration-notice-content">
        <h3>Database Migration in Progress</h3>
        <p>
          We're upgrading our database system to improve performance and reliability.
          During this time, some features may be temporarily unavailable or limited.
        </p>
        <p>
          Your login information will be preserved, but you may need to log in again
          after the migration is complete.
        </p>
        <button 
          className="migration-notice-dismiss" 
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default MigrationNotice; 