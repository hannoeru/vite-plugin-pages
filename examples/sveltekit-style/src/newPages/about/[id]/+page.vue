<script setup lang="ts">
import MyComponent from './MyComponent.vue'

defineProps({
  id: String,
})
</script>

<template>
  <MyComponent>{{ id }}</MyComponent>
</template>
