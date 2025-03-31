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
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent'
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
function getSpecificInstructions(templateType: TemplateType): string {
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
      - レガシーブラウザでも崩れがなく表示ができるようなHTML、CSSのコーディングを行ってください。
      `;
    case 'presentation':
      return `
      このHTMLはプレゼンテーション資料として、16:9のPowerpointなどのフォーマットでの用途です。以下の点に注意してください：
      - シンプルで読みやすいレイアウト
      - 大きく読みやすいフォントサイズ
      - コントラストの高い色使い
      - コンテンツの階層をはっきりさせる
      - 図や表を使用する場合は、簡潔で分かりやすく
      - レガシーブラウザでも崩れがなく表示ができるようなHTML、CSSのコーディングを行ってください。
      `;
    case 'diagram':
      return `
      このHTMLは図表作成用途です。以下の点に注意してください：
      - SVGを使用して図表や図形を描画
      - シンプルで明確なビジュアル表現
      - 適切なラベル付け
      - 色による情報伝達に依存しない（色覚異常の考慮）
      - 必要に応じて線や矢印で関係性を表現
      - レガシーブラウザでも崩れがなく表示ができるようなHTML、CSSのコーディングを行ってください。
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
  templateType: TemplateType = 'webdesign' // デフォルト値を追加
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
  const specificInstructions = getSpecificInstructions(templateType);

  // プロンプト構築 (共通)
  let promptContent = `
  # ユーザープロンプト
  ${userPrompt}
  
  # 指示
  上記の情報とアップロードされた画像をもとに、高品質なHTMLコードを生成してください。
  CSSはインラインスタイルとして含めてください。
  外部リソースへの依存（外部CSSやJavaScriptなど）は避けてください。
  セマンティックなHTMLを使用し、アクセシビリティに配慮してください。
  レスポンシブデザインに対応してください。
  
  ${specificInstructions}
  
  レスポンスはHTMLコードのみを返してください。
  `;
  
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
        }],
        tools: [
          {
            google_search: {}
          }
        ]
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
      - CSSはインラインスタイルとして含めてください
      - 外部リソースへの依存は避けてください
      - 生成したコードは最終的にSVGに変換し、figmaにインポートすることを想定すること。
      - 以下の目的に応じて最適なデザインを再現すること。HTML/CSSはあくまでも表現のための手段であること。
      - ユーザーが提供した画像があれば、それを参考にデザインやレイアウトを作成すること。
      
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
      },
      tools: [
        {
          google_search: {}
        }
      ]
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
    const newMessageParts: any[] = [{ text: prompt }];
    
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
      throw new Error('APIレスポンスに画像もテキストも含まれていません');
    }
    
    return result;
  } catch (error) {
    console.error('画像生成エラー:', error);
    throw new Error(`画像生成エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
} 