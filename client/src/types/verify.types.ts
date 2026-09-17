export type UnityVersion = '2021' | '2022' | '2023' | '6000';
export type Pipeline = 'BUILT_IN' | 'URP' | 'HDRP';
export type Platform = 'WINDOWS' | 'MAC' | 'ANDROID' | 'IOS' | 'WEBGL';
export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL';
export type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type DataConfidence = 'USER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type VerifyRequest = {
  project: { unityVersion: UnityVersion | ''; pipeline: Pipeline | ''; platform: Platform | '' };
  asset: { testedUnityVersion: UnityVersion | ''; pipeline: Pipeline | ''; customShaders: boolean; dependencies: string[]; metadata?: AssetReportMetadata };
};
export type AssetReportMetadata = { assetName?: string; publisherName?: string; sourceUrl?: string; source?: 'UNITY_ASSET_STORE'; metadataSource?: 'URL_ANALYSIS' | 'MANUAL' | 'USER'; fieldConfidence?: Partial<Record<'unityVersion' | 'pipeline' | 'dependencies' | 'shaders', DataConfidence>> };
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
};
export type FeedbackOutcome = 'WORKED' | 'PARTIAL' | 'FAILED';
export type FeedbackCategory = 'RENDER_PIPELINE' | 'UNITY_VERSION' | 'SHADERS_MATERIALS' | 'DEPENDENCIES' | 'MISSING_SCRIPTS' | 'PLATFORM_SPECIFIC' | 'OTHER';
export type UsefulnessRating = 'YES' | 'SOMEWHAT' | 'NO';
export type FeedbackSummary = { totalResponses: number; worked: number; partial: number; failed: number };
