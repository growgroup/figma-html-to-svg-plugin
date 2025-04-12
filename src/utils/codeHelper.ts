import { CodeGenerationOptions } from './types';
import JSZip from 'jszip';

export function separateHtmlAndCss(htmlContent: string): { html: string, css: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // CSS収集
  let css = '';
  const styleElements = doc.querySelectorAll('style');
  styleElements.forEach(style => {
    css += style.textContent + '\n';
    style.remove(); // スタイル要素を削除
  });
  
  // インラインスタイルがある場合も処理
  const elementsWithStyle = doc.querySelectorAll('[style]');
  if (elementsWithStyle.length > 0) {
    css += '\n/* Extracted inline styles */\n';
    elementsWithStyle.forEach((el, index) => {
      const className = `inline-style-${index}`;
      const inlineStyle = el.getAttribute('style');
      
      // クラス名を追加
      el.classList.add(className);
      
      // インラインスタイルをCSSに変換
      css += `.${className} {\n  ${inlineStyle?.split(';').join(';\n  ')}\n}\n`;
      
      // インラインスタイルを削除
      el.removeAttribute('style');
    });
  }
  
  // スタイルタグの代わりにリンクタグを追加
  const head = doc.querySelector('head');
  if (head) {
    // 既存のlinkタグがあるか確認
    const existingLink = doc.querySelector('link[rel="stylesheet"][href$="style.css"]');
    if (!existingLink) {
      const linkElement = doc.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = './style.css';
      head.appendChild(linkElement);
    }
  }
  
  // HTML取得
  const html = doc.documentElement.outerHTML;
  
  return { html, css };
}

export function processHtmlWithPrefixes(
  html: string,
  options: CodeGenerationOptions,
  isBatchItem: boolean = false,
  useCommonCss: boolean = false
): { html: string, css: string } {
  // プレフィックスの適用が不要な場合は単純分離を行う
  if (!options.addPrefix) {
    return separateHtmlAndCss(html);
  }
  
  const prefix = options.prefix || 'component';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // CSS収集
  let cssText = '';
  const styleElements = doc.querySelectorAll('style');
  styleElements.forEach(style => {
    cssText += style.textContent + '\n';
    style.remove();
  });
  
  // インラインスタイルがある場合も処理
  const elementsWithStyle = doc.querySelectorAll('[style]');
  if (elementsWithStyle.length > 0) {
    cssText += '\n/* Extracted inline styles */\n';
    elementsWithStyle.forEach((el, index) => {
      const className = `${prefix}-inline-style-${index}`;
      const inlineStyle = el.getAttribute('style');
      
      // クラス名を追加
      el.classList.add(className);
      
      // インラインスタイルをCSSに変換
      cssText += `.${className} {\n  ${inlineStyle?.split(';').join(';\n  ')}\n}\n`;
      
      // インラインスタイルを削除
      el.removeAttribute('style');
    });
  }
  
  // CSSにプレフィックスを適用
  const processedCss = addPrefixesToCss(cssText, prefix);
  
  // HTMLのクラス名にプレフィックスを適用
  const elements = doc.querySelectorAll('[class]');
  elements.forEach(element => {
    const oldClasses = element.getAttribute('class')?.split(' ') || [];
    const newClasses = oldClasses.map(cls => {
      // 既にプレフィックスが付いているクラスはスキップ
      if (cls.startsWith(`${prefix}-`)) return cls;
      // インラインスタイル用のクラスも既に処理済みなのでスキップ
      if (cls.startsWith('inline-style-')) return `${prefix}-${cls}`;
      return `${prefix}-${cls}`;
    });
    element.setAttribute('class', newClasses.join(' '));
  });
  
  // スタイルタグの代わりにリンクタグを追加
  const head = doc.querySelector('head');
  if (head) {
    // 既存のlinkタグを確認
    const existingLinks = doc.querySelectorAll('link[rel="stylesheet"]');
    let cssLinkExists = false;
    
    // 既存のlinkタグの中からstyle.cssへの参照を探す
    existingLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.endsWith('style.css') || href.endsWith('common/style.css'))) {
        // パスを適切に調整
        if (isBatchItem && useCommonCss) {
          link.setAttribute('href', '../common/style.css');
        } else {
          link.setAttribute('href', './style.css');
        }
        cssLinkExists = true;
      }
    });
    
    // CSSへのリンクが存在しない場合は新しく追加
    if (!cssLinkExists) {
      const linkElement = doc.createElement('link');
      linkElement.rel = 'stylesheet';
      
      // バッチ生成かつ共通CSS使用の場合は相対パスを調整
      if (isBatchItem && useCommonCss) {
        linkElement.href = '../common/style.css';
      } else {
        linkElement.href = './style.css';
      }
      
      head.appendChild(linkElement);
    }
  }
  
  // HTML取得
  const processedHtml = doc.documentElement.outerHTML;
  
  return { html: processedHtml, css: processedCss };
}

