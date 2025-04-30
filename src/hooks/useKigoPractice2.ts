// /home/coffee/my-keymap-viewer/src/hooks/useKigoPractice2.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice2Data, kigoMapping2, functionKeyMaps } from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    CharInfoKigo2,
    allKigo2CharInfos,
    KeyboardSide,
    KeyboardModel,
    PracticeHighlightResult,
} from './usePracticeCommons';

type KigoPractice2Stage = 'gyouInput' | 'kigoInput';

const useKigoPractice2 = ({
    gIdx,
    dIdx,
    isActive,
    okVisible,
    side,
    kb,
    layers,
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<KigoPractice2Stage>('gyouInput');
    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [side, kb]);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const [randomTarget, setRandomTarget] = useState<CharInfoKigo2 | null>(null);
    const selectNextRandomTarget = useCallback(() => {
        if (allKigo2CharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKigo2CharInfos.length);
            const nextTarget = allKigo2CharInfos[randomIndex];
            setRandomTarget(nextTarget);
            setStage('gyouInput'); // 常に gyouInput から
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    // reset 関数
    const reset = useCallback(() => {
        setStage('gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    useEffect(() => {

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                reset(); // reset 関数を呼び出す
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            if (isRandomMode && !randomTarget && (randomModeChangedToTrue || isInitialMount.current)) {
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            } else if (!isRandomMode && isInitialMount.current) {
                 reset(); // 通常モード初期化
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            reset(); // 非アクティブ時もリセット
        }
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

    // 通常モード用
    const currentGroup = useMemo(() => {
        if (isRandomMode || !isActive || gIdx < 0 || gIdx >= kigoPractice2Data.length) return null;
        return kigoPractice2Data[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentInputDef = useMemo(() => {
        if (isRandomMode || !currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, currentGroup, dIdx]);

    const currentTargetOriginalKey = useMemo(() => {
        if (isRandomMode) return randomTarget?.gyouKey ?? null;
        return currentInputDef?.gyouKey ?? null;
    }, [isRandomMode, randomTarget, currentInputDef]);

    const currentTargetChar = useMemo(() => {
        if (isRandomMode) return randomTarget?.char ?? null;
        return currentGroup?.chars[dIdx] ?? null;
    }, [isRandomMode, randomTarget, currentGroup, dIdx]);


    // 現在のキーボードモデルとサイドに応じた機能キーマップを取得
    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    // ハイライト対象の「表示名」を計算
    const highlightTargetDisplayName = useMemo(() => {
        const layer2 = layers[2] ?? [];
        // currentTargetOriginalKey が layers[2] のどのインデックスに対応するか検索
        const targetIndex = layer2.findIndex(key => key === currentTargetOriginalKey);

        if (targetIndex !== -1 && currentFunctionKeyMap[targetIndex]) {
            // 機能キーの場合、機能キー名を返す
            return currentFunctionKeyMap[targetIndex];
        } else {
            // 機能キーでない場合、kigoMapping2 で変換した記号を返す
            // currentTargetChar が kigoMapping2 の結果と一致するはず
            return currentTargetChar; // ヘッダーに表示されている文字をそのまま使う
        }
    }, [currentTargetOriginalKey, currentTargetChar, currentFunctionKeyMap, layers]);


    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            return currentGroup?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGroup]);

    const currentOkVisible = okVisible;

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {

        if (!isActive || okVisible) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (!currentTargetOriginalKey) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentTargetOriginalKey)
                    .map(([codeStr, _]) => parseInt(codeStr));

                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    setStage('kigoInput');
                } else {
                    isExpected = false;
                }
                break;
            case 'kigoInput':
                const expectedKigoKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === '記号')
                    .map(([codeStr, _]) => parseInt(codeStr));

                if (expectedKigoKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    setStage('gyouInput'); // 次の入力のためにステージを戻す
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                } else {
                    isExpected = false;
                    setStage('gyouInput');
                }
                break;
        }

        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, hid2Gyou, currentTargetOriginalKey,
        isRandomMode, selectNextRandomTarget, setStage
    ]);

    // ▼▼▼ getHighlightClassName を修正 ▼▼▼
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive || okVisible) {
            return noHighlight;
        }
        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyDisplayName: string | null = null; // ハイライトすべきキーの「表示名」
        const targetLayoutIndex = 2; // 記号2はスタートレイヤーのみ

        switch (currentStageForHighlight) {
            case 'gyouInput':
                // ハイライトすべきキーの「本来のキー名」（例: 'あ行'）を取得
                expectedKeyDisplayName = currentTargetOriginalKey; // ★★★ 修正: 本来のキー名を使う ★★★
                break;
            case 'kigoInput':
                // ハイライトすべき「記号」キーの「表示名」を取得
                const layer2 = layers[2] ?? [];
                // hid2Gyou マッピングから '記号' キーの HID コード (1-based) を検索
                const kigoKeyEntry = Object.entries(hid2Gyou)
                    .find(([_, name]) => name === '記号');
                const kigoHidCode = kigoKeyEntry ? parseInt(kigoKeyEntry[0]) : null;
                // HID コードからインデックス (0-based) を計算
                const kigoKeyIndex = kigoHidCode !== null ? kigoHidCode - 1 : -1;

                // sampleJson (layers[2]) から実際の表示名を取得
                expectedKeyDisplayName = (kigoKeyIndex !== -1 && layer2[kigoKeyIndex])
                    ? layer2[kigoKeyIndex]
                    : '記号'; // 見つからない場合のデフォルト
                break;
        }

        // レンダリング中のキーの表示名 (keyName) と、期待される表示名 (expectedKeyDisplayName) を比較
        if (expectedKeyDisplayName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyDisplayName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [
        isActive, okVisible, stage, currentTargetOriginalKey, // highlightTargetDisplayName は不要に
        isRandomMode, gIdx, dIdx, layers, hid2Gyou // layers, hid2Gyou を依存配列に追加
    ]);
    // ▲▲▲ 修正完了 ▲▲▲

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // 記号2はスタートレイヤー(layoutIndex=2)のみ対象
        const isTarget = layoutIndex === 2 && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible,
    };
};

export default useKigoPractice2;
