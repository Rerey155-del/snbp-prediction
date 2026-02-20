import { NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

export async function POST(req) {
    try {
        await initDB();
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json(
                { error: "Tidak ada file yang diunggah" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileContent = buffer.toString("utf8");

        // Robust CSV Parser
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) {
            return NextResponse.json({ error: "File CSV kosong" }, { status: 400 });
        }

        // Detect delimiter
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result.map(val => val.replace(/^"|"$/g, ''));
        };

        const headers = parseCSVLine(lines[0]);

        // Flexible Header Detection
        const findHeader = (keywords) => headers.findIndex(h =>
            keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
        );

        const idxNama = findHeader(['nama']);
        const idxRata = findHeader(['rata-rata', 'rata_rata', 'rata rata', 'nilai']);
        const idxHasil = findHeader(['hasil', 'status', 'keterangan']);

        if (idxNama === -1 || idxRata === -1 || idxHasil === -1) {
            return NextResponse.json({
                error: `Format CSV tidak dikenal. Pastikan ada kolom Nama, Rata-rata, dan Hasil. Header terdeteksi: ${headers.join(', ')}`
            }, { status: 400 });
        }

        // Start transaction
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Clear existing training data
            await connection.query("TRUNCATE TABLE training_data");

            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < 2) continue;

                const nama = cols[idxNama];
                const rataRata = parseFloat(cols[idxRata].replace(',', '.'));
                let hasil = cols[idxHasil].toUpperCase();

                // Standardize 'BELUM LULUS' or 'TIDAK LULUS'
                if (hasil.includes('TIDAK') || hasil.includes('BELUM')) {
                    hasil = 'TIDAK LULUS';
                } else if (hasil.includes('LULUS')) {
                    hasil = 'LULUS';
                }

                if (!isNaN(rataRata)) {
                    await connection.query(
                        'INSERT INTO training_data (nama, rata_rata, hasil) VALUES (?, ?, ?)',
                        [nama, rataRata, hasil]
                    );
                    count++;
                }
            }

            await connection.commit();
            return NextResponse.json({
                success: true,
                message: `Berhasil mengunggah ${count} data training`
            });
        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error uploading training data:', error);
        return NextResponse.json(
            { error: "Gagal memproses file CSV" },
            { status: 500 }
        );
    }
}