export function addPrefixesToCss(css: string, prefix: string): string {
  // CSSセレクターにプレフィックスを追加する
  // セレクタの開始位置（行頭または } の後）から { までの範囲でのみマッチングを行う
  return css.replace(/(^|\}|\,)\s*\.([a-zA-Z0-9_-]+)(?=[\s\,\{])/g, (match, separator, className) => {
    // すでにプレフィックスが付いている場合は処理しない
    if (className.startsWith(`${prefix}-`)) {
      return `${separator}.${className}`;
    }
    return `${separator}.${prefix}-${className}`;
  });
}

export function mergeCssFiles(cssFiles: string[]): string {
  // 単純な結合ではなく、重複を避けたマージ
  const cssRules = new Map<string, string>();
  
  cssFiles.forEach(css => {
    // CSSをルールに分割
    const rules = css.split('}').filter(rule => rule.trim().length > 0);
    
    rules.forEach(rule => {
      const parts = rule.split('{');
      if (parts.length === 2) {
        const selector = parts[0].trim();
        const styles = parts[1].trim();
        
        if (cssRules.has(selector)) {
          // 既存スタイルとマージ
          const existing = cssRules.get(selector) || '';
          const mergedStyles = mergeStyles(existing, styles);
          cssRules.set(selector, mergedStyles);
        } else {
          cssRules.set(selector, styles);
        }
      }
    });
  });
  
  // マップからCSSテキストに変換
  let result = '';
  cssRules.forEach((styles, selector) => {
    result += `${selector} {\n  ${styles}\n}\n\n`;
  });
  
  return result;
}

function mergeStyles(existing: string, newStyles: string): string {
  // スタイルプロパティをマージ
  const properties = new Map<string, string>();
  
  // 既存スタイルを分割
  existing.split(';').filter(prop => prop.trim().length > 0).forEach(prop => {
    const [key, value] = prop.split(':');
    if (key && value) {
      properties.set(key.trim(), value.trim());
    }
  });
  
  // 新しいスタイルを分割して追加/上書き
  newStyles.split(';').filter(prop => prop.trim().length > 0).forEach(prop => {
    const [key, value] = prop.split(':');
    if (key && value) {
      properties.set(key.trim(), value.trim());
    }
  });
  
  // マップからスタイル文字列に変換
  return Array.from(properties.entries())
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
}

