// src/dataLoader.js
import Papa from 'papaparse';

// 公共数据文件路径
const DATA_BASE_PATH = './data';
const SECTION_FILE = 'https://zenodo.org/records/17597227/files/gene_expression.csv?download=1';
const COORDINATES_FILE = `${DATA_BASE_PATH}/coordinates.csv`;
const TF_ACTIVITY_FILE = `${DATA_BASE_PATH}/tf_activity.csv`;
const GENE_EXPRESSION_FILE = `${DATA_BASE_PATH}/gene_expression.csv`;
const CELLTYPE_FILE = `${DATA_BASE_PATH}/celltype.csv`;

// 加载和解析CSV文件
const loadCSV = async (filePath) => {
  try {
    console.log(`Loading CSV from: ${filePath}`);
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}: ${response.status}`);
    }
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(`Loaded ${results.data.length} rows from ${filePath}`, results.data[0]);
          if (results.data.length === 0) {
            console.warn(`No data found in ${filePath}`);
          }
          resolve(results.data);
        },
        error: (error) => {
          console.error(`Error parsing ${filePath}:`, error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    throw error;
  }
};

// 主数据加载函数
export const loadRealData = async () => {
  console.log('Loading real data from CSV files...');
  
  try {
    // 并行加载所有文件
    const [sectionData, coordinateData, tfData, geneData, celltypeData] = await Promise.all([
      loadCSV(SECTION_FILE),
      loadCSV(COORDINATES_FILE),
      loadCSV(TF_ACTIVITY_FILE),
      loadCSV(GENE_EXPRESSION_FILE),
      loadCSV(CELLTYPE_FILE)
    ]);

    console.log('Data loaded:', {
      section: sectionData.length,
      coordinates: coordinateData.length,
      tf: tfData.length,
      gene: geneData.length,
      celltype: celltypeData.length
    });

    return combineData(sectionData, coordinateData, tfData, geneData, celltypeData);
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;
  }
};

// 处理section数据 - 修复：处理第一列为空的情况
const processSectionData = (sectionData) => {
  const sectionMap = {};
  let processedCount = 0;
  
  sectionData.forEach(row => {
    const keys = Object.keys(row);
    if (keys.length >= 2) {
      // section文件格式：第一列是空字符串，第二列是section值
      // 细胞ID在空字符串键的值中
      const cellId = row['']; // 第一列空字符串的值是细胞ID
      const section = row.section; // 第二列是section信息
      
      if (cellId && section) {
        sectionMap[cellId] = section;
        processedCount++;
      }
    }
  });
  
  console.log(`Processed ${processedCount} section entries`);
  return sectionMap;
};

// 处理坐标数据 - 修复：处理第一列为空的情况
const processCoordinateData = (coordinateData) => {
  const coordMap = {};
  let processedCount = 0;
  
  coordinateData.forEach(row => {
    const keys = Object.keys(row);
    if (keys.length >= 3) {
      // coordinates文件格式：第一列是空字符串，第二列是x，第三列是y
      const cellId = row['']; // 第一列空字符串的值是细胞ID
      const x = parseFloat(row.x);
      const y = parseFloat(row.y);
      
      if (cellId && !isNaN(x) && !isNaN(y)) {
        coordMap[cellId] = { x, y };
        processedCount++;
      }
    }
  });
  
  console.log(`Processed ${processedCount} coordinate entries`);
  return coordMap;
};

// 处理TF活性数据 - 修复：处理第一列为空的情况
const processTFData = (tfData) => {
  const tfMap = {};
  if (tfData.length === 0) {
    console.warn('No TF data found');
    return tfMap;
  }
  
  const headers = Object.keys(tfData[0] || {});
  console.log(`TF headers (first 10):`, headers.slice(0, 10));
  
  // 细胞ID在第一列空字符串的值中
  let processedCount = 0;
  tfData.forEach(row => {
    const cellId = row['']; // 第一列空字符串的值是细胞ID
    if (cellId) {
      tfMap[cellId] = {};
      
      // 处理所有TF活性列（跳过第一列空字符串）
      headers.forEach(header => {
        if (header !== '' && !header.includes('Cell') && !header.includes('cellName')) {
          const value = parseFloat(row[header]);
          if (!isNaN(value)) {
            tfMap[cellId][header] = value;
          }
        }
      });
      processedCount++;
    }
  });
  
  console.log(`Processed ${processedCount} TF entries`);
  return tfMap;
};

// 处理基因表达数据 - 修复：处理第一列为空的情况
const processGeneData = (geneData) => {
  const geneMap = {};
  if (geneData.length === 0) {
    console.warn('No gene data found');
    return geneMap;
  }
  
  const headers = Object.keys(geneData[0] || {});
  console.log(`Gene headers (first 10):`, headers.slice(0, 10));
  
  // 细胞ID在第一列空字符串的值中
  let processedCount = 0;
  geneData.forEach(row => {
    const cellId = row['']; // 第一列空字符串的值是细胞ID
    if (cellId) {
      geneMap[cellId] = {};
      
      // 处理所有基因列（跳过第一列空字符串）
      headers.forEach(header => {
        if (header !== '' && !header.includes('Cell') && !header.includes('cellName')) {
          const value = parseFloat(row[header]);
          if (!isNaN(value)) {
            geneMap[cellId][header] = value;
          }
        }
      });
      processedCount++;
    }
  });
  
  console.log(`Processed ${processedCount} gene entries`);
  return geneMap;
};

// 处理细胞类型数据 - 修复：处理第一列为空的情况
const processCelltypeData = (celltypeData) => {
  const celltypeMap = {};
  let processedCount = 0;
  
  celltypeData.forEach(row => {
    const keys = Object.keys(row);
    if (keys.length >= 2) {
      // celltype文件格式：第一列是空字符串，第二列是celltype值
      const cellId = row['']; // 第一列空字符串的值是细胞ID
      const celltype = row.celltype; // 第二列是celltype信息
      
      if (cellId && celltype) {
        celltypeMap[cellId] = celltype;
        processedCount++;
      }
    }
  });
  
  console.log(`Processed ${processedCount} celltype entries`);
  return celltypeMap;
};

// 合并所有数据
const combineData = (rawSectionData, rawCoordinateData, rawTFData, rawGeneData, rawCelltypeData) => {
  console.log('Combining data...');
  
  // 处理原始数据
  const sectionMap = processSectionData(rawSectionData);
  const coordMap = processCoordinateData(rawCoordinateData);
  const tfMap = processTFData(rawTFData);
  const geneMap = processGeneData(rawGeneData);
  const celltypeMap = processCelltypeData(rawCelltypeData);

  console.log('Maps sizes:', {
    section: Object.keys(sectionMap).length,
    coord: Object.keys(coordMap).length,
    tf: Object.keys(tfMap).length,
    gene: Object.keys(geneMap).length,
    celltype: Object.keys(celltypeMap).length
  });

  // 获取所有细胞ID（取所有数据源的并集）
  const allCellIds = new Set([
    ...Object.keys(sectionMap),
    ...Object.keys(coordMap),
    ...Object.keys(tfMap),
    ...Object.keys(geneMap),
    ...Object.keys(celltypeMap)
  ]);
  
  console.log('Total unique cells found:', allCellIds.size);

  const combinedData = [];
  let skippedCells = 0;

  allCellIds.forEach(cellId => {
    const section = sectionMap[cellId];
    const coord = coordMap[cellId];
    const tfActivities = tfMap[cellId] || {};
    const geneExpressions = geneMap[cellId] || {};
    const celltype = celltypeMap[cellId] || 'Unknown';

    // 必须有切片信息和坐标信息
    if (section && coord && !isNaN(coord.x) && !isNaN(coord.y)) {
      combinedData.push({
        id: cellId,
        x: coord.x,
        y: coord.y,
        slice: section,
        region: celltype,
        ...tfActivities,
        ...geneExpressions
      });
    } else {
      skippedCells++;
      if (skippedCells <= 5) { // 只显示前5个跳过的细胞
        console.log(`Skipped cell ${cellId}:`, { 
          section: !!section, 
          coord: !!coord,
          hasTF: !!tfMap[cellId],
          hasGene: !!geneMap[cellId],
          hasCelltype: !!celltypeMap[cellId]
        });
      }
    }
  });

  console.log(`Successfully combined ${combinedData.length} cells, skipped ${skippedCells} cells`);
  
  if (combinedData.length === 0) {
    console.error('No valid cells found after combining data');
    // 创建一些示例数据用于调试
    return createSampleData();
  }
  
  // 坐标归一化
  return normalizeCoordinates(combinedData);
};

// 创建示例数据用于调试
const createSampleData = () => {
  console.log('Creating sample data for debugging');
  const sampleData = [];
  const sampleCellTypes = ['Neural Tube', 'Skeletal Muscle', 'Heart', 'Kidney', 'Liver'];
  const sampleGenes = ['GeneA', 'GeneB', 'GeneC', 'GeneD'];
  const sampleTFs = ['TF1_activity', 'TF2_activity'];
  
  for (let i = 0; i < 100; i++) {
    const cellData = {
      id: `sample_cell_${i}`,
      x: Math.random() * 500 + 50,
      y: Math.random() * 800 + 50,
      slice: i < 33 ? 'E125' : i < 66 ? 'E135' : 'E155',
      region: sampleCellTypes[i % sampleCellTypes.length]
    };
    
    // 添加基因表达数据
    sampleGenes.forEach(gene => {
      cellData[gene] = Math.random() * 5;
    });
    
    // 添加TF活性数据
    sampleTFs.forEach(tf => {
      cellData[tf] = Math.random() * 3;
    });
    
    sampleData.push(cellData);
  }
  
  return sampleData;
};

// 坐标归一化 - 保持原始比例
const normalizeCoordinates = (data) => {
  console.log('Normalizing coordinates...');
  
  // 按切片分组归一化
  const slices = [...new Set(data.map(d => d.slice))];
  const normalizedData = [];
  
  slices.forEach(slice => {
    const sliceData = data.filter(d => d.slice === slice);
    const xValues = sliceData.map(d => d.x);
    const yValues = sliceData.map(d => d.y);
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    
    console.log(`Slice ${slice}: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}], xRange=${xRange}, yRange=${yRange}, aspectRatio=${xRange/yRange}`);
    
    // 计算保持比例的目标尺寸
    const targetWidth = 500;  // 基础宽度
    const targetHeight = 800; // 基础高度
    
    // 保持原始比例
    const originalAspectRatio = xRange / yRange;
    const targetAspectRatio = targetWidth / targetHeight;
    
    let finalWidth, finalHeight;
    
    if (originalAspectRatio > targetAspectRatio) {
      // 宽度限制
      finalWidth = targetWidth;
      finalHeight = targetWidth / originalAspectRatio;
    } else {
      // 高度限制
      finalHeight = targetHeight;
      finalWidth = targetHeight * originalAspectRatio;
    }
    
    // 居中显示
    const xOffset = (targetWidth - finalWidth) / 2 + 50;
    const yOffset = (targetHeight - finalHeight) / 2 + 50;
    
    sliceData.forEach(cell => {
      // 归一化并保持比例
      const normalizedX = xRange > 0 ? ((cell.x - minX) / xRange) * finalWidth + xOffset : 300;
      const normalizedY = yRange > 0 ? ((cell.y - minY) / yRange) * finalHeight + yOffset : 450;
      
      normalizedData.push({
        ...cell,
        x: normalizedX,
        y: normalizedY
      });
    });
  });
  
  console.log('Coordinates normalized with aspect ratio preserved');
  return normalizedData;
};

// 从合并的数据中提取常量
export const extractConstantsFromData = (data) => {
  console.log('Extracting constants from data...');
  
  // 提取所有切片
  const ALL_SLICES = [...new Set(data.map(d => d.slice))].sort();
  
  // 提取所有区域（细胞类型）
  const ALL_REGIONS = [...new Set(data.map(d => d.region))].sort();
  
  // 提取所有特性（TF活性和基因）
  const allKeys = new Set();
  data.forEach(cell => {
    Object.keys(cell).forEach(key => {
      if (!['id', 'x', 'y', 'slice', 'region'].includes(key)) {
        allKeys.add(key);
      }
    });
  });

  console.log(`Found ${allKeys.size} traits:`, Array.from(allKeys).slice(0, 10));

  // 分类特性
  const ALL_TRAITS_FLAT = [];
  allKeys.forEach(key => {
    if (key.includes('activity') || key.includes('Activity')) {
      // TF活性
      const label = key.includes('(direct)') 
        ? key.replace(' activity(direct)', ' Activity (Direct)')
        : key.includes('(extended)')
        ? key.replace(' activity(extended)', ' Activity (Extended)')
        : key + ' Activity';
      
      ALL_TRAITS_FLAT.push({
        key: key,
        label: label,
        category: 'tf_activity'
      });
    } else {
      // 基因表达
      ALL_TRAITS_FLAT.push({
        key: key,
        label: key,
        category: 'gene'
      });
    }
  });

  // 如果没有任何特性，添加一些默认的
  if (ALL_TRAITS_FLAT.length === 0) {
    console.warn('No traits found, adding default traits');
    ALL_TRAITS_FLAT.push(
      { key: 'GeneA', label: 'Gene A', category: 'gene' },
      { key: 'GeneB', label: 'Gene B', category: 'gene' },
      { key: 'TF1_activity', label: 'TF1 Activity', category: 'tf_activity' },
      { key: 'TF2_activity', label: 'TF2 Activity', category: 'tf_activity' }
    );
  }

  // 定义特性分类
  const TRAIT_CATEGORIES = [
    { key: 'gene', label: 'Gene' },
    { key: 'tf_activity', label: 'TF Activity' },
  ];

  // 切片数据
  const SECTION_DATA = [
    { 
      tissue: 'Embryo', 
      sections: ALL_SLICES.map(s => ({ key: s, label: s })) 
    },
  ];

  console.log('Constants extracted:', {
    slices: ALL_SLICES,
    regions: ALL_REGIONS,
    traits: ALL_TRAITS_FLAT.length
  });

  return {
    ALL_SLICES,
    ALL_REGIONS,
    SECTION_DATA,
    TRAIT_CATEGORIES,
    ALL_TRAITS_FLAT,
    REAL_DATA: data
  };
};
