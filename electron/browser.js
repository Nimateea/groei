export class BrowserRuntime {
  constructor(window) {
    this.window = window;
    this.tabs = [{ id: 'tab-1', url: 'https://groei.ai/business', title: 'Groei Business' }];
    this.activeTabId = 'tab-1';
  }

  async navigate(url) {
    const nextUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const webContents = this.window.webContents;
    await webContents.loadURL(nextUrl);
    return {
      success: true,
      action: 'navigate',
      url: nextUrl,
      activeTabId: this.activeTabId,
    };
  }

  async search(query) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return this.navigate(searchUrl);
  }

  async readPage() {
    const result = await this.window.webContents.executeJavaScript(
      `(() => {
        const text = document.body ? document.body.innerText || '' : '';
        return {
          title: document.title || '',
          url: location.href,
          text: text.slice(0, 25000),
          interactive: [...document.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="link"]')].slice(0, 50).map((el, index) => ({
            id: 'element_' + index,
            type: el.tagName.toLowerCase(),
            role: el.getAttribute('role') || '',
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 200),
            x: el.getBoundingClientRect?.().left || 0,
            y: el.getBoundingClientRect?.().top || 0,
            width: el.getBoundingClientRect?.().width || 0,
            height: el.getBoundingClientRect?.().height || 0,
          })),
        };
      })()`,
    );

    return {
      success: true,
      action: 'readPage',
      url: result.url,
      title: result.title,
      content: result.text,
      elements: result.interactive,
    };
  }

  async click(elementId) {
    return {
      success: true,
      action: 'click',
      elementId,
      url: this.window.webContents.getURL(),
    };
  }

  async type(elementId, text) {
    return {
      success: true,
      action: 'type',
      elementId,
      value: text,
      url: this.window.webContents.getURL(),
    };
  }

  async scroll(direction, amount = 300) {
    const delta = direction === 'down' ? amount : -amount;
    await this.window.webContents.executeJavaScript(`window.scrollBy({ top: ${delta}, behavior: 'auto' });`);
    return {
      success: true,
      action: 'scroll',
      direction,
      amount,
      url: this.window.webContents.getURL(),
    };
  }

  async goBack() {
    this.window.webContents.goBack();
    return { success: true, action: 'goBack', url: this.window.webContents.getURL() };
  }

  async goForward() {
    this.window.webContents.goForward();
    return { success: true, action: 'goForward', url: this.window.webContents.getURL() };
  }

  async refresh() {
    this.window.webContents.reload();
    return { success: true, action: 'refresh', url: this.window.webContents.getURL() };
  }

  async openTab(url) {
    const nextId = `tab-${this.tabs.length + 1}`;
    const nextUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    this.tabs.push({ id: nextId, url: nextUrl, title: 'New tab' });
    this.activeTabId = nextId;
    return {
      success: true,
      action: 'openTab',
      tabId: nextId,
      url: nextUrl,
    };
  }

  async switchTab(tabId) {
    this.activeTabId = tabId;
    return { success: true, action: 'switchTab', tabId };
  }

  async closeTab(tabId) {
    this.tabs = this.tabs.filter((tab) => tab.id !== tabId);
    if (this.tabs.length === 0) {
      this.tabs = [{ id: 'tab-1', url: 'https://groei.ai/business', title: 'Groei Business' }];
      this.activeTabId = 'tab-1';
    }
    return { success: true, action: 'closeTab', tabId };
  }

  async findOnPage(text) {
    const result = await this.window.webContents.executeJavaScript(`
      (() => {
        const match = document.body ? document.body.innerText.toLowerCase().includes(${JSON.stringify(String(text).toLowerCase())}) : false;
        return { found: match, text: ${JSON.stringify(String(text))} };
      })()
    `);
    return { success: true, action: 'findOnPage', ...result };
  }
}
