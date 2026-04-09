<template>
  <div class="user-role-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>用户角色管理</h2>
        </div>
      </template>

      <!-- 用户查询区域 -->
      <el-form :inline="true" class="query-form">
        <el-form-item label="用户 ID">
          <el-input
            v-model="userIdInput"
            placeholder="请输入用户 ID"
            style="width: 240px"
            @keyup.enter="queryUserRoles"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="queryUserRoles" :loading="loading">查询</el-button>
        </el-form-item>
      </el-form>

      <template v-if="queried">
        <el-divider />

        <!-- 当前角色列表 -->
        <div class="section-title">当前角色</div>
        <el-table :data="userRoles" style="width: 100%" v-loading="loading" empty-text="该用户暂无角色">
          <el-table-column prop="roleId" label="角色 ID" min-width="120" />
          <el-table-column prop="roleName" label="角色名称" min-width="120" />
          <el-table-column prop="assignedAt" label="分配时间" width="180">
            <template #default="{ row }">
              {{ row.assignedAt ? formatDate(row.assignedAt) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="handleRemoveRole(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-divider />

        <!-- 分配角色区域 -->
        <div class="section-title">分配角色</div>
        <div class="assign-section">
          <el-select
            v-model="selectedRoleIds"
            multiple
            filterable
            placeholder="选择要分配的角色"
            style="width: 300px; margin-right: 12px"
          >
            <el-option
              v-for="role in availableRoles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
          <el-button type="primary" @click="handleAssignRoles" :loading="assigning" :disabled="selectedRoleIds.length === 0">
            批量分配
          </el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getUserRoles, assignRole, removeUserRole, type UserRole } from '@/api/user-role';

const userIdInput = ref('');
const userRoles = ref<UserRole[]>([]);
const loading = ref(false);
const assigning = ref(false);
const queried = ref(false);
const selectedRoleIds = ref<string[]>([]);

/** 可选角色列表（模拟数据，实际应从后端获取） */
const availableRoles = ref([
  { value: 'admin', label: '管理员' },
  { value: 'editor', label: '编辑者' },
  { value: 'viewer', label: '查看者' },
  { value: 'auditor', label: '审计员' },
  { value: 'operator', label: '运维人员' },
]);

/** 格式化日期 */
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

/**
 * 查询用户角色
 */
const queryUserRoles = async () => {
  if (!userIdInput.value.trim()) {
    ElMessage.warning('请输入用户 ID');
    return;
  }

  loading.value = true;
  queried.value = true;
  try {
    userRoles.value = await getUserRoles(userIdInput.value.trim());
    ElMessage.success('查询成功');
  } catch (error) {
    console.error('查询用户角色失败:', error);
    userRoles.value = [];
  } finally {
    loading.value = false;
  }
};

/**
 * 移除角色
 */
const handleRemoveRole = async (row: UserRole) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除用户「${userIdInput.value}」的角色「${row.roleId}」吗？`,
      '确认移除',
      { type: 'warning' }
    );
    await removeUserRole(row.id);
    ElMessage.success('角色已移除');
    // 重新查询
    await queryUserRoles();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('移除角色失败:', error);
    }
  }
};

/**
 * 批量分配角色
 */
const handleAssignRoles = async () => {
  if (selectedRoleIds.value.length === 0) {
    ElMessage.warning('请至少选择一个角色');
    return;
  }

  assigning.value = true;
  try {
    await assignRole({
      userId: userIdInput.value.trim(),
      roleIds: [...selectedRoleIds.value],
    });
    ElMessage.success(`已成功分配 ${selectedRoleIds.value.length} 个角色`);
    selectedRoleIds.value = [];
    // 重新查询
    await queryUserRoles();
  } catch (error) {
    console.error('分配角色失败:', error);
  } finally {
    assigning.value = false;
  }
};
</script>

<style scoped>
.user-role-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.query-form {
  margin-bottom: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.assign-section {
  display: flex;
  align-items: center;
}
</style>
