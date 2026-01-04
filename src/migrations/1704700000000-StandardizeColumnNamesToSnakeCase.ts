import { MigrationInterface, QueryRunner } from 'typeorm';

export class StandardizeColumnNamesToSnakeCase1704700000000 implements MigrationInterface {
    name = 'StandardizeColumnNamesToSnakeCase1704700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename columns from camelCase to snake_case for consistency
        // This enables using a global SnakeNamingStrategy

        // admin_audit_logs
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "adminId" TO "admin_id"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "afterState" TO "after_state"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "beforeState" TO "before_state"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "errorMessage" TO "error_message"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "ipAddress" TO "ip_address"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "resourceId" TO "resource_id"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "resourceType" TO "resource_type"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "riskLevel" TO "risk_level"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "sessionId" TO "session_id"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "userAgent" TO "user_agent"`);

        // ai_interaction_reviews
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "aiResponseMetadata" TO "ai_response_metadata"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "confidenceScore" TO "confidence_score"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "conversationId" TO "conversation_id"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "requiresFollowUp" TO "requires_follow_up"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "resolvedAt" TO "resolved_at"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "reviewNotes" TO "review_notes"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "reviewedAt" TO "reviewed_at"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "studentId" TO "student_id"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "supervisorFeedback" TO "supervisor_feedback"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "supervisorId" TO "supervisor_id"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // audit_logs
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "ipAddress" TO "ip_address"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "userAgent" TO "user_agent"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "userId" TO "user_id"`);

        // bookmark_categories
        await queryRunner.query(`ALTER TABLE "bookmark_categories" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "bookmark_categories" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // milestones
        await queryRunner.query(`ALTER TABLE "milestones" RENAME COLUMN "isTemplate" TO "is_template"`);
        await queryRunner.query(`ALTER TABLE "milestones" RENAME COLUMN "templateId" TO "template_id"`);

        // project_bookmarks
        await queryRunner.query(`ALTER TABLE "project_bookmarks" RENAME COLUMN "createdAt" TO "created_at"`);

        // project_views
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "ipAddress" TO "ip_address"`);
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "userAgent" TO "user_agent"`);
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "viewedAt" TO "viewed_at"`);
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "viewerId" TO "viewer_id"`);

        // projects
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "approvalStatus" TO "approval_status"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "approvedAt" TO "approved_at"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "approvedBy" TO "approved_by"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "demoUrl" TO "demo_url"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "difficultyLevel" TO "difficulty_level"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "githubUrl" TO "github_url"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "isGroupProject" TO "is_group_project"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "searchVector" TO "search_vector"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "technologyStack" TO "technology_stack"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // refresh_tokens
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "expiresAt" TO "expires_at"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "isRevoked" TO "is_revoked"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "tokenHash" TO "token_hash"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "userId" TO "user_id"`);

        // student_profiles
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "currentYear" TO "current_year"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "preferredSpecializations" TO "preferred_specializations"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "profileUpdatedAt" TO "profile_updated_at"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "supervisorId" TO "supervisor_id"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "userId" TO "user_id"`);

        // supervisor_analytics
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "metricType" TO "metric_type"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "periodEnd" TO "period_end"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "periodStart" TO "period_start"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "supervisorId" TO "supervisor_id"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // supervisor_availability
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "dayOfWeek" TO "day_of_week"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "effectiveFrom" TO "effective_from"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "effectiveUntil" TO "effective_until"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "endTime" TO "end_time"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "isActive" TO "is_active"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "maxCapacity" TO "max_capacity"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "startTime" TO "start_time"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "supervisorId" TO "supervisor_id"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // supervisor_profiles
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "isAvailable" TO "is_available"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "maxStudents" TO "max_students"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "officeLocation" TO "office_location"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "phoneNumber" TO "phone_number"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "userId" TO "user_id"`);

        // supervisor_reports
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "downloadCount" TO "download_count"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "errorMessage" TO "error_message"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "expiresAt" TO "expires_at"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "filePath" TO "file_path"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "fileSize" TO "file_size"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "generatedAt" TO "generated_at"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "lastDownloadedAt" TO "last_downloaded_at"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "mimeType" TO "mime_type"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "supervisorId" TO "supervisor_id"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // users
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "emailVerificationToken" TO "email_verification_token"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "isActive" TO "is_active"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "isEmailVerified" TO "is_email_verified"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "passwordResetExpires" TO "password_reset_expires"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "passwordResetToken" TO "password_reset_token"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // Update indexes that reference old column names
        // Drop and recreate affected indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_userId_action"`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_id_action" ON "audit_logs" ("user_id", "action")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_user_id_action"`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId_action" ON "audit_logs" ("userId", "action")`);

        // Revert all column renames (snake_case back to camelCase)
        // users
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password_reset_token" TO "passwordResetToken"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password_reset_expires" TO "passwordResetExpires"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "is_email_verified" TO "isEmailVerified"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "is_active" TO "isActive"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "email_verification_token" TO "emailVerificationToken"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`);

        // supervisor_reports
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "supervisor_id" TO "supervisorId"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "mime_type" TO "mimeType"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "last_downloaded_at" TO "lastDownloadedAt"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "generated_at" TO "generatedAt"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "file_size" TO "fileSize"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "file_path" TO "filePath"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "expires_at" TO "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "error_message" TO "errorMessage"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "download_count" TO "downloadCount"`);
        await queryRunner.query(`ALTER TABLE "supervisor_reports" RENAME COLUMN "created_at" TO "createdAt"`);

        // supervisor_profiles
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "phone_number" TO "phoneNumber"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "office_location" TO "officeLocation"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "max_students" TO "maxStudents"`);
        await queryRunner.query(`ALTER TABLE "supervisor_profiles" RENAME COLUMN "is_available" TO "isAvailable"`);

        // supervisor_availability
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "supervisor_id" TO "supervisorId"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "start_time" TO "startTime"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "max_capacity" TO "maxCapacity"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "is_active" TO "isActive"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "end_time" TO "endTime"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "effective_until" TO "effectiveUntil"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "effective_from" TO "effectiveFrom"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "day_of_week" TO "dayOfWeek"`);
        await queryRunner.query(`ALTER TABLE "supervisor_availability" RENAME COLUMN "created_at" TO "createdAt"`);

        // supervisor_analytics
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "supervisor_id" TO "supervisorId"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "period_start" TO "periodStart"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "period_end" TO "periodEnd"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "metric_type" TO "metricType"`);
        await queryRunner.query(`ALTER TABLE "supervisor_analytics" RENAME COLUMN "created_at" TO "createdAt"`);

        // student_profiles
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "supervisor_id" TO "supervisorId"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "profile_updated_at" TO "profileUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "preferred_specializations" TO "preferredSpecializations"`);
        await queryRunner.query(`ALTER TABLE "student_profiles" RENAME COLUMN "current_year" TO "currentYear"`);

        // refresh_tokens
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "token_hash" TO "tokenHash"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "is_revoked" TO "isRevoked"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "expires_at" TO "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "created_at" TO "createdAt"`);

        // projects
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "technology_stack" TO "technologyStack"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "search_vector" TO "searchVector"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "is_group_project" TO "isGroupProject"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "github_url" TO "githubUrl"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "difficulty_level" TO "difficultyLevel"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "demo_url" TO "demoUrl"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "approved_by" TO "approvedBy"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "approved_at" TO "approvedAt"`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "approval_status" TO "approvalStatus"`);

        // project_views
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "viewer_id" TO "viewerId"`);
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "viewed_at" TO "viewedAt"`);
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "user_agent" TO "userAgent"`);
        await queryRunner.query(`ALTER TABLE "project_views" RENAME COLUMN "ip_address" TO "ipAddress"`);

        // project_bookmarks
        await queryRunner.query(`ALTER TABLE "project_bookmarks" RENAME COLUMN "created_at" TO "createdAt"`);

        // milestones
        await queryRunner.query(`ALTER TABLE "milestones" RENAME COLUMN "template_id" TO "templateId"`);
        await queryRunner.query(`ALTER TABLE "milestones" RENAME COLUMN "is_template" TO "isTemplate"`);

        // bookmark_categories
        await queryRunner.query(`ALTER TABLE "bookmark_categories" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "bookmark_categories" RENAME COLUMN "created_at" TO "createdAt"`);

        // audit_logs
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "user_agent" TO "userAgent"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "ip_address" TO "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "created_at" TO "createdAt"`);

        // ai_interaction_reviews
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "supervisor_id" TO "supervisorId"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "supervisor_feedback" TO "supervisorFeedback"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "student_id" TO "studentId"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "reviewed_at" TO "reviewedAt"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "review_notes" TO "reviewNotes"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "resolved_at" TO "resolvedAt"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "requires_follow_up" TO "requiresFollowUp"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "conversation_id" TO "conversationId"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "confidence_score" TO "confidenceScore"`);
        await queryRunner.query(`ALTER TABLE "ai_interaction_reviews" RENAME COLUMN "ai_response_metadata" TO "aiResponseMetadata"`);

        // admin_audit_logs
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "user_agent" TO "userAgent"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "session_id" TO "sessionId"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "risk_level" TO "riskLevel"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "resource_type" TO "resourceType"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "resource_id" TO "resourceId"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "ip_address" TO "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "error_message" TO "errorMessage"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "before_state" TO "beforeState"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "after_state" TO "afterState"`);
        await queryRunner.query(`ALTER TABLE "admin_audit_logs" RENAME COLUMN "admin_id" TO "adminId"`);
    }
}
