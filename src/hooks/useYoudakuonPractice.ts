// /home/coffee/my-keymap-viewer/src/hooks/useYoudakuonPractice.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    youdakuonPracticeData,
    YoudakuonInputDef,
} from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    functionKeyMaps,
    PracticeHighlightResult,
} from './usePracticeCommons';

// 拗濁音練習の入力ステージ
type YoudakuonStage = 'gyouInput' | 'youonInput' | 'dakuonInput' | 'danInput';

interface YoudakuonCharInfo {
    type: 'youdakuon'; // <<< type プロパティを追加
    char: string;
    inputDef: YoudakuonInputDef;
}

const allYoudakuonCharInfos: YoudakuonCharInfo[] = youdakuonPracticeData.flatMap(group =>
    group.chars.map((char, index) => ({
        char: char,
        type: 'youdakuon' as const, // <<< type プロパティを設定
        inputDef: group.inputs[index],
    }))
);

// --- ここから PracticeSequencer のインターフェース定義 (イメージ) ---
// 実際には usePracticeSequencer.ts ファイルに定義します
interface PracticeSequencerProps<TCharInfo> {
    practiceData: any[]; // 練習データの型 (例: YoudakuonPracticeGroup[])
    allCharInfos: TCharInfo[]; // ランダムモード用の全文字情報
    gIdx: number;
    dIdx: number;
    isActive: boolean;
    isRandomMode?: boolean;
    onAdvance?: () => void; // <<< 親から進行を伝えるコールバックを受け取る
}

interface PracticeSequencerResult<TCharInfo> {
    currentCharacterInfo: TCharInfo | null; // 現在のターゲット文字情報 (入力定義を含む)
    currentGroupChars: string[]; // 通常モード時の現在のグループの文字配列
    goToNext: () => void; // 次の文字/ターゲットに進む関数
    resetSequence: () => void; // シーケンスをリセットする関数
    isPracticeActive: boolean; // 練習がアクティブかどうか
}

// 仮の usePracticeSequencer フック (実際には別途実装)
const usePracticeSequencer = <TCharInfo extends { type: string; char: string; inputDef: any }>(props: PracticeSequencerProps<TCharInfo>): PracticeSequencerResult<TCharInfo> => {
    // このフックは練習の進行管理ロジック（gIdx, dIdx の更新、ランダム選択など）を担当します。
    // ここでは useYoudakuonPractice の変更に集中するため、具体的な実装は省略します。
    // 以下のダミー実装は、useYoudakuonPractice がコンパイルエラーにならないようにするためだけのものです。
    const { practiceData, allCharInfos, gIdx, dIdx, isActive, isRandomMode } = props;

    const currentCharacterInfo = useMemo((): TCharInfo | null => {
        if (!isActive) return null;
        if (isRandomMode) {
            if (allCharInfos.length === 0) return null;
            // ダミーのランダム選択ロジック (実際にはより適切なランダム化が必要)
            // ここでは allCharInfos の最初の要素を返すか、gIdx/dIdx に基づくものを使うなど、
            // 実際のシーケンサーのロジックに依存します。
            // このダミーでは、props.gIdx を使ってランダムターゲットを固定的に選んでみます。
            const targetIndex = props.gIdx % allCharInfos.length; // gIdx を使ってインデックスを決定
            return allCharInfos[targetIndex] || null;
        } else {
            const group = practiceData[gIdx];
            if (!group || !group.inputs || dIdx < 0 || dIdx >= group.inputs.length) return null;
            // allCharInfos の型と合わせるため、inputDef を持つオブジェクトを返す
            // TCharInfo が { type: string; char: string; inputDef: any } を満たすことを期待
            return { type: 'youdakuon', char: group.chars[dIdx], inputDef: group.inputs[dIdx] } as TCharInfo; // type を追加
        }
    }, [isActive, isRandomMode, practiceData, allCharInfos, gIdx, dIdx, props.gIdx]); // props.gIdx を依存配列に追加

    const currentGroupChars = useMemo((): string[] => {
        if (isRandomMode || !isActive || !practiceData[gIdx]) return [];
        return practiceData[gIdx]?.chars ?? [];
    }, [isRandomMode, isActive, practiceData, gIdx]);

    const goToNext = useCallback(() => {
        //console.log("[DummySequencer] goToNext called. Attempting to call onAdvance.");
        if (props.onAdvance) {
            props.onAdvance();
        }
    }, [props.onAdvance]);

    const resetSequence = useCallback(() => {
        //console.log("[DummySequencer] resetSequence called. In a real sequencer, this would reset gIdx/dIdx to initial values.");
        // 実際のシーケンサーでは、gIdx や dIdx を初期値に戻すロジックが入ります。
    }, []);


    return {
        currentCharacterInfo,
        currentGroupChars,
        goToNext,
        resetSequence,
        isPracticeActive: isActive,
    };
};
// --- ここまで PracticeSequencer のインターフェース定義 (イメージ) ---


