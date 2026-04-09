<template>
  <div class="role-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>角色管理</h2>
          <el-button type="primary" @click="showCreateDialog">新建角色</el-button>
        </div>
      </template>

      <el-table :data="roles" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="角色名称" />
        <el-table-column prop="code" label="角色编码" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDeleteRole(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑角色对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="角色名称">
          <el-input v-model="form.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码">
          <el-input v-model="form.code" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
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
import { getRoles, createRole, updateRole, deleteRole } from '@/api/iam';

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
}

const roles = ref<Role[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('新建角色');
const editingId = ref<string | null>(null);
const form = ref({
  name: '',
  code: '',
  description: '',
});

/**
 * 调用真实 API 加载角色列表
 */
const loadRoles = async () => {
  loading.value = true;
  try {
    roles.value = await getRoles();
  } catch (error) {
    console.error('加载角色列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const showCreateDialog = () => {
  dialogTitle.value = '新建角色';
  editingId.value = null;
  form.value = { name: '', code: '', description: '' };
  dialogVisible.value = true;
};

const editRole = (row: Role) => {
  dialogTitle.value = '编辑角色';
  editingId.value = row.id;
  form.value = { name: row.name, code: row.code, description: row.description || '' };
  dialogVisible.value = true;
};

/**
 * 删除角色 - 调用真实 API
 */
const handleDeleteRole = async (row: Role) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色「${row.name}」吗？`, '确认删除', {
      type: 'warning',
    });
    await deleteRole(row.id);
    ElMessage.success('角色已删除');
    await loadRoles();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除角色失败:', error);
    }
  }
};

/**
 * 提交表单 - 调用真实 API 创建或更新角色
 */
const submitForm = async () => {
  if (!form.value.name || !form.value.code) {
    ElMessage.warning('请填写角色名称和编码');
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateRole(editingId.value, { ...form.value });
      ElMessage.success('角色已更新');
    } else {
      await createRole({ ...form.value });
      ElMessage.success('角色已创建');
    }
    dialogVisible.value = false;
    await loadRoles();
  } catch (error) {
    console.error('提交角色表单失败:', error);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadRoles();
});
</script>

<style scoped>
.role-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
