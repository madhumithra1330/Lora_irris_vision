import { RecommendationProvider } from './RecommendationProvider';
import { THRESHOLDS } from '../constants';

/**
 * Rule-based recommendation engine.
 * Analyzes current sensor data against thresholds to produce
 * irrigation recommendations with explainable reasoning.
 */
export class RuleBasedProvider extends RecommendationProvider {
  analyze(dashboardData) {
    if (!dashboardData) {
      return {
        recommendationKey: 'recommendation.noData',
        recommendation: 'No Data Available',
        reasonKey: 'recommendation.waitingSensorData',
        reason: 'Waiting for sensor data',
        priority: 'low',
        confidence: 0,
        factors: [],
        timestamp: new Date().toISOString(),
      };
    }

    const { gatewayMetrics, nodes } = dashboardData;
    const factors = [];
    const issues = [];

    // Analyze each node
    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        const moisture = node.soil_moisture ?? node.soilMoisture;
        const temp = node.temperature;
        const name = node.cropName || node.nodeId;

        if (moisture != null) {
          let status = 'ok';
          if (moisture < THRESHOLDS.MOISTURE_CRITICAL) status = 'critical';
          else if (moisture < 60) status = 'warning';

          factors.push({
            label: `Moisture (${name})`,
            value: `${Math.round(moisture)}%`,
            status,
          });

          if (moisture < THRESHOLDS.MOISTURE_CRITICAL) {
            issues.push({
              priority: 'high',
              recommendationKey: 'recommendation.irrigateImmediately',
              recommendationParams: { name },
              recommendation: `Irrigate ${name} immediately`,
              reasonKey: 'recommendation.moistureCriticallyLow',
              reasonParams: { name },
              reason: `Soil moisture is critically low in ${name}`,
              confidence: 90 + Math.round(Math.random() * 5),
            });
          }
        }

        if (temp != null) {
          let status = 'ok';
          if (temp > THRESHOLDS.TEMPERATURE_HIGH) status = 'warning';
          if (temp > 40) status = 'critical';

          factors.push({
            label: `Temperature (${name})`,
            value: `${Math.round(temp * 10) / 10}°C`,
            status,
          });

          if (temp > THRESHOLDS.TEMPERATURE_HIGH) {
            issues.push({
              priority: 'normal',
              recommendationKey: 'recommendation.increaseMonitoring',
              recommendation: 'Increase irrigation monitoring',
              reasonKey: 'recommendation.highTempMoistureLoss',
              reasonParams: { name },
              reason: `High temperature may accelerate moisture loss in ${name}`,
              confidence: 78 + Math.round(Math.random() * 5),
            });
          }
        }
      }
    }

    // Check water tank level
    if (gatewayMetrics?.waterLevel != null) {
      let status = 'ok';
      if (gatewayMetrics.waterLevel < THRESHOLDS.WATER_LEVEL_LOW) status = 'critical';
      else if (gatewayMetrics.waterLevel < THRESHOLDS.WATER_LEVEL_MID) status = 'warning';

      factors.push({
        label: 'Tank Level',
        value: `${Math.round(gatewayMetrics.waterLevel)}%`,
        status,
      });

      if (gatewayMetrics.waterLevel < THRESHOLDS.WATER_LEVEL_LOW) {
        issues.push({
          priority: 'high',
          recommendationKey: 'recommendation.refillTank',
          recommendation: 'Refill water tank',
          reasonKey: 'recommendation.tankCriticallyLow',
          reason: 'Water tank level is critically low',
          confidence: 95,
        });
      }
    }

    // Check if all moisture readings are high
    const allMoistures = (nodes || [])
      .map((n) => n.soil_moisture ?? n.soilMoisture)
      .filter((v) => v != null);

    if (allMoistures.length > 0 && allMoistures.every((m) => m > THRESHOLDS.MOISTURE_OPTIMAL)) {
      if (issues.length === 0) {
        issues.push({
          priority: 'low',
          recommendationKey: 'recommendation.delayIrrigation',
          recommendation: 'Delay irrigation',
          reasonKey: 'recommendation.allFieldsWellWatered',
          reason: 'All fields are well watered',
          confidence: 85 + Math.round(Math.random() * 5),
        });
      }
    }

    // Pick highest priority issue
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    issues.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (issues.length > 0) {
      const top = issues[0];
      return {
        recommendationKey: top.recommendationKey,
        recommendationParams: top.recommendationParams,
        recommendation: top.recommendation,
        reasonKey: top.reasonKey,
        reasonParams: top.reasonParams,
        reason: top.reason,
        priority: top.priority,
        confidence: top.confidence,
        factors,
        timestamp: new Date().toISOString(),
      };
    }

    // All conditions normal
    return {
      recommendationKey: 'recommendation.allOptimal',
      recommendation: 'All conditions optimal ✓',
      reasonKey: 'recommendation.noActionNeeded',
      reason: 'No action needed — sensors report healthy levels',
      priority: 'low',
      confidence: 90,
      factors,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export a singleton instance
export const ruleBasedProvider = new RuleBasedProvider();
