import Modal from './Modal';
import Button from './Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  icon?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  icon = 'fa-solid fa-circle-question',
  confirmLabel = 'Xác nhận',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
