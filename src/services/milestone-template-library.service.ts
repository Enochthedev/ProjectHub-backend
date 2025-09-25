import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { User } from '../entities/user.entity';
import { ProjectType, Priority } from '../common/enums';
import {
  TemplateMilestone,
  TemplateConfiguration,
} from '../entities/interfaces/template-milestone.interface';

export interface MilestoneTemplateLibraryServiceInterface {
  initializeDefaultTemplates(adminUserId: string): Promise<MilestoneTemplate[]>;
  getAIMLTemplates(): TemplateMilestone[];
  getWebDevelopmentTemplates(): TemplateMilestone[];
  getMobileAppTemplates(): TemplateMilestone[];
  getResearchProjectTemplates(): TemplateMilestone[];
  getGroupProjectTemplates(): TemplateMilestone[];
  getCybersecurityTemplates(): TemplateMilestone[];
  getDataScienceTemplates(): TemplateMilestone[];
  getGameDevelopmentTemplates(): TemplateMilestone[];
  createTemplateFromLibrary(
    specialization: string,
    projectType: ProjectType,
    adminUserId: string,
  ): Promise<MilestoneTemplate>;
}

@Injectable()
export class MilestoneTemplateLibraryService
  implements MilestoneTemplateLibraryServiceInterface
{
  private readonly logger = new Logger(MilestoneTemplateLibraryService.name);

  constructor(
    @InjectRepository(MilestoneTemplate)
    private readonly templateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async initializeDefaultTemplates(
    adminUserId: string,
  ): Promise<MilestoneTemplate[]> {
    this.logger.log('Initializing default template library');

    const admin = await this.userRepository.findOne({
      where: { id: adminUserId },
    });

    if (!admin) {
      throw new Error('Admin user not found');
    }

    const templates: Partial<MilestoneTemplate>[] = [
      // AI/ML Individual Project
      {
        name: 'AI/ML Individual Project',
        description:
          'Standard template for individual AI/ML projects including research, implementation, and evaluation phases',
        specialization: 'Artificial Intelligence',
        projectType: ProjectType.INDIVIDUAL,
        milestoneItems: this.getAIMLTemplates(),
        configuration: this.createStandardConfiguration([
          'Literature Review',
          'Final Report',
        ]),
        estimatedDurationWeeks: 16,
        tags: ['ai', 'ml', 'research', 'individual'],
        createdById: adminUserId,
      },

      // Web Development Individual Project
      {
        name: 'Web Development Individual Project',
        description:
          'Comprehensive template for full-stack web development projects',
        specialization: 'Web Development',
        projectType: ProjectType.INDIVIDUAL,
        milestoneItems: this.getWebDevelopmentTemplates(),
        configuration: this.createStandardConfiguration([
          'Project Setup',
          'Final Deployment',
        ]),
        estimatedDurationWeeks: 14,
        tags: ['web', 'frontend', 'backend', 'individual'],
        createdById: adminUserId,
      },

      // Mobile App Individual Project
      {
        name: 'Mobile App Individual Project',
        description:
          'Template for native or cross-platform mobile application development',
        specialization: 'Mobile Development',
        projectType: ProjectType.INDIVIDUAL,
        milestoneItems: this.getMobileAppTemplates(),
        configuration: this.createStandardConfiguration([
          'App Design',
          'App Store Submission',
        ]),
        estimatedDurationWeeks: 12,
        tags: ['mobile', 'app', 'ios', 'android', 'individual'],
        createdById: adminUserId,
      },

      // Research Project
      {
        name: 'Research Project Template',
        description:
          'Academic research project with literature review, methodology, and publication phases',
        specialization: 'Computer Science Research',
        projectType: ProjectType.RESEARCH,
        milestoneItems: this.getResearchProjectTemplates(),
        configuration: this.createResearchConfiguration(),
        estimatedDurationWeeks: 20,
        tags: ['research', 'academic', 'publication', 'methodology'],
        createdById: adminUserId,
      },

      // Group Project
      {
        name: 'Group Software Project',
        description:
          'Collaborative software development project template with team coordination milestones',
        specialization: 'Software Engineering',
        projectType: ProjectType.GROUP,
        milestoneItems: this.getGroupProjectTemplates(),
        configuration: this.createGroupConfiguration(),
        estimatedDurationWeeks: 16,
        tags: ['group', 'collaboration', 'software', 'teamwork'],
        createdById: adminUserId,
      },

      // Cybersecurity Project
      {
        name: 'Cybersecurity Project',
        description:
          'Security-focused project including threat analysis, implementation, and testing',
        specialization: 'Cybersecurity',
        projectType: ProjectType.INDIVIDUAL,
        milestoneItems: this.getCybersecurityTemplates(),
        configuration: this.createStandardConfiguration([
          'Security Analysis',
          'Penetration Testing',
        ]),
        estimatedDurationWeeks: 14,
        tags: ['security', 'cybersecurity', 'penetration-testing', 'analysis'],
        createdById: adminUserId,
      },

      // Data Science Project
      {
        name: 'Data Science Project',
        description:
          'End-to-end data science project from data collection to model deployment',
        specialization: 'Data Science',
        projectType: ProjectType.INDIVIDUAL,
        milestoneItems: this.getDataScienceTemplates(),
        configuration: this.createStandardConfiguration([
          'Data Collection',
          'Model Deployment',
        ]),
        estimatedDurationWeeks: 15,
        tags: [
          'data-science',
          'analytics',
          'machine-learning',
          'visualization',
        ],
        createdById: adminUserId,
      },

      // Game Development Project
      {
        name: 'Game Development Project',
        description:
          'Complete game development lifecycle from concept to release',
        specialization: 'Game Development',
        projectType: ProjectType.INDIVIDUAL,
        milestoneItems: this.getGameDevelopmentTemplates(),
        configuration: this.createStandardConfiguration([
          'Game Design Document',
          'Game Release',
        ]),
        estimatedDurationWeeks: 16,
        tags: ['game', 'development', 'graphics', 'gameplay'],
        createdById: adminUserId,
      },
    ];

    const createdTemplates: MilestoneTemplate[] = [];

    for (const templateData of templates) {
      // Check if template already exists
      const existingTemplate = await this.templateRepository.findOne({
        where: {
          name: templateData.name,
          specialization: templateData.specialization,
        },
      });

      if (!existingTemplate) {
        const template = this.templateRepository.create(templateData);
        const savedTemplate = await this.templateRepository.save(template);
        createdTemplates.push(savedTemplate);
        this.logger.log(`Created template: ${templateData.name}`);
      } else {
        this.logger.log(`Template already exists: ${templateData.name}`);
        createdTemplates.push(existingTemplate);
      }
    }

    this.logger.log(`Initialized ${createdTemplates.length} templates`);
    return createdTemplates;
  }

  getAIMLTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Literature Review',
        description:
          'Comprehensive review of existing research and methodologies in the chosen AI/ML domain',
        daysFromStart: 14,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: [],
        tags: ['research', 'literature'],
      },
      {
        title: 'Problem Definition & Dataset Selection',
        description:
          'Define the specific problem to solve and identify/collect appropriate datasets',
        daysFromStart: 28,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Literature Review'],
        tags: ['problem-definition', 'data'],
      },
      {
        title: 'Data Preprocessing & EDA',
        description:
          'Clean, preprocess data and perform exploratory data analysis',
        daysFromStart: 42,
        priority: Priority.HIGH,
        estimatedHours: 35,
        dependencies: ['Problem Definition & Dataset Selection'],
        tags: ['data-preprocessing', 'eda'],
      },
      {
        title: 'Model Architecture Design',
        description:
          'Design and plan the AI/ML model architecture and approach',
        daysFromStart: 56,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Data Preprocessing & EDA'],
        tags: ['architecture', 'design'],
      },
      {
        title: 'Model Implementation',
        description:
          'Implement the designed model using appropriate frameworks',
        daysFromStart: 77,
        priority: Priority.HIGH,
        estimatedHours: 50,
        dependencies: ['Model Architecture Design'],
        tags: ['implementation', 'coding'],
      },
      {
        title: 'Model Training & Optimization',
        description:
          'Train the model and optimize hyperparameters for best performance',
        daysFromStart: 91,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Model Implementation'],
        tags: ['training', 'optimization'],
      },
      {
        title: 'Model Evaluation & Testing',
        description:
          'Evaluate model performance using appropriate metrics and test sets',
        daysFromStart: 105,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Model Training & Optimization'],
        tags: ['evaluation', 'testing'],
      },
      {
        title: 'Final Report',
        description:
          'Complete comprehensive report documenting methodology, results, and conclusions',
        daysFromStart: 112,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Model Evaluation & Testing'],
        tags: ['documentation', 'report'],
      },
    ];
  }

  getWebDevelopmentTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Project Setup',
        description:
          'Initialize project structure, set up development environment and version control',
        daysFromStart: 3,
        priority: Priority.HIGH,
        estimatedHours: 8,
        dependencies: [],
        tags: ['setup', 'environment'],
      },
      {
        title: 'Requirements Analysis & Design',
        description:
          'Analyze requirements and create UI/UX designs and system architecture',
        daysFromStart: 10,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Project Setup'],
        tags: ['requirements', 'design', 'architecture'],
      },
      {
        title: 'Database Design & Setup',
        description:
          'Design database schema and set up database with initial migrations',
        daysFromStart: 17,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Requirements Analysis & Design'],
        tags: ['database', 'schema'],
      },
      {
        title: 'Backend API Development',
        description: 'Develop RESTful APIs and server-side logic',
        daysFromStart: 35,
        priority: Priority.HIGH,
        estimatedHours: 45,
        dependencies: ['Database Design & Setup'],
        tags: ['backend', 'api'],
      },
      {
        title: 'Frontend Development',
        description: 'Implement user interface and client-side functionality',
        daysFromStart: 56,
        priority: Priority.HIGH,
        estimatedHours: 50,
        dependencies: ['Backend API Development'],
        tags: ['frontend', 'ui'],
      },
      {
        title: 'Integration & Testing',
        description:
          'Integrate frontend and backend, implement comprehensive testing',
        daysFromStart: 77,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Frontend Development'],
        tags: ['integration', 'testing'],
      },
      {
        title: 'Security Implementation',
        description:
          'Implement authentication, authorization, and security measures',
        daysFromStart: 84,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Integration & Testing'],
        tags: ['security', 'authentication'],
      },
      {
        title: 'Final Deployment',
        description:
          'Deploy application to production environment and configure CI/CD',
        daysFromStart: 98,
        priority: Priority.HIGH,
        estimatedHours: 15,
        dependencies: ['Security Implementation'],
        tags: ['deployment', 'production'],
      },
    ];
  }

  getMobileAppTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'App Design',
        description:
          'Create app wireframes, mockups, and user experience design',
        daysFromStart: 7,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: [],
        tags: ['design', 'ux', 'wireframes'],
      },
      {
        title: 'Development Environment Setup',
        description: 'Set up development tools, SDKs, and project structure',
        daysFromStart: 10,
        priority: Priority.HIGH,
        estimatedHours: 10,
        dependencies: [],
        tags: ['setup', 'environment', 'sdk'],
      },
      {
        title: 'Core App Structure',
        description: 'Implement basic app navigation and core architecture',
        daysFromStart: 21,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Development Environment Setup', 'App Design'],
        tags: ['architecture', 'navigation'],
      },
      {
        title: 'Feature Implementation Phase 1',
        description: 'Implement core features and basic functionality',
        daysFromStart: 42,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Core App Structure'],
        tags: ['features', 'implementation'],
      },
      {
        title: 'Feature Implementation Phase 2',
        description: 'Implement advanced features and integrations',
        daysFromStart: 63,
        priority: Priority.MEDIUM,
        estimatedHours: 35,
        dependencies: ['Feature Implementation Phase 1'],
        tags: ['features', 'integration'],
      },
      {
        title: 'Testing & Bug Fixes',
        description:
          'Comprehensive testing on multiple devices and bug resolution',
        daysFromStart: 77,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Feature Implementation Phase 2'],
        tags: ['testing', 'debugging'],
      },
      {
        title: 'App Store Preparation',
        description:
          'Prepare app store listings, screenshots, and submission materials',
        daysFromStart: 84,
        priority: Priority.MEDIUM,
        estimatedHours: 15,
        dependencies: ['Testing & Bug Fixes'],
        tags: ['app-store', 'marketing'],
      },
      {
        title: 'App Store Submission',
        description:
          'Submit app to relevant app stores and handle review process',
        daysFromStart: 84,
        priority: Priority.HIGH,
        estimatedHours: 10,
        dependencies: ['App Store Preparation'],
        tags: ['submission', 'release'],
      },
    ];
  }

  getResearchProjectTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Research Proposal',
        description:
          'Develop comprehensive research proposal with objectives and methodology',
        daysFromStart: 14,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: [],
        tags: ['proposal', 'methodology'],
      },
      {
        title: 'Literature Review',
        description: 'Extensive review of existing literature and related work',
        daysFromStart: 35,
        priority: Priority.HIGH,
        estimatedHours: 50,
        dependencies: ['Research Proposal'],
        tags: ['literature', 'research'],
      },
      {
        title: 'Methodology Development',
        description:
          'Develop detailed research methodology and experimental design',
        daysFromStart: 49,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Literature Review'],
        tags: ['methodology', 'experimental-design'],
      },
      {
        title: 'Data Collection/Experiment Setup',
        description:
          'Collect data or set up experiments according to methodology',
        daysFromStart: 70,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Methodology Development'],
        tags: ['data-collection', 'experiments'],
      },
      {
        title: 'Data Analysis',
        description:
          'Analyze collected data using appropriate statistical methods',
        daysFromStart: 98,
        priority: Priority.HIGH,
        estimatedHours: 45,
        dependencies: ['Data Collection/Experiment Setup'],
        tags: ['analysis', 'statistics'],
      },
      {
        title: 'Results Interpretation',
        description: 'Interpret results and draw conclusions from analysis',
        daysFromStart: 119,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Data Analysis'],
        tags: ['results', 'interpretation'],
      },
      {
        title: 'Thesis/Paper Writing',
        description: 'Write comprehensive thesis or research paper',
        daysFromStart: 133,
        priority: Priority.HIGH,
        estimatedHours: 60,
        dependencies: ['Results Interpretation'],
        tags: ['writing', 'thesis', 'paper'],
      },
      {
        title: 'Peer Review & Revision',
        description: 'Submit for peer review and incorporate feedback',
        daysFromStart: 140,
        priority: Priority.MEDIUM,
        estimatedHours: 20,
        dependencies: ['Thesis/Paper Writing'],
        tags: ['review', 'revision'],
      },
    ];
  }

  getGroupProjectTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Team Formation & Planning',
        description: 'Form team, establish roles, and create project plan',
        daysFromStart: 7,
        priority: Priority.HIGH,
        estimatedHours: 15,
        dependencies: [],
        tags: ['team', 'planning', 'roles'],
      },
      {
        title: 'Requirements Gathering',
        description: 'Collaborate to gather and document project requirements',
        daysFromStart: 14,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Team Formation & Planning'],
        tags: ['requirements', 'documentation'],
      },
      {
        title: 'System Architecture Design',
        description:
          'Design overall system architecture and component interfaces',
        daysFromStart: 28,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Requirements Gathering'],
        tags: ['architecture', 'design'],
      },
      {
        title: 'Task Distribution & Setup',
        description:
          'Distribute tasks among team members and set up development environment',
        daysFromStart: 35,
        priority: Priority.HIGH,
        estimatedHours: 10,
        dependencies: ['System Architecture Design'],
        tags: ['distribution', 'setup'],
      },
      {
        title: 'Sprint 1 - Core Features',
        description:
          'Implement core system features in first development sprint',
        daysFromStart: 56,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Task Distribution & Setup'],
        tags: ['sprint', 'core-features'],
      },
      {
        title: 'Sprint 2 - Advanced Features',
        description: 'Implement advanced features and integrations',
        daysFromStart: 77,
        priority: Priority.HIGH,
        estimatedHours: 35,
        dependencies: ['Sprint 1 - Core Features'],
        tags: ['sprint', 'advanced-features'],
      },
      {
        title: 'Integration & Testing',
        description:
          'Integrate all components and perform comprehensive testing',
        daysFromStart: 91,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Sprint 2 - Advanced Features'],
        tags: ['integration', 'testing'],
      },
      {
        title: 'Documentation & Presentation',
        description:
          'Complete project documentation and prepare final presentation',
        daysFromStart: 105,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Integration & Testing'],
        tags: ['documentation', 'presentation'],
      },
      {
        title: 'Final Delivery',
        description: 'Deliver final project and conduct team retrospective',
        daysFromStart: 112,
        priority: Priority.HIGH,
        estimatedHours: 10,
        dependencies: ['Documentation & Presentation'],
        tags: ['delivery', 'retrospective'],
      },
    ];
  }

  getCybersecurityTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Security Analysis',
        description: 'Conduct initial security analysis and threat modeling',
        daysFromStart: 14,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: [],
        tags: ['analysis', 'threat-modeling'],
      },
      {
        title: 'Vulnerability Assessment',
        description:
          'Perform comprehensive vulnerability assessment of target systems',
        daysFromStart: 28,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Security Analysis'],
        tags: ['vulnerability', 'assessment'],
      },
      {
        title: 'Security Tool Development',
        description:
          'Develop or configure security tools for testing and monitoring',
        daysFromStart: 49,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Vulnerability Assessment'],
        tags: ['tools', 'development'],
      },
      {
        title: 'Penetration Testing',
        description:
          'Conduct controlled penetration testing to identify security weaknesses',
        daysFromStart: 70,
        priority: Priority.HIGH,
        estimatedHours: 35,
        dependencies: ['Security Tool Development'],
        tags: ['penetration-testing', 'security'],
      },
      {
        title: 'Security Implementation',
        description: 'Implement security measures and countermeasures',
        daysFromStart: 84,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Penetration Testing'],
        tags: ['implementation', 'countermeasures'],
      },
      {
        title: 'Security Validation',
        description: 'Validate implemented security measures through testing',
        daysFromStart: 91,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Security Implementation'],
        tags: ['validation', 'testing'],
      },
      {
        title: 'Security Report',
        description:
          'Compile comprehensive security report with findings and recommendations',
        daysFromStart: 98,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Security Validation'],
        tags: ['report', 'documentation'],
      },
    ];
  }

  getDataScienceTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Data Collection',
        description:
          'Identify, collect, and acquire relevant datasets for analysis',
        daysFromStart: 14,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: [],
        tags: ['data-collection', 'datasets'],
      },
      {
        title: 'Data Cleaning & Preprocessing',
        description: 'Clean, validate, and preprocess raw data for analysis',
        daysFromStart: 28,
        priority: Priority.HIGH,
        estimatedHours: 35,
        dependencies: ['Data Collection'],
        tags: ['cleaning', 'preprocessing'],
      },
      {
        title: 'Exploratory Data Analysis',
        description:
          'Perform comprehensive EDA to understand data patterns and relationships',
        daysFromStart: 42,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['Data Cleaning & Preprocessing'],
        tags: ['eda', 'analysis'],
      },
      {
        title: 'Feature Engineering',
        description: 'Create and select relevant features for modeling',
        daysFromStart: 56,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Exploratory Data Analysis'],
        tags: ['feature-engineering', 'selection'],
      },
      {
        title: 'Model Development',
        description: 'Develop and train machine learning models',
        daysFromStart: 77,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Feature Engineering'],
        tags: ['modeling', 'machine-learning'],
      },
      {
        title: 'Model Evaluation & Tuning',
        description: 'Evaluate model performance and optimize hyperparameters',
        daysFromStart: 91,
        priority: Priority.HIGH,
        estimatedHours: 25,
        dependencies: ['Model Development'],
        tags: ['evaluation', 'tuning'],
      },
      {
        title: 'Data Visualization & Reporting',
        description: 'Create visualizations and comprehensive analysis report',
        daysFromStart: 98,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Model Evaluation & Tuning'],
        tags: ['visualization', 'reporting'],
      },
      {
        title: 'Model Deployment',
        description:
          'Deploy model to production environment or create deployment package',
        daysFromStart: 105,
        priority: Priority.MEDIUM,
        estimatedHours: 20,
        dependencies: ['Data Visualization & Reporting'],
        tags: ['deployment', 'production'],
      },
    ];
  }

  getGameDevelopmentTemplates(): TemplateMilestone[] {
    return [
      {
        title: 'Game Design Document',
        description:
          'Create comprehensive game design document with mechanics and story',
        daysFromStart: 14,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: [],
        tags: ['design', 'documentation'],
      },
      {
        title: 'Technical Architecture',
        description:
          'Design technical architecture and select development tools',
        daysFromStart: 21,
        priority: Priority.HIGH,
        estimatedHours: 20,
        dependencies: ['Game Design Document'],
        tags: ['architecture', 'tools'],
      },
      {
        title: 'Core Game Mechanics',
        description: 'Implement core gameplay mechanics and systems',
        daysFromStart: 42,
        priority: Priority.HIGH,
        estimatedHours: 45,
        dependencies: ['Technical Architecture'],
        tags: ['mechanics', 'gameplay'],
      },
      {
        title: 'Art & Asset Creation',
        description:
          'Create or acquire game assets including graphics, sounds, and animations',
        daysFromStart: 56,
        priority: Priority.HIGH,
        estimatedHours: 40,
        dependencies: ['Core Game Mechanics'],
        tags: ['art', 'assets', 'graphics'],
      },
      {
        title: 'Level Design & Content',
        description: 'Design and implement game levels and content',
        daysFromStart: 77,
        priority: Priority.HIGH,
        estimatedHours: 35,
        dependencies: ['Art & Asset Creation'],
        tags: ['level-design', 'content'],
      },
      {
        title: 'User Interface & Menus',
        description: 'Implement game UI, menus, and user experience elements',
        daysFromStart: 91,
        priority: Priority.MEDIUM,
        estimatedHours: 25,
        dependencies: ['Level Design & Content'],
        tags: ['ui', 'menus', 'ux'],
      },
      {
        title: 'Testing & Polish',
        description: 'Comprehensive testing, bug fixes, and game polish',
        daysFromStart: 105,
        priority: Priority.HIGH,
        estimatedHours: 30,
        dependencies: ['User Interface & Menus'],
        tags: ['testing', 'polish', 'debugging'],
      },
      {
        title: 'Game Release',
        description:
          'Prepare and execute game release including distribution setup',
        daysFromStart: 112,
        priority: Priority.HIGH,
        estimatedHours: 15,
        dependencies: ['Testing & Polish'],
        tags: ['release', 'distribution'],
      },
    ];
  }

  async createTemplateFromLibrary(
    specialization: string,
    projectType: ProjectType,
    adminUserId: string,
  ): Promise<MilestoneTemplate> {
    let milestoneItems: TemplateMilestone[];
    let templateName: string;
    let description: string;
    let estimatedWeeks: number;
    let tags: string[];

    switch (specialization.toLowerCase()) {
      case 'artificial intelligence':
      case 'ai':
      case 'machine learning':
      case 'ml':
        milestoneItems = this.getAIMLTemplates();
        templateName = 'AI/ML Project';
        description = 'AI/ML project template';
        estimatedWeeks = 16;
        tags = ['ai', 'ml'];
        break;

      case 'web development':
      case 'web':
        milestoneItems = this.getWebDevelopmentTemplates();
        templateName = 'Web Development Project';
        description = 'Web development project template';
        estimatedWeeks = 14;
        tags = ['web', 'frontend', 'backend'];
        break;

      case 'mobile development':
      case 'mobile':
        milestoneItems = this.getMobileAppTemplates();
        templateName = 'Mobile App Project';
        description = 'Mobile application development template';
        estimatedWeeks = 12;
        tags = ['mobile', 'app'];
        break;

      case 'cybersecurity':
      case 'security':
        milestoneItems = this.getCybersecurityTemplates();
        templateName = 'Cybersecurity Project';
        description = 'Cybersecurity project template';
        estimatedWeeks = 14;
        tags = ['security', 'cybersecurity'];
        break;

      case 'data science':
      case 'data':
        milestoneItems = this.getDataScienceTemplates();
        templateName = 'Data Science Project';
        description = 'Data science project template';
        estimatedWeeks = 15;
        tags = ['data-science', 'analytics'];
        break;

      case 'game development':
      case 'game':
        milestoneItems = this.getGameDevelopmentTemplates();
        templateName = 'Game Development Project';
        description = 'Game development project template';
        estimatedWeeks = 16;
        tags = ['game', 'development'];
        break;

      default:
        throw new Error(
          `No template available for specialization: ${specialization}`,
        );
    }

    // Adjust for project type
    if (projectType === ProjectType.GROUP) {
      milestoneItems = this.getGroupProjectTemplates();
      templateName = `${templateName} (Group)`;
      description = `${description} for group projects`;
      tags.push('group');
    } else if (projectType === ProjectType.RESEARCH) {
      milestoneItems = this.getResearchProjectTemplates();
      templateName = `${templateName} (Research)`;
      description = `${description} for research projects`;
      estimatedWeeks = 20;
      tags.push('research');
    }

    const template = this.templateRepository.create({
      name: templateName,
      description,
      specialization,
      projectType,
      milestoneItems,
      configuration: this.createStandardConfiguration(),
      estimatedDurationWeeks: estimatedWeeks,
      tags,
      createdById: adminUserId,
    });

    return this.templateRepository.save(template);
  }

  private createStandardConfiguration(
    requiredMilestones: string[] = [],
  ): TemplateConfiguration {
    return {
      allowCustomization: true,
      minimumDurationWeeks: 8,
      maximumDurationWeeks: 24,
      requiredMilestones,
      optionalMilestones: [],
    };
  }

  private createResearchConfiguration(): TemplateConfiguration {
    return {
      allowCustomization: true,
      minimumDurationWeeks: 16,
      maximumDurationWeeks: 32,
      requiredMilestones: [
        'Research Proposal',
        'Literature Review',
        'Thesis/Paper Writing',
      ],
      optionalMilestones: ['Peer Review & Revision'],
    };
  }

  private createGroupConfiguration(): TemplateConfiguration {
    return {
      allowCustomization: true,
      minimumDurationWeeks: 12,
      maximumDurationWeeks: 20,
      requiredMilestones: ['Team Formation & Planning', 'Final Delivery'],
      optionalMilestones: ['Documentation & Presentation'],
    };
  }
}
