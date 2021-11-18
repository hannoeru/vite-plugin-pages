<script setup lang="ts">
defineProps({
  id: String,
})
</script>

<template>
  <div>
    about/[id].vue: {{ id }}
  </div>
</template>

<route>
{
  name: 'about-user-id',
  meta: {
    requiresAuth: true,
  },
}
</route>
