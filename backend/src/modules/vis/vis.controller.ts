import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { VisService } from './vis.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto, UpdateEdgeDto } from './dto/edge.dto';

/**
 * 可视化拓扑控制器
 * 管理画布节点和连线的 CRUD 操作
 */
@Controller('vis')
export class VisController {
  constructor(private readonly visService: VisService) {}

  // ==================== 节点管理 ====================

  @Get('nodes')
  async findAllNodes() {
    return this.visService.findAllNodes();
  }

  @Get('nodes/:id')
  async findNodeById(@Param('id') id: string) {
    const node = await this.visService.findNodeById(id);
    if (!node) {
      throw new NotFoundException(`节点 ${id} 不存在`);
    }
    return node;
  }

  @Post('nodes')
  async createNode(@Body() dto: CreateNodeDto) {
    return this.visService.createNode(dto);
  }

  @Put('nodes/:id')
  async updateNode(@Param('id') id: string, @Body() dto: UpdateNodeDto) {
    return this.visService.updateNode(id, dto);
  }

  @Delete('nodes/:id')
  async deleteNode(@Param('id') id: string) {
    return this.visService.deleteNode(id);
  }

  // ==================== 连线管理 ====================

  @Get('edges')
  async findAllEdges() {
    return this.visService.findAllEdges();
  }

  @Post('edges')
  async createEdge(@Body() dto: CreateEdgeDto) {
    return this.visService.createEdge(dto);
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
  async calculatePermissions(@Param('roleId') roleId: string, @Body('tenantId') tenantId: string = 'default') {
    return this.visService.calculatePermissionsForRole(roleId, tenantId);
  }

  @Post('graph/validate')
  async validateGraph(@Body('nodes') nodes: any[], @Body('edges') edges: any[]) {
    return this.visService.validateTopology(nodes, edges);
  }
}
