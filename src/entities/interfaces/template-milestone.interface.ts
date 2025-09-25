import { Priority } from '../../common/enums';

export interface TemplateMilestone {
  title: string;
  description: string;
  daysFromStart: number; // Number of days from project start date
  priority: Priority;
  estimatedHours: number;
  dependencies?: string[]; // Array of milestone titles this depends on
  tags?: string[];
}

export interface TemplateConfiguration {
  allowCustomization: boolean;
  minimumDurationWeeks: number;
  maximumDurationWeeks: number;
  requiredMilestones: string[]; // Milestone titles that cannot be removed
  optionalMilestones: string[]; // Milestone titles that can be removed
}
