import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={className} style={{ background: 'rgba(200,200,200,0.2)' }} />
);

export default Skeleton;


