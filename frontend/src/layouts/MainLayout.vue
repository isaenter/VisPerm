<template>
  <el-container class="main-layout">
    <!-- 左侧侧边栏 -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="main-aside">
      <div class="logo-area">
        <span v-show="!isCollapsed" class="logo-text">VisPerm</span>
        <span v-show="!isCollapsed" class="logo-subtitle">权限拓扑编排</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        router
        class="sidebar-menu"
        background-color="#1d1e2c"
        text-color="#a8a9b4"
        active-text-color="#409eff"
      >
        <el-menu-item index="/">
          <el-icon><EditPen /></el-icon>
          <template #title>画布编排</template>
        </el-menu-item>
        <el-menu-item index="/roles">
          <el-icon><UserFilled /></el-icon>
          <template #title>角色管理</template>
        </el-menu-item>
        <el-menu-item index="/resources">
          <el-icon><FolderOpened /></el-icon>
          <template #title>资源管理</template>
        </el-menu-item>
        <el-menu-item index="/topologies">
          <el-icon><Connection /></el-icon>
          <template #title>拓扑管理</template>
        </el-menu-item>
        <el-menu-item index="/user-roles">
          <el-icon><Avatar /></el-icon>
          <template #title>用户角色</template>
        </el-menu-item>
        <el-menu-item index="/simulation">
          <el-icon><Cpu /></el-icon>
          <template #title>模拟运行</template>
        </el-menu-item>
        <el-menu-item index="/audit-logs">
          <el-icon><Document /></el-icon>
          <template #title>审计日志</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部 Header -->
      <el-header class="main-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
        <div class="header-right">
          <!-- 租户切换器 -->
          <el-select v-model="currentTenant" size="small" style="width: 180px" @change="onTenantChange">
            <el-option label="默认租户" value="default-tenant" />
            <el-option label="租户 A" value="tenant-a" />
            <el-option label="租户 B" value="tenant-b" />
          </el-select>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  EditPen,
  UserFilled,
  FolderOpened,
  Connection,
  Avatar,
  Cpu,
  Document,
  Fold,
  Expand,
} from '@element-plus/icons-vue';

const route = useRoute();

/** 当前激活的菜单项 */
const activeMenu = computed(() => route.path);

/** 侧边栏折叠状态 */
const isCollapsed = ref(false);

/** 当前租户 ID */
const currentTenant = ref(localStorage.getItem('tenant_id') || 'default-tenant');

/**
 * 租户切换
 */
const onTenantChange = (val: string) => {
  currentTenant.value = val;
  localStorage.setItem('tenant_id', val);
  // 触发页面刷新以应用新租户
  window.location.reload();
};
</script>

<style scoped>
.main-layout {
  height: 100vh;
  width: 100%;
}

.main-aside {
  background-color: #1d1e2c;
  transition: width 0.3s ease;
  overflow: hidden;
}

.logo-area {
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #2a2b3d;
  padding: 8px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
  letter-spacing: 2px;
}

.logo-subtitle {
  font-size: 11px;
  color: #a8a9b4;
  margin-top: 2px;
}

.sidebar-menu {
  border-right: none;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 16px;
  height: 56px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-content {
  background: #f0f2f5;
  padding: 0;
  overflow: auto;
}
</style>
