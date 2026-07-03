<script setup lang="ts">
/**
 * 默认布局 — 顶部导航 + 内容区
 */
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-inner">
        <h1 class="app-logo">
          <router-link to="/">ContentFlow Lite</router-link>
        </h1>
        <nav class="app-nav">
          <router-link to="/">生成</router-link>
          <router-link to="/history">历史</router-link>
          <router-link to="/prompt">Prompt</router-link>
        </nav>
      </div>
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 32px;
}

.app-logo {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.app-logo a {
  color: #111827;
  text-decoration: none;
}

.app-nav {
  display: flex;
  gap: 20px;
}

.app-nav a {
  font-size: 14px;
  color: #6b7280;
  text-decoration: none;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.app-nav a:hover,
.app-nav a.router-link-active {
  color: #111827;
  border-bottom-color: #3b82f6;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
