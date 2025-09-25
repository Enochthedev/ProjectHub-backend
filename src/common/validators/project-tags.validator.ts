import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Common project tags for suggestions
export const COMMON_PROJECT_TAGS = [
  // Project Types
  'web-application',
  'mobile-app',
  'desktop-app',
  'api',
  'microservices',
  'full-stack',
  'frontend',
  'backend',
  'database',
  'machine-learning',
  'artificial-intelligence',
  'data-science',
  'cybersecurity',
  'blockchain',
  'iot',
  'game-development',
  'e-commerce',
  'social-media',
  'chat-application',

  // Technologies & Frameworks
  'react',
  'vue',
  'angular',
  'nodejs',
  'python',
  'java',
  'csharp',
  'javascript',
  'typescript',
  'php',
  'ruby',
  'go',
  'rust',

  // Domains
  'healthcare',
  'education',
  'finance',
  'entertainment',
  'productivity',
  'social-networking',
  'business',
  'travel',
  'food',
  'sports',
  'news',
  'weather',
  'music',
  'video',
  'photography',

  // Features
  'real-time',
  'responsive',
  'progressive-web-app',
  'single-page-app',
  'multi-platform',
  'cross-platform',
  'cloud-native',
  'serverless',
  'microservices',
  'monolithic',
  'restful-api',
  'graphql',

  // Methodologies
  'agile',
  'scrum',
  'test-driven-development',
  'continuous-integration',
  'continuous-deployment',
  'devops',
  'mvp',
  'prototype',

  // Complexity
  'beginner-friendly',
  'intermediate',
  'advanced',
  'research-oriented',
  'industry-standard',
  'innovative',
  'experimental',
] as const;

@ValidatorConstraint({ name: 'projectTagsValidator', async: false })
export class ProjectTagsValidatorConstraint
  implements ValidatorConstraintInterface
{
  validate(tags: string[], args: ValidationArguments) {
    if (!Array.isArray(tags)) {
      return false;
    }

    // Check each tag
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return false;
      }

      // Check length constraints
      if (tag.trim().length > 30) {
        return false;
      }

      // Check format (lowercase, alphanumeric, hyphens)
      if (!/^[a-z0-9-]+$/.test(tag.trim())) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Each tag must be a non-empty string with maximum 30 characters, containing only lowercase letters, numbers, and hyphens';
  }
}

export function IsProjectTagsValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ProjectTagsValidatorConstraint,
    });
  };
}

export function getSuggestedTags(partial: string): string[] {
  if (!partial || partial.length < 2) {
    return COMMON_PROJECT_TAGS.slice(0, 10);
  }

  const lowerPartial = partial.toLowerCase();
  const suggestions = COMMON_PROJECT_TAGS.filter((tag) =>
    tag.includes(lowerPartial),
  );

  return suggestions.slice(0, 10);
}

export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
