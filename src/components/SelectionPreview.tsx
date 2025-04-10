import * as React from 'react';
import { SelectionInfo } from '../utils/types';

interface SelectionPreviewProps {
  selection: SelectionInfo[];
}

const SelectionPreview: React.FC<SelectionPreviewProps> = ({ selection }) => {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});
  const [copyStatus, setCopyStatus] = React.useState<string>('');

  // JSONをコピーする関数
  const copySelectionToClipboard = () => {
    try {
      console.log(selection)
      const jsonString = JSON.stringify(selection, null, 2);
      
      // テキストエリアを作成し、JSONをセット
      const textArea = document.createElement('textarea');
      textArea.value = jsonString;
      
      // テキストエリアをDOMに追加（見えないように設定）
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // テキストを選択してコピー
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      
      // テキストエリアを削除
      document.body.removeChild(textArea);
      
      if (success) {
        setCopyStatus('コピーしました');
        // 3秒後にステータスをクリア
        setTimeout(() => setCopyStatus(''), 3000);
      } else {
        setCopyStatus('コピーに失敗しました');
      }
    } catch (error) {
      console.error('JSONの生成に失敗しました:', error);
      setCopyStatus('JSONの生成に失敗しました');
    }
  };

  if (!selection.length) {
    return (
      <div className="selection-preview">
        <h3 className="text-sm font-bold text-gray-800">選択要素</h3>
        <p className="no-selection">要素が選択されていません</p>
      </div>
    );
  }

  // 要素の展開/折りたたみを切り替える
  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 子要素を再帰的に表示する関数
  const renderChildren = (children: any[], depth = 1) => {
    if (!children || !children.length) return null;

    return (
      <ul className="hierarchy-list" style={{ paddingLeft: `${depth * 12}px` }}>
        {children.map((child) => (
          <li key={child.id} className="hierarchy-item">
            <div className="hierarchy-header">
              <span className="hierarchy-name">{child.name}</span>
              <span className="hierarchy-type">{child.type}</span>
            </div>
            {child.children && child.children.length > 0 && renderChildren(child.children, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="selection-preview">
      <div className="selection-header-with-actions">
        <h3 className="text-sm font-bold text-gray-800">選択要素 ({selection.length})</h3>
        <div className="selection-actions">
          <button 
            className="copy-json-button"
            onClick={copySelectionToClipboard}
            title="選択要素のJSONをクリップボードにコピーします"
          >
            JSONをコピー
          </button>
          {copyStatus && <span className="copy-status">{copyStatus}</span>}
        </div>
      </div>
      <div className="selection-list">
        {selection.map((item) => (
          <div key={item.id} className="selection-item">
            <div 
              className="selection-header" 
              onClick={() => toggleItem(item.id)}
            >
              <div className="selection-name">
                <span className={`expand-icon ${expandedItems[item.id] ? 'expanded' : ''}`}>
                  {item.hierarchy || item.image ? '▼' : '•'}
                </span>
                {item.name}
              </div>
              <div className="selection-type">{item.type}</div>
            </div>
            
            {expandedItems[item.id] && (
              <div className="selection-details">
                {/* テキスト内容の表示 */}
                {item.type === 'TEXT' && (
                  <div className="selection-text">"{item.characters}"</div>
                )}
                
                {/* Base64画像の表示 */}
                {item.image && (
                  <div className="selection-image">
                    <img src={item.image} alt={`${item.name} preview`} />
                  </div>
                )}
                
                {/* 階層情報の表示 */}
                {item.hierarchy && (
                  <div className="selection-hierarchy">
                    <div className="hierarchy-title">階層構造:</div>
                    {item.hierarchy.children && renderChildren(item.hierarchy.children)}
                    {item.hierarchy.truncated && (
                      <div className="hierarchy-note">※ 表示数を制限しています（全{item.hierarchy.childrenCount}要素中）</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .selection-preview {
          margin-bottom: 20px;
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 4px;
        }
        
        .selection-header-with-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .selection-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .copy-json-button {
          background-color: #0066ff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .copy-json-button:hover {
          background-color: #0055dd;
        }
        
        .copy-status {
          font-size: 12px;
          color: #0066ff;
        }
        
        .selection-preview h3 {
          margin-top: 0;
          margin-bottom: 0;
        }
        
        .no-selection {
          color: #888;
          font-style: italic;
        }
        
        .selection-list {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .selection-item {
          margin-bottom: 8px;
          padding: 8px;
          border: 1px solid #eee;
          border-radius: 4px;
        }
        
        .selection-header {
          display: flex;
          justify-content: space-between;
          cursor: pointer;
        }
        
        .selection-name {
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        
        .expand-icon {
          display: inline-block;
          width: 16px;
          transition: transform 0.2s ease;
          font-size: 10px;
        }
        
        .expand-icon.expanded {
          transform: rotate(0deg);
        }
        
        .selection-type {
          color: #888;
          font-size: 12px;
        }
        
        .selection-details {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #eee;
        }
        
        .selection-text {
          font-style: italic;
          margin-bottom: 8px;
        }
        
        .selection-image {
          margin: 8px 0;
          text-align: center;
        }
        
        .selection-image img {
          max-width: 100%;
          max-height: 200px;
          border: 1px solid #ddd;
        }
        
        .selection-hierarchy {
          margin-top: 8px;
        }
        
        .hierarchy-title {
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .hierarchy-list {
          list-style: none;
          margin: 0;
          padding: 0;
          padding-left: 12px;
        }
        
        .hierarchy-item {
          margin-bottom: 2px;
        }
        
        .hierarchy-header {
          display: flex;
          font-size: 12px;
        }
        
        .hierarchy-name {
          font-weight: bold;
          margin-right: 8px;
        }
        
        .hierarchy-type {
          color: #888;
        }
        
        .hierarchy-note {
          font-size: 10px;
          color: #888;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default SelectionPreview; 