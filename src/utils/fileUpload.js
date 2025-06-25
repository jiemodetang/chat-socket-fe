// uploadChatFile

import { uploadChatFile } from './upload.js'

/**
 * 选择并上传文档（仅支持安卓平台，单选，支持 content:// 路径）
 * @param {Object} options
 * @param {Array} options.fileTypes - 允许的文件扩展名数组（如 ['pdf', 'docx']）
 * @param {Function} options.onProgress - 上传进度回调
 * @param {Function} options.onSuccess - 上传成功回调
 * @param {Function} options.onFail - 上传失败回调
 * @returns {Promise}
 */
export function chooseAndUploadDocument(options = {}) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    if (uni.getSystemInfoSync().platform !== 'android') {
      const err = { message: '仅支持安卓平台' }
      options.onFail && options.onFail(err)
      return reject(err)
    }
    plus.nativeUI.actionSheet({
      title: '选择文件来源',
      buttons: [
        { title: '文件管理器' },
        { title: '取消' }
      ]
    }, (e) => {
      if (e.index === 1) {
        plus.android.importClass('android.content.Intent');
        plus.android.importClass('android.net.Uri');
        const main = plus.android.runtimeMainActivity();
        const Intent = plus.android.importClass('android.content.Intent');
        const intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType('*/*');
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        main.onActivityResult = function (requestCode, resultCode, data) {
          if (resultCode === -1) {
            const uri = data.getData();
            const uriStr = uri.toString();
            // content:// 路径处理
            if (uriStr.startsWith('content://')) {
              try {
                // 获取文件名和扩展名
                let fileName = Date.now() + '';
                let fileExt = '';
                // 尝试通过 ContentResolver 获取文件名
                try {
                  const context = plus.android.runtimeMainActivity();
                  const ContentResolver = plus.android.importClass('android.content.ContentResolver');
                  const Cursor = plus.android.importClass('android.database.Cursor');
                  const resolver = context.getContentResolver();
                  const cursor = resolver.query(uri, null, null, null, null);
                  if (cursor && cursor.moveToFirst()) {
                    const nameIdx = cursor.getColumnIndex('_display_name');
                    if (nameIdx >= 0) {
                      fileName = cursor.getString(nameIdx);
                    }
                    cursor.close();
                  }
                  fileExt = fileName.split('.').pop().toLowerCase();
                } catch (e) {
                  // fallback
                  fileExt = options.fileTypes?.[0] || 'tmp';
                }
                if (options.fileTypes && options.fileTypes.length > 0 && !options.fileTypes.includes(fileExt)) {
                  const err = { message: '不支持的文件类型' };
                  options.onFail && options.onFail(err);
                  return reject(err);
                }
                // 目标路径
                const dstPath = `_doc/${Date.now()}.${fileExt}`;
                // 拷贝 content:// 到 _doc/
                plus.io.resolveLocalFileSystemURL('_doc/', function(rootEntry) {
                  rootEntry.getFile(dstPath.split('/').pop(), { create: true }, function(fileEntry) {
                    fileEntry.createWriter(function(writer) {
                      // 读取 content uri 的输入流
                      try {
                        const context = plus.android.runtimeMainActivity();
                        const resolver = context.getContentResolver();
                        const InputStream = plus.android.importClass('java.io.InputStream');
                        const BufferedInputStream = plus.android.importClass('java.io.BufferedInputStream');
                        const FileOutputStream = plus.android.importClass('java.io.FileOutputStream');
                        const bis = new BufferedInputStream(resolver.openInputStream(uri));
                        const fos = new FileOutputStream(fileEntry.fullPath.replace('file://', ''));
                        const buffer = plus.android.newObject('byte[]', 1024);
                        let len = 0;
                        while ((len = bis.read(buffer)) > 0) {
                          fos.write(buffer, 0, len);
                        }
                        bis.close();
                        fos.close();
                        // 上传
                        uploadChatFile(fileEntry.fullPath, 'file', options.onProgress)
                          .then((result) => {
                            options.onSuccess && options.onSuccess(result);
                            resolve(result);
                          })
                          .catch((err) => {
                            options.onFail && options.onFail(err);
                            reject(err);
                          });
                      } catch (err) {
                        options.onFail && options.onFail({ message: '文件拷贝失败', detail: err });
                        reject({ message: '文件拷贝失败', detail: err });
                      }
                    }, function(err) {
                      options.onFail && options.onFail({ message: '创建写入流失败', detail: err });
                      reject({ message: '创建写入流失败', detail: err });
                    });
                  }, function(err) {
                    options.onFail && options.onFail({ message: '创建目标文件失败', detail: err });
                    reject({ message: '创建目标文件失败', detail: err });
                  });
                }, function(err) {
                  options.onFail && options.onFail({ message: '无法访问_doc目录', detail: err });
                  reject({ message: '无法访问_doc目录', detail: err });
                });
              } catch (err) {
                options.onFail && options.onFail({ message: 'content://文件处理失败', detail: err });
                reject({ message: 'content://文件处理失败', detail: err });
              }
            } else if (uriStr.startsWith('file://')) {
              // 直接 file:// 路径
              plus.io.resolveLocalFileSystemURL(uriStr, (entry) => {
                entry.file((file) => {
                  const fileName = file.name;
                  const fileExt = fileName.split('.').pop().toLowerCase();
                  if (options.fileTypes && options.fileTypes.length > 0 && !options.fileTypes.includes(fileExt)) {
                    const err = { message: '不支持的文件类型' };
                    options.onFail && options.onFail(err);
                    return reject(err);
                  }
                  uploadChatFile(entry.fullPath, 'file', options.onProgress)
                    .then((result) => {
                      options.onSuccess && options.onSuccess(result);
                      resolve(result);
                    })
                    .catch((err) => {
                      options.onFail && options.onFail(err);
                      reject(err);
                    });
                }, (err) => {
                  options.onFail && options.onFail(err);
                  reject(err);
                });
              }, (err) => {
                options.onFail && options.onFail(err);
                reject(err);
              });
            } else {
              const err = { message: '不支持的文件路径类型', uri: uriStr };
              options.onFail && options.onFail(err);
              reject(err);
            }
          } else {
            const err = { message: 'File selection cancelled' };
            options.onFail && options.onFail(err);
            reject(err);
          }
          main.onActivityResult = null;
        };
        main.startActivityForResult(intent, 1001);
      } else {
        const err = { message: 'File selection cancelled' };
        options.onFail && options.onFail(err);
        reject(err);
      }
    });
    // #endif
    // #ifndef APP-PLUS
    const err = { message: '仅支持安卓APP端' }
    options.onFail && options.onFail(err)
    reject(err)
    // #endif
  })
}

