/// <reference types="@figma/plugin-typings" />

// Figmaプラグインのメインスレッド処理
figma.showUI(__html__, { width: 550, height: 600 });

// デザイントークンの収集
function collectDesignTokens() {
  // カラースタイル収集
  const colorStyles = figma.getLocalPaintStyles();
  const colorTokens = colorStyles.map(style => ({
    name: style.name,
    description: style.description,
    paints: style.paints.map(paint => {
      if (paint.type === 'SOLID') {
        const { r, g, b } = paint.color;
        return {
          type: 'SOLID',
          color: {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a: paint.opacity || 1
          }
        };
      }
      return { type: paint.type };
    })
  }));

  // テキストスタイル収集
  const textStyles = figma.getLocalTextStyles();
  const textTokens = textStyles.map(style => ({
    name: style.name,
    description: style.description,
    fontName: style.fontName,
    fontSize: style.fontSize,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    paragraphIndent: style.paragraphIndent,
    paragraphSpacing: style.paragraphSpacing,
    textCase: style.textCase,
    textDecoration: style.textDecoration
  }));

  // エフェクトスタイル収集
  const effectStyles = figma.getLocalEffectStyles();
  const effectTokens = effectStyles.map(style => ({
    name: style.name,
    description: style.description,
    effects: style.effects
  }));

  return {
    colors: colorTokens,
    texts: textTokens,
    effects: effectTokens
  };
}

// ページデータを収集する関数
function collectPageData() {
  // 現在のページ情報
  const pageInfo = {
    name: figma.currentPage.name,
    id: figma.currentPage.id,
    backgroundColor: figma.currentPage.backgrounds,
    children: [] as any[],
    analysis: {}
  };

  // トップレベルのフレームとその情報を収集
  const topLevelFrames = figma.currentPage.children.filter(
    node => node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  );

  // データ量制限のため最大10個のフレームに制限
  const maxFrames = 10;
  const frames = topLevelFrames.slice(0, maxFrames);

  // 各フレームのデータを収集
  pageInfo.children = frames.map(frame => {
    const frameData: any = {
      id: frame.id,
      name: frame.name,
      type: frame.type,
      width: frame.width,
      height: frame.height,
      textContent: []
    };
    
    // Fills対応（フレームの背景色などを取得）
    if ('fills' in frame) {
      try {
        frameData.fills = frame.fills;
      } catch (e) {
        console.error('Error getting fills:', e);
      }
    }

    // フレーム内のすべてのテキスト要素を探索して内容を収集
    const textNodes: any[] = [];
    
    function collectTextNodes(node: SceneNode) {
      if (node.type === 'TEXT') {
        try {
          const textNode = node as TextNode;
          textNodes.push({
            id: textNode.id,
            characters: textNode.characters,
            fontSize: textNode.fontSize,
            fontName: textNode.fontName,
            x: textNode.x,
            y: textNode.y,
            width: textNode.width,
            height: textNode.height,
            fills: textNode.fills
          });
        } catch (e) {
          console.error('Error processing text node:', e);
        }
      }
      
      // 再帰的に子要素を処理
      if ('children' in node) {
        const containerNode = node as ChildrenMixin;
        for (const child of containerNode.children) {
          collectTextNodes(child);
        }
      }
    }
    
    // テキストノード収集を実行
    if ('children' in frame) {
      try {
        const containerFrame = frame as FrameNode;
        for (const child of containerFrame.children) {
          collectTextNodes(child);
        }
      } catch (e) {
        console.error('Error traversing frame children:', e);
      }
    }
    
    // データ量制限のため最大20個のテキストノードに制限
    frameData.textContent = textNodes.slice(0, 20);
    
    return frameData;
  });

  // ページ内のカラー使用状況の分析
  const colorUsage: Record<string, number> = {};
  
  function analyzeColors(node: SceneNode) {
    // fillsを持つノードを処理
    if ('fills' in node) {
      try {
        const fillsNode = node as any;
        if (Array.isArray(fillsNode.fills)) {
          fillsNode.fills.forEach((fill: any) => {
            if (fill.type === 'SOLID') {
              const { r, g, b } = fill.color;
              const colorKey = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
              colorUsage[colorKey] = (colorUsage[colorKey] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // エラー処理
      }
    }
    
    // 子要素を持つノードを再帰的に処理
    if ('children' in node) {
      try {
        const containerNode = node as ChildrenMixin;
        for (const child of containerNode.children) {
          analyzeColors(child);
        }
      } catch (e) {
        // エラー処理
      }
    }
  }
  
  // ページ全体のカラー分析を実行
  for (const node of figma.currentPage.children) {
    analyzeColors(node);
  }
  
  // 使用頻度の高い上位10色を抽出
  const topColors = Object.entries(colorUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color, count]) => ({ color, count }));
  
  // ページ分析情報を追加
  pageInfo.analysis = {
    frameCount: topLevelFrames.length,
    topColors
  };

  return pageInfo;
}

interface TextNodeLike {
  characters: string;
  fontSize?: unknown;
  fontName?: unknown;
  fontWeight?: unknown;
  letterSpacing?: unknown;
  lineHeight?: unknown;
  paragraphIndent?: unknown;
  paragraphSpacing?: unknown;
  textCase?: unknown;
  textDecoration?: unknown;
}

// 要素を再帰的に処理する関数
function getNodeInfoRecursive(node: SceneNode): any {
  // 基本情報を取得
  const baseInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible
  };
  
  // タイプ固有の情報を追加
  let nodeInfo: any = { ...baseInfo };
  
  // fillsプロパティがある場合 (PaintNode)
  if ('fills' in node && Array.isArray((node as any).fills)) {
    try {
      nodeInfo.fills = (node as any).fills;
    } catch (e) {
      // エラー処理
      console.error('Error getting fills:', e);
    }
  }
  
  // テキストノードの場合
  if (node.type === 'TEXT') {
    try {
      const textNode = node as TextNode;
      nodeInfo.characters = textNode.characters;
      nodeInfo.fontSize = textNode.fontSize;
      nodeInfo.fontName = textNode.fontName;
    } catch (e) {
      // エラー処理
      console.error('Error getting text properties:', e);
    }
  }
  
  // サイズと位置情報を追加（すべてのノードに共通）
  // 'absoluteBoundingBox'を使用してバウンディングボックスを取得
  const bounds = node.absoluteBoundingBox;
  if (bounds) {
    nodeInfo.width = bounds.width;
    nodeInfo.height = bounds.height;
    nodeInfo.x = bounds.x;
    nodeInfo.y = bounds.y;
  }
  
  // 子要素を持つ場合、再帰的に処理（深さに制限を設ける）
  const childrenContainer = node as ChildrenMixin;
  if ('children' in node && Array.isArray(childrenContainer.children)) {
    try {
      // 子要素が多すぎる場合はデータ量を制限する
      const maxChildren = 10; // 子要素の最大数を制限
      const childrenArray = Array.from(childrenContainer.children).slice(0, maxChildren);
      const childrenNodes = childrenArray.map(child => getNodeInfoRecursive(child));
      nodeInfo.children = childrenNodes;
      nodeInfo.childrenCount = childrenContainer.children.length; // 実際の子要素数を記録
      nodeInfo.truncated = childrenContainer.children.length > maxChildren; // 切り捨てられたかどうか
    } catch (e) {
      // 子要素の処理中にエラーが発生した場合
      console.error('Error processing children:', e);
    }
  }
  
  return nodeInfo;
}

// 選択要素を画像としてエクスポートする関数
async function exportSelectionAsImage(node: SceneNode): Promise<string | null> {
  try {
    // PNGとして要素をエクスポート
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 } // 2倍の解像度でエクスポート
    });
    
    // バイト配列をbase64エンコード
    const base64 = figma.base64Encode(bytes);
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error exporting node:', error);
    return null;
  }
}

