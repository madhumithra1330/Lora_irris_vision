/**
 * Abstract recommendation provider interface.
 * Subclasses must implement analyze().
 *
 * Dashboard calls provider.analyze(data) and renders the result.
 * When the provider implementation changes (e.g. from RuleBased to OpenAI),
 * the dashboard UI code remains unchanged.
 */
export class RecommendationProvider {
  /**
   * Analyze dashboard data and produce a recommendation.
   *
   * @param {{ gatewayMetrics: object, nodes: Array }} dashboardData
   * @returns {{
   *   recommendation: string,
   *   reason: string,
   *   priority: 'high' | 'normal' | 'low',
   *   confidence: number,
   *   factors: Array<{ label: string, value: string, status: 'critical' | 'warning' | 'ok' }>,
   *   timestamp: string
   * }}
   */
  analyze(dashboardData) {
    throw new Error('RecommendationProvider.analyze() must be implemented by subclass');
  }
}
