<template>
  <div class="resource-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>资源管理</h2>
          <el-button type="primary" @click="syncResources">同步资源</el-button>
        </div>
      </template>

      <el-table :data="resources" style="width: 100%">
        <el-table-column prop="resourceCode" label="资源编码" />
        <el-table-column prop="name" label="资源名称" />
        <el-table-column label="字段列表">
          <template #default="{ row }">
            <el-tag v-for="field in row.fields" :key="field.name" size="small" style="margin: 2px">
              {{ field.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="editResource(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteResource(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

interface Resource {
  resourceCode: string;
  name: string;
  fields: Array<{ name: string; type: string }>;
}

const resources = ref<Resource[]>([]);

const loadResources = async () => {
  // TODO: 调用 API 加载资源列表
  resources.value = [
    { resourceCode: 'PURCHASE_ORDER', name: '采购订单', fields: [{ name: 'dept', type: 'string' }, { name: 'amount', type: 'number' }] },
    { resourceCode: 'SALES_ORDER', name: '销售订单', fields: [{ name: 'region', type: 'string' }, { name: 'total', type: 'number' }] },
  ];
};

const syncResources = () => {
  ElMessage.info('资源扫描同步功能开发中...');
};

const editResource = (row: Resource) => {
  console.log('编辑资源:', row);
};

const deleteResource = (row: Resource) => {
  console.log('删除资源:', row);
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
