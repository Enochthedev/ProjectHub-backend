import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  StudentProfile,
  SupervisorProfile,
  Project,
  ProjectBookmark,
  ProjectView,
  BookmarkCategory,
} from '@/entities';
import { UserRole } from '@/common/enums/user-role.enum';
import { DifficultyLevel, ApprovalStatus } from '@/common/enums';
import { SPECIALIZATIONS } from '@/common/constants/specializations';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectBookmark)
    private readonly projectBookmarkRepository: Repository<ProjectBookmark>,
    @InjectRepository(ProjectView)
    private readonly projectViewRepository: Repository<ProjectView>,
    @InjectRepository(BookmarkCategory)
    private readonly bookmarkCategoryRepository: Repository<BookmarkCategory>,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      await this.seedSupervisors();
      await this.seedStudents();
      await this.seedProjects();
      await this.seedBookmarkCategories();
      await this.seedProjectBookmarks();
      await this.seedProjectViews();
      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      this.logger.error('Database seeding failed', error);
      throw error;
    }
  }

  async seedSupervisors(): Promise<void> {
    this.logger.log('Seeding supervisor accounts...');

    const supervisorData = [
      {
        email: 'prof.adebayo@ui.edu.ng',
        name: 'Prof. Adebayo Ogundimu',
        specializations: [
          'Artificial Intelligence & Machine Learning',
          'Data Science & Analytics',
        ],
        maxStudents: 8,
        officeLocation: 'Room 201, Computer Science Building',
        phoneNumber: '+234-803-123-4567',
      },
      {
        email: 'dr.olumide@ui.edu.ng',
        name: 'Dr. Olumide Fasanya',
        specializations: [
          'Web Development & Full Stack',
          'Software Engineering & Architecture',
        ],
        maxStudents: 6,
        officeLocation: 'Room 105, Computer Science Building',
        phoneNumber: '+234-805-987-6543',
      },
      {
        email: 'prof.kemi@ui.edu.ng',
        name: 'Prof. Kemi Adeyemi',
        specializations: [
          'Cybersecurity & Information Security',
          'Network Systems & Administration',
        ],
        maxStudents: 5,
        officeLocation: 'Room 301, Computer Science Building',
        phoneNumber: '+234-807-456-7890',
      },
      {
        email: 'dr.tunde@ui.edu.ng',
        name: 'Dr. Tunde Bakare',
        specializations: [
          'Mobile Application Development',
          'Human-Computer Interaction',
        ],
        maxStudents: 7,
        officeLocation: 'Room 203, Computer Science Building',
        phoneNumber: '+234-809-234-5678',
      },
      {
        email: 'prof.funmi@ui.edu.ng',
        name: 'Prof. Funmilayo Oladele',
        specializations: [
          'Cloud Computing & DevOps',
          'Database Systems & Management',
        ],
        maxStudents: 6,
        officeLocation: 'Room 102, Computer Science Building',
        phoneNumber: '+234-806-345-6789',
      },
      {
        email: 'dr.segun@ui.edu.ng',
        name: 'Dr. Segun Afolabi',
        specializations: [
          'Data Science & Analytics',
          'Artificial Intelligence & Machine Learning',
        ],
        maxStudents: 4,
        officeLocation: 'Room 205, Computer Science Building',
        phoneNumber: '+234-808-567-8901',
      },
    ];

    for (const supervisor of supervisorData) {
      const existingUser = await this.userRepository.findOne({
        where: { email: supervisor.email },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('SupervisorPass123!', 12);

        const user = this.userRepository.create({
          email: supervisor.email,
          password: hashedPassword,
          role: UserRole.SUPERVISOR,
          isEmailVerified: true,
          isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        const supervisorProfile = this.supervisorProfileRepository.create({
          name: supervisor.name,
          specializations: supervisor.specializations,
          maxStudents: supervisor.maxStudents,
          isAvailable: true,
          officeLocation: supervisor.officeLocation,
          phoneNumber: supervisor.phoneNumber,
          user: savedUser,
        });

        await this.supervisorProfileRepository.save(supervisorProfile);
        this.logger.log(`Created supervisor: ${supervisor.name}`);
      } else {
        this.logger.log(`Supervisor already exists: ${supervisor.email}`);
      }
    }
  }

  async seedStudents(): Promise<void> {
    this.logger.log('Seeding student accounts...');

    const studentData = [
      {
        email: 'adunni.student@ui.edu.ng',
        name: 'Adunni Olatunji',
        skills: ['JavaScript', 'Python', 'React', 'Node.js'],
        interests: ['Web Development', 'Machine Learning', 'Data Analysis'],
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Artificial Intelligence & Machine Learning',
        ],
        currentYear: 4,
        gpa: 4.2,
      },
      {
        email: 'kola.student@ui.edu.ng',
        name: 'Kola Adebisi',
        skills: ['Java', 'Spring Boot', 'Android Development', 'Kotlin'],
        interests: ['Mobile Apps', 'Software Architecture', 'User Experience'],
        preferredSpecializations: [
          'Mobile Application Development',
          'Software Engineering & Architecture',
        ],
        currentYear: 4,
        gpa: 3.8,
      },
      {
        email: 'bola.student@ui.edu.ng',
        name: 'Bola Ogundipe',
        skills: ['Python', 'TensorFlow', 'Pandas', 'SQL'],
        interests: ['Data Science', 'AI Research', 'Statistical Analysis'],
        preferredSpecializations: [
          'Data Science & Analytics',
          'Artificial Intelligence & Machine Learning',
        ],
        currentYear: 4,
        gpa: 4.5,
      },
      {
        email: 'yemi.student@ui.edu.ng',
        name: 'Yemi Adesanya',
        skills: [
          'Ethical Hacking',
          'Network Security',
          'Penetration Testing',
          'Linux',
        ],
        interests: [
          'Cybersecurity',
          'Network Administration',
          'Information Security',
        ],
        preferredSpecializations: [
          'Cybersecurity & Information Security',
          'Network Systems & Administration',
        ],
        currentYear: 4,
        gpa: 3.9,
      },
      {
        email: 'tolu.student@ui.edu.ng',
        name: 'Tolu Bamidele',
        skills: ['React Native', 'Flutter', 'UI/UX Design', 'Figma'],
        interests: [
          'Mobile Development',
          'User Interface Design',
          'User Experience',
        ],
        preferredSpecializations: [
          'Mobile Application Development',
          'Human-Computer Interaction',
        ],
        currentYear: 4,
        gpa: 4.0,
      },
      {
        email: 'dayo.student@ui.edu.ng',
        name: 'Dayo Olaniyan',
        skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
        interests: ['Cloud Computing', 'DevOps', 'System Administration'],
        preferredSpecializations: [
          'Cloud Computing & DevOps',
          'Software Engineering & Architecture',
        ],
        currentYear: 4,
        gpa: 3.7,
      },
      {
        email: 'nike.student@ui.edu.ng',
        name: 'Nike Adeyinka',
        skills: [
          'PostgreSQL',
          'MongoDB',
          'Database Design',
          'SQL Optimization',
        ],
        interests: [
          'Database Systems',
          'Data Management',
          'Backend Development',
        ],
        preferredSpecializations: [
          'Database Systems & Management',
          'Software Engineering & Architecture',
        ],
        currentYear: 4,
        gpa: 4.1,
      },
      {
        email: 'femi.student@ui.edu.ng',
        name: 'Femi Ogunleye',
        skills: ['Vue.js', 'TypeScript', 'GraphQL', 'REST APIs'],
        interests: [
          'Full Stack Development',
          'API Design',
          'Frontend Architecture',
        ],
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Software Engineering & Architecture',
        ],
        currentYear: 4,
        gpa: 3.6,
      },
    ];

    for (const student of studentData) {
      const existingUser = await this.userRepository.findOne({
        where: { email: student.email },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('StudentPass123!', 12);

        const user = this.userRepository.create({
          email: student.email,
          password: hashedPassword,
          role: UserRole.STUDENT,
          isEmailVerified: true,
          isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        const studentProfile = this.studentProfileRepository.create({
          name: student.name,
          skills: student.skills,
          interests: student.interests,
          preferredSpecializations: student.preferredSpecializations,
          currentYear: student.currentYear,
          gpa: student.gpa,
          user: savedUser,
        });

        await this.studentProfileRepository.save(studentProfile);
        this.logger.log(`Created student: ${student.name}`);
      } else {
        this.logger.log(`Student already exists: ${student.email}`);
      }
    }
  }

  async seedProjects(): Promise<void> {
    this.logger.log('Seeding project data...');

    // Get all supervisors for project assignment
    const supervisors = await this.userRepository.find({
      where: { role: UserRole.SUPERVISOR },
      relations: ['supervisorProfile'],
    });

    if (supervisors.length === 0) {
      this.logger.warn('No supervisors found. Skipping project seeding.');
      return;
    }

    const projectsData = [
      // AI & Machine Learning Projects
      {
        title: 'Intelligent Student Performance Prediction System',
        abstract:
          'A machine learning system that analyzes student academic data, attendance patterns, and engagement metrics to predict final year project success rates. The system uses ensemble methods combining Random Forest, SVM, and Neural Networks to provide early intervention recommendations for at-risk students. Features include real-time dashboard for supervisors, automated alert system, and personalized study recommendations.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Machine Learning',
          'Predictive Analytics',
          'Educational Technology',
          'Data Mining',
          'Student Success',
        ],
        technologyStack: [
          'Python',
          'Scikit-learn',
          'TensorFlow',
          'Pandas',
          'Flask',
          'PostgreSQL',
          'React',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/student-performance-prediction',
        demoUrl: 'https://student-prediction-demo.ui.edu.ng',
        notes:
          'Achieved 87% accuracy in predicting student outcomes. Implemented with privacy-preserving techniques.',
      },
      {
        title: 'Automated Essay Grading System with NLP',
        abstract:
          'An advanced natural language processing system for automated essay evaluation in Computer Science courses. The system analyzes writing quality, technical accuracy, coherence, and argument structure using transformer-based models. Includes plagiarism detection, feedback generation, and grade calibration with human evaluators.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Natural Language Processing',
          'Automated Grading',
          'BERT',
          'Text Analysis',
          'Education',
        ],
        technologyStack: [
          'Python',
          'Transformers',
          'BERT',
          'spaCy',
          'FastAPI',
          'MongoDB',
          'Vue.js',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/automated-essay-grading',
        notes:
          'Correlation coefficient of 0.82 with human graders. Deployed for CS technical writing courses.',
      },
      {
        title: 'Computer Vision-Based Attendance System',
        abstract:
          'A real-time facial recognition system for automated classroom attendance tracking. Uses deep learning models for face detection and recognition with anti-spoofing measures. Features include mobile app integration, attendance analytics, and privacy-compliant data handling following university guidelines.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'Computer Vision',
          'Facial Recognition',
          'Attendance Tracking',
          'Deep Learning',
          'OpenCV',
        ],
        technologyStack: [
          'Python',
          'OpenCV',
          'TensorFlow',
          'Face Recognition',
          'Django',
          'SQLite',
          'Flutter',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/cv-attendance-system',
        demoUrl: 'https://attendance-demo.ui.edu.ng',
      },

      // Web Development Projects
      {
        title: 'University Course Management Platform',
        abstract:
          'A comprehensive web-based platform for managing university courses, assignments, and student-instructor interactions. Features include real-time collaboration tools, assignment submission system, grade management, discussion forums, and integration with university LMS. Built with modern web technologies and responsive design.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Course Management',
          'LMS',
          'Real-time Collaboration',
          'Assignment System',
          'Education Platform',
        ],
        technologyStack: [
          'React',
          'Node.js',
          'Express',
          'PostgreSQL',
          'Socket.io',
          'Redis',
          'Docker',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/course-management-platform',
        demoUrl: 'https://course-platform-demo.ui.edu.ng',
        notes:
          'Successfully deployed for 3 departments. Handles 500+ concurrent users.',
      },
      {
        title: 'E-Commerce Platform for Local Artisans',
        abstract:
          'A full-stack e-commerce solution designed specifically for Nigerian local artisans and craftspeople. Features include multi-vendor support, mobile money integration, inventory management, order tracking, and cultural product categorization. Includes both web and mobile applications with offline capabilities.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'E-commerce',
          'Multi-vendor',
          'Mobile Money',
          'Local Business',
          'Progressive Web App',
        ],
        technologyStack: [
          'Next.js',
          'TypeScript',
          'Prisma',
          'PostgreSQL',
          'Stripe',
          'Paystack',
          'Tailwind CSS',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/artisan-ecommerce',
        demoUrl: 'https://artisan-market-demo.ui.edu.ng',
      },
      {
        title: 'Real-time Collaborative Code Editor',
        abstract:
          'A web-based collaborative code editor with real-time synchronization, syntax highlighting, and integrated chat. Supports multiple programming languages, version control integration, and live code execution. Designed for remote pair programming and coding interviews.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2022,
        tags: [
          'Collaborative Editing',
          'Real-time Sync',
          'Code Editor',
          'WebRTC',
          'Operational Transform',
        ],
        technologyStack: [
          'React',
          'Monaco Editor',
          'WebSocket',
          'Node.js',
          'Operational Transform',
          'Docker',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/collaborative-code-editor',
        demoUrl: 'https://code-collab-demo.ui.edu.ng',
      },

      // Mobile Development Projects
      {
        title: 'Campus Navigation and Services App',
        abstract:
          'A comprehensive mobile application for university campus navigation and services. Features include indoor/outdoor navigation, event notifications, dining hall menus, library seat availability, shuttle tracking, and emergency services. Uses AR for enhanced navigation experience.',
        specialization: 'Mobile Application Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'Campus Navigation',
          'Augmented Reality',
          'Location Services',
          'University Services',
          'Mobile App',
        ],
        technologyStack: [
          'React Native',
          'ARCore',
          'Google Maps API',
          'Firebase',
          'Node.js',
          'MongoDB',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/campus-navigation-app',
        notes:
          'Downloaded by 2000+ students. Featured in university mobile app showcase.',
      },
      {
        title: 'Mental Health Support Mobile Platform',
        abstract:
          'A mobile application providing mental health resources and support for university students. Features include mood tracking, meditation guides, peer support groups, crisis intervention, and connection to professional counselors. Implements privacy-first design and offline functionality.',
        specialization: 'Mobile Application Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'Mental Health',
          'Student Wellness',
          'Mood Tracking',
          'Crisis Support',
          'Privacy-First',
        ],
        technologyStack: [
          'Flutter',
          'Dart',
          'Firebase',
          'Firestore',
          'Cloud Functions',
          'Encryption',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/mental-health-support-app',
        notes:
          'Approved by university counseling center. Implements end-to-end encryption.',
      },
      {
        title: 'Sustainable Transportation Tracker',
        abstract:
          'A mobile app that tracks and gamifies sustainable transportation choices on campus. Users earn points for walking, cycling, or using public transport. Features include carbon footprint calculation, leaderboards, rewards system, and integration with fitness trackers.',
        specialization: 'Mobile Application Development',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2022,
        tags: [
          'Sustainability',
          'Transportation',
          'Gamification',
          'Carbon Tracking',
          'Fitness Integration',
        ],
        technologyStack: [
          'React Native',
          'Expo',
          'SQLite',
          'Google Fit API',
          'Chart.js',
          'AsyncStorage',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/sustainable-transport-tracker',
      },

      // Cybersecurity Projects
      {
        title: 'University Network Security Monitoring System',
        abstract:
          'A comprehensive network security monitoring solution for university infrastructure. Implements real-time threat detection, intrusion prevention, and automated incident response. Features include machine learning-based anomaly detection, security dashboard, and compliance reporting.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Network Security',
          'Intrusion Detection',
          'Threat Monitoring',
          'Anomaly Detection',
          'SIEM',
        ],
        technologyStack: [
          'Python',
          'Snort',
          'ELK Stack',
          'Suricata',
          'Grafana',
          'PostgreSQL',
          'Docker',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/network-security-monitoring',
        notes:
          'Deployed in university network. Detected 15+ security incidents in first month.',
      },
      {
        title: 'Blockchain-Based Academic Credential Verification',
        abstract:
          'A blockchain solution for secure and tamper-proof academic credential verification. Allows universities to issue digital certificates and employers to verify authenticity instantly. Implements smart contracts for automated verification and privacy-preserving credential sharing.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Blockchain',
          'Credential Verification',
          'Smart Contracts',
          'Digital Certificates',
          'Privacy',
        ],
        technologyStack: [
          'Solidity',
          'Ethereum',
          'Web3.js',
          'IPFS',
          'React',
          'Node.js',
          'MetaMask',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/blockchain-credentials',
        demoUrl: 'https://blockchain-creds-demo.ui.edu.ng',
      },
      {
        title: 'Secure File Sharing System with Zero-Knowledge Encryption',
        abstract:
          'A secure file sharing platform implementing zero-knowledge encryption where the server cannot access user data. Features include end-to-end encryption, secure key exchange, access control, and audit logging. Designed for sharing sensitive academic and research documents.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'Zero-Knowledge Encryption',
          'File Sharing',
          'End-to-End Encryption',
          'Access Control',
          'Privacy',
        ],
        technologyStack: [
          'Node.js',
          'CryptoJS',
          'WebCrypto API',
          'Express',
          'MongoDB',
          'React',
          'Socket.io',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/secure-file-sharing',
      },

      // Data Science Projects
      {
        title: 'University Enrollment Prediction and Analysis System',
        abstract:
          'A comprehensive data science project analyzing university enrollment trends and predicting future enrollment patterns. Uses historical data, demographic information, and economic indicators to forecast enrollment by department and program. Includes interactive dashboards for university planning.',
        specialization: 'Data Science & Analytics',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'Enrollment Prediction',
          'Time Series Analysis',
          'University Analytics',
          'Demographic Analysis',
          'Forecasting',
        ],
        technologyStack: [
          'Python',
          'Pandas',
          'Scikit-learn',
          'Plotly',
          'Streamlit',
          'PostgreSQL',
          'Apache Airflow',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/enrollment-prediction-system',
        demoUrl: 'https://enrollment-analytics-demo.ui.edu.ng',
        notes:
          'Achieved 92% accuracy in enrollment predictions. Used by admissions office for planning.',
      },
      {
        title: 'Social Media Sentiment Analysis for University Events',
        abstract:
          'A real-time sentiment analysis system that monitors social media mentions of university events and activities. Provides insights into student engagement, event popularity, and campus sentiment. Features include automated reporting, trend analysis, and crisis detection.',
        specialization: 'Data Science & Analytics',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'Sentiment Analysis',
          'Social Media Analytics',
          'Real-time Processing',
          'Event Monitoring',
          'NLP',
        ],
        technologyStack: [
          'Python',
          'NLTK',
          'Twitter API',
          'Apache Kafka',
          'Elasticsearch',
          'Kibana',
          'Docker',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/social-sentiment-analysis',
      },
      {
        title: 'Academic Performance Analytics Dashboard',
        abstract:
          'An interactive analytics dashboard for visualizing and analyzing student academic performance across different courses and semesters. Includes predictive models for identifying at-risk students, course difficulty analysis, and performance trend visualization.',
        specialization: 'Data Science & Analytics',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2022,
        tags: [
          'Academic Analytics',
          'Performance Visualization',
          'Student Success',
          'Interactive Dashboard',
          'Predictive Modeling',
        ],
        technologyStack: [
          'Python',
          'Dash',
          'Plotly',
          'Pandas',
          'SQLite',
          'Scikit-learn',
          'Bootstrap',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/academic-performance-dashboard',
      },

      // Cloud Computing & DevOps Projects
      {
        title: 'Microservices Architecture for University Systems',
        abstract:
          'A complete migration of monolithic university systems to microservices architecture using containerization and orchestration. Includes service mesh implementation, API gateway, distributed logging, and monitoring. Demonstrates improved scalability and maintainability.',
        specialization: 'Cloud Computing & DevOps',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Microservices',
          'Containerization',
          'Kubernetes',
          'Service Mesh',
          'API Gateway',
          'DevOps',
        ],
        technologyStack: [
          'Docker',
          'Kubernetes',
          'Istio',
          'Kong',
          'Prometheus',
          'Grafana',
          'Jenkins',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/university-microservices',
        notes:
          'Reduced system downtime by 75%. Improved deployment frequency from monthly to daily.',
      },
      {
        title: 'Automated CI/CD Pipeline for Academic Projects',
        abstract:
          'A comprehensive CI/CD pipeline solution designed specifically for academic software projects. Features include automated testing, code quality checks, security scanning, and deployment to multiple environments. Includes integration with popular version control and project management tools.',
        specialization: 'Cloud Computing & DevOps',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'CI/CD',
          'Automated Testing',
          'Code Quality',
          'Security Scanning',
          'Academic Projects',
        ],
        technologyStack: [
          'Jenkins',
          'GitLab CI',
          'SonarQube',
          'OWASP ZAP',
          'Docker',
          'Terraform',
          'AWS',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/academic-cicd-pipeline',
      },
      {
        title: 'Cloud-Based Research Data Management Platform',
        abstract:
          'A scalable cloud platform for managing and sharing research data across university departments. Features include data versioning, access control, metadata management, and integration with popular research tools. Implements data governance and compliance features.',
        specialization: 'Cloud Computing & DevOps',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'Research Data Management',
          'Cloud Storage',
          'Data Governance',
          'Metadata Management',
          'Research Tools',
        ],
        technologyStack: [
          'AWS S3',
          'Lambda',
          'DynamoDB',
          'API Gateway',
          'CloudFormation',
          'React',
          'Python',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/research-data-platform',
      },

      // Software Engineering Projects
      {
        title: 'Automated Code Review and Quality Assessment Tool',
        abstract:
          'An intelligent code review system that automatically analyzes code quality, detects potential bugs, suggests improvements, and enforces coding standards. Uses static analysis, machine learning, and rule-based systems to provide comprehensive code assessment for academic projects.',
        specialization: 'Software Engineering & Architecture',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Code Review',
          'Static Analysis',
          'Code Quality',
          'Automated Assessment',
          'Software Engineering',
        ],
        technologyStack: [
          'Java',
          'SonarQube',
          'PMD',
          'SpotBugs',
          'Spring Boot',
          'PostgreSQL',
          'Angular',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/automated-code-review',
        demoUrl: 'https://code-review-demo.ui.edu.ng',
        notes:
          'Integrated with university GitLab instance. Used by 200+ students for project submissions.',
      },
      {
        title: 'Distributed Task Scheduling System',
        abstract:
          'A fault-tolerant distributed system for scheduling and executing computational tasks across multiple nodes. Features include load balancing, failure recovery, priority queuing, and resource optimization. Designed for handling university research computing workloads.',
        specialization: 'Software Engineering & Architecture',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Distributed Systems',
          'Task Scheduling',
          'Load Balancing',
          'Fault Tolerance',
          'High Performance Computing',
        ],
        technologyStack: [
          'Go',
          'Apache Kafka',
          'Redis',
          'etcd',
          'gRPC',
          'Prometheus',
          'Docker Swarm',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/distributed-task-scheduler',
      },
      {
        title: 'University Library Management System Redesign',
        abstract:
          'A complete redesign of the university library management system using modern software architecture principles. Features include book reservation, digital resource management, fine calculation, and integration with academic systems. Implements clean architecture and domain-driven design.',
        specialization: 'Software Engineering & Architecture',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'Library Management',
          'Clean Architecture',
          'Domain-Driven Design',
          'System Redesign',
          'Academic Integration',
        ],
        technologyStack: [
          'C#',
          '.NET Core',
          'Entity Framework',
          'SQL Server',
          'Angular',
          'SignalR',
          'Azure',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/library-management-redesign',
      },

      // Human-Computer Interaction Projects
      {
        title: 'Accessible Learning Platform for Students with Disabilities',
        abstract:
          'A comprehensive learning platform designed with accessibility as the primary focus. Features include screen reader optimization, voice navigation, customizable UI, sign language integration, and adaptive content delivery. Follows WCAG 2.1 AAA guidelines and includes user testing with disabled students.',
        specialization: 'Human-Computer Interaction',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'Accessibility',
          'Inclusive Design',
          'WCAG Compliance',
          'Assistive Technology',
          'Universal Design',
        ],
        technologyStack: [
          'React',
          'ARIA',
          'Web Speech API',
          'Node.js',
          'MongoDB',
          'WebRTC',
          'PWA',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/accessible-learning-platform',
        demoUrl: 'https://accessible-learning-demo.ui.edu.ng',
        notes:
          'Tested with 20+ students with disabilities. Achieved AAA accessibility rating.',
      },
      {
        title: 'Virtual Reality Campus Tour and Orientation System',
        abstract:
          'An immersive VR application for virtual campus tours and new student orientation. Features include interactive building exploration, virtual information sessions, social interaction spaces, and accessibility options. Designed to help remote and international students familiarize themselves with campus.',
        specialization: 'Human-Computer Interaction',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Virtual Reality',
          'Campus Tour',
          'Student Orientation',
          'Immersive Experience',
          '3D Interaction',
        ],
        technologyStack: [
          'Unity',
          'C#',
          'Oculus SDK',
          'Photon Networking',
          'Blender',
          'Firebase',
          'WebXR',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/vr-campus-tour',
        notes:
          'Used by 500+ prospective students. Reduced physical tour requests by 40%.',
      },
      {
        title: 'Gesture-Based Presentation Control System',
        abstract:
          'An innovative presentation control system using computer vision and gesture recognition. Allows presenters to control slides, annotations, and multimedia using hand gestures and body movements. Features include calibration for different users, gesture customization, and real-time feedback.',
        specialization: 'Human-Computer Interaction',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'Gesture Recognition',
          'Computer Vision',
          'Presentation Control',
          'Natural Interaction',
          'OpenCV',
        ],
        technologyStack: [
          'Python',
          'OpenCV',
          'MediaPipe',
          'PyQt',
          'WebSocket',
          'JavaScript',
          'Reveal.js',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/gesture-presentation-control',
      },

      // Database Systems Projects
      {
        title: 'Distributed Database System for University Records',
        abstract:
          'A distributed database solution for managing university records across multiple campuses. Features include data replication, consistency management, distributed transactions, and query optimization. Implements ACID properties in a distributed environment with fault tolerance.',
        specialization: 'Database Systems & Management',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Distributed Database',
          'Data Replication',
          'Consistency Management',
          'Distributed Transactions',
          'Fault Tolerance',
        ],
        technologyStack: [
          'PostgreSQL',
          'Apache Cassandra',
          'Redis Cluster',
          'Apache Kafka',
          'Java',
          'Spring Boot',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/distributed-university-database',
        notes:
          'Handles 10,000+ concurrent transactions. 99.9% uptime achieved across 3 campus nodes.',
      },
      {
        title: 'Real-time Analytics Database for Student Performance',
        abstract:
          'A high-performance analytics database optimized for real-time student performance analysis. Features include columnar storage, in-memory processing, complex query optimization, and real-time data ingestion. Supports OLAP operations on large educational datasets.',
        specialization: 'Database Systems & Management',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Analytics Database',
          'Columnar Storage',
          'Real-time Processing',
          'OLAP',
          'Query Optimization',
        ],
        technologyStack: [
          'ClickHouse',
          'Apache Kafka',
          'Apache Spark',
          'Python',
          'Grafana',
          'Docker',
          'Kubernetes',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/realtime-analytics-database',
      },
      {
        title: 'NoSQL Document Store for Research Publications',
        abstract:
          'A specialized NoSQL database system for storing and querying research publications and academic papers. Features include full-text search, citation analysis, author disambiguation, and collaborative filtering. Optimized for complex document relationships and metadata queries.',
        specialization: 'Database Systems & Management',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'NoSQL',
          'Document Store',
          'Full-text Search',
          'Citation Analysis',
          'Research Publications',
        ],
        technologyStack: [
          'MongoDB',
          'Elasticsearch',
          'Node.js',
          'Express',
          'React',
          'Apache Tika',
          'Docker',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/research-publications-nosql',
      },

      // Network Systems Projects
      {
        title: 'Software-Defined Network for Campus Infrastructure',
        abstract:
          'Implementation of Software-Defined Networking (SDN) for university campus network infrastructure. Features include centralized network control, dynamic traffic management, quality of service optimization, and network security policy enforcement. Demonstrates improved network flexibility and management.',
        specialization: 'Network Systems & Administration',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Software-Defined Networking',
          'Network Management',
          'Traffic Optimization',
          'QoS',
          'Network Security',
        ],
        technologyStack: [
          'OpenFlow',
          'Open vSwitch',
          'ONOS Controller',
          'Python',
          'Mininet',
          'Wireshark',
          'Linux',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/campus-sdn-implementation',
        notes:
          'Deployed in computer science building. Improved network utilization by 35%.',
      },
      {
        title: 'Network Performance Monitoring and Optimization Tool',
        abstract:
          'A comprehensive network monitoring solution that tracks performance metrics, identifies bottlenecks, and provides optimization recommendations. Features include real-time monitoring, historical analysis, predictive alerts, and automated network tuning capabilities.',
        specialization: 'Network Systems & Administration',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'Network Monitoring',
          'Performance Optimization',
          'Real-time Analytics',
          'Predictive Alerts',
          'Network Tuning',
        ],
        technologyStack: [
          'SNMP',
          'Nagios',
          'Grafana',
          'InfluxDB',
          'Python',
          'Bash',
          'Ansible',
          'Docker',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/network-performance-monitor',
      },
      {
        title: 'Secure VPN Solution for Remote Learning',
        abstract:
          'A custom VPN solution designed specifically for secure remote access to university resources during online learning. Features include multi-factor authentication, traffic encryption, bandwidth management, and integration with university identity systems.',
        specialization: 'Network Systems & Administration',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2022,
        tags: [
          'VPN',
          'Remote Access',
          'Network Security',
          'Authentication',
          'Bandwidth Management',
        ],
        technologyStack: [
          'OpenVPN',
          'WireGuard',
          'LDAP',
          'iptables',
          'Linux',
          'Python',
          'Shell Scripting',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/secure-vpn-remote-learning',
      },

      // Additional projects for variety
      {
        title: 'IoT-Based Smart Classroom Management System',
        abstract:
          'An Internet of Things solution for intelligent classroom management including automated lighting, temperature control, occupancy detection, and equipment monitoring. Features include energy optimization, predictive maintenance, and integration with class scheduling systems.',
        specialization: 'Software Engineering & Architecture',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'IoT',
          'Smart Classroom',
          'Automation',
          'Energy Optimization',
          'Sensor Networks',
        ],
        technologyStack: [
          'Arduino',
          'Raspberry Pi',
          'MQTT',
          'Node.js',
          'InfluxDB',
          'Grafana',
          'React Native',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/iot-smart-classroom',
      },
      {
        title: 'Blockchain-Based Voting System for Student Elections',
        abstract:
          'A secure and transparent voting system for student government elections using blockchain technology. Features include voter authentication, ballot privacy, result transparency, and audit trails. Ensures election integrity while maintaining voter anonymity.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2022,
        tags: [
          'Blockchain',
          'Voting System',
          'Election Security',
          'Transparency',
          'Smart Contracts',
        ],
        technologyStack: [
          'Ethereum',
          'Solidity',
          'Web3.js',
          'React',
          'Node.js',
          'IPFS',
          'MetaMask',
        ],
        isGroupProject: true,
        githubUrl: 'https://github.com/ui-fyp/blockchain-voting-system',
      },
      {
        title: 'Augmented Reality Laboratory Assistant',
        abstract:
          'An AR application that provides interactive guidance for computer science laboratory experiments. Features include 3D visualizations of network topologies, step-by-step procedure overlays, real-time error detection, and progress tracking for practical sessions.',
        specialization: 'Human-Computer Interaction',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Augmented Reality',
          'Laboratory Assistant',
          '3D Visualization',
          'Interactive Learning',
          'Education Technology',
        ],
        technologyStack: [
          'Unity',
          'ARCore',
          'C#',
          'Vuforia',
          'Firebase',
          'Android SDK',
          'Blender',
        ],
        isGroupProject: false,
        githubUrl: 'https://github.com/ui-fyp/ar-laboratory-assistant',
      },
    ];

    // Distribute projects among supervisors based on their specializations
    for (const projectData of projectsData) {
      const existingProject = await this.projectRepository.findOne({
        where: { title: projectData.title },
      });

      if (!existingProject) {
        // Find a supervisor with matching specialization
        const suitableSupervisor = supervisors.find((supervisor) =>
          supervisor.supervisorProfile?.specializations.includes(
            projectData.specialization,
          ),
        );

        if (suitableSupervisor) {
          const project = this.projectRepository.create({
            ...projectData,
            supervisorId: suitableSupervisor.id,
            approvalStatus: ApprovalStatus.APPROVED,
            approvedAt: new Date(
              Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
            ), // Random date within last year
            approvedBy: suitableSupervisor.id,
          });

          await this.projectRepository.save(project);
          this.logger.log(`Created project: ${projectData.title}`);
        } else {
          // Assign to first supervisor if no matching specialization found
          const project = this.projectRepository.create({
            ...projectData,
            supervisorId: supervisors[0].id,
            approvalStatus: ApprovalStatus.APPROVED,
            approvedAt: new Date(
              Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
            ),
            approvedBy: supervisors[0].id,
          });

          await this.projectRepository.save(project);
          this.logger.log(
            `Created project: ${projectData.title} (assigned to default supervisor)`,
          );
        }
      } else {
        this.logger.log(`Project already exists: ${projectData.title}`);
      }
    }

    // Create some pending projects for testing approval workflow
    const pendingProjects = [
      {
        title: 'Advanced Quantum Computing Simulator',
        abstract:
          'A comprehensive quantum computing simulator that allows students to experiment with quantum algorithms and circuits. Features include visual circuit design, quantum state visualization, and educational tutorials on quantum computing principles.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: [
          'Quantum Computing',
          'Simulation',
          'Educational Tool',
          'Quantum Algorithms',
          'Visualization',
        ],
        technologyStack: [
          'Python',
          'Qiskit',
          'NumPy',
          'Matplotlib',
          'Jupyter',
          'React',
          'D3.js',
        ],
        isGroupProject: true,
        approvalStatus: ApprovalStatus.PENDING,
      },
      {
        title: 'Decentralized Social Network for Academic Collaboration',
        abstract:
          'A blockchain-based social network designed for academic collaboration and knowledge sharing. Features include peer-to-peer communication, decentralized file sharing, reputation systems, and integration with academic publishing platforms.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: [
          'Decentralized Network',
          'Academic Collaboration',
          'Blockchain',
          'Peer-to-Peer',
          'Knowledge Sharing',
        ],
        technologyStack: [
          'IPFS',
          'Ethereum',
          'React',
          'Node.js',
          'Solidity',
          'Web3.js',
          'OrbitDB',
        ],
        isGroupProject: true,
        approvalStatus: ApprovalStatus.PENDING,
      },
    ];

    for (const pendingProject of pendingProjects) {
      const existingProject = await this.projectRepository.findOne({
        where: { title: pendingProject.title },
      });

      if (!existingProject) {
        const suitableSupervisor =
          supervisors.find((supervisor) =>
            supervisor.supervisorProfile?.specializations.includes(
              pendingProject.specialization,
            ),
          ) || supervisors[0];

        const project = this.projectRepository.create({
          ...pendingProject,
          supervisorId: suitableSupervisor.id,
        });

        await this.projectRepository.save(project);
        this.logger.log(`Created pending project: ${pendingProject.title}`);
      }
    }
  }

  async seedBookmarkCategories(): Promise<void> {
    this.logger.log('Seeding bookmark categories...');

    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
    });

    if (students.length === 0) {
      this.logger.warn(
        'No students found. Skipping bookmark category seeding.',
      );
      return;
    }

    const categoryData = [
      {
        name: 'Favorites',
        description: 'My favorite projects',
        color: '#FF6B6B',
      },
      {
        name: 'AI/ML Projects',
        description: 'Machine Learning and AI related projects',
        color: '#4ECDC4',
      },
      {
        name: 'Web Development',
        description: 'Full-stack and web development projects',
        color: '#45B7D1',
      },
      {
        name: 'Mobile Apps',
        description: 'Mobile application development projects',
        color: '#96CEB4',
      },
      {
        name: 'Research Ideas',
        description: 'Projects for potential research',
        color: '#FFEAA7',
      },
      {
        name: 'Group Projects',
        description: 'Projects suitable for team collaboration',
        color: '#DDA0DD',
      },
    ];

    // Create categories for first few students
    for (let i = 0; i < Math.min(3, students.length); i++) {
      const student = students[i];

      for (const categoryInfo of categoryData) {
        const existingCategory = await this.bookmarkCategoryRepository.findOne({
          where: {
            studentId: student.id,
            name: categoryInfo.name,
          },
        });

        if (!existingCategory) {
          const category = this.bookmarkCategoryRepository.create({
            ...categoryInfo,
            studentId: student.id,
          });

          await this.bookmarkCategoryRepository.save(category);
          this.logger.log(
            `Created bookmark category: ${categoryInfo.name} for student ${student.email}`,
          );
        }
      }
    }
  }

  async seedProjectBookmarks(): Promise<void> {
    this.logger.log('Seeding project bookmarks...');

    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
    });

    const projects = await this.projectRepository.find({
      where: { approvalStatus: ApprovalStatus.APPROVED },
      take: 20, // Use first 20 projects for bookmarking
    });

    if (students.length === 0 || projects.length === 0) {
      this.logger.warn(
        'No students or projects found. Skipping bookmark seeding.',
      );
      return;
    }

    // Create realistic bookmark patterns
    for (const student of students) {
      // Each student bookmarks 3-8 random projects
      const bookmarkCount = Math.floor(Math.random() * 6) + 3;
      const shuffledProjects = [...projects].sort(() => 0.5 - Math.random());
      const projectsToBookmark = shuffledProjects.slice(0, bookmarkCount);

      // Get student's categories
      const categories = await this.bookmarkCategoryRepository.find({
        where: { studentId: student.id },
      });

      for (const project of projectsToBookmark) {
        const existingBookmark = await this.projectBookmarkRepository.findOne({
          where: {
            studentId: student.id,
            projectId: project.id,
          },
        });

        if (!existingBookmark) {
          // Randomly assign to a category (or no category)
          const category =
            Math.random() > 0.3 && categories.length > 0
              ? categories[Math.floor(Math.random() * categories.length)]
              : null;

          const bookmark = this.projectBookmarkRepository.create({
            studentId: student.id,
            projectId: project.id,
            categoryId: category?.id || null,
          });

          await this.projectBookmarkRepository.save(bookmark);
          this.logger.log(
            `Created bookmark for student ${student.email} on project ${project.title}`,
          );
        }
      }
    }
  }

  async seedProjectViews(): Promise<void> {
    this.logger.log('Seeding project views for analytics...');

    const projects = await this.projectRepository.find({
      where: { approvalStatus: ApprovalStatus.APPROVED },
    });

    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
    });

    if (projects.length === 0) {
      this.logger.warn('No projects found. Skipping view seeding.');
      return;
    }

    const sampleIPs = [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.1.102',
      '10.0.0.50',
      '10.0.0.51',
      '172.16.0.100',
      '172.16.0.101',
    ];

    const sampleUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
    ];

    // Generate realistic view patterns
    for (const project of projects) {
      // Each project gets 10-100 views
      const viewCount = Math.floor(Math.random() * 90) + 10;

      for (let i = 0; i < viewCount; i++) {
        // 70% chance of authenticated view, 30% anonymous
        const isAuthenticated = Math.random() > 0.3;
        const viewerId =
          isAuthenticated && students.length > 0
            ? students[Math.floor(Math.random() * students.length)].id
            : null;

        // Random view time within the last 6 months
        const viewedAt = new Date(
          Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
        );

        const view = this.projectViewRepository.create({
          projectId: project.id,
          viewerId,
          ipAddress: sampleIPs[Math.floor(Math.random() * sampleIPs.length)],
          userAgent:
            sampleUserAgents[
              Math.floor(Math.random() * sampleUserAgents.length)
            ],
          viewedAt,
        });

        await this.projectViewRepository.save(view);
      }

      this.logger.log(
        `Created ${viewCount} views for project: ${project.title}`,
      );
    }
  }

  async rollback(): Promise<void> {
    this.logger.log('Rolling back seeded data...');

    try {
      // Delete project-related data first (due to foreign key constraints)
      await this.projectViewRepository.delete({});
      this.logger.log('Removed all project views');

      await this.projectBookmarkRepository.delete({});
      this.logger.log('Removed all project bookmarks');

      await this.bookmarkCategoryRepository.delete({});
      this.logger.log('Removed all bookmark categories');

      await this.projectRepository.delete({});
      this.logger.log('Removed all projects');

      // Delete all seeded users (this will cascade to profiles)
      const seededEmails = [
        // Supervisors
        'prof.adebayo@ui.edu.ng',
        'dr.olumide@ui.edu.ng',
        'prof.kemi@ui.edu.ng',
        'dr.tunde@ui.edu.ng',
        'prof.funmi@ui.edu.ng',
        'dr.segun@ui.edu.ng',
        // Students
        'adunni.student@ui.edu.ng',
        'kola.student@ui.edu.ng',
        'bola.student@ui.edu.ng',
        'yemi.student@ui.edu.ng',
        'tolu.student@ui.edu.ng',
        'dayo.student@ui.edu.ng',
        'nike.student@ui.edu.ng',
        'femi.student@ui.edu.ng',
      ];

      for (const email of seededEmails) {
        const user = await this.userRepository.findOne({
          where: { email },
          relations: ['studentProfile', 'supervisorProfile'],
        });

        if (user) {
          await this.userRepository.remove(user);
          this.logger.log(`Removed user: ${email}`);
        }
      }

      this.logger.log('Rollback completed successfully');
    } catch (error) {
      this.logger.error('Rollback failed', error);
      throw error;
    }
  }

  async cleanupTestData(): Promise<void> {
    this.logger.log('Cleaning up test data...');

    try {
      // Remove all test data but keep structure
      await this.projectViewRepository.delete({});
      await this.projectBookmarkRepository.delete({});
      await this.bookmarkCategoryRepository.delete({});
      await this.projectRepository.delete({});

      this.logger.log('Test data cleanup completed successfully');
    } catch (error) {
      this.logger.error('Test data cleanup failed', error);
      throw error;
    }
  }

  async seedProjectsOnly(): Promise<void> {
    this.logger.log('Seeding projects only...');

    try {
      await this.seedProjects();
      this.logger.log('Project-only seeding completed successfully');
    } catch (error) {
      this.logger.error('Project-only seeding failed', error);
      throw error;
    }
  }
}
