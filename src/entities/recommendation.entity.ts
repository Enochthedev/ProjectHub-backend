import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { RecommendationFeedback } from './recommendation-feedback.entity';
import { RecommendationStatus } from '../common/enums/recommendation-status.enum';

export interface ProjectRecommendation {
  projectId: string;
  title: string;
  abstract: string;
  specialization: string;
  difficultyLevel: string;
  similarityScore: number;
  matchingSkills: string[];
  matchingInterests: string[];
  reasoning: string;
  supervisor: {
    id: string;
    name: string;
    specialization: string;
  };
  diversityBoost?: number;
}

export interface StudentProfileSnapshot {
  skills: string[];
  interests: string[];
  specializations: string[];
  preferredDifficulty?: string;
  careerGoals?: string;
  profileCompleteness: number;
  snapshotDate: Date;
}

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'jsonb' })
  projectSuggestions: ProjectRecommendation[];

  @Column({ type: 'text' })
  reasoning: string;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  averageSimilarityScore: number;

  @Column({ type: 'jsonb' })
  profileSnapshot: StudentProfileSnapshot;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.ACTIVE,
  })
  status: RecommendationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @OneToMany(
    () => RecommendationFeedback,
    (feedback) => feedback.recommendation,
    {
      cascade: true,
    },
  )
  feedback: RecommendationFeedback[];

  // Helper methods for validation and business logic
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  isActive(): boolean {
    return this.status === RecommendationStatus.ACTIVE && !this.isExpired();
  }

  getProjectById(projectId: string): ProjectRecommendation | undefined {
    return this.projectSuggestions.find((p) => p.projectId === projectId);
  }

  getAverageScore(): number {
    if (this.projectSuggestions.length === 0) return 0;
    const sum = this.projectSuggestions.reduce(
      (acc, p) => acc + p.similarityScore,
      0,
    );
    return sum / this.projectSuggestions.length;
  }
}
