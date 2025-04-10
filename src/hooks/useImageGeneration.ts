import { useState } from 'react';
import { SelectionInfo } from '../utils/types';
import { generateImageWithGemini } from '../services/gemini';

interface UseImageGenerationProps {
  apiKey: string;
  selection: SelectionInfo[];
  includeImages: boolean;
  getSelectionSize: (selectionItems: SelectionInfo[]) => { width: string, height: string } | null;
}

export const useImageGeneration = ({ apiKey, selection, includeImages, getSelectionSize }: UseImageGenerationProps) => {
  // 画像生成関連の状態変数
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imageGenerationError, setImageGenerationError] = useState<string>('');
  
  // チャット会話履歴
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'model', content: string}>>([]);
  const [showChatInterface, setShowChatInterface] = useState<boolean>(false);
  
  // プログレスの状態
  const [progress, setProgress] = useState<{ stage: string; percentage: number }>({ stage: '', percentage: 0 });

  // アスペクト比に基づいてサイズ調整するメソッド
  const getAspectRatioSize = () => {
    // 基本サイズ（選択要素またはデフォルト）
    let baseWidth = 500;
    let baseHeight = 500;
    
    // 選択要素のサイズを取得（あれば）
    if (selection && selection.length > 0) {
      const size = getSelectionSize(selection);
      if (size) {
        baseWidth = parseInt(size.width, 10) || 500;
        baseHeight = parseInt(size.height, 10) || 500;
      }
    }
    
    // アスペクト比に基づいて調整（長辺を基準に短辺を計算）
    switch (imageAspectRatio) {
      case '1:1':
        // 正方形 - 幅と高さの大きい方を基準
        const squareSize = Math.max(baseWidth, baseHeight);
        return { width: squareSize.toString(), height: squareSize.toString() };
      case '4:3':
        if (baseWidth >= baseHeight) {
          // 幅を基準
          return { width: baseWidth.toString(), height: Math.round(baseWidth * 0.75).toString() };
        } else {
          // 高さを基準
          return { width: Math.round(baseHeight * 4/3).toString(), height: baseHeight.toString() };
        }
      case '3:4':
        if (baseWidth >= baseHeight) {
          // 幅を基準
          return { width: baseWidth.toString(), height: Math.round(baseWidth * 4/3).toString() };
        } else {
          // 高さを基準
          return { width: Math.round(baseHeight * 0.75).toString(), height: baseHeight.toString() };
        }
      case '16:9':
        if (baseWidth >= baseHeight) {
          // 幅を基準
          return { width: baseWidth.toString(), height: Math.round(baseWidth * 9/16).toString() };
        } else {
          // 高さを基準
          return { width: Math.round(baseHeight * 16/9).toString(), height: baseHeight.toString() };
        }
      case '9:16':
        if (baseWidth >= baseHeight) {
          // 幅を基準
          return { width: baseWidth.toString(), height: Math.round(baseWidth * 16/9).toString() };
        } else {
          // 高さを基準
          return { width: Math.round(baseHeight * 9/16).toString(), height: baseHeight.toString() };
        }
      default:
        return { width: baseWidth.toString(), height: baseHeight.toString() };
    }
  };
  
  // 画像生成ハンドラー
  const handleGenerateImage = async () => {
    if (!apiKey) {
      setImageGenerationError('APIキーが設定されていません');
      return;
    }
    
    if (!imagePrompt) {
      setImageGenerationError('プロンプトを入力してください');
      return;
    }
    
    setIsGeneratingImage(true);
    setImageGenerationError('');
    setGeneratedImage(null);
    
    try {
      // プログレス更新
      setProgress({ stage: 'AIによる画像生成中...', percentage: 30 });
      
      // 選択要素から画像データを取得
      const imageData = selection.length > 0 && includeImages ? selection[0].imageData : undefined;
      
      // 画像サイズの取得
      const { width, height } = getAspectRatioSize();
      
      console.log(`生成リクエスト: アスペクト比=${imageAspectRatio}, サイズ=${width}x${height}`);
      
      // 新しいユーザーメッセージをチャット履歴に追加
      const newUserMessage = { role: 'user' as const, content: imagePrompt };
      const updatedChatMessages = [...chatMessages, newUserMessage];
      setChatMessages(updatedChatMessages);
      
      // Gemini APIで画像生成
      const response = await generateImageWithGemini(
        apiKey,
        imagePrompt,
        imageData,
        imageAspectRatio,
        chatMessages
      );
      
      if (response.image) {
        // 画像レスポンスがある場合
        setGeneratedImage(response.image);
        setProgress({ stage: 'Figmaに挿入中...', percentage: 80 });
        
        // Figmaに挿入リクエスト
        parent.postMessage(
          { 
            pluginMessage: { 
              type: 'insert-image', 
              imageData: response.image,
              width,
              height,
              aspectRatio: imageAspectRatio // アスペクト比情報も明示的に送信
            } 
          },
          '*'
        );
        
        // チャットインターフェースをリセット
        setShowChatInterface(false);
        setChatMessages([]);
      }
      
      if (response.text) {
        // テキストレスポンスがある場合、チャットインターフェースを表示
        const modelResponse = { role: 'model' as const, content: response.text };
        setChatMessages([...updatedChatMessages, modelResponse]);
        setShowChatInterface(true);
        setIsGeneratingImage(false);
      }
    } catch (err) {
      setImageGenerationError(`エラー: ${err instanceof Error ? err.message : String(err)}`);
      setIsGeneratingImage(false);
    }
  };
  
  // 継続的な会話用の送信ハンドラー
  const handleContinueChat = () => {
    if (!imagePrompt || isGeneratingImage) return;
    handleGenerateImage();
    setImagePrompt(''); // 入力欄をクリア
  };

  return {
    // 状態変数
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
    
    // メソッド
    getAspectRatioSize,
    handleGenerateImage,
    handleContinueChat
  };
}; 