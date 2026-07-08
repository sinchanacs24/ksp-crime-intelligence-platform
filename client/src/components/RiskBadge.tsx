import React from 'react';

export default function RiskBadge({ level }: { level: 'Low' | 'Medium' | 'High' | string }) {
  const cls = level === 'High' ? 'badge-risk-high' : level === 'Medium' ? 'badge-risk-medium' : 'badge-risk-low';
  return <span className={cls}>{level}</span>;
}
