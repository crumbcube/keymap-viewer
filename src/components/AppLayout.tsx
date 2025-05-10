import React from 'react';
import PracticeMenu from './PracticeMenu';
import PracticeHeading from './PracticeHeading';
import KeyboardLayout from './KeyboardLayout';
import { PracticeMode, CharInfoGairaigo, PracticeHookResult } from '../hooks/usePracticeCommons'; // PracticeHookResult をインポート

interface AppLayoutProps {
    // UI State & Display Info
    training: boolean;
    showTrainingButton: boolean;
    title: string;
    fw: string | null;
    sn: string | null;
    practice: PracticeMode | '';
    showKeyLabels: boolean;
    isRandomMode: boolean;
    isChallengeModeActive: boolean;
    gIdx: number;
    dIdx: number;
    headingChars: string[];
    isChallengeFinished: boolean;
    activePractice: PracticeHookResult | null;
    displayLayerIndices: number[];
    keyboardLayersForDisplay: string[][];
    layers: string[][]; // For non-training mode display
    layerNames: Record<number, string>;
    cols: number;
    fixedWidth: string;
    lastInvalidKeyCode: number | null;
    currentFunctionKeyMap: Record<number, string>;

    // Handlers
    onToggleTraining: () => void;
    onToggleShowKeyLabels: () => void;
    onToggleRandomMode: () => void;
    onPracticeSelect: (item: PracticeMode) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    training,
    showTrainingButton,
    title,
    fw,
    sn,
    practice,
    showKeyLabels,
    isRandomMode,
    isChallengeModeActive,
    gIdx,
    dIdx,
    headingChars,
    isChallengeFinished,
    activePractice,
    displayLayerIndices,
    keyboardLayersForDisplay,
    layers,
    layerNames,
    cols,
    fixedWidth,
    lastInvalidKeyCode,
    currentFunctionKeyMap,
    onToggleTraining,
    onToggleShowKeyLabels,
    onToggleRandomMode,
    onPracticeSelect,
}) => {
    // ボタンのスタイルをコンポーネント内で定義
    const buttonStyle: React.CSSProperties = {
        marginBottom: '0.5rem',
        padding: '5px 10px',
        display: 'block',
        minWidth: '120px',
        textAlign: 'center',
    };
    return (
        <div className='p-4 pt-20'>
            {/* ボタンエリア */}
            {showTrainingButton && (
                <div className="absolute top-4 right-4 flex flex-col space-y-2 items-end z-50">
                    <button
                        className={`px-4 py-1 rounded shadow text-white ${training ? 'bg-gray-600' : 'bg-green-600'}`}
                        onClick={onToggleTraining}
                        style={buttonStyle}
                    >
                        {training ? 'レイアウト表示に戻る' : '練習を始める'}
                    </button>
                    {training && (
                        <>
                            <button
                                className="px-4 py-1 rounded shadow text-white bg-blue-600 hover:bg-blue-700"
                                onClick={onToggleShowKeyLabels}
                                style={buttonStyle}
                            >
                                {showKeyLabels ? 'キー表示 OFF' : 'キー表示 ON'}
                            </button>
                            {!isChallengeModeActive && ( // チャレンジモード中はランダムボタン非表示
                                <button
                                    className={`px-4 py-1 rounded shadow text-white bg-purple-600 hover:bg-purple-700`}
                                    onClick={onToggleRandomMode}
                                    style={buttonStyle}
                                >
                                    ランダム {isRandomMode ? 'OFF' : 'ON'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 練習モードOFF時の表示 */}
            {!training && <h1 className='text-lg font-semibold mb-4'>{title}</h1>}
            {(fw || sn) && !training && (
                <div className='mb-4 text-sm text-gray-700 space-y-1'>
                    <p>FW: {fw ?? '不明'}</p>
                    <p>SN: {sn ?? '不明'}</p>
                </div>
            )}

            {/* 練習モードON時の表示 */}
            {training ? (
                <>
                    {practice ? (
                        <div className='grid grid-cols-3 gap-4 items-start'>
                            {/* メニュー表示 */}
                            <PracticeMenu
                                practice={practice}
                                handlePracticeSelect={onPracticeSelect}
                            />

                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div className={'col-start-1 justify-self-center w-full'}>
                                    {activePractice?.status === 'countdown' && activePractice?.countdownValue && activePractice.countdownValue > 0 && (
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="text-5xl font-bold">
                                                {activePractice.countdownValue}
                                            </div>
                                        </div>
                                    )}
                                    {activePractice?.status !== 'countdown' && (
                                        <PracticeHeading
                                            isRandomMode={isChallengeModeActive ? true : isRandomMode}
                                            practice={practice}
                                            gIdx={gIdx}
                                            dIdx={dIdx}
                                            headingChars={headingChars}
                                            isFinished={isChallengeFinished}
                                            typedEndIndex={activePractice?.typedEndIndex}
                                            status={activePractice?.status}
                                            currentTargetCharForHighlight={
                                                practice === '外来語の発音補助' && activePractice?.currentTarget && typeof activePractice.currentTarget === 'object' && 'type' in activePractice.currentTarget && activePractice.currentTarget.type === 'gairaigo'
                                                    ? (activePractice.currentTarget as CharInfoGairaigo).char
                                                    : typeof activePractice?.currentTarget === 'string'
                                                        ? activePractice.currentTarget
                                                        : undefined
                                            }
                                        />
                                    )}
                                </div>
                                {isChallengeFinished ? (
                                    <div className="flex items-center p-4 border rounded bg-gray-50 col-start-1 justify-self-center" style={{ minHeight: '15rem' }}>
                                        {activePractice?.challengeResults && (
                                            <pre className="text-lg text-left font-semibold">
                                                {`【${practice} 結果】\n`}
                                                {`問題数：${activePractice.challengeResults.totalQuestions}問クリア\n`}
                                                {(practice === 'かな入力１分間トレーニング' || practice === '短文入力３分間トレーニング') && `正解文字数：${activePractice.challengeResults.correctCharsCount}文字\n`}
                                                {`打鍵精度：${(activePractice.challengeResults.accuracy * 100).toFixed(1)}%\n`}
                                                {`スコア：${activePractice.challengeResults.score}点\n`}
                                                {activePractice.challengeResults.rankMessage && `\n${activePractice.challengeResults.rankMessage}`}
                                            </pre>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {displayLayerIndices.length === 1 ? (
                                            keyboardLayersForDisplay[displayLayerIndices[0]] && (
                                                <KeyboardLayout
                                                    key={displayLayerIndices[0]}
                                                    layerData={keyboardLayersForDisplay[displayLayerIndices[0]]}
                                                    layoutIndex={displayLayerIndices[0]}
                                                    className="col-start-1 justify-self-center"
                                                    layoutTitle={layerNames[displayLayerIndices[0]] ?? `レイヤー ${displayLayerIndices[0]}`}
                                                    cols={cols} fixedWidth={fixedWidth} showKeyLabels={showKeyLabels} lastInvalidKeyCode={lastInvalidKeyCode} activePractice={activePractice} practice={practice} currentFunctionKeyMap={currentFunctionKeyMap} training={training}
                                                />
                                            )
                                        ) : displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3) ? (
                                            displayLayerIndices.map((layerIndex) => {
                                                const gridColClass = layerIndex === 2 ? 'col-start-1 justify-self-center' : 'col-start-2 justify-self-center';
                                                return keyboardLayersForDisplay[layerIndex] ? (
                                                    <KeyboardLayout
                                                        key={layerIndex}
                                                        layerData={keyboardLayersForDisplay[layerIndex]}
                                                        layoutIndex={layerIndex}
                                                        className={gridColClass}
                                                        layoutTitle={layerNames[layerIndex] ?? `レイヤー ${layerIndex}`}
                                                        cols={cols} fixedWidth={fixedWidth} showKeyLabels={showKeyLabels} lastInvalidKeyCode={lastInvalidKeyCode} activePractice={activePractice} practice={practice} currentFunctionKeyMap={currentFunctionKeyMap} training={training}
                                                    />
                                                ) : (
                                                    <div key={layerIndex}>レイヤー {layerIndex} のデータが見つかりません。</div>
                                                );
                                            })
                                        ) : (
                                            null
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className='grid grid-cols-3 gap-4 items-start'>
                            <PracticeMenu
                                practice={practice}
                                handlePracticeSelect={onPracticeSelect}
                            />
                            <div className="col-span-2">
                                {/* 練習モード未選択時の右側エリア */}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                 <div className='grid grid-cols-2 gap-4'>
                     {layers.map((layer: string[], li: number) => {
                        return (
                            <div key={li} className="justify-self-center">
                                <KeyboardLayout
                                    layerData={layer}
                                    layoutIndex={li}
                                    layoutTitle={layerNames[li] ?? `レイヤー ${li}`}
                                    cols={cols}
                                    fixedWidth={fixedWidth}
                                    showKeyLabels={true}
                                    lastInvalidKeyCode={null}
                                    activePractice={null}
                                    practice={''}
                                    currentFunctionKeyMap={{}}
                                    training={training}
                                />
                            </div>
                        );
                     })}
                 </div>
            )}
        </div>
    );
};

export default AppLayout;
