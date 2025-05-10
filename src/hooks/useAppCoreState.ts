// /home/coffee/my-keymap-viewer/src/hooks/useAppCoreState.ts
import { useState, useMemo } from 'react';
import { KeyboardModel, KeyboardSide } from './usePracticeCommons';
import { functionKeyMaps } from '../data/keymapData';

export interface AppCoreStateProps {
    initialKb: KeyboardModel;
    initialSide: KeyboardSide;
    initialLayers: string[][];
    initialTitle: string;
    initialCols: number;
    initialFw: string | null;
    initialSn: string | null;
    initialShowTrainingButton: boolean;
}

export interface AppCoreStateResult {
    layers: string[][];
    setLayers: React.Dispatch<React.SetStateAction<string[][]>>;
    title: string;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    fw: string | null;
    setFW: React.Dispatch<React.SetStateAction<string | null>>;
    sn: string | null;
    setSN: React.Dispatch<React.SetStateAction<string | null>>;
    cols: number;
    setCols: React.Dispatch<React.SetStateAction<number>>;
    training: boolean;
    setTraining: React.Dispatch<React.SetStateAction<boolean>>;
    showTrainingButton: boolean;
    setShowTrainingButton: React.Dispatch<React.SetStateAction<boolean>>;
    side: KeyboardSide;
    setSide: React.Dispatch<React.SetStateAction<KeyboardSide>>;
    kb: KeyboardModel;
    setKb: React.Dispatch<React.SetStateAction<KeyboardModel>>;
    fixedWidth: string;
    currentFunctionKeyMap: Record<number, string>; // Changed from Record<string,string> to Record<number,string>
}

export const useAppCoreState = ({
    initialKb,
    initialSide,
    initialLayers,
    initialTitle,
    initialCols,
    initialFw,
    initialSn,
    initialShowTrainingButton,
}: AppCoreStateProps): AppCoreStateResult => {
    const [layers, setLayers] = useState<string[][]>(initialLayers);
    const [title, setTitle] = useState(initialTitle);
    const [fw, setFW] = useState<string | null>(initialFw);
    const [sn, setSN] = useState<string | null>(initialSn);
    const [cols, setCols] = useState(initialCols);
    const [training, setTraining] = useState(false); // Initial training state is false
    const [showTrainingButton, setShowTrainingButton] = useState(initialShowTrainingButton);
    const [side, setSide] = useState<KeyboardSide>(initialSide);
    const [kb, setKb] = useState<KeyboardModel>(initialKb);

    // キーボード表示の固定幅
    const keyWidthRem = 5.5;
    const fixedWidthNum = cols * keyWidthRem;
    const fixedWidth = `${fixedWidthNum}rem`;

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb as keyof typeof functionKeyMaps]?.[side as keyof typeof functionKeyMaps[keyof typeof functionKeyMaps]] ?? {};
    }, [kb, side]);

    return {
        layers, setLayers,
        title, setTitle,
        fw, setFW,
        sn, setSN,
        cols, setCols,
        training, setTraining,
        showTrainingButton, setShowTrainingButton,
        side, setSide,
        kb, setKb,
        fixedWidth,
        currentFunctionKeyMap,
    };
};