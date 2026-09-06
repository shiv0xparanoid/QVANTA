import * as React from "react";
import * as ReactDOM from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  overlayClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className = "",
  overlayClassName = ""
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClassName}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border border-bg-800 bg-bg-900 text-text-100 shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-bg-800 p-6">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-text-50"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-text-400 transition-colors hover:bg-bg-800 hover:text-text-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Close modal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className={title ? "p-6" : "p-6 rounded-2xl"}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

Modal.displayName = "Modal";

export { Modal };
export type { ModalProps };
