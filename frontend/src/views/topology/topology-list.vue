<template>
  <div class="topology-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>拓扑管理</h2>
          <div class="header-actions">
            <el-select v-model="filterEnv" placeholder="按环境过滤" clearable style="width: 140px; margin-right: 12px" @change="loadTopologies">
              <el-option label="生产环境" value="prod" />
              <el-option label="预发环境" value="pre" />
              <el-option label="测试环境" value="test" />
            </el-select>
            <el-button type="primary" @click="showCreateDialog">创建拓扑</el-button>
          </div>
        </div>
      </template>

      <el-table :data="topologies" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="env" label="环境" width="100">
          <template #default="{ row }">
            <el-tag :type="envTagType(row.env)" size="small">
              {{ envLabel(row.env) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" size="small">
              {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本号" width="90" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">查看</el-button>
            <el-button size="small" @click="editTopology(row)">编辑</el-button>
            <el-button
              size="small"
              type="success"
              @click="handlePublish(row)"
              :disabled="row.status === 'PUBLISHED'"
            >
              发布
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑拓扑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="550px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="拓扑名称">
          <el-input v-model="form.name" placeholder="请输入拓扑名称" />
        </el-form-item>
        <el-form-item label="环境">
          <el-select v-model="form.env" placeholder="请选择环境" style="width: 100%">
            <el-option label="生产环境" value="prod" />
            <el-option label="预发环境" value="pre" />
            <el-option label="测试环境" value="test" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="拓扑详情" width="650px">
      <el-descriptions :column="2" border v-if="currentTopology">
        <el-descriptions-item label="名称">{{ currentTopology.name }}</el-descriptions-item>
        <el-descriptions-item label="环境">
          <el-tag :type="envTagType(currentTopology.env)" size="small">
            {{ envLabel(currentTopology.env) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentTopology.status === 'PUBLISHED' ? 'success' : 'info'" size="small">
            {{ currentTopology.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="版本号">{{ currentTopology.version }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDate(currentTopology.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ currentTopology.description || '无' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import apiClient from '@/api/request';

/** 拓扑记录类型 */
interface Topology {
  id: string;
  name: string;
  description?: string;
  env: string;
  status: string;
  version: number;
  createdAt: string;
}

const topologies = ref<Topology[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const dialogTitle = ref('创建拓扑');
const editingId = ref<string | null>(null);
const filterEnv = ref('');
const currentTopology = ref<Topology | null>(null);

const form = ref({
  name: '',
  env: 'prod',
  description: '',
});

/** 环境标签类型映射 */
const envTagType = (env: string) => {
  const map: Record<string, string> = {
    prod: 'danger',
    pre: 'warning',
    test: 'success',
  };
  return map[env] || 'info';
};

/** 环境标签文字映射 */
const envLabel = (env: string) => {
  const map: Record<string, string> = {
    prod: '生产',
    pre: '预发',
    test: '测试',
  };
  return map[env] || env;
};

/** 格式化日期 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

/**
 * 加载拓扑列表
 */
const loadTopologies = async () => {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filterEnv.value) {
      params.env = filterEnv.value;
    }
    topologies.value = await apiClient.get<Topology[]>('/topologies', { params });
  } catch (error) {
    console.error('加载拓扑列表失败:', error);
  } finally {
    loading.value = false;
  }
};

/** 显示创建对话框 */
const showCreateDialog = () => {
  dialogTitle.value = '创建拓扑';
  editingId.value = null;
  form.value = { name: '', env: 'prod', description: '' };
  dialogVisible.value = true;
};

/** 编辑拓扑 */
const editTopology = (row: Topology) => {
  dialogTitle.value = '编辑拓扑';
  editingId.value = row.id;
  form.value = {
    name: row.name,
    env: row.env,
    description: row.description || '',
  };
  dialogVisible.value = true;
};

/** 查看详情 */
const viewDetail = (row: Topology) => {
  currentTopology.value = row;
  detailVisible.value = true;
};

/** 发布拓扑 */
const handlePublish = async (row: Topology) => {
  try {
    await ElMessageBox.confirm(
      `确定要发布拓扑「${row.name}」吗？发布后版本号将递增。`,
      '确认发布',
      { type: 'warning' }
    );
    await apiClient.post(`/topologies/${row.id}/publish`);
    ElMessage.success('拓扑已发布');
    await loadTopologies();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('发布拓扑失败:', error);
    }
  }
};

/** 删除拓扑 */
const handleDelete = async (row: Topology) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除拓扑「${row.name}」吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    );
    await apiClient.delete(`/topologies/${row.id}`);
    ElMessage.success('拓扑已删除');
    await loadTopologies();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除拓扑失败:', error);
    }
  }
};

/** 提交表单 */
const submitForm = async () => {
  if (!form.value.name) {
    ElMessage.warning('请填写拓扑名称');
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      await apiClient.put(`/topologies/${editingId.value}`, { ...form.value });
      ElMessage.success('拓扑已更新');
    } else {
      await apiClient.post('/topologies', { ...form.value });
      ElMessage.success('拓扑已创建');
    }
    dialogVisible.value = false;
    await loadTopologies();
  } catch (error) {
    console.error('提交拓扑表单失败:', error);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadTopologies();
});
</script>

<style scoped>
.topology-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>
