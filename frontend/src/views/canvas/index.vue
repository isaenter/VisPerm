<template>
  <div class="visperm-canvas">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">VisPerm 拓扑编排</span>
      </div>
      <div class="toolbar-center">
        <el-button-group>
          <!-- 保存 -->
          <el-button type="primary" :icon="Finished" @click="handleSave" :loading="saving">
            保存
          </el-button>
          <!-- 清空画布 -->
          <el-button type="danger" :icon="Delete" @click="handleClear">
            清空
          </el-button>
          <!-- 适应屏幕 -->
          <el-button :icon="FullScreen" @click="handleFitView">
            适应屏幕
          </el-button>
          <!-- 重做/撤销 -->
          <el-button :icon="RefreshLeft" @click="handleUndo">
            撤销
          </el-button>
          <el-button :icon="RefreshRight" @click="handleRedo">
            重做
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <el-button :icon="Download" @click="handleExport">
          导出
        </el-button>
        <el-button :icon="Upload" @click="handleImport">
          导入
        </el-button>
        <el-tag :type="statusType" size="small">{{ statusText }}</el-tag>
      </div>
    </div>

    <div class="canvas-body">
      <!-- 左侧节点面板 -->
      <div class="node-palette">
        <div class="palette-header">
          <span>节点面板</span>
          <el-tooltip content="拖拽节点到画布" placement="top">
            <el-icon><InfoFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="palette-section">
          <div class="section-title">核心节点</div>
          <div
            class="node-item"
            v-for="node in coreNodeTypes"
            :key="node.type"
            :draggable="true"
            @dragstart="onDragStart($event, node)"
            @dragend="onDragEnd"
          >
            <div class="node-preview" :style="{ backgroundColor: node.color }">
              {{ node.icon }}
            </div>
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>

        <div class="palette-section">
          <div class="section-title">辅助节点</div>
          <div
            class="node-item"
            v-for="node in addonNodeTypes"
            :key="node.type"
            :draggable="true"
            @dragstart="onDragStart($event, node)"
            @dragend="onDragEnd"
          >
            <div class="node-preview" :style="{ backgroundColor: node.color }">
              {{ node.icon }}
            </div>
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>

        <div class="palette-section">
          <div class="section-title">图例说明</div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #52c41a"></span>
            <span>资源节点 - 可访问的系统资源</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #1890ff"></span>
            <span>角色节点 - 权限集合</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #fa8c16"></span>
            <span>过滤器 - 条件过滤</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #722ed1"></span>
            <span>增量包 - 扩展权限</span>
          </div>
        </div>
      </div>

      <!-- 中间画布区域 -->
      <div class="canvas-area" ref="canvasContainer" @drop="onDrop" @dragover="onDragOver">
        <!-- 画布容器由 LogicFlow 接管 -->
      </div>

      <!-- 右侧属性面板 -->
      <div class="property-panel" v-show="selectedElement">
        <div class="panel-header">
          <span>属性配置</span>
          <el-button text @click="closePropertyPanel">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <!-- 节点属性 -->
        <template v-if="selectedElement?.type === 'node'">
          <el-form :model="nodeForm" label-width="80px" label-position="top" size="small">
            <el-form-item label="节点 ID">
              <el-input v-model="nodeForm.id" disabled />
            </el-form-item>
            <el-form-item label="节点名称">
              <el-input v-model="nodeForm.name" placeholder="请输入节点名称" />
            </el-form-item>
            <el-form-item label="节点类型">
              <el-tag :style="{ backgroundColor: nodeTypeColor, border: 'none' }">
                {{ nodeForm.nodeType }}
              </el-tag>
            </el-form-item>
            <el-form-item label="节点编码">
              <el-input v-model="nodeForm.code" placeholder="请输入节点编码" />
            </el-form-item>
            <el-form-item label="节点描述">
              <el-input
                v-model="nodeForm.description"
                type="textarea"
                :rows="3"
                placeholder="请输入节点描述"
              />
            </el-form-item>

            <el-divider>位置信息</el-divider>
            <el-form-item label="X 坐标">
              <el-input-number v-model="nodeForm.x" :min="0" style="width: 100%" />
            </el-form-item>
            <el-form-item label="Y 坐标">
              <el-input-number v-model="nodeForm.y" :min="0" style="width: 100%" />
            </el-form-item>

            <div class="panel-actions">
              <el-button type="primary" @click="handleUpdateNode" size="small">
                更新
              </el-button>
              <el-button type="danger" @click="handleDeleteNode" size="small">
                删除
              </el-button>
            </div>
          </el-form>
        </template>

        <!-- 连线属性 -->
        <template v-else-if="selectedElement?.type === 'edge'">
          <el-form :model="edgeForm" label-width="80px" label-position="top" size="small">
            <el-form-item label="连线 ID">
              <el-input v-model="edgeForm.id" disabled />
            </el-form-item>
            <el-form-item label="连线类型">
              <el-select v-model="edgeForm.edgeType" style="width: 100%">
                <el-option label="继承 (INHERITANCE)" value="INHERITANCE" />
                <el-option label="缩小 (NARROWING)" value="NARROWING" />
                <el-option label="扩展 (EXTENSION)" value="EXTENSION" />
                <el-option label="拒绝 (DENY)" value="DENY" />
              </el-select>
            </el-form-item>
            <el-form-item label="源节点">
              <el-input v-model="edgeForm.sourceNodeId" disabled />
            </el-form-item>
            <el-form-item label="目标节点">
              <el-input v-model="edgeForm.targetNodeId" disabled />
            </el-form-item>

            <div class="panel-actions">
              <el-button type="primary" @click="handleUpdateEdge" size="small">
                更新
              </el-button>
              <el-button type="danger" @click="handleDeleteEdge" size="small">
                删除
              </el-button>
            </div>
          </el-form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Finished,
  Delete,
  FullScreen,
  RefreshLeft,
  RefreshRight,
  Download,
  Upload,
  InfoFilled,
  Close,
} from '@element-plus/icons-vue';
import LogicFlow, { RectNode, RectNodeModel } from '@logicflow/core';
import '@logicflow/core/dist/style/index.css';
import {
  getNodes,
  getEdges,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  updateEdge,
  deleteEdge,
  validateGraph as apiValidateGraph,
  type VisNode,
  type VisEdge,
} from '@/api/vis';

