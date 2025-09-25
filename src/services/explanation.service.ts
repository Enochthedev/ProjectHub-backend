import { Injectable } from '@nestjs/common';
import {
  ProjectRecommendationDto,
  RecommendationExplanationDto,
} from '../dto/recommendation';
import { StudentProfile } from '../entities/student-profile.entity';

export interface AccessibleExplanation {
  plainLanguage: string;
  technicalTerms: { [key: string]: string };
  visualElements: {
    scoreVisualization: ScoreVisualization;
    matchingElements: MatchingElementsVisualization;
    progressIndicators: ProgressIndicator[];
  };
  accessibility: {
    screenReaderText: string;
    ariaLabels: { [key: string]: string };
    keyboardNavigation: boolean;
  };
}

export interface ScoreVisualization {
  type: 'progress-bar' | 'star-rating' | 'percentage-circle';
  value: number;
  maxValue: number;
  label: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
  description: string;
}

export interface MatchingElementsVisualization {
  skills: MatchingElement[];
  interests: MatchingElement[];
  specializations: MatchingElement[];
}

export interface MatchingElement {
  name: string;
  matchStrength: 'strong' | 'moderate' | 'weak';
  explanation: string;
  icon?: string;
}

export interface ProgressIndicator {
  label: string;
  value: number;
  maxValue: number;
  description: string;
  helpText: string;
}

@Injectable()
export class ExplanationService {
  /**
   * Generate user-friendly explanation for a recommendation
   */
  generateAccessibleExplanation(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): AccessibleExplanation {
    const plainLanguage = this.generatePlainLanguageExplanation(
      recommendation,
      studentProfile,
    );
    const technicalTerms = this.extractTechnicalTerms(recommendation);
    const visualElements = this.createVisualElements(
      recommendation,
      studentProfile,
    );
    const accessibility = this.generateAccessibilityFeatures(
      recommendation,
      plainLanguage,
    );

    return {
      plainLanguage,
      technicalTerms,
      visualElements,
      accessibility,
    };
  }

  /**
   * Generate plain language explanation avoiding technical jargon
   */
  private generatePlainLanguageExplanation(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): string {
    const explanationParts: string[] = [];

    // Overall match quality
    const scoreDescription = this.getScoreDescription(
      recommendation.similarityScore,
    );
    explanationParts.push(`This project is ${scoreDescription} for you.`);

    // Skills matching
    if (recommendation.matchingSkills.length > 0) {
      const skillsText = this.formatSkillsExplanation(
        recommendation.matchingSkills,
      );
      explanationParts.push(
        `Your experience with ${skillsText} makes you well-suited for this project.`,
      );
    }

    // Interests matching
    if (recommendation.matchingInterests.length > 0) {
      const interestsText = this.formatInterestsExplanation(
        recommendation.matchingInterests,
      );
      explanationParts.push(
        `This project aligns with your interests in ${interestsText}.`,
      );
    }

    // Specialization alignment
    if (
      studentProfile.preferredSpecializations?.includes(
        recommendation.specialization,
      )
    ) {
      explanationParts.push(
        `This project is in ${recommendation.specialization}, which matches your preferred area of study.`,
      );
    }

    // Difficulty level
    const difficultyExplanation = this.getDifficultyExplanation(
      recommendation.difficultyLevel,
    );
    explanationParts.push(difficultyExplanation);

    // Supervisor information
    explanationParts.push(
      `You'll be working with ${recommendation.supervisor.name}, who specializes in ${recommendation.supervisor.specialization}.`,
    );

    // Diversity boost explanation
    if (recommendation.diversityBoost && recommendation.diversityBoost > 0) {
      explanationParts.push(
        'This project was also recommended to help you explore different areas and broaden your experience.',
      );
    }

    return explanationParts.join(' ');
  }

  /**
   * Get user-friendly score description
   */
  private getScoreDescription(score: number): string {
    if (score >= 0.9) return 'an excellent match';
    if (score >= 0.8) return 'a very good match';
    if (score >= 0.7) return 'a good match';
    if (score >= 0.6) return 'a decent match';
    if (score >= 0.5) return 'a reasonable match';
    return 'worth considering';
  }

  /**
   * Format skills explanation in plain language
   */
  private formatSkillsExplanation(skills: string[]): string {
    if (skills.length === 1) {
      return skills[0];
    } else if (skills.length === 2) {
      return `${skills[0]} and ${skills[1]}`;
    } else {
      const lastSkill = skills[skills.length - 1];
      const otherSkills = skills.slice(0, -1).join(', ');
      return `${otherSkills}, and ${lastSkill}`;
    }
  }

