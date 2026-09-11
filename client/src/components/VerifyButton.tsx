import { ArrowRight, LoaderCircle } from 'lucide-react';

export function VerifyButton({ loading, disabled }: { loading: boolean; disabled: boolean }) {
  return <button className="verify-button" type="submit" disabled={loading || disabled}>{loading ? <><LoaderCircle className="spinner" size={20} /> Checking setup…</> : <>Check Compatibility <ArrowRight size={20} /></>}</button>;
}
