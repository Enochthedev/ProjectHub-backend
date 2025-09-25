#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { AppModule } from '../app.module';
import { AIAssistantKnowledgeSeederService } from '../seeds/ai-assistant-knowledge-seeder.service';
import { KnowledgeContentValidatorService } from './knowledge-content-validator.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseEntry, ResponseTemplate } from '@/entities';
import { ContentType } from '@/common/enums';
import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeImportData {
  title: string;
  content: string;
  category: string;
  tags: string[];
  keywords: string[];
  contentType: ContentType;
  language?: string;
}

interface TemplateImportData {
  name: string;
  template: string;
  category: string;
  triggerKeywords: string[];
  variables?: Record<string, any>;
  language?: string;
}

class KnowledgeManagementCLI {
  private app: any;
  private knowledgeSeeder: AIAssistantKnowledgeSeederService;
  private contentValidator: KnowledgeContentValidatorService;
  private knowledgeRepository: Repository<KnowledgeBaseEntry>;
  private templateRepository: Repository<ResponseTemplate>;

  async initialize() {
    this.app = await NestFactory.createApplicationContext(AppModule);
    this.knowledgeSeeder = this.app.get(AIAssistantKnowledgeSeederService);
    this.contentValidator = this.app.get(KnowledgeContentValidatorService);
    this.knowledgeRepository = this.app.get('KnowledgeBaseEntryRepository');
    this.templateRepository = this.app.get('ResponseTemplateRepository');
  }

  async close() {
    await this.app.close();
  }

