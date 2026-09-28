import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Bookmark,
  ChevronDown,
  Compass,
  FileText,
  FolderOpen,
  Globe,
  History,
  Lock,
  MessageSquarePlus,
  Mic,
  MoreHorizontal,
  Palette,
  PanelLeft,
  Paperclip,
  Pin,
  Plus,
  Puzzle,
  RotateCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

type BrowserWebview = HTMLWebViewElement & {
  loadURL: (url: string) => Promise<void>;
  executeJavaScript: (code: string) => Promise<unknown>;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
};

type AgentState =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'navigating'
  | 'reading'
  | 'clicking'
  | 'typing'
  | 'scrolling'
  | 'extracting'
  | 'analyzing'
  | 'comparing'
  | 'waiting_for_confirmation'
  | 'done'
  | 'error';

type Group = { id: string; name: string; isExpanded: boolean; color: string; icon: string };
type Tab = { id: number; label: string; groupId: string | null; isPinned: boolean; url: string };
type ContextMenuState = {
  x: number;
  y: number;
  type: 'tab' | 'group';
  payload: number | string | { tabId: number; groupId: string };
} | null;
type ProductResult = { id: number; name: string; price: string; rating: string; source: string; excerpt: string; url: string };
type ChatMessage = { role: 'assistant' | 'user'; text: string };
type TargetRect = { x: number; y: number; width: number; height: number };

