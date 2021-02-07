<template>
  <div>
    <p>index.vue</p>
    <router-link to="/about">
      about
    </router-link>
  </div>
</template>

<script>
export default {

}
</script>

<style>

</style>
<route>
{
  name: "name-override",
  meta: {requiresAuth: false}
}
</route>
