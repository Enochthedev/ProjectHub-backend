#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Security audit configuration
const SECURITY_CONFIG = {
    // File patterns to scan for sensitive data
    sensitivePatterns: [
        /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i,
        /password["\s]*[:=]["\s]*[^"'\s]{8,}/i,
        /secret[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i,
        /access[_-]?token["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i,
        /mongodb:\/\/|mysql:\/\/|postgresql:\/\//i,
        /192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\./,
    ],

    // Required security headers
    requiredHeaders: [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Strict-Transport-Security',
    ],

    // Vulnerable dependencies (example patterns)
    vulnerableDependencies: [
        { name: 'lodash', versions: ['<4.17.21'] },
        { name: 'axios', versions: ['<0.21.1'] },
        { name: 'react-dom', versions: ['<16.14.0', '>=17.0.0 <17.0.2'] },
    ],

    // Files to exclude from scanning
    excludePatterns: [
        /node_modules/,
        /\.git/,
        /\.next/,
        /dist/,
        /build/,
        /coverage/,
    ],
};

class SecurityAuditor {
    constructor() {
        this.issues = [];
        this.warnings = [];
    }

    // Main audit function
    async runAudit() {
        console.log('🔒 Starting security audit...\n');

        try {
            await this.checkDependencyVulnerabilities();
            await this.scanSourceCode();
            await this.checkSecurityHeaders();
            await this.checkFilePermissions();
            await this.checkEnvironmentFiles();

            this.generateReport();
        } catch (error) {
            console.error('❌ Security audit failed:', error.message);
            process.exit(1);
        }
    }

    // Check for vulnerable dependencies
    async checkDependencyVulnerabilities() {
        console.log('📦 Checking dependency vulnerabilities...');

        try {
            // Run npm audit
            const auditResult = execSync('npm audit --json', {
                encoding: 'utf8',
                cwd: process.cwd(),
            });

            const audit = JSON.parse(auditResult);

            if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
                Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
                    if (vuln.severity === 'high' || vuln.severity === 'critical') {
                        this.issues.push({
                            type: 'dependency',
                            severity: vuln.severity,
                            message: `Vulnerable dependency: ${pkg} (${vuln.severity})`,
                            fix: `Run: npm audit fix or update ${pkg}`,
                        });
                    } else {
                        this.warnings.push({
                            type: 'dependency',
                            severity: vuln.severity,
                            message: `Potentially vulnerable dependency: ${pkg} (${vuln.severity})`,
                        });
                    }
                });
            }

            console.log('✅ Dependency vulnerability check completed');
        } catch (error) {
            if (error.status === 1) {
                // npm audit found vulnerabilities
                this.warnings.push({
                    type: 'dependency',
                    message: 'npm audit found vulnerabilities. Run npm audit for details.',
                });
            } else {
                console.warn('⚠️  Could not run npm audit:', error.message);
            }
        }
    }

    // Scan source code for sensitive information
    async scanSourceCode() {
        console.log('🔍 Scanning source code for sensitive information...');

        const scanDir = (dir) => {
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                // Skip excluded patterns
                if (SECURITY_CONFIG.excludePatterns.some(pattern => pattern.test(filePath))) {
                    return;
                }

                if (stat.isDirectory()) {
                    scanDir(filePath);
                } else if (stat.isFile() && this.shouldScanFile(filePath)) {
                    this.scanFile(filePath);
                }
            });
        };

        scanDir('./src');
        console.log('✅ Source code scan completed');
    }

    // Check if file should be scanned
    shouldScanFile(filePath) {
        const ext = path.extname(filePath);
        const scanExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env'];
        return scanExtensions.includes(ext);
    }

    // Scan individual file
    scanFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');

            SECURITY_CONFIG.sensitivePatterns.forEach((pattern, index) => {
                const matches = content.match(pattern);
                if (matches) {
                    this.issues.push({
                        type: 'sensitive-data',
                        severity: 'high',
                        file: filePath,
                        message: `Potential sensitive data found in ${filePath}`,
                        match: matches[0].substring(0, 50) + '...',
                        fix: 'Move sensitive data to environment variables',
                    });
                }
            });

            // Check for hardcoded URLs
            const urlPattern = /https?:\/\/[^\s"']+/g;
            const urls = content.match(urlPattern) || [];
            urls.forEach(url => {
                if (url.includes('localhost') || url.includes('127.0.0.1')) {
                    this.warnings.push({
                        type: 'hardcoded-url',
                        file: filePath,
                        message: `Hardcoded localhost URL found: ${url}`,
                        fix: 'Use environment variables for URLs',
                    });
                }
            });

        } catch (error) {
            console.warn(`⚠️  Could not scan file ${filePath}:`, error.message);
        }
    }

    // Check security headers configuration
    async checkSecurityHeaders() {
        console.log('🛡️  Checking security headers configuration...');

        try {
            const nextConfigPath = './next.config.ts';
            if (fs.existsSync(nextConfigPath)) {
                const configContent = fs.readFileSync(nextConfigPath, 'utf8');

                SECURITY_CONFIG.requiredHeaders.forEach(header => {
                    if (!configContent.includes(header)) {
                        this.warnings.push({
                            type: 'security-header',
                            message: `Missing security header configuration: ${header}`,
                            fix: `Add ${header} to next.config.ts headers`,
                        });
                    }
                });
            }

            console.log('✅ Security headers check completed');
        } catch (error) {
            console.warn('⚠️  Could not check security headers:', error.message);
        }
    }

    // Check file permissions
    async checkFilePermissions() {
        console.log('📁 Checking file permissions...');

        const sensitiveFiles = [
            '.env',
            '.env.local',
            '.env.production',
            'package.json',
            'next.config.ts',
        ];

        sensitiveFiles.forEach(file => {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                const mode = stats.mode & parseInt('777', 8);

                // Check if file is world-readable (not recommended for sensitive files)
                if (mode & parseInt('004', 8)) {
                    this.warnings.push({
                        type: 'file-permissions',
                        file,
                        message: `File ${file} is world-readable`,
                        fix: `Run: chmod 600 ${file}`,
                    });
                }
            }
        });

        console.log('✅ File permissions check completed');
    }

    // Check environment files
    async checkEnvironmentFiles() {
        console.log('🌍 Checking environment files...');

        const envFiles = ['.env', '.env.local', '.env.production', '.env.example'];

        envFiles.forEach(file => {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');

                // Check for example values that should be changed
                const examplePatterns = [
                    /your[_-]?api[_-]?key/i,
                    /change[_-]?me/i,
                    /example/i,
                    /test[_-]?secret/i,
                ];

                examplePatterns.forEach(pattern => {
                    if (pattern.test(content)) {
                        this.warnings.push({
                            type: 'environment',
                            file,
                            message: `${file} contains example values that should be changed`,
                            fix: 'Replace example values with actual configuration',
                        });
                    }
                });

                // Check for production secrets in development files
                if (file.includes('local') || file === '.env') {
                    if (content.includes('PROD') || content.includes('production')) {
                        this.issues.push({
                            type: 'environment',
                            severity: 'medium',
                            file,
                            message: `Development environment file contains production references`,
                            fix: 'Separate development and production configurations',
                        });
                    }
                }
            }
        });

        console.log('✅ Environment files check completed');
    }

    // Generate security report
    generateReport() {
        console.log('\n📋 Security Audit Report');
        console.log('========================\n');

        if (this.issues.length === 0 && this.warnings.length === 0) {
            console.log('✅ No security issues found!');
            return;
        }

        if (this.issues.length > 0) {
            console.log('❌ SECURITY ISSUES FOUND:');
            this.issues.forEach((issue, index) => {
                console.log(`\n${index + 1}. ${issue.message}`);
                if (issue.severity) console.log(`   Severity: ${issue.severity.toUpperCase()}`);
                if (issue.file) console.log(`   File: ${issue.file}`);
                if (issue.match) console.log(`   Match: ${issue.match}`);
                if (issue.fix) console.log(`   Fix: ${issue.fix}`);
            });
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach((warning, index) => {
                console.log(`\n${index + 1}. ${warning.message}`);
                if (warning.file) console.log(`   File: ${warning.file}`);
                if (warning.fix) console.log(`   Fix: ${warning.fix}`);
            });
        }

        console.log(`\nSummary: ${this.issues.length} issues, ${this.warnings.length} warnings`);

        // Exit with error code if critical issues found
        if (this.issues.some(issue => issue.severity === 'critical' || issue.severity === 'high')) {
            console.log('\n❌ Critical security issues found. Please fix before deployment.');
            process.exit(1);
        }
    }
}

// Run the audit
if (require.main === module) {
    const auditor = new SecurityAuditor();
    auditor.runAudit();
}

module.exports = SecurityAuditor;