import { Box, Plus, X } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';
import { pipelines, unityVersions } from '../data/options';
import type { VerifyRequest } from '../types/verify.types';
import { SelectField } from './ProjectSetupForm';

type Props = { value: VerifyRequest['asset']; onChange: (value: VerifyRequest['asset']) => void; showErrors: boolean };

export function AssetSetupForm({ value, onChange, showErrors }: Props) {
  const [dependency, setDependency] = useState('');
  const addDependency = () => {
    const clean = dependency.trim();
    if (clean && !value.dependencies.some((item) => item.toLowerCase() === clean.toLowerCase())) onChange({ ...value, dependencies: [...value.dependencies, clean] });
    setDependency('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); addDependency(); }
  };
  return <section className="form-card">
    <div className="form-card-heading"><span className="icon-box"><Box size={19} /></span><div><p className="eyebrow">ASSET TO VERIFY</p><h2>Review asset details</h2></div></div>
    <div className="field-grid">
      {value.metadata && <><label className="field" htmlFor="asset-name"><span>Asset name <small className="detected-label">Detected from Asset Store</small></span><input id="asset-name" value={value.metadata.assetName ?? ''} onChange={(event) => onChange({ ...value, metadata: { ...value.metadata, assetName: event.target.value } })} maxLength={200} /></label><label className="field" htmlFor="publisher-name"><span>Publisher <small className="detected-label">Detected from Asset Store</small></span><input id="publisher-name" value={value.metadata.publisherName ?? ''} onChange={(event) => onChange({ ...value, metadata: { ...value.metadata, publisherName: event.target.value } })} maxLength={200} /></label></>}
      <SelectField label="Tested Unity version" value={value.testedUnityVersion} error={showErrors && !value.testedUnityVersion} onChange={(testedUnityVersion) => onChange({ ...value, testedUnityVersion: testedUnityVersion as VerifyRequest['asset']['testedUnityVersion'] })} options={unityVersions} />
      <SelectField label="Asset render pipeline" value={value.pipeline} error={showErrors && !value.pipeline} onChange={(pipeline) => onChange({ ...value, pipeline: pipeline as VerifyRequest['asset']['pipeline'] })} options={pipelines} />
      <fieldset className="field"><legend>Uses custom shaders?</legend><div className="segment" role="group"><button type="button" className={!value.customShaders ? 'selected' : ''} onClick={() => onChange({ ...value, customShaders: false })}>No</button><button type="button" className={value.customShaders ? 'selected' : ''} onClick={() => onChange({ ...value, customShaders: true })}>Yes</button></div></fieldset>
      <div className="field"><label htmlFor="dependency">Dependencies <span className="optional">Optional</span></label><div className="dependency-input"><input id="dependency" value={dependency} onChange={(event) => setDependency(event.target.value)} onKeyDown={onKeyDown} placeholder="e.g. Cinemachine" maxLength={80} /><button type="button" onClick={addDependency} disabled={!dependency.trim()} aria-label="Add dependency"><Plus size={18} /></button></div><small className="hint">Press Enter to add a dependency.</small>
        <div className="tag-list">{value.dependencies.length === 0 ? <span className="empty-tag">No dependencies added</span> : value.dependencies.map((item) => <span className="tag" key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange({ ...value, dependencies: value.dependencies.filter((dependencyName) => dependencyName !== item) })}><X size={13} /></button></span>)}</div>
      </div>
    </div>
  </section>;
}
