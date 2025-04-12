import { SelectionInfo } from '../utils/types';

// 画像ノードを検出する関数
export async function findImageNodesInSelection(
  selection: SelectionInfo[]
): Promise<Array<{
  id: string, 
  name: string, 
  type: string,
  reason: string,
  size?: { width: number, height: number }
}>> {
  return new Promise((resolve, reject) => {
    // 有効なノードIDを抽出
    const nodeIds = selection
      .filter(item => item.id && typeof item.id === 'string')
      .map(item => item.id);
    
    if (nodeIds.length === 0) {
      console.warn('No valid node IDs found in selection');
      resolve([]);
      return;
    }
    
    // Figmaにメッセージを送信
    parent.postMessage(
      { pluginMessage: { type: 'detect-image-nodes', nodeIds } },
      '*'
    );
    
    // レスポンスを受け取るハンドラ
    const messageHandler = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message) return;
      
      if (message.type === 'detect-image-nodes-result') {
        // ハンドラを削除
        window.removeEventListener('message', messageHandler);
        
        if (message.success) {
          console.log(`Detected ${message.imageNodes?.length || 0} image nodes`);
          resolve(message.imageNodes || []);
        } else {
          console.error('Failed to detect image nodes:', message.error);
          reject(new Error(message.error || 'Failed to detect image nodes'));
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // タイムアウト処理
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      console.error('Timeout while waiting for image node detection');
      reject(new Error('Timeout while waiting for image node detection'));
    }, 30000);
    
    // 処理開始のデバッグログを追加
    console.log(`Sent detect-image-nodes message for ${nodeIds.length} nodes`);
  });
}

// 選択情報から再帰的に階層構造を抽出する関数
function extractHierarchyInfo(selectionInfo: SelectionInfo[]): any[] {
  const result: any[] = [];
  
  for (const item of selectionInfo) {
    // 基本情報をコピー
    const itemInfo: any = {
      id: item.id,
      name: item.name,
      type: item.type
    };
    
    // hierarchyプロパティが存在する場合は子要素情報を再帰的に抽出
    if (item.hierarchy) {
      itemInfo.hierarchy = item.hierarchy;
      
      // 子要素が存在する場合
      if (item.hierarchy.children && Array.isArray(item.hierarchy.children)) {
        // 子要素ノードを追加
        const childNodes = item.hierarchy.children.map((child: any) => ({
          id: child.id,
          name: child.name,
          type: child.type,
          visible: child.visible,
          // 再帰的に孫要素も追加
          ...(child.children && { children: child.children })
        }));
        
        // 子要素情報を保存
        itemInfo.children = childNodes;
      }
    }
    
    result.push(itemInfo);
  }
  
  return result;
}

