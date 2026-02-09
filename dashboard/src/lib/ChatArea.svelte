<script>
  import { createEventDispatcher } from 'svelte';
  
  export let currentModel = 'claude-opus-4-5';
  export let quickActions = [];
  export let chatHistory = [];

  const dispatch = createEventDispatcher();

  let inputText = '';
  let showModelDropdown = false;

  const models = [
    { id: 'claude-opus-4-5', name: 'Claude Opus', provider: 'Anthropic' },
    { id: 'claude-sonnet-4', name: 'Claude Sonnet', provider: 'Anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' }
  ];

  function selectModel(modelId) {
    dispatch('modelChange', modelId);
    showModelDropdown = false;
  }

  function handleSubmit() {
    if (inputText.trim()) {
      console.log('Send:', inputText);
      inputText = '';
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  $: currentModelDisplay = models.find(m => m.id === currentModel)?.name || currentModel;
</script>

<div class="chat-area">
  <div class="center-content">
    <!-- Title -->
    <h1 class="title">EasyHub</h1>

    <!-- Chat Input Box -->
    <div class="input-container">
      <div class="input-box">
        <button class="attach-btn" title="Attach file">
          <span>+</span>
        </button>
        
        <textarea 
          bind:value={inputText}
          on:keydown={handleKeydown}
          placeholder="Ask anything. Type @ for tools and / for commands."
          rows="1"
        ></textarea>

        <div class="input-actions">
          <!-- Model Selector -->
          <div class="model-selector">
            <button 
              class="model-btn"
              on:click={() => showModelDropdown = !showModelDropdown}
            >
              {currentModelDisplay}
              <span class="chevron">▼</span>
            </button>
            
            {#if showModelDropdown}
              <div class="model-dropdown">
                {#each models as model}
                  <button 
                    class="model-option"
                    class:active={currentModel === model.id}
                    on:click={() => selectModel(model.id)}
                  >
                    <span class="model-name">{model.name}</span>
                    <span class="model-provider">{model.provider}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Voice -->
          <button class="icon-btn" title="Voice input">🎤</button>

          <!-- Send -->
          <button 
            class="send-btn" 
            on:click={handleSubmit}
            disabled={!inputText.trim()}
          >
            <span>↑</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      {#each quickActions as action}
        <button class="action-chip">
          <span class="action-icon">{action.icon}</span>
          <span>{action.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .center-content {
    width: 100%;
    max-width: 720px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }

  .title {
    font-size: 3rem;
    font-weight: 300;
    color: #888;
    margin: 0;
    letter-spacing: -1px;
  }

  .input-container {
    width: 100%;
  }

  .input-box {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 16px;
    background: #151515;
    border: 1px solid #262626;
    border-radius: 16px;
    transition: border-color 0.2s;
  }

  .input-box:focus-within {
    border-color: #404040;
  }

  .attach-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #333;
    background: transparent;
    color: #666;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .attach-btn:hover {
    background: #222;
    color: #fff;
  }

  textarea {
    flex: 1;
    background: transparent;
    border: none;
    color: #e0e0e0;
    font-size: 1rem;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.5;
    max-height: 200px;
  }

  textarea::placeholder {
    color: #555;
  }

  .input-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .model-selector {
    position: relative;
  }

  .model-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #888;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .model-btn:hover {
    background: #222;
    color: #fff;
  }

  .chevron {
    font-size: 0.6rem;
    opacity: 0.6;
  }

  .model-dropdown {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 8px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 8px;
    min-width: 180px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .model-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: #ccc;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .model-option:hover {
    background: #262626;
  }

  .model-option.active {
    background: #1e3a5f;
    color: #60a5fa;
  }

  .model-name {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .model-provider {
    font-size: 0.75rem;
    color: #666;
  }

  .model-option.active .model-provider {
    color: #60a5fa88;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #666;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    background: #222;
    color: #fff;
  }

  .send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #2dd4bf;
    color: #000;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn:hover:not(:disabled) {
    background: #5eead4;
  }

  .send-btn:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
  }

  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }

  .action-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: transparent;
    border: 1px solid #2a2a2a;
    border-radius: 20px;
    color: #888;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-chip:hover {
    background: #1a1a1a;
    border-color: #404040;
    color: #fff;
  }

  .action-icon {
    font-size: 1rem;
  }
</style>
