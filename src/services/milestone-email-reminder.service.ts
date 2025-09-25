import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../auth/services/email.service';
import { MilestoneReminder } from '../entities/milestone-reminder.entity';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { ReminderType } from '../common/enums/reminder-type.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface MilestoneReminderEmailData {
  studentName: string;
  studentEmail: string;
  milestoneTitle: string;
  milestoneDescription: string;
  dueDate: string;
  daysUntilDue: number;
  projectTitle?: string;
  isOverdue: boolean;
  dashboardUrl: string;
}

export interface SupervisorEscalationEmailData {
  supervisorName: string;
  supervisorEmail: string;
  studentName: string;
  milestoneTitle: string;
  milestoneDescription: string;
  dueDate: string;
  daysOverdue: number;
  projectTitle?: string;
  blockingReason?: string;
  dashboardUrl: string;
}

export interface ReminderDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAfter?: Date;
}

@Injectable()
export class MilestoneEmailReminderService {
  private readonly logger = new Logger(MilestoneEmailReminderService.name);

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(MilestoneReminder)
    private readonly reminderRepository: Repository<MilestoneReminder>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Send milestone reminder email to student
   */
  async sendMilestoneReminder(
    reminder: MilestoneReminder,
  ): Promise<ReminderDeliveryResult> {
    this.logger.log(
      `Sending milestone reminder ${reminder.id} for milestone ${reminder.milestoneId}`,
    );

    try {
      const milestone = await this.milestoneRepository.findOne({
        where: { id: reminder.milestoneId },
        relations: ['student', 'project'],
      });

      if (!milestone) {
        throw new Error(`Milestone ${reminder.milestoneId} not found`);
      }

      // Skip if milestone is completed or cancelled
      if (
        milestone.status === MilestoneStatus.COMPLETED ||
        milestone.status === MilestoneStatus.CANCELLED
      ) {
        this.logger.log(
          `Skipping reminder for ${milestone.status} milestone ${milestone.id}`,
        );
        return { success: true };
      }

      const emailData = this.prepareMilestoneReminderData(milestone, reminder);

      if (reminder.reminderType === ReminderType.EMAIL) {
        await this.sendStudentReminderEmail(emailData);
      }

      // Mark reminder as sent
      reminder.markAsSent();
      await this.reminderRepository.save(reminder);

      this.logger.log(`Successfully sent milestone reminder ${reminder.id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send milestone reminder ${reminder.id}`,
        error,
      );

      // Mark reminder as failed with retry logic
      reminder.markAsFailed(error.message);
      await this.reminderRepository.save(reminder);

      return {
        success: false,
        error: error.message,
        retryAfter: reminder.nextRetryAt || undefined,
      };
    }
  }

