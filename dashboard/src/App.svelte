<script>
  import Sidebar from './lib/Sidebar.svelte';
  import ChatArea from './lib/ChatArea.svelte';

  let currentModel = 'claude-opus-4-5';
  let chatHistory = [
    { id: 1, title: 'Dashboard setup', time: '10:25 AM' },
    { id: 2, title: 'Fork OpenClaw repo', time: '10:15 AM' },
    { id: 3, title: 'Odoo local dev', time: 'Yesterday' }
  ];

  let tools = [
    { id: 'history', icon: '🕐', label: 'History' },
    { id: 'channels', icon: '📡', label: 'Channels' },
    { id: 'sessions', icon: '💬', label: 'Sessions' },
    { id: 'memory', icon: '🧠', label: 'Memory' },
    { id: 'skills', icon: '⚡', label: 'Skills' },
    { id: 'cron', icon: '⏰', label: 'Scheduled' }
  ];

  let quickActions = [
    { icon: '🔍', label: 'Search' },
    { icon: '📊', label: 'Analyze' },
    { icon: '📝', label: 'Summarize' },
    { icon: '💻', label: 'Code' },
    { icon: '🌐', label: 'Browse' }
  ];

  let activeTool = null;

  function handleToolSelect(toolId) {
    activeTool = activeTool === toolId ? null : toolId;
  }
</script>

<div class="app">
  <Sidebar 
    {tools} 
    {activeTool} 
    on:toolSelect={(e) => handleToolSelect(e.detail)}
  />
  
  <main>
    <ChatArea 
      {currentModel}
      {quickActions}
      {chatHistory}
      on:modelChange={(e) => currentModel = e.detail}
    />
  </main>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #0a0a0a;
    color: #e0e0e0;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