const useYoudakuonPractice = ({
    gIdx,
    dIdx,
    isActive,
    side,
    kb,
    onAdvance, // <<< App.tsx から渡される onAdvance を受け取る
    layers, // layers は handleInput で使うので必要
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<YoudakuonStage>('gyouInput');
    // gIdx, dIdx, randomTarget, isInitialMount, prevGIdxRef, prevDIdxRef, prevIsRandomModeRef は
    // usePracticeSequencer に移譲するため、このフック内では不要になります。

    const sequencer = usePracticeSequencer<YoudakuonCharInfo>({
        practiceData: youdakuonPracticeData,
        allCharInfos: allYoudakuonCharInfos,
        gIdx,
        dIdx,
        isActive,
        isRandomMode,
        onAdvance, // <<< シーケンサーに onAdvance を渡す
    });

    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [kb, side]);

    const hid2Dan = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2DanVLeft_Kana : hid2DanVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2DanHLeft_Kana : hid2DanHRight_Kana;
        }
    }, [kb, side]);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);
    
    const currentInputDef = useMemo(() => {
        return sequencer.currentCharacterInfo?.inputDef ?? null;
    }, [sequencer.currentCharacterInfo]);

    const headingChars = useMemo(() => {
        if (!sequencer.isPracticeActive) return [];
        return isRandomMode ? (sequencer.currentCharacterInfo ? [sequencer.currentCharacterInfo.char] : []) : sequencer.currentGroupChars;
    }, [sequencer.isPracticeActive, isRandomMode, sequencer.currentCharacterInfo, sequencer.currentGroupChars]);

    const reset = useCallback(() => {
        setStage('gyouInput');
        sequencer.resetSequence();
    }, [setStage, sequencer]);

    useEffect(() => {
        // 練習がアクティブでなくなった場合、またはシーケンサーのターゲットが変わった場合にステージをリセット
        // currentInputDef は sequencer.currentCharacterInfo.inputDef に依存するため、
        // sequencer.currentCharacterInfo の変更を監視すれば十分
        if (!sequencer.isPracticeActive || 
            (sequencer.currentCharacterInfo && currentInputDef && sequencer.currentCharacterInfo.inputDef !== currentInputDef)) {
            setStage('gyouInput');
        } else if (!sequencer.currentCharacterInfo && sequencer.isPracticeActive) {
            // アクティブだがターゲットがない場合もリセット (シーケンサーがまだ準備できていない可能性)
            setStage('gyouInput');
        }
        // isRandomMode や gIdx/dIdx の変更はシーケンサーがハンドリングするので、
        // ここでの複雑な useEffect は不要になります。
    }, [sequencer.isPracticeActive, sequencer.currentCharacterInfo, currentInputDef, setStage]);


    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {

        if (!sequencer.isPracticeActive || !currentInputDef) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        // shouldGoToNext はこのフックでは管理しない
        let nextStage: YoudakuonStage = stage;

        // 機能キー「拗音」「濁音」の期待されるキーコードを取得
        const youonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;
        const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

        if (expectedYouonKeyCode === -1 || expectedDakuonKeyCode === -1) {
            console.error("useYoudakuonPractice: Could not find key codes for '拗音' or '濁音'. Check functionKeyMaps and current keyboard/side settings.");
            return { isExpected: false, shouldGoToNext: false };
        }

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentInputDef.gyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStage = 'youonInput';
                } else {
                    nextStage = 'gyouInput'; 
                }
                break;
            case 'youonInput':
                 if (pressCode === expectedYouonKeyCode) {
                    isExpected = true;
                    nextStage = 'dakuonInput';
                } else {
                    nextStage = 'gyouInput'; 
                }
                break;
            case 'dakuonInput':
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStage = 'danInput';
                } else {
                    nextStage = 'gyouInput'; 
                }
                break;
            case 'danInput':
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === currentInputDef.dan)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedDanKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStage = 'gyouInput'; 
                    if (isExpected) { // 正解した場合のみシーケンサーを進める
                        sequencer.goToNext();
                    }
                } else {
                    nextStage = 'gyouInput'; 
                }
                break;
        }

        if (nextStage !== stage) {
            setStage(nextStage);
        } else if (!isExpected && stage !== 'gyouInput') { // ミス時で最初のステージでなければリセット
            setStage('gyouInput');
        }


        return { isExpected, shouldGoToNext: false }; // shouldGoToNext は常に false
    }, [
        sequencer, stage, currentInputDef, hid2Gyou, hid2Dan, currentFunctionKeyMap,
        isRandomMode, setStage // isRandomMode は sequencer 経由で参照する方が良いが、ここでは残す
    ]);

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!sequencer.isPracticeActive || !currentInputDef) {
            return noHighlight;
        }

        // シーケンサーがターゲットを管理するため、インデックス変更時の強制ステージ変更は不要になる
        // (シーケンサーが新しいターゲットを提供した時点で stage がリセットされる想定)
        const currentStageForHighlight = stage;


        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        // 機能キー「拗音」「濁音」の表示名を取得
        const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';
        const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentInputDef.gyouKey;
                targetLayoutIndex = 2; // スタートレイヤー
                break;
            case 'youonInput':
                expectedKeyName = youonDisplayName;
                targetLayoutIndex = 2; // スタートレイヤーの機能キー
                break;
            case 'dakuonInput':
                expectedKeyName = dakuonDisplayName;
                targetLayoutIndex = 2; // スタートレイヤーの機能キー
                break;
            case 'danInput':
                expectedKeyName = currentInputDef.dan;
                targetLayoutIndex = 3; // エンドレイヤー
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [
        sequencer.isPracticeActive, stage, currentInputDef, currentFunctionKeyMap
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!sequencer.isPracticeActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        // 現在のステージに応じて、不正入力が起こりうるレイヤーを特定
        switch (stage) {
            case 'gyouInput':
            case 'youonInput':
            case 'dakuonInput':
                expectedLayoutIndex = 2; // スタートレイヤー
                break;
            case 'danInput':
                expectedLayoutIndex = 3; // エンドレイヤー
                break;
        }

        // 期待されるレイヤーで、かつキーインデックスが一致する場合のみ true
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [sequencer.isPracticeActive, stage]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        // PracticeHookResult に currentTarget を追加したので、それも返す
        currentTarget: sequencer.currentCharacterInfo ?? undefined,
   };
};

export default useYoudakuonPractice;
