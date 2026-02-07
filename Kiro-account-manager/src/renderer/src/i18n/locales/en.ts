/**
 * English translations
 */

const en = {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    yes: 'Yes',
    no: 'No',
    enabled: 'Enabled',
    disabled: 'Disabled',
    all: 'All',
    none: 'None',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    copy: 'Copy',
    copied: 'Copied',
    import: 'Import',
    export: 'Export',
    backup: 'Backup',
    restore: 'Restore',
    reset: 'Reset',
    apply: 'Apply',
    selected: 'Selected',
    total: 'Total',
    unknown: 'Unknown'
  },

  // Navigation
  nav: {
    home: 'Home',
    accounts: 'Accounts',
    machineId: 'Machine ID',
    kiroSettings: 'Kiro Settings',
    proxy: 'API Proxy',
    kproxy: 'K-Proxy',
    settings: 'Settings',
    about: 'About'
  },

  // Home Page
  home: {
    title: 'Home',
    totalAccounts: 'Total Accounts',
    activeAccounts: 'Active',
    errorAccounts: 'Error',
    totalQuota: 'Total Quota',
    currentAccount: 'Current Account',
    noCurrentAccount: 'No account selected',
    selectAccount: 'Select an account to use',
    subscription: 'Subscription',
    usage: 'Usage',
    daysRemaining: '{days} days remaining',
    expiresOn: 'Expires on {date}',
    quickActions: 'Quick Actions',
    switchAccount: 'Switch Account',
    refreshToken: 'Refresh Token',
    checkStatus: 'Check Status',
    welcome: {
      title: 'Welcome to Kiro Account Manager',
      description: 'A powerful multi-account management tool for Kiro IDE',
      features: {
        multiAccount: 'Manage multiple Kiro accounts',
        autoRefresh: 'Auto refresh tokens before expiration',
        machineId: 'Machine ID management to prevent bans',
        themes: '21 theme colors available'
      }
    }
  },

  // Accounts Page
  accounts: {
    title: 'Account Management',
    addAccount: 'Add Account',
    batchAdd: 'Batch Add',
    searchPlaceholder: 'Search accounts...',
    noAccounts: 'No accounts yet',
    addFirstAccount: 'Add your first account to get started',
    totalAccounts: '{count} accounts',
    selectedCount: '{count} selected',
    batchActions: 'Batch Actions',
    setGroup: 'Set Group',
    setTags: 'Set Tags',
    batchRefresh: 'Batch Refresh',
    batchCheck: 'Batch Check',
    batchDelete: 'Batch Delete',
    confirmDelete: 'Are you sure you want to delete this account?',
    confirmBatchDelete: 'Are you sure you want to delete {count} accounts?',
    filters: {
      all: 'All',
      active: 'Active',
      error: 'Error',
      expiring: 'Expiring Soon',
      noGroup: 'No Group'
    },
    sort: {
      email: 'Email',
      usage: 'Usage',
      addedAt: 'Added Date',
      lastChecked: 'Last Checked'
    },
    card: {
      usage: 'Usage',
      base: 'Base',
      trial: 'Trial',
      tokenExpiry: 'Token: {time}',
      tokenExpired: 'Token: Expired',
      lastChecked: 'Checked: {time}',
      neverChecked: 'Never checked',
      switchTo: 'Switch to this account',
      current: 'Current',
      banned: 'Banned',
      verified: 'Verified'
    }
  },

  // Add Account Dialog
  addAccount: {
    title: 'Add Account',
    description: 'Add a new Kiro account',
    tabs: {
      ssoToken: 'SSO Token',
      oidcCredentials: 'OIDC Credentials',
      socialLogin: 'Social Login',
      batchImport: 'Batch Import'
    },
    ssoToken: {
      label: 'SSO Token',
      placeholder: 'Paste SSO Token here...',
      hint: 'Get from browser developer tools after logging in to Kiro'
    },
    oidc: {
      authMethod: 'Auth Method',
      builderId: 'Builder ID (IdC)',
      social: 'GitHub / Google',
      refreshToken: 'Refresh Token',
      refreshTokenPlaceholder: 'Paste Refresh Token...',
      clientId: 'Client ID',
      clientSecret: 'Client Secret',
      region: 'AWS Region',
      socialHint: 'Social login does not need Client ID and Client Secret',
      selectProvider: 'Select Provider'
    },
    social: {
      title: 'Social Login',
      description: 'Login with Google or GitHub',
      google: 'Login with Google',
      github: 'Login with GitHub',
      waiting: 'Waiting for authorization...',
      success: 'Authorization successful!',
      failed: 'Authorization failed'
    },
    batch: {
      title: 'Batch Import',
      description: 'Import multiple accounts at once',
      format: 'Format: One account per line',
      placeholder: 'refreshToken\nOR\nrefreshToken,clientId,clientSecret\nOR\nJSON format',
      importing: 'Importing {current}/{total}...',
      result: 'Import complete: {success} success, {failed} failed'
    },
    verifying: 'Verifying...',
    verifySuccess: 'Verification successful',
    verifyFailed: 'Verification failed'
  },

  // Edit Account Dialog
  editAccount: {
    title: 'Edit Account',
    description: 'Modify account settings or refresh credentials',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Give this account a memorable name',
    credentials: 'Credentials',
    socialCredentials: 'Social Login Credentials',
    oidcCredentials: 'OIDC Credentials',
    importFromLocal: 'Import from Local',
    verifyAndRefresh: 'Verify and Refresh',
    saveChanges: 'Save Changes',
    accountStatus: 'Account Status',
    verified: 'Verified',
    error: 'Error'
  },

  // Machine ID Page
  machineId: {
    title: 'Machine ID Management',
    description: 'Manage device identifier to prevent account association bans',
    current: 'Current Machine ID',
    original: 'Original Backup',
    noBackup: 'No backup',
    backupTime: 'Backup time: {time}',
    actions: {
      copy: 'Copy',
      generate: 'Generate Random',
      custom: 'Custom',
      restore: 'Restore Original',
      backupToFile: 'Backup to File',
      restoreFromFile: 'Restore from File'
    },
    automation: {
      title: 'Automation Settings',
      autoSwitch: 'Auto switch Machine ID',
      autoSwitchDesc: 'Automatically change machine ID when switching accounts',
      bindToAccount: 'Bind Machine ID to Account',
      bindToAccountDesc: 'Each account uses its own unique machine ID',
      useBinded: 'Use Bound Machine ID',
      useBindedDesc: 'Use the bound machine ID when switching accounts'
    },
    accountBindings: 'Account Machine ID Bindings',
    history: 'Change History',
    requiresAdmin: 'Requires administrator privileges',
    restartAsAdmin: 'Restart as Administrator',
    platformInfo: {
      title: 'Platform Info',
      windows: 'Windows: Modifies registry MachineGuid',
      macos: 'macOS: Modifies IOPlatformUUID',
      linux: 'Linux: Modifies /etc/machine-id'
    }
  },

  // Settings Page
  settings: {
    title: 'Settings',
    language: {
      title: 'Language',
      description: 'Select display language',
      auto: 'Auto (System)',
      en: 'English',
      zh: '简体中文',
      customFile: 'Custom Translation File',
      loadCustom: 'Load Custom',
      customHint: 'Load custom translation JSON file from local'
    },
    theme: {
      title: 'Theme',
      description: 'Customize appearance',
      color: 'Theme Color',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode'
    },
    privacy: {
      title: 'Privacy',
      description: 'Privacy protection settings',
      privacyMode: 'Privacy Mode',
      privacyModeDesc: 'Hide sensitive information like emails and tokens'
    },
    autoRefresh: {
      title: 'Auto Refresh',
      description: 'Token auto refresh settings',
      enabled: 'Auto Refresh',
      enabledDesc: 'Auto refresh tokens before expiration and sync account info',
      interval: 'Check Interval',
      intervalDesc: 'How often to check account status',
      concurrency: 'Refresh Concurrency',
      concurrencyDesc: 'Number of accounts to refresh simultaneously',
      syncInfo: 'Sync Account Info',
      syncInfoDesc: 'Detect usage, subscription, and ban status when refreshing tokens',
      minutes: '{n} minutes'
    },
    autoSwitch: {
      title: 'Auto Switch',
      description: 'Auto switch account when balance is low',
      enabled: 'Auto Switch',
      enabledDesc: 'Automatically switch to another account when current balance is low',
      threshold: 'Balance Threshold',
      thresholdDesc: 'Switch when balance falls below this value',
      interval: 'Check Interval',
      intervalDesc: 'How often to check balance'
    },
    proxy: {
      title: 'Proxy',
      description: 'Network proxy settings',
      enabled: 'Enable Proxy',
      url: 'Proxy URL',
      urlPlaceholder: 'http://host:port or socks5://host:port',
      urlHint: 'Supports HTTP, HTTPS, SOCKS5 protocols'
    },
    data: {
      title: 'Data Management',
      description: 'Import/Export account data',
      export: 'Export Data',
      import: 'Import Data',
      exportHint: 'Export accounts to JSON, TXT, CSV or clipboard',
      importHint: 'Import accounts from JSON file'
    },
    batchImport: {
      title: 'Batch Import',
      concurrency: 'Import Concurrency',
      concurrencyDesc: 'Number of accounts to import simultaneously'
    },
    dangerZone: {
      title: 'Danger Zone',
      clearData: 'Clear All Data',
      clearDataDesc: 'Delete all accounts and settings',
      clearDataConfirm: 'Are you sure? This action cannot be undone.',
      clearDataButton: 'Clear All Data'
    }
  },

  // About Page
  about: {
    title: 'About',
    version: 'Version {version}',
    description: 'A powerful multi-account management tool for Kiro IDE',
    features: 'Features',
    techStack: 'Tech Stack',
    author: 'Author',
    github: 'GitHub',
    checkUpdate: 'Check for Updates',
    upToDate: 'You are using the latest version',
    newVersion: 'New version available: {version}',
    download: 'Download',
    releaseNotes: 'Release Notes'
  },

  // Status
  status: {
    active: 'Active',
    error: 'Error',
    banned: 'Banned',
    expired: 'Expired',
    unknown: 'Unknown'
  },

  // Subscription Types
  subscription: {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
    teams: 'Teams',
    unknown: 'Unknown'
  },

  // Time
  time: {
    justNow: 'Just now',
    minutesAgo: '{n} minutes ago',
    hoursAgo: '{n} hours ago',
    daysAgo: '{n} days ago',
    expired: 'Expired',
    remaining: '{time} remaining'
  },

  // Errors
  errors: {
    networkError: 'Network error, please check your connection',
    authError: 'Authentication failed',
    tokenExpired: 'Token expired, please refresh',
    accountBanned: 'Account has been banned',
    invalidCredentials: 'Invalid credentials',
    importFailed: 'Import failed',
    exportFailed: 'Export failed',
    saveFailed: 'Save failed',
    loadFailed: 'Load failed',
    unknownError: 'Unknown error occurred'
  },

  // Messages
  messages: {
    accountAdded: 'Account added successfully',
    accountDeleted: 'Account deleted successfully',
    accountUpdated: 'Account updated successfully',
    tokenRefreshed: 'Token refreshed successfully',
    settingsSaved: 'Settings saved',
    dataCopied: 'Data copied to clipboard',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully',
    machineIdChanged: 'Machine ID changed successfully',
    machineIdRestored: 'Machine ID restored successfully'
  }
}

export default en
