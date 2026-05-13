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
    <!-- Project view: <view title> / <icon> <project name>
         The leading "Project /" is the parent path, hidden until hover. -->
    <template v-else-if="projectCrumb">
      <div class="breadcrumb-parents">
        <a href="#" @click.prevent="store.switchView(projectCrumb.viewKey)">{{ projectCrumb.viewTitle }}</a>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
      </div>
      <span class="breadcrumb-current" aria-current="page">
        <span v-if="projectCrumb.projectIcon" class="breadcrumb-icon" aria-hidden="true">{{ projectCrumb.projectIcon }}</span>
        {{ projectCrumb.projectName }}
      </span>
    </template>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'

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
    projectIcon: project.icon || '',
  }
})
</script>
