import { useMemo } from 'react';
import { sampleJson } from '../data/keymapData';
import { KeyboardModel, KeyboardSide } from './usePracticeCommons'; // 型定義の場所に合わせて調整してね

interface UrlAndKeyboardSetupResult {
    initialKb: KeyboardModel;
    initialSide: KeyboardSide;
    initialLayers: string[][];
    initialTitle: string;
    initialCols: number;
    initialFw: string | null;
    initialSn: string | null;
    initialShowTrainingButton: boolean;
}

export const useUrlAndKeyboardSetup = (): UrlAndKeyboardSetupResult => {
    return useMemo(() => {
        const pathParts = window.location.pathname.split('/').filter(part => part);
        const params = new URLSearchParams(window.location.search);

        let kbFromPath: string | undefined = undefined;
        let sideFromPath: string | undefined = undefined;

        if (pathParts.length > 0) {
            if (pathParts[0] === 'tw-20h' || pathParts[0] === 'tw-20v') {
                kbFromPath = pathParts[0];
            }
        }
        if (pathParts.length > 1) {
            if (pathParts[1] === 'left' || pathParts[1] === 'right') {
                sideFromPath = pathParts[1];
            }
        }

        const kbRaw = kbFromPath ?? params.get('kb') ?? 'tw-20v';
        const sideRaw = sideFromPath ?? params.get('side') ?? 'right';

        const initialKb: KeyboardModel = kbRaw === 'tw-20h' ? 'tw-20h' : 'tw-20v';
        const initialSide: KeyboardSide = sideRaw === 'left' ? 'left' : 'right';

        const kbKey = initialKb as keyof typeof sampleJson;
        const sideKey = initialSide as keyof typeof sampleJson[typeof kbKey];
        
        const sel = (sampleJson[kbKey] && sampleJson[kbKey][sideKey]) ? sampleJson[kbKey][sideKey] : { layers: [], titleSuffix: '' };
        const initialLayers: string[][] = sel.layers;
        const titleSuffixValue = ('titleSuffix' in sel && sel.titleSuffix) ? sel.titleSuffix : '';
        const initialTitle = `${initialKb.toUpperCase()} レイアウト (${initialSide}${titleSuffixValue})`;
        const initialCols = initialKb === 'tw-20v' ? 4 : 5;

        const initialFw = params.get('version');
        const initialSn = params.get('serial');
        const initialShowTrainingButton = !!(initialFw || initialSn);

        return { initialKb, initialSide, initialLayers, initialTitle, initialCols, initialFw, initialSn, initialShowTrainingButton };
    }, []); // 依存配列は空で、マウント時に一度だけ計算
};