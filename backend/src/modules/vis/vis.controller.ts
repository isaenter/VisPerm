import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { VisService } from './vis.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto, UpdateEdgeDto } from './dto/edge.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 可视化拓扑控制器
 * 管理画布节点和连线的 CRUD 操作
 */
@Controller('vis')
export class VisController {
  constructor(private readonly visService: VisService) {}

  // ==================== 节点管理 ====================

  @Get('nodes')
  async findAllNodes(@TenantId() tenantId: string) {
    return this.visService.findAllNodes(tenantId);
  }

  @Get('nodes/:id')
  async findNodeById(@Param('id') id: string, @TenantId() tenantId: string) {
    const node = await this.visService.findNodeById(id, tenantId);
    if (!node) {
      throw new NotFoundException(`节点 ${id} 不存在`);
    }
    return node;
  }

  @Post('nodes')
  async createNode(@Body() dto: CreateNodeDto, @TenantId() tenantId: string) {
    return this.visService.createNode({ ...dto, tenantId });
  }

  @Put('nodes/:id')
  async updateNode(@Param('id') id: string, @Body() dto: UpdateNodeDto, @TenantId() tenantId: string) {
    return this.visService.updateNode(id, dto);
  }

  @Delete('nodes/:id')
  async deleteNode(@Param('id') id: string) {
    return this.visService.deleteNode(id);
  }

  // ==================== 连线管理 ====================

  @Get('edges')
  async findAllEdges(@TenantId() tenantId: string) {
    return this.visService.findAllEdges(tenantId);
  }

  @Post('edges')
  async createEdge(@Body() dto: CreateEdgeDto, @TenantId() tenantId: string) {
    return this.visService.createEdge({ ...dto, tenantId });
  }

  @Put('edges/:id')
  async updateEdge(@Param('id') id: string, @Body() dto: UpdateEdgeDto) {
    return this.visService.updateEdge(id, dto);
  }

  @Delete('edges/:id')
  async deleteEdge(@Param('id') id: string) {
    return this.visService.deleteEdge(id);
  }

  // ==================== 拓扑图操作 ====================

  @Get('graph/:roleId/calculate')
  async calculatePermissions(@Param('roleId') roleId: string, @TenantId() tenantId: string) {
    return this.visService.calculatePermissionsForRole(roleId, tenantId);
  }

  @Post('graph/validate')
  async validateGraph(@Body('nodes') nodes: any[], @Body('edges') edges: any[]) {
    return this.visService.validateTopology(nodes, edges);
  }
}
