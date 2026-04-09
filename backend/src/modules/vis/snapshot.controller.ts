import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { VisService } from './vis.service';
import { CreateSnapshotDto } from './dto/snapshot.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 快照管理控制器
 * 提供拓扑快照的创建、查询、回滚功能
 */
@ApiTags('快照管理')
@Controller('snapshots')
export class SnapshotController {
  constructor(private readonly visService: VisService) {}

  @Post()
  @ApiOperation({ summary: '创建当前拓扑快照', description: '将指定拓扑的当前所有节点和边序列化为 JSON 快照' })
  @ApiBody({ type: CreateSnapshotDto })
  @ApiResponse({ status: 201, description: '快照创建成功' })
  @ApiResponse({ status: 404, description: '拓扑不存在' })
  async createSnapshot(
    @Body() dto: CreateSnapshotDto,
    @TenantId() tenantId: string,
  ) {
    return this.visService.createSnapshot(dto.topologyId, tenantId);
  }

  @Get()
  @ApiOperation({ summary: '获取快照列表', description: '支持按拓扑 ID 过滤快照列表' })
  @ApiResponse({ status: 200, description: '成功返回快照列表' })
  async findAllSnapshots(
    @TenantId() tenantId: string,
  ) {
    return this.visService.findAllSnapshots(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取快照详情', description: '返回指定快照的完整信息，包括序列化的拓扑数据' })
  @ApiParam({ name: 'id', description: '快照 ID' })
  @ApiResponse({ status: 200, description: '成功返回快照详情' })
  @ApiResponse({ status: 404, description: '快照不存在' })
  async findSnapshotById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    const snapshot = await this.visService.findSnapshotById(id, tenantId);
    if (!snapshot) {
      throw new NotFoundException(`快照 ${id} 不存在`);
    }
    return snapshot;
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: '回滚到指定快照', description: '删除当前拓扑所有节点和边，恢复快照中的数据' })
  @ApiParam({ name: 'id', description: '快照 ID' })
  @ApiResponse({ status: 200, description: '回滚成功' })
  @ApiResponse({ status: 404, description: '快照不存在' })
  async rollbackSnapshot(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return this.visService.rollbackSnapshot(id, tenantId);
  }
}
