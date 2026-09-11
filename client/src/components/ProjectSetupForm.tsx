import { MonitorCog } from 'lucide-react';
import { pipelines, platforms, unityVersions } from '../data/options';
import type { VerifyRequest } from '../types/verify.types';

type Props = { value: VerifyRequest['project']; onChange: (value: VerifyRequest['project']) => void; showErrors: boolean };

export function ProjectSetupForm({ value, onChange, showErrors }: Props) {
  return <section className="form-card">
    <div className="form-card-heading"><span className="icon-box"><MonitorCog size={19} /></span><div><p className="eyebrow">YOUR PROJECT</p><h2>Project setup</h2></div></div>
    <div className="field-grid">
      <SelectField label="Unity version" value={value.unityVersion} error={showErrors && !value.unityVersion} onChange={(unityVersion) => onChange({ ...value, unityVersion: unityVersion as VerifyRequest['project']['unityVersion'] })} options={unityVersions} />
      <SelectField label="Render pipeline" value={value.pipeline} error={showErrors && !value.pipeline} onChange={(pipeline) => onChange({ ...value, pipeline: pipeline as VerifyRequest['project']['pipeline'] })} options={pipelines} />
      <SelectField label="Target platform" value={value.platform} error={showErrors && !value.platform} onChange={(platform) => onChange({ ...value, platform: platform as VerifyRequest['project']['platform'] })} options={platforms} />
    </div>
  </section>;
}

type SelectProps = { label: string; value: string; error: boolean; onChange: (value: string) => void; options: { value: string; label: string }[] };
export function SelectField({ label, value, error, onChange, options }: SelectProps) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return <label className="field" htmlFor={id}><span>{label}</span><select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error}><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error && <small>Please select an option.</small>}</label>;
}
