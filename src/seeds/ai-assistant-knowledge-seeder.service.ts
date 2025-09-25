import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseEntry, ResponseTemplate, User } from '@/entities';
import { ContentType } from '@/common/enums';

@Injectable()
export class AIAssistantKnowledgeSeederService {
  private readonly logger = new Logger(AIAssistantKnowledgeSeederService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting AI Assistant knowledge base seeding...');

    try {
      await this.seedKnowledgeBaseEntries();
      await this.seedResponseTemplates();
      await this.seedSampleQAPairs();
      this.logger.log(
        'AI Assistant knowledge base seeding completed successfully',
      );
    } catch (error) {
      this.logger.error('AI Assistant knowledge base seeding failed', error);
      throw error;
    }
  }

  async seedKnowledgeBaseEntries(): Promise<void> {
    this.logger.log('Seeding knowledge base entries...');

    // Get admin user for created_by field
    const adminUser = await this.userRepository.findOne({
      where: { email: 'admin@ui.edu.ng' },
    });

    const knowledgeEntries = [
      // FYP Guidelines - Project Proposal Phase
      {
        title: 'Final Year Project Proposal Guidelines',
        content: `# Final Year Project Proposal Guidelines

## Overview
The Final Year Project (FYP) proposal is a critical document that outlines your intended research or development project. It serves as a roadmap for your project and helps supervisors understand your objectives, methodology, and expected outcomes.

## Proposal Structure

### 1. Title Page
- Project title (clear and descriptive)
- Student name and matriculation number
- Supervisor name and department
- Submission date
- Department and university information

### 2. Abstract (200-300 words)
- Brief overview of the problem
- Proposed solution or research approach
- Expected outcomes and contributions
- Key technologies or methodologies to be used

### 3. Introduction and Problem Statement
- Background information on the problem domain
- Clear statement of the problem to be addressed
- Justification for why this problem is worth solving
- Scope and limitations of the proposed solution

### 4. Literature Review
- Review of existing solutions and research
- Identification of gaps in current knowledge/solutions
- How your project will address these gaps
- Minimum 15-20 relevant academic sources

### 5. Objectives
- Primary objective (main goal of the project)
- Secondary objectives (supporting goals)
- Specific, measurable, achievable, relevant, time-bound (SMART) objectives

### 6. Methodology
- Detailed description of your approach
- Technologies, tools, and frameworks to be used
- Development methodology (Agile, Waterfall, etc.)
- Data collection methods (if applicable)
- Testing and validation strategies

### 7. Project Timeline
- Detailed timeline with milestones
- Gantt chart or similar visual representation
- Buffer time for unexpected challenges
- Key deliverables and deadlines

### 8. Expected Outcomes
- Anticipated results and deliverables
- Potential impact and applications
- Success criteria and evaluation metrics

### 9. Resources Required
- Hardware and software requirements
- Access to data or systems
- Budget considerations (if any)
- Support from external organizations

### 10. References
- Properly formatted academic references
- Use IEEE or APA citation style consistently
- Include recent and relevant sources

## Submission Requirements
- Maximum 15-20 pages (excluding references and appendices)
- 12-point Times New Roman font, double-spaced
- 1-inch margins on all sides
- Submit both hard copy and electronic version
- Include signed supervisor approval form

## Evaluation Criteria
- Clarity and feasibility of objectives (25%)
- Quality of literature review (20%)
- Appropriateness of methodology (25%)
- Realistic timeline and resource planning (15%)
- Writing quality and presentation (15%)

## Common Mistakes to Avoid
- Overly ambitious scope for available time
- Insufficient literature review
- Vague or unmeasurable objectives
- Unrealistic timeline
- Poor writing and presentation
- Lack of clear problem statement
- Missing technical details in methodology

## Tips for Success
- Start early and allow time for revisions
- Consult regularly with your supervisor
- Ensure your project aligns with your specialization
- Consider the availability of resources and data
- Make sure your objectives are achievable within the timeframe
- Proofread carefully for grammar and formatting errors`,
        category: 'FYP Guidelines',
        tags: [
          'proposal',
          'guidelines',
          'project-planning',
          'academic-writing',
        ],
        keywords: [
          'proposal',
          'fyp',
          'final year project',
          'guidelines',
          'structure',
          'requirements',
          'submission',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },

      // Literature Review Guidelines
      {
        title: 'How to Conduct an Effective Literature Review',
        content: `# How to Conduct an Effective Literature Review

## What is a Literature Review?
A literature review is a comprehensive survey of existing research and publications related to your project topic. It demonstrates your understanding of the field and identifies gaps that your project will address.

## Purpose of Literature Review
- Establish theoretical foundation for your project
- Identify what has already been done in your area
- Find gaps in existing knowledge or solutions
- Justify the need for your project
- Inform your methodology and approach

## Steps to Conduct Literature Review

### 1. Define Your Search Strategy
- Identify key terms and synonyms related to your topic
- Use Boolean operators (AND, OR, NOT) for effective searching
- Consider different spellings and terminology variations
- Create a list of relevant databases and sources

### 2. Search Academic Databases
**Recommended Databases:**
- IEEE Xplore Digital Library
- ACM Digital Library
- Google Scholar
- ScienceDirect
- SpringerLink
- ResearchGate
- arXiv (for computer science preprints)

**Search Tips:**
- Use quotation marks for exact phrases
- Try different combinations of keywords
- Look at reference lists of relevant papers
- Use citation tracking to find newer papers
- Set up alerts for new publications in your area

### 3. Evaluate Source Quality
**High-Quality Sources:**
- Peer-reviewed journal articles
- Conference proceedings from reputable venues
- Books from academic publishers
- Government and institutional reports
- Thesis and dissertations from reputable universities

**Evaluation Criteria:**
- Author credentials and affiliation
- Publication venue reputation
- Recency of publication
- Number of citations received
- Relevance to your specific topic

### 4. Organize Your Sources
- Use reference management tools (Zotero, Mendeley, EndNote)
- Create categories or themes
- Take detailed notes with page numbers
- Track where you found each source
- Note key findings and methodologies

### 5. Analyze and Synthesize
- Group papers by themes or approaches
- Compare and contrast different methodologies
- Identify trends and patterns
- Note conflicting findings or debates
- Look for theoretical frameworks

## Writing the Literature Review

### Structure Options

**Chronological Approach:**
- Organize by time periods
- Show evolution of ideas
- Good for showing historical development

**Thematic Approach:**
- Organize by topics or themes
- Compare different perspectives on each theme
- Most common approach for FYP

**Methodological Approach:**
- Organize by research methods used
- Compare quantitative vs qualitative studies
- Good for methodology-focused projects

### Writing Guidelines

**Introduction:**
- Define the scope of your review
- Explain your search strategy
- Outline the structure of the review

**Body Paragraphs:**
- Start each paragraph with a clear topic sentence
- Synthesize rather than just summarize
- Use your own voice to connect ideas
- Include critical analysis, not just description
- Use proper citations throughout

**Conclusion:**
- Summarize key findings
- Identify gaps in the literature
- Explain how your project addresses these gaps
- Transition to your methodology

## Citation and Referencing

### IEEE Citation Style (Recommended for CS)
**In-text citations:**
- Use numbers in square brackets [1], [2], [3]
- Number sources in order of first appearance
- Multiple sources: [1], [3], [5] or [1-3]

**Reference list format:**
[1] A. Author, "Title of paper," Journal Name, vol. X, no. Y, pp. Z-Z, Month Year.
[2] B. Author, Title of Book. City: Publisher, Year.
[3] C. Author, "Title of paper," in Proc. Conference Name, City, Year, pp. Z-Z.

### Quality Indicators
- Aim for 15-25 high-quality sources minimum
- Include recent sources (last 5-10 years)
- Balance of journal articles and conference papers
- Include seminal works in your field
- Avoid over-reliance on web sources

## Common Mistakes to Avoid
- Simply summarizing each paper individually
- Including too many low-quality sources
- Failing to synthesize and analyze
- Not identifying clear gaps
- Poor organization and structure
- Inadequate citation practices
- Not connecting literature to your project

## Tips for Success
- Start your literature review early
- Keep detailed notes and organize sources
- Read abstracts first to filter relevant papers
- Look for recent survey papers in your area
- Discuss findings with your supervisor
- Update your review as you find new sources
- Use literature to inform your methodology`,
        category: 'Research Methods',
        tags: ['literature-review', 'research', 'academic-writing', 'sources'],
        keywords: [
          'literature review',
          'research',
          'sources',
          'citation',
          'academic databases',
          'methodology',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },

      // Methodology Guidelines
      {
        title: 'Choosing and Describing Your Project Methodology',
        content: `# Choosing and Describing Your Project Methodology

## Understanding Methodology
Methodology refers to the systematic approach you will use to complete your project. It includes your development process, tools, techniques, and evaluation methods.

## Types of FYP Methodologies

### 1. Software Development Methodologies

**Agile Development**
- Iterative and incremental approach
- Short development cycles (sprints)
- Regular feedback and adaptation
- Good for projects with evolving requirements

*When to use:*
- Web/mobile application development
- Projects with user interaction requirements
- When requirements may change during development

**Waterfall Model**
- Sequential development phases
- Each phase completed before next begins
- Extensive documentation at each stage
- Good for well-defined requirements

*When to use:*
- Projects with clear, stable requirements
- System integration projects
- When extensive documentation is required

**Rapid Application Development (RAD)**
- Focus on quick prototyping
- User feedback drives development
- Minimal planning phase
- Good for user-interface intensive applications

*When to use:*
- Prototype development projects
- User experience focused applications
- Time-constrained projects

### 2. Research Methodologies

**Experimental Research**
- Controlled experiments with variables
- Hypothesis testing
- Quantitative data collection
- Statistical analysis of results

*When to use:*
- Algorithm performance comparison
- System performance evaluation
- Machine learning model comparison

**Case Study Research**
- In-depth analysis of specific instances
- Qualitative and quantitative data
- Real-world context examination
- Multiple data sources

*When to use:*
- System implementation in real environment
- User adoption studies
- Technology impact assessment

**Design Science Research**
- Create and evaluate artifacts
- Iterative design and testing
- Problem-solving oriented
- Practical utility focus

*When to use:*
- Novel system development
- Tool or framework creation
- Process improvement projects

### 3. Mixed Methods Approach
- Combines multiple methodologies
- Quantitative and qualitative elements
- Triangulation of results
- Comprehensive understanding

## Describing Your Methodology

### 1. Methodology Overview
- State your chosen approach clearly
- Justify why this methodology is appropriate
- Explain how it addresses your objectives
- Describe the overall process flow

### 2. Development Process
**For Software Projects:**
- Requirements gathering process
- System design approach
- Implementation strategy
- Testing methodology
- Deployment plan

**For Research Projects:**
- Data collection methods
- Analysis techniques
- Validation approaches
- Evaluation criteria

### 3. Tools and Technologies

**Development Tools:**
- Programming languages and frameworks
- Development environments (IDEs)
- Version control systems
- Database management systems
- Testing frameworks

**Research Tools:**
- Data collection instruments
- Analysis software
- Survey platforms
- Statistical tools
- Visualization tools

### 4. Data Management
- Data sources and collection methods
- Data storage and security measures
- Data processing and analysis procedures
- Privacy and ethical considerations

### 5. Evaluation Methods

**Technical Evaluation:**
- Performance metrics
- Functionality testing
- Usability testing
- Security assessment
- Scalability analysis

**Research Evaluation:**
- Validity and reliability measures
- Statistical significance testing
- Peer review processes
- Expert evaluation
- User feedback collection

## Project Timeline and Milestones

### Phase 1: Planning and Design (Weeks 1-4)
- Requirements analysis
- System design
- Technology selection
- Project setup

### Phase 2: Implementation (Weeks 5-12)
- Core functionality development
- Feature implementation
- Integration testing
- Documentation

### Phase 3: Testing and Evaluation (Weeks 13-16)
- System testing
- Performance evaluation
- User testing (if applicable)
- Results analysis

### Phase 4: Documentation and Presentation (Weeks 17-20)
- Final report writing
- Presentation preparation
- Code documentation
- Project submission

## Risk Management
- Identify potential risks and challenges
- Develop mitigation strategies
- Create contingency plans
- Regular progress monitoring

### Common Risks:
- Technical difficulties
- Resource unavailability
- Timeline delays
- Scope creep
- External dependencies

## Quality Assurance

### Code Quality (for software projects):
- Code review processes
- Coding standards adherence
- Documentation requirements
- Testing coverage targets

### Research Quality:
- Peer review processes
- Data validation methods
- Result verification
- Reproducibility measures

## Ethical Considerations
- Human subjects research approval
- Data privacy protection
- Intellectual property rights
- Plagiarism avoidance
- Proper attribution

## Documentation Requirements
- Technical documentation
- User manuals
- API documentation
- Process documentation
- Lessons learned

## Tips for Methodology Selection
- Consider your project objectives
- Assess available resources and time
- Match methodology to project type
- Consider your experience level
- Consult with your supervisor
- Review similar projects for guidance
- Be realistic about scope and complexity`,
        category: 'Research Methods',
        tags: [
          'methodology',
          'development-process',
          'research-methods',
          'project-planning',
        ],
        keywords: [
          'methodology',
          'agile',
          'waterfall',
          'research methods',
          'development process',
          'evaluation',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },
    ];

    for (const entry of knowledgeEntries) {
      const existingEntry = await this.knowledgeRepository.findOne({
        where: { title: entry.title },
      });

      if (!existingEntry) {
        const knowledgeEntry = this.knowledgeRepository.create({
          ...entry,
          createdBy: adminUser,
          createdById: adminUser?.id || null,
        });

        await this.knowledgeRepository.save(knowledgeEntry);
        this.logger.log(`Created knowledge entry: ${entry.title}`);
      } else {
        this.logger.log(`Knowledge entry already exists: ${entry.title}`);
      }
    }
  }

  async seedResponseTemplates(): Promise<void> {
    this.logger.log('Seeding response templates...');

    const templates = [
      // General FYP Help Templates
      {
        name: 'FYP Getting Started',
        template: `Hello! I'd be happy to help you get started with your Final Year Project. 

Here are some key first steps:

1. **Choose Your Topic**: Select a topic that aligns with your interests and specialization
2. **Find a Supervisor**: Identify faculty members whose research interests match your project
3. **Write Your Proposal**: Prepare a detailed project proposal following university guidelines
4. **Plan Your Timeline**: Create a realistic timeline with milestones and deadlines

{{#if specialization}}
Since you're interested in {{specialization}}, I recommend looking at recent projects in this area and identifying current challenges or opportunities for innovation.
{{/if}}

Would you like me to provide more specific guidance on any of these steps?

**Helpful Resources:**
- FYP Proposal Guidelines
- Supervisor Directory
- Project Timeline Templates
- Sample Project Reports`,
        category: 'General Help',
        triggerKeywords: [
          'getting started',
          'how to start',
          'begin fyp',
          'start project',
          'first steps',
        ],
        variables: {
          specialization: 'your chosen specialization',
        },
        language: 'en',
      },

      {
        name: 'Literature Review Help',
        template: `I can help you with your literature review! Here's a structured approach:

**Step 1: Define Your Search Strategy**
- Identify key terms related to your topic
- Use academic databases like IEEE Xplore, ACM Digital Library, Google Scholar
- Try different keyword combinations

**Step 2: Evaluate Sources**
- Focus on peer-reviewed papers from the last 5-10 years
- Look for highly cited works in your field
- Include both journal articles and conference papers

**Step 3: Organize and Analyze**
- Group papers by themes or methodologies
- Identify gaps in existing research
- Note how your project addresses these gaps

{{#if topic}}
For your topic on {{topic}}, I recommend starting with recent survey papers or systematic reviews in this area.
{{/if}}

**Minimum Requirements:**
- 15-25 high-quality academic sources
- Proper IEEE citation format
- Critical analysis, not just summary

Would you like specific guidance on any of these steps, or help with finding sources for your particular topic?`,
        category: 'Literature Review',
        triggerKeywords: [
          'literature review',
          'sources',
          'references',
          'research papers',
          'citations',
        ],
        variables: {
          topic: 'your research topic',
        },
        language: 'en',
      },

      {
        name: 'Methodology Selection Help',
        template: `Choosing the right methodology is crucial for your project success. Let me help you decide:

**For Software Development Projects:**
- **Agile**: Good for web/mobile apps with evolving requirements
- **Waterfall**: Best for well-defined, stable requirements
- **RAD**: Suitable for prototype-focused projects

**For Research Projects:**
- **Experimental**: When comparing algorithms or system performance
- **Case Study**: For real-world implementation analysis
- **Design Science**: When creating new tools or frameworks

**Key Considerations:**
1. What type of project are you doing? (Development/Research/Mixed)
2. How well-defined are your requirements?
3. Do you need user feedback during development?
4. What evaluation methods will you use?

{{#if projectType}}
Since you're working on {{projectType}}, I'd recommend considering {{recommendedMethodology}} methodology.
{{/if}}

**Next Steps:**
- Describe your chosen methodology clearly
- Justify why it's appropriate for your project
- Detail your development/research process
- Plan your evaluation approach

Would you like me to elaborate on any specific methodology or help you choose between options?`,
        category: 'Methodology',
        triggerKeywords: [
          'methodology',
          'development process',
          'agile',
          'waterfall',
          'research method',
        ],
        variables: {
          projectType: 'a software development project',
          recommendedMethodology: 'Agile',
        },
        language: 'en',
      },

      {
        name: 'Project Timeline Help',
        template: `Creating a realistic timeline is essential for project success. Here's a typical FYP timeline structure:

**Phase 1: Planning & Research (Weeks 1-6)**
- Literature review completion
- Requirements analysis
- Technology selection
- Detailed project plan

**Phase 2: Design & Early Implementation (Weeks 7-12)**
- System design and architecture
- Core functionality development
- Initial prototyping
- Regular supervisor meetings

**Phase 3: Implementation & Testing (Weeks 13-18)**
- Feature development
- Integration testing
- Performance optimization
- User testing (if applicable)

**Phase 4: Documentation & Presentation (Weeks 19-24)**
- Final report writing
- Code documentation
- Presentation preparation
- Final submission

**Timeline Tips:**
- Add 20% buffer time for unexpected challenges
- Set weekly milestones for accountability
- Plan regular supervisor check-ins
- Consider exam periods and holidays

{{#if projectComplexity}}
For {{projectComplexity}} projects, you may need to adjust the implementation phase duration accordingly.
{{/if}}

Would you like help creating a detailed timeline for your specific project, or guidance on any particular phase?`,
        category: 'Project Planning',
        triggerKeywords: [
          'timeline',
          'schedule',
          'milestones',
          'project plan',
          'deadlines',
        ],
        variables: {
          projectComplexity: 'complex',
        },
        language: 'en',
      },

      // Technical Help Templates
      {
        name: 'Technology Selection Help',
        template: `Choosing the right technology stack is important for project success. Here's how to decide:

**Consider These Factors:**
1. **Project Requirements**: What functionality do you need?
2. **Your Experience**: Use technologies you're comfortable with
3. **Learning Goals**: What do you want to learn?
4. **Community Support**: Good documentation and community
5. **Supervisor Expertise**: Can your supervisor provide guidance?

**Popular Technology Stacks by Project Type:**

**Web Applications:**
- Frontend: React, Vue.js, Angular
- Backend: Node.js, Python (Django/Flask), Java (Spring)
- Database: PostgreSQL, MongoDB, MySQL

**Mobile Applications:**
- Native: Swift (iOS), Kotlin/Java (Android)
- Cross-platform: React Native, Flutter, Xamarin

**Machine Learning/AI:**
- Languages: Python, R
- Frameworks: TensorFlow, PyTorch, Scikit-learn
- Tools: Jupyter, Google Colab

**Data Science:**
- Languages: Python, R, SQL
- Tools: Pandas, NumPy, Matplotlib, Tableau

{{#if specialization}}
For {{specialization}} projects, I'd recommend focusing on technologies commonly used in this field.
{{/if}}

**Selection Tips:**
- Don't try to learn too many new technologies at once
- Choose mature, well-documented technologies
- Consider deployment and hosting requirements
- Think about scalability needs

Need help choosing technologies for your specific project type?`,
        category: 'Technical Guidance',
        triggerKeywords: [
          'technology stack',
          'programming language',
          'framework',
          'tools',
          'tech selection',
        ],
        variables: {
          specialization: 'your specialization area',
        },
        language: 'en',
      },

      // Error and Fallback Templates
      {
        name: 'Low Confidence Response',
        template: `I'm not completely confident about my answer to your question. Here are some alternatives that might help:

**Immediate Options:**
1. **Rephrase your question** - Try asking in a different way or be more specific
2. **Check our knowledge base** - Browse FYP guidelines and resources
3. **Contact your supervisor** - They can provide personalized guidance
4. **Ask a peer** - Other students might have faced similar challenges

**Common FYP Topics I Can Help With:**
- Project proposal writing
- Literature review guidance
- Methodology selection
- Timeline planning
- Technical implementation advice
- Documentation requirements

**Getting Better Help:**
- Be specific about your project type and specialization
- Mention what phase of the project you're in
- Include relevant context about your challenges

{{#if supervisorContact}}
Your supervisor {{supervisorContact}} would be the best person to provide detailed guidance on this specific question.
{{/if}}

Would you like to try rephrasing your question, or would you prefer guidance on any of the topics I mentioned above?`,
        category: 'Fallback',
        triggerKeywords: [
          'unclear',
          'not sure',
          "don't understand",
          'confused',
        ],
        variables: {
          supervisorContact: 'Dr. [Supervisor Name]',
        },
        language: 'en',
      },

      {
        name: 'Service Unavailable',
        template: `I'm currently experiencing some technical difficulties, but I still want to help you with your FYP!

**While I'm getting back online, here are some resources:**

**Immediate Help:**
- Check the FYP Guidelines document in your course materials
- Review sample project reports from previous years
- Consult the university's FYP handbook

**For Urgent Questions:**
- Contact your project supervisor directly
- Visit the Computer Science department office
- Check the department website for announcements

**Common Resources:**
- IEEE Xplore Digital Library (for research papers)
- University library research guides
- FYP presentation templates
- Code repository guidelines

**When I'm Back Online:**
I'll be able to help with literature reviews, methodology selection, technical guidance, and project planning.

**Contact Information:**
- Department Office: [Office Hours and Location]
- Academic Support: [Contact Details]
- Technical Support: [IT Help Desk]

Thank you for your patience! Please try asking your question again in a few minutes.`,
        category: 'System',
        triggerKeywords: [
          'error',
          'unavailable',
          'not working',
          'technical problem',
        ],
        variables: {},
        language: 'en',
      },
    ];

    for (const template of templates) {
      const existingTemplate = await this.templateRepository.findOne({
        where: { name: template.name },
      });

      if (!existingTemplate) {
        const responseTemplate = this.templateRepository.create(template);
        await this.templateRepository.save(responseTemplate);
        this.logger.log(`Created response template: ${template.name}`);
      } else {
        this.logger.log(`Response template already exists: ${template.name}`);
      }
    }
  }

  async seedSampleQAPairs(): Promise<void> {
    this.logger.log('Seeding sample Q&A pairs...');

    // Get admin user for created_by field
    const adminUser = await this.userRepository.findOne({
      where: { email: 'admin@ui.edu.ng' },
    });

    const qaPairs = [
      // Project Proposal Q&As
      {
        title: 'How long should my FYP proposal be?',
        content: `**Question:** How long should my Final Year Project proposal be?

**Answer:** Your FYP proposal should be **15-20 pages maximum**, excluding references and appendices. Here's the recommended page distribution:

- **Title Page:** 1 page
- **Abstract:** 1 page (200-300 words)
- **Introduction & Problem Statement:** 2-3 pages
- **Literature Review:** 4-5 pages
- **Objectives:** 1 page
- **Methodology:** 3-4 pages
- **Timeline:** 1-2 pages
- **Expected Outcomes:** 1 page
- **Resources Required:** 1 page
- **References:** 2-3 pages (not counted in page limit)

**Formatting Requirements:**
- 12-point Times New Roman font
- Double-spaced text
- 1-inch margins on all sides
- Proper headings and subheadings

**Quality over Quantity:** Focus on clear, concise writing rather than trying to reach a specific page count. Every section should add value to your proposal.

**Pro Tip:** Start with a detailed outline to ensure you cover all required sections within the page limit.`,
        category: 'Project Proposal',
        tags: ['proposal', 'length', 'formatting', 'requirements'],
        keywords: [
          'proposal length',
          'how long',
          'page count',
          'formatting',
          'requirements',
        ],
        contentType: ContentType.FAQ,
        language: 'en',
      },

      {
        title: 'What makes a good FYP topic?',
        content: `**Question:** What makes a good Final Year Project topic?

**Answer:** A good FYP topic should have these characteristics:

**1. Personal Interest & Passion**
- Choose something you're genuinely excited about
- You'll spend 6+ months working on this project
- Your enthusiasm will show in the quality of work

**2. Appropriate Scope**
- Not too ambitious for the available time (6 months)
- Not too simple that it lacks academic rigor
- Can be completed with available resources

**3. Clear Problem Statement**
- Addresses a real-world problem or research gap
- Has measurable objectives
- Can be validated or evaluated

**4. Technical Feasibility**
- Matches your current skill level or allows reasonable learning
- Required technologies are accessible
- No major external dependencies

**5. Supervisor Alignment**
- Matches your supervisor's expertise area
- They can provide meaningful guidance
- Fits within department research themes

**6. Innovation & Contribution**
- Adds something new to existing knowledge/solutions
- Could be a novel application of existing techniques
- Demonstrates your understanding and creativity

**Examples of Good Topics:**
- "Machine Learning-based Student Performance Prediction System"
- "Blockchain Implementation for Academic Credential Verification"
- "Mobile App for Campus Navigation with AR Features"

**Red Flags to Avoid:**
- "Build a social media platform like Facebook"
- "Solve climate change with AI"
- "Create a new programming language"

**Getting Ideas:**
- Review recent conference papers in your area
- Look at current industry challenges
- Consider improving existing university systems
- Discuss with faculty about ongoing research`,
        category: 'Project Selection',
        tags: ['topic-selection', 'project-ideas', 'scope', 'feasibility'],
        keywords: [
          'good topic',
          'project selection',
          'topic ideas',
          'scope',
          'feasibility',
        ],
        contentType: ContentType.FAQ,
        language: 'en',
      },

      // Literature Review Q&As
      {
        title: 'How many sources do I need for my literature review?',
        content: `**Question:** How many sources do I need for my literature review?

**Answer:** For a Computer Science FYP literature review, you should aim for:

**Minimum Requirements:**
- **15-25 high-quality academic sources**
- At least 60% should be from the last 5 years
- Mix of journal articles and conference papers
- Include 2-3 seminal works in your field (even if older)

**Source Quality Hierarchy:**
1. **Tier 1 (Highest Priority):**
   - Peer-reviewed journal articles
   - Top-tier conference papers (IEEE, ACM)
   - Recent survey papers in your area

2. **Tier 2 (Good Supporting Sources):**
   - Conference papers from reputable venues
   - Book chapters from academic publishers
   - Technical reports from established institutions

3. **Tier 3 (Use Sparingly):**
   - Thesis/dissertation work
   - Preprint servers (arXiv)
   - Industry white papers
   - Government reports

**Quality Over Quantity:**
- 20 highly relevant, recent sources > 40 marginally related ones
- Each source should contribute to your argument
- Avoid padding with low-quality sources

**Distribution by Project Type:**
- **Theoretical/Research Projects:** 25-30 sources
- **Applied/Development Projects:** 15-20 sources
- **Survey/Comparison Projects:** 30+ sources

**Red Flags:**
- Too many sources older than 10 years
- Over-reliance on web sources or blogs
- Multiple sources saying the same thing
- Sources not directly related to your topic

**Pro Tips:**
- Start with recent survey papers to get an overview
- Use citation tracking to find related work
- Keep detailed notes with page numbers for quotes
- Organize sources by themes, not chronologically`,
        category: 'Literature Review',
        tags: [
          'literature-review',
          'sources',
          'references',
          'academic-writing',
        ],
        keywords: [
          'how many sources',
          'literature review',
          'references',
          'citations',
          'academic sources',
        ],
        contentType: ContentType.FAQ,
        language: 'en',
      },

      // Methodology Q&As
      {
        title: 'Should I use Agile or Waterfall methodology?',
        content: `**Question:** Should I use Agile or Waterfall methodology for my FYP?

**Answer:** The choice depends on your project characteristics. Here's a decision guide:

**Choose Agile When:**
- Building web/mobile applications
- Requirements may evolve during development
- You need regular user feedback
- Working on innovative or experimental features
- Your supervisor prefers iterative progress reviews
- You're comfortable with flexible planning

**Agile Benefits for FYP:**
- Regular deliverables show consistent progress
- Easier to adapt to new requirements or challenges
- Built-in reflection and improvement cycles
- Good for projects with user interaction components

**Choose Waterfall When:**
- Requirements are well-defined and stable
- Working on system integration projects
- Extensive documentation is required
- Your project has clear, sequential phases
- Working with legacy systems or strict constraints
- Research-heavy projects with defined methodology

**Waterfall Benefits for FYP:**
- Clear milestones and deliverables
- Comprehensive documentation at each phase
- Easier to plan timeline and resources
- Good for projects requiring formal approval processes

**Hybrid Approach (Recommended for Many FYPs):**
- Use Waterfall for high-level planning and documentation
- Apply Agile principles within implementation phases
- Regular supervisor meetings (like sprint reviews)
- Iterative development with documented milestones

**Example Timeline:**
**Weeks 1-4:** Requirements & Design (Waterfall approach)
**Weeks 5-16:** Implementation (Agile sprints)
**Weeks 17-20:** Testing & Documentation (Waterfall approach)

**Key Considerations:**
- Your supervisor's preference and experience
- University documentation requirements
- Your comfort level with each approach
- Project complexity and risk factors

**Remember:** The methodology should serve your project, not constrain it. Choose what helps you deliver quality work on time.`,
        category: 'Methodology',
        tags: ['methodology', 'agile', 'waterfall', 'development-process'],
        keywords: [
          'agile vs waterfall',
          'methodology choice',
          'development process',
          'project management',
        ],
        contentType: ContentType.FAQ,
        language: 'en',
      },
    ];

    for (const qa of qaPairs) {
      const existingQA = await this.knowledgeRepository.findOne({
        where: { title: qa.title },
      });

      if (!existingQA) {
        const knowledgeEntry = this.knowledgeRepository.create({
          ...qa,
          createdBy: adminUser,
          createdById: adminUser?.id || null,
        });

        await this.knowledgeRepository.save(knowledgeEntry);
        this.logger.log(`Created Q&A entry: ${qa.title}`);
      } else {
        this.logger.log(`Q&A entry already exists: ${qa.title}`);
      }
    }
  }
}