// ==================== 类型定义 ====================

/** 节点类型配置 */
interface NodeTypeConfig {
  type: string;
  label: string;
  icon: string;
  color: string;
  strokeColor: string;
}

/** 画布状态 */
type CanvasStatus = 'ready' | 'loading' | 'saving' | 'error' | 'dirty';

// ==================== 节点类型定义 ====================

// 核心节点类型
const coreNodeTypes: NodeTypeConfig[] = [
  {
    type: 'resource-node',
    label: '资源节点',
    icon: '📦',
    color: '#f6ffed',
    strokeColor: '#52c41a',
  },
  {
    type: 'role-node',
    label: '角色节点',
    icon: '👤',
    color: '#e6f7ff',
    strokeColor: '#1890ff',
  },
  {
    type: 'filter-node',
    label: '过滤器',
    icon: '🌪️',
    color: '#fff7e6',
    strokeColor: '#fa8c16',
  },
];

// 辅助节点类型
const addonNodeTypes: NodeTypeConfig[] = [
  {
    type: 'addon-node',
    label: '增量包',
    icon: '➕',
    color: '#f9f0ff',
    strokeColor: '#722ed1',
  },
];

// 所有节点类型
const allNodeTypes: NodeTypeConfig[] = [...coreNodeTypes, ...addonNodeTypes];

// ==================== LogicFlow 相关 ====================

const canvasContainer = ref<HTMLDivElement | null>(null);
let lf: LogicFlow | null = null;

/** 自定义节点配置映射 */
const nodeConfigMap: Record<string, NodeTypeConfig> = {};
allNodeTypes.forEach((nt) => {
  nodeConfigMap[nt.type] = nt;
});

/**
 * 注册自定义节点
 * 使用 LogicFlow 的 RectNode 基类，通过不同的颜色和样式区分节点类型
 */
const registerCustomNodes = () => {
  if (!lf) return;

  allNodeTypes.forEach((nt) => {
    // 定义自定义 Model
    class CustomNodeModel extends RectNodeModel {
      constructor(data: any, graphModel: any) {
        super(data, graphModel);
      }
    }

    // 定义自定义 View
    class CustomNodeView extends RectNode {
      /**
       * 获取节点样式
       */
      getShapeStyle() {
        const style = super.getShapeStyle();
        style.fill = nt.color;
        style.stroke = nt.strokeColor;
        style.strokeWidth = 2;
        style.radius = 8;
        return style;
      }

      /**
       * 获取文本样式
       */
      getTextStyle() {
        const style = super.getTextStyle();
        style.color = '#333';
        style.fontSize = 14;
        style.fontWeight = 'bold';
        return style;
      }
    }

    // 注册节点类型
    lf.register({
      type: nt.type,
      view: CustomNodeView,
      model: CustomNodeModel,
    });
  });
};

