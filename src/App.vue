<script setup lang="ts">
/**
 * ContentFlow Lite — 根组件
 *
 * 包裹 Naive UI 全局 Provider：主题、消息、对话框、通知。
 */
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui';
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <router-view />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
