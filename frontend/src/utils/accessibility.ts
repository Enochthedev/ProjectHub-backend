// Accessibility testing and validation utilities

export interface AccessibilityCheckResult {
    passed: boolean;
    message: string;
    element?: HTMLElement;
    severity: 'error' | 'warning' | 'info';
}

export class AccessibilityChecker {
    private static instance: AccessibilityChecker;
    private checks: Array<(element: HTMLElement) => AccessibilityCheckResult[]> = [];

    static getInstance(): AccessibilityChecker {
        if (!AccessibilityChecker.instance) {
            AccessibilityChecker.instance = new AccessibilityChecker();
        }
        return AccessibilityChecker.instance;
    }

    constructor() {
        this.initializeChecks();
    }

    private initializeChecks() {
        this.checks = [
            this.checkButtonAccessibility,
            this.checkInputAccessibility,
            this.checkImageAccessibility,
            this.checkHeadingStructure,
            this.checkColorContrast,
            this.checkFocusManagement,
            this.checkAriaLabels,
            this.checkKeyboardNavigation,
        ];
    }

    // Check button accessibility
    private checkButtonAccessibility = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];
        const buttons = element.querySelectorAll('button, [role="button"]');

        buttons.forEach((button) => {
            const btn = button as HTMLElement;

            // Check for accessible name
            const accessibleName = this.getAccessibleName(btn);
            if (!accessibleName) {
                results.push({
                    passed: false,
                    message: 'Button missing accessible name (aria-label, aria-labelledby, or text content)',
                    element: btn,
                    severity: 'error',
                });
            }

            // Check for minimum touch target size
            const rect = btn.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                results.push({
                    passed: false,
                    message: 'Button smaller than minimum touch target size (44x44px)',
                    element: btn,
                    severity: 'warning',
                });
            }

            // Check for focus indicator
            if (!this.hasFocusIndicator(btn)) {
                results.push({
                    passed: false,
                    message: 'Button missing visible focus indicator',
                    element: btn,
                    severity: 'error',
                });
            }
        });

        return results;
    };

    // Check input accessibility
    private checkInputAccessibility = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];
        const inputs = element.querySelectorAll('input, textarea, select');

        inputs.forEach((input) => {
            const inp = input as HTMLInputElement;

            // Check for labels
            const hasLabel = this.hasAssociatedLabel(inp);
            if (!hasLabel) {
                results.push({
                    passed: false,
                    message: 'Input missing associated label',
                    element: inp,
                    severity: 'error',
                });
            }

            // Check for error handling
            if (inp.getAttribute('aria-invalid') === 'true') {
                const errorId = inp.getAttribute('aria-describedby');
                if (!errorId || !document.getElementById(errorId)) {
                    results.push({
                        passed: false,
                        message: 'Input with error state missing error description',
                        element: inp,
                        severity: 'error',
                    });
                }
            }

            // Check for required field indication
            if (inp.required && !inp.getAttribute('aria-required')) {
                results.push({
                    passed: false,
                    message: 'Required input missing aria-required attribute',
                    element: inp,
                    severity: 'warning',
                });
            }
        });

        return results;
    };

    // Check image accessibility
    private checkImageAccessibility = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];
        const images = element.querySelectorAll('img');

        images.forEach((img) => {
            const alt = img.getAttribute('alt');

            if (alt === null) {
                results.push({
                    passed: false,
                    message: 'Image missing alt attribute',
                    element: img,
                    severity: 'error',
                });
            } else if (alt === '' && !img.getAttribute('aria-hidden')) {
                // Empty alt is okay for decorative images, but should be explicit
                results.push({
                    passed: true,
                    message: 'Decorative image with empty alt text',
                    element: img,
                    severity: 'info',
                });
            }
        });

        return results;
    };

    // Check heading structure
    private checkHeadingStructure = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');

        let previousLevel = 0;
        headings.forEach((heading) => {
            const level = parseInt(heading.tagName.charAt(1));

            if (level > previousLevel + 1) {
                results.push({
                    passed: false,
                    message: `Heading level skipped from h${previousLevel} to h${level}`,
                    element: heading as HTMLElement,
                    severity: 'warning',
                });
            }

            previousLevel = level;
        });

        return results;
    };

    // Check color contrast (simplified)
    private checkColorContrast = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];

        // This is a simplified check - in production, you'd use a proper contrast calculation
        const textElements = element.querySelectorAll('p, span, div, button, a, label');

        textElements.forEach((el) => {
            const styles = window.getComputedStyle(el as HTMLElement);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;

            // Simple check for very light text on light background
            if (color.includes('rgb(255') && backgroundColor.includes('rgb(255')) {
                results.push({
                    passed: false,
                    message: 'Potential color contrast issue detected',
                    element: el as HTMLElement,
                    severity: 'warning',
                });
            }
        });

        return results;
    };

    // Check focus management
    private checkFocusManagement = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        // Check for focus traps in modals
        const modals = element.querySelectorAll('[role="dialog"], [aria-modal="true"]');
        modals.forEach((modal) => {
            const modalFocusable = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (modalFocusable.length === 0) {
                results.push({
                    passed: false,
                    message: 'Modal contains no focusable elements',
                    element: modal as HTMLElement,
                    severity: 'error',
                });
            }
        });

        return results;
    };

    // Check ARIA labels
    private checkAriaLabels = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];

        // Check for elements with ARIA roles but missing labels
        const ariaElements = element.querySelectorAll('[role]');
        ariaElements.forEach((el) => {
            const role = el.getAttribute('role');
            const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'option'];

            if (interactiveRoles.includes(role || '')) {
                const accessibleName = this.getAccessibleName(el as HTMLElement);
                if (!accessibleName) {
                    results.push({
                        passed: false,
                        message: `Element with role="${role}" missing accessible name`,
                        element: el as HTMLElement,
                        severity: 'error',
                    });
                }
            }
        });

        return results;
    };

    // Check keyboard navigation
    private checkKeyboardNavigation = (element: HTMLElement): AccessibilityCheckResult[] => {
        const results: AccessibilityCheckResult[] = [];

        // Check for elements that should be keyboard accessible
        const interactiveElements = element.querySelectorAll(
            'div[onclick], span[onclick], [role="button"]:not(button)'
        );

        interactiveElements.forEach((el) => {
            const tabIndex = el.getAttribute('tabindex');
            if (tabIndex === null || tabIndex === '-1') {
                results.push({
                    passed: false,
                    message: 'Interactive element not keyboard accessible (missing tabindex)',
                    element: el as HTMLElement,
                    severity: 'error',
                });
            }
        });

        return results;
    };

    // Helper methods
    private getAccessibleName(element: HTMLElement): string {
        // Check aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Check aria-labelledby
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelElement = document.getElementById(ariaLabelledBy);
            if (labelElement) return labelElement.textContent || '';
        }

        // Check text content
        return element.textContent?.trim() || '';
    }

    private hasAssociatedLabel(input: HTMLInputElement): boolean {
        // Check for explicit label
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return true;
        }

        // Check for implicit label (input inside label)
        const parentLabel = input.closest('label');
        if (parentLabel) return true;

        // Check for aria-label or aria-labelledby
        if (input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')) {
            return true;
        }

        return false;
    }

    private hasFocusIndicator(element: HTMLElement): boolean {
        // This is a simplified check - in practice, you'd need to test actual focus styles
        const styles = window.getComputedStyle(element, ':focus');
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
    }

    // Public methods
    public checkElement(element: HTMLElement): AccessibilityCheckResult[] {
        const allResults: AccessibilityCheckResult[] = [];

        this.checks.forEach((check) => {
            const results = check(element);
            allResults.push(...results);
        });

        return allResults;
    }

    public checkPage(): AccessibilityCheckResult[] {
        return this.checkElement(document.body);
    }

    public generateReport(results: AccessibilityCheckResult[]): string {
        const errors = results.filter(r => r.severity === 'error');
        const warnings = results.filter(r => r.severity === 'warning');
        const info = results.filter(r => r.severity === 'info');

        let report = '=== Accessibility Report ===\n\n';
        report += `Total Issues: ${results.length}\n`;
        report += `Errors: ${errors.length}\n`;
        report += `Warnings: ${warnings.length}\n`;
        report += `Info: ${info.length}\n\n`;

        if (errors.length > 0) {
            report += '--- ERRORS ---\n';
            errors.forEach((error, index) => {
                report += `${index + 1}. ${error.message}\n`;
            });
            report += '\n';
        }

        if (warnings.length > 0) {
            report += '--- WARNINGS ---\n';
            warnings.forEach((warning, index) => {
                report += `${index + 1}. ${warning.message}\n`;
            });
            report += '\n';
        }

        return report;
    }
}

// Utility functions for testing
export const checkAccessibility = (element?: HTMLElement): AccessibilityCheckResult[] => {
    const checker = AccessibilityChecker.getInstance();
    return element ? checker.checkElement(element) : checker.checkPage();
};

export const generateAccessibilityReport = (element?: HTMLElement): string => {
    const checker = AccessibilityChecker.getInstance();
    const results = element ? checker.checkElement(element) : checker.checkPage();
    return checker.generateReport(results);
};

// Screen reader utilities
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    setTimeout(() => {
        document.body.removeChild(announcer);
    }, 1000);
};

// Keyboard navigation utilities
export const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement?.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement?.focus();
                e.preventDefault();
            }
        }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
        container.removeEventListener('keydown', handleTabKey);
    };
};