/**
 * 初始化 LogicFlow 画布
 */
const initCanvas = () => {
  if (!canvasContainer.value) {
    console.error('画布容器未找到');
    return;
  }

  // 清空容器
  canvasContainer.value.innerHTML = '';

  lf = new LogicFlow({
    container: canvasContainer.value,
    // 自适应容器大小
    width: canvasContainer.value.clientWidth,
    height: canvasContainer.value.clientHeight,
    // 启用网格
    grid: {
      size: 10,
      visible: true,
      type: 'dot',
      config: {
        color: '#e5e5e5',
      },
    },
    // 启用背景
    background: {
      backgroundColor: '#fafafa',
    },
    // 允许连线
    edgeType: 'polyline',
    // 启用撤销/重做
    isSilentMode: false,
    // 允许调整连线
    adjustEdge: true,
    // 允许调整节点
    adjustNodePosition: true,
    // 允许创建新连线
    edgeTextEdit: true,
    // 启用键盘快捷键
    keyboard: {
      enabled: true,
    },
    // 节点样式默认值
    style: {
      rect: {
        rx: 8,
        ry: 8,
      },
    },
    // 连线样式
    edgeStyle: {
      stroke: '#a0a0a0',
      strokeWidth: 2,
    },
    // 连线动画
    animation: true,
    // 画布行为
    stopScrollGraph: false,
    stopZoomGraph: false,
    stopMoveGraph: false,
  });

  // 注册自定义节点
  registerCustomNodes();

  // 监听节点点击
  lf.on('node:click', ({ data }: any) => {
    selectElement('node', data);
  });

  // 监听连线点击
  lf.on('edge:click', ({ data }: any) => {
    selectElement('edge', data);
  });

  // 监听画布点击（取消选择）
  lf.on('blank:click', () => {
    selectedElement.value = null;
  });

  // 监听节点添加
  lf.on('node:add', ({ data }: any) => {
    status.value = 'dirty';
  });

  // 监听节点删除
  lf.on('node:delete', () => {
    status.value = 'dirty';
    selectedElement.value = null;
  });

  // 监听连线添加
  lf.on('edge:add', ({ data }: any) => {
    status.value = 'dirty';
    // 自动设置连线类型为默认
    if (data && data.id) {
      lf?.updateEdge(data.id, {
        properties: { ...data.properties, edgeType: 'INHERITANCE' },
      });
    }
  });

  // 监听连线删除
  lf.on('edge:delete', () => {
    status.value = 'dirty';
    selectedElement.value = null;
  });

  // 渲染画布
  lf.render();

  // 加载后端数据
  loadGraphData();
};

// ==================== 拖拽功能 ====================

let draggingNodeType: NodeTypeConfig | null = null;

/**
 * 拖拽开始
 */
const onDragStart = (event: DragEvent, node: NodeTypeConfig) => {
  draggingNodeType = node;
  event.dataTransfer?.setData('nodeType', node.type);
  event.dataTransfer?.setData('nodeLabel', node.label);
  event.dataTransfer!.effectAllowed = 'copy';
};

/**
 * 拖拽结束
 */
const onDragEnd = () => {
  draggingNodeType = null;
};

/**
 * 允许放置
 */
const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'copy';
};

/**
 * 处理放置 - 在画布上创建节点
 */
