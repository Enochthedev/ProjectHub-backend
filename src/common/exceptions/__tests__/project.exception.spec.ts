import { HttpStatus } from '@nestjs/common';
import {
  ProjectNotFoundException,
  ProjectAlreadyExistsException,
  ProjectValidationException,
  ProjectApprovalException,
  ProjectStatusException,
  ProjectPermissionException,
  SearchQueryException,
  MalformedSearchQueryException,
  SearchResultsException,
  BookmarkNotFoundException,
  DuplicateBookmarkException,
  BookmarkLimitExceededException,
  BookmarkPermissionException,
  DuplicateProjectException,
  ProjectAnalyticsException,
} from '../project.exception';

describe('Project Exceptions', () => {
  describe('ProjectNotFoundException', () => {
    it('should create exception with correct message and status', () => {
      const projectId = 'test-project-id';
      const exception = new ProjectNotFoundException(projectId);

      expect(exception.message).toBe(`Project with ID ${projectId} not found`);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('PROJECT_NOT_FOUND');
      expect(exception.details).toEqual({ projectId });
    });
  });

  describe('ProjectAlreadyExistsException', () => {
    it('should create exception with correct message and status', () => {
      const title = 'Test Project Title';
      const exception = new ProjectAlreadyExistsException(title);

      expect(exception.message).toBe(
        `A project with similar title already exists: ${title}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('PROJECT_ALREADY_EXISTS');
      expect(exception.details).toEqual({ title });
    });
  });

  describe('ProjectValidationException', () => {
    it('should create exception with validation errors', () => {
      const message = 'Validation failed';
      const validationErrors = { title: 'Title is required' };
      const exception = new ProjectValidationException(
        message,
        validationErrors,
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('PROJECT_VALIDATION_ERROR');
      expect(exception.details).toEqual(validationErrors);
    });

    it('should create exception without validation errors', () => {
      const message = 'Validation failed';
      const exception = new ProjectValidationException(message);

      expect(exception.message).toBe(message);
      expect(exception.details).toBeUndefined();
    });
  });

  describe('ProjectApprovalException', () => {
    it('should create exception with project ID', () => {
      const message = 'Project cannot be approved';
      const projectId = 'test-project-id';
      const exception = new ProjectApprovalException(message, projectId);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('PROJECT_APPROVAL_ERROR');
      expect(exception.details).toEqual({ projectId });
    });

    it('should create exception without project ID', () => {
      const message = 'Project cannot be approved';
      const exception = new ProjectApprovalException(message);

      expect(exception.message).toBe(message);
      expect(exception.details).toEqual({ projectId: undefined });
    });
  });

  describe('ProjectStatusException', () => {
    it('should create exception with status details', () => {
      const message = 'Invalid status transition';
      const currentStatus = 'pending';
      const requestedAction = 'archive';
      const exception = new ProjectStatusException(
        message,
        currentStatus,
        requestedAction,
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('PROJECT_STATUS_ERROR');
      expect(exception.details).toEqual({ currentStatus, requestedAction });
    });
  });

  describe('ProjectPermissionException', () => {
    it('should create exception with user and project details', () => {
      const message = 'Access denied';
      const userId = 'user-id';
      const projectId = 'project-id';
      const exception = new ProjectPermissionException(
        message,
        userId,
        projectId,
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('PROJECT_PERMISSION_ERROR');
      expect(exception.details).toEqual({ userId, projectId });
    });
  });

  describe('SearchQueryException', () => {
    it('should create exception with query details', () => {
      const message = 'Invalid search query';
      const query = 'malformed query';
      const exception = new SearchQueryException(message, query);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('SEARCH_QUERY_ERROR');
      expect(exception.details).toEqual({ query });
    });

    it('should create exception without query', () => {
      const message = 'Invalid search query';
      const exception = new SearchQueryException(message);

      expect(exception.message).toBe(message);
      expect(exception.details).toEqual({ query: undefined });
    });
  });

  describe('MalformedSearchQueryException', () => {
    it('should create exception with query and reason', () => {
      const query = 'SELECT * FROM projects';
      const reason = 'SQL injection attempt detected';
      const exception = new MalformedSearchQueryException(query, reason);

      expect(exception.message).toBe(
        `Malformed search query: ${query} - ${reason}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('MALFORMED_SEARCH_QUERY');
      expect(exception.details).toEqual({ query, reason });
    });

    it('should create exception without reason', () => {
      const query = 'invalid query';
      const exception = new MalformedSearchQueryException(query);

      expect(exception.message).toBe(`Malformed search query: ${query}`);
      expect(exception.details).toEqual({ query, reason: undefined });
    });
  });

  describe('SearchResultsException', () => {
    it('should create exception with search parameters', () => {
      const message = 'Search failed';
      const searchParams = { query: 'test', filters: ['ai'] };
      const exception = new SearchResultsException(message, searchParams);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errorCode).toBe('SEARCH_RESULTS_ERROR');
      expect(exception.details).toEqual({ searchParams });
    });
  });

  describe('BookmarkNotFoundException', () => {
    it('should create exception with bookmark ID', () => {
      const bookmarkId = 'bookmark-id';
      const exception = new BookmarkNotFoundException(bookmarkId);

      expect(exception.message).toBe(
        `Bookmark with ID ${bookmarkId} not found`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('BOOKMARK_NOT_FOUND');
      expect(exception.details).toEqual({
        bookmarkId,
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should create exception with user and project IDs', () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const exception = new BookmarkNotFoundException(
        undefined,
        userId,
        projectId,
      );

      expect(exception.message).toBe(
        `Bookmark not found for user ${userId} and project ${projectId}`,
      );
      expect(exception.details).toEqual({
        bookmarkId: undefined,
        userId,
        projectId,
      });
    });
  });

  describe('DuplicateBookmarkException', () => {
    it('should create exception with user and project details', () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const exception = new DuplicateBookmarkException(userId, projectId);

      expect(exception.message).toBe(
        'Project is already bookmarked by this user',
      );
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('DUPLICATE_BOOKMARK');
      expect(exception.details).toEqual({ userId, projectId });
    });
  });

  describe('BookmarkLimitExceededException', () => {
    it('should create exception with limit details', () => {
      const userId = 'user-id';
      const currentCount = 25;
      const maxAllowed = 20;
      const exception = new BookmarkLimitExceededException(
        userId,
        currentCount,
        maxAllowed,
      );

      expect(exception.message).toBe(
        `Bookmark limit exceeded. Current: ${currentCount}, Maximum allowed: ${maxAllowed}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('BOOKMARK_LIMIT_EXCEEDED');
      expect(exception.details).toEqual({ userId, currentCount, maxAllowed });
    });
  });

  describe('BookmarkPermissionException', () => {
    it('should create exception with permission details', () => {
      const message = 'Cannot access bookmark';
      const userId = 'user-id';
      const bookmarkId = 'bookmark-id';
      const exception = new BookmarkPermissionException(
        message,
        userId,
        bookmarkId,
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('BOOKMARK_PERMISSION_ERROR');
      expect(exception.details).toEqual({ userId, bookmarkId });
    });
  });

  describe('DuplicateProjectException', () => {
    it('should create exception with similar projects', () => {
      const title = 'AI Chatbot';
      const similarProjects = ['project-1', 'project-2'];
      const exception = new DuplicateProjectException(title, similarProjects);

      expect(exception.message).toBe(
        `A project with similar content already exists: ${title}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('DUPLICATE_PROJECT');
      expect(exception.details).toEqual({ title, similarProjects });
    });

    it('should create exception without similar projects', () => {
      const title = 'AI Chatbot';
      const exception = new DuplicateProjectException(title);

      expect(exception.message).toBe(
        `A project with similar content already exists: ${title}`,
      );
      expect(exception.details).toEqual({ title, similarProjects: undefined });
    });
  });

  describe('ProjectAnalyticsException', () => {
    it('should create exception with project ID', () => {
      const message = 'Analytics calculation failed';
      const projectId = 'project-id';
      const exception = new ProjectAnalyticsException(message, projectId);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errorCode).toBe('PROJECT_ANALYTICS_ERROR');
      expect(exception.details).toEqual({ projectId });
    });

    it('should create exception without project ID', () => {
      const message = 'Analytics calculation failed';
      const exception = new ProjectAnalyticsException(message);

      expect(exception.message).toBe(message);
      expect(exception.details).toEqual({ projectId: undefined });
    });
  });
});
