<template>
  <div class="role-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>角色管理</h2>
          <el-button type="primary" @click="showCreateDialog">新建角色</el-button>
        </div>
      </template>

      <el-table :data="roles" style="width: 100%">
        <el-table-column prop="name" label="角色名称" />
        <el-table-column prop="code" label="角色编码" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRole(row)">删除</el-button>
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
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
}

const roles = ref<Role[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('新建角色');
const form = ref({
  name: '',
  code: '',
  description: '',
});

const loadRoles = async () => {
  // TODO: 调用 API 加载角色列表
  roles.value = [
    { id: '1', name: '系统管理员', code: 'admin', description: '系统超级管理员' },
    { id: '2', name: '部门经理', code: 'dept_manager', description: '部门管理者' },
    { id: '3', name: '普通员工', code: 'employee', description: '普通员工' },
  ];
};

const showCreateDialog = () => {
  dialogTitle.value = '新建角色';
  form.value = { name: '', code: '', description: '' };
  dialogVisible.value = true;
};

const editRole = (row: Role) => {
  dialogTitle.value = '编辑角色';
  form.value = { ...row };
  dialogVisible.value = true;
};

const deleteRole = (row: Role) => {
  console.log('删除角色:', row);
  ElMessage.info('删除功能开发中...');
};

const submitForm = () => {
  console.log('提交表单:', form.value);
  dialogVisible.value = false;
  loadRoles();
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
