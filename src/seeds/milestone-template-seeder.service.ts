import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneTemplate, User } from '@/entities';
import { ProjectType, Priority, UserRole } from '@/common/enums';
import { SPECIALIZATIONS } from '@/common/constants/specializations';
import {
  TemplateMilestone,
  TemplateConfiguration,
} from '@/entities/interfaces/template-milestone.interface';

@Injectable()
export class MilestoneTemplateSeederService {
  private readonly logger = new Logger(MilestoneTemplateSeederService.name);

  constructor(
    @InjectRepository(MilestoneTemplate)
    private readonly templateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seedMilestoneTemplates(): Promise<void> {
    this.logger.log('Seeding milestone templates...');

    try {
      // Get admin user for template creation
      const adminUser = await this.getOrCreateAdminUser();

      // Seed templates for each specialization and project type
      await this.seedAIMLTemplates(adminUser);
      await this.seedWebDevelopmentTemplates(adminUser);
      await this.seedMobileAppTemplates(adminUser);
      await this.seedCybersecurityTemplates(adminUser);
      await this.seedDataScienceTemplates(adminUser);
      await this.seedCloudDevOpsTemplates(adminUser);

      this.logger.log('Milestone template seeding completed successfully');
    } catch (error) {
      this.logger.error('Milestone template seeding failed', error);
      throw error;
    }
  }

  private async getOrCreateAdminUser(): Promise<User> {
    let adminUser = await this.userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });

    if (!adminUser) {
      adminUser = this.userRepository.create({
        email: 'admin@ui.edu.ng',
        password: 'hashed_password', // This would be properly hashed in real implementation
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isActive: true,
      });
      adminUser = await this.userRepository.save(adminUser);
    }

