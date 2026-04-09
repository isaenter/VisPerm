<template>
  <div class="resource-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>资源管理</h2>
          <el-button type="primary" @click="showCreateDialog">新建资源</el-button>
        </div>
      </template>

      <el-table :data="resources" style="width: 100%" v-loading="loading">
        <el-table-column prop="resourceCode" label="资源编码" />
        <el-table-column prop="name" label="资源名称" />
        <el-table-column label="字段列表">
          <template #default="{ row }">
            <el-tag v-for="field in (row.fields || [])" :key="field.name" size="small" style="margin: 2px">
              {{ field.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="editResource(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDeleteResource(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑资源对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="资源编码">
          <el-input v-model="form.resourceCode" placeholder="请输入资源编码" :disabled="!!editingCode" />
        </el-form-item>
        <el-form-item label="资源名称">
          <el-input v-model="form.name" placeholder="请输入资源名称" />
        </el-form-item>
        <el-form-item label="字段定义">
          <div v-for="(field, index) in form.fields" :key="index" style="display: flex; gap: 8px; margin-bottom: 8px;">
            <el-input v-model="field.name" placeholder="字段名" style="flex: 1" />
            <el-select v-model="field.type" placeholder="类型" style="width: 120px">
              <el-option label="string" value="string" />
              <el-option label="number" value="number" />
              <el-option label="boolean" value="boolean" />
              <el-option label="date" value="date" />
            </el-select>
            <el-input v-model="field.label" placeholder="显示名" style="flex: 1" />
            <el-button type="danger" @click="removeField(index)" size="small">删除</el-button>
          </div>
          <el-button @click="addField" size="small">+ 添加字段</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getResourceMetas, createResourceMeta, updateResourceMeta, deleteResourceMeta } from '@/api/iam';

interface ResourceField {
  name: string;
  type: string;
  label?: string;
}

interface Resource {
  resourceCode: string;
  name: string;
  fields: ResourceField[];
}

const resources = ref<Resource[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('新建资源');
const editingCode = ref<string | null>(null);
const form = ref<{ resourceCode: string; name: string; fields: ResourceField[] }>({
  resourceCode: '',
  name: '',
  fields: [],
});

/**
 * 调用真实 API 加载资源列表
 */
const loadResources = async () => {
  loading.value = true;
  try {
    resources.value = await getResourceMetas();
  } catch (error) {
    console.error('加载资源列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const showCreateDialog = () => {
  dialogTitle.value = '新建资源';
  editingCode.value = null;
  form.value = { resourceCode: '', name: '', fields: [] };
  dialogVisible.value = true;
};

const editResource = (row: Resource) => {
  dialogTitle.value = '编辑资源';
  editingCode.value = row.resourceCode;
  form.value = {
    resourceCode: row.resourceCode,
    name: row.name,
    fields: row.fields ? [...row.fields] : [],
  };
  dialogVisible.value = true;
};

const addField = () => {
  form.value.fields.push({ name: '', type: 'string', label: '' });
};

const removeField = (index: number) => {
  form.value.fields.splice(index, 1);
};

/**
 * 删除资源 - 调用真实 API
 */
const handleDeleteResource = async (row: Resource) => {
  try {
    await ElMessageBox.confirm(`确定要删除资源「${row.name}」吗？`, '确认删除', {
      type: 'warning',
    });
    await deleteResourceMeta(row.resourceCode);
    ElMessage.success('资源已删除');
    await loadResources();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除资源失败:', error);
    }
  }
};

/**
 * 提交表单 - 调用真实 API 创建或更新资源
 */
const submitForm = async () => {
  if (!form.value.resourceCode || !form.value.name) {
    ElMessage.warning('请填写资源编码和名称');
    return;
  }

  submitting.value = true;
  try {
    if (editingCode.value) {
      await updateResourceMeta(editingCode.value, {
        name: form.value.name,
        fields: form.value.fields,
      });
      ElMessage.success('资源已更新');
    } else {
      await createResourceMeta({ ...form.value });
      ElMessage.success('资源已创建');
    }
    dialogVisible.value = false;
    await loadResources();
  } catch (error) {
    console.error('提交资源表单失败:', error);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadResources();
});
</script>

<style scoped>
.resource-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
