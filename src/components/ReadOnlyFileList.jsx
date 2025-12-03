import React from 'react';
import FileList from './FileList';

// This wrapper disables all edit, delete, and upload actions for admin read-only view
function ReadOnlyFileList(props) {
  return <FileList readOnlyMode={true} {...props} />;
}

export default ReadOnlyFileList;
