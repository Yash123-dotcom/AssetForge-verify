import { loadMetricsData } from '../repositories/metrics.repository.js';

function rate(numerator: number, denominator: number): number {
  return denominator ? Math.min(100, Math.round((numerator / denominator) * 1000) / 10) : 0;
}

export async function getBetaMetrics() {
  const { events, reports, feedback, usefulnessCount, payments, creditTransactions } = await loadMetricsData();
  const count = (name: string) => events.filter((event) => event.event_name === name).length;
  const analysisSuccess = count('analysis_succeeded');
  const analysisAttempts = analysisSuccess + count('analysis_failed');
  const categoryCounts = (status: 'WARNING' | 'FAIL') => reports.flatMap((report) => report.checks ?? []).filter((check) => check.status === status).reduce<Record<string, number>>((all, check) => ({ ...all, [check.category]: (all[check.category] ?? 0) + 1 }), {});
  const topFive = (values: Record<string, number>) => Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, total]) => ({ category, total }));
  const verifyStarts = count('verify_started');
  const successfulPayments = payments.filter((payment) => payment.status === 'SUCCEEDED');
  const payingUsers = new Set(successfulPayments.map((payment) => payment.user_id));
  const creditsConsumed = Math.abs(creditTransactions.filter((entry) => entry.type === 'SCAN_USAGE').reduce((total, entry) => total + entry.amount, 0));
  const paidDeepScans = Math.abs(creditTransactions.filter((entry) => entry.type === 'SCAN_USAGE' && payingUsers.has(entry.user_id)).reduce((total, entry) => total + entry.amount, 0));
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
    pricingPageVisits: count('pricing_viewed'),
    checkoutStarts: count('checkout_started'),
    successfulPurchases: successfulPayments.length,
    purchaseConversionRate: rate(successfulPayments.length, count('checkout_started')),
    creditsSold: successfulPayments.reduce((total, payment) => total + payment.credits_purchased, 0),
    creditsConsumed,
    paidDeepScans,
    averageScansPerPayingUser: payingUsers.size ? Math.round((paidDeepScans / payingUsers.size) * 100) / 100 : 0,
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
