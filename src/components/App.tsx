import * as React from 'react';
import PromptInput, { TemplateType, PromptItem } from './PromptInput';
import SelectionPreview from './SelectionPreview';
import TokenDisplay from './TokenDisplay';
import SVGPreview from './SVGPreview';
import ProgressIndicator from './ProgressIndicator';
import { callAIAPI, DEFAULT_MODELS, generateImageWithGemini } from '../services/gemini';
import { convertHtmlToSvg } from '../services/converter';
import { DesignTokens, SelectionInfo } from '../utils/types';
import JSZip from 'jszip';

// メインタブの状態型を拡張
type MainTabType = 'generation' | 'tokens' | 'settings' | 'image-generation';

const App: React.FC = () => {
  const [designTokens, setDesignTokens] = React.useState<DesignTokens | null>(null);
  const [selection, setSelection] = React.useState<SelectionInfo[]>([]);
  const [prompt, setPrompt] = React.useState('');
  const [htmlResult, setHtmlResult] = React.useState('');
  const [svgResult, setSvgResult] = React.useState('');
  const [svgSize, setSvgSize] = React.useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState({ stage: '', percentage: 0 });
  const [apiKey, setApiKey] = React.useState('');
  const [error, setError] = React.useState('');
  
  // モデル設定のステート変数
  const [selectedModelId, setSelectedModelId] = React.useState('gemini-2-5-pro');
  const [customModelId, setCustomModelId] = React.useState('');
  const [showCustomModelInput, setShowCustomModelInput] = React.useState(false);
  const [templateType, setTemplateType] = React.useState<TemplateType>('webdesign');
  
  // 生成サイズのステート変数
  const [generateWidth, setGenerateWidth] = React.useState<string>('auto');
  const [generateHeight, setGenerateHeight] = React.useState<string>('auto');
  const [autoSizeEnabled, setAutoSizeEnabled] = React.useState(true); // 自動サイズ設定の有効/無効
  
  // 選択要素の詳細取得設定
  const [includeChildren, setIncludeChildren] = React.useState<boolean>(false);
  const [includeImages, setIncludeImages] = React.useState<boolean>(false);
  
  // 設定パネル関連の状態
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = React.useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = React.useState<'general' | 'model' | 'prompt'>('general');
  
  // ベースプロンプト設定
  const [basePrompt, setBasePrompt] = React.useState('');
  const [isGeneratingBasePrompt, setIsGeneratingBasePrompt] = React.useState(false); // ベースプロンプト自動生成中フラグ
  
  // メインタブUI用の状態
  const [activeMainTab, setActiveMainTab] = React.useState<MainTabType>('generation');
  
  // HTMLコーディング用のプロンプト設定
  const [codingPrompt, setCodingPrompt] = React.useState('FLOCSS');
  
  // 画像生成関連の状態変数
  const [imagePrompt, setImagePrompt] = React.useState('');
  const [generatedImage, setGeneratedImage] = React.useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = React.useState('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [imageGenerationError, setImageGenerationError] = React.useState('');
  
  // チャット会話履歴
  const [chatMessages, setChatMessages] = React.useState<Array<{role: 'user' | 'model', content: string}>>([]);
  const [showChatInterface, setShowChatInterface] = React.useState(false);
  
  // 実際に使用するモデルID (カスタムか標準か)
  const actualModelId = showCustomModelInput ? customModelId : selectedModelId;
  
  // 一括生成のための状態変数
  const [promptItems, setPromptItems] = React.useState<PromptItem[]>([]);
  const [isBatchMode, setIsBatchMode] = React.useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = React.useState(0);
  const [isBatchGenerating, setIsBatchGenerating] = React.useState(false);
  const [generatedItems, setGeneratedItems] = React.useState<Array<{
    id: string;
    html: string;
    svg: string;
    width: number;
    height: number;
  }>>([]);
  const [lastInsertedNodeId, setLastInsertedNodeId] = React.useState<string | null>(null);
  
  // 選択要素からサイズ情報を取得する関数
  const getSelectionSize = (selectionItems: SelectionInfo[]): { width: string, height: string } | null => {
    if (!selectionItems || selectionItems.length === 0) {
      return null;
    }
    
    // 最初の選択要素のサイズを使用（複数選択の場合は最初の要素）
    const firstItem = selectionItems[0];
    
    // サイズ情報がある場合は文字列に変換して返す
    if (firstItem.width !== undefined && firstItem.height !== undefined) {
      return {
        width: Math.round(firstItem.width).toString(),
        height: Math.round(firstItem.height).toString()
      };
    }
    
    return null;
  };

  // コンポーネント初期化時にAPIキーを要求
  React.useEffect(() => {
    // プラグインがロードされたらAPIキーを要求
    const requestApiKey = () => {
      parent.postMessage(
        { pluginMessage: { type: 'get-api-key' } },
        '*'
      );
    };
    
    // すぐに要求し、また一定時間後にも再要求（初期化タイミングの問題対策）
    requestApiKey();
    const timer = setTimeout(requestApiKey, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // モデル設定をリクエスト
  React.useEffect(() => {
    const requestModelSettings = () => {
      parent.postMessage(
        { pluginMessage: { type: 'get-model-settings' } },
        '*'
      );
    };
    
    requestModelSettings();
    const timer = setTimeout(requestModelSettings, 600);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 選択要素が変更されたときに自動的にサイズを更新
  React.useEffect(() => {
    if (!isLoading && autoSizeEnabled) { // 生成中でなく、自動サイズ設定が有効な場合
      const size = getSelectionSize(selection);
      if (size) {
        setGenerateWidth(size.width);
        setGenerateHeight(size.height);
      }
    }
  }, [selection, isLoading, autoSizeEnabled]);

  // 一括生成中に次のプロンプトを処理する
  React.useEffect(() => {
    if (isBatchGenerating && currentBatchIndex < promptItems.length) {
      // 少し遅延を入れて処理を開始（UIの更新や挿入操作の完了を待つ）
      const timer = setTimeout(() => {
        handleBatchGenerate();
      }, 500);
      
      return () => clearTimeout(timer);
    } else if (isBatchGenerating && currentBatchIndex >= promptItems.length) {
      // 全ての項目が生成完了したとき
      setIsBatchGenerating(false);
      setCurrentBatchIndex(0);
      setProgress({ stage: '一括生成完了', percentage: 100 });
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [isBatchGenerating, currentBatchIndex, promptItems.length, lastInsertedNodeId]);
  
  // 設定変更時に保存する
  React.useEffect(() => {
    // 初期値の場合は保存しない（初期読み込みの無限ループ防止）
    if (selectedModelId === 'gemini-2-5-pro' && 
        customModelId === '' && 
        !showCustomModelInput && 
        generateWidth === 'auto' && 
        generateHeight === 'auto' && 
        !includeChildren &&
        !includeImages &&
        !apiKey &&
        !basePrompt &&
        autoSizeEnabled) {
      return;
    }
    
    // 設定保存
    parent.postMessage({
      pluginMessage: {
        type: 'save-model-settings',
        selectedModelId,
        customModelId,
        showCustomModelInput,
        generateWidth,
        generateHeight,
        includeChildren,
        includeImages,
        basePrompt,
        autoSizeEnabled
      }
    }, '*');
  }, [selectedModelId, customModelId, showCustomModelInput, generateWidth, generateHeight, includeChildren, includeImages, apiKey, basePrompt, autoSizeEnabled]);

  // Figmaからのメッセージをリッスン
  React.useEffect(() => {
    window.onmessage = (event) => {
      const message = event.data.pluginMessage;
      if (!message) return;

      if (message.type === 'init-data') {
        setDesignTokens(message.designTokens);
        setSelection(message.selection);
      } else if (message.type === 'selection-update') {
        setSelection(message.selection);
      } else if (message.type === 'updated-tokens') {
        setDesignTokens(message.designTokens);
      } else if (message.type === 'svg-inserted') {
        if (message.success) {
          if (isBatchGenerating) {
            // 一括生成モードの場合、次の項目に進む
            setLastInsertedNodeId(message.nodeId || null);
            setCurrentBatchIndex(prevIndex => prevIndex + 1);
          } else {
            // 通常モードの場合、完了メッセージを表示
            setProgress({ stage: 'SVG挿入完了', percentage: 100 });
            setTimeout(() => setIsLoading(false), 1000);
          }
        } else {
          setError(`SVG挿入エラー: ${message.error}`);
          setIsLoading(false);
          if (isBatchGenerating) {
            setIsBatchGenerating(false);
          }
        }
      } else if (message.type === 'image-inserted') {
        if (message.success) {
          setProgress({ stage: '画像挿入完了', percentage: 100 });
          setTimeout(() => setIsGeneratingImage(false), 1000);
        } else {
          setImageGenerationError(`画像挿入エラー: ${message.error}`);
          setIsGeneratingImage(false);
        }
      } else if (message.type === 'api-key-result') {
        // APIキーを受け取ったら状態を更新
        setApiKey(message.apiKey);
      } else if (message.type === 'model-settings-result') {
        // モデル設定を受け取ったら状態を更新
        const { settings } = message;
        setSelectedModelId(settings.selectedModelId);
        setCustomModelId(settings.customModelId);
        setShowCustomModelInput(settings.showCustomModelInput);
        setGenerateWidth(settings.generateWidth);
        setGenerateHeight(settings.generateHeight);
        setIncludeChildren(settings.includeChildren);
        setIncludeImages(settings.includeImages);
        setBasePrompt(settings.basePrompt || ''); // 新しい設定項目
        setAutoSizeEnabled(settings.autoSizeEnabled !== undefined ? settings.autoSizeEnabled : true); // 新しい設定項目
      } else if (message.type === 'page-data-result') {
        // ページデータを受け取ったら自動生成処理を実行
        generateBasePromptFromPageData(message.pageData);
      } else if (message.type === 'coding-prompt') {
        setCodingPrompt(message.codingPrompt || 'FLOCSS');
      } else if (message.type === 'coding-prompt-result') {
        setCodingPrompt(message.codingPrompt || 'FLOCSS');
      }
    };
  }, [apiKey, actualModelId, designTokens, isBatchGenerating, currentBatchIndex, promptItems.length]); // 依存配列に必要な変数を追加

  // APIキー変更時の処理
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    
    // APIキーをFigmaに保存
    parent.postMessage(
      { pluginMessage: { type: 'save-api-key', apiKey: newApiKey } },
      '*'
    );
  };
  
  // 自動サイズ設定の切り替え処理
  const handleAutoSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSizeEnabled(e.target.checked);
  };
  
  // テンプレートタイプが変更されたときのハンドラー
  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type);
    // ベーステンプレートでプロンプトを更新
    // setPrompt(getBasePromptForTemplate(type));
  };
  
  // ページデータを要求する
  const requestPageData = () => {
    parent.postMessage(
      { pluginMessage: { type: 'get-page-data' } },
      '*'
    );
  };
  
  // ベースプロンプト自動生成ボタンのクリックハンドラー
  const handleAutoGenerateBasePrompt = () => {
    if (!apiKey) {
      setError('APIキーが設定されていません');
      return;
    }
    
    setIsGeneratingBasePrompt(true);
    setError('');
    
    // ページデータを要求（レスポンスはonmessageイベントで処理）
    requestPageData();
  };
  
  // ページデータを使ってベースプロンプトを生成する
  const generateBasePromptFromPageData = async (pageData: any) => {
    try {
      // 選択されている要素の画像データを取得（存在する場合）
      // 現在の選択要素を使用するか、pageDataのトップレベルのフレームを使用
      const elementsForContext = selection.length > 0 ? selection : 
                                (pageData.children || []).map((frame: any) => ({
                                  id: frame.id,
                                  name: frame.name,
                                  type: frame.type,
                                  imageData: frame.imageData // imageDataがpageDataに含まれている場合
                                }));
      
      // AIにプロンプト生成を依頼
      const generationPrompt = `
      次のデザイン情報に基づいて、HTMLとCSSを生成するためのベースプロンプトを作成してください。
      
      # 現在のデザイン情報
      ${JSON.stringify(designTokens, null, 2)}
      
      # 現在のページデータ
      ${JSON.stringify(pageData, null, 2)}
      
      # 指示
      - 色使い、フォントスタイル、レイアウトの特徴、全体的なデザイントーンを含めてください
      - デザインの一貫性を保つための重要なポイントを記述してください
      - 具体的かつ簡潔に記述してください
      - 長すぎず、短すぎないプロンプトを作成してください(200-300文字程度)
      - 日本語で出力してください
      - HTMLコードは出力しないでください。あくまでも今後生成するHTMLコードのデザインのベースとなるベースプロンプトを出力してください
      
      フォーマットは普通のテキストで、特別なマークアップなしで出力してください。
      `;
      
      const generatedPrompt = await callAIAPI(
        apiKey, 
        actualModelId, 
        null, // デザイントークンは既にプロンプトに含まれている
        generationPrompt,
        elementsForContext, // 選択要素または主要フレームの情報を渡す
        'webdesign'
      );
      
      // HTML/コードブロックなど余計なものが含まれている場合は除去
      let cleanedPrompt = generatedPrompt;
      
      // ```htmlなどのマークダウンコードブロックを削除
      cleanedPrompt = cleanedPrompt.replace(/```[a-z]*\n[\s\S]*?```/g, '');
      
      // HTMLタグを削除
      cleanedPrompt = cleanedPrompt.replace(/<[^>]*>/g, '');
      
      // 前後の空白を削除
      cleanedPrompt = cleanedPrompt.trim();
      
      // 生成されたプロンプトをセット
      setBasePrompt(cleanedPrompt);
      
    } catch (err) {
      setError(`プロンプト生成エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingBasePrompt(false);
    }
  };

  // テンプレートタイプに基づいてベースプロンプトを生成する関数
  const getBasePromptForTemplate = (type: TemplateType): string => {
    switch (type) {
      case 'webdesign':
        return 'モダンでレスポンシブなウェブページを作成してください。';
      case 'presentation':
        return 'シンプルで見やすいプレゼンテーションスライドを作成してください。';
      case 'diagram':
        return '明確で分かりやすい図表を作成してください。';
      case 'wireframe':
        return '白黒のシンプルなワイヤーフレーム/構成ラフを作成してください。画像やアイコンが入る場所にはプレースホルダーを配置してください。';
      default:
        return '';
    }
  };
  
  // 幅の入力変更ハンドラー
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // autoの場合はそのまま、数値の場合は数値のみ許可
    if (value !== 'auto' && !/^\d*$/.test(value)) {
      return;
    }
    
    setGenerateWidth(value);
  };
  
  // 高さの入力変更ハンドラー
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // autoの場合はそのまま、数値の場合は数値のみ許可
    if (value !== 'auto' && !/^\d*$/.test(value)) {
      return;
    }
    
    setGenerateHeight(value);
  };
  
  // 選択要素の詳細取得設定変更ハンドラー
  const handleSelectionSettingsChange = (setting: 'children' | 'images', value: boolean) => {
    if (setting === 'children') {
      setIncludeChildren(value);
    } else if (setting === 'images') {
      setIncludeImages(value);
    }
    
    // 設定を保存して選択情報を更新
    parent.postMessage({
      pluginMessage: {
        type: 'update-selection-settings',
        includeChildren: setting === 'children' ? value : includeChildren,
        includeImages: setting === 'images' ? value : includeImages
      }
    }, '*');
  };
  
  // ベースプロンプト変更ハンドラー
  const handleBasePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBasePrompt(e.target.value);
  };

  // コーディングプロンプト変更ハンドラー
  const handleCodingPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodingPrompt(e.target.value);
    
    // Figmaにコーディングプロンプトを保存
    parent.postMessage({
      pluginMessage: {
        type: 'save-coding-prompt',
        codingPrompt: e.target.value
      }
    }, '*');
  };

  // 生成処理
  const handleGenerate = async () => {
    if (!apiKey) {
      setError('APIキーが設定されていません');
      return;
    }
    
    if (!prompt) {
      setError('プロンプトを入力してください');
      return;
    }
    
    if (showCustomModelInput && !customModelId) {
      setError('カスタムモデルIDを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setHtmlResult('');
    setSvgResult('');
    setSvgSize({ width: 0, height: 0 });
    
    try {
      // プログレス更新
      setProgress({ stage: 'AIによるHTML生成中...', percentage: 20 });
      
      // AIモデルによるHTML生成（ベースプロンプトがあれば追加）
      const finalPrompt = basePrompt ? `${basePrompt}\n\n${prompt}` : prompt;
      const htmlContent = await callAIAPI(
        apiKey, 
        actualModelId, 
        designTokens, 
        finalPrompt,
        selection,
        templateType,
        templateType === 'coding' ? codingPrompt : undefined // コーディングモードの場合、カスタムプロンプトを渡す
      );
      setHtmlResult(htmlContent);
      
      setProgress({ stage: 'HTMLをSVGに変換中...', percentage: 60 });
      
      // 幅と高さの処理
      const widthParam = generateWidth === 'auto' ? undefined : generateWidth;
      const heightParam = generateHeight === 'auto' ? undefined : generateHeight;
      
      // HTMLをSVGに変換
      const svgResult = await convertHtmlToSvg(
        htmlContent, 
        designTokens,
        widthParam,
        heightParam
      );
      setSvgResult(svgResult.svg);
      setSvgSize({ width: svgResult.width, height: svgResult.height });
      
      setProgress({ stage: 'Figmaに挿入中...', percentage: 80 });
      
      // Figmaに挿入リクエスト（SVGとサイズ情報も一緒に送信）
      parent.postMessage(
        { 
          pluginMessage: { 
            type: 'insert-svg', 
            svg: svgResult.svg,
            width: svgResult.width,
            height: svgResult.height
          } 
        },
        '*'
      );
    } catch (err) {
      setError(`エラー: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  // 生成データを個別にダウンロードする関数
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    // Blobオブジェクトを作成
    const blob = new Blob([content], { type: contentType });
    // オブジェクトURLを作成
    const url = URL.createObjectURL(blob);
    
    // aタグを作成してダウンロードリンクとして使用
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    // オブジェクトURLを解放
    URL.revokeObjectURL(url);
  };
  
  // 一括生成データをZIPファイルとしてダウンロードする関数
  const handleDownloadAllAsZip = async () => {
    try {
      if (generatedItems.length === 0) {
        setError('ダウンロードするデータがありません');
        return;
      }
      
      // JSZipインスタンス作成
      const zip = new JSZip();
      
      // 各生成アイテムをZIPに追加
      generatedItems.forEach((item, index) => {
        // プロンプトアイテムを検索して、そのタイトルを取得
        const promptItem = promptItems.find(p => p.id === item.id);
        const title = promptItem?.title || `画面${index + 1}`;
        const safeTitle = title.replace(/[^\w\s]/gi, '_'); // ファイル名に使えない文字を置換
        
        // SVGファイルを追加
        zip.file(`${safeTitle}.svg`, item.svg);
        
        // HTMLファイルを追加
        zip.file(`${safeTitle}.html`, item.html);
      });
      
      // ZIPを生成してダウンロード
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-content-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      
      // オブジェクトURLを解放
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`ZIP生成エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // 一括生成の開始処理
  const handleStartBatchGeneration = () => {
    if (!apiKey) {
      setError('APIキーが設定されていません');
      return;
    }
    
    if (promptItems.length === 0) {
      setError('プロンプトが設定されていません');
      return;
    }
    
    if (showCustomModelInput && !customModelId) {
      setError('カスタムモデルIDを入力してください');
      return;
    }
    
    // 生成開始
    setIsLoading(true);
    setError('');
    setHtmlResult('');
    setSvgResult('');
    setSvgSize({ width: 0, height: 0 });
    setGeneratedItems([]);
    setCurrentBatchIndex(0);
    setIsBatchGenerating(true);
    
    // 最初のプロンプトの生成は自動的に開始される（useEffect内）
  };
  
  // バッチ内の次のプロンプトを生成する処理
  const handleBatchGenerate = async () => {
    if (currentBatchIndex >= promptItems.length) {
      setIsBatchGenerating(false);
      setCurrentBatchIndex(0);
      setProgress({ stage: '一括生成完了', percentage: 100 });
      setTimeout(() => setIsLoading(false), 1000);
      return;
    }
    
    const currentItem = promptItems[currentBatchIndex];
    if (!currentItem || !currentItem.content) {
      // 内容がない場合はスキップ
      setCurrentBatchIndex(prevIndex => prevIndex + 1);
      return;
    }
    
    try {
      // プログレス表示を更新
      setProgress({ 
        stage: `${currentItem.title || `プロンプト ${currentBatchIndex + 1}`} を処理中... (${currentBatchIndex + 1}/${promptItems.length})`, 
        percentage: Math.round((currentBatchIndex / promptItems.length) * 100) 
      });
      
      // 過去に生成したアイテムを参照するためのコンテキスト情報を構築
      let contextInfo = '';
      if (generatedItems.length > 0) {
        contextInfo = `
        これまでに生成した画面情報:
        ${generatedItems.map((item, idx) => {
          const prompt = promptItems.find(p => p.id === item.id);
          return `画面${idx + 1}: ${prompt?.title || 'タイトルなし'} - ${prompt?.content || '詳細なし'}`;
        }).join('\n')}
        
        上記の画面と一貫性のあるデザインで、以下の画面を作成してください。
        `;
      }
      
      // AIモデルによるHTML生成（ベースプロンプト + コンテキスト情報 + 現在のプロンプト）
      const finalPrompt = basePrompt 
        ? `${basePrompt}\n\n${contextInfo}\n\n${currentItem.content}` 
        : `${contextInfo}\n\n${currentItem.content}`;
      
      const htmlContent = await callAIAPI(
        apiKey, 
        actualModelId, 
        designTokens, 
        finalPrompt,
        selection,
        templateType,
        templateType === 'coding' ? codingPrompt : undefined // コーディングモードの場合、カスタムプロンプトを渡す
      );
      
      // 幅と高さの処理
      const widthParam = generateWidth === 'auto' ? undefined : generateWidth;
      const heightParam = generateHeight === 'auto' ? undefined : generateHeight;
      
      // HTMLをSVGに変換
      const svgResult = await convertHtmlToSvg(
        htmlContent, 
        designTokens,
        widthParam,
        heightParam
      );
      
      // 生成結果を保存
      setGeneratedItems(prev => [
        ...prev, 
        {
          id: currentItem.id,
          html: htmlContent,
          svg: svgResult.svg,
          width: svgResult.width,
          height: svgResult.height
        }
      ]);
      
      // 最新の生成結果を表示用に設定
      setHtmlResult(htmlContent);
      setSvgResult(svgResult.svg);
      setSvgSize({ width: svgResult.width, height: svgResult.height });
      
      // Figmaに挿入リクエスト（SVGとサイズ情報、一括生成フラグも一緒に送信）
      parent.postMessage(
        { 
          pluginMessage: { 
            type: 'insert-svg', 
            svg: svgResult.svg,
            width: svgResult.width,
            height: svgResult.height,
            isBatchGeneration: true,
            batchItemTitle: currentItem.title,
            batchIndex: currentBatchIndex,
            batchTotal: promptItems.length
          } 
        },
        '*'
      );
      
      // 注: 次のプロンプトへの移行はFigmaからの挿入完了メッセージ受信時に行う
      
    } catch (err) {
      setError(`エラー (${currentItem.title}): ${err instanceof Error ? err.message : String(err)}`);
      setIsBatchGenerating(false);
      setIsLoading(false);
    }
  };

  // 使用中のモデルプロバイダー名を取得
  const getCurrentProviderName = () => {
    if (showCustomModelInput) {
      return 'OpenRouter';
    }
    const model = DEFAULT_MODELS.find(m => m.id === selectedModelId);
    return model?.provider === 'gemini' ? 'Google Gemini' : 'OpenRouter';
  };

  // 生成タブのコンテンツをレンダリングする関数
  const renderGenerationTab = () => {
    return (
      <div className="space-y-2">
        {/* 生成サイズ設定 */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-3">生成サイズ設定</h3>
          <div className="flex flex-row md:flex-row gap-4 mb-2">
            <div className="flex items-center gap-2">
              <label htmlFor="width-input" className="text-sm font-medium text-gray-700 min-w-12">幅:</label>
              <div className="relative flex items-center">
                <input
                  id="width-input"
                  type="text"
                  value={generateWidth}
                  onChange={handleWidthChange}
                  placeholder="auto"
                  disabled={isLoading}
                  className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
                />
                <span className="absolute right-3 text-gray-500">px</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="height-input" className="text-sm font-medium text-gray-700 min-w-12">高さ:</label>
              <div className="relative flex items-center">
                <input
                  id="height-input"
                  type="text"
                  value={generateHeight}
                  onChange={handleHeightChange}
                  placeholder="auto"
                  disabled={isLoading}
                  className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
                />
                <span className="absolute right-3 text-gray-500">px</span>
              </div>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="auto-size"
              checked={autoSizeEnabled}
              onChange={handleAutoSizeChange}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto-size" className="ml-2 text-xs text-gray-700">
              選択要素のサイズを自動設定 <span className="text-xs text-gray-500 mt-1">
            ※ 'auto' または数値を入力してください
          </span>
            </label>
          </div>
          
        </div>
        
        {/* 選択要素の詳細取得設定 */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-3">選択要素の詳細取得設定</h3>
          <div className="mb-2">
            <div className="flex gap-x-3 mb-2">
              <div className="flex justify-center items-center">
                <input
                  type="checkbox"
                  checked={includeChildren}
                  onChange={(e) => handleSelectionSettingsChange('children', e.target.checked)}
                  disabled={isLoading}
                  id="include-children"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="text-right">
                <label htmlFor="include-children" className="text-sm text-gray-700 cursor-pointer">
                  選択要素をレイヤーをデータとして取得
                </label>
              </div>
            </div>
            
            <div className="flex gap-x-3">
              <div className="flex justify-center items-center">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => handleSelectionSettingsChange('images', e.target.checked)}
                  disabled={isLoading}
                  id="include-images"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="text-right">
                <label htmlFor="include-images" className="text-sm text-gray-700 cursor-pointer">
                  選択要素を画像として取得
                </label>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ 大きな要素や複雑な構造の場合、処理に時間がかかることがあります
          </p>
        </div>

        {/* 選択要素プレビュー */}
        <div>
          <SelectionPreview selection={selection} />
        </div>
        
        {/* プロンプト入力 */}
        <div>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onGenerate={handleGenerate}
            disabled={isLoading}
            templateType={templateType}
            onTemplateTypeChange={setTemplateType}
            promptItems={promptItems}
            onPromptItemsChange={setPromptItems}
            onBatchGenerate={handleStartBatchGeneration}
            isBatchMode={isBatchMode}
            onBatchModeChange={setIsBatchMode}
          />
        </div>
        
        {/* バッチ生成情報表示 */}
        {isBatchGenerating && (
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <h3 className="text-base font-medium text-gray-800 mb-2">一括生成状況</h3>
            <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
              <span>現在の処理:</span>
              <span>{promptItems[currentBatchIndex]?.title || '処理中...'}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>進捗状況:</span>
              <span>{currentBatchIndex} / {promptItems.length} 完了</span>
            </div>
          </div>
        )}
        
        {/* 一括生成結果ダウンロード */}
        {!isBatchGenerating && generatedItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-800">一括生成結果</h3>
              <button
                onClick={handleDownloadAllAsZip}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>すべてZIPでダウンロード</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              生成されたファイル: {generatedItems.length}件
            </p>
            <ul className="mt-2 space-y-1 text-xs text-gray-500 max-h-32 overflow-y-auto">
              {generatedItems.map((item, index) => {
                const promptItem = promptItems.find(p => p.id === item.id);
                return (
                  <li key={item.id} className="flex justify-between">
                    <span>{promptItem?.title || `画面${index + 1}`}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadFile(item.svg, `${promptItem?.title || `screen-${index + 1}`}.svg`, 'image/svg+xml')}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        SVG
                      </button>
                      <button
                        onClick={() => downloadFile(item.html, `${promptItem?.title || `screen-${index + 1}`}.html`, 'text/html')}
                        className="text-green-500 hover:text-green-700"
                      >
                        HTML
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        {/* 進捗表示 */}
        {isLoading && (
          <div>
            <ProgressIndicator stage={progress.stage} percentage={progress.percentage} />
          </div>
        )}
        
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md">
            {error}
          </div>
        )}
        
        {/* 結果プレビュー */}
        {svgResult && (
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <SVGPreview svg={svgResult} html={htmlResult} />
            {svgSize.width > 0 && svgSize.height > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                SVGサイズ: {svgSize.width} × {svgSize.height} px
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // デザイントークンタブのコンテンツをレンダリングする関数
  const renderTokensTab = () => {
    return (
      <div>
        <TokenDisplay tokens={designTokens} />
      </div>
    );
  };
  
  // 設定タブのコンテンツをレンダリングする関数
  const renderSettingsTab = () => {
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

  // 画像生成タブのコンテンツをレンダリングする関数
  const renderImageGenerationTab = () => {
    // 画像をアスペクト比に基づいてサイズ調整
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

  return (
    <div className="mx-auto p-2 pt-0  max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold mb-4 text-gray-800 flex gap-2 items-center">
          <span className="text-sm bg-slate-800 text-white rounded-sm flex items-center justify-center w-7 h-7 mr-0">GG</span>
          AI Generator
        </h1>
      {/* メインタブUI */}
        <div className="mb-2">
        <div className="flex border-b border-gray-200">
          <button 
              className={`px-3 py-2 text-xs font-medium transition-colors ${activeMainTab === 'generation' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveMainTab('generation')}
          >
            生成
          </button>
          <button 
              className={`px-3 py-2 text-xs font-medium transition-colors ${activeMainTab === 'image-generation' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveMainTab('image-generation')}
          >
            画像生成
          </button>
          <button 
              className={`px-3 py-2 text-xs font-medium transition-colors ${activeMainTab === 'tokens' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveMainTab('tokens')}
          >
            デザイントークン
          </button>
          <button 
              className={`px-3 py-2 text-xs font-medium transition-colors ${activeMainTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveMainTab('settings')}
          >
            設定
          </button>
          </div>
        </div>
      </div>
      
      {/* タブコンテンツ */}
      <div>
        {activeMainTab === 'generation' && renderGenerationTab()}
        {activeMainTab === 'image-generation' && renderImageGenerationTab()}
        {activeMainTab === 'tokens' && renderTokensTab()}
        {activeMainTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default App; 