const onDrop = async (event: DragEvent) => {
  event.preventDefault();
  const nodeType = event.dataTransfer?.getData('nodeType');
  const nodeLabel = event.dataTransfer?.getData('nodeLabel');

  if (!nodeType || !lf) return;

  // 计算放置位置（相对于画布）
  const containerRect = canvasContainer.value?.getBoundingClientRect();
  if (!containerRect) return;

  // 将鼠标坐标转换为画布坐标
  const point = lf.getPointByClient(event.clientX, event.clientY);
  const x = point.x || event.clientX - containerRect.left;
  const y = point.y || event.clientY - containerRect.top;

  const config = nodeConfigMap[nodeType];

  // 定义节点数据（在 try 外部，以便 catch 块也能访问）
  const newNode: Partial<VisNode> = {
    tenantId: 'default-tenant', // 提供默认租户 ID
    type: nodeType.replace('-node', '').toUpperCase() as any,
    name: nodeLabel || config?.label || '新节点',
    positionX: x,
    positionY: y,
  };

  try {
    // 创建节点到后端
    const createdNode = await createNode(newNode);
    const nodeId = createdNode.id || `node_${Date.now()}`;

    // 在画布上添加节点
    lf.addNode({
      id: nodeId,
      type: nodeType,
      x,
      y,
      text: newNode.name,
      properties: {
        nodeId,
        nodeType: config?.label,
        ...newNode,
      },
    });

    ElMessage.success(`已添加${config?.label}`);
    status.value = 'dirty';
  } catch (error: any) {
    console.error('创建节点失败:', error);
    // 如果后端不可用，仍然在画布上添加节点
    lf.addNode({
      id: `node_${Date.now()}`,
      type: nodeType,
      x,
      y,
      text: nodeLabel || '新节点',
      properties: {
        nodeType: config?.label,
        ...newNode,
      },
    });
    ElMessage.warning('后端不可用，节点仅添加到画布');
    status.value = 'dirty';
  }
};

// ==================== 属性面板 ====================

const selectedElement = ref<{ type: string; data: any } | null>(null);

/** 节点表单 */
const nodeForm = ref({
  id: '',
  name: '',
  nodeType: '',
  code: '',
  description: '',
  x: 0,
  y: 0,
});

/** 连线表单 */
const edgeForm = ref({
  id: '',
  edgeType: 'INHERITANCE',
  sourceNodeId: '',
  targetNodeId: '',
});

/** 节点类型颜色 */
const nodeTypeColor = computed(() => {
  if (!selectedElement.value || selectedElement.value.type !== 'node') return '#e0e0e0';
  const type = selectedElement.value.data?.type;
  return nodeConfigMap[type]?.strokeColor || '#e0e0e0';
});

/**
 * 选择元素
 */
const selectElement = (elementType: string, data: any) => {
  selectedElement.value = { type: elementType, data };

  if (elementType === 'node') {
    nodeForm.value = {
      id: data.id || '',
      name: data.text?.value || data.text || '',
      nodeType: data.properties?.nodeType || nodeConfigMap[data.type]?.label || '未知',
      code: data.properties?.code || '',
      description: data.properties?.description || '',
      x: Math.round(data.x || 0),
      y: Math.round(data.y || 0),
    };
  } else if (elementType === 'edge') {
    edgeForm.value = {
      id: data.id || '',
      edgeType: data.properties?.edgeType || 'INHERITANCE',
      sourceNodeId: data.sourceNodeId || '',
      targetNodeId: data.targetNodeId || '',
    };
  }
};

/**
 * 关闭属性面板
 */
const closePropertyPanel = () => {
  selectedElement.value = null;
};

/**
 * 更新选中的节点
 */
const handleUpdateNode = async () => {
  if (!lf || !selectedElement.value) return;

  const { id, name } = nodeForm.value;

  try {
    // 更新后端数据
    await updateNode(id, {
      name,
      code: nodeForm.value.code,
      positionX: nodeForm.value.x,
      positionY: nodeForm.value.y,
      config: {
        description: nodeForm.value.description,
      },
    });

    // 更新画布节点
    lf.updateText(id, name);

    ElMessage.success('节点已更新');
    status.value = 'dirty';
  } catch (error) {
    console.error('更新节点失败:', error);
    ElMessage.error('更新节点失败');
  }
};

/**
 * 删除选中的节点
 */
const handleDeleteNode = async () => {
  if (!lf || !selectedElement.value) return;

  try {
    await ElMessageBox.confirm('确定要删除此节点吗？关联的连线也将被删除', '确认删除', {
      type: 'warning',
    });

    const { id } = nodeForm.value;
    await deleteNode(id);

    // 从画布删除
    lf.deleteNode(id);
    selectedElement.value = null;

    ElMessage.success('节点已删除');
    status.value = 'dirty';
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error);
      ElMessage.error('删除节点失败');
    }
  }
};

/**
 * 更新选中的连线
 */
const handleUpdateEdge = async () => {
  if (!lf || !selectedElement.value) return;

  try {
    const { id, edgeType } = edgeForm.value;
    await updateEdge(id, { type: edgeType as any });

    ElMessage.success('连线已更新');
    status.value = 'dirty';
  } catch (error) {
    console.error('更新连线失败:', error);
    ElMessage.error('更新连线失败');
  }
};

