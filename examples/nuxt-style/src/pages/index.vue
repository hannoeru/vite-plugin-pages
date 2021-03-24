<template>
  <div>
    <p>index.vue</p>
    <router-link to="/about">
      about
    </router-link>
  </div>
</template>

<route>
{
  name: "name-override",
  meta: {requiresAuth: false}
}
</route>
