import { PlatformAnalytics } from '../platform-analytics.entity';
import { AnalyticsMetric } from '../../common/enums/analytics-metric.enum';
import { AnalyticsPeriod } from '../../common/enums/analytics-period.enum';

describe('PlatformAnalytics Entity', () => {
  let analytics: PlatformAnalytics;

  beforeEach(() => {
    analytics = new PlatformAnalytics();
    analytics.date = new Date('2024-01-01');
    analytics.metric = AnalyticsMetric.USER_REGISTRATIONS;
    analytics.value = 100;
    analytics.period = AnalyticsPeriod.DAILY;
  });

  describe('calculateChangePercent', () => {
    it('should calculate positive percentage change correctly', () => {
      analytics.value = 120;
      analytics.previousValue = 100;

      const change = analytics.calculateChangePercent();
      expect(change).toBe(20);
    });

    it('should calculate negative percentage change correctly', () => {
      analytics.value = 80;
      analytics.previousValue = 100;

      const change = analytics.calculateChangePercent();
      expect(change).toBe(-20);
    });

    it('should return null when previous value is null', () => {
      analytics.value = 100;
      analytics.previousValue = null;

      const change = analytics.calculateChangePercent();
      expect(change).toBeNull();
    });

    it('should return null when previous value is zero', () => {
      analytics.value = 100;
      analytics.previousValue = 0;

      const change = analytics.calculateChangePercent();
      expect(change).toBeNull();
    });

    it('should handle decimal values correctly', () => {
      analytics.value = 105.5;
      analytics.previousValue = 100;

      const change = analytics.calculateChangePercent();
      expect(change).toBe(5.5);
    });

    it('should round to 2 decimal places', () => {
      analytics.value = 100.333;
      analytics.previousValue = 100;

      const change = analytics.calculateChangePercent();
      expect(change).toBe(0.33);
    });
  });

  describe('updateChangePercent', () => {
    it('should update changePercent property', () => {
      analytics.value = 120;
      analytics.previousValue = 100;
      analytics.changePercent = null;

      analytics.updateChangePercent();

      expect(analytics.changePercent).toBe(20);
    });
  });

  describe('isGrowth', () => {
    it('should return true for positive change', () => {
      analytics.changePercent = 15.5;

      expect(analytics.isGrowth()).toBe(true);
    });

    it('should return false for negative change', () => {
      analytics.changePercent = -10;

      expect(analytics.isGrowth()).toBe(false);
    });

    it('should return false for zero change', () => {
      analytics.changePercent = 0;

      expect(analytics.isGrowth()).toBe(false);
    });

    it('should return false when changePercent is null', () => {
      analytics.changePercent = null;

      expect(analytics.isGrowth()).toBe(false);
    });
  });

  describe('isDecline', () => {
    it('should return true for negative change', () => {
      analytics.changePercent = -15.5;

      expect(analytics.isDecline()).toBe(true);
    });

    it('should return false for positive change', () => {
      analytics.changePercent = 10;

      expect(analytics.isDecline()).toBe(false);
    });

    it('should return false for zero change', () => {
      analytics.changePercent = 0;

      expect(analytics.isDecline()).toBe(false);
    });

    it('should return false when changePercent is null', () => {
      analytics.changePercent = null;

      expect(analytics.isDecline()).toBe(false);
    });
  });

  describe('getFormattedValue', () => {
    it('should format large numbers with M suffix', () => {
      analytics.value = 1500000;

      expect(analytics.getFormattedValue()).toBe('1.5M');
    });

    it('should format thousands with K suffix', () => {
      analytics.value = 1500;

      expect(analytics.getFormattedValue()).toBe('1.5K');
    });

    it('should format small whole numbers without suffix', () => {
      analytics.value = 100;

      expect(analytics.getFormattedValue()).toBe('100');
    });

    it('should format decimal numbers with 2 decimal places', () => {
      analytics.value = 100.567;

      expect(analytics.getFormattedValue()).toBe('100.57');
    });

    it('should include unit when specified', () => {
      analytics.value = 100;
      analytics.unit = 'users';

      expect(analytics.getFormattedValue()).toBe('100 users');
    });

    it('should format large numbers with unit', () => {
      analytics.value = 1500000;
      analytics.unit = 'bytes';

      expect(analytics.getFormattedValue()).toBe('1.5M bytes');
    });
  });

  describe('getFormattedPreviousValue', () => {
    it('should return null when previousValue is null', () => {
      analytics.previousValue = null;

      expect(analytics.getFormattedPreviousValue()).toBeNull();
    });

    it('should format previous value correctly', () => {
      analytics.previousValue = 1500;

      expect(analytics.getFormattedPreviousValue()).toBe('1.5K');
    });

    it('should include unit for previous value', () => {
      analytics.previousValue = 100;
      analytics.unit = 'users';

      expect(analytics.getFormattedPreviousValue()).toBe('100 users');
    });
  });

  describe('getChangeIndicator', () => {
    it('should return up arrow for positive change', () => {
      analytics.changePercent = 15.5;

      expect(analytics.getChangeIndicator()).toBe('↗ +15.5%');
    });

    it('should return down arrow for negative change', () => {
      analytics.changePercent = -10.2;

      expect(analytics.getChangeIndicator()).toBe('↘ -10.2%');
    });

    it('should return right arrow for zero change', () => {
      analytics.changePercent = 0;

      expect(analytics.getChangeIndicator()).toBe('→ 0%');
    });

    it('should return dash for null change', () => {
      analytics.changePercent = null;

      expect(analytics.getChangeIndicator()).toBe('—');
    });
  });

  describe('isTimeSeries', () => {
    it('should return true when period and date are set', () => {
      analytics.period = AnalyticsPeriod.DAILY;
      analytics.date = new Date();

      expect(analytics.isTimeSeries()).toBe(true);
    });

    it('should return false when period is null', () => {
      analytics.period = null as any;
      analytics.date = new Date();

      expect(analytics.isTimeSeries()).toBe(false);
    });

    it('should return false when date is null', () => {
      analytics.period = AnalyticsPeriod.DAILY;
      analytics.date = null as any;

      expect(analytics.isTimeSeries()).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return metric summary with change indicator', () => {
      analytics.metric = AnalyticsMetric.USER_REGISTRATIONS;
      analytics.value = 100;
      analytics.changePercent = 20;

      expect(analytics.getSummary()).toBe('user_registrations: 100 ↗ +20%');
    });

    it('should include unit in summary', () => {
      analytics.metric = AnalyticsMetric.API_RESPONSE_TIME;
      analytics.value = 250;
      analytics.unit = 'ms';
      analytics.changePercent = -5;

      expect(analytics.getSummary()).toBe('api_response_time: 250 ms ↘ -5%');
    });
  });

  describe('isWithinRange', () => {
    it('should return true when value is within range', () => {
      analytics.value = 50;

      expect(analytics.isWithinRange(0, 100)).toBe(true);
    });

    it('should return false when value is below minimum', () => {
      analytics.value = 50;

      expect(analytics.isWithinRange(60, 100)).toBe(false);
    });

    it('should return false when value is above maximum', () => {
      analytics.value = 150;

      expect(analytics.isWithinRange(0, 100)).toBe(false);
    });

    it('should return true when only minimum is specified and value is above', () => {
      analytics.value = 50;

      expect(analytics.isWithinRange(30)).toBe(true);
    });

    it('should return true when only maximum is specified and value is below', () => {
      analytics.value = 50;

      expect(analytics.isWithinRange(undefined, 100)).toBe(true);
    });

    it('should return true when no range is specified', () => {
      analytics.value = 50;

      expect(analytics.isWithinRange()).toBe(true);
    });
  });

  describe('getMetricCategory', () => {
    it('should categorize user metrics correctly', () => {
      analytics.metric = AnalyticsMetric.USER_REGISTRATIONS;

      expect(analytics.getMetricCategory()).toBe('User Metrics');
    });

    it('should categorize project metrics correctly', () => {
      analytics.metric = AnalyticsMetric.PROJECT_SUBMISSIONS;

      expect(analytics.getMetricCategory()).toBe('Project Metrics');
    });

    it('should categorize supervisor metrics correctly', () => {
      analytics.metric = AnalyticsMetric.SUPERVISOR_ASSIGNMENTS;

      expect(analytics.getMetricCategory()).toBe('Supervisor Metrics');
    });

    it('should categorize AI metrics correctly', () => {
      analytics.metric = AnalyticsMetric.AI_QUERIES;

      expect(analytics.getMetricCategory()).toBe('AI Metrics');
    });

    it('should categorize system metrics correctly', () => {
      analytics.metric = AnalyticsMetric.SYSTEM_UPTIME;

      expect(analytics.getMetricCategory()).toBe('System Metrics');
    });

    it('should categorize milestone metrics correctly', () => {
      analytics.metric = AnalyticsMetric.MILESTONE_COMPLETIONS;

      expect(analytics.getMetricCategory()).toBe('Milestone Metrics');
    });

    it('should categorize recommendation metrics correctly', () => {
      analytics.metric = AnalyticsMetric.RECOMMENDATION_CLICKS;

      expect(analytics.getMetricCategory()).toBe('Recommendation Metrics');
    });
  });

  describe('Entity Properties', () => {
    it('should allow setting all properties', () => {
      const testDate = new Date('2024-01-01');
      const testMetadata = { source: 'test', userId: '123' };
      const testDimensions = { region: 'US', device: 'mobile' };

      analytics.date = testDate;
      analytics.metric = AnalyticsMetric.USER_LOGINS;
      analytics.value = 250.75;
      analytics.period = AnalyticsPeriod.WEEKLY;
      analytics.category = 'engagement';
      analytics.subcategory = 'daily_active';
      analytics.metadata = testMetadata;
      analytics.dimensions = testDimensions;
      analytics.previousValue = 200.5;
      analytics.changePercent = 25.12;
      analytics.unit = 'logins';
      analytics.isAggregated = true;
      analytics.source = 'analytics_service';

      expect(analytics.date).toBe(testDate);
      expect(analytics.metric).toBe(AnalyticsMetric.USER_LOGINS);
      expect(analytics.value).toBe(250.75);
      expect(analytics.period).toBe(AnalyticsPeriod.WEEKLY);
      expect(analytics.category).toBe('engagement');
      expect(analytics.subcategory).toBe('daily_active');
      expect(analytics.metadata).toEqual(testMetadata);
      expect(analytics.dimensions).toEqual(testDimensions);
      expect(analytics.previousValue).toBe(200.5);
      expect(analytics.changePercent).toBe(25.12);
      expect(analytics.unit).toBe('logins');
      expect(analytics.isAggregated).toBe(true);
      expect(analytics.source).toBe('analytics_service');
    });

    it('should handle null values correctly', () => {
      analytics.category = null;
      analytics.subcategory = null;
      analytics.metadata = null;
      analytics.dimensions = null;
      analytics.previousValue = null;
      analytics.changePercent = null;
      analytics.unit = null;
      analytics.source = null;

      expect(analytics.category).toBeNull();
      expect(analytics.subcategory).toBeNull();
      expect(analytics.metadata).toBeNull();
      expect(analytics.dimensions).toBeNull();
      expect(analytics.previousValue).toBeNull();
      expect(analytics.changePercent).toBeNull();
      expect(analytics.unit).toBeNull();
      expect(analytics.source).toBeNull();
    });
  });
});
