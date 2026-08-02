export default function Home() {
    return (
        <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="bg-primary text-white rounded-core p-3 px-5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-exclamation text-yellow-300"></i>
                        <p className=""><span className="font-bold">THÔNG BÁO QUAN TRỌNG:</span> Hạn nộp báo cáo cuối kỳ: 20/07/2025 — Sinh viên vui lòng hoàn thành trước thời hạn.</p>
                    </div>
                    <button className="bg-white text-primary px-4 py-1.5 rounded-core font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2">
                        NỘP NGAY <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-6">
                        <section className="card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800 text-base uppercase">Tiến trình luận văn</h3>
                                <span className="text-xs text-gray-500">Học kỳ 2 - 2024-2025</span>
                            </div>
                            <div className="relative flex justify-between px-10 text-center">
                                <div className="absolute top-5 left-16 right-16 h-1 bg-gray-200 z-0">
                                    <div className="h-full bg-primary w-[33%] rounded-full"></div>
                                </div>
                                <div className="stepper-step flex flex-col items-center gap-2 relative z-10 w-24">
                                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center border-4 border-white shadow-sm">
                                        <i className="fa-solid fa-check"></i>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-primary text-sm">ĐĂNG KÝ</div>
                                        <div className="text-[10px] text-gray-400">Registration</div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium mt-1 flex items-center gap-1">
                                        <i className="fa-solid fa-circle text-[6px]"></i> Hoàn thành
                                    </span>
                                </div>
                                <div className="stepper-step flex flex-col items-center gap-2 relative z-10 w-24">
                                    <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center border-4 border-white shadow-sm ring-2 ring-yellow-400 ring-offset-1">
                                        <i className="fa-regular fa-file-lines"></i>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-yellow-600 text-sm">NỘP BÁO CÁO</div>
                                        <div className="text-[10px] text-gray-400">Submission</div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-full text-[10px] font-medium mt-1 flex items-center gap-1">
                                        <i className="fa-solid fa-circle text-[6px] animate-pulse"></i> Đang thực hiện
                                    </span>
                                </div>
                                <div className="stepper-step flex flex-col items-center gap-2 relative z-10 w-24">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border-4 border-white shadow-sm">
                                        <i className="fa-regular fa-circle-question"></i>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-400 text-sm">ĐÁNH GIÁ</div>
                                        <div className="text-[10px] text-gray-300">Evaluation</div>
                                    </div>
                                    <span className="px-2 py-0.5 text-gray-400 rounded-full text-[10px] font-medium mt-1 flex items-center gap-1">
                                        <i className="fa-regular fa-circle text-[6px]"></i> Chờ xử lý
                                    </span>
                                </div>
                                <div className="stepper-step flex flex-col items-center gap-2 relative z-10 w-24">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border-4 border-white shadow-sm">
                                        <i className="fa-regular fa-circle-question"></i>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-400 text-sm">KẾT QUẢ</div>
                                        <div className="text-[10px] text-gray-300">Results</div>
                                    </div>
                                    <span className="px-2 py-0.5 text-gray-400 rounded-full text-[10px] font-medium mt-1 flex items-center gap-1">
                                        <i className="fa-regular fa-circle text-[6px]"></i> Chờ xử lý
                                    </span>
                                </div>
                            </div>
                        </section>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                    <i className="fa-regular fa-calendar text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">SỐ NGÀY CÒN LẠI</div>
                                    <div className="text-2xl font-bold text-gray-800 leading-none">14</div>
                                    <div className="text-[10px] text-gray-400 mt-1">Đến hạn nộp</div>
                                </div>
                            </div>
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                                    <i className="fa-regular fa-file-check text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">BÁO CÁO ĐÃ NỘP</div>
                                    <div className="text-2xl font-bold text-gray-800 leading-none">3/5</div>
                                    <div className="text-[10px] text-green-500 mt-1 font-medium">Đúng tiến độ</div>
                                </div>
                            </div>
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                                    <i className="fa-regular fa-user-tie text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">GVHD</div>
                                    <div className="text-sm font-bold text-gray-800 leading-tight">TS. Trần Văn B</div>
                                    <div className="text-[10px] text-purple-500 mt-1 font-medium">Đã xác nhận</div>
                                </div>
                            </div>
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                    <i className="fa-regular fa-bell text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">THÔNG BÁO MỚI</div>
                                    <div className="text-2xl font-bold text-gray-800 leading-none">3</div>
                                    <div className="text-[10px] text-orange-500 mt-1 font-medium">Chưa đọc</div>
                                </div>
                            </div>
                        </div>
                        <section>
                            <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase">Lối tắt</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <button className="card p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow group">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                        <i className="fa-solid fa-file-arrow-up text-xl"></i>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-800 text-sm">Nộp Báo Cáo</div>
                                        <div className="text-[10px] text-gray-400">Submit report</div>
                                    </div>
                                </button>
                                <button className="card p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow group">
                                    <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                        <i className="fa-solid fa-user-plus text-xl"></i>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-800 text-sm">Đăng ký GVHD</div>
                                        <div className="text-[10px] text-gray-400">Register advisor</div>
                                    </div>
                                </button>
                                <button className="card p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow group">
                                    <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                                        <i className="fa-regular fa-star text-xl"></i>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-800 text-sm">Xem Điểm</div>
                                        <div className="text-[10px] text-gray-400">View grades</div>
                                    </div>
                                </button>
                                <button className="card p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow group">
                                    <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                                        <i className="fa-solid fa-clock-rotate-left text-xl"></i>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-800 text-sm">Báo cáo định kỳ</div>
                                        <div className="text-[10px] text-gray-400">Periodic report</div>
                                    </div>
                                </button>
                            </div>
                        </section>
                        <section className="card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-base uppercase">Tiến độ nộp báo cáo</h3>
                                    <div className="text-xs text-gray-500 mt-1">Các mốc báo cáo định kỳ</div>
                                </div>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">3/5 Hoàn thành</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <i className="fa-solid fa-check text-xs"></i>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="font-medium text-gray-800 text-sm">Báo cáo lần 1 - Đề cương nghiên cứu</h4>
                                            <span className="text-xs font-medium text-green-600">Đã duyệt</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Nộp ngày: 10/03/2025</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <i className="fa-solid fa-check text-xs"></i>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="font-medium text-gray-800 text-sm">Báo cáo lần 2 - Cơ sở lý thuyết</h4>
                                            <span className="text-xs font-medium text-green-600">Đã duyệt</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Nộp ngày: 15/04/2025</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <i className="fa-solid fa-check text-xs"></i>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="font-medium text-gray-800 text-sm">Báo cáo lần 3 - Phương pháp nghiên cứu</h4>
                                            <span className="text-xs font-medium text-yellow-600">Chờ duyệt</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Nộp ngày: 20/05/2025</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50">
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="font-medium text-gray-800 text-sm">Báo cáo lần 4 - Kết quả thực nghiệm</h4>
                                            <span className="text-xs font-medium text-gray-500">Chưa nộp</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Hạn nộp: 30/06/2025</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 rounded-lg border border-red-100 bg-red-50/30">
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5 bg-white">
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="font-medium text-gray-800 text-sm">Báo cáo lần 5 - Luận văn hoàn chỉnh</h4>
                                            <span className="text-xs font-medium text-red-500">Sắp đến hạn</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Hạn nộp: 20/07/2025</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-gray-500 font-medium">Tiến độ tổng thể</span>
                                    <span className="font-bold text-primary">60%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full w-[60%]"></div>
                                </div>
                            </div>
                        </section>
                    </div>
                    <div className="w-80 shrink-0 space-y-6">
                        <section className="card p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <i className="fa-solid fa-graduation-cap text-6xl text-primary"></i>
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="font-bold text-gray-800 text-sm uppercase">Thông tin đề tài</h3>
                                <button className="text-gray-400 hover:text-primary"><i className="fa-regular fa-circle-question"></i></button>
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <div className="text-[10px] text-gray-500 font-semibold uppercase mb-1">TÊN ĐỀ TÀI</div>
                                    <div className="text-sm font-medium text-gray-800 leading-snug">Xây dựng hệ thống quản lý luận văn tốt nghiệp dựa trên nền tảng Web</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-gray-500 font-semibold uppercase mb-1">GVHD</div>
                                        <div className="text-xs font-medium text-gray-800">TS. Trần Văn B</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 font-semibold uppercase mb-1">KHOA</div>
                                        <div className="text-xs font-medium text-gray-800">CNTT</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 font-semibold uppercase mb-1">HỌC KỲ</div>
                                        <div className="text-xs font-medium text-gray-800">HK2 2024-25</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 font-semibold uppercase mb-1">TRẠNG THÁI</div>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold flex inline-flex items-center gap-1 w-fit">
                                            <i className="fa-solid fa-circle text-[6px]"></i> Đã duyệt
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="text-[10px] text-gray-500 font-semibold uppercase mb-1">MÃ ĐỀ TÀI</div>
                                    <div className="inline-flex px-3 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-primary font-bold">
                                        #KL-2025-0047
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="card p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 text-sm uppercase">Thông báo</h3>
                                <a className="text-xs text-primary hover:underline" href="#">Xem tất cả</a>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 border border-blue-100 bg-blue-50/50 rounded-lg flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <i className="fa-regular fa-bell text-xs"></i>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-800 font-medium leading-tight mb-1">Nhắc nhở: Hạn nộp báo cáo lần 4 còn 14 ngày</p>
                                        <p className="text-[10px] text-gray-500">2 giờ trước</p>
                                    </div>
                                </div>
                                <div className="p-3 border border-green-100 bg-green-50/50 rounded-lg flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <i className="fa-solid fa-check text-xs"></i>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-800 font-medium leading-tight mb-1">Báo cáo lần 3 đã được GVHD xem xét</p>
                                        <p className="text-[10px] text-gray-500">1 ngày trước</p>
                                    </div>
                                </div>
                                <div className="p-3 border border-yellow-100 bg-yellow-50/50 rounded-lg flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <i className="fa-regular fa-calendar text-xs"></i>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-800 font-medium leading-tight mb-1">Cập nhật lịch họp hội đồng phản biện tháng 7</p>
                                        <p className="text-[10px] text-gray-500">3 ngày trước</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="card p-5">
                            <h3 className="font-bold text-gray-800 text-sm mb-4 uppercase">Hành động nhanh</h3>
                            <div className="space-y-2">
                                <button className="w-full py-2.5 px-4 bg-primary text-white rounded-core text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                    <i className="fa-regular fa-paper-plane"></i> Nộp báo cáo mới
                                </button>
                                <button className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-core text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-pen-to-square"></i> Yêu cầu đổi tên đề tài
                                </button>
                                <button className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-core text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                    <i className="fa-regular fa-comment-dots"></i> Liên hệ GVHD
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
