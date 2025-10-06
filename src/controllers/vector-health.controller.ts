import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VectorDatabaseService } from '../services/vector-database.service';
import { VectorOptimizationService } from '../services/vector-optimization.service';

@ApiTags('Vector Database Health')
@Controller('vector/health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VectorHealthController {
  constructor(
    private readonly vectorDb: VectorDatabaseService,
    private readonly vectorOptimization: VectorOptimizationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get vector database health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealthStatus() {
    return await this.vectorDb.getHealthStatus();
  }

  @Get('optimization')
  @ApiOperation({ summary: 'Get optimization statistics' })
  @ApiResponse({
    status: 200,
    description: 'Optimization stats retrieved successfully',
  })
  async getOptimizationStats() {
    return await this.vectorOptimization.getOptimizationStats();
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Trigger optimization for all collections' })
  @ApiResponse({
    status: 200,
    description: 'Optimization started successfully',
  })
  async optimizeAllCollections() {
    return await this.vectorOptimization.optimizeAllCollections();
  }

  @Post('optimize/:collection')
  @ApiOperation({ summary: 'Trigger optimization for specific collection' })
  @ApiResponse({
    status: 200,
    description: 'Collection optimization started successfully',
  })
  async optimizeCollection(@Param('collection') collection: string) {
    return await this.vectorOptimization.forceOptimizeCollection(collection);
  }

  @Get('collections/:collection/info')
  @ApiOperation({ summary: 'Get collection information' })
  @ApiResponse({
    status: 200,
    description: 'Collection info retrieved successfully',
  })
  async getCollectionInfo(@Param('collection') collection: string) {
    return await this.vectorDb.getCollectionInfo(collection);
  }

  @Get('collections/:collection/count')
  @ApiOperation({ summary: 'Get vector count in collection' })
  @ApiResponse({
    status: 200,
    description: 'Vector count retrieved successfully',
  })
  async getVectorCount(@Param('collection') collection: string) {
    return {
      collection,
      count: await this.vectorDb.countVectors(collection),
    };
  }
}