const usageGrid = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
  [1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const defaultGroups: Group[] = [{ id: 'g-1', name: 'Work Project', isExpanded: true, color: '#3B82F6', icon: 'folder' }];
const defaultTabs: Tab[] = [
  { id: 1, label: 'New Tab', groupId: null, isPinned: false, url: 'https://www.google.com' },
  { id: 2, label: 'Analytics Dashboard', groupId: 'g-1', isPinned: false, url: 'insights.groei.ai' },
];

const productResults: ProductResult[] = [
  { id: 1, name: 'FlexiDesk MacBook Stand', price: '₦24,500', rating: '4.8/5', source: 'Jumia', excerpt: 'Aluminum frame, foldable, and strong cable management.', url: 'https://www.jumia.com.ng/flexidesk-stand' },
  { id: 2, name: 'Kensington Laptop Stand', price: '₦27,200', rating: '4.7/5', source: 'Konga', excerpt: 'Minimalist stand with excellent airflow and a slim-profile design.', url: 'https://www.konga.com/kensington-stand' },
  { id: 3, name: 'ErgoLift Desk Stand', price: '₦29,900', rating: '4.9/5', source: 'Amazon', excerpt: 'Adjustable angles with sturdy support for 13–15 inch laptops.', url: 'https://www.amazon.com/ergolift-stand' },
];

const stateStyles: Record<AgentState, string> = {
  idle: 'AI idle',
  thinking: 'Thinking',
  searching: 'Searching the web',
  navigating: 'Navigating',
  reading: 'Reading page',
  clicking: 'Clicking element',
  typing: 'Typing',
  scrolling: 'Scrolling',
  extracting: 'Extracting data',
  analyzing: 'Analyzing results',
  comparing: 'Comparing products',
  waiting_for_confirmation: 'Awaiting confirmation',
  done: 'Completed',
  error: 'Error',
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: "Hello! I'm your Groei AI assistant. I can read your browser screen and give you answers. What's on your mind?" },
  ]);
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [agentLabel, setAgentLabel] = useState('Ready');
  const [task, setTask] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [livePageText, setLivePageText] = useState('');
  const [livePageTitle, setLivePageTitle] = useState('');
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [activeNavId, setActiveNavId] = useState('tab-1');
  const [groups, setGroups] = useState<Group[]>(defaultGroups);
  const [tabs, setTabs] = useState<Tab[]>(defaultTabs);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [colorPickerGroupId, setColorPickerGroupId] = useState<string | null>(null);
  const [iconPickerGroupId, setIconPickerGroupId] = useState<string | null>(null);
  const [flyoutState, setFlyoutState] = useState({ id: null as string | null, top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 240, y: 220 });
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const webviewRef = useRef<BrowserWebview | null>(null);
  const resultRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const runTimerRef = useRef<number | null>(null);
  const agentRunIdRef = useRef(0);

  const activeTab = tabs.find((tab) => tab.id === Number(activeNavId.replace('tab-', ''))) ?? tabs[0];
  const pinnedTabs = tabs.filter((tab) => tab.isPinned);
  const ungroupedTabs = tabs.filter((tab) => !tab.isPinned && !tab.groupId);
  const agentSummary = useMemo(() => stateStyles[agentState], [agentState]);

  const measureTarget = (element: HTMLElement | null): TargetRect | null => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  };

  const moveCursorToTarget = (element: HTMLElement | null, label: string) => {
    const rect = measureTarget(element);
    if (!rect) return;
    setTargetRect(rect);
    setCursorPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    setAgentLabel(label);
  };

  const triggerRipple = (x: number, y: number) => {
    setClickRipple({ x, y });
    window.setTimeout(() => setClickRipple(null), 550);
  };

  const normalizeUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

  const navigateLivePage = async (value: string) => {
    const url = normalizeUrl(value);
    setBrowserUrl(url);
    if (webviewRef.current) {
      await webviewRef.current.loadURL(url);
    }
    return url;
  };

  const readLivePage = async () => {
    if (!webviewRef.current) {
      return { title: '', url: browserUrl, text: '', elements: [] };
    }

    const page = await webviewRef.current.executeJavaScript(`(() => {
      const candidates = [...document.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="link"]')];
      const elements = candidates.slice(0, 120).map((element, index) => {
        const id = 'groei-element-' + index;
        element.setAttribute('data-groei-element-id', id);
        const rect = element.getBoundingClientRect();
        return {
          id,
          type: element.tagName.toLowerCase(),
          role: element.getAttribute('role') || '',
          text: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '').trim().slice(0, 180),
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      });
      return { title: document.title, url: location.href, text: (document.body?.innerText || '').slice(0, 30000), elements };
    })()`);

    return page as { title: string; url: string; text: string; elements: Array<{ id: string; x: number; y: number; width: number; height: number; text: string }> };
  };

  const interactWithLiveElement = async (elementId: string, operation: 'click' | 'type', value = '') => {
    if (!webviewRef.current) return false;
    const result = await webviewRef.current.executeJavaScript(`(() => {
      const element = document.querySelector('[data-groei-element-id="${elementId}"]');
      if (!element) return false;
      ${operation === 'click' ? 'element.click();' : "element.focus(); element.value = " + JSON.stringify(value) + "; element.dispatchEvent(new Event('input', { bubbles: true }));"}
      return true;
    })()`);
    return result === true;
  };

  const stopAgent = () => {
    agentRunIdRef.current += 1;
    if (runTimerRef.current) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    setAgentState('idle');
    setAgentLabel('Ready');
    setTask('');
  };

  const submitPrompt = () => {
    const trimmed = chatMessage.trim();
    if (!trimmed) return;

    setChatMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setChatMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    void runAgent(trimmed);
  };

  const runAgent = async (prompt: string) => {
    const runId = ++agentRunIdRef.current;
    setTask(prompt);
    setAgentState('thinking');
    setAgentLabel('Planning live browser task');
    setIsRightSidebarOpen(true);

    try {
      setAgentState('searching');
      setAgentLabel('Searching the live web');
      setSearchQuery(prompt);
      setResults([]);
      await navigateLivePage(`https://www.google.com/search?q=${encodeURIComponent(prompt)}`);
      if (runId !== agentRunIdRef.current) return;

      setAgentState('reading');
      setAgentLabel('Reading the live page');
      const page = await readLivePage();
      if (runId !== agentRunIdRef.current) return;
      setLivePageTitle(page.title);
      setLivePageText(page.text);

      const firstTarget = page.elements.find((element) => element.width > 0 && element.height > 0);
      if (firstTarget) {
        setTargetRect({ x: firstTarget.x, y: firstTarget.y, width: firstTarget.width, height: firstTarget.height });
        setCursorPosition({ x: firstTarget.x + firstTarget.width / 2, y: firstTarget.y + firstTarget.height / 2 });
        setAgentLabel('Inspecting page controls');
      }

      setAgentState('analyzing');
      setAgentLabel('Analyzing live page content');
      const excerpt = page.text.replace(/\s+/g, ' ').trim().slice(0, 1800);
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: `I searched the live web and read “${page.title || page.url}”.\n\n${excerpt || 'The page did not expose readable text yet. You can take over and inspect it manually.'}`,
      }]);
      setAgentState('done');
      setAgentLabel('Live page analysis complete');
    } catch (error) {
      if (runId !== agentRunIdRef.current) return;
      setAgentState('error');
      setAgentLabel('Live browser action failed');
      setChatMessages((current) => [...current, { role: 'assistant', text: `I could not complete that live browser action. ${error instanceof Error ? error.message : 'The page may be blocking automation.'}` }]);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setIsMoreMenuOpen(false);
      setRenamingGroupId(null);
      setColorPickerGroupId(null);
      setIconPickerGroupId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab && activeTab.url !== browserUrl) {
      setBrowserUrl(activeTab.url);
    }
  }, [activeTab, browserUrl]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string }>).detail;
      const nextUrl = detail?.url;
      if (nextUrl) setBrowserUrl(nextUrl);
    };

    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);
    return () => {
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
    };
  }, [isRightSidebarOpen]);

  const handleAddTab = () => {
    const newId = tabs.length > 0 ? Math.max(...tabs.map((tab) => tab.id)) + 1 : 1;
    const nextTab: Tab = { id: newId, label: `New Tab ${newId}`, groupId: null, isPinned: false, url: `new-tab-${newId}.groei` };
    setTabs((current) => [...current, nextTab]);
    setActiveNavId(`tab-${newId}`);
  };

  const handleCloseTab = (event: React.MouseEvent<HTMLDivElement>, idToClose: number) => {
    event.stopPropagation();
    const nextTabs = tabs.filter((tab) => tab.id !== idToClose);
    setTabs(nextTabs);
    if (activeNavId === `tab-${idToClose}`) {
      setActiveNavId(nextTabs.length > 0 ? `tab-${nextTabs[nextTabs.length - 1].id}` : 'brief');
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, type: 'tab' | 'group', payload: number | string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.pageX, y: event.pageY, type, payload });
  };

  const handleContextMenuAction = (action: string, targetId: number | string | { tabId: number; groupId: string }) => {
    if (action === 'toggle_pin') {
      const numericTarget = typeof targetId === 'number' ? targetId : null;
      if (numericTarget !== null) {
        setTabs((current) => current.map((tab) => (tab.id === numericTarget ? { ...tab, isPinned: !tab.isPinned, groupId: null } : tab)));
      }
      setIsPinnedExpanded(true);
    } else if (action === 'new_group') {
      const numericTarget = typeof targetId === 'number' ? targetId : null;
      if (numericTarget !== null) {
        const newGroupId = `g-${Date.now()}`;
        setGroups((current) => [...current, { id: newGroupId, name: 'New Group', isExpanded: true, color: '#10B981', icon: 'folder' }]);
        setTabs((current) => current.map((tab) => (tab.id === numericTarget ? { ...tab, groupId: newGroupId, isPinned: false } : tab)));
        setRenamingGroupId(newGroupId);
        setEditingGroupName('New Group');
      }
    } else if (action === 'move_to_group') {
      const target = targetId as { tabId: number; groupId: string };
      setTabs((current) => current.map((tab) => (tab.id === target.tabId ? { ...tab, groupId: target.groupId, isPinned: false } : tab)));
    } else if (action === 'remove_from_group') {
      const numericTarget = typeof targetId === 'number' ? targetId : null;
      if (numericTarget !== null) {
        setTabs((current) => current.map((tab) => (tab.id === numericTarget ? { ...tab, groupId: null } : tab)));
      }
    } else if (action === 'rename_group') {
      const groupId = String(targetId);
      const group = groups.find((item) => item.id === groupId);
      if (group) {
        setRenamingGroupId(group.id);
        setEditingGroupName(group.name);
      }
    } else if (action === 'change_color') {
      setColorPickerGroupId(String(targetId));
    } else if (action === 'change_icon') {
      setIconPickerGroupId(String(targetId));
    } else if (action === 'delete_group') {
      const groupId = String(targetId);
      setGroups((current) => current.filter((group) => group.id !== groupId));
      setTabs((current) => current.map((tab) => (tab.groupId === groupId ? { ...tab, groupId: null } : tab)));
    }
    setContextMenu(null);
  };

  const handleGroupRenameSubmit = (
    event: React.FormEvent<HTMLFormElement> | React.FocusEvent<HTMLInputElement>,
    groupId: string,
  ) => {
    event.preventDefault();
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, name: editingGroupName || 'Unnamed Group' } : group)));
    setRenamingGroupId(null);
  };

  const handleColorChange = (groupId: string, color: string) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, color } : group)));
    setColorPickerGroupId(null);
  };

  const handleIconChange = (groupId: string, icon: string) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, icon } : group)));
    setIconPickerGroupId(null);
  };

  const toggleGroupExpanded = (groupId: string) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, isExpanded: !group.isExpanded } : group)));
  };

  const handleMouseEnterItem = (event: React.MouseEvent<HTMLDivElement>, id: string) => {
    if (isSidebarExpanded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setFlyoutState({ id, top: rect.top, left: rect.right });
  };

  const handleMouseLeaveItem = () => {
    setFlyoutState({ id: null, top: 0, left: 0 });
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, tabId: number) => {
    setDraggedTabId(tabId);
    event.dataTransfer.setData('text/plain', String(tabId));
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>, targetKey: string) => {
    event.preventDefault();
    setDragOverTarget(targetKey);
  };

  const handleDropOnGroup = (event: React.DragEvent<HTMLElement>, groupId: string) => {
    event.preventDefault();
    if (draggedTabId !== null) {
      setTabs((current) => current.map((tab) => (tab.id === draggedTabId ? { ...tab, groupId, isPinned: false } : tab)));
    }
    setDraggedTabId(null);
    setDragOverTarget(null);
  };

  const handleDropOnPinned = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (draggedTabId !== null) {
      setTabs((current) => current.map((tab) => (tab.id === draggedTabId ? { ...tab, isPinned: true, groupId: null } : tab)));
      setIsPinnedExpanded(true);
    }
    setDraggedTabId(null);
    setDragOverTarget(null);
  };

  const renderGroupIcon = (iconName: string, color: string, size = 18) => {
    const props = { size, strokeWidth: 2, style: { color: color || 'inherit' } };
    switch (iconName) {
      case 'bookmark': return <Bookmark {...props} />;
      case 'compass': return <Compass {...props} />;
      case 'file': return <FileText {...props} />;
      case 'star': return <Star {...props} />;
      case 'sparkles': return <Sparkles {...props} />;
      default: return <FolderOpen {...props} />;
    }
  };

  const renderTabItem = (tab: Tab, isIndented = false) => (
    <div
      key={`tab-${tab.id}`}
      draggable
      onDragStart={(event) => handleDragStart(event, tab.id)}
      onClick={() => setActiveNavId(`tab-${tab.id}`)}
      onContextMenu={(event) => handleContextMenu(event, 'tab', tab.id)}
      className={`relative group transition-all cursor-pointer flex items-center ${isSidebarExpanded ? `w-full ${isIndented ? 'pl-8 pr-3' : 'px-3'} py-2.5 rounded-xl justify-between` : 'p-2.5 rounded-xl justify-center mx-auto w-10 h-10'} ${activeNavId === `tab-${tab.id}` ? 'bg-[#222222] text-white' : 'text-[#71717A] hover:text-white hover:bg-[#222222]/50'}`}
    >
      <div className="flex items-center min-w-0">
        <Globe size={18} strokeWidth={activeNavId === `tab-${tab.id}` ? 2.5 : 2} className="flex-shrink-0" />
        {isSidebarExpanded && <span className="ml-3 text-[14px] font-medium whitespace-nowrap truncate">{tab.label}</span>}
      </div>
      {isSidebarExpanded && (
        <div onClick={(event) => handleCloseTab(event, tab.id)} className="opacity-0 group-hover:opacity-100 text-[#71717A] hover:text-white hover:bg-[#333333] p-1 rounded-md transition-all flex-shrink-0">
          <X size={14} strokeWidth={2.5} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] text-[#E7E7E7] font-sans overflow-hidden select-none">
      <nav className={`${isSidebarExpanded ? 'w-[220px] px-2.5' : 'w-[62px] items-center'} transition-all duration-300 ease-in-out flex-shrink-0 flex flex-col py-3 border-r border-[#1F1F1F] bg-[#0A0A0A] relative z-10`}>
        <div className={`flex-1 w-full flex flex-col overflow-y-auto overflow-x-hidden ${isSidebarExpanded ? 'space-y-1' : 'space-y-3 items-center'}`} style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          <style>{`nav div::-webkit-scrollbar { display: none; }`}</style>

          {pinnedTabs.length > 0 && (
            <div className={`mb-2 w-full transition-colors ${dragOverTarget === 'pinned' ? 'bg-[#222222] rounded-xl border border-dashed border-[#555]' : ''}`} onDragOver={(event) => handleDragOver(event, 'pinned')} onDrop={handleDropOnPinned} onMouseEnter={(event) => handleMouseEnterItem(event, 'pinned')} onMouseLeave={handleMouseLeaveItem}>
              <button onClick={() => setIsPinnedExpanded(!isPinnedExpanded)} className={`group flex items-center ${isSidebarExpanded ? 'w-full px-3 py-2 rounded-xl justify-between' : 'p-2.5 rounded-xl justify-center mx-auto w-10 h-10'} text-[#71717A] hover:text-white hover:bg-[#222222]/50 transition-colors`}>
                <div className="flex items-center">
                  <Pin size={18} strokeWidth={2} className={!isSidebarExpanded && pinnedTabs.length > 0 ? 'text-white' : ''} />
                  {isSidebarExpanded && <span className="ml-3 text-[13px] font-medium tracking-wide">Pinned</span>}
                </div>
                {isSidebarExpanded && pinnedTabs.length > 0 && <ChevronDown size={14} className={`transform transition-transform ${isPinnedExpanded ? '' : '-rotate-90'}`} />}
              </button>

              {isPinnedExpanded && isSidebarExpanded && pinnedTabs.length > 0 && (
                <div className="mt-1 grid grid-flow-col grid-rows-3 gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {pinnedTabs.map((tab) => renderTabItem(tab, false))}
                </div>
              )}

              {flyoutState.id === 'pinned' && !isSidebarExpanded && pinnedTabs.length > 0 && (
                <div style={{ position: 'fixed', top: flyoutState.top, left: flyoutState.left }} className="z-[100] pl-2">
                  <div className="w-48 bg-[#161616] border border-[#222222] rounded-xl shadow-xl py-1.5 flex flex-col">
                    <div className="px-3 py-1 text-[11px] font-semibold text-[#71717A] mb-1 uppercase tracking-wider">Pinned Tabs</div>
                    {pinnedTabs.map((tab) => (
                      <button key={`flyout-tab-${tab.id}`} onClick={() => { setActiveNavId(`tab-${tab.id}`); setFlyoutState({ id: null, top: 0, left: 0 }); }} className="w-full text-left px-3 py-2 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center">
                        <Globe size={14} className="mr-2 flex-shrink-0 text-[#71717A]" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="w-full h-px bg-[#1F1F1F] my-3"></div>
            </div>
          )}

          {groups.map((group) => {
            const groupTabs = tabs.filter((tab) => tab.groupId === group.id);
            const isTargeted = dragOverTarget === group.id;

            return (
              <div key={group.id} className={`mb-2 w-full rounded-xl transition-colors ${isTargeted ? 'bg-[#222222] border border-dashed border-[#555]' : ''}`} onDragOver={(event) => handleDragOver(event, group.id)} onDrop={(event) => handleDropOnGroup(event, group.id)} onMouseEnter={(event) => handleMouseEnterItem(event, group.id)} onMouseLeave={handleMouseLeaveItem}>
                <div className={`group flex items-center ${isSidebarExpanded ? 'w-full px-3 py-2 rounded-xl justify-between' : 'p-2.5 rounded-xl justify-center mx-auto w-10 h-10'} text-[#71717A] hover:text-white hover:bg-[#222222]/50 transition-colors cursor-pointer`} onClick={() => toggleGroupExpanded(group.id)} onContextMenu={(event) => handleContextMenu(event, 'group', group.id)}>
                  <div className="flex items-center min-w-0 flex-1">
                    {renderGroupIcon(group.icon, group.color, 18)}
                    {isSidebarExpanded && (
                      renamingGroupId === group.id ? (
                        <form onSubmit={(event) => handleGroupRenameSubmit(event, group.id)} className="ml-3 flex-1 mr-2" onClick={(event) => event.stopPropagation()}>
                          <input autoFocus type="text" value={editingGroupName} onChange={(event) => setEditingGroupName(event.target.value)} onBlur={(event) => handleGroupRenameSubmit(event, group.id)} className="w-full bg-[#161616] border border-[#333] rounded px-1.5 py-0.5 text-[13px] text-white focus:outline-none focus:border-[#555]" />
                        </form>
                      ) : (
                        <span className="ml-3 text-[13px] font-medium tracking-wide truncate">{group.name}</span>
                      )
                    )}
                  </div>
                  {isSidebarExpanded && renamingGroupId !== group.id && <ChevronDown size={14} className={`flex-shrink-0 transform transition-transform ${group.isExpanded ? '' : '-rotate-90'}`} />}
                </div>

                {group.isExpanded && isSidebarExpanded && groupTabs.length > 0 && (
                  <div className="mt-1 space-y-1">{groupTabs.map((tab) => renderTabItem(tab, true))}</div>
                )}

                {flyoutState.id === group.id && !isSidebarExpanded && groupTabs.length > 0 && (
                  <div style={{ position: 'fixed', top: flyoutState.top, left: flyoutState.left }} className="z-[100] pl-2">
                    <div className="w-48 bg-[#161616] border border-[#222222] rounded-xl shadow-xl py-1.5 flex flex-col">
                      <div className="px-3 py-1 text-[11px] font-semibold text-[#71717A] mb-1 truncate uppercase tracking-wider">{group.name}</div>
                      {groupTabs.map((tab) => (
                        <button key={`flyout-tab-${tab.id}`} onClick={() => { setActiveNavId(`tab-${tab.id}`); setFlyoutState({ id: null, top: 0, left: 0 }); }} className="w-full text-left px-3 py-2 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center">
                          <Globe size={14} className="mr-2 flex-shrink-0 text-[#71717A]" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className={`${isSidebarExpanded ? 'space-y-1' : 'space-y-3'}`}>{ungroupedTabs.map((tab) => renderTabItem(tab))}</div>

          <button onClick={handleAddTab} className={`relative group transition-colors flex items-center ${isSidebarExpanded ? 'w-full px-3 py-2.5 rounded-xl justify-start mt-2' : 'p-2.5 rounded-xl justify-center mx-auto w-10 h-10 mt-3'} text-[#71717A] hover:text-white hover:bg-[#222222]/50`}>
            <Plus size={18} strokeWidth={2} className="flex-shrink-0" />
            {isSidebarExpanded && <span className="ml-3 text-[14px] font-medium whitespace-nowrap">Add Tab</span>}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative bg-[#0A0A0A] transition-all duration-300">
        <header className="flex items-center w-full px-3 py-2 border-b border-[#1F1F1F] bg-[#0A0A0A] z-10 space-x-3 flex-shrink-0">
          <div className="flex items-center space-x-1.5">
            <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="text-[#71717A] hover:text-white p-1.5 rounded-md hover:bg-[#1B1B1B] transition-colors" title="Toggle Sidebar">
              <PanelLeft size={17} strokeWidth={2} />
            </button>
            <div className="w-px h-4 bg-[#1F1F1F] mx-0.5"></div>
            <button onClick={() => webviewRef.current?.goBack()} className="text-[#71717A] hover:text-white p-1.5 rounded-md hover:bg-[#1B1B1B] transition-colors"><ArrowLeft size={17} strokeWidth={2} /></button>
            <button onClick={() => webviewRef.current?.goForward()} className="text-[#71717A] hover:text-white p-1.5 rounded-md hover:bg-[#1B1B1B] transition-colors"><ArrowRight size={17} strokeWidth={2} /></button>
            <button onClick={() => webviewRef.current?.reload()} className="text-[#71717A] hover:text-white p-1.5 rounded-md hover:bg-[#1B1B1B] transition-colors"><RotateCw size={15} strokeWidth={2.5} /></button>
          </div>

          <div className="flex-1 max-w-[640px] mx-auto relative group flex items-center">
            <div className="absolute left-3 flex items-center pointer-events-none text-[#71717A]">
              <Shield size={13} strokeWidth={2} />
            </div>
            <input ref={searchInputRef} type="text" value={browserUrl} onChange={(event) => setBrowserUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void navigateLivePage(browserUrl); }} className="w-full bg-[#121212] border border-[#1F1F1F] group-hover:border-[#2A2A2A] focus:border-[#333333] rounded-lg py-1.5 pl-8 pr-9 text-[12.5px] text-[#E7E7E7] focus:outline-none transition-colors" />
            <button className="absolute right-3 text-[#71717A] hover:text-white transition-colors"><Star size={13} strokeWidth={2} /></button>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button className="text-[#71717A] hover:text-white p-1.5 rounded-md hover:bg-[#1B1B1B] transition-colors"><Puzzle size={15} strokeWidth={2} /></button>
            <button onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} className={`flex items-center space-x-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full transition-colors ${isRightSidebarOpen ? 'bg-[#1B1B1B] text-white' : 'text-[#71717A] hover:text-white hover:bg-[#1B1B1B]'}`}>
              <Sparkles size={12} strokeWidth={2.5} />
              <span>Ask AI</span>
            </button>
            <div className="flex items-center space-x-1.5 text-[#71717A] text-[12px] font-medium px-2.5 py-1.5 rounded-full bg-[#111111] border border-[#1F1F1F]">
              <Lock size={11} strokeWidth={2.5} />
              <span>Private</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[820px] mx-auto px-4 py-5 relative overflow-hidden">
          <div className="w-full max-w-[760px] relative z-10 mb-4">
            <div className="flex items-center justify-between mb-3 text-[#A1A1AA] text-[12px]">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#161616] border border-[#222] text-[#e7e7e7] font-medium"><Search size={12} className="mr-1" />Search</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#161616] border border-[#222]">AI mode</span>
              </div>
              <span className="text-[#71717A]">{agentSummary}</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#71717A]">
                <Paperclip size={18} strokeWidth={2} />
              </div>

              <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="What do you want to know?" className="w-full bg-[#121212] border border-[#1F1F1F] hover:border-[#2A2A2A] focus:border-[#363636] rounded-full py-3.5 pl-11 pr-44 text-[#E7E7E7] placeholder-[#71717A] focus:outline-none transition-colors text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]" />

              <div className="absolute inset-y-0 right-2 flex items-center space-x-1.5">
                <button onClick={() => { const prompt = searchQuery || 'Find me three MacBook stands under ₦30,000.'; void runAgent(prompt); }} className="flex items-center space-x-1.5 text-[#A1A1AA] hover:text-white px-3 py-1.5 rounded-full hover:bg-[#1B1B1B] transition-colors">
                  <Send size={15} strokeWidth={2.5} className="transform -rotate-45 -mt-1" />
                  <span className="text-[14px] font-medium">Auto</span>
                  <ChevronDown size={14} strokeWidth={2.5} className="opacity-70" />
                </button>
                <button className="w-9 h-9 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center hover:bg-white transition-colors"><AudioLines size={16} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[760px] rounded-[22px] border border-[#1F1F1F] bg-[#111111] shadow-[0_18px_60px_rgba(0,0,0,0.52)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] px-4 py-2.5 text-[12px] text-[#A1A1AA]">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                <span className="truncate">{browserUrl}</span>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button onClick={stopAgent} className="hover:text-white">Stop AI</button>
                <button onClick={() => void readLivePage()} className="hover:text-white">Read page</button>
              </div>
            </div>
            <webview ref={webviewRef} src={browserUrl} partition="persist:groei" allowpopups={true} className="block h-[420px] w-full bg-[#FAFAFA]" />
            <div className="border-t border-[#1F1F1F] bg-[#111111] px-4 py-3 text-[12px] text-[#A1A1AA]">
              <div className="flex items-center justify-between gap-4">
                <span className="truncate text-[#E7E7E7]">{livePageTitle || 'Live Chromium page'}</span>
                <span className="text-[#71717A]">{livePageText ? `${livePageText.length.toLocaleString()} chars read` : 'Ready for live browsing'}</span>
              </div>
              {livePageText && <p className="mt-2 line-clamp-2 text-[#D4D4D8]">{livePageText.replace(/\s+/g, ' ').trim()}</p>}
            </div>
          </div>

          <div className="w-full max-w-[760px] mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-[#71717A] z-10">
            <span>Live browser</span>
            <span>{agentSummary}</span>
            <span>Context aware</span>
          </div>

          {targetRect && (
            <div className="pointer-events-none absolute inset-0 z-20">
              <motion.div initial={false} animate={{ left: targetRect.x, top: targetRect.y, width: targetRect.width, height: targetRect.height, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="absolute rounded-[10px] border border-[#8B5CF6]/60 bg-[#8B5CF6]/10 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]" />
            </div>
          )}

          <AnimatePresence>
            {agentLabel && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className="pointer-events-none absolute z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="rounded-full border border-[#2a2a2a] bg-[#111111]/90 px-4 py-2 text-[12px] text-[#E7E7E7] backdrop-blur-md shadow-xl flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                  {agentLabel}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {clickRipple && (
              <motion.div key={`${clickRipple.x}-${clickRipple.y}`} initial={{ opacity: 0.7, scale: 0 }} animate={{ opacity: 0, scale: 2.5 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="pointer-events-none absolute z-30 rounded-full border border-[#A78BFA] bg-[#8B5CF6]/20" style={{ left: clickRipple.x, top: clickRipple.y, width: 22, height: 22, transform: 'translate(-50%, -50%)' }} />
            )}
          </AnimatePresence>

          <motion.div className="pointer-events-none absolute z-40" animate={{ x: cursorPosition.x, y: cursorPosition.y }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} style={{ left: 0, top: 0 }}>
            <div className="relative flex items-center justify-center">
              <div className="absolute h-10 w-10 rounded-full border border-[#A78BFA]/20 bg-[#8B5CF6]/10 blur-sm" />
              <div className="relative h-4 w-4 rounded-full bg-[#F5F5F5] shadow-[0_0_18px_rgba(255,255,255,0.4)]" />
            </div>
          </motion.div>
        </div>
      </main>

      <aside className={`${isRightSidebarOpen ? 'w-[290px]' : 'w-0'} transition-all duration-300 ease-in-out flex-shrink-0 border-l border-[#1F1F1F] bg-[#0A0A0A] relative z-20 flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-[#1F1F1F]">
          <button className="text-[#71717A] hover:text-white p-1 rounded-md transition-colors" title="New AI Chat"><MessageSquarePlus size={18} strokeWidth={2} /></button>
          <div className="flex items-center space-x-1 relative">
            <button onClick={(event) => { event.stopPropagation(); setIsMoreMenuOpen(!isMoreMenuOpen); }} className="p-1.5 rounded-md text-[#71717A] hover:text-white hover:bg-[#222222]/50 transition-colors"><MoreHorizontal size={18} /></button>
            {isMoreMenuOpen && (
              <div className="absolute top-8 right-0 w-44 bg-[#161616] border border-[#222222] rounded-xl shadow-xl py-1.5 z-30">
                <button className="w-full text-left px-4 py-2 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><Sparkles size={14} className="mr-2" /> Memory</button>
                <button className="w-full text-left px-4 py-2 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><History size={14} className="mr-2" /> Chat History</button>
              </div>
            )}
          </div>
          <button onClick={() => setIsRightSidebarOpen(false)} className="text-[#71717A] hover:text-white p-1 rounded-md transition-colors ml-1" title="Close AI Sidebar"><X size={16} strokeWidth={2} /></button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          <style>{`aside div::-webkit-scrollbar { display: none; }`}</style>
          <div className="flex flex-col space-y-4">
            {chatMessages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${message.role === 'assistant' ? 'bg-[#161616] text-[#E7E7E7]' : 'bg-[#E7E7E7] text-[#161616]'}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#1F1F1F]">
          <div className="relative flex flex-col bg-[#161616] border border-[#222222] focus-within:border-[#444444] rounded-xl transition-colors">
            <textarea ref={textareaRef} value={chatMessage} onChange={(event) => { setChatMessage(event.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`; } }} placeholder="Ask anything..." rows={1} className="w-full bg-transparent resize-none py-3 px-3 text-[#E7E7E7] text-[13px] placeholder-[#71717A] focus:outline-none min-h-[44px] max-h-[150px]" style={{ overflowY: chatMessage.length > 0 ? 'auto' : 'hidden' }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitPrompt(); } }} />
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <button className="text-[#71717A] hover:text-white p-1.5 rounded-full hover:bg-[#222222] transition-colors"><Paperclip size={16} strokeWidth={2} /></button>
              <div className="flex items-center space-x-1">
                <button className="text-[#71717A] hover:text-white p-1.5 rounded-full hover:bg-[#222222] transition-colors"><Mic size={16} strokeWidth={2} /></button>
                <button onClick={submitPrompt} className={`p-1.5 rounded-full transition-colors ${chatMessage.trim().length > 0 ? 'bg-[#E7E7E7] text-[#161616] hover:bg-white' : 'bg-[#222222] text-[#71717A]'}`}>
                  <Send size={14} strokeWidth={2.5} className="transform -rotate-45 -mt-0.5 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {contextMenu && (
        <div style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: contextMenu.x }} className="fixed z-50 w-52 bg-[#161616] border border-[#222222] rounded-xl shadow-xl py-1.5 overflow-hidden" onClick={(event) => event.stopPropagation()}>
          {contextMenu.type === 'tab' && (
            <>
              <button onClick={() => handleContextMenuAction('toggle_pin', contextMenu.payload as number)} className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><Pin size={14} className="mr-2.5" />{tabs.find((tab) => tab.id === contextMenu.payload)?.isPinned ? 'Unpin Tab' : 'Pin Tab'}</button>
              <div className="h-px bg-[#1F1F1F] my-1 mx-2"></div>
              <button onClick={() => handleContextMenuAction('new_group', contextMenu.payload as number)} className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><Plus size={14} className="mr-2.5" /> Add to New Group</button>
              {groups.length > 0 && <div className="px-4 py-1.5 text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mt-1">Move to Group</div>}
              {groups.map((group) => (
                <button key={group.id} onClick={() => handleContextMenuAction('move_to_group', { tabId: contextMenu.payload as number, groupId: group.id })} className="w-full text-left px-4 py-2 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center pl-8"><FolderOpen size={14} style={{ color: group.color || 'inherit' }} className="mr-2.5" /> {group.name}</button>
              ))}
              {tabs.find((tab) => tab.id === contextMenu.payload)?.groupId && (
                <>
                  <div className="h-px bg-[#1F1F1F] my-1 mx-2"></div>
                  <button onClick={() => handleContextMenuAction('remove_from_group', contextMenu.payload as number)} className="w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-[#222222] transition-colors flex items-center"><X size={14} className="mr-2.5" /> Remove from Group</button>
                </>
              )}
            </>
          )}

          {contextMenu.type === 'group' && (
            <>
              <button onClick={() => handleContextMenuAction('rename_group', contextMenu.payload as string)} className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><MoreHorizontal size={14} className="mr-2.5" /> Rename Group</button>
              <button onClick={() => handleContextMenuAction('change_color', contextMenu.payload as string)} className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><Palette size={14} className="mr-2.5" /> Group Color</button>
              <button onClick={() => handleContextMenuAction('change_icon', contextMenu.payload as string)} className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4D4D8] hover:bg-[#222222] hover:text-white transition-colors flex items-center"><Bookmark size={14} className="mr-2.5" /> Group Icon</button>
              <div className="h-px bg-[#1F1F1F] my-1 mx-2"></div>
              <button onClick={() => handleContextMenuAction('delete_group', contextMenu.payload as string)} className="w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-[#222222] transition-colors flex items-center"><X size={14} className="mr-2.5" /> Delete Group</button>
            </>
          )}
        </div>
      )}

      {colorPickerGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setColorPickerGroupId(null)}>
          <div className="bg-[#161616] border border-[#222] p-4 rounded-xl shadow-2xl flex flex-col space-y-3" onClick={(event) => event.stopPropagation()}>
            <span className="text-[13px] font-medium text-[#D4D4D8]">Select Group Color</span>
            <div className="flex space-x-2">
              {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'].map((color) => (
                <button key={color} onClick={() => handleColorChange(colorPickerGroupId, color)} className="w-7 h-7 rounded-full transition-transform hover:scale-110 border border-white/20" style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {iconPickerGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIconPickerGroupId(null)}>
          <div className="bg-[#161616] border border-[#222] p-4 rounded-xl shadow-2xl flex flex-col space-y-3" onClick={(event) => event.stopPropagation()}>
            <span className="text-[13px] font-medium text-[#D4D4D8]">Select Group Icon</span>
            <div className="flex space-x-3">
              {[
                { name: 'folder', icon: <FolderOpen size={20} /> },
                { name: 'bookmark', icon: <Bookmark size={20} /> },
                { name: 'compass', icon: <Compass size={20} /> },
                { name: 'file', icon: <FileText size={20} /> },
                { name: 'star', icon: <Star size={20} /> },
                { name: 'sparkles', icon: <Sparkles size={20} /> },
              ].map((item) => (
                <button key={item.name} onClick={() => handleIconChange(iconPickerGroupId, item.name)} className="p-2.5 rounded-lg bg-[#222] text-[#D4D4D8] hover:text-white hover:bg-[#333] transition-colors">{item.icon}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
