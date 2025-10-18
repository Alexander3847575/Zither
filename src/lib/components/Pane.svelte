<script lang="ts">
  interface Props {
    title?: string;
    children?: import('svelte').Snippet;
  }

  let { title, children }: Props = $props();
</script>

<div class="pane">
  {#if title}
    <div class="pane-header">
      <h2>{title}</h2>
    </div>
  {/if}
  <div class="pane-content">
    {@render children?.()}
  </div>
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    overflow: hidden;
  }

  .pane-header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .pane-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .pane-content {
    padding: 1rem;
    flex: 1;
  }
</style>

