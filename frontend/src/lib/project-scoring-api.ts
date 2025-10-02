import { api } from './api';
import { ProjectScore, ProjectAnalytics, SupervisorRanking } from '@/types/project';

export const projectScoringApi = {
    // Project Scoring
    submitProjectScore: async (scoreData: Omit<ProjectScore, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectScore> => {
        const response = await api.post('/projects/scores', scoreData);
        return response;
    },

    getProjectScore: async (projectId: string, studentId: string): Promise<ProjectScore | null> => {
        try {
            const response = await api.get(`/projects/${projectId}/scores/${studentId}`);
            return response;
        } catch (error) {
            // Return null if no score exists yet
            return null;
        }
    },

    updateProjectScore: async (scoreId: string, updates: Partial<ProjectScore>): Promise<ProjectScore> => {
        const response = await api.put(`/projects/scores/${scoreId}`, updates);
        return response;
    },

    // Project Analytics
    getProjectAnalytics: async (projectId: string): Promise<ProjectAnalytics> => {
        const response = await api.get(`/projects/${projectId}/analytics`);
        return response;
    },

    // Supervisor Rankings
    getSupervisorRankings: async (): Promise<SupervisorRanking[]> => {
        try {
            const response = await api.get('/supervisors/rankings');
            return response.rankings || [];
        } catch (error) {
            console.error('Failed to fetch supervisor rankings:', error);
            return [];
        }
    },

    getSupervisorRanking: async (supervisorId: string): Promise<SupervisorRanking | null> => {
        try {
            const response = await api.get(`/supervisors/${supervisorId}/ranking`);
            return response;
        } catch (error) {
            return null;
        }
    },

    // Bulk Operations
    calculateProjectAnalytics: async (projectId: string): Promise<ProjectAnalytics> => {
        const response = await api.post(`/projects/${projectId}/calculate-analytics`);
        return response;
    },

    recalculateAllAnalytics: async (): Promise<{ updated: number }> => {
        const response = await api.post('/projects/recalculate-analytics');
        return response;
    },

    // AI Recommendation Helpers
    getRecommendedProjects: async (studentId?: string, limit: number = 10): Promise<{
        projects: Array<{
            projectId: string;
            title: string;
            recommendationScore: number;
            reasons: string[];
        }>;
    }> => {
        const params = new URLSearchParams();
        if (studentId) params.append('studentId', studentId);
        params.append('limit', limit.toString());

        try {
            const response = await api.get(`/projects/recommendations?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('Failed to fetch project recommendations:', error);
            return { projects: [] };
        }
    },

    // Student Project History
    getStudentProjectHistory: async (studentId: string): Promise<{
        completedProjects: Array<{
            project: {
                id: string;
                title: string;
                specialization: string;
                supervisor: string;
            };
            score: ProjectScore;
            completedAt: string;
        }>;
        averageGrade: number;
        averageSatisfaction: number;
        completionRate: number;
    }> => {
        try {
            const response = await api.get(`/students/${studentId}/project-history`);
            return response;
        } catch (error) {
            console.error('Failed to fetch student project history:', error);
            return {
                completedProjects: [],
                averageGrade: 0,
                averageSatisfaction: 0,
                completionRate: 0
            };
        }
    },

    // Quick scoring for supervisors
    quickScoreProject: async (projectId: string, studentId: string, data: {
        finalGrade: number;
        completionStatus: 'completed' | 'incomplete' | 'dropped';
        feedback?: string;
    }): Promise<ProjectScore> => {
        const response = await api.post(`/projects/${projectId}/quick-score`, {
            studentId,
            ...data
        });
        return response;
    }
};