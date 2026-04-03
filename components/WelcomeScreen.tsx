import React from 'react';
import { WELCOME_CARDS, Icons } from '../constants';
import { AppShortcut } from '../types';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  onAppClick?: (app: any) => void;
  apps?: AppShortcut[];
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick, onAppClick, apps = [] }) => {
  // Use apps if provided and not empty, otherwise fallback to WELCOME_CARDS
  const displayCards = apps.length > 0 ? apps : WELCOME_CARDS;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
      
      {/* Content Container - Pushed up slightly to make room for bottom elements */}
      <div className="flex flex-col items-center w-full max-w-4xl px-8 -mt-20">
        
        {/* Logo & Greeting */}
        <div className="mb-10 text-center flex flex-col items-center animate-fade-in">
          <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
             <div className="transform scale-[2.0]">
               <Icons.YanfuLogo />
             </div>
          </div>
          <h1 className="text-[24px] font-bold text-gray-900 mb-3 tracking-tight">你好，我是言复智能</h1>
          <p className="text-gray-500 text-base whitespace-nowrap truncate max-w-[90vw]">
            您的企业级智能伙伴，支持企业知识搜索、知识问答、数据分析、图表生成及工作自动化方面的工作支持。
          </p>
        </div>

        {/* Placeholder for Input Box (which is rendered in App.tsx) */}
        {/* We keep this empty space to ensure layout consistency */}
        <div className="w-full h-56 mb-16"></div>

      </div>

      {/* Bottom Cards Section - Fixed at bottom of content area */}
      <div id="tour-cards" className="w-full max-w-5xl px-8 mt-12 animate-fade-in animation-delay-200">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayCards.map(card => {
              const isApp = 'iconUrl' in card || 'raw' in card;
              const title = 'name' in card ? (card as any).name : (card as any).title;
              const description = card.description;
              const url = (card as any).url;

              return (
                <div 
                  key={card.id} 
                  className="bg-white border border-gray-200 p-5 rounded-xl hover:shadow-lg hover:border-primary-300 cursor-pointer transition-all duration-200 group flex flex-col items-start justify-start text-left h-full min-h-[130px]"
                  onClick={() => {
                    if (isApp && onAppClick) {
                      onAppClick(card);
                    } else if (url) {
                      window.location.href = url;
                    } else {
                      onSuggestionClick(title);
                    }
                  }}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${card.color} overflow-hidden`}>
                     {isApp && (card as any).iconUrl ? (
                       <img src={(card as any).iconUrl} alt={title} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                     ) : (
                       card.icon
                     )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm mb-1.5 group-hover:text-primary-600 transition-colors line-clamp-1">{title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{description}</p>
                  </div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;