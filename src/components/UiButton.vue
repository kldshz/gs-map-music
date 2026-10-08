<template>
  <button
    type="button"
    class="ui-button"
    :class="{ 'ui-button-pressed': pressed }"
    :disabled="disabled"
    :aria-label="label" :aria-describedby="tooltipVisible ? tooltipId : undefined"
    :aria-pressed="pressed !== undefined ? pressed : undefined"
    v-bind="$attrs"
    @click="handleClick"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
  >
    <UiIcon v-if="icon" :name="icon" />
    <span v-if="$slots.default || text" class="ui-button-text"><slot>{{ text }}</slot></span>
  </button>
  <Teleport to="body">
    <div
      v-if="tooltipVisible"
      ref="tooltipEl"
      class="ui-tooltip"
      role="tooltip" :id="tooltipId"
      :style="tooltipStyle"
    >
      {{ label }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount, useId } from 'vue';
import UiIcon from './UiIcon.vue';

defineOptions({inheritAttrs:false});
const tooltipId=useId();
const props = defineProps<{
  label: string;
  icon?: string;
  text?: string;
  pressed?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const tooltipVisible = ref(false);
const tooltipStyle = ref<Record<string, string>>({});
const tooltipEl = ref<HTMLElement | null>(null);
const buttonEl = ref<HTMLElement | null>(null);
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let scrollHandler: (() => void) | null = null;

function handleClick(event: MouseEvent): void {
  if (!props.disabled) {
    hideTooltip();
    emit('click', event);
  }
}

function showTooltip(event: Event): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  const target = event.currentTarget as HTMLElement;
  buttonEl.value = target;
  tooltipVisible.value = true;

  void nextTick(()=>{if(tooltipVisible.value)positionTooltip(target);});

  if (!scrollHandler) {
    scrollHandler = () => {
      if (tooltipVisible.value && buttonEl.value) {
        positionTooltip(buttonEl.value);
      }
    };
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', scrollHandler);
  }
}

function hideTooltip(): void {
  hideTimer = setTimeout(() => {
    tooltipVisible.value = false;
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', scrollHandler);
      scrollHandler = null;
    }
  }, 100);
}

function positionTooltip(target: HTMLElement): void {
  const rect = target.getBoundingClientRect();
  const tooltipWidth = tooltipEl.value?.getBoundingClientRect().width ?? 200;
  const tooltipHeight = tooltipEl.value?.getBoundingClientRect().height ?? 32;
  const gap = 8;

  let left = rect.left + rect.width / 2 - tooltipWidth / 2;
  let top = rect.bottom + gap;

  if (left < 4) left = 4;
  if (left + tooltipWidth > window.innerWidth - 4) {
    left = window.innerWidth - tooltipWidth - 4;
  }

  if (top + tooltipHeight > window.innerHeight) {
    top = rect.top - tooltipHeight - gap;
  }

  tooltipStyle.value = {
    left: `${left}px`,
    top: `${Math.max(4,top)}px`,
  };
}
onBeforeUnmount(()=>{if(hideTimer)clearTimeout(hideTimer);if(scrollHandler){window.removeEventListener('scroll',scrollHandler,true);window.removeEventListener('resize',scrollHandler);}});
</script>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  background: var(--color-bg-button, #fff);
  color: var(--color-text, #000);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  .ui-button {
    transition: none;
  }
}

.ui-button:hover:not(:disabled) {
  background: var(--color-bg-button-hover, #f5f5f5);
  border-color: var(--color-border-hover, #999);
}

.ui-button:focus-visible {
  outline: 2px solid var(--color-focus, #0066cc);
  outline-offset: 2px;
}

.ui-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-button-pressed {
  background: var(--color-bg-button-pressed, #e0e0e0);
  border-color: var(--color-border-pressed, #666);
}

.ui-button-text {
  line-height: 1;
}
</style>
