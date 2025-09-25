import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UniversityEmailDomain {
  domain: string;
  description: string;
  userTypes: string[];
}

@Injectable()
export class UniversityValidationService {
  private readonly allowedDomains: UniversityEmailDomain[];

  constructor(private readonly configService: ConfigService) {
    // Get allowed domains from environment or use defaults
    this.allowedDomains = this.initializeAllowedDomains();
  }

  private initializeAllowedDomains(): UniversityEmailDomain[] {
    // Try to get from environment first
    const envDomains = this.configService.get<string>('ALLOWED_EMAIL_DOMAINS');

    if (envDomains) {
      try {
        return JSON.parse(envDomains);
      } catch (error) {
        console.warn(
          'Failed to parse ALLOWED_EMAIL_DOMAINS from environment, using defaults',
        );
      }
    }

    // Default University of Ibadan domains
    return [
      {
        domain: '@ui.edu.ng',
        description: 'University of Ibadan - Staff/Faculty',
        userTypes: ['staff', 'faculty', 'supervisor', 'admin'],
      },
      {
        domain: '@stu.ui.edu.ng',
        description: 'University of Ibadan - Students',
        userTypes: ['student'],
      },
      {
        domain: '@student.ui.edu.ng',
        description: 'University of Ibadan - Students (Alternative)',
        userTypes: ['student'],
      },
      {
        domain: '@postgrad.ui.edu.ng',
        description: 'University of Ibadan - Postgraduate Students',
        userTypes: ['student', 'postgraduate'],
      },
    ];
  }

  /**
   * Check if an email domain is valid for the university
   */
  isValidUniversityEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();

    return this.allowedDomains.some((domainConfig) =>
      normalizedEmail.endsWith(domainConfig.domain.toLowerCase()),
    );
  }

  /**
   * Check if an email domain is valid for a specific user role
   */
  isValidEmailForRole(email: string, role: string): boolean {
    if (!this.isValidUniversityEmail(email)) {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role.toLowerCase();

    const matchingDomain = this.allowedDomains.find((domainConfig) =>
      normalizedEmail.endsWith(domainConfig.domain.toLowerCase()),
    );

    if (!matchingDomain) {
      return false;
    }

    // If no specific user types are defined, allow all roles
    if (!matchingDomain.userTypes || matchingDomain.userTypes.length === 0) {
      return true;
    }

    return matchingDomain.userTypes.some(
      (userType) => userType.toLowerCase() === normalizedRole,
    );
  }

  /**
   * Get the domain configuration for an email
   */
  getDomainConfig(email: string): UniversityEmailDomain | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const normalizedEmail = email.toLowerCase().trim();

    return (
      this.allowedDomains.find((domainConfig) =>
        normalizedEmail.endsWith(domainConfig.domain.toLowerCase()),
      ) || null
    );
  }

  /**
   * Get all allowed domains
   */
  getAllowedDomains(): UniversityEmailDomain[] {
    return [...this.allowedDomains];
  }

  /**
   * Get allowed domains for a specific role
   */
  getAllowedDomainsForRole(role: string): UniversityEmailDomain[] {
    const normalizedRole = role.toLowerCase();

    return this.allowedDomains.filter(
      (domainConfig) =>
        !domainConfig.userTypes ||
        domainConfig.userTypes.length === 0 ||
        domainConfig.userTypes.some(
          (userType) => userType.toLowerCase() === normalizedRole,
        ),
    );
  }

  /**
   * Extract domain from email
   */
  extractDomain(email: string): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) {
      return null;
    }

    return email.substring(atIndex).toLowerCase();
  }

  /**
   * Get user type suggestions based on email domain
   */
  suggestUserTypeFromEmail(email: string): string[] {
    const domainConfig = this.getDomainConfig(email);
    return domainConfig?.userTypes || [];
  }

  /**
   * Validate email format and university domain
   */
  validateEmailFormat(email: string): {
    isValid: boolean;
    isUniversityEmail: boolean;
    domain?: string;
    domainConfig?: UniversityEmailDomain;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
      return { isValid: false, isUniversityEmail: false, errors };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
      return { isValid: false, isUniversityEmail: false, errors };
    }

    const domain = this.extractDomain(email);
    const domainConfig = this.getDomainConfig(email);
    const isUniversityEmail = this.isValidUniversityEmail(email);

    if (!isUniversityEmail) {
      const allowedDomains = this.allowedDomains
        .map((d) => d.domain)
        .join(', ');
      errors.push(
        `Email must be from University of Ibadan. Allowed domains: ${allowedDomains}`,
      );
    }

    return {
      isValid: errors.length === 0,
      isUniversityEmail,
      domain: domain || undefined,
      domainConfig: domainConfig || undefined,
      errors,
    };
  }
}
