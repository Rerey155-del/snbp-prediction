import { NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

export async function GET(req) {
    try {
        await initDB();
        const { searchParams } = new URL(req.url);
        const nama = searchParams.get('nama');

        let query = "SELECT * FROM students ORDER BY tanggal DESC";
        let values = [];

        if (nama) {
            query = "SELECT * FROM students WHERE nama LIKE ? ORDER BY tanggal DESC";
            values = [`%${nama}%`];
        }

        const [rows] = await pool.query(query, values);

        // Format rows to match frontend expectation if needed
        // (MySQL columns match CSV headers now)
        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Error loading students from MySQL:', error);
        return NextResponse.json(
            { error: "Gagal memuat data siswa dari database" },
            { status: 500 }
        );
    }
}