  /**
   * Format interests explanation in plain language
   */
  private formatInterestsExplanation(interests: string[]): string {
    return this.formatSkillsExplanation(interests); // Same formatting logic
  }

  /**
   * Get difficulty level explanation
   */
  private getDifficultyExplanation(difficulty: string): string {
    const difficultyMap: { [key: string]: string } = {
      beginner:
        'This project is designed for students who are new to this area and want to learn the fundamentals.',
      intermediate:
        'This project requires some background knowledge and is perfect for building on your existing skills.',
      advanced:
        'This is a challenging project that will push your skills and help you develop expertise in this area.',
      expert:
        'This is a highly complex project suitable for students with strong technical backgrounds who want to tackle cutting-edge challenges.',
    };

    return (
      difficultyMap[difficulty.toLowerCase()] ||
      'This project will provide a good learning experience.'
    );
  }

  /**
   * Extract technical terms and provide definitions
   */
  private extractTechnicalTerms(recommendation: ProjectRecommendationDto): {
    [key: string]: string;
  } {
    const terms: { [key: string]: string } = {};

    // Add definitions for technical skills
    recommendation.matchingSkills.forEach((skill) => {
      const definition = this.getSkillDefinition(skill);
      if (definition) {
        terms[skill] = definition;
      }
    });

    // Add specialization definition
    const specializationDefinition = this.getSpecializationDefinition(
      recommendation.specialization,
    );
    if (specializationDefinition) {
      terms[recommendation.specialization] = specializationDefinition;
    }

    // Add similarity score definition
    terms['Similarity Score'] =
      'A number between 0 and 1 that shows how well your profile matches this project. Higher numbers mean better matches.';

    return terms;
  }

  /**
   * Get definition for a technical skill
   */
  private getSkillDefinition(skill: string): string | null {
    const skillDefinitions: { [key: string]: string } = {
      JavaScript:
        'A programming language used to create interactive websites and web applications.',
      Python:
        'A versatile programming language popular for data analysis, web development, and artificial intelligence.',
      React:
        'A JavaScript library for building user interfaces, especially for web applications.',
      'Node.js':
        'A runtime environment that allows JavaScript to run on servers, not just in web browsers.',
      'Machine Learning':
        'A type of artificial intelligence where computers learn patterns from data to make predictions.',
      'Data Science':
        'The field that combines statistics, programming, and domain knowledge to extract insights from data.',
      'Web Development':
        'The process of creating websites and web applications that run in internet browsers.',
      'Mobile Development':
        'Creating applications that run on smartphones and tablets.',
      Database:
        'A system for storing and organizing large amounts of information that can be quickly searched and retrieved.',
      API: 'Application Programming Interface - a way for different software programs to communicate with each other.',
      'Cloud Computing':
        'Using internet-based services to store data and run applications instead of local computers.',
      Cybersecurity:
        'The practice of protecting computer systems, networks, and data from digital attacks.',
    };

    // Try exact match first
    if (skillDefinitions[skill]) {
      return skillDefinitions[skill];
    }

    // Try partial matches
    for (const [key, definition] of Object.entries(skillDefinitions)) {
      if (
        skill.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(skill.toLowerCase())
      ) {
        return definition;
      }
    }

    return null;
  }

  /**
   * Get definition for a specialization
   */
  private getSpecializationDefinition(specialization: string): string | null {
    const specializationDefinitions: { [key: string]: string } = {
      'Software Engineering':
        'The systematic approach to designing, developing, and maintaining large-scale software systems.',
      'Data Science':
        'Using statistical methods and programming to analyze large datasets and extract meaningful insights.',
      'Artificial Intelligence':
        'Creating computer systems that can perform tasks typically requiring human intelligence.',
      Cybersecurity:
        'Protecting digital systems, networks, and data from cyber threats and attacks.',
      'Web Development':
        'Building websites and web applications that users interact with through internet browsers.',
      'Mobile Development':
        'Creating applications specifically designed to run on smartphones and tablets.',
      'Game Development':
        'Designing and programming video games for various platforms like computers, consoles, and mobile devices.',
      'Human-Computer Interaction':
        'Studying how people interact with computers and designing user-friendly interfaces.',
      'Computer Networks':
        'The study of how computers communicate and share resources over networks like the internet.',
      'Database Systems':
        'Designing and managing systems that store, organize, and retrieve large amounts of information.',
    };

    return specializationDefinitions[specialization] || null;
  }

  /**
   * Create visual elements for the explanation
   */
  private createVisualElements(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): {
    scoreVisualization: ScoreVisualization;
    matchingElements: MatchingElementsVisualization;
    progressIndicators: ProgressIndicator[];
  } {
    const scoreVisualization = this.createScoreVisualization(
      recommendation.similarityScore,
    );
    const matchingElements = this.createMatchingElementsVisualization(
      recommendation,
      studentProfile,
    );
    const progressIndicators = this.createProgressIndicators(
      recommendation,
      studentProfile,
    );

    return {
      scoreVisualization,
      matchingElements,
      progressIndicators,
    };
  }

