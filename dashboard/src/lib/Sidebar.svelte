<script>
  import { createEventDispatcher } from 'svelte';
  
  export let tools = [];
  export let activeTool = null;

  const dispatch = createEventDispatcher();

  function selectTool(toolId) {
    dispatch('toolSelect', toolId);
  }
</script>

<aside>
  <div class="top">
    <!-- Logo -->
    <div class="logo">
      <span class="icon">🦅</span>
    </div>

    <!-- New Chat -->
    <button class="new-chat" title="New Chat">
      <span>+</span>
    </button>

    <!-- Tools -->
    <nav class="tools">
      {#each tools as tool}
        <button 
          class="tool-btn" 
          class:active={activeTool === tool.id}
          on:click={() => selectTool(tool.id)}
          title={tool.label}
        >
          <span class="tool-icon">{tool.icon}</span>
          <span class="tool-label">{tool.label}</span>
        </button>
      {/each}
    </nav>
  </div>

  <div class="bottom">
    <!-- More -->
    <button class="tool-btn" title="More">
      <span class="tool-icon">•••</span>
      <span class="tool-label">More</span>
    </button>

    <!-- User / Settings -->
    <button class="user-btn" title="Settings">
      <span class="avatar">👤</span>
      <span class="tool-label">Settings</span>
    </button>
  </div>
</aside>

<style>
  aside {
    width: 72px;
    background: #111;
    border-right: 1px solid #1a1a1a;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px 0;
    transition: width 0.2s;
  }

  aside:hover {
    width: 160px;
  }

  .top, .bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .logo {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .logo .icon {
    font-size: 1.8rem;
  }

  .new-chat {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    border: 1px solid #333;
    background: transparent;
    color: #888;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .new-chat:hover {
    background: #1a1a1a;
    color: #fff;
    border-color: #444;
  }

  .tools {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 0 12px;
  }

  .tool-btn, .user-btn {
    width: 100%;
    height: 44px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    overflow: hidden;
  }

  .tool-btn:hover, .user-btn:hover {
    background: #1a1a1a;
    color: #fff;
  }

  .tool-btn.active {
    background: #1e3a5f;
    color: #60a5fa;
  }

  .tool-icon {
    font-size: 1.1rem;
    min-width: 24px;
    text-align: center;
  }

  .tool-label {
    font-size: 0.85rem;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s;
  }

  aside:hover .tool-label {
    opacity: 1;
  }

  .avatar {
    font-size: 1.2rem;
    min-width: 24px;
    text-align: center;
  }

  .bottom {
    padding: 0 12px;
  }

  .user-btn {
    border: 1px solid #222;
  }

  .user-btn:hover {
    border-color: #333;
  }
</style>
