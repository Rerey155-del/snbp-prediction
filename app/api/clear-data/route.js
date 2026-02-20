import { NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

export async function POST(req) {
    try {
        await initDB();
        const { type } = await req.json();

        if (type === 'students') {
            await pool.query("TRUNCATE TABLE students");
            return NextResponse.json({ success: true, message: "Seluruh data siswa berhasil dihapus" });
        } else if (type === 'training') {
            await pool.query("TRUNCATE TABLE training_data");
            return NextResponse.json({ success: true, message: "Seluruh data training berhasil dihapus" });
        } else {
            return NextResponse.json({ error: "Tipe data tidak valid" }, { status: 400 });
        }
    } catch (error) {
        console.error('Error clearing data:', error);
        return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
    }
}
