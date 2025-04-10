import * as React from 'react';
import PromptInput, { TemplateType, PromptItem } from './PromptInput';
import SelectionPreview from './SelectionPreview';
import TokenDisplay from './TokenDisplay';
import SVGPreview from './SVGPreview';
import ProgressIndicator from './ProgressIndicator';
import SettingsTab from './SettingsTab';
import ImageGenerationTab from './ImageGenerationTab';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { callAIAPI, DEFAULT_MODELS } from '../services/gemini';
import { convertHtmlToSvg } from '../services/converter';
import { DesignTokens, SelectionInfo, CodeGenerationOptions } from '../utils/types';
import { createAndDownloadZip, processHtmlWithPrefixes, extractImagesFromSelection, updateHtmlWithImagePaths, mergeCssFiles } from '../utils/codeHelper';
import JSZip from 'jszip';
import ResearchTab from './ResearchTab';

// メインタブの状態型を拡張
type MainTabType = 'generation' | 'tokens' | 'settings' | 'image-generation' | 'research';

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
  
  // コーディングモード専用の直接出力設定
  const [directCodeOutput, setDirectCodeOutput] = React.useState<boolean>(false);
  const [codePrefix, setCodePrefix] = React.useState<string>('component');
  const [addCodePrefix, setAddCodePrefix] = React.useState<boolean>(true);
  const [useBEMNotation, setUseBEMNotation] = React.useState<boolean>(true);
  const [mergeCssInBatch, setMergeCssInBatch] = React.useState<boolean>(true);
  
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
    svg?: string;
    css?: string;
    fullContent?: string;
    width: number;
    height: number;
  }>>([]);
  const [lastInsertedNodeId, setLastInsertedNodeId] = React.useState<string | null>(null);
  
  // バッチ処理中に画像を蓄積する新しい状態変数を追加
  const [batchImageAssets, setBatchImageAssets] = React.useState<Array<{id: string, name: string, data: string}>>([]);
  
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
        } else {
          setError(`画像挿入エラー: ${message.error}`);
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
      
      // コーディングモードの場合、詳細な選択情報を改めて取得
      let currentSelection = selection;
      if (templateType === 'coding') {
        // 詳細選択情報を取得するためのメッセージを送信
        parent.postMessage(
          { 
            pluginMessage: { 
              type: 'get-selection-with-template-type',
              templateType: 'coding'
            } 
          },
          '*'
        );
        
        // 選択情報を受け取るための処理
        const selectionPromise = new Promise<SelectionInfo[]>((resolve) => {
          const messageHandler = (event: MessageEvent) => {
            const message = event.data.pluginMessage;
            if (message && message.type === 'selection-with-template-type-result') {
              window.removeEventListener('message', messageHandler);
              resolve(message.selection);
            }
          };
          
          window.addEventListener('message', messageHandler);
          
          // タイムアウト処理（5秒後にデフォルト値で解決）
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            resolve(selection); // タイムアウトした場合は現在の選択情報を使用
          }, 5000);
        });
        
        // 選択情報を待機
        currentSelection = await selectionPromise;
        console.log('コーディングモードで詳細な選択情報を取得:', currentSelection);
      }
      
      // AIモデルによるHTML生成（ベースプロンプトがあれば追加）
      const finalPrompt = basePrompt ? `${basePrompt}\n\n${prompt}` : prompt;
      const htmlContent = await callAIAPI(
        apiKey, 
        actualModelId, 
        designTokens, 
        finalPrompt,
        currentSelection,
        templateType,
        templateType === 'coding' ? codingPrompt : undefined // コーディングモードの場合、カスタムプロンプトを渡す
      );
      setHtmlResult(htmlContent);
      
      // この部分を条件分岐で変更
      if (templateType === 'coding' && directCodeOutput) {
        // コーディングモード + 直接出力の場合
        setProgress({ stage: 'HTML/CSSを処理中...', percentage: 60 });
        
        // プレフィックス設定
        const codeOptions: CodeGenerationOptions = {
          addPrefix: addCodePrefix,
          prefix: codePrefix,
          useBEM: useBEMNotation,
          mergeCss: mergeCssInBatch
        };
        
        // HTML/CSSを処理
        const { html, css } = processHtmlWithPrefixes(htmlContent, codeOptions);
        
        let processedHtml = html;
        let imageAssets: Array<{id: string, name: string, data: string}> = [];
        
        // 画像アセットの抽出が必要な場合
        if (includeImages && currentSelection.length > 0) {
          setProgress({ stage: '画像アセットを処理中...', percentage: 70 });
          
          try {
            console.log(`Extracting images for single generation...`);
            // 選択要素から画像をエクスポート
            const imageAssets = await extractImagesFromSelection(currentSelection);
            
            console.log(`Extracted ${imageAssets.length} images`);
            
            // HTMLのimg要素のsrc属性を更新
            if (imageAssets.length > 0) {
              processedHtml = updateHtmlWithImagePaths(html, imageAssets, false);
            } else {
              console.warn('No images found in selection');
            }
          } catch (imgError) {
            console.error('Image processing error:', imgError);
            // エラーがあっても処理は続行
          }
        }
        
        // 生成結果を保存
        const files = [
          { name: 'index.html', content: processedHtml },
          { name: 'style.css', content: css }
        ];
        
        // ダウンロード処理（画像を含める）
        await createAndDownloadZip(files, 'generated-code', imageAssets);
        
        setProgress({ stage: 'コード生成完了', percentage: 100 });
        setTimeout(() => setIsLoading(false), 1000);
      } else {
        // 通常のSVG出力処理（既存コード）
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
      }
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
        
        // HTMLファイルを追加
        zip.file(`${safeTitle}.html`, item.html);

        // SVGファイルがある場合は追加
        if (item.svg) {
          zip.file(`${safeTitle}.svg`, item.svg);
        }
        
        // CSSファイルがある場合は追加
        if (item.css) {
          zip.file(`${safeTitle}.css`, item.css);
        }
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
    
    // 追加: 画像アセットをリセット
    setBatchImageAssets([]);
    
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
      // バッチ処理のデバッグログ追加
      console.group(`Batch generation - Item ${currentBatchIndex + 1}/${promptItems.length}`);
      console.log('Processing prompt:', currentItem.title);
      console.log('Selection info count:', selection.length);
      console.log('Template type:', templateType);
      console.log('Direct code output:', directCodeOutput);
      console.log('Merge CSS in batch:', mergeCssInBatch);
      console.log('Include images:', includeImages);
      
      // プログレス表示を更新
      setProgress({ 
        stage: `${currentItem.title || `プロンプト ${currentBatchIndex + 1}`} を処理中... (${currentBatchIndex + 1}/${promptItems.length})`, 
        percentage: Math.round((currentBatchIndex / promptItems.length) * 100) 
      });
      
      // コーディングモードの場合、詳細な選択情報を改めて取得
      let currentSelection = selection;
      if (templateType === 'coding') {
        // プロンプト項目に選択レイヤーIDが指定されている場合
        if (currentItem.selectedLayerId) {
          // レイヤー固有の選択情報を取得するためのメッセージを送信
          parent.postMessage(
            { 
              pluginMessage: { 
                type: 'get-layer-selection-info',
                layerId: currentItem.selectedLayerId,
                includeChildren,
                includeImages
              } 
            },
            '*'
          );
          
          // レイヤー情報を受け取るための処理
          const layerInfoPromise = new Promise<SelectionInfo[]>((resolve) => {
            const messageHandler = (event: MessageEvent) => {
              const message = event.data.pluginMessage;
              if (message && message.type === 'layer-selection-info-result' && 
                  message.layerId === currentItem.selectedLayerId) {
                window.removeEventListener('message', messageHandler);
                resolve(message.selectionInfo);
              }
            };
            
            window.addEventListener('message', messageHandler);
            
            // タイムアウト処理（5秒後にデフォルト値で解決）
            setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              resolve(selection); // タイムアウトした場合は現在の選択情報を使用
            }, 5000);
          });
          
          // レイヤー情報を待機
          const layerSelectionInfo = await layerInfoPromise;
          if (layerSelectionInfo && layerSelectionInfo.length > 0) {
            currentSelection = layerSelectionInfo;
            console.log(`プロンプト "${currentItem.title}" 用のレイヤー情報を取得:`, currentSelection);
          }
        } else {
          // 詳細選択情報を取得するためのメッセージを送信
          parent.postMessage(
            { 
              pluginMessage: { 
                type: 'get-selection-with-template-type',
                templateType: 'coding'
              } 
            },
            '*'
          );
          
          // 選択情報を受け取るための処理
          const selectionPromise = new Promise<SelectionInfo[]>((resolve) => {
            const messageHandler = (event: MessageEvent) => {
              const message = event.data.pluginMessage;
              if (message && message.type === 'selection-with-template-type-result') {
                window.removeEventListener('message', messageHandler);
                resolve(message.selection);
              }
            };
            
            window.addEventListener('message', messageHandler);
            
            // タイムアウト処理（5秒後にデフォルト値で解決）
            setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              resolve(selection); // タイムアウトした場合は現在の選択情報を使用
            }, 5000);
          });
          
          // 選択情報を待機
          currentSelection = await selectionPromise;
          console.log('コーディングモード（バッチ）で詳細な選択情報を取得:', currentSelection);
        }
      }
      
      // 過去に生成したアイテムを参照するためのコンテキスト情報を構築
      let contextInfo = '';
      if (generatedItems.length > 0) {
        // 画面情報の概要
        contextInfo = `
        これまでに生成した画面情報:
        ${generatedItems.map((item, idx) => {
          const prompt = promptItems.find(p => p.id === item.id);
          return `画面${idx + 1}: ${prompt?.title || 'タイトルなし'} - ${prompt?.content || '詳細なし'}`;
        }).join('\n')}
        
        // 以前生成したHTML/CSSコードのサンプル（クラス命名の参考用）
        ${generatedItems.slice(0, 2).map((item, idx) => {
          const prompt = promptItems.find(p => p.id === item.id);
          return `
          === ${prompt?.title || `画面${idx + 1}`}のHTMLサンプル ===
          \`\`\`html
          ${item.html ? item.html.substring(0, 1500) + (item.html.length > 1500 ? '...(省略)' : '') : '(HTMLなし)'}
          \`\`\`
          
          === ${prompt?.title || `画面${idx + 1}`}のCSSサンプル ===
          \`\`\`css
          ${item.css ? item.css.substring(0, 1500) + (item.css.length > 1500 ? '...(省略)' : '') : '(CSSなし)'}
          \`\`\`
          `;
        }).join('\n')}
        
        上記の画面と一貫性のあるデザインで、以下の画面を作成してください。
        
        コンポーネント命名規則についての重要な指示:
        1. 同じ機能・役割を持つコンポーネントには、必ず同じクラス名を使用してください（例: ヘッダー、フッター、ナビゲーションなど）
        2. 異なる機能・役割のコンポーネントには、異なるクラス名を使用してください
        3. 以前のコードで使用されたクラス命名パターンを継続してください
        4. クラス名は命名規則の一貫性を保ち、同じプレフィックスやサフィックスのパターンを維持してください
        5. 特に共通要素（ボタン、フォーム要素、カード、セクションなど）の命名は統一してください
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
        currentSelection,
        templateType,
        templateType === 'coding' ? codingPrompt : undefined // コーディングモードの場合、カスタムプロンプトを渡す
      );
      
      // コーディングモード + 直接出力の場合の処理
      if (templateType === 'coding' && directCodeOutput) {
        setProgress({ 
          stage: `HTML/CSSを処理中... (${currentBatchIndex + 1}/${promptItems.length})`, 
          percentage: 60 
        });
        
        // プレフィックス設定
        const componentName = currentItem.title.toLowerCase().replace(/\s+/g, '-') || `screen-${currentBatchIndex + 1}`;
        const codeOptions: CodeGenerationOptions = {
          addPrefix: addCodePrefix,
          prefix: codePrefix,
          useBEM: useBEMNotation,
          mergeCss: mergeCssInBatch
        };
        
        // HTML/CSSを処理 - バッチアイテムであることを示すフラグを追加
        const { html, css } = processHtmlWithPrefixes(
          htmlContent, 
          codeOptions,
          true,  // バッチアイテムであることを示す
          mergeCssInBatch  // 共通CSSを使用するかどうか
        );
        
        let processedHtml = html;
        let imageAssets: Array<{id: string, name: string, data: string}> = [];
        
        // 画像アセットの抽出が必要な場合（バッチ処理用）
        if (includeImages && currentSelection.length > 0) {
          try {
            console.log(`Extracting images for prompt "${currentItem.title}"...`);
            // 選択要素から画像をエクスポート
            const currentImageAssets = await extractImagesFromSelection(currentSelection);
            
            console.log(`Extracted ${currentImageAssets.length} images for prompt "${currentItem.title}"`);
            
            // 画像アセットを変数に保存
            imageAssets = currentImageAssets;
            
            // HTMLのimg要素のsrc属性を更新 - 共通フォルダフラグを追加
            if (currentImageAssets.length > 0) {
              processedHtml = updateHtmlWithImagePaths(html, currentImageAssets, mergeCssInBatch);
              
              // 画像アセットを累積
              setBatchImageAssets(prev => {
                // 重複を避けるため、既に同じIDの画像がある場合は置き換える
                const newAssets = [...prev];
                currentImageAssets.forEach(asset => {
                  const existingIndex = newAssets.findIndex(a => a.id === asset.id);
                  if (existingIndex >= 0) {
                    newAssets[existingIndex] = asset;
                  } else {
                    newAssets.push(asset);
                  }
                });
                console.log(`Updated batch image assets, now have ${newAssets.length} images in total`);
                return newAssets;
              });
            } else {
              console.warn(`No images found in selection for prompt "${currentItem.title}"`);
            }
          } catch (imgError) {
            console.error(`Image processing error for prompt "${currentItem.title}":`, imgError);
            // エラーがあっても処理は続行
          }
        }
        
        // 生成結果を追加
        setGeneratedItems(prev => [
          ...prev, 
          {
            id: currentItem.id,
            html: processedHtml,
            css,
            fullContent: htmlContent,
            width: 0,
            height: 0
          }
        ]);
        
        // 最後のアイテムの場合はZIPをダウンロード
        if (currentBatchIndex === promptItems.length - 1) {
          // 最後のアイテム処理前のログ
          console.log('Processing final item, preparing ZIP');
          
          // CSSマージオプションに応じて処理
          const batchFiles: Array<{ name: string, content: string }> = [];
          const currentGeneratedItems = [...generatedItems, {
            id: currentItem.id,
            html: processedHtml,
            css,
            fullContent: htmlContent,
            width: 0,
            height: 0
          }];
          
          if (mergeCssInBatch) {
            // HTMLファイルの準備
            currentGeneratedItems.forEach((item, idx) => {
              const promptItem = promptItems.find(p => p.id === item.id);
              const title = promptItem?.title || `screen-${idx + 1}`;
              batchFiles.push({ name: `${title}/index.html`, content: item.html });
            });
            
            // すべてのCSSを統合
            const allCss = currentGeneratedItems.map(item => item.css || '');
            batchFiles.push({ name: 'common/style.css', content: mergeCssFiles(allCss) });
            
            console.log('Created common CSS file for all HTML files');
          } else {
            // 個別CSSとして保存
            currentGeneratedItems.forEach((item, idx) => {
              const promptItem = promptItems.find(p => p.id === item.id);
              const title = promptItem?.title || `screen-${idx + 1}`;
              batchFiles.push(
                { name: `${title}/index.html`, content: item.html },
                { name: `${title}/style.css`, content: item.css || '' }
              );
            });
            
            console.log('Created individual CSS files for each HTML file');
          }
          
          console.log(`Total files to be added: ${batchFiles.length}`);
          console.log(`Total batch images to be added: ${batchImageAssets.length}`);
          
          // 蓄積した画像アセットを使用してZIPを作成
          await createAndDownloadZip(batchFiles, 'generated-code-batch', batchImageAssets);
          
          setProgress({ stage: '一括生成完了', percentage: 100 });
          setTimeout(() => {
            setIsLoading(false);
            setIsBatchGenerating(false);
            setCurrentBatchIndex(0);
          }, 1000);
        } else {
          // 次のプロンプトへ
          setCurrentBatchIndex(prevIndex => prevIndex + 1);
        }
      } else {
        // 通常のSVG出力処理（既存コード）
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
        
      }
      
      // ロギンググループを終了
      console.groupEnd();
    } catch (err) {
      console.error(`Error processing prompt "${currentItem.title}":`, err);
      setError(`エラー (${currentItem.title}): ${err instanceof Error ? err.message : String(err)}`);
      setIsBatchGenerating(false);
      setIsLoading(false);
      console.groupEnd();
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
                      {item.svg && (
                        <button
                          onClick={() => downloadFile(item.svg, `${promptItem?.title || `screen-${index + 1}`}.svg`, 'image/svg+xml')}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          SVG
                        </button>
                      )}
                      <button
                        onClick={() => downloadFile(item.html, `${promptItem?.title || `screen-${index + 1}`}.html`, 'text/html')}
                        className="text-green-500 hover:text-green-700"
                      >
                        HTML
                      </button>
                      {item.css && (
                        <button
                          onClick={() => downloadFile(item.css, `${promptItem?.title || `screen-${index + 1}`}.css`, 'text/css')}
                          className="text-purple-500 hover:text-purple-700"
                        >
                          CSS
                        </button>
                      )}
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
      <SettingsTab
        activeSettingsTab={activeSettingsTab}
        setActiveSettingsTab={setActiveSettingsTab}
        apiKey={apiKey}
        handleApiKeyChange={handleApiKeyChange}
        directCodeOutput={directCodeOutput}
        setDirectCodeOutput={setDirectCodeOutput}
        addCodePrefix={addCodePrefix}
        setAddCodePrefix={setAddCodePrefix}
        codePrefix={codePrefix}
        setCodePrefix={setCodePrefix}
        useBEMNotation={useBEMNotation}
        setUseBEMNotation={setUseBEMNotation}
        mergeCssInBatch={mergeCssInBatch}
        setMergeCssInBatch={setMergeCssInBatch}
        showCustomModelInput={showCustomModelInput}
        setShowCustomModelInput={setShowCustomModelInput}
        selectedModelId={selectedModelId}
        setSelectedModelId={setSelectedModelId}
        customModelId={customModelId}
        setCustomModelId={setCustomModelId}
        basePrompt={basePrompt}
        handleBasePromptChange={handleBasePromptChange}
        isGeneratingBasePrompt={isGeneratingBasePrompt}
        handleAutoGenerateBasePrompt={handleAutoGenerateBasePrompt}
        codingPrompt={codingPrompt}
        handleCodingPromptChange={handleCodingPromptChange}
        isLoading={isLoading}
        getCurrentProviderName={getCurrentProviderName}
        DEFAULT_MODELS={DEFAULT_MODELS}
      />
    );
  };

  // リサーチタブのコンテンツをレンダリングする関数
  const renderResearchTab = () => {
    return (
      <ResearchTab
        apiKey={apiKey}
        modelId={actualModelId}
        designTokens={designTokens}
        selection={selection}
        includeChildren={includeChildren}
        includeImages={includeImages}
      />
    );
  };

  // カスタムフックを使用
  const imageGeneration = useImageGeneration({
    apiKey,
    selection,
    includeImages,
    getSelectionSize
  });
  
  // 画像生成タブのコンテンツをレンダリングする関数
  const renderImageGenerationTab = () => {
      return (
      <ImageGenerationTab
        imagePrompt={imageGeneration.imagePrompt}
        setImagePrompt={imageGeneration.setImagePrompt}
        generatedImage={imageGeneration.generatedImage}
        setGeneratedImage={imageGeneration.setGeneratedImage}
        imageAspectRatio={imageGeneration.imageAspectRatio}
        setImageAspectRatio={imageGeneration.setImageAspectRatio}
        isGeneratingImage={imageGeneration.isGeneratingImage}
        setIsGeneratingImage={imageGeneration.setIsGeneratingImage}
        imageGenerationError={imageGeneration.imageGenerationError}
        setImageGenerationError={imageGeneration.setImageGenerationError}
        progress={imageGeneration.progress}
        setProgress={imageGeneration.setProgress}
        chatMessages={imageGeneration.chatMessages}
        setChatMessages={imageGeneration.setChatMessages}
        showChatInterface={imageGeneration.showChatInterface}
        setShowChatInterface={imageGeneration.setShowChatInterface}
        selection={selection}
        includeImages={includeImages}
        handleSelectionSettingsChange={handleSelectionSettingsChange}
        apiKey={apiKey}
        handleGenerateImage={imageGeneration.handleGenerateImage}
        handleContinueChat={imageGeneration.handleContinueChat}
        getSelectionSize={getSelectionSize}
        getAspectRatioSize={imageGeneration.getAspectRatioSize}
      />
    );
  };
  

  return (
    <div className="mx-auto p-2 pt-0  max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold mb-4 text-gray-800 flex gap-2 items-center">
          <span className="text-sm bg-slate-800 text-white rounded-sm flex items-center justify-center w-7 h-7 mr-0">GG</span>
          AI
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
              className={`px-3 py-2 text-xs font-medium transition-colors ${activeMainTab === 'research' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setActiveMainTab('research')}
          >
            リサーチ
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
        {activeMainTab === 'research' && renderResearchTab()}
      </div>
    </div>
  );
};

export default App; 