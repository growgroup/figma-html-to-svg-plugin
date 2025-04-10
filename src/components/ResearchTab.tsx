import * as React from 'react';
import { SelectionInfo, DesignTokens } from '../utils/types';
import { callAIAPI, processSingleElement } from '../services/gemini';
import { convertMarkdownTableToExcel } from '../utils/excelExport';
import ResearchOutput from './ResearchOutput';
import SelectionPreview from './SelectionPreview';
import ProgressIndicator from './ProgressIndicator';

type ResearchType = 'coding' | 'wordpress' | 'typo' | 'design';

// カスタムプロンプトテンプレート定数
const RESEARCH_TEMPLATES = {
  coding: `
  このリクエストはコーディングリサーチ用途です。以下の複数画面のスクリーンショットと情報を分析し、
  コーディング計画のアウトラインを作成してください。
  
  1. コンポーネント分析:
     - 各画面に存在する主要コンポーネントの特定と命名
     - コンポーネントの階層関係の整理
     - 再利用可能なコンポーネントの抽出
  
  2. コーディング指示:
     - 共通スタイル（カラー、フォント、スペーシングなど）の抽出
     - コンポーネントの実装優先順位
     - レスポンシブ対応の考慮点
     - 動的要素の実装方針
  
  以下のフォーマットでマークダウン形式で出力してください:
  
  # コーディング計画
  
  ## 1. コンポーネント構成
  - コンポーネント名: 役割、再利用性、実装の複雑さ
  
  ## 2. 実装優先順位
  1. コンポーネントA: 理由
  2. コンポーネントB: 理由
  
  ## 3. 共通スタイル定義
  - カラー
  - フォント
  - スペーシング
  - その他
  
  ## 4. 実装上の注意点
  - [注意点]
  `,
  wordpress: `
  このリクエストはWordPressサイト設計書作成用途です。以下の複数画面のスクリーンショットと情報を分析し、
  WordPress実装に必要な設計書を作成してください。
  
  以下の情報をマークダウン形式で詳細に出力してください:
  
  # WordPress設計書
  
  ## 固定ページ
  | ページ名 | スラッグ | 主な機能/内容 | 備考 |
  |--------|---------|------------|------|
  | [ページ名] | [スラッグ] | [内容] | [備考] |
  
  ## カスタム投稿タイプ
  | 名称 | スラッグ | アーカイブページ有無 | 主な用途 | カスタム項目 |
  |-----|---------|-------------------|---------|------------|
  | [名称] | [スラッグ] | [有/無] | [用途] | [項目] |
  
  ## カスタムタクソノミー
  | 名称 | スラッグ | 関連投稿タイプ | 階層構造 | 用途 |
  |-----|---------|--------------|---------|------|
  | [名称] | [スラッグ] | [投稿タイプ] | [有/無] | [用途] |
  
  ## カスタムフィールド (ACF Pro)
  ### [関連ページ/投稿タイプ名]用フィールド
  | フィールド名 | キー | タイプ | 説明 |
  |------------|-----|-------|------|
  | [名称] | [キー] | [タイプ] | [説明] |
  
  # 機能要件調査
  ## 実装が必要な機能リスト
  {機能と仕様の列挙}
  ## リスク
  {リスクを列挙}
  {仕様が不明確な箇所も列挙}
  
  
  =========================
  
  出力時の注意点
  - ACFについては固定ページについては、更新性の担保が必要そうな箇所のみカスタムフィールドの出力対象とする。エディタに流し込むようなコンテンツについては省略する。
  - カスタム投稿タイプ、カスタムタクソノミーのスラッグは - を利用する。
  - 固定ページの内容、備考、ACFの説明については、必要最低限にする。
  `,
  typo: `
  このリクエストは誤字脱字・表現チェック用途です。以下の画面のスクリーンショットとテキスト情報を分析し、
  テキストの品質向上のための詳細なレポートを作成してください。
  
  分析すべき観点：
  1. 誤字脱字
     - 明らかな誤タイピング
     - 漢字の誤変換
     - 送り仮名の誤り
     - 句読点の使用ミス
  
  2. 表現の一貫性
     - 表記ゆれ（例：「ログイン」と「ログ・イン」の混在）
     - 用語の不統一（例：機能名の異なる表現）
     - 文体の不統一（です/ます調とである調の混在）
  
  3. 文法と読みやすさ
     - 文法ミス
     - 冗長な表現
     - わかりにくい説明
     - 敬語の誤用
  
  4. UI/UXテキストの適切さ
     - ボタンラベルの明確さ
     - メッセージの親切さ
     - 専門用語の適切な使用
  
  以下のフォーマットでマークダウン形式で出力してください：
  
  # テキスト品質チェックレポート
  
  ## 分析対象画面
  各画面の名称と役割を簡潔に説明し、分析対象を明確にしてください。
  
  | 画面ID | 画面名 | 画面の役割・概要 |
  |-------|------|--------------|
  | 1 | [画面名] | [役割・概要] |
  
  ## 1. 誤字脱字リスト
  | 画面ID | 場所/コンポーネント | 誤り | 修正案 | 優先度 |
  |-------|-----------------|-----|------|------|
  | [画面ID] | [場所] | [誤りのテキスト] | [修正案] | [高/中/低] |
  
  ## 2. 表記ゆれ・用語不統一
  | 画面ID | 不統一な表現 | 推奨される統一表現 | 該当箇所 |
  |-------|------------|--------------|--------|
  | [画面ID] | [不統一表現] | [推奨表現] | [該当箇所リスト] |
  
  ## 3. 改善すべき表現
  | 画面ID | 場所/コンポーネント | 現在の表現 | 改善案 | 理由 |
  |-------|-----------------|---------|------|-----|
  | [画面ID] | [場所] | [現在の表現] | [改善案] | [理由] |
  
  ## 4. 全般的な文章スタイルに関する提案
  各画面のコンテキストに合わせた、文章スタイルの一貫性や改善点について提案してください。
  
  ## 5. 品質向上のための推奨事項
  テキスト全体の品質を向上させるための具体的な手順や方針を提案してください。
  `,
  design: `
  このリクエストはデザインレビュー用途です。以下の画面のスクリーンショットと情報を分析し、
  UI/UXデザインの品質向上のための詳細なレビューレポートを作成してください。
  
  分析すべき観点：
  
  1. 画面の目的とデザインアプローチ分析
     - 画面の主な目的と対象ユーザー
     - デザインアプローチの分析（以下3つの比率を判断）
       - ビジュアルデザインアプローチ（ブランディング重視）: 視覚的魅力、ブランドアイデンティティ、情緒的訴求
       - セールスデザインアプローチ（マーケティング重視）: コンバージョン促進、訴求力、行動喚起
       - ユーザビリティデザインアプローチ（UI/UX重視）: 使いやすさ、情報の整理、タスク完了の効率
     - 識別されたアプローチに基づく評価基準の設定
  
  2. 視覚的デザイン評価
     - 色彩調和とブランドとの一貫性
     - タイポグラフィ（フォントの選択、読みやすさ、階層）
     - スペーシングとレイアウトの均整
     - グリッドシステムの適用状況
     - コントラストとアクセシビリティ
  
  3. インタラクションデザイン評価
     - ユーザーフロー・動線の明確さ
     - アフォーダンスの適切さ（要素の機能が視覚的に理解できるか）
     - フィードバックの明確さ
     - インタラクション要素の使いやすさ
  
  4. 一貫性と統一感
     - デザインシステムの適用状況
     - 画面間の一貫性
     - パターンの統一
  
  5. クライアント目線からの指摘予測
     - Webデザインの発注元が指摘してきそうな点
     - 改善要求されそうな要素
     - 説明が求められそうなデザイン選択
  
  以下のフォーマットでマークダウン形式で出力してください：
  
  # デザインレビューレポート
  
  ## 分析対象画面
  各画面の名称と役割を簡潔に説明し、分析対象を明確にしてください。
  
  | 画面ID | 画面名 | 画面の役割・概要 |
  |-------|------|--------------|
  | 1 | [画面名] | [役割・概要] |
  
  ## 1. 画面の目的とデザインアプローチ分析
  
  ### 画面の主な目的と対象ユーザー
  [対象画面の主要目的と想定ユーザーの分析]
  
  ### デザインアプローチ評価
  - ビジュアルデザインアプローチ（ブランディング）: XX%
  - セールスデザインアプローチ（マーケティング）: XX%
  - ユーザビリティデザインアプローチ（UI/UX）: XX%
  
  [識別されたアプローチに基づく詳細な分析と評価]
  
  ## 2. デザインの強み
  | 画面ID | 要素/コンポーネント | 強み | 理由 |
  |-------|------------------|-----|------|
  | [画面ID] | [要素/コンポーネント] | [強みの説明] | [理由] |
  
  ## 3. 改善点と提案
  
  ### 視覚的デザイン
  | 画面ID | 要素/コンポーネント | 課題 | 改善提案 | 優先度 |
  |-------|------------------|-----|--------|------|
  | [画面ID] | [要素] | [課題の説明] | [具体的な改善案] | [高/中/低] |
  
  ### インタラクションと使いやすさ
  | 画面ID | 要素/フロー | 課題 | 改善提案 | 優先度 |
  |-------|------------|-----|--------|------|
  | [画面ID] | [要素/フロー] | [課題の説明] | [具体的な改善案] | [高/中/低] |
  
  ### 一貫性と統一感
  | 画面ID | 観点 | 課題 | 改善提案 | 優先度 |
  |-------|-----|-----|--------|------|
  | [画面ID] | [観点] | [課題の説明] | [具体的な改善案] | [高/中/低] |
  
  ## 4. クライアント目線からの指摘予測
  | 画面ID | 指摘されそうな要素 | 予想される指摘内容 | 事前対応策 |
  |-------|-----------------|--------------|----------|
  | [画面ID] | [要素] | [指摘内容] | [対応策] |
  
  ## 5. デザインシステムへの提言
  
  [デザインシステム全体への提言]
  
  ## 6. 総合評価とまとめ
  
  [デザインアプローチを考慮した総合的な評価と改善の方向性]
  `
};

