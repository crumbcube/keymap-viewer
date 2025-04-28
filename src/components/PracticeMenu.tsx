// src/components/PracticeMenu.tsx
import React from 'react';
import { PracticeMode } from '../hooks/usePracticeCommons';
import { basicPracticeMenuItems, stepUpPracticeMenuItems } from '../data/keymapData';

interface PracticeMenuProps {
  practice: PracticeMode;
  handlePracticeSelect: (item: PracticeMode) => void;
}

const PracticeMenu: React.FC<PracticeMenuProps> = ({ practice, handlePracticeSelect }) => {
  return (
    <div>
      <h2 className='text-lg font-semibold mb-2'>基本練習メニュー</h2>
      <ul>
        {basicPracticeMenuItems.map(item => (
          <li key={item}
              className={`cursor-pointer p-2 border-b hover:bg-gray-200 ${item === practice ? 'bg-gray-300' : ''}`}
              onClick={() => handlePracticeSelect(item as PracticeMode)}
          >
            {item}
          </li>
        ))}
      </ul>
      <h2 className='text-lg font-semibold mt-4 mb-2'>ステップアップメニュー</h2>
      <ul>
        {stepUpPracticeMenuItems.map(item => (
          <li key={item}
              className={`cursor-pointer p-2 border-b hover:bg-gray-200 ${item === practice ? 'bg-gray-300' : ''}`}
              onClick={() => handlePracticeSelect(item as PracticeMode)}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PracticeMenu;
