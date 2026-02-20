import { NextResponse } from "next/server";
import { naiveBayesPredict } from "@/lib/naiveBayes";
import pool, { initDB } from "@/lib/db";

export async function POST(req) {
  try {
    await initDB();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "Tidak ada file yang diunggah" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content = buffer.toString("utf-8");

    // Robust CSV Parser
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return NextResponse.json({ error: "File CSV kosong" }, { status: 400 });
    }

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";

    // Helper to parse CSV line correctly (handling quotes)
    const parseCSVLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map((val) => val.replace(/^"|"$/g, ""));
    };

    const headers = parseCSVLine(lines[0]);

    // Logika untuk menemukan indeks kolom (Case Insensitive & Flexible)
    const findHeader = (keywords) =>
      headers.findIndex((h) =>
        keywords.some((k) => h.toLowerCase().includes(k.toLowerCase())),
      );

    const idxNama = findHeader(["nama"]);
    const idxRata = findHeader([
      "rerata",
      "rata-rata",
      "rata_rata",
      "rata rata",
      "nilai",
    ]);
    const idxKelas = findHeader(["kelas"]);
    const idxJurusan = findHeader([
      "jurusan_1",
      "prodi_1",
      "jurusan",
      "prodi",
      "program studi",
    ]);
    const idxPTN = findHeader([
      "ptn_1",
      "universitas_1",
      "ptn",
      "universitas",
      "kampus",
      "perguruan tinggi",
    ]);

    if (idxNama === -1 || idxRata === -1) {
      return NextResponse.json(
        {
          error: `Format CSV tidak dikenal. Kolom 'Nama' atau 'Rerata' tidak ditemukan. Header yang terdeteksi: ${headers.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Ambil data training untuk model
    const [trainingData] = await pool.query("SELECT * FROM training_data");
    if (trainingData.length === 0) {
      return NextResponse.json(
        {
          error:
            "Data training kosong. Harap unggah data training terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 2) continue; // Skip empty/too short lines

      const nisn = "-"; // NISN removed as per user request
      const nama = cols[idxNama];
      const rataRata = parseFloat(cols[idxRata].replace(",", ".")); // Handle decimal with comma
      const kelas = idxKelas !== -1 ? cols[idxKelas] : "-";
      const jurusan = idxJurusan !== -1 ? cols[idxJurusan] : "-";
      const ptn = idxPTN !== -1 ? cols[idxPTN] : "PTN Tujuan";

      if (isNaN(rataRata)) continue;

      // Prediksi menggunakan Naive Bayes
      const hasil = naiveBayesPredict(rataRata, trainingData);

      // Simpan ke database
      await pool.query(
        "INSERT INTO students (nama, nisn, kelas, jurusan, ptn, rata_rata, hasil, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [nama, nisn, kelas, jurusan, ptn, rataRata, hasil, today],
      );

      results.push({
        nama,
        nisn,
        kelas,
        jurusan,
        ptn,
        rata_rata: rataRata,
        hasil,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} data siswa berhasil diproses dan disimpan.`,
      data: results,
    });
  } catch (error) {
    console.error("Error in upload-test API:", error);
    return NextResponse.json(
      { error: "Gagal memproses file CSV" },
      { status: 500 },
    );
  }
}
