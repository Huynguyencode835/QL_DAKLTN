import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import Modal from "../components/Ui/Modal";
import type { ModalSize } from "../types";

interface ModalState {
  open: boolean;
  title: string;
  children: ReactNode | null;
  size: ModalSize;
  description: string;
  icon: string;
  content: ReactNode | null;
  footer: ReactNode | null;
}

export interface ModalContextType {
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
}

export interface ModalConfig {
  title?: string;
  description?: string;
  icon?: string;
  content?: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
}

export const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: "",
    children: null,
    size: "md",
    description: "",
    icon: "",
    content: null,
    footer: null,
  });

  const openModal = useCallback(({ title, description, icon, content, size = "md", footer }: ModalConfig) => {
    setModal({ open: true, title, description, icon, content, size, footer, children: null });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false, title: "", children: null, size: "md", description: "", icon: "", content: null, footer: null });
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.title}
        description={modal.description}
        icon={modal.icon}
        size={modal.size}
        footer={modal.footer}
      >
        {modal.content}
      </Modal>
    </ModalContext.Provider>
  );
}