// 選択要素の情報を取得
async function getSelectionInfo(includeChildren: boolean = false, includeImages: boolean = false, templateType?: string) {
  try {
    // エラーが起きそうな要素があるかチェック
    const hasProblematicInstance = figma.currentPage.selection.some(node => {
      return node.type === 'INSTANCE' && 
        (!node.mainComponent || typeof node.mainComponent === 'symbol');
    });
    
    if (hasProblematicInstance) {
      console.log('シリアライズできないインスタンスを検出しました。安全モードで処理します。');
    }
    
    // 通常の選択情報
    const basicInfo = figma.currentPage.selection.map(node => {
      try {
        const base = {
          id: node.id,
          name: node.name,
          type: node.type,
          visible: node.visible
        };

        // 特定のタイプに応じた追加情報
        if ('fills' in node) {
          try {
            // fillsを安全に処理
            const safeFills = Array.isArray(node.fills) ? 
              node.fills.map(fill => {
                if (fill && fill.type === 'SOLID' && fill.color) {
                  return {
                    type: fill.type,
                    color: {
                      r: fill.color.r,
                      g: fill.color.g,
                      b: fill.color.b
                    },
                    opacity: fill.opacity
                  };
                }
                return { type: fill ? fill.type : 'unknown' };
              }) : [];
              
            return { ...base, fills: safeFills };
          } catch (e) {
            console.error('fills処理エラー:', e);
            return base;
          }
        }
        
        // TextNodeの場合の処理
        if ('characters' in node) {
          try {
            const textNode = node as unknown as TextNodeLike;
            return {
              ...base,
              characters: textNode.characters,
              fontSize: textNode.fontSize || 'unknown',
              fontWeight: textNode.fontWeight || 'unknown',
              fontName: typeof textNode.fontName === 'object' && textNode.fontName ? {
                family: 'family' in textNode.fontName ? textNode.fontName.family : 'unknown',
                style: 'style' in textNode.fontName ? textNode.fontName.style : 'unknown'
              } : { family: 'unknown', style: 'unknown' }
            };
          } catch (e) {
            console.error('テキストノード処理エラー:', e);
            return base;
          }
        }
        
        return base;
      } catch (error) {
        console.error('基本情報取得エラー:', error);
        return { 
          id: node.id || 'unknown-id', 
          name: node.name || 'unknown-name', 
          type: node.type || 'unknown-type' 
        };
      }
    });
    
    // コーディング用の詳細情報を取得
    if (templateType === 'coding') {
      // 安全に詳細情報を取得
      const detailedInfo = figma.currentPage.selection.map(node => {
        try {
          return getDetailedNodeInfo(node);
        } catch (error) {
          console.error('詳細情報取得エラー:', error, node);
          return { 
            id: node.id, 
            name: node.name, 
            type: node.type,
            error: 'データ取得エラー'
          };
        }
      });
      
      // 基本情報と詳細情報を結合
      const codingInfo = basicInfo.map((baseNode, index) => ({
        ...baseNode,
        detailedStyles: detailedInfo[index]
      }));
      
      // 階層情報も取得する場合、詳細情報も含める
      if (includeChildren) {
        try {
          // 安全に階層情報を取得
          const hierarchyInfo = figma.currentPage.selection.map(node => {
            try {
              return getNodeInfoRecursiveWithStyles(node);
            } catch (error) {
              console.error('階層情報取得エラー:', error, node);
              return { 
                id: node.id, 
                name: node.name, 
                type: node.type,
                error: '階層データ取得エラー'
              };
            }
          });
          
          const combinedInfo = codingInfo.map((codeNode, index) => ({
            ...codeNode,
            hierarchy: hierarchyInfo[index]
          }));
          
          // 画像も含める場合
          if (includeImages) {
            try {
              const imagePromises = figma.currentPage.selection.map(node => exportSelectionAsImage(node));
              const images = await Promise.all(imagePromises);
              
              const result = combinedInfo.map((node, index) => ({
                ...node,
                imageData: images[index]
              }));
              
              // JSON.stringifyとJSO.parseでシリアライズ可能なデータだけを確実に返す
              return JSON.parse(JSON.stringify(result, (key, value) => {
                // Base64の画像データは特別に処理（そのまま保持）
                if (key === 'imageData' && typeof value === 'string' && value.startsWith('data:image')) {
                  return value;
                }
                // Symbolはnullに変換
                if (typeof value === 'symbol') {
                  return null;
                }
                return value;
              }));
            } catch (error) {
              console.error('画像含む階層情報取得エラー:', error);
              return combinedInfo.map(node => ({
                ...node,
                error: '画像取得エラー'
              }));
            }
          }
          
          // JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す
          return JSON.parse(JSON.stringify(combinedInfo, (key, value) => {
            // Symbolはnullに変換
            if (typeof value === 'symbol') {
              return null;
            }
            return value;
          }));
        } catch (error) {
          console.error('階層情報処理エラー:', error);
          return codingInfo;
        }
      }
      
      // 画像のみ含める場合
      if (includeImages) {
        try {
          const imagePromises = figma.currentPage.selection.map(node => exportSelectionAsImage(node));
          const images = await Promise.all(imagePromises);
          
          const result = codingInfo.map((node, index) => ({
            ...node,
            imageData: images[index]
          }));
          
          // JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す（画像データは保持）
          return JSON.parse(JSON.stringify(result, (key, value) => {
            // Base64の画像データは特別に処理（そのまま保持）
            if (key === 'imageData' && typeof value === 'string' && value.startsWith('data:image')) {
              return value;
            }
            // Symbolはnullに変換
            if (typeof value === 'symbol') {
              return null;
            }
            return value;
          }));
        } catch (error) {
          console.error('画像情報処理エラー:', error);
          return codingInfo;
        }
      }
      
      // JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す
      return JSON.parse(JSON.stringify(codingInfo, (key, value) => {
        // Symbolはnullに変換
        if (typeof value === 'symbol') {
          return null;
        }
        return value;
      }));
    }
    
    // 通常の階層情報処理（非コーディングモード）
    if (includeChildren) {
      try {
        const hierarchyInfo = figma.currentPage.selection.map(node => getNodeInfoRecursive(node));
        
        // 基本情報と階層情報を結合
        const combinedInfo = basicInfo.map((baseNode, index) => ({
          ...baseNode,
          hierarchy: hierarchyInfo[index]
        }));
        
        // 画像も含める場合
        if (includeImages) {
          try {
            const imagePromises = figma.currentPage.selection.map(node => exportSelectionAsImage(node));
            const images = await Promise.all(imagePromises);
            
            const result = combinedInfo.map((node, index) => ({
              ...node,
              imageData: images[index]
            }));
            
            // JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す（画像データは保持）
            return JSON.parse(JSON.stringify(result, (key, value) => {
              // Base64の画像データは特別に処理（そのまま保持）
              if (key === 'imageData' && typeof value === 'string' && value.startsWith('data:image')) {
                return value;
              }
              // Symbolはnullに変換
              if (typeof value === 'symbol') {
                return null;
              }
              return value;
            }));
          } catch (error) {
            console.error('画像含む階層情報処理エラー:', error);
            return combinedInfo;
          }
        }
        
        // JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す
        return JSON.parse(JSON.stringify(combinedInfo, (key, value) => {
          // Symbolはnullに変換
          if (typeof value === 'symbol') {
            return null;
          }
          return value;
        }));
      } catch (error) {
        console.error('階層情報処理エラー:', error);
        return basicInfo;
      }
    }
    
    // 画像のみ含める場合
    if (includeImages) {
      try {
        const imagePromises = figma.currentPage.selection.map(node => exportSelectionAsImage(node));
        const images = await Promise.all(imagePromises);
        
        const result = basicInfo.map((node, index) => ({
          ...node,
          imageData: images[index]
        }));
        
        // JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す（画像データは保持）
        return JSON.parse(JSON.stringify(result, (key, value) => {
          // Base64の画像データは特別に処理（そのまま保持）
          if (key === 'imageData' && typeof value === 'string' && value.startsWith('data:image')) {
            return value;
          }
          // Symbolはnullに変換
          if (typeof value === 'symbol') {
            return null;
          }
          return value;
        }));
      } catch (error) {
        console.error('画像情報処理エラー:', error);
        return basicInfo;
      }
    }
    
    // 基本情報のみ返す（JSON.stringifyとJSON.parseでシリアライズ可能なデータだけを返す）
    return JSON.parse(JSON.stringify(basicInfo, (key, value) => {
      // Symbolはnullに変換
      if (typeof value === 'symbol') {
        return null;
      }
      return value;
    }));
  } catch (error) {
    console.error('選択情報取得エラー:', error);
    // エラーが発生した場合、最小限の情報だけを返す
    return figma.currentPage.selection.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));
  }
}

