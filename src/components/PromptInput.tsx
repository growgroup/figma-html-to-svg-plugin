import * as React from 'react';
import { SelectionInfo } from '../utils/types';
import LayerSelector from './LayerSelector';

export type TemplateType = 'webdesign' | 'presentation' | 'diagram' | 'wireframe' | 'coding' | 'research';

// 単一プロンプトの型定義
export interface PromptItem {
  id: string;
  content: string;
  title: string;
  selectedLayerId?: string; // 選択したFigmaレイヤーのID
  selectionInfo?: SelectionInfo[]; // レイヤーの詳細情報
}

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  disabled: boolean;
  templateType: TemplateType;
  onTemplateTypeChange: (type: TemplateType) => void;
  // 複数プロンプト管理用のプロパティ
  promptItems: PromptItem[];
  onPromptItemsChange: (items: PromptItem[]) => void;
  onBatchGenerate: () => void;
  isBatchMode: boolean;
  onBatchModeChange: (isBatch: boolean) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  value, 
  onChange, 
  onGenerate, 
  disabled,
  templateType,
  onTemplateTypeChange,
  promptItems,
  onPromptItemsChange,
  onBatchGenerate,
  isBatchMode,
  onBatchModeChange
}) => {
  const [showExamples, setShowExamples] = React.useState(false);
  
  // レイヤー選択モーダルの状態
  const [showLayerSelector, setShowLayerSelector] = React.useState(false);
  const [currentEditingPromptId, setCurrentEditingPromptId] = React.useState<string | null>(null);
  const [availableLayers, setAvailableLayers] = React.useState<Array<{id: string, name: string, type: string}>>([]);
  const [isLoadingLayers, setIsLoadingLayers] = React.useState(false);
  
  // レイヤー選択ハンドラー
  const handleSelectLayerForPrompt = (promptId: string) => {
    setCurrentEditingPromptId(promptId);
    setShowLayerSelector(true);
    
    // レイヤー一覧を取得
    setIsLoadingLayers(true);
    parent.postMessage(
      { pluginMessage: { type: 'get-layers-list' } },
      '*'
    );
  };
  
  // レイヤー一覧受信ハンドラー
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message) return;
      
      if (message.type === 'layers-list-result') {
        setIsLoadingLayers(false);
        if (message.success) {
          setAvailableLayers(message.layers);
        } else {
          console.error('レイヤー一覧取得エラー:', message.error);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // レイヤー選択確定ハンドラー
  const handleLayerSelect = (layerId: string) => {
    if (!currentEditingPromptId) return;
    
    const updatedItems = promptItems.map(item => {
      if (item.id === currentEditingPromptId) {
        return {
          ...item,
          selectedLayerId: layerId
        };
      }
      return item;
    });
    
    onPromptItemsChange(updatedItems);
    setShowLayerSelector(false);
    setCurrentEditingPromptId(null);
  };
  
  // レイヤー名取得ヘルパー
  const getLayerNameById = (layerId: string) => {
    const layer = availableLayers.find(l => l.id === layerId);
    return layer ? layer.name : layerId;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBatchMode) {
      onBatchGenerate();
    } else {
      onGenerate();
    }
  };

  // 新しいプロンプト項目を追加
  const handleAddPromptItem = () => {
    const newId = `prompt-${Date.now()}`;
    onPromptItemsChange([
      ...promptItems,
      {
        id: newId,
        content: '',
        title: `画面 ${promptItems.length + 1}`
      }
    ]);
  };

  // プロンプト項目を削除
  const handleRemovePromptItem = (id: string) => {
    onPromptItemsChange(promptItems.filter(item => item.id !== id));
  };

  // プロンプト項目のコンテンツを更新
  const handlePromptItemChange = (id: string, content: string) => {
    onPromptItemsChange(
      promptItems.map(item => 
        item.id === id ? { ...item, content } : item
      )
    );
  };

  // プロンプト項目のタイトルを更新
  const handlePromptItemTitleChange = (id: string, title: string) => {
    onPromptItemsChange(
      promptItems.map(item => 
        item.id === id ? { ...item, title } : item
      )
    );
  };

  // テンプレートタイプに基づいた例を取得する関数
  const getExamplesByType = (type: TemplateType): string[] => {
    switch (type) {
      case 'webdesign':
        return [
          'モバイルフレンドリーなランディングページを作成してください。主要な機能3つと申し込みフォームを含み、コントラストの高い配色を使用します。',
          'マテリアルデザインのダッシュボード画面を作成してください。ユーザー統計、最近のアクティビティ、カレンダーコンポーネントを含みます。',
          'シンプルなSaaSサービスの料金プランページを作成してください。3つのプラン（無料、スタンダード、プロ）を比較表で表示します。'
        ];
      case 'presentation':
        return [
          'プロジェクト提案スライドを作成してください。目標、解決策、ロードマップを視覚的に表現し、企業ブランドカラーを活用します。',
          'データ分析の結果を示すスライドを作成してください。棒グラフと円グラフを用いて主要な指標を視覚化します。',
          'シンプルな会社紹介スライドを作成してください。ミッション、ビジョン、主要事業を簡潔にまとめます。'
        ];
      case 'diagram':
        return [
          'プロジェクト管理のカンバン方式を図解してください。ToDo、進行中、完了の各カラムとタスクカードを表現します。',
          'マイクロサービスアーキテクチャの概念図を作成してください。APIゲートウェイ、サービス間の通信、データベースの関係を示します。',
          'ユーザー認証フローのプロセス図を作成してください。登録、ログイン、パスワードリセットの各ステップを可視化します。'
        ];
      case 'wireframe':
        return [
          'モバイルアプリのユーザープロフィール画面の構成を作成してください。アバター、基本情報、設定メニューの配置を示します。',
          'ECサイトの商品詳細ページの設計図を作成してください。商品画像カルーセル、説明、レビュー、関連商品の配置を含みます。',
          'ダッシュボードアプリの管理画面のワイヤーフレームを作成してください。サイドナビ、ヘッダー、統計ウィジェット、データテーブルを配置します。'
        ];
      case 'coding':
        return [
          'ECサイトのカード型商品リスト部分をFLOCSS形式でコーディングしてください。商品画像、商品名、価格、在庫状況を表示します。',
          'お問い合わせフォームをレスポンシブ対応でコーディングしてください。名前、メール、電話番号、お問い合わせ内容の入力欄を含みます。',
          'ニュースサイトのヘッダー部分をコーディングしてください。ロゴ、メインナビゲーション、検索バー、ログインボタンを含みます。'
        ];
      case 'research':
        return [
          '研究のためのプロンプトを入力してください...',
          '研究のためのプロンプトを入力してください...',
          '研究のためのプロンプトを入力してください...'
        ];
      default:
        return [];
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      {/* テンプレートタイプのセレクター */}
      <div className="mb-4">
        <p className="font-bold text-sm text-gray-700 mb-2">生成タイプ:</p>
        <div className="flex flex-wrap gap-3 mb-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="wireframe"
              checked={templateType === 'wireframe'}
              onChange={() => onTemplateTypeChange('wireframe')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">構成ラフ</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="webdesign"
              checked={templateType === 'webdesign'}
              onChange={() => onTemplateTypeChange('webdesign')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Webデザイン</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="presentation"
              checked={templateType === 'presentation'}
              onChange={() => onTemplateTypeChange('presentation')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">プレゼン</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="diagram"
              checked={templateType === 'diagram'}
              onChange={() => onTemplateTypeChange('diagram')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">作図</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="coding"
              checked={templateType === 'coding'}
              onChange={() => onTemplateTypeChange('coding')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">コーディング</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="research"
              checked={templateType === 'research'}
              onChange={() => onTemplateTypeChange('research')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">研究</span>
          </label>
        </div>
        
        <button 
          type="button"
          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowExamples(!showExamples)}
          disabled={disabled}
        >
          {showExamples ? '例を隠す' : 'プロンプト例を見る'}
        </button>
        
        {showExamples && (
          <div className="mt-3 bg-gray-50 p-3 rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">プロンプト例:</p>
            <ul className="space-y-2 pl-4 list-disc">
              {getExamplesByType(templateType).map((example, index) => (
                <li 
                  key={index} 
                  onClick={() => onChange(example)} 
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 生成モード切り替え */}
      <div className="mb-4">
        <div className="flex items-center space-x-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="generationMode"
              checked={!isBatchMode}
              onChange={() => onBatchModeChange(false)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">単一生成</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="generationMode"
              checked={isBatchMode}
              onChange={() => onBatchModeChange(true)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">一括生成</span>
          </label>
        </div>
      </div>

      {!isBatchMode ? (
        // 単一プロンプト入力欄（従来の方法）
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">プロンプト:</label>
          <textarea
            id="prompt"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={getPlaceholderByType(templateType)}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-100"
          />
        </div>
      ) : (
        // 複数プロンプト入力（リピーターフィールド）
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">複数プロンプト設定:</label>
            <button
              type="button"
              onClick={handleAddPromptItem}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
              </svg>
              <span>プロンプト追加</span>
            </button>
          </div>

          {promptItems.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-md border border-dashed border-gray-300">
              <p className="text-sm text-gray-500">プロンプトを追加してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {promptItems.map((item, index) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handlePromptItemTitleChange(item.id, e.target.value)}
                        placeholder="タイトル"
                        disabled={disabled}
                        className="text-sm p-1 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePromptItem(item.id)}
                      disabled={disabled}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={item.content}
                    onChange={(e) => handlePromptItemChange(item.id, e.target.value)}
                    placeholder={getPlaceholderByType(templateType)}
                    disabled={disabled}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-100"
                  />

                  {/* レイヤー選択UI（コーディングモードのみ表示） */}
                  {templateType === 'coding' && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleSelectLayerForPrompt(item.id)}
                        disabled={disabled}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span>{item.selectedLayerId ? 'レイヤー選択済み' : 'レイヤーを選択'}</span>
                      </button>
                      {item.selectedLayerId && (
                        <div className="text-xs text-gray-500 mt-1">
                          選択レイヤー: {getLayerNameById(item.selectedLayerId)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={disabled || (isBatchMode ? promptItems.length === 0 : !value)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-blue-400 transition-colors"
        >
          {disabled ? '生成中...' : (isBatchMode ? '一括生成開始' : 'HTML生成 & SVG変換')}
        </button>
      </div>

      {/* レイヤー選択モーダル */}
      <LayerSelector
        isOpen={showLayerSelector}
        onClose={() => {
          setShowLayerSelector(false);
          setCurrentEditingPromptId(null);
        }}
        onSelect={handleLayerSelect}
        layers={availableLayers}
        isLoading={isLoadingLayers}
        selectedLayerId={currentEditingPromptId ? promptItems.find(item => item.id === currentEditingPromptId)?.selectedLayerId : undefined}
      />
    </form>
  );
};

// テンプレートタイプに基づいてプレースホルダーを返す関数
const getPlaceholderByType = (type: TemplateType): string => {
  switch (type) {
    case 'webdesign':
      return 'Webデザインのコンテンツを説明してください...';
    case 'presentation':
      return 'プレゼンのスライド内容を説明してください...';
    case 'diagram':
      return '作図したい図表の内容を説明してください...';
    case 'wireframe':
      return 'ワイヤーフレーム/構成ラフの内容を説明してください...';
    case 'coding':
      return 'コーディングしたい要素や画面の詳細を説明してください...';
    case 'research':
      return '研究のためのプロンプトを入力してください...';
    default:
      return 'HTMLを生成するためのプロンプトを入力してください...';
  }
};

export default PromptInput; 