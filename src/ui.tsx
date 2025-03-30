import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './globals.css';
// Figmaプラグイン環境では即時実行関数を使用
(() => {
  try {
    const container = document.getElementById('react-root');
    console.log('React initialization attempt', container);
    
    if (container) {
      const root = createRoot(container);
      root.render(<App />);
      console.log('React render completed');
      
      // Figmaのメインスレッドに初期化完了を通知
      parent.postMessage({ pluginMessage: { type: 'ui-loaded' } }, '*');
    } else {
      console.error('React root element not found');
    }
  } catch (error) {
    console.error('React initialization error:', error);
  }
})(); 
