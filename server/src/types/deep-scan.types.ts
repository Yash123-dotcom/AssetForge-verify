import { Pipeline, Platform, Severity, UnityVersion, VerificationReport } from './verify.types.js';

export type DeepScanCategory = 'SCRIPT' | 'SHADER' | 'MATERIAL' | 'TEXTURE' | 'PREFAB' | 'SCENE' | 'MODEL' | 'AUDIO' | 'DOCUMENTATION' | 'PACKAGE_METADATA' | 'OTHER';
export type DeepScanFile = { path: string; extension: string; size: number; category: DeepScanCategory };
export type DeepScanRisk = { id: string; category: 'PIPELINE' | 'VERSION' | 'SHADER' | 'DEPENDENCY' | 'SCRIPT' | 'BINARY' | 'DOCUMENTATION' | 'STRUCTURE'; severity: Severity; title: string; message: string; recommendation?: string };
export type DependencySignal = { name: string; source: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' };
export type DeepScanProject = { unityVersion: UnityVersion; pipeline: Pipeline; platform: Platform };

export type DeepScanResult = {
  scanId: string;
  package: { fileName: string; sizeBytes: number; totalFiles: number; totalExtractedBytes: number };
  composition: { scripts: number; shaders: number; materials: number; textures: number; prefabs: number; scenes: number; models: number; audio: number; documentationFiles: number };
  detected: {
    pipelineSignals: Pipeline[];
    dependencies: string[];
    dependencySignals: DependencySignal[];
    packages: string[];
    shaderTechnologies: string[];
    unityVersionHints: string[];
    findings: string[];
    documentationPresent: boolean;
    asmdefPresent: boolean;
    dllPresent: boolean;
  };
  risks: DeepScanRisk[];
  confidence: { pipeline: 'HIGH' | 'MEDIUM' | 'LOW'; dependencies: 'HIGH' | 'MEDIUM' | 'LOW'; unityVersion: 'HIGH' | 'MEDIUM' | 'LOW' };
};

export type DeepScanResponse = { scanId: string; scan: DeepScanResult; report: VerificationReport };
