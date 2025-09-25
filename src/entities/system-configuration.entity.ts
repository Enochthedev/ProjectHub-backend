import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ConfigType } from '../common/enums/config-type.enum';
import { ConfigCategory } from '../common/enums/config-category.enum';

/**
 * System Configuration Entity
 *
 * Manages platform-wide configuration settings with validation schema support,
 * categorization, and change tracking. This entity provides:
 * - Flexible configuration storage with type validation
 * - Configuration categorization for organization
 * - Change tracking and audit trail
 * - Schema validation support for complex configurations
 */
@Entity('system_configurations')
@Index(['key'], { unique: true })
@Index(['category'])
@Index(['isActive'])
@Index(['updatedAt'])
export class SystemConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ConfigCategory,
    default: ConfigCategory.SYSTEM,
  })
  category: ConfigCategory;

  @Column({
    type: 'enum',
    enum: ConfigType,
    default: ConfigType.STRING,
  })
  type: ConfigType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isReadOnly: boolean;

  @Column({ type: 'boolean', default: false })
  isSecret: boolean;

  @Column({ type: 'text', nullable: true })
  validationSchema: string | null;

  @Column({ type: 'text', nullable: true })
  defaultValue: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  version: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper method to get the parsed value based on type
   */
  getParsedValue(): any {
    if (!this.value) {
      return this.getDefaultParsedValue();
    }

    try {
      switch (this.type) {
        case ConfigType.BOOLEAN:
          return this.value.toLowerCase() === 'true';
        case ConfigType.NUMBER:
          return parseFloat(this.value);
        case ConfigType.JSON:
          return JSON.parse(this.value);
        case ConfigType.DATE:
          return new Date(this.value);
        case ConfigType.STRING:
        case ConfigType.EMAIL:
        case ConfigType.URL:
        default:
          return this.value;
      }
    } catch (error) {
      return this.getDefaultParsedValue();
    }
  }

  /**
   * Helper method to get the default parsed value
   */
  getDefaultParsedValue(): any {
    if (!this.defaultValue) {
      return null;
    }

    try {
      switch (this.type) {
        case ConfigType.BOOLEAN:
          return this.defaultValue.toLowerCase() === 'true';
        case ConfigType.NUMBER:
          return parseFloat(this.defaultValue);
        case ConfigType.JSON:
          return JSON.parse(this.defaultValue);
        case ConfigType.DATE:
          return new Date(this.defaultValue);
        case ConfigType.STRING:
        case ConfigType.EMAIL:
        case ConfigType.URL:
        default:
          return this.defaultValue;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to validate the configuration value
   */
  isValidValue(value: string): boolean {
    try {
      switch (this.type) {
        case ConfigType.BOOLEAN:
          return ['true', 'false'].includes(value.toLowerCase());
        case ConfigType.NUMBER:
          return !isNaN(parseFloat(value));
        case ConfigType.JSON:
          JSON.parse(value);
          return true;
        case ConfigType.DATE:
          return !isNaN(new Date(value).getTime());
        case ConfigType.EMAIL:
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case ConfigType.URL:
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        case ConfigType.STRING:
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper method to check if configuration is editable
   */
  isEditable(): boolean {
    return this.isActive && !this.isReadOnly;
  }

  /**
   * Helper method to get masked value for secrets
   */
  getMaskedValue(): string {
    if (this.isSecret && this.value) {
      return '*'.repeat(Math.min(this.value.length, 8));
    }
    return this.value;
  }

  /**
   * Helper method to create a configuration summary
   */
  getSummary(): string {
    return `${this.key} (${this.category}): ${this.getMaskedValue()}`;
  }
}
