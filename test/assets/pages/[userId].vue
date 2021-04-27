<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({
  userId: String,
})

</script>

<template>
  <div>
    {{ userId }}
  </div>
</template>
