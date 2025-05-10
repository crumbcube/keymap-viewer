import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    PracticeMode,
    PracticeHookProps,
    PracticeHookResult,
    KeyboardSide,
    KeyboardModel,
    CharInfoGairaigo,
    PracticeInputInfo, // Though not directly used, good for context if we expand
    PracticeStatus
} from './usePracticeCommons';

// Import individual practice hooks
import useSeionPractice from './useSeionPractice';
import useYouonPractice from './useYouonPractice';
import useDakuonPractice from './useDakuonPractice';
import useHandakuonPractice from './useHandakuonPractice';
import useSokuonKomojiPractice from './useSokuonKomojiPractice';
import useKigoPractice1 from './useKigoPractice1';
import useKigoPractice2 from './useKigoPractice2';
import useKigoPractice3 from './useKigoPractice3';
import useYoudakuonPractice from './useYoudakuonPractice';
import useYouhandakuonPractice from './useYouhandakuonPractice';
import useYouonKakuchoPractice from './useYouonKakuchoPractice';
import useGairaigoPractice from './useGairaigoPractice';
import useKanaChallengePractice from './useKanaChallengePractice';
import useKigoChallengePractice from './useKigoChallengePractice';
import useTanbunChallengePractice from './useTanbunChallengePractice';

// Data imports (could be passed as props if they vary more, but for now direct import is fine for some)
import {
    layerNames as defaultLayerNames, // Renamed to avoid conflict if passed as prop
    // For practiceDataMap construction if done internally, or for type reference
    seionPracticeData,
    youonGyouList, youonGyouChars,
    dakuonGyouList, dakuonGyouChars,
    handakuonGyouChars,
    sokuonKomojiData,
    kigoPractice1Data, kigoPractice2Data, kigoPractice3Data,
    youdakuonPracticeData, youhandakuonPracticeData,
    youonKakuchoChars, gairaigoPracticeData
} from '../data/keymapData';


interface UsePracticeManagementProps {
    initialPracticeMode: PracticeMode | '';
    initialGIdx: number;
    initialDIdx: number;
    isRandomMode: boolean;
    layers: string[][]; // For commonHookProps and keyboardLayersForDisplay
    side: KeyboardSide;   // For commonHookProps
    kb: KeyboardModel;    // For commonHookProps and keyboardLayersForDisplay
    showKeyLabels: boolean; // For commonHookProps
    training: boolean;    // For displayLayerIndices & keyboardLayersForDisplay
    practiceDataMap: Record<string, any[]>; // Passed from App.tsx
    sampleJson: any; // Passed from App.tsx (keymapData)
    layerNames: Record<number, string>; // Passed from App.tsx
    isChallengeModeFn: (mode: PracticeMode | '') => boolean; // Passed from App.tsx
}

interface UsePracticeManagementReturn {
    practice: PracticeMode | '';
    gIdx: number;
    dIdx: number;
    activePractice: PracticeHookResult | null;
    handlePracticeSelect: (item: PracticeMode) => void;
    nextStage: () => void;
    headingChars: string[];
    isChallengeFinished: boolean;
    displayLayerIndices: number[];
    keyboardLayersForDisplay: string[][];
}

