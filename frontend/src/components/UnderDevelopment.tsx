export default function UnderDevelopment() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Tính năng đang phát triển
            </h2>
            <p className="text-gray-500 max-w-md">
                Chức năng này hiện đang được xây dựng. Vui lòng quay lại sau!
            </p>
        </div>
    );
}