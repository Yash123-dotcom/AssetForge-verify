import { loadMetricsData } from '../repositories/metrics.repository.js';

function rate(numerator: number, denominator: number): number {
  return denominator ? Math.min(100, Math.round((numerator / denominator) * 1000) / 10) : 0;
}

export async function getBetaMetrics() {
  const { events, reports, feedback, usefulnessCount } = await loadMetricsData();
  const count = (name: string) => events.filter((event) => event.event_name === name).length;
  const analysisSuccess = count('analysis_succeeded');
  const analysisAttempts = analysisSuccess + count('analysis_failed');
  const categoryCounts = (status: 'WARNING' | 'FAIL') => reports.flatMap((report) => report.checks ?? []).filter((check) => check.status === status).reduce<Record<string, number>>((all, check) => ({ ...all, [check.category]: (all[check.category] ?? 0) + 1 }), {});
  const topFive = (values: Record<string, number>) => Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, total]) => ({ category, total }));
  const verifyStarts = count('verify_started');
  return {
    totalVerifyStarts: verifyStarts,
    completedVerifications: reports.length,
    completionRate: rate(reports.length, verifyStarts),
    urlAnalysisSuccessRate: rate(analysisSuccess, analysisAttempts),
    reportsViewed: count('report_viewed'),
    feedbackSubmissions: feedback.length,
    usefulnessResponses: usefulnessCount,
    assetForgeCtaClicks: count('assetforge_cta_clicked'),
    topWarningCategories: topFive(categoryCounts('WARNING')),
    topFailureCategories: topFive(categoryCounts('FAIL')),
  };
}

export async function getScoringAudit() {
  const { reports, feedback } = await loadMetricsData();
  return reports.map((report) => {
    const actual = feedback.find((item) => item.report_id === report.id);
    return {
      reportId: report.id,
      projectSetup: { unityVersion: report.project_unity_version, pipeline: report.project_pipeline, platform: report.project_platform },
      assetSetup: { unityVersion: report.asset_unity_version, pipeline: report.asset_pipeline, customShaders: report.custom_shaders, dependencyCount: report.dependencies.length },
      score: report.score,
      risk: report.risk,
      topChecks: (report.checks ?? []).filter((check) => check.status !== 'PASS').slice(0, 3).map(({ id, status, severity, scoreImpact }) => ({ id, status, severity, scoreImpact })),
      actualOutcome: actual?.outcome ?? null,
      alignment: actual?.prediction_alignment ?? 'UNKNOWN',
    };
  });
}
