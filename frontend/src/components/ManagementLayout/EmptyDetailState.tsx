interface EmptyDetailStateProps {
  icon?: string;
  mainText?: string;
  subText?: string;
}

export default function EmptyDetailState({
  icon = 'fa-regular fa-hand-pointer',
  mainText = 'Chọn một mục từ danh sách bên trái',
  subText = 'hoặc bấm "Tạo mới" để thêm',
}: EmptyDetailStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <i className={`${icon} text-5xl mb-4`}></i>
      <p className="text-sm font-medium">{mainText}</p>
      {subText && <p className="text-xs text-gray-300 mt-1">{subText}</p>}
    </div>
  );
}
