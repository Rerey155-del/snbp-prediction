import { NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

export async function POST(req) {
    try {
        await initDB(); // Ensure DB and table exist

        const data = await req.json();
        const { nama, nisn, semester, rataRata, hasil, hasilAktual } = data;

        // Validate required fields
        if (!nama || !nisn || !semester || !rataRata || !hasil) {
            return NextResponse.json(
                { error: "Data tidak lengkap" },
                { status: 400 }
            );
        }

        const tanggal = new Date().toISOString().split('T')[0];

        // Insert into MySQL
        const query = `
            INSERT INTO students 
            (nama, nisn, semester1, semester2, semester3, semester4, semester5, rata_rata, hasil, hasil_aktual, tanggal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            nama, nisn,
            semester.s1, semester.s2, semester.s3, semester.s4, semester.s5,
            rataRata, hasil, hasilAktual || null, tanggal
        ];

        await pool.query(query, values);

        return NextResponse.json({
            success: true,
            message: "Data siswa berhasil disimpan ke database"
        });
    } catch (error) {
        console.error('Error saving student to MySQL:', error);
        return NextResponse.json(
            { error: "Gagal menyimpan data siswa ke database" },
            { status: 500 }
        );
    }
}

