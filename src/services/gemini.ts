import { DesignTokens, SelectionInfo } from '../utils/types';
import { TemplateType } from '../components/PromptInput';

export type AIModel = {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter';
  apiEndpoint: string;
};

export const DEFAULT_MODELS: AIModel[] = [
  { 
    id: 'gemini-2-5-pro', 
    name: 'Google Gemini 2.5 Pro',
    provider: 'gemini',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent'
  },
  { 
    id: 'gemini-2-0-flash', 
    name: 'Google Gemini 2.0 Flash',
    provider: 'gemini',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  },
  { 
    id: 'google/gemini-2.5-pro-exp-03-25:free', 
    name: 'Google Gemini 2.5 Pro (OpenRouter)',
    provider: 'openrouter',
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions'
  },
  { 
    id: 'anthropic/claude-3.7-sonnet', 
    name: 'Anthropic Claude 3.7 Sonnet',
    provider: 'openrouter',
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions'
  },
  { 
    id: 'openai/gpt-4o-search-preview', 
    name: 'OpenAI GPT-4o Search Preview',
    provider: 'openrouter',
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions'
  }
];

// テンプレートタイプに基づいた特別な指示を返す関数
export function getSpecificInstructions(templateType: TemplateType): string {
  switch (templateType) {
    case 'webdesign':
      return `
      このHTMLはWebデザイン用途です。以下の点に注意してください：
      - 該当のターゲット、生成する対象の目的、コンテキストを理解し考案した上で、日本のWebサイトにおいて適切なトンマナのデザインをプロフェッショナルとして行うこと
      - ユーザーのプロンプトから以下をまず判断します。
        - ビジュアルデザイン(ブランディング)が重要な画面
        - セールスデザイン(マーケティング)が重要な画面
        - UI/UXデザイン(ユーザー体験)が重要な画面
      - ビジュアルデザインの場合
        - コピーやライティングについて情緒的にブランドイメージを一貫して表現する。
        - セールスよりもユーザーの情緒へイメージを伝えることを優先する
      - セールスデザインの場合
        - セールスを目的としたコピーを作成する。
        - セールスよりもユーザーの情緒へイメージを伝えることを優先する
      - UI/UXデザインの場合
        - ユーザーの情緒へイメージを伝えることを優先する
        - tailwindcssなどでよく利用されるコンポーネントパターンを提案する
      - レスポンシブではなく、設定された横幅に対してのみのデザインを行うこと
      - コンテナ幅を定義(デフォルト1140px)した上でデザインすること
      - フレックスボックスまたはグリッドレイアウトを適切に使用
      - ホバー効果などは一切考慮しないでください。
      `;
    case 'presentation':
      return `
      このHTMLはプレゼンテーション資料として、16:9のPowerpointなどのフォーマットでの用途です。以下の点に注意してください：
      - シンプルで読みやすいレイアウト
      - 大きく読みやすいフォントサイズ
      - コントラストの高い色使い
      - コンテンツの階層をはっきりさせる
      - 図や表を使用する場合は、簡潔で分かりやすく
      - スライド1枚あたりの境界線がわかりやすいように生成すること
        - 例
            <div style="display: flex; flex-direction: column; gap: 100px; background: #e8e8e8;">
                <section style="width: 1600px; height: 900px; background: #FFFFFF;">ここにスライド1の内容</section>
                <section style="width: 1600px; height: 900px; background: #FFFFFF;">ここにスライド2の内容</section>
            </div>

      `;
    case 'diagram':
      return `
      このHTMLは図表作成用途です。以下の点に注意してください：
      - SVGを使用して図表や図形を描画
      - シンプルで明確なビジュアル表現
      - 適切なラベル付け
      - 色による情報伝達に依存しない（色覚異常の考慮）
      - 必要に応じて線や矢印で関係性を表現
      `;
    case 'wireframe':
      return `
      このHTMLはワイヤーフレーム/構成ラフ用途です。以下の点に注意してください：
      - 該当のターゲット、生成する対象の目的、コンテキストを理解し考案した上で、日本のWebサイトにおいて適切なトンマナのコピーライティング、ライティングをプロフェッショナルとして行うこと
      - ユーザーのプロンプトから以下をまず判断します。
        - ビジュアルデザイン(ブランディング)が重要な画面
        - セールスデザイン(マーケティング)が重要な画面
        - UI/UXデザイン(ユーザー体験)が重要な画面
      - ビジュアルデザインの場合
        - コピーやライティングについて情緒的にブランドイメージを一貫して表現する。
        - セールスよりもユーザーの情緒へイメージを伝えることを優先する
      - セールスデザインの場合
        - セールスを目的としたコピーを作成する。
        - セールスよりもユーザーの情緒へイメージを伝えることを優先する
      - UI/UXデザインの場合
        - ユーザーの情緒へイメージを伝えることを優先する
        - tailwindcssなどでよく利用されるコンポーネントパターンを提案する
      - 白黒またはグレースケールのみを使用（カラーは使用しない）
      - シンプルで最小限のスタイリング
      - 画像やアイコンが入る場所には灰色の長方形などのプレースホルダーを配置
      - ボタンやフォーム要素は簡素な枠線のみで表現
      - フォントは1〜2種類に制限し、太さや大きさの違いでヒエラルキーを表現
      - ボックスモデルを活用した明確なレイアウト構造
      - 装飾的な要素は最小限に抑える
      - レスポンシブ設定は不要。設定された横幅に対してのみの設計を行うこと
      - コンテナ幅を定義(デフォルト1140px)した上で設計すること
      - レガシーブラウザでも崩れがなく表示ができるようなHTML、CSSのコーディングを行ってください。
      `;
    case 'coding':
      return `
FigmaデザインからのHTML/CSSコーディング指示
# 目的:
指定されたFigma上の選択要素のデザインを正確に再現する、プロダクション品質のHTMLおよびCSSコードを生成してください。
# 出力形式:
単一のHTMLファイルとして出力し、CSSはHTMLファイル内の<style>タグ内に記述してください。
## ▼最重要ルール（厳守）====================
- 技術スタック: 外部ライブラリやCSSフレームワーク（Tailwind CSS, Bootstrapなど）は一切使用せず、純粋なHTMLとCSSのみで実装してください。
- CSS記述: CSSはHTMLファイル内の<style>タグに記述してください。
- CSS変数: CSSカスタムプロパティ（変数）は絶対に使用しないでください。
- ベースフォントサイズ: html 要素の font-size は 絶対に16px としてください。ただし、要素のスタイリングにはFigmaで指定された具体的な px 値を使用してください（rem/emへの自動変換は不要）。
- コメント: 生成されるHTMLおよびCSSコードには、一切コメントを含めないでください。
## ▼FLOCSS 設計ルール====================
- 基本構造: FLOCSS（Foundation, Layout, Object）の設計思想に基づいてCSSを構成してください。<style> タグ内では、以下の順序で記述します。
- /* Foundation */: リセットCSS、サイト全体の基本的なスタイル（body, typographyなど）。
- /* Layout */: ヘッダー、フッター、メインコンテンツエリアなど、サイトの主要な骨格を定義するスタイル (l-* クラス）。
- /* Object / Component */: 再利用可能なUI部品のスタイル (c-* クラス）。今回の主要なコーディング対象はここに属します。
- /* Object / Project */: 特定のページやセクション固有のスタイル (p-* クラス）。原則として使用を避けてください。
- /* Object / Utility */: 汎用的なヘルパー/ユーティリティクラス (u-* クラス）。
### クラス命名規則:
- 接頭辞: 必ず指定された接頭辞を使用してください (l-, c-, p-, u-)。
- コンポーネント化: Figmaで選択された主要な要素群を単一のコンポーネント (c-*) として扱ってください。コンポーネント名はデザインの内容を反映した具体的な名前にしてください（例: c-feature-list, c-profile-card）。
- Element: コンポーネント内部の構成要素は、BEMのElement形式 (__) を使用して命名してください（例: c-card__image, c-button__icon）。
- Modifier (State): 要素の状態を示す場合は is-* の接頭辞を持つクラスを使用してください（例: is-active, is-hidden）。
## ▼コーディング詳細ルール====================
### HTML:
- セマンティクス: HTML5のセマンティック要素（header, footer, main, section, article, nav, aside など）を適切に使用してください。
- アクセシビリティ (A11y): alt属性（画像の内容を具体的に記述）、aria-*属性などを適切に使用し、アクセシビリティに配慮してください。
### CSS:
- デザイン再現: Figmaのデザイン（レイアウト、色、タイポグラフィ、スペーシング等）をピクセルパーフェクトに近いレベルで正確に再現してください。
- レスポンシブ: 必要に応じてメディアクエリを使用し、レスポンシブデザインに対応してください。モバイルファースト（最小画面幅のスタイルを基本とし、大きな画面幅でスタイルを上書き/追加する）で設計してください。
### 画像:
= Figma上の画像要素は、すべて画像プレースホルダーとして表現してください。
- プレースホルダーURLは https://placehold.jp/{幅}x{高さ}.png の形式を使用し、Figmaで指定された正確な幅と高さを指定してください。
- パラメータなどで img-service01.jpg、icon-service01.png、bg-service01.jpg などの画像を出力する際の適切と思われる画像名がわかるように
- alt属性には、その画像が何を表すかを具体的に記述してください（例: alt="ユーザーアバターのプレースホルダー"）。
### アイコン:
- 単純な形状のアイコン（矢印、閉じるボタンなど）で、SVGで容易に再現可能なものは、インラインSVG (<svg>...</svg>) を使用してコーディングしてください。画像プレースホルダーは使用しないでください。
▲ルールここまで====================
      `;
    case 'research':
      return `
      このリクエストはリサーチ分析用途です。Figmaで選択した要素のデザインとユーザープロンプトを分析し、マークダウン形式で出力してください。
      
      以下の点に注意してください：
      - アップロードされた画像とデザイン情報を詳細に分析すること
      - HTMLコードではなく、マークダウン形式の分析レポートを返すこと
      - レポートは構造化され、見出し、リスト、表などを適切に使用すること
      - ユーザープロンプトで指定された観点から分析を行うこと
      - 具体的で実用的な提案や分析結果を含めること
      
      レスポンスはマークダウン形式のテキストのみを返してください。HTMLやコードブロックは使用しないでください。
      `;
    default:
      return '';
  }
}

