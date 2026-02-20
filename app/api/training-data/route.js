import { NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

export async function GET() {
    try {
        await initDB(); // Ensure DB and table exist
        const [rows] = await pool.query("SELECT * FROM training_data");
        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Error loading training data from MySQL:', error);
        return NextResponse.json(
            { error: "Gagal memuat data training dari database" },
            { status: 500 }
        );
    }
}