  /**
   * Send escalation email to supervisor for overdue milestones
   */
  async sendSupervisorEscalation(
    milestone: Milestone,
  ): Promise<ReminderDeliveryResult> {
    this.logger.log(
      `Sending supervisor escalation for overdue milestone ${milestone.id}`,
    );

    try {
      // Find supervisor through project relationship
      let supervisor: User | null = null;

      if (milestone.project?.supervisorId) {
        supervisor = await this.userRepository.findOne({
          where: { id: milestone.project.supervisorId },
        });
      }

      // If no supervisor found through project, try to find any supervisor
      // This is a fallback - in a real system, you'd have proper supervisor-student relationships
      if (!supervisor) {
        supervisor = await this.userRepository.findOne({
          where: { role: UserRole.SUPERVISOR },
        });
      }

      if (!supervisor) {
        throw new Error('No supervisor found for escalation');
      }

      const emailData = this.prepareSupervisorEscalationData(
        milestone,
        supervisor,
      );
      await this.sendSupervisorEscalationEmail(emailData);

      this.logger.log(
        `Successfully sent supervisor escalation for milestone ${milestone.id}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send supervisor escalation for milestone ${milestone.id}`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process batch of reminders
   */
  async processBatchReminders(reminders: MilestoneReminder[]): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(`Processing batch of ${reminders.length} reminders`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const reminder of reminders) {
      try {
        const result = await this.sendMilestoneReminder(reminder);
        results.processed++;

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors.push(`Reminder ${reminder.id}: ${result.error}`);
          }
        }

        // Add small delay between emails to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        results.processed++;
        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Batch processing complete: ${results.successful} successful, ${results.failed} failed`,
    );

    return results;
  }

  /**
   * Get reminder delivery history for a milestone
   */
  async getReminderHistory(milestoneId: string): Promise<MilestoneReminder[]> {
    return this.reminderRepository.find({
      where: { milestoneId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retry failed reminders that are eligible for retry
   */
  async retryFailedReminders(): Promise<{
    retried: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log('Retrying failed reminders');

    const failedReminders = await this.reminderRepository
      .createQueryBuilder('reminder')
      .leftJoinAndSelect('reminder.milestone', 'milestone')
      .where('reminder.sent = false')
      .andWhere('reminder.retryCount > 0')
      .andWhere('reminder.retryCount < 3')
      .andWhere(
        '(reminder.nextRetryAt IS NULL OR reminder.nextRetryAt <= :now)',
        {
          now: new Date(),
        },
      )
      .getMany();

    const results = {
      retried: 0,
      successful: 0,
      failed: 0,
    };

    for (const reminder of failedReminders) {
      const result = await this.sendMilestoneReminder(reminder);
      results.retried++;

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
    }

    this.logger.log(
      `Retry complete: ${results.successful} successful, ${results.failed} failed out of ${results.retried} retried`,
    );

    return results;
  }

  private prepareMilestoneReminderData(
    milestone: Milestone,
    reminder: MilestoneReminder,
  ): MilestoneReminderEmailData {
    const daysUntilDue = milestone.getDaysUntilDue();
    const isOverdue = daysUntilDue < 0;

    return {
      studentName: milestone.student.email.split('@')[0], // Fallback name from email
      studentEmail: milestone.student.email,
      milestoneTitle: milestone.title,
      milestoneDescription: milestone.description,
      dueDate: milestone.dueDate.toLocaleDateString(),
      daysUntilDue: Math.abs(daysUntilDue),
      projectTitle: milestone.project?.title,
      isOverdue,
      dashboardUrl: this.getDashboardUrl(),
    };
  }

  private prepareSupervisorEscalationData(
    milestone: Milestone,
    supervisor: User,
  ): SupervisorEscalationEmailData {
    const daysOverdue = Math.abs(milestone.getDaysUntilDue());

    return {
      supervisorName: supervisor.email.split('@')[0], // Fallback name from email
      supervisorEmail: supervisor.email,
      studentName: milestone.student.email.split('@')[0],
      milestoneTitle: milestone.title,
      milestoneDescription: milestone.description,
      dueDate: milestone.dueDate.toLocaleDateString(),
      daysOverdue,
      projectTitle: milestone.project?.title,
      blockingReason: milestone.blockingReason || undefined,
      dashboardUrl: this.getDashboardUrl(),
    };
  }

  private async sendStudentReminderEmail(
    data: MilestoneReminderEmailData,
  ): Promise<void> {
    const { html, text } = this.createStudentReminderTemplate(data);

    await this.emailService.sendEmail({
      to: data.studentEmail,
      subject: this.createReminderSubject(data),
      html,
      text,
    });
  }

  private async sendSupervisorEscalationEmail(
    data: SupervisorEscalationEmailData,
  ): Promise<void> {
    const { html, text } = this.createSupervisorEscalationTemplate(data);

    await this.emailService.sendEmail({
      to: data.supervisorEmail,
      subject: `Overdue Milestone Alert: ${data.milestoneTitle}`,
      html,
      text,
    });
  }

  private createReminderSubject(data: MilestoneReminderEmailData): string {
    if (data.isOverdue) {
      return `Overdue: ${data.milestoneTitle} - Action Required`;
    } else if (data.daysUntilDue === 1) {
      return `Due Tomorrow: ${data.milestoneTitle}`;
    } else {
      return `Reminder: ${data.milestoneTitle} due in ${data.daysUntilDue} days`;
    }
  }

  private createStudentReminderTemplate(data: MilestoneReminderEmailData): {
    html: string;
    text: string;
  } {
    const urgencyClass = data.isOverdue
      ? 'overdue'
      : data.daysUntilDue <= 1
        ? 'urgent'
        : 'normal';
    const statusMessage = data.isOverdue
      ? `This milestone is ${data.daysUntilDue} days overdue!`
      : `This milestone is due in ${data.daysUntilDue} day${data.daysUntilDue !== 1 ? 's' : ''}`;

    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Milestone Reminder</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                    <div style="background: ${urgencyClass === 'overdue' ? '#dc3545' : urgencyClass === 'urgent' ? '#fd7e14' : '#28a745'}; color: white; padding: 10px; border-radius: 4px; margin-bottom: 20px; text-align: center;">
                        <strong>${statusMessage}</strong>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 10px;">${data.milestoneTitle}</h2>
                    ${data.projectTitle ? `<p style="color: #666; margin-bottom: 15px;"><strong>Project:</strong> ${data.projectTitle}</p>` : ''}
                    
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #333;"><strong>Description:</strong></p>
                        <p style="margin: 10px 0 0 0; color: #666;">${data.milestoneDescription}</p>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #333;"><strong>Due Date:</strong> ${data.dueDate}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${data.dashboardUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                            View in Dashboard
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 20px; color: #666; font-size: 14px;">
                        <p><strong>Next Steps:</strong></p>
                        <ul>
                            <li>Review your milestone progress</li>
                            <li>Update your status if you've made progress</li>
                            <li>Add notes about any challenges or blockers</li>
                            <li>Contact your supervisor if you need assistance</li>
                        </ul>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>This is an automated reminder from the FYP Platform.</p>
                </div>
            </div>
        `;

    const text = `
MILESTONE REMINDER

${statusMessage}

Milestone: ${data.milestoneTitle}
${data.projectTitle ? `Project: ${data.projectTitle}` : ''}
Due Date: ${data.dueDate}

Description:
${data.milestoneDescription}

Next Steps:
- Review your milestone progress
- Update your status if you've made progress
- Add notes about any challenges or blockers
- Contact your supervisor if you need assistance

View in Dashboard: ${data.dashboardUrl}

This is an automated reminder from the FYP Platform.
        `;

    return { html, text };
  }

  private createSupervisorEscalationTemplate(
    data: SupervisorEscalationEmailData,
  ): { html: string; text: string } {
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">⚠️ Overdue Milestone Alert</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                    <div style="background: #dc3545; color: white; padding: 10px; border-radius: 4px; margin-bottom: 20px; text-align: center;">
                        <strong>Student milestone is ${data.daysOverdue} days overdue</strong>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 20px;">Student Needs Attention</h2>
                    
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                        <p style="margin: 0; color: #333;"><strong>Student:</strong> ${data.studentName}</p>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                        <p style="margin: 0; color: #333;"><strong>Milestone:</strong> ${data.milestoneTitle}</p>
                        ${data.projectTitle ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>Project:</strong> ${data.projectTitle}</p>` : ''}
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                        <p style="margin: 0; color: #333;"><strong>Original Due Date:</strong> ${data.dueDate}</p>
                        <p style="margin: 10px 0 0 0; color: #dc3545;"><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
                    </div>
                    
                    ${
                      data.blockingReason
                        ? `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                        <p style="margin: 0; color: #856404;"><strong>Blocking Reason:</strong></p>
                        <p style="margin: 10px 0 0 0; color: #856404;">${data.blockingReason}</p>
                    </div>
                    `
                        : ''
                    }
                    
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #333;"><strong>Description:</strong></p>
                        <p style="margin: 10px 0 0 0; color: #666;">${data.milestoneDescription}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${data.dashboardUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                            View Student Progress
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 20px; color: #666; font-size: 14px;">
                        <p><strong>Recommended Actions:</strong></p>
                        <ul>
                            <li>Contact the student to discuss the delay</li>
                            <li>Review any blocking issues or challenges</li>
                            <li>Provide guidance or adjust timeline if necessary</li>
                            <li>Update milestone status or add supervisor notes</li>
                        </ul>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>This is an automated escalation from the FYP Platform.</p>
                </div>
            </div>
        `;

    const text = `
OVERDUE MILESTONE ALERT

Student milestone is ${data.daysOverdue} days overdue

Student: ${data.studentName}
Milestone: ${data.milestoneTitle}
${data.projectTitle ? `Project: ${data.projectTitle}` : ''}
Original Due Date: ${data.dueDate}
Days Overdue: ${data.daysOverdue}

${data.blockingReason ? `Blocking Reason: ${data.blockingReason}` : ''}

Description:
${data.milestoneDescription}

Recommended Actions:
- Contact the student to discuss the delay
- Review any blocking issues or challenges
- Provide guidance or adjust timeline if necessary
- Update milestone status or add supervisor notes

View Student Progress: ${data.dashboardUrl}

This is an automated escalation from the FYP Platform.
        `;

    return { html, text };
  }

  private getDashboardUrl(): string {
    // This should come from configuration
    return 'http://localhost:3000/dashboard';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
