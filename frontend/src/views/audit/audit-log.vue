<template>
  <div class="audit-log">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>审计日志</h2>
        </div>
      </template>

      <!-- 过滤区域 -->
      <el-form :inline="true" class="filter-form">
        <el-form-item label="操作类型">
          <el-select v-model="filterAction" placeholder="全部" clearable style="width: 150px">
            <el-option label="创建" value="CREATE" />
            <el-option label="更新" value="UPDATE" />
            <el-option label="删除" value="DELETE" />
            <el-option label="回滚" value="ROLLBACK" />
            <el-option label="发布" value="PUBLISH" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源">
          <el-input v-model="filterResource" placeholder="输入资源类型" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="用户 ID">
          <el-input v-model="filterUserId" placeholder="输入用户 ID" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadLogs">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 日志表格 -->
      <el-table :data="logs" style="width: 100%" v-loading="loading" row-key="id">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <p><strong>详情 JSON：</strong></p>
              <pre class="json-detail">{{ formatJson(row.detail) }}</pre>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作类型" width="110">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)" size="small">
              {{ actionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resource" label="资源" width="120" />
        <el-table-column prop="resourceId" label="资源 ID" min-width="120" show-overflow-tooltip />
        <el-table-column prop="userId" label="用户 ID" width="140" />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAuditLogs, type AuditLog } from '@/api/audit';

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 过滤条件
const filterAction = ref('');
const filterResource = ref('');
const filterUserId = ref('');
const dateRange = ref<[Date, Date] | null>(null);

/** 操作类型标签映射 */
const actionTagType = (action: string) => {
  const map: Record<string, string> = {
    CREATE: 'success',
    UPDATE: 'warning',
    DELETE: 'danger',
    ROLLBACK: 'info',
    PUBLISH: '',
  };
  return map[action] || 'info';
};

/** 操作类型文字映射 */
const actionLabel = (action: string) => {
  const map: Record<string, string> = {
    CREATE: '创建',
    UPDATE: '更新',
    DELETE: '删除',
    ROLLBACK: '回滚',
    PUBLISH: '发布',
  };
  return map[action] || action;
};

/** 格式化日期 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

/** 格式化 JSON 显示 */
const formatJson = (obj: any) => {
  if (!obj) return '{}';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

/**
 * 加载审计日志
 */
const loadLogs = async () => {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };

    if (filterAction.value) params.action = filterAction.value;
    if (filterResource.value) params.resource = filterResource.value;
    if (filterUserId.value) params.userId = filterUserId.value;
    if (dateRange.value) {
      params.startTime = dateRange.value[0].toISOString();
      params.endTime = dateRange.value[1].toISOString();
    }

    const result = await getAuditLogs(params);
    logs.value = result.data;
    total.value = result.total;
  } catch (error) {
    console.error('加载审计日志失败:', error);
    logs.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

/** 重置过滤条件 */
const resetFilters = () => {
  filterAction.value = '';
  filterResource.value = '';
  filterUserId.value = '';
  dateRange.value = null;
  currentPage.value = 1;
  loadLogs();
};

onMounted(() => {
  loadLogs();
});
</script>

<style scoped>
.audit-log {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-form {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.expand-content {
  padding: 12px 20px;
  background: #fafafa;
  border-radius: 4px;
}

.expand-content p {
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.json-detail {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
