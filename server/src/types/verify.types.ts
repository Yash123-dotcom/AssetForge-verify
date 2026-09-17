export const UNITY_VERSIONS = ['2021', '2022', '2023', '6000'] as const;
export const PIPELINES = ['BUILT_IN', 'URP', 'HDRP'] as const;
export const PLATFORMS = ['WINDOWS', 'MAC', 'ANDROID', 'IOS', 'WEBGL'] as const;

export type UnityVersion = (typeof UNITY_VERSIONS)[number];
export type Pipeline = (typeof PIPELINES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL';
export type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type DataConfidence = 'USER' | 'PACKAGE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type VerifyRequest = {
  project: { unityVersion: UnityVersion; pipeline: Pipeline; platform: Platform };
  asset: {
    testedUnityVersion: UnityVersion;
    pipeline: Pipeline;
    customShaders: boolean;
    dependencies: string[];
    metadata?: AssetReportMetadata;
  };
};

export type AssetReportMetadata = {
  assetName?: string;
  publisherName?: string;
  sourceUrl?: string;
  source?: 'UNITY_ASSET_STORE' | 'UPLOADED_PACKAGE';
  metadataSource?: 'URL_ANALYSIS' | 'MANUAL' | 'USER' | 'PACKAGE_SCAN';
  fieldConfidence?: Partial<Record<'unityVersion' | 'pipeline' | 'dependencies' | 'shaders', DataConfidence>>;
};
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type AssetListingAnalysis = { source: 'UNITY_ASSET_STORE'; url: string; assetName: string | null; publisherName: string | null; category: string | null; unityVersion: UnityVersion | null; pipelineSupport: Pipeline[]; dependencies: string[]; customShaders: boolean | 'UNKNOWN'; platforms: string[]; latestUpdate: string | null; description: string | null; packageVersion: string | null; confidence: { unityVersion: Confidence; pipeline: Confidence; dependencies: Confidence; shaders: Confidence } };

export type CheckResult = {
  id: string;
  category: string;
  status: CheckStatus;
  severity: Severity;
  scoreImpact: number;
  message: string;
  details?: string[];
};

export type VerifyResponse = {
  score: number;
  risk: Risk;
  summary: string;
  checks: CheckResult[];
  recommendations: string[];
};

export type VerificationReport = VerifyResponse & {
  id: string;
  project: VerifyRequest['project'];
  asset: VerifyRequest['asset'];
  createdAt: string;
  metadata?: AssetReportMetadata;
  deepScan?: import('./deep-scan.types.js').DeepScanResult;
};

export type FeedbackOutcome = 'WORKED' | 'PARTIAL' | 'FAILED';
export type FeedbackCategory = 'RENDER_PIPELINE' | 'UNITY_VERSION' | 'SHADERS_MATERIALS' | 'DEPENDENCIES' | 'MISSING_SCRIPTS' | 'PLATFORM_SPECIFIC' | 'OTHER';
export type PredictionAlignment = 'ALIGNED' | 'PARTIAL' | 'MISMATCH' | 'UNKNOWN';
export type UsefulnessRating = 'YES' | 'SOMEWHAT' | 'NO';
export type FeedbackSummary = {
  totalResponses: number;
  worked: number;
  partial: number;
  failed: number;
};

export const pipelineNames: Record<Pipeline, string> = {
  BUILT_IN: 'Built-in Render Pipeline',
  URP: 'URP',
  HDRP: 'HDRP',
};

export const unityVersionNames: Record<UnityVersion, string> = {
  '2021': 'Unity 2021 LTS',
  '2022': 'Unity 2022 LTS',
  '2023': 'Unity 2023',
  '6000': 'Unity 6',
};
