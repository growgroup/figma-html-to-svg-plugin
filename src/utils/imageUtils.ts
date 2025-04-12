// 1. OthersTabから移植する関数
export { findImageNodesInSelection, analyzeImagesWithGemini } from '../services/imageExport';

// 2. App.tsx内の既存画像関連関数を参照
export { extractImagesFromSelection, updateHtmlWithImagePaths } from './codeHelper';

// 3. 高度な画像解析結果を利用したHTML更新関数
export const updateHtmlWithAdvancedImagePaths = (
  html: string, 
  exportedImages: Array<{id: string, name: string, data: string}>,
  detectedImages: any[],
  useCommonFolder: boolean
): string => {
  console.log('=== updateHtmlWithAdvancedImagePaths ===');
  console.log(`Input: HTML length: ${html.length}, Images: ${exportedImages.length}, DetectedImages: ${detectedImages.length}`);
  console.log(`useCommonFolder: ${useCommonFolder}`);
  
  // 画像がなければ処理不要
  if (!html || exportedImages.length === 0) {
    console.warn('No HTML or exported images provided to updateHtmlWithAdvancedImagePaths');
    return html;
  }
  
  try {
    // HTML解析のためのDOM構築
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 全imgタグを取得
    const imgElements = doc.querySelectorAll('img');
    console.log(`Found ${imgElements.length} img elements in HTML`);
    
    // 使用する画像のマッピングを構築
    const imageInfoMap = new Map();
    detectedImages.forEach(info => {
      imageInfoMap.set(info.id, info);
    });
    
    // 各img要素を処理
    imgElements.forEach((img, index) => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      
      console.log(`[${index}] Processing img: src="${src.substring(0, 50)}${src.length > 50 ? '...' : ''}"`);
      
      // プレースホルダー画像かどうか判定
      if (isPlaceholderImage(src)) {
        console.log(`[${index}] Detected as placeholder image`);
        
        // 画像サイズの解析
        const size = extractImageSize(src, img);
        console.log(`[${index}] Extracted size: ${size.width}x${size.height}`);
        
        // 適切な画像を選択
        const selectedImage = selectBestMatchingImage(
          exportedImages,
          detectedImages,
          { width: size.width, height: size.height, alt }
        );
        
        if (selectedImage) {
          console.log(`[${index}] Selected image: ${selectedImage.name}`);
          
          // 画像パスを構築
          const imgPath = buildImagePath(selectedImage, useCommonFolder);
          console.log(`[${index}] Image path: ${imgPath}`);
          
          // src属性を更新
          img.setAttribute('src', imgPath);
          
          // alt属性が空の場合は画像名から生成
          if (!alt) {
            const altText = generateAltText(selectedImage.name);
            img.setAttribute('alt', altText);
          }
        } else {
          console.warn(`[${index}] No matching image found for placeholder`);
        }
      } else {
        console.log(`[${index}] Not a placeholder image, skipping`);
      }
    });
    
    // 更新されたHTMLを返す
    const updatedHtml = doc.documentElement.outerHTML;
    console.log(`Updated HTML. Length: ${updatedHtml.length}`);
    return updatedHtml;
    
  } catch (error) {
    console.error('Error in updateHtmlWithAdvancedImagePaths:', error);
    return html; // エラー時は元のHTMLをそのまま返す
  }
};

// プレースホルダー画像かどうかを判定する関数
function isPlaceholderImage(src: string): boolean {
  // 空文字列や無効なURLはプレースホルダーとみなす
  if (!src || src === '#' || src === 'about:blank') return true;
  
  // 明らかなプレースホルダーパターン
  const placeholderPatterns = [
    'placehold.jp',
    'placeholder.com',
    'placekitten.com',
    'dummyimage.com',
    'via.placeholder',
    'picsum.photos',
    'lorempixel.com',
    'loremflickr.com',
    'fakeimg.pl',
    'baconmockup.com',
    'placebear.com',
    'placeholder-image',
    'dummy-image'
  ];
  
  // いずれかのパターンが含まれているか
  if (placeholderPatterns.some(pattern => src.includes(pattern))) {
    return true;
  }
  
  // 一般的なプレースホルダーキーワード
  const placeholderKeywords = /placeholder|dummy|sample|demo|temp|test|example/i;
  if (placeholderKeywords.test(src)) {
    return true;
  }
  
  // URLに寸法が含まれている (例: 300x200, 300/200)
  if (/\d+x\d+|\d+\/\d+/.test(src)) {
    return true;
  }
  
  // 外部URLの多くはプレースホルダー (ただし、実在する画像サービスは除外)
  const realImageServices = /unsplash\.com|pexels\.com|pixabay\.com|amazonaws\.com|cloudfront\.net|staticflickr\.com/i;
  if (src.startsWith('http') && !realImageServices.test(src)) {
    return true;
  }
  
  // データURI
  if (src.startsWith('data:image')) {
    return true;
  }
  
  return false;
}