// コーディングに必要な詳細なノード情報を取得する関数
function getDetailedNodeInfo(node: SceneNode): any {
  try {
    const detailedInfo: any = {};
    
    // 位置情報
    if ('absoluteBoundingBox' in node && node.absoluteBoundingBox) {
      detailedInfo.bounds = {
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y,
        width: node.absoluteBoundingBox.width,
        height: node.absoluteBoundingBox.height
      };
    } else if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      detailedInfo.bounds = {
        x: (node as any).x,
        y: (node as any).y,
        width: (node as any).width,
        height: (node as any).height
      };
    }
    
    // フレームのスタイル情報
    if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'INSTANCE') {
      const frameNode = node as FrameNode | GroupNode | InstanceNode;
      
      // レイアウト情報
      if ('layoutMode' in frameNode) {
        detailedInfo.layout = {
          mode: frameNode.layoutMode,
          direction: 'layoutDirection' in frameNode ? frameNode.layoutDirection : null,
          alignment: 'primaryAxisAlignItems' in frameNode ? {
            primaryAxis: frameNode.primaryAxisAlignItems,
            counterAxis: frameNode.counterAxisAlignItems
          } : null,
          padding: 'paddingTop' in frameNode ? {
            top: frameNode.paddingTop,
            right: frameNode.paddingRight,
            bottom: frameNode.paddingBottom,
            left: frameNode.paddingLeft
          } : null,
          spacing: 'itemSpacing' in frameNode ? frameNode.itemSpacing : null
        };
      }
      
      // 背景色
      if ('backgrounds' in frameNode && Array.isArray(frameNode.backgrounds)) {
        try {
          // 安全に背景データをコピー
          const safeBackgrounds = frameNode.backgrounds.map(bg => {
            if (bg.type === 'SOLID') {
              return {
                type: bg.type,
                color: bg.color ? {
                  r: bg.color.r,
                  g: bg.color.g,
                  b: bg.color.b
                } : undefined,
                opacity: bg.opacity
              };
            }
            // その他のタイプの背景はタイプのみ保持
            return { type: bg.type };
          });
          detailedInfo.backgrounds = safeBackgrounds;
        } catch (e) {
          console.error('背景情報処理エラー:', e);
        }
      }
      
      // エフェクト（シャドウなど）
      if ('effects' in frameNode && Array.isArray(frameNode.effects)) {
        try {
          // 安全にエフェクトデータをコピー
          const safeEffects = frameNode.effects.map(effect => {
            return {
              type: effect.type,
              visible: effect.visible,
              radius: effect.radius,
              // 他の安全なプロパティも必要に応じて追加
            };
          });
          detailedInfo.effects = safeEffects;
        } catch (e) {
          console.error('エフェクト情報処理エラー:', e);
        }
      }
      
      // 枠線
      if ('strokes' in frameNode && Array.isArray(frameNode.strokes)) {
        try {
          // 安全にストロークデータをコピー
          const safeStrokes = frameNode.strokes.map(stroke => {
            if (stroke.type === 'SOLID') {
              return {
                type: stroke.type,
                color: stroke.color ? {
                  r: stroke.color.r,
                  g: stroke.color.g,
                  b: stroke.color.b
                } : undefined,
                opacity: stroke.opacity
              };
            }
            // その他のタイプのストロークはタイプのみ保持
            return { type: stroke.type };
          });
          detailedInfo.strokes = safeStrokes;
        } catch (e) {
          console.error('ストローク情報処理エラー:', e);
        }
        
        if ('strokeWeight' in frameNode) {
          detailedInfo.strokeWeight = frameNode.strokeWeight;
        }
        
        if ('strokeAlign' in frameNode) {
          detailedInfo.strokeAlign = frameNode.strokeAlign;
        }
      }
      
      // 角丸
      if ('cornerRadius' in frameNode) {
        detailedInfo.cornerRadius = frameNode.cornerRadius;
      }
    }
    
    // テキストスタイル情報
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      detailedInfo.text = {
        characters: textNode.characters,
        fontSize: textNode.fontSize,
        fontName: {
          family: typeof textNode.fontName === 'object' && 'family' in textNode.fontName ? 
            textNode.fontName.family : 'unknown',
          style: typeof textNode.fontName === 'object' && 'style' in textNode.fontName ? 
            textNode.fontName.style : 'unknown'
        },
        fontWeight: textNode.fontWeight,
        letterSpacing: typeof textNode.letterSpacing === 'object' && 'value' in textNode.letterSpacing ? 
          { value: textNode.letterSpacing.value, unit: textNode.letterSpacing.unit } : 
          textNode.letterSpacing,
        lineHeight: typeof textNode.lineHeight === 'object' ? 
          { 
            // オブジェクトの内容を安全に抽出
            ...(('value' in textNode.lineHeight) ? { value: textNode.lineHeight.value } : {}),
            ...(('unit' in textNode.lineHeight) ? { unit: textNode.lineHeight.unit } : {})
          } : 
          textNode.lineHeight,
        paragraphIndent: textNode.paragraphIndent,
        paragraphSpacing: textNode.paragraphSpacing,
        textAlignHorizontal: textNode.textAlignHorizontal,
        textAlignVertical: textNode.textAlignVertical,
        textCase: textNode.textCase,
        textDecoration: textNode.textDecoration,
        textAutoResize: textNode.textAutoResize
      };
      
      // テキストスタイル
      if ('fills' in textNode && Array.isArray(textNode.fills)) {
        try {
          // 安全にfillsデータをコピー
          const safeFills = textNode.fills.map(fill => {
            if (fill.type === 'SOLID') {
              return {
                type: fill.type,
                color: fill.color ? {
                  r: fill.color.r,
                  g: fill.color.g,
                  b: fill.color.b
                } : undefined,
                opacity: fill.opacity
              };
            }
            // その他のタイプのfillはタイプのみ保持
            return { type: fill.type };
          });
          detailedInfo.text.fills = safeFills;
        } catch (e) {
          console.error('テキストfills情報処理エラー:', e);
        }
      }
    }
    
    // ベクターノードの場合
    if (node.type === 'VECTOR' || node.type === 'LINE' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'RECTANGLE') {
      if ('fills' in node && Array.isArray(node.fills)) {
        try {
          // 安全にfillsデータをコピー
          const safeFills = node.fills.map(fill => {
            if (fill.type === 'SOLID') {
              return {
                type: fill.type,
                color: fill.color ? {
                  r: fill.color.r,
                  g: fill.color.g,
                  b: fill.color.b
                } : undefined,
                opacity: fill.opacity
              };
            }
            // その他のタイプのfillはタイプのみ保持
            return { type: fill.type };
          });
          detailedInfo.fills = safeFills;
        } catch (e) {
          console.error('fills情報処理エラー:', e);
        }
      }
      
      if ('strokes' in node && Array.isArray(node.strokes)) {
        try {
          // 安全にストロークデータをコピー
          const safeStrokes = node.strokes.map(stroke => {
            if (stroke.type === 'SOLID') {
              return {
                type: stroke.type,
                color: stroke.color ? {
                  r: stroke.color.r,
                  g: stroke.color.g,
                  b: stroke.color.b
                } : undefined,
                opacity: stroke.opacity
              };
            }
            // その他のタイプのストロークはタイプのみ保持
            return { type: stroke.type };
          });
          detailedInfo.strokes = safeStrokes;
        } catch (e) {
          console.error('ストローク情報処理エラー:', e);
        }
        
        if ('strokeWeight' in node) {
          detailedInfo.strokeWeight = node.strokeWeight;
        }
        
        if ('strokeAlign' in node) {
          detailedInfo.strokeAlign = node.strokeAlign;
        }
      }
      
      // 矩形の場合の角丸
      if (node.type === 'RECTANGLE' && 'cornerRadius' in node) {
        detailedInfo.cornerRadius = node.cornerRadius;
      }
    }
    
    // コンポーネント情報
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      detailedInfo.component = {
        id: node.id,
        name: node.name
      };
      
      if (node.type === 'INSTANCE') {
        const instanceNode = node as InstanceNode;
        
        // コンポーネントID情報
        if ('componentId' in instanceNode) {
          detailedInfo.component.componentId = instanceNode.componentId;
        }
        
        // インスタンスの場合、元のコンポーネントの情報も安全に取得
        if (instanceNode.mainComponent) {
          try {
            detailedInfo.component.mainComponent = {
              id: instanceNode.mainComponent.id,
              name: instanceNode.mainComponent.name,
              type: instanceNode.mainComponent.type
            };
            
            // 元のコンポーネントのサイズ情報
            if (instanceNode.mainComponent.width && instanceNode.mainComponent.height) {
              detailedInfo.component.mainComponent.width = instanceNode.mainComponent.width;
              detailedInfo.component.mainComponent.height = instanceNode.mainComponent.height;
            }
          } catch (e) {
            console.error('元コンポーネント情報取得エラー:', e);
          }
        }
        
        // インスタンスのプロパティリスト (variantProperties) を安全に取得
        if ('componentProperties' in instanceNode && instanceNode.componentProperties) {
          try {
            const safeProperties: Record<string, any> = {};
            
            // プロパティを一つずつ安全に処理
            Object.entries(instanceNode.componentProperties).forEach(([key, property]) => {
              safeProperties[key] = {
                type: property.type,
                value: property.value
              };
            });
            
            detailedInfo.component.properties = safeProperties;
          } catch (e) {
            console.error('コンポーネントプロパティ処理エラー:', e);
          }
        }
      }
    }
    
    // オブジェクトをJSON.stringify→JSON.parseでシリアライズ可能なものだけにする
    return JSON.parse(JSON.stringify(detailedInfo));
  } catch (error) {
    console.error('詳細情報取得エラー:', error);
    // エラーが発生した場合は最小限の情報を返す
    return {
      id: node.id,
      type: node.type,
      name: node.name
    };
  }
}

