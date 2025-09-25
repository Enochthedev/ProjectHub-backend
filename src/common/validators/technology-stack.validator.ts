import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Common technology stacks for suggestions
export const COMMON_TECHNOLOGIES = [
  // Frontend
  'React',
  'Vue.js',
  'Angular',
  'Next.js',
  'Nuxt.js',
  'Svelte',
  'TypeScript',
  'JavaScript',
  'HTML5',
  'CSS3',
  'Tailwind CSS',
  'Bootstrap',
  'Material-UI',
  'Chakra UI',

  // Backend
  'Node.js',
  'Express.js',
  'NestJS',
  'Python',
  'Django',
  'Flask',
  'FastAPI',
  'Java',
  'Spring Boot',
  'C#',
  '.NET',
  'PHP',
  'Laravel',
  'Ruby',
  'Ruby on Rails',
  'Go',
  'Rust',
  'Kotlin',

  // Databases
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'SQLite',
  'Firebase',
  'Supabase',
  'Elasticsearch',
  'Neo4j',
  'DynamoDB',

  // Cloud & DevOps
  'AWS',
  'Google Cloud',
  'Azure',
  'Docker',
  'Kubernetes',
  'Jenkins',
  'GitHub Actions',
  'Terraform',
  'Ansible',
  'Nginx',
  'Apache',

  // Mobile
  'React Native',
  'Flutter',
  'Swift',
  'Kotlin',
  'Ionic',
  'Xamarin',

  // AI/ML
  'TensorFlow',
  'PyTorch',
  'Scikit-learn',
  'Pandas',
  'NumPy',
  'OpenCV',
  'Jupyter',
  'R',
  'MATLAB',

  // Tools & Others
  'Git',
  'Webpack',
  'Vite',
  'ESLint',
  'Prettier',
  'Jest',
  'Cypress',
  'Postman',
  'Figma',
  'Adobe XD',
] as const;

@ValidatorConstraint({ name: 'technologyStackValidator', async: false })
export class TechnologyStackValidatorConstraint
  implements ValidatorConstraintInterface
{
  validate(technologies: string[], args: ValidationArguments) {
    if (!Array.isArray(technologies)) {
      return false;
    }

    // Check each technology
    for (const tech of technologies) {
      if (typeof tech !== 'string' || tech.trim().length === 0) {
        return false;
      }

      // Check length constraints
      if (tech.trim().length > 50) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Each technology must be a non-empty string with maximum 50 characters';
  }
}

export function IsTechnologyStackValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: TechnologyStackValidatorConstraint,
    });
  };
}

export function getSuggestedTechnologies(partial: string): string[] {
  if (!partial || partial.length < 2) {
    return COMMON_TECHNOLOGIES.slice(0, 10);
  }

  const lowerPartial = partial.toLowerCase();
  const suggestions = COMMON_TECHNOLOGIES.filter((tech) =>
    tech.toLowerCase().includes(lowerPartial),
  );

  return suggestions.slice(0, 10);
}