// 選択要素から画像データを抽出する関数
function extractImagesFromSelection(selectedElements: SelectionInfo[]): string[] {
  const images: string[] = [];
  
  if (!selectedElements || selectedElements.length === 0) {
    return images;
  }
  
  // 各選択要素をチェック
  for (const element of selectedElements) {
    // 要素自体のスクリーンショット（imageData）が存在する場合は配列に追加
    if (element.imageData) {
      images.push(element.imageData);
      console.log(`選択要素のスクリーンショットを追加: ${element.name || element.id}`);
    }
    
    // 階層情報内の画像データをチェック
    if (element.hierarchy && element.hierarchy.imageData) {
      images.push(element.hierarchy.imageData);
      console.log(`階層内要素のスクリーンショットを追加: ${element.hierarchy.name || element.hierarchy.id}`);
    }
    
    // 子要素も再帰的に処理
    if (element.children && element.children.length > 0) {
      const childImages = extractImagesFromSelection(element.children);
      images.push(...childImages);
    }
  }
  
  return images;
}

// 選択要素のテキスト情報を抽出してマークダウン形式で整形する関数
function extractTextContentInfo(elements: SelectionInfo[]): string {
  if (!elements || elements.length === 0) {
    return '選択要素のテキスト情報はありません。';
  }
  
  let result = '';
  
  // テキストデータを再帰的に処理する関数
  const processTextContent = (content: any, indent: number = 0): void => {
    if (!content) return;
    
    const indentStr = '  '.repeat(indent);
    
    // 名前とタイプを出力
    result += `${indentStr}- **${content.name}** (${content.type})\n`;
    
    // テキスト内容があれば出力
    if (content.textContent) {
      result += `${indentStr}  「${content.textContent}」\n`;
    }
    
    // 子要素を再帰的に処理
    if (content.children && Array.isArray(content.children)) {
      content.children.forEach((child: any) => {
        processTextContent(child, indent + 1);
      });
    }
  };
  
  // 各要素のテキスト情報を処理
  elements.forEach(element => {
    if (element.allTextContent) {
      processTextContent(element.allTextContent);
    }
  });
  
  return result || '抽出可能なテキスト情報はありませんでした。';
}

