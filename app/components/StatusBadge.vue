<script setup lang="ts">
import type { RegistrationStatus } from '../../shared/types/domain'
import { getRegistrationStatusLabel, getRegistrationStatusTone } from '../utils/course-presentation'

const props = defineProps<{
  status: RegistrationStatus
}>()
</script>

<template>
  <span class="status-badge" :class="`status-badge--${getRegistrationStatusTone(props.status)}`">
    {{ getRegistrationStatusLabel(props.status) }}
  </span>
</template>
