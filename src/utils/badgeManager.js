/**
 * 角标管理工具
 * 用于统一管理应用内的角标显示
 */

/**
 * 更新通讯录Tab角标
 * @param {number} count - 未读数量
 */
export const updateContactsBadge = (count) => {
  if (count > 0) {
    // 设置角标
    uni.setTabBarBadge({
      index: 1, // 通讯录的索引
      text: count.toString()
    }).catch(err => {
      console.log('Failed to set contacts badge:', err)
    })
  } else {
    // 移除角标
    uni.removeTabBarBadge({
      index: 1
    }).catch(err => {
      // 忽略可能的错误（如果角标不存在）
      console.log('No contacts badge to remove')
    })
  }
}

/**
 * 更新会话Tab角标
 * @param {number} count - 未读数量
 */
export const updateConversationTabBadge = (count) => {
  if (count > 0) {
    // 设置角标
    uni.setTabBarBadge({
      index: 0, // 会话的索引
      text: count.toString()
    }).catch(err => {
      console.log('Failed to set conversation badge:', err)
    })
  } else {
    // 移除角标
    uni.removeTabBarBadge({
      index: 0
    }).catch(err => {
      // 忽略可能的错误（如果角标不存在）
      console.log('No conversation badge to remove')
    })
  }
}

/**
 * 更新所有角标
 * @param {Object} store - Vuex store实例
 */
export const updateAllBadges = (store) => {
  // 更新通讯录角标
  updateContactsBadge(store.getters.pendingFriendRequestsCount)
  
  // 更新会话角标
  updateConversationTabBadge(store.getters.unreadCount)
} 