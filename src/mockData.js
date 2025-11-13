// src/mockData.js

export const ALL_SLICES = ['E12.5', 'E13.5', 'E15.5']; // 修正: 仅保留三个切片
export const ALL_REGIONS = ['Neural Tube', 'Skeletal Muscle', 'Heart', 'Kidney', 'Liver', 'Gut', 'Mesenchyme']; 
const NUM_CELLS_PER_SLICE = 1500; 

// 模拟切片和组织信息的对应关系 (简化)
export const SECTION_DATA = [
    { tissue: 'Embryo', sections: ALL_SLICES.map(s => ({ key: s, label: s })) },
];

// 定义 Trait 分类和具体的 Trait
export const TRAIT_CATEGORIES = [
    { key: 'gene', label: 'Gene' },
    { key: 'tf_activity', label: 'TF Activity' },
    { key: 'region', label: 'Region Score' }, 
];

export const ALL_TRAITS_FLAT = [
    { key: 'gene_Sox2', label: 'Sox2', category: 'gene' },
    { key: 'gene_Tbx5', label: 'Tbx5', category: 'gene' },
    { key: 'gene_Pax6', label: 'Pax6', category: 'gene' },
    { key: 'tf_STAT1', label: 'STAT1 Activity', category: 'tf_activity' },
    { key: 'tf_Smad4', label: 'Smad4 Activity', category: 'tf_activity' },
    { key: 'region_score', label: 'Region Cell Score', category: 'region' },
];

const generateData = () => {
  const data = [];
  
  ALL_SLICES.forEach(slice => {
    const xOffset = 50; 
    const yOffset = 50; 

    for (let i = 0; i < NUM_CELLS_PER_SLICE; i++) {
      const x = Math.random() * 500 + xOffset;
      const y = Math.random() * 800 + yOffset;
      const region = ALL_REGIONS[Math.floor(Math.random() * ALL_REGIONS.length)];
      
      data.push({
        id: `${slice}_${i}`,
        x: x,
        y: y,
        slice: slice,
        region: region, 
        
        // 模拟数据 (确保 Neural Tube 区域的高表达特性，以验证过滤功能)
        gene_Sox2: Math.random() * 5 + (region === 'Neural Tube' ? 3 : 0),
        gene_Tbx5: Math.random() * 4,
        gene_Pax6: Math.random() * 6,
        tf_STAT1: Math.random() * 3,
        tf_Smad4: Math.random() * 2,
        region_score: Math.random() * 10,
      });
    }
  });
  
  return data;
};

export const MOCK_DATA = generateData();
