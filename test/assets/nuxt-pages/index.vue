<template>
  <div>
    <p>index.vue</p>
    <router-link to="/blog">
      blog
    </router-link> |
    <router-link to="/about">
      about
    </router-link> |
    <router-link to="/components">
      components
    </router-link> |
    <router-link to="/markdown">
      markdown
    </router-link> |
    <router-link to="/xxx">
      not exits
    </router-link>
  </div>
</template>

<route>
{
  name: "name-override",
  meta: {requiresAuth: false}
}
</route>
