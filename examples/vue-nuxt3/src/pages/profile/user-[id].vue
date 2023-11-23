<template>
  <div>user-{{ route.params.id }}</div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
