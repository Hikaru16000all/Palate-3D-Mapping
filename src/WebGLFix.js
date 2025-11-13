// src/WebGLFix.js
import { useEffect } from 'react';

// WebGL 错误修复钩子
export const useWebGLFix = () => {
  useEffect(() => {
    // 修复 WebGL 上下文创建问题
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    let fixApplied = false;
    
    HTMLCanvasElement.prototype.getContext = function(...args) {
      try {
        const context = originalGetContext.apply(this, args);
        
        if ((args[0] === 'webgl2' || args[0] === 'webgl') && context) {
          if (!fixApplied) {
            console.log('Applying WebGL context fix');
            fixApplied = true;
            
            // 确保必要的扩展存在
            try {
              // 尝试获取常用扩展
              const extensions = [
                'WEBGL_lose_context',
                'OES_texture_float',
                'OES_texture_float_linear',
                'EXT_color_buffer_float',
                'WEBGL_compressed_texture_etc'
              ];
              
              extensions.forEach(ext => {
                try {
                  const extension = context.getExtension(ext);
                  if (extension) {
                    console.log(`WebGL extension ${ext} loaded`);
                  }
                } catch (e) {
                  console.warn(`WebGL extension ${ext} not supported`);
                }
              });
            } catch (e) {
              console.warn('WebGL extension loading failed:', e.message);
            }
          }
        }
        
        return context;
      } catch (error) {
        console.error('WebGL context creation failed:', error);
        return null;
      }
    };

    return () => {
      // 恢复原始方法
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    };
  }, []);
};

// 检查 WebGL 支持
export const checkWebGLSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }
    
    // 检查必要的功能
    const features = {
      floatingPointTextures: !!gl.getExtension('OES_texture_float'),
      loseContext: !!gl.getExtension('WEBGL_lose_context'),
      vertexArrayObjects: !!gl.getExtension('OES_vertex_array_object')
    };
    
    console.log('WebGL supported features:', features);
    return true;
    
  } catch (error) {
    console.error('WebGL check failed:', error);
    return false;
  }
};

// 强制使用 WebGL1 作为降级方案
export const useWebGLFallback = () => {
  useEffect(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function(...args) {
      // 如果 WebGL2 失败，尝试 WebGL1
      if (args[0] === 'webgl2') {
        try {
          const context = originalGetContext.apply(this, args);
          if (context) return context;
        } catch (e) {
          console.warn('WebGL2 failed, falling back to WebGL1');
        }
        
        // 回退到 WebGL1
        return originalGetContext.call(this, 'webgl', ...args.slice(1));
      }
      
      return originalGetContext.apply(this, args);
    };

    return () => {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    };
  }, []);
};