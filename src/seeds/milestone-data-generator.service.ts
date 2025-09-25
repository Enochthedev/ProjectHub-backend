import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Milestone,
  MilestoneNote,
  MilestoneReminder,
  User,
  Project,
} from '@/entities';
import {
  MilestoneStatus,
  Priority,
  UserRole,
  NoteType,
  ReminderType,
} from '@/common/enums';

interface DataGenerationOptions {
  studentCount: number;
  milestonesPerStudent: number;
  notesPerMilestone: number;
  includeReminders: boolean;
  includeOverdueItems: boolean;
  includeBlockedItems: boolean;
}

@Injectable()
export class MilestoneDataGeneratorService {
  private readonly logger = new Logger(MilestoneDataGeneratorService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneNote)
    private readonly milestoneNoteRepository: Repository<MilestoneNote>,
    @InjectRepository(MilestoneReminder)
    private readonly milestoneReminderRepository: Repository<MilestoneReminder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async generatePerformanceTestData(
    options: DataGenerationOptions,
  ): Promise<void> {
    this.logger.log(
      `Generating performance test data with options: ${JSON.stringify(options)}`,
    );

    try {
      const students = await this.getOrCreateTestStudents(options.studentCount);
      const projects = await this.projectRepository.find();

      let totalMilestones = 0;
      let totalNotes = 0;
      let totalReminders = 0;

      for (const student of students) {
        const milestones = await this.generateMilestonesForStudent(
          student,
          projects,
          options.milestonesPerStudent,
          options,
        );
        totalMilestones += milestones.length;

        for (const milestone of milestones) {
          if (options.notesPerMilestone > 0) {
            const notes = await this.generateNotesForMilestone(
              milestone,
              student,
              options.notesPerMilestone,
            );
            totalNotes += notes.length;
          }

          if (
            options.includeReminders &&
            milestone.status !== MilestoneStatus.COMPLETED
          ) {
            const reminders =
              await this.generateRemindersForMilestone(milestone);
            totalReminders += reminders.length;
          }
        }
      }

      this.logger.log(
        `Generated ${totalMilestones} milestones, ${totalNotes} notes, and ${totalReminders} reminders`,
      );
    } catch (error) {
      this.logger.error('Performance test data generation failed', error);
      throw error;
    }
  }