export const usePracticeManagement = ({
    initialPracticeMode,
    initialGIdx,
    initialDIdx,
    isRandomMode,
    layers,
    side,
    kb,
    showKeyLabels,
    training,
    practiceDataMap,
    sampleJson,
    layerNames,
    isChallengeModeFn,
}: UsePracticeManagementProps): UsePracticeManagementReturn => {
    const [practice, setPractice] = useState<PracticeMode | ''>(initialPracticeMode);
    const [gIdx, setGIdx] = useState<number>(initialGIdx);
    const [dIdx, setDIdx] = useState<number>(initialDIdx);

    const calculateNextIndices = useCallback((
        currentGIdx: number,
        currentDIdx: number,
        currentPracticeMode: PracticeMode | '',
        isRandomModeActive: boolean
    ): { nextGIdx: number; nextDIdx: number } => {
        let nextGIdx = currentGIdx;
        let nextDIdx = currentDIdx + 1;

        if (isRandomModeActive) {
            return { nextGIdx: currentGIdx, nextDIdx: currentDIdx };
        }
        
        const dataForMode = practiceDataMap[currentPracticeMode];

        if (currentPracticeMode === '外来語の発音補助') {
            // gairaigoPracticeData is used here, ensure it's available or passed if practiceDataMap doesn't fully cover it
            const gairaigoData = practiceDataMap[currentPracticeMode] || gairaigoPracticeData; // Fallback if needed
            const currentGairaigoGroup = gairaigoData[currentGIdx];
            if (currentGairaigoGroup && currentDIdx >= currentGairaigoGroup.targets.length - 1) {
                nextGIdx = currentGIdx + 1;
                nextDIdx = 0;
                if (nextGIdx >= gairaigoData.length) {
                    nextGIdx = 0;
                }
                return { nextGIdx, nextDIdx };
            }
            return { nextGIdx: currentGIdx, nextDIdx };
        }

        if (!dataForMode || dataForMode.length === 0) {
            return { nextGIdx: 0, nextDIdx: 0 };
        }
        if (nextGIdx >= dataForMode.length) {
            return { nextGIdx: 0, nextDIdx: 0 };
        }
        const currentGroup = dataForMode[nextGIdx];
        if (!currentGroup) {
            return { nextGIdx: 0, nextDIdx: 0 };
        }

        let groupLength = 0;
        if (Array.isArray(currentGroup)) {
            groupLength = currentGroup.length;
        } else if (currentGroup.headerChars && Array.isArray(currentGroup.headerChars)) {
            groupLength = currentGroup.headerChars.length;
        } else if (currentGroup.inputs && Array.isArray(currentGroup.inputs)) {
            groupLength = currentGroup.inputs.length;
        } else if (currentGroup.chars && Array.isArray(currentGroup.chars)) {
            groupLength = currentGroup.chars.length;
        }

        if (groupLength === 0 && nextGIdx < dataForMode.length - 1) {
            nextDIdx = 0;
            nextGIdx = currentGIdx + 1;
        } else if (nextDIdx >= groupLength) {
            nextDIdx = 0;
            nextGIdx = currentGIdx + 1;
        }

        if (nextGIdx >= dataForMode.length) {
            if (isChallengeModeFn(currentPracticeMode)) {
                // Challenge mode finished, gIdx/dIdx might stay at end or reset based on specific challenge logic
            } else {
                nextGIdx = 0; // Loop back for normal practice
            }
        }
        return { nextGIdx, nextDIdx };
    }, [practiceDataMap, isChallengeModeFn]);

    const nextStage = useCallback(() => {
        if (!practice) return;
        const { nextGIdx, nextDIdx } = calculateNextIndices(gIdx, dIdx, practice, isRandomMode);
        setGIdx(nextGIdx);
        setDIdx(nextDIdx);
    }, [practice, gIdx, dIdx, isRandomMode, calculateNextIndices, setGIdx, setDIdx]);

    const commonHookProps: PracticeHookProps = useMemo(() => ({
        gIdx,
        dIdx,
        isActive: false, // Will be overridden by specific hook
        side,
        layers,
        kb,
        isRandomMode,
        showKeyLabels,
        onAdvance: nextStage // Use the new nextStage
    }), [gIdx, dIdx, side, layers, kb, isRandomMode, showKeyLabels, nextStage]);

    // Instantiate all practice hooks
    const seionPractice = useSeionPractice({ ...commonHookProps, isActive: practice === '清音の基本練習' });
    const youonPractice = useYouonPractice({ ...commonHookProps, isActive: practice === '拗音の基本練習' });
    const dakuonPractice = useDakuonPractice({ ...commonHookProps, isActive: practice === '濁音の基本練習' });
    const handakuonPractice = useHandakuonPractice({ ...commonHookProps, isActive: practice === '半濁音の基本練習' });
    const sokuonKomojiPractice = useSokuonKomojiPractice({ ...commonHookProps, isActive: practice === '小文字(促音)の基本練習' });
    const kigoPractice1 = useKigoPractice1({ ...commonHookProps, isActive: practice === '記号の基本練習１', layers });
    const kigoPractice2 = useKigoPractice2({ ...commonHookProps, isActive: practice === '記号の基本練習２' });
    const kigoPractice3 = useKigoPractice3({ ...commonHookProps, isActive: practice === '記号の基本練習３' });
    const youdakuonPractice = useYoudakuonPractice({ ...commonHookProps, isActive: practice === '拗濁音の練習' });
    const youhandakuonPractice = useYouhandakuonPractice({ ...commonHookProps, isActive: practice === '拗半濁音の練習' });
    const youonKakuchoPractice = useYouonKakuchoPractice({ ...commonHookProps, isActive: practice === '拗音拡張' });
    const gairaigoPractice = useGairaigoPractice({ ...commonHookProps, isActive: practice === '外来語の発音補助' });
    const kanaChallengePractice = useKanaChallengePractice({ ...commonHookProps, isActive: practice === 'かな入力１分間トレーニング' });
    const kigoChallengePractice = useKigoChallengePractice({ ...commonHookProps, isActive: practice === '記号入力１分間トレーニング' });
    const tanbunChallengePractice = useTanbunChallengePractice({ ...commonHookProps, isActive: practice === '短文入力３分間トレーニング' });

    const activePractice: PracticeHookResult | null = useMemo(() => {
        switch (practice) {
            case '清音の基本練習': return seionPractice;
            case '拗音の基本練習': return youonPractice;
            case '濁音の基本練習': return dakuonPractice;
            case '半濁音の基本練習': return handakuonPractice;
            case '小文字(促音)の基本練習': return sokuonKomojiPractice;
            case '記号の基本練習１': return kigoPractice1;
            case '記号の基本練習２': return kigoPractice2;
            case '記号の基本練習３': return kigoPractice3;
            case '拗濁音の練習': return youdakuonPractice;
            case '拗半濁音の練習': return youhandakuonPractice;
            case '拗音拡張': return youonKakuchoPractice;
            case '外来語の発音補助': return gairaigoPractice;
            case 'かな入力１分間トレーニング': return kanaChallengePractice;
            case '記号入力１分間トレーニング': return kigoChallengePractice;
            case '短文入力３分間トレーニング': return tanbunChallengePractice;
            default: return null;
        }
    }, [practice, seionPractice, youonPractice, dakuonPractice, handakuonPractice, sokuonKomojiPractice, kigoPractice1, kigoPractice2, kigoPractice3, youdakuonPractice, youhandakuonPractice, youonKakuchoPractice, gairaigoPractice, kanaChallengePractice, kigoChallengePractice, tanbunChallengePractice]);

    const handlePracticeSelect = useCallback((item: PracticeMode) => {
        activePractice?.reset?.(); // Reset current before switching
        setPractice(item);
        setGIdx(0);
        // dIdx initial value adjustments based on practice mode
        if (isChallengeModeFn(item)) {
            setDIdx(0);
        } else if (item === '拗音拡張') {
            setDIdx(1);
        } else if (item === '外来語の発音補助') {
            setDIdx(0);
        } else {
            setDIdx(0);
        }
        // The new activePractice will be determined by the memo, and its reset (if needed on first load) should be handled by its own logic or an effect.
    }, [activePractice, setPractice, setGIdx, setDIdx, isChallengeModeFn]);

    // Effect to reset active practice when isRandomMode changes (for non-challenge modes)
    useEffect(() => {
        if (!isChallengeModeFn(practice)) {
            activePractice?.reset?.();
        }
    }, [isRandomMode, practice, activePractice, isChallengeModeFn]);
    
    // Effect to reset active practice when it changes (e.g. due to practice mode selection)
    // This ensures the newly selected practice starts fresh.
    useEffect(() => {
        activePractice?.reset?.();
    }, [activePractice]);


    const isChallengeFinished = useMemo(() => {
        return isChallengeModeFn(practice) && !!activePractice?.challengeResults;
    }, [practice, activePractice, isChallengeModeFn]);

    const headingChars = useMemo(() => {
        if (!training || !practice || !activePractice) return [];
        if (isChallengeModeFn(practice) || (isRandomMode && practice !== '外来語の発音補助')) {
            return activePractice.headingChars ?? [];
        }
        const dataForMode = practiceDataMap[practice];
        if (!dataForMode) return [];
        if (gIdx >= 0 && gIdx < dataForMode.length) {
            const group = dataForMode[gIdx];
            if (Array.isArray(group)) return group;
            if (typeof group === 'object' && group !== null) {
                if (group.headerChars && Array.isArray(group.headerChars)) return group.headerChars;
                if (group.chars && Array.isArray(group.chars)) return group.chars;
            }
        }
        return [];
    }, [training, practice, gIdx, isRandomMode, activePractice, practiceDataMap, isChallengeModeFn]);

    const displayLayerIndices = useMemo(() => {
        if (training) {
            if (practice === '記号入力１分間トレーニング' && activePractice?.targetLayerIndex !== null && activePractice?.targetLayerIndex !== undefined) {
                return [activePractice.targetLayerIndex];
            }
            if (practice === '記号の基本練習１') return [6];
            if (practice === '記号の基本練習２') return [7];
            if (practice === '記号の基本練習３') return [8];
            if (practice && !isChallengeModeFn(practice)) {
                return [2, 3];
            }
            if (practice === 'かな入力１分間トレーニング') {
                return [2, 3];
            }
            if (practice === '短文入力３分間トレーニング') {
                return [];
            }
            return [];
        }
        return [];
    }, [training, practice, activePractice?.targetLayerIndex, isChallengeModeFn]);

    const keyboardLayersForDisplay = useMemo(() => {
        const baseLayers = sampleJson[kb]?.[side]?.layers ?? [];
        if (practice === '記号入力１分間トレーニング' && activePractice?.displayLayers) {
            return activePractice.displayLayers;
        }
        return baseLayers;
    }, [practice, activePractice, kb, side, sampleJson]);


    return {
        practice,
        gIdx,
        dIdx,
        activePractice,
        handlePracticeSelect,
        nextStage,
        headingChars,
        isChallengeFinished,
        displayLayerIndices,
        keyboardLayersForDisplay,
    };
};
