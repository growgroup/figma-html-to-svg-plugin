import { elementToSVG, inlineResources } from 'dom-to-svg';
import { DesignTokens } from '../utils/types';

// HTMLをSVGに変換する関数
export async function convertHtmlToSvg(
  htmlString: string,
  designTokens: DesignTokens | null,
  width?: number | string,
  height?: number | string
): Promise<{ svg: string, width: number, height: number }> {
  // コンテナ作成
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0px';
  
  // 幅と高さを設定
  if (width && width !== 'auto') {
    container.style.width = typeof width === 'number' ? `${width}px` : width;
  } else {
    container.style.width = '800px'; // デフォルト幅
  }
  
  if (height && height !== 'auto') {
    container.style.height = typeof height === 'number' ? `${height}px` : height;
  }
  
  container.style.maxWidth = '1200px';
  container.style.fontFamily = 'sans-serif';
  document.body.appendChild(container);
  
  try {
    // HTMLをDOMに設定
    container.innerHTML = htmlString;
    
    // デザイントークンからCSSを生成して適用
    if (designTokens) {
      applyDesignTokenStyles(container, designTokens);
    }
    
    // スタイルが適用されるのを待つ (必要に応じて)
    await waitForStyles();
    
    // dom-to-svgを使用してSVGを生成
    const svgDocument = elementToSVG(container);
    
    // SVGのサイズを設定
    const svgRoot = svgDocument.documentElement;
    const bbox = container.getBoundingClientRect();
    
    // 指定サイズがある場合はそれを使用、なければ実際のサイズを使用
    const finalWidth = width && width !== 'auto' ? (typeof width === 'number' ? width : parseInt(width)) : bbox.width;
    const finalHeight = height && height !== 'auto' ? (typeof height === 'number' ? height : parseInt(height)) : bbox.height;
    
    svgRoot.setAttribute('width', `${finalWidth}`);
    svgRoot.setAttribute('height', `${finalHeight}`);
    
    // viewBoxも設定して、SVGが適切に表示されるようにする
    svgRoot.setAttribute('viewBox', `0 0 ${finalWidth} ${finalHeight}`);
    
    // 外部リソースをインライン化
    await inlineResources(svgDocument.documentElement);
    
    // SVG文字列を取得
    const svgString = new XMLSerializer().serializeToString(svgDocument);
    
    return {
      svg: svgString,
      width: finalWidth,
      height: finalHeight
    };
  } finally {
    // コンテナを削除
    document.body.removeChild(container);
  }
}

// デザイントークンからスタイルを適用
function applyDesignTokenStyles(container: HTMLElement, designTokens: DesignTokens): void {
  // カラー変数設定
  const colorVars = designTokens.colors.reduce((acc, token) => {
    const paint = token.paints[0];
    if (paint?.type === 'SOLID' && paint.color) {
      const { r, g, b, a } = paint.color;
      acc[`--color-${token.name.replace(/\s+/g, '-').toLowerCase()}`] = 
        `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return acc;
  }, {} as Record<string, string>);
  
  // テキストスタイル変数設定
  const textVars = designTokens.texts.reduce((acc, token) => {
    acc[`--font-size-${token.name.replace(/\s+/g, '-').toLowerCase()}`] = 
      `${token.fontSize}px`;
    
    if (token.fontName) {
      acc[`--font-family-${token.name.replace(/\s+/g, '-').toLowerCase()}`] = 
        `"${token.fontName.family}", sans-serif`;
    }
    
    return acc;
  }, {} as Record<string, string>);
  
  // スタイル変数をコンテナに適用
  Object.entries({ ...colorVars, ...textVars }).forEach(([key, value]) => {
    container.style.setProperty(key, value);
  });
  
  // スタイル要素の作成
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }
  `;
  container.appendChild(styleEl);
}

// スタイル適用を待つためのヘルパー関数
function waitForStyles(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 100);
    });
  });
} 