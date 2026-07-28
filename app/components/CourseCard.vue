<script setup lang="ts">
import { CalendarDays, Clock3 } from '@lucide/vue'

import type { Course, Registration } from '../../shared/types/domain'
import { formatCourseSchedule } from '../utils/course-presentation'

const props = withDefaults(defineProps<{
  course: Course
  registration?: Registration
  isRegistering?: boolean
  showRegistrationAction?: boolean
}>(), {
  registration: undefined,
  isRegistering: false,
  showRegistrationAction: false,
})

defineEmits<{
  register: [course: Course]
}>()
</script>

<template>
  <article class="course-card">
    <div class="course-card__main">
      <div class="course-card__icon" aria-hidden="true"><CalendarDays :size="20" /></div>
      <div class="course-card__content">
        <p class="eyebrow">滑雪課程</p>
        <h3>{{ formatCourseSchedule(props.course) }}</h3>
        <p class="course-card__detail"><Clock3 :size="16" aria-hidden="true" /> 課程時段 {{ props.course.startTime }}-{{ props.course.endTime }}</p>
      </div>
    </div>
    <div class="course-card__actions">
      <StatusBadge v-if="props.registration" :status="props.registration.status" />
      <span v-else class="course-availability" :class="{ 'course-availability--closed': !props.course.isOpen }">
        {{ props.course.isOpen ? '開放報名' : '暫停報名' }}
      </span>
      <button
        v-if="props.showRegistrationAction"
        class="button button--primary"
        type="button"
        :disabled="!props.course.isOpen || !!props.registration || props.isRegistering"
        @click="$emit('register', props.course)"
      >
        {{ props.isRegistering ? '處理中...' : props.registration ? '已報名' : '我要參加' }}
      </button>
    </div>
  </article>
</template>
