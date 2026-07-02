// Бренд/режим оформления. Задаётся билд-аргом NEXT_PUBLIC_BRAND (инлайнится Next на билде).
// 'hse' → white-label «MyTask» с оформлением ВШЭ; иначе — стандартный Emplacc.
export const BRAND = process.env.NEXT_PUBLIC_BRAND === 'hse' ? 'hse' : 'emplacc';
export const IS_HSE = BRAND === 'hse';
export const BRAND_NAME = IS_HSE ? 'MyTask' : 'Emplacc';
