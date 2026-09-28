import type { BrowserTab } from './browserController';

export class TabManager {
  private tabs: BrowserTab[] = [{ id: 'tab-1', url: 'https://groei.ai/business', title: 'Groei Business' }];
  private activeTabId = 'tab-1';

  getTabs() {
    return [...this.tabs];
  }

  getActiveTab() {
    return this.tabs.find((tab) => tab.id === this.activeTabId) ?? this.tabs[0];
  }

  addTab(url: string, title = 'New Tab') {
    const tab: BrowserTab = {
      id: `tab-${this.tabs.length + 1}`,
      url,
      title,
    };
    this.tabs.push(tab);
    this.activeTabId = tab.id;
    return tab;
  }

  switchTab(tabId: string) {
    const exists = this.tabs.some((tab) => tab.id === tabId);
    if (!exists) return null;
    this.activeTabId = tabId;
    return this.getActiveTab();
  }

  closeTab(tabId: string) {
    this.tabs = this.tabs.filter((tab) => tab.id !== tabId);
    if (!this.tabs.length) {
      this.tabs = [{ id: 'tab-1', url: 'https://groei.ai/business', title: 'Groei Business' }];
    }
    this.activeTabId = this.tabs[0].id;
    return this.getActiveTab();
  }
}
