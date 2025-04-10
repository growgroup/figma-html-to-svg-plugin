import * as React from 'react';
import SelectionPreview from './SelectionPreview';
import ProgressIndicator from './ProgressIndicator';
import { SelectionInfo } from '../utils/types';

// 必要な型定義
interface ImageGenerationTabProps {
  // 画像生成関連
  imagePrompt: string;
  setImagePrompt: (value: string) => void;
  generatedImage: string | null;
  setGeneratedImage: (value: string | null) => void;
  imageAspectRatio: string;
  setImageAspectRatio: (value: string) => void;
  isGeneratingImage: boolean;
  setIsGeneratingImage: (value: boolean) => void;
  imageGenerationError: string;
  setImageGenerationError: (value: string) => void;
  
  // プログレス情報
  progress: { stage: string; percentage: number };
  setProgress: (value: { stage: string; percentage: number }) => void;
  
  // チャット関連
  chatMessages: Array<{role: 'user' | 'model', content: string}>;
  setChatMessages: (value: Array<{role: 'user' | 'model', content: string}>) => void;
  showChatInterface: boolean;
  setShowChatInterface: (value: boolean) => void;
  
  // 選択要素関連
  selection: SelectionInfo[];
  includeImages: boolean;
  handleSelectionSettingsChange: (setting: 'children' | 'images', value: boolean) => void;
  
  // API関連
  apiKey: string;
  
  // 実行関数
  handleGenerateImage: () => Promise<void>;
  handleContinueChat: () => void;
  getSelectionSize: (selectionItems: SelectionInfo[]) => { width: string, height: string } | null;
  getAspectRatioSize: () => { width: string, height: string };
}

const ImageGenerationTab: React.FC<ImageGenerationTabProps> = ({
  imagePrompt,
  setImagePrompt,
  generatedImage,
  setGeneratedImage,
  imageAspectRatio,
  setImageAspectRatio,
  isGeneratingImage,
  setIsGeneratingImage,
  imageGenerationError,
  setImageGenerationError,
  progress,
  setProgress,
  chatMessages,
  setChatMessages,
  showChatInterface,
  setShowChatInterface,
  selection,
  includeImages,
  handleSelectionSettingsChange,
  apiKey,
  handleGenerateImage,
  handleContinueChat,
  getSelectionSize,
  getAspectRatioSize,
}) => {
  // チャットメッセージの表示コンポーネント
  const ChatMessage = ({ message }: { message: { role: 'user' | 'model', content: string } }) => {
    return (
      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`px-4 py-3 rounded-lg max-w-3/4 ${
          message.role === 'user' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* プロンプト入力 */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-base font-medium text-gray-800 mb-3">
          {showChatInterface ? '会話を続ける' : '画像生成プロンプト'}
        </h3>
        <textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder={showChatInterface 
            ? "AIからの質問に答えるか、さらに詳細を入力してください..." 
            : "AIに生成してほしい画像を詳しく説明してください..."}
          rows={4}
          disabled={isGeneratingImage}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-100"
        />
        
        {/* 会話履歴が表示されている場合のリセットボタン */}
        {showChatInterface && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                setShowChatInterface(false);
                setChatMessages([]);
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              会話をリセット
            </button>
          </div>
        )}
      </div>
      
      {/* チャット会話履歴 */}
      {showChatInterface && chatMessages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-base font-medium text-gray-800 mb-3">会話</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {chatMessages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
          </div>
        </div>
      )}
      
      {/* アスペクト比選択 */}
      {!showChatInterface && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-base font-medium text-gray-800 mb-3">画像アスペクト比</h3>
          <div className="flex flex-wrap gap-2">
            {['1:1', '4:3', '3:4', '16:9', '9:16'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setImageAspectRatio(ratio)}
                disabled={isGeneratingImage}
                className={`px-3 py-1.5 border rounded-md transition-colors ${
                  imageAspectRatio === ratio 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 選択要素プレビュー */}
      {!showChatInterface && (
        <div>
          <SelectionPreview selection={selection} />
        </div>
      )}
      
      {/* 選択要素の詳細取得設定 */}
      {!showChatInterface && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-3">選択要素の詳細取得設定</h3>
          <div className="flex gap-x-3">
            <div className="flex justify-center items-center">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => handleSelectionSettingsChange('images', e.target.checked)}
                disabled={isGeneratingImage}
                id="include-images-img"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="text-right">
              <label htmlFor="include-images-img" className="text-sm text-gray-700 cursor-pointer">
                選択要素を画像として取得・編集
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ 選択した要素を画像として取得し、その画像を元に生成します
          </p>
        </div>
      )}
      
      {/* 生成ボタン */}
      <div className="flex justify-end">
        <button 
          onClick={showChatInterface ? handleContinueChat : handleGenerateImage}
          disabled={isGeneratingImage || !imagePrompt}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-blue-400 transition-colors"
        >
          {isGeneratingImage ? '生成中...' : showChatInterface ? '送信' : '画像生成'}
        </button>
      </div>
      
      {/* 進捗表示 */}
      {isGeneratingImage && (
        <div>
          <ProgressIndicator stage={progress.stage} percentage={progress.percentage} />
        </div>
      )}
      
      {/* エラー表示 */}
      {imageGenerationError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md">
          {imageGenerationError}
        </div>
      )}
      
      {/* 生成画像プレビュー */}
      {generatedImage && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-base font-medium text-gray-800 mb-3">生成された画像</h3>
          <div className="flex justify-center">
            <img 
              src={generatedImage} 
              alt="Generated image" 
              className="max-w-full h-auto max-h-80 object-contain rounded-md border border-gray-200" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationTab; 