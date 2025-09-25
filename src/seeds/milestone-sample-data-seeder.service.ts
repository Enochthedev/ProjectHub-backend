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

@Injectable()
export class MilestoneSampleDataSeederService {
  private readonly logger = new Logger(MilestoneSampleDataSeederService.name);

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

  async seedSampleMilestones(): Promise<void> {
    this.logger.log('Seeding sample milestone data...');

    try {
      // Get sample students and projects
      const students = await this.userRepository.find({
        where: { role: UserRole.STUDENT },
        take: 5,
      });

      const projects = await this.projectRepository.find({
        take: 10,
      });

      if (students.length === 0) {
        this.logger.warn('No students found. Skipping milestone seeding.');
        return;
      }

      // Create sample milestones for each student
      for (const student of students) {
        await this.createSampleMilestonesForStudent(student, projects);
      }

      this.logger.log('Sample milestone data seeding completed successfully');
    } catch (error) {
      this.logger.error('Sample milestone data seeding failed', error);
      throw error;
    }
  }

  private async createSampleMilestonesForStudent(
    student: User,
    projects: Project[],
  ): Promise<void> {
    const project = projects[Math.floor(Math.random() * projects.length)];

    // Create a set of realistic milestones for a student project
    const sampleMilestones = [
      {
        title: 'Project Proposal and Literature Review',
        description:
          'Complete project proposal with comprehensive literature review covering recent advances in the field. Define problem statement, objectives, and methodology.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        status: MilestoneStatus.COMPLETED,
        priority: Priority.HIGH,
        estimatedHours: 40,
        actualHours: 42,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        title: 'System Architecture and Design',
        description:
          'Design system architecture, create UML diagrams, and establish technical specifications. Include database design and API specifications.',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        status: MilestoneStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        estimatedHours: 35,
        actualHours: 20,
      },
      {
        title: 'Core Implementation Phase 1',
        description:
          'Implement core system components including user authentication, basic CRUD operations, and database integration.',
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
        status: MilestoneStatus.NOT_STARTED,
        priority: Priority.HIGH,
        estimatedHours: 60,
        actualHours: 0,
      },
      {
        title: 'Advanced Features Implementation',
        description:
          'Implement advanced features including real-time functionality, advanced algorithms, and third-party integrations.',
        dueDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000), // 6 weeks from now
        status: MilestoneStatus.NOT_STARTED,
        priority: Priority.MEDIUM,
        estimatedHours: 50,
        actualHours: 0,
      },
      {
        title: 'Testing and Quality Assurance',
        description:
          'Comprehensive testing including unit tests, integration tests, and user acceptance testing. Performance optimization and bug fixes.',
        dueDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000), // 8 weeks from now
        status: MilestoneStatus.NOT_STARTED,
        priority: Priority.HIGH,
        estimatedHours: 35,
        actualHours: 0,
      },
      {
        title: 'Documentation and Final Presentation',
        description:
          'Complete technical documentation, user guides, and prepare final presentation. Submit final project deliverables.',
        dueDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000), // 10 weeks from now
        status: MilestoneStatus.NOT_STARTED,
        priority: Priority.CRITICAL,
        estimatedHours: 30,
        actualHours: 0,
      },
    ];

    for (const milestoneData of sampleMilestones) {
      const existingMilestone = await this.milestoneRepository.findOne({
        where: {
          title: milestoneData.title,
          studentId: student.id,
        },
      });

      if (!existingMilestone) {
        const milestone = this.milestoneRepository.create({
          ...milestoneData,
          student,
          studentId: student.id,
          project: project || null,
          projectId: project?.id || null,
        });

        const savedMilestone = await this.milestoneRepository.save(milestone);

        // Add sample notes for completed and in-progress milestones
        if (savedMilestone.status === MilestoneStatus.COMPLETED) {
          await this.createSampleNotesForMilestone(savedMilestone, student);
        } else if (savedMilestone.status === MilestoneStatus.IN_PROGRESS) {
          await this.createProgressNotesForMilestone(savedMilestone, student);
        }

        // Create reminders for future milestones
        if (savedMilestone.status === MilestoneStatus.NOT_STARTED) {
          await this.createRemindersForMilestone(savedMilestone);
        }

        this.logger.log(
          `Created milestone: ${milestoneData.title} for student: ${student.email}`,
        );
      }
    }
  }

  private async createSampleNotesForMilestone(
    milestone: Milestone,
    author: User,
  ): Promise<void> {
    const sampleNotes = [
      {
        content:
          'Started working on the literature review. Found several relevant papers on recent advances in the field.',
        type: NoteType.PROGRESS,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
      {
        content:
          'Completed initial draft of problem statement. Need to refine the research objectives based on supervisor feedback.',
        type: NoteType.PROGRESS,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        content:
          'Incorporated supervisor feedback and finalized the project proposal. Literature review is comprehensive and covers all major approaches.',
        type: NoteType.PROGRESS,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];

    for (const noteData of sampleNotes) {
      const note = this.milestoneNoteRepository.create({
        ...noteData,
        milestone,
        milestoneId: milestone.id,
        author,
        authorId: author.id,
      });

      await this.milestoneNoteRepository.save(note);
    }
  }

  private async createProgressNotesForMilestone(
    milestone: Milestone,
    author: User,
  ): Promise<void> {
    const progressNotes = [
      {
        content:
          'Started working on system architecture design. Created initial component diagrams and identified key modules.',
        type: NoteType.PROGRESS,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        content:
          'Completed database schema design. Working on API specifications and interface definitions.',
        type: NoteType.PROGRESS,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    for (const noteData of progressNotes) {
      const note = this.milestoneNoteRepository.create({
        ...noteData,
        milestone,
        milestoneId: milestone.id,
        author,
        authorId: author.id,
      });

      await this.milestoneNoteRepository.save(note);
    }
  }

  private async createRemindersForMilestone(
    milestone: Milestone,
  ): Promise<void> {
    const reminderTypes = [
      { type: ReminderType.EMAIL, daysBefore: 7 },
      { type: ReminderType.EMAIL, daysBefore: 3 },
      { type: ReminderType.EMAIL, daysBefore: 1 },
    ];

    for (const reminderData of reminderTypes) {
      const reminder = this.milestoneReminderRepository.create({
        milestone,
        milestoneId: milestone.id,
        reminderType: reminderData.type,
        daysBefore: reminderData.daysBefore,
        sent: false,
      });

      await this.milestoneReminderRepository.save(reminder);
    }
  }

  async seedBlockedMilestoneExample(): Promise<void> {
    this.logger.log('Creating blocked milestone example...');

    const student = await this.userRepository.findOne({
      where: { role: UserRole.STUDENT },
    });

    if (!student) {
      this.logger.warn('No student found for blocked milestone example.');
      return;
    }

    const blockedMilestone = this.milestoneRepository.create({
      title: 'API Integration with External Service',
      description:
        'Integrate with third-party payment processing API and implement error handling for various payment scenarios.',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      status: MilestoneStatus.BLOCKED,
      priority: Priority.HIGH,
      estimatedHours: 25,
      actualHours: 15,
      blockingReason:
        'Waiting for API credentials from external service provider. Support ticket submitted but no response yet.',
      student,
      studentId: student.id,
    });

    const savedBlockedMilestone =
      await this.milestoneRepository.save(blockedMilestone);

    // Add notes explaining the blocking issue
    const blockingNote = this.milestoneNoteRepository.create({
      content:
        'Milestone blocked due to external dependency. Contacted service provider support team and escalated to supervisor for assistance.',
      type: NoteType.ISSUE,
      milestone: savedBlockedMilestone,
      milestoneId: savedBlockedMilestone.id,
      author: student,
      authorId: student.id,
    });

    await this.milestoneNoteRepository.save(blockingNote);

    this.logger.log('Created blocked milestone example');
  }

  async seedOverdueMilestoneExample(): Promise<void> {
    this.logger.log('Creating overdue milestone example...');

    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      take: 2,
    });
    const student = students[1] || students[0]; // Get second student or first if only one exists

    if (!student) {
      this.logger.warn('No student found for overdue milestone example.');
      return;
    }

    const overdueMilestone = this.milestoneRepository.create({
      title: 'Unit Testing Implementation',
      description:
        'Implement comprehensive unit tests for all core modules with at least 80% code coverage.',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
      status: MilestoneStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      estimatedHours: 30,
      actualHours: 18,
      student,
      studentId: student.id,
    });

    const savedOverdueMilestone =
      await this.milestoneRepository.save(overdueMilestone);

    // Add progress notes
    const progressNote = this.milestoneNoteRepository.create({
      content:
        'Making progress on unit tests. Completed tests for authentication module. Working on database layer tests.',
      type: NoteType.PROGRESS,
      milestone: savedOverdueMilestone,
      milestoneId: savedOverdueMilestone.id,
      author: student,
      authorId: student.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });

    await this.milestoneNoteRepository.save(progressNote);

    this.logger.log('Created overdue milestone example');
  }
}
