import React from 'react';
import { WELCOME_CARDS, Icons } from '../constants';
import { AppShortcut } from '../types';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  onAppClick?: (app: any) => void;
  apps?: AppShortcut[];
}

export const renderAppIcon = (isList = false, appData: any) => {
  const app = appData.app || appData;
  const containerClass = 'w-12 h-12 flex-shrink-0'
  const iconClass = 'w-6 h-6'
  const paddingClass = 'p-1.5'
  const defaultIcon = '/sys_icons/Component 156.svg'

  const isEmoji = (str: string) => {
    const emojiRegex = /\p{Emoji}/u
    return emojiRegex.test(str)
  }

  // Case 1: iconType is 'image'
  if (app.icon_type === 'image') {
    const src = app.icon_url || app.icon
    if (!src || isEmoji(src)) {
      return (
        <div className={`${containerClass} bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100`}>
          <img
            src={defaultIcon}
            alt={app.name || app.title}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }
    return (
      <img
        src={src}
        alt={app.name || app.title}
        className={`${containerClass} rounded-2xl object-cover border border-gray-100 bg-white`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = defaultIcon
        }}
      />
    )
  }

  // Case 2: iconType is 'icon'
  if (app.icon_type === 'icon') {
    if (app.icon && isEmoji(app.icon)) {
      return (
        <div className={`${containerClass} ${appData.color || app.iconBgColor || 'bg-primary-100'} rounded-2xl flex items-center justify-center border border-gray-100`}>
          <span className="text-2xl leading-none" role="img" aria-label="app icon">
            {app.icon}
          </span>
        </div>
      )
    }

    // If it's a UUID (length > 20), it's invalid for 'icon' type, fallback to default system icon
    if (app.icon && app.icon.length > 20) {
      return (
        <div className={`${containerClass} bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100`}>
          <img
            src={defaultIcon}
            alt={app.name || app.title}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }

    // Otherwise, assume it's a Lucide icon name
    const IconComponent = (Icons as any)[app.icon] || Icons.Bot;
    return (
      <div className={`${containerClass} ${appData.color || app.iconBgColor || app.color || 'bg-primary-600'} rounded-2xl text-white flex items-center justify-center`}>
        <IconComponent className={iconClass} />
      </div>
    )
  }

  // Case 3: iconType is 'sys-icon' or missing/invalid
  if (!app.icon_type || app.icon_type === 'sys-icon') {
    return (
      <div className={`${containerClass} bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100`}>
        <img
          src={app.icon ? `/sys_icons/Component ${app.icon}.svg` : defaultIcon}
          alt={app.name || app.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultIcon
          }}
        />
      </div>
    )
  }

  // Default fallback for any other unknown iconType
  return (
    <div className={`${containerClass} bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100`}>
      <img
        src={defaultIcon}
        alt={app.name || app.title}
        className="w-full h-full object-cover"
      />
    </div>
  )
}

export const WelcomeCards: React.FC<WelcomeScreenProps> = ({ onSuggestionClick, onAppClick, apps = [] }) => {
  const displayCards = apps.length > 0 ? apps : WELCOME_CARDS;
  return (
      <div id="tour-cards" className="w-full max-w-5xl px-8 mt-2 animate-fade-in animation-delay-200">
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
                  <div className="mb-4">
                     {isApp && (card as any).raw ? (
                       renderAppIcon(false, { ...(card as any).raw, color: card.color })
                     ) : (
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.color} overflow-hidden`}>
                         {card.icon}
                       </div>
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
  );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-0 relative">
      <div className="flex flex-col items-center w-full max-w-4xl px-8">
        
        {/* Logo & Greeting */}
        <div className="mb-0 text-center flex flex-col items-center animate-fade-in">
          <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
             <div className="transform scale-[2.0]">
               <Icons.YanfuLogo />
             </div>
          </div>
          <h1 className="text-[24px] font-bold text-gray-900 mb-3 tracking-tight">你好，我是言复智能</h1>
          <p className="text-gray-500 text-base max-w-[34vw]">
            您的企业级智能伙伴，支持企业知识搜索、知识问答、数据分析、图表生成及工作自动化方面的工作支持。
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;