/**
 * 删除选中的连线
 */
const handleDeleteEdge = async () => {
  if (!lf || !selectedElement.value) return;

  try {
    await ElMessageBox.confirm('确定要删除此连线吗？', '确认删除', {
      type: 'warning',
    });

    const { id } = edgeForm.value;
    await deleteEdge(id);

    lf.deleteEdge(id);
    selectedElement.value = null;

    ElMessage.success('连线已删除');
    status.value = 'dirty';
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除连线失败:', error);
      ElMessage.error('删除连线失败');
    }
  }
};

// ==================== 工具栏操作 ====================

const saving = ref(false);
const status = ref<CanvasStatus>('loading');

/** 保存锁：防止重复提交导致竞态条件 */
const isSaving = ref(false);

const statusText = computed(() => {
  const map: Record<CanvasStatus, string> = {
    ready: '就绪',
    loading: '加载中...',
    saving: '保存中...',
    error: '错误',
    dirty: '未保存',
  };
  return map[status.value];
});

const statusType = computed(() => {
  const map: Record<CanvasStatus, any> = {
    ready: 'success',
    loading: 'info',
    saving: 'warning',
    error: 'danger',
    dirty: 'warning',
  };
  return map[status.value];
});

/**
 * 加载画布数据
 */
const loadGraphData = async () => {
  if (!lf) return;

  status.value = 'loading';

  try {
    const [nodesData, edgesData] = await Promise.all([getNodes(), getEdges()]);

    const graphData: any = {
      nodes: nodesData.map((n: VisNode) => {
        // 根据后端节点类型映射到 LogicFlow 节点类型
        const typeMap: Record<string, string> = {
          RESOURCE: 'resource-node',
          ROLE: 'role-node',
          FILTER: 'filter-node',
          ADDON: 'addon-node',
        };
        const lfType = typeMap[n.type] || 'resource-node';

        return {
          id: n.id,
          type: lfType,
          x: n.positionX || 100,
          y: n.positionY || 100,
          text: n.name,
          properties: {
            ...n,
            nodeType: typeMap[n.type] ? nodeConfigMap[typeMap[n.type]]?.label : n.type,
            code: n.code,
          },
        };
      }),
      edges: edgesData.map((e: VisEdge) => ({
        id: e.id,
        type: 'polyline',
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        text: e.type,
        properties: {
          ...e,
          edgeType: e.type,
        },
      })),
    };

    lf.render(graphData);
    status.value = 'ready';
    ElMessage.success(`加载成功：${nodesData.length} 个节点，${edgesData.length} 条连线`);
  } catch (error: any) {
    console.error('加载画布数据失败:', error);
    status.value = 'error';

    // 如果后端不可用，渲染空画布
    lf.render({ nodes: [], edges: [] });
    ElMessage.warning('后端服务不可用，显示空画布');
  }
};

/**
 * 保存画布数据到后端
 * 修复：增加 isSaving 锁防止重复提交竞态
 */
const handleSave = async () => {
  if (!lf) return;

  // 防止重复提交：如果正在保存中，直接返回
  if (isSaving.value) {
    ElMessage.warning('正在保存中，请勿重复操作');
    return;
  }

  isSaving.value = true;
  saving.value = true;
  status.value = 'saving';

  try {
    const graphData = lf.getGraphData();
    const { nodes = [], edges = [] } = graphData;

    // 逐个保存节点
    const savePromises: Promise<any>[] = [];

    for (const node of nodes) {
      // 反向映射节点类型
      const reverseTypeMap: Record<string, string> = {
        'resource-node': 'RESOURCE',
        'role-node': 'ROLE',
        'filter-node': 'FILTER',
        'addon-node': 'ADDON',
      };
      const apiNodeType = reverseTypeMap[node.type] || 'RESOURCE';

      const nodeData: Partial<VisNode> = {
        id: node.id,
        type: apiNodeType as any,
        name: (typeof node.text === 'string' ? node.text : node.text?.value) || '未命名节点',
        positionX: node.x,
        positionY: node.y,
        code: node.properties?.code,
        config: node.properties,
      };

      savePromises.push(
        updateNode(node.id, nodeData).catch(async () => {
          // 如果更新失败，尝试创建
          return createNode(nodeData);
        })
      );
    }

    // 逐个保存连线
    for (const edge of edges) {
      const edgeData: Partial<VisEdge> = {
        id: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        type: (edge.properties?.edgeType || edge.text || 'INHERITANCE') as any,
        config: edge.properties,
      };

      savePromises.push(
        updateEdge(edge.id, edgeData).catch(async () => {
          // 如果更新失败，尝试创建
          return createEdge(edgeData);
        })
      );
    }

    await Promise.all(savePromises);

    status.value = 'ready';
    ElMessage.success('画布数据已保存');
  } catch (error) {
    console.error('保存画布数据失败:', error);
    status.value = 'error';
    ElMessage.error('保存失败');
  } finally {
    // 释放保存锁
    isSaving.value = false;
    saving.value = false;
  }
};

