"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import "@/styles/globals.css";

export default function LaporanPage() {
  // State untuk data pembayaran, error, dan router
  const [pembayaran, setPembayaran] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data kop surat
  const kopSurat = {
    nama: "PONDOK PESANTREN DELIMA TJR CANGKRENG",
    arab: "المعْهد الدّيْنى دليْما تنْجُنا رَجاء",
    yayasan: "YAYASAN DELIMA TANJUNG REJO",
    sk: "Nomor SK. KEMENKUMHAM : AHU-0008815.AH.01.04.Tahun 2023",
    alamat: "Sekretariat : Jl. Cangkreng, Dusun Utara Pasar – Desa Mangaran – Kec. Mangaran – Situbondo (68363)",
  };

  // Fetch data pembayaran berdasarkan id_pendaftaran
  useEffect(() => {
    const fetchPembayaran = async () => {
      const id = searchParams.get("id");
      if (!id) {
        setLoading(false);
        setError("ID pendaftaran tidak ditemukan");
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5002/api/pembayaran/pendaftaran/${id}`
        );
        if (!response.ok) {
          throw new Error("Gagal mengambil data pembayaran");
        }
        const result = await response.json();
        setPembayaran(result.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPembayaran();
  }, [searchParams]);

  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (loading) return <div className="p-6">Memuat data pembayaran...</div>;
  if (!pembayaran) return <div className="p-6">Data pembayaran tidak ditemukan</div>;

  // Fungsi tombol cetak
  const handlePrint = () => {
    window.print();
  };

  // Fungsi tombol kembali
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/PublicWeb/pembayaran");
    }
  };

  // TAMBAHKAN FUNCTION INI DI DALAM COMPONENT
// letakkan di atas: if (error) { ... }

  const formatTanggal = (tanggal) => {
    if (!tanggal) return "-";

    try {
      return new Date(tanggal).toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
    } catch {
      return tanggal;
    }
  };

  return (
    <div className="report-page-wrapper">
      <div className="no-print fixed top-6 right-6 z-50 flex flex-col gap-3">
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Kembali</span>
        </button>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span className="font-medium">Cetak</span>
        </button>
      </div>

      <div className="a4-page">
        <div className="kop-surat-wrapper relative">
          <div className="logo-container absolute -left-12 -top-4 w-36 h-36 z-0">
            <Image
              src="/images/IllustratorLoading.png"
              alt="logo"
              fill
              className="object-contain"
            />
          </div>

          <div className="relative z-10 kop-surat">
            <div className="flex items-center justify-between">
              <div className="w-24 flex-shrink-0"></div>

              <div className="text-center flex-1 leading-tight">
                <h1 className="nama-pondok">
                  {kopSurat.nama}
                </h1>

                <p className="arabic-name">
                  {kopSurat.arab}
                </p>

                <p className="yayasan">
                  {`"${kopSurat.yayasan}"`}
                </p>

                <p className="sk-kemenkumham mt-1">
                  {kopSurat.sk}
                </p>

                <p className="sekretariat1">
                  {kopSurat.alamat}
                </p>
              </div>

              <div className="w-24 flex-shrink-0"></div>
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <h2 className="font-bold text-lg">
            BUKTI PEMBAYARAN PENDAFTARAN SANTRI BARU
          </h2>
          <p className="font-semibold text-base text-gray-800">
            Tahun Ajaran 2026/2027
          </p>
        </div>

        {/* Rincian Pembayaran */}
        <div className="mb-6">
          <h3 className="font-bold text-base mb-3 pb-2">
            RINCIAN PEMBAYARAN
          </h3>
          <table className="space-y-2 ">
            <tbody className="text-sm">
              <tr>
                <td className="font-semibold w-1/4">Nama Lengkap</td>
                <td className="pl-2">: {pembayaran.nama_lengkap || "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold">Jenis Kelamin</td>
                <td className="pl-2">: {pembayaran.jenis_kelamin || "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold">Email</td>
                <td className="pl-2">: {pembayaran.email || "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold">Metode Pembayaran</td>
                <td className="pl-2">: {pembayaran.metode_pembayaran || "Transfer Bank"}</td>
              </tr>
              <tr>
                <td className="font-semibold">Status</td>
                <td className="pl-2">: {pembayaran.status_pembayaran || "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold">Waktu Pembayaran</td>
                <td className="pl-2">: {formatTanggal(pembayaran.created_at)}</td>
              </tr>
              <tr>
                <td className="font-semibold">Nominal</td>
                <td className="pl-2">: {pembayaran.nominal || "500.000"}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}