// 選択要素のコピーを作成し、画像データを除外する関数
function removeImageDataFromSelection(elements: SelectionInfo[]): SelectionInfo[] {
  if (!elements || elements.length === 0) {
    return [];
  }
  
  return elements.map(element => {
    // スプレッド演算子で基本プロパティをコピー
    const cleanElement = { ...element };
    
    // imageDataプロパティを削除
    if ('imageData' in cleanElement) {
      delete cleanElement.imageData;
    }
    
    // 階層情報が存在する場合も同様に処理
    if (cleanElement.hierarchy && 'imageData' in cleanElement.hierarchy) {
      cleanElement.hierarchy = { ...cleanElement.hierarchy };
      delete cleanElement.hierarchy.imageData;
    }
    
    // 子要素も再帰的に処理
    if (cleanElement.children && cleanElement.children.length > 0) {
      cleanElement.children = removeImageDataFromSelection(cleanElement.children);
    }
    
    return cleanElement;
  });
}

export async function callAIAPI(
  apiKey: string,
  modelId: string,
  designTokens: DesignTokens | null,
  userPrompt: string,
  selectedElements: SelectionInfo[],
  templateType: TemplateType = 'webdesign', // デフォルト値を追加
  codingPrompt: string = 'FLOCSS' // コーディングプロンプト用のパラメータを追加
): Promise<string> {
  // モデルIDからモデル情報を取得
  const customModel = modelId.includes('/') 
    ? { id: modelId, name: 'Custom Model', provider: 'openrouter', apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions' } as AIModel
    : null;
  
  const model = DEFAULT_MODELS.find(m => m.id === modelId) || customModel;
  
  if (!model) {
    throw new Error(`モデル "${modelId}" が見つかりません`);
  }

  // 選択要素から画像データを抽出
  const imageDataArray = extractImagesFromSelection(selectedElements);
  console.log(`抽出された画像データ: ${imageDataArray.length}件`);
  
  // 選択要素から画像データを除外したコピーを作成
  const cleanedSelectedElements = removeImageDataFromSelection(selectedElements);

  // テンプレートタイプに基づいた特別な指示を取得
  let specificInstructions = getSpecificInstructions(templateType);
  
  // コーディングモードで、かつカスタムプロンプトが指定されている場合、指示を上書き
  if (templateType === 'coding' && codingPrompt && codingPrompt !== 'FLOCSS') {
    specificInstructions = `
    このHTMLはコーディング用途です。Figmaで選択した要素のデザインを正確に再現するためのHTMLとCSSを生成します。
    画像箇所についてはすべてプレースホルダーとしてわかるようにしてください。
     -  https://placehold.jp/150x150.png ※ 幅や高さも合わせて
    HTMLコメントやCSSコメントは一切不要です。
    以下の点に注意してください：
    ${codingPrompt}
    `;
  }

  // プロンプト構築 (共通)
  let promptContent = `
  # ユーザープロンプト
  ${userPrompt}
  
  # 指示
  上記の情報とアップロードされた画像をもとに、高品質なHTMLコードを生成してください。
  外部リソースへの依存（外部CSSやJavaScriptなど）は避けてください。
  レスポンシブデザインに対応してください。
  
  ${specificInstructions}
  
  レスポンスはHTMLコードのみを返してください。
  `;
  
  // リサーチモードの場合、テキスト情報を含める
  if (templateType === 'research') {
    const textInfo = extractTextContentInfo(cleanedSelectedElements);
    
    promptContent = `
  # ユーザープロンプト
  ${userPrompt}
  
  # Figma要素のテキスト情報
  ${textInfo}
  
  # 指示
  上記の情報とテキスト内容、およびアップロードされた画像をもとに、マークダウン形式で分析レポートを作成してください。
  
  ${specificInstructions}
  `;
  }
  
  // コーディングモードの場合、詳細なスタイル情報を強調
  if (templateType === 'coding') {
    // 詳細スタイル情報がある場合、それを強調
    const hasDetailedStyles = cleanedSelectedElements.some(el => el.detailedStyles || (el.hierarchy && el.hierarchy.detailedStyles));
    
    if (hasDetailedStyles) {
      promptContent = `
      # Figma詳細スタイル情報
      以下の詳細なスタイル情報を参考にして、正確なHTMLとCSSを生成してください。
      レイアウト、余白、色、フォント、サイズなどの情報に注目してください。
      
      ${promptContent}
      `;
      
      console.log('コーディングモード: 詳細スタイル情報を含むプロンプトを生成します');
    }
  }
  
  // ワイヤーフレームの場合はデザイントークンを含めないが、それ以外では含める
  if (templateType !== 'wireframe' && designTokens) {
    promptContent = `
    # Figmaデザイントークン情報
    
    ## カラー
    ${JSON.stringify(designTokens?.colors || [], null, 2)}
    
    ## テキストスタイル
    ${JSON.stringify(designTokens?.texts || [], null, 2)}
    
    ## エフェクト
    ${JSON.stringify(designTokens?.effects || [], null, 2)}
    
    # 選択要素情報
    ${JSON.stringify(cleanedSelectedElements, null, 2)}
    
    ${promptContent}
    `;
  } else {
    // ワイヤーフレームの場合は選択要素情報のみ
    promptContent = `
    # 選択要素情報
    ${JSON.stringify(cleanedSelectedElements, null, 2)}
    
    ${promptContent}
    `;
  }
  
  try {
    let response;
    let responseText;
    
    // モデルプロバイダーに応じたAPI呼び出し
    if (model.provider === 'gemini') {
      // Gemini API用のリクエスト本文を構築
      const requestBody: any = {
        contents: [{
          parts: [
            {
              text: promptContent
            }
          ]
        }]
      };
      
      // 既存画像データがある場合は追加
      if (imageDataArray.length > 0) {
        // テキストパーツはすでに追加済み
        // 画像パーツを追加
        imageDataArray.forEach(imageData => {
          // Base64データのプレフィックスを削除（MIMEタイプは保持）
          const base64Data = imageData.split(',')[1];
          const mimeType = (imageData.match(/data:([^;]+);/) || [])[1] || 'image/png';
          
          requestBody.contents[0].parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        });
      }
      
      // Gemini API呼び出し
      response = await fetch(`${model.apiEndpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
    } else if (model.provider === 'openrouter') {
      // システムメッセージを改善
      const systemMessage = `
      あなたは高品質なHTMLコードを生成する専門家です。以下の情報をもとに、HTML/CSSコードを生成してください。
      - 外部リソースへの依存は避けてください
      - 生成したコードは最終的にSVGに変換し、figmaにインポートすることを想定すること。dom-to-svg を利用します。display: gridは利用しないこと。
      - ユーザーが提供した画像があれば、それを参考にデザインやレイアウトを作成すること。
      - 以下の目的に応じて最適なデザインを再現すること。HTML/CSSはあくまでも表現のための手段であること。
      
      ${templateType === 'webdesign' ? 'Webデザイン用途に最適化してください。' : ''}
      ${templateType === 'presentation' ? 'プレゼンテーション用途に最適化してください。' : ''}
      ${templateType === 'diagram' ? '図表用途に最適化してください。' : ''}
      
      レスポンスはHTMLコードのみを返してください。
      `;
      
      // OpenRouter用のリクエスト本文を構築
      const requestBody: any = {
        model: model.id,
        max_tokens: 65000,
        messages: [
          {
            role: 'system',
            content: systemMessage
          }
        ]
      };
      
      // ユーザーメッセージを作成
      if (imageDataArray.length > 0) {
        // 画像がある場合は配列形式のコンテンツを使用
        const userContent: any[] = [
          {
            type: 'text',
            text: promptContent
          }
        ];
        
        // 画像をコンテンツに追加
        imageDataArray.forEach(imageData => {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: imageData // Base64 URL形式を直接使用
            }
          });
        });
        
        // ユーザーメッセージを追加
        requestBody.messages.push({
          role: 'user',
          content: userContent
        });
      } else {
        // 画像がない場合は通常のテキストメッセージ
        requestBody.messages.push({
          role: 'user',
          content: promptContent
        });
      }
      
      console.log('OpenRouter Request:', JSON.stringify(requestBody, null, 2));
      
      // OpenRouter API呼び出し
      response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://figma.com', // OpenRouterでは必須
          'X-Title': 'Figma HTML to SVG Generator'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content;
    } else {
      throw new Error(`未サポートのプロバイダー: ${model.provider}`);
    }
    
    if (!responseText) {
      throw new Error('APIからHTMLコードが返されませんでした');
    }
    
    // コードブロックから実際のHTMLを抽出
    const codeBlockMatch = responseText.match(/```html\s*([\s\S]*?)\s*```/);
    return codeBlockMatch ? codeBlockMatch[1].trim() : responseText;
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    throw new Error(`AI API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 従来のGemini APIのための互換性関数
export async function callGeminiAPI(
  apiKey: string,
  designTokens: DesignTokens | null,
  userPrompt: string,
  selectedElements: SelectionInfo[]
): Promise<string> {
  return callAIAPI(apiKey, 'gemini-2-5-pro', designTokens, userPrompt, selectedElements);
}

// Gemini 2.0 Flash Experimental による画像生成
export async function generateImageWithGemini(
  apiKey: string,
  prompt: string,
  imageData?: string,
  aspectRatio: string = '1:1',
  previousMessages: Array<{role: 'user' | 'model', content: string}> = []
): Promise<{image?: string, text?: string}> {
  try {
    // リクエスト本文を構築
    const requestBody: any = {
      contents: [],
      generationConfig: {
        responseModalities: ["Text", "Image"]
      }
    };
    
    // 以前のメッセージがある場合は追加
    if (previousMessages.length > 0) {
      for (const msg of previousMessages) {
        requestBody.contents.push({
          role: msg.role,
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // 新しいプロンプトを追加
    const newMessageParts: any[] = [{ text: prompt + " ※画像のみを生成するように心がけてください。" }];
    
    // 既存画像データがある場合は追加
    if (imageData) {
      // Base64データのプレフィックスを削除（MIMEタイプは保持）
      const base64Data = imageData.split(',')[1];
      const mimeType = (imageData.match(/data:([^;]+);/) || [])[1] || 'image/png';
      
      newMessageParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }
    
    // ユーザーのメッセージを追加
    requestBody.contents.push({
      role: 'user',
      parts: newMessageParts
    });
    
    // Gemini API (画像生成モデル) 呼び出し
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // レスポンスの処理
    const result: {image?: string, text?: string} = {};
    
    // 候補が存在する場合
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // テキストがある場合
          if (part.text) {
            result.text = part.text;
          }
          
          // 画像データがある場合（キャメルケース形式）
          if (part.inlineData?.data) {
            result.image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
          
          // 画像データがある場合（スネークケース形式、念のため）
          if (part.inline_data?.data) {
            result.image = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
          }
        }
      }
    }
    
    // 画像もテキストもない場合はエラー
    if (!result.image && !result.text) {
      throw new Error('APIレスポンスに画像もテキストも含まれていません' + JSON.stringify(data));
    }
    
    return result;
  } catch (error) {
    console.error('画像生成エラー:', error);
    throw new Error(`画像生成エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 単一要素を処理する関数
export async function processSingleElement(
  apiKey: string,
  modelId: string,
  designTokens: DesignTokens | null,
  contextPrompt: string,
  elementInfo: SelectionInfo[],
  researchType: string
): Promise<string> {
  // モデルIDからモデル情報を取得
  const customModel = modelId.includes('/') 
    ? { id: modelId, name: 'Custom Model', provider: 'openrouter', apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions' } as AIModel
    : null;
  
  const model = DEFAULT_MODELS.find(m => m.id === modelId) || customModel;
  
  if (!model) {
    throw new Error(`モデル "${modelId}" が見つかりません`);
  }

  // 選択要素から画像データを抽出
  const imageDataArray = extractImagesFromSelection(elementInfo);
  console.log(`要素から抽出された画像データ: ${imageDataArray.length}件`);
  
  // 選択要素から画像データを除外したコピーを作成
  const cleanedElementInfo = removeImageDataFromSelection(elementInfo);

  // テキスト情報を抽出
  const textInfo = extractTextContentInfo(cleanedElementInfo);
  
  // リサーチタイプに応じたシステムメッセージを設定
  let systemMessage = '';
  switch (researchType) {
    case 'coding':
      systemMessage = `
      あなたはFigmaデザインからHTMLコーディング計画を作成する専門家です。提供されたデザイン要素の情報と画像を分析し、
      HTMLとCSSで効率的に実装するための計画をマークダウン形式で作成してください。
      `;
      break;
    case 'wordpress':
      systemMessage = `
      あなたはFigmaデザインからWordPress実装計画を作成する専門家です。提供されたデザイン要素の情報と画像を分析し、
      WordPressサイトの設計書をマークダウン形式で作成してください。
      固定ページ、カスタム投稿タイプ、タクソノミー、カスタムフィールドの設計を詳細に行ってください。
      `;
      break;
    case 'typo':
      systemMessage = `
      あなたはテキスト品質評価の専門家です。提供されたデザイン要素のテキストを詳細に分析し、
      誤字脱字、表現の一貫性、読みやすさなどの観点から品質を評価し、改善提案をマークダウン形式で作成してください。
      言語表現に関する専門知識を活かし、具体的かつ実用的な提案を行ってください。
      `;
      break;
    case 'design':
      systemMessage = `
      あなたはUI/UXデザインレビューの専門家です。提供されたデザイン要素を詳細に分析し、
      視覚的デザイン、インタラクション、一貫性、使いやすさなどの観点から評価し、
      具体的な改善提案をマークダウン形式で作成してください。
      モダンなUI/UXデザインの原則と最新のトレンドを考慮した評価を行ってください。
      `;
      break;
    default:
      systemMessage = `
      あなたはFigmaデザインの分析専門家です。提供されたデザイン要素の情報と画像を分析し、マークダウン形式でレポートを作成してください。
      `;
  }
  
  // テキスト情報の重要度調整
  let textInfoSection = '';
  if (researchType === 'typo') {
    // 誤字脱字チェックの場合はテキスト情報を強調
    textInfoSection = `
# Figma要素のテキスト情報（重要）
以下のテキストを詳細に分析し、品質評価を行ってください：

${textInfo}
    `;
  } else {
    // 通常のテキスト情報セクション
    textInfoSection = `
# Figma要素のテキスト情報
${textInfo}
    `;
  }
  
  // プロンプト構築
  let promptContent = `
# 単一要素の分析
${contextPrompt}

${textInfoSection}

# 指示
上記の要素情報とテキスト内容、およびアップロードされた画像をもとに、マークダウン形式の分析を行ってください。
前回までの分析結果がある場合は、それと統合した最終的なレポートを作成してください。

マークダウン形式で出力し、情報を整理してください。
`;

  try {
    let response;
    let responseText;
    
    // モデルプロバイダーに応じたAPI呼び出し
    if (model.provider === 'gemini') {
      // Gemini API用のリクエスト本文を構築
      const requestBody: any = {
        contents: [{
          parts: [
            {
              text: promptContent
            }
          ]
        }]
      };
      
      // 既存画像データがある場合は追加
      if (imageDataArray.length > 0) {
        // テキストパーツはすでに追加済み
        // 画像パーツを追加
        imageDataArray.forEach(imageData => {
          // Base64データのプレフィックスを削除（MIMEタイプは保持）
          const base64Data = imageData.split(',')[1];
          const mimeType = (imageData.match(/data:([^;]+);/) || [])[1] || 'image/png';
          
          requestBody.contents[0].parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        });
      }
      
      // Gemini API呼び出し
      response = await fetch(`${model.apiEndpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
    } else if (model.provider === 'openrouter') {
      // OpenRouter用のリクエスト本文を構築
      const requestBody: any = {
        model: model.id,
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: systemMessage
          }
        ]
      };
      
      // ユーザーメッセージを作成
      if (imageDataArray.length > 0) {
        // 画像がある場合は配列形式のコンテンツを使用
        const userContent: any[] = [
          {
            type: 'text',
            text: promptContent
          }
        ];
        
        // 画像をコンテンツに追加
        imageDataArray.forEach(imageData => {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: imageData // Base64 URL形式を直接使用
            }
          });
        });
        
        // ユーザーメッセージを追加
        requestBody.messages.push({
          role: 'user',
          content: userContent
        });
      } else {
        // 画像がない場合は通常のテキストメッセージ
        requestBody.messages.push({
          role: 'user',
          content: promptContent
        });
      }
      
      console.log('OpenRouter Request for element:', JSON.stringify(requestBody, null, 2));
      
      // OpenRouter API呼び出し
      response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://figma.com', // OpenRouterでは必須
          'X-Title': 'Figma HTML to SVG Generator'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content;
    } else {
      throw new Error(`未サポートのプロバイダー: ${model.provider}`);
    }
    
    if (!responseText) {
      throw new Error('APIからレポートが返されませんでした');
    }
    
    // 既にマークダウン形式で返ってくるはずなので、そのまま返す
    return responseText;
  } catch (error) {
    console.error('単一要素処理エラー:', error);
    throw new Error(`Element API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
} 