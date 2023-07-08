<template>
  manga/{{ slug }}-chap-{{ chap }}
</template>

<script lang="ts" setup>
defineProps<{
    slug: string
    chap: string
}>()
</script>
