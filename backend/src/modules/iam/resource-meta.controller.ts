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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { IamService } from '../iam/iam.service';
import { CreateResourceMetaDto, UpdateResourceMetaDto } from '../iam/dto/resource-meta.dto';
import { TenantId } from '../../common/tenant/tenant.context';

/**
 * 资源元数据控制器
 * 处理 SysResourceMeta 模型的 CRUD 操作
 * 管理资源字段定义和元数据信息
 */
@ApiTags('资源元数据')
@Controller('resource-meta')
export class ResourceMetaController {
  constructor(private readonly iamService: IamService) {}

  @Get()
  @ApiOperation({ summary: '获取所有资源元数据列表', description: '按租户获取所有资源元数据定义' })
  @ApiResponse({ status: 200, description: '成功返回资源元数据列表' })
  async findAll(@TenantId() tenantId: string) {
    return this.iamService.findAllResourceMetas(tenantId);
  }

  @Get(':resourceCode')
  @ApiOperation({ summary: '根据资源编码获取元数据详情', description: '获取指定资源的字段定义和元数据' })
  @ApiParam({ name: 'resourceCode', description: '资源编码' })
  @ApiResponse({ status: 200, description: '成功返回资源元数据详情' })
  @ApiResponse({ status: 404, description: '资源元数据不存在' })
  async findByCode(@Param('resourceCode') resourceCode: string, @TenantId() tenantId: string) {
    const meta = await this.iamService.findResourceMetaByCode(resourceCode, tenantId);
    if (!meta) {
      throw new NotFoundException(`资源元数据 ${resourceCode} 不存在`);
    }
    return meta;
  }

  @Post()
  @ApiOperation({ summary: '创建资源元数据', description: '新建资源元数据定义，包含字段结构信息' })
  @ApiBody({ type: CreateResourceMetaDto })
  @ApiResponse({ status: 201, description: '资源元数据创建成功' })
  @ApiResponse({ status: 400, description: '请求参数验证失败' })
  async create(@Body() dto: CreateResourceMetaDto, @TenantId() tenantId: string) {
    return this.iamService.createResourceMeta({ ...dto, tenantId });
  }

  @Put(':resourceCode')
  @ApiOperation({ summary: '更新资源元数据', description: '更新资源元数据的名称或字段定义' })
  @ApiParam({ name: 'resourceCode', description: '资源编码' })
  @ApiBody({ type: UpdateResourceMetaDto })
  @ApiResponse({ status: 200, description: '资源元数据更新成功' })
  @ApiResponse({ status: 404, description: '资源元数据不存在' })
  async update(@Param('resourceCode') resourceCode: string, @Body() dto: UpdateResourceMetaDto, @TenantId() tenantId: string) {
    return this.iamService.updateResourceMeta(resourceCode, tenantId, dto);
  }

  @Delete(':resourceCode')
  @ApiOperation({ summary: '删除资源元数据', description: '删除指定资源元数据定义' })
  @ApiParam({ name: 'resourceCode', description: '资源编码' })
  @ApiResponse({ status: 200, description: '资源元数据删除成功' })
  @ApiResponse({ status: 404, description: '资源元数据不存在' })
  async remove(@Param('resourceCode') resourceCode: string, @TenantId() tenantId: string) {
    return this.iamService.deleteResourceMeta(resourceCode, tenantId);
  }
}
