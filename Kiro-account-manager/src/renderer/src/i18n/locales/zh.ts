/**
 * 中文翻译
 */

const zh = {
  // 通用
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    close: '关闭',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '提示',
    yes: '是',
    no: '否',
    enabled: '已开启',
    disabled: '已关闭',
    all: '全部',
    none: '无',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    refresh: '刷新',
    copy: '复制',
    copied: '已复制',
    import: '导入',
    export: '导出',
    backup: '备份',
    restore: '恢复',
    reset: '重置',
    apply: '应用',
    selected: '已选择',
    total: '总计',
    unknown: '未知'
  },

  // 导航
  nav: {
    home: '主页',
    accounts: '账户管理',
    machineId: '机器码',
    kiroSettings: 'Kiro 设置',
    proxy: 'API 反代',
    kproxy: 'K-Proxy',
    settings: '设置',
    about: '关于'
  },

  // 主页
  home: {
    title: '主页',
    totalAccounts: '账户总数',
    activeAccounts: '正常',
    errorAccounts: '异常',
    totalQuota: '总额度',
    currentAccount: '当前账号',
    noCurrentAccount: '未选择账号',
    selectAccount: '请选择一个账号使用',
    subscription: '订阅计划',
    usage: '使用量',
    daysRemaining: '剩余 {days} 天',
    expiresOn: '到期时间 {date}',
    quickActions: '快捷操作',
    switchAccount: '切换账号',
    refreshToken: '刷新 Token',
    checkStatus: '检查状态',
    welcome: {
      title: '欢迎使用 Kiro 账户管理器',
      description: '一个功能强大的 Kiro IDE 多账号管理工具',
      features: {
        multiAccount: '管理多个 Kiro 账号',
        autoRefresh: 'Token 过期前自动刷新',
        machineId: '机器码管理防止封禁',
        themes: '21 种主题颜色可选'
      }
    }
  },

  // 账户管理页
  accounts: {
    title: '账户管理',
    addAccount: '添加账号',
    batchAdd: '批量添加',
    searchPlaceholder: '搜索账号...',
    noAccounts: '暂无账号',
    addFirstAccount: '添加你的第一个账号开始使用',
    totalAccounts: '共 {count} 个账号',
    selectedCount: '已选 {count} 个',
    batchActions: '批量操作',
    setGroup: '设置分组',
    setTags: '设置标签',
    batchRefresh: '批量刷新',
    batchCheck: '批量检查',
    batchDelete: '批量删除',
    confirmDelete: '确定要删除这个账号吗？',
    confirmBatchDelete: '确定要删除 {count} 个账号吗？',
    filters: {
      all: '全部',
      active: '正常',
      error: '异常',
      expiring: '即将过期',
      noGroup: '未分组'
    },
    sort: {
      email: '邮箱',
      usage: '用量',
      addedAt: '添加时间',
      lastChecked: '最后检查'
    },
    card: {
      usage: '使用量',
      base: '基础',
      trial: '试用',
      tokenExpiry: 'Token: {time}',
      tokenExpired: 'Token: 已过期',
      lastChecked: '检查: {time}',
      neverChecked: '从未检查',
      switchTo: '切换到此账号',
      current: '当前',
      banned: '已封禁',
      verified: '已验证'
    }
  },

  // 添加账号对话框
  addAccount: {
    title: '添加账号',
    description: '添加新的 Kiro 账号',
    tabs: {
      ssoToken: 'SSO Token',
      oidcCredentials: 'OIDC 凭证',
      socialLogin: '社交登录',
      batchImport: '批量导入'
    },
    ssoToken: {
      label: 'SSO Token',
      placeholder: '在此粘贴 SSO Token...',
      hint: '从登录 Kiro 后的浏览器开发者工具获取'
    },
    oidc: {
      authMethod: '认证方式',
      builderId: 'Builder ID (IdC)',
      social: 'GitHub / Google',
      refreshToken: 'Refresh Token',
      refreshTokenPlaceholder: '粘贴 Refresh Token...',
      clientId: 'Client ID',
      clientSecret: 'Client Secret',
      region: 'AWS 区域',
      socialHint: '社交登录不需要 Client ID 和 Client Secret',
      selectProvider: '选择提供商'
    },
    social: {
      title: '社交登录',
      description: '使用 Google 或 GitHub 登录',
      google: '使用 Google 登录',
      github: '使用 GitHub 登录',
      waiting: '等待授权...',
      success: '授权成功！',
      failed: '授权失败'
    },
    batch: {
      title: '批量导入',
      description: '一次导入多个账号',
      format: '格式：每行一个账号',
      placeholder: 'refreshToken\n或\nrefreshToken,clientId,clientSecret\n或\nJSON 格式',
      importing: '正在导入 {current}/{total}...',
      result: '导入完成：{success} 成功，{failed} 失败'
    },
    verifying: '验证中...',
    verifySuccess: '验证成功',
    verifyFailed: '验证失败'
  },

  // 编辑账号对话框
  editAccount: {
    title: '编辑账号',
    description: '修改账号配置或更新凭证',
    nickname: '账号别名',
    nicknamePlaceholder: '给这个账号起个好记的名字',
    credentials: '凭证配置',
    socialCredentials: '社交登录凭证',
    oidcCredentials: 'OIDC 凭证配置',
    importFromLocal: '从本地导入',
    verifyAndRefresh: '验证并刷新凭证信息',
    saveChanges: '保存更改',
    accountStatus: '当前账号状态',
    verified: '已验证',
    error: '异常'
  },

  // 机器码管理页
  machineId: {
    title: '机器码管理',
    description: '管理设备标识符，防止账号关联封禁',
    current: '当前机器码',
    original: '原始备份',
    noBackup: '无备份',
    backupTime: '备份时间: {time}',
    actions: {
      copy: '复制',
      generate: '随机生成',
      custom: '自定义',
      restore: '恢复原始',
      backupToFile: '备份到文件',
      restoreFromFile: '从文件恢复'
    },
    automation: {
      title: '自动化设置',
      autoSwitch: '自动切换机器码',
      autoSwitchDesc: '切换账号时自动更换机器码',
      bindToAccount: '绑定机器码到账号',
      bindToAccountDesc: '每个账号使用独立的机器码',
      useBinded: '使用绑定的机器码',
      useBindedDesc: '切换账号时使用绑定的机器码'
    },
    accountBindings: '账号机器码绑定',
    history: '修改历史',
    requiresAdmin: '需要管理员权限',
    restartAsAdmin: '以管理员身份重启',
    platformInfo: {
      title: '平台说明',
      windows: 'Windows: 修改注册表 MachineGuid',
      macos: 'macOS: 修改 IOPlatformUUID',
      linux: 'Linux: 修改 /etc/machine-id'
    }
  },

  // 设置页
  settings: {
    title: '设置',
    language: {
      title: '语言',
      description: '选择显示语言',
      auto: '自动 (跟随系统)',
      en: 'English',
      zh: '简体中文',
      customFile: '自定义翻译文件',
      loadCustom: '加载自定义',
      customHint: '从本地加载自定义翻译 JSON 文件'
    },
    theme: {
      title: '主题',
      description: '自定义外观',
      color: '主题颜色',
      darkMode: '深色模式',
      lightMode: '浅色模式'
    },
    privacy: {
      title: '隐私',
      description: '隐私保护设置',
      privacyMode: '隐私模式',
      privacyModeDesc: '隐藏邮箱、Token 等敏感信息'
    },
    autoRefresh: {
      title: '自动刷新',
      description: 'Token 自动刷新设置',
      enabled: '自动刷新',
      enabledDesc: 'Token 过期前自动刷新，并同步更新账户信息',
      interval: '检查间隔',
      intervalDesc: '每隔多久检查一次账户状态',
      concurrency: '刷新并发数',
      concurrencyDesc: '同时刷新的账号数量',
      syncInfo: '同步检测账户信息',
      syncInfoDesc: '刷新 Token 时同步检测用量、订阅、封禁状态',
      minutes: '{n} 分钟'
    },
    autoSwitch: {
      title: '自动换号',
      description: '余额不足时自动切换账号',
      enabled: '自动换号',
      enabledDesc: '当前账号余额不足时自动切换到其他可用账号',
      threshold: '余额阈值',
      thresholdDesc: '余额低于此值时切换',
      interval: '检查间隔',
      intervalDesc: '每隔多久检查一次余额'
    },
    proxy: {
      title: '代理',
      description: '网络代理设置',
      enabled: '启用代理',
      url: '代理地址',
      urlPlaceholder: 'http://host:port 或 socks5://host:port',
      urlHint: '支持 HTTP、HTTPS、SOCKS5 协议'
    },
    data: {
      title: '数据管理',
      description: '导入/导出账号数据',
      export: '导出数据',
      import: '导入数据',
      exportHint: '导出账号到 JSON、TXT、CSV 或剪贴板',
      importHint: '从 JSON 文件导入账号'
    },
    batchImport: {
      title: '批量导入',
      concurrency: '导入并发数',
      concurrencyDesc: '同时导入的账号数量'
    },
    dangerZone: {
      title: '危险区域',
      clearData: '清除所有数据',
      clearDataDesc: '删除所有账号和设置',
      clearDataConfirm: '确定要清除吗？此操作无法撤销。',
      clearDataButton: '清除所有数据'
    }
  },

  // 关于页
  about: {
    title: '关于',
    version: '版本 {version}',
    description: '一个功能强大的 Kiro IDE 多账号管理工具',
    features: '功能特性',
    techStack: '技术栈',
    author: '作者',
    github: 'GitHub',
    checkUpdate: '检查更新',
    upToDate: '当前已是最新版本',
    newVersion: '发现新版本: {version}',
    download: '下载',
    releaseNotes: '更新说明'
  },

  // 状态
  status: {
    active: '正常',
    error: '异常',
    banned: '已封禁',
    expired: '已过期',
    unknown: '未知'
  },

  // 订阅类型
  subscription: {
    free: '免费版',
    pro: '专业版',
    enterprise: '企业版',
    teams: '团队版',
    unknown: '未知'
  },

  // 时间
  time: {
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    hoursAgo: '{n} 小时前',
    daysAgo: '{n} 天前',
    expired: '已过期',
    remaining: '剩余 {time}'
  },

  // 错误
  errors: {
    networkError: '网络错误，请检查网络连接',
    authError: '认证失败',
    tokenExpired: 'Token 已过期，请刷新',
    accountBanned: '账号已被封禁',
    invalidCredentials: '凭证无效',
    importFailed: '导入失败',
    exportFailed: '导出失败',
    saveFailed: '保存失败',
    loadFailed: '加载失败',
    unknownError: '发生未知错误'
  },

  // 消息
  messages: {
    accountAdded: '账号添加成功',
    accountDeleted: '账号删除成功',
    accountUpdated: '账号更新成功',
    tokenRefreshed: 'Token 刷新成功',
    settingsSaved: '设置已保存',
    dataCopied: '数据已复制到剪贴板',
    dataExported: '数据导出成功',
    dataImported: '数据导入成功',
    machineIdChanged: '机器码修改成功',
    machineIdRestored: '机器码已恢复'
  }
}

export default zh
