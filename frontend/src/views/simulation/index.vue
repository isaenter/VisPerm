<template>
  <div class="simulation">
    <el-card>
      <template #header>
        <h2>模拟运行沙箱</h2>
      </template>

      <el-form label-width="100px">
        <el-form-item label="测试用户 ID">
          <el-input v-model="userId" placeholder="请输入用户 ID" />
        </el-form-item>
        <el-form-item label="选择角色">
          <el-select v-model="selectedRole" placeholder="请选择角色">
            <el-option label="系统管理员" value="admin" />
            <el-option label="部门经理" value="dept_manager" />
            <el-option label="普通员工" value="employee" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="runSimulation">开始模拟</el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <h3>模拟结果</h3>
      <div v-if="simulationResult" class="result-content">
        <el-alert
          title="权限计算路径"
          type="success"
          :closable="false"
          show-icon
        />
        <div class="path-visualization">
          <p>角色：{{ simulationResult.role }}</p>
          <p>可访问资源：{{ simulationResult.resources?.join(', ') || '无' }}</p>
          <p>数据过滤条件：{{ simulationResult.filters || '无' }}</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const userId = ref('');
const selectedRole = ref('');
const simulationResult = ref<any>(null);

const runSimulation = () => {
  // TODO: 调用 API 运行权限模拟
  simulationResult.value = {
    role: selectedRole.value,
    resources: ['采购订单', '销售订单'],
    filters: '仅本部门数据',
  };
};
</script>

<style scoped>
.simulation {
  padding: 20px;
}

.result-content {
  margin-top: 16px;
}

.path-visualization {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 12px;
}

.path-visualization p {
  margin: 8px 0;
}
</style>
