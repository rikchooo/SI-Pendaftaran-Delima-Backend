"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PrivateHeader from "@/components/PrivateHeader";
import {
  HiUserGroup,
  HiCheckCircle,
  HiCurrencyDollar,
  HiInbox,
} from "react-icons/hi";
import "@/styles/globals.css";

export default function PengasuhDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [santri, setSantri] = useState([]);
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = localStorage.getItem("private_session");
        if (!session) {
          router.replace("/PrivateWeb/login");
          return;
        }

        const parsed = JSON.parse(session);
        if (parsed.role !== "pengasuh") {
          router.replace("/PrivateWeb/login");
          return;
        }

        const regResponse = await fetch(
          "http://localhost:5002/api/pendaftaran/santri",
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        if (!regResponse.ok)
          throw new Error("Failed to fetch registration data");
        const regResult = await regResponse.json();

        const payResponse = await fetch(
          "http://localhost:5002/api/pembayaran",
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        if (!payResponse.ok) throw new Error("Failed to fetch payment data");
        const payResult = await payResponse.json();

        const allRegistrations = regResult.data || [];
        const allPayments = payResult.data || [];

        const mappedData = allRegistrations.map((item) => {
          const payment = allPayments.find(
            (p) =>
              p.id_pendaftaran &&
              item.id_pendaftaran &&
              p.id_pendaftaran.toString() === item.id_pendaftaran.toString(),
          );

          return {
            id: item.id_pendaftaran,
            name: item.nama_lengkap,
            email: item.email,
            phone: item.telp_ayah || item.telp_ibu || "-",
            school: item.pendidikan_terakhir || "-",
            parentName: item.nama_ayah || item.nama_ibu || "-",
            parentPhone: item.telp_ayah || item.telp_ibu || "-",
            parentAyah: item.nama_ayah || "-",
            parentIbu: item.nama_ibu || "-",
            parentAyahPhone: item.telp_ayah || "-",
            parentIbuPhone: item.telp_ibu || "-",
            address: item.alamat_santri || "-",
            status: item.status,
            acceptedDate: item.created_at,
            room: "-",
            dormitory: "-",
            paymentStatus: payment?.status_pembayaran || "belum",
            paymentAmount: payment?.nominal ? parseInt(payment.nominal) : 0,
            paymentDate: payment?.created_at || null,
            quranLevel: "-",
            kitabLevel: "-",
            recommendedClass: "-",
            createdAt: item.created_at ? new Date(item.created_at) : new Date(),
          };
        });

        mappedData.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );

        setSantri(mappedData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredSantri = Array.isArray(santri)
    ? santri.filter((s) => {
        const matchesSearch =
          (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.phone || "").includes(searchTerm) ||
          (s.parentName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (s.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.school || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "sudah" &&
            (s.status === "accepted" || s.status === "completed")) ||
          (filterStatus === "belum" &&
            s.status !== "accepted" &&
            s.status !== "completed");

        return matchesSearch && matchesStatus;
      })
    : [];

  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredSantri.length / itemsPerPage);
  const paginatedSantri = filteredSantri.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalSantri = Array.isArray(santri) ? santri.length : 0;
  const sudahSantri = Array.isArray(santri)
    ? santri.filter((s) => s.status === "accepted" || s.status === "completed")
        .length
    : 0;
  const sudahBayar = Array.isArray(santri)
    ? santri.filter((s) => s.paymentStatus === "lunas").length
    : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <PrivateHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-red-600 font-bold text-xl mb-2">
              Terjadi Kesalahan
            </p>
            <p className="text-gray-600 text-sm mt-1 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
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
    <div className="min-h-screen bg-white">
      <PrivateHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section aria-labelledby="stats-heading" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Pendaftaran Santri Baru
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {totalSantri}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total pendaftar</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <HiUserGroup className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Pembayaran Santri Baru
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {sudahBayar}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Sudah bayar</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <HiCurrencyDollar className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Nilai Ujian Santri Baru
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sudahSantri}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Santri sudah diuji
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <HiCheckCircle className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Aktivitas Pendaftaran Santri Baru
              </h3>
            </div>
            {paginatedSantri.length === 0 ? (
              <div className="text-center py-12">
                <HiInbox className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Tidak ada aktivitas
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Belum ada pendaftaran santri baru
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {paginatedSantri.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <HiCheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {s.name}
                            </p>
                            <p className="text-sm text-gray-500">{s.address}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString("id-ID")
                            : "-"}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            s.status === "accepted" || s.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {s.status === "accepted" || s.status === "completed"
                            ? "Diterima"
                            : "Menunggu"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}