// 階層構造を持つノードの詳細情報を再帰的に取得（スタイル情報含む）
function getNodeInfoRecursiveWithStyles(node: SceneNode): any {
  try {
    // 基本情報と詳細スタイル情報を取得
    const baseInfo = getNodeInfoRecursive(node);
    const detailedInfo = getDetailedNodeInfo(node);
    
    // 情報を結合
    const combinedInfo = {
      ...baseInfo,
      detailedStyles: detailedInfo
    };
    
    // 子要素を持つ場合、再帰的に処理（深さに制限を設ける）
    const childrenContainer = node as ChildrenMixin;
    if ('children' in node && Array.isArray(childrenContainer.children)) {
      try {
        // 子要素が多すぎる場合はデータ量を制限する
        const maxChildren = 10; // 子要素の最大数を制限
        const childrenArray = Array.from(childrenContainer.children).slice(0, maxChildren);
        const childrenNodes = childrenArray.map(child => getNodeInfoRecursiveWithStyles(child));
        combinedInfo.children = childrenNodes;
        combinedInfo.childrenCount = childrenContainer.children.length; // 実際の子要素数を記録
        combinedInfo.truncated = childrenContainer.children.length > maxChildren; // 切り捨てられたかどうか
      } catch (e) {
        // 子要素の処理中にエラーが発生した場合
        console.error('Error processing children with styles:', e);
      }
    }
    
    // オブジェクトをJSON.stringify→JSON.parseでシリアライズ可能なものだけにする
    return JSON.parse(JSON.stringify(combinedInfo));
  } catch (error) {
    console.error('再帰的詳細情報取得エラー:', error);
    // エラーが発生した場合は最小限の情報を返す
    return {
      id: node.id,
      type: node.type,
      name: node.name
    };
  }
}

