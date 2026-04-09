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
        <el-form-item label="角色 IDs">
          <el-input v-model="roleIdsInput" placeholder="多个角色用逗号分隔，如: admin,employee" />
        </el-form-item>
        <el-form-item label="环境">
          <el-select v-model="env" placeholder="请选择环境">
            <el-option label="生产环境" value="prod" />
            <el-option label="开发环境" value="dev" />
            <el-option label="测试环境" value="test" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="runSimulation" :loading="running">开始模拟</el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <h3>模拟结果</h3>
      <div v-if="simulationResult" class="result-content" v-loading="running">
        <!-- 结果汇总 -->
        <el-descriptions :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="总授权资源数">{{ simulationResult.totalGranted }}</el-descriptions-item>
          <el-descriptions-item label="总排除资源数">{{ simulationResult.totalDenied }}</el-descriptions-item>
          <el-descriptions-item label="计算时间">{{ simulationResult.computedAt }}</el-descriptions-item>
          <el-descriptions-item label="租户 ID">{{ simulationResult.tenantId }}</el-descriptions-item>
        </el-descriptions>

        <!-- 各源权限详情 -->
        <div v-for="(result, index) in simulationResult.results" :key="index" class="result-item">
          <el-alert
            :title="`${result.sourceType === 'role' ? '角色' : '用户'}: ${result.sourceId}`"
            type="success"
            :closable="false"
            show-icon
          />
          <div class="path-visualization">
            <p><strong>授权资源：</strong>{{ result.grantedResources?.join(', ') || '无' }}</p>
            <p><strong>排除资源：</strong>{{ result.deniedResources?.join(', ') || '无' }}</p>
            <p><strong>数据过滤条件：</strong>{{ result.filters?.join(', ') || '无' }}</p>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="simulationResult.errors && simulationResult.errors.length > 0" class="error-section">
          <el-alert title="计算错误" type="error" :closable="false" show-icon />
          <ul>
            <li v-for="(err, i) in simulationResult.errors" :key="i">
              {{ err.sourceType }}「{{ err.sourceId }}」：{{ err.error }}
            </li>
          </ul>
        </div>
      </div>

      <el-empty v-else description="请输入参数后点击「开始模拟」" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { runSimulation } from '@/api/iam';

const userId = ref('');
const roleIdsInput = ref('');
const env = ref('prod');
const running = ref(false);
const simulationResult = ref<any>(null);

/**
 * 调用真实 API 运行权限模拟
 */
const runSimulationHandler = async () => {
  const roleIds = roleIdsInput.value
    ? roleIdsInput.value.split(',').map((id) => id.trim()).filter(Boolean)
    : [];
  const userIds = userId.value ? [userId.value.trim()] : [];

  if (roleIds.length === 0 && userIds.length === 0) {
    ElMessage.warning('请至少输入一个用户 ID 或角色 ID');
    return;
  }

  running.value = true;
  simulationResult.value = null;

  try {
    simulationResult.value = await runSimulation({
      roleIds,
      userIds,
      dryRun: true,
      env: env.value,
    });
    ElMessage.success('模拟计算完成');
  } catch (error) {
    console.error('模拟运行失败:', error);
  } finally {
    running.value = false;
  }
};

const runSimulation = runSimulationHandler;
</script>

<style scoped>
.simulation {
  padding: 20px;
}

.result-content {
  margin-top: 16px;
}

.result-item {
  margin-bottom: 16px;
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

.error-section {
  margin-top: 16px;
}

.error-section ul {
  padding-left: 20px;
  margin-top: 8px;
}

.error-section li {
  margin: 4px 0;
  color: #f56c6c;
}
</style>
