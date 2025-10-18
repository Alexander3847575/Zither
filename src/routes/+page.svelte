<script>
  import Pane from '$lib/components/Pane.svelte';
</script>

<div class="container">
  <h1>Pane Component Test</h1>
  
  <div class="test-area">
    <div class="theme-grid">
      <Pane title="Red" theme="red">
        <p>Red theme</p>
      </Pane>
      
      <Pane title="Orange" theme="orange">
        <p>Orange theme</p>
      </Pane>
      
      <Pane title="Yellow" theme="yellow">
        <p>Yellow theme</p>
      </Pane>
      
      <Pane title="Green" theme="green">
        <p>Green theme</p>
      </Pane>
      
      <Pane title="Blue" theme="blue">
        <p>Blue theme</p>
      </Pane>
      
      <Pane title="Indigo" theme="indigo">
        <p>Indigo theme</p>
      </Pane>
      
      <Pane title="Violet" theme="violet">
        <p>Violet theme</p>
      </Pane>
      
      <Pane title="Pink" theme="pink">
        <p>Pink theme</p>
      </Pane>
    </div>
  </div>
</div>

<style>
  .container {
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  
  .test-area {
    margin-top: 2rem;
    padding: 2rem;
    border: 2px dashed #ccc;
    background: #fafafa;
    width: 100%;
    max-width: 800px;
  }
  
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    align-items: start;
    width: 100%;
  }
  
  h1 {
    color: #333;
    margin-bottom: 1rem;
  }
</style>