  /**
   * Create score visualization
   */
  private createScoreVisualization(score: number): ScoreVisualization {
    let color: 'green' | 'yellow' | 'orange' | 'red';
    let description: string;

    if (score >= 0.8) {
      color = 'green';
      description =
        'Excellent match - this project aligns very well with your profile';
    } else if (score >= 0.6) {
      color = 'yellow';
      description =
        'Good match - this project has several elements that fit your interests';
    } else if (score >= 0.4) {
      color = 'orange';
      description =
        'Moderate match - this project might help you explore new areas';
    } else {
      color = 'red';
      description =
        'Lower match - consider this if you want to try something different';
    }

    return {
      type: 'progress-bar',
      value: Math.round(score * 100),
      maxValue: 100,
      label: 'Match Score',
      color,
      description,
    };
  }

  /**
   * Create matching elements visualization
   */
  private createMatchingElementsVisualization(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): MatchingElementsVisualization {
    const skills = recommendation.matchingSkills.map((skill) => ({
      name: skill,
      matchStrength: this.getMatchStrength(skill, studentProfile.skills || []),
      explanation: `Your experience with ${skill} is relevant to this project`,
      icon: this.getSkillIcon(skill),
    }));

    const interests = recommendation.matchingInterests.map((interest) => ({
      name: interest,
      matchStrength: this.getMatchStrength(
        interest,
        studentProfile.interests || [],
      ),
      explanation: `Your interest in ${interest} aligns with this project's focus`,
      icon: this.getInterestIcon(interest),
    }));

    const specializations = [
      {
        name: recommendation.specialization,
        matchStrength: studentProfile.preferredSpecializations?.includes(
          recommendation.specialization,
        )
          ? ('strong' as const)
          : ('moderate' as const),
        explanation: `This project is in the ${recommendation.specialization} field`,
        icon: this.getSpecializationIcon(recommendation.specialization),
      },
    ];

    return {
      skills,
      interests,
      specializations,
    };
  }

  /**
   * Determine match strength for an element
   */
  private getMatchStrength(
    element: string,
    userElements: string[],
  ): 'strong' | 'moderate' | 'weak' {
    const exactMatch = userElements.some(
      (userElement) => userElement.toLowerCase() === element.toLowerCase(),
    );

    if (exactMatch) return 'strong';

    const partialMatch = userElements.some(
      (userElement) =>
        userElement.toLowerCase().includes(element.toLowerCase()) ||
        element.toLowerCase().includes(userElement.toLowerCase()),
    );

    return partialMatch ? 'moderate' : 'weak';
  }