export async function createAndDownloadZip(
  files: Array<{ name: string, content: string }>,
  zipName: string,
  images: Array<{id: string, name: string, data: string}> = [],
  imageProposals: Array<{ id: string, proposedName: string, type: string }> = []
): Promise<void> {
  const zip = new JSZip();
  
  // テキストファイルをZIPに追加
  files.forEach(file => {
    console.log(`Adding file to ZIP: ${file.name}`);
    // ディレクトリを含むパスをサポート
    zip.file(file.name, file.content);
  });
  
  // 画像ファイルをZIPに追加
  if (images.length > 0) {
    console.log(`Adding ${images.length} images to ZIP`);
    
    // ディレクトリ構造を判定（階層を含むパスが1つでもあれば複数階層と判断）
    const hasMultipleDirectories = files.some(file => file.name.includes('/'));
    
    images.forEach(image => {
      try {
        // 名前の決定 (提案された名前があれば使用)
        let imgName = image.name;
        let imgType = 'png'; // デフォルト
        
        // 拡張子を除去して取得（すでに拡張子がある場合）
        if (imgName.includes('.')) {
          const parts = imgName.split('.');
          imgType = parts.pop() || 'png';
          imgName = parts.join('.');
        }
        
        // 提案情報があれば適用
        const proposal = imageProposals.find(p => p.id === image.id);
        if (proposal) {
          imgName = proposal.proposedName;
          imgType = proposal.type === 'jpeg' ? 'jpg' : proposal.type;
        } else {
          // 提案がない場合は名前をクリーンに
          imgName = imgName.replace(/\s+/g, '-').toLowerCase();
        }
        
        // Base64データからバイナリデータを抽出
        const base64Parts = image.data.split(',');
        const base64Content = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
        
        // 保存パスを決定
        let imgPath = '';
        if (hasMultipleDirectories) {
          // 複数階層の場合は共通フォルダに
          imgPath = `common/images/${imgName}.${imgType}`;
        } else {
          // 単一階層の場合はシンプルなパス
          imgPath = `images/${imgName}.${imgType}`;
        }
        
        console.log(`Adding image to ZIP: ${imgPath}`);
        zip.file(imgPath, base64Content, { base64: true });
      } catch (error) {
        console.error(`Error adding image ${image.name} to ZIP:`, error);
      }
    });
  } else {
    console.warn('No images to add to ZIP');
  }
  
  // ZIPを生成（デバッグ情報を追加）
  try {
    console.log('Generating ZIP...');
    const content = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    console.log(`ZIP generated, size: ${Math.round(content.size / 1024)} KB`);
    
    // ダウンロード
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${zipName}-${new Date().toISOString().slice(0, 10)}.zip`;
    console.log(`Downloading ${zipName}-${new Date().toISOString().slice(0, 10)}.zip`);
    a.click();
    
    // クリーンアップ
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating or downloading ZIP:', error);
    throw error;
  }
}

export async function extractImagesFromSelection(
  selection: any[]
): Promise<Array<{id: string, name: string, data: string, nodeId?: string}>> {
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
    
    console.log(`Sending export-elements-as-images request for ${nodeIds.length} nodes`);
    
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
          console.log(`Received ${message.images?.length || 0} images from Figma`);
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
    }, 15000); // より長いタイムアウトを設定
  });
}

export function updateHtmlWithImagePaths(
  html: string,
  images: Array<{id: string, name: string, data: string, nodeId?: string}>,
  useCommonFolder: boolean = false
): string {
  if (images.length === 0) {
    console.warn('No images provided to updateHtmlWithImagePaths');
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // imgタグの更新
  const imgElements = doc.querySelectorAll('img');
  console.log(`Found ${imgElements.length} img elements in HTML and ${images.length} available images`);
  
  imgElements.forEach((img, index) => {
    const currentSrc = img.getAttribute('src') || '';
    const isPlaceholder = 
      currentSrc.includes('placehold.jp') || 
      currentSrc.includes('placeholder') || 
      currentSrc.includes('dummy') ||
      currentSrc.startsWith('https://') && (currentSrc.includes('placeholder') || currentSrc.includes('demo'));
    
    // プレースホルダー画像かどうかをログに記録
    console.log(`Image ${index + 1}: src="${currentSrc}", isPlaceholder=${isPlaceholder}`);
    
    // プレースホルダーか、または対応する画像がある場合に更新
    if (isPlaceholder || index < images.length) {
      // 配列の範囲内で画像を選択（例外処理）
      const imageIndex = Math.min(index, images.length - 1);
      
      // フォルダ構造に応じてパスを調整
      const imagePath = useCommonFolder ? 
        `../images/${images[imageIndex].name}` : // 共通フォルダ使用時（バッチ生成でフォルダ分けの場合）
        `./images/${images[imageIndex].name}`;   // 通常のケース
      
      console.log(`Updating image to: ${imagePath}`);
      img.setAttribute('src', imagePath);
      
      // alt属性が空または存在しない場合、画像名から自動生成
      if (!img.hasAttribute('alt') || img.getAttribute('alt') === '') {
        const altText = images[imageIndex].name
          .replace(/[_\-.]/g, ' ')  // アンダースコア、ハイフン、ピリオドをスペースに変換
          .replace(/\.png$|\.jpg$|\.jpeg$|\.gif$|\.webp$/i, '')  // 拡張子を削除
          .replace(/\b\w/g, c => c.toUpperCase());  // 単語の先頭を大文字に
          
        img.setAttribute('alt', altText);
      }
    }
  });
  
  return doc.documentElement.outerHTML;
} 