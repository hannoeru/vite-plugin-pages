<template>
  profile/group-{{ route.params.id }}
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
