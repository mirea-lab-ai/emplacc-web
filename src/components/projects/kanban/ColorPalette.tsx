'use client';

import { useState, useRef, useEffect } from 'react';


type ColorPaletteProps = {
    selectedColor: string;
    onColorSelect: (color: string) => void;
};

// Функция для конвертации HSL в HEX
function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Функция для конвертации HEX в HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
    // Убираем # если есть
    hex = hex.replace('#', '');
    
    // Если короткий формат, расширяем
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

export default function ColorPalette({ selectedColor, onColorSelect }: ColorPaletteProps) {
    const [hsl, setHsl] = useState(() => {
        const { h, s, l } = hexToHsl(selectedColor);
        return { h, s, l };
    });
    const squareRef = useRef<HTMLCanvasElement>(null);

    // Обновляем HSL при изменении выбранного цвета
    useEffect(() => {
        const { h, s, l } = hexToHsl(selectedColor);
        setHsl({ h, s, l });
    }, [selectedColor]);

    // Рисуем квадрат насыщенности и яркости
    useEffect(() => {
        const canvas = squareRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 200;
        canvas.width = size;
        canvas.height = size;

        // Очищаем canvas
        ctx.clearRect(0, 0, size, size);

        // Создаем градиент для насыщенности (горизонтально)
        const saturationGradient = ctx.createLinearGradient(0, 0, size, 0);
        saturationGradient.addColorStop(0, 'white');
        saturationGradient.addColorStop(1, hslToHex(hsl.h, 100, 50));

        // Создаем градиент для яркости (вертикально)
        const brightnessGradient = ctx.createLinearGradient(0, 0, 0, size);
        brightnessGradient.addColorStop(0, 'transparent');
        brightnessGradient.addColorStop(1, 'black');

        // Рисуем базовый градиент насыщенности
        ctx.fillStyle = saturationGradient;
        ctx.fillRect(0, 0, size, size);

        // Накладываем градиент яркости
        ctx.fillStyle = brightnessGradient;
        ctx.fillRect(0, 0, size, size);
    }, [hsl.h]);

    const handleSquareClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = squareRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const size = canvas.width;
        const saturation = (x / size) * 100;
        const lightness = 100 - (y / size) * 100;
        
        const newHsl = { ...hsl, s: saturation, l: lightness };
        setHsl(newHsl);
        onColorSelect(hslToHex(hsl.h, saturation, lightness));
    };

    const handleHueSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newH = parseInt(e.target.value);
        const newHsl = { ...hsl, h: newH };
        setHsl(newHsl);
        onColorSelect(hslToHex(newH, hsl.s, hsl.l));
    };

    return (
        <div className="space-y-4">
            <div className="text-app text-sm font-medium">Выберите цвет</div>
            
            {/* Основная палитра */}
            <div>
                <div className="text-app-2 text-xs mb-2">Настройка цвета</div>
                <div className="flex gap-4">
                    {/* Квадрат насыщенности и яркости */}
                    <div className="relative">
                        <canvas
                            ref={squareRef}
                            onClick={handleSquareClick}
                            className="cursor-crosshair rounded-lg border border-app"
                            style={{ width: '200px', height: '200px' }}
                        />
                        {/* Индикатор выбранного цвета */}
                        <div
                            className="absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none"
                            style={{
                                left: `${(hsl.s / 100) * 200 - 8}px`,
                                top: `${(1 - hsl.l / 100) * 200 - 8}px`,
                                backgroundColor: selectedColor
                            }}
                        />
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        {/* Полоса оттенка */}
                        <div className="flex flex-col gap-2">
                            <div className="text-app-2 text-xs">Оттенок</div>
                            <div className="relative">
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={hsl.h}
                                    onChange={handleHueSliderChange}
                                    className="w-8 h-48 bg-gradient-to-b from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-purple-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        background: 'linear-gradient(to bottom, #ef4444, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ef4444)',
                                        writingMode: 'vertical-lr' as any
                                    }}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Превью выбранного цвета */}
            <div className="flex items-center gap-3">
                <div className="text-app-2 text-xs">Выбранный цвет:</div>
                <div
                    className="w-8 h-8 rounded-lg border border-app"
                    style={{ backgroundColor: selectedColor }}
                />
                <div className="text-app-2 text-xs font-mono">{selectedColor.toUpperCase()}</div>
            </div>
        </div>
    );
}
