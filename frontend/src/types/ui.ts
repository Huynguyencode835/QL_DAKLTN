import type { ReactNode, ElementType } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type CardVariant = 'soft' | 'elevated' | 'outline';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: any) => void;
  [key: string]: any;
}

export interface CardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: string;
  actions?: ReactNode;
  variant?: CardVariant;
  className?: string;
  bodyClassName?: string;
  as?: ElementType;
}

export interface SectionCardProps {
  children: ReactNode;
  title?: string;
  icon?: string;
  className?: string;
}

export interface InputProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  leadingIcon?: string;
  trailingIcon?: string;
  suffix?: string;
  className?: string;
  id?: string;
  value?: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  placeholder?: string;
  [key: string]: any;
}

export interface SelectProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  className?: string;
  id?: string;
  value?: string;
  onChange?: (e: any) => void;
  [key: string]: any;
}

export interface DropdownOption {
  value: any;
  label: string;
  description?: string;
  avatarText?: string;
}

export interface DropdownProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: DropdownOption[];
  value?: any;
  onChange?: (value: any) => void;
  className?: string;
  disabled?: boolean;
}

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  icon?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  className?: string;
}

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export interface ChoiceCardProps {
  checked?: boolean;
  icon?: string;
  label: string;
  description?: string;
  name?: string;
  onChange?: (e: any) => void;
  value?: string;
  disabled?: boolean;
}

export interface CheckboxProps {
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (e: any) => void;
  disabled?: boolean;
  id?: string;
}

export interface ToggleProps {
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}