  /**
   * Seed all AI assistant knowledge base content
   */
  async seedKnowledgeBase(): Promise<void> {
    console.log('🌱 Seeding AI Assistant knowledge base...');
    try {
      await this.knowledgeSeeder.seedAll();
      console.log('✅ Knowledge base seeding completed successfully');
    } catch (error) {
      console.error('❌ Knowledge base seeding failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate all knowledge base entries
   */
  async validateAllContent(): Promise<void> {
    console.log('🔍 Validating all knowledge base content...');

    const entries = await this.knowledgeRepository.find();
    const templates = await this.templateRepository.find();

    let totalIssues = 0;
    let validEntries = 0;
    let validTemplates = 0;

    console.log(`\n📚 Validating ${entries.length} knowledge base entries...`);
    for (const entry of entries) {
      const validation =
        await this.contentValidator.validateKnowledgeEntry(entry);
      const quality = await this.contentValidator.assessContentQuality(entry);

      console.log(`\n📄 ${entry.title}`);
      console.log(
        `   Score: ${validation.score.toFixed(1)}/100 | Quality: ${quality.overallScore.toFixed(1)}/10`,
      );

      if (validation.isValid) {
        validEntries++;
        console.log('   ✅ Valid');
      } else {
        console.log('   ❌ Has issues');
        validation.issues.forEach((issue) => {
          const icon =
            issue.type === 'error'
              ? '🚨'
              : issue.type === 'warning'
                ? '⚠️'
                : 'ℹ️';
          console.log(`   ${icon} ${issue.category}: ${issue.message}`);
        });
        totalIssues += validation.issues.length;
      }

      if (validation.suggestions.length > 0) {
        console.log('   💡 Suggestions:');
        validation.suggestions.forEach((suggestion) => {
          console.log(`      • ${suggestion}`);
        });
      }
    }

    console.log(`\n🎯 Validating ${templates.length} response templates...`);
    for (const template of templates) {
      const validation =
        await this.contentValidator.validateResponseTemplate(template);

      console.log(`\n📝 ${template.name}`);
      console.log(`   Score: ${validation.score.toFixed(1)}/100`);

      if (validation.isValid) {
        validTemplates++;
        console.log('   ✅ Valid');
      } else {
        console.log('   ❌ Has issues');
        validation.issues.forEach((issue) => {
          const icon =
            issue.type === 'error'
              ? '🚨'
              : issue.type === 'warning'
                ? '⚠️'
                : 'ℹ️';
          console.log(`   ${icon} ${issue.category}: ${issue.message}`);
        });
        totalIssues += validation.issues.length;
      }
    }

    console.log('\n📊 Validation Summary:');
    console.log(
      `   Knowledge Entries: ${validEntries}/${entries.length} valid`,
    );
    console.log(
      `   Response Templates: ${validTemplates}/${templates.length} valid`,
    );
    console.log(`   Total Issues Found: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log('🎉 All content is valid!');
    } else {
      console.log('⚠️  Some content needs attention');
    }
  }

  /**
   * Generate content quality report
   */
  async generateQualityReport(): Promise<void> {
    console.log('📊 Generating content quality report...');

    const entries = await this.knowledgeRepository.find();
    const report = {
      totalEntries: entries.length,
      averageQuality: 0,
      qualityDistribution: {
        excellent: 0, // 8-10
        good: 0, // 6-8
        fair: 0, // 4-6
        poor: 0, // 0-4
      },
      categoryAnalysis: {} as Record<string, any>,
      recommendations: [] as string[],
    };

    let totalQuality = 0;
    const categoryStats = {} as Record<
      string,
      { count: number; totalQuality: number; issues: number }
    >;

    for (const entry of entries) {
      const quality = await this.contentValidator.assessContentQuality(entry);
      const validation =
        await this.contentValidator.validateKnowledgeEntry(entry);

      totalQuality += quality.overallScore;

      // Quality distribution
      if (quality.overallScore >= 8) report.qualityDistribution.excellent++;
      else if (quality.overallScore >= 6) report.qualityDistribution.good++;
      else if (quality.overallScore >= 4) report.qualityDistribution.fair++;
      else report.qualityDistribution.poor++;

      // Category analysis
      if (!categoryStats[entry.category]) {
        categoryStats[entry.category] = {
          count: 0,
          totalQuality: 0,
          issues: 0,
        };
      }
      categoryStats[entry.category].count++;
      categoryStats[entry.category].totalQuality += quality.overallScore;
      categoryStats[entry.category].issues += validation.issues.filter(
        (i) => i.type === 'error',
      ).length;
    }

    report.averageQuality = totalQuality / entries.length;

    // Process category analysis
    Object.entries(categoryStats).forEach(([category, stats]) => {
      report.categoryAnalysis[category] = {
        count: stats.count,
        averageQuality: stats.totalQuality / stats.count,
        errorCount: stats.issues,
      };
    });

    // Generate recommendations
    if (report.averageQuality < 6) {
      report.recommendations.push('Overall content quality needs improvement');
    }

    if (report.qualityDistribution.poor > 0) {
      report.recommendations.push(
        `${report.qualityDistribution.poor} entries need significant improvement`,
      );
    }

    Object.entries(report.categoryAnalysis).forEach(([category, stats]) => {
      if (stats.averageQuality < 5) {
        report.recommendations.push(
          `Category "${category}" needs attention (avg quality: ${stats.averageQuality.toFixed(1)})`,
        );
      }
    });

    // Output report
    console.log('\n📈 Content Quality Report');
    console.log('========================');
    console.log(`Total Entries: ${report.totalEntries}`);
    console.log(`Average Quality: ${report.averageQuality.toFixed(2)}/10`);

    console.log('\n📊 Quality Distribution:');
    console.log(
      `   Excellent (8-10): ${report.qualityDistribution.excellent} entries`,
    );
    console.log(`   Good (6-8): ${report.qualityDistribution.good} entries`);
    console.log(`   Fair (4-6): ${report.qualityDistribution.fair} entries`);
    console.log(`   Poor (0-4): ${report.qualityDistribution.poor} entries`);

    console.log('\n📂 Category Analysis:');
    Object.entries(report.categoryAnalysis).forEach(([category, stats]) => {
      console.log(`   ${category}:`);
      console.log(`     Entries: ${stats.count}`);
      console.log(`     Avg Quality: ${stats.averageQuality.toFixed(2)}/10`);
      console.log(`     Errors: ${stats.errorCount}`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec) => {
        console.log(`   • ${rec}`);
      });
    }

    // Save report to file
    const reportPath = path.join(
      process.cwd(),
      'knowledge-quality-report.json',
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }

  /**
   * Import knowledge base entries from JSON file
   */
  async importKnowledge(filePath: string): Promise<void> {
    console.log(`📥 Importing knowledge from ${filePath}...`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(data)) {
      throw new Error('Import file must contain an array of knowledge entries');
    }

    let imported = 0;
    let skipped = 0;

    for (const item of data as KnowledgeImportData[]) {
      // Validate required fields
      if (!item.title || !item.content || !item.category) {
        console.log(`⚠️  Skipping entry: missing required fields`);
        skipped++;
        continue;
      }

      // Check if entry already exists
      const existing = await this.knowledgeRepository.findOne({
        where: { title: item.title },
      });

      if (existing) {
        console.log(`⚠️  Skipping "${item.title}": already exists`);
        skipped++;
        continue;
      }

      // Create new entry
      const entry = this.knowledgeRepository.create({
        title: item.title,
        content: item.content,
        category: item.category,
        tags: item.tags || [],
        keywords: item.keywords || [],
        contentType: item.contentType || ContentType.GUIDELINE,
        language: item.language || 'en',
      });

      await this.knowledgeRepository.save(entry);
      console.log(`✅ Imported: ${item.title}`);
      imported++;
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   Imported: ${imported} entries`);
    console.log(`   Skipped: ${skipped} entries`);
  }

  /**
   * Export knowledge base entries to JSON file
   */
  async exportKnowledge(filePath: string): Promise<void> {
    console.log(`📤 Exporting knowledge to ${filePath}...`);

    const entries = await this.knowledgeRepository.find();

    const exportData = entries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags,
      keywords: entry.keywords,
      contentType: entry.contentType,
      language: entry.language,
      usageCount: entry.usageCount,
      averageRating: entry.averageRating,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Exported ${entries.length} entries to ${filePath}`);
  }

  /**
   * Clean up unused or low-quality content
   */
  async cleanupContent(): Promise<void> {
    console.log('🧹 Cleaning up knowledge base content...');

    const entries = await this.knowledgeRepository.find();
    let removed = 0;
    let deactivated = 0;

    for (const entry of entries) {
      const quality = await this.contentValidator.assessContentQuality(entry);
      const validation =
        await this.contentValidator.validateKnowledgeEntry(entry);

      // Remove entries with critical errors and very low quality
      const criticalErrors = validation.issues.filter(
        (i) => i.type === 'error' && i.severity >= 8,
      );

      if (criticalErrors.length > 0 && quality.overallScore < 3) {
        console.log(`🗑️  Removing low-quality entry: ${entry.title}`);
        await this.knowledgeRepository.remove(entry);
        removed++;
      } else if (quality.overallScore < 5 && entry.usageCount === 0) {
        // Deactivate low-quality, unused entries
        console.log(`⏸️  Deactivating unused entry: ${entry.title}`);
        entry.isActive = false;
        await this.knowledgeRepository.save(entry);
        deactivated++;
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Removed: ${removed} entries`);
    console.log(`   Deactivated: ${deactivated} entries`);
  }

  /**
   * Update content statistics
   */
  async updateStatistics(): Promise<void> {
    console.log('📊 Updating content statistics...');

    const entries = await this.knowledgeRepository.find();

    for (const entry of entries) {
      // This would typically be done by the actual AI assistant service
      // For now, we'll simulate some usage statistics
      if (entry.usageCount === 0) {
        // Simulate some usage based on content quality
        const quality = await this.contentValidator.assessContentQuality(entry);
        const simulatedUsage = Math.floor(
          quality.overallScore * Math.random() * 5,
        );
        entry.usageCount = simulatedUsage;

        // Simulate rating based on quality
        const simulatedRating = Math.min(
          5,
          Math.max(1, quality.overallScore / 2 + Math.random()),
        );
        entry.averageRating = simulatedRating;

        await this.knowledgeRepository.save(entry);
      }
    }

    console.log(`✅ Updated statistics for ${entries.length} entries`);
  }
}

// CLI Program
const program = new Command();
const cli = new KnowledgeManagementCLI();

program
  .name('knowledge-cli')
  .description('AI Assistant Knowledge Base Management CLI')
  .version('1.0.0');

program
  .command('seed')
  .description('Seed the knowledge base with initial content')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.seedKnowledgeBase();
    } finally {
      await cli.close();
    }
  });

program
  .command('validate')
  .description('Validate all knowledge base content')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.validateAllContent();
    } finally {
      await cli.close();
    }
  });

program
  .command('report')
  .description('Generate content quality report')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.generateQualityReport();
    } finally {
      await cli.close();
    }
  });

program
  .command('import <file>')
  .description('Import knowledge entries from JSON file')
  .action(async (file) => {
    await cli.initialize();
    try {
      await cli.importKnowledge(file);
    } finally {
      await cli.close();
    }
  });

program
  .command('export <file>')
  .description('Export knowledge entries to JSON file')
  .action(async (file) => {
    await cli.initialize();
    try {
      await cli.exportKnowledge(file);
    } finally {
      await cli.close();
    }
  });

program
  .command('cleanup')
  .description('Clean up low-quality or unused content')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.cleanupContent();
    } finally {
      await cli.close();
    }
  });

program
  .command('stats')
  .description('Update content usage statistics')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.updateStatistics();
    } finally {
      await cli.close();
    }
  });

// Handle errors
program.parseAsync(process.argv).catch((error) => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
});

export { KnowledgeManagementCLI };
