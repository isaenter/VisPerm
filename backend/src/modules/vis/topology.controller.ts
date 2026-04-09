import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VisService } from '../vis/vis.service';
import { CreateTopologyDto, UpdateTopologyDto, PublishTopologyDto } from '../vis/dto/topology.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 拓扑管理控制器
 * 处理 VisTopology 模型的 CRUD 操作
 * 支持拓扑的创建、查询、更新、删除和发布
 */
@ApiTags('拓扑管理')
@Controller('topologies')
export class TopologyController {
  constructor(private readonly visService: VisService) {}

  @Get()
  @ApiOperation({ summary: '获取所有拓扑列表', description: '按租户和环境获取拓扑列表，包含节点和连线信息' })
  @ApiQuery({ name: 'env', required: false, description: '环境标识：prod/pre/test' })
  @ApiResponse({ status: 200, description: '成功返回拓扑列表' })
  async findAllTopologies(@TenantId() tenantId: string, @Query('env') env?: string) {
    return this.visService.findAllTopologies(tenantId, env);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取拓扑详情', description: '包含拓扑下的所有节点和连线' })
  @ApiParam({ name: 'id', description: '拓扑 ID' })
  @ApiResponse({ status: 200, description: '成功返回拓扑详情' })
  @ApiResponse({ status: 404, description: '拓扑不存在' })
  async findTopologyById(@Param('id') id: string, @TenantId() tenantId: string) {
    const topology = await this.visService.findTopologyById(id, tenantId);
    if (!topology) {
      throw new NotFoundException(`拓扑 ${id} 不存在`);
    }
    return topology;
  }

  @Post()
  @ApiOperation({ summary: '创建拓扑', description: '新建一个权限拓扑图' })
  @ApiBody({ type: CreateTopologyDto })
  @ApiResponse({ status: 201, description: '拓扑创建成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async createTopology(@Body() dto: CreateTopologyDto, @TenantId() tenantId: string) {
    return this.visService.createTopology({ ...dto, tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新拓扑', description: '更新拓扑名称、描述或状态，支持乐观锁' })
  @ApiParam({ name: 'id', description: '拓扑 ID' })
  @ApiBody({ type: UpdateTopologyDto })
  @ApiResponse({ status: 200, description: '拓扑更新成功' })
  @ApiResponse({ status: 404, description: '拓扑不存在' })
  async updateTopology(@Param('id') id: string, @Body() dto: UpdateTopologyDto, @TenantId() tenantId: string) {
    return this.visService.updateTopology(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除拓扑', description: '删除拓扑及其关联的节点和连线（级联删除）' })
  @ApiParam({ name: 'id', description: '拓扑 ID' })
  @ApiResponse({ status: 200, description: '拓扑删除成功' })
  @ApiResponse({ status: 404, description: '拓扑不存在' })
  async deleteTopology(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.visService.deleteTopology(id, tenantId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布拓扑', description: '将拓扑状态更新为已发布，并递增版本号' })
  @ApiParam({ name: 'id', description: '拓扑 ID' })
  @ApiBody({ type: PublishTopologyDto })
  @ApiResponse({ status: 200, description: '拓扑发布成功' })
  @ApiResponse({ status: 404, description: '拓扑不存在或版本号不匹配' })
  async publishTopology(@Param('id') id: string, @Body() dto: PublishTopologyDto, @TenantId() tenantId: string) {
    return this.visService.publishTopology(id, dto.version, tenantId);
  }
}
