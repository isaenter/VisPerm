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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VisService } from './vis.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';
import { CreateEdgeDto, UpdateEdgeDto } from './dto/edge.dto';
import { SimulationRunDto } from './dto/simulation.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 可视化拓扑控制器
 * 管理画布节点和连线的 CRUD 操作
 */
@ApiTags('可视化拓扑')
@Controller('vis')
export class VisController {
  constructor(private readonly visService: VisService) {}

  // ==================== 节点管理 ====================

  @Get('nodes')
  @ApiOperation({ summary: '获取所有节点列表', description: '按租户获取所有可视化节点' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID（从请求头 x-tenant-id 获取）' })
  @ApiResponse({ status: 200, description: '成功返回节点列表' })
  async findAllNodes(@TenantId() tenantId: string) {
    return this.visService.findAllNodes(tenantId);
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: '根据 ID 获取节点详情', description: '包含该节点的入边和出边信息' })
  @ApiParam({ name: 'id', description: '节点 ID' })
  @ApiResponse({ status: 200, description: '成功返回节点详情' })
  @ApiResponse({ status: 404, description: '节点不存在' })
  async findNodeById(@Param('id') id: string, @TenantId() tenantId: string) {
    const node = await this.visService.findNodeById(id, tenantId);
    if (!node) {
      throw new NotFoundException(`节点 ${id} 不存在`);
    }
    return node;
  }

  @Post('nodes')
  @ApiOperation({ summary: '创建节点', description: '在画布上新建一个节点（RESOURCE/FILTER/ROLE/ADDON）' })
  @ApiBody({ type: CreateNodeDto })
  @ApiResponse({ status: 201, description: '节点创建成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async createNode(@Body() dto: CreateNodeDto, @TenantId() tenantId: string) {
    return this.visService.createNode({ ...dto, tenantId });
  }

  @Put('nodes/:id')
  @ApiOperation({ summary: '更新节点', description: '更新节点名称、坐标或配置' })
  @ApiParam({ name: 'id', description: '节点 ID' })
  @ApiBody({ type: UpdateNodeDto })
  @ApiResponse({ status: 200, description: '节点更新成功' })
  @ApiResponse({ status: 404, description: '节点不存在' })
  async updateNode(@Param('id') id: string, @Body() dto: UpdateNodeDto, @TenantId() tenantId: string) {
    return this.visService.updateNode(id, dto);
  }

  @Delete('nodes/:id')
  @ApiOperation({ summary: '删除节点', description: '删除节点及其关联的连线' })
  @ApiParam({ name: 'id', description: '节点 ID' })
  @ApiResponse({ status: 200, description: '节点删除成功' })
  @ApiResponse({ status: 404, description: '节点不存在' })
  async deleteNode(@Param('id') id: string) {
    return this.visService.deleteNode(id);
  }

  // ==================== 连线管理 ====================

  @Get('edges')
  @ApiOperation({ summary: '获取所有连线列表', description: '按租户获取所有可视化连线，包含源节点和目标节点信息' })
  @ApiResponse({ status: 200, description: '成功返回连线列表' })
  async findAllEdges(@TenantId() tenantId: string) {
    return this.visService.findAllEdges(tenantId);
  }

  @Post('edges')
  @ApiOperation({ summary: '创建连线', description: '在两个节点之间建立连线，自动验证连线合法性' })
  @ApiBody({ type: CreateEdgeDto })
  @ApiResponse({ status: 201, description: '连线创建成功' })
  @ApiResponse({ status: 400, description: '连线不合法或已存在' })
  async createEdge(@Body() dto: CreateEdgeDto, @TenantId() tenantId: string) {
    return this.visService.createEdge({ ...dto, tenantId });
  }

  @Put('edges/:id')
  @ApiOperation({ summary: '更新连线', description: '更新连线类型或配置' })
  @ApiParam({ name: 'id', description: '连线 ID' })
  @ApiBody({ type: UpdateEdgeDto })
  @ApiResponse({ status: 200, description: '连线更新成功' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  async updateEdge(@Param('id') id: string, @Body() dto: UpdateEdgeDto) {
    return this.visService.updateEdge(id, dto);
  }

  @Delete('edges/:id')
  @ApiOperation({ summary: '删除连线', description: '删除指定连线' })
  @ApiParam({ name: 'id', description: '连线 ID' })
  @ApiResponse({ status: 200, description: '连线删除成功' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  async deleteEdge(@Param('id') id: string) {
    return this.visService.deleteEdge(id);
  }

  // ==================== 拓扑图操作 ====================

  @Get('graph/:roleId/calculate')
  @ApiOperation({ summary: '计算角色权限', description: '通过图遍历算法从角色节点反向遍历至资源节点，计算该角色的完整权限' })
  @ApiParam({ name: 'roleId', description: '角色 ID' })
  @ApiResponse({ status: 200, description: '权限计算完成' })
  async calculatePermissions(@Param('roleId') roleId: string, @TenantId() tenantId: string) {
    return this.visService.calculatePermissionsForRole(roleId, tenantId);
  }

  @Post('graph/validate')
  @ApiOperation({ summary: '验证拓扑图', description: '检查拓扑图是否存在环路等结构问题' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nodes: { type: 'array', items: { type: 'object' } },
        edges: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiResponse({ status: 200, description: '验证结果' })
  async validateGraph(@Body('nodes') nodes: any[], @Body('edges') edges: any[]) {
    return this.visService.validateTopology(nodes, edges);
  }

  // ==================== 模拟运行 API ====================

  @Post('simulation/run')
  @ApiOperation({
    summary: '模拟运行权限计算（Sandbox）',
    description: '在不修改数据库的情况下计算权限。支持传入角色 ID 或用户 ID 集合，返回模拟计算出的最终权限结构。默认 Dry Run 模式。',
  })
  @ApiBody({ type: SimulationRunDto })
  @ApiResponse({ status: 200, description: '模拟计算完成，返回权限结构' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async runSimulation(
    @Body() dto: SimulationRunDto,
    @TenantId() tenantId: string,
  ) {
    return this.visService.runSimulation(dto, tenantId);
  }
}
