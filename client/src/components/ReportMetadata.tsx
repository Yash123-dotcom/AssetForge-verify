import { Monitor, PanelsTopLeft, Smartphone } from 'lucide-react';
import { pipelines, platforms, unityVersions } from '../data/options';
import type { VerificationReport } from '../types/verify.types';

export function ReportMetadata({ report }: { report: VerificationReport }) {
  const unity = unityVersions.find((item) => item.value === report.project.unityVersion)?.label ?? report.project.unityVersion;
  const pipeline = pipelines.find((item) => item.value === report.project.pipeline)?.label ?? report.project.pipeline;
  const platform = platforms.find((item) => item.value === report.project.platform)?.label ?? report.project.platform;
  return <div className="report-metadata"><span><Monitor size={15} />{unity}</span><span><PanelsTopLeft size={15} />{pipeline}</span><span><Smartphone size={15} />{platform}</span></div>;
}
