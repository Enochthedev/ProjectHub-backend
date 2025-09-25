import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone, User, Project } from '@/entities';
import { MilestoneStatus, Priority } from '@/common/enums';

interface ProgressValidationResult {
  isValid: boolean;
  calculatedProgress: number;
  expectedProgress: number;
  discrepancy: number;
  issues: string[];
  details: any;
}

interface ProgressMetrics {
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  notStartedMilestones: number;
  blockedMilestones: number;
  overdueMilestones: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  completionPercentage: number;
  timeEfficiency: number;
  velocityMetrics: {
    milestonesPerWeek: number;
    hoursPerWeek: number;
    averageMilestoneCompletion: number;
  };
}

interface ValidationReport {
  studentId: string;
  studentEmail: string;
  projectId?: string;
  validationResults: ProgressValidationResult[];
  overallMetrics: ProgressMetrics;
  recommendations: string[];
  timestamp: Date;
}

@Injectable()
export class ProgressCalculationValidatorService {
  private readonly logger = new Logger(
    ProgressCalculationValidatorService.name,
  );

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async validateStudentProgress(studentId: string): Promise<ValidationReport> {
    this.logger.log(
      `Validating progress calculations for student: ${studentId}`,
    );

    try {
      const student = await this.userRepository.findOne({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error(`Student with ID ${studentId} not found`);
      }

      const milestones = await this.milestoneRepository.find({
        where: { studentId },
        relations: ['project'],
        order: { createdAt: 'ASC' },
      });

      const validationResults = await this.runProgressValidations(milestones);
      const overallMetrics = this.calculateOverallMetrics(milestones);
      const recommendations = this.generateRecommendations(
        overallMetrics,
        validationResults,
      );

      return {
        studentId,
        studentEmail: student.email,
        projectId: milestones[0]?.project?.id,
        validationResults,
        overallMetrics,
        recommendations,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate progress for student ${studentId}`,
        error,
      );
      throw error;
    }
  }

  private async runProgressValidations(
    milestones: Milestone[],
  ): Promise<ProgressValidationResult[]> {
    const validations: ProgressValidationResult[] = [];

    // Validation 1: Completion Percentage Calculation
    validations.push(this.validateCompletionPercentage(milestones));

    // Validation 2: Time Estimation Accuracy
    validations.push(this.validateTimeEstimationAccuracy(milestones));

    // Validation 3: Milestone Status Consistency
    validations.push(this.validateMilestoneStatusConsistency(milestones));

    // Validation 4: Progress Velocity Calculation
    validations.push(this.validateProgressVelocity(milestones));

    // Validation 5: Overdue Detection Logic
    validations.push(this.validateOverdueDetection(milestones));

    // Validation 6: Priority-Weighted Progress
    validations.push(this.validatePriorityWeightedProgress(milestones));

    return validations;
  }

  private validateCompletionPercentage(
    milestones: Milestone[],
  ): ProgressValidationResult {
    const issues: string[] = [];

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;

    // Calculate basic completion percentage
    const basicCompletionPercentage =
      totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    // Calculate weighted completion percentage (considering in-progress milestones)
    let weightedCompletion = 0;
    milestones.forEach((milestone) => {
      if (milestone.status === MilestoneStatus.COMPLETED) {
        weightedCompletion += 1;
      } else if (milestone.status === MilestoneStatus.IN_PROGRESS) {
        const progressRatio =
          milestone.estimatedHours > 0
            ? Math.min(1, milestone.actualHours / milestone.estimatedHours)
            : 0.5; // Assume 50% if no time estimates
        weightedCompletion += progressRatio;
      }
    });

    const weightedCompletionPercentage =
      totalMilestones > 0 ? (weightedCompletion / totalMilestones) * 100 : 0;

    // Validate calculations
    if (
      Math.abs(
        basicCompletionPercentage - Math.round(basicCompletionPercentage),
      ) > 0.01
    ) {
      issues.push(
        'Basic completion percentage calculation has rounding issues',
      );
    }

    if (weightedCompletionPercentage < basicCompletionPercentage) {
      issues.push(
        'Weighted completion percentage is less than basic percentage (unexpected)',
      );
    }

    const discrepancy = Math.abs(
      weightedCompletionPercentage - basicCompletionPercentage,
    );

    return {
      isValid: issues.length === 0,
      calculatedProgress: weightedCompletionPercentage,
      expectedProgress: basicCompletionPercentage,
      discrepancy,
      issues,
      details: {
        totalMilestones,
        completedMilestones,
        basicCompletionPercentage,
        weightedCompletionPercentage,
      },
    };
  }

  private validateTimeEstimationAccuracy(
    milestones: Milestone[],
  ): ProgressValidationResult {
    const issues: string[] = [];
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    );

    if (completedMilestones.length === 0) {
      return {
        isValid: true,
        calculatedProgress: 0,
        expectedProgress: 0,
        discrepancy: 0,
        issues: ['No completed milestones to validate time estimation'],
        details: { completedCount: 0 },
      };
    }

    let totalEstimated = 0;
    let totalActual = 0;
    let accuracyIssues = 0;

    completedMilestones.forEach((milestone) => {
      totalEstimated += milestone.estimatedHours;
      totalActual += milestone.actualHours;

      if (milestone.estimatedHours > 0) {
        const variance =
          Math.abs(milestone.actualHours - milestone.estimatedHours) /
          milestone.estimatedHours;
        if (variance > 0.5) {
          // More than 50% variance
          accuracyIssues++;
          issues.push(
            `Milestone "${milestone.title}" has ${(variance * 100).toFixed(1)}% time variance`,
          );
        }
      } else {
        issues.push(`Milestone "${milestone.title}" has no estimated hours`);
      }
    });

    const overallAccuracy =
      totalEstimated > 0 ? totalActual / totalEstimated : 0;
    const expectedAccuracy = 1.0; // Perfect estimation
    const discrepancy = Math.abs(overallAccuracy - expectedAccuracy);

    if (discrepancy > 0.3) {
      // More than 30% overall variance
      issues.push(
        `Overall time estimation accuracy is ${(discrepancy * 100).toFixed(1)}% off`,
      );
    }

    return {
      isValid: issues.length === 0,
      calculatedProgress: overallAccuracy,
      expectedProgress: expectedAccuracy,
      discrepancy,
      issues,
      details: {
        completedMilestones: completedMilestones.length,
        totalEstimated,
        totalActual,
        accuracyIssues,
        overallAccuracy,
      },
    };
  }

  private validateMilestoneStatusConsistency(
    milestones: Milestone[],
  ): ProgressValidationResult {
    const issues: string[] = [];
    const now = new Date();

    milestones.forEach((milestone) => {
      // Check for logical inconsistencies
      if (
        milestone.status === MilestoneStatus.COMPLETED &&
        !milestone.completedAt
      ) {
        issues.push(
          `Milestone "${milestone.title}" is marked completed but has no completion date`,
        );
      }

      if (
        milestone.status === MilestoneStatus.COMPLETED &&
        milestone.actualHours === 0
      ) {
        issues.push(
          `Milestone "${milestone.title}" is completed but has no actual hours recorded`,
        );
      }

      if (
        milestone.status === MilestoneStatus.NOT_STARTED &&
        milestone.actualHours > 0
      ) {
        issues.push(
          `Milestone "${milestone.title}" is not started but has actual hours recorded`,
        );
      }

      if (
        milestone.status === MilestoneStatus.BLOCKED &&
        !milestone.blockingReason
      ) {
        issues.push(
          `Milestone "${milestone.title}" is blocked but has no blocking reason`,
        );
      }

      // Check for overdue milestones not marked appropriately
      if (
        milestone.dueDate < now &&
        milestone.status !== MilestoneStatus.COMPLETED &&
        milestone.status !== MilestoneStatus.BLOCKED
      ) {
        const daysOverdue = Math.ceil(
          (now.getTime() - milestone.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        issues.push(
          `Milestone "${milestone.title}" is ${daysOverdue} days overdue but not marked as blocked`,
        );
      }
    });

    const consistencyScore =
      milestones.length > 0
        ? ((milestones.length - issues.length) / milestones.length) * 100
        : 100;

    return {
      isValid: issues.length === 0,
      calculatedProgress: consistencyScore,
      expectedProgress: 100,
      discrepancy: 100 - consistencyScore,
      issues,
      details: {
        totalMilestones: milestones.length,
        inconsistencies: issues.length,
        consistencyScore,
      },
    };
  }

  private validateProgressVelocity(
    milestones: Milestone[],
  ): ProgressValidationResult {
    const issues: string[] = [];
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    );

    if (completedMilestones.length < 2) {
      return {
        isValid: true,
        calculatedProgress: 0,
        expectedProgress: 0,
        discrepancy: 0,
        issues: ['Insufficient completed milestones to calculate velocity'],
        details: { completedCount: completedMilestones.length },
      };
    }

    // Calculate time span
    const sortedMilestones = completedMilestones.sort(
      (a, b) => a.completedAt!.getTime() - b.completedAt!.getTime(),
    );

    const firstCompletion = sortedMilestones[0].completedAt!;
    const lastCompletion =
      sortedMilestones[sortedMilestones.length - 1].completedAt!;
    const timeSpanWeeks =
      (lastCompletion.getTime() - firstCompletion.getTime()) /
      (1000 * 60 * 60 * 24 * 7);

    if (timeSpanWeeks === 0) {
      issues.push(
        'All milestones completed on the same day - cannot calculate velocity',
      );
      return {
        isValid: false,
        calculatedProgress: 0,
        expectedProgress: 0,
        discrepancy: 0,
        issues,
        details: { timeSpanWeeks: 0 },
      };
    }

    const velocityMilestonesPerWeek =
      completedMilestones.length / timeSpanWeeks;
    const totalHours = completedMilestones.reduce(
      (sum, m) => sum + m.actualHours,
      0,
    );
    const velocityHoursPerWeek = totalHours / timeSpanWeeks;

    // Expected velocity (this could be configurable based on project type)
    const expectedMilestonesPerWeek = 1.5; // Reasonable expectation
    const expectedHoursPerWeek = 20; // Reasonable expectation

    const milestoneVelocityDiscrepancy = Math.abs(
      velocityMilestonesPerWeek - expectedMilestonesPerWeek,
    );
    const hoursVelocityDiscrepancy = Math.abs(
      velocityHoursPerWeek - expectedHoursPerWeek,
    );

    if (velocityMilestonesPerWeek < expectedMilestonesPerWeek * 0.5) {
      issues.push(
        `Milestone completion velocity is low: ${velocityMilestonesPerWeek.toFixed(2)} per week`,
      );
    }

    if (velocityHoursPerWeek < expectedHoursPerWeek * 0.5) {
      issues.push(
        `Hours completion velocity is low: ${velocityHoursPerWeek.toFixed(2)} hours per week`,
      );
    }

    return {
      isValid: issues.length === 0,
      calculatedProgress: velocityMilestonesPerWeek,
      expectedProgress: expectedMilestonesPerWeek,
      discrepancy: milestoneVelocityDiscrepancy,
      issues,
      details: {
        timeSpanWeeks,
        velocityMilestonesPerWeek,
        velocityHoursPerWeek,
        expectedMilestonesPerWeek,
        expectedHoursPerWeek,
      },
    };
  }

  private validateOverdueDetection(
    milestones: Milestone[],
  ): ProgressValidationResult {
    const issues: string[] = [];
    const now = new Date();

    let detectedOverdue = 0;
    let actualOverdue = 0;

    milestones.forEach((milestone) => {
      const isActuallyOverdue =
        milestone.dueDate < now &&
        milestone.status !== MilestoneStatus.COMPLETED;

      if (isActuallyOverdue) {
        actualOverdue++;

        // Check if the system would detect this as overdue
        const daysOverdue = Math.ceil(
          (now.getTime() - milestone.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysOverdue > 0) {
          detectedOverdue++;
        }
      }
    });

    const detectionAccuracy =
      actualOverdue > 0 ? (detectedOverdue / actualOverdue) * 100 : 100;
    const expectedAccuracy = 100;
    const discrepancy = Math.abs(detectionAccuracy - expectedAccuracy);

    if (discrepancy > 0) {
      issues.push(
        `Overdue detection accuracy is ${detectionAccuracy.toFixed(1)}%`,
      );
    }

    return {
      isValid: issues.length === 0,
      calculatedProgress: detectionAccuracy,
      expectedProgress: expectedAccuracy,
      discrepancy,
      issues,
      details: {
        actualOverdue,
        detectedOverdue,
        detectionAccuracy,
      },
    };
  }

  private validatePriorityWeightedProgress(
    milestones: Milestone[],
  ): ProgressValidationResult {
    const issues: string[] = [];

    // Define priority weights
    const priorityWeights = {
      [Priority.CRITICAL]: 4,
      [Priority.HIGH]: 3,
      [Priority.MEDIUM]: 2,
      [Priority.LOW]: 1,
    };

    let totalWeightedScore = 0;
    let maxPossibleScore = 0;

    milestones.forEach((milestone) => {
      const weight = priorityWeights[milestone.priority] || 1;
      maxPossibleScore += weight;

      if (milestone.status === MilestoneStatus.COMPLETED) {
        totalWeightedScore += weight;
      } else if (milestone.status === MilestoneStatus.IN_PROGRESS) {
        const progressRatio =
          milestone.estimatedHours > 0
            ? Math.min(1, milestone.actualHours / milestone.estimatedHours)
            : 0.5;
        totalWeightedScore += weight * progressRatio;
      }
    });

    const weightedProgress =
      maxPossibleScore > 0 ? (totalWeightedScore / maxPossibleScore) * 100 : 0;

    // Calculate simple progress for comparison
    const completedCount = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;
    const simpleProgress =
      milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

    const discrepancy = Math.abs(weightedProgress - simpleProgress);

    // Validate that high-priority milestones are being prioritized
    const highPriorityMilestones = milestones.filter(
      (m) => m.priority === Priority.CRITICAL || m.priority === Priority.HIGH,
    );
    const completedHighPriority = highPriorityMilestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;

    if (highPriorityMilestones.length > 0) {
      const highPriorityCompletionRate =
        (completedHighPriority / highPriorityMilestones.length) * 100;
      if (highPriorityCompletionRate < simpleProgress) {
        issues.push(
          'High-priority milestones are being completed at a lower rate than average',
        );
      }
    }

    return {
      isValid: issues.length === 0,
      calculatedProgress: weightedProgress,
      expectedProgress: simpleProgress,
      discrepancy,
      issues,
      details: {
        totalWeightedScore,
        maxPossibleScore,
        weightedProgress,
        simpleProgress,
        highPriorityMilestones: highPriorityMilestones.length,
        completedHighPriority,
      },
    };
  }

  private calculateOverallMetrics(milestones: Milestone[]): ProgressMetrics {
    const now = new Date();

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;
    const inProgressMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.IN_PROGRESS,
    ).length;
    const notStartedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.NOT_STARTED,
    ).length;
    const blockedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.BLOCKED,
    ).length;
    const overdueMilestones = milestones.filter(
      (m) => m.dueDate < now && m.status !== MilestoneStatus.COMPLETED,
    ).length;

    const totalEstimatedHours = milestones.reduce(
      (sum, m) => sum + m.estimatedHours,
      0,
    );
    const totalActualHours = milestones.reduce(
      (sum, m) => sum + m.actualHours,
      0,
    );

    const completionPercentage =
      totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    const timeEfficiency =
      totalEstimatedHours > 0
        ? (totalEstimatedHours / totalActualHours) * 100
        : 0;

    // Calculate velocity metrics
    const completedWithDates = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED && m.completedAt,
    );

    let milestonesPerWeek = 0;
    let hoursPerWeek = 0;
    let averageMilestoneCompletion = 0;

    if (completedWithDates.length > 1) {
      const sortedCompleted = completedWithDates.sort(
        (a, b) => a.completedAt!.getTime() - b.completedAt!.getTime(),
      );

      const firstCompletion = sortedCompleted[0].completedAt!;
      const lastCompletion =
        sortedCompleted[sortedCompleted.length - 1].completedAt!;
      const timeSpanWeeks =
        (lastCompletion.getTime() - firstCompletion.getTime()) /
        (1000 * 60 * 60 * 24 * 7);

      if (timeSpanWeeks > 0) {
        milestonesPerWeek = completedWithDates.length / timeSpanWeeks;
        const completedHours = completedWithDates.reduce(
          (sum, m) => sum + m.actualHours,
          0,
        );
        hoursPerWeek = completedHours / timeSpanWeeks;
      }

      averageMilestoneCompletion =
        completedWithDates.reduce((sum, m) => sum + m.actualHours, 0) /
        completedWithDates.length;
    }

    return {
      totalMilestones,
      completedMilestones,
      inProgressMilestones,
      notStartedMilestones,
      blockedMilestones,
      overdueMilestones,
      totalEstimatedHours,
      totalActualHours,
      completionPercentage,
      timeEfficiency,
      velocityMetrics: {
        milestonesPerWeek,
        hoursPerWeek,
        averageMilestoneCompletion,
      },
    };
  }

  private generateRecommendations(
    metrics: ProgressMetrics,
    validations: ProgressValidationResult[],
  ): string[] {
    const recommendations: string[] = [];

    // Progress-based recommendations
    if (metrics.completionPercentage < 30) {
      recommendations.push(
        'Consider breaking down large milestones into smaller, more manageable tasks',
      );
    }

    if (metrics.overdueMilestones > 0) {
      recommendations.push(
        'Review overdue milestones and update project timeline or seek supervisor assistance',
      );
    }

    if (metrics.blockedMilestones > 0) {
      recommendations.push(
        'Address blocked milestones by resolving dependencies or escalating issues',
      );
    }

    // Time efficiency recommendations
    if (metrics.timeEfficiency < 80) {
      recommendations.push(
        'Improve time estimation accuracy by tracking actual vs estimated hours more carefully',
      );
    }

    if (metrics.timeEfficiency > 150) {
      recommendations.push(
        'Consider increasing milestone complexity or adding additional features',
      );
    }

    // Velocity recommendations
    if (metrics.velocityMetrics.milestonesPerWeek < 1) {
      recommendations.push(
        'Increase milestone completion velocity by dedicating more time to project work',
      );
    }

    // Validation-based recommendations
    validations.forEach((validation) => {
      if (!validation.isValid && validation.issues.length > 0) {
        recommendations.push(
          `Address ${validation.issues.length} calculation issues in progress tracking`,
        );
      }
    });

    if (recommendations.length === 0) {
      recommendations.push(
        'Progress tracking appears to be accurate and on track',
      );
    }

    return recommendations;
  }

  async generateProgressValidationReport(studentId: string): Promise<string> {
    const report = await this.validateStudentProgress(studentId);

    const content = [
      'Progress Calculation Validation Report',
      '='.repeat(50),
      '',
      `Student: ${report.studentEmail}`,
      `Student ID: ${report.studentId}`,
      `Report Generated: ${report.timestamp.toLocaleString()}`,
      '',
      'Overall Metrics:',
      '-'.repeat(20),
      `Total Milestones: ${report.overallMetrics.totalMilestones}`,
      `Completed: ${report.overallMetrics.completedMilestones} (${report.overallMetrics.completionPercentage.toFixed(1)}%)`,
      `In Progress: ${report.overallMetrics.inProgressMilestones}`,
      `Overdue: ${report.overallMetrics.overdueMilestones}`,
      `Blocked: ${report.overallMetrics.blockedMilestones}`,
      `Time Efficiency: ${report.overallMetrics.timeEfficiency.toFixed(1)}%`,
      '',
      'Validation Results:',
      '-'.repeat(20),
    ];

    report.validationResults.forEach((validation, index) => {
      const status = validation.isValid ? '✅ VALID' : '❌ INVALID';
      content.push(
        `${index + 1}. ${status} - Discrepancy: ${validation.discrepancy.toFixed(2)}`,
      );

      if (validation.issues.length > 0) {
        content.push('   Issues:');
        validation.issues.forEach((issue) => {
          content.push(`   - ${issue}`);
        });
      }
      content.push('');
    });

    content.push('Recommendations:');
    content.push('-'.repeat(20));
    report.recommendations.forEach((rec) => {
      content.push(`• ${rec}`);
    });

    return content.join('\n');
  }
}
