import {
  Controller,
  Post,
  Delete,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookmarkService } from '../services/bookmark.service';
import { InputSanitizationService } from '../common/services/input-sanitization.service';
import { SecurityGuard, Security } from '../common/guards/security.guard';
import {
  CreateBookmarkDto,
  BookmarkResponseDto,
  PaginatedBookmarksDto,
  BookmarkQueryDto,
  CompareProjectsDto,
  ProjectComparisonDto,
  CreateBookmarkCategoryDto,
  UpdateBookmarkCategoryDto,
  BookmarkCategoryDto,
  AssignBookmarkCategoryDto,
  ExportBookmarksDto,
  BookmarkExportData,
} from '../dto/bookmark';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('bookmarks')
@ApiBearerAuth('JWT-auth')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard, RolesGuard, SecurityGuard)
@Roles(UserRole.STUDENT)
export class BookmarkController {
  constructor(
    private readonly bookmarkService: BookmarkService,
    private readonly inputSanitizationService: InputSanitizationService,
  ) {}

  @Post()
  @Security({
    rateLimit: {
      endpoint: 'bookmark',
      maxRequests: 20,
      windowMs: 60000, // 1 minute
    },
    inputValidation: {
      sanitizeBody: true,
      maxBodySize: 1000,
    },
  })
  @ApiOperation({ summary: 'Create a new bookmark' })
  @ApiResponse({
    status: 201,
    description: 'Bookmark created successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Project is already bookmarked',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found or not approved',
  })
  async createBookmark(
    @Request() req: any,
    @Body() createBookmarkDto: CreateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    return this.bookmarkService.createBookmark(req.user.id, createBookmarkDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Security({
    rateLimit: {
      endpoint: 'bookmark',
      maxRequests: 30,
      windowMs: 60000, // 1 minute
    },
  })
  @ApiOperation({ summary: 'Remove a bookmark by ID' })
  @ApiResponse({
    status: 204,
    description: 'Bookmark removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async removeBookmark(
    @Request() req: any,
    @Param('id') bookmarkId: string,
  ): Promise<void> {
    return this.bookmarkService.removeBookmark(req.user.id, bookmarkId);
  }

  @Delete('project/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a bookmark by project ID' })
  @ApiResponse({
    status: 204,
    description: 'Bookmark removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async removeBookmarkByProjectId(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    return this.bookmarkService.removeBookmarkByProjectId(
      req.user.id,
      projectId,
    );
  }

  @Get()
  @Security({
    rateLimit: {
      endpoint: 'bookmark',
      maxRequests: 50,
      windowMs: 60000, // 1 minute
    },
    inputValidation: {
      sanitizeQuery: true,
      maxQueryLength: 200,
    },
  })
  @ApiOperation({ summary: 'Get user bookmarks with pagination' })
  @ApiResponse({
    status: 200,
    description: 'User bookmarks retrieved successfully',
    type: PaginatedBookmarksDto,
  })
  async getUserBookmarks(
    @Request() req: any,
    @Query() query: BookmarkQueryDto,
  ): Promise<PaginatedBookmarksDto> {
    return this.bookmarkService.getUserBookmarks(req.user.id, query);
  }

  @Get('check/:projectId')
  @ApiOperation({ summary: 'Check if a project is bookmarked' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark status retrieved',
    schema: {
      type: 'object',
      properties: {
        isBookmarked: { type: 'boolean' },
      },
    },
  })
  async checkBookmarkStatus(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const isBookmarked = await this.bookmarkService.isProjectBookmarked(
      req.user.id,
      projectId,
    );
    return { isBookmarked };
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare bookmarked projects side-by-side' })
  @ApiResponse({
    status: 200,
    description: 'Project comparison data retrieved successfully',
    type: ProjectComparisonDto,
  })
  @ApiResponse({
    status: 404,
    description: 'One or more projects are not bookmarked',
  })
  async compareProjects(
    @Request() req: any,
    @Body() compareDto: CompareProjectsDto,
  ): Promise<ProjectComparisonDto> {
    return this.bookmarkService.compareBookmarkedProjects(
      req.user.id,
      compareDto,
    );
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new bookmark category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: BookmarkCategoryDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Category with this name already exists',
  })
  async createCategory(
    @Request() req: any,
    @Body() createCategoryDto: CreateBookmarkCategoryDto,
  ): Promise<BookmarkCategoryDto> {
    return this.bookmarkService.createCategory(req.user.id, createCategoryDto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get user bookmark categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [BookmarkCategoryDto],
  })
  async getCategories(@Request() req: any): Promise<BookmarkCategoryDto[]> {
    return this.bookmarkService.getUserCategories(req.user.id);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a bookmark category' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: BookmarkCategoryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async updateCategory(
    @Request() req: any,
    @Param('id') categoryId: string,
    @Body() updateCategoryDto: UpdateBookmarkCategoryDto,
  ): Promise<BookmarkCategoryDto> {
    return this.bookmarkService.updateCategory(
      req.user.id,
      categoryId,
      updateCategoryDto,
    );
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark category' })
  @ApiResponse({
    status: 204,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async deleteCategory(
    @Request() req: any,
    @Param('id') categoryId: string,
  ): Promise<void> {
    return this.bookmarkService.deleteCategory(req.user.id, categoryId);
  }

  @Patch('assign-category')
  @ApiOperation({ summary: 'Assign bookmark to a category' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark category assigned successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark or category not found',
  })
  async assignCategory(
    @Request() req: any,
    @Body() assignDto: AssignBookmarkCategoryDto,
  ): Promise<BookmarkResponseDto> {
    return this.bookmarkService.assignBookmarkToCategory(
      req.user.id,
      assignDto,
    );
  }

  @Post('export')
  @ApiOperation({ summary: 'Export bookmarks in various formats' })
  @ApiResponse({
    status: 200,
    description: 'Bookmarks exported successfully',
    type: BookmarkExportData,
  })
  async exportBookmarks(
    @Request() req: any,
    @Body() exportDto: ExportBookmarksDto,
  ): Promise<BookmarkExportData> {
    return this.bookmarkService.exportBookmarks(req.user.id, exportDto);
  }
}
