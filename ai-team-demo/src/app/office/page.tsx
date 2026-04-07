"use client";

import { useEffect, useRef } from "react";

import { Game } from "@/game";

export default function OfficePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      import("@/game").then(({ startGame }) => {
        gameRef.current = startGame("game-container");
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      <header className="glass border-b border-dark-100 px-6 py-4">
        <h1 className="text-xl font-bold gradient-text">虚拟办公室 - Phaser 3</h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-4 border border-dark-100 w-full max-w-4xl">
          <div
            id="game-container"
            ref={containerRef}
            className="rounded-xl overflow-hidden w-full"
            style={{ 
              aspectRatio: '4/3',
              maxWidth: '800px',
              maxHeight: '600px',
              margin: '0 auto'
            }}
          />
          <p className="text-gray-400 text-sm mt-4 text-center">
            WASD 或方向键移动 | D 键切换 debug 模式 | 点击角色可以查看任务详情
          </p>
        </div>
      </main>
    </div>
  );
}