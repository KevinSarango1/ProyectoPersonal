import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: number;
}

export const SuccessAlert: React.FC<Props> = ({ isOpen, title, message, onClose, autoClose = 3000 }) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const t = setTimeout(onClose, autoClose);
      return () => clearTimeout(t);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-100 border-2 border-green-400 rounded-2xl p-6 shadow-xl max-w-sm">
      <p className="font-bold text-green-900">{title}</p>
      <p className="text-green-700 text-sm mt-1">{message}</p>
    </div>
  );
};