/**
 * 打开文档（APP端优先用plus.runtime.openFile，下载后保存到_doc/再打开，兼容安卓）
 * @param {Object} options
 * @param {String} options.fileUrl - 文件路径或网络地址
 * @param {String} [options.fileName] - 文件名（可选）
 * @returns {Promise}
 */
export function openDocument({ fileUrl, fileName }) {
  return new Promise((resolve, reject) => {
    if (!fileUrl) {
      return reject({ message: '文件路径不能为空' })
    }
    // 获取文件扩展名
    let fileType
    if (fileName && fileName.includes('.')) {
      fileType = fileName.split('.').pop().toLowerCase()
    } else if (fileUrl && fileUrl.includes('.')) {
      fileType = fileUrl.split('.').pop().toLowerCase()
    }
    // #ifdef APP-PLUS
    const openLocalFile = (localPath) => {
      plus.runtime.openFile(localPath, {
        top: '10%',
        left: '10%',
        width: '80%',
        height: '80%'
      }, (res) => {
        if (res && res.state === 0) {
          resolve(res)
        } else {
          reject({ message: '文件打开失败，请确认已安装支持该格式的阅读器', detail: res })
        }
      })
    }
    if (/^https?:\/\//.test(fileUrl)) {
      // 网络文件需先下载
      uni.downloadFile({
        url: fileUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            // 下载到临时路径后，拷贝到 _doc/ 目录
            const tempPath = res.tempFilePath
            const saveName = (fileName && fileName.includes('.')) ? fileName : (Date.now() + (fileType ? ('.' + fileType) : ''))
            const dstPath = `_doc/${saveName}`
            plus.io.resolveLocalFileSystemURL('_doc/', function(rootEntry) {
              rootEntry.getFile(saveName, { create: true }, function(fileEntry) {
                fileEntry.createWriter(function(writer) {
                  writer.onwrite = function() {
                    openLocalFile(fileEntry.fullPath)
                  }
                  writer.onerror = function(e) {
                    reject({ message: '保存文件失败', detail: e })
                  }
                  // 读取临时文件内容
                  plus.io.resolveLocalFileSystemURL(tempPath, function(tempEntry) {
                    tempEntry.file(function(file) {
                      const reader = new FileReader()
                      reader.onload = function(evt) {
                        const blob = evt.target.result
                        writer.write(blob)
                      }
                      reader.onerror = function(e) {
                        reject({ message: '读取临时文件失败', detail: e })
                      }
                      reader.readAsArrayBuffer(file)
                    }, function(e) {
                      reject({ message: '读取临时文件失败', detail: e })
                    })
                  }, function(e) {
                    reject({ message: '无法访问临时文件', detail: e })
                  })
                }, function(e) {
                  reject({ message: '创建写入流失败', detail: e })
                })
              }, function(e) {
                reject({ message: '创建目标文件失败', detail: e })
              })
            }, function(e) {
              reject({ message: '无法访问_doc目录', detail: e })
            })
          } else {
            reject({ message: '文件下载失败', detail: res })
          }
        },
        fail: reject
      })
    } else {
      // 本地文件直接打开
      let localPath = fileUrl.replace('file://', '')
      openLocalFile(localPath)
    }
    // #endif
    // #ifndef APP-PLUS
    // 其它端用uni.openDocument
    if (/^https?:\/\//.test(fileUrl)) {
      uni.downloadFile({
        url: fileUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.openDocument({
              filePath: res.tempFilePath,
              fileType,
              showMenu: true,
              success: resolve,
              fail: (err) => {
                reject({ message: '文件打开失败，请确认已安装支持该格式的阅读器', detail: err })
              }
            })
          } else {
            reject({ message: '文件下载失败', detail: res })
          }
        },
        fail: reject
      })
    } else {
      uni.openDocument({
        filePath: fileUrl.replace('file://', ''),
        fileType,
        showMenu: true,
        success: resolve,
        fail: (err) => {
          reject({ message: '文件打开失败，请确认已安装支持该格式的阅读器', detail: err })
        }
      })
    }
    // #endif
  })
}