/**
 * 清空画布
 */
const handleClear = async () => {
  if (!lf) return;

  try {
    await ElMessageBox.confirm(
      '确定要清空画布吗？此操作不可撤销（已保存的数据不受影响）。',
      '确认清空',
      {
        type: 'warning',
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
      }
    );

    lf.clearData();
    selectedElement.value = null;
    status.value = 'ready';

    ElMessage.success('画布已清空');
  } catch (error) {
    // 用户取消
  }
};

/**
 * 适应屏幕 - 将画布内容适配到可视区域
 */
const handleFitView = () => {
  if (!lf) return;

  try {
    lf.fitView(20); // 20px 边距
    ElMessage.success('已适应屏幕');
  } catch (error) {
    console.error('适应屏幕失败:', error);
  }
};

/**
 * 撤销
 */
const handleUndo = () => {
  if (!lf) return;
  lf.undo();
};

/**
 * 重做
 */
const handleRedo = () => {
  if (!lf) return;
  lf.redo();
};

/**
 * 导出画布数据为 JSON
 */
const handleExport = () => {
  if (!lf) return;

  const graphData = lf.getGraphData();
  const json = JSON.stringify(graphData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `visperm-graph-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  URL.revokeObjectURL(url);
  ElMessage.success('画布数据已导出');
};

/**
 * 导入画布数据
 */
const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const graphData = JSON.parse(text);

      if (!graphData.nodes || !graphData.edges) {
        throw new Error('无效的画布数据格式');
      }

      lf?.render(graphData);
      status.value = 'dirty';
      ElMessage.success('画布数据已导入');
    } catch (error: any) {
      console.error('导入失败:', error);
      ElMessage.error('导入失败：' + error.message);
    }
  };

  input.click();
};

// ==================== 生命周期 ====================

/**
 * 监听窗口大小变化，自适应画布
 */
const handleResize = () => {
  if (!lf || !canvasContainer.value) return;
  lf.resize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
};

onMounted(() => {
  initCanvas();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  // 销毁 LogicFlow 实例
  lf = null;
});
</script>

<style scoped>
/* ==================== 整体布局 ==================== */
.visperm-canvas {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}

/* ==================== 顶部工具栏 ==================== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.toolbar-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  letter-spacing: 1px;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ==================== 主体区域 ==================== */
.canvas-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ==================== 左侧节点面板 ==================== */
.node-palette {
  width: 220px;
  background: #ffffff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.palette-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

.palette-section {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin: 6px 0;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s ease;
}

.node-item:hover {
  background: #f0f5ff;
  border-color: #409eff;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.node-item:active {
  cursor: grabbing;
}

.node-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.node-label {
  font-size: 13px;
  color: #333;
}

/* 图例 */
.legend-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
  color: #666;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

/* ==================== 中间画布区域 ==================== */
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fafafa;
}

/* LogicFlow 覆盖样式 */
:deep(.lf-graph) {
  background: transparent;
}

:deep(.lf-control) {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* ==================== 右侧属性面板 ==================== */
.property-panel {
  width: 300px;
  background: #ffffff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

.panel-actions {
  display: flex;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 12px;
}

/* ==================== 滚动条 ==================== */
.node-palette::-webkit-scrollbar,
.property-panel::-webkit-scrollbar {
  width: 6px;
}

.node-palette::-webkit-scrollbar-thumb,
.property-panel::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.node-palette::-webkit-scrollbar-thumb:hover,
.property-panel::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

/* ==================== 响应式 ==================== */
@media (max-width: 1200px) {
  .node-palette {
    width: 180px;
  }
  .property-panel {
    width: 260px;
  }
}
</style>
