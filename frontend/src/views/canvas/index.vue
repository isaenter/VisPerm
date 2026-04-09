<template>
  <div class="canvas-container">
    <!-- 左侧节点工具箱 -->
    <div class="node-palette">
      <h3>节点工具箱</h3>
      <div
        class="node-item"
        v-for="node in nodeTypes"
        :key="node.type"
        draggable="true"
        @dragstart="onDragStart($event, node)"
      >
        <span class="node-icon">{{ node.icon }}</span>
        <span class="node-label">{{ node.label }}</span>
      </div>
    </div>

    <!-- 中间画布区域 -->
    <div class="canvas-wrapper" ref="canvasContainer">
      <div class="canvas-header">
        <h2>拓扑编排画布</h2>
        <div class="canvas-actions">
          <el-button @click="saveGraph" type="primary">保存</el-button>
          <el-button @click="loadGraph">刷新</el-button>
          <el-button @click="validateGraph">验证</el-button>
        </div>
      </div>
      <div class="canvas-content" ref="canvasContent"></div>
    </div>

    <!-- 右侧属性面板 -->
    <div class="property-panel" v-if="selectedNode">
      <h3>属性配置</h3>
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="selectedNode.name" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="selectedNode.code" />
        </el-form-item>
        <el-form-item label="类型">
          <el-tag>{{ selectedNode.type }}</el-tag>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="updateSelectedNode">更新</el-button>
          <el-button type="danger" @click="deleteSelectedNode">删除</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import LogicFlow from '@logicflow/core';
import { getNodes, getEdges, createNode } from '@/api/vis';

interface NodeType {
  type: string;
  label: string;
  icon: string;
}

interface CanvasNode {
  id: string;
  type: string;
  x: number;
  y: number;
  text: string;
  properties: any;
}

const canvasContainer = ref<HTMLDivElement | null>(null);
const canvasContent = ref<HTMLDivElement | null>(null);
const selectedNode = ref<any>(null);
let lf: LogicFlow | null = null;

const nodeTypes: NodeType[] = [
  { type: 'RESOURCE', label: '资源节点', icon: '📦' },
  { type: 'ROLE', label: '角色节点', icon: '👤' },
  { type: 'FILTER', label: '过滤器', icon: '🌪️' },
  { type: 'ADDON', label: '增量包', icon: '➕' },
];

const onDragStart = (event: DragEvent, node: NodeType) => {
  event.dataTransfer?.setData('nodeType', node.type);
  event.dataTransfer?.setData('nodeLabel', node.label);
};

const initCanvas = () => {
  if (!canvasContent.value) return;

  lf = new LogicFlow({
    container: canvasContent.value,
    width: 800,
    height: 600,
    stopScrollGraph: true,
    stopZoomGraph: true,
    stopMoveGraph: true,
  });

  // 监听节点点击
  lf.on('element:click', ({ data }) => {
    selectedNode.value = data;
  });

  lf.render();
  loadGraph();
};

const loadGraph = async () => {
  try {
    const [nodesData, edgesData] = await Promise.all([getNodes(), getEdges()]);

    lf?.render({
      nodes: nodesData.map((n) => ({
        id: n.id,
        type: 'rect',
        x: n.positionX || 100,
        y: n.positionY || 100,
        text: n.name,
        properties: { ...n },
      })),
      edges: edgesData.map((e) => ({
        id: e.id,
        type: 'line',
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        properties: e,
      })),
    });
    ElMessage.success('画布加载成功');
  } catch (error) {
    ElMessage.error('加载画布失败');
  }
};

const saveGraph = async () => {
  const graphData = lf?.getGraphData();
  console.log('保存画布数据:', graphData);
  ElMessage.success('画布已保存');
};

const validateGraph = () => {
  const graphData = lf?.getGraphData();
  console.log('验证画布:', graphData);
  ElMessage.info('验证功能开发中...');
};

const updateSelectedNode = () => {
  console.log('更新节点:', selectedNode.value);
};

const deleteSelectedNode = () => {
  console.log('删除节点:', selectedNode.value);
};

onMounted(() => {
  initCanvas();
});
</script>

<style scoped>
.canvas-container {
  display: flex;
  height: 100vh;
}

.node-palette {
  width: 200px;
  padding: 16px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 8px 0;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.3s;
}

.node-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

.node-icon {
  font-size: 20px;
  margin-right: 8px;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.canvas-content {
  flex: 1;
  background: #fafafa;
  background-image: radial-gradient(#dcdfe6 1px, transparent 1px);
  background-size: 20px 20px;
}

.property-panel {
  width: 280px;
  padding: 16px;
  background: #f5f7fa;
  border-left: 1px solid #e4e7ed;
}
</style>
