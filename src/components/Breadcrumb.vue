<template>
  <nav class="breadcrumb" id="breadcrumb" aria-label="Breadcrumb">
    <!-- Task with parent: Task / <parent title> / <task title>
         The "Task / parent /" prefix is the parent-path — hidden until hover,
         only the current task title stays visible at rest. -->
    <template v-if="taskCrumb">
      <div class="breadcrumb-parents">
        <span>Task</span>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
        <a href="#" @click.prevent="store.openTask(taskCrumb.parentId)">{{ taskCrumb.parentTitle }}</a>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
      </div>
      <span class="breadcrumb-current" aria-current="page">{{ taskCrumb.title }}</span>
    </template>
    <!-- Project view: Projects / <icon> <project name>
         The leading "Projects /" is the parent path, hidden until hover. -->
    <template v-else-if="projectCrumb">
      <div class="breadcrumb-parents">
        <a href="#" @click.prevent="store.switchView('home')">Projects</a>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
      </div>
      <span class="breadcrumb-current" aria-current="page">
        <span class="breadcrumb-icon" aria-hidden="true">{{ projectCrumb.projectIcon }}</span>
        {{ projectCrumb.projectName }}
      </span>
    </template>
    <!-- All other top-level views: just the view name as the current crumb so
         the user always has location context (Notion's pattern). -->
    <template v-else-if="viewCrumb">
      <span class="breadcrumb-current" aria-current="page">{{ viewCrumb }}</span>
    </template>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { defaultProjectEmoji } from '../utils.js'

const store = useAppStore()

const VIEW_TITLES = {
  home: 'Home', 'my-tasks': 'My Tasks', board: 'Board', timeline: 'Timeline',
  analytics: 'Analytics', workload: 'Workload', project: 'Project',
}

// Task breadcrumb — only shown when a task with a parent is open. Wins over
// the project breadcrumb because the task panel is the deeper context.
const taskCrumb = computed(() => {
  if (!store.currentTaskId) return null
  const task = store.tasks.find(t => t.id === store.currentTaskId)
  if (!task || !task.parentId) return null
  const parent = store.tasks.find(t => t.id === task.parentId)
  if (!parent) return null
  return { parentId: parent.id, parentTitle: parent.title, title: task.title }
})

// Project breadcrumb. Picks up the project's icon (when set) so the page
// header reads like a Notion page: emoji + name.
const projectCrumb = computed(() => {
  if (store.currentView !== 'project') return null
  const project = store.projects.find(p => p.id === store.selectedProjectId)
  if (!project) return null
  return {
    viewKey: store.currentView,
    viewTitle: VIEW_TITLES[store.currentView] ?? '',
    projectName: project.name,
    projectIcon: defaultProjectEmoji(project),
  }
})

// Fallback for top-level views (Home / My Tasks / Board / Timeline / Analytics
// / Workload / Settings). Notion always shows the current page name in the
// topbar so the user has a persistent location anchor — this matches that.
const viewCrumb = computed(() => {
  if (taskCrumb.value || projectCrumb.value) return null
  return VIEW_TITLES[store.currentView] || ''
})
</script>