interface ResearchTabProps {
  apiKey: string;
  modelId: string;
  designTokens: DesignTokens | null;
  selection: SelectionInfo[];
  includeChildren: boolean;
  includeImages: boolean;
}

const ResearchTab: React.FC<ResearchTabProps> = ({
  apiKey,
  modelId,
  designTokens,
  selection,
  includeChildren,
  includeImages
}) => {
  const [researchType, setResearchType] = React.useState<ResearchType>('coding');
  const [prompt, setPrompt] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState('');
  const [error, setError] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);
  const [progress, setProgress] = React.useState({ stage: '', percentage: 0 });
  
  // リサーチ種別に応じたプレースホルダーを取得
  const getPlaceholder = () => {
    switch (researchType) {
      case 'coding':
        return 'コーディング計画を立てるための指示を入力してください...';
      case 'wordpress':
        return 'WordPress要件を分析するための指示を入力してください...';
      case 'typo':
        return 'テキストチェックを行うための指示や、特に注目すべき点があれば入力してください...';
      case 'design':
        return 'デザインレビューのための指示や、特に評価すべき点があれば入力してください...';
      default:
        return '分析のための指示を入力してください...';
    }
  };
  
  // リサーチを実行する関数
  const handleResearch = async () => {
    if (!apiKey) {
      setError('APIキーが設定されていません');
      return;
    }
    
    if (!prompt) {
      setError('プロンプトを入力してください');
      return;
    }
    
    if (selection.length === 0) {
      setError('Figmaで分析する要素を選択してください');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setProgress({ stage: '分析準備中...', percentage: 5 });
    
    try {
      // リサーチ種別に応じたプロンプトテンプレートを構築
      const templatePrompt = RESEARCH_TEMPLATES[researchType];
      const finalPrompt = `${templatePrompt}\n\n${prompt}`;
      
      // 結果を累積するための変数
      let accumulatedResult = '';
      let totalElements = selection.length;
      
      // 各要素を個別に処理
      for (let i = 0; i < selection.length; i++) {
        const element = selection[i];
        
        setProgress({
          stage: `要素 ${i + 1}/${selection.length} (${element.name}) を分析中...`,
          percentage: 5 + Math.floor((i / selection.length) * 90)
        });
        
        // 詳細な選択情報を取得するためのメッセージを送信
        parent.postMessage(
          { 
            pluginMessage: { 
              type: 'get-single-element-info',
              elementId: element.id,
              templateType: 'research',
              includeImages: true,
              includeChildren: true
            } 
          },
          '*'
        );
        
        // 選択情報を受け取るための処理
        const elementInfoPromise = new Promise<SelectionInfo[]>((resolve) => {
          const messageHandler = (event: MessageEvent) => {
            const message = event.data.pluginMessage;
            if (message && message.type === 'single-element-info-result' && message.elementId === element.id) {
              window.removeEventListener('message', messageHandler);
              resolve(message.elementInfo ? [message.elementInfo] : []);
            }
          };
          
          window.addEventListener('message', messageHandler);
          
          // タイムアウト処理（5秒後にデフォルト値で解決）
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            resolve([element]); // タイムアウトした場合は元の要素情報を使用
          }, 5000);
        });
        
        // 要素情報を待機
        const elementInfo = await elementInfoPromise;
        
        if (elementInfo.length === 0) {
          console.warn(`要素 ${element.name} (${element.id}) の情報が取得できませんでした`);
          continue;
        }
        
        console.log(`要素 ${element.name} の情報を取得:`, elementInfo);
        
        // 既存の結果があれば、それを含めたプロンプトを作成
        const contextPrompt = accumulatedResult 
          ? `${finalPrompt}\n\n# 前回までの分析結果\n${accumulatedResult}\n\n# 追加要素の分析\n今回は "${element.name}" という要素を分析してください。前回までの分析結果と統合した最終レポートを作成してください。`
          : `${finalPrompt}\n\n最初の要素 "${element.name}" を分析します。`;
        
        // 個別の要素を処理
        const elementResult = await processSingleElement(
          apiKey,
          modelId,
          designTokens,
          contextPrompt,
          elementInfo,
          researchType
        );
        
        // 結果を累積
        if (i === 0) {
          // 最初の要素の結果をそのまま使用
          accumulatedResult = elementResult;
        } else {
          // 以降の要素は結果を統合
          accumulatedResult = elementResult;
        }
        
        // 中間結果を表示
        setResult(accumulatedResult);
      }
      
      setProgress({ stage: '分析完了', percentage: 100 });
      
      // 最終的な結果をセット
      setResult(accumulatedResult);
    } catch (err) {
      setError(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // マークダウンとして保存する関数
  const saveAsMarkdown = () => {
    setIsExporting(true);
    
    try {
      const blob = new Blob([result], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${researchType}-research-result.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(`マークダウン保存エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Excelとして保存する関数（WordPress要件調査用）
  const saveAsExcel = () => {
    setIsExporting(true);
    
    try {
      // マークダウンテーブルをExcelに変換
      const blob = convertMarkdownTableToExcel(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wordpress-requirements.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(`Excel保存エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // 返り値を得る際にタイプがExcel出力に対応しているかどうかを判定
  const needsExcelExport = (type: ResearchType): boolean => {
    return type === 'wordpress' || type === 'typo'; // WordPressと誤字脱字チェックはExcel出力に対応
  };
  
  return (
    <div className="space-y-4">
      {/* リサーチタイプ選択 */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 mb-3">リサーチタイプの選択</h3>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="researchType"
              value="coding"
              checked={researchType === 'coding'}
              onChange={() => setResearchType('coding')}
              disabled={isGenerating}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">HTMLコーディングリサーチ</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="researchType"
              value="wordpress"
              checked={researchType === 'wordpress'}
              onChange={() => setResearchType('wordpress')}
              disabled={isGenerating}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">WordPress要件調査</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="researchType"
              value="typo"
              checked={researchType === 'typo'}
              onChange={() => setResearchType('typo')}
              disabled={isGenerating}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">誤字脱字・表現チェック</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="researchType"
              value="design"
              checked={researchType === 'design'}
              onChange={() => setResearchType('design')}
              disabled={isGenerating}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">デザインレビュー</span>
          </label>
        </div>
        
        <div className="mt-3">
          <p className="text-xs text-gray-500">
            {researchType === 'coding' 
              ? 'コンポーネント構成、実装優先順位、共通スタイルなどのコーディング計画を分析します。'
              : researchType === 'wordpress'
              ? 'WordPress実装に必要な固定ページ、カスタム投稿タイプ、タクソノミー、カスタムフィールドなどを分析します。'
              : researchType === 'typo'
              ? 'テキストの誤字脱字、表現の一貫性、読みやすさなどを分析し、改善提案を行います。'
              : 'UI/UXデザインの視覚的要素、インタラクション、一貫性、使いやすさを評価し、改善提案を行います。'}
          </p>
        </div>
      </div>
      
      {/* 選択要素プレビュー */}
      <div>
        <SelectionPreview selection={selection} />
      </div>
      
      {/* プロンプト入力 */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <label htmlFor="research-prompt" className="block text-sm font-medium text-gray-700 mb-1">リサーチ指示:</label>
        <textarea
          id="research-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
          placeholder={getPlaceholder()}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-100"
        />
        
        <div className="flex justify-end mt-3">
          <button 
            onClick={handleResearch}
            disabled={isGenerating || !prompt}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-blue-400 transition-colors"
          >
            {isGenerating ? '分析中...' : 'リサーチ開始'}
          </button>
        </div>
      </div>
      
      {/* 進捗表示 */}
      {isGenerating && progress.stage && (
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
      
      {/* 結果表示 */}
      {result && (
        <ResearchOutput
          content={result}
          allowEdit={true}
          onContentChange={setResult}
          onExport={saveAsMarkdown}
          onExportExcel={needsExcelExport(researchType) ? saveAsExcel : undefined}
          isExporting={isExporting}
        />
      )}
    </div>
  );
};

export default ResearchTab; 