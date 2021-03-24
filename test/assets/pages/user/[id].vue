<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({ id: String })

</script>

<template>
  User: {{ id }}
</template>

<route>
  {
    name: "name-override",
    meta: {
      requiresAuth: false
    }
  }
</route>
