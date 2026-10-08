<template>
  <svg class="ui-icon" :aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path v-if="name === 'play'" d="M5 3l14 9-14 9V3z" />
    <g v-else-if="name === 'pause'">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </g>
    <path v-else-if="name === 'previous'" d="M19 20L9 12l10-8v16zM5 19V5" />
    <path v-else-if="name === 'next'" d="M5 4l10 8-10 8V4zM19 5v14" />
    <path v-else-if="name === 'star'" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    <path v-else-if="name === 'queue'" d="M3 6h18M3 12h18M3 18h18" />
    <path v-else-if="name === 'shuffle'" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    <g v-else-if="name === 'repeat'">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </g>
    <g v-else-if="name === 'repeat-one'">
      <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
      <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor" stroke="none">1</text>
    </g>
    <path v-else-if="name === 'volume'" d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    <path v-else-if="name === 'library'" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V6a2 2 0 012-2h10l4 4v9a2 2 0 01-2 2H6.5" />
    <path v-else-if="name === 'chevron-left'" d="M15 18l-6-6 6-6" />
    <path v-else-if="name === 'chevron-right'" d="M9 18l6-6-6-6" />
    <path v-else-if="name === 'close'" d="M18 6L6 18M6 6l12 12" />
    <path v-else-if="name === 'plus'" d="M12 5v14M5 12h14" />
    <path v-else-if="name === 'info'" d="M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" />
    <path v-else-if="name === 'search'" d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
    <path v-else-if="name === 'trash'" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <path v-else-if="name === 'edit'" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    <path v-else-if="name === 'arrow-up'" d="M12 19V5M5 12l7-7 7 7" />
    <path v-else-if="name === 'arrow-down'" d="M12 5v14M19 12l-7 7-7-7" />
    <path v-else-if="name === 'arrow-left'" d="M19 12H5M12 19l-7-7 7-7" />
    <path v-else-if="name === 'locate'" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<style scoped>
.ui-icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: middle;
}
</style>
