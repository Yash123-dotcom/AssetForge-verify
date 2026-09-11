import type { Risk } from '../types/verify.types';
export function RiskBadge({ risk }: { risk: Risk }) { return <span className={`risk-badge ${risk.toLowerCase()}`}><span />{risk} RISK</span>; }
