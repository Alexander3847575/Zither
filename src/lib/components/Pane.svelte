<script lang="ts">
  interface Props {
    title?: string;
    children?: import('svelte').Snippet;
    theme?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet' | 'pink';
  }

  let { title, children, theme = 'blue' }: Props = $props();

  // Define color themes with your specified border colors
  const themes = {
    red: {
      border: '#FFADAD',
      background: '#F2F2F2'
    },
    orange: {
      border: '#FFD6A5',
      background: '#F2F2F2'
    },
    yellow: {
      border: '#FDFFB6',
      background: '#F2F2F2'
    },
    green: {
      border: '#CAFFBF',
      background: '#F2F2F2'
    },
    blue: {
      border: '#9BF6FF',
      background: '#F2F2F2'
    },
    indigo: {
      border: '#A0C4FF',
      background: '#F2F2F2'
    },
    violet: {
      border: '#BDB2FF',
      background: '#F2F2F2'
    },
    pink: {
      border: '#FFC6FF',
      background: '#F2F2F2'
    }
  };

  const currentTheme = $derived(themes[theme]);
</script>

<div 
  class="pane" 
  style:border-color={currentTheme.border}
  style:background-color={currentTheme.background}
>
  {#if title}
    <div 
      class="pane-header"
      style:border-bottom-color={currentTheme.border}
      style:background-color={currentTheme.background}
    >
      <h2>{title}</h2>
    </div>
  {/if}
  <div class="pane-content">
    {@render children?.()}
  </div>
</div>

<style>
  .pane {
    width: 5rem;
    height: 4rem;
    border: 1px solid;
    border-radius: 0.375rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pane-header {
    padding: 0.25rem 0.375rem;
    border-bottom: 1px solid;
    flex-shrink: 0;
  }

  .pane-header h2 {
    margin: 0;
    font-size: 0.625rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.2;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .pane-content {
    padding: 0.25rem 0.375rem;
    flex: 1;
    font-size: 0.5rem;
    line-height: 1.3;
    color: #374151;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
  }
</style>

