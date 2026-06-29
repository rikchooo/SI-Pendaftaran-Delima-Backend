'use client';

import Image from 'next/image';
import "@/styles/globals.css";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiEye, HiEyeOff } from 'react-icons/hi';

export default function RegisterPage() {
  // State untuk form, error, loading, dan show password
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Handle perubahan input form
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Mohon lengkapi semua field');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

  // Kirim data ke backend
    try {
      const res = await fetch('http://localhost:5002/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registrasi gagal');
        setLoading(false);
        return;
      }

      alert('Registrasi berhasil! Silakan login.');
      router.push('/PublicWeb/login');
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 mt-10">
        <div className="flex justify-center">
          <Image
            src="/images/IllustratorLoading.png"
            alt="Logo Ponpes"
            width={150}
            height={150}
          />
        </div>

        <h1 className="text-2xl font-medium font-sans text-center mb-6">
          Daftarkan Akun Anda
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="full_name"
              placeholder="Masukkan nama lengkap"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="Masukkan email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all duration-200"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Daftar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Sudah punya akun?{' '}
          <a href="/PublicWeb/login" className="text-green-700 font-semibold">
            Masuk
          </a>
        </p>
      </div>
    </div>
  );
}
