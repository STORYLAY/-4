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

  // State for Search
  const [searchQuery, setSearchQuery] = useState('');

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

  // --- Helper to format date mock ---
  const formatTime = (dateString?: string) => {
    if (!dateString) return '刚刚';
    try {
      // Fix: directly parse the datestring. The previous issue was incorrect day diff logic.
      const date = new Date(dateString);
      const now = new Date();
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      const diffMs = today.getTime() - itemDay.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 5 && diffMinutes >= 0) return '刚刚';
      
      if (diffDays === 0) return `今天 ${timeStr}`;
      if (diffDays === 1) return `昨天 ${timeStr}`;
      if (diffDays > 1 && diffDays < 7) return `${diffDays}天前`;
      return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${timeStr}`;
    } catch (e) {
      return '';
    }
  };

  const renderHistoryItem = (item: HistoryItem, isPinned: boolean) => {
    const isEditing = editingId === item.id;
    const isActive = item.id === currentChatId;

    if (isEditing) {
      return (
        <div key={item.id} className="flex items-center px-4 py-3 bg-[#F9FBFF] rounded-[10px] mb-0.5 border border-[#325ded]">
           <div className="w-full flex items-center">
             <input
               autoFocus
               type="text"
               value={editTitle}
               onChange={(e) => setEditTitle(e.target.value)}
               onBlur={saveEditing}
               onKeyDown={handleKeyDown}
               className="w-full bg-transparent text-[14px] text-gray-800 focus:outline-none"
             />
           </div>
        </div>
      );
    }

    return (
      <div 
        key={item.id} 
        onClick={() => onSelectHistory(item.id)}
        className={`group flex items-start px-3 py-3 rounded-xl cursor-pointer transition-all mb-0.5 relative ${isActive ? 'bg-[#F4F6FF]' : 'hover:bg-[#F9FAFB]'}`}
      >
        <div className="mt-0.5 mr-2.5 text-gray-400 w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={isActive ? 'text-[#325ded]' : 'text-gray-400'}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="flex-1 overflow-hidden">
           <div className={`text-[14px] font-[500] truncate mb-1 ${isActive ? 'text-[#325ded]' : 'text-gray-800'}`}>
             {item.title}
           </div>

           <div className="text-[11px] text-gray-400 flex items-center">
             <svg className="w-3 h-3 mr-1 opacity-70" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
             {formatTime(item.created_at || item.updated_at)}
           </div>
        </div>
        
        {/* Menu Button */}
        <div className="absolute right-2 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
           <button
              onClick={(e) => { 
                e.stopPropagation(); 
                e.preventDefault(); 
                
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
              className={`menu-trigger-button p-1 rounded-md transition-colors ${isActive ? 'bg-[#E5EDFF] hover:bg-[#D0E0FD] text-[#325ded]' : 'bg-white hover:bg-gray-100 text-gray-500 shadow-sm border border-gray-100'}`}
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
               {/* <button onClick={(e) => { e.stopPropagation(); onTogglePin(item.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                 <span className="w-4 h-4"><Icons.Pin /></span> <span>{isPinned ? '取消置顶' : '置顶'}</span>
               </button> */}
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
      <div className="w-[260px] h-full bg-white border-r border-gray-100 flex flex-col text-sm text-gray-700 flex-shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* New Chat Button */}
        <div className="px-4 py-4 flex-shrink-0" id="tour-new-chat">
          <button 
            onClick={onNewChat}
            className="w-full bg-[#2563eb] hover:bg-[#1a41b5] text-white rounded-xl py-2.5 flex items-center justify-center space-x-2 shadow-sm transition-all duration-200 cursor-pointer"
          >
            <span className="w-4 h-4"><Icons.Plus /></span>
            <span className="font-normal text-[15px]">新建对话</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 py-2 flex-shrink-0">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input 
              type="text" 
              placeholder="搜索对话..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F9FAFB] text-gray-700 text-[13px] rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 border border-gray-100"
            />
          </div>
        </div>

        {/* Main Split Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Top Section: History (60%) */}
          <div 
            className="flex-1 overflow-y-auto px-2 custom-scrollbar min-h-0" 
            id="tour-history"
            onScroll={handleScroll}
          >
            {hasHistory && (
              <div className="mb-2">
                <div className="px-2 pt-2 flex items-center text-[12px] text-gray-400">
                    <span>历史对话</span>
                </div>
                
                {/* Pinned Items */}
                {pinnedHistory.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => renderHistoryItem(item, true))}

                {/* Recent Items */}
                {recentHistory.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => renderHistoryItem(item, false))}
                
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