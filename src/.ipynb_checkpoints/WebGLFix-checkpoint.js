// src/WebGLFix.js
import { useEffect } from 'react';

// WebGL 错误修复
export const useWebGLFix = () => {
  useEffect(() => {
    // 修复 WebGL 上下文创建问题
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function(...args) {
      const context = originalGetContext.apply(this, args);
      
      if (args[0] === 'webgl2' || args[0] === 'webgl') {
        if (context) {
          // 确保必要的扩展存在
          const extensions = [
            'EXT_color_buffer_float',
            'OES_texture_float',
            'WEBGL_compressed_texture_etc'
          ];
          
          extensions.forEach(ext => {
            try {
              context.getExtension(ext);
            } catch (e) {
              console.warn(`WebGL extension ${ext} not supported`);
            }
          });
        }
      }
      
      return context;
    };

    return () => {
      // 恢复原始方法
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    };
  }, []);
};