  private async getOrCreateTestStudents(count: number): Promise<User[]> {
    const existingStudents = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      take: count,
    });

    if (existingStudents.length >= count) {
      return existingStudents.slice(0, count);
    }

    // Create additional test students if needed
    const studentsToCreate = count - existingStudents.length;
    const newStudents: User[] = [];

    for (let i = 0; i < studentsToCreate; i++) {
      const student = this.userRepository.create({
        email: `test.student.${Date.now()}.${i}@ui.edu.ng`,
        password: 'hashed_test_password',
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isActive: true,
      });

      const savedStudent = await this.userRepository.save(student);
      newStudents.push(savedStudent);
    }

    return [...existingStudents, ...newStudents];
  }

  private async generateMilestonesForStudent(
    student: User,
    projects: Project[],
    count: number,
    options: DataGenerationOptions,
  ): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    const project =
      projects.length > 0
        ? projects[Math.floor(Math.random() * projects.length)]
        : null;

    for (let i = 0; i < count; i++) {
      const milestone = await this.createRandomMilestone(
        student,
        project,
        i,
        options,
        count,
      );
      milestones.push(milestone);
    }

    return milestones;
  }

  private async createRandomMilestone(
    student: User,
    project: Project | null,
    index: number,
    options: DataGenerationOptions,
    count: number,
  ): Promise<Milestone> {
    const milestoneTemplates = [
      {
        title: 'Requirements Analysis and Planning',
        description:
          'Analyze project requirements, create user stories, and develop project timeline.',
        estimatedHours: 25,
      },
      {
        title: 'System Architecture Design',
        description:
          'Design system architecture, create technical specifications, and plan implementation approach.',
        estimatedHours: 35,
      },
      {
        title: 'Database Design and Implementation',
        description:
          'Design database schema, implement data models, and establish relationships.',
        estimatedHours: 30,
      },
      {
        title: 'Core Feature Implementation',
        description:
          'Implement core application features and basic functionality.',
        estimatedHours: 60,
      },
      {
        title: 'User Interface Development',
        description:
          'Develop user interface components and implement responsive design.',
        estimatedHours: 45,
      },
      {
        title: 'API Integration and Testing',
        description:
          'Integrate external APIs, implement error handling, and conduct testing.',
        estimatedHours: 40,
      },
      {
        title: 'Security Implementation',
        description:
          'Implement security measures, authentication, and authorization.',
        estimatedHours: 35,
      },
      {
        title: 'Performance Optimization',
        description:
          'Optimize application performance, implement caching, and tune queries.',
        estimatedHours: 25,
      },
      {
        title: 'Testing and Quality Assurance',
        description:
          'Implement comprehensive testing suite and conduct quality assurance.',
        estimatedHours: 40,
      },
      {
        title: 'Documentation and Deployment',
        description:
          'Create technical documentation, user guides, and deploy application.',
        estimatedHours: 30,
      },
    ];

    const template = milestoneTemplates[index % milestoneTemplates.length];
    const baseDate = new Date();
    const daysOffset = (index + 1) * 14; // 2 weeks apart
    const dueDate = new Date(
      baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000,
    );

    // Determine status based on options and randomization
    let status = MilestoneStatus.NOT_STARTED;
    let completedAt: Date | null = null;
    let actualHours = 0;
    let blockingReason: string | null = null;

    const random = Math.random();
    if (index < count * 0.3) {
      // 30% completed
      status = MilestoneStatus.COMPLETED;
      completedAt = new Date(
        dueDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      );
      actualHours =
        template.estimatedHours + Math.floor((Math.random() - 0.5) * 20);
    } else if (index < count * 0.5) {
      // 20% in progress
      status = MilestoneStatus.IN_PROGRESS;
      actualHours = Math.floor(template.estimatedHours * Math.random() * 0.8);
    } else if (options.includeBlockedItems && random < 0.1) {
      // 10% blocked
      status = MilestoneStatus.BLOCKED;
      blockingReason = this.getRandomBlockingReason();
      actualHours = Math.floor(template.estimatedHours * Math.random() * 0.5);
    }

    // Make some milestones overdue if option is enabled
    if (
      options.includeOverdueItems &&
      status !== MilestoneStatus.COMPLETED &&
      random < 0.15
    ) {
      dueDate.setTime(
        dueDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000,
      ); // Up to 10 days overdue
    }

    const milestone = this.milestoneRepository.create({
      title: `${template.title} - ${student.email.split('@')[0]}`,
      description: template.description,
      dueDate,
      status,
      priority: this.getRandomPriority(),
      estimatedHours: template.estimatedHours,
      actualHours,
      completedAt,
      blockingReason,
      student,
      studentId: student.id,
      project,
      projectId: project?.id || null,
    });

    return await this.milestoneRepository.save(milestone);
  }

  private async generateNotesForMilestone(
    milestone: Milestone,
    author: User,
    count: number,
  ): Promise<MilestoneNote[]> {
    const notes: MilestoneNote[] = [];
    const noteTemplates = [
      'Started working on this milestone. Initial research and planning completed.',
      'Made good progress today. Implemented core functionality and basic structure.',
      'Encountered some technical challenges. Working on finding alternative solutions.',
      'Completed major component. Moving on to integration and testing phase.',
      'Conducted code review and refactoring. Improved performance and maintainability.',
      'Added comprehensive unit tests. Code coverage now meets project requirements.',
      'Integrated with external services. Handling edge cases and error scenarios.',
      'Optimized performance and fixed several bugs identified during testing.',
      'Updated documentation and prepared for milestone review with supervisor.',
      'Milestone completed successfully. All requirements met and deliverables ready.',
    ];

    for (let i = 0; i < count; i++) {
      const noteContent = noteTemplates[i % noteTemplates.length];
      const noteType = this.getRandomNoteType();

      // Create notes with realistic timestamps
      const createdAt = new Date(
        milestone.createdAt.getTime() +
          (i + 1) * (24 * 60 * 60 * 1000) +
          Math.random() * 12 * 60 * 60 * 1000, // Random time within the day
      );

      const note = this.milestoneNoteRepository.create({
        content: `${noteContent} (Note ${i + 1})`,
        type: noteType,
        milestone,
        milestoneId: milestone.id,
        author,
        authorId: author.id,
        createdAt,
      });

      const savedNote = await this.milestoneNoteRepository.save(note);
      notes.push(savedNote);
    }

    return notes;
  }

  private async generateRemindersForMilestone(
    milestone: Milestone,
  ): Promise<MilestoneReminder[]> {
    const reminders: MilestoneReminder[] = [];
    const reminderConfigs = [
      { type: ReminderType.EMAIL, daysBefore: 7 },
      { type: ReminderType.EMAIL, daysBefore: 3 },
      { type: ReminderType.EMAIL, daysBefore: 1 },
    ];

    for (const config of reminderConfigs) {
      const reminder = this.milestoneReminderRepository.create({
        milestone,
        milestoneId: milestone.id,
        reminderType: config.type,
        daysBefore: config.daysBefore,
        sent: false,
      });

      const savedReminder =
        await this.milestoneReminderRepository.save(reminder);
      reminders.push(savedReminder);
    }

    return reminders;
  }

  private getRandomPriority(): Priority {
    const priorities = [
      Priority.LOW,
      Priority.MEDIUM,
      Priority.HIGH,
      Priority.CRITICAL,
    ];
    const weights = [0.2, 0.5, 0.25, 0.05]; // Weighted distribution

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < priorities.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return priorities[i];
      }
    }

    return Priority.MEDIUM;
  }

  private getRandomNoteType(): NoteType {
    const types = [
      NoteType.PROGRESS,
      NoteType.ISSUE,
      NoteType.SOLUTION,
      NoteType.MEETING,
    ];
    const weights = [0.6, 0.2, 0.15, 0.05]; // Most notes are progress updates

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return types[i];
      }
    }

    return NoteType.PROGRESS;
  }

  private getRandomBlockingReason(): string {
    const reasons = [
      'Waiting for external API credentials from third-party service provider.',
      "Dependency on another team's component that is still in development.",
      'Hardware/infrastructure issues preventing proper testing environment setup.',
      'Waiting for supervisor approval on technical approach and architecture.',
      'External library compatibility issues requiring alternative solution research.',
      'Database migration conflicts requiring coordination with system administrators.',
      'Licensing issues with required software tools and libraries.',
      'Network connectivity problems affecting development and testing.',
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  async cleanupTestData(): Promise<void> {
    this.logger.log('Cleaning up test milestone data...');

    try {
      // Delete test milestones (cascade will handle notes and reminders)
      await this.milestoneRepository
        .createQueryBuilder()
        .delete()
        .where('title LIKE :pattern', { pattern: '%test.student.%' })
        .execute();

      // Delete test users
      await this.userRepository
        .createQueryBuilder()
        .delete()
        .where('email LIKE :pattern', { pattern: '%test.student.%' })
        .execute();

      this.logger.log('Test data cleanup completed');
    } catch (error) {
      this.logger.error('Test data cleanup failed', error);
      throw error;
    }
  }

  async generateLoadTestScenario(): Promise<void> {
    this.logger.log('Generating load test scenario...');

    const loadTestOptions: DataGenerationOptions = {
      studentCount: 100,
      milestonesPerStudent: 15,
      notesPerMilestone: 5,
      includeReminders: true,
      includeOverdueItems: true,
      includeBlockedItems: true,
    };

    await this.generatePerformanceTestData(loadTestOptions);
    this.logger.log('Load test scenario generation completed');
  }

  async generateStressTestScenario(): Promise<void> {
    this.logger.log('Generating stress test scenario...');

    const stressTestOptions: DataGenerationOptions = {
      studentCount: 500,
      milestonesPerStudent: 25,
      notesPerMilestone: 10,
      includeReminders: true,
      includeOverdueItems: true,
      includeBlockedItems: true,
    };

    await this.generatePerformanceTestData(stressTestOptions);
    this.logger.log('Stress test scenario generation completed');
  }
}
