"use client";

import Image from "next/image";
import '@/styles/globals.css';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiEyeOff, HiUserGroup, HiPencilAlt, HiUserCircle, HiChevronDown } from "react-icons/hi";

export default function LoginPage() {
  // State untuk form, error, loading, show password, role dropdown
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showRole, setShowRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Daftar role yang tersedia
  const roles = [
    { key: "admin", label: "Panitia" },
    { key: "penguji", label: "Penguji" },
    { key: "pengasuh", label: "Pengasuh" },
  ];

  // Fungsi untuk mendapatkan teks yang ditampilkan pada dropdown berdasarkan role yang dipilih
  const getRoleDisplayText = () => {
    if (!role) return "Pilih Sesuai Role";
    const selectedRole = roles.find((r) => r.key === role);
    return selectedRole ? selectedRole.label : "Pilih Sesuai Role";
  };

  // Handle submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !email.includes("@")) {
      setError("Email tidak valid");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Password tidak boleh kosong");
      setLoading(false);
      return;
    }

    if (!role) {
      setError("Silakan pilih role terlebih dahulu");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5002/api/private/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        setLoading(false);
        return;
      }

      // Simpan session dan user ke localStorage
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("private_session", JSON.stringify(data.user));
      localStorage.setItem("private_user", JSON.stringify(data.user));

      router.push(`/PrivateWeb/${role}`);
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-10 sm:pt-16 md:items-center md:pt-0">
      <div className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/images/IllustratorLoading.png"
              alt="Logo Pondok"
              width={150}
              height={150}
              priority
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan Email Sesuai Role"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <HiEyeOff className="w-5 h-5" />
                ) : (
                  <HiEye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Role
            </label>

            <button
              type="button"
              onClick={() => setShowRole(!showRole)}
              className={`w-full px-4 py-3 border rounded-xl flex justify-between items-center ${
                role
                  ? "border-gray-300 hover:border-green-500"
                  : "border-green-300 bg-green-50 hover:border-green-400"
              }`}
            >
              <span
                className={`${role ? "text-gray-900" : "text-gray-500 italic"}`}
              >
                {getRoleDisplayText()}
              </span>
              <HiChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRole ? 'rotate-180' : ''}`} />
            </button>

            {showRole && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-md">
                {roles.map((r) => (
                  <div
                    key={r.key}
                    onClick={() => {
                      setRole(r.key);
                      setShowRole(false);
                    }}
                    className={`px-4 py-3 cursor-pointer hover:bg-green-50 flex items-center gap-3 ${
                      role === r.key
                        ? "bg-green-100 font-medium text-green-800"
                        : "text-gray-700"
                    }`}
                  >
                    {r.key === 'admin' && <HiUserGroup className="w-5 h-5" />}
                    {r.key === 'penguji' && <HiPencilAlt className="w-5 h-5" />}
                    {r.key === 'pengasuh' && <HiUserCircle className="w-5 h-5" />}
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-600 transition flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Loading..." : "Login"}
          </button>

          <div className="mt-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed">
            <span className="font-medium text-gray-700">Catatan Penting:</span>
            <br />
            Pastikan <span className="text-green-700 font-semibold">Email</span>, <span className="text-green-700 font-semibold">Password</span> dan <span className="text-green-700 font-semibold">Role</span> sudah benar.
          </div>
        </form>
      </div>
    </div>
  );
}
