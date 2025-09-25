import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('response_templates')
export class ResponseTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column('text')
  template: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text', array: true, default: '{}' })
  triggerKeywords: string[];

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, any> | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  effectivenessScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods for template management
  incrementUsage(): void {
    this.usageCount += 1;
  }

  updateEffectiveness(newScore: number, totalScores: number): void {
    // Calculate new average effectiveness score
    const currentTotal = this.effectivenessScore * (totalScores - 1);
    this.effectivenessScore = (currentTotal + newScore) / totalScores;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  addTriggerKeyword(keyword: string): void {
    if (!this.triggerKeywords.includes(keyword.toLowerCase())) {
      this.triggerKeywords.push(keyword.toLowerCase());
    }
  }

  removeTriggerKeyword(keyword: string): void {
    this.triggerKeywords = this.triggerKeywords.filter(
      (k) => k !== keyword.toLowerCase(),
    );
  }

  setVariable(key: string, value: any): void {
    if (!this.variables) {
      this.variables = {};
    }
    this.variables[key] = value;
  }

  getVariable(key: string): any {
    return this.variables?.[key];
  }

  removeVariable(key: string): void {
    if (this.variables && key in this.variables) {
      delete this.variables[key];
    }
  }

  // Template processing methods
  processTemplate(substitutions: Record<string, string> = {}): string {
    let processedTemplate = this.template;

    // Replace template variables with provided substitutions
    Object.entries(substitutions).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder, 'g'),
        value,
      );
    });

    // Replace with default variables if no substitution provided
    if (this.variables) {
      Object.entries(this.variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        if (processedTemplate.includes(placeholder)) {
          processedTemplate = processedTemplate.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
        }
      });
    }

    return processedTemplate;
  }

  matchesKeywords(query: string): boolean {
    const queryLower = query.toLowerCase();
    return this.triggerKeywords.some((keyword) => queryLower.includes(keyword));
  }

  getMatchScore(query: string): number {
    const queryLower = query.toLowerCase();
    const matchedKeywords = this.triggerKeywords.filter((keyword) =>
      queryLower.includes(keyword),
    );

    if (matchedKeywords.length === 0) {
      return 0;
    }

    // Calculate match score based on number of matched keywords and their relevance
    const matchRatio = matchedKeywords.length / this.triggerKeywords.length;
    const queryRelevance =
      matchedKeywords.reduce((score, keyword) => {
        const keywordIndex = queryLower.indexOf(keyword);
        // Earlier keywords in query get higher score
        const positionScore = 1 - keywordIndex / queryLower.length;
        return score + positionScore;
      }, 0) / matchedKeywords.length;

    return (matchRatio + queryRelevance) / 2;
  }

  // Status check methods
  isEffective(): boolean {
    return this.effectivenessScore >= 3.5;
  }

  isPopular(): boolean {
    return this.usageCount >= 5;
  }

  isMultilingual(): boolean {
    return this.language !== 'en';
  }

  hasVariables(): boolean {
    return this.variables !== null && Object.keys(this.variables).length > 0;
  }

  getVariableKeys(): string[] {
    return this.variables ? Object.keys(this.variables) : [];
  }

  // Template validation
  validateTemplate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed template variables
    const unclosedMatches = this.template.match(/\{\{[^}]*$/g);
    if (unclosedMatches) {
      errors.push('Template contains unclosed variable placeholders');
    }

    // Check for unopened template variables
    const unopenedMatches = this.template.match(/^[^{]*\}\}/g);
    if (unopenedMatches) {
      errors.push('Template contains unopened variable placeholders');
    }

    // Check if template is not empty
    if (!this.template.trim()) {
      errors.push('Template content cannot be empty');
    }

    // Check if name is not empty
    if (!this.name.trim()) {
      errors.push('Template name cannot be empty');
    }

    // Check if category is not empty
    if (!this.category.trim()) {
      errors.push('Template category cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