// 選択変更時のイベント
figma.on('selectionchange', async () => {
  try {
    // 環境設定から値を取得
    const includeChildren = await figma.clientStorage.getAsync('include-children') || false;
    const includeImages = await figma.clientStorage.getAsync('include-images') || false;
    
    const selectionInfo = await getSelectionInfo(includeChildren, includeImages);
    
    figma.ui.postMessage({
      type: 'selection-update',
      selection: selectionInfo
    });
  } catch (error) {
    console.error('Error in selectionchange handler:', error);
    // エラーが発生した場合は、基本情報のみを送信
    figma.ui.postMessage({
      type: 'selection-update',
      selection: figma.currentPage.selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type
      }))
    });
  }
});

// code.ts
figma.clientStorage.getAsync('gemini-api-key').then(apiKey => {
  // APIキーをUIに送信
  figma.ui.postMessage({
    type: 'api-key',
    apiKey: apiKey || ''
  });
});

// HTMLコーディング用のプロンプトを取得
figma.clientStorage.getAsync('coding-prompt').then(codingPrompt => {
  // コーディングプロンプトをUIに送信
  figma.ui.postMessage({
    type: 'coding-prompt',
    codingPrompt: codingPrompt || 'FLOCSS'
  });
});

// UIからのメッセージ処理
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'ui-loaded') {
    console.log('UI loaded successfully');
    try {
      // UIが読み込まれたらデータを送信
      const includeChildren = await figma.clientStorage.getAsync('include-children') || false;
      const includeImages = await figma.clientStorage.getAsync('include-images') || false;
      // コーディングプロンプトを取得してtemplateTypeとして使用
      const codingPrompt = await figma.clientStorage.getAsync('coding-prompt') || 'FLOCSS';
      const templateType = 'coding'; // デフォルトはcodingとして初期化
      
      const selectionInfo = await getSelectionInfo(includeChildren, includeImages, templateType);
      
      figma.ui.postMessage({
        type: 'init-data',
        designTokens: collectDesignTokens(),
        selection: selectionInfo
      });
      
      // コーディングプロンプトも送信
      figma.ui.postMessage({
        type: 'coding-prompt',
        codingPrompt: codingPrompt
      });
    } catch (error) {
      console.error('Error sending initial data:', error);
      // エラーが発生した場合は、基本情報のみを送信
      figma.ui.postMessage({
        type: 'init-data',
        designTokens: collectDesignTokens(),
        selection: figma.currentPage.selection.map(node => ({
          id: node.id,
          name: node.name,
          type: node.type
        }))
      });
    }
  } else if (msg.type === 'update-selection-settings') {
    // 選択要素取得の設定を更新
    const { includeChildren, includeImages, templateType } = msg;
    await figma.clientStorage.setAsync('include-children', includeChildren);
    await figma.clientStorage.setAsync('include-images', includeImages);
    
    try {
      // 最新の選択情報を送信
      const selectionInfo = await getSelectionInfo(includeChildren, includeImages, templateType);
      figma.ui.postMessage({
        type: 'selection-update',
        selection: selectionInfo
      });
    } catch (error) {
      console.error('Error updating selection with new settings:', error);
      figma.notify('選択情報の更新中にエラーが発生しました', { error: true });
    }
  } else if (msg.type === 'get-api-key') {
    // APIキー取得リクエストへの応答
    try {
      const apiKey = await figma.clientStorage.getAsync('gemini-api-key') || '';
      figma.ui.postMessage({
        type: 'api-key-result',
        apiKey
      });
    } catch (error) {
      console.error('APIキー取得エラー:', error);
      figma.ui.postMessage({
        type: 'api-key-result',
        apiKey: ''
      });
    }

  } else if (msg.type === 'save-api-key') {
    // APIキー保存
    try {
      await figma.clientStorage.setAsync('gemini-api-key', msg.apiKey);
    } catch (error) {
      console.error('APIキー保存エラー:', error);
    }
  } else if (msg.type === 'get-model-settings') {
    // モデル設定取得
    try {
      const settings = {
        selectedModelId: await figma.clientStorage.getAsync('selected-model-id') || 'gemini-2-5-pro',
        customModelId: await figma.clientStorage.getAsync('custom-model-id') || '',
        showCustomModelInput: await figma.clientStorage.getAsync('show-custom-model') || false,
        generateWidth: await figma.clientStorage.getAsync('generate-width') || 'auto',
        generateHeight: await figma.clientStorage.getAsync('generate-height') || 'auto',
        includeChildren: await figma.clientStorage.getAsync('include-children') || false,
        includeImages: await figma.clientStorage.getAsync('include-images') || false,
        basePrompt: await figma.clientStorage.getAsync('base-prompt') || ''
      };
      figma.ui.postMessage({
        type: 'model-settings-result',
        settings
      });
    } catch (error) {
      console.error('モデル設定取得エラー:', error);
      // デフォルト値を返す
      figma.ui.postMessage({
        type: 'model-settings-result',
        settings: {
          selectedModelId: 'gemini-2-5-pro',
          customModelId: '',
          showCustomModelInput: false,
          generateWidth: 'auto',
          generateHeight: 'auto',
          includeChildren: false,
          includeImages: false,
          basePrompt: ''
        }
      });
    }
  } else if (msg.type === 'save-model-settings') {
    // モデル設定保存
    try {
      const { 
        selectedModelId, 
        customModelId, 
        showCustomModelInput, 
        generateWidth, 
        generateHeight,
        includeChildren,
        includeImages,
        basePrompt
      } = msg;
      
      await figma.clientStorage.setAsync('selected-model-id', selectedModelId);
      await figma.clientStorage.setAsync('custom-model-id', customModelId);
      await figma.clientStorage.setAsync('show-custom-model', showCustomModelInput);
      await figma.clientStorage.setAsync('generate-width', generateWidth);
      await figma.clientStorage.setAsync('generate-height', generateHeight);
      
      if (includeChildren !== undefined) {
        await figma.clientStorage.setAsync('include-children', includeChildren);
      }
      
      if (includeImages !== undefined) {
        await figma.clientStorage.setAsync('include-images', includeImages);
      }
      
      if (basePrompt !== undefined) {
        await figma.clientStorage.setAsync('base-prompt', basePrompt);
      }
    } catch (error) {
      console.error('モデル設定保存エラー:', error);
    }
  } else if (msg.type === 'get-page-data') {
    // ページデータ取得リクエスト
    try {
      const pageData = collectPageData();
      figma.ui.postMessage({
        type: 'page-data-result',
        pageData
      });
    } catch (error) {
      console.error('ページデータ収集エラー:', error);
      figma.ui.postMessage({
        type: 'page-data-result',
        pageData: {
          name: figma.currentPage.name,
          error: 'ページデータの収集中にエラーが発生しました'
        },
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (msg.type === 'insert-svg') {
    try {
      const svgNode = figma.createNodeFromSvg(msg.svg);
      
      // SVGのサイズ情報がある場合は、ノードのサイズを調整
      if (msg.width && msg.height) {
        // SVGのサイズを指定のサイズに調整
        svgNode.resize(msg.width, msg.height);
      }
      
      // バッチ生成モードの場合、名前を設定
      if (msg.isBatchGeneration && msg.batchItemTitle) {
        svgNode.name = `${msg.batchItemTitle} (${msg.batchIndex + 1}/${msg.batchTotal})`;
      } else {
        svgNode.name = 'Generated SVG';
      }
      
      // ビューポートの中央に配置
      const center = figma.viewport.center;
      svgNode.x = center.x - svgNode.width / 2;
      svgNode.y = center.y - svgNode.height / 2;
      
      // 選択状態にする
      figma.currentPage.selection = [svgNode];
      figma.viewport.scrollAndZoomIntoView([svgNode]);
      
      // 挿入したノードのIDを返す（一括生成モードでの追跡用）
      figma.ui.postMessage({ 
        type: 'svg-inserted', 
        success: true,
        nodeId: svgNode.id,
        isBatchGeneration: msg.isBatchGeneration,
        batchIndex: msg.batchIndex
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'svg-inserted', 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        isBatchGeneration: msg.isBatchGeneration
      });
    }
  } else if (msg.type === 'insert-image') {
    try {
      // Base64エンコードされた画像データ
      const imageData = msg.imageData;
      if (!imageData) {
        throw new Error('画像データがありません');
      }
      
      // Figmaにレクタングルを作成
      const rect = figma.createRectangle();
      
      // 画像データからバイナリデータを取得
      const base64Data = imageData.split(',')[1];
      const imageBytes = figma.base64Decode(base64Data);
      
      // バイト配列から画像を作成
      const imageHash = figma.createImage(imageBytes).hash;
      
      // レクタングルに画像を塗りつぶしとして設定
      const imagePaint: ImagePaint = {
        type: 'IMAGE',
        scaleMode: 'FILL',
        imageHash
      };
      rect.fills = [imagePaint];
      
      // サイズ調整
      if (msg.width && msg.height) {
        // 指定されたサイズでリサイズ
        const targetWidth = parseFloat(msg.width);
        const targetHeight = parseFloat(msg.height);
        
        // 有効なサイズの場合のみリサイズ
        if (!isNaN(targetWidth) && !isNaN(targetHeight) && targetWidth > 0 && targetHeight > 0) {
          console.log(`画像挿入: サイズ=${targetWidth}x${targetHeight}, アスペクト比=${msg.aspectRatio || '未指定'}`);
          rect.resize(targetWidth, targetHeight);
          
          // 受け取ったアスペクト比をノード名に反映（デバッグ用）
          if (msg.aspectRatio) {
            rect.name = `Generated Image (${msg.aspectRatio})`;
          } else {
            rect.name = 'Generated Image';
          }
        } else {
          // デフォルトサイズ
          rect.resize(500, 500);
          rect.name = 'Generated Image (Default Size)';
        }
      } else {
        // デフォルトサイズ
        rect.resize(500, 500);
        rect.name = 'Generated Image (Default Size)';
      }
      
      // ビューポートの中央に配置
      const center = figma.viewport.center;
      rect.x = center.x - rect.width / 2;
      rect.y = center.y - rect.height / 2;
      
      // 選択状態にする
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      
      figma.ui.postMessage({ type: 'image-inserted', success: true });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'image-inserted', 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (msg.type === 'get-updated-tokens') {
    // トークン更新リクエスト
    figma.ui.postMessage({
      type: 'updated-tokens',
      designTokens: collectDesignTokens()
    });
  } else if (msg.type === 'notify') {
    // 通知表示
    figma.notify(msg.message);
  } else if (msg.type === 'resize-ui') {
    // UIサイズ変更
    figma.ui.resize(msg.width, msg.height);
  } else if (msg.type === 'close-plugin') {
    figma.closePlugin(msg.message);
  } else if (msg.type === 'save-coding-prompt') {
    // コーディングプロンプトを保存
    try {
      await figma.clientStorage.setAsync('coding-prompt', msg.codingPrompt);
      figma.notify('コーディングプロンプトを保存しました');
    } catch (error) {
      console.error('コーディングプロンプト保存エラー:', error);
      figma.notify('コーディングプロンプトの保存に失敗しました', { error: true });
    }
  } else if (msg.type === 'get-coding-prompt') {
    // コーディングプロンプト取得リクエストへの応答
    try {
      const codingPrompt = await figma.clientStorage.getAsync('coding-prompt') || 'FLOCSS';
      figma.ui.postMessage({
        type: 'coding-prompt-result',
        codingPrompt
      });
    } catch (error) {
      console.error('コーディングプロンプト取得エラー:', error);
      figma.ui.postMessage({
        type: 'coding-prompt-result',
        codingPrompt: 'FLOCSS'
      });
    }
  } else if (msg.type === 'get-selection-with-template-type') {
    // テンプレートタイプを指定して選択情報を取得
    try {
      const includeChildren = await figma.clientStorage.getAsync('include-children') || false;
      const includeImages = await figma.clientStorage.getAsync('include-images') || false;
      const templateType = msg.templateType as string;
      
      // 選択されたアイテムがあるか確認
      if (figma.currentPage.selection.length === 0) {
        figma.notify('選択された要素がありません。Figmaで要素を選択してください。');
        figma.ui.postMessage({
          type: 'selection-with-template-type-result',
          selection: [],
          templateType: templateType,
          error: '選択要素がありません'
        });
        return;
      }
      
      // インスタンスが含まれているか確認
      const hasInstances = figma.currentPage.selection.some(node => node.type === 'INSTANCE');
      if (hasInstances) {
        console.log('選択にインスタンスが含まれています。データを慎重に処理します。');
      }
      
      // 選択情報を安全に取得
      const selectionInfo = await getSelectionInfo(includeChildren, includeImages, templateType);
      
      // 成功結果を返す
      figma.ui.postMessage({
        type: 'selection-with-template-type-result',
        selection: selectionInfo,
        templateType: templateType
      });
    } catch (error) {
      // エラー処理を強化
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('テンプレートタイプ付き選択情報取得エラー:', errorMessage);
      
      // エラーの詳細情報を含むメッセージをユーザーに表示
      let userMessage = '選択情報の取得中にエラーが発生しました。';
      
      // エラーの種類に基づいて追加情報を提供
      if (errorMessage.includes('symbol') || errorMessage.includes('unwrap')) {
        userMessage += ' コンポーネントインスタンスのデータを安全に処理できませんでした。';
      }
      
      figma.notify(userMessage, { error: true, timeout: 5000 });
      
      // エラー情報をUIに送信
      figma.ui.postMessage({
        type: 'selection-with-template-type-result',
        selection: figma.currentPage.selection.map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          error: 'データ取得エラー'
        })),
        templateType: msg.templateType as string,
        error: errorMessage
      });
    }
  }
}; 