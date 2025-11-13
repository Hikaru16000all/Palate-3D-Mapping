// src/App.jsx
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import SpatialViewer, { mapValueToColor } from './SpatialViewer'; 
import { 
  loadRealData, 
  extractConstantsFromData,
  ALL_SLICES as DEFAULT_SLICES,
  ALL_REGIONS as DEFAULT_REGIONS,
  SECTION_DATA as DEFAULT_SECTION_DATA,
  TRAIT_CATEGORIES as DEFAULT_TRAIT_CATEGORIES,
  ALL_TRAITS_FLAT as DEFAULT_ALL_TRAITS_FLAT,
  REAL_DATA as DEFAULT_REAL_DATA
} from './realDataConstants';
import html2canvas from 'html2canvas';

// --- UI Constants & Helpers ---
const MAX_VIEWS = 4; 
const baseButton = "py-2 px-4 text-base rounded transition duration-150 ease-in-out";
const topButton = "px-5 py-3 text-white rounded font-semibold text-base transition duration-150 ease-in-out";

// --- ColorBar Component ---
const ColorBar = ({ minMax, mapValueToColor, isLightTheme, onHoverChange, viewIndex }) => {
    if (!minMax || typeof minMax.min !== 'number' || typeof minMax.max !== 'number') {
        return null; 
    }
    
    const height = 200;
    const steps = 50;
    const [hoverValue, setHoverValue] = useState(null); 
    const range = minMax.max - minMax.min;
    const textClass = isLightTheme ? 'text-gray-800' : 'text-white';

    const handleMouseMove = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top; 
        const normalized = 1 - (y / height); 
        const value = minMax.min + normalized * range;
        setHoverValue(value); 
        
        const highlightRange = range * 0.03;
        onHoverChange(viewIndex, [Math.max(minMax.min, value - highlightRange), Math.min(minMax.max, value + highlightRange)]);
    }, [minMax, onHoverChange, range, viewIndex]);

    const handleMouseLeave = useCallback(() => {
        setHoverValue(null);
        onHoverChange(viewIndex, null);
    }, [onHoverChange, viewIndex]);
    
    const hoverTooltipStyle = useMemo(() => {
        if (hoverValue === null || range === 0) return {};
        const normalizedPosition = (hoverValue - minMax.min) / range;
        const topPosition = 5 + height * (1 - normalizedPosition); 
        return { top: topPosition, transform: 'translateY(-50%)' };
    }, [hoverValue, range, minMax.min]);

    return (
        <div className="flex flex-col items-center">
            <span className={`${textClass} text-base mb-1`}>{minMax.max.toFixed(2)}</span>
            <div 
                style={{ height: `${height}px`, width: '20px' }} 
                className="relative cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {Array.from({ length: steps }).map((_, i) => {
                    const normalized = 1 - (i / steps);
                    const value = minMax.min + normalized * range;
                    const [r, g, b, a] = mapValueToColor(value, minMax.min, minMax.max, isLightTheme);
                    return (
                        <div 
                            key={i}
                            style={{ 
                                backgroundColor: `rgb(${r}, ${g}, ${b})`,
                                height: `${height / steps}px`
                            }}
                        />
                    );
                })}
            </div>
            <span className={`${textClass} text-base mt-1`}>{minMax.min.toFixed(2)}</span>
            
            {/* Mouse hover value display */}
            {hoverValue !== null && range > 0 && (
                <div 
                    className="absolute left-7 bg-blue-700 text-white p-2 text-sm rounded shadow-lg pointer-events-none"
                    style={hoverTooltipStyle}
                >
                    {hoverValue.toFixed(2)}
                </div>
            )}
        </div>
    );
};

