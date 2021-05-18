<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({
  id: String,
})

</script>

<template>
  blog/[id].vue: {{ id }}
</template>

<route>
{
  meta: {
    requiresAuth: false,
  },
  name: 'name-overrid',
}
</route>