// Gemini APIを使って画像を分析し、適切なファイル名と形式を提案する
export async function analyzeImagesWithGemini(
  apiKey: string,
  selectionImage: string | null,
  imageNodes: Array<{
    id: string, 
    name: string, 
    type: string,
    reason: string,
    size?: { width: number, height: number }
  }>,
  selectionInfo: SelectionInfo[]
): Promise<Array<{
  id: string, 
  proposedName: string, 
  type: 'svg' | 'jpeg' | 'png',
  exportScale: number,
  reason: string
}>> {
  if (!apiKey) {
    throw new Error('APIキーが設定されていません');
  }
  
  // imageNodesが空でも処理を続行する（以前は早期リターンしていた）
  
  // 画像データを取得（画像ノードがある場合のみ）
  let imageDataResult: Array<{ id: string, name: string, data: string }> = [];
  if (imageNodes.length > 0) {
    try {
      imageDataResult = await exportImageNodesWithData(imageNodes.map(node => node.id));
    } catch (error) {
      console.error('画像データ取得エラー:', error);
      // エラーが発生しても続行
    }
  }
  
  // 選択情報から階層構造を再帰的に抽出
  const hierarchyData = extractHierarchyInfo(selectionInfo);
  
  // 選択情報の詳細をJSONとして取得（子要素情報を含む）
  const detailedSelectionInfo = selectionInfo.map(item => {
    // 機密情報やバイナリデータなどを除外
    const { imageData, ...safeInfo } = item;
    
    // hierarchyプロパティがある場合は階層情報を適切に処理
    if (safeInfo.hierarchy) {
      return {
        ...safeInfo,
        // hierarchyプロパティをそのまま含める（子要素の再帰的情報を含む）
        hierarchy: safeInfo.hierarchy
      };
    }
    return safeInfo;
  });
  
  // プロンプトを構築
  const promptText = `
  あなたはFigmaデザインから画像として出力すべき要素を判断し、適切な命名と形式を提案するAIアシスタントです。

  # 指示
  選択されたFigmaレイヤーと子要素を分析し、画像としてエクスポートすべき要素を特定して、最適なファイル名、ファイル形式、エクスポートスケールを提案してください。
  
  ## 重要
  - 画像タイプのノードだけでなく、添付の画像を確認し、ベクターデータなどのアイコンや、グループ、フレームなどの要素も画像として出力が必要かどうか判断すること
  - 選択レイヤーの子要素も画像として出力すべきか個別に判断すること
  - 新しいレイヤーIDを提案する場合は、入力のレイヤーIDと一致させること
  - 実際に画像として出力すべき要素のみを返すこと（すべての要素を出力する必要はない）
  - JSONレスポンスでは、typeフィールドは必ず "svg", "png", "jpg" のいずれかを使用すること
  
  # 判断基準
  - 装飾的なイラスト・写真 → 画像出力が必要
  - アイコン・ボタン → 画像出力が必要
  - 単純な色の塗りつぶしや枠のみ → 画像出力不要
  - テキストのみ → 画像出力不要
  - ただし、特殊なフォントやスタイルが適用されたテキスト要素 → 画像出力が必要な場合もある
  
  # 命名ルール
  - img-, bg-, icon- などの適切なプレフィックスをつけること
  - 例: img-service-about01.jpg, bg-service01.jpg, icon-arrow01.svg
  - 末尾には01などの2桁の連番を設定すること
  - 画像の内容と役割がわかる名前にすること
  - 同じ形状などであれば、例: img-service-about01.jpg, img-service-about02.jpg, img-service-about03.jpgのように同一の命名と連番をつけること
  
  # ファイル形式の選定基準
  - 小さなベクターベースのアイコン → svg
  - 写真や大きな画像 → jpg
  - 透明度や文字を含む画像 → png
  
  # エクスポートスケール
  - 基本スケールは2倍
  - 小さい要素（200px以下）は3倍でエクスポート
  - Webで使用する写真は通常2倍
  - アイコンや細部が重要な画像は3倍
  
  # 入力データ
  ## 検出された画像ノード
  ${JSON.stringify(imageNodes, null, 2)}
  
  ## 選択要素情報（子要素の階層構造を含む）
  ${JSON.stringify(detailedSelectionInfo, null, 2)}
  
  ## 階層構造の詳細情報
  ${JSON.stringify(hierarchyData, null, 2)}
  
  # 出力形式
  JSONで以下の形式で出力してください。コード以外のテキストは含めないでください。
  
  [
    {
      "id": "ノードID",
      "proposedName": "適切なファイル名（拡張子なし）",
      "type": "svg" | "jpg" | "png",
      "exportScale": 1 | 2,
      "reason": "選定理由の簡潔な説明"
    },
    ...
  ]
  `;
  const model = "gemini-2.5-pro-preview-03-25";
//   const model = "gemini-2.0-flash";
  try {
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    // リクエスト本文を構築
    const requestBody: any = {
      contents: [{
        parts: [
          { text: promptText }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };
    
    // 選択全体の画像がある場合は追加
    if (selectionImage) {
      // Base64データのプレフィックスを削除（MIMEタイプは保持）
      const base64Data = selectionImage.split(',')[1];
      const mimeType = (selectionImage.match(/data:([^;]+);/) || [])[1] || 'image/png';
      
      // SVG形式の画像は現在のGemini APIではサポートされていないためスキップ
      if (mimeType !== 'image/svg+xml') {
        requestBody.contents[0].parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      } else {
        console.log('SVG形式の画像はAPIでサポートされていないためスキップしました');
      }
    }
    
    // 個別の画像データがある場合も追加（最大4枚まで）
    const imagesToAdd = imageDataResult.slice(0, 4);
    for (const imageData of imagesToAdd) {
      // Base64データのプレフィックスを削除（MIMEタイプは保持）
      const base64Data = imageData.data.split(',')[1];
      const mimeType = (imageData.data.match(/data:([^;]+);/) || [])[1] || 'image/png';
      
      // SVG形式の画像は現在のGemini APIではサポートされていないためスキップ
      if (mimeType !== 'image/svg+xml') {
        requestBody.contents[0].parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      } else {
        console.log(`SVG形式の画像(${imageData.name})はAPIでサポートされていないためスキップしました`);
      }
    }
    
    // Gemini API呼び出し
    const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error: Status ${response.status} - ${response.statusText}`;
      
      try {
        // JSONとしてパースを試みる
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = `API Error: ${errorData.error.message || errorData.error.status || 'Unknown error'}`;
          // エラーの詳細情報がある場合は追加
          if (errorData.error.details) {
            console.error('API Error details:', errorData.error.details);
          }
        }
      } catch (e) {
        // JSONパースに失敗した場合は生のテキストを使用
        console.error('Error parsing API error response:', e);
        if (errorText) {
          errorMessage += ` - Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('Gemini API Response:', data);
    if (!responseText) {
      throw new Error('APIからレスポンスが返されませんでした');
    }
    
    // JSONレスポンスを抽出
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error('APIからの応答が正しいJSON形式ではありません');
    }
    
    try {
      // JSONをパース
      const parsedData = JSON.parse(jsonMatch[0]);
      
      // レスポンスが配列であることを確認
      if (!Array.isArray(parsedData)) {
        throw new Error('APIからの応答が配列ではありません');
      }
      
      // 受け取ったデータをログ出力（デバッグ用）
      console.log('Geminiから受け取った元のデータ:', parsedData);
      
      // タイプの正規化 - 'jpeg'を'jpg'に変換
      const normalizedData = parsedData.map(item => {
        // typeフィールドをチェックして標準化
        let normalizedType = item.type;
        if (normalizedType === 'jpeg') {
          normalizedType = 'jpg';
        } else if (normalizedType !== 'svg' && normalizedType !== 'png' && normalizedType !== 'jpg') {
          // 不明な形式はデフォルトで'png'に
          normalizedType = 'png';
        }
        
        // exportScaleが有効な値であることを確認
        const exportScale = typeof item.exportScale === 'number' && (item.exportScale === 1 || item.exportScale === 2) 
          ? item.exportScale 
          : 1;
        
        // データを正規化して返す
        return {
          ...item,
          type: normalizedType as 'svg' | 'jpg' | 'png',
          exportScale: exportScale
        };
      });
      
      // 重要：Geminiが返したIDをそのまま使用する
      console.log('正規化されたデータ（元のIDを保持）:', normalizedData);
      
      // IDの検証をログ出力（figmaオブジェクトは使用しない）
      normalizedData.forEach(item => {
        console.log(`IDの検証: ${item.id}`, item);
      });
      
      return normalizedData;
    } catch (jsonError) {
      console.error('JSON解析エラー:', jsonError, 'Raw response:', responseText);
      throw new Error(`JSONの解析に失敗しました: ${jsonError.message}`);
    }
  } catch (error) {
    console.error('画像分析エラー:', error);
    
    // エラー時はデフォルト値を返す
    return imageNodes.map((node, index) => ({
      id: node.id,
      proposedName: `img-export${(index + 1).toString().padStart(2, '0')}`,
      type: 'png' as 'svg' | 'jpeg' | 'png',
      exportScale: 1,
      reason: 'AIによる分析に失敗したためデフォルト設定'
    }));
  }
}

// 画像ノードをエクスポートしてデータを取得する
async function exportImageNodesWithData(
  nodeIds: string[]
): Promise<Array<{ id: string, name: string, data: string }>> {
  return new Promise((resolve, reject) => {
    if (nodeIds.length === 0) {
      resolve([]);
      return;
    }
    
    // Figmaにメッセージを送信
    parent.postMessage(
      { pluginMessage: { type: 'export-elements-as-images', nodeIds } },
      '*'
    );
    
    // レスポンスを受け取るハンドラ
    const messageHandler = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message) return;
      
      if (message.type === 'export-images-result') {
        // ハンドラを削除
        window.removeEventListener('message', messageHandler);
        
        if (message.success) {
          console.log(`Exported ${message.images?.length || 0} images`);
          resolve(message.images || []);
        } else {
          console.error('Failed to export images:', message.error);
          reject(new Error(message.error || 'Failed to export images'));
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // タイムアウト処理
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      console.error('Timeout while waiting for image export');
      reject(new Error('Timeout while waiting for image export'));
    }, 15000);
    
    // 処理開始のデバッグログを追加
    console.log(`Sent export-elements-as-images message for ${nodeIds.length} nodes`);
  });
} 