// --- Compare Selection Modal Component ---
const CompareModal = ({ isOpen, onClose, onStartCompare, ALL_SLICES, ALL_TRAITS_FLAT, SECTION_DATA, TRAIT_CATEGORIES }) => {
    const [dimension, setDimension] = useState('trait'); 
    const [traitSearch, setTraitSearch] = useState('');
    const [tempSelection, setTempSelection] = useState([]); // 初始化为空数组
    
    // 当模态框打开时，重置选择状态
    React.useEffect(() => {
        if (isOpen) {
            setTempSelection([]);
            setTraitSearch('');
        }
    }, [isOpen]);
    
    const handleToggle = (key) => {
        setTempSelection(prev => {
            if (prev.includes(key)) {
                return prev.length > 1 ? prev.filter(k => k !== key) : prev;
            }
            if (prev.length < MAX_VIEWS) {
                return [...prev, key];
            }
            return prev;
        });
    };
    
    const handleStartCompare = () => {
        const firstSlice = ALL_SLICES[0];
        const firstTrait = ALL_TRAITS_FLAT[0]?.key || 'gene';
        
        const newViews = tempSelection.map(key => {
            const isTrait = dimension === 'trait';
            const sliceKey = isTrait ? firstSlice : key;
            const traitKey = isTrait ? key : firstTrait;

            return { key, type: dimension, slice: sliceKey, trait: traitKey };
        });
        
        onStartCompare(newViews);
        onClose();
    };
    
    const filteredTraits = ALL_TRAITS_FLAT.filter(t => 
        t.label.toLowerCase().includes(traitSearch.toLowerCase()) || 
        t.key.toLowerCase().includes(traitSearch.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-2xl w-[40rem] border border-gray-300" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">Compare Settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">
                        &times;
                    </button>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 text-base rounded mb-4">
                    The maximum support for comparison is up to four images.
                </div>
                
                <div className="flex items-center space-x-6 mb-4">
                    <div className="font-bold text-base">Dimension:</div>
                    <label className="flex items-center space-x-2 cursor-pointer text-base">
                        <input type="radio" name="dimension" value="trait" checked={dimension === 'trait'} onChange={() => setDimension('trait')} />
                        <span>Trait</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-base">
                        <input type="radio" name="dimension" value="section" checked={dimension === 'section'} onChange={() => setDimension('section')} />
                        <span>Section</span>
                    </label>
                </div>

                <div className="max-h-80 overflow-y-auto mb-4 p-3 border rounded border-gray-300">
                    <p className="text-base text-gray-500 mb-3 font-semibold">Selected: {tempSelection.length}/{MAX_VIEWS}</p>
                    
                    {dimension === 'trait' && (
                        <div className="mb-4 flex border border-gray-300 rounded overflow-hidden">
                            <input
                                type="text"
                                placeholder="Search Traits..."
                                value={traitSearch}
                                onChange={(e) => setTraitSearch(e.target.value)}
                                className="w-full p-2 text-base focus:outline-none text-gray-800"
                            />
                            <button className="bg-gray-100 px-3 hover:bg-gray-200 text-gray-600">🔍</button>
                        </div>
                    )}

                    {dimension === 'trait' ? (
                        TRAIT_CATEGORIES.map(cat => (
                            <div key={cat.key} className="mb-3">
                                <h3 className="font-bold text-gray-600 border-b mb-2 text-base">{cat.label}</h3>
                                {filteredTraits.filter(t => t.category === cat.key).map(trait => (
                                    <label key={trait.key} className="flex items-center space-x-2 cursor-pointer py-1 text-base">
                                        <input
                                            type="checkbox"
                                            checked={tempSelection.includes(trait.key)}
                                            onChange={() => handleToggle(trait.key)}
                                            disabled={!tempSelection.includes(trait.key) && tempSelection.length >= MAX_VIEWS}
                                        />
                                        <span>{trait.label}</span>
                                    </label>
                                ))}
                            </div>
                        ))
                    ) : (
                        // Section Selection
                        SECTION_DATA.flatMap(t => t.sections).map(section => (
                            <label key={section.key} className="flex items-center space-x-2 cursor-pointer py-1 text-base">
                                <input
                                    type="checkbox"
                                    checked={tempSelection.includes(section.key)}
                                    onChange={() => handleToggle(section.key)}
                                    disabled={!tempSelection.includes(section.key) && tempSelection.length >= MAX_VIEWS}
                                />
                                <span>{section.label}</span>
                            </label>
                        ))
                    )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-3 border-t">
                    <button onClick={onClose} className={`${baseButton} text-gray-700 border border-gray-300 hover:bg-gray-100`}>Cancel</button>
                    <button onClick={handleStartCompare} className={`${baseButton} bg-blue-600 text-white hover:bg-blue-700`} disabled={tempSelection.length === 0}>Start Compare</button>
                </div>
            </div>
        </div>
    );
};

// --- Compare Viewer Modal Component ---
const CompareViewerModal = ({ isOpen, onClose, compareViews, pointRadius, isLightTheme, showCellType, onCellTypeToggle, data, ALL_REGIONS, ALL_TRAITS_FLAT }) => {
    const [hoverValueRanges, setHoverValueRanges] = useState({});
    const [localRegionFilters, setLocalRegionFilters] = useState({});
    const viewerContainerRef = useRef(null);

    // 生成区域颜色
    const REGION_COLORS = useMemo(() => {
        return ALL_REGIONS.reduce((acc, region, index) => {
            acc[region] = `hsl(${index * (360 / ALL_REGIONS.length)}, 70%, 50%)`;
            return acc;
        }, {});
    }, [ALL_REGIONS]);

    // 初始化每个视图的独立region filter
    useMemo(() => {
        const initialFilters = {};
        compareViews.forEach((view, index) => {
            initialFilters[index] = new Set(ALL_REGIONS);
        });
        setLocalRegionFilters(initialFilters);
    }, [compareViews, ALL_REGIONS]);

    // 为每个视图独立过滤数据
    const getFilteredDataForView = useCallback((viewIndex) => {
        const view = compareViews[viewIndex];
        if (!view) return [];
        
        const visibleRegions = localRegionFilters[viewIndex];
        return data.filter(d => 
            d.slice === view.slice && 
            (visibleRegions ? visibleRegions.has(d.region) : true)
        );
    }, [compareViews, localRegionFilters, data]);

    // 为每个视图独立计算minMax
    const minMaxMapForViews = useMemo(() => {
        const map = {};
        compareViews.forEach((view, viewIndex) => {
            const dataForView = getFilteredDataForView(viewIndex);
            const traitKey = view.trait;
            
            let minVal = Infinity;
            let maxVal = -Infinity;
            let hasValidData = false;
            
            dataForView.forEach(d => {
                const value = d[traitKey];
                if (typeof value === 'number' && !isNaN(value)) {
                    hasValidData = true;
                    if (value < minVal) minVal = value;
                    if (value > maxVal) maxVal = value;
                }
            });
            
            // 如果没有有效数据，使用默认值
            if (!hasValidData || !isFinite(minVal) || !isFinite(maxVal)) {
                map[viewIndex] = { min: 0, max: 1 };
            } else if (minVal === maxVal) {
                // 如果所有值都相同，设置一个小的范围
                map[viewIndex] = { min: minVal - 0.1, max: maxVal + 0.1 };
            } else {
                map[viewIndex] = { min: minVal, max: maxVal };
            }
        });
        return map;
    }, [compareViews, getFilteredDataForView]);

    const handleHoverValueRangeChange = useCallback((viewIndex, range) => {
        setHoverValueRanges(prev => ({
            ...prev,
            [viewIndex]: range
        }));
    }, []);

    const handleLocalToggleRegion = useCallback((viewIndex, region) => {
        setLocalRegionFilters(prev => {
            const newFilters = { ...prev };
            const newSet = new Set(newFilters[viewIndex]);
            newSet.has(region) ? newSet.delete(region) : newSet.add(region);
            newFilters[viewIndex] = newSet;
            return newFilters;
        });
    }, []);

    const handleLocalSetAllRegionsVisible = useCallback((viewIndex) => {
        setLocalRegionFilters(prev => ({
            ...prev,
            [viewIndex]: new Set(ALL_REGIONS)
        }));
    }, [ALL_REGIONS]);

    const handleLocalSetClearRegionsVisible = useCallback((viewIndex) => {
        setLocalRegionFilters(prev => ({
            ...prev,
            [viewIndex]: new Set()
        }));
    }, []);

    const textClass = isLightTheme ? 'text-gray-800' : 'text-white';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col border border-gray-300">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50 rounded-t-lg">
                    <h2 className="text-2xl font-bold text-gray-800">Comparison View ({compareViews.length} Images)</h2>
                    <div className="flex space-x-3 items-center">
                        <button 
                            onClick={onCellTypeToggle}
                            className={`py-2 px-4 text-base rounded transition duration-150 ease-in-out ${showCellType ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'}`}
                        >
                            {showCellType ? 'Show Trait' : 'Show Cell Type'}
                        </button>
                        <button 
                            onClick={onClose}
                            className="py-2 px-4 bg-red-600 text-white text-base rounded hover:bg-red-700 transition duration-150 ease-in-out"
                        >
                            Close Compare
                        </button>
                    </div>
                </div>
                
                {/* Visualization Container */}
                <div 
                    ref={viewerContainerRef} 
                    className="flex-grow p-4 bg-gray-100 rounded-b-lg overflow-auto"
                    style={{ 
                        display: 'grid',
                        gridTemplateColumns: compareViews.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                        gridTemplateRows: compareViews.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
                        gap: '10px',
                        backgroundColor: isLightTheme ? '#F0F0F0' : '#0A0A0A'
                    }}
                >
                    {compareViews.map((view, index) => {
                        const dataSlice = getFilteredDataForView(index);
                        const traitKey = view.trait;
                        const minMax = minMaxMapForViews[index];
                        const traitLabel = ALL_TRAITS_FLAT.find(t => t.key === traitKey)?.label || traitKey;
                        const viewHoverRange = hoverValueRanges[index] || null;
                        const localVisibleRegions = localRegionFilters[index] || new Set(ALL_REGIONS);

                        return (
                            <div 
                                key={`${view.slice}-${view.trait}-${index}`} 
                                className="w-full h-full relative bg-white rounded-lg border border-gray-300 overflow-hidden"
                            >
                                <SpatialViewer 
                                    data={dataSlice} 
                                    traitKey={traitKey}
                                    minMax={minMax}
                                    title={`Section: ${view.slice} | Trait: ${traitLabel}`}
                                    pointRadius={pointRadius}
                                    hoverValueRange={viewHoverRange}
                                    isLightTheme={isLightTheme}
                                    showCellType={showCellType}
                                    // 传递独立的region filter props
                                    localVisibleRegions={localVisibleRegions}
                                    localToggleRegion={(region) => handleLocalToggleRegion(index, region)}
                                    localSetAllRegionsVisible={() => handleLocalSetAllRegionsVisible(index)}
                                    localSetClearRegionsVisible={() => handleLocalSetClearRegionsVisible(index)}
                                    // 传递区域颜色信息
                                    ALL_REGIONS={ALL_REGIONS}
                                    REGION_COLORS={REGION_COLORS}
                                />
                                
                                {/* Colorbar */}
                                <div className="absolute top-0 left-0 h-full flex flex-col justify-center p-4 z-10">
                                    {!showCellType && minMax && (
                                        <div className="absolute top-1/2 -translate-y-1/2 left-4">
                                            <ColorBar 
                                                minMax={minMax} 
                                                mapValueToColor={mapValueToColor}
                                                isLightTheme={isLightTheme}
                                                onHoverChange={handleHoverValueRangeChange} 
                                                viewIndex={index}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

function App() {
  const [pointRadius, setPointRadius] = useState(25); 
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isCompareViewerOpen, setIsCompareViewerOpen] = useState(false);
  const [compareViews, setCompareViews] = useState([]);
  const [traitSearch, setTraitSearch] = useState(''); 
  const [isLightTheme, setIsLightTheme] = useState(false); 
  const [showCellType, setShowCellType] = useState(false); 
  const [visibleRegions, setVisibleRegions] = useState(new Set());
  
  // 数据加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [appData, setAppData] = useState({
    ALL_SLICES: DEFAULT_SLICES,
    ALL_REGIONS: DEFAULT_REGIONS,
    SECTION_DATA: DEFAULT_SECTION_DATA,
    TRAIT_CATEGORIES: DEFAULT_TRAIT_CATEGORIES,
    ALL_TRAITS_FLAT: DEFAULT_ALL_TRAITS_FLAT,
    REAL_DATA: DEFAULT_REAL_DATA
  });

  // 添加 hover 值范围状态
  const [hoverValueRanges, setHoverValueRanges] = useState({});

  const {
    ALL_SLICES,
    ALL_REGIONS,
    SECTION_DATA,
    TRAIT_CATEGORIES,
    ALL_TRAITS_FLAT,
    REAL_DATA
  } = appData;

  const [views, setViews] = useState([{ 
      key: ALL_SLICES[0] || 'E125', 
      type: 'slice', 
      slice: ALL_SLICES[0] || 'E125', 
      trait: ALL_TRAITS_FLAT[0]?.key || 'gene' 
  }]);

  const viewerContainerRef = useRef(null); 

  // 数据加载效果
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log('Starting data initialization...');
        
        const realData = await loadRealData();
        console.log('Raw data loaded, extracting constants...');
        
        const constants = extractConstantsFromData(realData);
        console.log('Constants extracted:', constants);
        
        setAppData(constants);
        setVisibleRegions(new Set(constants.ALL_REGIONS));
        
        // 设置默认视图
        if (constants.ALL_SLICES.length > 0 && constants.ALL_TRAITS_FLAT.length > 0) {
          setViews([{ 
            key: constants.ALL_SLICES[0], 
            type: 'slice', 
            slice: constants.ALL_SLICES[0], 
            trait: constants.ALL_TRAITS_FLAT[0].key 
          }]);
        }
        
        console.log('Data initialization complete');
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // --- Theme Classes ---
  const mainBgClass = isLightTheme ? 'bg-gray-50' : 'bg-gray-800';
  const controlPanelClass = isLightTheme ? 'bg-white border-r border-gray-200' : 'bg-gray-900 border-r border-gray-700';
  const textClass = isLightTheme ? 'text-gray-800' : 'text-white';
  const topBarClass = isLightTheme ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700';

  // 生成区域颜色
  const REGION_COLORS = useMemo(() => {
    return ALL_REGIONS.reduce((acc, region, index) => {
      acc[region] = `hsl(${index * (360 / ALL_REGIONS.length)}, 70%, 50%)`;
      return acc;
    }, {});
  }, [ALL_REGIONS]);

  // --- Data & Range Calculation ---
  
  const filteredData = useMemo(() => {
    return REAL_DATA.filter(d => visibleRegions.has(d.region));
  }, [visibleRegions, REAL_DATA]);

  const minMaxMap = useMemo(() => {
    const map = {};
    ALL_TRAITS_FLAT.forEach(trait => {
      let minVal = Infinity;
      let maxVal = -Infinity;
      let hasValidData = false;
      
      filteredData.forEach(d => {
        const value = d[trait.key];
        if (typeof value === 'number' && !isNaN(value)) {
          hasValidData = true;
          if (value < minVal) minVal = value;
          if (value > maxVal) maxVal = value;
        }
      });
      
      // 如果没有有效数据，使用默认值
      if (!hasValidData || !isFinite(minVal) || !isFinite(maxVal)) {
        console.warn(`No valid data for trait ${trait.key}, using default range`);
        map[trait.key] = { min: 0, max: 1 };
      } else if (minVal === maxVal) {
        // 如果所有值都相同，设置一个小的范围
        map[trait.key] = { min: minVal - 0.1, max: maxVal + 0.1 };
      } else {
        map[trait.key] = { min: minVal, max: maxVal };
      }
    });
    return map;
  }, [filteredData, ALL_TRAITS_FLAT]);
  
  const filteredLeftTraits = ALL_TRAITS_FLAT.filter(t => 
    t.label.toLowerCase().includes(traitSearch.toLowerCase()) || 
    t.key.toLowerCase().includes(traitSearch.toLowerCase())
  );

  // --- Core Functions (Callbacks) ---
  
  const toggleRegion = useCallback((region) => {
    setVisibleRegions(prev => {
        const newSet = new Set(prev);
        newSet.has(region) ? newSet.delete(region) : newSet.add(region);
        return newSet;
    });
  }, []); 

  const setAllRegionsVisible = useCallback(() => {
      setVisibleRegions(new Set(ALL_REGIONS));
  }, [ALL_REGIONS]); 
  
  const setClearRegionsVisible = useCallback(() => {
      setVisibleRegions(new Set());
  }, []); 

  // 处理 hover 值范围变化
  const handleHoverValueRangeChange = useCallback((viewIndex, range) => {
    setHoverValueRanges(prev => ({
      ...prev,
      [viewIndex]: range
    }));
  }, []);

  const handleStartCompare = useCallback((newViews) => {
    setCompareViews(newViews);
    setIsCompareViewerOpen(true);
  }, []);

  const handleCloseCompareViewer = useCallback(() => {
    setIsCompareViewerOpen(false);
    setCompareViews([]);
  }, []);

  // 截图功能
  const handleDownloadImage = async () => {
    if (viewerContainerRef.current) {
        alert("Generating Image, please wait...");
        await new Promise(resolve => setTimeout(resolve, 10)); 
        
        const canvas = await html2canvas(viewerContainerRef.current, { useCORS: true, allowTaint: true });
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `Spatial_Viewer_Export.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Image downloaded!");
    }
  };

  const currentTraitKey = views.length === 1 ? views[0].trait : null;
  const currentSliceKey = views[0].slice;
  const isSingleView = views.length === 1;

  // 加载状态
  if (isLoading) {
    return (
      <div className={`flex h-screen ${mainBgClass} items-center justify-center`}>
        <div className="text-xl text-gray-600">Loading data...</div>
      </div>
    );
  }

  // 错误状态
  if (loadError) {
    return (
      <div className={`flex h-screen ${mainBgClass} items-center justify-center`}>
        <div className="text-xl text-red-600">Error loading data: {loadError}</div>
      </div>
    );
  }

  // 无数据状态
  if (REAL_DATA.length === 0) {
    return (
      <div className={`flex h-screen ${mainBgClass} items-center justify-center`}>
        <div className="text-xl text-gray-600">No data available</div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className={`flex h-screen ${mainBgClass} font-sans`}>
      
      {/* --- Top Bar --- */}
      <div className={`absolute top-0 left-0 right-0 h-14 ${topBarClass} border-b flex items-center justify-end px-4 z-40`}>
        <div className="flex space-x-4">
            {/* Point Size Slider */}
            <div className={`flex items-center space-x-3 text-base ${textClass}`}>
                <span>Cell Size:</span>
                <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={pointRadius} 
                    onChange={(e) => setPointRadius(Number(e.target.value))}
                    className="w-28 h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer range-lg"
                />
            </div>

            {/* Theme Toggle */}
            <button 
                onClick={() => setIsLightTheme(!isLightTheme)}
                className={`${topButton} bg-gray-500 hover:bg-gray-600`}
                title={isLightTheme ? "Switch to Dark Theme" : "Switch to Light Theme"}
            >
                {isLightTheme ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button 
                onClick={() => setIsCompareModalOpen(true)}
                className={`${topButton} bg-blue-600 hover:bg-blue-700`}
            >
                Compare
            </button>
            <button
                onClick={handleDownloadImage}
                className={`${topButton} bg-gray-600 hover:bg-gray-700`}
            >
                Download Results
            </button>
        </div>
      </div>
      
      {/* --- Main Content Area --- */}
      <div className="flex flex-grow mt-14">
      
        {/* --- Left Control Panel (Trait & Section Selection) --- */}
        <div className={`w-72 flex flex-col ${controlPanelClass}`}>
          
          {/* Trait Section - 固定高度可滚动 */}
          <div className="flex-shrink-0 p-6 border-b border-gray-700">
            <h2 className={`text-lg font-semibold mb-3 ${textClass}`}>Trait</h2>
            <div className="flex border border-gray-400 rounded overflow-hidden mb-4">
              <input
                type="text"
                placeholder="Search Traits..."
                value={traitSearch}
                onChange={(e) => setTraitSearch(e.target.value)}
                className="w-full p-2 text-base focus:outline-none text-gray-800"
              />
              <button className="bg-gray-100 px-3 hover:bg-gray-200 text-gray-600">🔍</button>
            </div>
          </div>

          {/* Trait Selection (Categorized) - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto p-6 border-b border-gray-700">
            <div className="space-y-4">
              {TRAIT_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <h3 className={`text-base font-bold border-b mb-2 ${textClass} border-gray-700`}>{cat.label}</h3>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredLeftTraits.filter(t => t.category === cat.key).map(trait => (
                      <button
                        key={trait.key}
                        onClick={() => setViews([{ key: trait.key, type: 'trait', slice: views[0].slice, trait: trait.key }])}
                        className={`w-full text-left py-2 px-3 mb-1 rounded text-base ${
                          isSingleView && views[0].trait === trait.key 
                            ? 'bg-blue-600 text-white font-medium' 
                            : `${textClass} hover:bg-gray-700`
                        }`}
                      >
                        {trait.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Selection - 固定高度可滚动 */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className={`text-lg font-semibold mb-3 ${textClass}`}>Section</h2>
            <div className="space-y-4">
              {SECTION_DATA.map(tissueGroup => (
                <div key={tissueGroup.tissue}>
                  <h3 className={`text-base font-bold mb-2 ${textClass}`}>{tissueGroup.tissue}</h3>
                  <div className="max-h-32 overflow-y-auto">
                    {tissueGroup.sections.map(section => (
                      <button
                        key={section.key}
                        onClick={() => setViews([{ key: section.key, type: 'slice', slice: section.key, trait: views[0].trait }])}
                        className={`w-full text-left py-2 px-3 mb-1 rounded text-base ${
                          isSingleView && views[0].slice === section.key
                            ? 'bg-blue-600 text-white font-medium' 
                            : `${textClass} hover:bg-gray-700`
                        }`}
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Center Main Visualization Area --- */}
        <div className={`flex-grow p-5 relative flex flex-col ${mainBgClass}`}>
          
          {/* View Info and Controls */}
          <div className={`flex justify-between items-center mb-3 h-12 ${isLightTheme ? 'bg-gray-100' : 'bg-gray-900'} rounded-t p-3`}>
            <h2 className={`text-xl font-semibold ${textClass}`}>
                {isSingleView 
                    ? `Trait: ${ALL_TRAITS_FLAT.find(t => t.key === currentTraitKey)?.label || currentTraitKey} | Section: ${currentSliceKey}`
                    : `Comparison View (${views.length} Images)`
                }
            </h2>
            <div className="flex space-x-3 items-center">
                {/* Show Cell Type Toggle */}
                <button 
                    onClick={() => setShowCellType(!showCellType)}
                    className={`${baseButton} ${showCellType ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'}`}
                    title="Toggle between Trait expression and Cell Type visualization"
                >
                    {showCellType ? 'Show Trait' : 'Show Cell Type'}
                </button>
            </div>
          </div>
          
          {/* Visualization Container (Grid Layout) */}
          <div 
            ref={viewerContainerRef} 
            className="flex-grow rounded-b-lg overflow-hidden relative" 
            style={{ 
              display: 'grid',
              gridTemplateColumns: views.length === 1 ? '1fr' : 'repeat(2, 1fr)',
              gridTemplateRows: views.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
              backgroundColor: isLightTheme ? '#F0F0F0' : '#0A0A0A'
            }}
          >
            {views.map((view, index) => {
              const dataSlice = filteredData.filter(d => d.slice === view.slice); 
              const traitKey = view.trait;
              const minMax = minMaxMap[traitKey];
              const traitLabel = ALL_TRAITS_FLAT.find(t => t.key === traitKey)?.label || traitKey;
              const viewHoverRange = hoverValueRanges[index] || null;
              
              const cols = views.length === 1 ? 1 : 2;
              const isLastColumn = (index + 1) % cols === 0;
              const isLastRow = index >= views.length - cols;

              return (
                <div 
                  key={`${view.slice}-${view.trait}-${index}-${isLightTheme}`} 
                  className="w-full h-full relative"
                  style={{
                    borderRight: !isLastColumn ? '1px solid #333' : 'none',
                    borderBottom: !isLastRow && views.length > 2 ? '1px solid #333' : 'none',
                  }}
                >
                  <SpatialViewer 
                    data={dataSlice} 
                    traitKey={traitKey}
                    minMax={minMax}
                    title={`Section: ${view.slice} | Trait: ${traitLabel}`}
                    pointRadius={pointRadius}
                    hoverValueRange={viewHoverRange}
                    isLightTheme={isLightTheme}
                    showCellType={showCellType}
                    // 主视图使用这些 props
                    visibleRegions={visibleRegions}
                    toggleRegion={toggleRegion}
                    setAllRegionsVisible={setAllRegionsVisible}
                    setClearRegionsVisible={setClearRegionsVisible}
                    // 传递区域信息
                    ALL_REGIONS={ALL_REGIONS}
                    REGION_COLORS={REGION_COLORS}
                  />
                  
                  {/* === 添加 ColorBar 到主视图 === */}
                  {!showCellType && minMax && (
                    <div className="absolute top-0 left-0 h-full flex flex-col justify-center p-4 z-10">
                      <div className="absolute top-1/2 -translate-y-1/2 left-4">
                        <ColorBar 
                          minMax={minMax} 
                          mapValueToColor={mapValueToColor}
                          isLightTheme={isLightTheme}
                          onHoverChange={handleHoverValueRangeChange}
                          viewIndex={index}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
      
      {/* Compare Selection Modal */}
      <CompareModal 
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onStartCompare={handleStartCompare}
        ALL_SLICES={ALL_SLICES}
        ALL_TRAITS_FLAT={ALL_TRAITS_FLAT}
        SECTION_DATA={SECTION_DATA}
        TRAIT_CATEGORIES={TRAIT_CATEGORIES}
      />
      
      {/* Compare Viewer Modal */}
      <CompareViewerModal 
        isOpen={isCompareViewerOpen}
        onClose={handleCloseCompareViewer}
        compareViews={compareViews}
        pointRadius={pointRadius}
        isLightTheme={isLightTheme}
        showCellType={showCellType}
        onCellTypeToggle={() => setShowCellType(!showCellType)}
        data={REAL_DATA}
        ALL_REGIONS={ALL_REGIONS}
        ALL_TRAITS_FLAT={ALL_TRAITS_FLAT}
      />
      
    </div>
  );
}

export default App;
