export type UnityVersion = '2021' | '2022' | '2023' | '6000';
export type Pipeline = 'BUILT_IN' | 'URP' | 'HDRP';
export type Platform = 'WINDOWS' | 'MAC' | 'ANDROID' | 'IOS' | 'WEBGL';
export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL';
export type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type DataConfidence = 'USER' | 'PACKAGE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type VerifyRequest = {
  project: { unityVersion: UnityVersion | ''; pipeline: Pipeline | ''; platform: Platform | '' };
  asset: { testedUnityVersion: UnityVersion | ''; pipeline: Pipeline | ''; customShaders: boolean; dependencies: string[]; metadata?: AssetReportMetadata };
};
export type AssetReportMetadata = { assetName?: string; publisherName?: string; sourceUrl?: string; source?: 'UNITY_ASSET_STORE' | 'UPLOADED_PACKAGE'; metadataSource?: 'URL_ANALYSIS' | 'MANUAL' | 'USER' | 'PACKAGE_SCAN'; fieldConfidence?: Partial<Record<'unityVersion' | 'pipeline' | 'dependencies' | 'shaders', DataConfidence>> };
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type AssetListingAnalysis = { source: 'UNITY_ASSET_STORE'; url: string; assetName: string | null; publisherName: string | null; category: string | null; unityVersion: UnityVersion | null; pipelineSupport: Pipeline[]; dependencies: string[]; customShaders: boolean | 'UNKNOWN'; platforms: string[]; latestUpdate: string | null; description: string | null; packageVersion: string | null; confidence: { unityVersion: Confidence; pipeline: Confidence; dependencies: Confidence; shaders: Confidence } };

export type CheckResult = { id: string; category: string; status: CheckStatus; severity: Severity; scoreImpact: number; message: string; details?: string[] };
export type VerifyResponse = { score: number; risk: Risk; summary: string; checks: CheckResult[]; recommendations: string[] };
export type VerificationReport = VerifyResponse & {
  id: string;
  project: { unityVersion: UnityVersion; pipeline: Pipeline; platform: Platform };
  asset: { testedUnityVersion: UnityVersion; pipeline: Pipeline; customShaders: boolean; dependencies: string[] };
  createdAt: string;
  metadata?: AssetReportMetadata;
  deepScan?: DeepScanResult;
};
export type FeedbackOutcome = 'WORKED' | 'PARTIAL' | 'FAILED';
export type FeedbackCategory = 'RENDER_PIPELINE' | 'UNITY_VERSION' | 'SHADERS_MATERIALS' | 'DEPENDENCIES' | 'MISSING_SCRIPTS' | 'PLATFORM_SPECIFIC' | 'OTHER';
export type UsefulnessRating = 'YES' | 'SOMEWHAT' | 'NO';
export type FeedbackSummary = { totalResponses: number; worked: number; partial: number; failed: number };

export type DeepScanRisk = { id: string; category: 'PIPELINE' | 'VERSION' | 'SHADER' | 'DEPENDENCY' | 'SCRIPT' | 'BINARY' | 'DOCUMENTATION' | 'STRUCTURE'; severity: Severity; title: string; message: string; recommendation?: string };
export type DeepScanResult = {
  scanId: string;
  package: { fileName: string; sizeBytes: number; totalFiles: number; totalExtractedBytes: number };
  composition: { scripts: number; shaders: number; materials: number; textures: number; prefabs: number; scenes: number; models: number; audio: number; documentationFiles: number };
  detected: { pipelineSignals: Pipeline[]; dependencies: string[]; dependencySignals: Array<{ name: string; source: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }>; packages: string[]; shaderTechnologies: string[]; unityVersionHints: string[]; findings: string[]; documentationPresent: boolean; asmdefPresent: boolean; dllPresent: boolean };
  risks: DeepScanRisk[];
  confidence: { pipeline: 'HIGH' | 'MEDIUM' | 'LOW'; dependencies: 'HIGH' | 'MEDIUM' | 'LOW'; unityVersion: 'HIGH' | 'MEDIUM' | 'LOW' };
};
export type DeepScanResponse = { scanId: string; scan: DeepScanResult; report: VerificationReport; availableCredits: number };
export type Currency = 'INR' | 'USD';
export type CreditPack = { id: 'DEEP_SCAN_1' | 'DEEP_SCAN_5' | 'DEEP_SCAN_15'; credits: number; popular: boolean; prices: Record<Currency, { amount: number; formatted: string }> };
export type AccountData = {
  profile: { email: string; displayName: string | null; createdAt: string };
  balance: { availableCredits: number; reservedCredits: number; updatedAt: string };
  activity: Array<{ id: string; name: string; createdAt: string; score: number; risk: Risk; scanType: 'QUICK_CHECK' | 'DEEP_SCAN'; status: 'COMPLETED' }>;
  payments: Array<{ id: string; pack_id: string; currency: Currency; amount: number; credits_purchased: number; status: string; created_at: string }>;
  creditTransactions: Array<{ id: string; type: string; amount: number; metadata: Record<string, unknown>; created_at: string }>;
  totals: { reports: number; deepScans: number };
};
