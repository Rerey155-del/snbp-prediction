'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SiswaPage() {
    const router = useRouter();
    const [searchNama, setSearchNama] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('id-ID', options);
        } catch (e) {
            return dateString;
        }
    };

    async function cariData() {
        if (!searchNama.trim()) {
            alert('Masukkan nama untuk mencari!');
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            const res = await fetch(`/api/students?nama=${encodeURIComponent(searchNama)}`);
            const data = await res.json();
            setSearchResults(data.data || []);
        } catch (error) {
            console.error('Error searching:', error);
            alert('Gagal mencari data!');
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = () => {
        router.push('/login');
    };

    const handleSavePDF = (student) => {
        const doc = new jsPDF();

        // Set Font to Times New Roman (jsPDF built-in label is 'times')
        doc.setFont('times', 'normal');

        // Add Logo
        const logoUrl = '/LOGO SMANIVA.jpeg';
        doc.addImage(logoUrl, 'JPEG', 14, 15, 25, 25);

        // Add Title
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 64, 175); // Blue-800
        doc.text('HASIL PREDIKSI SNBP', 105, 30, { align: 'center' });

        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text('SMAN 1 Ampek Angkek', 105, 40, { align: 'center' });

        // Horizontal Line
        doc.setDrawColor(203, 213, 225); // Slate-200
        doc.line(20, 45, 190, 45);

        // Student Information Section
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text('Diberikan kepada:', 20, 60);

        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text(`${student.nama}`, 20, 70);
        doc.setFont('times', 'normal');

        // Details Table
        autoTable(doc, {
            startY: 80,
            body: [
                ['Kelas', `: ${student.kelas || '-'}`],
                ['Rata-rata Nilai Rapor', `: ${student.rata_rata}`],
                ['Jurusan Pilihan', `: ${student.jurusan || '-'}`],
                ['PTN Tujuan', `: ${student.ptn || '-'}`],
                ['Tanggal Prediksi', `: ${formatDate(student.tanggal)}`]
            ],
            theme: 'plain',
            styles: {
                fontSize: 11,
                cellPadding: 2,
                font: 'times'
            },
            columnStyles: { 0: { fontStyle: 'bold', width: 45 } }
        });

        // Result Box
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setDrawColor(student.hasil === 'LULUS' ? 34 : 220, student.hasil === 'LULUS' ? 197 : 38, student.hasil === 'LULUS' ? 94 : 38);
        doc.setFillColor(student.hasil === 'LULUS' ? 240 : 254, student.hasil === 'LULUS' ? 253 : 242, student.hasil === 'LULUS' ? 244 : 242);
        doc.roundedRect(20, finalY, 170, 40, 3, 3, 'FD');

        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('KESEIMPULAN PREDIKSI:', 105, finalY + 10, { align: 'center' });

        doc.setFontSize(20);
        doc.setFont('times', 'bold');
        doc.setTextColor(student.hasil === 'LULUS' ? 21 : 153, student.hasil === 'LULUS' ? 128 : 27, student.hasil === 'LULUS' ? 61 : 27);
        doc.text(student.hasil === 'LULUS' ? 'BERPELUANG DITERIMA' : 'KURANG BERPELUANG', 105, finalY + 25, { align: 'center' });

        // Footer Message
        doc.setFontSize(9);
        doc.setFont('times', 'italic');
        doc.setTextColor(100);
        doc.text('* Laporan ini dihasilkan secara otomatis oleh Sistem Prediksi Gaussian Naive Bayes.', 105, finalY + 55, { align: 'center' });
        doc.text('Hasil ini bersifat estimasi akademik untuk keperluan motivasi dan persiapan.', 105, finalY + 60, { align: 'center' });

        // Save PDF
        doc.save(`Hasil_Prediksi_SNBP_${student.nama.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-blue-500 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white p-0.5">
                            <img src="/LOGO SMANIVA.jpeg" alt="SMANIVA Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Portal Siswa</h1>
                            <p className="text-sm text-gray-600">SMAN 1 Ampek Angkek - Cek Hasil Prediksi SNBP</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Search Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Cari Data Prediksi Anda
                    </h2>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={searchNama}
                            onChange={(e) => setSearchNama(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && cariData()}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="Masukkan nama lengkap Anda..."
                        />
                        <button
                            onClick={cariData}
                            disabled={loading}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Mencari...' : '🔍 Cari'}
                        </button>
                    </div>

                    <p className="mt-3 text-sm text-gray-600">
                        💡 <strong>Tip:</strong> Masukkan nama lengkap sesuai yang diinput oleh admin
                    </p>
                </div>

                {/* Results Section */}
                {searched && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                <p className="mt-4 text-gray-600">Mencari data...</p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Data Tidak Ditemukan</h3>
                                <p className="text-gray-600">Tidak ada data dengan nama "{searchNama}"</p>
                                <p className="text-sm text-gray-500 mt-2">Pastikan nama yang Anda masukkan sudah benar atau hubungi admin</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">
                                    Hasil Pencarian ({searchResults.length} data ditemukan)
                                </h3>

                                {searchResults.map((student, index) => (
                                    <div key={index} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                                        {/* Student Info */}
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-sm text-gray-600">Nama Lengkap</p>
                                                <p className="font-bold text-lg text-gray-800">{student.nama}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Kelas</p>
                                                <p className="font-semibold text-blue-600">{student.kelas || '-'}</p>
                                            </div>
                                        </div>

                                        {/* Average */}
                                        <div className="grid md:grid-cols-1 gap-4 mb-4">
                                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                                                <p className="text-sm text-gray-600 mb-1">Rata-rata Nilai Anda</p>
                                                <p className="text-4xl font-bold text-blue-700">{student.rata_rata}</p>
                                            </div>
                                        </div>

                                        {/* Result */}
                                        <div className={`p-6 rounded-xl text-center relative ${student.hasil === 'LULUS'
                                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500'
                                            : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-500'
                                            }`}>
                                            <p className="text-sm text-gray-600 mb-2">Hasil Prediksi SNBP</p>
                                            <p className={`text-3xl font-bold ${student.hasil === 'LULUS' ? 'text-green-700' : 'text-red-700'
                                                }`}>
                                                {student.hasil === 'LULUS' ? 'Berpeluang Diterima (LULUS)' : 'Kurang Berpeluang (BELUM LULUS)'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-3 uppercase tracking-wider font-semibold">
                                                Tanggal Prediksi: {formatDate(student.tanggal)}
                                            </p>
                                        </div>

                                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <p className="text-xs text-gray-700">
                                                <strong>⚠️ Catatan:</strong> Hasil prediksi ini bersifat estimasi berdasarkan algoritma Gaussian Naive Bayes.
                                                Hasil aktual dapat berbeda tergantung berbagai faktor lainnya.
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleSavePDF(student)}
                                            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-xl group"
                                        >
                                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Simpan Hasil Prediksi (PDF)
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
