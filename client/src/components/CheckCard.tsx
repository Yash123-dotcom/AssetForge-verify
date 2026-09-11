import { Check, TriangleAlert, X } from 'lucide-react';
import type { CheckResult } from '../types/verify.types';

export function CheckCard({ check }: { check: CheckResult }) {
  const Icon = check.status === 'PASS' ? Check : check.status === 'WARNING' ? TriangleAlert : X;
  return <article className={`check-card ${check.status.toLowerCase()}`}><span className="check-icon"><Icon size={17} /></span><div><h3>{check.category}</h3><p>{check.message}</p>{check.details && check.details.length > 0 && <div className="detail-tags">{check.details.map((detail) => <span key={detail}>{detail}</span>)}</div>}</div><span className="impact">{check.scoreImpact > 0 ? '+' : ''}{check.scoreImpact}</span></article>;
}
