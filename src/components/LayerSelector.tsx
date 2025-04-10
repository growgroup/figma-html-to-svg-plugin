import * as React from 'react';

interface LayerInfo {
  id: string;
  name: string;
  type: string;
}

interface LayerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (layerId: string) => void;
  layers: LayerInfo[];
  isLoading: boolean;
  selectedLayerId?: string;
}

const LayerSelector: React.FC<LayerSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  layers,
  isLoading,
  selectedLayerId
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredLayers, setFilteredLayers] = React.useState<LayerInfo[]>([]);
  
  // 検索ワードが変わるかレイヤーリストが変わったときにフィルタリング
  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredLayers(layers);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = layers.filter(layer => 
      layer.name.toLowerCase().includes(term) || layer.type.toLowerCase().includes(term)
    );
    setFilteredLayers(filtered);
  }, [searchTerm, layers]);
  
  // ESCキーでモーダルを閉じる
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">レイヤーを選択</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="レイヤー名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredLayers.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredLayers.map(layer => (
                <li 
                  key={layer.id}
                  onClick={() => onSelect(layer.id)}
                  className={`py-2 px-4 hover:bg-gray-50 cursor-pointer ${layer.id === selectedLayerId ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">{layer.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{layer.type}</span>
                    </div>
                    {layer.id === selectedLayerId && (
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 text-center text-gray-500">
              {searchTerm ? '検索条件に一致するレイヤーがありません' : 'レイヤーがありません'}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
          <span className="text-sm text-gray-500">
            {filteredLayers.length} / {layers.length} レイヤー
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayerSelector; 