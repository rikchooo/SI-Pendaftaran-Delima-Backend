"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PrivateHeader from "@/components/PrivateHeader";

export default function InputNilaiPage() {
  // State untuk data santri, loading, error, submitting, dan form data
  const [santri, setSantri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nilaiAlquran: "",
    nilaiKitab: "",
    quranLevel: "",
    kitabLevel: "",
    catatan: "",
  });
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Cek session dan fetch data santri
    const fetchData = async () => {
      try {
        const session = localStorage.getItem("private_session");
        if (!session) {
          router.replace("/PrivateWeb/login");
          return;
        }

        const parsed = JSON.parse(session);
        if (parsed.role !== "penguji") {
          router.replace("/PrivateWeb/login");
          return;
        }

        const response = await fetch(`http://localhost:5002/api/pendaftaran/santri/${params.id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Gagal memuat data santri');
        }

        const result = await response.json();
        const data = result.data;
        
        setSantri({
          id: data.id_pendaftaran,
          namaLengkap: data.nama_lengkap,
          namaPanggilan: data.nama_panggilan,
          email: data.email,
          jenisKelamin: data.jenis_kelamin,
          tempatLahir: data.tempat_lahir,
          tanggalLahir: data.tanggal_lahir,
          pendidikanTerakhir: data.pendidikan_terakhir,
          alamatSantri: data.alamat_santri,
          namaAyah: data.nama_ayah,
          namaIbu: data.nama_ibu,
          telpAyah: data.telp_ayah,
          telpIbu: data.telp_ibu,
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // State fungsi validasi form
  const validateForm = () => {
    if (!formData.nilaiAlquran || !formData.nilaiKitab) {
      alert("Nilai Al-Quran dan Kitab Kuning harus diisi");
      return false;
    }
    
    const alquran = parseFloat(formData.nilaiAlquran);
    const kitab = parseFloat(formData.nilaiKitab);
    
    if (alquran < 0 || alquran > 100 || kitab < 0 || kitab > 100) {
      alert("Nilai harus antara 0-100");
      return false;
    }
    
    return true;
  };

  // Handle form submit
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setSubmitting(true);
  try {
    const response = await fetch(`http://localhost:5002/api/pengujian/santri/${params.id}/nilai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nilai_alquran: parseFloat(formData.nilaiAlquran),
        nilai_kitab: parseFloat(formData.nilaiKitab),
        level_alquran: formData.quranLevel,
        level_kitab: formData.kitabLevel,
        catatan: formData.catatan,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Gagal menyimpan nilai');
    }

    const result = await response.json();
    
    // ✅ Tampilkan notifikasi sukses
    alert("✅ Nilai berhasil disimpan!");
    
    // ✅ Kembali ke halaman sebelumnya (bukan login)
    router.back();
    
  } catch (err) {
    console.error('Error submitting nilai:', err);
    alert(`❌ Gagal menyimpan nilai: ${err.message}`);
  } finally {
    setSubmitting(false);
  }
};

  // Handle tombol kembali
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/PrivateWeb/penguji");
    }
  };


  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <PrivateHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-bold text-xl mb-2">Terjadi Kesalahan</p>
            <p className="text-gray-600 text-sm mt-1 mb-6">{error}</p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <PrivateHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-700 hover:text-green-600 mb-6 transition-colors"
          >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
            <span className="font-semibold text-base sm:text-lg">Kembali</span>
          </button>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Input Nilai Tes</h1>
                <p className="text-gray-600 text-lg">Santri: <span className="font-semibold">{santri?.namaLengkap}</span></p>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data Santri */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Santri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nama Lengkap</p>
                  <p className="font-medium text-gray-900">{santri?.namaLengkap}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nama Panggilan</p>
                  <p className="font-medium text-gray-900">{santri?.namaPanggilan || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-gray-900">{santri?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">No. Telepon</p>
                  <p className="font-medium text-gray-900">{santri?.telpAyah || santri?.telpIbu || '-'}</p>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Nilai Al-Quran</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nilai Al-Quran (0-100)
                  </label>
                  <input
                    type="number"
                    name="nilaiAlquran"
                    value={formData.nilaiAlquran}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                    placeholder="Masukkan nilai"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nilai harus antara 0-100</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level Al-Quran
                  </label>
                  <select
                    name="quranLevel"
                    value={formData.quranLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                  >
                    <option value="">Pilih Level</option>
                    <option value="pemula">Pemula (Baru Belajar)</option>
                    <option value="dasar">Dasar (Bisa Iqro`)</option>
                    <option value="menengah">Menengah (Bisa Baca Al-Quran)</option>
                    <option value="lanjut">Lanjut (Tahsin/Tahfidz)</option>
                    <option value="mahir">Mahir (Hafalan Juz 30+)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Nilai Kitab Kuning</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nilai Kitab Kuning (0-100)
                  </label>
                  <input
                    type="number"
                    name="nilaiKitab"
                    value={formData.nilaiKitab}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                    placeholder="Masukkan nilai"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nilai harus antara 0-100</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level Kitab Kuning
                  </label>
                  <select
                    name="kitabLevel"
                    value={formData.kitabLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                  >
                    <option value="">Pilih Level</option>
                    <option value="pemula">Pemula (Belum Pernah)</option>
                    <option value="dasar">Dasar (Baru Mulai)</option>
                    <option value="menengah">Menengah (Sudah Paham Dasar)</option>
                    <option value="lanjut">Lanjut (Bisa Membaca Lancar)</option>
                    <option value="mahir">Mahir (Menguasai Beberapa Kitab)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan / Komentar (Opsional)
              </label>
              <textarea
                name="catatan"
                value={formData.catatan}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition resize-none"
                placeholder="Tambahkan catatan atau komentar untuk santri ini..."
              />
              <p className="text-xs text-gray-500 mt-1">Contoh: Perlu pembinaan khusus di bidang tahsin, Sangat berbakat di bidang kitab kuning, dll.</p>
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Nilai
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}