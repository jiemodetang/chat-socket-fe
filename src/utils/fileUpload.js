 

import { uploadChatFile } from './upload.js'
import { currentConfig } from '../config';
 
 
/**
 * 打开文档
 * @param {Object} fileInfo 文件信息
 * @param {String} fileInfo.fileUrl 文件URL
 * @param {String} fileInfo.fileName 文件名
 * @returns {Promise} 返回一个Promise对象
 */
export const openDocument = (fileInfo) => {
  return new Promise((resolve, reject) => {
    const { fileUrl, fileName } = fileInfo;
    
    if (!fileUrl) {
      reject({ message: '文件URL不能为空' });
      return;
    }
    
    // 构建完整URL
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : currentConfig.apiUrl + fileUrl;
    
    // 在APP环境下使用plus API打开文档
    // #ifdef APP-PLUS
    // 先下载文件到本地
    uni.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 使用系统应用打开文件
          plus.runtime.openFile(res.tempFilePath, {}, (error) => {
            reject({ message: '无法打开文件: ' + error.message });
          });
          resolve();
        } else {
          reject({ message: '下载文件失败: ' + res.statusCode });
        }
      },
      fail: (err) => {
        reject({ message: '下载文件失败: ' + err.errMsg });
      }
    });
    // #endif
    
    // 在H5环境下直接打开链接
    // #ifdef H5
    window.open(fullUrl, '_blank');
    resolve();
    // #endif
    
    // 在小程序环境下使用uni.openDocument
    // #ifdef MP
    uni.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          uni.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            success: () => {
              resolve();
            },
            fail: (err) => {
              reject({ message: '打开文件失败: ' + err.errMsg });
            }
          });
        } else {
          reject({ message: '下载文件失败: ' + res.statusCode });
        }
      },
      fail: (err) => {
        reject({ message: '下载文件失败: ' + err.errMsg });
      }
    });
    // #endif
  });
};