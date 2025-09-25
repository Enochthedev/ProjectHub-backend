import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ProjectNotFoundException extends AppException {
  constructor(projectId: string) {
    super(
      `Project with ID ${projectId} not found`,
      HttpStatus.NOT_FOUND,
      'PROJECT_NOT_FOUND',
      { projectId },
    );
  }
}

export class ProjectAlreadyExistsException extends AppException {
  constructor(title: string) {
    super(
      `A project with similar title already exists: ${title}`,
      HttpStatus.CONFLICT,
      'PROJECT_ALREADY_EXISTS',
      { title },
    );
  }
}

export class ProjectValidationException extends AppException {
  constructor(message: string, validationErrors?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'PROJECT_VALIDATION_ERROR',
      validationErrors,
    );
  }
}

export class ProjectApprovalException extends AppException {
  constructor(message: string, projectId?: string) {
    super(message, HttpStatus.BAD_REQUEST, 'PROJECT_APPROVAL_ERROR', {
      projectId,
    });
  }
}

export class ProjectStatusException extends AppException {
  constructor(message: string, currentStatus: string, requestedAction: string) {
    super(message, HttpStatus.BAD_REQUEST, 'PROJECT_STATUS_ERROR', {
      currentStatus,
      requestedAction,
    });
  }
}

export class ProjectPermissionException extends AppException {
  constructor(message: string, userId?: string, projectId?: string) {
    super(message, HttpStatus.FORBIDDEN, 'PROJECT_PERMISSION_ERROR', {
      userId,
      projectId,
    });
  }
}

/**
 * Search-specific exceptions
 */
export class SearchQueryException extends AppException {
  constructor(message: string, query?: string) {
    super(message, HttpStatus.BAD_REQUEST, 'SEARCH_QUERY_ERROR', {
      query,
    });
  }
}

export class MalformedSearchQueryException extends AppException {
  constructor(query: string, reason?: string) {
    super(
      `Malformed search query: ${query}${reason ? ` - ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'MALFORMED_SEARCH_QUERY',
      { query, reason },
    );
  }
}

export class SearchResultsException extends AppException {
  constructor(message: string, searchParams?: any) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'SEARCH_RESULTS_ERROR', {
      searchParams,
    });
  }
}

/**
 * Bookmark-specific exceptions
 */
export class BookmarkNotFoundException extends AppException {
  constructor(bookmarkId?: string, userId?: string, projectId?: string) {
    const message = bookmarkId
      ? `Bookmark with ID ${bookmarkId} not found`
      : `Bookmark not found for user ${userId} and project ${projectId}`;
    super(message, HttpStatus.NOT_FOUND, 'BOOKMARK_NOT_FOUND', {
      bookmarkId,
      userId,
      projectId,
    });
  }
}

export class DuplicateBookmarkException extends AppException {
  constructor(userId: string, projectId: string) {
    super(
      'Project is already bookmarked by this user',
      HttpStatus.CONFLICT,
      'DUPLICATE_BOOKMARK',
      { userId, projectId },
    );
  }
}

export class BookmarkLimitExceededException extends AppException {
  constructor(userId: string, currentCount: number, maxAllowed: number) {
    super(
      `Bookmark limit exceeded. Current: ${currentCount}, Maximum allowed: ${maxAllowed}`,
      HttpStatus.BAD_REQUEST,
      'BOOKMARK_LIMIT_EXCEEDED',
      { userId, currentCount, maxAllowed },
    );
  }
}

export class BookmarkPermissionException extends AppException {
  constructor(message: string, userId?: string, bookmarkId?: string) {
    super(message, HttpStatus.FORBIDDEN, 'BOOKMARK_PERMISSION_ERROR', {
      userId,
      bookmarkId,
    });
  }
}

/**
 * Project duplicate detection exceptions
 */
export class DuplicateProjectException extends AppException {
  constructor(title: string, similarProjects?: string[]) {
    super(
      `A project with similar content already exists: ${title}`,
      HttpStatus.CONFLICT,
      'DUPLICATE_PROJECT',
      { title, similarProjects },
    );
  }
}

/**
 * Project analytics exceptions
 */
export class ProjectAnalyticsException extends AppException {
  constructor(message: string, projectId?: string) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'PROJECT_ANALYTICS_ERROR',
      {
        projectId,
      },
    );
  }
}
