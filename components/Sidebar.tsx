import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../constants';
import { HistoryItem, AppShortcut } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  onCollapse: () => void;
  onClearHistory: () => void;
  onSelectHistory: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onRenameHistory: (id: string, newTitle: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  pinnedHistory: HistoryItem[];
  recentHistory: HistoryItem[];
  recentApps?: AppShortcut[];
  currentChatId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onNewChat, 
  onCollapse, 
  onClearHistory,
  onSelectHistory,
  onTogglePin,
  onDeleteHistory,
  onRenameHistory,
  onLoadMore,
  isLoadingMore = false,
  pinnedHistory,
  recentHistory,
  recentApps = [],
  currentChatId
}) => {
  const hasHistory = pinnedHistory.length > 0 || recentHistory.length > 0;
  
  // State for Rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // State for Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);

  // State for Delete Confirmation Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Close menu when clicking outside or iframe loses focus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking the trigger button or the menu itself
      if (target.closest('.menu-trigger-button') || target.closest('.sidebar-dropdown-menu')) {
        return;
      }
      
      setOpenMenuId(null);
    };
    const handleBlur = () => setOpenMenuId(null);
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // --- Rename Logic ---
  const startEditing = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveEditing = () => {
    if (editingId && editTitle.trim()) {
      onRenameHistory(editingId, editTitle.trim());
    }
    cancelEditing();
  };

  // --- Delete Logic ---
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      onDeleteHistory(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteTargetId(null);
  };

  // --- Event Handlers ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (openMenuId) setOpenMenuId(null);
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (onLoadMore) {
        onLoadMore();
      }
    }
  };

  const renderHistoryItem = (item: HistoryItem, isPinned: boolean) => {
    const isEditing = editingId === item.id;
    const isActive = item.id === currentChatId;

    if (isEditing) {
      return (
        <div key={item.id} className="flex items-center px-3 py-2 bg-primary-50 rounded-lg mb-0.5 border border-primary-200">
           <div className="w-full flex items-center">
             <input
               autoFocus
               type="text"
               value={editTitle}
               onChange={(e) => setEditTitle(e.target.value)}
               onBlur={saveEditing}
               onKeyDown={handleKeyDown}
               className="w-full bg-transparent text-sm text-gray-800 focus:outline-none"
             />
           </div>
        </div>
      );
    }

    return (
      <div 
        key={item.id} 
        onClick={() => onSelectHistory(item.id)}
        className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all text-gray-600 mb-0.5 relative ${isActive ? 'bg-[#e4edfd] text-[#4a72fe] font-medium' : 'hover:bg-gray-100'}`}
      >
        {/* Active Indicator Bar */}
        {isActive && <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-[#4a72fe] rounded-r-full"></div>}

        <span className={`mr-3 transform scale-90 ${isPinned ? 'text-[#4a72fe]' : (isActive ? 'text-[#4a72fe]' : 'text-gray-400 group-hover:text-gray-500')}`}>
          {isPinned ? <Icons.Pin /> : <Icons.Clock />}
        </span>
        <span className="truncate flex-1 text-sm pr-10">{item.title}</span>
        
        {/* Menu Button */}
        <div className="absolute right-2 z-10">
           <button
              onClick={(e) => { 
                e.stopPropagation(); 
                e.preventDefault(); // Prevent focus shift that might trigger blur
                
                if (openMenuId === item.id) {
                  setOpenMenuId(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const menuHeight = 120; // Approximate height of the menu
                  const menuWidth = 128; // w-32
                  const spaceBelow = window.innerHeight - rect.bottom;
                  
                  let top = rect.bottom + 4;
                  if (spaceBelow < menuHeight && rect.top > menuHeight) {
                    // Position above if not enough space below and enough space above
                    top = rect.top - menuHeight - 4;
                  }
                  
                  let left = rect.right - menuWidth;
                  // Ensure menu stays within viewport horizontally
                  if (left < 4) left = 4;
                  if (left + menuWidth > window.innerWidth - 4) left = window.innerWidth - menuWidth - 4;
                  
                  setMenuPosition({ top, left });
                  setOpenMenuId(item.id);
                }
              }}
              className={`menu-trigger-button p-1 rounded transition-colors ${isActive ? 'text-[#4a72fe] hover:bg-[#d0e0fd]' : 'hover:bg-gray-200 text-gray-400'}`}
           >
              <Icons.MoreHorizontal />
           </button>
           
           {/* Dropdown Menu Portal */}
           {openMenuId === item.id && menuPosition && createPortal(
             <div 
               className="sidebar-dropdown-menu fixed w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-[9999] py-1" 
               style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
               onMouseDown={(e) => e.stopPropagation()}
             >
               <button onClick={(e) => { e.stopPropagation(); startEditing(e, item); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                 <span className="w-4 h-4"><Icons.Edit /></span> <span>重命名</span>
               </button>
               <button onClick={(e) => { e.stopPropagation(); onTogglePin(item.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                 <span className="w-4 h-4"><Icons.Pin /></span> <span>{isPinned ? '取消置顶' : '置顶'}</span>
               </button>
               <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(e, item.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">
                 <span className="w-4 h-4"><Icons.Trash /></span> <span>删除</span>
               </button>
             </div>,
             document.getElementById('root') || document.body
           )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="w-[260px] h-full bg-[#f9fafb] border-r border-gray-200 flex flex-col text-sm text-gray-700 flex-shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="transform scale-110">
                  <Icons.YanfuLogo />
              </div>
            </div>
            <span className="font-bold text-gray-800 text-base tracking-tight font-sans">言复智能</span>
          </div>
          <button 
            onClick={onCollapse}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            title="收起侧边栏"
          >
            <Icons.Layout />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 pb-2 flex-shrink-0 space-y-2" id="tour-new-chat">
          <button 
            onClick={onNewChat}
            className="w-full bg-white hover:bg-gray-50 text-[#325ded] border border-[#325ded] rounded-xl py-3 px-4 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all duration-300 group transform hover:-translate-y-0.5"
          >
            <Icons.Plus />
            <span className="font-semibold tracking-wide">新建对话</span>
          </button>
        </div>

        {/* Main Split Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Top Section: History (60%) */}
          <div 
            className="flex-1 overflow-y-auto px-3 custom-scrollbar min-h-0" 
            id="tour-history"
            onScroll={handleScroll}
          >
            {hasHistory && (
              <div className="mt-4 mb-2">
                <div className="px-3 py-2 flex items-center text-xs text-gray-400 font-semibold uppercase tracking-wider justify-between group">
                    <span>历史记录</span>
                </div>
                
                {/* Pinned Items */}
                {pinnedHistory.map(item => renderHistoryItem(item, true))}

                {/* Recent Items */}
                {recentHistory.map(item => renderHistoryItem(item, false))}
                
                {/* Loading Indicator */}
                {isLoadingMore && (
                  <div className="flex justify-center items-center py-4">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[320px] overflow-hidden transform transition-all scale-100 ring-1 ring-black/5">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 ring-4 ring-red-50">
                <Icons.Trash />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">删除对话</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                确定要删除这条对话记录吗？<br/>此操作无法撤销。
              </p>
            </div>
            <div className="flex border-t border-gray-100 divide-x divide-gray-100 bg-gray-50">
              <button 
                onClick={cancelDelete}
                className="flex-1 py-3 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;