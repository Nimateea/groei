export type BrowserAction =
  | 'navigate'
  | 'search'
  | 'click'
  | 'type'
  | 'scroll'
  | 'goBack'
  | 'goForward'
  | 'refresh'
  | 'openTab'
  | 'switchTab'
  | 'closeTab'
  | 'readPage'
  | 'findOnPage';

export type BrowserActionResult = {
  success: boolean;
  action: BrowserAction;
  url?: string;
  title?: string;
  value?: string;
  elementId?: string;
  tabId?: string;
  direction?: 'up' | 'down';
  amount?: number;
  content?: string;
  elements?: Array<{
    id: string;
    type: string;
    role: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  error?: string;
};

export type BrowserTab = {
  id: string;
  url: string;
  title: string;
};

export class BrowserController {
  public tabs: BrowserTab[] = [{ id: 'tab-1', url: 'https://groei.ai/business', title: 'Groei Business' }];
  public activeTabId = 'tab-1';

  private getBridge() {
    return (globalThis as typeof globalThis & { browserBridge?: Record<string, (...args: any[]) => Promise<BrowserActionResult>> }).browserBridge;
  }

  async navigate(url: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.navigate) {
      return { success: true, action: 'navigate', url, title: 'Local browser preview' };
    }

    return bridge.navigate(url);
  }

  async search(query: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.search) {
      return { success: true, action: 'search', url: query, title: 'Search preview' };
    }
    return bridge.search(query);
  }

  async readPage(): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.readPage) {
      return { success: true, action: 'readPage', title: 'Page preview' };
    }
    return bridge.readPage();
  }

  async click(elementId: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.click) {
      return { success: true, action: 'click', elementId, title: 'Preview click' };
    }
    return bridge.click(elementId);
  }

  async type(elementId: string, value: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.type) {
      return { success: true, action: 'type', elementId, value, title: 'Preview typing' };
    }
    return bridge.type(elementId, value);
  }

  async scroll(direction: 'up' | 'down', amount = 300): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.scroll) {
      return { success: true, action: 'scroll', direction, amount, title: 'Preview scroll' };
    }
    return bridge.scroll(direction, amount);
  }

  async goBack(): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.goBack) {
      return { success: true, action: 'goBack', title: 'Preview go back' };
    }
    return bridge.goBack();
  }

  async goForward(): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.goForward) {
      return { success: true, action: 'goForward', title: 'Preview go forward' };
    }
    return bridge.goForward();
  }

  async refresh(): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.refresh) {
      return { success: true, action: 'refresh', title: 'Refresh preview' };
    }
    return bridge.refresh();
  }

  async openTab(url: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.openTab) {
      return { success: true, action: 'openTab', url, title: 'Preview tab' };
    }
    return bridge.openTab(url);
  }

  async switchTab(tabId: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.switchTab) {
      return { success: true, action: 'switchTab', tabId, title: 'Preview tab switch' };
    }
    return bridge.switchTab(tabId);
  }

  async closeTab(tabId: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.closeTab) {
      return { success: true, action: 'closeTab', tabId, title: 'Preview close tab' };
    }
    return bridge.closeTab(tabId);
  }

  async findOnPage(text: string): Promise<BrowserActionResult> {
    const bridge = this.getBridge();
    if (!bridge?.findOnPage) {
      return { success: true, action: 'findOnPage', title: 'Preview search on page' };
    }
    return bridge.findOnPage(text);
  }
}
