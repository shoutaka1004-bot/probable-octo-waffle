"use client";

import { ThemeConfig } from "@/lib/theme";

export type AppScreen = "compass" | "collection";

interface BottomNavProps {
  activeTab: AppScreen;
  onTabChange: (tab: AppScreen) => void;
  theme: ThemeConfig;
}

export function BottomNav({ activeTab, onTabChange, theme }: BottomNavProps) {
  const tabs: { id: AppScreen; icon: string; label: string }[] = [
    { id: "compass",    icon: "🧭", label: "お散歩" },
    { id: "collection", icon: "📖", label: "図鑑"   },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        backgroundColor: theme.bgColor,
        borderTop: `1px solid ${theme.cardBorder}`,
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-opacity"
            style={{ color: active ? theme.accentColor : theme.textDim }}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span
              className="text-[10px] tracking-wider"
              style={{ fontWeight: active ? 700 : 400 }}
            >
              {tab.label}
            </span>
            {active && (
              <span
                className="absolute bottom-0 w-10 h-[2px] rounded-t-full"
                style={{ backgroundColor: theme.accentColor }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
