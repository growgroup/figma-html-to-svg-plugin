import * as React from 'react';

// 必要な型定義
interface SettingsTabProps {
  // タブ関連
  activeSettingsTab: 'general' | 'model' | 'prompt';
  setActiveSettingsTab: (tab: 'general' | 'model' | 'prompt') => void;
  
  // API関連
  apiKey: string;
  handleApiKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // コーディング出力設定
  directCodeOutput: boolean;
  setDirectCodeOutput: (value: boolean) => void;
  
  // CSS設定
  addCodePrefix: boolean;
  setAddCodePrefix: (value: boolean) => void;
  codePrefix: string;
  setCodePrefix: (value: string) => void;
  useBEMNotation: boolean;
  setUseBEMNotation: (value: boolean) => void;
  mergeCssInBatch: boolean;
  setMergeCssInBatch: (value: boolean) => void;
  
  // モデル設定
  showCustomModelInput: boolean;
  setShowCustomModelInput: (value: boolean) => void;
  selectedModelId: string;
  setSelectedModelId: (value: string) => void;
  customModelId: string;
  setCustomModelId: (value: string) => void;
  
  // プロンプト設定
  basePrompt: string;
  handleBasePromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isGeneratingBasePrompt: boolean;
  handleAutoGenerateBasePrompt: () => void;
  codingPrompt: string;
  handleCodingPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  // その他
  isLoading: boolean;
  getCurrentProviderName: () => string;
  DEFAULT_MODELS: any[]; // モデル一覧
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  activeSettingsTab,
  setActiveSettingsTab,
  apiKey,
  handleApiKeyChange,
  directCodeOutput,
  setDirectCodeOutput,
  addCodePrefix,
  setAddCodePrefix,
  codePrefix,
  setCodePrefix,
  useBEMNotation,
  setUseBEMNotation,
  mergeCssInBatch,
  setMergeCssInBatch,
  showCustomModelInput,
  setShowCustomModelInput,
  selectedModelId,
  setSelectedModelId,
  customModelId,
  setCustomModelId,
  basePrompt,
  handleBasePromptChange,
  isGeneratingBasePrompt,
  handleAutoGenerateBasePrompt,
  codingPrompt,
  handleCodingPromptChange,
  isLoading,
  getCurrentProviderName,
  DEFAULT_MODELS
}) => {
  return (
    <div className="space-y-6">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200 mb-4">
        <button 
          className={`px-3 py-2 text-sm font-medium transition-colors ${activeSettingsTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveSettingsTab('general')}
        >
          一般設定
        </button>
        <button 
          className={`px-3 py-2 text-sm font-medium transition-colors ${activeSettingsTab === 'model' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveSettingsTab('model')}
        >
          モデル設定
        </button>
        <button 
          className={`px-3 py-2 text-sm font-medium transition-colors ${activeSettingsTab === 'prompt' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveSettingsTab('prompt')}
        >
          プロンプト設定
        </button>
      </div>
      
      {/* タブコンテンツ */}
      {/* 一般設定 */}
      {activeSettingsTab === 'general' && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <label htmlFor="api-key" className="text-sm font-medium text-gray-700 min-w-24">API Key:</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-... / API Key"
              className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3">コーディングモードの出力設定</h3>
            <div className="flex gap-x-3">
              <div className="flex justify-center items-center">
                <input
                  type="checkbox"
                  checked={directCodeOutput}
                  onChange={(e) => setDirectCodeOutput(e.target.checked)}
                  id="direct-code-output"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="text-right">
                <label htmlFor="direct-code-output" className="text-sm text-gray-700 cursor-pointer">
                  HTMLとCSSを直接出力（SVG変換しない）
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※ コーディングモード選択時のみ有効。HTML/CSSファイルとして直接保存されます。
            </p>
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">CSS衝突防止設定:</h4>
            
            <div className="flex gap-x-3 mb-2">
              <div className="flex justify-center items-center">
                <input
                  type="checkbox"
                  checked={addCodePrefix}
                  onChange={(e) => setAddCodePrefix(e.target.checked)}
                  id="add-code-prefix"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center flex-1">
                <label htmlFor="add-code-prefix" className="text-sm text-gray-700 cursor-pointer mr-2">
                  CSSクラスにプレフィックスを追加:
                </label>
                <input
                  type="text"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value)}
                  placeholder="接頭辞"
                  disabled={!addCodePrefix}
                  className="p-1 text-sm border border-gray-300 rounded-md w-32"
                />
              </div>
            </div>
            
            <div className="flex gap-x-3 mb-2">
              <div className="flex justify-center items-center">
                <input
                  type="checkbox"
                  checked={useBEMNotation}
                  onChange={(e) => setUseBEMNotation(e.target.checked)}
                  id="use-bem"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="text-right">
                <label htmlFor="use-bem" className="text-sm text-gray-700 cursor-pointer">
                  BEM記法に準拠したクラス名を生成
                </label>
              </div>
            </div>
            
            <div className="flex gap-x-3">
              <div className="flex justify-center items-center">
                <input
                  type="checkbox"
                  checked={mergeCssInBatch}
                  onChange={(e) => setMergeCssInBatch(e.target.checked)}
                  id="merge-css"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="text-right">
                <label htmlFor="merge-css" className="text-sm text-gray-700 cursor-pointer">
                  一括生成時にCSSを統合
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* モデル設定 */}
      {activeSettingsTab === 'model' && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex flex-col gap-3">
            <label htmlFor="model-select" className="text-sm font-medium text-gray-700">AIモデル:</label>
            <div className="flex flex-col md:flex-row gap-3">
              <select
                id="model-select"
                value={showCustomModelInput ? "custom" : selectedModelId}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue === "custom") {
                    setShowCustomModelInput(true);
                  } else {
                    setShowCustomModelInput(false);
                    setSelectedModelId(newValue);
                  }
                }}
                disabled={isLoading}
                className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {DEFAULT_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
                <option value="custom">カスタムモデル...</option>
              </select>
              
              {showCustomModelInput && (
                <input
                  type="text"
                  placeholder="例: openai/gpt-4o-turbo"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  disabled={isLoading}
                  className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              プロバイダー: {getCurrentProviderName()}
              {showCustomModelInput && ' (カスタムモデルではOpenRouter APIを使用します)'}
            </p>
          </div>
        </div>
      )}
      
      {/* プロンプト設定 */}
      {activeSettingsTab === 'prompt' && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="base-prompt" className="text-sm font-medium text-gray-700">ベースプロンプト:</label>
              <button
                type="button"
                onClick={handleAutoGenerateBasePrompt}
                disabled={isLoading || isGeneratingBasePrompt}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isGeneratingBasePrompt ? (
                  <>
                    <span className="animate-spin h-3 w-3 border-t-2 border-blue-500 border-r-2 border-blue-500 rounded-full"></span>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 3a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0V6h1a1 1 0 100-2h-1V3z"></path>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"></path>
                    </svg>
                    <span>AIで自動生成</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="base-prompt"
              value={basePrompt}
              onChange={handleBasePromptChange}
              placeholder="すべてのプロンプトの先頭に追加される基本指示を入力..."
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ ここに入力した内容はすべてのプロンプトの先頭に自動的に追加されます
            </p>
          </div>
          
          {/* HTMLコーディング用プロンプト設定 */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="coding-prompt" className="text-sm font-medium text-gray-700">HTMLコーディング用プロンプト:</label>
            </div>
            <textarea
              id="coding-prompt"
              value={codingPrompt}
              onChange={handleCodingPromptChange}
              placeholder="FLOCSSをベースにしたHTMLコーディングの指示を入力..."
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ ここに入力した内容は「コーディング」モード選択時に適用されます（デフォルト: FLOCSS）
            </p>
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-2">コーディングフレームワーク例:</h4>
              <ul className="space-y-1 pl-4 list-disc text-xs text-gray-600">
                <li>FLOCSS（Foundation, Layout, Object）</li>
                <li>SMACSS（Scalable and Modular Architecture for CSS）</li>
                <li>BEM（Block, Element, Modifier）</li>
                <li>OOCSS（Object Oriented CSS）</li>
                <li>Atomic Design</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab; 