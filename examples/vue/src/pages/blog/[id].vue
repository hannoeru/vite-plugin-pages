<script setup lang="ts">
defineProps({
  id: String,
})
</script>

<template>
  <div>
    blog/[id].vue: {{ id }}
  </div>
</template>

<route>
{
  name: 'blog-id',
  meta: {
    requiresAuth: false,
  },
}
</route>
