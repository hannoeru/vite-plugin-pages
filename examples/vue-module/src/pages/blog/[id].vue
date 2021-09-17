<script setup lang="ts">
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
