'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Star, Save, X } from 'lucide-react';
import { projectScoringApi } from '@/lib/project-scoring-api';
import { ProjectScore } from '@/types/project';

interface ProjectScoringProps {
  projectId: string;
  studentId: string;
  studentName: string;
  projectTitle: string;
  existingScore?: ProjectScore;
  onSave?: (score: ProjectScore) => void;
  onCancel?: () => void;
}

export const ProjectScoring: React.FC<ProjectScoringProps> = ({
  projectId,
  studentId,
  studentName,
  projectTitle,
  existingScore,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    finalGrade: existingScore?.finalGrade || 0,
    completionStatus: existingScore?.completionStatus || 'completed' as const,
    difficultyRating: existingScore?.difficultyRating || 3,
    satisfactionRating: existingScore?.satisfactionRating || 3,
    wouldRecommend: existingScore?.wouldRecommend || true,
    feedback: existingScore?.feedback || '',
    strengths: existingScore?.strengths?.join(', ') || '',
    challenges: existingScore?.challenges?.join(', ') || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const scoreData = {
        projectId,
        studentId,
        supervisorId: '', // This would come from auth context
        finalGrade: formData.finalGrade,
        completionStatus: formData.completionStatus,
        difficultyRating: formData.difficultyRating,
        satisfactionRating: formData.satisfactionRating,
        wouldRecommend: formData.wouldRecommend,
        feedback: formData.feedback.trim() || undefined,
        strengths: formData.strengths.trim() ? formData.strengths.split(',').map(s => s.trim()) : undefined,
        challenges: formData.challenges.trim() ? formData.challenges.split(',').map(s => s.trim()) : undefined
      };

      let result: ProjectScore;
      if (existingScore) {
        result = await projectScoringApi.updateProjectScore(existingScore.id, scoreData);
      } else {
        result = await projectScoringApi.submitProjectScore(scoreData);
      }

      onSave?.(result);
    } catch (err) {
      setError('Failed to save project score');
      console.error('Project scoring error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (
    value: number,
    onChange: (value: number) => void,
    label: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-black mb-2">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value ? 'text-yellow-500' : 'text-gray-300'
            }`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {value}/5
        </span>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-black">
            {existingScore ? 'Update' : 'Score'} Project
          </h3>
          <p className="text-sm text-gray-600">
            {studentName} - {projectTitle}
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Final Grade */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Final Grade (0-100)
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.finalGrade}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              finalGrade: Number(e.target.value)
            }))}
            required
          />
        </div>

        {/* Completion Status */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Completion Status
          </label>
          <select
            value={formData.completionStatus}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              completionStatus: e.target.value as any
            }))}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            required
          >
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderStarRating(
            formData.difficultyRating,
            (value) => setFormData(prev => ({ ...prev, difficultyRating: value })),
            'Actual Difficulty'
          )}

          {renderStarRating(
            formData.satisfactionRating,
            (value) => setFormData(prev => ({ ...prev, satisfactionRating: value })),
            'Student Satisfaction'
          )}
        </div>

        {/* Would Recommend */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Would you recommend this project to other students?
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="wouldRecommend"
                checked={formData.wouldRecommend === true}
                onChange={() => setFormData(prev => ({ ...prev, wouldRecommend: true }))}
                className="mr-2"
              />
              Yes
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="wouldRecommend"
                checked={formData.wouldRecommend === false}
                onChange={() => setFormData(prev => ({ ...prev, wouldRecommend: false }))}
                className="mr-2"
              />
              No
            </label>
          </div>
        </div>

        {/* Feedback */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Overall Feedback (Optional)
          </label>
          <textarea
            value={formData.feedback}
            onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
            placeholder="Provide overall feedback about the student's performance..."
            className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none resize-none"
            rows={3}
          />
        </div>

        {/* Strengths and Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Strengths (comma-separated)
            </label>
            <Input
              value={formData.strengths}
              onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
              placeholder="e.g., Good problem solving, Clear documentation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Challenges (comma-separated)
            </label>
            <Input
              value={formData.challenges}
              onChange={(e) => setFormData(prev => ({ ...prev, challenges: e.target.value }))}
              placeholder="e.g., Time management, Technical complexity"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingScore ? 'Update Score' : 'Save Score'}
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default ProjectScoring;