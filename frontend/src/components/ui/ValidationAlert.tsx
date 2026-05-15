import React from 'react';

interface Props {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export const ValidationAlert: React.FC<Props> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <p className="font-bold text-red-700 mb-2">Error de validación</p>
        <p className="text-gray-700 mb-6">{message}</p>
        <button onClick={onClose} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold">
          Entendido
        </button>
      </div>
    </div>
  );
};
