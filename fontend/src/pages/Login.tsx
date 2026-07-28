import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "../config/Apis";
import axios from "axios";
import { useUser } from "../hooks";
import { fetchWithAuth } from "../utils/ApiHelper";

export default function LoginForm() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", captcha: "" });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        username: form.username,
        password: form.password,
        client_id: import.meta.env.VITE_CLIENT_ID_APP,
        client_secret: import.meta.env.VITE_CLIENT_SECRET_APP,
        grant_type: "password",
      };

      console.log(body)

      const authUrl = import.meta.env.VITE_AUTH_URL || "http://127.0.0.1:8000";
      const res = await axios.post(
        `${authUrl}/o/token/`,
        body,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.status === 200) {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);

        await fetchWithAuth(
          endpoints.profile,
          (data: any) => setUser(data),
          (onError: any) => alert(onError)
        );
        navigate("/");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      console.error("Error status:", err.response?.status);
      console.error("Error message:", err.message);

      const message =
        err.response?.data?.detail ||
        err.response?.data?.error_description ||
        err.response?.data?.error ||
        err.message ||
        "Đăng nhập thất bại.";

      alert(message);
      console.log(message)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 antialiased relative overflow-hidden bg-gradient-to-br from-[#f0f4ff] via-white to-[#e8f0fe]">
      {/* Decorative blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl pointer-events-none"></div>

      <main className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-gray-200/60 relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(12,86,208,0.18),0_10px_25px_-10px_rgba(0,0,0,0.08)]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary mb-4 shadow-[0_8px_20px_-6px_rgba(12,86,208,0.25)] ring-1 ring-primary/10">
              <i className="fa-solid fa-graduation-cap text-3xl"></i>
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold tracking-tight text-primary mb-1.5">
              Đăng nhập
            </h1>
            <p className="text-sm text-textMuted">Thesis Portal - Hệ thống quản lý đồ án</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium text-textMain">
                Tên đăng nhập / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-regular fa-user text-sm"></i>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Nhập tài khoản của bạn"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-textMain">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-lock text-sm"></i>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-textMain transition-colors cursor-pointer"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <i className={`fa-regular ${showPassword ? "fa-eye" : "fa-eye-slash"} text-sm`}></i>
                </button>
              </div>
            </div>

            

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="peer appearance-none w-4 h-4 border border-gray-300 rounded checked:bg-primary checked:border-primary cursor-pointer transition-all"
                  />
                  <i className="fa-solid fa-check text-[10px] text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"></i>
                </div>
                <span className="text-sm text-textMuted group-hover:text-textMain transition-colors">Ghi nhớ đăng nhập</span>
              </label>
              <a className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer" href="#">
                Quên mật khẩu?
              </a>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white font-medium text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] shadow-[0_12px_24px_-8px_rgba(12,86,208,0.45)]"
              >
                {loading ? (
                  <i className="fa-solid fa-circle-notch text-sm animate-spin"></i>
                ) : (
                  <i className="fa-solid fa-right-to-bracket text-sm"></i>
                )}
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-center gap-4">
            <a className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors cursor-pointer" href="#">
              <i className="fa-regular fa-headset text-xs"></i>
              Hỗ trợ kỹ thuật
            </a>
            <span className="text-gray-300">|</span>
            <a className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors cursor-pointer" href="#">
              <i className="fa-regular fa-circle-question text-xs"></i>
              Trung tâm trợ giúp
            </a>
          </div>
        </div>

        <div className="text-center mt-5">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/60 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500"></span>
            </span>
            <span className="text-xs text-textMuted">Hệ thống hoạt động bình thường</span>
          </div>
        </div>
      </main>
    </div>
  );
}
