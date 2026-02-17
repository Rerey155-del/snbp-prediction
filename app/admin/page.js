"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { calculateConfusionMatrix, calculateMetrics } from '@/lib/evaluation';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [trainingData, setTrainingData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // New state for Batch Test Data
  const [selectedTestFile, setSelectedTestFile] = useState(null);
  const [processingTest, setProcessingTest] = useState(false);

  // Filtering State
  const [trainingFilter, setTrainingFilter] = useState("ALL"); // ALL, LULUS, TIDAK LULUS
  const [testFilter, setTestFilter] = useState("ALL"); // ALL, LULUS, TIDAK LULUS

  // Math Visualization State
  const [activeStudent, setActiveStudent] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate dynamic stats from training data for visualization
  const getStatsForMath = () => {
    const stats = {};
    ["LULUS", "TIDAK LULUS"].forEach((k) => {
      const subset = trainingData.filter((d) => d.hasil.toUpperCase() === k);
      if (subset.length === 0) return;
      const values = subset.map((d) => Number(d.rata_rata));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      stats[k] = { mean, variance, count: values.length };
    });
    return stats;
  };

  async function handleTestFileUpload() {
    if (!selectedTestFile) {
      alert("Silakan pilih file CSV data uji terlebih dahulu!");
      return;
    }

    setProcessingTest(true);
    const formData = new FormData();
    formData.append("file", selectedTestFile);

    try {
      const res = await fetch("/api/upload-test", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedTestFile(null);
        // Clear the file input manually
        const fileInput = document.getElementById("test-csv-upload");
        if (fileInput) fileInput.value = "";

        // Refresh students data
        loadStudentsData();
      } else {
        alert("Upload data uji gagal: " + data.error);
      }
    } catch (error) {
      console.error("Error uploading test file:", error);
      alert("Terjadi kesalahan saat mengunggah file data uji.");
    } finally {
      setProcessingTest(false);
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      alert("Silakan pilih file CSV terlebih dahulu!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload-training", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedFile(null);
        // Clear the file input manually
        const fileInput = document.getElementById("csv-upload");
        if (fileInput) fileInput.value = "";

        // Refresh training data
        loadTrainingData();
      } else {
        alert("Upload gagal: " + data.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setUploading(false);
    }
  }

  function loadTrainingData() {
    setLoadingData(true);
    fetch("/api/training-data")
      .then((res) => res.json())
      .then((data) => {
        setTrainingData(data.data || []);
        setLoadingData(false);
      })
      .catch((err) => {
        console.error("Error loading training data:", err);
        setLoadingData(false);
      });
  }

  function loadStudentsData() {
    setLoadingStudents(true);
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudentsData(data.data || []);
        setLoadingStudents(false);
      })
      .catch((err) => {
        console.error("Error loading students:", err);
        setLoadingStudents(false);
      });
  }

  async function handleDelete(student) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data ${student.nama}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/delete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Data siswa berhasil dihapus!");
        loadStudentsData();
      } else {
        alert("Gagal menghapus data: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Terjadi kesalahan saat menghapus data");
    }
  }

  async function handleClearData(type) {
    const typeLabel =
      type === "students" ? "seluruh data siswa" : "seluruh data training";
    if (
      !confirm(
        `HATI-HATI! Apakah Anda yakin ingin menghapus ${typeLabel}? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        if (type === "students") loadStudentsData();
        else loadTrainingData();
      } else {
        alert("Gagal menghapus data: " + data.error);
      }
    } catch (error) {
      console.error(`Error clearing ${type}:`, error);
      alert("Terjadi kesalahan saat menghapus data");
    }
  }

  const handleLogout = () => {
    router.push("/login");
  };

  const handleSavePDF = () => {
    const doc = new jsPDF();

    // Set Font to Times New Roman (jsPDF built-in label is 'times')
    doc.setFont("times", "normal");

    // Add Logo
    const logoUrl = "/LOGO SMANIVA.jpeg";
    doc.addImage(logoUrl, "JPEG", 14, 10, 25, 25);

    // Add Title and info next to logo
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.text("Laporan Hasil Prediksi SNBP", 45, 22);

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Add Date and School Info
    const dateString = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Dicetak pada: ${dateString}`, 45, 30);
    doc.text("SMAN 1 Ampek Angkek - Sistem Prediksi Naive Bayes", 45, 35);

    // Prepare data for table
    const tableData = studentsData
      .filter((d) => testFilter === "ALL" || d.hasil === testFilter)
      .map((student, index) => [
        index + 1,
        student.nama,
        student.kelas || "-",
        student.jurusan || "-",
        student.ptn || "-",
        Number(student.rata_rata).toFixed(2),
        student.hasil === "LULUS" ? "BERPELUANG" : "KURANG BERPELUANG",
      ]);

    // Add AutoTable
    autoTable(doc, {
      startY: 45,
      head: [
        [
          "No",
          "Nama",
          "Kelas",
          "Jurusan",
          "PTN",
          "Rata-rata",
          "Hasil Prediksi",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        font: "times",
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 45 },
      styles: {
        fontSize: 8,
        font: "times",
      },
    });

    // Save PDF
    doc.save(`Laporan_SNBP_${new Date().getTime()}.pdf`);
  };

  useEffect(() => {
    loadTrainingData();
    loadStudentsData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white p-0.5">
              <img
                src="/LOGO SMANIVA.jpeg"
                alt="SMANIVA Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Dashboard Admin
              </h1>
              <p className="text-sm text-gray-600">
                SMAN 1 Ampek Angkek - SNBP Predictor
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Math Breakdown Modal */}
      {showBreakdown && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Detail Perhitungan Matematis
                  </h3>
                  <p className="text-sm text-gray-500">
                    Siswa:{" "}
                    <span className="font-semibold text-indigo-600">
                      {activeStudent.nama}
                    </span>{" "}
                    | Nilai (x) = {activeStudent.rata_rata}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBreakdown(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Step 1: Parameters */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Parameter Referensi (Data Training)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(getStatsForMath()).map(([key, s]) => (
                    <div
                      key={key}
                      className={`p-4 rounded-xl border ${key === "LULUS" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}
                    >
                      <p className="font-bold text-gray-700 mb-2 truncate">
                        KELAS: {key === "TIDAK LULUS" ? "BELUM LULUS" : key}
                      </p>
                      <div className="space-y-1 text-sm font-mono">
                        <p className="flex justify-between">
                          <span>
                            Mean (μ<sub>c</sub>)
                          </span>{" "}
                          <span>{s.mean.toFixed(4)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>
                            Varians (σ<sup>2</sup>
                            <sub>c</sub>)
                          </span>{" "}
                          <span>{s.variance.toFixed(4)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Sta. Deviasi (σ)</span>{" "}
                          <span>{Math.sqrt(s.variance).toFixed(4)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Prior P(C)</span> <span>0.5000</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Step 2: Formula */}
              <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  Rumus Gaussian (Normal Distribution)
                </div>
                <div className="flex justify-center p-6 bg-white rounded-xl shadow-inner mb-4">
                  <img
                    src="https://latex.codecogs.com/svg.image?f(x|\mu,\sigma^2)=\frac{1}{\sqrt{2\pi\sigma^2}}e^{-\frac{(x-\mu)^2}{2\sigma^2}}"
                    alt="Gaussian Formula"
                    className="h-12"
                  />
                </div>
                <p className="text-xs text-gray-500 italic text-center leading-relaxed px-4">
                  Rumus ini digunakan untuk menghitung probabilitas nilai (x)
                  masuk ke kelas tertentu berdasarkan sebaran data normal.
                </p>
              </section>

              {/* Step 3: Calculation */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  Hasil Subtitusi & Perbandingan
                </div>

                {Object.entries(getStatsForMath()).map(([key, s]) => {
                  const diff = Math.pow(activeStudent.rata_rata - s.mean, 2);
                  const exponent = -diff / (2 * s.variance);
                  const likelihood =
                    (1 / Math.sqrt(2 * Math.PI * s.variance)) *
                    Math.exp(exponent);
                  const posterior = 0.5 * likelihood;

                  return (
                    <div key={key} className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${key === "LULUS" ? "bg-green-500" : "bg-red-500"}`}
                        ></span>
                        Probabilitas Kelas{" "}
                        {key === "TIDAK LULUS" ? "BELUM LULUS" : key}
                      </p>
                      <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center flex-wrap gap-2 text-sm font-mono bg-gray-50 p-3 rounded-lg border border-dashed text-gray-600">
                            <span>Gaussian =</span>
                            <span className="opacity-60">
                              (1 / √2π({s.variance.toFixed(2)}))
                            </span>
                            <span>×</span>
                            <span className="opacity-60">
                              e
                              <sup>
                                -({activeStudent.rata_rata}-{s.mean.toFixed(2)}
                                )²/2({s.variance.toFixed(2)})
                              </sup>
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-2">
                            <span className="text-sm text-gray-600">
                              P(X|C) =
                            </span>
                            <span className="font-bold text-gray-800">
                              {likelihood.toFixed(8)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-2 border-t pt-2 mt-2">
                            <span className="text-sm font-bold text-indigo-600">
                              P(C) × P(X|C) =
                            </span>
                            <span className="text-lg font-black text-indigo-700">
                              {posterior.toFixed(8)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Final Decision */}
              <div
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 text-center shadow-lg ${activeStudent.hasil === "LULUS" ? "bg-green-600/5 border-green-500" : "bg-red-600/5 border-red-500"}`}
              >
                <p className="text-sm font-bold opacity-60 uppercase tracking-widest">
                  Keputusan Akhir
                </p>
                <p className="text-sm text-gray-700 leading-relaxed max-w-md">
                  Karena{" "}
                  <strong>
                    {activeStudent.hasil === "LULUS" ? "LULUS" : "BELUM LULUS"}
                  </strong>{" "}
                  memiliki nilai probabilitas (Posterior) yang lebih tinggi,
                  maka sistem memprediksi siswa ini:
                </p>
                <div
                  className={`px-8 py-3 rounded-full font-black text-xl shadow-md ${activeStudent.hasil === "LULUS" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
                >
                  {activeStudent.hasil === "LULUS"
                    ? "BERPELUANG DITERIMA"
                    : "KURANG BERPELUANG"}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end sticky bottom-0 bg-white/80 backdrop-blur-md">
              <button
                onClick={() => setShowBreakdown(false)}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Siswa</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {loadingStudents ? "..." : studentsData.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Berpeluang Diterima (LULUS)
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {loadingStudents
                    ? "..."
                    : studentsData.filter((d) => d.hasil === "LULUS").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Kurang Berpeluang (BELUM LULUS)
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {loadingStudents
                    ? "..."
                    : studentsData.filter((d) => d.hasil === "TIDAK LULUS")
                        .length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Data Uji Siswa */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <svg
                className="w-7 h-7 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Upload Data Uji Siswa
            </h2>

            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200 text-center">
                <input
                  id="test-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedTestFile(e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="test-csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">
                    {selectedTestFile
                      ? selectedTestFile.name
                      : "Klik untuk pilih file CSV Data Uji"}
                  </span>
                  <span className="text-xs text-gray-500">
                    Format: NISN, Nama, Kelas, Rata-rata 1-5, Jurusan Dipilih
                  </span>
                </label>
              </div>

              <button
                onClick={handleTestFileUpload}
                disabled={processingTest || !selectedTestFile}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingTest ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Memproses Prediksi...
                  </span>
                ) : (
                  "Unggah & Proses Prediksi"
                )}
              </button>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-700 flex gap-2">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Cukup pilih file CSV data uji, sistem akan otomatis melakukan
                  prediksi Naive Bayes pada seluruh baris data dan menyimpannya
                  ke database.
                </p>
              </div>
            </div>
          </div>

          {/* Info & Guide */}
          <div className="space-y-6">
            {/* Guide Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Cara Menggunakan
              </h3>
              <ol className="space-y-3 text-sm opacity-90 leading-relaxed">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    Siapkan file CSV dengan kolom Nama, NISN, Rata-rata,
                    Jurusan, dan PTN
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    Unggah file pada bagian &quot;Upload Data Uji Siswa&quot;
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    Klik &quot;Unggah & Proses Prediksi&quot; untuk melihat
                    hasil batch
                  </span>
                </li>
              </ol>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Tentang Sistem
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p className="leading-relaxed">
                  Sistem ini menggunakan algoritma{" "}
                  <strong>Gaussian Naive Bayes</strong> untuk memprediksi
                  peluang siswa diterima melalui jalur SNBP.
                </p>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Catatan:</strong> Prediksi berdasarkan data historis
                    dan bersifat estimasi. Hasil aktual dapat berbeda tergantung
                    berbagai faktor lainnya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Training Data Table */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <svg
                className="w-7 h-7 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Data Training (Referensi Naive Bayes)
            </h2>
            {trainingData.length > 0 && (
              <button
                onClick={() => handleClearData("training")}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Hapus Semua Data Training
              </button>
            )}
          </div>

          {/* CSV Upload Section */}
          <div className="mb-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Unggah Data Referensi (CSV)
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="flex-1 block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-indigo-600 file:text-white
                                    hover:file:bg-indigo-700
                                    transition-all"
              />
              <button
                onClick={handleFileUpload}
                disabled={uploading || !selectedFile}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </>
                ) : (
                  "Unggah Data"
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-indigo-600">
              * Format CSV: <strong>nama, rata_rata, hasil</strong>. Mengunggah
              file baru akan menggantikan data lama.
            </p>
          </div>

          {loadingData ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Memuat data...</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-semibold text-gray-600 mr-2">
                    Filter Status:
                  </span>
                  <button
                    onClick={() => setTrainingFilter("ALL")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${trainingFilter === "ALL" ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    Semua ({trainingData.length})
                  </button>
                  <button
                    onClick={() => setTrainingFilter("LULUS")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${trainingFilter === "LULUS" ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    LULUS (
                    {trainingData.filter((d) => d.hasil === "LULUS").length})
                  </button>
                  <button
                    onClick={() => setTrainingFilter("TIDAK LULUS")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${trainingFilter === "TIDAK LULUS" ? "bg-red-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    BELUM LULUS (
                    {
                      trainingData.filter((d) => d.hasil === "TIDAK LULUS")
                        .length
                    }
                    )
                  </button>
                </div>

                <p className="text-xs text-gray-500 italic">
                  * Menampilkan{" "}
                  {
                    trainingData.filter(
                      (d) =>
                        trainingFilter === "ALL" || d.hasil === trainingFilter,
                    ).length
                  }{" "}
                  data
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        No
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Nama
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Rata-rata Nilai
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Hasil
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingData
                      .filter(
                        (d) =>
                          trainingFilter === "ALL" ||
                          d.hasil === trainingFilter,
                      )
                      .map((item, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="py-4 px-6 text-sm text-gray-600">
                            {index + 1}
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-800">
                            {item.nama}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-block px-4 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100">
                              {item.rata_rata}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-block px-4 py-1 rounded-lg text-xs font-bold shadow-sm ${
                                item.hasil === "LULUS"
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {item.hasil === "LULUS" ? "LULUS" : "BELUM LULUS"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <p className="text-xs text-gray-700">
                  <strong>ℹ️ Informasi:</strong> Data di atas adalah data
                  historis yang digunakan sebagai referensi dalam algoritma
                  Gaussian Naive Bayes untuk memprediksi peluang siswa diterima
                  SNBP. Semakin banyak data training, semakin akurat prediksi
                  yang dihasilkan.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Students Data Table */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border-t-4 border-green-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Data Siswa Tersimpan (Data Uji)
            </h2>
            {studentsData.length > 0 && (
              <button
                onClick={() => handleClearData("students")}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Hapus Semua Data Siswa
              </button>
            )}
          </div>

          {loadingStudents ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Memuat data siswa...</p>
            </div>
          ) : studentsData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-gray-600 font-medium">
                Belum ada data siswa tersimpan
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Lakukan prediksi dan simpan data untuk menampilkan di sini
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-semibold text-gray-600 mr-2">
                    Filter Hasil:
                  </span>
                  <button
                    onClick={() => setTestFilter("ALL")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${testFilter === "ALL" ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    Semua ({studentsData.length})
                  </button>
                  <button
                    onClick={() => setTestFilter("LULUS")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${testFilter === "LULUS" ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    LULUS (
                    {studentsData.filter((d) => d.hasil === "LULUS").length})
                  </button>
                  <button
                    onClick={() => setTestFilter("TIDAK LULUS")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${testFilter === "TIDAK LULUS" ? "bg-red-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    BELUM LULUS (
                    {
                      studentsData.filter((d) => d.hasil === "TIDAK LULUS")
                        .length
                    }
                    )
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 italic mr-2">
                    * Menampilkan{" "}
                    {
                      studentsData.filter(
                        (d) => testFilter === "ALL" || d.hasil === testFilter,
                      ).length
                    }{" "}
                    siswa
                  </p>
                  <button
                    onClick={() => {
                      // Header CSV
                      let csvContent = "data:text/csv;charset=utf-8,";
                      csvContent +=
                        "Nama,NISN,Jurusan,PTN,Rata-Rata,Hasil Prediksi\n";

                      // Data Rows
                      studentsData.forEach((row) => {
                        const rowString = `"${row.nama}","${row.nisn}","${row.jurusan || "-"}","${row.ptn || "-"}",${row.rata_rata},"${row.hasil === "LULUS" ? "LULUS" : "BELUM LULUS"}"`;
                        csvContent += rowString + "\r\n";
                      });

                      // Download Process
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "data_uji_students.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export CSV
                  </button>
                  <button
                    onClick={handleSavePDF}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Save PDF (Tabel)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        No
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Nama
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Kelas
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Jurusan
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        PTN
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Rata-rata
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Hasil Prediksi
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData
                      .filter(
                        (d) => testFilter === "ALL" || d.hasil === testFilter,
                      )
                      .map((student, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-green-50/30 transition-colors"
                        >
                          <td className="py-4 px-6 text-sm text-gray-600">
                            {index + 1}
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-800">
                            {student.nama}
                          </td>
                          <td className="py-4 px-6 text-center text-sm text-blue-600 font-bold">
                            {student.kelas || "-"}
                          </td>
                          <td className="py-4 px-6 text-left text-sm text-gray-600">
                            {student.jurusan || "-"}
                          </td>
                          <td className="py-4 px-6 text-left text-sm text-gray-600">
                            {student.ptn || "-"}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-block px-4 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100">
                              {student.rata_rata}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-block px-4 py-1 rounded-lg text-xs font-bold shadow-sm ${
                                student.hasil === "LULUS"
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {student.hasil === "LULUS"
                                ? "Berpeluang Diterima (LULUS)"
                                : "Kurang Berpeluang (BELUM LULUS)"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setActiveStudent(student);
                                  setShowBreakdown(true);
                                }}
                                className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
                                title="Detail Perhitungan"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(student)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                                title="Hapus Data"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