    return adminUser;
  }

  private async seedAIMLTemplates(adminUser: User): Promise<void> {
    const specialization = 'Artificial Intelligence & Machine Learning';

    // Individual AI/ML Project Template
    const individualAITemplate: Partial<MilestoneTemplate> = {
      name: 'AI/ML Individual Project Template',
      description:
        'Comprehensive template for individual AI/ML final year projects including research, implementation, and evaluation phases.',
      specialization,
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 24,
      milestoneItems: [
        {
          title: 'Literature Review and Problem Definition',
          description:
            'Conduct comprehensive literature review and clearly define the problem statement with research objectives.',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 40,
          tags: ['research', 'literature-review', 'problem-definition'],
        },
        {
          title: 'Dataset Collection and Preprocessing',
          description:
            'Identify, collect, and preprocess datasets required for the project. Include data cleaning and exploratory data analysis.',
          daysFromStart: 35,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Literature Review and Problem Definition'],
          tags: ['data-collection', 'preprocessing', 'eda'],
        },
        {
          title: 'Model Architecture Design',
          description:
            'Design and document the machine learning model architecture, including algorithm selection and justification.',
          daysFromStart: 56,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Dataset Collection and Preprocessing'],
          tags: ['model-design', 'architecture', 'algorithm-selection'],
        },
        {
          title: 'Initial Model Implementation',
          description:
            'Implement the baseline model with basic functionality and initial training pipeline.',
          daysFromStart: 84,
          priority: Priority.HIGH,
          estimatedHours: 50,
          dependencies: ['Model Architecture Design'],
          tags: ['implementation', 'baseline-model', 'training-pipeline'],
        },
        {
          title: 'Model Training and Hyperparameter Tuning',
          description:
            'Train the model with various hyperparameters and optimize performance using validation techniques.',
          daysFromStart: 112,
          priority: Priority.HIGH,
          estimatedHours: 45,
          dependencies: ['Initial Model Implementation'],
          tags: ['training', 'hyperparameter-tuning', 'optimization'],
        },
        {
          title: 'Model Evaluation and Validation',
          description:
            'Comprehensive evaluation using appropriate metrics, cross-validation, and comparison with baseline methods.',
          daysFromStart: 133,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Model Training and Hyperparameter Tuning'],
          tags: ['evaluation', 'validation', 'metrics', 'comparison'],
        },
        {
          title: 'System Integration and User Interface',
          description:
            'Develop user interface or API for model interaction and integrate all components into a cohesive system.',
          daysFromStart: 154,
          priority: Priority.MEDIUM,
          estimatedHours: 40,
          dependencies: ['Model Evaluation and Validation'],
          tags: ['integration', 'ui', 'api', 'system-design'],
        },
        {
          title: 'Final Testing and Documentation',
          description:
            'Conduct comprehensive testing, write technical documentation, and prepare final project report.',
          daysFromStart: 168,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['System Integration and User Interface'],
          tags: ['testing', 'documentation', 'final-report'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 20,
        maximumDurationWeeks: 28,
        requiredMilestones: [
          'Literature Review and Problem Definition',
          'Model Architecture Design',
          'Model Evaluation and Validation',
          'Final Testing and Documentation',
        ],
        optionalMilestones: ['System Integration and User Interface'],
      },
      tags: ['ai', 'machine-learning', 'individual', 'research'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(individualAITemplate);

    // Group AI/ML Project Template
    const groupAITemplate: Partial<MilestoneTemplate> = {
      name: 'AI/ML Group Project Template',
      description:
        'Template for collaborative AI/ML projects with team coordination and distributed development phases.',
      specialization,
      projectType: ProjectType.GROUP,
      estimatedDurationWeeks: 26,
      milestoneItems: [
        {
          title: 'Team Formation and Project Planning',
          description:
            'Form project team, define roles and responsibilities, and create detailed project plan with task distribution.',
          daysFromStart: 7,
          priority: Priority.CRITICAL,
          estimatedHours: 20,
          tags: ['team-formation', 'planning', 'roles'],
        },
        {
          title: 'Collaborative Literature Review',
          description:
            'Conduct distributed literature review with team members focusing on different aspects of the problem domain.',
          daysFromStart: 21,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Team Formation and Project Planning'],
          tags: ['literature-review', 'collaboration', 'research'],
        },
        {
          title: 'Data Strategy and Collection Plan',
          description:
            'Develop comprehensive data strategy, assign data collection tasks, and establish data sharing protocols.',
          daysFromStart: 42,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Collaborative Literature Review'],
          tags: ['data-strategy', 'collection-plan', 'protocols'],
        },
        {
          title: 'Parallel Model Development',
          description:
            'Implement different model approaches in parallel, with each team member focusing on specific algorithms or components.',
          daysFromStart: 84,
          priority: Priority.HIGH,
          estimatedHours: 60,
          dependencies: ['Data Strategy and Collection Plan'],
          tags: ['parallel-development', 'model-implementation', 'algorithms'],
        },
        {
          title: 'Model Integration and Ensemble Methods',
          description:
            'Integrate individual models, implement ensemble methods, and optimize combined model performance.',
          daysFromStart: 126,
          priority: Priority.HIGH,
          estimatedHours: 45,
          dependencies: ['Parallel Model Development'],
          tags: ['integration', 'ensemble-methods', 'optimization'],
        },
        {
          title: 'Comprehensive System Testing',
          description:
            'Conduct thorough system testing including unit tests, integration tests, and performance evaluation.',
          daysFromStart: 154,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Model Integration and Ensemble Methods'],
          tags: ['testing', 'system-testing', 'performance'],
        },
        {
          title: 'Final Presentation and Documentation',
          description:
            'Prepare final presentation, complete technical documentation, and submit project deliverables.',
          daysFromStart: 182,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Comprehensive System Testing'],
          tags: ['presentation', 'documentation', 'deliverables'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 22,
        maximumDurationWeeks: 30,
        requiredMilestones: [
          'Team Formation and Project Planning',
          'Collaborative Literature Review',
          'Parallel Model Development',
          'Final Presentation and Documentation',
        ],
        optionalMilestones: [],
      },
      tags: ['ai', 'machine-learning', 'group', 'collaboration'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(groupAITemplate);
  }

  private async seedWebDevelopmentTemplates(adminUser: User): Promise<void> {
    const specialization = 'Web Development & Full Stack';

    const individualWebTemplate: Partial<MilestoneTemplate> = {
      name: 'Full Stack Web Development Template',
      description:
        'Comprehensive template for individual full-stack web development projects with modern technologies.',
      specialization,
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 22,
      milestoneItems: [
        {
          title: 'Requirements Analysis and System Design',
          description:
            'Analyze project requirements, create user stories, and design system architecture with database schema.',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 35,
          tags: ['requirements', 'system-design', 'architecture'],
        },
        {
          title: 'UI/UX Design and Prototyping',
          description:
            'Create wireframes, mockups, and interactive prototypes for user interface design.',
          daysFromStart: 28,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Requirements Analysis and System Design'],
          tags: ['ui-design', 'ux-design', 'prototyping'],
        },
        {
          title: 'Backend API Development',
          description:
            'Develop RESTful APIs, implement authentication, and set up database connections.',
          daysFromStart: 56,
          priority: Priority.HIGH,
          estimatedHours: 50,
          dependencies: ['Requirements Analysis and System Design'],
          tags: ['backend', 'api-development', 'authentication'],
        },
        {
          title: 'Frontend Implementation',
          description:
            'Implement responsive frontend using modern frameworks with component-based architecture.',
          daysFromStart: 84,
          priority: Priority.HIGH,
          estimatedHours: 55,
          dependencies: [
            'UI/UX Design and Prototyping',
            'Backend API Development',
          ],
          tags: ['frontend', 'responsive-design', 'components'],
        },
        {
          title: 'Database Integration and Optimization',
          description:
            'Integrate database operations, optimize queries, and implement data validation.',
          daysFromStart: 105,
          priority: Priority.HIGH,
          estimatedHours: 25,
          dependencies: ['Backend API Development'],
          tags: ['database', 'optimization', 'validation'],
        },
        {
          title: 'Testing and Quality Assurance',
          description:
            'Implement unit tests, integration tests, and conduct comprehensive quality assurance.',
          daysFromStart: 126,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: [
            'Frontend Implementation',
            'Database Integration and Optimization',
          ],
          tags: ['testing', 'qa', 'unit-tests'],
        },
        {
          title: 'Deployment and Performance Optimization',
          description:
            'Deploy application, optimize performance, and write technical documentation.',
          daysFromStart: 154,
          priority: Priority.HIGH,
          estimatedHours: 25,
          dependencies: ['Testing and Quality Assurance'],
          tags: ['deployment', 'performance', 'documentation'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 18,
        maximumDurationWeeks: 26,
        requiredMilestones: [
          'Requirements Analysis and System Design',
          'Backend API Development',
          'Frontend Implementation',
          'Testing and Quality Assurance',
        ],
        optionalMilestones: [],
      },
      tags: ['web-development', 'full-stack', 'individual'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(individualWebTemplate);
  }

  private async seedMobileAppTemplates(adminUser: User): Promise<void> {
    const specialization = 'Mobile Application Development';

    const individualMobileTemplate: Partial<MilestoneTemplate> = {
      name: 'Cross-Platform Mobile App Template',
      description:
        'Template for developing cross-platform mobile applications with native performance.',
      specialization,
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 20,
      milestoneItems: [
        {
          title: 'Market Research and App Concept',
          description:
            'Conduct market research, define target audience, and finalize app concept with feature specifications.',
          daysFromStart: 10,
          priority: Priority.HIGH,
          estimatedHours: 25,
          tags: ['market-research', 'app-concept', 'features'],
        },
        {
          title: 'UI/UX Design and User Flow',
          description:
            'Create app wireframes, design user interface, and map out user experience flow.',
          daysFromStart: 24,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Market Research and App Concept'],
          tags: ['ui-design', 'ux-design', 'user-flow'],
        },
        {
          title: 'Development Environment Setup',
          description:
            'Set up development environment, configure build tools, and establish project structure.',
          daysFromStart: 31,
          priority: Priority.MEDIUM,
          estimatedHours: 15,
          dependencies: ['UI/UX Design and User Flow'],
          tags: ['dev-environment', 'build-tools', 'project-structure'],
        },
        {
          title: 'Core App Features Implementation',
          description:
            'Implement core application features and basic navigation structure.',
          daysFromStart: 66,
          priority: Priority.HIGH,
          estimatedHours: 60,
          dependencies: ['Development Environment Setup'],
          tags: ['core-features', 'navigation', 'implementation'],
        },
        {
          title: 'Backend Integration and API Connectivity',
          description:
            'Integrate with backend services, implement API calls, and handle data synchronization.',
          daysFromStart: 87,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Core App Features Implementation'],
          tags: ['backend-integration', 'api', 'data-sync'],
        },
        {
          title: 'Testing and Performance Optimization',
          description:
            'Conduct comprehensive testing on multiple devices, fix bugs, and optimize performance.',
          daysFromStart: 129,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Backend Integration and API Connectivity'],
          tags: ['testing', 'performance', 'optimization'],
        },
        {
          title: 'App Store Preparation and Deployment',
          description:
            'Prepare app store listings, create promotional materials, and deploy to app stores.',
          daysFromStart: 140,
          priority: Priority.HIGH,
          estimatedHours: 20,
          dependencies: ['Testing and Performance Optimization'],
          tags: ['app-store', 'deployment', 'promotion'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 16,
        maximumDurationWeeks: 24,
        requiredMilestones: [
          'Market Research and App Concept',
          'UI/UX Design and User Flow',
          'Core App Features Implementation',
          'Testing and Performance Optimization',
        ],
        optionalMilestones: ['App Store Preparation and Deployment'],
      },
      tags: ['mobile-development', 'cross-platform', 'individual'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(individualMobileTemplate);
  }
  private async seedCybersecurityTemplates(adminUser: User): Promise<void> {
    const specialization = 'Cybersecurity & Information Security';

    const individualSecurityTemplate: Partial<MilestoneTemplate> = {
      name: 'Cybersecurity Assessment and Tool Development',
      description:
        'Template for developing cybersecurity tools and conducting security assessments.',
      specialization,
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 24,
      milestoneItems: [
        {
          title: 'Threat Landscape Analysis',
          description:
            'Analyze current threat landscape, identify security vulnerabilities, and define project scope.',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 30,
          tags: ['threat-analysis', 'vulnerabilities', 'scope'],
        },
        {
          title: 'Security Framework Design',
          description:
            'Design security framework, define security policies, and establish assessment criteria.',
          daysFromStart: 35,
          priority: Priority.HIGH,
          estimatedHours: 40,
          dependencies: ['Threat Landscape Analysis'],
          tags: ['security-framework', 'policies', 'criteria'],
        },
        {
          title: 'Tool Development and Implementation',
          description:
            'Develop security assessment tools, implement detection algorithms, and create monitoring systems.',
          daysFromStart: 84,
          priority: Priority.HIGH,
          estimatedHours: 70,
          dependencies: ['Security Framework Design'],
          tags: ['tool-development', 'detection', 'monitoring'],
        },
        {
          title: 'Penetration Testing and Validation',
          description:
            'Conduct penetration testing, validate security measures, and assess tool effectiveness.',
          daysFromStart: 126,
          priority: Priority.HIGH,
          estimatedHours: 45,
          dependencies: ['Tool Development and Implementation'],
          tags: ['penetration-testing', 'validation', 'effectiveness'],
        },
        {
          title: 'Security Report and Recommendations',
          description:
            'Prepare comprehensive security report with findings, recommendations, and mitigation strategies.',
          daysFromStart: 154,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Penetration Testing and Validation'],
          tags: ['security-report', 'recommendations', 'mitigation'],
        },
        {
          title: 'Implementation and Documentation',
          description:
            'Deploy security solutions, document procedures, and create maintenance guidelines.',
          daysFromStart: 168,
          priority: Priority.MEDIUM,
          estimatedHours: 25,
          dependencies: ['Security Report and Recommendations'],
          tags: ['implementation', 'documentation', 'maintenance'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 20,
        maximumDurationWeeks: 28,
        requiredMilestones: [
          'Threat Landscape Analysis',
          'Security Framework Design',
          'Tool Development and Implementation',
          'Security Report and Recommendations',
        ],
        optionalMilestones: ['Implementation and Documentation'],
      },
      tags: ['cybersecurity', 'security-assessment', 'individual'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(individualSecurityTemplate);
  }

  private async seedDataScienceTemplates(adminUser: User): Promise<void> {
    const specialization = 'Data Science & Analytics';

    const individualDataTemplate: Partial<MilestoneTemplate> = {
      name: 'Data Science Analytics Project',
      description:
        'Template for comprehensive data science projects with analytics and visualization.',
      specialization,
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 22,
      milestoneItems: [
        {
          title: 'Problem Definition and Data Strategy',
          description:
            'Define business problem, identify data requirements, and develop data acquisition strategy.',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 25,
          tags: ['problem-definition', 'data-strategy', 'requirements'],
        },
        {
          title: 'Data Collection and Integration',
          description:
            'Collect data from various sources, integrate datasets, and establish data pipeline.',
          daysFromStart: 35,
          priority: Priority.HIGH,
          estimatedHours: 40,
          dependencies: ['Problem Definition and Data Strategy'],
          tags: ['data-collection', 'integration', 'pipeline'],
        },
        {
          title: 'Exploratory Data Analysis',
          description:
            'Conduct comprehensive EDA, identify patterns, and generate initial insights.',
          daysFromStart: 56,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Data Collection and Integration'],
          tags: ['eda', 'patterns', 'insights'],
        },
        {
          title: 'Data Preprocessing and Feature Engineering',
          description:
            'Clean data, handle missing values, and engineer relevant features for analysis.',
          daysFromStart: 77,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Exploratory Data Analysis'],
          tags: ['preprocessing', 'feature-engineering', 'cleaning'],
        },
        {
          title: 'Statistical Analysis and Modeling',
          description:
            'Apply statistical methods, build predictive models, and validate results.',
          daysFromStart: 112,
          priority: Priority.HIGH,
          estimatedHours: 50,
          dependencies: ['Data Preprocessing and Feature Engineering'],
          tags: ['statistical-analysis', 'modeling', 'validation'],
        },
        {
          title: 'Data Visualization and Dashboard',
          description:
            'Create interactive visualizations and build comprehensive analytics dashboard.',
          daysFromStart: 133,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Statistical Analysis and Modeling'],
          tags: ['visualization', 'dashboard', 'interactive'],
        },
        {
          title: 'Insights and Recommendations',
          description:
            'Generate actionable insights, provide business recommendations, and document findings.',
          daysFromStart: 154,
          priority: Priority.HIGH,
          estimatedHours: 25,
          dependencies: ['Data Visualization and Dashboard'],
          tags: ['insights', 'recommendations', 'documentation'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 18,
        maximumDurationWeeks: 26,
        requiredMilestones: [
          'Problem Definition and Data Strategy',
          'Exploratory Data Analysis',
          'Statistical Analysis and Modeling',
          'Insights and Recommendations',
        ],
        optionalMilestones: ['Data Visualization and Dashboard'],
      },
      tags: ['data-science', 'analytics', 'individual'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(individualDataTemplate);
  }

  private async seedCloudDevOpsTemplates(adminUser: User): Promise<void> {
    const specialization = 'Cloud Computing & DevOps';

    const individualCloudTemplate: Partial<MilestoneTemplate> = {
      name: 'Cloud Infrastructure and DevOps Pipeline',
      description:
        'Template for cloud infrastructure projects with CI/CD pipeline implementation.',
      specialization,
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 20,
      milestoneItems: [
        {
          title: 'Infrastructure Requirements and Architecture',
          description:
            'Define infrastructure requirements, design cloud architecture, and plan resource allocation.',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 30,
          tags: ['infrastructure', 'architecture', 'planning'],
        },
        {
          title: 'Cloud Environment Setup',
          description:
            'Set up cloud environment, configure networking, and establish security policies.',
          daysFromStart: 28,
          priority: Priority.HIGH,
          estimatedHours: 35,
          dependencies: ['Infrastructure Requirements and Architecture'],
          tags: ['cloud-setup', 'networking', 'security'],
        },
        {
          title: 'Infrastructure as Code Implementation',
          description:
            'Implement infrastructure as code using tools like Terraform or CloudFormation.',
          daysFromStart: 49,
          priority: Priority.HIGH,
          estimatedHours: 40,
          dependencies: ['Cloud Environment Setup'],
          tags: ['iac', 'terraform', 'automation'],
        },
        {
          title: 'CI/CD Pipeline Development',
          description:
            'Develop continuous integration and deployment pipeline with automated testing.',
          daysFromStart: 77,
          priority: Priority.HIGH,
          estimatedHours: 45,
          dependencies: ['Infrastructure as Code Implementation'],
          tags: ['cicd', 'automation', 'testing'],
        },
        {
          title: 'Monitoring and Logging Setup',
          description:
            'Implement comprehensive monitoring, logging, and alerting systems.',
          daysFromStart: 105,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['CI/CD Pipeline Development'],
          tags: ['monitoring', 'logging', 'alerting'],
        },
        {
          title: 'Security and Compliance Implementation',
          description:
            'Implement security best practices, compliance measures, and access controls.',
          daysFromStart: 126,
          priority: Priority.HIGH,
          estimatedHours: 25,
          dependencies: ['Monitoring and Logging Setup'],
          tags: ['security', 'compliance', 'access-control'],
        },
        {
          title: 'Performance Optimization and Documentation',
          description:
            'Optimize system performance, document procedures, and create operational runbooks.',
          daysFromStart: 140,
          priority: Priority.MEDIUM,
          estimatedHours: 20,
          dependencies: ['Security and Compliance Implementation'],
          tags: ['optimization', 'documentation', 'runbooks'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 16,
        maximumDurationWeeks: 24,
        requiredMilestones: [
          'Infrastructure Requirements and Architecture',
          'Infrastructure as Code Implementation',
          'CI/CD Pipeline Development',
          'Monitoring and Logging Setup',
        ],
        optionalMilestones: ['Performance Optimization and Documentation'],
      },
      tags: ['cloud-computing', 'devops', 'individual'],
      createdBy: adminUser,
    };

    await this.createTemplateIfNotExists(individualCloudTemplate);
  }

  private async createTemplateIfNotExists(
    templateData: Partial<MilestoneTemplate>,
  ): Promise<void> {
    const existingTemplate = await this.templateRepository.findOne({
      where: {
        name: templateData.name,
        specialization: templateData.specialization,
        projectType: templateData.projectType,
      },
    });

    if (!existingTemplate) {
      const template = this.templateRepository.create(templateData);
      await this.templateRepository.save(template);
      this.logger.log(`Created template: ${templateData.name}`);
    } else {
      this.logger.log(`Template already exists: ${templateData.name}`);
    }
  }
}