// 画像サイズを抽出する関数
function extractImageSize(src: string, imgElement: HTMLImageElement): { width: number, height: number } {
  let width = 0;
  let height = 0;
  
  // 1. 要素の属性からサイズを取得
  const widthAttr = imgElement.getAttribute('width');
  const heightAttr = imgElement.getAttribute('height');
  
  if (widthAttr && heightAttr) {
    width = parseInt(widthAttr);
    height = parseInt(heightAttr);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }
  
  // 2. URLからサイズを抽出
  
  // placehold.jp/350x200.png のパターン
  const placeholdMatch = src.match(/placehold\.jp\/(?:\w+\/)?(\d+)x(\d+)/i);
  if (placeholdMatch) {
    width = parseInt(placeholdMatch[1]);
    height = parseInt(placeholdMatch[2]);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }
  
  // 一般的な寸法パターン: 200x100, width=200&height=100, w=200&h=100
  const dimensionPatterns = [
    /(\d+)x(\d+)/,
    /width=(\d+).*?height=(\d+)/,
    /w=(\d+).*?h=(\d+)/,
    /(\d+)\/(\d+)/
  ];
  
  for (const pattern of dimensionPatterns) {
    const match = src.match(pattern);
    if (match) {
      width = parseInt(match[1]);
      height = parseInt(match[2]);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  }
  
  // 3. インラインスタイルからサイズを取得
  const style = imgElement.getAttribute('style');
  if (style) {
    const widthMatch = style.match(/width\s*:\s*(\d+)px/);
    const heightMatch = style.match(/height\s*:\s*(\d+)px/);
    
    if (widthMatch && heightMatch) {
      width = parseInt(widthMatch[1]);
      height = parseInt(heightMatch[1]);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  }
  
  // 4. デフォルト値を返す
  return { width: 300, height: 200 }; // 標準的なプレースホルダーサイズ
}

// 最適な画像を選択する関数
function selectBestMatchingImage(
  exportedImages: Array<{id: string, name: string, data: string}>,
  detectedImages: any[],
  criteria: { width: number, height: number, alt: string }
): { id: string, name: string, data: string, info: any } | null {
  if (exportedImages.length === 0) return null;
  
  const matches: Array<{ 
    id: string, 
    name: string, 
    data: string, 
    info: any,
    score: number 
  }> = [];
  
  // 各画像にスコアを付けて最適なものを見つける
  exportedImages.forEach(image => {
    const info = detectedImages.find(d => d.id === image.id);
    if (!info) return;
    
    let score = 0;
    
    // 1. サイズスコア - サイズが近いほど高スコア
    if (info.size && criteria.width > 0 && criteria.height > 0) {
      const widthDiff = Math.abs(info.size.width - criteria.width);
      const heightDiff = Math.abs(info.size.height - criteria.height);
      
      // サイズ差の合計 (小さいほど良い)
      const totalDiff = widthDiff + heightDiff;
      
      // 差が小さいほど高いスコア (最大100)
      score += Math.max(0, 100 - Math.min(totalDiff, 100));
    } else {
      // サイズ情報がない場合は中程度のスコア
      score += 50;
    }
    
    // 2. 名前類似性スコア - alt属性と名前が似ているほど高スコア
    if (criteria.alt && (info.name || info.proposedName)) {
      const altWords = criteria.alt.toLowerCase().split(/\W+/).filter(Boolean);
      const nameToCheck = (info.proposedName || info.name).toLowerCase();
      const nameWords = nameToCheck.split(/\W+/).filter(Boolean);
      
      // 共通する単語があればスコア加算
      for (const word of altWords) {
        if (word.length < 3) continue; // 短すぎる単語は無視
        
        if (nameWords.some((nameWord: string) => 
          nameWord.includes(word) || word.includes(nameWord)
        )) {
          score += 15; // 単語ごとにスコア加算
        }
      }
    }
    
    matches.push({
      id: image.id,
      name: image.name,
      data: image.data,
      info,
      score
    });
  });
  
  // スコア順にソート
  matches.sort((a, b) => b.score - a.score);
  
  // 最適なマッチを返す
  if (matches.length > 0) {
    const best = matches[0];
    console.log(`Best match: ${best.name} (score: ${best.score})`);
    return {
      id: best.id,
      name: best.name,
      data: best.data,
      info: best.info
    };
  }
  
  // マッチするものがなければ最初の画像を返す
  const fallback = {
    id: exportedImages[0].id,
    name: exportedImages[0].name,
    data: exportedImages[0].data,
    info: detectedImages.find(d => d.id === exportedImages[0].id) || {}
  };
  
  console.log(`No good match found. Using fallback: ${fallback.name}`);
  return fallback;
}

// 画像パスを構築する関数
function buildImagePath(
  image: { id: string, name: string, data: string, info: any },
  useCommonFolder: boolean
): string {
  // 提案された名前または元の名前を使用
  let fileName = image.info?.proposedName || 
                 image.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '-').toLowerCase();
  
  // 特殊文字を削除
  fileName = fileName.replace(/[^\w-]/g, '');
  
  // ファイル拡張子を取得
  const fileExt = image.info?.type === 'jpeg' ? 'jpg' : (image.info?.type || 'png');
  
  // パス構築
  if (useCommonFolder) {
    return `../common/images/${fileName}.${fileExt}`;
  } else {
    return `./images/${fileName}.${fileExt}`;
  }
}

// alt属性のテキストを生成する関数
function generateAltText(fileName: string): string {
  // ファイル名から拡張子を削除
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // 区切り文字を空白に変換
  const spacedName = nameWithoutExt.replace(/[-_]/g, ' ');
  
  // 単語の頭文字を大文字に
  return spacedName.replace(/\b\w/g, c => c.toUpperCase());
} 