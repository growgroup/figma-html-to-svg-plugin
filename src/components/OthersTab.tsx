import * as React from 'react';
import { SelectionInfo } from '../utils/types';
import { findImageNodesInSelection, analyzeImagesWithGemini } from '../services/imageExport';
import { createAndDownloadZip } from '../utils/codeHelper';
import SelectionPreview from './SelectionPreview';
import ProgressIndicator from './ProgressIndicator';
import JSZip from 'jszip';
import TokenDisplay from './TokenDisplay';

interface OthersTabProps {
  apiKey: string;
  selection: SelectionInfo[];
  includeImages: boolean;
  includeChildren: boolean;
  handleSelectionSettingsChange: (setting: 'children' | 'images', value: boolean) => void;
  designTokens?: any; // デザイントークン情報（オプション）
}

// 検出された画像の情報を表す型
interface DetectedImage {
  id: string;
  name: string;
  type: 'svg' | 'jpeg' | 'png';
  proposedName?: string;
  exportScale?: number;
  reason: string;
  data?: string;
  size?: { width: number, height: number };
}

const OthersTab: React.FC<OthersTabProps> = ({
  apiKey,
  selection,
  includeImages,
  includeChildren,
  handleSelectionSettingsChange,
  designTokens
}) => {
  // 状態変数
  const [detectedImages, setDetectedImages] = React.useState<DetectedImage[]>([]);
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [progress, setProgress] = React.useState({ stage: '', percentage: 0 });
  const [error, setError] = React.useState('');
  const [selectionImage, setSelectionImage] = React.useState<string | null>(null);
  


  // 画像検出処理
  const handleDetectImages = async () => {
    if (selection.length === 0) {
      setError('レイヤーが選択されていません');
      return;
    }
    
    if (!apiKey) {
      setError('APIキーが設定されていません');
      return;
    }
    
    setIsDetecting(true);
    setError('');
    setProgress({ stage: '画像ノードを検出中...', percentage: 20 });
    
    try {
      // 画像ノードを検出
      let imageNodes: Array<{
        id: string, 
        name: string, 
        type: string,
        reason: string,
        size?: { width: number, height: number }
      }> = [];
      try {
        // 選択要素とその子要素のレイヤー情報を使用
        imageNodes = await findImageNodesInSelection(selection);
        console.log(`検出された画像ノード: ${imageNodes.length}件`);
      } catch (detectionError) {
        console.error('画像ノード検出エラー:', detectionError);
        setError(`画像ノード検出中にエラーが発生しました: ${detectionError.message}`);
        
        // 選択要素自体を画像ノードとして扱うフォールバック
        imageNodes = selection.map(item => ({
          id: item.id,
          name: item.name,
          type: 'FALLBACK',
          reason: 'フォールバック処理による検出'
        }));
      }
      
      // 選択要素全体の画像データを取得
      if (selection.length > 0 && selection[0].imageData) {
        setSelectionImage(selection[0].imageData);
      }
      
      // 画像ノードが見つからない場合でも停止せず、AIによる分析を続行
      if (imageNodes.length === 0) {
        console.log('画像ノードが見つかりませんでした。選択レイヤー情報をAIに分析させます');
        // 警告メッセージを表示するが、処理は続行
        setError('自動検出された画像ノードはありませんが、AIによる分析を続行します');
        
        // 選択要素から擬似的な画像ノードを作成
        imageNodes = selection.map(item => ({
          id: item.id,
          name: item.name,
          type: 'LAYER',
          reason: '選択レイヤーからの解析対象'
        }));
      }
      
      setProgress({ stage: 'AIで画像を分析中...', percentage: 50 });
      
      // Gemini APIで分析
      let analyzedImages: Array<{
        id: string, 
        proposedName: string, 
        type: 'svg' | 'jpeg' | 'png',
        exportScale: number,
        reason: string,
        originalId?: string // AIが提案した元のID
      }> = [];
      try {
        analyzedImages = await analyzeImagesWithGemini(
          apiKey,
          selectionImage,
          imageNodes,
          selection
        );
      } catch (analysisError) {
        console.error('AI分析エラー:', analysisError);
        
        // エラーメッセージをユーザーフレンドリーにする
        let errorMsg = `AI分析中にエラーが発生しました: ${analysisError.message}`;
        
        // サポートされていないMIMEタイプのエラーの場合は特別なメッセージを表示
        if (analysisError.message && analysisError.message.includes('Unsupported MIME type: image/svg+xml')) {
          errorMsg = 'SVG形式の画像はAI分析に対応していません。画像形式をPNGまたはJPEGに変更してください。';
        }
        
        setError(errorMsg);
        
        // デフォルト値を設定するフォールバック
        analyzedImages = imageNodes.map((node, index) => ({
          id: node.id,
          proposedName: `img-export${(index + 1).toString().padStart(2, '0')}`,
          type: 'png' as 'svg' | 'jpeg' | 'png',
          exportScale: 1,
          reason: 'エラーのためデフォルト設定'
        }));
      }
      
      // 結果を処理
      console.log('AI分析結果:', analyzedImages);
      
      // 結果のマージ（AIの提案をすべて表示）
      const aiNodeIds = new Set(analyzedImages.map(img => img.id));
      const nodeResults: DetectedImage[] = [];
      
      // 1. まずAIからの提案をすべて追加
      analyzedImages.forEach(analyzed => {
        const result: DetectedImage = {
          id: analyzed.id,
          name: analyzed.originalId || `提案: ${analyzed.proposedName}`,
          type: analyzed.type,
          proposedName: analyzed.proposedName,
          exportScale: analyzed.exportScale,
          reason: analyzed.reason
        };
        nodeResults.push(result);
      });
      
      // 2. AIが処理しなかった検出ノードも追加（重複を防ぐ）
      imageNodes.forEach(node => {
        if (!aiNodeIds.has(node.id)) {
          const result: DetectedImage = {
            id: node.id,
            name: node.name,
            type: 'png',
            reason: 'AI分析未実施'
          };
          nodeResults.push(result);
        }
      });
      
      setDetectedImages(nodeResults);
      setProgress({ stage: '画像検出完了', percentage: 100 });
    } catch (err) {
      setError(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDetecting(false);
    }
  };



  // 画像エクスポート処理
  const handleExportImages = async () => {
    if (detectedImages.length === 0) {
      setError('エクスポートする画像がありません');
      return;
    }
    
    setIsExporting(true);
    setError('');
    setProgress({ stage: '画像をエクスポート中...', percentage: 30 });
    
    try {
      // Geminiが提案したIDを正確に取得
      console.log('Geminiが提案したレイヤー:', detectedImages);
      
      // 画像ノードのIDを取得（Geminiから返されたIDのみを使用）
      const nodeIds = detectedImages
        .filter(image => image.id && image.id.trim() !== '')
        .map(image => image.id);
      
      console.log(`エクスポート対象ノード: ${nodeIds.length}件`, nodeIds);
      
      if (nodeIds.length === 0) {
        setError('有効なノードIDが見つかりません。選択を確認してください。');
        setIsExporting(false);
        return;
      }
      
      // ノード情報をマップ化
      const nodeInfoMap: Record<string, any> = {};
      
      // 各IDに対して詳細な設定を保存
      detectedImages.forEach(image => {
        // 有効なIDを持つノードのみ処理
        if (!image.id || image.id.trim() === '') return;
        
        // 出力用の形式を取得
        const exportType = image.type === 'jpeg' ? 'jpg' : image.type;
        
        // 重要: 提案された名前を明示的に設定
        const proposedName = image.proposedName || image.name.replace(/\s+/g, '-').toLowerCase();
        
        // 各ノードの情報を個別に格納
        nodeInfoMap[image.id] = {
          id: image.id,
          name: image.name,
          type: image.type, 
          exportType: exportType,
          proposedName: proposedName,
          exportScale: image.exportScale || 1,
          // 個別ノードとして明示的にエクスポートすることを指示
          exportIndividual: true
        };
        
        console.log(`ノード設定: ${image.id} -> ${proposedName}.${exportType} (${image.exportScale || 1}x)`);
      });
      
      // 選択中のノードの処理設定
      const selectionIds = selection.map(item => item.id);
      if (selectionIds.length > 0) {
        nodeInfoMap['__selection__'] = {
          ids: selectionIds,
          // 個別ノードが指定されている場合は選択全体のエクスポートを明示的に無効化
          skipSelectionExport: true
        };
      }
      
      // 画像データを取得するためのプロミスを作成
      const getImageDataPromise = new Promise<Array<{ id: string, name: string, data: string }>>((resolve, reject) => {
        // メッセージイベントの設定前にエラーフラグをリセット
        let isResolved = false;
        
        // Figmaにメッセージを送信
        parent.postMessage(
          { 
            pluginMessage: { 
              type: 'export-elements-as-images', 
              nodeIds,
              nodeInfoMap,
              // 個別ノードのエクスポートを優先することを明示
              prioritizeIndividualNodes: true
            }
          },
          '*'
        );
        
        console.log('Figmaプラグインにエクスポートリクエストを送信しました', {
          nodeIds,
          nodeInfoMap,
          prioritizeIndividualNodes: true
        });
        
        // レスポンスを受け取るハンドラ
        const messageHandler = (event: MessageEvent) => {
          const message = event.data.pluginMessage;
          if (!message) return;
          
          if (message.type === 'export-images-result') {
            // 既に処理済みならスキップ
            if (isResolved) return;
            isResolved = true;
            
            // ハンドラを削除
            window.removeEventListener('message', messageHandler);
            
            if (message.success) {
              console.log(`エクスポート成功: ${message.images?.length || 0}件の画像`, message.images);
              resolve(message.images || []);
            } else {
              console.error('画像エクスポート失敗:', message.error);
              reject(new Error(message.error || 'Failed to export images'));
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // タイムアウト処理
        setTimeout(() => {
          // 既に処理済みならスキップ
          if (isResolved) return;
          isResolved = true;
          
          window.removeEventListener('message', messageHandler);
          console.error('画像エクスポートがタイムアウトしました');
          
          // 選択要素があり、直接エクスポート可能な場合はフォールバック
          if (selection.length > 0 && selection[0].imageData) {
            console.log('選択要素の画像データを使用してフォールバック');
            
            // 選択要素のimageDataを使用してフォールバックデータを作成
            const fallbackData = selection
              .filter(item => item.imageData) // imageDataがある項目だけを使用
              .map((item, index) => ({
                id: nodeIds[index] || item.id,
                name: `fallback_${index}.png`,
                data: item.imageData as string
              }));
            
            if (fallbackData.length > 0) {
              console.log(`フォールバックデータを使用: ${fallbackData.length}件`);
              resolve(fallbackData);
              return;
            }
          }
          
          reject(new Error('画像エクスポートのタイムアウト'));
        }, 20000); // タイムアウト時間を20秒に延長
      });
      
      // 画像データを取得
      const imageDataArray = await getImageDataPromise;
      console.log(`取得した画像データ数: ${imageDataArray.length}件`, imageDataArray);
      
      if (imageDataArray.length === 0) {
        setError('エクスポートする画像データが取得できませんでした');
        setIsExporting(false);
        return;
      }
      
      setProgress({ stage: 'ZIPファイルを作成中...', percentage: 70 });
      
      // ZIP生成処理
      try {
        // ZIPを作成
        const zip = new JSZip();
        
        // 拡張子を含むファイル名を生成する関数
        const getFullFileName = (img: DetectedImage, base: string) => {
          // 提案された名前を優先使用する
          const name = img.proposedName || base;
          // 拡張子を決定（type属性から取得）
          const ext = img.type === 'jpeg' ? 'jpg' : (img.type || 'png');
          return `${name}.${ext}`;
        };
        
        // IDから対応するDetectedImage情報を取得するマップを作成
        const imageInfoMap = new Map<string, DetectedImage>();
        detectedImages.forEach(img => {
          imageInfoMap.set(img.id, img);
        });
        
        // 各画像をZIPに追加
        let addedFileCount = 0;
        
        // 設定ファイルの内容
        const configData = {
          exportDate: new Date().toISOString(),
          images: [] as Array<{
            id: string,
            fileName: string,
            type: string,
            proposedName?: string,
            exportScale?: number
          }>
        };
        
        // 各画像をZIPに追加
        imageDataArray.forEach(imageData => {
          // imageData.id に対応するDetectedImageを検索
          const detectedImage = imageInfoMap.get(imageData.id);
          
          if (detectedImage) {
            // ファイル名を生成（拡張子を除去してから適切な拡張子を追加）
            const baseName = imageData.name.replace(/\.[^/.]+$/, ""); // 拡張子を除去
            const fileName = getFullFileName(detectedImage, baseName);
            
            console.log(`ZIPに追加: ${fileName} (ID: ${imageData.id})`, detectedImage);
            
            // データURIの形式をチェック
            if (!imageData.data || typeof imageData.data !== 'string') {
              console.error(`Invalid image data for ${fileName}:`, imageData.data);
              return;
            }
            
            try {
              // データURIからBase64部分を抽出
              const base64Parts = imageData.data.split(',');
              const base64Content = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
              
              if (!base64Content) {
                console.error(`Empty base64 content for ${fileName}`);
                return;
              }
              
              // ファイル追加をトライ
              console.log(`Adding file ${fileName} with base64 content length: ${base64Content.length}`);
              zip.file(fileName, base64Content, { base64: true });
              addedFileCount++;
              
              // 設定ファイルに情報を追加
              configData.images.push({
                id: imageData.id,
                fileName: fileName,
                type: detectedImage.type,
                proposedName: detectedImage.proposedName,
                exportScale: detectedImage.exportScale || 1
              });
            } catch (error) {
              console.error(`Error adding image ${fileName} to ZIP:`, error);
            }
          } else {
            console.warn(`No matching detected image for ID: ${imageData.id}`);
          }
        });
        
        // 設定ファイルをZIPに追加
        if (configData.images.length > 0) {
          zip.file('export-config.json', JSON.stringify(configData, null, 2));
        }
        
        console.log(`ZIPに追加したファイル数: ${addedFileCount}件`);
        
        if (addedFileCount === 0) {
          setError('ZIPに追加できるファイルがありませんでした');
          setIsExporting(false);
          return;
        }
        
        // ZIPを生成してダウンロード
        const content = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        console.log(`生成されたZIPのサイズ: ${content.size} bytes`);
        
        if (content.size <= 22) { // 空のZIPファイルのサイズはおよそ22bytes
          setError('生成されたZIPファイルが空です');
          setIsExporting(false);
          return;
        }
        
        const url = URL.createObjectURL(content);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `figma-exported-images-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        
        // クリーンアップ
        URL.revokeObjectURL(url);
        
        setProgress({ stage: 'エクスポート完了', percentage: 100 });
      } catch (zipError) {
        console.error('ZIP生成エラー:', zipError);
        setError(`ZIPファイルの生成に失敗しました: ${zipError instanceof Error ? zipError.message : String(zipError)}`);
      }
    } catch (err) {
      setError(`エクスポートエラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // ファイルタイプによって表示色を決定
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'svg':
        return 'text-green-600';
      case 'jpeg':
        return 'text-blue-600';
      case 'png':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 選択要素プレビュー */}
      <div> 
        <SelectionPreview selection={selection} />
      </div>
      
      {/* 画像検出・エクスポートボタン */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 mb-3">画像エクスポート</h3>
        
        {/* 選択要素の詳細取得設定 */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">選択要素の詳細取得設定</h4>
          
          <div className="flex gap-x-3 mb-2">
            <div className="flex justify-center items-center">
              <input
                type="checkbox"
                id="include-children"
                checked={includeChildren}
                onChange={(e) => handleSelectionSettingsChange('children', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isDetecting || isExporting}
              />
            </div>
            <div>
              <label htmlFor="include-children" className="text-sm text-gray-700 cursor-pointer">
                選択要素のレイヤーをデータとして取得（子要素を含む）
              </label>
            </div>
          </div>
          
          <div className="flex gap-x-3">
            <div className="flex justify-center items-center">
              <input
                type="checkbox"
                id="include-images"
                checked={includeImages}
                onChange={(e) => handleSelectionSettingsChange('images', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isDetecting || isExporting}
              />
            </div>
            <div>
              <label htmlFor="include-images" className="text-sm text-gray-700 cursor-pointer">
                選択要素を画像として取得（画像分析の精度向上）
              </label>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            ※ 大きな要素や複雑な構造の場合、処理に時間がかかることがあります
          </p>
        </div>
        
        <div className="flex space-x-3 mb-4">
          <button
            onClick={handleDetectImages}
            disabled={isDetecting || isExporting || selection.length === 0}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-blue-400 transition-colors"
          >
            {isDetecting ? '検出中...' : '画像ノードを検出'}
          </button>
          
          <button
            onClick={handleExportImages}
            disabled={isDetecting || isExporting || detectedImages.length === 0}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-green-400 transition-colors"
          >
            {isExporting ? 'エクスポート中...' : 'ZIPでエクスポート'}
          </button>
        </div>
        
        {/* 進捗表示 */}
        {(isDetecting || isExporting) && (
          <div className="mb-4">
            <ProgressIndicator stage={progress.stage} percentage={progress.percentage} />
          </div>
        )}
        
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {/* 検出結果の表示 */}
        {detectedImages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">検出された画像ノード: {detectedImages.length}件</h4>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200 max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ノード名</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">提案ファイル名</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">倍率</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">理由</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {detectedImages.map((image) => (
                    <tr key={image.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{image.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {image.proposedName ? `${image.proposedName}.${image.type}` : '未分析'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <span className={`font-medium ${getTypeColor(image.type)}`}>
                          {image.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {image.exportScale ? `${image.exportScale}x` : '1x'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                        {image.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OthersTab;