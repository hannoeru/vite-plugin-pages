<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({
  id: String,
})

</script>

<template>
  About: {{ id }}
</template>
