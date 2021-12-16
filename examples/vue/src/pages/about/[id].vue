<script setup lang="ts">
defineProps({
  id: String,
})
</script>

<template>
  <div>
    <div>
      about/[id].vue: {{ id }}
    </div>
    <router-link to="/about/1b234bk12b3/more">
      more deep
    </router-link>
    <router-view />
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