  /**
   * Get icon for a skill
   */
  private getSkillIcon(skill: string): string {
    const iconMap: { [key: string]: string } = {
      JavaScript: '🟨',
      Python: '🐍',
      React: '⚛️',
      'Node.js': '🟢',
      Java: '☕',
      'C++': '🔧',
      Database: '🗄️',
      'Machine Learning': '🤖',
      'Web Development': '🌐',
      'Mobile Development': '📱',
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (skill.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }

    return '💻'; // Default icon
  }

  /**
   * Get icon for an interest
   */
  private getInterestIcon(interest: string): string {
    const iconMap: { [key: string]: string } = {
      gaming: '🎮',
      web: '🌐',
      mobile: '📱',
      ai: '🤖',
      data: '📊',
      security: '🔒',
      design: '🎨',
      research: '🔬',
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (interest.toLowerCase().includes(key)) {
        return icon;
      }
    }

    return '💡'; // Default icon
  }

  /**
   * Get icon for a specialization
   */
  private getSpecializationIcon(specialization: string): string {
    const iconMap: { [key: string]: string } = {
      'Software Engineering': '⚙️',
      'Data Science': '📊',
      'Artificial Intelligence': '🤖',
      Cybersecurity: '🔒',
      'Web Development': '🌐',
      'Mobile Development': '📱',
      'Game Development': '🎮',
      'Human-Computer Interaction': '👥',
      'Computer Networks': '🌐',
      'Database Systems': '🗄️',
    };

    return iconMap[specialization] || '🎓';
  }

  /**
   * Create progress indicators
   */
  private createProgressIndicators(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): ProgressIndicator[] {
    const indicators: ProgressIndicator[] = [];

    // Skills match indicator
    const skillsMatchPercentage = this.calculateSkillsMatchPercentage(
      recommendation,
      studentProfile,
    );
    indicators.push({
      label: 'Skills Match',
      value: skillsMatchPercentage,
      maxValue: 100,
      description: `${skillsMatchPercentage}% of your skills are relevant to this project`,
      helpText:
        'This shows how many of your technical skills apply to this project',
    });

    // Interests alignment indicator
    const interestsMatchPercentage = this.calculateInterestsMatchPercentage(
      recommendation,
      studentProfile,
    );
    indicators.push({
      label: 'Interest Alignment',
      value: interestsMatchPercentage,
      maxValue: 100,
      description: `${interestsMatchPercentage}% alignment with your stated interests`,
      helpText:
        'This measures how well the project matches what you enjoy working on',
    });

    // Specialization fit indicator
    const specializationFit = studentProfile.preferredSpecializations?.includes(
      recommendation.specialization,
    )
      ? 100
      : 50;
    indicators.push({
      label: 'Specialization Fit',
      value: specializationFit,
      maxValue: 100,
      description:
        specializationFit === 100
          ? 'Perfect match with your preferred specialization'
          : 'Different from your main specialization - good for exploration',
      helpText:
        'This shows how well the project fits your chosen field of study',
    });

    return indicators;
  }

  /**
   * Calculate skills match percentage
   */
  private calculateSkillsMatchPercentage(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): number {
    const studentSkills = studentProfile.skills || [];
    const matchingSkills = recommendation.matchingSkills.length;

    if (studentSkills.length === 0) return 0;

    return Math.min(
      100,
      Math.round((matchingSkills / studentSkills.length) * 100),
    );
  }

  /**
   * Calculate interests match percentage
   */
  private calculateInterestsMatchPercentage(
    recommendation: ProjectRecommendationDto,
    studentProfile: StudentProfile,
  ): number {
    const studentInterests = studentProfile.interests || [];
    const matchingInterests = recommendation.matchingInterests.length;

    if (studentInterests.length === 0) return 0;

    return Math.min(
      100,
      Math.round((matchingInterests / studentInterests.length) * 100),
    );
  }

  /**
   * Generate accessibility features
   */
  private generateAccessibilityFeatures(
    recommendation: ProjectRecommendationDto,
    plainLanguage: string,
  ): {
    screenReaderText: string;
    ariaLabels: { [key: string]: string };
    keyboardNavigation: boolean;
  } {
    const screenReaderText = this.generateScreenReaderText(
      recommendation,
      plainLanguage,
    );
    const ariaLabels = this.generateAriaLabels(recommendation);

    return {
      screenReaderText,
      ariaLabels,
      keyboardNavigation: true,
    };
  }

  /**
   * Generate screen reader friendly text
   */
  private generateScreenReaderText(
    recommendation: ProjectRecommendationDto,
    plainLanguage: string,
  ): string {
    const parts: string[] = [];

    parts.push(`Project recommendation: ${recommendation.title}`);
    parts.push(
      `Match score: ${Math.round(recommendation.similarityScore * 100)} percent`,
    );
    parts.push(`Difficulty level: ${recommendation.difficultyLevel}`);
    parts.push(`Specialization: ${recommendation.specialization}`);

    if (recommendation.matchingSkills.length > 0) {
      parts.push(
        `Matching skills: ${recommendation.matchingSkills.join(', ')}`,
      );
    }

    if (recommendation.matchingInterests.length > 0) {
      parts.push(
        `Matching interests: ${recommendation.matchingInterests.join(', ')}`,
      );
    }

    parts.push(`Supervisor: ${recommendation.supervisor.name}`);
    parts.push(`Explanation: ${plainLanguage}`);

    return parts.join('. ') + '.';
  }

  /**
   * Generate ARIA labels for interactive elements
   */
  private generateAriaLabels(recommendation: ProjectRecommendationDto): {
    [key: string]: string;
  } {
    return {
      'match-score': `Match score: ${Math.round(recommendation.similarityScore * 100)} percent out of 100`,
      'project-title': `Project title: ${recommendation.title}`,
      'difficulty-level': `Difficulty level: ${recommendation.difficultyLevel}`,
      specialization: `Specialization area: ${recommendation.specialization}`,
      supervisor: `Supervisor: ${recommendation.supervisor.name}, specializing in ${recommendation.supervisor.specialization}`,
      'skills-match': `Skills that match: ${recommendation.matchingSkills.join(', ') || 'None specified'}`,
      'interests-match': `Interests that match: ${recommendation.matchingInterests.join(', ') || 'None specified'}`,
      'view-details': `View detailed information about ${recommendation.title}`,
      'provide-feedback': `Provide feedback on this recommendation for ${recommendation.title}`,
    };
  }
}
